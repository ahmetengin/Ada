"""
VHF Audio API - RESTful endpoints for VHF audio processing

This module provides HTTP API endpoints for:
- Voice Activity Detection
- Speech-to-Text transcription
- Audio file processing
- Real-time audio stream handling

Used by Ada.Sea Node's VHFRadioService for audio processing.
"""

from fastapi import APIRouter, UploadFile, File, HTTPException, Form
from pydantic import BaseModel
from typing import Optional, Dict, Any
import tempfile
import os

from ada.services.vhf_audio_processor import VHFAudioProcessor


# Initialize router
router = APIRouter(prefix="/api/vhf-audio", tags=["VHF Audio"])

# Initialize audio processor (singleton)
audio_processor = VHFAudioProcessor(
    vad_aggressiveness=3,
    sample_rate=16000,
    whisper_model="base",
)


# Request/Response models
class VADRequest(BaseModel):
    sample_rate: int = 16000


class VADResponse(BaseModel):
    has_voice: bool
    confidence: float


class TranscriptionRequest(BaseModel):
    language: str = "en"


class TranscriptionResponse(BaseModel):
    text: str
    language: str
    confidence: float
    segments: list
    error: Optional[str] = None


class ProcessorStatus(BaseModel):
    vad_available: bool
    whisper_available: bool
    numpy_available: bool
    sample_rate: int
    whisper_model: str


# Endpoints

@router.get("/status", response_model=ProcessorStatus)
async def get_processor_status():
    """
    Get VHF audio processor status
    """
    from ada.services import vhf_audio_processor

    return ProcessorStatus(
        vad_available=vhf_audio_processor.VAD_AVAILABLE,
        whisper_available=vhf_audio_processor.WHISPER_AVAILABLE,
        numpy_available=vhf_audio_processor.np is not None,
        sample_rate=audio_processor.sample_rate,
        whisper_model="base",
    )


@router.post("/vad", response_model=VADResponse)
async def detect_voice_activity(
    audio: UploadFile = File(...),
    sample_rate: int = Form(16000),
):
    """
    Detect voice activity in audio file

    Args:
        audio: Audio file (WAV, raw PCM)
        sample_rate: Sample rate in Hz

    Returns:
        VADResponse with has_voice and confidence
    """
    try:
        # Read audio data
        audio_data = await audio.read()

        # Detect voice activity
        has_voice, confidence = audio_processor.detect_voice_activity(
            audio_data,
            sample_rate,
        )

        return VADResponse(
            has_voice=has_voice,
            confidence=confidence,
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/transcribe", response_model=TranscriptionResponse)
async def transcribe_audio(
    audio: UploadFile = File(...),
    language: str = Form("en"),
):
    """
    Transcribe audio file using Whisper

    Args:
        audio: Audio file (WAV, MP3, etc.)
        language: Language code (en, tr, auto, etc.)

    Returns:
        TranscriptionResponse with text and metadata
    """
    try:
        # Save uploaded file to temporary location
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp_file:
            audio_data = await audio.read()
            tmp_file.write(audio_data)
            tmp_file_path = tmp_file.name

        # Transcribe
        result = audio_processor.transcribe_audio(
            tmp_file_path,
            language=language,
        )

        # Clean up temp file
        os.unlink(tmp_file_path)

        return TranscriptionResponse(**result)

    except Exception as e:
        # Clean up on error
        if 'tmp_file_path' in locals():
            try:
                os.unlink(tmp_file_path)
            except:
                pass

        raise HTTPException(status_code=500, detail=str(e))


@router.post("/process", response_model=Dict[str, Any])
async def process_audio(
    audio: UploadFile = File(...),
    sample_rate: int = Form(16000),
    language: str = Form("en"),
    enable_vad: bool = Form(True),
    enable_transcription: bool = Form(True),
):
    """
    Complete audio processing pipeline: VAD + Transcription

    Args:
        audio: Audio file
        sample_rate: Sample rate in Hz
        language: Language for transcription
        enable_vad: Enable voice activity detection
        enable_transcription: Enable transcription

    Returns:
        Complete processing results
    """
    try:
        results = {}

        # Read audio
        audio_data = await audio.read()

        # VAD
        if enable_vad:
            has_voice, confidence = audio_processor.detect_voice_activity(
                audio_data,
                sample_rate,
            )
            results["vad"] = {
                "has_voice": has_voice,
                "confidence": confidence,
            }

            # Skip transcription if no voice detected
            if not has_voice and enable_transcription:
                results["transcription"] = {
                    "text": "",
                    "language": language,
                    "confidence": 0.0,
                    "segments": [],
                    "skipped": "No voice detected",
                }
                return results

        # Transcription
        if enable_transcription:
            # Save to temp file
            with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp_file:
                tmp_file.write(audio_data)
                tmp_file_path = tmp_file.name

            transcription = audio_processor.transcribe_audio(
                tmp_file_path,
                language=language,
            )

            results["transcription"] = transcription

            # Clean up
            os.unlink(tmp_file_path)

        return results

    except Exception as e:
        if 'tmp_file_path' in locals():
            try:
                os.unlink(tmp_file_path)
            except:
                pass

        raise HTTPException(status_code=500, detail=str(e))


@router.post("/enhance")
async def enhance_audio_endpoint(
    audio: UploadFile = File(...),
    sample_rate: int = Form(16000),
):
    """
    Enhance audio (noise reduction, normalization)

    Args:
        audio: Audio file
        sample_rate: Sample rate in Hz

    Returns:
        Enhanced audio file
    """
    from fastapi.responses import Response

    try:
        # Read audio
        audio_data = await audio.read()

        # Enhance
        enhanced = audio_processor.enhance_audio(audio_data, sample_rate)

        return Response(
            content=enhanced,
            media_type="audio/wav",
            headers={
                "Content-Disposition": f'attachment; filename="enhanced_{audio.filename}"'
            },
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Add router to main FastAPI app (to be done in main.py)
# app.include_router(vhf_audio.router)
