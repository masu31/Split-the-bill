"use client";

import React, { useId } from "react";
import { validateMoneyInput } from "../calc";
import type { ExpenseInput } from "../model";
import {
  Avatar,
  EmptyState,
  Field,
  IconPlus,
  IconReceipt,
  IconTrash,
  Money,
  SectionCard,
  fieldClass,
} from "./ui";

/** 名前が入っていて、送金表での表示名が決まっている参加者 */
export type NamedPerson = { id: string; displayName: string };

function ExpenseCard({
  expense,
  index,
  people,
  canRemove,
  onChange,
  onToggleTarget,
  onSetTargets,
  onRemove,
}: {
  expense: ExpenseInput;
  index: number;
  people: NamedPerson[];
  canRemove: boolean;
  onChange: (patch: Partial<ExpenseInput>) => void;
  onToggleTarget: (personId: string) => void;
  onSetTargets: (personIds: string[]) => void;
  onRemove: () => void;
}) {
  const uid = useId();
  const payerId = `${uid}-payer`;
  const itemId = `${uid}-item`;
  const amountId = `${uid}-amount`;
  // 同じ支出のラジオだけをグループ化する（矢印キーでの移動に必要）
  const modeName = `${uid}-mode`;

  const amountValidation = validateMoneyInput(expense.amountStr);
  const amount = amountValidation.value;
  const amountError = amountValidation.error;
  const label = expense.item.trim() || `支出 ${index + 1}`;
  const selectedCount = expense.targetPersonIds.filter((id) =>
    people.some((p) => p.id === id)
  ).length;

  return (
    <li className="rounded-xl border border-line bg-surface-2/60 p-3 transition-colors hover:border-line-strong">
      <div className="flex items-center gap-2">
        <span className="min-w-0 flex-1 truncate text-xs font-medium text-ink-muted">{label}</span>
        {amount > 0 && (
          <Money value={amount} className="text-xs font-semibold text-ink" />
        )}
        <button
          className="btn btn-danger-ghost px-2"
          onClick={onRemove}
          type="button"
          disabled={!canRemove}
          aria-label={`${label}を削除`}
          title={canRemove ? "削除" : "支出は1件以上必要です"}
        >
          <IconTrash className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-2.5 grid grid-cols-1 gap-2.5 sm:grid-cols-12">
        <Field label="払った人" htmlFor={payerId} className="sm:col-span-4">
          <select
            id={payerId}
            className="field field-select"
            value={expense.payerId}
            onChange={(e) => onChange({ payerId: e.target.value })}
          >
            <option value="">未選択</option>
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.displayName}
              </option>
            ))}
          </select>
        </Field>

        <Field label="内容" htmlFor={itemId} className="sm:col-span-4">
          <input
            id={itemId}
            className="field"
            value={expense.item}
            onChange={(e) => onChange({ item: e.target.value })}
            placeholder="例：お弁当"
            autoComplete="off"
          />
        </Field>

        <Field
          label="金額（円）"
          htmlFor={amountId}
          error={amountError}
          className="sm:col-span-4"
        >
          <input
            id={amountId}
            className={fieldClass(Boolean(amountError), "num")}
            aria-invalid={Boolean(amountError)}
            aria-describedby={amountError ? `${amountId}-error` : undefined}
            value={expense.amountStr}
            onChange={(e) => onChange({ amountStr: e.target.value })}
            inputMode="numeric"
            placeholder="2000"
            autoComplete="off"
          />
        </Field>
      </div>

      <fieldset className="mt-3">
        <legend className="text-xs font-medium text-ink-muted">誰が負担する？</legend>
        <div className="mt-1.5 grid grid-cols-2 gap-2">
          <ModeOption
            name={modeName}
            checked={expense.targetMode === "all"}
            onSelect={() => onChange({ targetMode: "all" })}
            title="全体"
            note="グループの重みで配分"
          />
          <ModeOption
            name={modeName}
            checked={expense.targetMode === "custom"}
            onSelect={() => onChange({ targetMode: "custom" })}
            title="個人を選ぶ"
            note="選んだ人で均等割り"
          />
        </div>
      </fieldset>

      {expense.targetMode === "custom" && (
        <fieldset className="mt-3">
          <div className="flex items-center justify-between gap-2">
            <legend className="text-xs font-medium text-ink-muted">
              対象の人
              <span className="ml-1 text-ink-subtle">（{selectedCount}人）</span>
            </legend>
            <div className="flex gap-1">
              <button
                className="btn btn-ghost px-2 py-1 text-[11px]"
                type="button"
                onClick={() => onSetTargets(people.map((p) => p.id))}
                disabled={people.length === 0}
              >
                全員
              </button>
              <button
                className="btn btn-ghost px-2 py-1 text-[11px]"
                type="button"
                onClick={() => onSetTargets([])}
                disabled={selectedCount === 0}
              >
                クリア
              </button>
            </div>
          </div>

          {people.length === 0 ? (
            <p className="mt-1.5 text-xs text-ink-subtle">
              先に参加者の名前を入力してください。
            </p>
          ) : (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {people.map((p) => (
                <label
                  key={p.id}
                  className="flex cursor-pointer items-center gap-1.5 rounded-full border border-line-strong bg-surface py-1.5 pl-1.5 pr-3 text-xs transition-colors has-[:checked]:border-brand has-[:checked]:bg-brand-soft has-[:checked]:text-brand-ink has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand"
                >
                  <input
                    className="sr-only"
                    checked={expense.targetPersonIds.includes(p.id)}
                    onChange={() => onToggleTarget(p.id)}
                    type="checkbox"
                  />
                  <Avatar id={p.id} name={p.displayName} size="sm" />
                  {p.displayName}
                </label>
              ))}
            </div>
          )}
        </fieldset>
      )}
    </li>
  );
}

function ModeOption({
  name,
  checked,
  onSelect,
  title,
  note,
}: {
  name: string;
  checked: boolean;
  onSelect: () => void;
  title: string;
  note: string;
}) {
  return (
    <label className="flex cursor-pointer flex-col justify-center rounded-xl border border-line-strong bg-surface px-3 py-2 transition-colors has-[:checked]:border-brand has-[:checked]:bg-brand-soft has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand">
      <input
        className="sr-only"
        type="radio"
        name={name}
        checked={checked}
        onChange={onSelect}
      />
      <span
        className={`text-xs font-semibold ${checked ? "text-brand-ink" : "text-ink"}`}
      >
        {title}
      </span>
      <span className="mt-0.5 text-[11px] text-ink-subtle">{note}</span>
    </label>
  );
}

export function ExpenseEditor({
  expenses,
  people,
  total,
  onAdd,
  onChange,
  onToggleTarget,
  onSetTargets,
  onRemove,
}: {
  expenses: ExpenseInput[];
  /** 名前が入っている参加者だけ */
  people: NamedPerson[];
  total: number;
  onAdd: () => void;
  onChange: (id: string, patch: Partial<ExpenseInput>) => void;
  onToggleTarget: (expenseId: string, personId: string) => void;
  onSetTargets: (expenseId: string, personIds: string[]) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <SectionCard
      id="expenses"
      icon={<IconReceipt />}
      title="支出"
      description="立て替えた人ごとに1件ずつ登録します"
      action={
        <button className="btn btn-primary" onClick={onAdd} type="button">
          <IconPlus className="h-3.5 w-3.5" />
          追加
        </button>
      }
    >
      {expenses.length === 0 ? (
        <EmptyState>「追加」から支出を登録してください。</EmptyState>
      ) : (
        <>
          <ul className="space-y-2.5">
            {expenses.map((expense, i) => (
              <ExpenseCard
                key={expense.id}
                expense={expense}
                index={i}
                people={people}
                canRemove={expenses.length > 1}
                onChange={(patch) => onChange(expense.id, patch)}
                onToggleTarget={(personId) => onToggleTarget(expense.id, personId)}
                onSetTargets={(personIds) => onSetTargets(expense.id, personIds)}
                onRemove={() => onRemove(expense.id)}
              />
            ))}
          </ul>
          <div className="mt-3 flex items-center justify-between rounded-xl bg-surface-2 px-3 py-2.5 text-xs">
            <span className="font-medium text-ink-muted">支出合計</span>
            <Money value={total} className="text-sm font-semibold" />
          </div>
        </>
      )}
    </SectionCard>
  );
}
