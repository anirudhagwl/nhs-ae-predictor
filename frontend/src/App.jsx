import { useState, useEffect, useCallback } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import Header from './components/Layout/Header'
import TrustSelector from './components/Layout/TrustSelector'
import TabNav from './components/Layout/TabNav'
import Scorecard from './components/Overview/Scorecard'
import ComplianceTrend from './components/Overview/ComplianceTrend'
import AttendanceVolume from './components/Overview/AttendanceVolume'
import DayMonthHeatmap from './components/Patterns/DayMonthHeatmap'
import SeasonalDecomposition from './components/Patterns/SeasonalDecomposition'
import WeatherScatter from './components/Patterns/WeatherScatter'
import BankHolidayImpact from './components/Patterns/BankHolidayImpact'
import PredictionPanel from './components/MLInsights/PredictionPanel'
import ShapWaterfall from './components/MLInsights/ShapWaterfall'
import FeatureImportance from './components/MLInsights/FeatureImportance'
import ModelLeaderboard from './components/MLInsights/ModelLeaderboard'
import AnomalyFlags from './components/MLInsights/AnomalyFlags'
import WhatIfScenario from './components/Predict/WhatIfScenario'
import BestTimeToGo from './components/Predict/BestTimeToGo'
import TrustVsNational from './components/Compare/TrustVsNational'
import RegionalRanking from './components/Compare/RegionalRanking'
import TrustClusters from './components/Compare/TrustClusters'
import AboutPage from './components/About/AboutPage'
import { ScoreboardSkeleton, ChartSkeleton } from './components/shared/LoadingSkeleton'
import PDFExport from './components/shared/PDFExport'
import { useTrustList, useTrustData, useNationalAverages, useModelEvaluation, useRegionalRankings, useClusterAssignments, useShapGlobal } from './hooks/useDataLoader'
import { lookupPostcode, findNearestTrust } from './utils/postcodeSearch'

function Dashboard() {
  const [selectedTrust, setSelectedTrust] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('darkMode') === 'true' ||
        window.matchMedia('(prefers-color-scheme: dark)').matches
    }
    return false
  })

  const { data: trustList, loading: trustListLoading } = useTrustList()
  const { data: trustData, loading: trustLoading } = useTrustData(selectedTrust)
  const { data: nationalAverages } = useNationalAverages()
  const { data: modelEvaluation } = useModelEvaluation()
  const { data: regionalRankings } = useRegionalRankings()
  const { data: clusterData } = useClusterAssignments()
  const { data: shapGlobal } = useShapGlobal()

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
    localStorage.setItem('darkMode', darkMode)
  }, [darkMode])

  // Auto-select first trust when list loads
  useEffect(() => {
    if (trustList && trustList.length > 0 && !selectedTrust) {
      // Default to Royal Liverpool (RQ6) or first trust
      const defaultTrust = trustList.find(t => t.trust_code === 'REM') || trustList.find(t => t.trust_code === 'RQ6') || trustList[0]
      setSelectedTrust(defaultTrust.trust_code)
    }
  }, [trustList, selectedTrust])

  const handlePostcodeSearch = useCallback(async (postcode) => {
    if (!trustList) return
    try {
      const location = await lookupPostcode(postcode)
      const nearest = findNearestTrust(location.lat, location.lng, trustList)
      if (nearest) {
        setSelectedTrust(nearest.trust_code)
      }
    } catch {
      alert('Postcode not found. Please try again or select a trust from the dropdown.')
    }
  }, [trustList])

  const handleSelectTrust = useCallback((trustOrCode) => {
    // TrustSelector passes a trust object or null; postcode search passes a code string
    if (trustOrCode === null) {
      setSelectedTrust(null)
    } else if (typeof trustOrCode === 'string') {
      setSelectedTrust(trustOrCode)
    } else if (trustOrCode?.trust_code) {
      setSelectedTrust(trustOrCode.trust_code)
    }
  }, [])

  const trusts = trustList || []
  const selectedTrustInfo = trusts.find(t => t.trust_code === selectedTrust)
  const regionRanking = regionalRankings && selectedTrustInfo
    ? regionalRankings[selectedTrustInfo.region] || []
    : []

  return (
    <div className={`min-h-screen bg-white dark:bg-[#0F0F0F] text-text-primary dark:text-gray-100 transition-colors`}>
      <Header
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode(d => !d)}
        onPostcodeSearch={handlePostcodeSearch}
        trustData={trustData}
      />

      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 pb-12">
        <TrustSelector
          trusts={trusts}
          selectedTrust={selectedTrustInfo}
          onSelectTrust={handleSelectTrust}
          loading={trustListLoading}
        />

        <TabNav activeTab={activeTab} onTabChange={setActiveTab} />

        <div id="dashboard-content" className="mt-6 animate-fade-in" key={activeTab}>
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {trustLoading ? (
                <>
                  <ScoreboardSkeleton />
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <ChartSkeleton height="280px" />
                    <ChartSkeleton height="280px" />
                  </div>
                </>
              ) : trustData ? (
                <>
                  <div className="flex items-center justify-between">
                    <div />
                    <PDFExport trustData={trustData} />
                  </div>
                  <Scorecard scorecard={trustData.scorecard} />
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <ComplianceTrend complianceTrend={trustData.compliance_trend} />
                    <AttendanceVolume monthlyData={trustData.monthly_data} />
                  </div>
                </>
              ) : (
                <EmptyState />
              )}
            </div>
          )}

          {activeTab === 'patterns' && (
            <div className="space-y-6">
              {trustLoading ? (
                <>
                  <ChartSkeleton height="300px" />
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <ChartSkeleton height="350px" />
                    <ChartSkeleton height="350px" />
                  </div>
                </>
              ) : trustData ? (
                <>
                  <DayMonthHeatmap heatmap={trustData.heatmap} />
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <SeasonalDecomposition decomposition={trustData.seasonal_decomposition} />
                    <div className="space-y-6">
                      <WeatherScatter weatherCorrelation={trustData.weather_correlation} />
                      <BankHolidayImpact bankHolidayImpact={trustData.bank_holiday_impact} />
                    </div>
                  </div>
                </>
              ) : (
                <EmptyState />
              )}
            </div>
          )}

          {activeTab === 'ml-insights' && (
            <div className="space-y-6">
              {trustLoading ? (
                <>
                  <ChartSkeleton height="200px" />
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <ChartSkeleton height="300px" />
                    <ChartSkeleton height="300px" />
                  </div>
                </>
              ) : trustData ? (
                <>
                  <PredictionPanel
                    predictionsGrid={trustData.predictions_grid}
                    trustName={trustData.trust_name}
                  />
                  <BestTimeToGo predictionsGrid={trustData.predictions_grid} />
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <ShapWaterfall shapFeatures={trustData.shap_features} />
                    <FeatureImportance features={shapGlobal?.feature_importance || trustData.shap_features?.global || []} />
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <ModelLeaderboard evaluation={modelEvaluation} />
                    <AnomalyFlags anomalies={trustData.anomalies} />
                  </div>
                  <WhatIfScenario predictionsGrid={trustData.predictions_grid} />
                </>
              ) : (
                <EmptyState />
              )}
            </div>
          )}

          {activeTab === 'compare' && (
            <div className="space-y-6">
              {trustLoading ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <ChartSkeleton height="300px" />
                  <ChartSkeleton height="300px" />
                </div>
              ) : trustData ? (
                <>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <TrustVsNational trustData={trustData} nationalAverages={nationalAverages} />
                    <RegionalRanking rankings={regionRanking} selectedTrustCode={selectedTrust} />
                  </div>
                  <TrustClusters clusterData={clusterData} selectedTrustCode={selectedTrust} trustList={trustList} />
                </>
              ) : (
                <EmptyState />
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="mt-12 pt-6 border-t border-gray-200 dark:border-gray-700 text-center text-xs text-text-secondary dark:text-gray-500">
          <p>Data covers: April 2020 — February 2026 | Last updated: March 2026</p>
          <p className="mt-1">Model trained on 6 years of historical data across 159 trusts</p>
          <p className="mt-2">
            Built by Anirudh — MSc Data Science and Artificial Intelligence, University of Liverpool
          </p>
        </footer>
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="text-center py-16 text-text-secondary dark:text-gray-400">
      <p className="text-lg">Select a trust to view analytics</p>
      <p className="text-sm mt-2">Choose from the dropdown above or search by postcode</p>
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/about" element={<AboutPage />} />
    </Routes>
  )
}
