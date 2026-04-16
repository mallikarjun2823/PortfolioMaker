from __future__ import annotations

from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .permissions import IsOwner
from .serializers import (
    AuthResponseSerializer,
    LoginSerializer,
    PortfolioCreateSerializer,
    PortfolioResponseSerializer,
    PortfolioPatchSerializer,
    PortfolioPutSerializer,
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
    permission_classes = [IsAuthenticated]
    service = PortfolioService()

    def get(self, request):
        portfolios = self.service.list(user=request.user)
        serializer = PortfolioResponseSerializer(portfolios, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        serializer = PortfolioCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        portfolio = self.service.create(user=request.user, validated_data=serializer.validated_data)
        serializer = PortfolioResponseSerializer(portfolio)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class PortfolioDetailAPIView(APIView):
    permission_classes = [IsAuthenticated, IsOwner]
    service = PortfolioService()

    def _get_object(self, request, pk: int):
        portfolio = self.service.retrieve(user=request.user, portfolio_id=pk)
        self.check_object_permissions(request, portfolio)
        return portfolio

    def get(self, request, pk: int):
        portfolio = self._get_object(request, pk)
        serializer = PortfolioResponseSerializer(portfolio)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def put(self, request, pk: int):
        portfolio = self._get_object(request, pk)
        serializer = PortfolioPutSerializer(portfolio, data=request.data)
        serializer.is_valid(raise_exception=True)
        portfolio = self.service.update(user=request.user, instance=portfolio, validated_data=serializer.validated_data)
        serializer = PortfolioResponseSerializer(portfolio)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def patch(self, request, pk: int):
        portfolio = self._get_object(request, pk)
        serializer = PortfolioPatchSerializer(portfolio, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        portfolio = self.service.update(user=request.user, instance=portfolio, validated_data=serializer.validated_data)
        serializer = PortfolioResponseSerializer(portfolio)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def delete(self, request, pk: int):
        portfolio = self._get_object(request, pk)
        self.service.delete(user=request.user, instance=portfolio)
        return Response(status=status.HTTP_204_NO_CONTENT)
