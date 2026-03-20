"""
Train and compare ML models for A&E attendance prediction.

Trains Baseline (Linear Regression), Random Forest, XGBoost, and LightGBM
models using temporal cross-validation.
"""

import json
import warnings
import numpy as np
import pandas as pd
import joblib
from pathlib import Path
from sklearn.linear_model import LinearRegression
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import TimeSeriesSplit
from sklearn.preprocessing import LabelEncoder
import optuna

optuna.logging.set_verbosity(optuna.logging.WARNING)
warnings.filterwarnings("ignore")

BASE_DIR = Path(__file__).resolve().parent.parent
PROCESSED_DIR = BASE_DIR / "data" / "processed"
MODEL_DIR = BASE_DIR / "model"


# Features used for training
FEATURE_COLS = [
    "month", "month_sin", "month_cos", "quarter",
    "is_winter", "is_flu_season", "has_christmas", "has_new_year",
    "year_numeric",
    "avg_temp_c", "total_precip_mm", "avg_humidity_pct", "days_below_5c",
    "flu_rate", "flu_intensity_encoded",
    "num_bank_holidays", "num_school_holiday_weeks", "is_school_holiday",
    "trust_historical_avg", "trust_size_encoded",
    "imd_score", "is_teaching_hospital",
    "attendance_lag_1", "attendance_lag_2", "attendance_lag_3",
    "breach_rate_lag_1", "yoy_change",
]

# Baseline features (simple model)
BASELINE_FEATURES = [
    "month", "trust_historical_avg", "year_numeric",
]

TARGET = "total_attendances"


def prepare_data(df):
    """Prepare training and test data with temporal split."""
    print("  Preparing train/test split...")

    # Sort by time
    df = df.sort_values(["year", "month", "trust_code"]).reset_index(drop=True)

    # Available feature columns (some region dummies may not exist)
    available_features = [c for c in FEATURE_COLS if c in df.columns]

    # Add region dummies that exist
    region_cols = [c for c in df.columns if c.startswith("region_")]
    available_features.extend(region_cols)

    # Temporal split: last 20% of months as test
    unique_periods = df[["year", "month"]].drop_duplicates().sort_values(["year", "month"])
    n_periods = len(unique_periods)
    split_idx = int(n_periods * 0.8)
    split_period = unique_periods.iloc[split_idx]
    split_year, split_month = split_period["year"], split_period["month"]

    train_mask = (df["year"] < split_year) | (
        (df["year"] == split_year) & (df["month"] < split_month)
    )

    X = df[available_features].copy()
    y = df[TARGET].copy()

    # Fill remaining NaNs
    X = X.fillna(X.median())

    X_train, X_test = X[train_mask], X[~train_mask]
    y_train, y_test = y[train_mask], y[~train_mask]

    print(f"    Training set: {len(X_train)} samples ({split_year}-{split_month:02d} split)")
    print(f"    Test set: {len(X_test)} samples")
    print(f"    Features: {len(available_features)}")

    return X_train, X_test, y_train, y_test, available_features


def train_baseline(X_train, y_train, available_features):
    """Train baseline linear regression model."""
    print("\n  Training Baseline (Linear Regression)...")
    baseline_features = [c for c in BASELINE_FEATURES if c in available_features]
    model = LinearRegression()
    model.fit(X_train[baseline_features], y_train)
    model._feature_names = baseline_features
    return model


def train_random_forest(X_train, y_train):
    """Train Random Forest with basic tuning."""
    print("  Training Random Forest...")
    model = RandomForestRegressor(
        n_estimators=200,
        max_depth=15,
        min_samples_split=10,
        min_samples_leaf=5,
        max_features="sqrt",
        random_state=42,
        n_jobs=-1,
    )
    model.fit(X_train, y_train)
    return model


def tune_xgboost(X_train, y_train):
    """Tune XGBoost with Optuna."""
    print("  Tuning XGBoost with Optuna...")
    import xgboost as xgb

    def objective(trial):
        params = {
            "learning_rate": trial.suggest_float("learning_rate", 0.01, 0.3, log=True),
            "max_depth": trial.suggest_int("max_depth", 3, 10),
            "n_estimators": trial.suggest_int("n_estimators", 100, 500),
            "min_child_weight": trial.suggest_int("min_child_weight", 1, 10),
            "subsample": trial.suggest_float("subsample", 0.6, 1.0),
            "colsample_bytree": trial.suggest_float("colsample_bytree", 0.6, 1.0),
            "reg_alpha": trial.suggest_float("reg_alpha", 1e-8, 10.0, log=True),
            "reg_lambda": trial.suggest_float("reg_lambda", 1e-8, 10.0, log=True),
            "random_state": 42,
            "n_jobs": -1,
        }

        model = xgb.XGBRegressor(**params)

        tscv = TimeSeriesSplit(n_splits=3)
        scores = []
        for train_idx, val_idx in tscv.split(X_train):
            X_t, X_v = X_train.iloc[train_idx], X_train.iloc[val_idx]
            y_t, y_v = y_train.iloc[train_idx], y_train.iloc[val_idx]
            model.fit(X_t, y_t)
            preds = model.predict(X_v)
            rmse = np.sqrt(np.mean((y_v - preds) ** 2))
            scores.append(rmse)

        return np.mean(scores)

    study = optuna.create_study(direction="minimize")
    study.optimize(objective, n_trials=30, show_progress_bar=False)

    print(f"    Best RMSE: {study.best_value:.2f}")
    print(f"    Best params: {study.best_params}")

    best_model = xgb.XGBRegressor(**study.best_params, random_state=42, n_jobs=-1)
    best_model.fit(X_train, y_train)

    return best_model, study.best_params


def tune_lightgbm(X_train, y_train):
    """Tune LightGBM with Optuna."""
    print("  Tuning LightGBM with Optuna...")
    import lightgbm as lgb

    def objective(trial):
        params = {
            "learning_rate": trial.suggest_float("learning_rate", 0.01, 0.3, log=True),
            "max_depth": trial.suggest_int("max_depth", 3, 10),
            "n_estimators": trial.suggest_int("n_estimators", 100, 500),
            "min_child_samples": trial.suggest_int("min_child_samples", 5, 50),
            "subsample": trial.suggest_float("subsample", 0.6, 1.0),
            "colsample_bytree": trial.suggest_float("colsample_bytree", 0.6, 1.0),
            "reg_alpha": trial.suggest_float("reg_alpha", 1e-8, 10.0, log=True),
            "reg_lambda": trial.suggest_float("reg_lambda", 1e-8, 10.0, log=True),
            "num_leaves": trial.suggest_int("num_leaves", 20, 150),
            "random_state": 42,
            "n_jobs": -1,
            "verbose": -1,
        }

        model = lgb.LGBMRegressor(**params)

        tscv = TimeSeriesSplit(n_splits=3)
        scores = []
        for train_idx, val_idx in tscv.split(X_train):
            X_t, X_v = X_train.iloc[train_idx], X_train.iloc[val_idx]
            y_t, y_v = y_train.iloc[train_idx], y_train.iloc[val_idx]
            model.fit(X_t, y_t)
            preds = model.predict(X_v)
            rmse = np.sqrt(np.mean((y_v - preds) ** 2))
            scores.append(rmse)

        return np.mean(scores)

    study = optuna.create_study(direction="minimize")
    study.optimize(objective, n_trials=30, show_progress_bar=False)

    print(f"    Best RMSE: {study.best_value:.2f}")
    print(f"    Best params: {study.best_params}")

    best_model = lgb.LGBMRegressor(**study.best_params, random_state=42, n_jobs=-1, verbose=-1)
    best_model.fit(X_train, y_train)

    return best_model, study.best_params


def cross_validate_model(model, X, y, model_name, is_baseline=False):
    """Perform time-series cross-validation."""
    from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score

    tscv = TimeSeriesSplit(n_splits=5)
    fold_metrics = []

    for fold, (train_idx, val_idx) in enumerate(tscv.split(X)):
        X_t, X_v = X.iloc[train_idx], X.iloc[val_idx]
        y_t, y_v = y.iloc[train_idx], y.iloc[val_idx]

        if is_baseline:
            features = model._feature_names
            model.fit(X_t[features], y_t)
            preds = model.predict(X_v[features])
        else:
            model.fit(X_t, y_t)
            preds = model.predict(X_v)

        rmse = np.sqrt(mean_squared_error(y_v, preds))
        mae = mean_absolute_error(y_v, preds)
        r2 = r2_score(y_v, preds)
        mape = np.mean(np.abs((y_v - preds) / y_v)) * 100

        fold_metrics.append({"rmse": rmse, "mae": mae, "r2": r2, "mape": mape})

    avg_metrics = {
        "rmse": np.mean([m["rmse"] for m in fold_metrics]),
        "rmse_std": np.std([m["rmse"] for m in fold_metrics]),
        "mae": np.mean([m["mae"] for m in fold_metrics]),
        "mae_std": np.std([m["mae"] for m in fold_metrics]),
        "r2": np.mean([m["r2"] for m in fold_metrics]),
        "r2_std": np.std([m["r2"] for m in fold_metrics]),
        "mape": np.mean([m["mape"] for m in fold_metrics]),
        "mape_std": np.std([m["mape"] for m in fold_metrics]),
    }

    print(f"    {model_name}: RMSE={avg_metrics['rmse']:.2f}±{avg_metrics['rmse_std']:.2f}, "
          f"MAE={avg_metrics['mae']:.2f}, R²={avg_metrics['r2']:.4f}, MAPE={avg_metrics['mape']:.1f}%")

    return avg_metrics


def train_all_models():
    """
    Main training pipeline. Trains all models, tunes hyperparameters,
    and saves the best model.
    """
    print("=" * 60)
    print("STEP 5: Training ML models")
    print("=" * 60)

    MODEL_DIR.mkdir(parents=True, exist_ok=True)

    # Load feature matrix
    df = pd.read_csv(PROCESSED_DIR / "features_master.csv")
    print(f"  Loaded {len(df)} samples with {df.shape[1]} columns")

    # Prepare data
    X_train, X_test, y_train, y_test, available_features = prepare_data(df)

    models = {}
    cv_results = {}
    test_results = {}

    # 1. Baseline
    baseline = train_baseline(X_train, y_train, available_features)
    models["baseline"] = baseline
    cv_results["baseline"] = cross_validate_model(
        baseline, X_train, y_train, "Baseline", is_baseline=True
    )

    # 2. Random Forest
    rf = train_random_forest(X_train, y_train)
    models["random_forest"] = rf
    cv_results["random_forest"] = cross_validate_model(
        rf, X_train, y_train, "Random Forest"
    )

    # 3. XGBoost
    xgb_model, xgb_params = tune_xgboost(X_train, y_train)
    models["xgboost"] = xgb_model
    cv_results["xgboost"] = cross_validate_model(
        xgb_model, X_train, y_train, "XGBoost"
    )

    # 4. LightGBM
    lgbm_model, lgbm_params = tune_lightgbm(X_train, y_train)
    models["lightgbm"] = lgbm_model
    cv_results["lightgbm"] = cross_validate_model(
        lgbm_model, X_train, y_train, "LightGBM"
    )

    # Evaluate on test set
    from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score

    print("\n  Test set evaluation:")
    for name, model in models.items():
        if name == "baseline":
            preds = model.predict(X_test[model._feature_names])
        else:
            preds = model.predict(X_test)

        rmse = np.sqrt(mean_squared_error(y_test, preds))
        mae = mean_absolute_error(y_test, preds)
        r2 = r2_score(y_test, preds)
        mape = np.mean(np.abs((y_test - preds) / y_test)) * 100

        test_results[name] = {
            "rmse": round(float(rmse), 2),
            "mae": round(float(mae), 2),
            "r2": round(float(r2), 4),
            "mape": round(float(mape), 2),
        }

        print(f"    {name}: RMSE={rmse:.2f}, MAE={mae:.2f}, R²={r2:.4f}, MAPE={mape:.1f}%")

    # Find best model
    best_model_name = min(test_results, key=lambda k: test_results[k]["rmse"])
    print(f"\n  Best model: {best_model_name} (lowest test RMSE)")

    # Re-train best model on all data
    print(f"  Re-training {best_model_name} on full dataset...")
    X_full = pd.concat([X_train, X_test])
    y_full = pd.concat([y_train, y_test])

    best_model = models[best_model_name]
    if best_model_name == "baseline":
        best_model.fit(X_full[best_model._feature_names], y_full)
    else:
        best_model.fit(X_full, y_full)

    # Save models
    for name, model in models.items():
        model_path = MODEL_DIR / f"{name}_model.joblib"
        joblib.dump(model, model_path)
        print(f"  Saved: {model_path}")

    # Save metadata
    metadata = {
        "best_model": best_model_name,
        "feature_columns": available_features,
        "target": TARGET,
        "train_samples": int(len(X_train)),
        "test_samples": int(len(X_test)),
        "cv_results": {k: {kk: round(float(vv), 4) for kk, vv in v.items()} for k, v in cv_results.items()},
        "test_results": test_results,
    }

    metadata_path = MODEL_DIR / "training_metadata.json"
    with open(metadata_path, "w") as f:
        json.dump(metadata, f, indent=2)
    print(f"  Saved metadata: {metadata_path}")

    # Save test predictions for evaluation
    test_predictions = pd.DataFrame({
        "trust_code": df.loc[~(
            (df["year"] < df.iloc[int(len(df) * 0.8)]["year"]) |
            ((df["year"] == df.iloc[int(len(df) * 0.8)]["year"]) &
             (df["month"] < df.iloc[int(len(df) * 0.8)]["month"]))
        )].head(len(X_test))["trust_code"].values[:len(X_test)],
        "year": df.loc[X_test.index, "year"].values,
        "month": df.loc[X_test.index, "month"].values,
        "actual": y_test.values,
    })

    for name, model in models.items():
        if name == "baseline":
            test_predictions[f"pred_{name}"] = model.predict(X_test[model._feature_names])
        else:
            test_predictions[f"pred_{name}"] = model.predict(X_test)

    test_predictions.to_csv(PROCESSED_DIR / "test_predictions.csv", index=False)
    print(f"  Saved test predictions")

    return models, metadata


if __name__ == "__main__":
    models, metadata = train_all_models()
    print("\n" + "=" * 60)
    print("MODEL LEADERBOARD")
    print("=" * 60)
    for name, metrics in metadata["test_results"].items():
        marker = " ← BEST" if name == metadata["best_model"] else ""
        print(f"  {name:15s}: RMSE={metrics['rmse']:8.2f}  MAE={metrics['mae']:8.2f}  "
              f"R²={metrics['r2']:.4f}  MAPE={metrics['mape']:.1f}%{marker}")
