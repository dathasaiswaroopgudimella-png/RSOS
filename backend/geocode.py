"""
RoadSOS — Multi-Provider High-Accuracy Geocoding Service
Cascades:
  1. OpenCage API
  2. Geoapify API
  3. OpenStreetMap Nominatim (Free, high coverage)
  4. IP Geolocation Fallback (IPInfo / ipapi)
"""

import httpx
from loguru import logger

from backend.config import OPENCAGE_API_KEY, GEOAPIFY_API_KEY, IPINFO_API_KEY, DEFAULT_LAT, DEFAULT_LON
from backend.models import GeocodeResponse


async def geocode(address: str) -> GeocodeResponse:
    """Geocodes an address or pincode to lat/lon using multi-provider cascade."""
    if not address or not address.strip():
        return GeocodeResponse(status="error", source="empty_query")

    clean_query = address.strip()

    # 1. Try OpenCage if key configured
    if OPENCAGE_API_KEY:
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                url = f"https://api.opencagedata.com/geocode/v1/json?q={clean_query}&key={OPENCAGE_API_KEY}&countrycode=in&limit=1"
                resp = await client.get(url)
                if resp.status_code == 200:
                    data = resp.json()
                    if data.get("results"):
                        res = data["results"][0]
                        lat = res["geometry"]["lat"]
                        lon = res["geometry"]["lng"]
                        return GeocodeResponse(
                            status="ok",
                            lat=lat,
                            lon=lon,
                            display_name=res.get("formatted", clean_query),
                            source="opencage"
                        )
        except Exception as e:
            logger.warning(f"[GEOCODE] OpenCage error: {e}")

    # 2. Try Geoapify if key configured
    if GEOAPIFY_API_KEY:
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                url = f"https://api.geoapify.com/v1/geocode/search?text={clean_query}&apiKey={GEOAPIFY_API_KEY}&limit=1"
                resp = await client.get(url)
                if resp.status_code == 200:
                    data = resp.json()
                    if data.get("features"):
                        feature = data["features"][0]
                        lon, lat = feature["geometry"]["coordinates"]
                        return GeocodeResponse(
                            status="ok",
                            lat=lat,
                            lon=lon,
                            display_name=feature["properties"].get("formatted", clean_query),
                            source="geoapify"
                        )
        except Exception as e:
            logger.warning(f"[GEOCODE] Geoapify error: {e}")

    # 3. OpenStreetMap Nominatim (Always available, no key needed)
    try:
        async with httpx.AsyncClient(timeout=4.0) as client:
            headers = {"User-Agent": "RoadSOS-Emergency-App/5.0 (roadsos@emergency.internal)"}
            url = f"https://nominatim.openstreetmap.org/search?q={clean_query}&format=json&countrycodes=in&limit=1"
            resp = await client.get(url, headers=headers)
            if resp.status_code == 200:
                results = resp.json()
                if results and len(results) > 0:
                    item = results[0]
                    return GeocodeResponse(
                        status="ok",
                        lat=float(item["lat"]),
                        lon=float(item["lon"]),
                        display_name=item.get("display_name", clean_query),
                        source="nominatim"
                    )
    except Exception as e:
        logger.warning(f"[GEOCODE] Nominatim error: {e}")

    # 4. IP Geolocation fallback if address cannot be parsed
    return await geocode_ip_fallback()


async def geocode_ip_fallback() -> GeocodeResponse:
    """Estimates location via client IP address as a last-resort fallback."""
    # Try IPInfo
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            token_param = f"?token={IPINFO_API_KEY}" if IPINFO_API_KEY else ""
            url = f"https://ipinfo.io/json{token_param}"
            resp = await client.get(url)
            if resp.status_code == 200:
                data = resp.json()
                loc = data.get("loc")
                if loc and "," in loc:
                    lat, lon = map(float, loc.split(","))
                    city = data.get("city", "Unknown City")
                    region = data.get("region", "")
                    return GeocodeResponse(
                        status="ok",
                        lat=lat,
                        lon=lon,
                        display_name=f"{city}, {region} (IP Estimated)",
                        source="ipinfo"
                    )
    except Exception as e:
        logger.warning(f"[GEOCODE] IPInfo error: {e}")

    # Default fallback to central coordinate
    return GeocodeResponse(
        status="ok",
        lat=DEFAULT_LAT,
        lon=DEFAULT_LON,
        display_name="Hyderabad, Telangana (Default Fallback)",
        source="default_baseline"
    )
