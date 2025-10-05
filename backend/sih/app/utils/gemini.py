"""
Gemini AI utility for processing audio and extracting structured report data
Uses Google Cloud service account credentials (same as GCS)
"""
import google.generativeai as genai
from google.oauth2 import service_account
from google.auth.transport.requests import Request
from typing import Optional, Dict, Any
import json
import base64
import httpx
from app.config import get_settings

settings = get_settings()

# Configure Gemini API with service account credentials
def _get_gemini_access_token():
    """Get access token from service account credentials for Gemini API"""
    credentials_dict = settings.get_gcs_credentials()
    credentials = service_account.Credentials.from_service_account_info(
        credentials_dict,
        scopes=['https://www.googleapis.com/auth/generative-language.tuning']
    )
    credentials.refresh(Request())
    return credentials.token


async def process_voice_report(audio_url: str, audio_file_data: bytes = None, context: Dict[str, Any] = None) -> Dict[str, Any]:
    """
    Process voice note through Gemini to extract structured report data
    
    Args:
        audio_url: URL of the audio file in GCS
        audio_file_data: Optional raw audio data if not yet uploaded
        context: Optional context like attached images, location, etc.
    
    Returns:
        Dict with extracted fields:
        {
            "title": str,
            "description": str,
            "hazardType": str,
            "severity": str,
            "location": dict (optional),
            "peopleAtRisk": bool,
            "tags": list[str]
        }
    """
    try:
        print("[GEMINI] Processing voice report with Gemini AI...")
        
        if not audio_file_data:
            raise ValueError("Audio file data is required for processing")
        
        # Build the prompt
        prompt = """You are an AI assistant helping to process emergency/coastal hazard reports from voice notes.

Analyze the audio and extract the following information in JSON format:

{
  "title": "A brief title (max 200 chars) summarizing the report",
  "description": "Detailed description of what the person reported (max 2000 chars)",
  "hazardType": "One of: flood, fire, landslide, storm, roadblock, accident, medical, marine_emergency, pollution, infrastructure, other",
  "severity": "One of: low, medium, high, critical",
  "peopleAtRisk": true/false (whether people are in immediate danger),
  "tags": ["array", "of", "relevant", "keywords"],
  "extractedLocation": "Any location mentioned (city, landmark, address) or null",
  "confidence": "high/medium/low (your confidence in the extraction)"
}

Guidelines:
- If hazard type is unclear, use "other"
- Severity assessment: low (minor issue), medium (needs attention), high (urgent), critical (life-threatening)
- Extract all relevant keywords for tags
- If location is mentioned, extract it verbatim

Respond ONLY with valid JSON, no additional text."""
        
        # Add context if provided
        if context:
            prompt += "\n\nAdditional Context:"
            if context.get("has_images"):
                prompt += f"\n- {context['has_images']} image(s) attached"
            if context.get("has_videos"):
                prompt += f"\n- {context['has_videos']} video(s) attached"
            if context.get("location"):
                prompt += f"\n- GPS Location: {context['location']}"
        
        # Get access token
        access_token = _get_gemini_access_token()
        
        # Encode audio as base64
        audio_base64 = base64.b64encode(audio_file_data).decode('utf-8')
        
        # Determine MIME type (default to mp3)
        mime_type = "audio/mpeg"
        
        # Call Gemini API using REST endpoint
        api_url = f"https://generativelanguage.googleapis.com/v1beta/models/{settings.GEMINI_MODEL}:generateContent"
        
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "contents": [{
                "parts": [
                    {"text": prompt},
                    {
                        "inline_data": {
                            "mime_type": mime_type,
                            "data": audio_base64
                        }
                    }
                ]
            }]
        }
        
        print(f"[GEMINI] Calling API: {api_url}")
        
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(api_url, json=payload, headers=headers)
            response.raise_for_status()
            result = response.json()
        
        # Parse the response
        if "candidates" in result and len(result["candidates"]) > 0:
            candidate = result["candidates"][0]
            if "content" in candidate and "parts" in candidate["content"]:
                response_text = candidate["content"]["parts"][0]["text"]
                
                # Clean up response text
                response_text = response_text.strip()
                if response_text.startswith("```json"):
                    response_text = response_text[7:]
                if response_text.startswith("```"):
                    response_text = response_text[3:]
                if response_text.endswith("```"):
                    response_text = response_text[:-3]
                response_text = response_text.strip()
                
                # Parse JSON
                extracted_data = json.loads(response_text)
                
                # Validate and normalize
                result = {
                    "title": extracted_data.get("title", "Voice Report")[:200],
                    "description": extracted_data.get("description", "")[:2000],
                    "hazardType": extracted_data.get("hazardType", "other"),
                    "severity": extracted_data.get("severity", "medium"),
                    "peopleAtRisk": extracted_data.get("peopleAtRisk", False),
                    "tags": extracted_data.get("tags", [])[:10],
                    "extractedLocation": extracted_data.get("extractedLocation"),
                    "confidence": extracted_data.get("confidence", "medium"),
                    "processed_by": "gemini",
                    "model": settings.GEMINI_MODEL
                }
                
                print(f"[GEMINI] Successfully extracted data: {result['title']}")
                return result
        
        raise ValueError("Failed to get valid response from Gemini API")
        
    except json.JSONDecodeError as e:
        print(f"[GEMINI ERROR] Failed to parse JSON: {str(e)}")
        raise ValueError(f"Failed to parse Gemini response as JSON: {str(e)}")
    except Exception as e:
        print(f"[GEMINI ERROR] {str(e)}")
        raise Exception(f"Error processing audio with Gemini: {str(e)}")


async def process_voice_with_images(
    audio_file_data: bytes,
    image_urls: list[str] = None,
    location: Dict[str, Any] = None
) -> Dict[str, Any]:
    """
    Process voice report with additional context from images and location
    
    This is for the scenario where:
    - User records voice note (instead of filling form)
    - User optionally attaches images for context
    - Gemini processes both audio and images to understand the full situation
    
    Returns structured report data extracted from voice + image context
    """
    context = {
        "has_images": len(image_urls) if image_urls else 0,
        "location": location
    }
    
    return await process_voice_report(
        audio_url=None,
        audio_file_data=audio_file_data,
        context=context
    )
