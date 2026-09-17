import {
  type AppState,
  type CalculationResult,
  MAX_MONEY,
  MAX_WEIGHT,
  type PersonRow,
  type Transfer,
} from "./model.ts";

export type NumberValidation = {
  value: number;
  error: string | null;
};

export function validateMoneyInput(input: string): NumberValidation {
  const trimmed = input.trim();
  if (trimmed === "") return { value: 0, error: null };

  const normalized = trimmed.replace(/[,￥¥\s]/g, "");
  if (!/^\d+$/.test(normalized)) {
    return { value: 0, error: "0以上の整数を入力してください。" };
  }

  const value = Number(normalized);
  if (!Number.isSafeInteger(value) || value > MAX_MONEY) {
    return {
      value: 0,
      error: `${MAX_MONEY.toLocaleString("ja-JP")}円以下で入力してください。`,
    };
  }

  return { value, error: null };
}

export function validateWeightInput(input: string): NumberValidation {
  const trimmed = input.trim();
  if (trimmed === "") return { value: 0, error: null };
  if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(trimmed)) {
    return { value: 0, error: "0以上の数値を入力してください。" };
  }

  const value = Number(trimmed);
  if (!Number.isFinite(value) || value < 0 || value > MAX_WEIGHT) {
    return { value: 0, error: `${MAX_WEIGHT}以下で入力してください。` };
  }

  return { value, error: null };
}

export function formatYen(value: number): string {
  return value.toLocaleString("ja-JP");
}

function addToMap(map: Map<string, number>, id: string, amount: number) {
  map.set(id, (map.get(id) ?? 0) + amount);
}

export function computeWeightedShares(
  participants: { id: string; weight: number }[],
  amount: number
): Map<string, number> {
  const shareMap = new Map<string, number>();
  if (participants.length === 0 || amount <= 0) return shareMap;

  const safeParticipants = participants.map((participant) => ({
    id: participant.id,
    weight:
      Number.isFinite(participant.weight) && participant.weight >= 0
        ? participant.weight
        : 0,
  }));
  const sumWeight = safeParticipants.reduce((sum, participant) => sum + participant.weight, 0);

  if (sumWeight <= 0) {
    const base = Math.floor(amount / safeParticipants.length);
    const remainder = amount - base * safeParticipants.length;
    for (const participant of safeParticipants) shareMap.set(participant.id, base);
    for (let index = 0; index < remainder; index++) {
      const id = safeParticipants[index % safeParticipants.length].id;
      shareMap.set(id, (shareMap.get(id) ?? 0) + 1);
    }
    return shareMap;
  }

  let baseSum = 0;
  const allocations = safeParticipants.map((participant, index) => {
    const ideal = (amount * participant.weight) / sumWeight;
    const base = Math.floor(ideal);
    baseSum += base;
    return { id: participant.id, base, fraction: ideal - base, index };
  });

  for (const allocation of allocations) shareMap.set(allocation.id, allocation.base);

  const remainder = amount - baseSum;
  allocations.sort(
    (left, right) => right.fraction - left.fraction || left.index - right.index
  );
  for (let index = 0; index < remainder; index++) {
    const id = allocations[index % allocations.length].id;
    shareMap.set(id, (shareMap.get(id) ?? 0) + 1);
  }

  return shareMap;
}

export function buildDisplayNames(
  people: { id: string; name: string; groupName: string }[]
): Map<string, string> {
  const nameCounts = new Map<string, number>();
  for (const person of people) {
    nameCounts.set(person.name, (nameCounts.get(person.name) ?? 0) + 1);
  }

  const candidateCounts = new Map<string, number>();
  const candidates = people.map((person) => {
    const candidate =
      (nameCounts.get(person.name) ?? 0) > 1
        ? `${person.name}(${person.groupName})`
        : person.name;
    candidateCounts.set(candidate, (candidateCounts.get(candidate) ?? 0) + 1);
    return { ...person, candidate };
  });

  const seen = new Map<string, number>();
  return new Map(
    candidates.map((person) => {
      const occurrence = (seen.get(person.candidate) ?? 0) + 1;
      seen.set(person.candidate, occurrence);
      const displayName =
        (candidateCounts.get(person.candidate) ?? 0) > 1
          ? `${person.candidate}・${occurrence}`
          : person.candidate;
      return [person.id, displayName];
    })
  );
}

export function settleBalances(
  balances: { id: string; displayName: string; balance: number }[]
): Transfer[] {
  const payers = balances
    .filter((row) => row.balance < 0)
    .map((row) => ({ id: row.id, name: row.displayName, amount: -row.balance }))
    .sort((left, right) => right.amount - left.amount);
  const receivers = balances
    .filter((row) => row.balance > 0)
    .map((row) => ({ id: row.id, name: row.displayName, amount: row.balance }))
    .sort((left, right) => right.amount - left.amount);

  const transfers: Transfer[] = [];
  let payerIndex = 0;
  let receiverIndex = 0;

  while (payerIndex < payers.length && receiverIndex < receivers.length) {
    const payer = payers[payerIndex];
    const receiver = receivers[receiverIndex];
    const amount = Math.min(payer.amount, receiver.amount);

    if (amount > 0) {
      transfers.push({
        fromId: payer.id,
        from: payer.name,
        toId: receiver.id,
        to: receiver.name,
        amount,
      });
      payer.amount -= amount;
      receiver.amount -= amount;
    }
    if (payer.amount === 0) payerIndex++;
    if (receiver.amount === 0) receiverIndex++;
  }

  return transfers;
}

export function calculateBill(state: AppState): CalculationResult {
  const warnings: string[] = [];
  const groupById = new Map(state.groups.map((group) => [group.id, group]));
  const weightByGroup = new Map<string, number>();

  for (const group of state.groups) {
    const validation = validateWeightInput(group.weightStr);
    weightByGroup.set(group.id, validation.value);
    if (validation.error) warnings.push(`${group.name || "名称未設定のグループ"}：${validation.error}`);
  }

  const participants = state.people
    .map((person) => ({ ...person, name: person.name.trim() }))
    .filter((person) => {
      if (person.name === "") return false;
      if (!groupById.has(person.groupId)) {
        warnings.push(`${person.name}：所属グループが見つかりません。`);
        return false;
      }
      return true;
    });

  if (participants.length === 0) warnings.push("参加者がいません。");

  const displayNames = buildDisplayNames(
    participants.map((person) => ({
      id: person.id,
      name: person.name,
      groupName: groupById.get(person.groupId)?.name ?? "所属不明",
    }))
  );
  const duplicateNames = [...new Set(
    participants
      .filter((person, index) =>
        participants.findIndex((candidate) => candidate.name === person.name) !== index
      )
      .map((person) => person.name)
  )];
  if (duplicateNames.length > 0) {
    warnings.push(`同名の参加者は送金表で所属名を付けて表示します：${duplicateNames.join(", ")}`);
  }

  const participantById = new Map(participants.map((person) => [person.id, person]));
  const paidMap = new Map<string, number>();
  const shareMap = new Map<string, number>();
  const expenseSummaries: string[] = [];
  let total = 0;
  let allTargetTotal = 0;

  for (const expense of state.expenses) {
    const amountValidation = validateMoneyInput(expense.amountStr);
    if (amountValidation.error) {
      warnings.push(`${expense.item || "名称未設定の支出"}：${amountValidation.error}`);
      continue;
    }
    const amount = amountValidation.value;
    if (amount <= 0) continue;

    const payer = participantById.get(expense.payerId);
    if (!payer) {
      warnings.push(`${expense.item || "名称未設定の支出"}：払った人が未選択です。`);
      continue;
    }

    const targets =
      expense.targetMode === "all"
        ? participants
        : expense.targetPersonIds
            .map((id) => participantById.get(id))
            .filter((person): person is (typeof participants)[number] => Boolean(person));
    if (targets.length === 0) {
      warnings.push(`${expense.item || "名称未設定の支出"}：負担対象がいません。`);
      continue;
    }

    total += amount;
    addToMap(paidMap, payer.id, amount);
    if (expense.targetMode === "all") allTargetTotal += amount;

    const targetShares = computeWeightedShares(
      targets.map((person) => ({
        id: person.id,
        weight: expense.targetMode === "all" ? weightByGroup.get(person.groupId) ?? 0 : 1,
      })),
      amount
    );
    for (const [id, share] of targetShares) addToMap(shareMap, id, share);

    const targetText =
      expense.targetMode === "all"
        ? "全体"
        : targets.map((person) => displayNames.get(person.id) ?? person.name).join(", ");
    expenseSummaries.push(
      `${displayNames.get(payer.id) ?? payer.name} / ${expense.item || "支出"} / ${formatYen(amount)}円 / ${targetText}`
    );
  }

  const teacherValidation = validateMoneyInput(state.teacherTotalStr);
  if (teacherValidation.error) warnings.push(`先生チーム負担：${teacherValidation.error}`);
  const teacherTotal = teacherValidation.value;
  const teacherCredit = Math.min(teacherTotal, allTargetTotal);
  if (teacherTotal > allTargetTotal && teacherTotal > 0) {
    warnings.push("先生チーム負担が全体支出を超えているため、全体支出の合計までを反映します。");
  }

  if (teacherCredit > 0 && participants.length > 0) {
    const teacherShares = computeWeightedShares(
      participants.map((person) => ({
        id: person.id,
        weight: weightByGroup.get(person.groupId) ?? 0,
      })),
      teacherCredit
    );
    for (const [id, share] of teacherShares) addToMap(shareMap, id, -share);
  }

  const rows: PersonRow[] = participants
    .map((person) => {
      const paid = paidMap.get(person.id) ?? 0;
      const share = shareMap.get(person.id) ?? 0;
      return {
        id: person.id,
        name: person.name,
        displayName: displayNames.get(person.id) ?? person.name,
        groupId: person.groupId,
        groupName: groupById.get(person.groupId)?.name ?? "所属不明",
        weight: weightByGroup.get(person.groupId) ?? 0,
        paid,
        share,
        balance: paid - share,
      };
    })
    .sort((left, right) => left.displayName.localeCompare(right.displayName, "ja"));

  const settlementBalances = rows.map((row) => ({
    id: row.id,
    displayName: row.displayName,
    balance: row.balance,
  }));
  if (teacherCredit > 0) {
    settlementBalances.push({
      id: "teacher-team",
      displayName: "先生チーム",
      balance: -teacherCredit,
    });
  }

  return {
    total,
    teacherTotal,
    teacherCredit,
    allTargetTotal,
    remainder: Math.max(total - teacherCredit, 0),
    rows,
    transfers: settleBalances(settlementBalances),
    paidSum: [...paidMap.values()].reduce((sum, amount) => sum + amount, 0),
    warnings,
    sumWeight: participants.reduce(
      (sum, person) => sum + (weightByGroup.get(person.groupId) ?? 0),
      0
    ),
    expenseSummaries,
  };
}
