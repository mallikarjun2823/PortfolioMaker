from django.urls import path

from . import views

urlpatterns = [
    path("auth/register/", views.RegisterAPIView.as_view(), name="auth-register"),
    path("auth/login/", views.LoginAPIView.as_view(), name="auth-login"),
    path("portfolios/", views.PortfolioAPIView.as_view(), name="portfolio-list"),
    path("portfolios/<int:pk>/", views.PortfolioDetailAPIView.as_view(), name="portfolio-detail"),
]
