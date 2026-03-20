import { useState, useEffect, useCallback } from 'react'

const BASE_PATH = import.meta.env.BASE_URL + 'data'

const cache = new Map()

export function useDataLoader(path, options = {}) {
  const { enabled = true } = options
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fullPath = `${BASE_PATH}/${path}`

  useEffect(() => {
    if (!enabled || !path) {
      setLoading(false)
      return
    }

    if (cache.has(fullPath)) {
      setData(cache.get(fullPath))
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    fetch(fullPath)
      .then(res => {
        if (!res.ok) throw new Error(`Failed to load ${path}`)
        return res.json()
      })
      .then(json => {
        if (!cancelled) {
          cache.set(fullPath, json)
          setData(json)
          setLoading(false)
        }
      })
      .catch(err => {
        if (!cancelled) {
          setError(err.message)
          setLoading(false)
        }
      })

    return () => { cancelled = true }
  }, [fullPath, enabled, path])

  return { data, loading, error }
}

export function useTrustList() {
  return useDataLoader('trust_list.json')
}

export function useTrustData(trustCode) {
  return useDataLoader(
    trustCode ? `trusts/${trustCode}.json` : null,
    { enabled: !!trustCode }
  )
}

export function useNationalAverages() {
  return useDataLoader('national_averages.json')
}

export function useModelEvaluation() {
  return useDataLoader('model_evaluation.json')
}

export function useRegionalRankings() {
  return useDataLoader('regional_rankings.json')
}

export function useClusterAssignments() {
  return useDataLoader('cluster_assignments.json')
}

export function useShapGlobal() {
  return useDataLoader('shap_global.json')
}

export function useShapPredictions() {
  return useDataLoader('shap_predictions.json')
}
