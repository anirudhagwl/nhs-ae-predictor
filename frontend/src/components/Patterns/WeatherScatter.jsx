import { useMemo } from 'react'
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import ChartWrapper from '../shared/ChartWrapper'

export default function WeatherScatter({ weatherCorrelation }) {
  const { points, trendlineData } = useMemo(() => {
    if (!weatherCorrelation || !weatherCorrelation.points) {
      return { points: null, trendlineData: null }
    }

    const pts = weatherCorrelation.points
    const tl = weatherCorrelation.trendline

    let tlData = null
    if (tl && tl.slope != null && tl.intercept != null && pts.length > 0) {
      const temps = pts.map((p) => p.temp)
      const minTemp = Math.min(...temps)
      const maxTemp = Math.max(...temps)
      tlData = [
        { temp: minTemp, attendances: tl.slope * minTemp + tl.intercept },
        { temp: maxTemp, attendances: tl.slope * maxTemp + tl.intercept },
      ]
    }

    return { points: pts, trendlineData: tlData }
  }, [weatherCorrelation])

  if (!points) {
    return (
      <ChartWrapper title="Temperature vs Attendance">
        <p className="text-sm text-text-secondary dark:text-gray-400">No weather correlation data available.</p>
      </ChartWrapper>
    )
  }

  const correlationR = weatherCorrelation.correlation_r

  return (
    <ChartWrapper title="Temperature vs Attendance">
      <div className="relative">
        {correlationR != null && (
          <div className="absolute top-0 right-2 z-10 bg-white/90 dark:bg-gray-800/90 border border-gray-200 dark:border-gray-600 rounded px-2 py-1">
            <span className="text-xs font-mono font-medium text-text-secondary dark:text-gray-300">
              r = {correlationR.toFixed(2)}
            </span>
          </div>
        )}
        <ResponsiveContainer width="100%" height={280}>
          <ScatterChart margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis
              dataKey="temp"
              type="number"
              name="Temperature"
              unit="\u00B0C"
              tick={{ fontSize: 11, fill: '#6B7280' }}
              axisLine={{ stroke: '#E5E7EB' }}
              label={{
                value: 'Temperature (\u00B0C)',
                position: 'insideBottom',
                offset: -2,
                fontSize: 11,
                fill: '#6B7280',
              }}
            />
            <YAxis
              dataKey="attendances"
              type="number"
              name="Attendances"
              tick={{ fontSize: 11, fill: '#6B7280' }}
              axisLine={{ stroke: '#E5E7EB' }}
              width={55}
              label={{
                value: 'Attendances',
                angle: -90,
                position: 'insideLeft',
                offset: 10,
                fontSize: 11,
                fill: '#6B7280',
              }}
            />
            <Tooltip
              cursor={{ strokeDasharray: '3 3' }}
              contentStyle={{
                fontSize: 12,
                backgroundColor: 'white',
                border: '1px solid #E5E7EB',
                borderRadius: 6,
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              }}
              formatter={(value, name) => {
                if (name === 'Temperature') return [`${value}\u00B0C`, 'Temperature']
                return [value, 'Attendances']
              }}
            />
            <Scatter
              data={points}
              fill="#2563EB"
              fillOpacity={0.6}
              r={5}
            />
            {trendlineData && (
              <Scatter
                data={trendlineData}
                fill="none"
                line={{ stroke: '#2563EB', strokeWidth: 1.5, strokeDasharray: '6 3' }}
                lineType="joint"
                shape={() => null}
              />
            )}
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </ChartWrapper>
  )
}
