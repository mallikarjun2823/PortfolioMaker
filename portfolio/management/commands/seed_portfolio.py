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
        malli, _ = User.objects.get_or_create(
            username="malli",
            defaults={"email": "malli@example.com"},
        )
        if malli.email != "malli@example.com":
            malli.email = "malli@example.com"
            malli.save(update_fields=["email"])

        john, _ = User.objects.get_or_create(
            username="john",
            defaults={"email": "john@example.com"},
        )
        if john.email != "john@example.com":
            john.email = "john@example.com"
            john.save(update_fields=["email"])

        # 2. Themes
        minimal_dark, _ = Theme.objects.get_or_create(
            name="Minimal Dark",
            defaults={
                "config": {
                    "colors": {
                        "background": "#0b1120",
                        "surface": "#111827",
                        "primary": "#38bdf8",
                        "text": "#e5e7eb",
                    },
                    "font_family": "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI'",
                    "spacing": {
                        "section_y": 64,
                        "block_y": 32,
                    },
                },
                "is_active": True,
                "is_default": True,
            },
        )

        clean_light, _ = Theme.objects.get_or_create(
            name="Clean Light",
            defaults={
                "config": {
                    "colors": {
                        "background": "#f9fafb",
                        "surface": "#ffffff",
                        "primary": "#2563eb",
                        "text": "#111827",
                    },
                    "font_family": "'Inter', system-ui, -apple-system, BlinkMacSystemFont",
                    "spacing": {
                        "section_y": 56,
                        "block_y": 28,
                    },
                },
                "is_active": True,
                "is_default": False,
            },
        )

        # 3. Portfolios for user1 (malli)
        malli_portfolio, _ = Portfolio.objects.get_or_create(
            user=malli,
            slug="malli-portfolio",
            defaults={
                "title": "Malli Portfolio",
                "theme": minimal_dark,
                "is_published": True,
            },
        )
        malli_portfolio.theme = minimal_dark
        malli_portfolio.is_published = True
        malli_portfolio.title = "Malli Portfolio"
        malli_portfolio.save()

        malli_exp_portfolio, _ = Portfolio.objects.get_or_create(
            user=malli,
            slug="malli-exp",
            defaults={
                "title": "Malli Experimental",
                "theme": clean_light,
                "is_published": False,
            },
        )
        malli_exp_portfolio.theme = clean_light
        malli_exp_portfolio.is_published = False
        malli_exp_portfolio.title = "Malli Experimental"
        malli_exp_portfolio.save()

        # 4. Portfolio for user2 (john)
        john_portfolio, _ = Portfolio.objects.get_or_create(
            user=john,
            slug="john-portfolio",
            defaults={
                "title": "John Portfolio",
                "theme": clean_light,
                "is_published": True,
            },
        )
        john_portfolio.theme = clean_light
        john_portfolio.is_published = True
        john_portfolio.title = "John Portfolio"
        john_portfolio.save()

        # Build each portfolio layout + data
        self._build_malli_portfolio(malli_portfolio)
        self._build_malli_experimental_portfolio(malli_exp_portfolio)
        self._build_john_portfolio(john_portfolio)

        self.stdout.write(self.style.SUCCESS("Seed data created successfully."))

    def _build_malli_portfolio(self, portfolio: Portfolio) -> None:
        # Clear existing layout/data for idempotency
        portfolio.sections.all().delete()
        portfolio.projects.all().delete()
        portfolio.skills.all().delete()
        portfolio.experiences.all().delete()

        # Sections
        about_section = Section.objects.create(
            portfolio=portfolio,
            name="About Me",
            order=1.0,
            is_visible=True,
            presentation={"text_size": "lg"},
        )

        projects_section = Section.objects.create(
            portfolio=portfolio,
            name="Projects",
            order=2.0,
            is_visible=True,
            presentation={},
        )

        # About Me blocks
        about_block = Block.objects.create(
            section=about_section,
            type=Block.BlockType.KEY_VALUE,
            order=1.0,
            config={},
            is_visible=True,
        )

        Element.objects.create(
            block=about_block,
            label="Name",
            data_source=Element.DataSource.PORTFOLIO,
            field=Element.DataField.TITLE,
            order=1.0,
            is_visible=True,
        )

        # Bio assumes a description field; element can still be defined
        Element.objects.create(
            block=about_block,
            label="Bio",
            data_source=Element.DataSource.PORTFOLIO,
            field=Element.DataField.DESCRIPTION,
            order=2.0,
            is_visible=True,
        )

        # Projects blocks
        projects_grid_block = Block.objects.create(
            section=projects_section,
            type=Block.BlockType.GRID,
            order=1.0,
            config={"columns": 2},
            is_visible=True,
        )

        Element.objects.create(
            block=projects_grid_block,
            label="Project Name",
            data_source=Element.DataSource.PROJECT,
            field=Element.DataField.TITLE,
            order=1.0,
            is_visible=True,
        )
        Element.objects.create(
            block=projects_grid_block,
            label="Description",
            data_source=Element.DataSource.PROJECT,
            field=Element.DataField.DESCRIPTION,
            order=2.0,
            is_visible=True,
        )
        Element.objects.create(
            block=projects_grid_block,
            label="Repo",
            data_source=Element.DataSource.PROJECT,
            field=Element.DataField.GITHUB,
            order=3.0,
            is_visible=True,
        )

        projects_image_block = Block.objects.create(
            section=projects_section,
            type=Block.BlockType.IMAGE,
            order=2.0,
            config={},
            is_visible=True,
        )

        Element.objects.create(
            block=projects_image_block,
            label="Preview",
            data_source=Element.DataSource.PROJECT,
            field=Element.DataField.IMAGE,
            order=1.0,
            is_visible=True,
        )

        # Projects data
        projects_data = [
            {
                "title": "Personal Portfolio Generator",
                "description": "A Django-based engine that lets users compose portfolio layouts from reusable blocks.",
                "github_url": "https://github.com/malli/portfolio-generator",
                "image": "projects/portfolio-generator.png",
            },
            {
                "title": "Task Flow Orchestrator",
                "description": "A lightweight workflow engine for automating recurring engineering tasks.",
                "github_url": "https://github.com/malli/taskflow-orchestrator",
                "image": "projects/taskflow-orchestrator.png",
            },
            {
                "title": "Developer Activity Dashboard",
                "description": "A dashboard aggregating GitHub activity, CI status, and deployment health.",
                "github_url": "https://github.com/malli/dev-activity-dashboard",
                "image": "projects/dev-activity-dashboard.png",
            },
        ]

        for index, data in enumerate(projects_data, start=1):
            Project.objects.create(
                portfolio=portfolio,
                title=data["title"],
                description=data["description"],
                github_url=data["github_url"],
                image=data["image"],
                order=float(index),
                is_visible=True,
            )

    def _build_malli_experimental_portfolio(self, portfolio: Portfolio) -> None:
        portfolio.sections.all().delete()
        portfolio.projects.all().delete()
        portfolio.skills.all().delete()
        portfolio.experiences.all().delete()

        skills_section = Section.objects.create(
            portfolio=portfolio,
            name="Skills",
            order=1.0,
            is_visible=True,
            presentation={},
        )

        skills_block = Block.objects.create(
            section=skills_section,
            type=Block.BlockType.LIST,
            order=1.0,
            config={},
            is_visible=True,
        )

        Element.objects.create(
            block=skills_block,
            label="Skill",
            data_source=Element.DataSource.SKILL,
            field=Element.DataField.NAME,
            order=1.0,
            is_visible=True,
        )
        Element.objects.create(
            block=skills_block,
            label="Level",
            data_source=Element.DataSource.SKILL,
            field=Element.DataField.LEVEL,
            order=2.0,
            is_visible=True,
        )

        skills_data = [
            {"name": "Python", "level": 9},
            {"name": "Django", "level": 8},
            {"name": "REST APIs", "level": 8},
            {"name": "React", "level": 7},
            {"name": "Docker & CI/CD", "level": 7},
        ]

        for index, data in enumerate(skills_data, start=1):
            Skill.objects.create(
                portfolio=portfolio,
                name=data["name"],
                level=data["level"],
                order=float(index),
                is_visible=True,
            )

    def _build_john_portfolio(self, portfolio: Portfolio) -> None:
        portfolio.sections.all().delete()
        portfolio.projects.all().delete()
        portfolio.skills.all().delete()
        portfolio.experiences.all().delete()

        experience_section = Section.objects.create(
            portfolio=portfolio,
            name="Experience",
            order=1.0,
            is_visible=True,
            presentation={},
        )

        experience_block = Block.objects.create(
            section=experience_section,
            type=Block.BlockType.TIMELINE,
            order=1.0,
            config={},
            is_visible=True,
        )

        Element.objects.create(
            block=experience_block,
            label="Company",
            data_source=Element.DataSource.EXPERIENCE,
            field=Element.DataField.COMPANY,
            order=1.0,
            is_visible=True,
        )
        Element.objects.create(
            block=experience_block,
            label="Role",
            data_source=Element.DataSource.EXPERIENCE,
            field=Element.DataField.ROLE,
            order=2.0,
            is_visible=True,
        )
        Element.objects.create(
            block=experience_block,
            label="Duration",
            data_source=Element.DataSource.EXPERIENCE,
            field=Element.DataField.TIMELINE,
            order=3.0,
            is_visible=True,
        )

        experiences_data = [
            {
                "company": "Nimbus Analytics",
                "role": "Senior Backend Engineer",
                "timeline": "2022 - Present",
            },
            {
                "company": "Brightline Solutions",
                "role": "Software Engineer",
                "timeline": "2019 - 2022",
            },
            {
                "company": "Skyline Tech",
                "role": "Junior Developer",
                "timeline": "2017 - 2019",
            },
        ]

        for index, data in enumerate(experiences_data, start=1):
            Experience.objects.create(
                portfolio=portfolio,
                company=data["company"],
                role=data["role"],
                timeline=data["timeline"],
                order=float(index),
                is_visible=True,
            )
