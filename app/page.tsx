"use client";

import Image from "next/image";
import React, { useCallback, useEffect, useMemo, useState } from "react";

import { BasicsEditor } from "./components/BasicsEditor";
import { ExpenseEditor, type NamedPerson } from "./components/ExpenseEditor";
import { GroupEditor } from "./components/GroupEditor";
import { PeopleEditor } from "./components/PeopleEditor";
import { ResetDialog } from "./components/ResetDialog";
import {
  BreakdownTable,
  SummaryHero,
  TransferList,
  Warnings,
} from "./components/ResultPanel";
import { IconCheck, IconCopy, IconWarning, Toast } from "./components/ui";
import { calculateBill, formatYen, validateWeightInput } from "./calc";
import { copyToClipboard } from "./clipboard";
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

type ToastState = {
  message: string;
  tone: "ok" | "error";
  action?: { label: string; onClick: () => void };
};

export default function Page() {
  const { state, setState, recoveredStorage } = useStoredState(cloneInitialState());
  const [resetOpen, setResetOpen] = useState(false);
  const [undoState, setUndoState] = useState<AppState | null>(null);
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  const calculation = useMemo(() => calculateBill(state), [state]);

  /* -------------------------------------------------------------- derived */

  const weightByGroup = useMemo(
    () =>
      new Map(
        state.groups.map((group) => [group.id, validateWeightInput(group.weightStr).value])
      ),
    [state.groups]
  );

  const memberCountByGroup = useMemo(() => {
    const counts = new Map<string, number>();
    for (const person of state.people) {
      if (person.name.trim() === "") continue;
      counts.set(person.groupId, (counts.get(person.groupId) ?? 0) + 1);
    }
    return counts;
  }, [state.people]);

  // 送金表と同じ表示名を、支出の「払った人」「対象の人」でも使う
  const namedPeople = useMemo<NamedPerson[]>(
    () => calculation.rows.map((row) => ({ id: row.id, displayName: row.displayName })),
    [calculation.rows]
  );

  const copyText = useMemo(() => {
    const lines = [
      state.title.trim() || "精算",
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

  /* -------------------------------------------------------------- updates */

  const patchState = useCallback(
    (patch: Partial<AppState>) => {
      setState((previous) => ({ ...previous, ...patch }));
    },
    [setState]
  );

  const addGroup = useCallback(() => {
    setState((previous) => ({
      ...previous,
      groups: [...previous.groups, newGroup(previous.groups.length + 1)],
    }));
  }, [setState]);

  const updateGroup = useCallback(
    (id: string, patch: Partial<GroupInput>) => {
      setState((previous) => ({
        ...previous,
        groups: previous.groups.map((group) =>
          group.id === id ? { ...group, ...patch } : group
        ),
      }));
    },
    [setState]
  );

  const removeGroup = useCallback(
    (id: string) => {
      setState((previous) => {
        if (previous.groups.length <= 1) return previous;
        const fallbackGroup = previous.groups.find((group) => group.id !== id);
        if (!fallbackGroup) return previous;
        return {
          ...previous,
          groups: previous.groups.filter((group) => group.id !== id),
          // 所属を失った人は残ったグループへ移す（保存データの検証を通すため）
          people: previous.people.map((person) =>
            person.groupId === id ? { ...person, groupId: fallbackGroup.id } : person
          ),
        };
      });
    },
    [setState]
  );

  const addPerson = useCallback(() => {
    setState((previous) => ({
      ...previous,
      people: [
        ...previous.people,
        { id: makeId(), name: "", groupId: previous.groups[0]?.id ?? "" },
      ],
    }));
  }, [setState]);

  const updatePerson = useCallback(
    (id: string, patch: Partial<PersonInput>) => {
      setState((previous) => ({
        ...previous,
        people: previous.people.map((person) =>
          person.id === id ? { ...person, ...patch } : person
        ),
      }));
    },
    [setState]
  );

  const removePerson = useCallback(
    (id: string) => {
      setState((previous) => ({
        ...previous,
        people: previous.people.filter((person) => person.id !== id),
        expenses: previous.expenses.map((expense) => ({
          ...expense,
          payerId: expense.payerId === id ? "" : expense.payerId,
          targetPersonIds: expense.targetPersonIds.filter((personId) => personId !== id),
        })),
      }));
    },
    [setState]
  );

  const addExpense = useCallback(() => {
    setState((previous) => {
      const firstNamed = previous.people.find((person) => person.name.trim() !== "");
      return {
        ...previous,
        expenses: [...previous.expenses, newExpense(firstNamed?.id ?? "")],
      };
    });
  }, [setState]);

  const updateExpense = useCallback(
    (id: string, patch: Partial<ExpenseInput>) => {
      setState((previous) => ({
        ...previous,
        expenses: previous.expenses.map((expense) =>
          expense.id === id ? { ...expense, ...patch } : expense
        ),
      }));
    },
    [setState]
  );

  const removeExpense = useCallback(
    (id: string) => {
      setState((previous) => ({
        ...previous,
        expenses: previous.expenses.filter((expense) => expense.id !== id),
      }));
    },
    [setState]
  );

  const toggleExpenseTarget = useCallback(
    (expenseId: string, personId: string) => {
      setState((previous) => ({
        ...previous,
        expenses: previous.expenses.map((expense) => {
          if (expense.id !== expenseId) return expense;
          const selected = expense.targetPersonIds.includes(personId);
          return {
            ...expense,
            targetPersonIds: selected
              ? expense.targetPersonIds.filter((id) => id !== personId)
              : [...expense.targetPersonIds, personId],
          };
        }),
      }));
    },
    [setState]
  );

  const setExpenseTargets = useCallback(
    (expenseId: string, personIds: string[]) => {
      setState((previous) => ({
        ...previous,
        expenses: previous.expenses.map((expense) =>
          expense.id === expenseId ? { ...expense, targetPersonIds: personIds } : expense
        ),
      }));
    },
    [setState]
  );

  /* -------------------------------------------------------------- actions */

  const handleCopy = useCallback(async () => {
    const ok = await copyToClipboard(copyText);
    if (ok) {
      setCopied(true);
      setToast({ message: "結果をコピーしました", tone: "ok" });
    } else {
      setToast({
        message: "コピーできませんでした。テキストを選択してください",
        tone: "error",
      });
    }
  }, [copyText]);

  const confirmReset = useCallback(() => {
    setUndoState(structuredClone(state));
    setState(cloneInitialState());
    setResetOpen(false);
  }, [state, setState]);

  const undoReset = useCallback(() => {
    if (!undoState) return;
    setState(undoState);
    setUndoState(null);
  }, [undoState, setState]);

  useEffect(() => {
    if (!undoState) return;
    const timeoutId = window.setTimeout(() => setUndoState(null), 8000);
    return () => window.clearTimeout(timeoutId);
  }, [undoState]);

  useEffect(() => {
    if (!toast) return;
    const timeoutId = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(timeoutId);
  }, [toast]);

  useEffect(() => {
    if (!copied) return;
    const timeoutId = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timeoutId);
  }, [copied]);

  /* ----------------------------------------------------------------- view */

  return (
    <div className="min-h-dvh">
      <header
        className="sticky top-0 z-30 border-b border-line bg-canvas/85 backdrop-blur-md"
        data-print="hide"
      >
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-3 sm:px-6">
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-sm font-semibold tracking-tight sm:text-base">
              割り勘アプリ
              <span className="ml-1.5 text-xs font-normal text-ink-subtle">研究室用</span>
            </h1>
            {/*
              truncate（overflow:hidden）を <a> 自身に付けると、タップ領域を広げる
              ::after が切り取られてしまう。省略は内側の span に持たせる。
            */}
            <a
              href="#result"
              className="tap-target num mt-0.5 block text-[11px] text-ink-muted hover:text-brand lg:pointer-events-none"
            >
              <span className="block truncate">
                参加者負担 {formatYen(calculation.remainder)}円 ・ 送金{" "}
                {calculation.transfers.length}件
                <span className="ml-1 lg:hidden" aria-hidden="true">
                  ↓
                </span>
              </span>
            </a>
          </div>

          <button className="btn btn-ghost" onClick={() => setResetOpen(true)} type="button">
            リセット
          </button>
          <button className="btn btn-primary" onClick={handleCopy} type="button">
            {copied ? <IconCheck className="h-3.5 w-3.5" /> : <IconCopy className="h-3.5 w-3.5" />}
            <span className="hidden sm:inline">{copied ? "コピー済み" : "コピー"}</span>
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="relative mb-5 overflow-hidden rounded-2xl bg-canvas-accent px-5 py-5 sm:px-6 sm:py-6">
          <div className="relative z-10 max-w-lg">
            <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
              立替をまとめて、送金までを一発で
            </h2>
            <p className="mt-1.5 text-xs leading-relaxed text-ink-muted sm:text-sm">
              グループごとに負担の重みを変えられる割り勘ツールです。入力はこの端末に自動保存されます。
            </p>
          </div>
          <Image
            className="pointer-events-none absolute -bottom-6 -right-4 hidden opacity-70 sm:block dark:opacity-25"
            src="/party-snacks.svg"
            alt=""
            aria-hidden="true"
            width={200}
            height={164}
            priority
          />
        </div>

        {recoveredStorage && (
          <div
            className="mb-5 flex items-start gap-2 rounded-2xl border border-warn-line bg-warn-soft p-4 text-sm text-warn"
            role="status"
          >
            <IconWarning />
            <span className="text-xs leading-relaxed">
              保存データが壊れていたため、安全な初期状態に戻しました。
            </span>
          </div>
        )}

        <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
          {/* 入力 */}
          <div className="min-w-0 space-y-5" data-print="hide">
            <BasicsEditor
              title={state.title}
              onTitleChange={(title) => patchState({ title })}
              teacherTotalStr={state.teacherTotalStr}
              onTeacherTotalChange={(teacherTotalStr) => patchState({ teacherTotalStr })}
              total={calculation.total}
              allTargetTotal={calculation.allTargetTotal}
            />

            <GroupEditor
              groups={state.groups}
              memberCountByGroup={memberCountByGroup}
              sumWeight={calculation.sumWeight}
              onAdd={addGroup}
              onChange={updateGroup}
              onRemove={removeGroup}
            />

            <PeopleEditor
              people={state.people}
              groups={state.groups}
              weightByGroup={weightByGroup}
              namedCount={calculation.rows.length}
              onAdd={addPerson}
              onChange={updatePerson}
              onRemove={removePerson}
            />

            <ExpenseEditor
              expenses={state.expenses}
              people={namedPeople}
              total={calculation.total}
              onAdd={addExpense}
              onChange={updateExpense}
              onToggleTarget={toggleExpenseTarget}
              onSetTargets={setExpenseTargets}
              onRemove={removeExpense}
            />
          </div>

          {/* 結果 */}
          <div id="result" className="min-w-0 space-y-5 scroll-mt-20">
            <SummaryHero
              title={state.title}
              total={calculation.total}
              teacherCredit={calculation.teacherCredit}
              remainder={calculation.remainder}
              allTargetTotal={calculation.allTargetTotal}
              paidSum={calculation.paidSum}
              participantCount={calculation.rows.length}
              transferCount={calculation.transfers.length}
              groups={state.groups}
              weightByGroup={weightByGroup}
              sumWeight={calculation.sumWeight}
            />

            <Warnings warnings={calculation.warnings} />

            <TransferList
              transfers={calculation.transfers}
              copyText={copyText}
              copied={copied}
              onCopy={handleCopy}
            />

            <BreakdownTable rows={calculation.rows} />
          </div>
        </div>

        <footer className="mt-8 text-center text-[11px] text-ink-subtle" data-print="hide">
          入力内容はサーバーに送信されず、この端末のブラウザにのみ保存されます。
        </footer>
      </main>

      {resetOpen && (
        <ResetDialog onCancel={() => setResetOpen(false)} onConfirm={confirmReset} />
      )}

      {undoState ? (
        <Toast
          message="入力内容をリセットしました"
          tone="ok"
          action={{ label: "元に戻す", onClick: undoReset }}
        />
      ) : (
        toast && <Toast message={toast.message} tone={toast.tone} />
      )}
    </div>
  );
}
