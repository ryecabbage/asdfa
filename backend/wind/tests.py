import datetime as dt

from django.test import SimpleTestCase, TestCase

from .models import WindActual, WindForecast
from .services import compute_metrics, day_view, get_forecasts, utc


class MetricsTests(SimpleTestCase):
    def test_known_values(self):
        metrics = compute_metrics([(110, 100), (80, 100)])
        self.assertEqual(metrics["mae"], 15)
        self.assertEqual(metrics["bias"], -5)
        self.assertAlmostEqual(metrics["rmse"], 250 ** 0.5)

    def test_empty(self):
        self.assertIsNone(compute_metrics([])["mae"])


class ForecastSelectionTests(TestCase):
    def test_uses_latest_forecast_up_to_decision_time(self):
        target = utc(dt.date(2026, 1, 15), dt.time(12, 0))
        for hour, minute, mw in [(6, 0, 100), (7, 30, 200), (9, 30, 300)]:
            WindForecast.objects.create(
                start_time=target,
                publish_time=utc(dt.date(2026, 1, 14), dt.time(hour, minute)),
                generation=mw,
            )
        decision = utc(dt.date(2026, 1, 14), dt.time(7, 30))

        result = get_forecasts(dt.date(2026, 1, 15), decision)

        self.assertEqual(result[target].generation, 200)


class DayViewTests(TestCase):
    def test_shows_next_day_and_computes_error(self):
        noon = utc(dt.date(2026, 1, 15), dt.time(12, 0))
        WindActual.objects.create(start_time=noon, generation=1000)
        WindForecast.objects.create(
            start_time=noon,
            publish_time=utc(dt.date(2026, 1, 14), dt.time(7, 30)),
            generation=1100,
        )

        view = day_view(utc(dt.date(2026, 1, 14), dt.time(7, 30)))

        self.assertEqual(view["date"], dt.date(2026, 1, 15))
        self.assertEqual(view["slots"][24]["error"], 100)
        self.assertEqual(view["metrics"]["n"], 1)