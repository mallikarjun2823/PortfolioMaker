"""App configuration for the portfolio Django application.

This module defines the Django AppConfig used to register the portfolio
application with the Django project.
"""

from django.apps import AppConfig


class PortfolioConfig(AppConfig):
    """AppConfig for the `portfolio` app.

    Attributes:
        name (str): The dotted application name used by Django.
    """

    name = "portfolio"
