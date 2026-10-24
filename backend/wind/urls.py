from django.urls import path

from . import views

urlpatterns = [
    path("day/", views.day),
    path('summary/', views.summary)
]