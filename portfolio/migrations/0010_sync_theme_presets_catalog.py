from django.db import migrations


PRESETS = [
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


def seed_catalog(apps, schema_editor):
    Theme = apps.get_model("portfolio", "Theme")

    for preset in PRESETS:
        Theme.objects.update_or_create(
            name=str(preset["name"]).strip(),
            defaults={
                "config": dict(preset.get("config") or {}),
                "is_active": True,
                "is_default": bool(preset.get("is_default", False)),
            },
        )


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("portfolio", "0009_alter_element_field"),
    ]

    operations = [
        migrations.RunPython(seed_catalog, noop_reverse),
    ]
