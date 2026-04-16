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


class PortfolioSerializer(serializers.ModelSerializer):
    pass
