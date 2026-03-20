"""
Model evaluation — metrics, learning curves, and leaderboard generation.
"""

import json
import numpy as np
import pandas as pd
import joblib
from pathlib import Path
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
from sklearn.model_selection import learning_curve, TimeSeriesSplit

BASE_DIR = Path(__file__).resolve().parent.parent
PROCESSED_DIR = BASE_DIR / "data" / "processed"
MODEL_DIR = BASE_DIR / "model"
OUTPUT_DIR = BASE_DIR / "data" / "output"


def compute_learning_curves(model, X, y, model_name, is_baseline=False):
    """Compute learning curves for a model."""
    print(f"    Computing learning curves for {model_name}...")

    if is_baseline:
        features = model._feature_names
        X_used = X[features]
    else:
        X_used = X

    train_sizes = np.linspace(0.2, 1.0, 8)

    try:
        train_sizes_abs, train_scores, val_scores = learning_curve(
            model, X_used, y,
            train_sizes=train_sizes,
            cv=TimeSeriesSplit(n_splits=3),
            scoring="neg_root_mean_squared_error",
            n_jobs=-1,
        )

        return {
            "train_sizes": train_sizes_abs.tolist(),
            "train_rmse": (-train_scores.mean(axis=1)).tolist(),
            "train_rmse_std": train_scores.std(axis=1).tolist(),
            "val_rmse": (-val_scores.mean(axis=1)).tolist(),
            "val_rmse_std": val_scores.std(axis=1).tolist(),
        }
    except Exception as e:
        print(f"    Error computing learning curves: {e}")
        return None


def compute_residuals(model, X_test, y_test, model_name, is_baseline=False):
    """Compute residual analysis for a model."""
    if is_baseline:
        preds = model.predict(X_test[model._feature_names])
    else:
        preds = model.predict(X_test)

    residuals = y_test.values - preds

    return {
        "predictions": preds.tolist(),
        "actuals": y_test.values.tolist(),
        "residuals": residuals.tolist(),
        "residual_mean": float(np.mean(residuals)),
        "residual_std": float(np.std(residuals)),
        "residual_skew": float(pd.Series(residuals).skew()),
    }


def evaluate_all():
    """
    Run full evaluation pipeline and generate model_evaluation.json.
    """
    print("=" * 60)
    print("STEP 6: Model evaluation")
    print("=" * 60)

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    # Load metadata
    with open(MODEL_DIR / "training_metadata.json") as f:
        metadata = json.load(f)

    # Load data
    df = pd.read_csv(PROCESSED_DIR / "features_master.csv")
    available_features = metadata["feature_columns"]
    X = df[available_features].fillna(df[available_features].median())
    y = df["total_attendances"]

    # Temporal split (same as training)
    unique_periods = df[["year", "month"]].drop_duplicates().sort_values(["year", "month"])
    n_periods = len(unique_periods)
    split_idx = int(n_periods * 0.8)
    split_period = unique_periods.iloc[split_idx]
    split_year, split_month = split_period["year"], split_period["month"]

    train_mask = (df["year"] < split_year) | (
        (df["year"] == split_year) & (df["month"] < split_month)
    )
    X_train, X_test = X[train_mask], X[~train_mask]
    y_train, y_test = y[train_mask], y[~train_mask]

    evaluation = {
        "best_model": metadata["best_model"],
        "models": {},
    }

    model_names = ["baseline", "random_forest", "xgboost", "lightgbm"]

    for name in model_names:
        print(f"\n  Evaluating {name}...")

        model_path = MODEL_DIR / f"{name}_model.joblib"
        if not model_path.exists():
            print(f"    Model file not found: {model_path}")
            continue

        model = joblib.load(model_path)
        is_baseline = name == "baseline"

        # Test metrics
        test_metrics = metadata["test_results"].get(name, {})

        # Learning curves
        lc = compute_learning_curves(model, X_train, y_train, name, is_baseline)

        # Residuals
        residuals = compute_residuals(model, X_test, y_test, name, is_baseline)

        # Feature importance (for tree-based models)
        feature_importance = None
        if hasattr(model, "feature_importances_"):
            importances = model.feature_importances_
            feature_importance = [
                {"feature": feat, "importance": round(float(imp), 4)}
                for feat, imp in sorted(
                    zip(available_features, importances),
                    key=lambda x: x[1], reverse=True
                )
            ]

        evaluation["models"][name] = {
            "metrics": test_metrics,
            "cv_metrics": metadata["cv_results"].get(name, {}),
            "learning_curves": lc,
            "residuals": {
                "mean": residuals["residual_mean"],
                "std": residuals["residual_std"],
                "skew": residuals["residual_skew"],
            },
            "feature_importance": feature_importance,
            "is_best": name == metadata["best_model"],
        }

    # Save evaluation
    output_path = OUTPUT_DIR / "model_evaluation.json"
    with open(output_path, "w") as f:
        json.dump(evaluation, f, indent=2)
    print(f"\n  Saved evaluation to: {output_path}")

    return evaluation


if __name__ == "__main__":
    evaluation = evaluate_all()
    print("\n" + "=" * 60)
    print("EVALUATION SUMMARY")
    print("=" * 60)
    for name, data in evaluation["models"].items():
        m = data["metrics"]
        marker = " *** BEST ***" if data["is_best"] else ""
        print(f"  {name:15s}: RMSE={m.get('rmse', 'N/A'):>8}  R²={m.get('r2', 'N/A')}{marker}")
