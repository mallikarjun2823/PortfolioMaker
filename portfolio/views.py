from __future__ import annotations

from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .serializers import (
    AuthResponseSerializer,
    ExperienceCreateSerializer,
    ExperiencePatchSerializer,
    ExperiencePutSerializer,
    ExperienceResponseSerializer,
    LoginSerializer,
    PortfolioCreateSerializer,
    PortfolioPatchSerializer,
    PortfolioPutSerializer,
    PortfolioResponseSerializer,
    ProjectCreateSerializer,
    ProjectPatchSerializer,
    ProjectPutSerializer,
    ProjectResponseSerializer,
    RegisterSerializer,
    SectionCreateSerializer,
    SectionPatchSerializer,
    SectionPutSerializer,
    SectionResponseSerializer,
    SkillCreateSerializer,
    SkillPatchSerializer,
    SkillPutSerializer,
    SkillResponseSerializer,
)
from .services import AuthService, ExperienceService, PortfolioService, ProjectService, SectionService, SkillService


class RegisterAPIView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        tokens = AuthService().register(**serializer.validated_data)
        response = AuthResponseSerializer(tokens)
        return Response(response.data, status=status.HTTP_201_CREATED)


class LoginAPIView(APIView):
    authentication_classes = []
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
    permission_classes = [IsAuthenticated]
    service = PortfolioService()

    def _get_object(self, request, pk: int):
        portfolio = self.service.retrieve(user=request.user, portfolio_id=pk)
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


class ProjectListCreateAPIView(APIView):
    permission_classes = [IsAuthenticated]
    service = ProjectService()

    def get(self, request, portfolio_id: int):
        projects = self.service.list(portfolio_id=portfolio_id, user=request.user)
        serializer = ProjectResponseSerializer(projects, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request, portfolio_id: int):
        serializer = ProjectCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        project = self.service.create(
            portfolio_id=portfolio_id,
            user=request.user,
            validated_data=serializer.validated_data,
        )
        response = ProjectResponseSerializer(project)
        return Response(response.data, status=status.HTTP_201_CREATED)


class ProjectDetailAPIView(APIView):
    permission_classes = [IsAuthenticated]
    service = ProjectService()

    def _get_object(self, request, portfolio_id: int, project_id: int):
        project = self.service.retrieve(portfolio_id=portfolio_id, project_id=project_id, user=request.user)
        return project

    def get(self, request, portfolio_id: int, project_id: int):
        project = self._get_object(request, portfolio_id, project_id)
        serializer = ProjectResponseSerializer(project)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def put(self, request, portfolio_id: int, project_id: int):
        project = self._get_object(request, portfolio_id, project_id)
        serializer = ProjectPutSerializer(project, data=request.data)
        serializer.is_valid(raise_exception=True)
        project = self.service.update(
            instance=project,
            user=request.user,
            validated_data=serializer.validated_data,
        )
        response = ProjectResponseSerializer(project)
        return Response(response.data, status=status.HTTP_200_OK)

    def patch(self, request, portfolio_id: int, project_id: int):
        project = self._get_object(request, portfolio_id, project_id)
        serializer = ProjectPatchSerializer(project, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        project = self.service.update(
            instance=project,
            user=request.user,
            validated_data=serializer.validated_data,
        )
        response = ProjectResponseSerializer(project)
        return Response(response.data, status=status.HTTP_200_OK)

    def delete(self, request, portfolio_id: int, project_id: int):
        project = self._get_object(request, portfolio_id, project_id)
        self.service.delete(instance=project, user=request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)


class SkillListCreateAPIView(APIView):
    permission_classes = [IsAuthenticated]
    service = SkillService()

    def get(self, request, portfolio_id: int):
        skills = self.service.list(portfolio_id=portfolio_id, user=request.user)
        serializer = SkillResponseSerializer(skills, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request, portfolio_id: int):
        serializer = SkillCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        skill = self.service.create(
            portfolio_id=portfolio_id,
            user=request.user,
            validated_data=serializer.validated_data,
        )
        response = SkillResponseSerializer(skill)
        return Response(response.data, status=status.HTTP_201_CREATED)


class SkillDetailAPIView(APIView):
    permission_classes = [IsAuthenticated]
    service = SkillService()

    def _get_object(self, request, portfolio_id: int, skill_id: int):
        skill = self.service.retrieve(portfolio_id=portfolio_id, skill_id=skill_id, user=request.user)
        return skill

    def get(self, request, portfolio_id: int, skill_id: int):
        skill = self._get_object(request, portfolio_id, skill_id)
        serializer = SkillResponseSerializer(skill)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def put(self, request, portfolio_id: int, skill_id: int):
        skill = self._get_object(request, portfolio_id, skill_id)
        serializer = SkillPutSerializer(skill, data=request.data)
        serializer.is_valid(raise_exception=True)
        skill = self.service.update(
            instance=skill,
            user=request.user,
            validated_data=serializer.validated_data,
        )
        response = SkillResponseSerializer(skill)
        return Response(response.data, status=status.HTTP_200_OK)

    def patch(self, request, portfolio_id: int, skill_id: int):
        skill = self._get_object(request, portfolio_id, skill_id)
        serializer = SkillPatchSerializer(skill, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        skill = self.service.update(
            instance=skill,
            user=request.user,
            validated_data=serializer.validated_data,
        )
        response = SkillResponseSerializer(skill)
        return Response(response.data, status=status.HTTP_200_OK)

    def delete(self, request, portfolio_id: int, skill_id: int):
        skill = self._get_object(request, portfolio_id, skill_id)
        self.service.delete(instance=skill, user=request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)


class ExperienceListCreateAPIView(APIView):
    permission_classes = [IsAuthenticated]
    service = ExperienceService()

    def get(self, request, portfolio_id: int):
        experiences = self.service.list(portfolio_id=portfolio_id, user=request.user)
        serializer = ExperienceResponseSerializer(experiences, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request, portfolio_id: int):
        serializer = ExperienceCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        experience = self.service.create(
            portfolio_id=portfolio_id,
            user=request.user,
            validated_data=serializer.validated_data,
        )
        response = ExperienceResponseSerializer(experience)
        return Response(response.data, status=status.HTTP_201_CREATED)


class ExperienceDetailAPIView(APIView):
    permission_classes = [IsAuthenticated]
    service = ExperienceService()

    def _get_object(self, request, portfolio_id: int, experience_id: int):
        experience = self.service.retrieve(
            portfolio_id=portfolio_id,
            experience_id=experience_id,
            user=request.user,
        )
        return experience

    def get(self, request, portfolio_id: int, experience_id: int):
        experience = self._get_object(request, portfolio_id, experience_id)
        serializer = ExperienceResponseSerializer(experience)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def put(self, request, portfolio_id: int, experience_id: int):
        experience = self._get_object(request, portfolio_id, experience_id)
        serializer = ExperiencePutSerializer(experience, data=request.data)
        serializer.is_valid(raise_exception=True)
        experience = self.service.update(
            instance=experience,
            user=request.user,
            validated_data=serializer.validated_data,
        )
        response = ExperienceResponseSerializer(experience)
        return Response(response.data, status=status.HTTP_200_OK)

    def patch(self, request, portfolio_id: int, experience_id: int):
        experience = self._get_object(request, portfolio_id, experience_id)
        serializer = ExperiencePatchSerializer(experience, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        experience = self.service.update(
            instance=experience,
            user=request.user,
            validated_data=serializer.validated_data,
        )
        response = ExperienceResponseSerializer(experience)
        return Response(response.data, status=status.HTTP_200_OK)

    def delete(self, request, portfolio_id: int, experience_id: int):
        experience = self._get_object(request, portfolio_id, experience_id)
        self.service.delete(instance=experience, user=request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)


class SectionListCreateAPIView(APIView):
    permission_classes = [IsAuthenticated]
    service = SectionService()

    def get(self, request, portfolio_id: int):
        sections = self.service.list(portfolio_id=portfolio_id, user=request.user)
        serializer = SectionResponseSerializer(sections, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request, portfolio_id: int):
        serializer = SectionCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        section = self.service.create(
            portfolio_id=portfolio_id,
            user=request.user,
            validated_data=serializer.validated_data,
        )
        response = SectionResponseSerializer(section)
        return Response(response.data, status=status.HTTP_201_CREATED)


class SectionDetailAPIView(APIView):
    permission_classes = [IsAuthenticated]
    service = SectionService()

    def _get_object(self, request, portfolio_id: int, section_id: int):
        section = self.service.retrieve(portfolio_id=portfolio_id, section_id=section_id, user=request.user)
        return section

    def get(self, request, portfolio_id: int, section_id: int):
        section = self._get_object(request, portfolio_id, section_id)
        serializer = SectionResponseSerializer(section)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def put(self, request, portfolio_id: int, section_id: int):
        section = self._get_object(request, portfolio_id, section_id)
        serializer = SectionPutSerializer(section, data=request.data)
        serializer.is_valid(raise_exception=True)
        section = self.service.update(
            instance=section,
            user=request.user,
            validated_data=serializer.validated_data,
        )
        response = SectionResponseSerializer(section)
        return Response(response.data, status=status.HTTP_200_OK)

    def patch(self, request, portfolio_id: int, section_id: int):
        section = self._get_object(request, portfolio_id, section_id)
        serializer = SectionPatchSerializer(section, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        section = self.service.update(
            instance=section,
            user=request.user,
            validated_data=serializer.validated_data,
        )
        response = SectionResponseSerializer(section)
        return Response(response.data, status=status.HTTP_200_OK)

    def delete(self, request, portfolio_id: int, section_id: int):
        section = self._get_object(request, portfolio_id, section_id)
        self.service.delete(instance=section, user=request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)
