export const APP_STATE_VERSION = 2 as const;
export const MAX_MONEY = 100_000_000;
export const MAX_WEIGHT = 1_000;

export type TargetMode = "all" | "custom";

export type GroupInput = {
  id: string;
  name: string;
  weightStr: string;
};

export type PersonInput = {
  id: string;
  name: string;
  groupId: string;
};

export type ExpenseInput = {
  id: string;
  payerId: string;
  item: string;
  amountStr: string;
  targetMode: TargetMode;
  targetPersonIds: string[];
};

export type AppState = {
  version: typeof APP_STATE_VERSION;
  title: string;
  teacherTotalStr: string;
  groups: GroupInput[];
  people: PersonInput[];
  expenses: ExpenseInput[];
};

export type PersonRow = {
  id: string;
  name: string;
  displayName: string;
  groupId: string;
  groupName: string;
  weight: number;
  paid: number;
  share: number;
  balance: number;
};

export type Transfer = {
  fromId: string;
  from: string;
  toId: string;
  to: string;
  amount: number;
};

export type CalculationResult = {
  total: number;
  teacherTotal: number;
  teacherCredit: number;
  allTargetTotal: number;
  remainder: number;
  rows: PersonRow[];
  transfers: Transfer[];
  paidSum: number;
  warnings: string[];
  sumWeight: number;
  expenseSummaries: string[];
};

export const INITIAL_STATE: AppState = {
  version: APP_STATE_VERSION,
  title: "飲み会",
  teacherTotalStr: "6000",
  groups: [
    { id: "group-b3", name: "B3", weightStr: "2" },
    { id: "group-b4", name: "B4", weightStr: "3" },
    { id: "group-m1", name: "M1", weightStr: "4" },
    { id: "group-m2", name: "M2", weightStr: "4" },
  ],
  people: [
    { id: "person-a", name: "A", groupId: "group-b4" },
    { id: "person-b", name: "B", groupId: "group-m1" },
    { id: "person-c", name: "C", groupId: "group-b3" },
    { id: "person-d", name: "D", groupId: "group-m2" },
  ],
  expenses: [
    {
      id: "expense-lunch",
      payerId: "person-a",
      item: "お弁当",
      amountStr: "12000",
      targetMode: "all",
      targetPersonIds: [],
    },
    {
      id: "expense-drinks",
      payerId: "person-b",
      item: "飲み物",
      amountStr: "12000",
      targetMode: "all",
      targetPersonIds: [],
    },
  ],
};

/**
 * 空の初期状態。グループは1つ必要（参加者の所属先になり、保存データの
 * 検証も groups.length === 0 を弾く）なので、1つだけ置く。
 */
export const EMPTY_STATE: AppState = {
  version: APP_STATE_VERSION,
  title: "",
  teacherTotalStr: "",
  groups: [{ id: "group-default", name: "全員", weightStr: "1" }],
  people: [],
  expenses: [],
};

export function cloneInitialState(): AppState {
  return structuredClone(INITIAL_STATE);
}

export function cloneEmptyState(): AppState {
  return structuredClone(EMPTY_STATE);
}

/**
 * crypto.randomUUID はセキュアコンテキスト（https / localhost）でしか生えない。
 * 研究室の LAN に http://192.168.x.x で共有するとスマホ側で undefined になり、
 * これが無いと「追加」ボタンが軒並み例外で止まるため、必ずフォールバックする。
 */
export function makeId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  }

  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
