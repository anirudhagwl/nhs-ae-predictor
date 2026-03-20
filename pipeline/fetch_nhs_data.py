"""
Fetch and parse NHS England A&E attendance data.

Scrapes the NHS England statistics pages for monthly CSV download links,
downloads each month's trust-level data, and combines into a single dataset.

Data source: https://www.england.nhs.uk/statistics/statistical-work-areas/ae-waiting-times-and-activity/
"""

import re
import time
import requests
import pandas as pd
import numpy as np
from io import StringIO
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
RAW_DIR = BASE_DIR / "data" / "raw"
PROCESSED_DIR = BASE_DIR / "data" / "processed"

HEADERS = {"User-Agent": "Mozilla/5.0 (NHS A&E Predictor Research Project)"}

# NHS England yearly landing pages (each lists monthly CSV downloads)
YEARLY_PAGES = [
    "https://www.england.nhs.uk/statistics/statistical-work-areas/ae-waiting-times-and-activity/ae-attendances-and-emergency-admissions-2020-21/",
    "https://www.england.nhs.uk/statistics/statistical-work-areas/ae-waiting-times-and-activity/ae-attendances-and-emergency-admissions-2021-22/",
    "https://www.england.nhs.uk/statistics/statistical-work-areas/ae-waiting-times-and-activity/ae-attendances-and-emergency-admissions-2022-23/",
    "https://www.england.nhs.uk/statistics/statistical-work-areas/ae-waiting-times-and-activity/ae-attendances-and-emergency-admissions-2023-24/",
    "https://www.england.nhs.uk/statistics/statistical-work-areas/ae-waiting-times-and-activity/ae-attendances-and-emergency-admissions-2024-25/",
    "https://www.england.nhs.uk/statistics/statistical-work-areas/ae-waiting-times-and-activity/ae-attendances-and-emergency-admissions-2025-26/",
]

# Month name to number mapping
MONTH_MAP = {
    "january": 1, "february": 2, "march": 3, "april": 4,
    "may": 5, "june": 6, "july": 7, "august": 8,
    "september": 9, "october": 10, "november": 11, "december": 12,
}


def scrape_csv_links(page_url):
    """
    Scrape a NHS England yearly page for CSV download links.
    Returns list of (url, month_name, year) tuples.
    """
    try:
        resp = requests.get(page_url, timeout=30, headers=HEADERS)
        resp.raise_for_status()
    except requests.RequestException as e:
        print(f"  Error fetching page {page_url}: {e}")
        return []

    html = resp.text
    # Find all CSV links — pattern: href="...some-Month-Year...csv"
    csv_links = re.findall(r'href="(https?://[^"]+\.csv[^"]*)"', html, re.IGNORECASE)

    results = []
    for url in csv_links:
        # Extract month and year from filename
        # Patterns: "February-2026-CSV-Dl8t54.csv", "Monthly-AE-March-2025.csv"
        filename = url.split("/")[-1].lower()

        for month_name, month_num in MONTH_MAP.items():
            if month_name in filename:
                # Extract year (4-digit number)
                year_match = re.search(r"20(\d{2})", filename)
                if year_match:
                    year = int("20" + year_match.group(1))
                    results.append((url, month_num, year))
                break

    # Deduplicate: keep last URL per (month, year) — latest revision
    seen = {}
    for url, month, year in results:
        seen[(year, month)] = url

    return [(url, month, year) for (year, month), url in sorted(seen.items())]


def download_and_parse_csv(url, year, month):
    """
    Download a single monthly CSV and parse trust-level A&E data.
    Returns list of record dicts, or empty list on failure.
    """
    try:
        resp = requests.get(url, timeout=60, headers=HEADERS)
        resp.raise_for_status()
    except requests.RequestException as e:
        print(f"    Error downloading {url}: {e}")
        return []

    try:
        df = pd.read_csv(StringIO(resp.text))
    except Exception as e:
        print(f"    Error parsing CSV: {e}")
        return []

    # Standardise column names (they vary slightly across years)
    col_map = {}
    for col in df.columns:
        cl = col.strip().lower()
        if cl in ("org code", "code", "provider code"):
            col_map[col] = "org_code"
        elif cl in ("org name", "name", "provider name"):
            col_map[col] = "org_name"
        elif cl in ("parent org", "parent"):
            col_map[col] = "parent_org"
        elif "attendances" in cl and "type 1" in cl and "booked" not in cl and "over" not in cl:
            col_map[col] = "type1_att"
        elif "attendances" in cl and "type 2" in cl and "booked" not in cl and "over" not in cl:
            col_map[col] = "type2_att"
        elif "attendances" in cl and "other" in cl and "booked" not in cl and "over" not in cl:
            col_map[col] = "other_att"
        elif "over 4" in cl and "type 1" in cl and "booked" not in cl:
            col_map[col] = "over4h_type1"
        elif "over 4" in cl and "type 2" in cl and "booked" not in cl:
            col_map[col] = "over4h_type2"
        elif "over 4" in cl and "other" in cl and "booked" not in cl:
            col_map[col] = "over4h_other"
        elif "emergency admissions" in cl and "type 1" in cl:
            col_map[col] = "emerg_adm_type1"
        elif "emergency admissions" in cl and "type 2" in cl:
            col_map[col] = "emerg_adm_type2"
        elif "emergency admissions" in cl and "other" in cl:
            col_map[col] = "emerg_adm_other"
        elif "other emergency" in cl:
            col_map[col] = "other_emerg_adm"

    df = df.rename(columns=col_map)

    # Filter to 3-character org codes (acute trusts)
    if "org_code" not in df.columns:
        print(f"    No 'org_code' column found. Columns: {list(df.columns)[:5]}")
        return []

    df = df[df["org_code"].astype(str).str.match(r"^[A-Z0-9]{3}$", na=False)].copy()

    if df.empty:
        return []

    records = []
    for _, row in df.iterrows():
        def safe_int(val):
            try:
                v = int(float(val))
                return v if v >= 0 else 0
            except (ValueError, TypeError):
                return 0

        type1 = safe_int(row.get("type1_att", 0))
        type2 = safe_int(row.get("type2_att", 0))
        other = safe_int(row.get("other_att", 0))
        total_att = type1 + type2 + other

        over4h_1 = safe_int(row.get("over4h_type1", 0))
        over4h_2 = safe_int(row.get("over4h_type2", 0))
        over4h_o = safe_int(row.get("over4h_other", 0))
        total_over4h = over4h_1 + over4h_2 + over4h_o

        emerg1 = safe_int(row.get("emerg_adm_type1", 0))
        emerg2 = safe_int(row.get("emerg_adm_type2", 0))
        emerg_o = safe_int(row.get("emerg_adm_other", 0))
        other_emerg = safe_int(row.get("other_emerg_adm", 0))
        total_emerg = emerg1 + emerg2 + emerg_o + other_emerg

        if total_att == 0:
            continue

        breach_rate = round(100 * total_over4h / total_att, 1) if total_att > 0 else 0

        # Extract region from parent org
        parent = str(row.get("parent_org", "")).strip()
        region = parent.replace("NHS ENGLAND", "").strip().title() if parent else ""

        records.append({
            "trust_code": str(row["org_code"]).strip(),
            "trust_name": str(row.get("org_name", "")).strip(),
            "region": region,
            "year": year,
            "month": month,
            "total_attendances": total_att,
            "attendances_over_4hrs": total_over4h,
            "breach_rate_pct": breach_rate,
            "total_emergency_admissions": total_emerg,
            "ambulance_arrivals": int(total_att * 0.25),  # Not in CSV; estimate
        })

    return records


def fetch_real_data():
    """
    Scrape all yearly pages for CSV links, download and parse each month.
    Returns a DataFrame or None if insufficient data.
    """
    all_csv_links = []

    for page_url in YEARLY_PAGES:
        print(f"  Scraping: {page_url.split('/')[-2]}")
        links = scrape_csv_links(page_url)
        print(f"    Found {len(links)} CSV files")
        all_csv_links.extend(links)
        time.sleep(0.5)  # Be polite

    if not all_csv_links:
        print("  No CSV links found on any page.")
        return None

    print(f"\n  Total CSV files to download: {len(all_csv_links)}")

    all_records = []
    for i, (url, month, year) in enumerate(all_csv_links):
        month_name = [k for k, v in MONTH_MAP.items() if v == month][0].title()
        print(f"  [{i+1}/{len(all_csv_links)}] {month_name} {year}...")
        records = download_and_parse_csv(url, year, month)
        all_records.extend(records)
        time.sleep(0.3)  # Rate limit

    if not all_records:
        print("  No records parsed from any CSV file.")
        return None

    df = pd.DataFrame(all_records)

    # Sort by trust, year, month
    df = df.sort_values(["trust_code", "year", "month"]).reset_index(drop=True)

    return df


def generate_synthetic_nhs_data():
    """
    Generate realistic synthetic NHS A&E data as fallback.
    """
    import json

    print("Generating synthetic NHS A&E data based on real patterns...")

    trust_locations_path = BASE_DIR / "data" / "lookups" / "trust_locations.json"
    if not trust_locations_path.exists():
        print("  Error: trust_locations.json not found.")
        return None

    with open(trust_locations_path) as f:
        trusts = json.load(f)

    np.random.seed(42)
    records = []

    for trust_code, trust_info in trusts.items():
        trust_name = trust_info["trust_name"]
        region = trust_info["region"]
        is_teaching = trust_info.get("is_teaching", False)

        base_attendance = np.random.randint(8000, 16000) if is_teaching else np.random.randint(3000, 10000)
        region_factor = {"London": 1.15, "North West": 1.05, "Midlands": 1.0,
                         "East of England": 0.95, "South West": 0.90}.get(region, 1.0)
        base_attendance = int(base_attendance * region_factor)

        for year in range(2020, 2027):
            for month in range(1, 13):
                if year == 2026 and month > 2:
                    continue

                seasonal = {1: 1.15, 2: 1.10, 3: 1.05, 4: 0.98, 5: 0.95, 6: 0.92,
                            7: 0.90, 8: 0.88, 9: 0.95, 10: 1.00, 11: 1.05, 12: 1.12}.get(month, 1.0)

                covid = 1.0
                if year == 2020 and month in [3, 4, 5]: covid = 0.55
                elif year == 2020 and month in [6, 7, 8]: covid = 0.75
                elif year == 2020 and month in [11, 12]: covid = 0.70
                elif year == 2021 and month in [1, 2, 3]: covid = 0.65
                elif year == 2021 and month in [4, 5, 6]: covid = 0.85
                elif year == 2021 and month >= 7: covid = 0.95

                growth = 1.0 + (year - 2020) * 0.02
                noise = np.random.normal(1.0, 0.05)
                attendances = max(int(base_attendance * seasonal * covid * growth * noise), 500)

                base_breach = 20 + (year - 2020) * 4
                seasonal_breach = {1: 8, 2: 6, 3: 4, 4: 2, 5: 0, 6: -2, 7: -3, 8: -4,
                                   9: 0, 10: 2, 11: 4, 12: 7}.get(month, 0)
                breach_rate = np.clip(base_breach + seasonal_breach + (5 if is_teaching else 0) +
                                      np.random.normal(0, 3), 5, 75)

                records.append({
                    "trust_code": trust_code, "trust_name": trust_name, "region": region,
                    "year": year, "month": month, "total_attendances": attendances,
                    "attendances_over_4hrs": int(attendances * breach_rate / 100),
                    "breach_rate_pct": round(breach_rate, 1),
                    "total_emergency_admissions": int(attendances * np.random.uniform(0.25, 0.35)),
                    "ambulance_arrivals": int(attendances * np.random.uniform(0.20, 0.30)),
                })

    df = pd.DataFrame(records)
    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    output_path = PROCESSED_DIR / "nhs_ae_monthly.csv"
    df.to_csv(output_path, index=False)
    print(f"  Generated {len(df)} records for {df['trust_code'].nunique()} trusts")
    print(f"  Saved to: {output_path}")
    return df


def fetch_and_process():
    """
    Main function: tries real NHS data first, falls back to synthetic.
    """
    print("=" * 60)
    print("STEP 1: Fetching NHS A&E attendance data")
    print("=" * 60)

    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    output_path = PROCESSED_DIR / "nhs_ae_monthly.csv"

    if output_path.exists():
        print(f"  Processed data already exists: {output_path}")
        df = pd.read_csv(output_path)
        print(f"  Loaded {len(df)} records for {df['trust_code'].nunique()} trusts")
        return df

    print("\nScraping NHS England statistics pages for CSV download links...")
    df = fetch_real_data()

    if df is not None and len(df) > 1000:
        print(f"\n  Real data loaded: {len(df)} records for {df['trust_code'].nunique()} trusts")
        print(f"  Date range: {df['year'].min()}-{df['month'].min():02d} to {df['year'].max()}-{df['month'].max():02d}")
        df.to_csv(output_path, index=False)
        print(f"  Saved to: {output_path}")
    else:
        print("\n  Could not load sufficient real NHS data.")
        print("  Falling back to synthetic data for development...")
        df = generate_synthetic_nhs_data()

    return df


if __name__ == "__main__":
    df = fetch_and_process()
    if df is not None:
        print("\nSample data:")
        print(df.head(10).to_string())
        print(f"\nTotal records: {len(df)}")
        print(f"Trusts: {df['trust_code'].nunique()}")
        print(f"Date range: {df['year'].min()}-{df['year'].max()}")
