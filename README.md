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
