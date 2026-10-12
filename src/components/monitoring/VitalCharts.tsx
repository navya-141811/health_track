/**
 * VitalCharts -- three separate time-series charts stacked vertically.
 *
 *   1. Heart Rate (BPM)
 *   2. Body Temperature (°C)
 *   3. Blood Oxygen / SpO2 (%)
 *
 * Separate charts because all three metrics have different units and scales.
 * Each chart shows the reading line, patient reference baseline, and
 * upper/lower threshold lines where applicable.
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

interface ChartPoint {
  time: string
  value: number
}

function toChartData(
  readings: VitalReading[],
  key: 'heart_rate_bpm' | 'temperature_c' | 'spo2_pct',
): ChartPoint[] {
  return readings.map((r) => ({
    time: new Date(r.timestamp).toLocaleTimeString(),
    value: r[key],
  }))
}

export function VitalCharts({ readings, patient }: Props) {
  const hrData   = toChartData(readings, 'heart_rate_bpm')
  const tempData = toChartData(readings, 'temperature_c')
  const spo2Data = toChartData(readings, 'spo2_pct')

  // Safe domain calculations that handle empty arrays
  const hrMin   = hrData.length   ? Math.min(...hrData.map((d) => d.value))   : patient.baseline_hr_bpm
  const hrMax   = hrData.length   ? Math.max(...hrData.map((d) => d.value))   : patient.baseline_hr_bpm
  const tempMin = tempData.length ? Math.min(...tempData.map((d) => d.value)) : patient.baseline_temp_c
  const tempMax = tempData.length ? Math.max(...tempData.map((d) => d.value)) : patient.baseline_temp_c
  const spo2Min = spo2Data.length ? Math.min(...spo2Data.map((d) => d.value)) : patient.baseline_spo2_pct
  const spo2Max = spo2Data.length ? Math.max(...spo2Data.map((d) => d.value)) : patient.baseline_spo2_pct

  return (
    <div className="flex flex-col gap-4">
      <ChartCard
        title="Heart Rate"
        unit="BPM"
        data={hrData}
        baseline={patient.baseline_hr_bpm}
        upperThreshold={patient.threshold_hr_upper}
        lowerThreshold={patient.threshold_hr_lower}
        color="#0ea5e9"
        domain={[
          Math.min(patient.threshold_hr_lower - 10, hrMin - 5),
          Math.max(patient.threshold_hr_upper + 10, hrMax + 5),
        ]}
        decimals={0}
      />
      <ChartCard
        title="Body Temperature"
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
      />
      <ChartCard
        title="Oxygen Saturation (SpO2)"
        unit="%"
        data={spo2Data}
        baseline={patient.baseline_spo2_pct}
        // SpO2 only has a lower threshold — no upper limit
        upperThreshold={null}
        lowerThreshold={patient.threshold_spo2_lower}
        color="#8b5cf6"
        domain={[
          Math.min(patient.threshold_spo2_lower - 3, spo2Min - 1),
          Math.min(100, Math.max(patient.baseline_spo2_pct + 3, spo2Max + 1)),
        ]}
        decimals={0}
      />
    </div>
  )
}

interface ChartCardProps {
  title: string
  unit: string
  data: ChartPoint[]
  baseline: number
  upperThreshold: number | null
  lowerThreshold: number
  color: string
  domain: [number, number]
  decimals: number
}

function ChartCard({
  title,
  unit,
  data,
  baseline,
  upperThreshold,
  lowerThreshold,
  color,
  domain,
  decimals,
}: ChartCardProps) {
  const isEmpty = data.length === 0

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
        <span className="text-xs text-gray-400 italic">Synthetic data — demo only</span>
      </div>

      {isEmpty ? (
        <div className="flex h-36 items-center justify-center text-sm text-gray-400">
          Start the simulation to see readings here.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={170}>
          <LineChart data={data} margin={{ top: 12, right: 20, bottom: 4, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="time"
              tick={{ fontSize: 10, fill: '#9ca3af' }}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={domain}
              tick={{ fontSize: 10, fill: '#9ca3af' }}
              tickFormatter={(v: number) => v.toFixed(decimals)}
              width={38}
            />
            <Tooltip
              formatter={(value: number) => [
                `${value.toFixed(decimals)} ${unit}`,
                title,
              ]}
              labelFormatter={(label) => `Time: ${label}`}
              contentStyle={{ fontSize: 12 }}
            />

            {/* Patient baseline reference */}
            <ReferenceLine y={baseline} stroke="#9ca3af" strokeDasharray="6 3" strokeWidth={1}>
              <Label
                value={`Patient ref: ${baseline.toFixed(decimals)} ${unit}`}
                position="insideTopRight"
                fontSize={9}
                fill="#9ca3af"
              />
            </ReferenceLine>

            {/* Upper threshold (not shown for SpO2) */}
            {upperThreshold !== null && (
              <ReferenceLine y={upperThreshold} stroke="#ef4444" strokeDasharray="4 2" strokeWidth={1.5}>
                <Label
                  value={`Upper limit: ${upperThreshold} ${unit}`}
                  position="insideTopRight"
                  fontSize={9}
                  fill="#ef4444"
                />
              </ReferenceLine>
            )}

            {/* Lower threshold */}
            <ReferenceLine y={lowerThreshold} stroke="#f97316" strokeDasharray="4 2" strokeWidth={1.5}>
              <Label
                value={`Lower limit: ${lowerThreshold} ${unit}`}
                position="insideBottomRight"
                fontSize={9}
                fill="#f97316"
              />
            </ReferenceLine>

            <Line
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              dot={{ r: 3, fill: color, strokeWidth: 0 }}
              activeDot={{ r: 5 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
