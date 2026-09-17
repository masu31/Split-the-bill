"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import {
  calculateBill,
  formatYen,
  validateMoneyInput,
  validateWeightInput,
} from "./calc";
import {
  type AppState,
  cloneInitialState,
  type ExpenseInput,
  type GroupInput,
  makeId,
  type PersonInput,
} from "./model";
import { useStoredState } from "./storage";

function newExpense(payerId = ""): ExpenseInput {
  return {
    id: makeId(),
    payerId,
    item: "",
    amountStr: "",
    targetMode: "all",
    targetPersonIds: [],
  };
}

function newGroup(index: number): GroupInput {
  return { id: makeId(), name: `グループ${index}`, weightStr: "1" };
}

export default function Page() {
  const { state, setState, recoveredStorage } = useStoredState(cloneInitialState());
  const [resetOpen, setResetOpen] = useState(false);
  const [undoState, setUndoState] = useState<AppState | null>(null);
  const [copyDone, setCopyDone] = useState(false);

  const calculation = useMemo(() => calculateBill(state), [state]);
  const displayNameById = useMemo(
    () => new Map(calculation.rows.map((row) => [row.id, row.displayName])),
    [calculation.rows]
  );
  const teacherError = validateMoneyInput(state.teacherTotalStr).error;

  const copyText = useMemo(() => {
    const lines = [
      state.title || "精算",
      `支出合計 ${formatYen(calculation.total)}円 / 全体支出 ${formatYen(calculation.allTargetTotal)}円 / 先生チーム ${formatYen(calculation.teacherCredit)}円 / 参加者負担 ${formatYen(calculation.remainder)}円`,
      "",
    ];

    if (calculation.expenseSummaries.length > 0) {
      lines.push("支出：", ...calculation.expenseSummaries, "");
    }

    lines.push("各自の内訳：");
    if (calculation.rows.length === 0) {
      lines.push("参加者なし");
    } else {
      for (const row of calculation.rows) {
        const sign = row.balance >= 0 ? "+" : "";
        lines.push(
          `${row.displayName} [${row.groupName}] 負担 ${formatYen(row.share)}円 / 立替 ${formatYen(row.paid)}円 / 差額 ${sign}${formatYen(row.balance)}円`
        );
      }
    }
    lines.push("");

    if (calculation.transfers.length === 0) {
      lines.push("送金なし");
    } else {
      lines.push("送金：");
      for (const transfer of calculation.transfers) {
        lines.push(`${transfer.from} → ${transfer.to} : ${formatYen(transfer.amount)}円`);
      }
    }

    return lines.join("\n");
  }, [calculation, state.title]);

  useEffect(() => {
    if (!undoState) return;
    const timeoutId = window.setTimeout(() => setUndoState(null), 8000);
    return () => window.clearTimeout(timeoutId);
  }, [undoState]);

  useEffect(() => {
    if (!copyDone) return;
    const timeoutId = window.setTimeout(() => setCopyDone(false), 2500);
    return () => window.clearTimeout(timeoutId);
  }, [copyDone]);

  function patchState(patch: Partial<AppState>) {
    setState((previous) => ({ ...previous, ...patch }));
  }

  function addGroup() {
    patchState({ groups: [...state.groups, newGroup(state.groups.length + 1)] });
  }

  function updateGroup(id: string, patch: Partial<GroupInput>) {
    patchState({
      groups: state.groups.map((group) => (group.id === id ? { ...group, ...patch } : group)),
    });
  }

  function removeGroup(id: string) {
    if (state.groups.length <= 1) return;
    const fallbackGroup = state.groups.find((group) => group.id !== id);
    if (!fallbackGroup) return;
    patchState({
      groups: state.groups.filter((group) => group.id !== id),
      people: state.people.map((person) =>
        person.groupId === id ? { ...person, groupId: fallbackGroup.id } : person
      ),
    });
  }

  function addPerson() {
    patchState({
      people: [
        ...state.people,
        { id: makeId(), name: "", groupId: state.groups[0]?.id ?? "" },
      ],
    });
  }

  function updatePerson(id: string, patch: Partial<PersonInput>) {
    patchState({
      people: state.people.map((person) =>
        person.id === id ? { ...person, ...patch } : person
      ),
    });
  }

  function removePerson(id: string) {
    patchState({
      people: state.people.filter((person) => person.id !== id),
      expenses: state.expenses.map((expense) => ({
        ...expense,
        payerId: expense.payerId === id ? "" : expense.payerId,
        targetPersonIds: expense.targetPersonIds.filter((personId) => personId !== id),
      })),
    });
  }

  function addExpense() {
    patchState({
      expenses: [...state.expenses, newExpense(state.people[0]?.id ?? "")],
    });
  }

  function updateExpense(id: string, patch: Partial<ExpenseInput>) {
    patchState({
      expenses: state.expenses.map((expense) =>
        expense.id === id ? { ...expense, ...patch } : expense
      ),
    });
  }

  function removeExpense(id: string) {
    patchState({ expenses: state.expenses.filter((expense) => expense.id !== id) });
  }

  function toggleExpenseTarget(expenseId: string, personId: string) {
    patchState({
      expenses: state.expenses.map((expense) => {
        if (expense.id !== expenseId) return expense;
        const selected = expense.targetPersonIds.includes(personId);
        return {
          ...expense,
          targetPersonIds: selected
            ? expense.targetPersonIds.filter((id) => id !== personId)
            : [...expense.targetPersonIds, personId],
        };
      }),
    });
  }

  function resetApp() {
    setUndoState(structuredClone(state));
    setState(cloneInitialState());
    setResetOpen(false);
  }

  function undoReset() {
    if (!undoState) return;
    setState(undoState);
    setUndoState(null);
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-slate-50 text-gray-900">
      <CornerDecorations />

      <main className="relative mx-auto max-w-6xl p-4 sm:p-6">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">割り勘アプリ（研究室用）</h1>
            <p className="mt-1 text-sm text-gray-600">
              全体支出はグループ重み、個人分は選んだ人で均等に精算します。
            </p>
          </div>
          <button
            className="min-h-11 rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium hover:bg-gray-50"
            onClick={() => setResetOpen(true)}
            type="button"
          >
            初期状態に戻す
          </button>
        </header>

        {recoveredStorage && (
          <div
            className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900"
            role="status"
          >
            保存データが壊れていたため、安全な初期状態に戻しました。
          </div>
        )}

        <div className="mt-6 grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-2">
          <div className="min-w-0 space-y-4">
            <section className="rounded-lg bg-sky-50 p-5 shadow-sm ring-1 ring-sky-200">
              <h2 className="text-lg font-semibold text-sky-900">基本</h2>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="タイトル" className="sm:col-span-2">
                  <input
                    className={inputClass(false)}
                    value={state.title}
                    onChange={(event) => patchState({ title: event.target.value })}
                    placeholder="例：歓迎会"
                  />
                </Field>

                <Field label="支出合計（自動）">
                  <div className="mt-1 flex min-h-11 items-center rounded-lg bg-white px-3 text-sm font-semibold ring-1 ring-sky-200">
                    {formatYen(calculation.total)} 円
                  </div>
                </Field>

                <Field label="先生チーム負担（全体支出から）" error={teacherError}>
                  <input
                    aria-invalid={Boolean(teacherError)}
                    className={inputClass(Boolean(teacherError))}
                    value={state.teacherTotalStr}
                    onChange={(event) => patchState({ teacherTotalStr: event.target.value })}
                    inputMode="numeric"
                    placeholder="例：6000"
                  />
                </Field>
              </div>
            </section>

            <section className="rounded-lg bg-orange-50 p-5 shadow-sm ring-1 ring-orange-200">
              <SectionHeader
                title="グループと重み"
                buttonLabel="グループを追加"
                onAdd={addGroup}
              />
              <div className="mt-3 space-y-3">
                {state.groups.map((group) => {
                  const weightError = validateWeightInput(group.weightStr).error;
                  return (
                    <div
                      className="grid gap-2 rounded-lg border border-orange-200 bg-white p-3 sm:grid-cols-[1fr_140px_88px]"
                      key={group.id}
                    >
                      <Field label="グループ名">
                        <input
                          className={inputClass(false)}
                          value={group.name}
                          onChange={(event) =>
                            updateGroup(group.id, { name: event.target.value })
                          }
                          placeholder="例：D1、教員、OB"
                        />
                      </Field>
                      <Field label="重み" error={weightError}>
                        <input
                          aria-invalid={Boolean(weightError)}
                          className={inputClass(Boolean(weightError))}
                          value={group.weightStr}
                          onChange={(event) =>
                            updateGroup(group.id, { weightStr: event.target.value })
                          }
                          inputMode="decimal"
                          placeholder="例：1.5"
                        />
                      </Field>
                      <div className="flex items-end">
                        <button
                          className="min-h-11 w-full rounded-lg border border-orange-300 bg-white px-3 text-sm hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-40"
                          disabled={state.groups.length <= 1}
                          onClick={() => removeGroup(group.id)}
                          type="button"
                        >
                          削除
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="mt-3 text-xs text-orange-900/70">
                重みは0.5や1.5などの小数も使えます。全体支出だけに適用されます。
              </p>
            </section>

            <section className="rounded-lg bg-emerald-50 p-5 shadow-sm ring-1 ring-emerald-200">
              <SectionHeader title="参加者" buttonLabel="参加者を追加" onAdd={addPerson} />
              {state.people.length === 0 ? (
                <EmptyState text="参加者はまだいません。追加ボタンから登録できます。" />
              ) : (
                <div className="mt-3 space-y-2">
                  {state.people.map((person) => (
                    <div
                      className="grid gap-2 rounded-lg border border-emerald-200 bg-white p-3 sm:grid-cols-[1fr_180px_88px]"
                      key={person.id}
                    >
                      <Field label="名前">
                        <input
                          className={inputClass(false)}
                          value={person.name}
                          onChange={(event) =>
                            updatePerson(person.id, { name: event.target.value })
                          }
                          placeholder="例：田中"
                        />
                      </Field>
                      <Field label="グループ">
                        <select
                          className={inputClass(false)}
                          value={person.groupId}
                          onChange={(event) =>
                            updatePerson(person.id, { groupId: event.target.value })
                          }
                        >
                          {state.groups.map((group) => (
                            <option key={group.id} value={group.id}>
                              {group.name || "名称未設定"}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <div className="flex items-end">
                        <button
                          className="min-h-11 w-full rounded-lg border border-emerald-300 bg-white px-3 text-sm hover:bg-emerald-100"
                          onClick={() => removePerson(person.id)}
                          type="button"
                        >
                          削除
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-lg bg-violet-50 p-5 shadow-sm ring-1 ring-violet-200">
              <SectionHeader title="支出" buttonLabel="支出を追加" onAdd={addExpense} />
              {state.expenses.length === 0 ? (
                <EmptyState text="支出はまだありません。追加すると自動で精算されます。" />
              ) : (
                <div className="mt-3 space-y-3">
                  {state.expenses.map((expense) => {
                    const amountError = validateMoneyInput(expense.amountStr).error;
                    return (
                      <div
                        className="rounded-lg border border-violet-200 bg-white p-3"
                        key={expense.id}
                      >
                        <div className="grid gap-2 sm:grid-cols-[1fr_1fr_150px_88px]">
                          <Field label="払った人">
                            <select
                              className={inputClass(false)}
                              value={expense.payerId}
                              onChange={(event) =>
                                updateExpense(expense.id, { payerId: event.target.value })
                              }
                            >
                              <option value="">未選択</option>
                              {state.people
                                .filter((person) => person.name.trim() !== "")
                                .map((person) => (
                                  <option key={person.id} value={person.id}>
                                    {displayNameById.get(person.id) ?? person.name}
                                  </option>
                                ))}
                            </select>
                          </Field>
                          <Field label="内容">
                            <input
                              className={inputClass(false)}
                              value={expense.item}
                              onChange={(event) =>
                                updateExpense(expense.id, { item: event.target.value })
                              }
                              placeholder="例：お弁当"
                            />
                          </Field>
                          <Field label="金額（円）" error={amountError}>
                            <input
                              aria-invalid={Boolean(amountError)}
                              className={inputClass(Boolean(amountError))}
                              value={expense.amountStr}
                              onChange={(event) =>
                                updateExpense(expense.id, { amountStr: event.target.value })
                              }
                              inputMode="numeric"
                              placeholder="例：2000"
                            />
                          </Field>
                          <div className="flex items-end">
                            <button
                              className="min-h-11 w-full rounded-lg border border-violet-300 bg-white px-3 text-sm hover:bg-violet-100"
                              onClick={() => removeExpense(expense.id)}
                              type="button"
                            >
                              削除
                            </button>
                          </div>
                        </div>

                        <fieldset className="mt-3">
                          <legend className="text-xs font-medium text-gray-700">誰のもの？</legend>
                          <div className="mt-1 grid gap-2 sm:grid-cols-2">
                            <TargetChoice
                              checked={expense.targetMode === "all"}
                              label="全体"
                              name={`target-${expense.id}`}
                              onChange={() => updateExpense(expense.id, { targetMode: "all" })}
                            />
                            <TargetChoice
                              checked={expense.targetMode === "custom"}
                              label="個人を選ぶ"
                              name={`target-${expense.id}`}
                              onChange={() => updateExpense(expense.id, { targetMode: "custom" })}
                            />
                          </div>
                        </fieldset>

                        {expense.targetMode === "custom" && (
                          <fieldset className="mt-3">
                            <legend className="text-xs font-medium text-gray-700">対象の人</legend>
                            {state.people.length === 0 ? (
                              <p className="mt-1 text-sm text-gray-500">参加者を先に追加してください。</p>
                            ) : (
                              <div className="mt-1 grid grid-cols-2 gap-2 sm:grid-cols-4">
                                {state.people.map((person) => (
                                  <label
                                    className="flex min-h-11 items-center gap-2 rounded-lg border border-gray-200 px-3 text-sm"
                                    key={person.id}
                                  >
                                    <input
                                      checked={expense.targetPersonIds.includes(person.id)}
                                      onChange={() => toggleExpenseTarget(expense.id, person.id)}
                                      type="checkbox"
                                    />
                                    {(displayNameById.get(person.id) ?? person.name) || "名前未設定"}
                                  </label>
                                ))}
                              </div>
                            )}
                          </fieldset>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>

          <div className="min-w-0 space-y-4">
            <section className="sticky top-4 z-10 rounded-lg bg-amber-50 p-5 shadow-sm ring-1 ring-amber-200">
              <SummaryCard state={state} calculation={calculation} />
            </section>

            {calculation.warnings.length > 0 && (
              <section
                className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950"
                role="status"
                aria-live="polite"
              >
                <div className="font-semibold">確認してください</div>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  {calculation.warnings.map((warning, index) => (
                    <li key={`${warning}-${index}`}>{warning}</li>
                  ))}
                </ul>
              </section>
            )}

            <section className="rounded-lg bg-rose-50 p-5 shadow-sm ring-1 ring-rose-200">
              <h2 className="text-lg font-semibold text-rose-900">送金</h2>
              {calculation.transfers.length === 0 ? (
                <p className="mt-2 text-sm text-gray-600">送金は不要です。</p>
              ) : (
                <div className="mt-3 space-y-2">
                  {calculation.transfers.map((transfer) => (
                    <div
                      className="flex min-h-12 items-center justify-between gap-3 rounded-lg bg-white px-4 text-sm ring-1 ring-rose-200"
                      key={`${transfer.fromId}-${transfer.toId}-${transfer.amount}`}
                    >
                      <span className="font-medium">
                        {transfer.from} <span className="text-gray-400">→</span> {transfer.to}
                      </span>
                      <span className="text-base font-semibold">
                        {formatYen(transfer.amount)} 円
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold">コピペ用</div>
                  <button
                    className="min-h-11 rounded-lg bg-gray-900 px-4 text-sm font-medium text-white hover:bg-gray-700"
                    onClick={async () => {
                      await navigator.clipboard.writeText(copyText);
                      setCopyDone(true);
                    }}
                    type="button"
                  >
                    コピー
                  </button>
                </div>
                <pre className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap rounded-lg bg-gray-900 p-4 text-xs leading-5 text-gray-100">
                  {copyText}
                </pre>
              </div>
            </section>

            <section className="rounded-lg bg-indigo-50 p-5 shadow-sm ring-1 ring-indigo-200">
              <h2 className="text-lg font-semibold text-indigo-900">内訳</h2>
              {calculation.rows.length === 0 ? (
                <p className="mt-2 text-sm text-gray-600">参加者を追加すると内訳が表示されます。</p>
              ) : (
                <div className="mt-3 overflow-x-auto rounded-lg border border-indigo-200 bg-white">
                  <table className="w-full min-w-[620px] text-sm">
                    <thead className="bg-indigo-100">
                      <tr>
                        <th className="px-3 py-3 text-left">名前</th>
                        <th className="px-3 py-3 text-left">グループ</th>
                        <th className="px-3 py-3 text-right">重み</th>
                        <th className="px-3 py-3 text-right">負担</th>
                        <th className="px-3 py-3 text-right">立替</th>
                        <th className="px-3 py-3 text-right">差額</th>
                      </tr>
                    </thead>
                    <tbody>
                      {calculation.rows.map((row) => (
                        <tr className="border-t border-indigo-100" key={row.id}>
                          <td className="px-3 py-3">{row.displayName}</td>
                          <td className="px-3 py-3">{row.groupName}</td>
                          <td className="px-3 py-3 text-right">{row.weight}</td>
                          <td className="px-3 py-3 text-right">{formatYen(row.share)}</td>
                          <td className="px-3 py-3 text-right">{formatYen(row.paid)}</td>
                          <td
                            className={`px-3 py-3 text-right font-medium ${
                              row.balance >= 0 ? "text-emerald-700" : "text-rose-700"
                            }`}
                          >
                            {row.balance >= 0 ? "+" : ""}
                            {formatYen(row.balance)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <p className="mt-3 text-xs text-indigo-900/70">
                全体支出はグループ重みで配分し、個人指定の支出は選んだ人だけで均等割りします。
              </p>
            </section>
          </div>
        </div>
      </main>

      {resetOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) setResetOpen(false);
          }}
        >
          <div
            aria-labelledby="reset-title"
            aria-modal="true"
            className="w-full max-w-sm rounded-lg bg-white p-5 shadow-xl"
            role="dialog"
          >
            <h2 className="text-lg font-semibold" id="reset-title">
              入力内容を初期状態に戻しますか？
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              リセット後8秒間は、画面下のボタンから元に戻せます。
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                className="min-h-11 rounded-lg border border-gray-300 px-4 text-sm font-medium hover:bg-gray-50"
                onClick={() => setResetOpen(false)}
                type="button"
              >
                キャンセル
              </button>
              <button
                className="min-h-11 rounded-lg bg-rose-600 px-4 text-sm font-medium text-white hover:bg-rose-700"
                onClick={resetApp}
                type="button"
              >
                リセット
              </button>
            </div>
          </div>
        </div>
      )}

      {(undoState || copyDone) && (
        <div
          className="fixed bottom-4 left-1/2 z-50 flex min-h-12 -translate-x-1/2 items-center gap-4 rounded-lg bg-gray-900 px-4 py-2 text-sm text-white shadow-xl"
          role="status"
          aria-live="polite"
        >
          <span>{undoState ? "入力内容をリセットしました。" : "コピーしました。"}</span>
          {undoState && (
            <button
              className="min-h-11 font-semibold text-sky-300 hover:text-sky-200"
              onClick={undoReset}
              type="button"
            >
              元に戻す
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function CornerDecorations() {
  return (
    <>
      <Image className="pointer-events-none absolute -left-20 -top-14 hidden opacity-55 md:block" src="/party-snacks.svg" alt="" aria-hidden="true" width={180} height={148} loading="eager" />
      <Image className="pointer-events-none absolute -right-20 -top-12 hidden rotate-12 opacity-55 md:block" src="/party-snacks.svg" alt="" aria-hidden="true" width={190} height={156} loading="eager" />
      <Image className="pointer-events-none absolute -bottom-8 -left-10 hidden rotate-[-14deg] opacity-40 lg:block" src="/party-snacks.svg" alt="" aria-hidden="true" width={220} height={180} />
      <Image className="pointer-events-none absolute -bottom-10 -right-8 hidden rotate-[18deg] opacity-40 lg:block" src="/party-snacks.svg" alt="" aria-hidden="true" width={205} height={168} />
    </>
  );
}

function inputClass(hasError: boolean): string {
  return `mt-1 min-h-11 min-w-0 w-full rounded-lg border bg-white px-3 text-sm outline-none transition focus:ring-2 ${
    hasError
      ? "border-rose-500 focus:border-rose-500 focus:ring-rose-200"
      : "border-gray-300 focus:border-sky-500 focus:ring-sky-200"
  }`;
}

function Field({ label, error, className = "", children }: { label: string; error?: string | null; className?: string; children: React.ReactNode }) {
  return (
    <label className={`block min-w-0 ${className}`}>
      <span className="block text-xs font-medium text-gray-700">{label}</span>
      {children}
      {error && <span className="mt-1 block text-xs text-rose-700">{error}</span>}
    </label>
  );
}

function SectionHeader({ title, buttonLabel, onAdd }: { title: string; buttonLabel: string; onAdd: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-lg font-semibold">{title}</h2>
      <button className="min-h-11 rounded-lg bg-gray-900 px-4 text-sm font-medium text-white hover:bg-gray-700" onClick={onAdd} type="button">
        {buttonLabel}
      </button>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="mt-3 rounded-lg border border-dashed border-gray-300 bg-white/70 p-5 text-center text-sm text-gray-600">{text}</div>;
}

function TargetChoice({ checked, label, name, onChange }: { checked: boolean; label: string; name: string; onChange: () => void }) {
  return (
    <label className="flex min-h-11 items-center gap-2 rounded-lg border border-gray-200 px-3 text-sm">
      <input checked={checked} name={name} onChange={onChange} type="radio" />
      {label}
    </label>
  );
}

function SummaryCard({ state, calculation }: { state: AppState; calculation: ReturnType<typeof calculateBill> }) {
  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs text-gray-500">イベント</div>
          <div className="mt-1 text-lg font-semibold">{state.title || "（無題）"}</div>
        </div>
        <div className="rounded-full bg-white px-3 py-1 text-xs font-medium text-gray-700 ring-1 ring-amber-200">参加者 {calculation.rows.length}人</div>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        <Kpi label="支出合計" value={`${formatYen(calculation.total)}円`} />
        <Kpi label="先生チーム" value={`${formatYen(calculation.teacherCredit)}円`} />
        <Kpi label="参加者負担" value={`${formatYen(calculation.remainder)}円`} />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {state.groups.map((group) => (
          <div className="flex min-h-11 items-center justify-between rounded-lg bg-white px-3 text-xs ring-1 ring-amber-200" key={group.id}>
            <span className="truncate text-gray-600">{group.name || "名称未設定"}</span>
            <span className="ml-2 font-semibold">{validateWeightInput(group.weightStr).value}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 text-right text-xs text-gray-600">参加者の合計重み {calculation.sumWeight}</div>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white p-3 ring-1 ring-amber-200">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="mt-1 break-words text-sm font-semibold">{value}</div>
    </div>
  );
}
