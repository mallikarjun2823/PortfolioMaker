from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("portfolio", "0011_portfoliotemplate"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="ResumeUpload",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("file", models.FileField(upload_to="resumes/")),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("PENDING", "Pending"),
                            ("PROCESSING", "Processing"),
                            ("COMPLETED", "Completed"),
                            ("FAILED", "Failed"),
                        ],
                        default="PENDING",
                        max_length=20,
                    ),
                ),
                ("parsed_data", models.JSONField(blank=True, null=True)),
                ("error", models.TextField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "portfolio",
                    models.ForeignKey(
                        on_delete=models.deletion.CASCADE,
                        related_name="resume_uploads",
                        to="portfolio.portfolio",
                    ),
                ),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=models.deletion.CASCADE,
                        related_name="resume_uploads",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "indexes": [
                    models.Index(fields=["user", "created_at"], name="portfolio_r_user_id_13e6b2_idx"),
                    models.Index(fields=["portfolio", "created_at"], name="portfolio_r_portfol_89fdb4_idx"),
                    models.Index(fields=["status"], name="portfolio_r_status_d341de_idx"),
                ],
            },
        ),
    ]
