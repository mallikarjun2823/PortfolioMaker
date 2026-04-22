from django.db import models

class Theme(models.TextChoices):
    LIGHT = 'light', 'Light'
    DARK = 'dark', 'Dark'


class Portfolio(models.Model):

"""
This class is a Django model representing a portfolio. It has fields for title, description, published status, created date, and theme. The theme field uses a TextChoices class to provide options for light and dark themes. The __str__ method returns the title of the portfolio when it is printed or displayed in the admin interface.
"""


    title = models.CharField(max_length = 50)
    description = models.TextField()
    published = models.BooleanField(default = False)
    created_date = models.DateField(auto_now = True)
    theme = models.CharField(max_length = 10, choices = Theme.choices, default = Theme.LIGHT)

    def __str__(self):
        return self.title

class ActivePortfolio(Portfolio):
    class Meta:
        proxy = True

    def queryset(self):
        return super().queryset().filter(published = True)

class Project(models.Model):
    portfolio = models.ForeignKey(Portfolio, on_delete = models.CASCADE, related_name = 'projects')
    title = models.CharField(max_length = 50)
    description = models.TextField()
    created_date = models.DateField(auto_now = True)

    def __str__(self):
        return self.title