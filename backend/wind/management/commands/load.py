import datetime as dt

import requests
from django.core.management.base import BaseCommand
from django.utils.dateparse import parse_datetime

from wind.models import WindActual, WindForecast

BASE = "https://data.elexon.co.uk/bmrs/api/v1"


def get_json(path, params):
    """GET from Elexon and return the parsed JSON list. Fails loudly on errors."""
    response = requests.get(f"{BASE}/{path}", params=params, timeout=60)
    response.raise_for_status()
    return response.json()


def daterange(start, end):
    """Yield every date from start to end, inclusive."""
    for i in range((end - start).days + 1):
        yield start + dt.timedelta(days=i)


class Command(BaseCommand):
    help = "Load wind actuals (FUELHH) and wind forecasts (WINDFOR) from Elexon."

    def add_arguments(self, parser):
        parser.add_argument("--start", default="2026-01-01", help="First decision day (YYYY-MM-DD)")
        parser.add_argument("--end", default="2026-01-31", help="Last decision day (YYYY-MM-DD)")

    def handle(self, *args, **opts):
        start = dt.date.fromisoformat(opts["start"])
        end = dt.date.fromisoformat(opts["end"])

        # Delivery days run one day after decision days, so actuals go one day further.
        self.load_actuals(start, end + dt.timedelta(days=1))
        self.load_forecasts(start, end)

        self.stdout.write(self.style.SUCCESS(
            f"Done. {WindActual.objects.count()} actuals, "
            f"{WindForecast.objects.count()} forecasts in the database."
        ))

    def load_actuals(self, start, end):
        self.stdout.write(f"Loading actuals {start} -> {end} ...")
        for day in daterange(start, end):
            rows = get_json("datasets/FUELHH/stream", {
                "settlementDateFrom": day.isoformat(),
                "settlementDateTo": day.isoformat(),
                "fuelType": "WIND",
            })
            objs = [
                WindActual(
                    start_time=parse_datetime(r["startTime"]),
                    generation=r["generation"],
                )
                for r in rows
            ]
            # ignore_conflicts: rows that already exist are skipped, so re-running is safe
            WindActual.objects.bulk_create(objs, ignore_conflicts=True)
            self.stdout.write(f"  {day}: {len(rows)} rows fetched")

    def load_forecasts(self, start, end):
        self.stdout.write(f"Loading forecasts published {start} -> {end} ...")
        for day in daterange(start, end):
            next_day = day + dt.timedelta(days=1)
            rows = get_json("datasets/WINDFOR/stream", {
                "publishDateTimeFrom": f"{day.isoformat()}T00:00Z",
                "publishDateTimeTo": f"{next_day.isoformat()}T00:00Z",
            })
            objs = [
                WindForecast(
                    start_time=parse_datetime(r["startTime"]),
                    publish_time=parse_datetime(r["publishTime"]),
                    generation=r["generation"],
                )
                for r in rows
            ]
            # Day windows overlap at midnight, so duplicates are possible;
            # the unique constraint + ignore_conflicts makes that harmless.
            WindForecast.objects.bulk_create(objs, ignore_conflicts=True, batch_size=500)
            self.stdout.write(f"  {day}: {len(rows)} rows fetched")