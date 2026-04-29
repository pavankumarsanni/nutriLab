"use client";

type WeightLog = { id: string; weight_kg: number; logged_at: string };

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export default function WeightChart({ logs, targetWeight }: { logs: WeightLog[]; targetWeight: number | null }) {
  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="text-4xl mb-3">📈</div>
        <p className="text-sm text-gray-500 dark:text-gray-400">Log your first weight entry to start tracking progress</p>
      </div>
    );
  }

  const W = 500;
  const H = 200;
  const padL = 44;
  const padR = 16;
  const padT = 16;
  const padB = 32;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;

  const weights = logs.map((l) => Number(l.weight_kg));
  const allValues = targetWeight ? [...weights, targetWeight] : weights;
  const rawMin = Math.min(...allValues);
  const rawMax = Math.max(...allValues);
  const range = rawMax - rawMin || 2;
  const minY = rawMin - range * 0.15;
  const maxY = rawMax + range * 0.15;

  const toX = (i: number) => padL + (logs.length === 1 ? chartW / 2 : (i / (logs.length - 1)) * chartW);
  const toY = (w: number) => padT + chartH - ((w - minY) / (maxY - minY)) * chartH;

  const points = logs.map((l, i) => `${toX(i)},${toY(Number(l.weight_kg))}`).join(" ");

  // Y axis ticks
  const ticks = 4;
  const yTicks = Array.from({ length: ticks + 1 }, (_, i) => minY + (i / ticks) * (maxY - minY));

  // X axis labels — show max 5
  const step = Math.max(1, Math.floor(logs.length / 5));
  const xLabels = logs.filter((_, i) => i % step === 0 || i === logs.length - 1);

  const targetY = targetWeight ? toY(targetWeight) : null;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Weight progress chart">
      {/* Grid lines */}
      {yTicks.map((t, i) => (
        <g key={i}>
          <line
            x1={padL} y1={toY(t)} x2={W - padR} y2={toY(t)}
            stroke="currentColor" strokeWidth="0.5" className="text-gray-200 dark:text-gray-700"
          />
          <text x={padL - 4} y={toY(t) + 3.5} textAnchor="end" fontSize="9" className="fill-gray-400 dark:fill-gray-500">
            {t.toFixed(1)}
          </text>
        </g>
      ))}

      {/* Target weight dashed line */}
      {targetY !== null && (
        <>
          <line
            x1={padL} y1={targetY} x2={W - padR} y2={targetY}
            stroke="#16a34a" strokeWidth="1.5" strokeDasharray="5,4" opacity="0.7"
          />
          <text x={W - padR + 2} y={targetY + 3.5} fontSize="9" fill="#16a34a">Goal</text>
        </>
      )}

      {/* Weight line */}
      {logs.length > 1 && (
        <polyline
          points={points}
          fill="none" stroke="#16a34a" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"
        />
      )}

      {/* Fill under line */}
      {logs.length > 1 && (
        <polygon
          points={`${toX(0)},${padT + chartH} ${points} ${toX(logs.length - 1)},${padT + chartH}`}
          fill="#16a34a" opacity="0.08"
        />
      )}

      {/* Data points */}
      {logs.map((l, i) => (
        <g key={l.id}>
          <circle cx={toX(i)} cy={toY(Number(l.weight_kg))} r="4" fill="#16a34a" stroke="white" strokeWidth="1.5" />
          <title>{`${formatDate(l.logged_at)}: ${l.weight_kg} kg`}</title>
        </g>
      ))}

      {/* X axis labels */}
      {xLabels.map((l) => {
        const i = logs.indexOf(l);
        return (
          <text key={l.id} x={toX(i)} y={H - 4} textAnchor="middle" fontSize="9" className="fill-gray-400 dark:fill-gray-500">
            {formatDate(l.logged_at)}
          </text>
        );
      })}
    </svg>
  );
}
