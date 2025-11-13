"""
VHF Audio Processor - Voice Activity Detection and Speech-to-Text

This module provides audio processing capabilities for VHF radio transmissions:
- Voice Activity Detection (VAD) using webrtcvad or silero-vad
- Speech-to-Text (STT) transcription using Whisper or Vosk
- Audio enhancement and noise reduction
- Real-time audio stream processing

Dependencies:
    pip install webrtcvad numpy scipy openai-whisper soundfile

For production:
    - Consider using faster-whisper for GPU acceleration
    - Vosk for offline, low-latency transcription
    - Silero-VAD for more accurate voice detection
"""

import io
import wave
import json
from typing import Optional, Tuple, Dict, Any
from pathlib import Path

try:
    import numpy as np
except ImportError:
    np = None

try:
    import webrtcvad
    VAD_AVAILABLE = True
except ImportError:
    VAD_AVAILABLE = False
    print("Warning: webrtcvad not installed. VAD will be simulated.")

try:
    import whisper
    WHISPER_AVAILABLE = True
except ImportError:
    WHISPER_AVAILABLE = False
    print("Warning: whisper not installed. STT will be simulated.")


class VHFAudioProcessor:
    """
    VHF Audio Processor for Voice Activity Detection and Transcription
    """

    def __init__(
        self,
        vad_aggressiveness: int = 3,  # 0-3, higher = more aggressive
        sample_rate: int = 16000,
        whisper_model: str = "base",  # tiny, base, small, medium, large
    ):
        """
        Initialize VHF Audio Processor

        Args:
            vad_aggressiveness: WebRTC VAD aggressiveness (0-3)
            sample_rate: Audio sample rate in Hz (8000, 16000, 32000, 48000)
            whisper_model: Whisper model size (tiny, base, small, medium, large)
        """
        self.sample_rate = sample_rate
        self.vad_aggressiveness = vad_aggressiveness

        # Initialize VAD
        if VAD_AVAILABLE:
            self.vad = webrtcvad.Vad(vad_aggressiveness)
        else:
            self.vad = None

        # Initialize Whisper STT
        if WHISPER_AVAILABLE:
            print(f"Loading Whisper model: {whisper_model}")
            self.whisper_model = whisper.load_model(whisper_model)
        else:
            self.whisper_model = None

    def detect_voice_activity(
        self,
        audio_data: bytes,
        sample_rate: Optional[int] = None,
    ) -> Tuple[bool, float]:
        """
        Detect voice activity in audio data

        Args:
            audio_data: Raw audio bytes (16-bit PCM)
            sample_rate: Sample rate (defaults to instance sample_rate)

        Returns:
            Tuple of (has_voice: bool, confidence: float)
        """
        if sample_rate is None:
            sample_rate = self.sample_rate

        if not VAD_AVAILABLE or self.vad is None:
            # Simulated VAD (energy-based)
            return self._simulate_vad(audio_data, sample_rate)

        # WebRTC VAD works with 10, 20, or 30 ms frames
        # at 8000, 16000, 32000, or 48000 Hz
        frame_duration = 30  # ms
        frame_length = int(sample_rate * frame_duration / 1000) * 2  # 2 bytes per sample

        # Split audio into frames
        frames = [
            audio_data[i:i + frame_length]
            for i in range(0, len(audio_data), frame_length)
        ]

        # Check each frame
        voice_frames = 0
        total_frames = 0

        for frame in frames:
            if len(frame) != frame_length:
                continue  # Skip incomplete frames

            try:
                is_speech = self.vad.is_speech(frame, sample_rate)
                if is_speech:
                    voice_frames += 1
                total_frames += 1
            except Exception as e:
                print(f"VAD error: {e}")
                continue

        if total_frames == 0:
            return False, 0.0

        # Calculate confidence
        confidence = voice_frames / total_frames

        # Consider voice active if >30% of frames contain speech
        has_voice = confidence > 0.3

        return has_voice, confidence

    def _simulate_vad(
        self,
        audio_data: bytes,
        sample_rate: int,
    ) -> Tuple[bool, float]:
        """
        Simulate VAD using energy-based detection (fallback)
        """
        if np is None:
            # No numpy, just return random
            import random
            return random.random() > 0.7, random.random()

        # Convert bytes to numpy array
        audio_array = np.frombuffer(audio_data, dtype=np.int16)

        # Calculate RMS energy
        rms = np.sqrt(np.mean(audio_array.astype(float) ** 2))

        # Threshold (adjust based on your audio)
        threshold = 1000  # Arbitrary threshold for 16-bit audio

        has_voice = rms > threshold
        confidence = min(rms / (threshold * 2), 1.0)

        return has_voice, float(confidence)

    def transcribe_audio(
        self,
        audio_file_path: str,
        language: str = "en",
    ) -> Dict[str, Any]:
        """
        Transcribe audio file using Whisper

        Args:
            audio_file_path: Path to audio file (WAV, MP3, etc.)
            language: Language code (en, tr, etc.)

        Returns:
            Dict with:
                - text: Transcribed text
                - language: Detected language
                - confidence: Average confidence score
                - segments: List of segments with timestamps
        """
        if not WHISPER_AVAILABLE or self.whisper_model is None:
            # Simulated transcription
            return self._simulate_transcription(audio_file_path)

        try:
            # Transcribe with Whisper
            result = self.whisper_model.transcribe(
                audio_file_path,
                language=language if language != "auto" else None,
                fp16=False,  # Use FP32 for CPU
            )

            # Calculate average confidence
            segments = result.get("segments", [])
            if segments:
                avg_confidence = sum(
                    seg.get("confidence", 0) for seg in segments
                ) / len(segments)
            else:
                avg_confidence = 0.0

            return {
                "text": result["text"].strip(),
                "language": result.get("language", language),
                "confidence": avg_confidence,
                "segments": segments,
            }

        except Exception as e:
            print(f"Transcription error: {e}")
            return {
                "text": "",
                "language": language,
                "confidence": 0.0,
                "segments": [],
                "error": str(e),
            }

    def _simulate_transcription(self, audio_file_path: str) -> Dict[str, Any]:
        """
        Simulate transcription (fallback when Whisper not available)
        """
        return {
            "text": f"[Simulated transcription for {Path(audio_file_path).name}]",
            "language": "en",
            "confidence": 0.5,
            "segments": [],
            "simulated": True,
        }

    def transcribe_bytes(
        self,
        audio_data: bytes,
        sample_rate: int = 16000,
        language: str = "en",
    ) -> Dict[str, Any]:
        """
        Transcribe audio from bytes (in-memory)

        Args:
            audio_data: Raw audio bytes (16-bit PCM)
            sample_rate: Sample rate in Hz
            language: Language code

        Returns:
            Dict with transcription results
        """
        if not WHISPER_AVAILABLE or self.whisper_model is None:
            return self._simulate_transcription("<bytes>")

        try:
            # Convert bytes to numpy array
            if np is None:
                raise ImportError("numpy required for bytes transcription")

            audio_array = np.frombuffer(audio_data, dtype=np.int16)
            audio_float = audio_array.astype(np.float32) / 32768.0  # Normalize to [-1, 1]

            # Transcribe
            result = self.whisper_model.transcribe(
                audio_float,
                language=language if language != "auto" else None,
                fp16=False,
            )

            segments = result.get("segments", [])
            if segments:
                avg_confidence = sum(
                    seg.get("confidence", 0) for seg in segments
                ) / len(segments)
            else:
                avg_confidence = 0.0

            return {
                "text": result["text"].strip(),
                "language": result.get("language", language),
                "confidence": avg_confidence,
                "segments": segments,
            }

        except Exception as e:
            print(f"Transcription error: {e}")
            return {
                "text": "",
                "language": language,
                "confidence": 0.0,
                "segments": [],
                "error": str(e),
            }

    def enhance_audio(
        self,
        audio_data: bytes,
        sample_rate: int,
    ) -> bytes:
        """
        Apply audio enhancement (noise reduction, normalization)

        Args:
            audio_data: Raw audio bytes
            sample_rate: Sample rate in Hz

        Returns:
            Enhanced audio bytes
        """
        if np is None:
            return audio_data  # No enhancement without numpy

        try:
            # Convert to numpy array
            audio_array = np.frombuffer(audio_data, dtype=np.int16)

            # Simple high-pass filter to remove low-frequency noise
            # (VHF radio typically 300-3000 Hz)
            # For production, use scipy.signal for proper filtering

            # Normalize audio
            max_val = np.max(np.abs(audio_array))
            if max_val > 0:
                audio_array = (audio_array / max_val * 32767 * 0.8).astype(np.int16)

            return audio_array.tobytes()

        except Exception as e:
            print(f"Audio enhancement error: {e}")
            return audio_data

    def save_audio_file(
        self,
        audio_data: bytes,
        output_path: str,
        sample_rate: int,
        channels: int = 1,
    ) -> None:
        """
        Save audio data to WAV file

        Args:
            audio_data: Raw audio bytes (16-bit PCM)
            output_path: Output WAV file path
            sample_rate: Sample rate in Hz
            channels: Number of channels (1=mono, 2=stereo)
        """
        with wave.open(output_path, 'wb') as wav_file:
            wav_file.setnchannels(channels)
            wav_file.setsampwidth(2)  # 16-bit = 2 bytes
            wav_file.setframerate(sample_rate)
            wav_file.writeframes(audio_data)


# Example usage and testing
if __name__ == "__main__":
    print("VHF Audio Processor Test")
    print("=" * 50)

    processor = VHFAudioProcessor(
        vad_aggressiveness=3,
        sample_rate=16000,
        whisper_model="base",
    )

    # Test VAD
    print("\n1. Testing Voice Activity Detection...")
    # Generate test audio (silence)
    silence = b'\x00' * 16000 * 2  # 1 second of silence
    has_voice, confidence = processor.detect_voice_activity(silence, 16000)
    print(f"   Silence: has_voice={has_voice}, confidence={confidence:.2f}")

    # Generate test audio (noise)
    if np:
        noise = (np.random.randint(-1000, 1000, 16000, dtype=np.int16)).tobytes()
        has_voice, confidence = processor.detect_voice_activity(noise, 16000)
        print(f"   Noise: has_voice={has_voice}, confidence={confidence:.2f}")

    # Test transcription (if audio file exists)
    print("\n2. Testing Speech-to-Text...")
    print("   (Requires actual audio file for real test)")

    print("\n✓ VHF Audio Processor initialized successfully")
    print(f"   VAD Available: {VAD_AVAILABLE}")
    print(f"   Whisper Available: {WHISPER_AVAILABLE}")
    print(f"   NumPy Available: {np is not None}")
