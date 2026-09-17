"use client";

import React from "react";
import { formatYen } from "../calc";
import type { GroupInput, PersonRow, Transfer } from "../model";

/** calc.ts が送金表に積む、参加者ではない払い手の id */
export const TEACHER_ID = "teacher-team";
import {
  Avatar,
  EmptyState,
  IconArrowRight,
  IconCheck,
  IconCopy,
  IconSwap,
  IconTable,
  IconWarning,
  Money,
  SectionCard,
  StatTile,
} from "./ui";

export function SummaryHero({
  title,
  total,
  teacherCredit,
  remainder,
  allTargetTotal,
  paidSum,
  participantCount,
  transferCount,
  groups,
  weightByGroup,
  sumWeight,
}: {
  title: string;
  total: number;
  teacherCredit: number;
  remainder: number;
  allTargetTotal: number;
  paidSum: number;
  participantCount: number;
  transferCount: number;
  groups: GroupInput[];
  weightByGroup: Map<string, number>;
  sumWeight: number;
}) {
  return (
    <section className="card overflow-hidden">
      <div className="relative bg-canvas-accent px-4 py-5 sm:px-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-wider text-ink-subtle">
              Event
            </p>
            <h2 className="mt-1 truncate text-lg font-semibold tracking-tight">
              {title.trim() || "（無題）"}
            </h2>
          </div>
          <span className="num shrink-0 rounded-full bg-surface px-3 py-1 text-xs font-medium text-ink-muted ring-1 ring-line">
            {participantCount}人 / 送金{transferCount}件
          </span>
        </div>

        <div className="mt-4">
          <p className="text-xs font-medium text-ink-muted">参加者の負担合計</p>
          <p className="num mt-0.5 text-3xl font-bold tracking-tight sm:text-4xl">
            {formatYen(remainder)}
            <span className="ml-1 text-lg font-semibold text-ink-muted">円</span>
          </p>
          <p className="num mt-1 text-xs text-ink-subtle">
            支出合計 {formatYen(total)}円 − 先生チーム {formatYen(teacherCredit)}円
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-4 sm:p-4">
        <StatTile label="全体支出" value={<Money value={allTargetTotal} />} />
        <StatTile label="先生チーム" value={<Money value={teacherCredit} />} />
        <StatTile label="立替合計" value={<Money value={paidSum} />} />
        <StatTile label="合計重み" value={<span className="num">{sumWeight}</span>} />
      </div>

      <div className="border-t border-line px-3 pb-3 sm:px-4 sm:pb-4">
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-medium text-ink-subtle">グループの重み</span>
          {groups.map((group, index) => (
            <span
              key={group.id}
              className="num rounded-full bg-surface-2 px-2.5 py-1 text-[11px] font-medium text-ink-muted"
            >
              {group.name.trim() || `グループ ${index + 1}`} · {weightByGroup.get(group.id) ?? 0}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Warnings({ warnings }: { warnings: string[] }) {
  if (warnings.length === 0) return null;
  return (
    <section
      className="rounded-2xl border border-warn-line bg-warn-soft p-4 text-sm text-warn"
      role="alert"
    >
      <div className="flex items-center gap-2 font-semibold">
        <IconWarning />
        確認してください
      </div>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-relaxed">
        {warnings.map((w, i) => (
          <li key={i}>{w}</li>
        ))}
      </ul>
    </section>
  );
}

export function TransferList({
  transfers,
  copyText,
  copied,
  onCopy,
}: {
  transfers: Transfer[];
  copyText: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <SectionCard
      id="transfers"
      icon={<IconSwap />}
      title="送金"
      description={
        transfers.some((t) => t.fromId === TEACHER_ID)
          ? "この通りに送れば全員の精算が終わります（先生チームからの回収を含む）"
          : "この通りに送れば全員の精算が終わります"
      }
      action={
        <button className="btn btn-primary" onClick={onCopy} type="button">
          {copied ? <IconCheck className="h-3.5 w-3.5" /> : <IconCopy className="h-3.5 w-3.5" />}
          {copied ? "コピー済み" : "結果をコピー"}
        </button>
      }
    >
      {transfers.length === 0 ? (
        <EmptyState>送金は不要です。</EmptyState>
      ) : (
        <ul className="space-y-2">
          {transfers.map((t) => {
            const fromTeacher = t.fromId === TEACHER_ID;
            return (
              <li
                key={`${t.fromId}-${t.toId}`}
                className={`flex items-center gap-2 rounded-xl px-3 py-2.5 ${
                  fromTeacher
                    ? "bg-brand-soft text-brand-ink ring-1 ring-brand/25"
                    : "bg-surface-2"
                }`}
              >
                {fromTeacher ? (
                  <span
                    aria-hidden="true"
                    className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand text-[11px] font-semibold text-brand-contrast"
                  >
                    先
                  </span>
                ) : (
                  <Avatar id={t.fromId} name={t.from} size="sm" />
                )}
                <span className="min-w-0 truncate text-sm font-medium">{t.from}</span>
                <IconArrowRight className="h-4 w-4 shrink-0 opacity-60" />
                <Avatar id={t.toId} name={t.to} size="sm" />
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{t.to}</span>
                <Money value={t.amount} className="text-sm font-semibold" />
              </li>
            );
          })}
        </ul>
      )}

      <details className="group mt-3" data-print="hide">
        <summary className="cursor-pointer list-none rounded-xl bg-surface-2 px-3 py-2 text-xs font-medium text-ink-muted transition-colors hover:text-ink">
          <span className="inline-flex items-center gap-1.5">
            <span className="transition-transform group-open:rotate-90">▶</span>
            コピペ用テキストを見る
          </span>
        </summary>
        <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap rounded-xl bg-ink p-3 font-mono text-[11px] leading-relaxed text-canvas">
          {copyText}
        </pre>
      </details>
    </SectionCard>
  );
}

export function BreakdownTable({ rows }: { rows: PersonRow[] }) {
  return (
    <SectionCard
      id="breakdown"
      icon={<IconTable />}
      title="内訳"
      description="差額がプラスなら受け取り、マイナスなら支払いです"
    >
      {rows.length === 0 ? (
        <EmptyState>参加者を登録すると内訳が表示されます。</EmptyState>
      ) : (
        <div className="scroll-slim -mx-1 overflow-x-auto">
          <table className="w-full min-w-[30rem] border-collapse text-sm">
            <thead>
              <tr className="border-b border-line text-[11px] uppercase tracking-wide text-ink-subtle">
                <th scope="col" className="px-2 py-2 text-left font-medium">
                  名前
                </th>
                <th scope="col" className="px-2 py-2 text-left font-medium">
                  グループ
                </th>
                <th scope="col" className="px-2 py-2 text-right font-medium">
                  重み
                </th>
                <th scope="col" className="px-2 py-2 text-right font-medium">
                  負担
                </th>
                <th scope="col" className="px-2 py-2 text-right font-medium">
                  立替
                </th>
                <th scope="col" className="px-2 py-2 text-right font-medium">
                  差額
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-line last:border-0">
                  <td className="px-2 py-2.5">
                    <div className="flex items-center gap-2">
                      <Avatar id={r.id} name={r.displayName} size="sm" />
                      <span className="truncate font-medium">{r.displayName}</span>
                    </div>
                  </td>
                  <td className="px-2 py-2.5 text-ink-muted">
                    <span className="truncate">{r.groupName}</span>
                  </td>
                  <td className="num px-2 py-2.5 text-right text-ink-muted">{r.weight}</td>
                  <td className="num px-2 py-2.5 text-right">{formatYen(r.share)}</td>
                  <td className="num px-2 py-2.5 text-right text-ink-muted">
                    {formatYen(r.paid)}
                  </td>
                  <td
                    className={`num px-2 py-2.5 text-right font-semibold ${
                      r.balance > 0 ? "text-pos" : r.balance < 0 ? "text-neg" : "text-ink-subtle"
                    }`}
                  >
                    {r.balance > 0 ? "+" : ""}
                    {formatYen(r.balance)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-3 text-[11px] leading-relaxed text-ink-subtle">
        「全体」の支出はグループの重みで配分し、「個人を選ぶ」の支出は選んだ人だけで均等割りします。
        先生チーム負担は「全体」の支出からのみ差し引きます。
      </p>
    </SectionCard>
  );
}
