"use client";

import { useCallback, useSyncExternalStore } from "react";

export type ThemeChoice = "system" | "light" | "dark";

export const THEME_STORAGE_KEY = "lab-split:theme";

/**
 * 初回描画より前に data-theme を立てるためのスクリプト。
 * これが無いと、OS がダークで手動ライトを選んでいる場合に
 * 一瞬ダークで描画されてしまう。
 *
 * 文字列リテラルのみで、外部入力は一切混ざらない。
 */
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY
)});if(t==="dark"||t==="light"){document.documentElement.setAttribute("data-theme",t)}}catch(e){}})();`;

export const THEME_ORDER: ThemeChoice[] = ["system", "light", "dark"];

export const THEME_LABEL: Record<ThemeChoice, string> = {
  system: "端末の設定に合わせる",
  light: "ライト",
  dark: "ダーク",
};

function isThemeChoice(value: unknown): value is ThemeChoice {
  return value === "system" || value === "light" || value === "dark";
}

let choice: ThemeChoice | null = null;
const listeners = new Set<() => void>();

function readStored(): ThemeChoice {
  try {
    const raw = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isThemeChoice(raw) ? raw : "system";
  } catch {
    return "system";
  }
}

function currentChoice(): ThemeChoice {
  if (choice === null) {
    choice = typeof window === "undefined" ? "system" : readStored();
  }
  return choice;
}

function applyToDocument(next: ThemeChoice) {
  const root = document.documentElement;
  if (next === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", next);
}

export function useTheme(): [ThemeChoice, (next: ThemeChoice) => void] {
  const subscribe = useCallback((onStoreChange: () => void) => {
    listeners.add(onStoreChange);
    return () => {
      listeners.delete(onStoreChange);
    };
  }, []);

  // SSR / ハイドレーション時は "system"。実際の色は上のスクリプトが
  // すでに data-theme で当てているので、画面がちらつくことはない。
  const value = useSyncExternalStore(subscribe, currentChoice, () => "system" as ThemeChoice);

  const setValue = useCallback((next: ThemeChoice) => {
    choice = next;
    applyToDocument(next);
    try {
      if (next === "system") window.localStorage.removeItem(THEME_STORAGE_KEY);
      else window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // 保存できなくても、今のセッションでは切り替わる
    }
    for (const listener of listeners) listener();
  }, []);

  return [value, setValue];
}
