"""Auto-generated module docstring for portfolio\models.py.

This docstring was added by scripts/add_docstrings.py.
"""

"""Data models for the ``portfolio`` app.

This module defines the Django models used to represent user portfolios,
layout sections and blocks, data-mapping elements, and typed data models
such as projects, skills and experiences. Helper functions for storing
uploaded media in per-user directories are provided as well.

Models
-------
- :class:`Theme` : Named theme presets and configuration.
- :class:`Portfolio` : Aggregate root representing a user's portfolio.
- :class:`Section` : Layout container for blocks.
- :class:`Block` : Layout primitive contained by a section.
- :class:`Element` : Field mapping used by blocks to render data.
- :class:`Project`, :class:`Skill`, :class:`Experience` : Typed data models.
"""

from django.db import models
from django.contrib.auth.models import User
from django.conf import settings
import os


def user_directory_path_for_project_images(instance, filename):
    """Return an upload path for project images grouped by user.

    The path returned is relative to the project's ``MEDIA_ROOT`` and takes the
    form ``user_<username>/projects/<filename>``. The helper ensures the
    destination directory exists before returning the relative path.

    Args:
        instance: The model instance that the file is attached to. Expected to
            have a ``portfolio`` attribute referencing a :class:`Portfolio`.
        filename: Original filename of the uploaded file.

    Returns:
        A string path relative to ``MEDIA_ROOT`` where the file should be
        stored.
    """
    username = (
        instance.portfolio.user.username
        if instance.portfolio and instance.portfolio.user and instance.portfolio.user.username
        else "anonymous"
    )
    relative_path = os.path.join(f"user_{username}", "projects", filename)

    # Ensure the directory exists under MEDIA_ROOT
    directory = os.path.join(settings.MEDIA_ROOT, os.path.dirname(relative_path))
    os.makedirs(directory, exist_ok=True)

    return relative_path


def user_directory_path_for_portfolio_resume(instance, filename):
    """Return an upload path for portfolio resumes grouped by user.

    Example: ``user_alice/portfolio/resume/resume.pdf``.

    Args:
        instance: The model instance (usually a :class:`User` or profile).
        filename: Original filename of the uploaded resume.

    Returns:
        A string path relative to ``MEDIA_ROOT`` where the resume should be
        stored.
    """
    username = (
        instance.user.username
        if instance.user and instance.user.username
        else "anonymous"
    )
    relative_path = os.path.join(f"user_{username}", "portfolio", "resume", filename)

    directory = os.path.join(settings.MEDIA_ROOT, os.path.dirname(relative_path))
    os.makedirs(directory, exist_ok=True)

    return relative_path


# =========================
# THEME
# =========================


class Theme(models.Model):
    """A named theme preset with JSON configuration for styling.

    The ``config`` field is expected to contain a JSON object describing
    color variables, typography and other presentation-related defaults that
    the frontend can consume when rendering a portfolio.

    Attributes:
        name (str): Unique friendly name for the theme.
        config (dict): JSON blob with theme configuration.
        is_active (bool): Whether the theme is available for selection.
        is_default (bool): Whether this theme is the system default.
    """
    name = models.CharField(max_length=100, unique=True)

    # Controlled styling config (colors, spacing, typography defaults)
    config = models.JSONField()

    is_active = models.BooleanField(default=True)
    is_default = models.BooleanField(default=False)

    def __str__(self):
        """Return the human-readable theme name.

        Returns:
            str: The theme's ``name`` value.
        """
        return self.name


# =========================
# PORTFOLIO (AGGREGATE ROOT)
# =========================


class Portfolio(models.Model):
    """User-owned portfolio aggregate.

    A portfolio represents the collection of content a user publishes. It
    references a :class:`Theme` and can optionally contain an uploaded resume
    file. Uniqueness is enforced on the pair (user, slug) so users may have
    multiple portfolios with distinct slugs.

    Attributes:
        user (User): Owner of the portfolio.
        title (str): Human-readable title.
        slug (str): URL-safe slug for public access.
        description (str): Optional longer description.
        resume (File): Optional uploaded resume file.
        theme (Theme): Optional selected theme.
        is_published (bool): Whether the portfolio is published publicly.
    """
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="portfolios",
    )

    title = models.CharField(max_length=100)
    slug = models.SlugField()

    description = models.TextField(blank=True, default="")

    resume = models.FileField(
        upload_to=user_directory_path_for_portfolio_resume,
        null=True,
        blank=True,
    )

    theme = models.ForeignKey(
        Theme,
        on_delete=models.PROTECT,
        related_name="portfolios",
        null=True,
        blank=True,
    )

    is_published = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["user", "slug"], name="uniq_portfolio_user_slug"),
        ]
        indexes = [
            models.Index(fields=["user"]),
            models.Index(fields=["slug"]),
        ]

    def __str__(self):
        """Return a concise representation of the portfolio.

        Returns:
            str: The portfolio's title.
        """
        return self.title


# =========================
# SECTION (LAYOUT CONTAINER)
# =========================


class Section(models.Model):
    """A named container used to group blocks in a portfolio layout.

    Sections are ordered by the ``order`` field and can contain multiple
    :class:`Block` instances. The ``config`` JSON field may store section-level
    presentation overrides.
    """
    portfolio = models.ForeignKey(
        Portfolio,
        on_delete=models.CASCADE,
        related_name="sections"
    )

    name = models.CharField(max_length=100)

    order = models.IntegerField()

    is_visible = models.BooleanField(default=True)
    config = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["order"]
        indexes = [
            models.Index(fields=["portfolio"]),
            models.Index(fields=["portfolio", "order"]),
        ]

    def __str__(self):
        return f"{self.name} ({self.portfolio.title})"


# =========================
# BLOCK (LAYOUT ENGINE)
# =========================


class Block(models.Model):
    """Layout primitive contained within a :class:`Section`.

    A block represents a visual structure (list, grid, timeline, etc.) and
    contains configuration for rendering, an ordering within the section and
    visibility toggles.
    """

    class BlockType(models.TextChoices):
        """Choices describing the visual block type used by the frontend."""
        LIST = "LIST"
        GRID = "GRID"
        TIMELINE = "TIMELINE"
        KEY_VALUE = "KEY_VALUE"
        IMAGE = "IMAGE"

    section = models.ForeignKey(
        Section,
        on_delete=models.CASCADE,
        related_name="blocks"
    )

    type = models.CharField(
        max_length=50,
        choices=BlockType.choices
    )

    order = models.IntegerField()

    # Layout-specific configuration (columns, variant, etc.)
    config = models.JSONField(default=dict, blank=True)

    is_visible = models.BooleanField(default=True)

    class Meta:
        ordering = ["order"]
        indexes = [
            models.Index(fields=["section"]),
            models.Index(fields=["section", "order"]),
        ]

    def __str__(self):
        return f"{self.type} ({self.section.name})"


# =========================
# ELEMENT (FIELD MAPPING)
# =========================


class Element(models.Model):
    """Mapping that tells a block which field from which model to render.

    Elements map a logical ``field`` (for example ``title`` or ``image``) to a
    source model (portfolio, project, skill, experience). The frontend uses
    elements to determine how to populate a block's data.
    """

    class DataSource(models.TextChoices):
        """Source model types referenced by an Element."""
        PORTFOLIO = "PORTFOLIO"
        PROJECT = "PROJECT"
        SKILL = "SKILL"
        EXPERIENCE = "EXPERIENCE"

    class DataField(models.TextChoices):
        """Concrete fields available for mapping from each source type."""
        # Common
        TITLE = "title"
        DESCRIPTION = "description"
        RESUME = "resume"

        # Project
        GITHUB = "github_url"
        IMAGE = "image"

        # Skill
        NAME = "name"
        LEVEL = "level"

        # Experience
        COMPANY = "company"
        ROLE = "role"
        TIMELINE = "timeline"

    block = models.ForeignKey(
        Block,
        on_delete=models.CASCADE,
        related_name="elements"
    )

    label = models.CharField(max_length=100)

    data_source = models.CharField(
        max_length=50,
        choices=DataSource.choices
    )

    field = models.CharField(
        max_length=50,
        choices=DataField.choices
    )

    config = models.JSONField(default=dict, blank=True)

    order = models.IntegerField()

    is_visible = models.BooleanField(default=True)

    class Meta:
        ordering = ["order"]
        unique_together = ("block", "data_source", "field")
        indexes = [
            models.Index(fields=["block"]),
            models.Index(fields=["block", "order"]),
        ]

    def __str__(self):
        return f"{self.label} ({self.data_source}.{self.field})"


# =========================
# DATA MODELS (TYPED DATA)
# =========================


class Project(models.Model):
    """A project entry belonging to a portfolio.

    Projects are used to populate project-specific blocks (e.g. image or
    github URL fields) and include ordering and visibility controls.
    """
    portfolio = models.ForeignKey(
        Portfolio,
        on_delete=models.CASCADE,
        related_name="projects"
    )

    title = models.CharField(max_length=200)
    description = models.TextField()

    github_url = models.URLField(blank=True, null=True)

    # Image path (used in IMAGE block)
    image = models.ImageField(
        upload_to=user_directory_path_for_project_images,
        null=True,
        blank=True,
    )

    order = models.IntegerField(default=0)
    is_visible = models.BooleanField(default=True)

    class Meta:
        ordering = ["order"]

    def __str__(self):
        return self.title


class Skill(models.Model):
    """A skill entry for a portfolio (e.g. "Python", with a level)."""
    portfolio = models.ForeignKey(
        Portfolio,
        on_delete=models.CASCADE,
        related_name="skills"
    )

    name = models.CharField(max_length=100)
    level = models.IntegerField()

    order = models.IntegerField(default=0)
    is_visible = models.BooleanField(default=True)

    class Meta:
        ordering = ["order"]

    def __str__(self):
        return self.name


class Experience(models.Model):
    """An experience or employment entry for a portfolio."""
    portfolio = models.ForeignKey(
        Portfolio,
        on_delete=models.CASCADE,
        related_name="experiences"
    )

    company = models.CharField(max_length=200)
    role = models.CharField(max_length=200)
    timeline = models.CharField(max_length=100)

    order = models.IntegerField(default=0)
    is_visible = models.BooleanField(default=True)

    class Meta:
        ordering = ["order"]

    def __str__(self):
        return f"{self.company} - {self.role}"
    # Clean end of file: single Experience model definition above.