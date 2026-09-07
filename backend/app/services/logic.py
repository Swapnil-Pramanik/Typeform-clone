"""Branching: which question comes next, and whether a form's rules are sane.

Mirrored — in *rules*, not in code — by ``frontend/src/lib/logic.ts``, which
drives the respondent flow's navigation. The two must agree, because the client
decides what a respondent sees and the server decides which answers were
actually required. Change the rules here first.

How a step is resolved
----------------------
1. The answered question's rules are evaluated in ``position`` order.
2. The first rule whose condition matches wins; the flow jumps to its target.
3. If no rule matches, the flow falls through to the next question by position.

The builder's "Always go to" is rule 2, not a fourth step: it is an ``always``
rule stored last, so it wins only once every conditional rule above it has
declined, and it replaces step 3 rather than sitting beside it.

A rule pointing at a soft-deleted question is ignored rather than followed, so
deleting a block cannot strand a respondent on something invisible.
"""

from typing import Any

from app.models import (
    VALUELESS_OPERATORS,
    Question,
    QuestionRule,
    QuestionType,
    RuleOperator,
)


class LogicError(Exception):
    """A rule set that cannot be published — currently, one containing a cycle."""


def _as_number(value: Any) -> float | None:
    if isinstance(value, bool) or value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _is_blank(answer: Any) -> bool:
    if answer is None:
        return True
    if isinstance(answer, str):
        return answer.strip() == ""
    if isinstance(answer, (list, tuple)):
        return len(answer) == 0
    return False


def matches(rule: QuestionRule, question: Question, answer: Any) -> bool:
    """Does one rule fire for this answer?

    Choice answers are a list of option IDs, so ``is`` means *contains* — a
    multi-select answer matches a rule about any one of its selections, which is
    what an author means by "if they picked Support".
    """
    operator = RuleOperator(rule.operator)

    if operator is RuleOperator.ALWAYS:
        return True
    if operator is RuleOperator.ANSWERED:
        return not _is_blank(answer)
    if operator is RuleOperator.NOT_ANSWERED:
        return _is_blank(answer)

    if _is_blank(answer):
        return False

    expected = rule.value
    qtype = QuestionType(question.type)

    if operator in {RuleOperator.GREATER_THAN, RuleOperator.LESS_THAN}:
        left, right = _as_number(answer), _as_number(expected)
        if left is None or right is None:
            return False
        return left > right if operator is RuleOperator.GREATER_THAN else left < right

    if qtype in {QuestionType.MULTIPLE_CHOICE, QuestionType.DROPDOWN}:
        chosen = answer if isinstance(answer, (list, tuple)) else [answer]
        present = any(str(option) == str(expected) for option in chosen)
        return present if operator is RuleOperator.IS else not present

    if qtype is QuestionType.YES_NO:
        equal = bool(answer) == bool(expected)
        return equal if operator is RuleOperator.IS else not equal

    if qtype in {QuestionType.NUMBER, QuestionType.RATING}:
        left, right = _as_number(answer), _as_number(expected)
        equal = left is not None and right is not None and left == right
        return equal if operator is RuleOperator.IS else not equal

    equal = str(answer).strip().casefold() == str(expected or "").strip().casefold()
    return equal if operator is RuleOperator.IS else not equal


def next_question_id(
    question: Question, answer: Any, order: list[Question]
) -> int | None:
    """The question that follows this one, or ``None`` at the end of the form.

    An ending terminates the form, so it never has a successor — without that,
    a form whose ending happens to sit early in ``position`` order would appear
    to continue past it.
    """
    if question.is_ending:
        return None

    live = {q.id for q in order}

    for rule in question.rules:
        if rule.target_question_id not in live:
            continue  # the target was deleted; fall through rather than strand
        if matches(rule, question, answer):
            return rule.target_question_id

    ids = [q.id for q in order]
    position = ids.index(question.id)
    return ids[position + 1] if position + 1 < len(ids) else None


def path_taken(order: list[Question], answers: dict[int, Any]) -> list[int]:
    """The questions a respondent actually saw, given the answers they gave.

    The server needs this to enforce "required" correctly: a required question on
    a branch that was never taken must not block the submission. Walking the
    graph from the submitted answers is the only way to know which those were.

    The walk is bounded by the number of questions, so a rule set that somehow
    cycles cannot hang the request.
    """
    if not order:
        return []

    path: list[int] = []
    seen: set[int] = set()
    by_id = {q.id: q for q in order}
    current: int | None = order[0].id

    while current is not None and current not in seen and len(path) <= len(order):
        seen.add(current)
        path.append(current)
        question = by_id[current]
        current = next_question_id(question, answers.get(current), order)

    return path


def assert_no_cycles(order: list[Question]) -> None:
    """Raise if any rule creates a loop a respondent could never escape.

    Every question has an outgoing default edge (the next by position) plus one
    edge per rule; a cycle among those means some path never reaches an ending.
    Detected with an iterative depth-first search so a deep form cannot blow the
    Python stack.
    """
    by_id = {q.id: q for q in order}
    ids = [q.id for q in order]

    def edges(question_id: int) -> list[int]:
        question = by_id[question_id]
        if question.is_ending:
            return []  # an ending terminates the form; it leads nowhere
        targets = [
            rule.target_question_id
            for rule in question.rules
            if rule.target_question_id in by_id
        ]
        # An "always" rule with a live target consumes the fall-through, so the
        # next-by-position edge does not exist and must not be searched: adding
        # it would report loops through a path no respondent can walk.
        if any(
            RuleOperator(rule.operator) is RuleOperator.ALWAYS
            and rule.target_question_id in by_id
            for rule in question.rules
        ):
            return targets
        position = ids.index(question_id)
        if position + 1 < len(ids):
            targets.append(ids[position + 1])
        return targets

    WHITE, GREY, BLACK = 0, 1, 2
    colour = {question_id: WHITE for question_id in ids}

    for root in ids:
        if colour[root] != WHITE:
            continue
        stack: list[tuple[int, int]] = [(root, 0)]
        colour[root] = GREY
        while stack:
            node, index = stack.pop()
            children = edges(node)
            if index < len(children):
                stack.append((node, index + 1))
                child = children[index]
                if colour[child] == GREY:
                    raise LogicError(
                        f"These rules loop back on themselves "
                        f"({by_id[node].title or 'a question'} → "
                        f"{by_id[child].title or 'a question'}). "
                        "A respondent would never reach the end."
                    )
                if colour[child] == WHITE:
                    colour[child] = GREY
                    stack.append((child, 0))
            else:
                colour[node] = BLACK
