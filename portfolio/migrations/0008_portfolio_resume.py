from django.db import migrations, models
import portfolio.models


class Migration(migrations.Migration):

    dependencies = [
        ("portfolio", "0007_seed_theme_presets"),
    ]

    operations = [
        migrations.AddField(
            model_name="portfolio",
            name="resume",
            field=models.FileField(blank=True, null=True, upload_to=portfolio.models.user_directory_path_for_portfolio_resume),
        ),
    ]
