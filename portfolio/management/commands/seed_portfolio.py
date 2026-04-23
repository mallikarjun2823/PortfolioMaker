"""Auto-generated module docstring for portfolio\management\commands\seed_portfolio.py.

This docstring was added by scripts/add_docstrings.py.
"""

from django.contrib.auth import get_user_model
from django.conf import settings
from django.core.management.base import BaseCommand
from django.db import transaction

import base64
import os

from portfolio.models import (
    Theme,
    Portfolio,
    Section,
    Block,
    Element,
    Project,
    Skill,
    Experience,
)

from portfolio.theme_presets import THEME_PRESETS


    """Auto-generated docstring for class Command.

    Returns:
        Description.
    """
class Command(BaseCommand):
    help = "Seed realistic dummy data for the portfolio system"

    _PLACEHOLDER_PNG_BYTES = base64.b64decode(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMB/Up1v0sAAAAASUVORK5CYII="
    )

        """Auto-generated docstring for function add_arguments.

        Args:
            self: Description.
            parser: Description.

        Returns:
            Description.
        """
    def add_arguments(self, parser):
        parser.add_argument(
            "--password",
            type=str,
            default="demo12345",
            help="Password to set for the seeded users (dev only).",
        )

    @transaction.atomic
        """Auto-generated docstring for function handle.

        Args:
            self: Description.
            *args: Description.
            **options: Description.

        Returns:
            Description.
        """
    def handle(self, *args, **options):
        User = get_user_model()

        seed_password = str(options.get("password") or "demo12345")

        # 1. Users
        mallikarjun = self._upsert_user(
            User,
            username="mallikarjun",
            email="malli.dev@example.com",
            password=seed_password,
        )
        ananya = self._upsert_user(
            User,
            username="ananya",
            email="ananya.ui@example.com",
            password=seed_password,
        )

        # 2. Themes (industry-style, production-like)
        themes_by_name = {}
        for theme_def in THEME_PRESETS:
            theme = self._upsert_theme(
                name=str(theme_def.get("name")),
                config=dict(theme_def.get("config") or {}),
                is_default=bool(theme_def.get("is_default", False)),
            )
            themes_by_name[theme.name] = theme

        minimal_dark = themes_by_name["Minimal Dark"]
        modern_light = themes_by_name["Modern Light"]

        # 3. Portfolios
        mallikarjun_portfolio = self._upsert_portfolio(
            user=mallikarjun,
            title="Mallikarjun Portfolio",
            slug="mallikarjun-backend-engineer",
            theme=minimal_dark,
            description=(
                "Backend engineer focused on Django, APIs, and scalable data models. "
                "I build backend-driven systems that are easy to render, theme, and extend."
            ),
            is_published=True,
        )

        ananya_portfolio = self._upsert_portfolio(
            user=ananya,
            title="Ananya UI Portfolio",
            slug="ananya-ui-designer",
            theme=modern_light,
            description=(
                "UI designer who ships modern, accessible interfaces. "
                "I turn product requirements into clean components, design systems, and delightful interactions."
            ),
            is_published=True,
        )

        # 4. Build each portfolio layout + data
        self._build_portfolio(portfolio=mallikarjun_portfolio, persona="backend")
        self._build_portfolio(portfolio=ananya_portfolio, persona="designer")

        self.stdout.write(self.style.SUCCESS("Seed data created successfully."))
        self.stdout.write(f"Seeded users: mallikarjun / {seed_password}")
        self.stdout.write(f"Seeded users: ananya / {seed_password}")

        """Auto-generated docstring for function _upsert_user.

        Args:
            self: Description.
            User: Description.
            username: Description.
            email: Description.
            password: Description.

        Returns:
            Description.
        """
    def _upsert_user(self, User, *, username: str, email: str, password: str):
        user, _ = User.objects.get_or_create(username=username, defaults={"email": email})
        if user.email != email:
            user.email = email
            user.save(update_fields=["email"])

        if password and not user.check_password(password):
            user.set_password(password)
            user.save(update_fields=["password"])
        return user

        """Auto-generated docstring for function _upsert_theme.

        Args:
            self: Description.
            name: Description.
            config: Description.
            is_default: Description.

        Returns:
            Description.
        """
    def _upsert_theme(self, *, name: str, config: dict, is_default: bool = False) -> Theme:
        theme, _ = Theme.objects.update_or_create(
            name=name,
            defaults={
                "config": config,
                "is_active": True,
                "is_default": is_default,
            },
        )
        return theme

    def _upsert_portfolio(
        self,
        *,
        user,
        title: str,
        slug: str,
        theme: Theme,
        description: str,
        is_published: bool,
        """Auto-generated docstring for function _upsert_portfolio.

        Args:
            self: Description.
            user: Description.
            title: Description.
            slug: Description.
            theme: Description.
            description: Description.
            is_published: Description.

        Returns:
            Description.
        """
    ) -> Portfolio:
        portfolio, _ = Portfolio.objects.update_or_create(
            slug=slug,
            defaults={
                "user": user,
                "title": title,
                "theme": theme,
                "description": description,
                "is_published": is_published,
            },
        )
        return portfolio

        """Auto-generated docstring for function _reset_portfolio.

        Args:
            self: Description.
            portfolio: Description.

        Returns:
            Description.
        """
    def _reset_portfolio(self, portfolio: Portfolio) -> None:
        portfolio.sections.all().delete()
        portfolio.projects.all().delete()
        portfolio.skills.all().delete()
        portfolio.experiences.all().delete()

        """Auto-generated docstring for function _ensure_media_file.

        Args:
            self: Description.
            relative_path: Description.

        Returns:
            Description.
        """
    def _ensure_media_file(self, relative_path: str) -> None:
        rel = str(relative_path or "").lstrip("/\\")
        if not rel:
            return

        media_root = str(getattr(settings, "MEDIA_ROOT", "") or "")
        if not media_root:
            return

        abs_path = os.path.join(media_root, rel)
        os.makedirs(os.path.dirname(abs_path), exist_ok=True)

        if os.path.exists(abs_path):
            return

        with open(abs_path, "wb") as f:
            f.write(self._PLACEHOLDER_PNG_BYTES)

    def _build_portfolio(self, *, portfolio: Portfolio, persona: str) -> None:
        """Create a full portfolio layout + typed data.

        persona: "backend" or "designer"; controls the data flavor.
        """

        self._reset_portfolio(portfolio)

        # Sections
        about_section = Section.objects.create(
            portfolio=portfolio,
            name="About Me",
            order=1,
            is_visible=True,
            config={
                "text_size": "lg",
                "font_weight": "medium",
            },
        )

        projects_section = Section.objects.create(
            portfolio=portfolio,
            name="Projects",
            order=2,
            is_visible=True,
            config={},
        )

        skills_section = Section.objects.create(
            portfolio=portfolio,
            name="Skills",
            order=4,
            is_visible=True,
            config={},
        )

        experience_section = Section.objects.create(
            portfolio=portfolio,
            name="Experience",
            order=3,
            is_visible=True,
            config={},
        )

        education_section = Section.objects.create(
            portfolio=portfolio,
            name="Education",
            order=5,
            is_visible=True,
            config={},
        )

        preview_project_title = (
            "Smart Edu Hub" if persona == "backend" else "Mobile Checkout UX Refresh"
        )
        primary_experience_company = (
            "TechCorp" if persona == "backend" else "PixelCraft Studio"
        )

        # About Me -> KEY_VALUE
        about_block = Block.objects.create(
            section=about_section,
            type=Block.BlockType.KEY_VALUE,
            order=1,
            config={},
            is_visible=True,
        )

        Element.objects.create(
            block=about_block,
            label="Name",
            data_source=Element.DataSource.PORTFOLIO,
            field=Element.DataField.TITLE,
            config={
                "filters": [
                    {"key": "slug", "operator": "eq", "value": portfolio.slug},
                ]
            },
            order=1,
            is_visible=True,
        )

        Element.objects.create(
            block=about_block,
            label="Summary",
            data_source=Element.DataSource.PORTFOLIO,
            field=Element.DataField.DESCRIPTION,
            config={
                "filters": [
                    {"key": "slug", "operator": "eq", "value": portfolio.slug},
                ]
            },
            order=2,
            is_visible=True,
        )

        # Projects -> GRID + IMAGE
        projects_grid_block = Block.objects.create(
            section=projects_section,
            type=Block.BlockType.GRID,
            order=1,
            config={"columns": 2},
            is_visible=True,
        )

        Element.objects.create(
            block=projects_grid_block,
            label="Project Name",
            data_source=Element.DataSource.PROJECT,
            field=Element.DataField.TITLE,
            config={},
            order=1,
            is_visible=True,
        )
        Element.objects.create(
            block=projects_grid_block,
            label="Description",
            data_source=Element.DataSource.PROJECT,
            field=Element.DataField.DESCRIPTION,
            config={},
            order=2,
            is_visible=True,
        )
        Element.objects.create(
            block=projects_grid_block,
            label="Repository",
            data_source=Element.DataSource.PROJECT,
            field=Element.DataField.GITHUB,
            config={},
            order=3,
            is_visible=True,
        )

        Element.objects.create(
            block=projects_grid_block,
            label="Preview",
            data_source=Element.DataSource.PROJECT,
            field=Element.DataField.IMAGE,
            config={},
            order=4,
            is_visible=True,
        )

        projects_image_block = Block.objects.create(
            section=projects_section,
            type=Block.BlockType.IMAGE,
            order=2,
            config={},
            is_visible=True,
        )

        Element.objects.create(
            block=projects_image_block,
            label="Preview",
            data_source=Element.DataSource.PROJECT,
            field=Element.DataField.IMAGE,
            config={
                "filters": [
                    {"key": "title", "operator": "eq", "value": preview_project_title},
                ]
            },
            order=1,
            is_visible=True,
        )

        # Skills -> LIST
        skills_block = Block.objects.create(
            section=skills_section,
            type=Block.BlockType.LIST,
            order=1,
            config={},
            is_visible=True,
        )

        Element.objects.create(
            block=skills_block,
            label="Skill",
            data_source=Element.DataSource.SKILL,
            field=Element.DataField.NAME,
            config={
                "filters": [
                    {"key": "level", "operator": "gt", "value": 7},
                ]
            },
            order=1,
            is_visible=True,
        )
        Element.objects.create(
            block=skills_block,
            label="Proficiency",
            data_source=Element.DataSource.SKILL,
            field=Element.DataField.LEVEL,
            config={
                "filters": [
                    {"key": "level", "operator": "gt", "value": 7},
                ]
            },
            order=2,
            is_visible=True,
        )

        # Experience -> TIMELINE (featured)
        experience_block = Block.objects.create(
            section=experience_section,
            type=Block.BlockType.TIMELINE,
            order=1,
            config={"title": "Featured"},
            is_visible=True,
        )

        Element.objects.create(
            block=experience_block,
            label="Company",
            data_source=Element.DataSource.EXPERIENCE,
            field=Element.DataField.COMPANY,
            config={
                "filters": [
                    {"key": "company", "operator": "eq", "value": primary_experience_company},
                ]
            },
            order=1,
            is_visible=True,
        )
        Element.objects.create(
            block=experience_block,
            label="Role",
            data_source=Element.DataSource.EXPERIENCE,
            field=Element.DataField.ROLE,
            config={
                "filters": [
                    {"key": "company", "operator": "eq", "value": primary_experience_company},
                ]
            },
            order=2,
            is_visible=True,
        )
        Element.objects.create(
            block=experience_block,
            label="Duration",
            data_source=Element.DataSource.EXPERIENCE,
            field=Element.DataField.TIMELINE,
            config={
                "filters": [
                    {"key": "company", "operator": "eq", "value": primary_experience_company},
                ]
            },
            order=3,
            is_visible=True,
        )

        # Experience -> TIMELINE (all work, excluding education)
        experience_all_block = Block.objects.create(
            section=experience_section,
            type=Block.BlockType.TIMELINE,
            order=2,
            config={"title": "All Experience"},
            is_visible=True,
        )

        exclude_education_filters = [
            {"key": "company", "operator": "neq", "value": "State University"},
            {"key": "company", "operator": "neq", "value": "Tech Institute"},
        ]

        Element.objects.create(
            block=experience_all_block,
            label="Company",
            data_source=Element.DataSource.EXPERIENCE,
            field=Element.DataField.COMPANY,
            config={"filters": exclude_education_filters},
            order=1,
            is_visible=True,
        )
        Element.objects.create(
            block=experience_all_block,
            label="Role",
            data_source=Element.DataSource.EXPERIENCE,
            field=Element.DataField.ROLE,
            config={"filters": exclude_education_filters},
            order=2,
            is_visible=True,
        )
        Element.objects.create(
            block=experience_all_block,
            label="Duration",
            data_source=Element.DataSource.EXPERIENCE,
            field=Element.DataField.TIMELINE,
            config={"filters": exclude_education_filters},
            order=3,
            is_visible=True,
        )

        # Education -> TIMELINE (uses Experience model)
        education_block = Block.objects.create(
            section=education_section,
            type=Block.BlockType.TIMELINE,
            order=1,
            config={},
            is_visible=True,
        )

        education_filters = [
            {"key": "company", "operator": "in", "value": ["State University", "Tech Institute"]},
        ]

        Element.objects.create(
            block=education_block,
            label="Institution",
            data_source=Element.DataSource.EXPERIENCE,
            field=Element.DataField.COMPANY,
            config={"filters": education_filters},
            order=1,
            is_visible=True,
        )
        Element.objects.create(
            block=education_block,
            label="Degree",
            data_source=Element.DataSource.EXPERIENCE,
            field=Element.DataField.ROLE,
            config={"filters": education_filters},
            order=2,
            is_visible=True,
        )
        Element.objects.create(
            block=education_block,
            label="Duration",
            data_source=Element.DataSource.EXPERIENCE,
            field=Element.DataField.TIMELINE,
            config={"filters": education_filters},
            order=3,
            is_visible=True,
        )

        # Typed data
        self._seed_projects(portfolio=portfolio, persona=persona)
        self._seed_skills(portfolio=portfolio, persona=persona)
        self._seed_experiences(portfolio=portfolio, persona=persona)

        """Auto-generated docstring for function _seed_projects.

        Args:
            self: Description.
            portfolio: Description.
            persona: Description.

        Returns:
            Description.
        """
    def _seed_projects(self, *, portfolio: Portfolio, persona: str) -> None:
        username = portfolio.user.username
        if persona == "backend":
            projects_data = [
                {
                    "title": "Renderfolio",
                    "description": "A backend-driven portfolio builder where sections, blocks, and elements are defined in the database and rendered dynamically.",
                    "github_url": "https://github.com/mallikarjun/renderfolio",
                    "image": f"user_{username}/projects/renderfolio.png",
                },
                {
                    "title": "Smart Edu Hub",
                    "description": "An educational interaction platform with role-based dashboards, progress tracking, and API-first architecture.",
                    "github_url": "https://github.com/mallikarjun/smart-edu-hub",
                    "image": f"user_{username}/projects/smart-edu-hub.png",
                },
                {
                    "title": "Delivery Time Prediction",
                    "description": "An ML-assisted service predicting delivery ETA using historical orders and operational signals, exposed through REST endpoints.",
                    "github_url": "https://github.com/mallikarjun/delivery-time-prediction",
                    "image": f"user_{username}/projects/delivery-time-prediction.png",
                },
                {
                    "title": "PostgreSQL Query Optimizer Notes",
                    "description": "A curated set of query patterns, indexing strategies, and benchmarks used to improve API response times.",
                    "github_url": "https://github.com/mallikarjun/pg-query-optimizer-notes",
                    "image": f"user_{username}/projects/pg-query-optimizer-notes.png",
                },
            ]
        else:
            projects_data = [
                {
                    "title": "Aurora Design System",
                    "description": "A component library and design system with typography scales, tokens, and accessible UI patterns.",
                    "github_url": "https://github.com/ananya/aurora-design-system",
                    "image": f"user_{username}/projects/aurora-design-system.png",
                },
                {
                    "title": "Mobile Checkout UX Refresh",
                    "description": "A UX redesign for a mobile checkout flow focusing on clarity, reduced friction, and stronger hierarchy.",
                    "github_url": "https://github.com/ananya/mobile-checkout-ux",
                    "image": f"user_{username}/projects/mobile-checkout-ux.png",
                },
                {
                    "title": "Portfolio Layout Playground",
                    "description": "A layout exploration tool for grid and typography combinations to validate responsive behavior before handoff.",
                    "github_url": "https://github.com/ananya/portfolio-layout-playground",
                    "image": f"user_{username}/projects/portfolio-layout-playground.png",
                },
            ]

        for index, data in enumerate(projects_data, start=1):
            if data.get("image"):
                self._ensure_media_file(str(data["image"]))
            Project.objects.create(
                portfolio=portfolio,
                title=data["title"],
                description=data["description"],
                github_url=data["github_url"],
                image=data["image"],
                order=index,
                is_visible=True,
            )

        """Auto-generated docstring for function _seed_skills.

        Args:
            self: Description.
            portfolio: Description.
            persona: Description.

        Returns:
            Description.
        """
    def _seed_skills(self, *, portfolio: Portfolio, persona: str) -> None:
        if persona == "backend":
            skills_data = [
                {"name": "Django", "level": 9},
                {"name": "Django REST Framework", "level": 9},
                {"name": "PostgreSQL", "level": 8},
                {"name": "Docker", "level": 7},
                {"name": "Celery", "level": 7},
                {"name": "React", "level": 8},
            ]
        else:
            skills_data = [
                {"name": "Figma", "level": 9},
                {"name": "UI Design", "level": 9},
                {"name": "Design Systems", "level": 8},
                {"name": "Accessibility", "level": 8},
                {"name": "Tailwind CSS", "level": 8},
                {"name": "React", "level": 7},
            ]

        for index, data in enumerate(skills_data, start=1):
            Skill.objects.create(
                portfolio=portfolio,
                name=data["name"],
                level=data["level"],
                order=index,
                is_visible=True,
            )

        """Auto-generated docstring for function _seed_experiences.

        Args:
            self: Description.
            portfolio: Description.
            persona: Description.

        Returns:
            Description.
        """
    def _seed_experiences(self, *, portfolio: Portfolio, persona: str) -> None:
        if persona == "backend":
            experiences_data = [
                {"company": "State University", "role": "B.Tech (Computer Science)", "timeline": "2018 - 2022"},
                {"company": "Tech Institute", "role": "Diploma (Computer Applications)", "timeline": "2016 - 2018"},
                {"company": "TechCorp", "role": "Backend Developer", "timeline": "2024 - Present"},
                {"company": "StartupX", "role": "Software Engineer Intern", "timeline": "2023 - 2024"},
                {"company": "Open Source", "role": "Contributor", "timeline": "2022 - 2023"},
            ]
        else:
            experiences_data = [
                {"company": "State University", "role": "B.Des (Interaction Design)", "timeline": "2018 - 2022"},
                {"company": "Tech Institute", "role": "Design Foundations", "timeline": "2016 - 2018"},
                {"company": "PixelCraft Studio", "role": "UI Designer", "timeline": "2024 - Present"},
                {"company": "Bright Agency", "role": "Junior UI/UX Designer", "timeline": "2023 - 2024"},
            ]

        for index, data in enumerate(experiences_data, start=1):
            Experience.objects.create(
                portfolio=portfolio,
                company=data["company"],
                role=data["role"],
                timeline=data["timeline"],
                order=index,
                is_visible=True,
            )
