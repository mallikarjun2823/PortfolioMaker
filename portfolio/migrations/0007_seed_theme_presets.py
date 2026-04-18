from django.db import migrations


def seed_theme_presets(apps, schema_editor):
    Theme = apps.get_model("portfolio", "Theme")

    presets = [
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

    for preset in presets:
        name = str(preset["name"]).strip()
        if not name:
            continue
        Theme.objects.update_or_create(
            name=name,
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
        ("portfolio", "0006_alter_blank_config_fields"),
    ]

    operations = [
        migrations.RunPython(seed_theme_presets, noop_reverse),
    ]
