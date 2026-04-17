from django.db import migrations, models


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
