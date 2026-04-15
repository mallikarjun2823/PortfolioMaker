from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction

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


class Command(BaseCommand):
    help = "Seed realistic dummy data for the portfolio system"

    @transaction.atomic
    def handle(self, *args, **options):
        User = get_user_model()

        # 1. Users
        mallikarjun = self._upsert_user(
            User,
            username="mallikarjun",
            email="malli.dev@example.com",
        )
        ananya = self._upsert_user(
            User,
            username="ananya",
            email="ananya.ui@example.com",
        )

        # 2. Themes (industry-style, production-like)
        minimal_dark = self._upsert_theme(
            name="Minimal Dark",
            config={
                "primary_color": "#0f172a",
                "secondary_color": "#1e293b",
                "text_color": "#e2e8f0",
                "font_family": "Inter",
                "alignment": "left",
            },
        )

        modern_light = self._upsert_theme(
            name="Modern Light",
            config={
                "primary_color": "#ffffff",
                "secondary_color": "#f1f5f9",
                "text_color": "#0f172a",
                "font_family": "Poppins",
                "alignment": "center",
            },
        )

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

    def _upsert_user(self, User, *, username: str, email: str):
        user, _ = User.objects.get_or_create(username=username, defaults={"email": email})
        if user.email != email:
            user.email = email
            user.save(update_fields=["email"])
        return user

    def _upsert_theme(self, *, name: str, config: dict) -> Theme:
        theme, _ = Theme.objects.update_or_create(
            name=name,
            defaults={
                "config": config,
                "is_active": True,
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

    def _reset_portfolio(self, portfolio: Portfolio) -> None:
        portfolio.sections.all().delete()
        portfolio.projects.all().delete()
        portfolio.skills.all().delete()
        portfolio.experiences.all().delete()

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
            order=3,
            is_visible=True,
            config={},
        )

        experience_section = Section.objects.create(
            portfolio=portfolio,
            name="Experience",
            order=4,
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

        # Experience -> TIMELINE
        experience_block = Block.objects.create(
            section=experience_section,
            type=Block.BlockType.TIMELINE,
            order=1,
            config={},
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

        # Typed data
        self._seed_projects(portfolio=portfolio, persona=persona)
        self._seed_skills(portfolio=portfolio, persona=persona)
        self._seed_experiences(portfolio=portfolio, persona=persona)

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
            Project.objects.create(
                portfolio=portfolio,
                title=data["title"],
                description=data["description"],
                github_url=data["github_url"],
                image=data["image"],
                order=index,
                is_visible=True,
            )

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

    def _seed_experiences(self, *, portfolio: Portfolio, persona: str) -> None:
        if persona == "backend":
            experiences_data = [
                {"company": "TechCorp", "role": "Backend Developer", "timeline": "2024 - Present"},
                {"company": "StartupX", "role": "Software Engineer Intern", "timeline": "2023 - 2024"},
                {"company": "Open Source", "role": "Contributor", "timeline": "2022 - 2023"},
            ]
        else:
            experiences_data = [
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
