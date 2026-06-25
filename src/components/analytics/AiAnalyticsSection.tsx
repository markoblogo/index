"use client";

import { useMemo, useState } from "react";
import {
  buildAiAnalyticsResult,
  buildAnalyticsFactPack,
  type AnalyticsFactPack,
  type AiInsightCard,
  type HistoricalScenarioDistribution,
  type MarketRegime,
  type MarketRegimeResult,
  type SimilarEpisode,
} from "@/lib/analytics/ai-analytics";
import {
  type ConfidenceLevel,
  type DataQualityAlert,
  type IndexHistoryPoint,
  type IndexInstrument,
  type PulseRow,
  type SpreadAnalytics,
} from "@/lib/analytics/experimental-analytics";

type Props = {
  history: IndexHistoryPoint[];
  instruments: IndexInstrument[];
  pulseRows: PulseRow[];
  qualityRows: Array<{
    alerts: DataQualityAlert[];
    confidence: ConfidenceLevel;
    positionId: string;
    positionLabel: string;
  }>;
  selectedInstrumentId: string;
  setSelectedInstrumentId: (id: string) => void;
  spreadRows: SpreadAnalytics[];
};

const regimeLabels: Record<MarketRegime, string> = {
  downside_pressure: "ціновий тиск",
  mean_reversion_watch: "повернення до діапазону",
  quiet_range: "спокійний діапазон",
  thin_noisy_market: "тонкий ряд",
  unavailable: "недостатньо даних",
  upside_pressure: "підтримка ціни",
  volatile_breakout: "волатильний вихід",
};

export function AiAnalyticsSection({
  history,
  instruments,
  pulseRows,
  qualityRows,
  selectedInstrumentId,
  setSelectedInstrumentId,
  spreadRows,
}: Props) {
  const [briefWindow, setBriefWindow] = useState<"daily" | "weekly">("daily");
  const factPack = useMemo(
    () =>
      buildAnalyticsFactPack({
        history,
        instruments,
        pulseRows,
        qualityRows,
        spreadRows,
      }),
    [history, instruments, pulseRows, qualityRows, spreadRows],
  );
  const result = useMemo(
    () =>
      buildAiAnalyticsResult({
        factPack,
        history,
        selectedInstrumentId,
      }),
    [factPack, history, selectedInstrumentId],
  );
  const activeBrief = briefWindow === "daily" ? result.dailyBrief : result.weeklyBrief;

  return (
    <section className="mt-5 rounded-[1.2rem] border border-[var(--spike-accent)]/25 bg-[linear-gradient(135deg,rgba(52,255,25,0.08),rgba(255,255,255,0.025)_42%,rgba(95,28,48,0.18))] p-3 sm:p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[0.62rem] font-black uppercase tracking-[0.18em] text-[var(--spike-accent)]">
            AI analytics preview
          </p>
          <h3 className="mt-1 text-lg font-black uppercase leading-tight sm:text-xl">
            AI Market Intelligence Lab
          </h3>
          <p className="mt-1 max-w-3xl text-xs font-semibold leading-5 text-white/50">
            Deterministic-шар читає архів індексів, а не прогнозує ринок. Evidence ID
            показують, на які метрики спирається кожен висновок.
          </p>
        </div>
        <span className="rounded-full border border-white/12 bg-black/55 px-3 py-1 text-[0.64rem] font-black uppercase tracking-[0.12em] text-white/48">
          provider: none
        </span>
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-[1.02fr_0.98fr]">
        <AnomalyPanel factPack={factPack} result={result} />
        <RegimeMap regimes={result.marketRegimes} />
      </div>
      <div className="mt-3 grid gap-3 xl:grid-cols-[0.95fr_1.05fr]">
        <SimilarEpisodesPanel
          episodes={result.similarEpisodes}
          instruments={instruments}
          selectedInstrumentId={selectedInstrumentId}
          setSelectedInstrumentId={setSelectedInstrumentId}
        />
        <BriefAndScenarios
          brief={activeBrief}
          briefWindow={briefWindow}
          evidence={factPack.evidence}
          scenarios={result.scenarios}
          setBriefWindow={setBriefWindow}
        />
      </div>
    </section>
  );
}

function AnomalyPanel({
  factPack,
  result,
}: {
  factPack: AnalyticsFactPack;
  result: ReturnType<typeof buildAiAnalyticsResult>;
}) {
  const items = result.anomalies.slice(0, 4);

  return (
    <AiPanel kicker="Anomaly explanation" title="Пояснення нетипових рухів">
      {items.length > 0 ? (
        <div className="grid gap-2">
          {items.map((item) => (
            <article className="rounded-[0.9rem] border border-white/10 bg-black/38 p-3" key={item.id}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-xs font-black uppercase leading-5">{item.title}</h4>
                <SeverityPill severity={item.severity} />
              </div>
              <p className="mt-1 text-xs font-semibold leading-5 text-white/55">{item.summary}</p>
              <EvidenceChips evidence={factPack.evidence} ids={item.evidenceIds.slice(0, 3)} />
            </article>
          ))}
        </div>
      ) : (
        <Empty text="За поточними правилами немає нетипових рухів для окремого пояснення." />
      )}
    </AiPanel>
  );
}

function RegimeMap({ regimes }: { regimes: MarketRegimeResult[] }) {
  const points = regimes.filter(
    (row) => row.pricePercentile !== null && row.volatilityPercentile !== null,
  );

  return (
    <AiPanel kicker="Market regime map" title="Карта режимів ринку">
      <div className="grid gap-3 md:grid-cols-[0.9fr_1.1fr]">
        <svg className="h-44 w-full rounded-[0.9rem] border border-white/10 bg-black/42" viewBox="0 0 320 176">
          <rect fill="rgba(0,0,0,0.45)" height="176" width="320" />
          <line stroke="rgba(255,255,255,0.13)" x1="42" x2="300" y1="132" y2="132" />
          <line stroke="rgba(255,255,255,0.13)" x1="42" x2="300" y1="86" y2="86" />
          <line stroke="rgba(255,255,255,0.13)" x1="42" x2="300" y1="40" y2="40" />
          <line stroke="rgba(255,255,255,0.18)" x1="171" x2="171" y1="22" y2="148" />
          <text fill="rgba(255,255,255,0.45)" fontSize="9" fontWeight="800" x="12" y="28">
            VOL
          </text>
          <text fill="rgba(255,255,255,0.45)" fontSize="9" fontWeight="800" x="238" y="164">
            MOMENTUM
          </text>
          {points.map((row) => {
            const x = 171 + clamp(row.momentum30d ?? 0, -60, 60) * 2.05;
            const y = 148 - clamp(row.volatilityPercentile ?? 0, 0, 100) * 1.25;
            return (
              <circle
                cx={x}
                cy={y}
                fill={row.regime === "downside_pressure" ? "#ff6b6b" : "var(--spike-accent)"}
                key={row.instrumentId}
                r="5"
              >
                <title>{`${row.instrumentLabel}: ${regimeLabels[row.regime]}`}</title>
              </circle>
            );
          })}
        </svg>
        <div className="grid max-h-44 gap-2 overflow-y-auto pr-1 [scrollbar-width:thin]">
          {regimes.slice(0, 8).map((row) => (
            <div className="grid grid-cols-[1fr_auto] gap-2 rounded-[0.8rem] border border-white/10 bg-white/[0.035] px-3 py-2" key={row.instrumentId}>
              <span className="truncate text-xs font-black uppercase">{row.instrumentLabel}</span>
              <span className="text-[0.66rem] font-black uppercase text-[var(--spike-accent)]">
                {regimeLabels[row.regime]}
              </span>
            </div>
          ))}
        </div>
      </div>
    </AiPanel>
  );
}

function SimilarEpisodesPanel({
  episodes,
  instruments,
  selectedInstrumentId,
  setSelectedInstrumentId,
}: {
  episodes: SimilarEpisode[];
  instruments: IndexInstrument[];
  selectedInstrumentId: string;
  setSelectedInstrumentId: (id: string) => void;
}) {
  return (
    <AiPanel kicker="Similar episodes" title="Схожі історичні епізоди">
      <select
        className="mb-3 w-full rounded-[0.8rem] border border-white/12 bg-black px-3 py-2 text-xs font-black uppercase text-white outline-none focus:border-[var(--spike-accent)]"
        onChange={(event) => setSelectedInstrumentId(event.target.value)}
        value={selectedInstrumentId}
      >
        {instruments.map((instrument) => (
          <option key={instrument.id} value={instrument.id}>
            {instrument.label}
          </option>
        ))}
      </select>
      {episodes.length > 0 ? (
        <div className="grid gap-2">
          {episodes.slice(0, 4).map((episode) => (
            <article className="grid gap-2 rounded-[0.9rem] border border-white/10 bg-black/38 p-3 sm:grid-cols-[1fr_auto]" key={episode.id}>
              <div>
                <p className="text-xs font-black uppercase">{formatDate(episode.startDate)}</p>
                <p className="mt-1 text-[0.68rem] font-semibold text-white/45">
                  similarity {formatNumber(episode.similarityScore)}%
                </p>
              </div>
              <div className="grid grid-cols-3 gap-2 text-right text-[0.72rem] font-black">
                <span>7D {formatSignedNullable(episode.forwardReturns.d7)}</span>
                <span>14D {formatSignedNullable(episode.forwardReturns.d14)}</span>
                <span>30D {formatSignedNullable(episode.forwardReturns.d30)}</span>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <Empty text="Недостатньо історії для пошуку схожих епізодів." />
      )}
    </AiPanel>
  );
}

function BriefAndScenarios({
  brief,
  briefWindow,
  evidence,
  scenarios,
  setBriefWindow,
}: {
  brief: AiInsightCard;
  briefWindow: "daily" | "weekly";
  evidence: AnalyticsFactPack["evidence"];
  scenarios: HistoricalScenarioDistribution[];
  setBriefWindow: (window: "daily" | "weekly") => void;
}) {
  return (
    <AiPanel kicker="AI brief & scenarios" title="Brief і історичні сценарії">
      <div className="mb-3 flex flex-wrap gap-2">
        {(["daily", "weekly"] as const).map((window) => (
          <button
            className={`rounded-full border px-3 py-1.5 text-[0.68rem] font-black uppercase ${
              briefWindow === window
                ? "border-[var(--spike-accent)] bg-[var(--spike-accent)] text-[#050505]"
                : "border-white/12 bg-black/45 text-white/58"
            }`}
            key={window}
            onClick={() => setBriefWindow(window)}
            type="button"
          >
            {window === "daily" ? "Daily" : "Weekly"}
          </button>
        ))}
      </div>
      <article className="rounded-[0.9rem] border border-white/10 bg-black/38 p-3">
        <h4 className="text-xs font-black uppercase">{brief.title}</h4>
        <p className="mt-1 text-xs font-semibold leading-5 text-white/56">{brief.summary}</p>
        <ul className="mt-2 grid gap-1 text-xs font-semibold leading-5 text-white/58">
          {(brief.details ?? []).slice(0, 4).map((detail) => (
            <li key={detail}>• {detail}</li>
          ))}
        </ul>
        <EvidenceChips evidence={evidence} ids={brief.evidenceIds.slice(0, 4)} />
      </article>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {scenarios.map((scenario) => (
          <article className="rounded-[0.85rem] border border-white/10 bg-white/[0.035] p-3" key={scenario.horizon}>
            <p className="text-[0.64rem] font-black uppercase tracking-[0.14em] text-white/38">
              {scenario.horizon}
            </p>
            <p className="mt-1 text-lg font-black text-[var(--spike-accent)]">
              {formatSignedNullable(scenario.medianReturn)}
            </p>
            <p className="mt-1 text-[0.68rem] font-semibold leading-4 text-white/44">
              p25/p75: {formatSignedNullable(scenario.p25Return)} / {formatSignedNullable(scenario.p75Return)}
            </p>
          </article>
        ))}
      </div>
    </AiPanel>
  );
}

function AiPanel({
  children,
  kicker,
  title,
}: {
  children: React.ReactNode;
  kicker: string;
  title: string;
}) {
  return (
    <article className="min-w-0 rounded-[1rem] border border-white/12 bg-black/34 p-3 shadow-[0_18px_55px_rgba(0,0,0,0.24)]">
      <p className="text-[0.62rem] font-black uppercase tracking-[0.16em] text-white/38">
        {kicker}
      </p>
      <h4 className="mt-1 text-base font-black uppercase leading-tight">{title}</h4>
      <div className="mt-3">{children}</div>
    </article>
  );
}

function EvidenceChips({
  evidence,
  ids,
}: {
  evidence: AnalyticsFactPack["evidence"];
  ids: string[];
}) {
  const rows = ids
    .map((id) => evidence.find((item) => item.id === id) ?? { id, label: id })
    .slice(0, 4);
  if (rows.length === 0) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {rows.map((item) => (
        <span
          className="rounded-full border border-white/10 bg-white/[0.045] px-2 py-1 text-[0.6rem] font-black uppercase tracking-[0.08em] text-white/36"
          key={item.id}
          title={item.label}
        >
          {item.id.replace("ev-", "")}
        </span>
      ))}
    </div>
  );
}

function SeverityPill({ severity }: { severity: "info" | "warning" | "critical" }) {
  const label = severity === "critical" ? "critical" : severity === "warning" ? "watch" : "info";
  return (
    <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-[0.6rem] font-black uppercase tracking-[0.08em] text-white/45">
      {label}
    </span>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-[0.9rem] border border-white/10 bg-white/[0.035] p-3 text-xs font-semibold leading-5 text-white/44">
      {text}
    </div>
  );
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("uk-UA", { day: "2-digit", month: "2-digit", year: "numeric" }).format(
    new Date(`${date}T00:00:00.000Z`),
  );
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("uk-UA", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
  }).format(value);
}

function formatSignedNullable(value: number | null | undefined) {
  if (value === null || value === undefined) return "n/a";
  const abs = formatNumber(Math.abs(value));
  return `${value > 0 ? "+" : value < 0 ? "-" : ""}${abs}`;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
