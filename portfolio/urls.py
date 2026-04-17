from django.urls import path

from . import views

urlpatterns = [
    path("auth/register/", views.RegisterAPIView.as_view(), name="auth-register"),
    path("auth/login/", views.LoginAPIView.as_view(), name="auth-login"),
    path("portfolios/", views.PortfolioAPIView.as_view(), name="portfolio-list"),
    path("portfolios/<int:pk>/", views.PortfolioDetailAPIView.as_view(), name="portfolio-detail"),
    path(
        "portfolios/<int:portfolio_id>/projects/",
        views.ProjectListCreateAPIView.as_view(),
        name="project-list-create",
    ),
    path(
        "portfolios/<int:portfolio_id>/projects/<int:project_id>/",
        views.ProjectDetailAPIView.as_view(),
        name="project-detail",
    ),
    path(
        "portfolios/<int:portfolio_id>/skills/",
        views.SkillListCreateAPIView.as_view(),
        name="skill-list-create",
    ),
    path(
        "portfolios/<int:portfolio_id>/skills/<int:skill_id>/",
        views.SkillDetailAPIView.as_view(),
        name="skill-detail",
    ),
    path(
        "portfolios/<int:portfolio_id>/experiences/",
        views.ExperienceListCreateAPIView.as_view(),
        name="experience-list-create",
    ),
    path(
        "portfolios/<int:portfolio_id>/experiences/<int:experience_id>/",
        views.ExperienceDetailAPIView.as_view(),
        name="experience-detail",
    ),
    path(
        "portfolios/<int:portfolio_id>/sections/",
        views.SectionListCreateAPIView.as_view(),
        name="section-list-create",
    ),
    path(
        "portfolios/<int:portfolio_id>/sections/<int:section_id>/",
        views.SectionDetailAPIView.as_view(),
        name="section-detail",
    ),
]
