"""Branching: the path a respondent takes, and what that makes required.

The shape under test throughout is a recommendation question that forks:

    Q1 recommend?  ──yes──▶ Q3 email          (skip the complaint)
                   └─no───▶ Q2 what to fix    (required, but only on this branch)
"""

import pytest


@pytest.fixture
def branched(client):
    """A published form whose first question forks, plus its question IDs."""
    form = client.post("/api/forms", json={"title": "Branching"}).json()

    def add(payload):
        return client.post(f"/api/forms/{form['id']}/questions", json=payload).json()

    recommend = add({"type": "yes_no", "title": "Would you recommend us?", "required": True})
    fix = add({"type": "short_text", "title": "What should we fix?", "required": True})
    email = add({"type": "email", "title": "Your email?"})

    rules = client.put(
        f"/api/questions/{recommend['id']}/rules",
        json={"rules": [{"operator": "is", "value": True, "target_question_id": email["id"]}]},
    )
    assert rules.status_code == 200, rules.text

    slug = client.post(f"/api/forms/{form['id']}/publish").json()["slug"]
    return {"form": form, "slug": slug, "recommend": recommend, "fix": fix, "email": email}


def test_rules_are_returned_with_the_question(client, branched):
    questions = client.get(f"/api/forms/{branched['form']['id']}").json()["questions"]
    rules = next(q for q in questions if q["id"] == branched["recommend"]["id"])["rules"]
    assert len(rules) == 1
    assert rules[0]["operator"] == "is"
    assert rules[0]["target_question_id"] == branched["email"]["id"]


def test_the_public_form_carries_the_rules(client, branched):
    """The flow navigates client-side, so the rules have to reach the respondent."""
    public = client.get(f"/api/f/{branched['slug']}").json()
    recommend = next(
        q for q in public["questions"] if q["id"] == branched["recommend"]["id"]
    )
    assert recommend["rules"][0]["target_question_id"] == branched["email"]["id"]


def test_a_skipped_required_question_does_not_block_submission(client, branched):
    """The whole point: 'What should we fix?' is required but was never asked."""
    response = client.post(
        f"/api/f/{branched['slug']}/responses",
        json={
            "answers": [
                {"question_id": branched["recommend"]["id"], "value": True},
                {"question_id": branched["email"]["id"], "value": "ada@example.com"},
            ]
        },
    )
    assert response.status_code == 200, response.text


def test_a_required_question_on_the_taken_branch_still_blocks(client, branched):
    """Answering 'no' walks through the complaint question, so it is required again."""
    response = client.post(
        f"/api/f/{branched['slug']}/responses",
        json={"answers": [{"question_id": branched["recommend"]["id"], "value": False}]},
    )
    assert response.status_code == 422
    assert response.json()["detail"]["question_id"] == branched["fix"]["id"]


def test_a_rule_cannot_point_outside_the_form(client, branched):
    rejected = client.put(
        f"/api/questions/{branched['recommend']['id']}/rules",
        json={"rules": [{"operator": "is", "value": True, "target_question_id": 999999}]},
    )
    assert rejected.status_code == 400


def test_a_rule_cannot_point_at_its_own_question(client, branched):
    rejected = client.put(
        f"/api/questions/{branched['recommend']['id']}/rules",
        json={
            "rules": [
                {
                    "operator": "is",
                    "value": True,
                    "target_question_id": branched["recommend"]["id"],
                }
            ]
        },
    )
    assert rejected.status_code == 400


def test_a_loop_is_refused_when_the_rule_is_written(client, branched):
    """Q3 jumping back to Q1 closes a loop nobody could escape."""
    rejected = client.put(
        f"/api/questions/{branched['email']['id']}/rules",
        json={
            "rules": [
                {
                    "operator": "answered",
                    "target_question_id": branched["recommend"]["id"],
                }
            ]
        },
    )
    assert rejected.status_code == 400
    assert "loop" in rejected.json()["detail"].lower()

    # …and the refusal left nothing behind.
    questions = client.get(f"/api/forms/{branched['form']['id']}").json()["questions"]
    assert next(q for q in questions if q["id"] == branched["email"]["id"])["rules"] == []


def test_rules_survive_a_round_trip_and_can_be_cleared(client, branched):
    cleared = client.put(
        f"/api/questions/{branched['recommend']['id']}/rules", json={"rules": []}
    )
    assert cleared.status_code == 200
    assert cleared.json()["rules"] == []

    # With no rules the form is linear again, so the complaint question returns.
    response = client.post(
        f"/api/f/{branched['slug']}/responses",
        json={"answers": [{"question_id": branched["recommend"]["id"], "value": True}]},
    )
    assert response.status_code == 422
    assert response.json()["detail"]["question_id"] == branched["fix"]["id"]


def test_a_rule_pointing_at_a_deleted_question_is_ignored(client, branched):
    """Soft-deleting a target must not strand a respondent on something invisible."""
    client.delete(f"/api/questions/{branched['email']['id']}")

    response = client.post(
        f"/api/f/{branched['slug']}/responses",
        json={"answers": [{"question_id": branched["recommend"]["id"], "value": True}]},
    )
    # The rule is skipped, so the flow falls through to the next question, which
    # is required and unanswered.
    assert response.status_code == 422
    assert response.json()["detail"]["question_id"] == branched["fix"]["id"]


# --- "Always go to" ----------------------------------------------------------


def test_always_skips_the_next_question_whatever_the_answer(client, branched):
    """The builder's "Always go to": no condition, so Q2 is never asked."""
    saved = client.put(
        f"/api/questions/{branched['recommend']['id']}/rules",
        json={
            "rules": [
                {"operator": "always", "target_question_id": branched["email"]["id"]}
            ]
        },
    )
    assert saved.status_code == 200, saved.text

    for answer in (True, False):
        response = client.post(
            f"/api/f/{branched['slug']}/responses",
            json={
                "answers": [
                    {"question_id": branched["recommend"]["id"], "value": answer},
                    {"question_id": branched["email"]["id"], "value": "ada@example.com"},
                ]
            },
        )
        # Q2 is required and unanswered; it does not block, because the always
        # rule means it was never on the path.
        assert response.status_code == 200, response.text


def test_conditional_rules_outrank_the_always_rule_below_them(client, branched):
    """Order is precedence, and "Always go to" is stored last for that reason."""
    client.put(
        f"/api/questions/{branched['recommend']['id']}/rules",
        json={
            "rules": [
                {"operator": "is", "value": False, "target_question_id": branched["fix"]["id"]},
                {"operator": "always", "target_question_id": branched["email"]["id"]},
            ]
        },
    )

    # "no" takes the conditional rule, so the required Q2 is on the path.
    blocked = client.post(
        f"/api/f/{branched['slug']}/responses",
        json={"answers": [{"question_id": branched["recommend"]["id"], "value": False}]},
    )
    assert blocked.status_code == 422
    assert blocked.json()["detail"]["question_id"] == branched["fix"]["id"]

    # "yes" falls past it to the always rule.
    allowed = client.post(
        f"/api/f/{branched['slug']}/responses",
        json={"answers": [{"question_id": branched["recommend"]["id"], "value": True}]},
    )
    assert allowed.status_code == 200, allowed.text


def test_an_always_rule_pointing_backwards_is_refused_as_a_loop(client, branched):
    rejected = client.put(
        f"/api/questions/{branched['email']['id']}/rules",
        json={
            "rules": [
                {"operator": "always", "target_question_id": branched["recommend"]["id"]}
            ]
        },
    )
    assert rejected.status_code == 400
    assert "loop" in rejected.json()["detail"].lower()


def test_always_replaces_the_fall_through_rather_than_racing_it(client, branched):
    """The cycle checker must not walk an edge the always rule has removed.

    Give Q1 an always rule to Q3, then point Q2 back at Q1::

        Q1 ──always──▶ Q3        Q2 ──always──▶ Q1

    Nothing loops: Q1 goes straight to Q3 and Q2 is simply unreachable. But if
    the checker still believed in Q1's next-by-position edge to Q2, it would see
    Q1 → Q2 → Q1 and refuse the second rule. Both writes must be accepted.
    """
    first = client.put(
        f"/api/questions/{branched['recommend']['id']}/rules",
        json={
            "rules": [
                {"operator": "always", "target_question_id": branched["email"]["id"]}
            ]
        },
    )
    assert first.status_code == 200, first.text

    second = client.put(
        f"/api/questions/{branched['fix']['id']}/rules",
        json={
            "rules": [
                {"operator": "always", "target_question_id": branched["recommend"]["id"]}
            ]
        },
    )
    assert second.status_code == 200, second.text
