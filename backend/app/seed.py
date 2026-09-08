"""Idempotent demo data.

Run with ``python -m app.seed``. Safe to run repeatedly and safe to run against
a database that already holds real data: it only ever touches the three forms it
owns, identified by the fixed slugs and title below, and rebuilds them from
scratch each time.

The fixed slugs matter — the demo links in the README keep working across
re-seeds of the production database.
"""

import random
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import SessionLocal
from app.services.versions import latest_version, record_version
from app.models import (
    Answer,
    Form,
    FormStatus,
    Question,
    QuestionOption,
    QuestionRule,
    QuestionType,
    Response,
    RuleOperator,
)

FEEDBACK_SLUG = "customer-feedback-2f8a1c"
SUPPORT_SLUG = "support-triage-5c9d20"
EVENT_SLUG = "devcon-registration-7b41e9"
DRAFT_TITLE = "Employee onboarding survey"

#: Fixed so a re-seed produces the same charts and the same screenshots.
RANDOM_SEED = 20260907


def _question(
    type_: QuestionType,
    title: str,
    position: int,
    *,
    description: str | None = None,
    required: bool = False,
    settings: dict | None = None,
    options: list[str] | None = None,
) -> Question:
    question = Question(
        type=type_,
        title=title,
        description=description,
        required=required,
        position=position,
        settings=settings,
    )
    if options:
        question.options = [
            QuestionOption(label=label, position=index)
            for index, label in enumerate(options)
        ]
    return question


def _feedback_form() -> Form:
    """Customer feedback — rating, choice, yes/no, long text, email."""
    return Form(
        title="Customer feedback",
        slug=FEEDBACK_SLUG,
        status=FormStatus.PUBLISHED,
        published_at=datetime.now(timezone.utc) - timedelta(days=21),
        welcome_screen={
            "title": "How are we doing?",
            "description": "Four quick questions about your last order. Your answers go straight to the team that packs the boxes.",
            "button_text": "Start",
            "estimated_minutes": 2,
        },
        theme={"color": "#1d1d1f", "background": "#ffffff", "font": "inter"},
        questions=[
            _question(
                QuestionType.RATING,
                "How would you rate your overall experience?",
                0,
                required=True,
                settings={"max_rating": 5, "icon": "star"},
            ),
            _question(
                QuestionType.MULTIPLE_CHOICE,
                "What did you like most?",
                1,
                description="Pick as many as apply.",
                required=True,
                settings={"multi_select": True, "randomize": False},
                options=[
                    "Delivery speed",
                    "Packaging",
                    "Product quality",
                    "Price",
                    "Customer support",
                ],
            ),
            _question(
                QuestionType.YES_NO,
                "Would you recommend us to a friend?",
                2,
                required=True,
            ),
            _question(
                QuestionType.LONG_TEXT,
                "What is the one thing we should fix first?",
                3,
                description="Be blunt — this is the answer we read most carefully.",
            ),
            _question(
                QuestionType.EMAIL,
                "Where can we reach you if we follow up?",
                4,
                description="Optional. We only use it to reply to this feedback.",
            ),
            _question(
                QuestionType.ENDING,
                "Thanks — that genuinely helps.",
                5,
                description="We read every response on Monday mornings.",
                settings={"button_text": "Create your own form"},
            ),
        ],
    )


def _event_form() -> Form:
    """Event registration — short text, dropdown, number, yes/no, long text."""
    return Form(
        title="DevCon 2026 — registration",
        slug=EVENT_SLUG,
        status=FormStatus.PUBLISHED,
        published_at=datetime.now(timezone.utc) - timedelta(days=9),
        welcome_screen={
            "title": "DevCon 2026",
            "description": "Two days, one track, no keynotes. Register below — it takes under a minute.",
            "button_text": "Register",
            "estimated_minutes": 1,
        },
        theme={"color": "#0b3d2e", "background": "#f6f5f1", "font": "inter"},
        questions=[
            _question(
                QuestionType.SHORT_TEXT,
                "What name should we put on your badge?",
                0,
                required=True,
                settings={"max_length": 60},
            ),
            _question(
                QuestionType.EMAIL,
                "What email should we send your ticket to?",
                1,
                required=True,
            ),
            _question(
                QuestionType.DROPDOWN,
                "Which track are you most interested in?",
                2,
                required=True,
                options=[
                    "Frontend & design systems",
                    "Backend & data",
                    "Platform & infrastructure",
                    "Developer experience",
                ],
            ),
            _question(
                QuestionType.NUMBER,
                "How many DevCons have you attended before?",
                3,
                settings={"min": 0, "max": 20},
            ),
            _question(
                QuestionType.YES_NO,
                "Will you join the Thursday evening dinner?",
                4,
                required=True,
            ),
            _question(
                QuestionType.LONG_TEXT,
                "Anything we should know? Access needs, dietary requirements…",
                5,
                settings={"max_length": 500},
            ),
            _question(
                QuestionType.ENDING,
                "You're in. See you in March.",
                6,
                description="Your ticket is on its way to your inbox.",
                settings={"button_text": "Add to calendar"},
            ),
        ],
    )


def _support_form() -> Form:
    """A branching form, so logic jumps are visible without authoring one.

    The shape is the classic triage fork: happy customers are thanked and let
    go, unhappy ones are asked what went wrong and how to reach them. Answering
    "yes" never shows the complaint question at all — which is also why that
    question can be required without making the happy path impossible to submit.
    """
    return Form(
        title="Support triage (branching demo)",
        slug=SUPPORT_SLUG,
        status=FormStatus.PUBLISHED,
        published_at=datetime.now(timezone.utc) - timedelta(days=3),
        welcome_screen={
            "title": "Did we sort it out?",
            "description": "Two questions, and they change depending on your answer.",
            "button_text": "Start",
            "estimated_minutes": 1,
        },
        theme={"color": "#1d4ed8", "background": "#ffffff", "font": "inter"},
        questions=[
            _question(
                QuestionType.YES_NO,
                "Was your issue resolved?",
                0,
                description="Answer yes and you will skip the next question entirely.",
                required=True,
            ),
            _question(
                QuestionType.LONG_TEXT,
                "What went wrong?",
                1,
                description="Only asked when the issue was not resolved.",
                required=True,
            ),
            _question(
                QuestionType.EMAIL,
                "Where can we reach you?",
                2,
            ),
            _question(
                QuestionType.ENDING,
                "Thanks — that is logged.",
                3,
                description="A support lead reads these every morning.",
                settings={"button_text": "Done"},
            ),
        ],
    )


def _add_branching(db: Session, form: Form) -> None:
    """Wire the fork: *resolved = yes* jumps past the complaint question."""
    resolved, _complaint, email, *_ = form.questions
    resolved.rules.append(
        QuestionRule(
            position=0,
            operator=RuleOperator.IS,
            value=True,
            target_question_id=email.id,
        )
    )


def _seed_support_responses(db: Session, form: Form) -> None:
    """Two responses, one down each branch, so the results show both paths."""
    resolved, complaint, email, *_ = form.questions
    now = datetime.now(timezone.utc)

    happy = Response(
        form_id=form.id,
        started_at=now - timedelta(days=2),
        submitted_at=now - timedelta(days=2) + timedelta(minutes=1),
        is_complete=True,
        meta={"user_agent": "seed", "referrer": ""},
        answers=[
            _answer(resolved, True, "Yes"),
            _answer(email, "happy@example.com", "happy@example.com"),
        ],
    )
    unhappy_text = "Took four days and three follow-ups to get a reply."
    unhappy = Response(
        form_id=form.id,
        started_at=now - timedelta(days=1),
        submitted_at=now - timedelta(days=1) + timedelta(minutes=3),
        is_complete=True,
        meta={"user_agent": "seed", "referrer": ""},
        answers=[
            _answer(resolved, False, "No"),
            _answer(complaint, unhappy_text, unhappy_text),
            _answer(email, "waiting@example.com", "waiting@example.com"),
        ],
    )
    db.add_all([happy, unhappy])


def _draft_form() -> Form:
    """A draft, so the dashboard shows both statuses on first load."""
    return Form(
        title=DRAFT_TITLE,
        status=FormStatus.DRAFT,
        questions=[
            _question(
                QuestionType.SHORT_TEXT,
                "Which team did you join?",
                0,
                required=True,
            ),
            _question(
                QuestionType.RATING,
                "How clear was your first week?",
                1,
                settings={"max_rating": 10, "icon": "star"},
            ),
            _question(
                QuestionType.ENDING,
                "Thanks — welcome aboard.",
                2,
                settings={"button_text": "Done"},
            ),
        ],
    )


# --- responses ---------------------------------------------------------------

FEEDBACK_COMMENTS = [
    "Checkout kept losing my address between steps. Everything else was great.",
    "Delivery was two days early, which never happens. No notes.",
    "The box arrived crushed on one corner — the product was fine, the packaging was not.",
    "Support answered in four minutes. Genuinely surprised.",
    "Slightly expensive for what it is, but I'd still buy again.",
    "Please add a way to change the delivery slot after ordering.",
]

EVENT_NAMES = [
    "Priya Raghavan", "Tom Okonkwo", "Lena Fischer", "Marcus Reid",
    "Aisha Bello", "Danny Chu", "Sofia Marchetti", "Jonas Lindqvist",
]

EVENT_NOTES = [
    "Vegetarian, no nuts.",
    "I'll need step-free access to the venue.",
    "Bringing a colleague — will they need a separate ticket?",
    "",
]


def _answer(question: Question, value, display: str) -> Answer:
    """Build one answer row, filling the right typed column for its question.

    Mirrors what ``services.validation`` produces at submit time, including the
    title/type snapshot, so seeded data is indistinguishable from real data.
    """
    answer = Answer(
        question_id=question.id,
        question_title=question.title,
        question_type=question.type,
        display_value=display,
    )
    qtype = QuestionType(question.type)
    if qtype in {QuestionType.RATING, QuestionType.NUMBER}:
        answer.number_value = float(value)
    elif qtype is QuestionType.YES_NO:
        answer.bool_value = bool(value)
    elif qtype in {QuestionType.MULTIPLE_CHOICE, QuestionType.DROPDOWN}:
        answer.option_ids = list(value)
    else:
        answer.text_value = str(value)
    return answer


def _seed_feedback_responses(db: Session, form: Form, rng: random.Random) -> None:
    rating, liked, recommend, comment, email = [
        q for q in form.questions if not q.is_ending
    ]
    weights = [2, 5, 9, 14, 10]  # skewed positive, so the chart has a shape

    for index in range(9):
        started = datetime.now(timezone.utc) - timedelta(days=20 - index * 2, hours=index)
        # Two of the nine drop out partway: completion rate is not 100%.
        complete = index not in {3, 7}

        score = rng.choices([1, 2, 3, 4, 5], weights=weights)[0]
        picks = rng.sample(liked.options, rng.choice([1, 1, 2, 2, 3]))
        answers = [
            _answer(rating, score, f"{score}/5"),
            _answer(
                liked,
                [o.id for o in picks],
                ", ".join(o.label for o in picks),
            ),
        ]
        if complete:
            recommends = score >= 4
            answers.append(_answer(recommend, recommends, "Yes" if recommends else "No"))
            text = FEEDBACK_COMMENTS[index % len(FEEDBACK_COMMENTS)]
            answers.append(_answer(comment, text, text))
            if index % 3 == 0:
                address = f"respondent{index}@example.com"
                answers.append(_answer(email, address, address))

        db.add(
            Response(
                form_id=form.id,
                started_at=started,
                submitted_at=started + timedelta(minutes=2) if complete else None,
                is_complete=complete,
                meta={"user_agent": "seed", "referrer": ""},
                answers=answers,
            )
        )


def _seed_event_responses(db: Session, form: Form, rng: random.Random) -> None:
    name, email, track, attended, dinner, notes = [
        q for q in form.questions if not q.is_ending
    ]

    for index in range(8):
        started = datetime.now(timezone.utc) - timedelta(days=8 - index, hours=index * 2)
        complete = index != 5  # one drop-out

        person = EVENT_NAMES[index]
        address = person.lower().replace(" ", ".") + "@example.com"
        chosen = rng.choice(track.options)
        previous = rng.choice([0, 0, 1, 1, 2, 3])

        answers = [
            _answer(name, person, person),
            _answer(email, address, address),
            _answer(track, [chosen.id], chosen.label),
        ]
        if complete:
            answers.append(_answer(attended, previous, str(previous)))
            joining = rng.random() < 0.7
            answers.append(_answer(dinner, joining, "Yes" if joining else "No"))
            note = EVENT_NOTES[index % len(EVENT_NOTES)]
            if note:
                answers.append(_answer(notes, note, note))

        db.add(
            Response(
                form_id=form.id,
                started_at=started,
                submitted_at=started + timedelta(minutes=1) if complete else None,
                is_complete=complete,
                meta={"user_agent": "seed", "referrer": ""},
                answers=answers,
            )
        )


def _clear_seeded(db: Session) -> None:
    """Remove any previous run of this script. Nothing else is touched."""
    existing = db.scalars(
        select(Form).where(
            Form.slug.in_([FEEDBACK_SLUG, EVENT_SLUG, SUPPORT_SLUG])
            | (Form.title == DRAFT_TITLE)
        )
    ).all()
    for form in existing:
        db.delete(form)
    db.commit()



def _record_at(db: Session, form: Form, kind: str, ago: timedelta) -> None:
    """Record the form's current state, then back-date the row.

    Back-dating as we go is not decoration. ``record_version`` folds an edit
    into the previous one when that one is less than three minutes old, and the
    seed writes all of these within the same second — without moving each row
    into the past first, the whole history would collapse into a single entry.
    """
    # A ``None`` means the state was already recorded — that row is the one to
    # move, or the edits that follow would fold into it and the history would
    # collapse to a single entry anyway.
    version = record_version(db, form, kind=kind) or latest_version(db, form.id)
    if version is None:
        return
    version.created_at = (datetime.now(timezone.utc) - ago).replace(tzinfo=None)
    db.commit()


def _seed_history(db: Session, form: Form) -> None:
    """Give a seeded form a real history by actually making the edits.

    The form is rewound to a plainer state and then built forward again, so
    every entry is a genuine diff against the one before it: the summaries are
    computed by the same code that computes them in the app, and restoring an
    entry really does put the form back to it. Writing invented summaries over
    identical snapshots would look the same in the panel and be a lie — and the
    Restore button would do nothing, which is how anyone would find out.
    """
    welcome, theme, status = form.welcome_screen, form.theme, form.status

    form.welcome_screen = None
    form.theme = None
    form.status = FormStatus.DRAFT
    db.commit()
    _record_at(db, form, "edit", timedelta(days=9))

    form.welcome_screen = welcome
    db.commit()
    _record_at(db, form, "edit", timedelta(days=8, hours=3))

    form.theme = theme
    db.commit()
    _record_at(db, form, "edit", timedelta(days=8, hours=1))

    form.status = status
    db.commit()
    _record_at(db, form, "publish", timedelta(days=8))


def seed() -> None:
    rng = random.Random(RANDOM_SEED)
    with SessionLocal() as db:
        _clear_seeded(db)

        feedback, event, support, draft = (
            _feedback_form(),
            _event_form(),
            _support_form(),
            _draft_form(),
        )
        db.add_all([feedback, event, support, draft])
        db.commit()

        _add_branching(db, support)
        _seed_feedback_responses(db, feedback, rng)
        _seed_event_responses(db, event, rng)
        _seed_support_responses(db, support)
        db.commit()

        for form in (feedback, event, support):
            _seed_history(db, form)

        print("Seeded 4 forms and 19 responses.")
        print(f"  published  /f/{FEEDBACK_SLUG}")
        print(f"  published  /f/{EVENT_SLUG}")
        print(f"  published  /f/{SUPPORT_SLUG}   (branching demo)")
        print(f"  draft      {DRAFT_TITLE}")


if __name__ == "__main__":
    seed()
