import { useMemo } from 'react'
import { Trophy } from 'lucide-react'
import ChartWrapper from '../shared/ChartWrapper'

const MODEL_DISPLAY_NAMES = {
  baseline: 'Linear Regression',
  linear_regression: 'Linear Regression',
  ridge: 'Ridge Regression',
  lasso: 'Lasso Regression',
  random_forest: 'Random Forest',
  gradient_boosting: 'Gradient Boosting',
  xgboost: 'XGBoost',
  lightgbm: 'LightGBM',
  catboost: 'CatBoost',
  svr: 'Support Vector Regression',
  knn: 'K-Nearest Neighbors',
  elastic_net: 'Elastic Net',
  decision_tree: 'Decision Tree',
  adaboost: 'AdaBoost',
  extra_trees: 'Extra Trees',
}

function formatModelName(key) {
  return (
    MODEL_DISPLAY_NAMES[key] ||
    key
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase())
  )
}

function formatMetric(value, decimals = 4) {
  if (value == null) return '\u2014'
  return Number(value).toFixed(decimals)
}

export default function ModelLeaderboard({ evaluation }) {
  const rows = useMemo(() => {
    if (!evaluation?.models) return []

    // Support array format: [{name, rmse, mae, r2, mape}, ...]
    if (Array.isArray(evaluation.models)) {
      return evaluation.models
        .map((m) => ({
          key: m.name,
          name: m.name,
          rmse: m.rmse,
          mae: m.mae,
          r2: m.r2,
          mape: m.mape,
          isBest: m.name === evaluation.best_model,
        }))
        .sort((a, b) => (a.rmse ?? Infinity) - (b.rmse ?? Infinity))
    }

    // Support object format: { model_key: { metrics: {...}, is_best } }
    return Object.entries(evaluation.models)
      .map(([key, data]) => ({
        key,
        name: formatModelName(key),
        rmse: data.metrics?.rmse ?? data.rmse,
        mae: data.metrics?.mae ?? data.mae,
        r2: data.metrics?.r2 ?? data.r2,
        mape: data.metrics?.mape ?? data.mape,
        isBest: data.is_best || key === evaluation.best_model,
      }))
      .sort((a, b) => (a.rmse ?? Infinity) - (b.rmse ?? Infinity))
  }, [evaluation])

  if (!rows.length) {
    return (
      <ChartWrapper title="Model Leaderboard">
        <p className="text-sm text-text-secondary dark:text-gray-400">
          No model evaluation data available.
        </p>
      </ChartWrapper>
    )
  }

  return (
    <ChartWrapper title="Model Leaderboard" subtitle="Performance comparison across trained models">
      <div className="overflow-x-auto -mx-2 px-2">
        <table className="w-full text-sm min-w-[500px]">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="text-left py-2.5 px-3 text-xs font-semibold text-text-secondary dark:text-gray-400 uppercase tracking-wider">
                Model
              </th>
              <th className="text-right py-2.5 px-3 text-xs font-semibold text-text-secondary dark:text-gray-400 uppercase tracking-wider">
                RMSE
              </th>
              <th className="text-right py-2.5 px-3 text-xs font-semibold text-text-secondary dark:text-gray-400 uppercase tracking-wider">
                MAE
              </th>
              <th className="text-right py-2.5 px-3 text-xs font-semibold text-text-secondary dark:text-gray-400 uppercase tracking-wider">
                R&sup2;
              </th>
              <th className="text-right py-2.5 px-3 text-xs font-semibold text-text-secondary dark:text-gray-400 uppercase tracking-wider">
                MAPE
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
            {rows.map((row) => (
              <tr
                key={row.key}
                className={`transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/30 ${
                  row.isBest ? 'border-l-[3px] border-l-[#2563EB] bg-blue-50/40 dark:bg-blue-900/10' : ''
                }`}
              >
                <td className="py-2.5 px-3 text-text-primary dark:text-gray-100 font-medium">
                  <span className="flex items-center gap-2">
                    {row.name}
                    {row.isBest && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-[#2563EB] dark:bg-blue-900/40 dark:text-blue-300">
                        <Trophy size={10} />
                        Best
                      </span>
                    )}
                  </span>
                </td>
                <td className="py-2.5 px-3 text-right text-text-secondary dark:text-gray-300 tabular-nums">
                  {formatMetric(row.rmse)}
                </td>
                <td className="py-2.5 px-3 text-right text-text-secondary dark:text-gray-300 tabular-nums">
                  {formatMetric(row.mae)}
                </td>
                <td className="py-2.5 px-3 text-right text-text-secondary dark:text-gray-300 tabular-nums">
                  {formatMetric(row.r2)}
                </td>
                <td className="py-2.5 px-3 text-right text-text-secondary dark:text-gray-300 tabular-nums">
                  {row.mape != null ? `${formatMetric(row.mape, 2)}%` : '\u2014'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ChartWrapper>
  )
}
