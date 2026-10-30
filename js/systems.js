
import { createId } from "./state.js";

const RARITIES = [
  { name: "普通", weight: 55, min: 200, max: 900 },
  { name: "精良", weight: 27, min: 700, max: 2200 },
  { name: "稀有", weight: 13, min: 1800, max: 6000 },
  { name: "極稀有", weight: 4.5, min: 5000, max: 18000 },
  { name: "傳奇", weight: 0.5, min: 15000, max: 60000 }
];

const JADE_TYPES = [
  "白玉", "青玉", "碧玉", "墨玉",
  "紫羅蘭", "冰種翡翠", "玻璃種翡翠"
];

const SKILLS = {
  appraisal: {
    name: "鑑定技術",
    description: "提高鑑定資訊的完整程度。",
    costs: [1000, 2500, 5000, 9000, 15000]
  },
  cutting: {
    name: "切割技術",
    description: "降低切割時的玉肉損耗。",
    costs: [1200, 3000, 6000, 10000, 18000]
  },
  crafting: {
    name: "加工技術",
    description: "提高首飾製作的成品價值。",
    costs: [1500, 3500, 7000, 12000, 20000]
  },
  trading: {
    name: "交易技術",
    description: "提高出售價格。",
    costs: [1000, 2800, 6000, 11000, 18000]
  }
};

function random(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function weightedRarity() {
  let roll = Math.random() * 100;

  for (const rarity of RARITIES) {
    roll -= rarity.weight;
    if (roll < 0) return rarity;
  }

  return RARITIES[0];
}

function makeJade(state, stone, index, ratio = 1) {
  const rarityIndex = RARITIES.findIndex(
    item => item.name === stone.rarity
  );

  const rarityBonus = Math.max(0, rarityIndex) * 0.12;
  const baseArea = random(10, 30) * (1 + rarityBonus);
  const area = Math.max(1, baseArea * ratio);

  return {
    id: createId(state),
    name: `${stone.jadeType}玉料 ${index + 1}`,
    type: stone.jadeType,
    rarity: stone.rarity,
    area: Number(area.toFixed(2)),
    quality: random(55, 100),
    transparency: random(20, 100),
    cracks: random(0, 5),
    impurities: random(0, 5),
    value: Math.round(stone.baseValue * ratio * random(35, 85) / 100),
    sourceStone: stone.id
  };
}

export function drawStone(state) {
  if (state.gold < 500) {
    throw new Error("金幣不足，需要 500 G。");
  }

  state.gold -= 500;

  let rarity = weightedRarity();

  // 九抽未出極稀有以上，第十抽保證極稀有以上。
  if (state.pity.epic >= 9 && rarity.weight < 13) {
    rarity = RARITIES[2 + random(0, 2)];
  }

  // 三十抽傳奇保底，與極稀有保底獨立。
  if (state.pity.legendary >= 29) {
    rarity = RARITIES[4];
  }

  if (rarity.name === "傳奇") {
    state.pity.legendary = 0;
  } else {
    state.pity.legendary += 1;
  }

  if (rarity.name === "極稀有" || rarity.name === "傳奇") {
    state.pity.epic = 0;
  } else {
    state.pity.epic += 1;
  }

  const stone = {
    id: createId(state),
    name: `${rarity.name}原石`,
    rarity: rarity.name,
    baseValue: random(rarity.min, rarity.max),
    jadeType: JADE_TYPES[
      rarity.name === "傳奇"
        ? random(3, 6)
        : random(0, 4)
    ],
    jadeCount: random(1, rarity.name === "普通" ? 2 : 4),
    reveal: 0,
    cutCount: 0,
    damage: 0,
    parts: 0,
    cutHistory: [],
    appraisal: {
      flashlight: false,
      magnifier: false,
      scanner: false
    },
    createdAt: Date.now()
  };

  state.stones.push(stone);
  return stone;
}

export function drawTen(state) {
  if (state.gold < 4500) {
    throw new Error("金幣不足，需要 4,500 G。");
  }

  state.gold -= 4500;

  const results = [];
  let gotEpic = false;

  for (let i = 0; i < 10; i++) {
    let rarity = weightedRarity();

    if (state.pity.legendary >= 29) {
      rarity = RARITIES[4];
    } else if (
      state.pity.epic >= 9 ||
      (!gotEpic && i === 9)
    ) {
      rarity = RARITIES[2 + random(0, 2)];
    }

    if (rarity.name === "傳奇") {
      state.pity.legendary = 0;
    } else {
      state.pity.legendary++;
    }

    if (rarity.name === "極稀有" || rarity.name === "傳奇") {
      state.pity.epic = 0;
      gotEpic = true;
    } else {
      state.pity.epic++;
    }

    const stone = createStoneFromRarity(state, rarity);
    state.stones.push(stone);
    results.push(stone);
  }

  return results;
}

function createStoneFromRarity(state, rarity) {
  return {
    id: createId(state),
    name: `${rarity.name}原石`,
    rarity: rarity.name,
    baseValue: random(rarity.min, rarity.max),
    jadeType: JADE_TYPES[
      rarity.name === "傳奇"
        ? random(3, 6)
        : random(0, 4)
    ],
    jadeCount: random(1, rarity.name === "普通" ? 2 : 4),
    reveal: 0,
    cutCount: 0,
    damage: 0,
    parts: 0,
    cutHistory: [],
    appraisal: {
      flashlight: false,
      magnifier: false,
      scanner: false
    },
    createdAt: Date.now()
  };
}

export function appraiseStone(stone, tool) {
  const tools = {
    flashlight: {
      label: "手電筒",
      result: `光線顯示：${stone.jadeType}可能具有一定透光性。`
    },
    magnifier: {
      label: "放大鏡",
      result: `表面觀察：裂紋與雜質仍需進一步確認。`
    },
    scanner: {
      label: "探測儀",
      result: `內部訊號：疑似存在 ${stone.jadeCount} 處玉肉區域。`
    }
  };

  if (!tools[tool]) {
    throw new Error("未知的鑑定工具。");
  }

  stone.appraisal[tool] = true;
  stone.reveal = Math.min(3, stone.reveal + 1);

  return `${tools[tool].label}：${tools[tool].result}`;
}

export function cutStone(state, stoneId, position, direction) {
  const index = state.stones.findIndex(s => s.id === stoneId);

  if (index === -1) {
    throw new Error("找不到這顆原石。");
  }

  const stone = state.stones[index];

  const lossRate = Math.max(
    0.03,
    0.16 - state.skills.cutting * 0.025
  );

  const damage = random(0, Math.round(lossRate * 100));
  const remainingValue = Math.max(
    1,
    Math.round(stone.baseValue * (1 - damage / 100))
  );

  const ratio = position / 100;
  const leftRatio = ratio;
  const rightRatio = 1 - ratio;

  const left = {
    ...stone,
    id: createId(state),
    name: `${stone.name}・左半`,
    baseValue: Math.round(remainingValue * leftRatio),
    jadeCount: Math.max(0, Math.ceil(stone.jadeCount * leftRatio)),
    parts: stone.parts + 1,
    cutCount: stone.cutCount + 1,
    damage: stone.damage + damage,
    cutHistory: [
      ...stone.cutHistory,
      { position, direction, damage, date: Date.now() }
    ],
    appraisal: { ...stone.appraisal }
  };

  const right = {
    ...stone,
    id: createId(state),
    name: `${stone.name}・右半`,
    baseValue: Math.round(remainingValue * rightRatio),
    jadeCount: Math.max(0, Math.floor(stone.jadeCount * rightRatio)),
    parts: stone.parts + 1,
    cutCount: stone.cutCount + 1,
    damage: stone.damage + damage,
    cutHistory: [
      ...stone.cutHistory,
      { position, direction, damage, date: Date.now() }
    ],
    appraisal: { ...stone.appraisal }
  };

  const jadeCount = stone.jadeCount;

  if (jadeCount > 0) {
    const leftCount = Math.ceil(jadeCount * leftRatio);
    const rightCount = jadeCount - leftCount;

    for (let i = 0; i < leftCount; i++) {
      state.jades.push(makeJade(state, left, i, leftRatio));
    }

    for (let i = 0; i < rightCount; i++) {
      state.jades.push(makeJade(state, right, i, rightRatio));
    }
  }

  state.stones.splice(index, 1, left, right);
  state.selectedStoneId = null;

  return { left, right, damage };
}

export function sellStone(state, id) {
  const index = state.stones.findIndex(s => s.id === id);
  if (index < 0) throw new Error("找不到原石。");

  const stone = state.stones[index];
  const price = Math.round(
    stone.baseValue * (1 + state.skills.trading * 0.05)
  );

  state.gold += price;
  state.stones.splice(index, 1);
  return price;
}

export function sellJade(state, id) {
  const index = state.jades.findIndex(j => j.id === id);
  if (index < 0) throw new Error("找不到玉料。");

  const jade = state.jades[index];
  const price = Math.round(
    jade.value *
    state.market.multiplier *
    (1 + state.skills.trading * 0.05)
  );

  state.gold += price;
  state.jades.splice(index, 1);
  return price;
}

export function craftJewelry(state, jadeId, kind) {
  const index = state.jades.findIndex(j => j.id === jadeId);
  if (index < 0) throw new Error("找不到玉料。");

  const jade = state.jades[index];
  const costs = {
    pendant: 300,
    bracelet: 700,
    ring: 450
  };

  const names = {
    pendant: "玉墜",
    bracelet: "玉鐲",
    ring: "玉戒"
  };

  const cost = costs[kind];

  if (!cost) throw new Error("未知的首飾種類。");
  if (state.gold < cost) throw new Error(`加工需要 ${cost} G。`);

  state.gold -= cost;

  const qualityBonus = jade.quality / 100;
  const skillBonus = 1 + state.skills.crafting * 0.08;

  const jewelry = {
    id: createId(state),
    name: `${jade.type}${names[kind]}`,
    kind,
    type: jade.type,
    rarity: jade.rarity,
    quality: jade.quality,
    value: Math.round(
      jade.value * (1.5 + qualityBonus) * skillBonus
    ),
    area: jade.area,
    createdAt: Date.now()
  };

  // 加工後保留部分剩料，供之後再次利用。
  const remainingArea = jade.area * 0.3;

  if (remainingArea >= 3) {
    jade.area = Number(remainingArea.toFixed(2));
    jade.value = Math.round(jade.value * 0.32);
    jade.name = `${jade.type}加工剩料`;
  } else {
    state.jades.splice(index, 1);
  }

  state.jewelry.push(jewelry);
  return jewelry;
}

export function sellJewelry(state, id) {
  const index = state.jewelry.findIndex(j => j.id === id);
  if (index < 0) throw new Error("找不到首飾。");

  const item = state.jewelry[index];
  const price = Math.round(
    item.value *
    state.market.multiplier *
    (1 + state.skills.trading * 0.05)
  );

  state.gold += price;
  state.jewelry.splice(index, 1);
  return price;
}

export function putInMuseum(state, id, type) {
  const collection = {
    stone: state.stones,
    jade: state.jades,
    jewelry: state.jewelry
  }[type];

  if (!collection) throw new Error("未知的收藏類型。");

  const index = collection.findIndex(item => item.id === id);
  if (index < 0) throw new Error("找不到收藏品。");

  const item = collection.splice(index, 1)[0];

  state.museum.push({
    ...item,
    museumType: type,
    displayedAt: Date.now()
  });

  return item;
}

export function removeFromMuseum(state, id) {
  const index = state.museum.findIndex(item => item.id === id);
  if (index < 0) throw new Error("找不到展品。");

  const item = state.museum.splice(index, 1)[0];
  const target = {
    stone: state.stones,
    jade: state.jades,
    jewelry: state.jewelry
  }[item.museumType];

  if (!target) throw new Error("展品類型不正確。");

  delete item.museumType;
  delete item.displayedAt;
  target.push(item);

  return item;
}

export function calculateMuseumIncome(state) {
  const totalValue = state.museum.reduce(
    (sum, item) => sum + (item.value || item.baseValue || 0),
    0
  );

  return Math.floor(
    totalValue * 0.0008 * (1 + state.skills.trading * 0.05)
  );
}

export function collectMuseumIncome(state) {
  const now = Date.now();
  const elapsed = Math.max(
    0,
    (now - state.museumLastUpdate) / 1000
  );

  const incomePerMinute = calculateMuseumIncome(state);
  const earned = Math.floor(incomePerMinute * elapsed / 60);

  state.museumBank += earned;
  state.museumLastUpdate = now;

  const amount = state.museumBank;
  state.museumBank = 0;
  state.gold += amount;

  return amount;
}

export function buySkill(state, key) {
  const skill = SKILLS[key];
  if (!skill) throw new Error("找不到技能。");

  const level = state.skills[key];

  if (level >= skill.costs.length) {
    throw new Error("技能已達最高等級。");
  }

  const cost = skill.costs[level];

  if (state.gold < cost) {
    throw new Error(`升級需要 ${cost} G。`);
  }

  state.gold -= cost;
  state.skills[key] += 1;

  return {
    name: skill.name,
    level: state.skills[key],
    cost
  };
}

export function updateMarket(state) {
  const now = Date.now();

  if (now - state.market.lastUpdate < 60000) return;

  state.market.multiplier = Math.max(
    0.65,
    Math.min(1.6, state.market.multiplier + (Math.random() - 0.48) * 0.15)
  );

  state.market.lastUpdate = now;
}
