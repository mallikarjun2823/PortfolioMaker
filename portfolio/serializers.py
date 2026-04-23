"""DRF serializers for the ``portfolio`` app.

This module provides Django REST Framework serializers used by the portfolio
API: authentication helpers and model serializers for Portfolio, Project,
Skill, Experience, Section, Block and Element. All public serializers use
straightforward field declarations and the write serializers include
validation helpers used by the service layer.
"""

from __future__ import annotations

from typing import Any, Dict

from rest_framework import serializers

from .models import Block, Element, Experience, Portfolio, Project, Section, Skill, Theme


class RegisterSerializer(serializers.Serializer):
    """Input serializer for user registration.

    Fields:
        username: Desired username (max 150 characters).
        email: Optional email address.
        password: Write-only password (minimum length enforced by serializer).
    """

    username = serializers.CharField(max_length=150)
    email = serializers.EmailField(required=False, allow_blank=True)
    password = serializers.CharField(write_only=True, min_length=8)


class LoginSerializer(serializers.Serializer):
    """Input serializer for user login requests.

    Fields:
        username: Username string.
        password: Write-only password string.
    """

    username = serializers.CharField(max_length=150)
    password = serializers.CharField(write_only=True)


class AuthResponseSerializer(serializers.Serializer):
    """Response serializer returning JWT tokens after authentication.

    Fields:
        access: Short-lived access token string.
        refresh: Refresh token string.
    """

    access = serializers.CharField(read_only=True)
    refresh = serializers.CharField(read_only=True)


class ThemeResponseSerializer(serializers.ModelSerializer):
    """Serializer for public Theme data used by portfolios."""

    class Meta:
        model = Theme
        fields = ["id", "name", "config", "is_active", "is_default"]
        read_only_fields = fields


class PortfolioResponseSerializer(serializers.ModelSerializer):
    """Read-only serializer for portfolio payloads returned by the API."""

    class Meta:
        model = Portfolio
        fields = [
            "id",
            "title",
            "slug",
            "description",
            "resume",
            "theme",
            "is_published",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


class PortfolioCreateSerializer(serializers.ModelSerializer):
    """Serializer used to create a new Portfolio.

    The serializer exposes optional fields that the service layer may
    normalize (for example, blank slug to auto-generate a slug).
    """

    class Meta:
        model = Portfolio
        fields = [
            "title",
            "slug",
            "description",
            "resume",
            "theme",
            "is_published",
        ]
        extra_kwargs = {
            "slug": {"required": False, "allow_blank": True},
            "description": {"required": False, "allow_blank": True},
            "resume": {"required": False, "allow_null": True},
            "theme": {"required": False, "allow_null": True},
            "is_published": {"required": False},
        }


class PortfolioPutSerializer(serializers.ModelSerializer):
    """PUT serializer for fully replacing Portfolio updatable fields.

    This serializer enforces required fields for strict PUT semantics.
    """

    class Meta:
        model = Portfolio
        fields = [
            "title",
            "slug",
            "description",
            "resume",
            "theme",
            "is_published",
        ]
        extra_kwargs = {
            # Strict PUT: require all updatable fields (slug can be blank to trigger auto-generation in service)
            "slug": {"required": True, "allow_blank": True},
            "description": {"required": True, "allow_blank": True},
            "resume": {"required": True, "allow_null": True},
            "theme": {"required": True, "allow_null": True},
            "is_published": {"required": True},
        }


class PortfolioPatchSerializer(serializers.ModelSerializer):
    """PATCH serializer for partial portfolio updates.

    Fields are all optional and validated individually by the serializer.
    """

    class Meta:
        model = Portfolio
        fields = [
            "title",
            "slug",
            "description",
            "resume",
            "theme",
            "is_published",
        ]
        extra_kwargs = {
            "title": {"required": False},
            "slug": {"required": False, "allow_blank": True},
            "description": {"required": False, "allow_blank": True},
            "resume": {"required": False, "allow_null": True},
            "theme": {"required": False, "allow_null": True},
            "is_published": {"required": False},
        }


class ProjectResponseSerializer(serializers.ModelSerializer):
    """Read-only serializer for Project records."""

    class Meta:
        model = Project
        fields = [
            "id",
            "portfolio",
            "title",
            "description",
            "github_url",
            "image",
            "order",
            "is_visible",
        ]
        read_only_fields = fields


class ProjectCreateSerializer(serializers.ModelSerializer):
    """Serializer used to create Project items for a portfolio."""

    class Meta:
        model = Project
        fields = [
            "title",
            "description",
            "github_url",
            "image",
            "order",
            "is_visible",
        ]
        extra_kwargs = {
            "github_url": {"required": False, "allow_null": True, "allow_blank": True},
            "image": {"required": False, "allow_null": True},
            "order": {"required": False},
            "is_visible": {"required": False},
        }


class ProjectPutSerializer(serializers.ModelSerializer):
    """PUT serializer for full project replacement."""

    class Meta:
        model = Project
        fields = [
            "title",
            "description",
            "github_url",
            "image",
            "order",
            "is_visible",
        ]
        extra_kwargs = {
            "title": {"required": True},
            "description": {"required": True},
            "github_url": {"required": True, "allow_null": True, "allow_blank": True},
            "image": {"required": True, "allow_null": True},
            "order": {"required": True},
            "is_visible": {"required": True},
        }


class ProjectPatchSerializer(serializers.ModelSerializer):
    """PATCH serializer for partial project updates."""

    class Meta:
        model = Project
        fields = [
            "title",
            "description",
            "github_url",
            "image",
            "order",
            "is_visible",
        ]
        extra_kwargs = {
            "title": {"required": False},
            "description": {"required": False},
            "github_url": {"required": False, "allow_null": True, "allow_blank": True},
            "image": {"required": False, "allow_null": True},
            "order": {"required": False},
            "is_visible": {"required": False},
        }


class SkillResponseSerializer(serializers.ModelSerializer):
    """Read-only serializer for Skill records."""

    class Meta:
        model = Skill
        fields = [
            "id",
            "portfolio",
            "name",
            "level",
            "order",
            "is_visible",
        ]
        read_only_fields = fields


class SkillCreateSerializer(serializers.ModelSerializer):
    """Serializer to create Skill entries."""

    class Meta:
        model = Skill
        fields = ["name", "level", "order", "is_visible"]
        extra_kwargs = {"order": {"required": False}, "is_visible": {"required": False}}


class SkillPutSerializer(serializers.ModelSerializer):
    """PUT serializer for Skill.

    Enforces required fields for total replacement.
    """

    class Meta:
        model = Skill
        fields = ["name", "level", "order", "is_visible"]
        extra_kwargs = {"name": {"required": True}, "level": {"required": True}, "order": {"required": True}, "is_visible": {"required": True}}


class SkillPatchSerializer(serializers.ModelSerializer):
    """PATCH serializer for partial Skill updates."""

    class Meta:
        model = Skill
        fields = ["name", "level", "order", "is_visible"]
        extra_kwargs = {"name": {"required": False}, "level": {"required": False}, "order": {"required": False}, "is_visible": {"required": False}}


class ExperienceResponseSerializer(serializers.ModelSerializer):
    """Read-only serializer for Experience records."""

    class Meta:
        model = Experience
        fields = [
            "id",
            "portfolio",
            "company",
            "role",
            "timeline",
            "order",
            "is_visible",
        ]
        read_only_fields = fields


class ExperienceCreateSerializer(serializers.ModelSerializer):
    """Serializer to create Experience records for a portfolio."""

    class Meta:
        model = Experience
        fields = ["company", "role", "timeline", "order", "is_visible"]
        extra_kwargs = {"order": {"required": False}, "is_visible": {"required": False}}


class ExperiencePutSerializer(serializers.ModelSerializer):
    """PUT serializer for Experience records."""

    class Meta:
        model = Experience
        fields = ["company", "role", "timeline", "order", "is_visible"]
        extra_kwargs = {"company": {"required": True}, "role": {"required": True}, "timeline": {"required": True}, "order": {"required": True}, "is_visible": {"required": True}}


class ExperiencePatchSerializer(serializers.ModelSerializer):
    """PATCH serializer for Experience updates."""

    class Meta:
        model = Experience
        fields = ["company", "role", "timeline", "order", "is_visible"]
        extra_kwargs = {"company": {"required": False}, "role": {"required": False}, "timeline": {"required": False}, "order": {"required": False}, "is_visible": {"required": False}}


class SectionResponseSerializer(serializers.ModelSerializer):
    """Read-only serializer for Section objects exposed in portfolio payloads."""

    class Meta:
        model = Section
        fields = ["id", "portfolio", "name", "order", "is_visible", "config"]
        read_only_fields = fields


class _BaseSectionWriteSerializer(serializers.ModelSerializer):
    """Base write serializer for Section with shared validators."""

    def validate_name(self, value: str) -> str:
        """Validate and normalize the section name.

        Args:
            value: Raw name value.

        Returns:
            Normalized name string.

        Raises:
            serializers.ValidationError: If the name is empty.
        """
        name = "" if value is None else str(value)
        name = name.strip()
        if not name:
            raise serializers.ValidationError("Name cannot be empty.")
        return name

    def validate_order(self, value: int) -> int:
        """Ensure the order value is a positive integer or None for PATCH.

        Args:
            value: Order value to validate.

        Returns:
            The validated integer or None.
        """
        if value is None:
            return value

        try:
            order = int(value)
        except (TypeError, ValueError):
            raise serializers.ValidationError("Order must be an integer.")

        # Sections are typically 1-based in the seeded dataset and UI ordering.
        if order < 1:
            raise serializers.ValidationError("Order must be >= 1.")
        return order

    def validate_config(self, value: Any) -> Dict[str, Any]:
        """Validate the section config is a mapping (dict).

        Args:
            value: Config value.

        Returns:
            The validated config dict.

        Raises:
            serializers.ValidationError: If config is missing or not a dict.
        """
        if value is None:
            raise serializers.ValidationError("Config must be an object.")
        if not isinstance(value, dict):
            raise serializers.ValidationError("Config must be an object.")
        return value


class SectionCreateSerializer(_BaseSectionWriteSerializer):
    """Serializer to create a Section inside a portfolio."""

    class Meta:
        model = Section
        fields = ["name", "order", "is_visible", "config"]
        extra_kwargs = {"order": {"required": False}, "is_visible": {"required": False}, "config": {"required": False}}


class SectionPutSerializer(_BaseSectionWriteSerializer):
    """PUT serializer for Section (full replacement)."""

    class Meta:
        model = Section
        fields = ["name", "order", "is_visible", "config"]
        extra_kwargs = {"name": {"required": True}, "order": {"required": True}, "is_visible": {"required": True}, "config": {"required": True}}


class SectionPatchSerializer(_BaseSectionWriteSerializer):
    """PATCH serializer for section updates."""

    class Meta:
        model = Section
        fields = ["name", "order", "is_visible", "config"]
        extra_kwargs = {"name": {"required": False}, "order": {"required": False}, "is_visible": {"required": False}, "config": {"required": False}}


class BlockResponseSerializer(serializers.ModelSerializer):
    """Read-only serializer for Block records included in section payloads."""

    class Meta:
        model = Block
        fields = ["id", "section", "type", "order", "is_visible", "config"]
        read_only_fields = fields


class _BaseBlockWriteSerializer(serializers.ModelSerializer):
    """Base write serializer for Block with validation helpers."""

    def validate_type(self, value: str) -> str:
        """Validate block type and normalize to uppercase token.

        Raises:
            serializers.ValidationError: If type is empty or not allowed.
        """
        t = "" if value is None else str(value)
        t = t.strip().upper()
        if not t:
            raise serializers.ValidationError("Type cannot be empty.")

        allowed = {c for c, _ in Block.BlockType.choices}
        if t not in allowed:
            raise serializers.ValidationError("Invalid block type.")
        return t

    def validate_order(self, value: int) -> int:
        """Validate order is a positive integer or None for PATCH."""
        if value is None:
            return value

        try:
            order = int(value)
        except (TypeError, ValueError):
            raise serializers.ValidationError("Order must be an integer.")

        if order < 1:
            raise serializers.ValidationError("Order must be >= 1.")
        return order

    def validate_config(self, value: Any) -> Dict[str, Any]:
        """Ensure block config is a mapping."""
        if value is None:
            raise serializers.ValidationError("Config must be an object.")
        if not isinstance(value, dict):
            raise serializers.ValidationError("Config must be an object.")
        return value


class BlockCreateSerializer(_BaseBlockWriteSerializer):
    """Serializer to create Block instances inside a Section."""

    class Meta:
        model = Block
        fields = ["type", "order", "is_visible", "config"]
        extra_kwargs = {"order": {"required": False}, "is_visible": {"required": False}, "config": {"required": False}}


class BlockPutSerializer(_BaseBlockWriteSerializer):
    """PUT serializer for Block replacements."""

    class Meta:
        model = Block
        fields = ["type", "order", "is_visible", "config"]
        extra_kwargs = {"type": {"required": True}, "order": {"required": True}, "is_visible": {"required": True}, "config": {"required": True}}


class BlockPatchSerializer(_BaseBlockWriteSerializer):
    """PATCH serializer for partial block updates."""

    class Meta:
        model = Block
        fields = ["type", "order", "is_visible", "config"]
        extra_kwargs = {"type": {"required": False}, "order": {"required": False}, "is_visible": {"required": False}, "config": {"required": False}}


# Mapping of allowed element fields keyed by data source token.
_ALLOWED_ELEMENT_FIELDS_BY_SOURCE = {
    "PROJECT": {"title", "description", "github_url", "image"},
    "SKILL": {"name", "level"},
    "EXPERIENCE": {"company", "role", "timeline"},
    "PORTFOLIO": {"title", "description", "resume"},
}


class ElementResponseSerializer(serializers.ModelSerializer):
    """Read-only serializer for Element definitions used by blocks."""

    class Meta:
        model = Element
        fields = ["id", "block", "label", "data_source", "field", "order", "is_visible", "config"]
        read_only_fields = fields


class _BaseElementWriteSerializer(serializers.ModelSerializer):
    """Base serializer for creating/updating Element mappings with validators."""

    def validate_label(self, value: str) -> str:
        """Ensure the element label is present and non-empty."""
        label = "" if value is None else str(value)
        label = label.strip()
        if not label:
            raise serializers.ValidationError("Label cannot be empty.")
        return label

    def validate_data_source(self, value: str) -> str:
        """Normalize and validate the data source token."""
        ds = "" if value is None else str(value)
        ds = ds.strip().upper()
        if not ds:
            raise serializers.ValidationError("Data source cannot be empty.")

        allowed = {c for c, _ in Element.DataSource.choices}
        if ds not in allowed:
            raise serializers.ValidationError("Invalid data source.")
        return ds

    def validate_field(self, value: str) -> str:
        """Validate the target field token exists for supported data fields."""
        f = "" if value is None else str(value)
        f = f.strip()
        if not f:
            raise serializers.ValidationError("Field cannot be empty.")

        allowed = {c for c, _ in Element.DataField.choices}
        if f not in allowed:
            raise serializers.ValidationError("Invalid field.")
        return f

    def validate_order(self, value: int) -> int:
        """Validate element ordering value (positive integer or None)."""
        if value is None:
            return value

        try:
            order = int(value)
        except (TypeError, ValueError):
            raise serializers.ValidationError("Order must be an integer.")

        if order < 1:
            raise serializers.ValidationError("Order must be >= 1.")
        return order

    def validate_config(self, value: Any) -> Dict[str, Any]:
        """Validate that element config is a mapping when provided."""
        if value is None:
            raise serializers.ValidationError("Config must be an object.")
        if not isinstance(value, dict):
            raise serializers.ValidationError("Config must be an object.")
        return value

    def validate(self, attrs: Dict[str, Any]) -> Dict[str, Any]:
        """Cross-field validation to ensure the chosen field matches the data source.

        The method supports PATCH semantics by falling back to instance values
        when partial attributes are provided.
        """
        data = dict(attrs)

        ds = data.get("data_source")
        f = data.get("field")

        # Support PATCH where only one of the fields is present.
        if ds is None and getattr(self.instance, "data_source", None) is not None:
            ds = self.instance.data_source
        if f is None and getattr(self.instance, "field", None) is not None:
            f = self.instance.field

        if ds and f:
            allowed = _ALLOWED_ELEMENT_FIELDS_BY_SOURCE.get(str(ds).upper())
            if allowed is not None and str(f) not in allowed:
                raise serializers.ValidationError({"field": "Invalid field for the selected data source."})

        return attrs


class ElementCreateSerializer(_BaseElementWriteSerializer):
    """Serializer to create Element mappings inside a Block."""

    class Meta:
        model = Element
        fields = ["label", "data_source", "field", "order", "is_visible", "config"]
        extra_kwargs = {"order": {"required": False}, "is_visible": {"required": False}, "config": {"required": False}}


class ElementPutSerializer(_BaseElementWriteSerializer):
    """PUT serializer for Element replacement."""

    class Meta:
        model = Element
        fields = ["label", "data_source", "field", "order", "is_visible", "config"]
        extra_kwargs = {"label": {"required": True}, "data_source": {"required": True}, "field": {"required": True}, "order": {"required": True}, "is_visible": {"required": True}, "config": {"required": True}}


class ElementPatchSerializer(_BaseElementWriteSerializer):
    """PATCH serializer for partial element updates."""

    class Meta:
        model = Element
        fields = ["label", "data_source", "field", "order", "is_visible", "config"]
        extra_kwargs = {"label": {"required": False}, "data_source": {"required": False}, "field": {"required": False}, "order": {"required": False}, "is_visible": {"required": False}, "config": {"required": False}}
