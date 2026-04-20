from django.db import migrations


DEFAULT_TEMPLATES = [
    {
        "name": "Neon Pulse",
        "description": "Cyberpunk-inspired one-pager with high-contrast cards and bold typography.",
        "config": {
            "sections": [
                {
                    "type": "HERO",
                    "name": "Signal",
                    "config": {"variant": "hero"},
                    "blocks": [
                        {
                            "type": "KEY_VALUE",
                            "config": {
                                "title": "Signal Lock",
                                "show_title": True,
                                "style": {
                                    "text_align": "left",
                                    "font_style": "normal",
                                    "font_weight": "700",
                                    "padding": "lg",
                                    "text_color": "#f8fafc",
                                    "heading_color": "#67e8f9",
                                    "surface_color": "#0f172a",
                                    "border_color": "#22d3ee",
                                },
                            },
                            "elements": [
                                {"label": "Name", "data_source": "PORTFOLIO", "field": "title"},
                                {"label": "Summary", "data_source": "PORTFOLIO", "field": "description"},
                                {"label": "Resume", "data_source": "PORTFOLIO", "field": "resume"},
                            ],
                        }
                    ],
                },
                {
                    "type": "PROJECTS",
                    "name": "Launches",
                    "blocks": [
                        {
                            "type": "GRID",
                            "config": {
                                "title": "Mission Projects",
                                "columns": 2,
                                "style": {
                                    "text_align": "left",
                                    "font_weight": "600",
                                    "padding": "md",
                                    "text_color": "#e2e8f0",
                                    "heading_color": "#facc15",
                                    "surface_color": "#111827",
                                    "border_color": "#f59e0b",
                                },
                            },
                            "elements": [
                                {"label": "Project", "data_source": "PROJECT", "field": "title"},
                                {"label": "Story", "data_source": "PROJECT", "field": "description"},
                                {"label": "Repo", "data_source": "PROJECT", "field": "github_url"},
                                {"label": "Visual", "data_source": "PROJECT", "field": "image"},
                            ],
                        }
                    ],
                },
                {
                    "type": "EXPERIENCE",
                    "name": "Timeline",
                    "blocks": [
                        {
                            "type": "TIMELINE",
                            "config": {
                                "title": "Ops History",
                                "style": {
                                    "text_align": "left",
                                    "font_weight": "500",
                                    "padding": "sm",
                                    "text_color": "#e5e7eb",
                                    "heading_color": "#a78bfa",
                                    "surface_color": "#111827",
                                    "border_color": "#8b5cf6",
                                },
                            },
                            "elements": [
                                {"label": "Company", "data_source": "EXPERIENCE", "field": "company"},
                                {"label": "Role", "data_source": "EXPERIENCE", "field": "role"},
                                {"label": "When", "data_source": "EXPERIENCE", "field": "timeline"},
                            ],
                        }
                    ],
                },
                {
                    "type": "SKILLS",
                    "name": "Loadout",
                    "blocks": [
                        {
                            "type": "LIST",
                            "config": {
                                "title": "Tech Arsenal",
                                "style": {
                                    "text_align": "left",
                                    "font_weight": "600",
                                    "padding": "md",
                                    "text_color": "#f1f5f9",
                                    "heading_color": "#34d399",
                                    "surface_color": "#0b1020",
                                    "border_color": "#10b981",
                                },
                            },
                            "elements": [
                                {"label": "Skill", "data_source": "SKILL", "field": "name"},
                                {"label": "Level", "data_source": "SKILL", "field": "level"},
                            ],
                        }
                    ],
                },
            ]
        },
    },
    {
        "name": "Brutalist Signal",
        "description": "Aggressive editorial layout with heavy headings, hard borders, and sharp spacing.",
        "config": {
            "sections": [
                {
                    "type": "INTRO",
                    "name": "Manifest",
                    "blocks": [
                        {
                            "type": "KEY_VALUE",
                            "config": {
                                "title": "Who I Am",
                                "style": {
                                    "text_align": "left",
                                    "font_weight": "700",
                                    "padding": "lg",
                                    "text_color": "#09090b",
                                    "heading_color": "#b91c1c",
                                    "surface_color": "#fafaf9",
                                    "border_color": "#18181b",
                                },
                            },
                            "elements": [
                                {"label": "Identity", "data_source": "PORTFOLIO", "field": "title"},
                                {"label": "Thesis", "data_source": "PORTFOLIO", "field": "description"},
                                {"label": "Resume", "data_source": "PORTFOLIO", "field": "resume"},
                            ],
                        }
                    ],
                },
                {
                    "type": "PROJECTS",
                    "name": "Case Files",
                    "blocks": [
                        {
                            "type": "GRID",
                            "config": {
                                "title": "Selected Work",
                                "columns": 2,
                                "style": {
                                    "text_align": "left",
                                    "font_weight": "700",
                                    "padding": "md",
                                    "text_color": "#111827",
                                    "heading_color": "#1d4ed8",
                                    "surface_color": "#f8fafc",
                                    "border_color": "#0f172a",
                                },
                            },
                            "elements": [
                                {"label": "Project", "data_source": "PROJECT", "field": "title"},
                                {"label": "Details", "data_source": "PROJECT", "field": "description"},
                                {"label": "GitHub", "data_source": "PROJECT", "field": "github_url"},
                                {"label": "Poster", "data_source": "PROJECT", "field": "image"},
                            ],
                        },
                        {
                            "type": "IMAGE",
                            "config": {
                                "title": "Visuals",
                                "style": {
                                    "text_align": "left",
                                    "font_weight": "600",
                                    "padding": "sm",
                                    "text_color": "#111827",
                                    "heading_color": "#be123c",
                                    "surface_color": "#ffffff",
                                    "border_color": "#e11d48",
                                },
                            },
                            "elements": [
                                {"label": "Snapshot", "data_source": "PROJECT", "field": "image"},
                            ],
                        },
                    ],
                },
                {
                    "type": "CREDENTIALS",
                    "name": "Capabilities",
                    "blocks": [
                        {
                            "type": "LIST",
                            "config": {
                                "title": "Core Skills",
                                "style": {
                                    "text_align": "left",
                                    "font_weight": "600",
                                    "padding": "md",
                                    "text_color": "#111827",
                                    "heading_color": "#7c3aed",
                                    "surface_color": "#faf5ff",
                                    "border_color": "#8b5cf6",
                                },
                            },
                            "elements": [
                                {"label": "Skill", "data_source": "SKILL", "field": "name"},
                                {"label": "Score", "data_source": "SKILL", "field": "level"},
                            ],
                        }
                    ],
                },
            ]
        },
    },
    {
        "name": "Aurora Orbit",
        "description": "Color-rich, futuristic card stack optimized for quick impressive portfolio launch.",
        "config": {
            "sections": [
                {
                    "type": "HERO",
                    "name": "Orbit",
                    "blocks": [
                        {
                            "type": "KEY_VALUE",
                            "config": {
                                "title": "Command Deck",
                                "style": {
                                    "text_align": "center",
                                    "font_weight": "700",
                                    "padding": "lg",
                                    "text_color": "#f8fafc",
                                    "heading_color": "#f0abfc",
                                    "surface_color": "#1e1b4b",
                                    "border_color": "#c084fc",
                                },
                            },
                            "elements": [
                                {"label": "Pilot", "data_source": "PORTFOLIO", "field": "title"},
                                {"label": "Mission", "data_source": "PORTFOLIO", "field": "description"},
                                {"label": "Resume", "data_source": "PORTFOLIO", "field": "resume"},
                            ],
                        }
                    ],
                },
                {
                    "type": "PROJECTS",
                    "name": "Constellation",
                    "blocks": [
                        {
                            "type": "GRID",
                            "config": {
                                "title": "Star Projects",
                                "columns": 2,
                                "style": {
                                    "text_align": "left",
                                    "font_weight": "600",
                                    "padding": "md",
                                    "text_color": "#f8fafc",
                                    "heading_color": "#22d3ee",
                                    "surface_color": "#0f172a",
                                    "border_color": "#0ea5e9",
                                },
                            },
                            "elements": [
                                {"label": "Title", "data_source": "PROJECT", "field": "title"},
                                {"label": "Brief", "data_source": "PROJECT", "field": "description"},
                                {"label": "Source", "data_source": "PROJECT", "field": "github_url"},
                                {"label": "Artwork", "data_source": "PROJECT", "field": "image"},
                            ],
                        }
                    ],
                },
                {
                    "type": "TIMELINE",
                    "name": "Trajectory",
                    "blocks": [
                        {
                            "type": "TIMELINE",
                            "config": {
                                "title": "Flight Log",
                                "style": {
                                    "text_align": "left",
                                    "font_weight": "500",
                                    "padding": "md",
                                    "text_color": "#e2e8f0",
                                    "heading_color": "#fbbf24",
                                    "surface_color": "#111827",
                                    "border_color": "#f59e0b",
                                },
                            },
                            "elements": [
                                {"label": "Org", "data_source": "EXPERIENCE", "field": "company"},
                                {"label": "Role", "data_source": "EXPERIENCE", "field": "role"},
                                {"label": "Time", "data_source": "EXPERIENCE", "field": "timeline"},
                            ],
                        }
                    ],
                },
                {
                    "type": "SKILLS",
                    "name": "Systems",
                    "blocks": [
                        {
                            "type": "LIST",
                            "config": {
                                "title": "Engine Room",
                                "style": {
                                    "text_align": "center",
                                    "font_weight": "600",
                                    "padding": "sm",
                                    "text_color": "#e0f2fe",
                                    "heading_color": "#4ade80",
                                    "surface_color": "#082f49",
                                    "border_color": "#22c55e",
                                },
                            },
                            "elements": [
                                {"label": "Module", "data_source": "SKILL", "field": "name"},
                                {"label": "Power", "data_source": "SKILL", "field": "level"},
                            ],
                        }
                    ],
                },
            ]
        },
    },
]


def seed_default_templates(apps, schema_editor):
    PortfolioTemplate = apps.get_model("portfolio", "PortfolioTemplate")

    for template in DEFAULT_TEMPLATES:
        PortfolioTemplate.objects.update_or_create(
            name=template["name"],
            defaults={
                "description": template.get("description", ""),
                "config": template.get("config", {}),
                "is_active": True,
            },
        )


class Migration(migrations.Migration):

    dependencies = [
        ("portfolio", "0013_rename_portfolio_p_is_acti_77effd_idx_portfolio_p_is_acti_a648cb_idx_and_more"),
    ]

    operations = [
        migrations.RunPython(seed_default_templates, migrations.RunPython.noop),
    ]
