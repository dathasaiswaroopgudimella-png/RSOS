"""
RoadSOS — High-Accuracy Geocoding & Reverse Geocoding Service
Multi-Provider Cascade:
  1. OpenStreetMap Nominatim (High Coverage, India-tuned)
  2. Geoapify API (if key present)
  3. OpenCage API (if key present)
  4. IPInfo / IPAPI Geolocation Fallback
"""

import httpx
from loguru import logger
from typing import Optional

from backend.config import OPENCAGE_API_KEY, GEOAPIFY_API_KEY, IPINFO_API_KEY, DEFAULT_LAT, DEFAULT_LON
from backend.models import GeocodeResponse


async def geocode(address: str) -> GeocodeResponse:
    """Geocodes an address, landmark, or pincode to lat/lon using multi-provider cascade."""
    if not address or not address.strip():
        return GeocodeResponse(status="error", source="empty_query")

    clean_query = address.strip()

    # 1. Try OpenStreetMap Nominatim (High accuracy for Indian localities & pincodes)
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

    # 2. Try OpenCage if key configured
    if OPENCAGE_API_KEY:
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                url = f"https://api.opencagedata.com/geocode/v1/json?q={clean_query}&key={OPENCAGE_API_KEY}&countrycode=in&limit=1"
                resp = await client.get(url)
                if resp.status_code == 200:
                    data = resp.json()
                    if data.get("results"):
                        res = data["results"][0]
                        return GeocodeResponse(
                            status="ok",
                            lat=res["geometry"]["lat"],
                            lon=res["geometry"]["lng"],
                            display_name=res.get("formatted", clean_query),
                            source="opencage"
                        )
        except Exception as e:
            logger.warning(f"[GEOCODE] OpenCage error: {e}")

    # 3. Try Geoapify if key configured
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

    # 4. Fallback to IP Geolocation
    return await geocode_ip_fallback()


async def reverse_geocode(lat: float, lon: float) -> str:
    """Reverse geocodes latitude/longitude to a clean human-readable address."""
    try:
        async with httpx.AsyncClient(timeout=3.5) as client:
            headers = {"User-Agent": "RoadSOS-Emergency-App/5.0 (roadsos@emergency.internal)"}
            url = f"https://nominatim.openstreetmap.org/reverse?lat={lat}&lon={lon}&format=json"
            resp = await client.get(url, headers=headers)
            if resp.status_code == 200:
                data = resp.json()
                address = data.get("address", {})
                road = address.get("road") or address.get("suburb") or address.get("neighbourhood") or ""
                city = address.get("city") or address.get("town") or address.get("county") or address.get("state_district") or ""
                state = address.get("state", "")
                pincode = address.get("postcode", "")
                
                parts = [p for p in [road, city, state, pincode] if p]
                if parts:
                    return ", ".join(parts)
                return data.get("display_name", f"{lat:.4f}, {lon:.4f}")
    except Exception as e:
        logger.warning(f"[GEOCODE] Reverse geocode error: {e}")

    return f"Coordinates: {lat:.4f}, {lon:.4f}"


async def geocode_ip_fallback() -> GeocodeResponse:
    """Estimates location via client IP address as a fast fallback."""
    # 1. Try ipapi.co (Free, highly accurate in India)
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            resp = await client.get("https://ipapi.co/json/")
            if resp.status_code == 200:
                data = resp.json()
                if "latitude" in data and "longitude" in data:
                    lat = float(data["latitude"])
                    lon = float(data["longitude"])
                    city = data.get("city", "")
                    region = data.get("region", "")
                    return GeocodeResponse(
                        status="ok",
                        lat=lat,
                        lon=lon,
                        display_name=f"{city}, {region} (IP Detected)",
                        source="ipapi"
                    )
    except Exception as e:
        logger.warning(f"[GEOCODE] ipapi.co error: {e}")

    # 2. Try IPInfo
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
                    city = data.get("city", "India")
                    region = data.get("region", "")
                    return GeocodeResponse(
                        status="ok",
                        lat=lat,
                        lon=lon,
                        display_name=f"{city}, {region} (IP Detected)",
                        source="ipinfo"
                    )
    except Exception as e:
        logger.warning(f"[GEOCODE] IPInfo error: {e}")

    # Default fallback
    return GeocodeResponse(
        status="ok",
        lat=DEFAULT_LAT,
        lon=DEFAULT_LON,
        display_name="Hyderabad, Telangana (Default Location)",
        source="default_baseline"
    )
