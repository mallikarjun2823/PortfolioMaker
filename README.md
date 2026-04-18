# PortfolioMaker

## Run backend (Django)

- `poetry run python manage.py migrate`
- `poetry run python manage.py runserver`

Backend will be at `http://localhost:8000`.

## Run frontend (React)

Option A (from `frontend/`):

- `cd frontend`
- `npm install`
- `npm run dev`

Option B (from repo root, works anywhere):

- `npm run frontend:install`
- `npm run dev`

The frontend uses `/api` and Vite proxies it to `http://localhost:8000`.

Note: If port `5173` is already in use, Vite will pick the next free port (check the "Local:" URL printed in the terminal).

If you see Vite errors like "Outdated Optimize Dep" or HMR WebSocket issues, run `npm run frontend:clean` from repo root and restart dev with `npm run dev -- --force`.

## Production environment variables (Django)

Set these values in your deployment environment:

- `DJANGO_DEBUG=false`
- `DJANGO_SECRET_KEY=<long-random-secret>`
- `DJANGO_ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com`
- `DJANGO_CSRF_TRUSTED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com`
- `DJANGO_CORS_ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com`

Optional (defaults are secure when `DJANGO_DEBUG=false`):

- `DJANGO_SECURE_SSL_REDIRECT=true`
- `DJANGO_SESSION_COOKIE_SECURE=true`
- `DJANGO_CSRF_COOKIE_SECURE=true`
- `DJANGO_SECURE_HSTS_SECONDS=31536000`
- `DJANGO_SECURE_HSTS_INCLUDE_SUBDOMAINS=true`
- `DJANGO_SECURE_HSTS_PRELOAD=true`
- `DJANGO_USE_X_FORWARDED_PROTO=true`

## Deployment sanity checks

- `poetry run python manage.py check --deploy`
- `poetry run python manage.py makemigrations --check --dry-run`
- `poetry run python manage.py test`
- `npm --prefix frontend run build`
