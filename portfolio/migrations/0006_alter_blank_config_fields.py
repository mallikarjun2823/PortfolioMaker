"""Auto-generated module docstring for portfolio\migrations\0006_alter_blank_config_fields.py.

This docstring was added by scripts/add_docstrings.py.
"""

from django.db import migrations, models


    """Auto-generated docstring for class Migration.

    Returns:
        Description.
    """
class Migration(migrations.Migration):
    dependencies = [
        ("portfolio", "0005_portfolio_user_slug_unique_and_theme_optional"),
    ]

    operations = [
        migrations.AlterField(
            model_name="section",
            name="config",
            field=models.JSONField(blank=True, default=dict),
        ),
        migrations.AlterField(
            model_name="block",
            name="config",
            field=models.JSONField(blank=True, default=dict),
        ),
        migrations.AlterField(
            model_name="element",
            name="config",
            field=models.JSONField(blank=True, default=dict),
        ),
    ]
