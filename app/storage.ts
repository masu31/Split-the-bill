import { useEffect, useRef, useState } from "react";
import {
  APP_STATE_VERSION,
  type AppState,
  type ExpenseInput,
  type GroupInput,
  type PersonInput,
} from "./model.ts";

export const STORAGE_KEY = "lab-split:state:v2";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasUniqueIds(items: { id: string }[]): boolean {
  return new Set(items.map((item) => item.id)).size === items.length;
}

function isGroup(value: unknown): value is GroupInput {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    value.id.length > 0 &&
    typeof value.name === "string" &&
    typeof value.weightStr === "string"
  );
}

function isPerson(value: unknown): value is PersonInput {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    value.id.length > 0 &&
    typeof value.name === "string" &&
    typeof value.groupId === "string"
  );
}

function isExpense(value: unknown): value is ExpenseInput {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    value.id.length > 0 &&
    typeof value.payerId === "string" &&
    typeof value.item === "string" &&
    typeof value.amountStr === "string" &&
    (value.targetMode === "all" || value.targetMode === "custom") &&
    Array.isArray(value.targetPersonIds) &&
    value.targetPersonIds.every((id) => typeof id === "string")
  );
}

export function parseStoredState(value: unknown): AppState | null {
  if (!isRecord(value) || value.version !== APP_STATE_VERSION) return null;
  if (
    typeof value.title !== "string" ||
    typeof value.teacherTotalStr !== "string" ||
    !Array.isArray(value.groups) ||
    !Array.isArray(value.people) ||
    !Array.isArray(value.expenses)
  ) {
    return null;
  }

  if (!value.groups.every(isGroup) || value.groups.length === 0) return null;
  if (!value.people.every(isPerson) || !value.expenses.every(isExpense)) return null;

  const groups = value.groups;
  const people = value.people;
  const expenses = value.expenses;
  if (!hasUniqueIds(groups) || !hasUniqueIds(people) || !hasUniqueIds(expenses)) return null;

  const groupIds = new Set(groups.map((group) => group.id));
  if (people.some((person) => !groupIds.has(person.groupId))) return null;

  const personIds = new Set(people.map((person) => person.id));
  if (
    expenses.some(
      (expense) =>
        (expense.payerId !== "" && !personIds.has(expense.payerId)) ||
        expense.targetPersonIds.some((id) => !personIds.has(id))
    )
  ) {
    return null;
  }

  return {
    version: APP_STATE_VERSION,
    title: value.title,
    teacherTotalStr: value.teacherTotalStr,
    groups,
    people,
    expenses,
  };
}

type ReadableStorage = Pick<Storage, "getItem" | "removeItem">;

export function loadStoredState(storage: ReadableStorage): {
  state: AppState | null;
  recovered: boolean;
} {
  const raw = storage.getItem(STORAGE_KEY);
  if (raw === null) return { state: null, recovered: false };

  try {
    const state = parseStoredState(JSON.parse(raw));
    if (state) return { state, recovered: false };
  } catch {
    // The same recovery path handles malformed JSON and an invalid schema.
  }

  storage.removeItem(STORAGE_KEY);
  return { state: null, recovered: true };
}

type StoredStateResult = {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  recoveredStorage: boolean;
};

export function useStoredState(initialState: AppState): StoredStateResult {
  const [state, setState] = useState(initialState);
  const [recoveredStorage, setRecoveredStorage] = useState(false);
  const loadedRef = useRef(false);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const stored = loadStoredState(localStorage);
      if (stored.state) setState(stored.state);
      if (stored.recovered) setRecoveredStorage(true);
      loadedRef.current = true;
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    if (!loadedRef.current) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  return { state, setState, recoveredStorage };
}
