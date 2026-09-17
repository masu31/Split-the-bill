"use client";

import React, { useId } from "react";
import { validateWeightInput } from "../calc";
import type { GroupInput } from "../model";
import {
  EmptyState,
  Field,
  IconPlus,
  IconScale,
  IconTrash,
  SectionCard,
  fieldClass,
} from "./ui";

function GroupRow({
  group,
  index,
  memberCount,
  canRemove,
  onChange,
  onRemove,
}: {
  group: GroupInput;
  index: number;
  memberCount: number;
  canRemove: boolean;
  onChange: (patch: Partial<GroupInput>) => void;
  onRemove: () => void;
}) {
  const uid = useId();
  const nameId = `${uid}-name`;
  const weightId = `${uid}-weight`;
  const weightError = validateWeightInput(group.weightStr).error;
  const label = group.name.trim() || `グループ ${index + 1}`;

  return (
    <li className="rounded-xl border border-line bg-surface-2/60 p-3 transition-colors hover:border-line-strong">
      <div className="flex items-center gap-2">
        <span className="min-w-0 flex-1 truncate text-xs font-medium text-ink-muted">{label}</span>
        <span className="num rounded-full bg-surface px-2 py-0.5 text-[11px] text-ink-subtle ring-1 ring-line">
          {memberCount}人
        </span>
        <button
          className="btn btn-danger-ghost px-2"
          onClick={onRemove}
          type="button"
          disabled={!canRemove}
          aria-label={`${label}を削除`}
          title={canRemove ? "削除" : "グループは1つ以上必要です"}
        >
          <IconTrash className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-2.5 grid grid-cols-1 gap-2.5 sm:grid-cols-5">
        <Field label="グループ名" htmlFor={nameId} className="sm:col-span-3">
          <input
            id={nameId}
            className="field"
            value={group.name}
            onChange={(event) => onChange({ name: event.target.value })}
            placeholder="例：B3、D1、教員、OB"
            autoComplete="off"
          />
        </Field>

        <Field label="重み" htmlFor={weightId} error={weightError} className="sm:col-span-2">
          <input
            id={weightId}
            className={fieldClass(Boolean(weightError), "num text-center")}
            aria-invalid={Boolean(weightError)}
            aria-describedby={weightError ? `${weightId}-error` : undefined}
            value={group.weightStr}
            onChange={(event) => onChange({ weightStr: event.target.value })}
            inputMode="decimal"
            placeholder="例：1.5"
            autoComplete="off"
          />
        </Field>
      </div>
    </li>
  );
}

export function GroupEditor({
  groups,
  memberCountByGroup,
  sumWeight,
  onAdd,
  onChange,
  onRemove,
}: {
  groups: GroupInput[];
  memberCountByGroup: Map<string, number>;
  sumWeight: number;
  onAdd: () => void;
  onChange: (id: string, patch: Partial<GroupInput>) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <SectionCard
      id="groups"
      icon={<IconScale />}
      title="グループと重み"
      description="学年でも役職でも、負担の比率を分けたい単位で作れます"
      action={
        <button className="btn btn-primary" onClick={onAdd} type="button">
          <IconPlus className="h-3.5 w-3.5" />
          追加
        </button>
      }
    >
      {groups.length === 0 ? (
        <EmptyState>「追加」からグループを作ってください。</EmptyState>
      ) : (
        <ul className="space-y-2.5">
          {groups.map((group, index) => (
            <GroupRow
              key={group.id}
              group={group}
              index={index}
              memberCount={memberCountByGroup.get(group.id) ?? 0}
              canRemove={groups.length > 1}
              onChange={(patch) => onChange(group.id, patch)}
              onRemove={() => onRemove(group.id)}
            />
          ))}
        </ul>
      )}

      <div className="mt-3 flex items-center justify-between rounded-xl bg-surface-2 px-3 py-2.5 text-xs">
        <span className="font-medium text-ink-muted">参加者の合計重み</span>
        <span className="num text-sm font-semibold">{sumWeight}</span>
      </div>

      <p className="mt-2.5 text-[11px] leading-relaxed text-ink-subtle">
        数字が大きいほど多く負担します。0.5 や 1.5 などの小数も使えます。重みは「全体」の支出にだけ効きます。
      </p>
    </SectionCard>
  );
}
