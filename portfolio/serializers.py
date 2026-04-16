from __future__ import annotations

from rest_framework import serializers

from .models import Portfolio


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

