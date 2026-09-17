"use client";

import React, { useId } from "react";
import type { GroupInput, PersonInput } from "../model";
import { Avatar, EmptyState, Field, IconPlus, IconTrash, IconUsers, SectionCard } from "./ui";

function PersonCard({
  person,
  index,
  groups,
  weightLabel,
  onChange,
  onRemove,
}: {
  person: PersonInput;
  index: number;
  groups: GroupInput[];
  weightLabel: string;
  onChange: (patch: Partial<PersonInput>) => void;
  onRemove: () => void;
}) {
  const uid = useId();
  const nameId = `${uid}-name`;
  const groupId = `${uid}-group`;
  const displayName = person.name.trim();
  const fallbackLabel = `参加者 ${index + 1}`;

  return (
    <li className="rounded-xl border border-line bg-surface-2/60 p-3 transition-colors hover:border-line-strong">
      <div className="flex items-center gap-2">
        <Avatar id={person.id} name={displayName || String(index + 1)} size="sm" />
        <span className="min-w-0 flex-1 truncate text-xs font-medium text-ink-muted">
          {displayName || fallbackLabel}
        </span>
        <span className="num rounded-full bg-surface px-2 py-0.5 text-[11px] text-ink-subtle ring-1 ring-line">
          重み {weightLabel}
        </span>
        <button
          className="btn btn-danger-ghost px-2"
          onClick={onRemove}
          type="button"
          aria-label={`${displayName || fallbackLabel}を削除`}
          title="削除"
        >
          <IconTrash className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-2.5 grid grid-cols-1 gap-2.5 sm:grid-cols-5">
        <Field label="名前" htmlFor={nameId} className="sm:col-span-3">
          <input
            id={nameId}
            className="field"
            value={person.name}
            onChange={(event) => onChange({ name: event.target.value })}
            placeholder="例：田中"
            autoComplete="off"
          />
        </Field>

        <Field label="グループ" htmlFor={groupId} className="sm:col-span-2">
          <select
            id={groupId}
            className="field field-select"
            value={person.groupId}
            onChange={(event) => onChange({ groupId: event.target.value })}
          >
            {groups.map((group, groupIndex) => (
              <option key={group.id} value={group.id}>
                {group.name.trim() || `グループ ${groupIndex + 1}`}
              </option>
            ))}
          </select>
        </Field>
      </div>
    </li>
  );
}

export function PeopleEditor({
  people,
  groups,
  weightByGroup,
  namedCount,
  onAdd,
  onChange,
  onRemove,
}: {
  people: PersonInput[];
  groups: GroupInput[];
  weightByGroup: Map<string, number>;
  namedCount: number;
  onAdd: () => void;
  onChange: (id: string, patch: Partial<PersonInput>) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <SectionCard
      id="people"
      icon={<IconUsers />}
      title="参加者"
      description={`名前を入れた人だけが精算の対象になります（現在 ${namedCount} 人）`}
      action={
        <button className="btn btn-primary" onClick={onAdd} type="button">
          <IconPlus className="h-3.5 w-3.5" />
          追加
        </button>
      }
    >
      {people.length === 0 ? (
        <EmptyState>「追加」から参加者を登録してください。</EmptyState>
      ) : (
        <ul className="space-y-2.5">
          {people.map((person, index) => (
            <PersonCard
              key={person.id}
              person={person}
              index={index}
              groups={groups}
              weightLabel={String(weightByGroup.get(person.groupId) ?? 0)}
              onChange={(patch) => onChange(person.id, patch)}
              onRemove={() => onRemove(person.id)}
            />
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
