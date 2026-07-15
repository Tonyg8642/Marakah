import { useMemo } from "react";
import { useTranslation } from "react-i18next";

export function useLocaleFormat() {
  const { i18n } = useTranslation();

  return useMemo(() => {
    const locale = i18n.language || "en";

    const numberFormatter = new Intl.NumberFormat(locale, {
      maximumFractionDigits: 1,
    });

    const integerFormatter = new Intl.NumberFormat(locale, {
      maximumFractionDigits: 0,
    });

    const dateFormatter = new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
    });

    const timeFormatter = new Intl.DateTimeFormat(locale, {
      hour: "numeric",
      minute: "2-digit",
    });

    const relativeTime = new Intl.RelativeTimeFormat(locale, {
      numeric: "auto",
    });

    return {
      locale,
      formatNumber: (value) => numberFormatter.format(Number(value) || 0),
      formatInteger: (value) => integerFormatter.format(Number(value) || 0),
      formatDate: (value) => {
        const date = value instanceof Date ? value : new Date(value);
        return Number.isNaN(date.getTime()) ? "" : dateFormatter.format(date);
      },
      formatTime: (value) => {
        const date = value instanceof Date ? value : new Date(value);
        return Number.isNaN(date.getTime()) ? "" : timeFormatter.format(date);
      },
      formatRelativeMinutes: (minutes) =>
        relativeTime.format(Math.round(Number(minutes) || 0), "minute"),
      formatCurrency: (value, currency = "USD") =>
        new Intl.NumberFormat(locale, {
          style: "currency",
          currency,
          maximumFractionDigits: 2,
        }).format(Number(value) || 0),
    };
  }, [i18n.language]);
}
