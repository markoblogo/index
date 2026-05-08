import { CurrencyValue } from "@/components/ui/currency-toggle";
import type { FxRates } from "@/lib/fx-rates";
import type { Locale } from "@/lib/i18n";
import {
  commodities as defaultCommodities,
  latestQuotes as defaultLatestQuotes,
  type Commodity,
  type LatestQuote,
} from "@/lib/mock-data";

type LatestQuotesTableProps = {
  locale: Locale;
  fxRates: FxRates;
  commodities?: Commodity[];
  quotes?: LatestQuote[];
  labels: {
    commodity: string;
    basis: string;
    price: string;
    change: string;
    respondents: string;
  };
};

export function LatestQuotesTable({
  locale,
  fxRates,
  labels,
  commodities = defaultCommodities,
  quotes = defaultLatestQuotes,
}: LatestQuotesTableProps) {
  const commodityById = new Map(
    commodities.map((commodity) => [commodity.id, commodity]),
  );

  return (
    <div className="overflow-hidden border border-black bg-white">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left">
          <thead className="border-b border-black bg-white text-xs uppercase tracking-[0.14em] text-black/55">
            <tr>
              <th className="px-5 py-4 font-black">{labels.commodity}</th>
              <th className="px-5 py-4 font-black">{labels.basis}</th>
              <th className="px-5 py-4 font-black">{labels.price}</th>
              <th className="px-5 py-4 font-black">{labels.change}</th>
              <th className="px-5 py-4 font-black">{labels.respondents}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black">
            {quotes.map((quote) => {
              const commodity = commodityById.get(quote.commodityId);
              const isPositive = quote.absoluteChange >= 0;

              if (!commodity) {
                return null;
              }

              return (
                <tr className="text-sm transition hover:bg-uga-mist" key={quote.id}>
                  <td className="px-5 py-5 font-black text-black">
                    {commodity.name[locale]}
                  </td>
                  <td className="px-5 py-4 text-black/60">{quote.basis}</td>
                  <td className="px-5 py-4 font-black text-black">
                    <CurrencyValue
                      compact
                      fxRates={fxRates}
                      locale={locale}
                      officialLabel={
                        locale === "uk" ? "офіційно" : "official"
                      }
                      officialUsd={quote.price}
                    />
                  </td>
                  <td
                    className={
                      isPositive
                        ? "px-5 py-4 font-semibold text-uga-green"
                        : "px-5 py-4 font-semibold text-black"
                    }
                  >
                    {isPositive ? "+" : ""}
                    {quote.absoluteChange} USD · {isPositive ? "+" : ""}
                    {quote.percentChange}%
                  </td>
                  <td className="px-5 py-4 text-black/60">
                    {quote.respondents}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
