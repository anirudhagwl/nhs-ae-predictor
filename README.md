# NHS A&E Wait Time Predictor

**Machine learning-powered predictions and analytics for Accident & Emergency departments across NHS England.**

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)](https://github.com/anirudhagarwal/nhs-ae-predictor)
[![Python 3.10+](https://img.shields.io/badge/python-3.10%2B-blue)](https://www.python.org/downloads/)
[![React 19](https://img.shields.io/badge/react-19-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![Live Demo](https://img.shields.io/badge/demo-live-green)](https://anirudhagarwal.github.io/nhs-ae-predictor)
[![License: MIT](https://img.shields.io/badge/license-MIT-yellow.svg)](LICENSE)

---

![Dashboard](docs/screenshot.png)
*Interactive dashboard showing A&E analytics for any NHS England trust*

---

## Live Demo

**[View the live dashboard](https://anirudhagarwal.github.io/nhs-ae-predictor)**

Fully static deployment — no backend required, no API keys needed.

---

## Features

- **ML predictions for 141+ trusts** — monthly A&E attendance and wait time forecasts for every acute trust in England
- **SHAP explainability** — understand which factors drive predictions with interactive force plots and feature importance charts
- **What-if scenario simulator** — adjust weather, flu rates, and other variables to explore counterfactual outcomes
- **Best time to visit widget** — data-driven recommendations on optimal times for A&E attendance
- **Trust clustering** — unsupervised grouping of trusts by performance and demographic characteristics
- **Postcode search** — find your nearest trust instantly via the Postcodes.io API
- **Dark mode** — full light/dark theme support
- **PDF export** — generate downloadable reports with charts and analysis
- **Fully static** — no backend server; the entire app runs in the browser from pre-computed JSON

---

## Tech Stack

| Python Pipeline | React Frontend |
|---|---|
| pandas | React 19 |
| scikit-learn | Recharts |
| XGBoost | Tailwind CSS 4 |
| LightGBM | Vite 8 |
| SHAP | Lucide React |
| Optuna | React Router |
| statsmodels | jsPDF / html2canvas |

---

## Data Sources

All data is publicly available. **No API keys are required.**

| Source | Description |
|---|---|
| [NHS England A&E Attendances](https://www.england.nhs.uk/statistics/statistical-work-areas/ae-waiting-times-and-activity/) | Monthly A&E attendance and performance data for all acute trusts |
| [Open-Meteo](https://open-meteo.com/) | Historical weather data (temperature, precipitation, wind) by trust location |
| [GOV.UK Bank Holidays API](https://www.gov.uk/bank-holidays.json) | UK bank holiday dates |
| School holidays | Regional school holiday calendars for England |
| [UKHSA Flu Surveillance](https://www.gov.uk/government/statistics/national-flu-and-covid-19-surveillance-reports) | Weekly influenza-like illness rates |
| [Index of Multiple Deprivation](https://www.gov.uk/government/statistics/english-indices-of-deprivation-2019) | Socioeconomic deprivation scores by local authority |
| [Postcodes.io](https://postcodes.io/) | Postcode lookup and geolocation for trust matching |

---

## ML Pipeline

The pipeline runs end-to-end with a single command, progressing through six stages:

```
Data Collection ──> Feature Engineering ──> Model Training ──> Evaluation ──> SHAP Analysis ──> JSON Export
```

Each stage is independently runnable. Raw NHS data is fetched, enriched with weather, flu, deprivation, and calendar features, then used to train and evaluate multiple regression models. SHAP values are computed for the best model, and all outputs are serialised to JSON for the frontend.

---

## Model Performance

Evaluated on a held-out test set using time-based split (no data leakage).

| Model | RMSE | MAE | R² | MAPE |
|---|---:|---:|---:|---:|
| Linear Regression | 1,842 | 1,391 | 0.81 | 12.4% |
| Random Forest | 1,254 | 923 | 0.91 | 8.1% |
| **XGBoost** | **1,108** | **812** | **0.93** | **6.9%** |
| LightGBM | 1,147 | 849 | 0.92 | 7.3% |

XGBoost was selected as the production model, with hyperparameters optimised via Optuna.

---

## Getting Started

### Prerequisites

- Python 3.10+
- Node.js 18+

### 1. Clone the repository

```bash
git clone https://github.com/anirudhagarwal/nhs-ae-predictor.git
cd nhs-ae-predictor
```

### 2. Set up the Python environment

```bash
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 3. Run the ML pipeline

```bash
python pipeline/run_pipeline.py
```

To skip data fetching (if you already have raw data):

```bash
python pipeline/run_pipeline.py --skip-fetch
```

### 4. Start the frontend

```bash
cd frontend
npm install
npm run dev
```

The app will be available at `http://localhost:5173`.

### 5. Build for production

```bash
cd frontend
npm run build
```

The static output in `frontend/dist/` can be deployed to any hosting provider or GitHub Pages.

---

## Project Structure

```
nhs-ae-predictor/
├── pipeline/
│   ├── run_pipeline.py          # Orchestrates the full pipeline
│   ├── fetch_nhs_data.py        # NHS A&E data collection
│   ├── fetch_weather.py         # Weather data from Open-Meteo
│   ├── fetch_flu_data.py        # UKHSA flu surveillance data
│   ├── feature_engineering.py   # Feature construction and encoding
│   ├── train_models.py          # Model training with Optuna HPO
│   ├── evaluate_models.py       # Cross-validated evaluation metrics
│   ├── generate_shap.py         # SHAP value computation
│   └── export_json.py           # Serialise outputs for frontend
├── frontend/
│   ├── src/
│   │   ├── components/          # React UI components
│   │   ├── hooks/               # Custom React hooks
│   │   └── utils/               # Helper functions
│   ├── public/data/             # Pre-computed JSON from pipeline
│   └── vite.config.js
├── data/
│   ├── raw/                     # Downloaded source data
│   ├── processed/               # Cleaned and merged datasets
│   ├── lookups/                 # Static reference data (IMD, trust locations)
│   └── output/                  # Pipeline outputs (JSON for frontend)
├── model/                       # Saved model artefacts
├── notebooks/                   # Exploratory analysis
├── requirements.txt
└── LICENSE
```

---

## Methodology

This project predicts monthly A&E attendance volumes and 4-hour wait target performance for NHS acute trusts in England. The feature set combines historical A&E statistics with external factors including regional weather patterns, influenza-like illness rates, bank holidays, school holidays, and area-level deprivation indices. Temporal features (month, quarter, year trend) and lag variables capture seasonality and momentum.

Four regression models were trained and evaluated using a time-based train/test split to prevent data leakage. Hyperparameter optimisation was performed using Optuna with 5-fold cross-validation on the training set. XGBoost achieved the best generalisation performance and was selected as the production model.

SHAP (SHapley Additive exPlanations) values are computed for the selected model to provide trust-level and feature-level interpretability. These values power the explainability visualisations in the frontend, allowing users to understand not just what the model predicts, but why.

---

## Limitations

- **Monthly granularity** — predictions are at monthly resolution; daily or hourly patterns are not captured
- **Not medical advice** — this tool is for informational and analytical purposes only and should not be used to make clinical or operational decisions
- **Historical data dependency** — model accuracy depends on the continued availability and format stability of NHS England statistical publications
- **External factor coverage** — the model does not account for all possible drivers of A&E demand, such as local events, staffing changes, or policy interventions
- **Static predictions** — the deployed dashboard uses pre-computed predictions; real-time updates require re-running the pipeline

---

## Author

**Anirudh Agarwal**
Data Analyst & MSc Data Science candidate, University of Liverpool
Currently at NHS Royal Liverpool University Hospital

- [GitHub](https://github.com/anirudhagarwal)
- [LinkedIn](https://linkedin.com/in/anirudhagarwal)

---

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.
