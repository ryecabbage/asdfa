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
        return {"n": 0, "mae": None, "rmse": None, "bias": None}
    errors = [forecast - actual for forecast, actual in pairs]
    return {
        "n": n,
        "mae": sum(abs(e) for e in errors) / n,
        "rmse": sqrt(sum(e * e for e in errors) / n),
        "bias": sum(errors) / n,
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
        if forecast_mw is not None and actual_mw is not None:
            error = forecast_mw - actual_mw
            pairs.append((forecast_mw, actual_mw))

        slots.append({
            "time": time,
            "actual": actual_mw,
            "forecast": forecast_mw,
            "forecast_published": forecast.publish_time if forecast else None,
            "error": error,
        })

    return {
        "decision_time": decision_time,
        "date": delivery_date,
        "slots": slots,
        "metrics": compute_metrics(pairs),
    }