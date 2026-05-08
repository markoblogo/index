"use client";

import { useEffect, useState } from "react";
import type { Locale } from "@/lib/i18n";
import type { FxRates } from "@/lib/fx-rates";

export type DisplayCurrency = "USD" | "UAH" | "EUR";

const DISPLAY_CURRENCIES: DisplayCurrency[] = ["USD", "UAH", "EUR"];
const STORAGE_KEY = "uga_display_currency";
const CHANGE_EVENT = "uga-display-currency-change";

type CurrencyToggleProps = {
  label: string;
};

export function CurrencyToggle({ label }: CurrencyToggleProps) {
  const [currency, setCurrency] = useDisplayCurrency();

  return (
    <div
      aria-label={label}
      className="inline-flex rounded-full border border-black/35 bg-white p-1"
      role="group"
    >
      {DISPLAY_CURRENCIES.map((option) => {
        const isActive = option === currency;

        return (
          <button
            aria-pressed={isActive}
            className={`rounded-full px-2.5 py-1 text-[0.68rem] font-black transition ${
              isActive
                ? "bg-uga-dark text-white"
                : "text-black/55 hover:bg-uga-lime hover:text-black"
            }`}
            key={option}
            onClick={() => setCurrency(option)}
            type="button"
          >
            {option}/t
          </button>
        );
      })}
    </div>
  );
}

type CurrencyValueProps = {
  officialUsd: number;
  fxRates: FxRates;
  locale: Locale;
  officialLabel: string;
  className?: string;
  compact?: boolean;
};

export function CurrencyValue({
  officialLabel,
  officialUsd,
  fxRates,
  locale,
  className = "",
  compact = false,
}: CurrencyValueProps) {
  const [currency] = useDisplayCurrency();
  const value = convertUsdPerTonne(officialUsd, currency, fxRates);
  const formattedValue = formatCurrencyValue(value, currency, locale);
  const officialValue = `${formatCurrencyValue(officialUsd, "USD", locale)} USD/t`;

  if (currency === "USD") {
    return (
      <span className={className}>
        {formattedValue}{" "}
        <span className="text-sm font-black tracking-normal text-black/55">
          USD/t
        </span>
      </span>
    );
  }

  return (
    <span className={`inline-flex flex-col ${className}`}>
      <span>
        ≈ {formattedValue}{" "}
        <span className="text-sm font-black tracking-normal text-black/55">
          {currency}/t
        </span>
      </span>
      <span
        className={`font-semibold leading-none text-black/45 ${
          compact ? "mt-1 text-[0.7rem]" : "mt-1.5 text-[0.72rem]"
        }`}
      >
        {officialLabel}: {officialValue}
      </span>
    </span>
  );
}

function useDisplayCurrency() {
  const [currency, setCurrencyState] = useState<DisplayCurrency>("USD");

  useEffect(() => {
    const storedCurrency = readStoredCurrency();

    if (storedCurrency) {
      setCurrencyState(storedCurrency);
    }

    function handleStorage(event: StorageEvent) {
      if (event.key !== STORAGE_KEY) {
        return;
      }

      const nextCurrency = parseDisplayCurrency(event.newValue);

      if (nextCurrency) {
        setCurrencyState(nextCurrency);
      }
    }

    function handleLocalChange(event: Event) {
      const detail = (event as CustomEvent<DisplayCurrency>).detail;
      const nextCurrency = parseDisplayCurrency(detail);

      if (nextCurrency) {
        setCurrencyState(nextCurrency);
      }
    }

    window.addEventListener("storage", handleStorage);
    window.addEventListener(CHANGE_EVENT, handleLocalChange);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(CHANGE_EVENT, handleLocalChange);
    };
  }, []);

  function setCurrency(nextCurrency: DisplayCurrency) {
    setCurrencyState(nextCurrency);
    window.localStorage.setItem(STORAGE_KEY, nextCurrency);
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: nextCurrency }));
  }

  return [currency, setCurrency] as const;
}

function readStoredCurrency() {
  if (typeof window === "undefined") {
    return null;
  }

  return parseDisplayCurrency(window.localStorage.getItem(STORAGE_KEY));
}

function parseDisplayCurrency(value: unknown): DisplayCurrency | null {
  if (value === "USD" || value === "UAH" || value === "EUR") {
    return value;
  }

  return null;
}

function convertUsdPerTonne(
  officialUsd: number,
  currency: DisplayCurrency,
  fxRates: FxRates,
) {
  if (currency === "UAH") {
    return officialUsd * fxRates.usdUah;
  }

  if (currency === "EUR") {
    return (officialUsd * fxRates.usdUah) / fxRates.eurUah;
  }

  return officialUsd;
}

function formatCurrencyValue(
  value: number,
  currency: DisplayCurrency,
  locale: Locale,
) {
  return new Intl.NumberFormat(locale === "uk" ? "uk-UA" : "en-US", {
    maximumFractionDigits: currency === "USD" ? 1 : 0,
    minimumFractionDigits: 0,
  }).format(value);
}
