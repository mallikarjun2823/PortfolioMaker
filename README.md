# PortfolioMaker Deployment Guide

This document provides production deployment notes for PortfolioMaker:

- Backend: Django on Render
- Frontend: React (Vite) on Vercel
- Database: Render PostgreSQL

Use this as a repeatable checklist whenever you redeploy.

## 1. Architecture

```text
Vercel (frontend)
  -> Render Web Service (Django API)
    -> Render PostgreSQL
```

## 2. Backend Deployment (Render)

### 2.1 Required backend dependencies

Current dependency set:

```txt
Django==6.0.1
djangorestframework==3.16.1
djangorestframework-simplejwt==5.5.1
django-cors-headers==4.9.0
dj-database-url==2.2.0
psycopg2-binary==2.9.11
gunicorn==21.2.0
whitenoise==6.7.0
Pillow==12.1.0
```

Important: keep `requirements.txt` saved as UTF-8 text. UTF-16 encoded files can cause install failures on some build systems.

### 2.2 Procfile

At repository root:

```text
web: gunicorn portfolio_maker.wsgi --log-file -
```

### 2.3 Django settings checklist

Confirm these production-safe settings exist:

```python
DEBUG = env_bool("DJANGO_DEBUG", False)
ALLOWED_HOSTS = env_list("DJANGO_ALLOWED_HOSTS", ["*"])

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    ...
]

STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"

DATABASES = {
    "default": dj_database_url.config(
        default=os.getenv("DATABASE_URL"),
        conn_max_age=600,
        ssl_require=not DEBUG,
    )
}
```

### 2.4 Render service setup

Create a Render Web Service:

- Environment: `Python`
- Build command:

```bash
pip install -r requirements.txt
```

- Start command:

```bash
python manage.py collectstatic --noinput && python manage.py migrate && gunicorn portfolio_maker.wsgi --log-file -
```

### 2.5 Render environment variables

Set these in Render:

```text
DJANGO_SECRET_KEY=<strong-random-secret>
DJANGO_DEBUG=false
DJANGO_ALLOWED_HOSTS=portfoliomaker-ui5e.onrender.com

DATABASE_URL=<render-postgres-internal-url>

DJANGO_CORS_ALLOWED_ORIGINS=https://portfolio-maker-orpin.vercel.app
DJANGO_CSRF_TRUSTED_ORIGINS=https://portfolio-maker-orpin.vercel.app

DJANGO_SECURE_SSL_REDIRECT=true
DJANGO_SESSION_COOKIE_SECURE=true
DJANGO_CSRF_COOKIE_SECURE=true
DJANGO_USE_X_FORWARDED_PROTO=true
```

If multiple origins are needed, use comma-separated values for:

- `DJANGO_ALLOWED_HOSTS`
- `DJANGO_CORS_ALLOWED_ORIGINS`
- `DJANGO_CSRF_TRUSTED_ORIGINS`

### 2.6 Create PostgreSQL on Render

1. Create a PostgreSQL instance in Render.
2. Copy the Internal Database URL.
3. Set it as `DATABASE_URL` in backend environment variables.

### 2.7 Backend verification

After deploy, verify:

- `/admin/` loads
- API endpoints under `/api/...` respond
- Public portfolio route `/p/<slug>` responds

## 3. Frontend Deployment (Vercel)

### 3.1 Frontend environment variable

Set in Vercel project environment variables:

```text
VITE_API_BASE_URL=https://portfoliomaker-ui5e.onrender.com/api
```

This project reads API base from:

```javascript
const API_BASE = import.meta.env.VITE_API_BASE_URL
```

### 3.2 SPA routing rewrite

Because this is a React SPA, add a Vercel rewrite rule.

If Vercel Root Directory is `frontend`, create `frontend/vercel.json`:

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/" }
  ]
}
```

If Root Directory is repository root, place the same `vercel.json` at root.

### 3.3 Vercel deployment steps

1. Import repository in Vercel.
2. Set Root Directory to `frontend`.
3. Add `VITE_API_BASE_URL` environment variable.
4. Deploy.

### 3.4 Frontend verification

Verify client routes and API connectivity:

- `/login`
- `/register`
- `/app/portfolios`
- `/p/<slug>`

## 4. CORS and Security

In production:

- Keep `DJANGO_DEBUG=false`
- Restrict `DJANGO_ALLOWED_HOSTS`
- Restrict `DJANGO_CORS_ALLOWED_ORIGINS`
- Restrict `DJANGO_CSRF_TRUSTED_ORIGINS`
- Keep secure cookie and SSL redirect flags enabled

Recommended command before release:

```bash
python manage.py check --deploy
```

## 5. Common Deployment Issues

| Issue | Typical Fix |
| --- | --- |
| Build fails installing dependencies | Ensure `requirements.txt` is UTF-8 and valid |
| Static files missing | Ensure `collectstatic` runs in startup command |
| Database connection error | Confirm `DATABASE_URL` from Render PostgreSQL |
| CORS blocked in browser | Set frontend origin in `DJANGO_CORS_ALLOWED_ORIGINS` |
| CSRF failures | Set frontend origin in `DJANGO_CSRF_TRUSTED_ORIGINS` |
| Frontend route returns 404 on refresh | Add `vercel.json` rewrite |
| API calls hit localhost in production | Set `VITE_API_BASE_URL` in Vercel |

## 6. Production Go-Live Checklist

- [ ] `DJANGO_DEBUG=false`
- [ ] `DJANGO_ALLOWED_HOSTS` contains only production hostnames
- [ ] `DJANGO_CORS_ALLOWED_ORIGINS` contains only trusted frontend domains
- [ ] `DJANGO_CSRF_TRUSTED_ORIGINS` contains only trusted frontend domains
- [ ] `DATABASE_URL` points to production PostgreSQL
- [ ] `collectstatic` runs on deploy
- [ ] migrations run on deploy
- [ ] `VITE_API_BASE_URL` points to production API (`/api` included)
- [ ] SPA rewrite configured for Vercel
