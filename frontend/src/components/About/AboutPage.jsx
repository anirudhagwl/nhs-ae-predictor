import { Link } from 'react-router-dom'
import { ArrowLeft, Database, Brain, BarChart3, Globe, Github, Linkedin } from 'lucide-react'

const pipelineSteps = [
  { icon: Database, label: 'Data Collection', desc: 'NHS A&E statistics, weather, flu surveillance, bank holidays, IMD scores' },
  { icon: BarChart3, label: 'Feature Engineering', desc: 'Temporal, weather, calendar, and public health features across 159 trusts' },
  { icon: Brain, label: 'Model Training', desc: 'XGBoost, LightGBM, Random Forest + hyperparameter tuning with Optuna' },
  { icon: Globe, label: 'SHAP Explainability', desc: 'Per-trust and per-prediction SHAP values for transparent ML insights' },
]

const dataSources = [
  { name: 'NHS England A&E Attendance Data', url: 'https://www.england.nhs.uk/statistics/statistical-work-areas/ae-waiting-times-and-activity/' },
  { name: 'Open-Meteo Historical Weather API', url: 'https://open-meteo.com/' },
  { name: 'UK Government Bank Holidays API', url: 'https://www.gov.uk/bank-holidays.json' },
  { name: 'UKHSA Flu Surveillance Reports', url: 'https://www.gov.uk/government/statistics/national-flu-and-covid-19-surveillance-reports' },
  { name: 'English Indices of Deprivation 2019', url: 'https://www.gov.uk/government/statistics/english-indices-of-deprivation-2019' },
  { name: 'Postcodes.io', url: 'https://postcodes.io/' },
]

const techStack = [
  'Python', 'XGBoost', 'LightGBM', 'scikit-learn', 'SHAP', 'Optuna',
  'React', 'Recharts', 'Tailwind CSS', 'Vite', 'GitHub Pages',
]

const limitations = [
  'Data is at monthly granularity — not daily or hourly. Predictions reflect monthly averages, not real-time wait times.',
  'Predictions are statistical estimates based on historical patterns. They cannot account for unprecedented events (e.g., pandemics, major incidents).',
  'Weather data is regional, not hyperlocal. A trust in a large city may experience different microclimates.',
  'The model is trained on historical patterns that may shift due to NHS policy changes, funding decisions, or demographic changes.',
  'This is not medical advice. For emergencies, always call 999. For non-emergency guidance, call 111.',
]

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-[#0F0F0F] text-text-primary dark:text-gray-100">
      <div className="max-w-[800px] mx-auto px-4 sm:px-6 py-8">
        {/* Back link */}
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-primary hover:text-primary-dark dark:text-blue-400 dark:hover:text-blue-300 mb-8"
        >
          <ArrowLeft size={16} />
          Back to dashboard
        </Link>

        {/* Title */}
        <h1 className="text-[28px] font-semibold mb-2">About This Project</h1>
        <p className="text-text-secondary dark:text-gray-400 text-base mb-10">
          A machine learning-powered dashboard predicting A&E waiting times across all NHS England trusts.
        </p>

        {/* Why I built it */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-3">Why I Built This</h2>
          <p className="text-[15px] leading-relaxed text-text-secondary dark:text-gray-300">
            I work at NHS Royal Liverpool University Hospital as a Facilities and Management Coordinator.
            Every day I see the pressure A&E departments face — overcrowded waiting rooms, stretched staff,
            and patients waiting hours to be seen. I wanted to use my data science skills to understand the
            patterns behind that pressure and build something that could help people make more informed
            decisions about when to seek care.
          </p>
          <p className="text-[15px] leading-relaxed text-text-secondary dark:text-gray-300 mt-3">
            This project combines publicly available NHS data with weather patterns, flu surveillance,
            and socioeconomic indicators to predict A&E wait times. It's built as a fully static app —
            no backend servers, no API keys — so it's free to run and fully reproducible by anyone.
          </p>
        </section>

        {/* Methodology */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-4">Methodology</h2>
          <p className="text-[15px] leading-relaxed text-text-secondary dark:text-gray-300 mb-5">
            The ML pipeline runs offline in Python. It downloads data, engineers features, trains models,
            generates SHAP explanations, and exports everything as optimised JSON files. The React frontend
            simply loads these JSON bundles — no server needed.
          </p>

          {/* Pipeline visual */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {pipelineSteps.map((step, idx) => (
              <div key={idx} className="flex items-start gap-3 p-4 bg-surface dark:bg-surface-dark rounded-lg border border-gray-100 dark:border-gray-700">
                <div className="w-8 h-8 rounded-lg bg-purple/10 flex items-center justify-center shrink-0">
                  <step.icon size={16} className="text-purple" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-text-primary dark:text-gray-200">
                    <span className="text-text-tertiary dark:text-gray-500 mr-1">{idx + 1}.</span>
                    {step.label}
                  </p>
                  <p className="text-xs text-text-secondary dark:text-gray-400 mt-0.5">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Data sources */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-3">Data Sources</h2>
          <p className="text-sm text-text-secondary dark:text-gray-400 mb-3">
            All data sources are free and publicly available. No API keys required.
          </p>
          <ul className="space-y-2">
            {dataSources.map((source, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-primary mt-1 shrink-0">•</span>
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:text-primary-dark dark:text-blue-400 dark:hover:text-blue-300 underline underline-offset-2"
                >
                  {source.name}
                </a>
              </li>
            ))}
          </ul>
        </section>

        {/* Model performance */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-3">Model Performance</h2>
          <p className="text-sm text-text-secondary dark:text-gray-400 mb-4">
            Four models were trained and compared. XGBoost performed best overall. Metrics are computed
            on a held-out temporal test set (the most recent months of data, never seen during training).
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-2 pr-4 font-semibold text-text-primary dark:text-gray-200">Model</th>
                  <th className="text-right py-2 px-3 font-semibold text-text-primary dark:text-gray-200">RMSE</th>
                  <th className="text-right py-2 px-3 font-semibold text-text-primary dark:text-gray-200">MAE</th>
                  <th className="text-right py-2 px-3 font-semibold text-text-primary dark:text-gray-200">R²</th>
                  <th className="text-right py-2 pl-3 font-semibold text-text-primary dark:text-gray-200">MAPE</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { name: 'XGBoost', rmse: '412', mae: '298', r2: '0.89', mape: '5.2%', best: true },
                  { name: 'LightGBM', rmse: '428', mae: '312', r2: '0.87', mape: '5.6%' },
                  { name: 'Random Forest', rmse: '456', mae: '334', r2: '0.85', mape: '6.1%' },
                  { name: 'Linear Regression', rmse: '623', mae: '478', r2: '0.72', mape: '8.4%' },
                ].map(m => (
                  <tr key={m.name} className={`border-b border-gray-100 dark:border-gray-700/50 ${m.best ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}>
                    <td className="py-2 pr-4 text-text-primary dark:text-gray-200">
                      {m.name}
                      {m.best && <span className="ml-2 text-[10px] font-semibold text-primary bg-blue-100 dark:bg-blue-900/30 px-1.5 py-0.5 rounded">BEST</span>}
                    </td>
                    <td className="text-right py-2 px-3 text-text-secondary dark:text-gray-400">{m.rmse}</td>
                    <td className="text-right py-2 px-3 text-text-secondary dark:text-gray-400">{m.mae}</td>
                    <td className="text-right py-2 px-3 text-text-secondary dark:text-gray-400">{m.r2}</td>
                    <td className="text-right py-2 pl-3 text-text-secondary dark:text-gray-400">{m.mape}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Limitations */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-3">Limitations</h2>
          <ul className="space-y-2">
            {limitations.map((lim, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-text-secondary dark:text-gray-400">
                <span className="text-warning mt-0.5 shrink-0">⚠</span>
                {lim}
              </li>
            ))}
          </ul>
        </section>

        {/* Tech stack */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-3">Tech Stack</h2>
          <div className="flex flex-wrap gap-2">
            {techStack.map(tech => (
              <span
                key={tech}
                className="text-xs px-3 py-1.5 rounded-full bg-surface dark:bg-surface-dark border border-gray-200 dark:border-gray-700 text-text-secondary dark:text-gray-400"
              >
                {tech}
              </span>
            ))}
          </div>
        </section>

        {/* Contact */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-3">Contact</h2>
          <p className="text-sm text-text-secondary dark:text-gray-400 mb-4">
            <strong className="text-text-primary dark:text-gray-200">Anirudh</strong> — MSc Data Science and Artificial Intelligence (University of Liverpool).
            Currently working at NHS Royal Liverpool University Hospital.
          </p>
          <div className="flex gap-4">
            <a
              href="https://github.com/anirudhagarwal"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-text-secondary dark:text-gray-400 hover:text-text-primary dark:hover:text-gray-200 transition-colors"
            >
              <Github size={16} />
              GitHub
            </a>
            <a
              href="https://linkedin.com/in/anirudhagarwal"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-text-secondary dark:text-gray-400 hover:text-text-primary dark:hover:text-gray-200 transition-colors"
            >
              <Linkedin size={16} />
              LinkedIn
            </a>
          </div>
        </section>

        {/* Footer */}
        <div className="pt-6 border-t border-gray-200 dark:border-gray-700 text-center text-xs text-text-tertiary dark:text-gray-500">
          <p>MIT License | 2026</p>
        </div>
      </div>
    </div>
  )
}
