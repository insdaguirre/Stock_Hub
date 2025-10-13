from fastapi.testclient import TestClient
import sys
import os
import types

CURRENT_DIR = os.path.dirname(__file__)
PROJECT_ROOT = os.path.dirname(CURRENT_DIR)
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

import app as app_module


class DummyJob:
    def __init__(self, job_id, result=None, status='queued', failed=False):
        self.id = job_id
        self.result = result
        self._status = status
        self._failed = failed
        self.exc_info = None

    @property
    def is_finished(self):
        return self._status == 'finished'

    @property
    def is_failed(self):
        return self._failed

    def get_status(self):
        return self._status


class DummyQueue:
    def __init__(self):
        self.jobs = {}
        self.counter = 0

    def enqueue(self, func, symbol):
        self.counter += 1
        job_id = f"job-{self.counter}"
        # store placeholder job; tests will update status later
        job = DummyJob(job_id)
        self.jobs[job_id] = job
        return job

    @property
    def connection(self):
        return None


def test_phase3_job_flow():
    # Setup dummy queue
    dq = DummyQueue()
    app_module.job_queue = dq
    # Avoid external calls
    app_module.fetch_stock_data = lambda symbol: [
        {"date": "2025-09-22", "price": 97.0},
        {"date": "2025-09-23", "price": 98.0},
        {"date": "2025-09-24", "price": 99.0},
        {"date": "2025-09-25", "price": 100.0},
        {"date": "2025-09-26", "price": 101.0},
    ]

    client = TestClient(app_module.app)

    # Request predictions → 202 with job_id
    r1 = client.get("/api/predictions/AAPL")
    assert r1.status_code == 202
    job_id = r1.json()["job_id"]
    assert job_id in dq.jobs

    # Poll queued
    def fake_fetch(job_id, connection=None):
        return dq.jobs[job_id]

    # Monkeypatch Job.fetch
    import app as am
    from rq import job as rq_job
    rq_job.Job.fetch = staticmethod(fake_fetch)

    r2 = client.get(f"/api/jobs/{job_id}")
    assert r2.status_code == 200
    assert r2.json()["status"] in ("queued", "deferred")

    # Transition to running
    dq.jobs[job_id]._status = 'started'
    r3 = client.get(f"/api/jobs/{job_id}")
    assert r3.json()["status"] == "running"

    # Transition to finished with result
    dq.jobs[job_id]._status = 'finished'
    dq.jobs[job_id].result = {"ok": True}
    r4 = client.get(f"/api/jobs/{job_id}")
    assert r4.json() == {"status": "done", "result": {"ok": True}}

    print("Phase 3 job flow tests passed")


if __name__ == "__main__":
    test_phase3_job_flow()

