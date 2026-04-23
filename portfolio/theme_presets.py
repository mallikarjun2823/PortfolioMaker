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
            "font_family": '"Segoe UI", "Trebuchet MS", sans-serif',
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
            "font_family": '"Segoe UI", Tahoma, sans-serif',
            "alignment": "center",
        },
    },
    {
        "name": "Executive Serif",
        "is_default": False,
        "config": {
            "primary_color": "#1f2937",
            "secondary_color": "#374151",
            "text_color": "#f9fafb",
            "font_family": 'Georgia, "Times New Roman", serif',
            "alignment": "left",
        },
    },
    {
        "name": "Consulting Blue",
        "is_default": False,
        "config": {
            "primary_color": "#0b2545",
            "secondary_color": "#13315c",
            "text_color": "#e6edf6",
            "font_family": '"Trebuchet MS", "Segoe UI", sans-serif',
            "alignment": "left",
        },
    },
    {
        "name": "Ivory Boardroom",
        "is_default": False,
        "config": {
            "primary_color": "#fdfcf8",
            "secondary_color": "#f4efe4",
            "text_color": "#2f2a24",
            "font_family": '"Palatino Linotype", Georgia, serif',
            "alignment": "left",
        },
    },
    {
        "name": "Nordic Calm",
        "is_default": False,
        "config": {
            "primary_color": "#2e3440",
            "secondary_color": "#3b4252",
            "text_color": "#eceff4",
            "font_family": '"Segoe UI", "Helvetica Neue", sans-serif',
            "alignment": "left",
        },
    },
    {
        "name": "Creative Magenta",
        "is_default": False,
        "config": {
            "primary_color": "#3c1642",
            "secondary_color": "#5c1a72",
            "text_color": "#f8f5ff",
            "font_family": '"Lucida Sans", "Segoe UI", sans-serif',
            "alignment": "center",
        },
    },
    {
        "name": "Forest Professional",
        "is_default": False,
        "config": {
            "primary_color": "#1f3d2f",
            "secondary_color": "#2a5a43",
            "text_color": "#e8f3ed",
            "font_family": '"Gill Sans", "Segoe UI", sans-serif',
            "alignment": "left",
        },
    },
    {
        "name": "Tech Mono",
        "is_default": False,
        "config": {
            "primary_color": "#111827",
            "secondary_color": "#1f2937",
            "text_color": "#f3f4f6",
            "font_family": '"Consolas", "Courier New", monospace',
            "alignment": "left",
        },
    },
]


def list_theme_presets() -> List[Dict[str, Any]]:
    """Return a shallow copy of the theme presets catalog.

    Returns:
        List[Dict[str, Any]]: A list of theme preset dictionaries suitable for
        serializing or seeding into the database.
    """
    return list(THEME_PRESETS)


def get_theme_preset(name: str) -> Dict[str, Any] | None:
    """Lookup a theme preset by its case-insensitive name.

    Args:
        name: Name of the theme to find.

    Returns:
        The matching theme dict or ``None`` if not found.
    """
    name_norm = (name or "").strip().lower()
    for theme in THEME_PRESETS:
        if str(theme.get("name", "")).strip().lower() == name_norm:
            return theme
    return None
