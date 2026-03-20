#!/usr/bin/env python3
"""
Generate sample JSON data files for the NHS A&E Predictor React frontend.
Reads real trust location and IMD data, generates realistic synthetic data.
"""

import json
import os
import hashlib
import numpy as np
from pathlib import Path

BASE_DIR = Path(__file__).parent
DATA_OUT = BASE_DIR / "frontend" / "public" / "data"
LOOKUPS = BASE_DIR / "data" / "lookups"

MONTHS_LABEL = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
DAYS_LABEL = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

# Seasonal multiplier by month (1-indexed): winter high, summer low
SEASONAL = {
    1: 1.18, 2: 1.12, 3: 1.05, 4: 0.97, 5: 0.92, 6: 0.88,
    7: 0.85, 8: 0.87, 9: 0.93, 10: 0.98, 11: 1.05, 12: 1.15
}

# Average temp by month (UK approx)
AVG_TEMPS = {
    1: 4.5, 2: 4.8, 3: 6.9, 4: 9.2, 5: 12.1, 6: 15.0,
    7: 17.2, 8: 16.8, 9: 14.1, 10: 10.8, 11: 7.2, 12: 5.0
}

# Flu rate by month (per 100k, approximate)
FLU_RATES = {
    1: 28.5, 2: 22.0, 3: 14.0, 4: 6.0, 5: 2.5, 6: 1.2,
    7: 0.8, 8: 0.9, 9: 1.5, 10: 3.5, 11: 8.0, 12: 18.0
}


def seed_from_code(trust_code: str) -> int:
    """Deterministic seed from trust code."""
    return int(hashlib.md5(trust_code.encode()).hexdigest()[:8], 16)


def load_lookups():
    with open(LOOKUPS / "trust_locations.json") as f:
        trust_locs = json.load(f)
    with open(LOOKUPS / "imd_scores.json") as f:
        imd_data = json.load(f)
    return trust_locs, imd_data


def generate_trust_list(trust_locs):
    """File 1: trust_list.json"""
    print("Generating trust_list.json ...")
    trusts = []
    for code, info in trust_locs.items():
        trusts.append({
            "trust_code": code,
            "trust_name": info["trust_name"],
            "region": info["region"],
            "lat": info["lat"],
            "lng": info["lng"],
            "is_teaching": info.get("is_teaching", False)
        })
    trusts.sort(key=lambda t: t["trust_name"])
    with open(DATA_OUT / "trust_list.json", "w") as f:
        json.dump(trusts, f, indent=2)
    print(f"  -> {len(trusts)} trusts written")
    return trusts


def generate_national_averages():
    """File 2: national_averages.json"""
    print("Generating national_averages.json ...")
    rng = np.random.default_rng(42)
    records = []
    for year in range(2020, 2027):
        for month in range(1, 13):
            # Skip months after Feb 2026
            if year == 2026 and month > 2:
                continue
            base_attend = 7200
            # COVID dip in 2020
            if year == 2020 and month in (4, 5, 6):
                base_attend *= 0.55
            elif year == 2020 and month in (3, 7):
                base_attend *= 0.75
            seasonal_mult = SEASONAL[month]
            avg_att = int(base_attend * seasonal_mult + rng.normal(0, 150))
            # Breach rate: higher in winter
            breach = round(32.0 + (seasonal_mult - 1.0) * 80 + rng.normal(0, 2.5), 1)
            breach = max(15.0, min(65.0, breach))
            compliance = round(100.0 - breach, 1)
            records.append({
                "year": year,
                "month": month,
                "avg_attendances": avg_att,
                "avg_breach_rate": breach,
                "compliance_pct": compliance
            })
    with open(DATA_OUT / "national_averages.json", "w") as f:
        json.dump(records, f, indent=2)
    print(f"  -> {len(records)} monthly records")


def generate_model_evaluation():
    """File 3: model_evaluation.json"""
    print("Generating model_evaluation.json ...")
    data = {
        "best_model": "XGBoost",
        "models": [
            {"name": "XGBoost", "rmse": 412, "mae": 298, "r2": 0.89, "mape": 5.2},
            {"name": "LightGBM", "rmse": 428, "mae": 312, "r2": 0.87, "mape": 5.6},
            {"name": "Random Forest", "rmse": 456, "mae": 334, "r2": 0.85, "mape": 6.1},
            {"name": "Linear Regression", "rmse": 623, "mae": 478, "r2": 0.72, "mape": 8.4}
        ]
    }
    with open(DATA_OUT / "model_evaluation.json", "w") as f:
        json.dump(data, f, indent=2)
    print("  -> done")


def generate_shap_global():
    """File 6: shap_global.json"""
    print("Generating shap_global.json ...")
    data = {
        "feature_importance": [
            {"feature": "month", "importance": 0.32},
            {"feature": "trust_historical_avg", "importance": 0.28},
            {"feature": "flu_rate", "importance": 0.15},
            {"feature": "avg_temp_c", "importance": 0.12},
            {"feature": "attendance_lag_1", "importance": 0.08},
            {"feature": "num_bank_holidays", "importance": 0.06},
            {"feature": "is_winter", "importance": 0.05},
            {"feature": "imd_score", "importance": 0.04},
            {"feature": "total_precip_mm", "importance": 0.03},
            {"feature": "is_teaching_hospital", "importance": 0.02}
        ]
    }
    with open(DATA_OUT / "shap_global.json", "w") as f:
        json.dump(data, f, indent=2)
    print("  -> done")


def generate_trust_data(code, info, imd_data, trust_rank, total_trusts):
    """Generate per-trust JSON file."""
    rng = np.random.default_rng(seed_from_code(code))
    imd_info = imd_data.get(code, {"imd_score": 20.0, "imd_decile": 4})
    imd_score = imd_info["imd_score"]
    is_teaching = info.get("is_teaching", False)

    # Base monthly attendances: teaching hospitals are larger
    if is_teaching:
        base_attend = int(rng.uniform(7000, 12000))
    else:
        base_attend = int(rng.uniform(3500, 7500))

    # Deprivation increases attendance and breach rate
    deprivation_factor = 1.0 + (imd_score - 20.0) / 100.0
    base_attend = int(base_attend * deprivation_factor)

    # Base breach rate: higher for deprived areas
    base_breach = 28.0 + (imd_score - 15.0) * 0.4 + rng.normal(0, 3)
    base_breach = max(15.0, min(55.0, base_breach))

    # Generate monthly data (2020-2026)
    monthly_data = []
    compliance_trend = []
    all_attendances = []

    for year in range(2020, 2027):
        for month in range(1, 13):
            # Skip months after Feb 2026
            if year == 2026 and month > 2:
                continue
            seasonal_mult = SEASONAL[month]
            # COVID effect
            covid_mult = 1.0
            if year == 2020:
                if month in (4, 5, 6):
                    covid_mult = 0.50 + rng.uniform(-0.05, 0.05)
                elif month == 3:
                    covid_mult = 0.70
                elif month == 7:
                    covid_mult = 0.78

            attend = int(base_attend * seasonal_mult * covid_mult + rng.normal(0, base_attend * 0.05))
            attend = max(500, attend)
            all_attendances.append(attend)

            # Breach rate: seasonal + noise
            breach = base_breach + (seasonal_mult - 1.0) * 60 + rng.normal(0, 2.0)
            if year == 2020 and month in (4, 5, 6):
                breach *= 0.7  # Less pressure during COVID lockdown
            breach = round(max(8.0, min(68.0, breach)), 1)

            temp = round(AVG_TEMPS[month] + rng.normal(0, 1.5), 1)
            flu = round(max(0, FLU_RATES[month] + rng.normal(0, 3.0)), 1)

            monthly_data.append({
                "year": year,
                "month": month,
                "attendances": attend,
                "breach_rate": breach,
                "avg_temp": temp,
                "flu_rate": flu
            })

            # National avg compliance ~ 66-72%
            nat_avg = round(68.0 + (1.0 - seasonal_mult) * 30 + rng.normal(0, 1.0), 1)
            compliance = round(100.0 - breach, 1)
            compliance_trend.append({
                "year": year,
                "month": month,
                "compliance_pct": compliance,
                "national_avg": nat_avg
            })

    # Scorecard
    avg_wait = int(140 + base_breach * 1.8 + rng.normal(0, 15))
    avg_wait = max(80, min(350, avg_wait))
    avg_breach = round(np.mean([m["breach_rate"] for m in monthly_data]), 1)
    busiest_month_idx = int(np.argmax([
        np.mean([m["attendances"] for m in monthly_data if m["month"] == mo])
        for mo in range(1, 13)
    ]))
    busiest_day_idx = int(rng.choice([0, 4, 6], p=[0.45, 0.30, 0.25]))
    total_annual = int(np.mean([
        sum(m["attendances"] for m in monthly_data if m["year"] == y)
        for y in range(2022, 2027)
    ]))
    vs_national = round((avg_breach - 32.0) / 32.0 * 100, 1)

    scorecard = {
        "avg_wait_minutes": avg_wait,
        "breach_rate_pct": avg_breach,
        "busiest_month": MONTHS_LABEL[busiest_month_idx],
        "busiest_day": DAYS_LABEL[busiest_day_idx],
        "total_annual_attendances": total_annual,
        "national_rank": trust_rank,
        "national_total": total_trusts,
        "vs_national_avg_pct": vs_national
    }

    # Heatmap: day-of-week x month
    heatmap_values = []
    for day_i in range(7):
        row = []
        for month_i in range(12):
            day_mult = [1.08, 1.04, 1.02, 1.0, 1.06, 0.88, 0.92][day_i]
            val = int(base_attend / 30 * SEASONAL[month_i + 1] * day_mult + rng.normal(0, 10))
            val = max(50, val)
            row.append(val)
        heatmap_values.append(row)

    heatmap = {
        "rows": DAYS_LABEL,
        "cols": MONTHS_LABEL,
        "values": heatmap_values
    }

    # Seasonal decomposition
    n_points = 74  # ~6 years of monthly data (Jan 2020 - Feb 2026)
    trend_vals = []
    seasonal_vals = []
    residual_vals = []
    for i in range(n_points):
        trend_v = base_attend * (1.0 + i * 0.002) + rng.normal(0, 30)
        month_idx = i % 12
        seas_v = base_attend * (SEASONAL[month_idx + 1] - 1.0)
        resid_v = float(rng.normal(0, base_attend * 0.03))
        trend_vals.append(round(trend_v, 1))
        seasonal_vals.append(round(seas_v, 1))
        residual_vals.append(round(resid_v, 1))

    seasonal_decomposition = {
        "trend": trend_vals,
        "seasonal": seasonal_vals,
        "residual": residual_vals
    }

    # Weather correlation
    scatter_points = []
    for _ in range(74):
        temp_val = round(rng.uniform(0, 25), 1)
        att_val = int(base_attend - temp_val * 12.3 + rng.normal(0, base_attend * 0.08))
        scatter_points.append({"temp": temp_val, "attendances": att_val})

    slope = round(-8.0 - rng.uniform(2, 8), 1)
    intercept = round(base_attend + 100 + rng.normal(0, 50), 1)
    corr_r = round(-0.25 - rng.uniform(0, 0.25), 2)

    weather_correlation = {
        "points": scatter_points,
        "correlation_r": corr_r,
        "trendline": {"slope": slope, "intercept": intercept}
    }

    # Bank holiday impact
    bh_base = int(base_attend / 30)
    bank_holiday_impact = {
        "before": int(bh_base * 1.12 + rng.normal(0, 8)),
        "during": int(bh_base * 0.88 + rng.normal(0, 8)),
        "after": int(bh_base * 1.15 + rng.normal(0, 8))
    }

    # Predictions grid
    pred_months = list(range(1, 13))
    temp_buckets = [-5, 0, 5, 10, 15, 20, 25, 30]
    pred_values = {}
    pred_ci = {}
    for mo in pred_months:
        for temp in temp_buckets:
            key = f"{mo}_{temp}"
            pred_wait = avg_wait * SEASONAL[mo] + temp * slope * 0.1 + rng.normal(0, 8)
            pred_wait = round(max(60, min(400, pred_wait)), 1)
            ci_half = round(rng.uniform(15, 35), 1)
            pred_values[key] = pred_wait
            pred_ci[key] = [round(pred_wait - ci_half, 1), round(pred_wait + ci_half, 1)]

    predictions_grid = {
        "months": pred_months,
        "temp_buckets": temp_buckets,
        "values": pred_values,
        "confidence_intervals": pred_ci
    }

    # SHAP features (per trust)
    features = [
        "month", "trust_historical_avg", "flu_rate", "avg_temp_c",
        "attendance_lag_1", "num_bank_holidays", "is_winter",
        "imd_score", "total_precip_mm", "is_teaching_hospital"
    ]
    base_importances = [0.32, 0.28, 0.15, 0.12, 0.08, 0.06, 0.05, 0.04, 0.03, 0.02]
    trust_importances = [round(max(0.01, v + rng.normal(0, 0.02)), 3) for v in base_importances]
    total_imp = sum(trust_importances)
    trust_importances = [round(v / total_imp, 3) for v in trust_importances]

    shap_global_list = [{"feature": f, "importance": imp}
                        for f, imp in zip(features, trust_importances)]

    # Per-prediction SHAP for a few scenarios
    scenarios = {
        "winter_cold": [
            {"feature": "month", "value": 1, "contribution": round(rng.uniform(20, 45), 1)},
            {"feature": "avg_temp_c", "value": 2.0, "contribution": round(rng.uniform(10, 25), 1)},
            {"feature": "flu_rate", "value": 25.0, "contribution": round(rng.uniform(8, 18), 1)},
            {"feature": "trust_historical_avg", "value": avg_wait, "contribution": round(rng.uniform(5, 15), 1)},
            {"feature": "is_winter", "value": 1, "contribution": round(rng.uniform(3, 10), 1)}
        ],
        "summer_warm": [
            {"feature": "month", "value": 7, "contribution": round(rng.uniform(-30, -10), 1)},
            {"feature": "avg_temp_c", "value": 22.0, "contribution": round(rng.uniform(-20, -5), 1)},
            {"feature": "flu_rate", "value": 1.0, "contribution": round(rng.uniform(-12, -3), 1)},
            {"feature": "trust_historical_avg", "value": avg_wait, "contribution": round(rng.uniform(3, 10), 1)},
            {"feature": "is_winter", "value": 0, "contribution": round(rng.uniform(-8, -1), 1)}
        ],
        "bank_holiday": [
            {"feature": "num_bank_holidays", "value": 1, "contribution": round(rng.uniform(-15, -5), 1)},
            {"feature": "month", "value": 5, "contribution": round(rng.uniform(-8, 5), 1)},
            {"feature": "avg_temp_c", "value": 14.0, "contribution": round(rng.uniform(-5, 5), 1)},
            {"feature": "trust_historical_avg", "value": avg_wait, "contribution": round(rng.uniform(3, 10), 1)},
            {"feature": "flu_rate", "value": 2.0, "contribution": round(rng.uniform(-8, -2), 1)}
        ]
    }

    shap_features = {
        "global": shap_global_list,
        "per_prediction": scenarios
    }

    # Anomalies
    anomalies = []
    for md in monthly_data:
        if rng.random() < 0.06:
            predicted = int(md["attendances"] * rng.uniform(0.82, 0.95))
            deviation = round((md["attendances"] - predicted) / predicted * 100, 1)
            flag = "high" if deviation > 0 else "low"
            anomalies.append({
                "year": md["year"],
                "month": md["month"],
                "actual": md["attendances"],
                "predicted": predicted,
                "deviation_pct": deviation,
                "flag": flag
            })

    trust_data = {
        "trust_code": code,
        "trust_name": info["trust_name"],
        "region": info["region"],
        "lat": info["lat"],
        "lng": info["lng"],
        "imd_score": imd_score,
        "is_teaching": is_teaching,
        "scorecard": scorecard,
        "monthly_data": monthly_data,
        "compliance_trend": compliance_trend,
        "heatmap": heatmap,
        "seasonal_decomposition": seasonal_decomposition,
        "weather_correlation": weather_correlation,
        "bank_holiday_impact": bank_holiday_impact,
        "predictions_grid": predictions_grid,
        "shap_features": shap_features,
        "anomalies": anomalies
    }

    return trust_data


def generate_all_trust_files(trust_locs, imd_data):
    """File 7: Per-trust JSON files."""
    print("Generating per-trust JSON files ...")
    trusts_dir = DATA_OUT / "trusts"
    trusts_dir.mkdir(parents=True, exist_ok=True)

    # Pre-compute ranks by generating avg_wait for all trusts first
    trust_waits = {}
    for code, info in trust_locs.items():
        rng = np.random.default_rng(seed_from_code(code))
        imd_info = imd_data.get(code, {"imd_score": 20.0})
        imd_score = imd_info["imd_score"]
        is_teaching = info.get("is_teaching", False)
        base_breach = 28.0 + (imd_score - 15.0) * 0.4 + rng.normal(0, 3)
        base_breach = max(15.0, min(55.0, base_breach))
        avg_wait = int(140 + base_breach * 1.8 + rng.normal(0, 15))
        avg_wait = max(80, min(350, avg_wait))
        trust_waits[code] = avg_wait

    # Sort by wait (ascending = rank 1 is best)
    sorted_codes = sorted(trust_waits.keys(), key=lambda c: trust_waits[c])
    rank_map = {code: i + 1 for i, code in enumerate(sorted_codes)}
    total = len(trust_locs)

    all_trust_data = {}
    count = 0
    for code, info in trust_locs.items():
        td = generate_trust_data(code, info, imd_data, rank_map[code], total)
        filepath = trusts_dir / f"{code}.json"
        with open(filepath, "w") as f:
            json.dump(td, f, indent=2)
        all_trust_data[code] = td
        count += 1
        if count % 20 == 0:
            print(f"  -> {count}/{total} trust files generated")

    print(f"  -> {count}/{total} trust files generated (complete)")
    return all_trust_data


def generate_regional_rankings(trust_locs, all_trust_data):
    """File 4: regional_rankings.json"""
    print("Generating regional_rankings.json ...")
    regions = {}
    for code, td in all_trust_data.items():
        region = td["region"]
        if region not in regions:
            regions[region] = []
        regions[region].append({
            "trust_code": code,
            "trust_name": td["trust_name"],
            "avg_wait": td["scorecard"]["avg_wait_minutes"],
            "breach_rate": td["scorecard"]["breach_rate_pct"]
        })

    for region in regions:
        regions[region].sort(key=lambda t: t["avg_wait"])

    with open(DATA_OUT / "regional_rankings.json", "w") as f:
        json.dump(regions, f, indent=2)
    print(f"  -> {len(regions)} regions")


def generate_cluster_assignments(trust_locs, imd_data, all_trust_data):
    """File 5: cluster_assignments.json"""
    print("Generating cluster_assignments.json ...")
    clusters_meta = [
        {"id": 0, "name": "Large Urban Teaching Hospitals", "label": "Large Urban Teaching"},
        {"id": 1, "name": "Medium District Generals", "label": "Medium District"},
        {"id": 2, "name": "Small Rural Trusts", "label": "Small Rural"},
        {"id": 3, "name": "High-Pressure Urban Trusts", "label": "High Pressure"},
        {"id": 4, "name": "Specialist Metropolitan Centres", "label": "Specialist Metro"}
    ]

    trust_clusters = []
    for code, td in all_trust_data.items():
        info = trust_locs[code]
        imd_info = imd_data.get(code, {"imd_score": 20.0, "imd_decile": 4})
        is_teaching = info.get("is_teaching", False)
        annual_att = td["scorecard"]["total_annual_attendances"]
        breach = td["scorecard"]["breach_rate_pct"]
        imd_score = imd_info["imd_score"]

        # Assign cluster based on characteristics
        if is_teaching and annual_att > 80000:
            cluster = 0  # Large Urban Teaching
        elif imd_score > 30 and breach > 38:
            cluster = 3  # High Pressure Urban
        elif annual_att < 55000 and imd_score < 18:
            cluster = 2  # Small Rural
        elif is_teaching or annual_att > 90000:
            cluster = 4  # Specialist Metro
        else:
            cluster = 1  # Medium District General

        avg_attend = round(np.mean([m["attendances"] for m in td["monthly_data"]]), 0)
        avg_breach = td["scorecard"]["breach_rate_pct"]

        trust_clusters.append({
            "trust_code": code,
            "trust_name": td["trust_name"],
            "cluster": cluster,
            "avg_attendances": int(avg_attend),
            "avg_breach_rate": avg_breach
        })

    data = {
        "clusters": clusters_meta,
        "trusts": trust_clusters
    }

    with open(DATA_OUT / "cluster_assignments.json", "w") as f:
        json.dump(data, f, indent=2)

    # Print cluster distribution
    from collections import Counter
    dist = Counter(t["cluster"] for t in trust_clusters)
    for cid, count in sorted(dist.items()):
        print(f"  -> Cluster {cid} ({clusters_meta[cid]['label']}): {count} trusts")


def main():
    print("=" * 60)
    print("NHS A&E Predictor - Sample Data Generator")
    print("=" * 60)

    # Ensure output directory exists
    DATA_OUT.mkdir(parents=True, exist_ok=True)
    (DATA_OUT / "trusts").mkdir(parents=True, exist_ok=True)

    # Load lookup data
    trust_locs, imd_data = load_lookups()
    print(f"Loaded {len(trust_locs)} trusts and {len(imd_data)} IMD records\n")

    # 1. Trust list
    generate_trust_list(trust_locs)

    # 2. National averages
    generate_national_averages()

    # 3. Model evaluation
    generate_model_evaluation()

    # 6. SHAP global
    generate_shap_global()

    # 7. Per-trust files (also returns data needed for 4 and 5)
    all_trust_data = generate_all_trust_files(trust_locs, imd_data)

    # 4. Regional rankings
    generate_regional_rankings(trust_locs, all_trust_data)

    # 5. Cluster assignments
    generate_cluster_assignments(trust_locs, imd_data, all_trust_data)

    print("\n" + "=" * 60)
    print("All data files generated successfully!")
    print(f"Output directory: {DATA_OUT}")
    print("=" * 60)


if __name__ == "__main__":
    main()
