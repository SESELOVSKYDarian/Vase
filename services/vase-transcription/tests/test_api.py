import os
import sys
from pathlib import Path

from fastapi.testclient import TestClient

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from app import main


def client(monkeypatch):
    monkeypatch.setenv("TRANSCRIPTION_SERVICE_TOKEN", "secret")
    main._transcriber = lambda path: "quiero comprar dos productos"
    return TestClient(main.app)


def test_requires_internal_bearer(monkeypatch):
    c = client(monkeypatch)
    response = c.post("/v1/transcribe", files={"audio": ("a.ogg", b"audio", "audio/ogg")})
    assert response.status_code == 403


def test_transcribes_audio(monkeypatch):
    c = client(monkeypatch)
    response = c.post(
        "/v1/transcribe",
        headers={"authorization": "Bearer secret"},
        files={"audio": ("a.ogg", b"audio", "audio/ogg")},
    )
    assert response.status_code == 200
    assert response.json() == {"text": "quiero comprar dos productos"}


def test_accepts_whatsapp_opus_content_type(monkeypatch):
    c = client(monkeypatch)
    response = c.post(
        "/v1/transcribe",
        headers={"authorization": "Bearer secret"},
        files={"audio": ("a.ogg", b"audio", "audio/ogg; codecs=opus")},
    )
    assert response.status_code == 200


def test_rejects_unsupported_type(monkeypatch):
    c = client(monkeypatch)
    response = c.post(
        "/v1/transcribe",
        headers={"authorization": "Bearer secret"},
        files={"audio": ("a.txt", b"text", "text/plain")},
    )
    assert response.status_code == 415
