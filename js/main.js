
import {
  loadState,
  saveState,
  createInitialState,
  exportState,
  importState
} from "./state.js";

import {
  drawStone,
  drawTen,
  appraiseStone,
  cutStone,
  sellStone,
  sellJade,
  craftJewelry,
  sellJewelry,
  putInMuseum,
  removeFromMuseum,
  calculateMuseumIncome,
  collectMuseumIncome,
  buySkill,
  updateMarket
} from "./systems.js";

let state = loadState();
let toastTimer = null;

const $ = id => document.getElementById(id);

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function money(value) {
  return `${Math.floor(value || 0).toLocaleString("zh-TW")} G`;
}

function notify(message) {
  const element = $("toast");
  element.textContent = message;
  element.classList.add("show");

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    element.classList.remove("show");
  }, 2400);
}

function persist() {
  if (!saveState(state)) {
    notify("存檔失敗，請檢查瀏覽器儲存空間。");
  }
}

function runAction(action) {
  try {
    action();
    persist();
    render();
  } catch (error) {
    console.error(error);
    notify(error.message || "操作失敗，請稍後再試。");
  }
}

function rarityClass(rarity) {
  return `rarity-${escapeHTML(rarity)}`;
}

function stoneArt() {
  return `
    <div class="stone-art">
      <div class="stone-shape"></div>
    </div>
  `;
}

function itemCard(item, type) {
  const id = escapeHTML(item.id);
  const rarity = escapeHTML(item.rarity || "普通");
  const name = escapeHTML(item.name);
  const value = item.value || item.baseValue || 0;

  let details = "";
  let actions = "";

  if (type === "stone") {
    details = `
      <p>玉種線索：${escapeHTML(item.jadeType)}</p>
      <p>預估原石價值：${money(value)}</p>
      <p>內部玉肉線索：${item.jadeCount || 0} 處</p>
      <p>切割次數：${item.cutCount || 0}</p>
    `;

    actions = `
      <button data-action="select-stone" data-id="${id}">送入切割室</button>
      <button data-action="flashlight" data-id="${id}">手電筒</button>
      <button data-action="magnifier" data-id="${id}">放大鏡</button>
      <button data-action="scanner" data-id="${id}">探測儀</button>
      <button data-action="sell-stone" data-id="${id}">出售</button>
      <button data-action="museum-stone" data-id="${id}">收藏展出</button>
    `;
  }

  if (type === "jade") {
    details = `
      <p>玉種：${escapeHTML(item.type)}</p>
      <p>面積：${item.area}</p>
      <p>品相：${item.quality}/100</p>
      <p>透明度：${item.transparency}/100</p>
      <p>裂紋：${item.cracks}　雜質：${item.impurities}</p>
      <p>估值：${money(value)}</p>
    `;

    actions = `
      <button data-action="craft-pendant" data-id="${id}">製作玉墜</button>
      <button data-action="craft-ring" data-id="${id}">製作玉戒</button>
      <button data-action="craft-bracelet" data-id="${id}">製作玉鐲</button>
      <button data-action="sell-jade" data-id="${id}">出售玉料</button>
      <button data-action="museum-jade" data-id="${id}">收藏展出</button>
    `;
  }

  if (type === "jewelry") {
    details = `
      <p>種類：${escapeHTML(item.kind)}</p>
      <p>玉種：${escapeHTML(item.type)}</p>
      <p>品相：${item.quality}/100</p>
      <p>目前估值：${money(value)}</p>
    `;

    actions = `
      <button data-action="sell-jewelry" data-id="${id}">出售首飾</button>
      <button data-action="museum-jewelry" data-id="${id}">收藏展出</button>
    `;
  }

  return `
    <article class="stone-card">
      ${stoneArt()}
      <span class="rarity ${rarityClass(rarity)}">${rarity}</span>
      <h3>${name}</h3>
      ${details}
      <div class="card-actions">${actions}</div>
    </article>
  `;
}

function renderMarket() {
  $("pity-info").textContent =
    `極稀有保底計數：${state.pity.epic}/9　` +
    `傳奇保底計數：${state.pity.legendary}/29`;

  $("draw-results").innerHTML = `
    <div class="info-panel">
      <p>每顆原石的內部資料在取得時生成。</p>
      <p>十抽至少包含一顆極稀有或傳奇。</p>
      <p>目前市場價格倍率：${state.market.multiplier.toFixed(2)} 倍</p>
    </div>
  `;
}

function renderInventory() {
  const total =
    state.stones.length +
    state.jades.length +
    state.jewelry.length;

  $("inventory-count").textContent = `共 ${total} 件收藏`;

  const cards = [
    ...state.stones.map(item => itemCard(item, "stone")),
    ...state.jades.map(item => itemCard(item, "jade")),
    ...state.jewelry.map(item => itemCard(item, "jewelry"))
  ];

  $("inventory-list").innerHTML =
    cards.join("") || `<div class="empty-state">倉庫目前空空如也。去市場找點寶貝吧！</div>`;
}

function renderCutting() {
  const stone = state.stones.find(
    item => item.id === state.selectedStoneId
  );

  const preview = $("stone-preview");
  const cutButton = $("cut-button");
  const skipButton = $("skip-cut");

  if (!stone) {
    preview.innerHTML =
      `<div class="empty-state">請先從倉庫選擇一顆原石</div>`;

    cutButton.disabled = true;
    skipButton.disabled = true;
    return;
  }

  preview.innerHTML = `
    <div>
      ${stoneArt()}
      <p>${escapeHTML(stone.name)}</p>
      <p class="muted">${escapeHTML(stone.rarity)}・${escapeHTML(stone.jadeType)}</p>
    </div>
  `;

  cutButton.disabled = false;
  skipButton.disabled = false;
}

function renderCrafting() {
  $("jade-list").innerHTML =
    state.jades.map(item => itemCard(item, "jade")).join("") ||
    `<div class="empty-state">目前沒有可加工的玉料。先去切割原石吧。</div>`;
}

function renderMuseum() {
  const income = calculateMuseumIncome(state);

  $("museum-income").textContent = `每分鐘 ${money(income)}`;
  $("museum-bank").textContent = money(state.museumBank);

  $("museum-list").innerHTML = state.museum.map(item => `
    <article class="stone-card">
      ${stoneArt()}
      <h3>${escapeHTML(item.name)}</h3>
      <p>收藏類型：${escapeHTML(item.museumType)}</p>
      <p>收藏價值：${money(item.value || item.baseValue)}</p>
      <button data-action="museum-remove" data-id="${escapeHTML(item.id)}">
        取回收藏
      </button>
    </article>
  `).join("") || `<div class="empty-state">博物館還沒有展品。</div>`;
}

function renderSkills() {
  const definitions = [
    ["appraisal", "鑑定技術", "提升鑑定資訊完整度。", [1000, 2500, 5000, 9000, 15000]],
    ["cutting", "切割技術", "降低切割時的玉肉損耗。", [1200, 3000, 6000, 10000, 18000]],
    ["crafting", "加工技術", "提高首飾製作價值。", [1500, 3500, 7000, 12000, 20000]],
    ["trading", "交易技術", "提高出售價格與博物館收益。", [1000, 2800, 6000, 11000, 18000]]
  ];

  $("skill-list").innerHTML = definitions.map(
    ([key, name, description, costs]) => {
      const level = state.skills[key];
      const cost = costs[level];

      return `
        <article class="stone-card">
          <h3>${name}</h3>
          <p>${description}</p>
          <p>目前等級：${level}/${costs.length}</p>
          <p>${cost === undefined ? "已達最高等級" : `升級費用：${money(cost)}`}</p>
          <button
            data-action="buy-skill"
            data-id="${key}"
            ${cost === undefined ? "disabled" : ""}
          >升級技能</button>
        </article>
      `;
    }
  ).join("");
}

function render() {
  $("gold").textContent = money(state.gold);

  renderMarket();
  renderInventory();
  renderCutting();
  renderCrafting();
  renderMuseum();
  renderSkills();
}

function selectTab(name) {
  document.querySelectorAll(".tabs button").forEach(button => {
    button.classList.toggle("active", button.dataset.tab === name);
  });

  document.querySelectorAll(".page").forEach(page => {
    page.classList.toggle("active", page.id === name);
  });

  if (name === "cutting") renderCutting();
}

function handleItemAction(action, id) {
  const stone = state.stones.find(item => item.id === id);

  switch (action) {
    case "select-stone":
      if (!stone) throw new Error("找不到原石。");
      state.selectedStoneId = id;
      selectTab("cutting");
      notify("原石已送入切割室。");
      break;

    case "flashlight":
    case "magnifier":
    case "scanner": {
      if (!stone) throw new Error("找不到原石。");
      const message = appraiseStone(stone, action);
      notify(message);
      break;
    }

    case "sell-stone":
      notify(`原石售出，獲得 ${money(sellStone(state, id))}。`);
      break;

    case "sell-jade":
      notify(`玉料售出，獲得 ${money(sellJade(state, id))}。`);
      break;

    case "sell-jewelry":
      notify(`首飾售出，獲得 ${money(sellJewelry(state, id))}。`);
      break;

    case "craft-pendant":
    case "craft-ring":
    case "craft-bracelet": {
      const kind = {
        "craft-pendant": "pendant",
        "craft-ring": "ring",
        "craft-bracelet": "bracelet"
      }[action];

      const item = craftJewelry(state, id, kind);
      notify(`加工完成：${item.name}`);
      break;
    }

    case "museum-stone":
      putInMuseum(state, id, "stone");
      notify("原石已放入博物館。");
      break;

    case "museum-jade":
      putInMuseum(state, id, "jade");
      notify("玉料已放入博物館。");
      break;

    case "museum-jewelry":
      putInMuseum(state, id, "jewelry");
      notify("首飾已放入博物館。");
      break;

    case "museum-remove":
      removeFromMuseum(state, id);
      notify("已取回收藏品。");
      break;

    case "buy-skill": {
      const result = buySkill(state, id);
      notify(`${result.name}升級至 Lv.${result.level}`);
      break;
    }
  }
}

function bindEvents() {
  $("tabs").addEventListener("click", event => {
    const button = event.target.closest("[data-tab]");
    if (!button) return;
    selectTab(button.dataset.tab);
  });

  $("single-draw").addEventListener("click", () => {
    runAction(() => {
      const stone = drawStone(state);
      $("draw-results").innerHTML = itemCard(stone, "stone");
      notify(`抽中 ${stone.rarity}原石！`);
    });
  });

  $("ten-draw").addEventListener("click", () => {
    runAction(() => {
      const results = drawTen(state);

      $("draw-results").innerHTML =
        results.map(stone => itemCard(stone, "stone")).join("");

      const best = results.reduce((current, item) => {
        const order = ["普通", "精良", "稀有", "極稀有", "傳奇"];
        return order.indexOf(item.rarity) > order.indexOf(current.rarity)
          ? item
          : current;
      });

      notify(`十抽完成！最高稀有度：${best.rarity}`);
    });
  });

  // 使用事件委派，動態生成的卡片按鈕也能正常運作。
  document.addEventListener("click", event => {
    const button = event.target.closest("[data-action]");
    if (!button) return;

    const { action, id } = button.dataset;

    runAction(() => handleItemAction(action, id));
  });

  function performCut() {
    runAction(() => {
      const stone = state.stones.find(
        item => item.id === state.selectedStoneId
      );

      if (!stone) throw new Error("請先選擇原石。");

      const position = Number($("cut-position").value);
      const direction = $("cut-direction").value;

      const result = cutStone(
        state,
        stone.id,
        position,
        direction
      );

      $("cut-message").textContent =
        `切割完成！\n` +
        `左半：${result.left.name}\n` +
        `右半：${result.right.name}\n` +
        `本次損耗：${result.damage}%`;

      notify("切割完成，兩半原石已放入倉庫。");
    });
  }

  $("cut-button").addEventListener("click", performCut);
  $("skip-cut").addEventListener("click", performCut);

  $("collect-museum").addEventListener("click", () => {
    runAction(() => {
      const amount = collectMuseumIncome(state);
      notify(`領取博物館收益：${money(amount)}`);
    });
  });

  $("export-save").addEventListener("click", () => {
    persist();
    exportState(state);
    notify("存檔已匯出。");
  });

  $("import-save").addEventListener("click", () => {
    $("import-file").click();
  });

  $("import-file").addEventListener("change", async event => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const imported = await importState(file);
      state = imported;
      persist();
      render();
      notify("存檔匯入成功。");
    } catch (error) {
      console.error(error);
      notify(error.message || "匯入失敗。");
    }

    event.target.value = "";
  });

  $("reset-save").addEventListener("click", () => {
    if (!confirm("確定要重置遊戲嗎？目前進度將會消失。")) return;

    state = createInitialState();
    persist();
    render();
    selectTab("market");
    notify("遊戲已重置。");
  });
}

function accrueMuseumIncome() {
  const now = Date.now();
  const elapsed = Math.max(
    0,
    (now - state.museumLastUpdate) / 1000
  );

  if (elapsed <= 0) return;

  state.museumBank +=
    calculateMuseumIncome(state) * elapsed / 60;

  state.museumLastUpdate = now;
}

function initialize() {
  const requiredIds = [
    "gold", "tabs", "market", "inventory", "cutting",
    "crafting", "museum", "skills", "single-draw",
    "ten-draw", "inventory-list", "stone-preview",
    "cut-button", "skip-cut", "collect-museum"
  ];

  const missing = requiredIds.filter(id => !$(id));

  if (missing.length) {
    throw new Error(`遊戲初始化失敗，缺少頁面元素：${missing.join(", ")}`);
  }

  bindEvents();
  render();

  // 恢復離線期間累積的博物館收益。
  accrueMuseumIncome();

  setInterval(() => {
    accrueMuseumIncome();
    updateMarket(state);
    render();
    persist();
  }, 5000);

  // 確保切割室的預設按鈕狀態正確。
  selectTab("market");

  console.info("《再切一刀就好》已成功啟動。");
}

try {
  initialize();
} catch (error) {
  console.error("遊戲啟動失敗：", error);
  document.body.insertAdjacentHTML(
    "afterbegin",
    `<div style="padding:16px;background:#713e48;color:white">
      遊戲啟動失敗：${escapeHTML(error.message)}
    </div>`
  );
}
