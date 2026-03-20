"""
Master pipeline script — runs everything end to end.

Usage:
    python pipeline/run_pipeline.py
    python pipeline/run_pipeline.py --skip-fetch    # Skip data fetching
    python pipeline/run_pipeline.py --step fetch     # Run only fetch step
"""

import sys
import time
import argparse
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))


def run_pipeline(skip_fetch=False, step=None):
    """Run the complete ML pipeline."""
    start_time = time.time()

    print("=" * 60)
    print("NHS A&E Wait Time Predictor — ML Pipeline")
    print("=" * 60)

    steps = {
        "fetch": run_fetch,
        "features": run_features,
        "train": run_train,
        "evaluate": run_evaluate,
        "shap": run_shap,
        "export": run_export,
    }

    if step:
        if step in steps:
            steps[step]()
        else:
            print(f"Unknown step: {step}")
            print(f"Available steps: {', '.join(steps.keys())}")
            return
    else:
        if not skip_fetch:
            run_fetch()
        else:
            print("\nSkipping data fetch (--skip-fetch)")

        run_features()
        run_train()
        run_evaluate()
        run_shap()
        run_export()

    elapsed = time.time() - start_time
    print("\n" + "=" * 60)
    print(f"Pipeline complete! Total time: {elapsed:.1f} seconds")
    print("=" * 60)
    print(f"\nOutput files are in: {BASE_DIR / 'data' / 'output'}")
    print("Copy the output directory to frontend/public/data/ for the React app.")


def run_fetch():
    """Run all data fetching steps."""
    from pipeline.fetch_nhs_data import fetch_and_process as fetch_nhs
    from pipeline.fetch_weather import fetch_and_process as fetch_weather
    from pipeline.fetch_flu_data import fetch_and_process as fetch_flu

    print("\n" + "=" * 60)
    print("PHASE 1: DATA COLLECTION")
    print("=" * 60)

    fetch_nhs()
    fetch_weather()
    fetch_flu()


def run_features():
    """Run feature engineering."""
    from pipeline.feature_engineering import build_features

    print("\n" + "=" * 60)
    print("PHASE 2: FEATURE ENGINEERING")
    print("=" * 60)

    build_features()


def run_train():
    """Run model training."""
    from pipeline.train_models import train_all_models

    print("\n" + "=" * 60)
    print("PHASE 3: MODEL TRAINING")
    print("=" * 60)

    train_all_models()


def run_evaluate():
    """Run model evaluation."""
    from pipeline.evaluate_models import evaluate_all

    print("\n" + "=" * 60)
    print("PHASE 4: MODEL EVALUATION")
    print("=" * 60)

    evaluate_all()


def run_shap():
    """Run SHAP analysis."""
    from pipeline.generate_shap import generate_shap_values

    print("\n" + "=" * 60)
    print("PHASE 5: SHAP ANALYSIS")
    print("=" * 60)

    generate_shap_values()


def run_export():
    """Run JSON export."""
    from pipeline.export_json import export_all

    print("\n" + "=" * 60)
    print("PHASE 6: JSON EXPORT")
    print("=" * 60)

    export_all()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run the NHS A&E prediction pipeline")
    parser.add_argument("--skip-fetch", action="store_true", help="Skip data fetching")
    parser.add_argument("--step", type=str, help="Run only a specific step")
    args = parser.parse_args()

    run_pipeline(skip_fetch=args.skip_fetch, step=args.step)
