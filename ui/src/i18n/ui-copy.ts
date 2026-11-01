import { i18n } from ".";
import chinese from "./copy/zh-CN.json";

// Separate namespace: upstream's locale validation requires every language to
// have identical keys. The fork adds English/Chinese copy without claiming the
// other upstream languages have been translated.
i18n.addResourceBundle("zh-CN", "ui", chinese);

/** For reviewed static interface copy only. Never pass task or user content. */
export function translateUi(english: string, values: Record<string, string | number> = {}): string {
  const fallback = english
    .replaceAll("&apos;", "'").replaceAll("&quot;", '"')
    .replaceAll("&gt;", ">").replaceAll("&lt;", "<")
    .replaceAll("&rarr;", "→").replaceAll("&amp;", "&");
  return i18n.t(english, {
    ...values,
    ns: "ui",
    keySeparator: false,
    nsSeparator: false,
    defaultValue: fallback,
    interpolation: { skipOnVariables: true },
  });
}

export function statusDisplayName(status: string, fallback?: string): string {
  const english = status.replace(/_/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
  return i18n.language === "zh-CN" && Object.hasOwn(chinese, english)
    ? translateUi(english)
    : fallback ?? english;
}
