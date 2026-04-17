"""Theme presets.

This module is intentionally simple: a small catalog of production-style themes
stored as plain Python data, so they can be reused by seeds, migrations, or APIs.

The `config` schema is currently aligned to what the project already uses:
- primary_color
- secondary_color
- text_color
- font_family
- alignment

You can extend this later (e.g. accent, muted, border) without changing callers.
"""

from __future__ import annotations

from typing import Any, Dict, List


THEME_PRESETS: List[Dict[str, Any]] = [
    {
        "name": "Minimal Dark",
        "is_default": True,
        "config": {
            "primary_color": "#0f172a",
            "secondary_color": "#1e293b",
            "text_color": "#e2e8f0",
            "font_family": "Inter",
            "alignment": "left",
        },
    },
    {
        "name": "Modern Light",
        "is_default": False,
        "config": {
            "primary_color": "#ffffff",
            "secondary_color": "#f1f5f9",
            "text_color": "#0f172a",
            "font_family": "Poppins",
            "alignment": "center",
        },
    },
    {
        "name": "Nord",
        "is_default": False,
        "config": {
            "primary_color": "#2e3440",
            "secondary_color": "#3b4252",
            "text_color": "#eceff4",
            "font_family": "Inter",
            "alignment": "left",
        },
    },
    {
        "name": "Tokyo Night",
        "is_default": False,
        "config": {
            "primary_color": "#1a1b26",
            "secondary_color": "#24283b",
            "text_color": "#c0caf5",
            "font_family": "Inter",
            "alignment": "left",
        },
    },
    {
        "name": "Paper",
        "is_default": False,
        "config": {
            "primary_color": "#ffffff",
            "secondary_color": "#ffffff",
            "text_color": "#0f172a",
            "font_family": "Inter",
            "alignment": "left",
        },
    },
]


def list_theme_presets() -> List[Dict[str, Any]]:
    return list(THEME_PRESETS)


def get_theme_preset(name: str) -> Dict[str, Any] | None:
    name_norm = (name or "").strip().lower()
    for theme in THEME_PRESETS:
        if str(theme.get("name", "")).strip().lower() == name_norm:
            return theme
    return None
