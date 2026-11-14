"""Evolora's server-side AI provider (Anthropic Claude).

Talks to Claude through Anthropic's OpenAI-compatible chat completions endpoint
(default base URL https://api.anthropic.com/v1/), so this OpenAI-style client is
reused unchanged. Model is selected per call via the `model` argument — see the
per-task defaults in app.core.config (AI_MODEL_EXTRACTION / _GENERATION / _EVALUATION).

The module filename and the NVIDIAProvider alias are retained for backward
compatibility with existing imports; the real class is AIProvider.
"""

import asyncio
import json
import re
from typing import Any, Optional, Type, TypeVar
import httpx
from loguru import logger
from pydantic import BaseModel, ValidationError

from app.core.config import settings

T = TypeVar("T", bound=BaseModel)


class AIProviderError(RuntimeError):
    """Safe error exposed when an AI provider cannot complete a request."""
    pass


class AIProvider:
    """Single reusable client for Claude's OpenAI-compatible chat completions endpoint."""

    def __init__(
        self,
        base_url: Optional[str] = None,
        api_key: Optional[str] = None,
        model: Optional[str] = None,
    ):
        self.base_url = (base_url or settings.ai_base_url).rstrip("/")
        self.api_key = api_key if api_key is not None else settings.ai_api_key
        self.model = model or settings.ai_default_model

    async def generate(
        self,
        system: str,
        user: str,
        *,
        model: Optional[str] = None,
        temperature: float = 0.7,
        top_p: float = 0.95,
        max_tokens: Optional[int] = None,
        images: Optional[list[str]] = None,
        timeout: Optional[float] = None,
    ) -> str:
        """Call the Claude OpenAI-compatible API to generate completion text.

        Pass `model` to select a task-specific tier (e.g. settings.AI_MODEL_EXTRACTION);
        falls back to this provider's default model when omitted.
        """
        key = self.api_key if self.api_key is not None else settings.ai_api_key
        if not key or not str(key).strip():
            raise AIProviderError("AI service is not configured (AI_API_KEY is missing)")

        effective_model = model or self.model or settings.ai_default_model
        effective_max_tokens = min(
            max_tokens or settings.ai_max_output_tokens,
            settings.ai_max_output_tokens,
        )
        effective_timeout = timeout or settings.ai_timeout_seconds

        # Multimodal user message construct (text + optional images)
        if images:
            user_content: Any = [{"type": "text", "text": user}]
            for img in images:
                if img.startswith("http://") or img.startswith("https://") or img.startswith("data:"):
                    user_content.append({"type": "image_url", "image_url": {"url": img}})
                else:
                    user_content.append({"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{img}"}})
        else:
            user_content = user

        messages = [
            {"role": "system", "content": system},
            {"role": "user", "content": user_content},
        ]

        # Single Claude model per call — the caller selects the tier via `model`.
        # (A 404 here means the model ID is wrong; surface it rather than silently
        # falling back to an unrelated model.)
        candidate_models = [effective_model]

        last_error = None
        for model_choice in candidate_models:
            payload = {
                "model": model_choice,
                "messages": messages,
                "temperature": temperature,
                "top_p": top_p,
                "max_tokens": effective_max_tokens,
                "stream": False,
            }

            headers = {
                "Authorization": f"Bearer {key}",
                "Content-Type": "application/json",
            }

            endpoint_url = f"{self.base_url}/chat/completions"

            max_retries = settings.ai_max_retries
            for attempt in range(max_retries + 1):
                try:
                    async with httpx.AsyncClient(timeout=effective_timeout) as client:
                        response = await client.post(endpoint_url, headers=headers, json=payload)

                    if response.status_code == 404:
                        logger.error(f"Model {model_choice} returned 404 — check the configured Claude model ID.")
                        break

                    if response.status_code in {408, 429, 500, 502, 503, 504} and attempt < max_retries:
                        await asyncio.sleep(0.5 * (2 ** attempt))
                        continue

                    response.raise_for_status()
                    data = response.json()
                    content = data["choices"][0]["message"]["content"]

                    if not isinstance(content, str) or not content.strip():
                        raise AIProviderError("AI service returned an empty response")

                    return content.strip()

                except (httpx.TimeoutException, httpx.HTTPStatusError, KeyError, ValueError) as exc:
                    last_error = exc
                    if isinstance(exc, httpx.HTTPStatusError):
                        status = exc.response.status_code
                        body = exc.response.text[:500] if exc.response else ""
                        logger.error("AI API HTTP status error {}: {}", status, body)
                        if status == 404:
                            break
                        if status in {408, 429, 500, 502, 503, 504} and attempt < max_retries:
                            await asyncio.sleep(0.5 * (2 ** attempt))
                            continue
                    elif attempt < max_retries:
                        await asyncio.sleep(0.5 * (2 ** attempt))
                        continue

                    logger.warning("AI request failed for model {}: {} ({})", model_choice, type(exc).__name__, str(exc))

        raise AIProviderError(f"AI service error: {type(last_error).__name__ if last_error else 'Unavailable'} - {str(last_error or 'No model available')}")

    async def generate_structured(
        self,
        system: str,
        user: str,
        schema: Optional[Type[T]] = None,
        *,
        response_model: Optional[Type[T]] = None,
        model: Optional[str] = None,
        temperature: float = 0.1,
        top_p: float = 0.95,
        max_tokens: Optional[int] = None,
        images: Optional[list[str]] = None,
    ) -> T:
        """Generate, parse, and validate JSON output against a Pydantic schema.

        Pass `model` to select a task-specific tier; falls back to the default.
        """
        target_schema = schema or response_model
        if target_schema is None:
            raise ValueError("Either 'schema' or 'response_model' must be provided to generate_structured.")

        json_instruction = "\nReturn ONLY raw valid JSON adhering to the schema. Do not include markdown block formatting or conversational text."
        full_system = system + json_instruction

        text = await self.generate(
            full_system,
            user,
            model=model,
            temperature=temperature,
            top_p=top_p,
            max_tokens=max_tokens,
            images=images,
        )

        cleaned_text = self._clean_json_text(text)

        try:
            parsed = json.loads(cleaned_text)
            return target_schema.model_validate(parsed)
        except (json.JSONDecodeError, ValidationError) as exc:
            logger.warning("AI provider returned invalid structured output: {}. Retrying with strict instruction.", type(exc).__name__)
            # Safe retry with strict instruction
            retry_user = f"{user}\n\nIMPORTANT: Your previous output could not be parsed as JSON. Respond ONLY with valid JSON."
            retry_text = await self.generate(
                full_system,
                retry_user,
                model=model,
                temperature=0.0,
                top_p=0.95,
                max_tokens=max_tokens,
                images=images,
            )
            cleaned_retry = self._clean_json_text(retry_text)
            try:
                parsed_retry = json.loads(cleaned_retry)
                return target_schema.model_validate(parsed_retry)
            except (json.JSONDecodeError, ValidationError) as retry_exc:
                logger.warning("AI provider retry failed: {}", type(retry_exc).__name__)
                raise AIProviderError("AI service returned an invalid structured response") from retry_exc

    @staticmethod
    def _clean_json_text(text: str) -> str:
        """Clean markdown code block wrappers, thinking tags, or trailing text from raw response."""
        if not text:
            return "{}"
            
        # Strip reasoning/thinking tags (e.g. <think>...</think>)
        text = re.sub(r"<think>[\s\S]*?</think>", "", text).strip()

        # Try markdown code block extraction
        match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", text)
        if match:
            return match.group(1).strip()

        # Fallback: slice string from first '{' to last '}'
        first_brace = text.find("{")
        last_brace = text.rfind("}")
        if first_brace != -1 and last_brace != -1 and last_brace > first_brace:
            return text[first_brace : last_brace + 1].strip()

        return text.strip()


# Backward-compatible alias: existing imports of NVIDIAProvider keep working.
NVIDIAProvider = AIProvider

ai_provider = AIProvider()
