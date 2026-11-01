import { afterEach, describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { i18n } from ".";
import { resolveUiLanguage } from "./language-preference";
import { statusDisplayName, translateUi } from "./ui-copy";
import chinese from "./copy/zh-CN.json";
import { validateLocaleMessages } from "./locale-validation";
import { StatusBadge, IssueStatusBadge } from "@/components/StatusBadge";

afterEach(async () => { await i18n.changeLanguage("en"); });

describe("Simplified Chinese board", () => {
  it("defaults a fresh browser to Chinese and preserves an explicit English choice", () => {
    expect(resolveUiLanguage(null)).toBe("zh-CN");
    expect(resolveUiLanguage("zh-CN")).toBe("zh-CN");
    expect(resolveUiLanguage("en")).toBe("en");
    expect(resolveUiLanguage("unsupported")).toBe("zh-CN");
  });

  it("renders the review gate in Chinese while preserving its canonical state", async () => {
    await i18n.changeLanguage("zh-CN");
    expect(statusDisplayName("in_review")).toBe("待人工检查");
    const html = renderToStaticMarkup(<IssueStatusBadge status="in_review" />);
    expect(html).toContain("待人工检查");
    expect(html).not.toContain("In review");
    expect(translateUi("Approve")).toBe("批准");
    expect(translateUi("Reject")).toBe("拒绝");
  });

  it("retains user-provided labels and falls back to readable English", async () => {
    await i18n.changeLanguage("zh-CN");
    const html = renderToStaticMarkup(<StatusBadge status="in_review" label="Customer original title" />);
    expect(html).toContain("Customer original title");
    expect(translateUi("New upstream message")).toBe("New upstream message");
    await i18n.changeLanguage("en");
    expect(translateUi("Approve")).toBe("Approve");
    expect(translateUi("Couldn&apos;t load companies")).toBe("Couldn't load companies");
    expect(statusDisplayName("in_review", "In review")).toBe("In review");
  });

  it("interpolates review participants without translating their names", async () => {
    await i18n.changeLanguage("zh-CN");
    expect(translateUi("{{stage}} pending with {{person}}", { stage: "审批", person: "Original name" }))
      .toBe("等待Original name进行审批");
  });

  it("keeps translation text free from added executable markup, URLs, or placeholders", () => {
    const english = Object.fromEntries(Object.keys(chinese).map((key) => [key, key]));
    expect(validateLocaleMessages(chinese, english)).toEqual([]);
  });
});
