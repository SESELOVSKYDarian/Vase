import os
import tempfile
from pathlib import Path
from typing import Callable

from fastapi import FastAPI, File, Header, HTTPException, UploadFile

MAX_BYTES = int(os.getenv("MAX_AUDIO_BYTES", str(15 * 1024 * 1024)))
ALLOWED_TYPES = {
    "audio/ogg",
    "audio/mpeg",
    "audio/mp4",
    "audio/webm",
    "audio/wav",
    "audio/x-wav",
}

app = FastAPI(title="Vase Transcription", version="1.0.0")
_transcriber: Callable[[Path], str] | None = None


def _auth(authorization: str | None) -> None:
    token = os.getenv("TRANSCRIPTION_SERVICE_TOKEN", "").strip()
    if not token:
        raise HTTPException(status_code=503, detail="TOKEN_NOT_CONFIGURED")
    if authorization != f"Bearer {token}":
        raise HTTPException(status_code=403, detail="FORBIDDEN")


def _load_transcriber() -> Callable[[Path], str]:
    global _transcriber
    if _transcriber is not None:
        return _transcriber

    from faster_whisper import WhisperModel

    model = WhisperModel(
        os.getenv("WHISPER_MODEL", "small"),
        device=os.getenv("WHISPER_DEVICE", "cpu"),
        compute_type=os.getenv("WHISPER_COMPUTE_TYPE", "int8"),
    )

    def run(path: Path) -> str:
        segments, _info = model.transcribe(str(path), beam_size=1)
        return " ".join(segment.text.strip() for segment in segments).strip()

    _transcriber = run
    return run


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/v1/transcribe")
async def transcribe(
    audio: UploadFile = File(...),
    authorization: str | None = Header(default=None),
):
    _auth(authorization)
    if audio.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=415, detail="UNSUPPORTED_AUDIO_TYPE")

    data = await audio.read(MAX_BYTES + 1)
    if not data:
        raise HTTPException(status_code=400, detail="EMPTY_AUDIO")
    if len(data) > MAX_BYTES:
        raise HTTPException(status_code=413, detail="AUDIO_TOO_LARGE")

    suffix = Path(audio.filename or "audio.ogg").suffix or ".ogg"
    temp_path: Path | None = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as handle:
            handle.write(data)
            temp_path = Path(handle.name)
        text = _load_transcriber()(temp_path)
        if not text:
            raise HTTPException(status_code=422, detail="EMPTY_TRANSCRIPT")
        return {"text": text}
    finally:
        if temp_path is not None:
            temp_path.unlink(missing_ok=True)
