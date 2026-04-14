from django.db import models
from django.contrib.auth.models import User


# =========================
# THEME
# =========================

class Theme(models.Model):
    name = models.CharField(max_length=100, unique=True)

    # Controlled styling config (colors, spacing, typography defaults)
    config = models.JSONField()

    is_active = models.BooleanField(default=True)
    is_default = models.BooleanField(default=False)

    def __str__(self):
        return self.name


# =========================
# PORTFOLIO (AGGREGATE ROOT)
# =========================

class Portfolio(models.Model):
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="portfolios"
    )

    title = models.CharField(max_length=100)
    slug = models.SlugField(unique=True)

    theme = models.ForeignKey(
        Theme,
        on_delete=models.PROTECT,
        related_name="portfolios"
    )

    is_published = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=["user"]),
            models.Index(fields=["slug"]),
        ]

    def __str__(self):
        return self.title


# =========================
# SECTION (LAYOUT CONTAINER)
# =========================

class Section(models.Model):
    portfolio = models.ForeignKey(
        Portfolio,
        on_delete=models.CASCADE,
        related_name="sections"
    )

    name = models.CharField(max_length=100)

    order = models.FloatField()

    is_visible = models.BooleanField(default=True)

    # Typography / presentation hints (controlled)
    presentation = models.JSONField(default=dict)

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
    class BlockType(models.TextChoices):
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

    order = models.FloatField()

    # Layout-specific configuration (columns, variant, etc.)
    config = models.JSONField(default=dict)

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
    class DataSource(models.TextChoices):
        PORTFOLIO = "PORTFOLIO"
        PROJECT = "PROJECT"
        SKILL = "SKILL"
        EXPERIENCE = "EXPERIENCE"

    class DataField(models.TextChoices):
        # Common
        TITLE = "title"
        DESCRIPTION = "description"

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

    order = models.FloatField()

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
    portfolio = models.ForeignKey(
        Portfolio,
        on_delete=models.CASCADE,
        related_name="projects"
    )

    title = models.CharField(max_length=200)
    description = models.TextField()

    github_url = models.URLField(blank=True, null=True)

    # Image path (used in IMAGE block)
    image = models.ImageField(upload_to="projects/", null=True, blank=True)

    order = models.FloatField(default=0)
    is_visible = models.BooleanField(default=True)

    class Meta:
        ordering = ["order"]

    def __str__(self):
        return self.title


class Skill(models.Model):
    portfolio = models.ForeignKey(
        Portfolio,
        on_delete=models.CASCADE,
        related_name="skills"
    )

    name = models.CharField(max_length=100)
    level = models.IntegerField()

    order = models.FloatField(default=0)
    is_visible = models.BooleanField(default=True)

    class Meta:
        ordering = ["order"]

    def __str__(self):
        return self.name


class Experience(models.Model):
    portfolio = models.ForeignKey(
        Portfolio,
        on_delete=models.CASCADE,
        related_name="experiences"
    )

    company = models.CharField(max_length=200)
    role = models.CharField(max_length=200)
    timeline = models.CharField(max_length=100)

    order = models.FloatField(default=0)
    is_visible = models.BooleanField(default=True)

    class Meta:
        ordering = ["order"]

    def __str__(self):
        return f"{self.company} - {self.role}"