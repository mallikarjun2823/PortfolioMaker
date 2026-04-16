from __future__ import annotations

from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .permissions import IsOwner
from .serializers import (
    AuthResponseSerializer,
    LoginSerializer,
    PortfolioSerializer,
    RegisterSerializer,
)
from .services import AuthService, PortfolioService


class RegisterAPIView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        tokens = AuthService().register(**serializer.validated_data)
        response = AuthResponseSerializer(tokens)
        return Response(response.data, status=status.HTTP_201_CREATED)


class LoginAPIView(APIView):
    permission_classes = [AllowAny]
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        tokens = AuthService().login(**serializer.validated_data)
        response = AuthResponseSerializer(tokens)
        return Response(response.data, status=status.HTTP_200_OK)


class PortfolioAPIView(APIView):
    service = PortfolioService()
    pass
