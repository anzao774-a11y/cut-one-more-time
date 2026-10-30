
export const SAVE_KEY = "cut_one_more_time_save_v1";

export function createInitialState() {
  return {
    version: 1,
    gold: 10000,
    stones: [],
    jades: [],
    jewelry: [],
    museum: [],
    pity: {
      epic: 0,
      legendary: 0
    },
    skills: {
      appraisal: 0,
      cutting: 0,
      crafting: 0,
      trading: 0
    },
    market: {
      multiplier: 1,
      lastUpdate: Date.now()
    },
    museumBank: 0,
    museumLastUpdate: Date.now(),
    selectedStoneId: null,
    nextId: 1
  };
}

export function loadState() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return createInitialState();

    const saved = JSON.parse(raw);
    const initial = createInitialState();

    if (!saved || typeof saved !== "object") {
      return initial;
    }

    return {
      ...initial,
      ...saved,
      pity: { ...initial.pity, ...(saved.pity || {}) },
      skills: { ...initial.skills, ...(saved.skills || {}) },
      market: { ...initial.market, ...(saved.market || {}) },
      stones: Array.isArray(saved.stones) ? saved.stones : [],
      jades: Array.isArray(saved.jades) ? saved.jades : [],
      jewelry: Array.isArray(saved.jewelry) ? saved.jewelry : [],
      museum: Array.isArray(saved.museum) ? saved.museum : []
    };
  } catch (error) {
    console.error("讀取存檔失敗：", error);
    return createInitialState();
  }
}

export function saveState(state) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    return true;
  } catch (error) {
    console.error("儲存遊戲失敗：", error);
    return false;
  }
}

export function createId(state) {
  const id = `item_${state.nextId}`;
  state.nextId += 1;
  return id;
}

export function exportState(state) {
  const blob = new Blob(
    [JSON.stringify(state, null, 2)],
    { type: "application/json" }
  );

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "再切一刀就好_存檔.json";
  link.click();

  URL.revokeObjectURL(url);
}

export async function importState(file) {
  const text = await file.text();
  const data = JSON.parse(text);

  if (
    !data ||
    data.version !== 1 ||
    typeof data.gold !== "number" ||
    !Array.isArray(data.stones) ||
    !Array.isArray(data.jades)
  ) {
    throw new Error("存檔格式不正確或版本不相容。");
  }

  return data;
}
