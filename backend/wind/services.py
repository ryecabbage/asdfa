import datetime as dt
from math import sqrt

from .models import WindActual, WindForecast


#conversion to date time format
def utc(date, time=dt.time(0, 0)):
    return dt.datetime.combine(date, time, tzinfo=dt.timezone.utc)


#to get on from delivery date and pick latest one
def get_forecasts(delivery_date, decision_time):
    start = utc(delivery_date)
    end = start + dt.timedelta(days=1)
    rows = WindForecast.objects.filter(
        start_time__gte=start,
        start_time__lt=end,
        publish_time__lte=decision_time,
    ).order_by("start_time", "-publish_time")

    latest = {}
    for row in rows:
        latest.setdefault(row.start_time, row)
    return latest


#to get actual values
def get_actuals(delivery_date):
    start = utc(delivery_date)
    end = start + dt.timedelta(days=1)
    rows = WindActual.objects.filter(start_time__gte=start, start_time__lt=end)
    return {row.start_time: row.generation for row in rows}



#the error quantified
def compute_metrics(pairs):
    n = len(pairs)
    if n == 0:
        return {"n": 0, "mae": None, "rmse": None, "bias": None, "mae_pct": None, "bias_pct": None}
    errors = [forecast - actual for forecast, actual in pairs]
    mean_actual = sum(actual for _, actual in pairs) / n
    mae = sum(abs(e) for e in errors) / n
    bias = sum(errors) / n
    return {
        "n": n,
        "mae": mae,
        "rmse": sqrt(sum(e * e for e in errors) / n),
        "bias": bias,
        "mae_pct": mae / mean_actual * 100 if mean_actual else None,
        "bias_pct": bias / mean_actual * 100 if mean_actual else None,
    }

# final function
def day_view(decision_time):
    delivery_date = decision_time.date() + dt.timedelta(days=1)
    forecasts = get_forecasts(delivery_date, decision_time)
    actuals = get_actuals(delivery_date)

    slots = []
    pairs = []
    for i in range(48):
        time = utc(delivery_date) + dt.timedelta(minutes=30 * i)
        forecast = forecasts.get(time)
        forecast_mw = forecast.generation if forecast else None
        actual_mw = actuals.get(time)

        error = None
        error_pct = None
        if forecast_mw is not None and actual_mw is not None:
            error = forecast_mw - actual_mw
            error_pct = error / actual_mw * 100 if actual_mw else None
            pairs.append((forecast_mw, actual_mw))

        slots.append({
            "time": time,
            "actual": actual_mw,
            "forecast": forecast_mw,
            "forecast_published": forecast.publish_time if forecast else None,
            "error": error,
            "error_pct": error_pct,
        })

    return {
        "decision_time": decision_time,
        "date": delivery_date,
        "slots": slots,
        "metrics": compute_metrics(pairs),
    }

def month_summary(time_of_day):
    first = dt.date(2026, 1, 1)
    days = []
    all_pairs = []

    for i in range(31):
        decision_time = utc(first + dt.timedelta(days=i), time_of_day)
        view = day_view(decision_time)
        pairs = [(s["forecast"], s["actual"]) for s in view["slots"] if s["error"] is not None]
        all_pairs.extend(pairs)
        days.append({"date": view["date"], **compute_metrics(pairs)})

    return {"time_of_day": time_of_day, "days": days, "overall": compute_metrics(all_pairs)}