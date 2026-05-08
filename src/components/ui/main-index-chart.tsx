import { IndexSparkline } from "@/components/ui/index-sparkline";
import type { Locale } from "@/lib/i18n";
import { commodities, weeklySeries } from "@/lib/mock-data";

export function MainIndexChart({ locale }: { locale: Locale }) {
  return (
    <div className="border border-black bg-white p-4 sm:p-5">
      <div className="grid gap-5">
        {commodities.map((commodity) => {
          const values = weeklySeries[commodity.id];
          const isPositive = values[values.length - 1] >= values[0];

          return (
            <div
              className="grid gap-4 border border-black/15 bg-white p-4 md:grid-cols-[13rem_1fr_5rem] md:items-center"
              key={commodity.id}
            >
              <div>
                <p className="text-sm font-black text-black">
                  {commodity.name[locale]}
                </p>
                <p className="mt-1 text-xs font-black uppercase tracking-[0.14em] text-black/45">
                  {commodity.code}
                </p>
              </div>
              <IndexSparkline
                heightClassName="h-20"
                trend={isPositive ? "up" : "down"}
                values={values}
              />
              <p className="text-right text-lg font-black text-black">
                ${values[values.length - 1]}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
