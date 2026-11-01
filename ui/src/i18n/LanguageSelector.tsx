import { useState } from "react";
import { Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { readUiLanguage, saveUiLanguage, type UiLanguage } from "./language-preference";
import { translateUi } from "./ui-copy";

export function LanguageSelector() {
  const current = readUiLanguage();
  const [language, setLanguage] = useState<UiLanguage>(current);
  const [error, setError] = useState(false);

  function applyLanguage() {
    try {
      saveUiLanguage(language);
      // Reload explicitly so module-level option lists also use the new locale.
      // The user sees this action before deciding to leave any open edit form.
      window.location.reload();
    } catch {
      setError(true);
    }
  }

  return (
    <div className="space-y-2 rounded-lg px-2.5 py-2">
      <label className="flex items-center gap-2 text-sm">
        <Languages className="size-4" />
        <span>{translateUi("Interface language")}</span>
        <select
          aria-label={translateUi("Interface language")}
          className="min-w-0 flex-1 rounded border border-input bg-background p-1 text-sm"
          value={language}
          onChange={(event) => setLanguage(event.target.value as UiLanguage)}
        >
          <option value="zh-CN">简体中文</option>
          <option value="en">English</option>
        </select>
      </label>
      {language !== current ? (
        <>
          <p className="text-xs text-muted-foreground">{translateUi("Save your edits before refreshing the page.")}</p>
          <Button size="sm" variant="outline" onClick={applyLanguage}>{translateUi("Apply and refresh")}</Button>
        </>
      ) : null}
      {error ? <p role="alert" className="text-xs text-destructive">{translateUi("Unable to save language. Allow browser storage and try again.")}</p> : null}
    </div>
  );
}
