import type { SeriesPoint } from "@/lib/admin/reports-queries";
import { formatPrice } from "@/lib/format";

/**
 * Pure server-rendered SVG area chart of sales over time. No client JS — the
 * whole thing is deterministic markup from the series data. Uses a responsive
 * viewBox so it scales to its container; guards against empty / all-zero data.
 */

const W = 720;
const H = 200;
const PAD_X = 8;
const PAD_TOP = 12;
const PAD_BOTTOM = 24;

export function RevenueChart({ series }: { series: SeriesPoint[] }) {
  const points = series.length > 0 ? series : [{ key: "empty", label: "", sales: 0, orders: 0 }];
  const max = Math.max(1, ...points.map((p) => p.sales));
  const innerW = W - PAD_X * 2;
  const innerH = H - PAD_TOP - PAD_BOTTOM;

  const x = (i: number) =>
    points.length <= 1 ? PAD_X + innerW / 2 : PAD_X + (i / (points.length - 1)) * innerW;
  const y = (v: number) => PAD_TOP + innerH - (v / max) * innerH;

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(p.sales).toFixed(1)}`)
    .join(" ");
  const areaPath =
    points.length > 0
      ? `${linePath} L ${x(points.length - 1).toFixed(1)} ${(PAD_TOP + innerH).toFixed(1)} ` +
        `L ${x(0).toFixed(1)} ${(PAD_TOP + innerH).toFixed(1)} Z`
      : "";

  const peak = points.reduce((a, b) => (b.sales > a.sales ? b : a), points[0]!);

  // A handful of evenly-spaced x labels so the axis never crowds.
  const labelEvery = Math.max(1, Math.ceil(points.length / 6));

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="text-base font-semibold">Sales over time</h2>
        <span className="text-xs text-muted-foreground">
          Peak {formatPrice(peak.sales)} · {peak.label}
        </span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="Sales over time"
        className="h-48 w-full overflow-visible"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* baseline */}
        <line
          x1={PAD_X}
          y1={PAD_TOP + innerH}
          x2={W - PAD_X}
          y2={PAD_TOP + innerH}
          stroke="var(--color-border)"
          strokeWidth={1}
        />

        {max > 0 && series.length > 0 ? (
          <>
            <path d={areaPath} fill="url(#salesFill)" />
            <path
              d={linePath}
              fill="none"
              stroke="var(--color-primary)"
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {points.map((p, i) => (
              <circle
                key={p.key}
                cx={x(i)}
                cy={y(p.sales)}
                r={points.length > 30 ? 0 : 2.5}
                fill="var(--color-primary)"
              >
                <title>{`${p.label}: ${formatPrice(p.sales)} · ${p.orders} orders`}</title>
              </circle>
            ))}
          </>
        ) : (
          <text x={W / 2} y={H / 2} textAnchor="middle" className="fill-muted-foreground text-sm">
            No sales in this period
          </text>
        )}

        {/* x-axis labels */}
        {points.map((p, i) =>
          i % labelEvery === 0 || i === points.length - 1 ? (
            <text
              key={`lbl-${p.key}`}
              x={x(i)}
              y={H - 6}
              textAnchor="middle"
              className="fill-muted-foreground"
              style={{ fontSize: "10px" }}
            >
              {p.label}
            </text>
          ) : null,
        )}
      </svg>
    </div>
  );
}
