# Wind Forecast

A web app for checking wind power forecasts against actual generation, using Elexon data for January 2026.

## Files and directories

```
.
├── docker-compose.yml          Runs the backend and frontend together
├── .gitignore
├── backend/                    Django REST API (Python)
│   ├── manage.py
│   ├── requirements.txt        Python dependencies
│   ├── Dockerfile
│   ├── backend/                Django project config
│   │   ├── settings.py         Settings of django
│   │   ├── urls.py             Root URL routes
│   │   ├── wsgi.py
│   │   └── asgi.py
│   └── wind/                   Main app
│       ├── models.py           WindActual and WindForecast tables
│       ├── services.py        Forecast, error metrics, Actual
│       ├── views.py            API endpoints (/api/day/ and /api/summary/)
│       ├── urls.py
│       ├── tests.py            Unit tests
│       ├── migrations/
│       └── management/commands/
│           └── load.py         Command that loads data from Elexon into the database
└── frontend/                   React app (Vite)
    ├── package.json
    ├── index.html
    ├── Dockerfile              Builds the app and serves it with nginx
    └── src/
        ├── main.jsx
        ├── App.jsx             Page layout, nav bar etc.
        ├── api.js              Calls to the backend
        ├── format.js           chart style
        ├── index.css           Styles
        ├── components/
        │   └── Kpi.jsx         Animated metric card
        └── pages/
            ├── DayPage.jsx     Forecast vs actual for 1 day
            └── SummaryPage.jsx January accuracy summary
```

## How to start the application

Requires Git and Docker (with Docker Compose). Ports 8000 and 8080 must be free.

**1. Clone the repository**

```bash
git clone https://github.com/ryecabbage/asdfa.git
cd asdfa
```

**2. Build and start the containers**

```bash
docker compose up --build
```

The first build downloads images and installs dependencies, so it can take a few minutes. Wait until the backend log shows `Listening at: http://0.0.0.0:8000`.

**3. Load the data (run once)**

Open a second terminal in the same folder and run:

```bash
docker compose exec backend python manage.py load
```

This fetches January 2026 wind data from Elexon and needs internet access. It ends with `Done. 1536 actuals, 18104 forecasts in the database.`

**4. Open the app**

- Web app: http://localhost:8080
- API: http://localhost:8000/api/

**5. Stop the app**

Press `Ctrl+C` in the first terminal, then run:

```bash
docker compose down
```

The loaded data is kept in a Docker volume, so the next `docker compose up` does not need step 3 again.

On Linux, if you get a permission error from Docker, add `sudo` before each `docker` command.

**Run the tests (optional)**

```bash
docker compose exec backend python manage.py test wind
```

## Deployed app

- Web app: https://wind-forecast-khaki.vercel.app/
- API: </br>1. https://forecast-backend-alpha.vercel.app/api/day/?decision=2026-01-14T07:30 (change query parmas to requirements) </br>
2. https://forecast-backend-alpha.vercel.app/api/summary/

## AI tools

Claude was used to create the django command (load) and for styling the frontend and readme.