"use client";

import React from "react";
import { IconPlus, IconSparkle, Wordmark } from "./ui";

/**
 * 初回訪問時だけ出す入口。
 *
 * 以前は初期データ（A/B/C/D、お弁当 12,000円）がいきなり入っていて、
 * それがサンプルなのか自分のデータなのか判断できなかった。
 * どちらかを選ぶと保存が走り、次回以降は出なくなる。
 */
export function StartChoice({
  onSample,
  onEmpty,
}: {
  onSample: () => void;
  onEmpty: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-canvas/80 p-4 backdrop-blur-sm"
      role="presentation"
    >
      <div
        aria-labelledby="start-title"
        aria-modal="true"
        className="card w-full max-w-md p-6"
        role="dialog"
      >
        <Wordmark />

        <h2 className="mt-4 text-lg font-bold tracking-tight" id="start-title">
          立替をまとめて、送金までを一発で
        </h2>
        <p className="mt-1.5 text-xs leading-relaxed text-ink-muted">
          グループごとに負担の重みを変えられる割り勘ツールです。
          入力内容はこの端末にだけ保存されます。
        </p>

        <div className="mt-5 grid gap-2.5">
          <button className="btn btn-primary w-full py-3" onClick={onSample} type="button">
            <IconSparkle className="h-4 w-4" />
            サンプルを見る
          </button>
          <button className="btn btn-ghost w-full py-3" onClick={onEmpty} type="button">
            <IconPlus className="h-4 w-4" />
            空から始める
          </button>
        </div>

        <p className="mt-3 text-center text-[11px] text-ink-subtle">
          あとから「リセット」でいつでも切り替えられます
        </p>
      </div>
    </div>
  );
}
