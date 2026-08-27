import httpx

def test_overpass(lat: float, lon: float):
    # Query all hospitals within 20km of exact coordinates
    q = f"""
    [out:json][timeout:6];
    (
      node["amenity"="hospital"](around:20000, {lat}, {lon});
      way["amenity"="hospital"](around:20000, {lat}, {lon});
    );
    out center 12;
    """
    url = "https://overpass-api.de/api/interpreter"
    try:
        r = httpx.post(url, data={"data": q}, timeout=7.0)
        print("Overpass status:", r.status_code)
        if r.status_code == 200:
            data = r.json()
            elements = data.get("elements", [])
            print(f"Found {len(elements)} live OSM hospitals via Overpass:")
            for el in elements[:6]:
                tags = el.get("tags", {})
                name = tags.get("name") or tags.get("name:en") or "Emergency Hospital"
                h_lat = el.get("lat") or el.get("center", {}).get("lat")
                h_lon = el.get("lon") or el.get("center", {}).get("lon")
                emergency = tags.get("emergency", "yes")
                phone = tags.get("phone") or tags.get("contact:phone") or "108"
                beds = tags.get("beds") or tags.get("capacity:beds") or "50"
                print(f" - {name} | Lat: {h_lat}, Lon: {h_lon} | Emergency: {emergency} | Phone: {phone} | Beds: {beds}")
    except Exception as e:
        print("Overpass error:", e)

if __name__ == "__main__":
    test_overpass(25.3176, 82.9739)
