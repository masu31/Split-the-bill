"use client";

import React, { useMemo, useState } from "react";
import Image from "next/image";

type Grade = "B3" | "B4" | "M1" | "M2";
type TargetMode = "all" | "custom";

type PersonInput = {
  id: string;
  name: string;
  grade: Grade;
};

type ExpenseInput = {
  id: string;
  payerId: string;
  item: string;
  amountStr: string;
  targetMode: TargetMode;
  targetPersonIds: string[];
};

type PersonRow = {
  id: string;
  name: string;
  grade: Grade;
  weight: number;
  paid: number;
  share: number;
  balance: number;
};

type Transfer = { from: string; to: string; amount: number };

const GRADES: Grade[] = ["B3", "B4", "M1", "M2"];

function makeId() {
  return Math.random().toString(36).slice(2, 10);
}

function parseMoney(input: string): number {
  const s = input.replace(/[,￥¥\s]/g, "");
  const n = Number(s);
  return Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0;
}

function parseWeight(input: string): number {
  const s = input.replace(/[,\s]/g, "");
  const n = Number(s);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.round(n));
}

function formatYen(n: number): string {
  return n.toLocaleString("ja-JP");
}

function addToMap(map: Map<string, number>, id: string, amount: number) {
  map.set(id, (map.get(id) ?? 0) + amount);
}

/**
 * 重み付き割り勘（最大剰余法 / Hamilton method）
 * - ideal_i = amount * w_i / sumW
 * - base_i = floor(ideal_i)
 * - leftover = amount - sum(base_i)
 * - fractional が大きい順に +1 円
 */
function computeWeightedShares(
  participants: { id: string; weight: number }[],
  amount: number
): Map<string, number> {
  const shareMap = new Map<string, number>();
  if (participants.length === 0 || amount <= 0) return shareMap;

  const sumW = participants.reduce((a, p) => a + p.weight, 0);

  // 総重み0なら均等割りにフォールバック
  if (sumW <= 0) {
    const n = participants.length;
    const base = Math.floor(amount / n);
    const rem = amount - base * n;
    for (const p of participants) shareMap.set(p.id, base);
    for (let i = 0; i < rem; i++) {
      const who = participants[i % n].id;
      shareMap.set(who, (shareMap.get(who) ?? 0) + 1);
    }
    return shareMap;
  }

  let baseSum = 0;
  const tmp = participants.map((p) => {
    const ideal = (amount * p.weight) / sumW;
    const base = Math.floor(ideal);
    const frac = ideal - base;
    baseSum += base;
    return { id: p.id, base, frac };
  });

  for (const t of tmp) shareMap.set(t.id, t.base);

  const leftover = amount - baseSum;
  if (leftover > 0) {
    tmp.sort((a, b) => b.frac - a.frac);
    for (let i = 0; i < leftover; i++) {
      const who = tmp[i % tmp.length].id;
      shareMap.set(who, (shareMap.get(who) ?? 0) + 1);
    }
  }
  return shareMap;
}

/**
 * 送金表（貪欲）
 */
function settle(rows: PersonRow[]): Transfer[] {
  const payers = rows
    .filter((r) => r.balance < 0)
    .map((r) => ({ name: r.name, amt: -r.balance }))
    .sort((a, b) => b.amt - a.amt);

  const receivers = rows
    .filter((r) => r.balance > 0)
    .map((r) => ({ name: r.name, amt: r.balance }))
    .sort((a, b) => b.amt - a.amt);

  const transfers: Transfer[] = [];
  let i = 0;
  let j = 0;

  while (i < payers.length && j < receivers.length) {
    const p = payers[i];
    const r = receivers[j];
    const x = Math.min(p.amt, r.amt);

    if (x > 0) {
      transfers.push({ from: p.name, to: r.name, amount: x });
      p.amt -= x;
      r.amt -= x;
    }
    if (p.amt === 0) i++;
    if (r.amt === 0) j++;
  }
  return transfers;
}

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

export default function Page() {
  const [title, setTitle] = useState("飲み会");
  const [teacherTotalStr, setTeacherTotalStr] = useState("6000"); // 先生チーム合計

  // 学年ごとの重み（毎回変えられる）
  const [wB3, setWB3] = useState("2");
  const [wB4, setWB4] = useState("3");
  const [wM1, setWM1] = useState("4");
  const [wM2, setWM2] = useState("4");

  // 参加者（WALICA風）
  const [people, setPeople] = useState<PersonInput[]>([
    { id: "person-a", name: "A", grade: "B4" },
    { id: "person-b", name: "B", grade: "M1" },
    { id: "person-c", name: "C", grade: "B3" },
    { id: "person-d", name: "D", grade: "M2" },
  ]);

  const [expenses, setExpenses] = useState<ExpenseInput[]>([
    {
      id: makeId(),
      payerId: "person-a",
      item: "お弁当",
      amountStr: "12000",
      targetMode: "all",
      targetPersonIds: [],
    },
    {
      id: makeId(),
      payerId: "person-b",
      item: "飲み物",
      amountStr: "12000",
      targetMode: "all",
      targetPersonIds: [],
    },
  ]);

  function addPerson() {
    setPeople((prev) => [...prev, { id: makeId(), name: "", grade: "B4" }]);
  }

  function removePerson(id: string) {
    setPeople((prev) => prev.filter((p) => p.id !== id));
    setExpenses((prev) =>
      prev.map((expense) => ({
        ...expense,
        payerId: expense.payerId === id ? "" : expense.payerId,
        targetPersonIds: expense.targetPersonIds.filter((personId) => personId !== id),
      }))
    );
  }

  function updatePerson(id: string, patch: Partial<PersonInput>) {
    setPeople((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }

  function addExpense() {
    setExpenses((prev) => [...prev, newExpense(people[0]?.id ?? "")]);
  }

  function removeExpense(id: string) {
    setExpenses((prev) => prev.filter((expense) => expense.id !== id));
  }

  function updateExpense(id: string, patch: Partial<ExpenseInput>) {
    setExpenses((prev) =>
      prev.map((expense) => (expense.id === id ? { ...expense, ...patch } : expense))
    );
  }

  function toggleExpenseTarget(expenseId: string, personId: string) {
    setExpenses((prev) =>
      prev.map((expense) => {
        if (expense.id !== expenseId) return expense;
        const exists = expense.targetPersonIds.includes(personId);
        return {
          ...expense,
          targetPersonIds: exists
            ? expense.targetPersonIds.filter((id) => id !== personId)
            : [...expense.targetPersonIds, personId],
        };
      })
    );
  }

  const {
    total,
    teacherTotal,
    teacherCredit,
    allTargetTotal,
    remainder,
    rows,
    transfers,
    paidSum,
    warnings,
    weightByGrade,
    sumWeight,
    copyText,
  } = useMemo(() => {
    const teacherTotal = parseMoney(teacherTotalStr);

    const weightByGrade: Record<Grade, number> = {
      B3: parseWeight(wB3),
      B4: parseWeight(wB4),
      M1: parseWeight(wM1),
      M2: parseWeight(wM2),
    };

    // 名前が入っている人だけ参加者
    const participants = people
      .map((p) => ({ ...p, name: p.name.trim() }))
      .filter((p) => p.name.length > 0);

    const participantById = new Map(participants.map((p) => [p.id, p]));
    const warnings: string[] = [];
    if (participants.length === 0) warnings.push("参加者がいません。");

    // 名前の重複チェック（送金表が紛らわしい）
    const nameCount = new Map<string, number>();
    for (const p of participants) nameCount.set(p.name, (nameCount.get(p.name) ?? 0) + 1);
    const dupNames = [...nameCount.entries()].filter(([, c]) => c >= 2).map(([n]) => n);
    if (dupNames.length > 0) warnings.push(`名前が重複しています：${dupNames.join(", ")}（別名にしてください）`);

    const paidMap = new Map<string, number>();
    const shareMap = new Map<string, number>();
    const expenseSummaries: string[] = [];
    let total = 0;
    let allTargetTotal = 0;

    for (const expense of expenses) {
      const amount = parseMoney(expense.amountStr);
      const payer = participantById.get(expense.payerId);
      if (amount <= 0) continue;
      if (!payer) {
        warnings.push(`${expense.item || "名称未設定の支出"}：払った人が未選択です。`);
        continue;
      }

      let targets: PersonInput[] = [];
      if (expense.targetMode === "all") {
        targets = participants;
      } else {
        targets = expense.targetPersonIds
          .map((id) => participantById.get(id))
          .filter((p): p is PersonInput => Boolean(p));
      }

      if (targets.length === 0) {
        warnings.push(`${expense.item || "名称未設定の支出"}：負担対象がいません。`);
        continue;
      }

      total += amount;
      addToMap(paidMap, payer.id, amount);
      if (expense.targetMode === "all") allTargetTotal += amount;

      const targetShares =
        expense.targetMode === "all"
          ? computeWeightedShares(
              targets.map((p) => ({ id: p.id, weight: weightByGrade[p.grade] })),
              amount
            )
          : computeWeightedShares(
              targets.map((p) => ({ id: p.id, weight: 1 })),
              amount
            );
      for (const [id, share] of targetShares) addToMap(shareMap, id, share);

      const targetText =
        expense.targetMode === "all"
          ? "全体"
          : targets.map((p) => p.name).join(", ");
      expenseSummaries.push(
        `${payer.name} / ${expense.item || "支出"} / ${formatYen(amount)}円 / ${targetText}`
      );
    }

    const teacherCredit = Math.min(teacherTotal, allTargetTotal);
    if (teacherTotal > allTargetTotal && teacherTotal > 0) {
      warnings.push("先生チーム負担が全体支出を超えています。全体支出の合計までを差し引きます。");
    }

    if (teacherCredit > 0 && participants.length > 0) {
      const teacherShares = computeWeightedShares(
        participants.map((p) => ({ id: p.id, weight: weightByGrade[p.grade] })),
        teacherCredit
      );
      for (const [id, share] of teacherShares) addToMap(shareMap, id, -share);
    }

    const paidSum = [...paidMap.values()].reduce((a, b) => a + b, 0);
    const sumWeight = participants.reduce((a, p) => a + weightByGrade[p.grade], 0);
    if (participants.length > 0 && sumWeight === 0) {
      warnings.push("重みの合計が0です。各支出は対象者内で均等割りします（重みを1以上にしてください）。");
    }

    const rows: PersonRow[] = participants
      .map((p) => {
        const paid = paidMap.get(p.id) ?? 0;
        const share = shareMap.get(p.id) ?? 0;
        const balance = paid - share;
        return {
          id: p.id,
          name: p.name,
          grade: p.grade,
          weight: weightByGrade[p.grade],
          paid,
          share,
          balance,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name, "ja"));

    const transfers = settle(rows);
    const remainder = Math.max(total - teacherCredit, 0);

    const copyLines: string[] = [];
    copyLines.push(`${title || "精算"}`);
    copyLines.push(`支出合計 ${formatYen(total)}円 / 全体支出 ${formatYen(allTargetTotal)}円 / 先生チーム ${formatYen(teacherCredit)}円 / 学生負担 ${formatYen(remainder)}円`);
    copyLines.push(`重み：B3=${weightByGrade.B3}, B4=${weightByGrade.B4}, M1=${weightByGrade.M1}, M2=${weightByGrade.M2}（合計=${sumWeight}）`);
    copyLines.push(`参加者 ${rows.length}人`);
    copyLines.push("");
    if (expenseSummaries.length > 0) {
      copyLines.push("支出：");
      for (const line of expenseSummaries) copyLines.push(line);
      copyLines.push("");
    }
    if (transfers.length === 0) {
      copyLines.push("送金なし");
    } else {
      copyLines.push("送金：");
      for (const t of transfers) copyLines.push(`${t.from} → ${t.to} : ${formatYen(t.amount)}円`);
    }

    return {
      total,
      teacherTotal,
      teacherCredit,
      allTargetTotal,
      remainder,
      rows,
      transfers,
      paidSum,
      warnings,
      weightByGrade,
      sumWeight,
      copyText: copyLines.join("\n"),
    };
  }, [expenses, people, teacherTotalStr, title, wB3, wB4, wM1, wM2]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-50 text-gray-900">
      <Image
        className="pointer-events-none absolute -left-8 -top-8 hidden opacity-45 md:block"
        src="/party-snacks.svg"
        alt=""
        aria-hidden="true"
        width={210}
        height={172}
        priority
      />
      <Image
        className="pointer-events-none absolute -right-8 -top-6 hidden rotate-12 opacity-50 md:block"
        src="/party-snacks.svg"
        alt=""
        aria-hidden="true"
        width={220}
        height={180}
        priority
      />
      <Image
        className="pointer-events-none absolute -bottom-8 -left-10 hidden rotate-[-14deg] opacity-40 lg:block"
        src="/party-snacks.svg"
        alt=""
        aria-hidden="true"
        width={220}
        height={180}
      />
      <Image
        className="pointer-events-none absolute -bottom-10 -right-8 hidden rotate-[18deg] opacity-40 lg:block"
        src="/party-snacks.svg"
        alt=""
        aria-hidden="true"
        width={205}
        height={168}
      />
      <div className="relative mx-auto max-w-6xl p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <h1 className="text-2xl font-semibold">割り勘アプリ（研究室用）</h1>
          <div className="text-xs text-gray-500">全体支出と個人の分を分けて、負担額を自動集計</div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          {/* 入力 */}
          <div className="space-y-4">
            <div className="rounded-2xl bg-sky-50 p-5 shadow-sm ring-1 ring-sky-200">
              <h2 className="text-lg font-semibold text-sky-900">基本</h2>

              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium">タイトル</label>
                  <input
                    className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="例：歓迎会"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium">支出合計（自動）</label>
                  <div className="mt-1 rounded-xl bg-gray-50 px-3 py-2.5 text-sm font-semibold ring-1 ring-gray-200">
                    {formatYen(total)} 円
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium">先生チーム負担（全体支出から差し引く・円）</label>
                  <input
                    className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm"
                    value={teacherTotalStr}
                    onChange={(e) => setTeacherTotalStr(e.target.value)}
                    inputMode="numeric"
                  />
                </div>
              </div>

              {/* 重み */}
              <div className="mt-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">学年ごとの重み（毎回変更OK）</h3>
                  <div className="text-xs text-gray-500">合計重み：{sumWeight}</div>
                </div>

                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <WeightBox label="B3" value={String(weightByGrade.B3)} setValue={setWB3} />
                  <WeightBox label="B4" value={String(weightByGrade.B4)} setValue={setWB4} />
                  <WeightBox label="M1" value={String(weightByGrade.M1)} setValue={setWM1} />
                  <WeightBox label="M2" value={String(weightByGrade.M2)} setValue={setWM2} />
                </div>

                <p className="mt-2 text-xs text-gray-500">
                  ※ 全体支出は学年重みで配分し、先生チーム負担は全体支出からだけ差し引きます。
                </p>
              </div>
            </div>

            <div className="rounded-2xl bg-emerald-50 p-5 shadow-sm ring-1 ring-emerald-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-emerald-900">参加者</h2>
                <button
                  className="rounded-xl bg-gray-900 px-4 py-2 text-xs font-medium text-white hover:opacity-90"
                  onClick={addPerson}
                  type="button"
                >
                  参加者を追加
                </button>
              </div>

              <div className="mt-3 space-y-2">
                {people.map((p) => (
                  <div key={p.id} className="rounded-2xl border border-gray-200 bg-white p-3">
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-12">
                      <div className="sm:col-span-6">
                        <label className="block text-xs font-medium text-gray-700">名前</label>
                        <input
                          className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm"
                          value={p.name}
                          onChange={(e) => updatePerson(p.id, { name: e.target.value })}
                          placeholder="例：田中"
                        />
                      </div>

                      <div className="sm:col-span-4">
                        <label className="block text-xs font-medium text-gray-700">学年</label>
                        <select
                          className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm"
                          value={p.grade}
                          onChange={(e) => updatePerson(p.id, { grade: e.target.value as Grade })}
                        >
                          {GRADES.map((g) => (
                            <option key={g} value={g}>
                              {g}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex items-end sm:col-span-2">
                        <button
                          className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-xs hover:bg-gray-50 disabled:opacity-40"
                          onClick={() => removePerson(p.id)}
                          type="button"
                          disabled={people.length <= 1}
                          title="削除"
                        >
                          削除
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl bg-violet-50 p-5 shadow-sm ring-1 ring-violet-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-violet-900">支出</h2>
                <button
                  className="rounded-xl bg-gray-900 px-4 py-2 text-xs font-medium text-white hover:opacity-90"
                  onClick={addExpense}
                  type="button"
                >
                  支出を追加
                </button>
              </div>

              <div className="mt-3 space-y-3">
                {expenses.map((expense) => (
                  <div key={expense.id} className="rounded-2xl border border-gray-200 bg-white p-3">
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-12">
                      <div className="sm:col-span-4">
                        <label className="block text-xs font-medium text-gray-700">払った人</label>
                        <select
                          className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm"
                          value={expense.payerId}
                          onChange={(e) => updateExpense(expense.id, { payerId: e.target.value })}
                        >
                          <option value="">未選択</option>
                          {people
                            .filter((p) => p.name.trim().length > 0)
                            .map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name || "名前未設定"}
                              </option>
                            ))}
                        </select>
                      </div>

                      <div className="sm:col-span-4">
                        <label className="block text-xs font-medium text-gray-700">内容</label>
                        <input
                          className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm"
                          value={expense.item}
                          onChange={(e) => updateExpense(expense.id, { item: e.target.value })}
                          placeholder="例：お弁当"
                        />
                      </div>

                      <div className="sm:col-span-3">
                        <label className="block text-xs font-medium text-gray-700">金額（円）</label>
                        <input
                          className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm"
                          value={expense.amountStr}
                          onChange={(e) => updateExpense(expense.id, { amountStr: e.target.value })}
                          inputMode="numeric"
                          placeholder="例：2000"
                        />
                      </div>

                      <div className="flex items-end sm:col-span-1">
                        <button
                          className="w-full rounded-xl border border-gray-300 bg-white px-2 py-2.5 text-xs hover:bg-gray-50 disabled:opacity-40"
                          onClick={() => removeExpense(expense.id)}
                          type="button"
                          disabled={expenses.length <= 1}
                          title="削除"
                        >
                          削除
                        </button>
                      </div>
                    </div>

                    <div className="mt-3">
                      <div className="text-xs font-medium text-gray-700">誰のもの？</div>
                      <div className="mt-1 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <label className="flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm">
                        <input
                          checked={expense.targetMode === "all"}
                          onChange={() => updateExpense(expense.id, { targetMode: "all" })}
                          type="radio"
                        />
                        全体
                      </label>
                      <label className="flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm">
                        <input
                          checked={expense.targetMode === "custom"}
                          onChange={() => updateExpense(expense.id, { targetMode: "custom" })}
                          type="radio"
                        />
                        個人を選ぶ
                      </label>
                      </div>
                    </div>

                    {expense.targetMode === "custom" && (
                      <div className="mt-2">
                        <div className="text-xs font-medium text-gray-700">対象の人</div>
                        <div className="mt-1 grid grid-cols-2 gap-2 sm:grid-cols-4">
                          {people
                            .filter((p) => p.name.trim().length > 0)
                            .map((p) => (
                              <label
                                key={p.id}
                                className="flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm"
                              >
                                <input
                                  checked={expense.targetPersonIds.includes(p.id)}
                                  onChange={() => toggleExpenseTarget(expense.id, p.id)}
                                  type="checkbox"
                                />
                                {p.name}
                              </label>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 出力（Walica寄せ：サマリー固定 + 送金ファースト） */}
          <div className="space-y-4">
            <div className="sticky top-4 z-10 rounded-2xl bg-amber-50 p-5 shadow-sm ring-1 ring-amber-200">
              <SummaryCard
                title={title}
                total={total}
                teacherTotal={teacherCredit}
                remainder={remainder}
                participantCount={rows.length}
                weightByGrade={weightByGrade}
                sumWeight={sumWeight}
              />
            </div>

            <div className="rounded-2xl bg-cyan-50 p-5 shadow-sm ring-1 ring-cyan-200">
              <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                <KpiInline label="全体支出" value={`${formatYen(allTargetTotal)}円`} />
                <KpiInline label="学生負担" value={`${formatYen(remainder)}円`} />
                <KpiInline label="参加者" value={`${rows.length}人`} />
                <KpiInline label="立替合計" value={`${formatYen(paidSum)}円`} />
              </div>
              {teacherTotal !== teacherCredit && (
                <p className="mt-2 text-xs text-amber-700">
                  先生チーム負担は全体支出を上限にして {formatYen(teacherCredit)} 円を反映しています。
                </p>
              )}
            </div>

            {warnings.length > 0 && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                <div className="font-semibold">注意</div>
                <ul className="mt-2 list-disc pl-5">
                  {warnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="rounded-2xl bg-rose-50 p-5 shadow-sm ring-1 ring-rose-200">
              <h2 className="text-lg font-semibold text-rose-900">送金</h2>

              {transfers.length === 0 ? (
                <p className="mt-2 text-sm text-gray-600">送金は不要です。</p>
              ) : (
                <div className="mt-3 space-y-2">
                  {transfers.map((t, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3 text-sm ring-1 ring-gray-200"
                    >
                      <span className="font-medium">
                        {t.from} <span className="text-gray-400">→</span> {t.to}
                      </span>
                      <span className="text-base font-semibold">{formatYen(t.amount)} 円</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold">コピペ用</div>
                  <button
                    className="rounded-xl bg-gray-900 px-4 py-2 text-xs font-medium text-white hover:opacity-90"
                    onClick={async () => {
                      await navigator.clipboard.writeText(copyText);
                      alert("コピーしました");
                    }}
                    type="button"
                  >
                    コピー
                  </button>
                </div>
                <pre className="mt-2 whitespace-pre-wrap rounded-xl bg-gray-900 p-3 text-xs text-gray-100">
                  {copyText}
                </pre>
              </div>
            </div>

            <div className="rounded-2xl bg-indigo-50 p-5 shadow-sm ring-1 ring-indigo-200">
              <h2 className="text-lg font-semibold text-indigo-900">内訳</h2>

              <div className="mt-3 overflow-x-auto rounded-xl border border-gray-200">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-3 py-2 text-left">名前</th>
                      <th className="px-3 py-2 text-left">学年</th>
                      <th className="px-3 py-2 text-right">重み</th>
                      <th className="px-3 py-2 text-right">負担</th>
                      <th className="px-3 py-2 text-right">立替</th>
                      <th className="px-3 py-2 text-right">差額</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.id} className="border-t border-gray-200">
                        <td className="px-3 py-2">{r.name}</td>
                        <td className="px-3 py-2">
                          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
                            {r.grade}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right">{r.weight}</td>
                        <td className="px-3 py-2 text-right">{formatYen(r.share)}</td>
                        <td className="px-3 py-2 text-right">{formatYen(r.paid)}</td>
                        <td
                          className={`px-3 py-2 text-right font-medium ${
                            r.balance >= 0 ? "text-emerald-700" : "text-rose-700"
                          }`}
                        >
                          {r.balance >= 0 ? "+" : ""}
                          {formatYen(r.balance)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="mt-3 text-xs text-gray-500">
                ※ 「全体」は全員で学年重み配分、「個人を選ぶ」は選んだ人だけで均等割りします。先生チーム負担は全体支出からだけ差し引きます。
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ====== Small UI Parts ====== */

function WeightBox({
  label,
  value,
  setValue,
}: {
  label: string;
  value: string;
  setValue: (v: string) => void;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3">
      <div className="text-xs font-semibold text-gray-700">{label}</div>
      <input
        className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        inputMode="numeric"
        placeholder="重み"
      />
    </div>
  );
}

function KpiInline({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white p-3 ring-1 ring-gray-200">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="mt-1 text-sm font-semibold">{value}</div>
    </div>
  );
}

function SummaryCard({
  title,
  total,
  teacherTotal,
  remainder,
  participantCount,
  weightByGrade,
  sumWeight,
}: {
  title: string;
  total: number;
  teacherTotal: number;
  remainder: number;
  participantCount: number;
  weightByGrade: Record<Grade, number>;
  sumWeight: number;
}) {
  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs text-gray-500">イベント</div>
          <div className="mt-1 text-lg font-semibold">{title || "（無題）"}</div>
        </div>
        <div className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
          参加者 {participantCount}人
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <Kpi label="支出合計" value={`${formatYen(total)}円`} />
        <Kpi label="先生チーム" value={`${formatYen(teacherTotal)}円`} />
        <Kpi label="学生負担" value={`${formatYen(remainder)}円`} />
      </div>

      <div className="mt-4 rounded-xl bg-gray-50 p-3 ring-1 ring-gray-200">
        <div className="flex items-center justify-between text-xs text-gray-600">
          <span>重み</span>
          <span>合計 {sumWeight}</span>
        </div>
        <div className="mt-2 grid grid-cols-4 gap-2 text-xs">
          <Badge label="B3" v={weightByGrade.B3} />
          <Badge label="B4" v={weightByGrade.B4} />
          <Badge label="M1" v={weightByGrade.M1} />
          <Badge label="M2" v={weightByGrade.M2} />
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-gray-50 p-3 ring-1 ring-gray-200">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="mt-1 text-sm font-semibold">{value}</div>
    </div>
  );
}

function Badge({ label, v }: { label: string; v: number }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-white px-2 py-1 ring-1 ring-gray-200">
      <span className="text-gray-600">{label}</span>
      <span className="font-semibold">{v}</span>
    </div>
  );
}
