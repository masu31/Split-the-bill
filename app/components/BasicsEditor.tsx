"use client";

import React, { useId } from "react";
import { formatYen, validateMoneyInput } from "../calc";
import { Field, IconSettings, Money, SectionCard, fieldClass } from "./ui";

export function BasicsEditor({
  title,
  onTitleChange,
  teacherTotalStr,
  onTeacherTotalChange,
  total,
  allTargetTotal,
}: {
  title: string;
  onTitleChange: (value: string) => void;
  teacherTotalStr: string;
  onTeacherTotalChange: (value: string) => void;
  total: number;
  allTargetTotal: number;
}) {
  const titleId = useId();
  const teacherId = useId();
  const teacherError = validateMoneyInput(teacherTotalStr).error;

  return (
    <SectionCard
      id="basics"
      icon={<IconSettings />}
      title="基本設定"
      description="イベント名と、先生チームが持つ分を入れます"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="イベント名" htmlFor={titleId} className="sm:col-span-2">
          <input
            id={titleId}
            className="field"
            value={title}
            onChange={(event) => onTitleChange(event.target.value)}
            placeholder="例：歓迎会"
            autoComplete="off"
          />
        </Field>

        <Field
          label="先生チーム負担（円）"
          htmlFor={teacherId}
          error={teacherError}
          hint={`「全体」の支出（${formatYen(allTargetTotal)}円）から先に差し引きます`}
        >
          <input
            id={teacherId}
            className={fieldClass(Boolean(teacherError), "num")}
            aria-invalid={Boolean(teacherError)}
            aria-describedby={teacherError ? `${teacherId}-error` : undefined}
            value={teacherTotalStr}
            onChange={(event) => onTeacherTotalChange(event.target.value)}
            inputMode="numeric"
            placeholder="例：6000"
            autoComplete="off"
          />
        </Field>

        <div>
          <span className="block text-xs font-medium text-ink-muted">支出合計（自動）</span>
          <div className="mt-1.5 flex min-h-11 items-center rounded-xl bg-surface-2 px-3 text-sm font-semibold">
            <Money value={total} />
          </div>
        </div>
      </div>
    </SectionCard>
  );
}
