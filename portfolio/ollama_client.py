from __future__ import annotations

import os
import time
from typing import Any, Dict

import requests
from rest_framework.exceptions import ValidationError


class OllamaClient:
    DEFAULT_BASE_URL = "http://localhost:11434/api/chat"
    DEFAULT_MODEL = "tinyllama"
    TIMEOUT_SECONDS = 45

    def _resolve_chat_url(self) -> str:
        raw = str(os.getenv("OLLAMA_BASE_URL", self.DEFAULT_BASE_URL) or "").strip()
        if not raw:
            raw = self.DEFAULT_BASE_URL

        normalized = raw.rstrip("/")
        if normalized.endswith("/api/chat"):
            return normalized
        return f"{normalized}/api/chat"

    def _resolve_model(self) -> str:
        model = str(os.getenv("OLLAMA_MODEL", self.DEFAULT_MODEL) or "").strip()
        return model or self.DEFAULT_MODEL

    def generate(self, prompt: str) -> str:
        chat_url = self._resolve_chat_url()
        model = self._resolve_model()

        payload: Dict[str, Any] = {
            "model": model,
            "messages": [{"role": "user", "content": prompt}],
            "stream": False,
        }

        start = time.monotonic()
        try:
            response = requests.post(chat_url, json=payload, timeout=self.TIMEOUT_SECONDS)
            response.raise_for_status()
        except requests.RequestException as exc:
            raise ValidationError({"detail": f"Ollama request failed: {exc}"}) from exc

        elapsed_ms = round((time.monotonic() - start) * 1000, 2)

        try:
            body = response.json()
        except ValueError as exc:
            raise ValidationError({"detail": "Ollama returned non-JSON response."}) from exc

        message = body.get("message") if isinstance(body, dict) else None
        content = message.get("content") if isinstance(message, dict) else None
        if not isinstance(content, str) or not content.strip():
            raise ValidationError({"detail": "Ollama response did not include message content."})

        # Keep lightweight observability in service logs.
        body["_elapsed_ms"] = elapsed_ms
        return content.strip()
