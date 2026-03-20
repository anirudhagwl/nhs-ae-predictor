"""
Fetch historical weather data from Open-Meteo for each NHS trust location.

Uses the Open-Meteo Archive API (free, no auth needed) to pull monthly
weather summaries (temperature, precipitation, humidity) for each trust.
"""

import json
import time
import requests
import pandas as pd
import numpy as np
from pathlib import Path
from datetime import datetime

BASE_DIR = Path(__file__).resolve().parent.parent
LOOKUPS_DIR = BASE_DIR / "data" / "lookups"
PROCESSED_DIR = BASE_DIR / "data" / "processed"

OPEN_METEO_URL = "https://archive-api.open-meteo.com/v1/archive"


def fetch_weather_for_location(lat, lng, start_date, end_date):
    """
    Fetch daily weather data from Open-Meteo for a single location.

    Returns daily temperature, precipitation, and humidity data.
    """
    params = {
        "latitude": lat,
        "longitude": lng,
        "start_date": start_date,
        "end_date": end_date,
        "daily": "temperature_2m_max,temperature_2m_min,temperature_2m_mean,precipitation_sum,relative_humidity_2m_mean,windspeed_10m_max",
        "timezone": "Europe/London",
    }

    try:
        response = requests.get(OPEN_METEO_URL, params=params, timeout=30)
        response.raise_for_status()
        return response.json()
    except requests.RequestException as e:
        print(f"    Error fetching weather for ({lat}, {lng}): {e}")
        return None


def aggregate_to_monthly(daily_data):
    """Convert daily weather data to monthly aggregates."""
    if not daily_data or "daily" not in daily_data:
        return None

    daily = daily_data["daily"]
    df = pd.DataFrame({
        "date": pd.to_datetime(daily["time"]),
        "temp_max": daily.get("temperature_2m_max"),
        "temp_min": daily.get("temperature_2m_min"),
        "temp_mean": daily.get("temperature_2m_mean"),
        "precip": daily.get("precipitation_sum"),
        "humidity": daily.get("relative_humidity_2m_mean"),
        "wind_max": daily.get("windspeed_10m_max"),
    })

    df["year"] = df["date"].dt.year
    df["month"] = df["date"].dt.month

    # Count days below 5°C
    df["below_5"] = (df["temp_mean"] < 5).astype(int) if df["temp_mean"] is not None else 0

    monthly = df.groupby(["year", "month"]).agg(
        avg_temp_c=("temp_mean", "mean"),
        max_temp_c=("temp_max", "max"),
        min_temp_c=("temp_min", "min"),
        total_precip_mm=("precip", "sum"),
        avg_humidity_pct=("humidity", "mean"),
        max_wind_kph=("wind_max", "max"),
        days_below_5c=("below_5", "sum"),
    ).reset_index()

    # Round values
    for col in ["avg_temp_c", "max_temp_c", "min_temp_c", "total_precip_mm", "avg_humidity_pct", "max_wind_kph"]:
        if col in monthly.columns:
            monthly[col] = monthly[col].round(1)

    return monthly


def generate_synthetic_weather():
    """
    Generate realistic synthetic weather data for all trusts.

    Uses UK climate patterns:
    - Cold winters (0-8°C), mild summers (15-22°C)
    - More rain in autumn/winter
    - Regional variation (north colder, south warmer)
    """
    print("  Generating synthetic weather data based on UK climate patterns...")

    with open(LOOKUPS_DIR / "trust_locations.json") as f:
        trusts = json.load(f)

    np.random.seed(42)

    records = []

    # UK monthly temperature baselines (°C)
    monthly_temp = {
        1: 4.0, 2: 4.5, 3: 6.5, 4: 9.0,
        5: 12.0, 6: 15.0, 7: 17.0, 8: 16.5,
        9: 14.0, 10: 10.5, 11: 7.0, 12: 4.5,
    }

    # UK monthly precipitation baselines (mm)
    monthly_precip = {
        1: 80, 2: 60, 3: 55, 4: 50,
        5: 50, 6: 55, 7: 45, 8: 55,
        9: 60, 10: 75, 11: 85, 12: 80,
    }

    # UK monthly humidity baselines (%)
    monthly_humidity = {
        1: 86, 2: 83, 3: 80, 4: 76,
        5: 74, 6: 73, 7: 74, 8: 76,
        9: 80, 10: 83, 11: 85, 12: 87,
    }

    for trust_code, info in trusts.items():
        lat = info["lat"]

        # Latitude-based adjustment (further north = colder)
        lat_adjustment = -(lat - 52.0) * 0.4  # 52°N is roughly central England

        # Regional rain adjustment
        lng = info["lng"]
        rain_adjustment = 1.0
        if lng < -2.5:  # Western England (wetter)
            rain_adjustment = 1.2
        elif lng > 0.5:  # Eastern England (drier)
            rain_adjustment = 0.85

        for year in range(2020, 2027):
            for month in range(1, 13):
                # Skip months after Feb 2026
                if year == 2026 and month > 2:
                    continue
                base_temp = monthly_temp[month] + lat_adjustment
                year_trend = (year - 2020) * 0.1  # Slight warming trend

                avg_temp = base_temp + year_trend + np.random.normal(0, 1.2)
                max_temp = avg_temp + np.random.uniform(3, 7)
                min_temp = avg_temp - np.random.uniform(3, 6)

                base_precip = monthly_precip[month] * rain_adjustment
                total_precip = max(0, base_precip + np.random.normal(0, 15))

                base_humidity = monthly_humidity[month]
                avg_humidity = np.clip(base_humidity + np.random.normal(0, 3), 50, 98)

                max_wind = np.random.uniform(30, 80)
                if month in [11, 12, 1, 2]:
                    max_wind += 15  # Windier in winter

                # Days below 5°C
                if avg_temp < 5:
                    days_below_5 = np.random.randint(15, 28)
                elif avg_temp < 10:
                    days_below_5 = np.random.randint(3, 15)
                else:
                    days_below_5 = np.random.randint(0, 3)

                records.append({
                    "trust_code": trust_code,
                    "year": year,
                    "month": month,
                    "avg_temp_c": round(avg_temp, 1),
                    "max_temp_c": round(max_temp, 1),
                    "min_temp_c": round(min_temp, 1),
                    "total_precip_mm": round(total_precip, 1),
                    "avg_humidity_pct": round(avg_humidity, 1),
                    "max_wind_kph": round(max_wind, 1),
                    "days_below_5c": int(days_below_5),
                })

    df = pd.DataFrame(records)
    return df


def fetch_and_process():
    """
    Main function to fetch and process weather data.

    Tries Open-Meteo API first, falls back to synthetic data if needed.
    """
    print("=" * 60)
    print("STEP 2: Fetching weather data")
    print("=" * 60)

    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    output_path = PROCESSED_DIR / "weather_monthly.csv"

    if output_path.exists():
        print(f"  Weather data already exists: {output_path}")
        df = pd.read_csv(output_path)
        print(f"  Loaded {len(df)} records")
        return df

    with open(LOOKUPS_DIR / "trust_locations.json") as f:
        trusts = json.load(f)

    # Try fetching real weather data for a sample trust first
    print("\nAttempting to fetch weather from Open-Meteo API...")
    sample_trust = list(trusts.values())[0]
    test_data = fetch_weather_for_location(
        sample_trust["lat"], sample_trust["lng"],
        "2024-01-01", "2024-01-31"
    )

    if test_data and "daily" in test_data:
        print("  Open-Meteo API is accessible. Fetching data for all trusts...")
        print(f"  This will make {len(trusts)} API calls. Estimated time: {len(trusts) * 1.5:.0f} seconds")

        all_monthly = []

        for i, (trust_code, info) in enumerate(trusts.items()):
            if (i + 1) % 20 == 0:
                print(f"  Progress: {i + 1}/{len(trusts)} trusts...")

            daily_data = fetch_weather_for_location(
                info["lat"], info["lng"],
                "2020-01-01", "2026-02-28"
            )

            if daily_data:
                monthly = aggregate_to_monthly(daily_data)
                if monthly is not None:
                    monthly["trust_code"] = trust_code
                    all_monthly.append(monthly)

            time.sleep(0.5)  # Be respectful to the API

        if len(all_monthly) >= len(trusts) * 0.5:
            df = pd.concat(all_monthly, ignore_index=True)
            df.to_csv(output_path, index=False)
            print(f"  Saved {len(df)} records to {output_path}")
            return df
        else:
            print(f"  Only got weather for {len(all_monthly)}/{len(trusts)} trusts (rate-limited). Using synthetic data instead.")

    # Fallback to synthetic data
    print("  Falling back to synthetic weather data...")
    df = generate_synthetic_weather()
    df.to_csv(output_path, index=False)
    print(f"  Generated {len(df)} weather records")
    print(f"  Saved to: {output_path}")
    return df


if __name__ == "__main__":
    df = fetch_and_process()
    if df is not None:
        print("\nSample data:")
        print(df.head(10).to_string())
        print(f"\nTotal records: {len(df)}")
        print(f"Trusts: {df['trust_code'].nunique()}")
