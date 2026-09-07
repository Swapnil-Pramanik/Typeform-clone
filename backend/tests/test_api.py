"""End-to-end coverage of the invariants the schema decisions rest on."""


def _form_with_question(client, *, required=True):
    form = client.post("/api/forms", json={"title": "Test form"}).json()
    question = client.post(
        f"/api/forms/{form['id']}/questions",
        json={"type": "short_text", "title": "Your name?", "required": required},
    ).json()
    return form, question


def test_publish_requires_at_least_one_question(client):
    form = client.post("/api/forms", json={"title": "Empty"}).json()
    # A fresh form holds only an ending block, which is not answerable.
    assert client.post(f"/api/forms/{form['id']}/publish").status_code == 400


def test_publish_mints_a_slug_and_unpublish_keeps_it(client):
    form, _ = _form_with_question(client)
    published = client.post(f"/api/forms/{form['id']}/publish").json()
    assert published["status"] == "published"
    slug = published["slug"]
    assert slug

    unpublished = client.post(f"/api/forms/{form['id']}/unpublish").json()
    assert unpublished["status"] == "draft"
    assert unpublished["slug"] == slug, "a shared link must survive unpublishing"

    # …but the public surface must not serve it while it is a draft.
    assert client.get(f"/api/f/{slug}").status_code == 404


def test_public_surface_never_exposes_the_numeric_id(client):
    form, _ = _form_with_question(client)
    slug = client.post(f"/api/forms/{form['id']}/publish").json()["slug"]
    public = client.get(f"/api/f/{slug}").json()
    assert "id" not in public and "status" not in public


def test_answers_survive_the_question_being_deleted(client):
    """The central decision: history must not be rewritten by a later edit."""
    form, question = _form_with_question(client)
    slug = client.post(f"/api/forms/{form['id']}/publish").json()["slug"]

    client.post(
        f"/api/f/{slug}/responses",
        json={"answers": [{"question_id": question["id"], "value": "Ada"}]},
    )

    client.patch(f"/api/questions/{question['id']}", json={"title": "Renamed later"})
    client.delete(f"/api/questions/{question['id']}")

    remaining = client.get(f"/api/forms/{form['id']}").json()["questions"]
    assert question["id"] not in [q["id"] for q in remaining]

    answer = client.get(f"/api/forms/{form['id']}/responses").json()["items"][0]["answers"][0]
    assert answer["question_title"] == "Your name?"
    assert answer["display_value"] == "Ada"


def test_server_rejects_what_the_client_might_not(client):
    form = client.post("/api/forms", json={"title": "Validated"}).json()
    email = client.post(
        f"/api/forms/{form['id']}/questions",
        json={"type": "email", "title": "Email?", "required": True},
    ).json()
    slug = client.post(f"/api/forms/{form['id']}/publish").json()["slug"]

    bad = client.post(
        f"/api/f/{slug}/responses",
        json={"answers": [{"question_id": email["id"], "value": "not-an-email"}]},
    )
    assert bad.status_code == 422
    assert bad.json()["detail"]["question_id"] == email["id"]

    missing = client.post(f"/api/f/{slug}/responses", json={"answers": []})
    assert missing.status_code == 422


def test_choice_answer_must_belong_to_its_question(client):
    form = client.post("/api/forms", json={"title": "Choices"}).json()
    question = client.post(
        f"/api/forms/{form['id']}/questions",
        json={"type": "multiple_choice", "title": "Pick", "required": True},
    ).json()
    slug = client.post(f"/api/forms/{form['id']}/publish").json()["slug"]

    rejected = client.post(
        f"/api/f/{slug}/responses",
        json={"answers": [{"question_id": question["id"], "value": [999999]}]},
    )
    assert rejected.status_code == 422


def test_reorder_rewrites_every_position_and_rejects_partial_arrays(client):
    form = client.post("/api/forms", json={"title": "Ordering"}).json()
    ids = [
        client.post(
            f"/api/forms/{form['id']}/questions",
            json={"type": "short_text", "title": f"Q{index}"},
        ).json()["id"]
        for index in range(3)
    ]
    ending_id = form["questions"][0]["id"]

    reordered = client.put(
        f"/api/forms/{form['id']}/questions/order",
        json={"question_ids": [ids[2], ids[0], ending_id, ids[1]]},
    ).json()
    assert [q["id"] for q in reordered["questions"]] == [ids[2], ids[0], ending_id, ids[1]]
    assert [q["position"] for q in reordered["questions"]] == [0, 1, 2, 3]

    partial = client.put(
        f"/api/forms/{form['id']}/questions/order", json={"question_ids": ids[:2]}
    )
    assert partial.status_code == 400


def test_duplicate_copies_questions_but_not_responses(client):
    form, question = _form_with_question(client)
    slug = client.post(f"/api/forms/{form['id']}/publish").json()["slug"]
    client.post(
        f"/api/f/{slug}/responses",
        json={"answers": [{"question_id": question["id"], "value": "Ada"}]},
    )

    copy = client.post(f"/api/forms/{form['id']}/duplicate").json()
    assert copy["title"] == "Test form (copy)"
    assert copy["status"] == "draft" and copy["slug"] is None
    assert [q["title"] for q in copy["questions"]] == [q["title"] for q in
                                                       client.get(f"/api/forms/{form['id']}").json()["questions"]]
    assert client.get(f"/api/forms/{copy['id']}/responses").json()["total"] == 0


def test_summary_aggregates_and_partials_lower_the_completion_rate(client):
    form = client.post("/api/forms", json={"title": "Stats"}).json()
    rating = client.post(
        f"/api/forms/{form['id']}/questions",
        json={"type": "rating", "title": "Score", "settings": {"max_rating": 5}},
    ).json()
    slug = client.post(f"/api/forms/{form['id']}/publish").json()["slug"]

    for score in (2, 4, 5):
        client.post(
            f"/api/f/{slug}/responses",
            json={"answers": [{"question_id": rating["id"], "value": score}]},
        )
    client.post(
        f"/api/f/{slug}/responses",
        json={"answers": [], "is_complete": False},
    )

    summary = client.get(f"/api/forms/{form['id']}/summary").json()
    assert summary["total_responses"] == 4
    assert summary["completed_responses"] == 3
    assert summary["completion_rate"] == 0.75
    stats = summary["questions"][0]
    assert stats["answered"] == 3
    assert stats["average"] == 3.67
    assert (stats["minimum"], stats["maximum"]) == (2.0, 5.0)


def test_choice_counts_come_out_per_option(client):
    form = client.post("/api/forms", json={"title": "Counts"}).json()
    question = client.post(
        f"/api/forms/{form['id']}/questions",
        json={
            "type": "multiple_choice",
            "title": "Pick",
            "settings": {"multi_select": True},
            "options": [{"label": "A"}, {"label": "B"}, {"label": "C"}],
        },
    ).json()
    option_ids = [o["id"] for o in question["options"]]
    slug = client.post(f"/api/forms/{form['id']}/publish").json()["slug"]

    for picks in ([option_ids[0]], [option_ids[0], option_ids[2]], [option_ids[1]]):
        client.post(
            f"/api/f/{slug}/responses",
            json={"answers": [{"question_id": question["id"], "value": picks}]},
        )

    counts = client.get(f"/api/forms/{form['id']}/summary").json()["questions"][0]["choices"]
    assert {c["label"]: c["count"] for c in counts} == {"A": 2, "B": 1, "C": 1}


def test_deleting_a_form_that_has_responses_cascades(client):
    """Regression: answers reference questions, so the cascade order matters.

    Deleting a form removes its questions; without a database-level cascade on
    ``answers.question_id`` that removal violates the foreign key and the whole
    delete fails.
    """
    form, question = _form_with_question(client)
    slug = client.post(f"/api/forms/{form['id']}/publish").json()["slug"]
    client.post(
        f"/api/f/{slug}/responses",
        json={"answers": [{"question_id": question["id"], "value": "Ada"}]},
    )
    assert client.get(f"/api/forms/{form['id']}/responses").json()["total"] == 1

    assert client.delete(f"/api/forms/{form['id']}").status_code == 204
    assert client.get(f"/api/forms/{form['id']}").status_code == 404
    assert client.get(f"/api/f/{slug}").status_code == 404


def test_a_closed_form_refuses_submissions(client):
    """Closing a form is access control, so the server enforces it itself.

    A stale tab, or anything posting straight to the API, must be refused — the
    client hiding the questions is a courtesy, not the mechanism.
    """
    form, question = _form_with_question(client)
    slug = client.post(f"/api/forms/{form['id']}/publish").json()["slug"]

    answer = {"answers": [{"question_id": question["id"], "value": "Ada"}]}
    assert client.post(f"/api/f/{slug}/responses", json=answer).status_code == 200

    closed = client.patch(f"/api/forms/{form['id']}", json={"accepting_responses": False})
    assert closed.status_code == 200
    assert closed.json()["accepting_responses"] is False

    refused = client.post(f"/api/f/{slug}/responses", json=answer)
    assert refused.status_code == 409
    assert "no longer accepting" in refused.json()["detail"].lower()

    # The form itself stays readable, so the flow can explain why.
    public = client.get(f"/api/f/{slug}").json()
    assert public["accepting_responses"] is False

    client.patch(f"/api/forms/{form['id']}", json={"accepting_responses": True})
    assert client.post(f"/api/f/{slug}/responses", json=answer).status_code == 200


def test_display_settings_round_trip_and_default_to_shown(client):
    form = client.post("/api/forms", json={"title": "Display"}).json()
    assert form["settings"]["show_progress_bar"] is True

    updated = client.patch(
        f"/api/forms/{form['id']}",
        json={"settings": {"show_progress_bar": False, "show_answer_letters": False}},
    ).json()
    assert updated["settings"]["show_progress_bar"] is False
    assert updated["settings"]["show_answer_letters"] is False
    # Unmentioned switches keep their default rather than vanishing.
    assert updated["settings"]["show_branding"] is True


def test_display_settings_reach_the_respondent(client):
    """The flow renders from these, so they have to cross the public surface."""
    form, _ = _form_with_question(client)
    client.patch(
        f"/api/forms/{form['id']}", json={"settings": {"show_question_number": False}}
    )
    slug = client.post(f"/api/forms/{form['id']}/publish").json()["slug"]
    assert client.get(f"/api/f/{slug}").json()["settings"]["show_question_number"] is False
