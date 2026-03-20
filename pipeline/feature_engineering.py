"""
Feature engineering pipeline.

Merges all data sources and creates the master feature matrix
for model training.
"""

import json
import pandas as pd
import numpy as np
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
PROCESSED_DIR = BASE_DIR / "data" / "processed"
LOOKUPS_DIR = BASE_DIR / "data" / "lookups"


def load_data():
    """Load all processed data sources."""
    print("  Loading data sources...")

    nhs = pd.read_csv(PROCESSED_DIR / "nhs_ae_monthly.csv")
    print(f"    NHS A&E: {len(nhs)} records, {nhs['trust_code'].nunique()} trusts")

    weather = pd.read_csv(PROCESSED_DIR / "weather_monthly.csv")
    print(f"    Weather: {len(weather)} records")

    flu = pd.read_csv(PROCESSED_DIR / "flu_monthly.csv")
    print(f"    Flu: {len(flu)} records")

    bank_holidays = pd.read_csv(PROCESSED_DIR / "bank_holidays_monthly.csv")
    print(f"    Bank holidays: {len(bank_holidays)} records")

    school_holidays = pd.read_csv(PROCESSED_DIR / "school_holidays_monthly.csv")
    print(f"    School holidays: {len(school_holidays)} records")

    return nhs, weather, flu, bank_holidays, school_holidays


def load_lookups():
    """Load lookup tables."""
    with open(LOOKUPS_DIR / "trust_locations.json") as f:
        trust_locations = json.load(f)

    imd_path = LOOKUPS_DIR / "imd_scores.json"
    imd_scores = {}
    if imd_path.exists():
        with open(imd_path) as f:
            imd_scores = json.load(f)

    return trust_locations, imd_scores


def merge_data(nhs, weather, flu, bank_holidays, school_holidays):
    """Merge all data sources into a single DataFrame."""
    print("  Merging data sources...")

    # Merge weather (trust-level, monthly)
    df = nhs.merge(
        weather[["trust_code", "year", "month", "avg_temp_c", "total_precip_mm",
                 "avg_humidity_pct", "max_wind_kph", "days_below_5c"]],
        on=["trust_code", "year", "month"],
        how="left"
    )

    # Merge flu (national-level, monthly)
    df = df.merge(
        flu[["year", "month", "flu_rate", "flu_intensity_category"]],
        on=["year", "month"],
        how="left"
    )

    # Merge bank holidays (national-level, monthly)
    df = df.merge(
        bank_holidays[["year", "month", "num_bank_holidays"]],
        on=["year", "month"],
        how="left"
    )

    # Merge school holidays (national-level, monthly)
    df = df.merge(
        school_holidays[["year", "month", "num_school_holiday_weeks", "is_school_holiday"]],
        on=["year", "month"],
        how="left"
    )

    # Fill NaN bank holidays with 0
    df["num_bank_holidays"] = df["num_bank_holidays"].fillna(0)
    df["num_school_holiday_weeks"] = df["num_school_holiday_weeks"].fillna(0)
    df["is_school_holiday"] = df["is_school_holiday"].fillna(0)

    print(f"    Merged dataset: {len(df)} records, {df.shape[1]} columns")
    return df


def create_temporal_features(df):
    """Create temporal and calendar features."""
    print("  Creating temporal features...")

    # Cyclical encoding of month
    df["month_sin"] = np.sin(2 * np.pi * df["month"] / 12)
    df["month_cos"] = np.cos(2 * np.pi * df["month"] / 12)

    # Quarter
    df["quarter"] = ((df["month"] - 1) // 3) + 1

    # Season flags
    df["is_winter"] = df["month"].isin([11, 12, 1, 2]).astype(int)
    df["is_flu_season"] = df["month"].isin([10, 11, 12, 1, 2, 3]).astype(int)
    df["has_christmas"] = (df["month"] == 12).astype(int)
    df["has_new_year"] = (df["month"] == 1).astype(int)

    # Year as a numeric feature (for trend)
    df["year_numeric"] = df["year"] - df["year"].min()

    return df


def create_trust_features(df, trust_locations, imd_scores):
    """Create trust-level features."""
    print("  Creating trust-level features...")

    # Rolling 12-month average attendance per trust
    df = df.sort_values(["trust_code", "year", "month"])
    df["trust_historical_avg"] = df.groupby("trust_code")["total_attendances"].transform(
        lambda x: x.rolling(window=12, min_periods=3).mean()
    )
    # Fill early months with overall trust average
    trust_means = df.groupby("trust_code")["total_attendances"].transform("mean")
    df["trust_historical_avg"] = df["trust_historical_avg"].fillna(trust_means)

    # Trust size category based on average attendance
    trust_avg = df.groupby("trust_code")["total_attendances"].mean()
    size_bins = pd.qcut(trust_avg, q=3, labels=["small", "medium", "large"])
    size_map = size_bins.to_dict()
    df["trust_size_category"] = df["trust_code"].map(size_map)

    # IMD score
    df["imd_score"] = df["trust_code"].map(
        {k: v.get("imd_score", 25) for k, v in imd_scores.items()}
    )
    df["imd_score"] = df["imd_score"].fillna(25)  # National average ~25

    # Teaching hospital flag
    df["is_teaching_hospital"] = df["trust_code"].map(
        {k: int(v.get("is_teaching", False)) for k, v in trust_locations.items()}
    )
    df["is_teaching_hospital"] = df["is_teaching_hospital"].fillna(0)

    # Region (for encoding) — normalise casing
    REGION_NORMALISE = {
        "East Of England": "East of England",
        "North East And Yorkshire": "North East and Yorkshire",
    }
    df["trust_region"] = df["trust_code"].map(
        {k: v.get("region", "Unknown") for k, v in trust_locations.items()}
    )
    df["trust_region"] = df["trust_region"].replace(REGION_NORMALISE)
    if "region" in df.columns:
        df["region"] = df["region"].replace(REGION_NORMALISE)

    return df


def create_lagged_features(df):
    """Create lagged features for time-series prediction."""
    print("  Creating lagged features...")

    df = df.sort_values(["trust_code", "year", "month"])

    # Attendance lags
    for lag in [1, 2, 3]:
        df[f"attendance_lag_{lag}"] = df.groupby("trust_code")["total_attendances"].shift(lag)

    # Breach rate lag
    df["breach_rate_lag_1"] = df.groupby("trust_code")["breach_rate_pct"].shift(1)

    # Year-over-year change
    df["attendance_lag_12"] = df.groupby("trust_code")["total_attendances"].shift(12)
    df["yoy_change"] = (
        (df["total_attendances"] - df["attendance_lag_12"]) / df["attendance_lag_12"]
    ).replace([np.inf, -np.inf], np.nan)

    # Drop the lag_12 helper column
    df = df.drop(columns=["attendance_lag_12"])

    # Fill NaN lags with trust averages
    for col in ["attendance_lag_1", "attendance_lag_2", "attendance_lag_3", "breach_rate_lag_1"]:
        df[col] = df.groupby("trust_code")[col].transform(
            lambda x: x.fillna(x.mean())
        )
    df["yoy_change"] = df["yoy_change"].fillna(0)

    return df


def create_target_variables(df):
    """Ensure target variables are properly defined."""
    print("  Creating target variables...")

    # Breach rate (already exists from NHS data but recalculate for consistency)
    df["breach_rate"] = (df["attendances_over_4hrs"] / df["total_attendances"] * 100).round(1)

    # Approximate average wait (proxy)
    # Using breach rate as proxy: if X% wait over 4hrs (240 min),
    # and the rest wait on average ~120 min, estimate average
    df["avg_wait_proxy"] = (
        df["breach_rate"] / 100 * 300 +  # Breached patients avg ~5 hrs
        (1 - df["breach_rate"] / 100) * 120  # Non-breached avg ~2 hrs
    ).round(0)

    return df


def encode_categorical(df):
    """Encode categorical variables."""
    print("  Encoding categorical features...")

    # Flu intensity encoding
    flu_map = {"low": 0, "moderate": 1, "high": 2}
    df["flu_intensity_encoded"] = df["flu_intensity_category"].map(flu_map).fillna(0)

    # Trust size encoding
    size_map = {"small": 0, "medium": 1, "large": 2}
    df["trust_size_encoded"] = df["trust_size_category"].map(size_map).fillna(1)

    # Region encoding (one-hot)
    region_dummies = pd.get_dummies(df["trust_region"], prefix="region", dtype=int)
    df = pd.concat([df, region_dummies], axis=1)

    return df


def build_features():
    """
    Main feature engineering pipeline.
    Loads all data, merges, creates features, and outputs the master dataset.
    """
    print("=" * 60)
    print("STEP 4: Feature engineering")
    print("=" * 60)

    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    output_path = PROCESSED_DIR / "features_master.csv"

    if output_path.exists():
        print(f"  Feature matrix already exists: {output_path}")
        df = pd.read_csv(output_path)
        print(f"  Loaded {len(df)} records with {df.shape[1]} features")
        return df

    # Load all data
    nhs, weather, flu, bank_holidays, school_holidays = load_data()
    trust_locations, imd_scores = load_lookups()

    # Merge
    df = merge_data(nhs, weather, flu, bank_holidays, school_holidays)

    # Create features
    df = create_temporal_features(df)
    df = create_trust_features(df, trust_locations, imd_scores)
    df = create_lagged_features(df)
    df = create_target_variables(df)
    df = encode_categorical(df)

    # Drop rows with too many NaN values (early rows without lags)
    initial_count = len(df)
    df = df.dropna(subset=["attendance_lag_1", "total_attendances"])
    print(f"  Dropped {initial_count - len(df)} rows with missing lag values")

    # Save
    df.to_csv(output_path, index=False)
    print(f"\n  Final feature matrix: {len(df)} records, {df.shape[1]} columns")
    print(f"  Saved to: {output_path}")

    # Print feature summary
    print("\n  Feature columns:")
    feature_cols = [c for c in df.columns if c not in [
        "trust_code", "trust_name", "region", "trust_region",
        "trust_size_category", "flu_intensity_category"
    ]]
    for col in sorted(feature_cols):
        print(f"    - {col}")

    return df


if __name__ == "__main__":
    df = build_features()
    print("\nSample data:")
    print(df.head(5).to_string())
