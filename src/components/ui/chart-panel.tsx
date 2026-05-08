import type { Commodity } from "@/lib/mock-data";
import type { Locale } from "@/lib/i18n";

type ChartPanelProps = {
  commodity: Commodity;
  locale: Locale;
  values: number[];
};

export function ChartPanel({ commodity, locale, values }: ChartPanelProps) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(max - min, 1);
  const points = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * 100;
      const y = 84 - ((value - min) / range) * 64;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <article className="rounded-[3px] border border-black/10 bg-white p-6 ">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-black">
            {commodity.name[locale]}
          </h3>
          <p className="mt-1 text-sm text-black/55">FOB Black Sea · USD/t</p>
        </div>
        <p className="text-right text-sm font-semibold text-uga-green">
          {values[values.length - 1]}
        </p>
      </div>
      <svg
        aria-label={`${commodity.name[locale]} weekly chart`}
        className="mt-6 h-36 w-full overflow-visible"
        preserveAspectRatio="none"
        viewBox="0 0 100 100"
      >
        <polyline
          fill="none"
          points={points}
          stroke="#0b6b3a"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="3"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div className="mt-2 flex justify-between text-xs font-medium text-black/45">
        <span>Mon</span>
        <span>Fri</span>
      </div>
    </article>
  );
}
