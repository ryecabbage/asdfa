from django.db import models

# Create your models here.
class WindActual(models.Model):
    start_time = models.DateTimeField(unique=True)
    generation = models.FloatField()




class WindForecast(models.Model):
    start_time = models.DateTimeField()
    publish_time = models.DateTimeField()
    generation = models.FloatField()


    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['start_time', 'publish_time'], name = "unique_forcast"
            )
        ]

        indexes = [
            models.Index(fields=['start_time', 'publish_time'])
        ]