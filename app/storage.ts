import { useCallback, useRef, useSyncExternalStore } from "react";
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
  let raw: string | null;
  try {
    raw = storage.getItem(STORAGE_KEY);
  } catch {
    // サイトデータがブロックされていると getItem 自体が投げる。
    // 読めないだけなので「壊れていた」とは扱わず、初期状態で続行する。
    return { state: null, recovered: false };
  }
  if (raw === null) return { state: null, recovered: false };

  try {
    const state = parseStoredState(JSON.parse(raw));
    if (state) return { state, recovered: false };
  } catch {
    // The same recovery path handles malformed JSON and an invalid schema.
  }

  try {
    storage.removeItem(STORAGE_KEY);
  } catch {
    // 消せなくても、この後は初期状態で動かせる
  }
  return { state: null, recovered: true };
}

/**
 * localStorage は「使えない」ことがある。
 * - Cookie / サイトデータをブロックしていると localStorage への参照自体が throw する
 * - プライベートモードや容量超過では setItem が QuotaExceededError を投げる
 * どちらも保存を諦めるだけでよく、アプリを落としてはいけない。
 */
function safeLocalStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

type Snapshot = {
  state: AppState;
  recoveredStorage: boolean;
};

type Store = {
  snapshot: Snapshot;
  loaded: boolean;
  listeners: Set<() => void>;
};

// モジュール内に1つ。読み込み済みかどうかもここで持つ。
let store: Store | null = null;

function getStore(initialState: AppState): Store {
  if (!store) {
    store = {
      snapshot: { state: initialState, recoveredStorage: false },
      loaded: false,
      listeners: new Set(),
    };
  }
  return store;
}

function loadOnce(current: Store) {
  if (current.loaded || typeof window === "undefined") return;
  current.loaded = true;

  const storage = safeLocalStorage();
  if (!storage) return;

  const result = loadStoredState(storage);
  if (result.state || result.recovered) {
    current.snapshot = {
      state: result.state ?? current.snapshot.state,
      recoveredStorage: result.recovered,
    };
  }
}

function persist(state: AppState) {
  const storage = safeLocalStorage();
  if (!storage) return;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // 保存できなくても計算は続けられるので、黙って諦める
  }
}

type StoredStateResult = {
  state: AppState;
  setState: (action: AppState | ((previous: AppState) => AppState)) => void;
  recoveredStorage: boolean;
};

/**
 * 保存データを「外部ストア」として購読する。
 *
 * useEffect で読み込んで setState すると React 19 の set-state-in-effect に触れる。
 * setTimeout で逃がすと lint は通るが、初期値が一瞬描画されてから保存値へ
 * 差し替わる（タイトル欄が「飲み会」→ 保存値とちらつく）。
 * useSyncExternalStore なら SSR / ハイドレーションは getServerSnapshot の初期値を
 * 使い、そのままの描画で保存値に切り替わるので、ちらつきも余計な再描画もない。
 */
export function useStoredState(initialState: AppState): StoredStateResult {
  // レンダー中に呼ぶが、2回目以降は既存のストアを返すだけなので冪等
  getStore(initialState);

  const initialSnapshotRef = useRef<Snapshot>({
    state: initialState,
    recoveredStorage: false,
  });

  const subscribe = useCallback((onStoreChange: () => void) => {
    const target = store!;
    target.listeners.add(onStoreChange);
    return () => {
      target.listeners.delete(onStoreChange);
    };
  }, []);

  const getSnapshot = useCallback(() => {
    loadOnce(store!);
    return store!.snapshot;
  }, []);

  const getServerSnapshot = useCallback(() => initialSnapshotRef.current, []);

  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setState = useCallback(
    (action: AppState | ((previous: AppState) => AppState)) => {
      const target = store!;
      loadOnce(target);

      const next =
        typeof action === "function"
          ? (action as (previous: AppState) => AppState)(target.snapshot.state)
          : action;
      if (Object.is(next, target.snapshot.state)) return;

      // 一度でも編集したら「復旧しました」の表示は引っ込める
      target.snapshot = { state: next, recoveredStorage: false };
      persist(next);
      for (const listener of target.listeners) listener();
    },
    []
  );

  return {
    state: snapshot.state,
    setState,
    recoveredStorage: snapshot.recoveredStorage,
  };
}

/** テスト用にモジュール内の状態を捨てる */
export function resetStoreForTests() {
  store = null;
}
