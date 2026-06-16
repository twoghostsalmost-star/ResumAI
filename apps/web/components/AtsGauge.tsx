"use client";

import { scoreColor } from "@/lib/format";

export function AtsGauge({ value }: { value: number }) {
  const size = 160;
  const stroke = 14;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, value));
  const offset = c - (clamped / 100) * c;
  const color = scoreColor(clamped);

  return (
    <div className="gauge" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--border)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
      </svg>
      <div className="num">
        <strong style={{ color }}>{Math.round(clamped)}</strong>
        <span className="faint" style={{ fontSize: "0.8rem" }}>
          / 100
        </span>
      </div>
    </div>
  );
}

export function ScoreBar({ label, value }: { label: string; value: number }) {
  const color = scoreColor(value);
  return (
    <div style={{ marginBottom: "0.7rem" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: "0.85rem",
          marginBottom: "0.25rem",
        }}
      >
        <span className="muted">{label}</span>
        <strong>{Math.round(value)}</strong>
      </div>
      <div className="bar-track">
        <div
          className="bar-fill"
          style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: color }}
        />
      </div>
    </div>
  );
}
