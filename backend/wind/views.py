from django.shortcuts import render

# Create your views here.
import datetime as dt

from rest_framework.decorators import api_view
from rest_framework.response import Response

from .services import day_view, month_summary


@api_view(["GET"])
def day(request):
    value = request.query_params.get("decision")
    if not value:
        return Response({"error": "decision is required, e.g. 2026-01-14T07:30"}, status=400)

    try:
        decision_time = dt.datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return Response({"error": "decision must look like 2026-01-14T07:30"}, status=400)

    if decision_time.tzinfo is None:
        decision_time = decision_time.replace(tzinfo=dt.timezone.utc)
    decision_time = decision_time.astimezone(dt.timezone.utc)

    return Response(day_view(decision_time))



@api_view(["GET"])
def summary(request):
    value = request.query_params.get("time", "09:00")
    try:
        time_of_day = dt.time.fromisoformat(value)
    except ValueError:
        return Response({"error": "time must look like 07:30"}, status=400)
    return Response(month_summary(time_of_day))