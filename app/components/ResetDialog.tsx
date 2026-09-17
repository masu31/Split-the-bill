"use client";

import React, { useEffect, useRef } from "react";

export function ResetDialog({
  onCancel,
  onConfirm,
}: {
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    cancelRef.current?.focus();
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      role="presentation"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onCancel();
      }}
      data-print="hide"
    >
      <div
        aria-labelledby="reset-title"
        aria-modal="true"
        className="card w-full max-w-sm p-5"
        role="dialog"
      >
        <h2 className="text-base font-semibold tracking-tight" id="reset-title">
          入力内容を初期状態に戻しますか？
        </h2>
        <p className="mt-2 text-xs leading-relaxed text-ink-muted">
          リセット後 8 秒間は、画面下のボタンから元に戻せます。
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button className="btn btn-ghost" onClick={onCancel} ref={cancelRef} type="button">
            キャンセル
          </button>
          <button
            className="btn bg-neg text-white hover:opacity-90"
            onClick={onConfirm}
            type="button"
          >
            リセット
          </button>
        </div>
      </div>
    </div>
  );
}
