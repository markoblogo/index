"use client";

import { useState } from "react";
import type { MediaHubWindowSnapshot } from "@/lib/media-hub";

type DistributionSlice = MediaHubWindowSnapshot["distribution"][number];

export function DistributionChart({
  distribution,
  total,
}: {
  distribution: DistributionSlice[];
  total: number;
}) {
  const [activeSlice, setActiveSlice] = useState<DistributionSlice | null>(null);

  return (
    <div className="relative grid gap-4 md:grid-cols-[9.5rem_1fr] md:items-center">
      <div className="flex items-center justify-center md:justify-start">
        <DonutChart
          distribution={distribution}
          onActiveSlice={setActiveSlice}
          total={total}
        />
      </div>
      <div className="grid min-w-0 gap-2">
        {distribution.map((slice) => (
          <button
            className="flex min-w-0 items-center gap-2 rounded-[0.85rem] border border-white/10 bg-[var(--media-hub-card)] px-3 py-2 text-left transition hover:border-[color:var(--media-hub-accent)]"
            key={slice.label}
            onBlur={() => setActiveSlice(null)}
            onClick={(event) => event.preventDefault()}
            onFocus={() => setActiveSlice(slice)}
            onMouseEnter={() => setActiveSlice(slice)}
            onMouseLeave={() => setActiveSlice(null)}
            type="button"
          >
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: slice.color }}
            />
            <span className="min-w-0 truncate text-sm font-semibold text-white/82">
              {slice.label}
            </span>
            <span className="ml-auto shrink-0 text-sm font-black text-white/44">
              {slice.value}%
            </span>
          </button>
        ))}
      </div>

      {activeSlice ? (
        <div className="pointer-events-none absolute right-0 top-0 z-10 max-w-[16rem] rounded-[0.9rem] border border-white/12 bg-[var(--media-hub-bg)] px-3 py-2 text-sm font-semibold text-white shadow-[0_18px_45px_rgba(0,0,0,0.42)]">
          {activeSlice.label}: {activeSlice.value}%
        </div>
      ) : null}
    </div>
  );
}

function DonutChart({
  distribution,
  onActiveSlice,
  total,
}: {
  distribution: DistributionSlice[];
  onActiveSlice: (slice: DistributionSlice | null) => void;
  total: number;
}) {
  const radius = 40;
  const strokeWidth = 15;
  let cursor = 0;

  if (total <= 0) {
    return (
      <svg
        aria-label="Source distribution"
        className="h-[9.5rem] w-[9.5rem]"
        role="img"
        viewBox="0 0 100 100"
      >
        <circle
          className="stroke-white/10"
          cx="50"
          cy="50"
          fill="none"
          r={radius}
          strokeWidth={strokeWidth}
        />
        <circle cx="50" cy="50" fill="var(--media-hub-bg)" r={radius - strokeWidth} />
      </svg>
    );
  }

  return (
    <svg
      aria-label="Source distribution"
      className="h-[9.5rem] w-[9.5rem]"
      onClick={(event) => event.preventDefault()}
      onMouseLeave={() => onActiveSlice(null)}
      role="img"
      viewBox="0 0 100 100"
    >
      {distribution.map((slice) => {
        const start = (cursor / total) * 360;
        cursor += slice.value;
        const end = (cursor / total) * 360;
        const isFullCircle = end - start >= 359.99;

        if (isFullCircle) {
          return (
            <circle
              className="cursor-default transition-opacity hover:opacity-75"
              cx="50"
              cy="50"
              fill="none"
              key={slice.label}
              onFocus={() => onActiveSlice(slice)}
              onMouseEnter={() => onActiveSlice(slice)}
              r={radius - strokeWidth / 2}
              stroke={slice.color}
              strokeWidth={strokeWidth}
              tabIndex={0}
            />
          );
        }

        return (
          <path
            className="cursor-default transition-opacity hover:opacity-75"
            d={describeDonutArc(50, 50, radius, strokeWidth, start, end)}
            fill={slice.color}
            key={slice.label}
            onFocus={() => onActiveSlice(slice)}
            onMouseEnter={() => onActiveSlice(slice)}
            tabIndex={0}
          />
        );
      })}
      <circle cx="50" cy="50" fill="var(--media-hub-bg)" r={radius - strokeWidth} />
    </svg>
  );
}

function describeDonutArc(
  centerX: number,
  centerY: number,
  radius: number,
  strokeWidth: number,
  startAngle: number,
  endAngle: number,
) {
  const outerStart = polarToCartesian(centerX, centerY, radius, endAngle);
  const outerEnd = polarToCartesian(centerX, centerY, radius, startAngle);
  const innerRadius = radius - strokeWidth;
  const innerStart = polarToCartesian(centerX, centerY, innerRadius, startAngle);
  const innerEnd = polarToCartesian(centerX, centerY, innerRadius, endAngle);
  const largeArc = endAngle - startAngle <= 180 ? "0" : "1";

  return [
    "M",
    outerStart.x,
    outerStart.y,
    "A",
    radius,
    radius,
    0,
    largeArc,
    0,
    outerEnd.x,
    outerEnd.y,
    "L",
    innerStart.x,
    innerStart.y,
    "A",
    innerRadius,
    innerRadius,
    0,
    largeArc,
    1,
    innerEnd.x,
    innerEnd.y,
    "Z",
  ].join(" ");
}

function polarToCartesian(centerX: number, centerY: number, radius: number, angleInDegrees: number) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180;

  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
}
