"use client";

import React from "react";
import { THEME_LABEL, THEME_ORDER, useTheme } from "../theme";
import { IconDisplay, IconMoon, IconSun } from "./ui";

const ICON = {
  system: IconDisplay,
  light: IconSun,
  dark: IconMoon,
} as const;

export function ThemeToggle() {
  const [theme, setTheme] = useTheme();
  const Icon = ICON[theme];
  const next = THEME_ORDER[(THEME_ORDER.indexOf(theme) + 1) % THEME_ORDER.length];

  return (
    <button
      className="btn btn-ghost px-2"
      onClick={() => setTheme(next)}
      type="button"
      // 現在の状態と、押したときに何になるかの両方を読み上げさせる
      aria-label={`表示テーマ：${THEME_LABEL[theme]}。押すと${THEME_LABEL[next]}に切り替わります`}
      title={`表示テーマ：${THEME_LABEL[theme]}`}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}
