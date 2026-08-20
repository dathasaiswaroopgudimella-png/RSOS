"""
RoadSOS — Hospital Database Builder
Converts hospital_directory.csv (30,273 rows) into an optimized, indexed SQLite database.
"""

import csv
import os
import re
import sqlite3
import time
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
CSV_PATH = BASE_DIR / "backend" / "data" / "hospital_directory.csv"
DB_PATH = BASE_DIR / "backend" / "data" / "hospitals.db"


def clean_phone(row: dict) -> str:
    """Extract and sanitize the best emergency/ambulance phone number available."""
    fields = [
        "Emergency_Num",
        "Ambulance_Phone_No",
        "Telephone",
        "Mobile_Number",
        "Tollfree",
        "Helpline"
    ]
    for f in fields:
        val = str(row.get(f, "")).strip()
        if val and val.lower() not in ("nan", "0", "na", "null", "none") and len(val) >= 4:
            cleaned = re.sub(r"[^\d+,\s\-/]", "", val).strip()
            if len(cleaned) >= 4:
                return cleaned
    return "108"  # National Emergency Ambulance Service default in India


def clean_text(val: any) -> str:
    """Clean string values from CSV."""
    if val is None:
        return ""
    s = str(val).strip()
    if s.lower() in ("0", "na", "nan", "null", "none"):
        return ""
    return s


def clean_int(val: any, default: int = 0) -> int:
    """Safely convert value to integer."""
    if val is None:
        return default
    try:
        s = str(val).strip()
        if not s or s.lower() in ("0", "na", "nan", "null", "none"):
            return default
        digits = re.sub(r"[^\d]", "", s)
        return int(digits) if digits else default
    except (ValueError, TypeError):
        return default


def parse_coordinates(coord_str: str) -> tuple[float | None, float | None]:
    """Parse 'latitude, longitude' from CSV."""
    if not coord_str or coord_str.strip() in ("0", "NA", "nan", ""):
        return None, None
    try:
        parts = coord_str.strip().split(",")
        if len(parts) == 2:
            lat = float(parts[0].strip())
            lon = float(parts[1].strip())
            if -90 <= lat <= 90 and -180 <= lon <= 180 and not (lat == 0 and lon == 0):
                return lat, lon
    except (ValueError, IndexError):
        pass
    return None, None


def map_tier(row: dict) -> str:
    """Map hospital to tier based on facilities and category."""
    emergency = clean_text(row.get("Emergency_Services", "")).lower()
    cat = clean_text(row.get("Hospital_Category", "")).lower()
    care = clean_text(row.get("Hospital_Care_Type", "")).lower()
    specialties = clean_text(row.get("Specialties", "")).lower()
    
    if "trauma" in specialties or "tertiary" in cat or "medical college" in care or "yes" in emergency:
        return "tier_1"
    if "hospital" in care or "private" in cat or "public" in cat:
        return "tier_2"
    return "tier_3"


def build_database():
    """Build optimized SQLite database."""
    print(f"[BUILDER] Reading CSV: {CSV_PATH}")
    if not CSV_PATH.exists():
        raise FileNotFoundError(f"CSV file not found at {CSV_PATH}")

    os.makedirs(DB_PATH.parent, exist_ok=True)
    if DB_PATH.exists():
        DB_PATH.unlink()

    conn = sqlite3.connect(str(DB_PATH))
    cursor = conn.cursor()

    # Create main table
    cursor.execute("""
        CREATE TABLE hospitals (
            sr_no INTEGER PRIMARY KEY,
            lat REAL,
            lon REAL,
            hospital_name TEXT NOT NULL,
            hospital_category TEXT,
            hospital_care_type TEXT,
            discipline TEXT,
            address TEXT,
            state TEXT,
            district TEXT,
            subdistrict TEXT,
            pincode TEXT,
            telephone TEXT,
            mobile_number TEXT,
            emergency_num TEXT,
            ambulance_phone TEXT,
            bloodbank_phone TEXT,
            tollfree TEXT,
            helpline TEXT,
            email TEXT,
            website TEXT,
            specialties TEXT,
            facilities TEXT,
            accreditation TEXT,
            town TEXT,
            village TEXT,
            established_year TEXT,
            num_doctors INTEGER,
            num_consultants INTEGER,
            total_beds INTEGER,
            private_wards INTEGER,
            beds_eco_weaker INTEGER,
            emergency_services TEXT,
            tariff_range TEXT,
            tier TEXT,
            primary_phone TEXT
        )
    """)

    # Create FTS5 virtual table for lightning-fast search
    cursor.execute("""
        CREATE VIRTUAL TABLE hospitals_fts USING fts5(
            hospital_name,
            address,
            state,
            district,
            pincode,
            specialties,
            facilities,
            content='hospitals',
            content_rowid='sr_no'
        )
    """)

    start_time = time.time()
    inserted_count = 0
    skipped_count = 0

    with open(CSV_PATH, "r", encoding="utf-8", errors="ignore") as f:
        reader = csv.DictReader(f)
        batch = []
        fts_batch = []

        for row in reader:
            coords = row.get("Location_Coordinates", "")
            lat, lon = parse_coordinates(coords)
            if lat is None or lon is None:
                skipped_count += 1
                continue

            sr_no = clean_int(row.get("Sr_No"), inserted_count + 1)
            name = clean_text(row.get("Hospital_Name")) or "Unnamed Medical Center"
            category = clean_text(row.get("Hospital_Category"))
            care_type = clean_text(row.get("Hospital_Care_Type"))
            discipline = clean_text(row.get("Discipline_Systems_of_Medicine"))
            address = clean_text(row.get("Address_Original_First_Line")) or clean_text(row.get("Location"))
            state = clean_text(row.get("State"))
            district = clean_text(row.get("District"))
            subdistrict = clean_text(row.get("Subdistrict"))
            pincode = clean_text(row.get("Pincode"))
            telephone = clean_text(row.get("Telephone"))
            mobile = clean_text(row.get("Mobile_Number"))
            emergency_num = clean_text(row.get("Emergency_Num"))
            ambulance = clean_text(row.get("Ambulance_Phone_No"))
            bloodbank = clean_text(row.get("Bloodbank_Phone_No"))
            tollfree = clean_text(row.get("Tollfree"))
            helpline = clean_text(row.get("Helpline"))
            email = clean_text(row.get("Hospital_Primary_Email_Id"))
            website = clean_text(row.get("Website"))
            specialties = clean_text(row.get("Specialties"))
            facilities = clean_text(row.get("Facilities"))
            accreditation = clean_text(row.get("Accreditation"))
            town = clean_text(row.get("Town"))
            village = clean_text(row.get("Village"))
            est_year = clean_text(row.get("Establised_Year"))
            doctors = clean_int(row.get("Number_Doctor"))
            consultants = clean_int(row.get("Num_Mediconsultant_or_Expert"))
            beds = clean_int(row.get("Total_Num_Beds"))
            pvt_wards = clean_int(row.get("Number_Private_Wards"))
            eco_beds = clean_int(row.get("Num_Bed_for_Eco_Weaker_Sec"))
            emergency_services = clean_text(row.get("Emergency_Services"))
            tariff = clean_text(row.get("Tariff_Range"))
            tier = map_tier(row)
            primary_phone = clean_phone(row)

            record = (
                sr_no, lat, lon, name, category, care_type, discipline, address,
                state, district, subdistrict, pincode, telephone, mobile,
                emergency_num, ambulance, bloodbank, tollfree, helpline,
                email, website, specialties, facilities, accreditation,
                town, village, est_year, doctors, consultants, beds,
                pvt_wards, eco_beds, emergency_services, tariff, tier, primary_phone
            )
            batch.append(record)
            fts_batch.append((sr_no, name, address, state, district, pincode, specialties, facilities))
            inserted_count += 1

            if len(batch) >= 2000:
                cursor.executemany("""
                    INSERT OR REPLACE INTO hospitals VALUES (
                        ?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?
                    )
                """, batch)
                cursor.executemany("""
                    INSERT OR REPLACE INTO hospitals_fts (rowid, hospital_name, address, state, district, pincode, specialties, facilities)
                    VALUES (?,?,?,?,?,?,?,?)
                """, fts_batch)
                batch = []
                fts_batch = []

        if batch:
            cursor.executemany("""
                INSERT OR REPLACE INTO hospitals VALUES (
                    ?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?
                )
            """, batch)
            cursor.executemany("""
                INSERT OR REPLACE INTO hospitals_fts (rowid, hospital_name, address, state, district, pincode, specialties, facilities)
                VALUES (?,?,?,?,?,?,?,?)
            """, fts_batch)

    # Create high-performance spatial & text indexes
    print("[BUILDER] Creating database indices...")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_coords ON hospitals(lat, lon)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_pincode ON hospitals(pincode)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_district ON hospitals(district)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_state ON hospitals(state)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_tier ON hospitals(tier)")

    conn.commit()
    conn.close()

    elapsed = time.time() - start_time
    print(f"[BUILDER] Successfully built database: {DB_PATH}")
    print(f"[BUILDER] Processed {inserted_count} geo-located hospitals (skipped {skipped_count} invalid coords) in {elapsed:.2f}s")


if __name__ == "__main__":
    build_database()
