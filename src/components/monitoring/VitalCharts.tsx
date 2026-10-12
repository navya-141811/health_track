/**
 * VitalCharts — dark-mode vital signs display.
 *
 * Heart Rate: ECG-style chart — sharp peaks, bright green line on black,
 *             hospital monitor aesthetic.
 * Temperature + SpO2: clean dark charts with threshold lines and
 *                     abnormal/emergency point highlighting.
 *
 * Alert levels per point:
 *   normal    → colored dot
 *   abnormal  → orange dot
 *   emergency → red pulsing dot
 */
import {
  CartesianGrid,
  Label,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { PatientProfile, VitalReading } from '../../types'

interface Props {
  readings: VitalReading[]
  patient: PatientProfile
}

type AlertLevel = 'normal' | 'abnormal' | 'emergency'

interface ChartPoint {
  time: string
  value: number
  alert: AlertLevel
}

function getAlertLevel(
  value: number,
  upper: number | null,
  lower: number,
  emergencyMargin: number,
): AlertLevel {
  const aboveUpper = upper !== null && value > upper
  const belowLower = value < lower
  if (!aboveUpper && !belowLower) return 'normal'
  if (upper !== null && value > upper + emergencyMargin) return 'emergency'
  if (value < lower - emergencyMargin) return 'emergency'
  return 'abnormal'
}

function toChartData(
  readings: VitalReading[],
  key: 'heart_rate_bpm' | 'temperature_c' | 'spo2_pct',
  upper: number | null,
  lower: number,
  emergencyMargin: number,
): ChartPoint[] {
  return readings.map((r) => ({
    time: new Date(r.timestamp).toLocaleTimeString(),
    value: r[key],
    alert: getAlertLevel(r[key], upper, lower, emergencyMargin),
  }))
}

function AlertDot(props: { cx?: number; cy?: number; payload?: ChartPoint; normalColor: string }) {
  const { cx = 0, cy = 0, payload, normalColor } = props
  if (!payload) return null
  if (payload.alert === 'emergency') {
    return (
      <g>
        <circle cx={cx} cy={cy} r={7} fill="#dc2626" opacity={0.2} />
        <circle cx={cx} cy={cy} r={4} fill="#ef4444" stroke="#111" strokeWidth={1} />
      </g>
    )
  }
  if (payload.alert === 'abnormal') {
    return <circle cx={cx} cy={cy} r={3.5} fill="#f97316" stroke="#111" strokeWidth={1} />
  }
  return <circle cx={cx} cy={cy} r={2.5} fill={normalColor} />
}

// ── ECG Heart Rate Chart ──────────────────────────────────────────────────────

interface EcgProps {
  data: ChartPoint[]
  baseline: number
  upperThreshold: number
  lowerThreshold: number
  domain: [number, number]
  latestValue: number | null
  alertLevel: AlertLevel
}

function EcgChart({ data, baseline, upperThreshold, lowerThreshold, domain, latestValue, alertLevel }: EcgProps) {
  const isEmpty = data.length === 0

  const lineColor =
    alertLevel === 'emergency' ? '#dc2626' :
    alertLevel === 'abnormal'  ? '#f97316' :
    '#0ea5e9'   // sky blue — clear on white background

  const glowColor =
    alertLevel === 'emergency' ? 'rgba(239,68,68,0.4)' :
    alertLevel === 'abnormal'  ? 'rgba(249,115,22,0.3)' :
    'rgba(34,197,94,0.25)'

  return (
    <div className={`rounded-xl border bg-white p-4 relative overflow-hidden
      ${alertLevel === 'emergency' ? 'border-red-400 shadow-lg shadow-red-100' :
        alertLevel === 'abnormal' ? 'border-orange-300' :
        'border-gray-200'}`}>

      {/* Header */}
      <div className="flex items-center justify-between mb-2 relative z-10">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold tracking-widest text-gray-600 uppercase">Heart Rate</span>
          {alertLevel === 'emergency' && (
            <span className="text-xs font-bold text-red-600 animate-pulse">⚠ CRITICAL</span>
          )}
          {alertLevel === 'abnormal' && (
            <span className="text-xs font-bold text-orange-500">⚠ ABNORMAL</span>
          )}
        </div>
        {/* Big live number */}
        <div className="text-right">
          <span className={`text-4xl font-bold font-mono leading-none
            ${alertLevel === 'emergency' ? 'text-red-600' :
              alertLevel === 'abnormal' ? 'text-orange-500' :
              'text-gray-900'}`}>
            {latestValue ?? '---'}
          </span>
          <span className="text-xs text-gray-400 ml-1">BPM</span>
        </div>
      </div>

      {isEmpty ? (
        <div className="h-36 flex items-center justify-center">
          <span className="text-gray-400 text-sm animate-pulse">Waiting for signal…</span>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={150}>
          <LineChart data={data} margin={{ top: 8, right: 10, bottom: 0, left: -10 }}>
            <CartesianGrid strokeDasharray="3 8" stroke="#f3f4f6" vertical={false} />
            <XAxis
              dataKey="time"
              tick={{ fontSize: 9, fill: '#9ca3af' }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={domain}
              tick={{ fontSize: 9, fill: '#9ca3af' }}
              axisLine={false}
              tickLine={false}
              width={30}
            />
            <Tooltip
              contentStyle={{ background: '#fff', border: '1px solid #e5e7eb', fontSize: 11, color: '#111827' }}
              formatter={(v: number) => [`${v} BPM`, 'Heart Rate']}
              labelFormatter={(l) => `Time: ${l}`}
              itemStyle={{ color: lineColor }}
            />

            {/* Threshold lines */}
            <ReferenceLine y={upperThreshold} stroke="#fca5a5" strokeDasharray="4 4" strokeWidth={1}>
              <Label value={`${upperThreshold}`} position="insideTopRight" fontSize={8} fill="#ef4444" />
            </ReferenceLine>
            <ReferenceLine y={lowerThreshold} stroke="#fca5a5" strokeDasharray="4 4" strokeWidth={1}>
              <Label value={`${lowerThreshold}`} position="insideBottomRight" fontSize={8} fill="#ef4444" />
            </ReferenceLine>
            <ReferenceLine y={baseline} stroke="#d1fae5" strokeDasharray="6 4" strokeWidth={1} />

            {/* ECG line — linear for sharp peaks */}
            <Line
              type="linear"
              dataKey="value"
              stroke={lineColor}
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 4, fill: lineColor, stroke: '#fff' }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}

// ── Standard dark chart for Temp / SpO2 ──────────────────────────────────────

interface DarkChartProps {
  title: string
  unit: string
  data: ChartPoint[]
  baseline: number
  upperThreshold: number | null
  lowerThreshold: number
  color: string
  domain: [number, number]
  decimals: number
  latestValue: number | null
  alertLevel: AlertLevel
}

function DarkChart({
  title, unit, data, baseline, upperThreshold, lowerThreshold,
  color, domain, decimals, latestValue, alertLevel,
}: DarkChartProps) {
  const isEmpty = data.length === 0

  const borderClass =
    alertLevel === 'emergency' ? 'border-red-400 shadow-md shadow-red-100' :
    alertLevel === 'abnormal'  ? 'border-orange-300' :
    'border-gray-200'

  const valueColor =
    alertLevel === 'emergency' ? 'text-red-600' :
    alertLevel === 'abnormal'  ? 'text-orange-500' :
    'text-gray-900'

  return (
    <div className={`rounded-xl border bg-white p-4 ${borderClass}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">{title}</span>
          {alertLevel === 'emergency' && (
            <span className="text-xs font-bold text-red-600 animate-pulse">⚠ CRITICAL</span>
          )}
          {alertLevel === 'abnormal' && (
            <span className="text-xs font-bold text-orange-500">⚠ ABNORMAL</span>
          )}
        </div>
        <div className="text-right">
          <span className={`text-2xl font-bold font-mono leading-none ${valueColor}`}>
            {latestValue !== null ? latestValue.toFixed(decimals) : '---'}
          </span>
          <span className="text-xs text-gray-400 ml-1">{unit}</span>
        </div>
      </div>

      {isEmpty ? (
        <div className="h-28 flex items-center justify-center">
          <span className="text-gray-400 text-sm animate-pulse">Waiting for readings…</span>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={130}>
          <LineChart data={data} margin={{ top: 8, right: 10, bottom: 0, left: -10 }}>
            <CartesianGrid strokeDasharray="3 8" stroke="#f3f4f6" vertical={false} />
            <XAxis
              dataKey="time"
              tick={{ fontSize: 9, fill: '#9ca3af' }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={domain}
              tick={{ fontSize: 9, fill: '#9ca3af' }}
              axisLine={false}
              tickLine={false}
              width={30}
              tickFormatter={(v: number) => v.toFixed(decimals)}
            />
            <Tooltip
              contentStyle={{ background: '#fff', border: '1px solid #e5e7eb', fontSize: 11, color: '#111827' }}
              formatter={(v: number) => [`${v.toFixed(decimals)} ${unit}`, title]}
              labelFormatter={(l) => `Time: ${l}`}
            />

            {upperThreshold !== null && (
              <ReferenceLine y={upperThreshold} stroke="#7f1d1d" strokeDasharray="4 3" strokeWidth={1}>
                <Label value={`${upperThreshold}`} position="insideTopRight" fontSize={8} fill="#991b1b" />
              </ReferenceLine>
            )}
            <ReferenceLine y={lowerThreshold} stroke="#7f1d1d" strokeDasharray="4 3" strokeWidth={1}>
              <Label value={`${lowerThreshold}`} position="insideBottomRight" fontSize={8} fill="#991b1b" />
            </ReferenceLine>
            <ReferenceLine y={baseline} stroke="#374151" strokeDasharray="6 4" strokeWidth={1} />

            <Line
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              dot={(props) => (
                <AlertDot
                  key={`dot-${props.index}`}
                  cx={props.cx}
                  cy={props.cy}
                  payload={props.payload as ChartPoint}
                  normalColor={color}
                />
              )}
              activeDot={{ r: 5, fill: color, stroke: '#111' }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────

export function VitalCharts({ readings, patient }: Props) {
  const hrData   = toChartData(readings, 'heart_rate_bpm', patient.threshold_hr_upper,   patient.threshold_hr_lower,   15)
  const tempData = toChartData(readings, 'temperature_c',  patient.threshold_temp_upper,  patient.threshold_temp_lower,  0.5)
  const spo2Data = toChartData(readings, 'spo2_pct',       null,                          patient.threshold_spo2_lower,  3)

  const hrMin   = hrData.length   ? Math.min(...hrData.map((d) => d.value))   : patient.baseline_hr_bpm
  const hrMax   = hrData.length   ? Math.max(...hrData.map((d) => d.value))   : patient.baseline_hr_bpm
  const tempMin = tempData.length ? Math.min(...tempData.map((d) => d.value)) : patient.baseline_temp_c
  const tempMax = tempData.length ? Math.max(...tempData.map((d) => d.value)) : patient.baseline_temp_c
  const spo2Min = spo2Data.length ? Math.min(...spo2Data.map((d) => d.value)) : patient.baseline_spo2_pct
  const spo2Max = spo2Data.length ? Math.max(...spo2Data.map((d) => d.value)) : patient.baseline_spo2_pct

  const latestHr   = hrData.length   ? hrData[hrData.length - 1].value   : null
  const latestTemp = tempData.length ? tempData[tempData.length - 1].value : null
  const latestSpo2 = spo2Data.length ? spo2Data[spo2Data.length - 1].value : null

  const hrAlert   = hrData.length   ? hrData[hrData.length - 1].alert   : 'normal'
  const tempAlert = tempData.length ? tempData[tempData.length - 1].alert : 'normal'
  const spo2Alert = spo2Data.length ? spo2Data[spo2Data.length - 1].alert : 'normal'

  return (
    <div className="flex flex-col gap-4">
      {/* ECG — Heart Rate */}
      <EcgChart
        data={hrData}
        baseline={patient.baseline_hr_bpm}
        upperThreshold={patient.threshold_hr_upper}
        lowerThreshold={patient.threshold_hr_lower}
        domain={[
          Math.min(patient.threshold_hr_lower - 10, hrMin - 5),
          Math.max(patient.threshold_hr_upper + 10, hrMax + 5),
        ]}
        latestValue={latestHr}
        alertLevel={hrAlert}
      />

      {/* Temperature + SpO2 side by side */}
      <div className="grid grid-cols-2 gap-4">
        <DarkChart
          title="Temperature"
          unit="°C"
          data={tempData}
          baseline={patient.baseline_temp_c}
          upperThreshold={patient.threshold_temp_upper}
          lowerThreshold={patient.threshold_temp_lower}
          color="#f97316"
          domain={[
            Math.min(patient.threshold_temp_lower - 0.5, tempMin - 0.2),
            Math.max(patient.threshold_temp_upper + 0.5, tempMax + 0.2),
          ]}
          decimals={1}
          latestValue={latestTemp}
          alertLevel={tempAlert}
        />
        <DarkChart
          title="SpO2"
          unit="%"
          data={spo2Data}
          baseline={patient.baseline_spo2_pct}
          upperThreshold={null}
          lowerThreshold={patient.threshold_spo2_lower}
          color="#818cf8"
          domain={[
            Math.min(patient.threshold_spo2_lower - 3, spo2Min - 1),
            Math.min(100, Math.max(patient.baseline_spo2_pct + 3, spo2Max + 1)),
          ]}
          decimals={0}
          latestValue={latestSpo2}
          alertLevel={spo2Alert}
        />
      </div>
    </div>
  )
}
