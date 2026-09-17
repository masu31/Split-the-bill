import assert from "node:assert/strict";
import test from "node:test";
import { cloneInitialState } from "./model.ts";
import { loadStoredState, parseStoredState, STORAGE_KEY } from "./storage.ts";

test("正しい保存データだけを受け入れる", () => {
  const state = cloneInitialState();
  assert.deepEqual(parseStoredState(state), state);
});

test("peopleが配列でない保存データを拒否する", () => {
  const state = { ...cloneInitialState(), people: {} };
  assert.equal(parseStoredState(state), null);
});

test("必須フィールドが欠けた参加者を拒否する", () => {
  const state = { ...cloneInitialState(), people: [{ id: "broken" }] };
  assert.equal(parseStoredState(state), null);
});

test("未知のグループを持つ参加者を拒否する", () => {
  const state = cloneInitialState();
  state.people[0].groupId = "unknown-group";
  assert.equal(parseStoredState(state), null);
});

test("壊れたJSONを保存先から削除して復旧する", () => {
  const values = new Map([[STORAGE_KEY, "{broken"]]);
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    removeItem: (key: string) => values.delete(key),
  };

  assert.deepEqual(loadStoredState(storage), { state: null, recovered: true });
  assert.equal(values.has(STORAGE_KEY), false);
});

test("形の違う保存データも削除して復旧する", () => {
  const values = new Map([[STORAGE_KEY, JSON.stringify({ version: 2, people: {} })]]);
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    removeItem: (key: string) => values.delete(key),
  };

  assert.deepEqual(loadStoredState(storage), { state: null, recovered: true });
  assert.equal(values.has(STORAGE_KEY), false);
});

test("サイトデータがブロックされていても例外を投げない", () => {
  const storage = {
    getItem: () => {
      throw new DOMException("blocked", "SecurityError");
    },
    removeItem: () => {
      throw new DOMException("blocked", "SecurityError");
    },
  };

  // 読めないだけなので「壊れていた」扱いにはしない
  assert.deepEqual(loadStoredState(storage), { state: null, recovered: false });
});

test("壊れた支出があると state 全体を受け付けない", () => {
  const state = cloneInitialState();
  state.expenses[0].payerId = "unknown-person";
  assert.equal(parseStoredState(state), null);
});
