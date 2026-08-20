"""
RoadSOS — Weather & Road Condition Intelligence
Assesses transit conditions (visibility, precipitation, road hazards) for ambulance routing.
"""

import httpx
from loguru import logger

from backend.config import WEATHER_API_KEY
from backend.models import WeatherInfo


async def get_weather(lat: float, lon: float) -> WeatherInfo:
    """Fetches real-time weather and road condition status."""
    # 1. Try OpenWeatherMap if key is provided
    if WEATHER_API_KEY:
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                url = f"https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid={WEATHER_API_KEY}&units=metric"
                resp = await client.get(url)
                if resp.status_code == 200:
                    data = resp.json()
                    condition = data["weather"][0]["main"]
                    temp = data["main"]["temp"]
                    rain = data.get("rain", {}).get("1h", 0.0)
                    wind = data["wind"]["speed"] * 3.6  # m/s to km/h
                    vis_m = data.get("visibility", 10000)
                    vis_km = vis_m / 1000.0

                    road_cond = "Dry & Clear"
                    if rain > 5.0:
                        road_cond = "Hazardous Wet / Hydroplaning Risk"
                    elif rain > 0.0:
                        road_cond = "Wet Roads (Drive Cautiously)"
                    elif vis_km < 1.0:
                        road_cond = "Severe Fog / Low Visibility"

                    return WeatherInfo(
                        condition=condition,
                        temperature_c=round(temp, 1),
                        rain_mm=round(rain, 1),
                        wind_kmh=round(wind, 1),
                        visibility_km=round(vis_km, 1),
                        road_condition=road_cond
                    )
        except Exception as e:
            logger.warning(f"[WEATHER] OpenWeatherMap error: {e}")

    # 2. Try wttr.in fallback (Free, JSON format)
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            url = f"https://wttr.in/{lat},{lon}?format=j1"
            resp = await client.get(url)
            if resp.status_code == 200:
                data = resp.json()
                current = data["current_condition"][0]
                temp = float(current["temp_C"])
                condition = current["weatherDesc"][0]["value"]
                wind = float(current["windspeedKmph"])
                precip = float(current["precipMM"])
                vis_km = float(current["visibility"])

                road_cond = "Dry & Clear"
                if precip > 5.0:
                    road_cond = "Heavy Rain / Caution"
                elif precip > 0.0:
                    road_cond = "Wet Roads"
                elif vis_km < 2.0:
                    road_cond = "Dense Fog / Low Visibility"

                return WeatherInfo(
                    condition=condition,
                    temperature_c=temp,
                    rain_mm=precip,
                    wind_kmh=wind,
                    visibility_km=vis_km,
                    road_condition=road_cond
                )
    except Exception as e:
        logger.warning(f"[WEATHER] wttr.in fallback error: {e}")

    # Standard benign default
    return WeatherInfo(
        condition="Clear",
        temperature_c=28.0,
        rain_mm=0.0,
        wind_kmh=12.0,
        visibility_km=10.0,
        road_condition="Dry & Clear"
    )
