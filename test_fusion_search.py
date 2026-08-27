import httpx
import math

def haversine(lat1, lon1, lat2, lon2):
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1))*math.cos(math.radians(lat2))*math.sin(dlon/2)**2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))

def query_real_local_hospitals(lat: float, lon: float):
    delta = 0.35 # ~35km bounding box
    url = f"https://nominatim.openstreetmap.org/search?amenity=hospital&format=jsonv2&addressdetails=1&limit=15&viewbox={lon-delta:.4f},{lat+delta:.4f},{lon+delta:.4f},{lat-delta:.4f}&bounded=1"
    headers = {"User-Agent": "RoadSOS-Real-Spatial-Engine/6.0"}
    
    r = httpx.get(url, headers=headers, timeout=6.0)
    if r.status_code == 200:
        items = r.json()
        print(f"\n[FUSION_SEARCH] Active Coords ({lat:.4f}, {lon:.4f}) -> Found {len(items)} REAL Physical Hospitals:")
        for item in items[:8]:
            h_lat = float(item["lat"])
            h_lon = float(item["lon"])
            dist = haversine(lat, lon, h_lat, h_lon)
            name = item.get("name") or item.get("display_name").split(",")[0]
            addr = item.get("address", {})
            road = addr.get("road") or addr.get("suburb") or addr.get("neighbourhood") or ""
            city = addr.get("city") or addr.get("town") or addr.get("county") or ""
            state = addr.get("state", "")
            print(f" -> {name} | Real Dist: {dist:.2f} km | Area: {road}, {city}, {state} | Coords: ({h_lat:.4f}, {h_lon:.4f})")

if __name__ == "__main__":
    # Test at BHU Campus, Varanasi
    query_real_local_hospitals(25.2677, 82.9913)
    # Test at Jubilee Hills, Hyderabad
    query_real_local_hospitals(17.4319, 78.4073)
