from __future__ import annotations

from rest_framework import serializers

from .models import Experience, Portfolio, Project, Skill


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

