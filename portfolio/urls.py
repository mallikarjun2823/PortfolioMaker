from django.urls import path

from . import views

urlpatterns = [
    path("auth/register/", views.RegisterAPIView.as_view(), name="auth-register"),
    path("auth/login/", views.LoginAPIView.as_view(), name="auth-login"),
    path("themes/", views.ThemeListAPIView.as_view(), name="theme-list"),
    path("portfolios/", views.PortfolioAPIView.as_view(), name="portfolio-list"),
    path("portfolios/<int:pk>/", views.PortfolioDetailAPIView.as_view(), name="portfolio-detail"),
    path(
        "portfolios/<int:portfolio_id>/render/",
        views.PortfolioRenderAPIView.as_view(),
        name="portfolio-render",
    ),
    path(
        "public/portfolios/<slug:slug>/render/",
        views.PublicPortfolioRenderBySlugAPIView.as_view(),
        name="portfolio-render-public-slug",
    ),
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
    path(
        "portfolios/<int:portfolio_id>/sections/<int:section_id>/blocks/",
        views.BlockListCreateAPIView.as_view(),
        name="block-list-create",
    ),
    path(
        "portfolios/<int:portfolio_id>/sections/<int:section_id>/blocks/<int:block_id>/",
        views.BlockDetailAPIView.as_view(),
        name="block-detail",
    ),
    path(
        "portfolios/<int:portfolio_id>/sections/<int:section_id>/blocks/<int:block_id>/elements/",
        views.ElementListCreateAPIView.as_view(),
        name="element-list-create",
    ),
    path(
        "portfolios/<int:portfolio_id>/sections/<int:section_id>/blocks/<int:block_id>/elements/<int:element_id>/",
        views.ElementDetailAPIView.as_view(),
        name="element-detail",
    ),
]
