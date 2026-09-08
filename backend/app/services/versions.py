"""Form version history: snapshot, describe, restore.

Three decisions worth stating.

**A snapshot, not a change log.** Each row holds the whole form as JSON. A log
of individual edits is smaller, but it can only be used by replaying it, and
replaying is exactly what breaks when a block was deleted halfway along. A
snapshot restores by being applied, which is the operation this feature exists
to perform.

**Sessions, not keystrokes.** The builder autosaves on a 600ms debounce, so a
version per write would bury the history in noise. Consecutive edits collapse
into one row while they keep arriving inside ``COALESCE_WINDOW``; publishing
and restoring always start a fresh one, because those are the moments an author
would actually want to come back to.

**The summary is computed once, on write.** Diffing at read time would make old
history re-render differently every time the diffing code changed. Written down
at the moment it happened, "Added 'What went wrong?'" stays true.
"""

from datetime import datetime, timedelta, timezone
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Form, FormVersion, Question, QuestionOption, QuestionRule

#: Edits arriving within this of the last edit join it rather than start a row.
COALESCE_WINDOW = timedelta(minutes=3)

#: How many versions a form keeps. Old ones are pruned on write, so history
#: cannot grow without bound on a form somebody edits for an hour.
MAX_VERSIONS = 40


# --- snapshots ---------------------------------------------------------------


def snapshot_form(form: Form) -> dict[str, Any]:
    """Everything needed to put this form back exactly as it is now."""
    return {
        "title": form.title,
        "status": form.status,
        "welcome_screen": form.welcome_screen,
        "theme": form.theme,
        "settings": form.settings,
        "accepting_responses": form.accepting_responses,
        "questions": [_question_snapshot(q) for q in form.live_questions],
    }


def _question_snapshot(question: Question) -> dict[str, Any]:
    return {
        "id": question.id,
        "type": question.type,
        "title": question.title,
        "description": question.description,
        "required": question.required,
        "position": question.position,
        "settings": question.settings,
        "options": [
            {"id": o.id, "label": o.label, "position": o.position}
            for o in sorted(question.options, key=lambda o: o.position)
        ],
        "rules": [
            {
                "position": r.position,
                "operator": r.operator,
                "value": r.value,
                "target_question_id": r.target_question_id,
            }
            for r in sorted(question.rules, key=lambda r: r.position)
        ],
    }


# --- describing a change -----------------------------------------------------


def describe(before: dict[str, Any] | None, after: dict[str, Any]) -> str:
    """One sentence naming what changed between two snapshots.

    Deliberately shallow: it reports the kinds of change, not every field. A
    history entry is a landmark for finding a moment again, and "3 blocks
    edited" locates that moment as well as a full field-by-field diff would,
    while staying readable in a narrow panel.
    """
    if before is None:
        return "First version"

    parts: list[str] = []

    old_blocks = {q["id"]: q for q in before.get("questions", [])}
    new_blocks = {q["id"]: q for q in after.get("questions", [])}

    added = [q for qid, q in new_blocks.items() if qid not in old_blocks]
    removed = [q for qid, q in old_blocks.items() if qid not in new_blocks]
    edited = [
        q
        for qid, q in new_blocks.items()
        if qid in old_blocks and _block_body(q) != _block_body(old_blocks[qid])
    ]

    if added:
        parts.append(_blocks_phrase("Added", added))
    if removed:
        parts.append(_blocks_phrase("Deleted", removed))
    if edited:
        parts.append(_blocks_phrase("Edited", edited))

    order_before = [q["id"] for q in before.get("questions", []) if q["id"] in new_blocks]
    order_after = [q["id"] for q in after.get("questions", []) if q["id"] in old_blocks]
    if order_before != order_after:
        parts.append("Reordered blocks")

    if before.get("title") != after.get("title"):
        parts.append(f"Renamed the form to “{after.get('title')}”")
    if before.get("theme") != after.get("theme"):
        parts.append("Changed the design")
    if before.get("welcome_screen") != after.get("welcome_screen"):
        parts.append("Changed the welcome screen")
    if before.get("settings") != after.get("settings"):
        parts.append("Changed the form settings")
    if before.get("accepting_responses") != after.get("accepting_responses"):
        parts.append(
            "Opened the form to responses"
            if after.get("accepting_responses")
            else "Closed the form to responses"
        )
    if before.get("status") != after.get("status"):
        parts.append(
            "Published" if after.get("status") == "published" else "Unpublished"
        )

    if not parts:
        return "No changes"
    return " · ".join(parts)


def _block_body(question: dict[str, Any]) -> dict[str, Any]:
    """A block minus its position, so a reorder is not reported as ten edits."""
    return {key: value for key, value in question.items() if key != "position"}


def _blocks_phrase(verb: str, blocks: list[dict[str, Any]]) -> str:
    if len(blocks) == 1:
        return f"{verb} “{_label(blocks[0])}”"
    return f"{verb} {len(blocks)} blocks"


def _label(question: dict[str, Any]) -> str:
    title = (question.get("title") or "").strip()
    if title:
        return title if len(title) <= 40 else title[:39] + "…"
    return "Untitled ending" if question.get("type") == "ending" else "Untitled block"


# --- writing -----------------------------------------------------------------


def latest_version(db: Session, form_id: int) -> FormVersion | None:
    return db.scalars(
        select(FormVersion)
        .where(FormVersion.form_id == form_id)
        .order_by(FormVersion.created_at.desc(), FormVersion.id.desc())
        .limit(1)
    ).first()


def _previous_snapshot(db: Session, version: FormVersion) -> dict[str, Any] | None:
    earlier = db.scalars(
        select(FormVersion)
        .where(FormVersion.form_id == version.form_id, FormVersion.id < version.id)
        .order_by(FormVersion.id.desc())
        .limit(1)
    ).first()
    return earlier.snapshot if earlier else None


def record_version(db: Session, form: Form, kind: str = "edit") -> FormVersion | None:
    """Note the form's current state in its history.

    Returns ``None`` when the write changed nothing worth recording — a patch
    that set a field to the value it already had, say. Callers do not need to
    check: an unrecorded no-op is the correct outcome.
    """
    db.refresh(form)
    current = snapshot_form(form)
    newest = latest_version(db, form.id)

    if newest is not None and newest.snapshot == current:
        return None  # nothing actually changed

    if (
        newest is not None
        and kind == "edit"
        and newest.kind == "edit"
        and _age(newest.created_at) < COALESCE_WINDOW
    ):
        # Still the same editing session: fold this write into it, and restate
        # what that whole session has changed rather than only its last write.
        newest.snapshot = current
        newest.summary = describe(_previous_snapshot(db, newest), current)
        newest.created_at = datetime.now(timezone.utc).replace(tzinfo=None)
        db.commit()
        return newest

    version = FormVersion(
        form_id=form.id,
        kind=kind,
        snapshot=current,
        summary=describe(newest.snapshot if newest else None, current),
    )
    db.add(version)
    db.commit()
    _prune(db, form.id)
    return version


def _age(created_at: datetime) -> timedelta:
    """Rows are stored naive-UTC; compare like with like."""
    reference = created_at if created_at.tzinfo is None else created_at.astimezone(timezone.utc).replace(tzinfo=None)
    return datetime.now(timezone.utc).replace(tzinfo=None) - reference


def _prune(db: Session, form_id: int) -> None:
    stale = db.scalars(
        select(FormVersion)
        .where(FormVersion.form_id == form_id)
        .order_by(FormVersion.id.desc())
        .offset(MAX_VERSIONS)
    ).all()
    if not stale:
        return
    for version in stale:
        db.delete(version)
    db.commit()


def list_versions(db: Session, form_id: int) -> list[FormVersion]:
    """Newest first — the order the panel reads in."""
    return list(
        db.scalars(
            select(FormVersion)
            .where(FormVersion.form_id == form_id)
            .order_by(FormVersion.created_at.desc(), FormVersion.id.desc())
        ).all()
    )


# --- restoring ---------------------------------------------------------------


def restore_version(db: Session, form: Form, version: FormVersion) -> None:
    """Put the form back the way the snapshot describes it.

    Blocks are matched by ID where the row still exists, so restoring keeps the
    answers already collected against them attached. A block deleted since the
    snapshot is revived rather than recreated, for the same reason; one added
    since is soft-deleted, never hard-deleted, because its answers must survive
    exactly as they do for any other deletion.

    Restoring does not republish. Status and slug are the form's live identity,
    not part of what an author is rolling back.
    """
    snapshot = version.snapshot

    form.title = snapshot["title"]
    form.welcome_screen = snapshot.get("welcome_screen")
    form.theme = snapshot.get("theme")
    form.settings = snapshot.get("settings")
    form.accepting_responses = snapshot.get("accepting_responses", True)

    by_id = {q.id: q for q in form.questions}
    wanted = snapshot.get("questions", [])
    wanted_ids = {q["id"] for q in wanted}

    for question in form.live_questions:
        if question.id not in wanted_ids:
            question.deleted_at = datetime.now(timezone.utc)

    # Two passes: every block has to exist before any rule can point at one.
    id_map: dict[int, int] = {}
    for shape in wanted:
        question = by_id.get(shape["id"])
        if question is None:
            question = Question(form_id=form.id, type=shape["type"], title=shape["title"], position=shape["position"])
            db.add(question)
            db.flush()
        question.deleted_at = None
        question.type = shape["type"]
        question.title = shape["title"]
        question.description = shape.get("description")
        question.required = shape.get("required", False)
        question.position = shape["position"]
        question.settings = shape.get("settings")
        id_map[shape["id"]] = question.id

        question.options.clear()
        db.flush()
        for option in shape.get("options", []):
            question.options.append(
                QuestionOption(label=option["label"], position=option["position"])
            )

    db.flush()
    for shape in wanted:
        question = db.get(Question, id_map[shape["id"]])
        assert question is not None
        question.rules.clear()
        db.flush()
        for rule in shape.get("rules", []):
            target = id_map.get(rule["target_question_id"])
            if target is None:
                continue  # the rule pointed somewhere this snapshot does not have
            question.rules.append(
                QuestionRule(
                    position=rule["position"],
                    operator=rule["operator"],
                    value=rule.get("value"),
                    target_question_id=target,
                )
            )

    db.commit()
