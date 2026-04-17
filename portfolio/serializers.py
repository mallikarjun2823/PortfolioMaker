from __future__ import annotations

from rest_framework import serializers

from .models import Block, Element, Experience, Portfolio, Project, Section, Skill


class RegisterSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    email = serializers.EmailField(required=False, allow_blank=True)
    password = serializers.CharField(write_only=True, min_length=8)


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    password = serializers.CharField(write_only=True)


class AuthResponseSerializer(serializers.Serializer):
    access = serializers.CharField(read_only=True)
    refresh = serializers.CharField(read_only=True)


class PortfolioResponseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Portfolio
        fields = [
            "id",
            "title",
            "slug",
            "description",
            "theme",
            "is_published",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields

class PortfolioCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Portfolio
        fields = [
            "title",
            "slug",
            "description",
            "theme",
            "is_published",
        ]
        extra_kwargs = {
            "slug": {"required": False, "allow_blank": True},
            "description": {"required": False, "allow_blank": True},
            "theme": {"required": False, "allow_null": True},
            "is_published": {"required": False},
        }


class PortfolioPutSerializer(serializers.ModelSerializer):
    class Meta:
        model = Portfolio
        fields = [
            "title",
            "slug",
            "description",
            "theme",
            "is_published",
        ]
        extra_kwargs = {
            # Strict PUT: require all updatable fields (slug can be blank to trigger auto-generation in service)
            "slug": {"required": True, "allow_blank": True},
            "description": {"required": True, "allow_blank": True},
            "theme": {"required": True, "allow_null": True},
            "is_published": {"required": True},
        }


class PortfolioPatchSerializer(serializers.ModelSerializer):
    class Meta:
        model = Portfolio
        fields = [
            "title",
            "slug",
            "description",
            "theme",
            "is_published",
        ]
        extra_kwargs = {
            "title": {"required": False},
            "slug": {"required": False, "allow_blank": True},
            "description": {"required": False, "allow_blank": True},
            "theme": {"required": False, "allow_null": True},
            "is_published": {"required": False},
        }


class ProjectResponseSerializer(serializers.ModelSerializer):
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
    class Meta:
        model = Skill
        fields = [
            "name",
            "level",
            "order",
            "is_visible",
        ]
        extra_kwargs = {
            "order": {"required": False},
            "is_visible": {"required": False},
        }


class SkillPutSerializer(serializers.ModelSerializer):
    class Meta:
        model = Skill
        fields = [
            "name",
            "level",
            "order",
            "is_visible",
        ]
        extra_kwargs = {
            "name": {"required": True},
            "level": {"required": True},
            "order": {"required": True},
            "is_visible": {"required": True},
        }


class SkillPatchSerializer(serializers.ModelSerializer):
    class Meta:
        model = Skill
        fields = [
            "name",
            "level",
            "order",
            "is_visible",
        ]
        extra_kwargs = {
            "name": {"required": False},
            "level": {"required": False},
            "order": {"required": False},
            "is_visible": {"required": False},
        }


class ExperienceResponseSerializer(serializers.ModelSerializer):
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
    class Meta:
        model = Experience
        fields = [
            "company",
            "role",
            "timeline",
            "order",
            "is_visible",
        ]
        extra_kwargs = {
            "order": {"required": False},
            "is_visible": {"required": False},
        }


class ExperiencePutSerializer(serializers.ModelSerializer):
    class Meta:
        model = Experience
        fields = [
            "company",
            "role",
            "timeline",
            "order",
            "is_visible",
        ]
        extra_kwargs = {
            "company": {"required": True},
            "role": {"required": True},
            "timeline": {"required": True},
            "order": {"required": True},
            "is_visible": {"required": True},
        }


class ExperiencePatchSerializer(serializers.ModelSerializer):
    class Meta:
        model = Experience
        fields = [
            "company",
            "role",
            "timeline",
            "order",
            "is_visible",
        ]
        extra_kwargs = {
            "company": {"required": False},
            "role": {"required": False},
            "timeline": {"required": False},
            "order": {"required": False},
            "is_visible": {"required": False},
        }


class SectionResponseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Section
        fields = [
            "id",
            "portfolio",
            "name",
            "order",
            "is_visible",
            "config",
        ]
        read_only_fields = fields


class _BaseSectionWriteSerializer(serializers.ModelSerializer):
    def validate_name(self, value: str) -> str:
        name = "" if value is None else str(value)
        name = name.strip()
        if not name:
            raise serializers.ValidationError("Name cannot be empty.")
        return name

    def validate_order(self, value: int) -> int:
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

    def validate_config(self, value):
        if value is None:
            raise serializers.ValidationError("Config must be an object.")
        if not isinstance(value, dict):
            raise serializers.ValidationError("Config must be an object.")
        return value


class SectionCreateSerializer(_BaseSectionWriteSerializer):
    class Meta:
        model = Section
        fields = [
            "name",
            "order",
            "is_visible",
            "config",
        ]
        extra_kwargs = {
            "order": {"required": False},
            "is_visible": {"required": False},
            "config": {"required": False},
        }


class SectionPutSerializer(_BaseSectionWriteSerializer):
    class Meta:
        model = Section
        fields = [
            "name",
            "order",
            "is_visible",
            "config",
        ]
        extra_kwargs = {
            "name": {"required": True},
            "order": {"required": True},
            "is_visible": {"required": True},
            "config": {"required": True},
        }


class SectionPatchSerializer(_BaseSectionWriteSerializer):
    class Meta:
        model = Section
        fields = [
            "name",
            "order",
            "is_visible",
            "config",
        ]
        extra_kwargs = {
            "name": {"required": False},
            "order": {"required": False},
            "is_visible": {"required": False},
            "config": {"required": False},
        }


class BlockResponseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Block
        fields = [
            "id",
            "section",
            "type",
            "order",
            "is_visible",
            "config",
        ]
        read_only_fields = fields


class _BaseBlockWriteSerializer(serializers.ModelSerializer):
    def validate_type(self, value: str) -> str:
        t = "" if value is None else str(value)
        t = t.strip().upper()
        if not t:
            raise serializers.ValidationError("Type cannot be empty.")

        allowed = {c for c, _ in Block.BlockType.choices}
        if t not in allowed:
            raise serializers.ValidationError("Invalid block type.")
        return t

    def validate_order(self, value: int) -> int:
        if value is None:
            return value

        try:
            order = int(value)
        except (TypeError, ValueError):
            raise serializers.ValidationError("Order must be an integer.")

        if order < 1:
            raise serializers.ValidationError("Order must be >= 1.")
        return order

    def validate_config(self, value):
        if value is None:
            raise serializers.ValidationError("Config must be an object.")
        if not isinstance(value, dict):
            raise serializers.ValidationError("Config must be an object.")
        return value


class BlockCreateSerializer(_BaseBlockWriteSerializer):
    class Meta:
        model = Block
        fields = [
            "type",
            "order",
            "is_visible",
            "config",
        ]
        extra_kwargs = {
            "order": {"required": False},
            "is_visible": {"required": False},
            "config": {"required": False},
        }


class BlockPutSerializer(_BaseBlockWriteSerializer):
    class Meta:
        model = Block
        fields = [
            "type",
            "order",
            "is_visible",
            "config",
        ]
        extra_kwargs = {
            "type": {"required": True},
            "order": {"required": True},
            "is_visible": {"required": True},
            "config": {"required": True},
        }


class BlockPatchSerializer(_BaseBlockWriteSerializer):
    class Meta:
        model = Block
        fields = [
            "type",
            "order",
            "is_visible",
            "config",
        ]
        extra_kwargs = {
            "type": {"required": False},
            "order": {"required": False},
            "is_visible": {"required": False},
            "config": {"required": False},
        }


_ALLOWED_ELEMENT_FIELDS_BY_SOURCE = {
    "PROJECT": {"title", "description", "github_url", "image"},
    "SKILL": {"name", "level"},
    "EXPERIENCE": {"company", "role", "timeline"},
    "PORTFOLIO": {"title", "description"},
}


class ElementResponseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Element
        fields = [
            "id",
            "block",
            "label",
            "data_source",
            "field",
            "order",
            "is_visible",
            "config",
        ]
        read_only_fields = fields


class _BaseElementWriteSerializer(serializers.ModelSerializer):
    def validate_label(self, value: str) -> str:
        label = "" if value is None else str(value)
        label = label.strip()
        if not label:
            raise serializers.ValidationError("Label cannot be empty.")
        return label

    def validate_data_source(self, value: str) -> str:
        ds = "" if value is None else str(value)
        ds = ds.strip().upper()
        if not ds:
            raise serializers.ValidationError("Data source cannot be empty.")

        allowed = {c for c, _ in Element.DataSource.choices}
        if ds not in allowed:
            raise serializers.ValidationError("Invalid data source.")
        return ds

    def validate_field(self, value: str) -> str:
        f = "" if value is None else str(value)
        f = f.strip()
        if not f:
            raise serializers.ValidationError("Field cannot be empty.")

        allowed = {c for c, _ in Element.DataField.choices}
        if f not in allowed:
            raise serializers.ValidationError("Invalid field.")
        return f

    def validate_order(self, value: int) -> int:
        if value is None:
            return value

        try:
            order = int(value)
        except (TypeError, ValueError):
            raise serializers.ValidationError("Order must be an integer.")

        if order < 1:
            raise serializers.ValidationError("Order must be >= 1.")
        return order

    def validate_config(self, value):
        if value is None:
            raise serializers.ValidationError("Config must be an object.")
        if not isinstance(value, dict):
            raise serializers.ValidationError("Config must be an object.")
        return value

    def validate(self, attrs):
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
                raise serializers.ValidationError(
                    {"field": "Invalid field for the selected data source."}
                )

        return attrs


class ElementCreateSerializer(_BaseElementWriteSerializer):
    class Meta:
        model = Element
        fields = [
            "label",
            "data_source",
            "field",
            "order",
            "is_visible",
            "config",
        ]
        extra_kwargs = {
            "order": {"required": False},
            "is_visible": {"required": False},
            "config": {"required": False},
        }


class ElementPutSerializer(_BaseElementWriteSerializer):
    class Meta:
        model = Element
        fields = [
            "label",
            "data_source",
            "field",
            "order",
            "is_visible",
            "config",
        ]
        extra_kwargs = {
            "label": {"required": True},
            "data_source": {"required": True},
            "field": {"required": True},
            "order": {"required": True},
            "is_visible": {"required": True},
            "config": {"required": True},
        }


class ElementPatchSerializer(_BaseElementWriteSerializer):
    class Meta:
        model = Element
        fields = [
            "label",
            "data_source",
            "field",
            "order",
            "is_visible",
            "config",
        ]
        extra_kwargs = {
            "label": {"required": False},
            "data_source": {"required": False},
            "field": {"required": False},
            "order": {"required": False},
            "is_visible": {"required": False},
            "config": {"required": False},
        }

