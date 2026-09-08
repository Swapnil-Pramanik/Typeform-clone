"""Version history: what gets recorded, what it says, and what restoring does."""

from datetime import datetime, timedelta, timezone

import pytest

from app.services import versions as version_service


@pytest.fixture
def form(client):
    """A published two-question form, so history already has a few entries."""
    created = client.post("/api/forms", json={"title": "Feedback"}).json()

    def add(payload):
        return client.post(f"/api/forms/{created['id']}/questions", json=payload).json()

    first = add({"type": "short_text", "title": "Your name?", "required": True})
    second = add({"type": "rating", "title": "How did we do?"})
    return {"id": created["id"], "first": first, "second": second}


def versions(client, form_id):
    return client.get(f"/api/forms/{form_id}/versions").json()


def test_edits_collapse_into_one_entry_but_publishing_starts_a_new_one(client, form):
    """The autosave fires constantly; the history must stay readable anyway."""
    history = versions(client, form["id"])
    assert len(history) == 1, [v["summary"] for v in history]
    assert history[0]["kind"] == "edit"
    assert history[0]["is_current"] is True

    client.post(f"/api/forms/{form['id']}/publish")
    history = versions(client, form["id"])
    assert [v["kind"] for v in history] == ["publish", "edit"]
    assert "Published" in history[0]["summary"]


def test_a_write_that_changes_nothing_is_not_recorded(client, form):
    before = versions(client, form["id"])
    client.patch(f"/api/forms/{form['id']}", json={"title": "Feedback"})
    assert versions(client, form["id"]) == before


def test_the_summary_names_what_changed(client, form):
    client.post(f"/api/forms/{form['id']}/publish")  # close the editing session

    client.patch(
        f"/api/questions/{form['first']['id']}", json={"title": "What is your name?"}
    )
    assert "Edited “What is your name?”" in versions(client, form["id"])[0]["summary"]

    client.post(f"/api/forms/{form['id']}/publish")
    client.delete(f"/api/questions/{form['second']['id']}")
    assert "Deleted “How did we do?”" in versions(client, form["id"])[0]["summary"]

    client.post(f"/api/forms/{form['id']}/publish")
    client.patch(f"/api/forms/{form['id']}", json={"title": "Renamed"})
    assert "Renamed the form" in versions(client, form["id"])[0]["summary"]


def test_a_reorder_is_reported_as_a_reorder_not_as_edits(client, form):
    """Position is excluded from the block diff so moving blocks says so."""
    client.post(f"/api/forms/{form['id']}/publish")
    order = [q["id"] for q in client.get(f"/api/forms/{form['id']}").json()["questions"]]
    client.put(
        f"/api/forms/{form['id']}/questions/order",
        json={"question_ids": list(reversed(order))},
    )
    summary = versions(client, form["id"])[0]["summary"]
    assert summary == "Reordered blocks", summary


def test_restoring_brings_back_a_deleted_block_and_its_answers(client, form):
    """The whole point: a rollback must not orphan what was already collected."""
    slug = client.post(f"/api/forms/{form['id']}/publish").json()["slug"]
    client.post(
        f"/api/f/{slug}/responses",
        json={
            "answers": [
                {"question_id": form["first"]["id"], "value": "Ada"},
                {"question_id": form["second"]["id"], "value": 5},
            ]
        },
    )
    good = versions(client, form["id"])[0]["id"]

    client.delete(f"/api/questions/{form['second']['id']}")
    live = client.get(f"/api/forms/{form['id']}").json()["questions"]
    assert form["second"]["id"] not in [q["id"] for q in live]

    restored = client.post(f"/api/forms/{form['id']}/versions/{good}/restore")
    assert restored.status_code == 200, restored.text

    live = client.get(f"/api/forms/{form['id']}").json()["questions"]
    assert form["second"]["id"] in [q["id"] for q in live]

    # Revived by ID, so the answer collected against it still resolves.
    rows = client.get(f"/api/forms/{form['id']}/responses").json()["items"]
    assert len(rows) == 1
    assert len(rows[0]["answers"]) == 2


def test_restoring_is_itself_recorded_so_it_can_be_undone(client, form):
    client.post(f"/api/forms/{form['id']}/publish")
    original = versions(client, form["id"])[0]["id"]

    client.patch(f"/api/questions/{form['first']['id']}", json={"title": "Changed"})
    after_edit = versions(client, form["id"])[0]["id"]

    client.post(f"/api/forms/{form['id']}/versions/{original}/restore")
    history = versions(client, form["id"])
    assert history[0]["kind"] == "restore"

    # Rolling forward again reaches the edit that was rolled back.
    client.post(f"/api/forms/{form['id']}/versions/{after_edit}/restore")
    live = client.get(f"/api/forms/{form['id']}").json()["questions"]
    first = next(q for q in live if q["id"] == form["first"]["id"])
    assert first["title"] == "Changed"


def test_restoring_does_not_republish_a_form(client, form):
    """Status is the form's live identity, not part of what is rolled back."""
    client.post(f"/api/forms/{form['id']}/publish")
    published = versions(client, form["id"])[0]["id"]
    client.post(f"/api/forms/{form['id']}/unpublish")

    client.post(f"/api/forms/{form['id']}/versions/{published}/restore")
    assert client.get(f"/api/forms/{form['id']}").json()["status"] == "draft"


def test_a_version_from_another_form_is_refused(client, form):
    other = client.post("/api/forms", json={"title": "Other"}).json()
    client.post(f"/api/forms/{other['id']}/questions", json={"type": "email", "title": "Mail"})
    stolen = versions(client, other["id"])[0]["id"]

    refused = client.post(f"/api/forms/{form['id']}/versions/{stolen}/restore")
    assert refused.status_code == 404


def test_history_is_capped(client, form, monkeypatch):
    """A long editing afternoon must not grow the table without bound."""
    monkeypatch.setattr(version_service, "MAX_VERSIONS", 3)
    for index in range(6):
        client.patch(f"/api/forms/{form['id']}", json={"title": f"Title {index}"})
        client.post(f"/api/forms/{form['id']}/publish")  # non-edit: never coalesces
        client.post(f"/api/forms/{form['id']}/unpublish")

    assert len(versions(client, form["id"])) <= 3


def test_no_version_is_ever_dated_in_the_past(client, form):
    """A version records something the system did, so it is stamped when it did it.

    Written after shipping the opposite twice. The seed grew a fabricated
    history: first invented summaries over a single repeated snapshot, so every
    Restore button was a no-op; then real summaries stamped eight days into a
    past this project does not have. Both read convincingly in the panel, which
    is why this asserts on the clock rather than on the wording.
    """
    started = datetime.now(timezone.utc) - timedelta(minutes=1)

    client.patch(f"/api/forms/{form['id']}", json={"title": "Renamed"})
    client.post(f"/api/forms/{form['id']}/publish")

    history = versions(client, form["id"])
    assert history, "editing a form must record something"

    for version in history:
        # The API serialises the naive-UTC column, so read it back as UTC.
        stamped = datetime.fromisoformat(version["created_at"]).replace(
            tzinfo=timezone.utc
        )
        assert started <= stamped <= datetime.now(timezone.utc) + timedelta(minutes=1), (
            version["created_at"]
        )


def test_the_seed_writes_no_history_at_all(db_session, monkeypatch):
    """Seeding must not invent versions for forms nobody has edited.

    Runs the real seed against the throwaway test database, so it also catches
    a seed that has stopped working outright.
    """
    from sqlalchemy.orm import sessionmaker

    import app.seed as seed_module
    from app.models import FormVersion

    monkeypatch.setattr(
        seed_module,
        "SessionLocal",
        sessionmaker(bind=db_session.get_bind(), autoflush=False, expire_on_commit=False),
    )
    seed_module.seed()

    assert db_session.query(FormVersion).count() == 0


def test_seeding_refuses_to_delete_collected_responses(db_session, monkeypatch):
    """Re-seeding cascades. On a live database that is data loss, not a reset.

    Written after doing exactly that to the deployed database: `python -m
    app.seed` deleted the three seeded forms and every response collected on
    them, with nothing in the script to suggest it would.
    """
    from sqlalchemy.orm import sessionmaker

    import app.seed as seed_module
    from app.models import Response

    factory = sessionmaker(
        bind=db_session.get_bind(), autoflush=False, expire_on_commit=False
    )
    monkeypatch.setattr(seed_module, "SessionLocal", factory)

    seed_module.seed()
    before = db_session.query(Response).count()
    assert before > 0

    with pytest.raises(seed_module.SeedWouldDestroyData):
        seed_module.seed()
    assert db_session.query(Response).count() == before, "refusal must change nothing"

    # …and it can still be said explicitly.
    seed_module.seed(force=True)
    assert db_session.query(Response).count() == before
