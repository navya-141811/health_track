/**
 * VitalCharts — light-theme vital signs display.
 * HR full-width ECG, Temp+SpO2 side-by-side on md+, stacked on mobile.
 * Includes chart legend, polished alert badges, shadowed tooltips.
 */
import {
  CartesianGrid, Label, Line, LineChart, ReferenceLine,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import type { PatientProfile, VitalReading } from '../../types'

interface Props { readings: VitalReading[]; patient: PatientProfile }

type AlertLevel = 'normal' | 'abnormal' | 'emergency'
interface ChartPoint { time: string; value: number; alert: AlertLevel }

function getAlertLevel(value: number, upper: number | null, lower: number, margin: number): AlertLevel {
  const aboveUpper = upper !== null && value > upper
  const belowLower = value < lower
  if (!aboveUpper && !belowLower) return 'normal'
  if (upper !== null && value > upper + margin) return 'emergency'
  if (value < lower - margin) return 'emergency'
  return 'abnormal'
}

function toChartData(readings: VitalReading[], key: 'heart_rate_bpm' | 'temperature_c' | 'spo2_pct',
  upper: number | null, lower: number, margin: number): ChartPoint[] {
  return readings.map((r) => ({ time: new Date(r.timestamp).toLocaleTimeString(), value: r[key], alert: getAlertLevel(r[key], upper, lower, margin) }))
}

function AlertDot(props: { cx?: number; cy?: number; payload?: ChartPoint; normalColor: string }) {
  const { cx = 0, cy = 0, payload, normalColor } = props
  if (!payload) return null
  if (payload.alert === 'emergency') return (
    <g><circle cx={cx} cy={cy} r={7} fill="#dc2626" opacity={0.2} /><circle cx={cx} cy={cy} r={4} fill="#ef4444" stroke="#fff" strokeWidth={1} /></g>
  )
  if (payload.alert === 'abnormal') return <circle cx={cx} cy={cy} r={3.5} fill="#f97316" stroke="#fff" strokeWidth={1} />
  return <circle cx={cx} cy={cy} r={2.5} fill={normalColor} />
}

function AlertBadge({ level }: { level: AlertLevel }) {
  if (level === 'emergency') return (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold text-white animate-pulse">
      <span className="h-1.5 w-1.5 rounded-full bg-white" />CRITICAL
    </span>
  )
  if (level === 'abnormal') return (
    <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 border border-orange-300 px-2 py-0.5 text-[10px] font-bold text-orange-700">
      <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />ABNORMAL
    </span>
  )
  return null
}

function ChartLegend({ hasUpper }: { hasUpper: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 px-1">
      {hasUpper && (
        <span className="flex items-center gap-1.5 text-[10px] text-gray-400">
          <svg width="18" height="6"><line x1="0" y1="3" x2="18" y2="3" stroke="#fca5a5" strokeDasharray="4,3" strokeWidth="1.5"/></svg>
          Upper limit
        </span>
      )}
      <span className="flex items-center gap-1.5 text-[10px] text-gray-400">
        <svg width="18" height="6"><line x1="0" y1="3" x2="18" y2="3" stroke="#fca5a5" strokeDasharray="4,3" strokeWidth="1.5"/></svg>
        Lower limit
      </span>
      <span className="flex items-center gap-1.5 text-[10px] text-gray-400">
        <svg width="18" height="6"><line x1="0" y1="3" x2="18" y2="3" stroke="#d1fae5" strokeDasharray="6,4" strokeWidth="1.5"/></svg>
        Baseline
      </span>
      <span className="flex items-center gap-1.5 text-[10px] text-gray-400">
        <span className="h-2.5 w-2.5 rounded-full bg-orange-400 inline-block" />Abnormal
      </span>
      <span className="flex items-center gap-1.5 text-[10px] text-gray-400">
        <span className="h-2.5 w-2.5 rounded-full bg-red-500 inline-block" />Critical
      </span>
    </div>
  )
}

interface TooltipPayload { value: number }
function CustomTooltip({ active, payload, label, unit, decimals }: {
  active?: boolean; payload?: TooltipPayload[]; label?: string; unit: string; decimals: number
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-lg shadow-gray-200/80 text-xs">
      <p className="text-gray-500 mb-1">Time: {label}</p>
      <p className="font-semibold text-gray-800">{payload[0].value.toFixed(decimals)} {unit}</p>
    </div>
  )
}

function EcgChart({ data, baseline, upperThreshold, lowerThreshold, domain, latestValue, alertLevel }: {
  data: ChartPoint[]; baseline: number; upperThreshold: number; lowerThreshold: number
  domain: [number, number]; latestValue: number | null; alertLevel: AlertLevel
}) {
  const isEmpty = data.length === 0
  const lineColor = alertLevel === 'emergency' ? '#dc2626' : alertLevel === 'abnormal' ? '#f97316' : '#0ea5e9'
  const borderClass = alertLevel === 'emergency' ? 'border-red-300 shadow-lg shadow-red-100' : alertLevel === 'abnormal' ? 'border-orange-300' : 'border-gray-200'

  return (
    <div className={`rounded-xl border bg-white p-4 ${borderClass}`}>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold tracking-widest text-gray-500 uppercase">Heart Rate</span>
          <AlertBadge level={alertLevel} />
        </div>
        <div className="text-right">
          <span className={`text-4xl font-bold font-mono leading-none ${alertLevel === 'emergency' ? 'text-red-600' : alertLevel === 'abnormal' ? 'text-orange-500' : 'text-gray-900'}`}>
            {latestValue ?? '---'}
          </span>
          <span className="text-xs text-gray-400 ml-1">BPM</span>
        </div>
      </div>
      <ChartLegend hasUpper={true} />
      {isEmpty ? (
        <div className="h-36 flex items-center justify-center">
          <span className="text-gray-400 text-sm animate-pulse">Waiting for signal…</span>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={150}>
          <LineChart data={data} margin={{ top: 8, right: 10, bottom: 0, left: -10 }}>
            <CartesianGrid strokeDasharray="3 8" stroke="#f3f4f6" vertical={false} />
            <XAxis dataKey="time" tick={{ fontSize: 9, fill: '#9ca3af' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
            <YAxis domain={domain} tick={{ fontSize: 9, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={30} />
            <Tooltip content={<CustomTooltip unit="BPM" decimals={0} />} />
            <ReferenceLine y={upperThreshold} stroke="#fca5a5" strokeDasharray="4 4" strokeWidth={1}>
              <Label value={`${upperThreshold}`} position="insideTopRight" fontSize={8} fill="#ef4444" />
            </ReferenceLine>
            <ReferenceLine y={lowerThreshold} stroke="#fca5a5" strokeDasharray="4 4" strokeWidth={1}>
              <Label value={`${lowerThreshold}`} position="insideBottomRight" fontSize={8} fill="#ef4444" />
            </ReferenceLine>
            <ReferenceLine y={baseline} stroke="#d1fae5" strokeDasharray="6 4" strokeWidth={1} />
            <Line type="linear" dataKey="value" stroke={lineColor} strokeWidth={2.5}
              dot={false} activeDot={{ r: 4, fill: lineColor, stroke: '#fff' }} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}

function MetricChart({ title, unit, data, baseline, upperThreshold, lowerThreshold, color, domain, decimals, latestValue, alertLevel }: {
  title: string; unit: string; data: ChartPoint[]; baseline: number
  upperThreshold: number | null; lowerThreshold: number; color: string
  domain: [number, number]; decimals: number; latestValue: number | null; alertLevel: AlertLevel
}) {
  const isEmpty = data.length === 0
  const borderClass = alertLevel === 'emergency' ? 'border-red-300 shadow-md shadow-red-100' : alertLevel === 'abnormal' ? 'border-orange-300' : 'border-gray-200'
  const valueColor = alertLevel === 'emergency' ? 'text-red-600' : alertLevel === 'abnormal' ? 'text-orange-500' : 'text-gray-900'

  return (
    <div className={`rounded-xl border bg-white p-4 ${borderClass}`}>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{title}</span>
          <AlertBadge level={alertLevel} />
        </div>
        <div className="text-right">
          <span className={`text-2xl font-bold font-mono leading-none ${valueColor}`}>
            {latestValue !== null ? latestValue.toFixed(decimals) : '---'}
          </span>
          <span className="text-xs text-gray-400 ml-1">{unit}</span>
        </div>
      </div>
      <ChartLegend hasUpper={upperThreshold !== null} />
      {isEmpty ? (
        <div className="h-28 flex items-center justify-center">
          <span className="text-gray-400 text-sm animate-pulse">Waiting for readings…</span>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={130}>
          <LineChart data={data} margin={{ top: 8, right: 10, bottom: 0, left: -10 }}>
            <CartesianGrid strokeDasharray="3 8" stroke="#f3f4f6" vertical={false} />
            <XAxis dataKey="time" tick={{ fontSize: 9, fill: '#9ca3af' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
            <YAxis domain={domain} tick={{ fontSize: 9, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={30} tickFormatter={(v: number) => v.toFixed(decimals)} />
            <Tooltip content={<CustomTooltip unit={unit} decimals={decimals} />} />
            {upperThreshold !== null && (
              <ReferenceLine y={upperThreshold} stroke="#fca5a5" strokeDasharray="4 3" strokeWidth={1}>
                <Label value={`${upperThreshold}`} position="insideTopRight" fontSize={8} fill="#ef4444" />
              </ReferenceLine>
            )}
            <ReferenceLine y={lowerThreshold} stroke="#fca5a5" strokeDasharray="4 3" strokeWidth={1}>
              <Label value={`${lowerThreshold}`} position="insideBottomRight" fontSize={8} fill="#ef4444" />
            </ReferenceLine>
            <ReferenceLine y={baseline} stroke="#d1fae5" strokeDasharray="6 4" strokeWidth={1} />
            <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2}
              dot={(props) => (<AlertDot key={`dot-${props.index}`} cx={props.cx} cy={props.cy} payload={props.payload as ChartPoint} normalColor={color} />)}
              activeDot={{ r: 5, fill: color, stroke: '#fff' }} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}

export function VitalCharts({ readings, patient }: Props) {
  const hrData   = toChartData(readings, 'heart_rate_bpm', patient.threshold_hr_upper,  patient.threshold_hr_lower,  15)
  const tempData = toChartData(readings, 'temperature_c',  patient.threshold_temp_upper, patient.threshold_temp_lower, 0.5)
  const spo2Data = toChartData(readings, 'spo2_pct',       null,                         patient.threshold_spo2_lower, 3)

  const hrMin   = hrData.length   ? Math.min(...hrData.map((d) => d.value))   : patient.baseline_hr_bpm
  const hrMax   = hrData.length   ? Math.max(...hrData.map((d) => d.value))   : patient.baseline_hr_bpm
  const tempMin = tempData.length ? Math.min(...tempData.map((d) => d.value)) : patient.baseline_temp_c
  const tempMax = tempData.length ? Math.max(...tempData.map((d) => d.value)) : patient.baseline_temp_c
  const spo2Min = spo2Data.length ? Math.min(...spo2Data.map((d) => d.value)) : patient.baseline_spo2_pct
  const spo2Max = spo2Data.length ? Math.max(...spo2Data.map((d) => d.value)) : patient.baseline_spo2_pct

  const latestHr   = hrData.length   ? hrData[hrData.length - 1].value    : null
  const latestTemp = tempData.length ? tempData[tempData.length - 1].value : null
  const latestSpo2 = spo2Data.length ? spo2Data[spo2Data.length - 1].value : null

  const hrAlert   = hrData.length   ? hrData[hrData.length - 1].alert    : 'normal'
  const tempAlert = tempData.length ? tempData[tempData.length - 1].alert : 'normal'
  const spo2Alert = spo2Data.length ? spo2Data[spo2Data.length - 1].alert : 'normal'

  return (
    <div className="flex flex-col gap-4">
      <EcgChart data={hrData} baseline={patient.baseline_hr_bpm}
        upperThreshold={patient.threshold_hr_upper} lowerThreshold={patient.threshold_hr_lower}
        domain={[Math.min(patient.threshold_hr_lower - 10, hrMin - 5), Math.max(patient.threshold_hr_upper + 10, hrMax + 5)]}
        latestValue={latestHr} alertLevel={hrAlert} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <MetricChart title="Temperature" unit="°C" data={tempData} baseline={patient.baseline_temp_c}
          upperThreshold={patient.threshold_temp_upper} lowerThreshold={patient.threshold_temp_lower} color="#f97316"
          domain={[Math.min(patient.threshold_temp_lower - 0.5, tempMin - 0.2), Math.max(patient.threshold_temp_upper + 0.5, tempMax + 0.2)]}
          decimals={1} latestValue={latestTemp} alertLevel={tempAlert} />
        <MetricChart title="SpO2" unit="%" data={spo2Data} baseline={patient.baseline_spo2_pct}
          upperThreshold={null} lowerThreshold={patient.threshold_spo2_lower} color="#818cf8"
          domain={[Math.min(patient.threshold_spo2_lower - 3, spo2Min - 1), Math.min(100, Math.max(patient.baseline_spo2_pct + 3, spo2Max + 1))]}
          decimals={0} latestValue={latestSpo2} alertLevel={spo2Alert} />
      </div>
    </div>
  )
}
