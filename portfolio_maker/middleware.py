from __future__ import annotations

import json
import logging
import time
from typing import Any

from django.http import HttpRequest, HttpResponse
from django.http.request import RawPostDataException


logger = logging.getLogger("portfolio.request")

_SENSITIVE_KEYS = {
    "password",
    "token",
    "access",
    "refresh",
    "authorization",
    "api_key",
    "apikey",
    "secret",
    "client_secret",
}


def _redact(value: Any) -> Any:
    if isinstance(value, dict):
        redacted: dict[str, Any] = {}
        for k, v in value.items():
            key = str(k)
            if key.lower() in _SENSITIVE_KEYS:
                redacted[key] = "***REDACTED***"
            else:
                redacted[key] = _redact(v)
        return redacted

    if isinstance(value, list):
        return [_redact(v) for v in value]

    return value


def _safe_json_loads(raw: bytes) -> Any | None:
    if not raw:
        return None
    try:
        return json.loads(raw.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError):
        return None


def _get_request_payload(request: HttpRequest) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "method": request.method,
        "path": request.path,
    }

    if request.META.get("QUERY_STRING"):
        payload["query"] = request.META.get("QUERY_STRING")

    user = getattr(request, "user", None)
    if getattr(user, "is_authenticated", False):
        payload["user_id"] = getattr(user, "id", None)

    if request.method in {"POST", "PUT", "PATCH", "DELETE"}:
        content_type = (request.META.get("CONTENT_TYPE") or "").lower()

        if "application/json" in content_type:
            try:
                raw_body = request.body
            except RawPostDataException:
                # DRF may consume the stream before middleware logging runs.
                raw_body = getattr(request, "_body", b"") or b""

            body_obj = _safe_json_loads(raw_body)
            if body_obj is not None:
                payload["data"] = _redact(body_obj)
            elif raw_body:
                payload["data"] = "<invalid-json>"
            else:
                payload["data"] = "<unavailable: body stream consumed>"

        elif "application/x-www-form-urlencoded" in content_type:
            payload["data"] = _redact(request.POST.dict())

        elif "multipart/form-data" in content_type:
            # Avoid logging file contents; only log form fields.
            try:
                payload["data"] = _redact(request.POST.dict())
                if getattr(request, "FILES", None):
                    payload["files"] = sorted(request.FILES.keys())
            except Exception:
                payload["data"] = "<multipart>"

    return payload


class RequestLoggingMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request: HttpRequest) -> HttpResponse:
        start = time.perf_counter()
        try:
            response = self.get_response(request)
        except Exception:
            duration_ms = round((time.perf_counter() - start) * 1000, 2)
            log_data = _get_request_payload(request)
            log_data["status"] = 500
            log_data["duration_ms"] = duration_ms
            logger.exception("api_error %s", json.dumps(log_data, default=str))
            raise

        duration_ms = round((time.perf_counter() - start) * 1000, 2)
        log_data = _get_request_payload(request)
        log_data["status"] = getattr(response, "status_code", None)
        log_data["duration_ms"] = duration_ms

        logger.info("api_request %s", json.dumps(log_data, default=str))
        return response
