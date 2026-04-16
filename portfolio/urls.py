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
]
