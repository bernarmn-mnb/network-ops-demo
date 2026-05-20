"""Voice synthesis route for TTS via Google Cloud Text-to-Speech.

Provides a streaming audio endpoint that converts text to speech.
Designed to be reusable across any demo — not specific to any particular assistant.

Requires the optional `voice` extra: pip install -e ".[voice]"
Without it, all endpoints return 503 gracefully.

Usage:
    POST /api/voice/synthesize
    Body: {"text": "Hello world", "voice": "en-GB-Wavenet-B", "speed": 1.0}
    Returns: audio/mp3 binary stream
"""

import io
import logging

from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/voice", tags=["voice"])

# Lazy-loaded TTS client and module (avoids import cost if voice not used)
_tts_client = None
_tts_module = None


def get_tts():
    """Get or create the Google Cloud TTS client and module (lazy singleton).

    Returns:
        Tuple of (client, texttospeech module).

    Raises:
        HTTPException(503): If the google-cloud-texttospeech package is not
            installed or credentials are not configured.
    """
    global _tts_client, _tts_module
    if _tts_client is None:
        try:
            from google.cloud import texttospeech

            _tts_module = texttospeech
            _tts_client = texttospeech.TextToSpeechClient()
            logger.info("Google Cloud TTS client initialized")
        except ImportError:
            raise HTTPException(
                status_code=503,
                detail="TTS service unavailable: google-cloud-texttospeech not installed. "
                "Install with: pip install -e '.[voice]'",
            ) from None
        except Exception as e:
            logger.error(f"Failed to initialize TTS client: {e}")
            raise HTTPException(
                status_code=503,
                detail=f"TTS service unavailable: {e!s}",
            ) from e
    return _tts_client, _tts_module


# Voice presets for quick selection
# Chirp3-HD = newest generation (conversational, natural)
# Studio = premium quality, warm narrator
# Neural2 = solid quality, classic BBC-style
VOICE_PRESETS = {
    "default": {"name": "en-GB-Chirp3-HD-Puck", "language": "en-GB"},
    # Chirp3-HD (newest, most conversational)
    "puck": {"name": "en-GB-Chirp3-HD-Puck", "language": "en-GB"},
    "fenrir": {"name": "en-GB-Chirp3-HD-Fenrir", "language": "en-GB"},
    "charon": {"name": "en-GB-Chirp3-HD-Charon", "language": "en-GB"},
    "enceladus": {"name": "en-GB-Chirp3-HD-Enceladus", "language": "en-GB"},
    "aoede": {"name": "en-GB-Chirp3-HD-Aoede", "language": "en-GB"},
    "zephyr": {"name": "en-GB-Chirp3-HD-Zephyr", "language": "en-GB"},
    # Premium / classic
    "studio-gb": {"name": "en-GB-Studio-B", "language": "en-GB"},
    "neural-gb": {"name": "en-GB-Neural2-D", "language": "en-GB"},
    # Legacy presets
    "female-gb": {"name": "en-GB-Wavenet-A", "language": "en-GB"},
    "male-gb": {"name": "en-GB-Wavenet-B", "language": "en-GB"},
    "female-us": {"name": "en-US-Wavenet-F", "language": "en-US"},
    "male-us": {"name": "en-US-Wavenet-D", "language": "en-US"},
}

MAX_TTS_TEXT_LENGTH = 2000


class SynthesizeRequest(BaseModel):
    """Request body for text-to-speech synthesis."""

    text: str = Field(..., min_length=1, max_length=MAX_TTS_TEXT_LENGTH)
    voice: str = Field(
        default="default",
        description="Voice preset name or full voice ID (e.g. en-GB-Wavenet-B)",
    )
    speed: float = Field(default=1.0, ge=0.25, le=4.0)
    pitch: float = Field(default=0.0, ge=-20.0, le=20.0)


@router.post("/synthesize")
async def synthesize_speech(request: SynthesizeRequest):
    """Convert text to speech audio.

    Returns MP3 audio as a streaming binary response.
    """
    client, tts = get_tts()

    # Resolve voice preset or use raw voice name
    preset = VOICE_PRESETS.get(request.voice)
    if preset:
        voice_name = preset["name"]
        language_code = preset["language"]
    else:
        voice_name = request.voice
        parts = voice_name.split("-")
        language_code = f"{parts[0]}-{parts[1]}" if len(parts) >= 2 else "en-GB"

    synthesis_input = tts.SynthesisInput(text=request.text)

    voice_params = tts.VoiceSelectionParams(
        language_code=language_code,
        name=voice_name,
    )

    audio_config = tts.AudioConfig(
        audio_encoding=tts.AudioEncoding.MP3,
        speaking_rate=request.speed,
        pitch=request.pitch,
    )

    try:
        response = client.synthesize_speech(
            input=synthesis_input,
            voice=voice_params,
            audio_config=audio_config,
        )
    except Exception as e:
        logger.error(f"TTS synthesis failed: {e}")
        raise HTTPException(status_code=500, detail=f"Synthesis failed: {e!s}") from e

    audio_stream = io.BytesIO(response.audio_content)
    return StreamingResponse(
        audio_stream,
        media_type="audio/mpeg",
        headers={
            "Content-Length": str(len(response.audio_content)),
            "Cache-Control": "no-cache",
        },
    )


@router.get("/voices")
async def list_voices():
    """List available voice presets."""
    return {
        "presets": {
            name: {**config, "description": name.replace("-", " ").title()}
            for name, config in VOICE_PRESETS.items()
        }
    }


@router.get("/health")
async def voice_health():
    """Check TTS service availability.

    Returns a `reason` field on 503 so callers (e.g. ./dev session) can
    distinguish "package not installed" from "credentials missing".
    """
    try:
        get_tts()
        return {"status": "healthy", "provider": "google-cloud-tts"}
    except HTTPException as exc:
        return JSONResponse(
            status_code=503,
            content={
                "status": "unhealthy",
                "provider": "google-cloud-tts",
                "reason": str(exc.detail),
            },
        )
