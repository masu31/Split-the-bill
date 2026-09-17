import assert from "node:assert/strict";
import test from "node:test";
import {
  buildDisplayNames,
  calculateBill,
  computeWeightedShares,
  validateMoneyInput,
  validateWeightInput,
} from "./calc.ts";
import { APP_STATE_VERSION, type AppState, cloneInitialState } from "./model.ts";

function makeState(overrides: Partial<AppState> = {}): AppState {
  return {
    version: APP_STATE_VERSION,
    title: "test",
    teacherTotalStr: "0",
    groups: [
      { id: "g1", name: "B3", weightStr: "1" },
      { id: "g2", name: "M1", weightStr: "1" },
    ],
    people: [
      { id: "a", name: "A", groupId: "g1" },
      { id: "b", name: "B", groupId: "g2" },
    ],
    expenses: [
      {
        id: "e1",
        payerId: "a",
        item: "会計",
        amountStr: "10000",
        targetMode: "all",
        targetPersonIds: [],
      },
    ],
    ...overrides,
  };
}

test("最大剰余法は1円単位で合計を一致させる", () => {
  const shares = computeWeightedShares(
    [
      { id: "a", weight: 2 },
      { id: "b", weight: 3 },
      { id: "c", weight: 4 },
    ],
    1000
  );
  assert.equal([...shares.values()].reduce((sum, value) => sum + value, 0), 1000);
  assert.deepEqual([...shares.values()], [222, 333, 445]);
});

test("小数重みを丸めずに配分する", () => {
  const shares = computeWeightedShares(
    [
      { id: "a", weight: 1 },
      { id: "b", weight: 1.5 },
    ],
    500
  );
  assert.deepEqual([...shares.values()], [200, 300]);
  assert.equal(validateWeightInput("1.5").value, 1.5);
});

test("個人指定の支出はグループ重みに関係なく均等に分ける", () => {
  const state = cloneInitialState();
  state.teacherTotalStr = "0";
  state.groups.find((group) => group.id === "group-b3")!.weightStr = "1";
  state.groups.find((group) => group.id === "group-m2")!.weightStr = "10";
  state.expenses = [
    {
      id: "custom-expense",
      payerId: "person-a",
      item: "個人のお菓子",
      amountStr: "1000",
      targetMode: "custom",
      targetPersonIds: ["person-c", "person-d"],
    },
  ];

  const result = calculateBill(state);
  assert.equal(result.rows.find((row) => row.id === "person-c")?.share, 500);
  assert.equal(result.rows.find((row) => row.id === "person-d")?.share, 500);
});

test("重み合計0では均等割りへフォールバックする", () => {
  const shares = computeWeightedShares(
    [
      { id: "a", weight: 0 },
      { id: "b", weight: 0 },
      { id: "c", weight: 0 },
    ],
    10
  );
  assert.deepEqual([...shares.values()], [4, 3, 3]);
});

test("先生チームを送金主体に含め、全送金の過不足をなくす", () => {
  const result = calculateBill(makeState({ teacherTotalStr: "2000" }));
  assert.equal(result.teacherCredit, 2000);
  assert.equal(result.rows.reduce((sum, row) => sum + row.balance, 0), 2000);
  assert.equal(
    result.transfers
      .filter((transfer) => transfer.fromId === "teacher-team")
      .reduce((sum, transfer) => sum + transfer.amount, 0),
    2000
  );
  assert.equal(
    result.transfers.reduce((sum, transfer) => sum + transfer.amount, 0),
    6000
  );
});

test("同名参加者は所属名付きで一意に表示する", () => {
  const names = buildDisplayNames([
    { id: "a", name: "田中", groupName: "B3" },
    { id: "b", name: "田中", groupName: "M1" },
    { id: "c", name: "佐藤", groupName: "B4" },
  ]);
  assert.equal(names.get("a"), "田中(B3)");
  assert.equal(names.get("b"), "田中(M1)");
  assert.equal(names.get("c"), "佐藤");
});

test("不正な金額や指数表記を拒否する", () => {
  assert.ok(validateMoneyInput("abc").error);
  assert.ok(validateMoneyInput("-500").error);
  assert.ok(validateMoneyInput("1e5").error);
  assert.equal(validateMoneyInput("12,000").value, 12000);
});
