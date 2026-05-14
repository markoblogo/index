type IndexSparklineProps = {
  values: number[];
  trend?: "up" | "down" | "flat";
  heightClassName?: string;
};

export function IndexSparkline({
  values,
  trend = "up",
  heightClassName = "h-16",
}: IndexSparklineProps) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(max - min, 1);
  const points = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * 100;
      const y = 82 - ((value - min) / range) * 64;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg
      aria-hidden="true"
      className={`w-full overflow-visible ${heightClassName}`}
      preserveAspectRatio="none"
      viewBox="0 0 100 100"
    >
      <polyline
        fill="none"
        points={points}
        stroke={
          trend === "flat"
            ? "rgba(var(--color-ink-rgb) / 0.55)"
            : trend === "up"
              ? "var(--color-green)"
              : "var(--color-negative)"
        }
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="3"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
