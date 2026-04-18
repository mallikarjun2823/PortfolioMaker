from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("portfolio", "0010_sync_theme_presets_catalog"),
    ]

    operations = [
        migrations.CreateModel(
            name="PortfolioTemplate",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=100)),
                ("description", models.TextField(blank=True)),
                ("config", models.JSONField()),
                ("is_active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
            ],
            options={
                "indexes": [models.Index(fields=["is_active", "created_at"], name="portfolio_p_is_acti_77effd_idx")],
            },
        ),
    ]
