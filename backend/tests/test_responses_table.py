"""Search, sort and bulk delete on the responses table."""

import pytest


@pytest.fixture
def collected(client):
    """A published form with three submissions, answered differently."""
    form = client.post("/api/forms", json={"title": "Sports"}).json()
    question = client.post(
        f"/api/forms/{form['id']}/questions",
        json={"type": "short_text", "title": "Favourite sport?"},
    ).json()
    slug = client.post(f"/api/forms/{form['id']}/publish").json()["slug"]

    ids = []
    for value in ("Cricket", "Football", "Cricket again"):
        ids.append(
            client.post(
                f"/api/f/{slug}/responses",
                json={"answers": [{"question_id": question["id"], "value": value}]},
            ).json()["response_id"]
        )
    return {"form": form, "question": question, "ids": ids}


def rows(client, form_id, **params):
    query = "&".join(f"{key}={value}" for key, value in params.items())
    return client.get(f"/api/forms/{form_id}/responses?{query}").json()


def test_search_matches_the_rendered_answer(client, collected):
    """One ILIKE over `display_value` finds a value whatever its type."""
    found = rows(client, collected["form"]["id"], search="cricket")
    assert found["total"] == 2
    assert all(
        any("Cricket" in answer["display_value"] for answer in item["answers"])
        for item in found["items"]
    )

    assert rows(client, collected["form"]["id"], search="hockey")["total"] == 0
    # A blank term is not a filter.
    assert rows(client, collected["form"]["id"], search="")["total"] == 3


def test_sort_flips_the_order(client, collected):
    newest = [item["id"] for item in rows(client, collected["form"]["id"])["items"]]
    oldest = [
        item["id"]
        for item in rows(client, collected["form"]["id"], sort="oldest")["items"]
    ]
    assert oldest == list(reversed(newest))


def test_bulk_delete_removes_only_what_was_selected(client, collected):
    doomed = collected["ids"][:2]
    result = client.post(
        f"/api/forms/{collected['form']['id']}/responses/delete",
        json={"response_ids": doomed},
    )
    assert result.status_code == 200
    assert result.json()["deleted"] == 2

    left = rows(client, collected["form"]["id"])
    assert left["total"] == 1
    assert [item["id"] for item in left["items"]] == [collected["ids"][2]]


def test_delete_cannot_reach_another_form(client, collected):
    """The IDs come from a checkbox column; a stale page must not cross forms."""
    other = client.post("/api/forms", json={"title": "Other"}).json()
    question = client.post(
        f"/api/forms/{other['id']}/questions",
        json={"type": "short_text", "title": "Hello?"},
    ).json()
    slug = client.post(f"/api/forms/{other['id']}/publish").json()["slug"]
    theirs = client.post(
        f"/api/f/{slug}/responses",
        json={"answers": [{"question_id": question["id"], "value": "Hi"}]},
    ).json()["response_id"]

    result = client.post(
        f"/api/forms/{collected['form']['id']}/responses/delete",
        json={"response_ids": [theirs]},
    )
    assert result.status_code == 200
    assert result.json()["deleted"] == 0
    assert rows(client, other["id"])["total"] == 1


def test_each_row_carries_the_ending_it_reached(client, collected):
    """The table shows an Ending column, so the row has to know its ending."""
    listed = rows(client, collected["form"]["id"])["items"]
    assert all(item["ending_title"] for item in listed)
