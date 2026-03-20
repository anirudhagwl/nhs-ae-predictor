"""
SHAP analysis for model explainability.

Generates global and per-trust SHAP values using the best model.
"""

import json
import warnings
import numpy as np
import pandas as pd
import joblib
import shap
from pathlib import Path

warnings.filterwarnings("ignore")

BASE_DIR = Path(__file__).resolve().parent.parent
PROCESSED_DIR = BASE_DIR / "data" / "processed"
MODEL_DIR = BASE_DIR / "model"
OUTPUT_DIR = BASE_DIR / "data" / "output"


def generate_shap_values():
    """
    Generate SHAP values for the best model.
    Produces global importance, per-trust breakdowns, and prediction grid SHAPs.
    """
    print("=" * 60)
    print("STEP 7: SHAP analysis")
    print("=" * 60)

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    # Load metadata and best model
    with open(MODEL_DIR / "training_metadata.json") as f:
        metadata = json.load(f)

    best_model_name = metadata["best_model"]
    print(f"  Using best model: {best_model_name}")

    model = joblib.load(MODEL_DIR / f"{best_model_name}_model.joblib")
    feature_cols = metadata["feature_columns"]

    # Load data
    df = pd.read_csv(PROCESSED_DIR / "features_master.csv")
    X = df[feature_cols].fillna(df[feature_cols].median())

    # Use test set for SHAP (more representative of predictions)
    unique_periods = df[["year", "month"]].drop_duplicates().sort_values(["year", "month"])
    split_idx = int(len(unique_periods) * 0.8)
    split_period = unique_periods.iloc[split_idx]
    split_year, split_month = split_period["year"], split_period["month"]

    test_mask = ~((df["year"] < split_year) |
                  ((df["year"] == split_year) & (df["month"] < split_month)))
    X_test = X[test_mask]

    # Create SHAP explainer
    print("  Creating SHAP explainer...")
    if best_model_name in ["xgboost", "lightgbm"]:
        explainer = shap.TreeExplainer(model)
    else:
        # Use a background sample for non-tree models
        background = shap.sample(X, min(100, len(X)))
        explainer = shap.Explainer(model, background)

    # Compute SHAP values on test set (or a sample if too large)
    sample_size = min(len(X_test), 5000)
    X_sample = X_test.sample(n=sample_size, random_state=42) if len(X_test) > sample_size else X_test
    df_sample = df.loc[X_sample.index]

    print(f"  Computing SHAP values for {len(X_sample)} samples...")
    shap_values = explainer.shap_values(X_sample)

    if isinstance(shap_values, list):
        shap_values = shap_values[0]

    # 1. Global SHAP importance
    print("  Computing global feature importance...")
    mean_abs_shap = np.abs(shap_values).mean(axis=0)
    global_importance = [
        {"feature": feat, "importance": round(float(imp), 4)}
        for feat, imp in sorted(
            zip(feature_cols, mean_abs_shap),
            key=lambda x: x[1], reverse=True
        )
    ]

    shap_global = {
        "feature_importance": global_importance,
        "base_value": float(explainer.expected_value) if isinstance(explainer.expected_value, (int, float, np.floating)) else float(explainer.expected_value[0]),
        "model_name": best_model_name,
        "num_samples": len(X_sample),
    }

    with open(OUTPUT_DIR / "shap_global.json", "w") as f:
        json.dump(shap_global, f, indent=2)
    print(f"  Saved global SHAP to: {OUTPUT_DIR / 'shap_global.json'}")

    # 2. Per-trust SHAP breakdowns
    print("  Computing per-trust SHAP values...")
    shap_per_trust = {}

    trust_codes = df_sample["trust_code"].unique()
    for trust_code in trust_codes:
        trust_mask = df_sample["trust_code"] == trust_code
        trust_indices = trust_mask[trust_mask].index

        # Map back to position indices in shap_values array
        positions = [list(X_sample.index).index(idx) for idx in trust_indices if idx in X_sample.index]

        if not positions:
            continue

        trust_shap = shap_values[positions]
        mean_shap = trust_shap.mean(axis=0)
        mean_abs = np.abs(trust_shap).mean(axis=0)

        shap_per_trust[trust_code] = {
            "features": [
                {
                    "feature": feat,
                    "mean_shap": round(float(ms), 2),
                    "mean_abs_shap": round(float(mas), 4),
                }
                for feat, ms, mas in sorted(
                    zip(feature_cols, mean_shap, mean_abs),
                    key=lambda x: abs(x[1]), reverse=True
                )
            ]
        }

    with open(OUTPUT_DIR / "shap_per_trust.json", "w") as f:
        json.dump(shap_per_trust, f, indent=2)
    print(f"  Saved per-trust SHAP for {len(shap_per_trust)} trusts")

    # 3. SHAP for prediction grid
    print("  Computing SHAP for prediction grid...")
    generate_prediction_grid_shap(model, explainer, feature_cols, df, X)

    return shap_global, shap_per_trust


def generate_prediction_grid_shap(model, explainer, feature_cols, df, X):
    """
    Generate SHAP values for a grid of prediction scenarios.
    This powers the interactive prediction panel in the frontend.
    """
    # Get median values for all features as baseline
    median_values = X.median()

    months = list(range(1, 13))
    temp_buckets = [-5, 0, 5, 10, 15, 20, 25, 30]
    flu_levels = [0.5, 5.0, 12.0]  # low, moderate, high
    bank_holiday = [0, 1]

    grid_results = {}

    for month in months:
        for temp in temp_buckets:
            # Create a scenario row
            row = median_values.copy()
            row["month"] = month
            row["month_sin"] = np.sin(2 * np.pi * month / 12)
            row["month_cos"] = np.cos(2 * np.pi * month / 12)
            row["quarter"] = ((month - 1) // 3) + 1
            row["is_winter"] = 1 if month in [11, 12, 1, 2] else 0
            row["is_flu_season"] = 1 if month in [10, 11, 12, 1, 2, 3] else 0
            row["has_christmas"] = 1 if month == 12 else 0
            row["has_new_year"] = 1 if month == 1 else 0
            row["avg_temp_c"] = temp
            row["days_below_5c"] = max(0, 20 - temp * 2) if temp < 10 else 0

            # Set flu rate based on season
            if month in [12, 1, 2]:
                row["flu_rate"] = 10.0
                row["flu_intensity_encoded"] = 2
            elif month in [10, 11, 3]:
                row["flu_rate"] = 4.0
                row["flu_intensity_encoded"] = 1
            else:
                row["flu_rate"] = 0.5
                row["flu_intensity_encoded"] = 0

            X_scenario = pd.DataFrame([row[feature_cols]])

            # Predict
            pred = float(model.predict(X_scenario)[0])

            # SHAP values
            sv = explainer.shap_values(X_scenario)
            if isinstance(sv, list):
                sv = sv[0]

            base = float(explainer.expected_value) if isinstance(
                explainer.expected_value, (int, float, np.floating)
            ) else float(explainer.expected_value[0])

            # Top 8 contributing features
            contributions = sorted(
                zip(feature_cols, sv[0]),
                key=lambda x: abs(x[1]), reverse=True
            )[:8]

            key = f"{month}_{temp}"
            grid_results[key] = {
                "month": month,
                "temperature": temp,
                "predicted_attendances": round(pred),
                "base_value": round(base),
                "confidence_low": round(pred * 0.88),
                "confidence_high": round(pred * 1.12),
                "top_contributions": [
                    {"feature": f, "contribution": round(float(c), 1)}
                    for f, c in contributions
                ],
            }

    with open(OUTPUT_DIR / "shap_predictions.json", "w") as f:
        json.dump(grid_results, f, indent=2)
    print(f"  Saved prediction grid with {len(grid_results)} scenarios")


if __name__ == "__main__":
    shap_global, shap_per_trust = generate_shap_values()
    print("\nTop 10 global features:")
    for item in shap_global["feature_importance"][:10]:
        print(f"  {item['feature']:30s}: {item['importance']:.4f}")
