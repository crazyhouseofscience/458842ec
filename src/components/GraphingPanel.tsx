import React, { useState, useEffect, useRef } from 'react';
import { ElectroObject, ProbeData, GraphType, GraphPoint } from '../types/electrostatics';
import { calculateElectricField, calculateElectricPotential } from '../physics/electrostaticsEngine';
import { Activity, BarChart2, TrendingUp, Zap, Sliders } from 'lucide-react';

interface GraphingPanelProps {
  objects: ElectroObject[];
  probeData: ProbeData;
}

export const GraphingPanel: React.FC<GraphingPanelProps> = ({ objects, probeData }) => {
  const [graphType, setGraphType] = useState<GraphType>('voltage_pos');
  const timeHistoryRef = useRef<Array<{ time: number; V: number; E: number }>>([]);
  const [timePoints, setTimePoints] = useState<Array<{ time: number; V: number; E: number }>>([]);

  // Stream live probe data for oscilloscope mode
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now() / 1000;
      timeHistoryRef.current.push({
        time: now,
        V: probeData.voltageV,
        E: probeData.fieldMagnitude,
      });

      // Keep last 40 seconds
      if (timeHistoryRef.current.length > 60) {
        timeHistoryRef.current.shift();
      }

      setTimePoints([...timeHistoryRef.current]);
    }, 200);

    return () => clearInterval(interval);
  }, [probeData]);

  // Compute Spatial Scan Points (across y = 300 horizontal scan line)
  const computeSpatialScanData = (): GraphPoint[] => {
    const points: GraphPoint[] = [];
    const scanY = 300;
    const canvasWidth = 900;

    for (let x = 0; x <= canvasWidth; x += 20) {
      if (graphType === 'voltage_pos') {
        const V = calculateElectricPotential(x, scanY, objects);
        points.push({ x, y: V });
      } else if (graphType === 'field_pos') {
        const field = calculateElectricField(x, scanY, objects);
        points.push({ x, y: field.magnitude });
      }
    }

    return points;
  };

  // Compute Force vs Distance Log-Log Data
  const computeForceVsDistData = (): GraphPoint[] => {
    const points: GraphPoint[] = [];
    const chargedObjs = objects.filter((o) => Math.abs(o.charge) > 0.1);

    if (chargedObjs.length >= 2) {
      const q1 = chargedObjs[0].charge;
      const q2 = chargedObjs[1].charge;
      const ke = 8.98755e9;

      for (let rCm = 5; rCm <= 100; rCm += 5) {
        const rMeter = rCm / 100;
        const ForceuN = (ke * Math.abs(q1 * q2 * 1e-18) / (rMeter * rMeter)) * 1e6;
        points.push({ x: rCm, y: ForceuN });
      }
    }

    return points;
  };

  const points =
    graphType === 'oscilloscope_time'
      ? []
      : graphType === 'force_dist'
      ? computeForceVsDistData()
      : computeSpatialScanData();

  // Graph Bounds Calculation
  const minY = Math.min(0, ...points.map((p) => p.y));
  const maxY = Math.max(10, ...points.map((p) => p.y));
  const rangeY = Math.max(1, maxY - minY);

  const svgWidth = 800;
  const svgHeight = 350;
  const padding = 50;

  const mapXToSvg = (xVal: number, maxVal = 900) =>
    padding + (xVal / maxVal) * (svgWidth - 2 * padding);

  const mapYToSvg = (yVal: number) =>
    svgHeight - padding - ((yVal - minY) / rangeY) * (svgHeight - 2 * padding);

  // Path Generation
  const pathD =
    points.length > 0
      ? points.reduce(
          (acc, p, idx) =>
            `${acc} ${idx === 0 ? 'M' : 'L'} ${mapXToSvg(
              p.x,
              graphType === 'force_dist' ? 100 : 900
            )} ${mapYToSvg(p.y)}`,
          ''
        )
      : '';

  return (
    <div className="w-full bg-slate-900/90 border border-slate-800 rounded-2xl p-5 text-slate-100 flex flex-col gap-4 shadow-xl">
      {/* Header & Graph Mode Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-pink-500/10 border border-pink-500/30 flex items-center justify-center text-pink-400">
            <BarChart2 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100">Real-Time Field Oscilloscope & Grapher</h3>
            <p className="text-xs text-slate-400">Live quantitative voltage, field magnitude, and Coulomb forces</p>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => setGraphType('voltage_pos')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              graphType === 'voltage_pos'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            V vs Position
          </button>
          <button
            onClick={() => setGraphType('field_pos')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              graphType === 'field_pos'
                ? 'bg-pink-500/20 text-pink-300 border border-pink-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            |E| vs Position
          </button>
          <button
            onClick={() => setGraphType('oscilloscope_time')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              graphType === 'oscilloscope_time'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Oscilloscope (t)
          </button>
          <button
            onClick={() => setGraphType('force_dist')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              graphType === 'force_dist'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Coulomb 1/r² Law
          </button>
        </div>
      </div>

      {/* SVG Canvas Graph Area */}
      <div className="relative w-full h-[360px] bg-slate-950 rounded-xl border border-slate-800/90 p-2 overflow-hidden flex items-center justify-center">
        {graphType === 'oscilloscope_time' ? (
          /* Live Oscilloscope View */
          <div className="w-full h-full flex flex-col justify-between p-4 font-mono text-xs">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <span className="text-emerald-400 font-bold flex items-center gap-2">
                <Activity className="w-4 h-4 animate-pulse" />
                Live Sensor Telemetry Channel 1 (Voltage & Field)
              </span>
              <div className="flex gap-4">
                <span className="text-cyan-400">V = {probeData.voltageV} V</span>
                <span className="text-pink-400">|E| = {probeData.fieldMagnitude} N/C</span>
              </div>
            </div>

            {/* Time Series Waveform */}
            <svg className="w-full h-[250px]" viewBox="0 0 800 250">
              {/* Horizontal Grid */}
              <line x1="0" y1="125" x2="800" y2="125" stroke="#334155" strokeDasharray="4 4" />
              <line x1="0" y1="62" x2="800" y2="62" stroke="#1e293b" />
              <line x1="0" y1="187" x2="800" y2="187" stroke="#1e293b" />

              {/* Voltage Polyline (Cyan) */}
              {timePoints.length > 1 && (
                <polyline
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="2.5"
                  points={timePoints
                    .map((tp, idx) => {
                      const x = (idx / 60) * 800;
                      const y = 125 - Math.max(-100, Math.min(100, tp.V)) * 1.0;
                      return `${x},${y}`;
                    })
                    .join(' ')}
                />
              )}

              {/* Field Magnitude Polyline (Pink) */}
              {timePoints.length > 1 && (
                <polyline
                  fill="none"
                  stroke="#ec4899"
                  strokeWidth="2"
                  strokeDasharray="3 3"
                  points={timePoints
                    .map((tp, idx) => {
                      const x = (idx / 60) * 800;
                      const y = 220 - Math.min(180, tp.E * 0.1);
                      return `${x},${y}`;
                    })
                    .join(' ')}
                />
              )}
            </svg>

            <div className="flex justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-800">
              <span>-40 seconds</span>
              <span>-20 seconds</span>
              <span className="text-emerald-400">0s (Live Tip)</span>
            </div>
          </div>
        ) : (
          /* Standard Spatial SVG Chart */
          <svg className="w-full h-full" viewBox={`0 0 ${svgWidth} ${svgHeight}`}>
            {/* Grid Axes */}
            <line
              x1={padding}
              y1={svgHeight - padding}
              x2={svgWidth - padding}
              y2={svgHeight - padding}
              stroke="#475569"
              strokeWidth="1.5"
            />
            <line
              x1={padding}
              y1={padding}
              x2={padding}
              y2={svgHeight - padding}
              stroke="#475569"
              strokeWidth="1.5"
            />

            {/* Zero Axis */}
            {minY < 0 && (
              <line
                x1={padding}
                y1={mapYToSvg(0)}
                x2={svgWidth - padding}
                y2={mapYToSvg(0)}
                stroke="#334155"
                strokeDasharray="4 4"
              />
            )}

            {/* Main Graph Line */}
            {pathD && (
              <path
                d={pathD}
                fill="none"
                stroke={
                  graphType === 'voltage_pos'
                    ? '#38bdf8'
                    : graphType === 'field_pos'
                    ? '#ec4899'
                    : '#f59e0b'
                }
                strokeWidth="2.5"
              />
            )}

            {/* Data Points */}
            {points.map((p, idx) => (
              <circle
                key={idx}
                cx={mapXToSvg(p.x, graphType === 'force_dist' ? 100 : 900)}
                cy={mapYToSvg(p.y)}
                r="3.5"
                fill={graphType === 'voltage_pos' ? '#0284c7' : '#be185d'}
              />
            ))}

            {/* Y Axis Label */}
            <text
              x={padding + 10}
              y={padding - 15}
              fill="#94a3b8"
              fontSize="11"
              fontFamily="JetBrains Mono"
            >
              {graphType === 'voltage_pos'
                ? 'Potential V (Volts)'
                : graphType === 'field_pos'
                ? 'Field Intensity |E| (N/C)'
                : 'Coulomb Force F (µN)'}
            </text>

            {/* X Axis Label */}
            <text
              x={svgWidth - padding - 80}
              y={svgHeight - 15}
              fill="#94a3b8"
              fontSize="11"
              fontFamily="JetBrains Mono"
            >
              {graphType === 'force_dist' ? 'Separation Distance r (cm)' : 'Position X (cm)'}
            </text>

            {/* Current Probe Marker Line */}
            {probeData.x > 0 && graphType !== 'force_dist' && (
              <g>
                <line
                  x1={mapXToSvg(probeData.x)}
                  y1={padding}
                  x2={mapXToSvg(probeData.x)}
                  y2={svgHeight - padding}
                  stroke="#f59e0b"
                  strokeWidth="1.5"
                  strokeDasharray="3 3"
                />
                <text
                  x={mapXToSvg(probeData.x) + 6}
                  y={padding + 20}
                  fill="#f59e0b"
                  fontSize="10"
                  fontFamily="JetBrains Mono"
                >
                  Probe (x={Math.round(probeData.x / 2)} cm)
                </text>
              </g>
            )}
          </svg>
        )}
      </div>
    </div>
  );
};
