"""Count the SQL statements each endpoint emits.

Production is SQLite over HTTP, so a statement is a network round trip and this
count is the closest thing to a latency number that can be measured offline.
Run it against a seeded local database:

    python -m scripts.profile_queries

See the README's "Scale, latency and the queries behind them".
"""
import re, time
from collections import Counter
from fastapi.testclient import TestClient
from sqlalchemy import event
from app.db import engine
from app.main import app

stmts = []
@event.listens_for(engine, "after_cursor_execute")
def _log(conn, cursor, statement, params, context, executemany):
    stmts.append(" ".join(statement.split())[:110])

client = TestClient(app)
forms = client.get("/api/forms").json()
f = next(x for x in forms if x["title"] == "Customer feedback")
slug = f["slug"]
fid = f["id"]
questions = [q for q in client.get(f"/api/forms/{fid}").json()["questions"] if q["type"] != "ending"]


def sample(q):
    """A valid answer for each type — a rejected submit stores nothing to count."""
    if q["type"] == "rating":
        return 4
    if q["type"] == "number":
        return 2
    if q["type"] == "yes_no":
        return True
    if q["type"] == "email":
        return "someone@example.com"
    if q["options"]:
        return [q["options"][0]["id"]]
    return "Profiling"


submission = {
    "answers": [{"question_id": q["id"], "value": sample(q)} for q in questions],
    "is_complete": True,
}

CASES = [
    ("GET  /api/forms                (dashboard)", lambda: client.get("/api/forms")),
    ("GET  /api/forms/{id}           (builder)",   lambda: client.get(f"/api/forms/{fid}")),
    ("GET  /api/f/{slug}             (respondent)",lambda: client.get(f"/api/f/{slug}")),
    ("POST /api/f/{slug}/responses   (submit)",
     lambda: client.post(f"/api/f/{slug}/responses", json=submission)),
    ("GET  /api/forms/{id}/responses (results)",   lambda: client.get(f"/api/forms/{fid}/responses")),
    ("GET  /api/forms/{id}/summary   (summary)",   lambda: client.get(f"/api/forms/{fid}/summary")),
    ("GET  /api/forms/{id}/versions  (history)",   lambda: client.get(f"/api/forms/{fid}/versions")),
]

print(f"{'endpoint':<46} {'queries':>8}  {'ms':>7}")
print("-" * 66)
detail = {}
for name, call in CASES:
    stmts.clear()
    t0 = time.perf_counter()
    r = call()
    ms = (time.perf_counter() - t0) * 1000
    detail[name] = list(stmts)
    print(f"{name:<46} {len(stmts):>8}  {ms:>7.1f}   [{r.status_code}]")

print("\n--- repeated statements (the N+1 smell) ---")
for name, sql in detail.items():
    dupes = {s: c for s, c in Counter(sql).items() if c > 1}
    if dupes:
        print(f"\n{name}")
        for s, c in sorted(dupes.items(), key=lambda kv: -kv[1])[:4]:
            print(f"   x{c}  {s[:100]}")
