import base64
import json
import os
from typing import Any, Dict, List, Optional

from google import genai
from google.genai import types


def get_ai_client() -> Optional[genai.Client]:
    api_key = os.environ.get('GEMINI_API_KEY')
    if not api_key or api_key == 'MY_GEMINI_API_KEY':
        return None
    return genai.Client(api_key=api_key, http_options=types.HttpOptions(timeout=8000))


def detect_emotion(text: str) -> Dict[str, Any]:
    ai = get_ai_client()
    fallback = {
        'primaryEmotion': 'Calm & Reflective',
        'confidence': 0.85,
        'observation': 'AI detected a possible tone of thoughtfulness and quiet reflection.',
        'keywords': ['thoughtful', 'peaceful'],
    }
    if not ai:
        return fallback

    try:
        prompt = f"""Analyze the emotional tone of this personal journal entry.
Important safety constraints:
- Do NOT make clinical or psychological diagnoses.
- Use gentle, observational wording (e.g., "AI detected a possible emotional pattern...").
- Return strictly a valid JSON object without markdown or code fences with these keys:
{{
  "primaryEmotion": "short label like Calm, Happy, Anxious, Hopeful",
  "confidence": 0.85,
  "observation": "1-2 warm, supportive sentences describing the detected tone",
  "keywords": ["2-3 key words"]
}}

Journal entry:
"{text[:1500]}\""""

        response = ai.models.generate_content(
            model='gemini-3.8-flash',
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction='You are an empathetic, supportive, strictly non-clinical journaling companion.',
                response_mime_type='application/json',
            ),
        )
        parsed = json.loads(response.text or '{}')
        return parsed if parsed else fallback
    except Exception as exc:
        print(f'AI emotion error: {exc}')
        return {
            'primaryEmotion': 'Reflective',
            'confidence': 0.8,
            'observation': 'AI detected a possible tone of quiet focus and thoughtful awareness.',
            'keywords': ['reflective', 'intentional'],
        }


def generate_weekly_summary(
    entries: List[Dict[str, Any]],
    tasks: List[Dict[str, Any]],
    moods: List[Dict[str, Any]],
) -> Dict[str, str]:
    ai = get_ai_client()
    if not ai:
        return {
            'highlights': 'You dedicated time to your personal reflection and steadily progressed on your daily tasks.',
            'positiveMoments': 'Taking moments for coffee, mindful walks, and celebrating small victories.',
            'growthAreas': 'Maintaining balance between study deadlines and gentle breaks.',
            'patternObservation': 'Your mood shows resilience and centered calm when daily routines are steady.',
        }

    entries_summary = '\n'.join(
        f"[{e.get('entry_date', '')}] {e.get('title', '')}: {(e.get('content') or '')[:120]}"
        for e in entries[:7]
    )
    completed_count = sum(1 for t in tasks if t.get('completed'))
    moods_summary = ', '.join(
        f"{m.get('date', '')}: {m.get('mood', '')} (intensity {m.get('intensity', 5)}/10)"
        for m in moods[:7]
    )
    context_text = (
        f"Recent journals: {entries_summary}\n"
        f"Tasks completed: {completed_count} of {len(tasks)}\n"
        f"Recent moods: {moods_summary}\n"
    )

    try:
        prompt = f"""Synthesize a comforting, non-clinical weekly reflection summary based on this week's journal and activity notes:
{context_text}

Return strictly a valid JSON object with:
{{
  "highlights": "2 sentences highlighting achievements and key moments",
  "positiveMoments": "1-2 sentences on moments of joy, gratitude, or peace",
  "growthAreas": "1-2 gentle, encouraging tips for next week",
  "patternObservation": "1 non-judgmental observation about mood and activities"
}}"""

        response = ai.models.generate_content(
            model='gemini-3.8-flash',
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction='You are BORAH AI, a comforting digital reflection companion. Never diagnose or give medical advice.',
                response_mime_type='application/json',
            ),
        )
        parsed = json.loads(response.text or '{}')
        return parsed
    except Exception as exc:
        print(f'AI summary error: {exc}')
        return {
            'highlights': 'You kept regular entries and stayed committed to your personal goals this week.',
            'positiveMoments': 'Finding peaceful moments during your busy academic and personal schedule.',
            'growthAreas': 'Remember to step away from screens and enjoy gentle fresh air breaks.',
            'patternObservation': 'Your reflections demonstrate growing self-awareness and quiet determination.',
        }


def generate_music_track(prompt: str, duration_type: str) -> Dict[str, Any]:
    ai = get_ai_client()
    if not ai:
        return {
            'success': False,
            'status': 503,
            'message': 'GEMINI_API_KEY is not configured on the server. Please configure your key in Secrets.',
            'fallback': True,
        }

    model_name = 'lyria-3-pro-preview' if duration_type == 'full' else 'lyria-3-clip-preview'
    try:
        audio_chunks: List[str] = []
        lyrics = ''
        mime_type = 'audio/wav'

        for chunk in ai.models.generate_content_stream(model=model_name, contents=prompt):
            candidates = getattr(chunk, 'candidates', None) or []
            if not candidates:
                continue
            parts = getattr(candidates[0].content, 'parts', None) or []
            for part in parts:
                inline_data = getattr(part, 'inline_data', None)
                if inline_data and getattr(inline_data, 'data', None):
                    if not audio_chunks and getattr(inline_data, 'mime_type', None):
                        mime_type = inline_data.mime_type
                    raw = inline_data.data
                    if isinstance(raw, bytes):
                        audio_chunks.append(base64.b64encode(raw).decode('utf-8'))
                    else:
                        audio_chunks.append(str(raw))
                if getattr(part, 'text', None) and not lyrics:
                    lyrics = part.text

        audio_base64 = ''.join(audio_chunks)
        if not audio_base64:
            return {
                'success': False,
                'status': 500,
                'message': 'No audio data received from Lyria model.',
                'fallback': True,
            }

        return {
            'success': True,
            'status': 200,
            'audioBase64': audio_base64,
            'mimeType': mime_type,
            'lyrics': lyrics,
            'durationType': duration_type,
            'modelUsed': model_name,
            'message': 'Track generated successfully! 🎵',
        }
    except Exception as exc:
        print(f'Lyria Music Generation Error: {exc}')
        return {
            'success': False,
            'status': 500,
            'message': str(exc) or 'Unable to generate track with Lyria.',
            'fallback': True,
        }


def transcribe_audio(audio_base64: str, mime_type: str = 'audio/webm') -> Dict[str, Any]:
    clean_b64 = audio_base64.split(',', 1)[1] if ',' in audio_base64 else audio_base64
    ai = get_ai_client()
    if not ai:
        return {
            'success': True,
            'transcription': (
                'Today was filled with quiet thoughts and a gentle pace. I took a few minutes to breathe, '
                'listen to my surroundings, and reflect on what truly matters to me.'
            ),
            'suggestedTitle': 'A Quiet Reflection',
            'detectedMood': 'Peaceful',
            'keywords': ['calm', 'reflection', 'gratitude'],
            'isFallback': True,
            'message': 'Sample transcription generated (Live Gemini API key not configured on server).',
        }

    prompt_text = """You are BORAH's empathetic speech-to-text transcription assistant.
Accurately transcribe the spoken words from this audio recording into clear, natural, well-formatted journal paragraphs.
Remove stuttering and false starts naturally while maintaining the speaker's true voice and heartfelt sentiment.
Also provide a short, fitting journal title (3-5 words) and detect the overall emotional mood.

Return strictly a valid JSON object without markdown fences or code blocks:
{
  "transcription": "The complete transcribed text...",
  "suggestedTitle": "Short 3-5 word title",
  "detectedMood": "e.g. Grateful, Calm, Excited, Overwhelmed, Hopeful, Thoughtful, Content",
  "keywords": ["tag1", "tag2", "tag3"]
}"""

    audio_bytes = base64.b64decode(clean_b64)
    model_name = 'gemini-3.5-transcribe'

    def _call_model(target_model: str) -> Dict[str, Any]:
        resp = ai.models.generate_content(
            model=target_model,
            contents=[
                types.Part.from_bytes(data=audio_bytes, mime_type=mime_type or 'audio/webm'),
                prompt_text,
            ],
            config=types.GenerateContentConfig(response_mime_type='application/json'),
        )
        raw_text = resp.text or ''
        try:
            parsed = json.loads(raw_text)
            return {
                'transcription': (parsed.get('transcription') or '').strip(),
                'suggestedTitle': (parsed.get('suggestedTitle') or '').strip(),
                'detectedMood': (parsed.get('detectedMood') or 'Reflective').strip(),
                'keywords': parsed.get('keywords') if isinstance(parsed.get('keywords'), list) else [],
            }
        except Exception:
            return {
                'transcription': raw_text.strip(),
                'suggestedTitle': '',
                'detectedMood': 'Reflective',
                'keywords': [],
            }

    try:
        result = _call_model(model_name)
    except Exception as exc:
        print(f'gemini-3.5-transcribe fallback to gemini-3.8-flash: {exc}')
        model_name = 'gemini-3.8-flash'
        result = _call_model(model_name)

    if not result.get('transcription'):
        return {
            'success': False,
            'status': 500,
            'message': 'Could not transcribe speech from the audio.',
        }

    return {
        'success': True,
        'transcription': result['transcription'],
        'suggestedTitle': result['suggestedTitle'],
        'detectedMood': result['detectedMood'],
        'keywords': result['keywords'],
        'modelUsed': model_name,
    }
