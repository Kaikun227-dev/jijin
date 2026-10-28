    // ============================================================
    // 装備品システム
    //  - 装備品データ（全20種・ガチャ「装備品1」シリーズ産）
    //  - 所持／編成／強化まわりのヘルパー（playerState.equipOwned / equipFormation）
    //  - 対戦中の効果フック（applyDamage・drawCards・endPlayerTurn などから呼ばれる）
    //  - 編成画面下部の装備一覧、装備強化画面
    // ※ 対戦側は owner.equip（対戦開始時にスナップショットした [{id, level, dupe}]）だけを参照する。
    //    相手（AI）の装備は後日実装予定のため、現状は空配列。
    // ============================================================
    const EQUIP_COST_LIMIT = 20;   // 装備できる制限コスト（C）の合計上限
    const EQUIP_MAX_LEVEL = 10;    // 強化上限Lv
    const EQUIP_DUPE_CAP = 20;     // 重複取得によるレベル加算（＋n）の上限
    const EQUIP_EXP_BASE_BY_RARITY = { 1: 400, 2: 1200, 3: 1800 }; // Lv1→2に必要なEXP（以降はカードと同じ×1.1^(Lv-1)）

    // effect.kind 一覧
    //  hpFlat      : HP+ perLevel×Lv
    //  hpPercent   : HP+ value%（基準は、カード・デッキ効果・固定値の装備で加算された後の合計HP。複数ある場合は％を合算して1回だけ適用）
    //  expFlat     : 獲得経験値+ value%（固定）
    //  expPerLevel : 獲得経験値+ perLevel%×Lv
    //  dmgStar1    : ☆1カードの与えるダメージ+ pct%
    //  dmgAll      : 全てのカードの与えるダメージ+ perLevel%×Lv
    //  dmgSub      : サブカードの与えるダメージ+ perLevel%×Lv
    //  envelope / freezeImmune / startCost / tenguBeacon / protector / startStar3 / burger / moon : 固有効果
    // text 内の {v} は「perLevel × Lv」に置換される
    const EQUIPMENT_LIBRARY = [
      // ---- ☆1 ----
      { id: "soap",    name: "滑りやすい石けん", icon: "🧼", rarity: 1, cost: 1, text: "HP+{v}",  effect: { kind: "hpFlat", perLevel: 5 } },
      { id: "rock",    name: "硬い岩石",         icon: "🪨", rarity: 1, cost: 2, text: "HP+{v}",  effect: { kind: "hpFlat", perLevel: 10 } },
      { id: "helmet",  name: "軍用ヘルメット",   icon: "🪖", rarity: 1, cost: 3, text: "HP+{v}",  effect: { kind: "hpFlat", perLevel: 20 } },
      { id: "yoyo",    name: "ヨーヨー",         icon: "🪀", rarity: 1, cost: 1, text: "HP+1%",   effect: { kind: "hpPercent", value: 1 } },
      { id: "bear",    name: "熊の人形",         icon: "🧸", rarity: 1, cost: 2, text: "獲得経験値+10%", effect: { kind: "expFlat", value: 10 } },
      { id: "axe",     name: "木こりの斧",       icon: "🪓", rarity: 1, cost: 3, text: "☆1カードの与えるダメージ+{v}%", effect: { kind: "dmgStar1", perLevel: 1 } },
      { id: "tapioca", name: "タピオカドリンク", icon: "🧋", rarity: 1, cost: 4, text: "対戦開始時、コストを10獲得する。", effect: { kind: "startCost", value: 10 } },
      // ---- ☆2 ----
      { id: "steelheart", name: "鋼の心",        icon: "🩶", rarity: 2, cost: 5, text: "HP+{v}",  effect: { kind: "hpFlat", perLevel: 50 } },
      { id: "cap",     name: "角帽",             icon: "🎓", rarity: 2, cost: 3, text: "獲得経験値+{v}%", effect: { kind: "expPerLevel", perLevel: 3 } },
      { id: "watergun", name: "パンチグローブ",   icon: "🥊", rarity: 2, cost: 7, text: "全てのカードの与えるダメージ+{v}%", effect: { kind: "dmgAll", perLevel: 1 } },
      { id: "landscape", name: "風景画",         icon: "🖼️", rarity: 2, cost: 6, text: "サブカードの与えるダメージ+{v}%", effect: { kind: "dmgSub", perLevel: 2 } },
      { id: "hotheart", name: "熱い心",          icon: "❤️‍🔥", rarity: 2, cost: 4, text: "状態異常「凍結」による効果を無効化する。", effect: { kind: "freezeImmune" } },
      { id: "envelope", name: "開かずの封筒",    icon: "✉️", rarity: 2, cost: 4, text: "墓地リセットが発生した際、自身のHPを800回復する。効果が発動する度に回復量+200。", effect: { kind: "envelope", heal: 800, step: 200 } },
      { id: "tengu",   name: "天狗のお面",       icon: "👺", rarity: 2, cost: 5, text: "山札からカードを引いた時、そのカードに{v}%の確率でノーマルビーコンが1つ付与される。", effect: { kind: "tenguBeacon", perLevel: 3 } },
      { id: "protector", name: "簡易プロテクター", icon: "🛡️", rarity: 2, cost: 5, text: "相手からの最初の攻撃を1回だけ防ぐ。", effect: { kind: "protector" } },
      // ---- ☆3 ----
      { id: "candy",   name: "カラフルキャンディ", icon: "🍭", rarity: 3, cost: 3, text: "HP+5%", effect: { kind: "hpPercent", value: 5 } },
      { id: "moai",    name: "モアイ像",         icon: "🗿", rarity: 3, cost: 6, text: "HP+{v}",  effect: { kind: "hpFlat", perLevel: 100 } },
      { id: "goldcoin", name: "古代の金貨",      icon: "🪙", rarity: 3, cost: 6, text: "初期手札に☆3カードが1枚必ず含まれるようになる。", effect: { kind: "startStar3" } },
      { id: "burger",  name: "ビッグハンバーガー", icon: "🍔", rarity: 3, cost: 7, text: "自身のターン終了時にHPを300回復する。自身のHPが50%以下の時、回復量が600となる。", effect: { kind: "burger", heal: 300, lowHeal: 600, threshold: 0.5 } },
      { id: "moon",    name: "月の模型",         icon: "🌕", rarity: 3, cost: 7, text: "対戦開始時、自身に「月照」を1層付与する。月照によるダメージが発生した際、自身のHPを1000回復する。", effect: { kind: "moon", stacks: 1, heal: 1000 } },
    ];
    EQUIPMENT_LIBRARY.forEach(e => { e.isEquipment = true; });

    // ---- 装備品Ⅱ----
    const EQUIPMENT_LIBRARY_2 = [
      // ---- ☆1 ----
      { id: "sneaker",     name: "スニーカー",     icon: "👟", rarity: 1, cost: 1, text: "HP+30", effect: { kind: "hpFlat", value: 30 } },
      { id: "coffee",      name: "コーヒー",       icon: "☕", rarity: 1, cost: 2, text: "対戦開始時、コストを5獲得する。", effect: { kind: "startCost", value: 5 } },
      { id: "bottle",      name: "空の瓶",         icon: "🫙", rarity: 1, cost: 3, text: "対戦開始時、追加で山札からカードを2枚引く。", effect: { kind: "startExtraDraw", value: 2 } },
      { id: "snake",       name: "蛇の人形",       icon: "🐍", rarity: 1, cost: 2, text: "初期手札の引き直し回数+1", effect: { kind: "redrawBonus", value: 1 } },
      { id: "ice",         name: "冷たいアイス",   icon: "🍧", rarity: 1, cost: 3, text: "対戦開始時、相手に「悪寒」を1層付与する。", effect: { kind: "startEnemyStatus", status: "chill", value: 1 } },
      { id: "jellyfish",   name: "クラゲの置物",   icon: "🪼", rarity: 1, cost: 3, text: "自身のサブカードが破棄される度に、{v}%の確率で相手に「猛毒」を1層付与する。", effect: { kind: "subDiscardStatus", status: "toxin", perLevel: 5, value: 1 } },
      { id: "mask",        name: "混沌の仮面",     icon: "🎭", rarity: 1, cost: 4, text: "自身と相手は毎ターン{v}%の確率で600ダメージを受ける。", effect: { kind: "chaosDamage", perLevel: 3, value: 600 } },
      // ---- ☆2 ----
      { id: "gloves",      name: "厚い手袋",       icon: "🧤", rarity: 2, cost: 3, text: "HP+320", effect: { kind: "hpFlat", value: 320 } },
      { id: "firecracker", name: "火のついた爆竹", icon: "🧨", rarity: 2, cost: 4, text: "連続攻撃の攻撃回数+1", effect: { kind: "extraHitBonus", value: 1 } },
      { id: "knife",       name: "研がれた包丁",   icon: "🔪", rarity: 2, cost: 5, text: "エレメントスキルを使用した時、相手に{v}ダメージを与える。", effect: { kind: "elementSkillDamage", perLevel: 150 } },
      { id: "retort",      name: "怪しい蒸留器",   icon: "⚗️", rarity: 2, cost: 5, text: "自分が回復した時、その回復量の{v}%を相手にダメージとして与える。", effect: { kind: "healReflectPercent", perLevel: 3 } },
      { id: "oni",         name: "鬼のお面",       icon: "👹", rarity: 2, cost: 6, text: "手札が1枚以下の時、メインカードの与えるダメージ+{v}%", effect: { kind: "lowHandDamageBoost", perLevel: 2 } },
      { id: "bouquet",     name: "花束の贈り物",   icon: "💐", rarity: 2, cost: 4, text: "サブカードを設置する度に、自身のHPを200回復する。", effect: { kind: "healOnSubPlace", value: 200 } },
      { id: "feather",     name: "起死回生の羽",   icon: "🪶", rarity: 2, cost: 4, text: "自身のHPが10%以下の時、与えるダメージ+{v}%", effect: { kind: "lowHpDamageBoost", threshold: 0.1, perLevel: 3 } },
      { id: "wing",        name: "先手必勝の翼",   icon: "🪽", rarity: 2, cost: 5, text: "相手への最初に与えるダメージ+{v}%", effect: { kind: "firstHitBoost", perLevel: 4 } },
      // ---- ☆3 ----
      { id: "crown",       name: "古い王冠",       icon: "👑", rarity: 3, cost: 4, text: "装備した装備品（この装備品含む）の数だけHP+1%。", effect: { kind: "hpPercentPerCount", perItem: 1 } },
      { id: "book",        name: "デコられた本",   icon: "📔", rarity: 3, cost: 5, text: "エレメントスキル発動時、消費したコストの{v}%が返還される。", effect: { kind: "elementSkillRefund", perLevel: 5 } },
      { id: "mirror",      name: "反射鏡",         icon: "🪞", rarity: 3, cost: 6, text: "自分が受けたダメージが2000以上だった場合、そのダメージの20%を相手にも与える。", effect: { kind: "reflectDamage", threshold: 2000, pct: 20 } },      
      { id: "insurance",   name: "重い工具箱",     icon: "🧰", rarity: 3, cost: 6, text: "手札補充の枚数が4枚になる。", effect: { kind: "handRefillCount", value: 4 } },
      { id: "wand",        name: "魔法の杖",       icon: "🪄", rarity: 3, cost: 7, text: "相手に「アルカナ」を1層付与する。墓地リセットが発生した際、相手のアルカナを起爆させる。この効果は対戦中1回のみ発動可能。", effect: { kind: "arcanaWandOnDetonate", stacks: 1 } },
    ];
    EQUIPMENT_LIBRARY_2.forEach(e => { e.isEquipment = true; });
    EQUIPMENT_LIBRARY.push(...EQUIPMENT_LIBRARY_2);

    // ---- ショップ（欠片交換）専用の装備品 ----
    // ※ 「時限爆弾」は装備品Ⅱから移設。効果・ID・実装は変更なし。
    const EQUIPMENT_LIBRARY_SHOP = [
      { id: "sunglasses", name: "サングラス",     icon: "🕶️", rarity: 1, cost: 2, text: "装備した装備品（この装備品含む）の数だけ獲得経験値+2%。", effect: { kind: "expPercentPerCount", perItem: 2 } },
      { id: "bomb",       name: "時限爆弾",       icon: "💣", rarity: 2, cost: 6, text: "対戦開始時から10ターン後に爆発し、相手に{v}ダメージを与え、自身は500ダメージ受ける。", effect: { kind: "timeBomb", turns: 10, perLevel: 200, dmgSelf: 500 } },
      { id: "funbox",     name: "お楽しみボックス", icon: "🎁", rarity: 2, cost: 7, text: "対戦開始時、自身の全てのカードにランダムなビーコン（確率でトラブルも含む）を1つずつ付与する。", effect: { kind: "startRandomBeaconAll" } },
      { id: "fan",        name: "紅の扇子",       icon: "🪭", rarity: 3, cost: 5, text: "編成内の☆1カードの数だけHP+1%。与えるダメージ+1%", effect: { kind: "star1CountHpPercentPlusDmg", pctPerStar1: 1, dmgPct: 1 } },
      { id: "ring",       name: "ダイヤの指輪",   icon: "💍", rarity: 3, cost: 6, text: "自身のターン終了時にHPを100回復する。また、基礎獲得経験値+{v}", effect: { kind: "turnEndHealFlatExpBonus", heal: 100, perLevel: 500 } },
    ];
    EQUIPMENT_LIBRARY_SHOP.forEach(e => { e.isEquipment = true; e.shopOnly = true; });
    EQUIPMENT_LIBRARY.push(...EQUIPMENT_LIBRARY_SHOP);

    const EQUIP_INDEX = new Map(EQUIPMENT_LIBRARY.map((e, i) => [e.id, i]));
    const EQUIP_GACHA_BANNER_ID = "equip1";
    const EQUIP_GACHA_BANNER_ID_2 = "equip2";

    function getEquipDef(id) {
      const i = EQUIP_INDEX.get(id);
      return i === undefined ? null : EQUIPMENT_LIBRARY[i];
    }
    // ガチャ「装備品1」シリーズ（旧20種）
    function getEquipGachaDeck() {
      const ids = EQUIPMENT_LIBRARY.filter(e => !EQUIPMENT_LIBRARY_2.includes(e) && !e.shopOnly).map(e => e.id);
      return {
        id: EQUIP_GACHA_BANNER_ID,
        name: "装備品Ⅰ",
        desc: "装備品20種が排出されるガチャ。排出確率は他のガチャと同じ。既に所持している装備品が出ると、その装備品のLvが+1される（最大+20）。",
        cards: ids,
        isEquipment: true,
      };
    }
    // ガチャ「装備品Ⅱ」シリーズ（新規20種）
    function getEquipGachaDeck2() {
      return {
        id: EQUIP_GACHA_BANNER_ID_2,
        name: "装備品Ⅱ",
        desc: "新規の装備品20種が排出されるガチャ。排出確率は他のガチャと同じ。既に所持している装備品が出ると、その装備品のLvが+1される（最大+20）。",
        cards: EQUIPMENT_LIBRARY_2.map(e => e.id),
        isEquipment: true,
      };
    }

    // ---- 効果テキスト ----
    // level を渡すとその時点の数値、省略すると「perLevel×Lv」表記
    function equipEffectText(def, level) {
      const per = def.effect.perLevel;
      if (per === undefined) return def.text;
      const v = level ? per * level : `${per}×Lv`;
      return def.text.replace("{v}", v);
    }
    // 全装備共通の基礎効果：獲得経験値+1%（Lvごとに+1%、重複で更に+1%ずつ）
    function equipBaseExpPercent(level, dupe) { return level + dupe; }
    // この装備単体の獲得経験値ボーナス合計（基礎＋固有）
    function equipExpPercentOf(id, level, dupe) {
      const def = getEquipDef(id);
      if (!def) return 0;
      let pct = equipBaseExpPercent(level, dupe);
      if (def.effect.kind === "expFlat") pct += def.effect.value;
      if (def.effect.kind === "expPerLevel") pct += def.effect.perLevel * level;
      return pct;
    }
    function equipTooltipHtml(e) {
      const hasLv = typeof e._level === "number";
      const base = hasLv
        ? `獲得経験値+${equipBaseExpPercent(e._level, e._dupe || 0)}%（基礎効果）`
        : "獲得経験値+1%（基礎効果／強化・重複で上昇）";
      const lvLine = hasLv ? `<div>Lv.${e._level}${e._dupe ? ` ＋${e._dupe}` : ""}</div>` : "";
      return `<h3>${e.icon} 『${e.name}』 ${"☆".repeat(e.rarity)}</h3><div>装備品（${e.cost}C）</div>${lvLine}<div>${equipEffectText(e, hasLv ? e._level : 0)}</div><div style="margin-top:4px;color:#cfd6df;">${base}</div>`;
    }

    // ---- 装備カード表示（カードと同じ枠・ランクごとに色違い・アイコンは絵文字を大きく） ----
    function createEquipEl(def, options = {}) {
      const el = document.createElement("div");
      el.className = `card equip-card er${def.rarity}${options.small ? " small" : ""}`;
      el.dataset.equipId = def.id;
      el.innerHTML = `
        <div class="rarity">${"☆".repeat(def.rarity)}</div>
        <div class="card-name equip-icon">${def.icon}</div>
        <div class="type-label equip-cost">${def.cost}C</div>
      `;
      addTooltip(el, { ...def, isEquipment: true, _level: options.level, _dupe: options.dupe });
      return el;
    }

    // ============================================================
    // 所持・編成・強化（playerState）
    // ============================================================
    function grantEquipment(id) {
      const info = playerState.equipOwned[id];
      if (!info) {
        playerState.equipOwned[id] = { level: 1, dupe: 0 };
        playerState.equipAcquiredOrder.push(id);
        return "new";
      }
      if (info.dupe < EQUIP_DUPE_CAP) { info.dupe += 1; return "dupe"; }
      return "max";
    }
    function ownedEquipList() {
      return Object.keys(playerState.equipOwned).map(getEquipDef).filter(Boolean).sort((a, b) => {
        if (b.rarity !== a.rarity) return b.rarity - a.rarity;
        return EQUIP_INDEX.get(a.id) - EQUIP_INDEX.get(b.id);
      });
    }
    function equipCostUsed() {
      return playerState.equipFormation.reduce((sum, id) => sum + ((getEquipDef(id) || {}).cost || 0), 0);
    }
    function isEquipped(id) { return playerState.equipFormation.includes(id); }
    // 戻り値：null=成功／文字列=失敗理由
    function toggleEquipped(id) {
      const idx = playerState.equipFormation.indexOf(id);
      if (idx >= 0) { playerState.equipFormation.splice(idx, 1); return null; }
      const def = getEquipDef(id);
      if (!def || !playerState.equipOwned[id]) return "その装備品は所持していません。";
      const used = equipCostUsed();
      if (used + def.cost > EQUIP_COST_LIMIT) {
        return `制限コストを超えるため装備できません（現在${used}C ＋ ${def.cost}C ＞ ${EQUIP_COST_LIMIT}C）。`;
      }
      playerState.equipFormation.push(id);
      return null;
    }
    function equipExpRequiredForLevel(def, level) {
      const base = EQUIP_EXP_BASE_BY_RARITY[def.rarity] || 300;
      return Math.round(base * Math.pow(1.1, level - 1));
    }
    // 対戦開始時に、装備中の装備品を [{id, level, dupe}] としてスナップショットする
    function snapshotEquipForBattle() {
      return playerState.equipFormation.map(id => {
        const info = playerState.equipOwned[id] || { level: 1, dupe: 0 };
        return { id, level: info.level, dupe: info.dupe };
      });
    }

    // ============================================================
    // 対戦中の効果（owner.equip = [{id, level, dupe}]）
    // ============================================================
    function getEquipEntry(owner, id) {
      return owner && owner.equip ? owner.equip.find(e => e.id === id) || null : null;
    }
    function hasEquip(owner, id) { return !!getEquipEntry(owner, id); }

    function countStar1Cards(deckIds) {
      return (deckIds || []).filter(entry => {
        const id = entry.id || entry;
        const card = CARD_LIBRARY.find(x => x.id === id);
        return card && card.rarity === 1;
      }).length;
    }

    // 最大HPへの加算。subtotalHp＝装備加算前のHP（基礎HP＋デッキ効果＋カードLv/凸ボーナス）。
    // 固定値の装備を足した合計HPに対して、％系（ヨーヨー・キャンディー）を合算して1回だけ適用する。
    function equipHpBonus(list, subtotalHp, deckIds) {
      if (!list) return 0;
      let flat = 0, pct = 0;
      const star1Count = countStar1Cards(deckIds);
      list.forEach(e => {
        const def = getEquipDef(e.id);
        if (!def) return;
        if (def.effect.kind === "hpFlat") {
          flat += def.effect.perLevel !== undefined ? def.effect.perLevel * e.level : (def.effect.value || 0);
        } else if (def.effect.kind === "hpPercent") {
          pct += def.effect.value;
        } else if (def.effect.kind === "hpPercentPerCount") {
          pct += def.effect.perItem * list.length; // 古い王冠：装備数（この装備含む）×1%
        } else if (def.effect.kind === "star1CountHpPercentPlusDmg") {
          pct += def.effect.pctPerStar1 * star1Count; // 紅の扇子：☆1カードの数だけHP+1%
        }
      });
      return flat + Math.round((subtotalHp + flat) * pct / 100);
    }
    // 対戦後獲得経験値への加算％（装備中の全装備を合算）
    function equipExpBonusPercent(list) {
      if (!list) return 0;
      let sum = list.reduce((s, e) => s + equipExpPercentOf(e.id, e.level, e.dupe), 0);
      if (list.some(e => e.id === "sunglasses")) {
        sum += getEquipDef("sunglasses").effect.perItem * list.length; // サングラス：装備数（この装備含む）×2%
      }
      return sum;
    }
    // 装備の「獲得経験値＋固定値」の合計（ダイヤの指輪など、％ではなく固定量で加算されるもの）
    function equipExpFlatBonus(list) {
      if (!list) return 0;
      return list.reduce((sum, e) => {
        const def = getEquipDef(e.id);
        if (def && def.effect.kind === "turnEndHealFlatExpBonus") {
          return sum + def.effect.perLevel * e.level;
        }
        return sum;
      }, 0);
    }
    // 与ダメージ増加（applyDamageから呼ばれる）。[{def, pct}]
    function equipDamageEffects(source) {
      const list = source && source.equip;
      if (!list || list.length === 0) return [];
      const card = source._activeDamageCard;
      const out = [];
      list.forEach(e => {
        const def = getEquipDef(e.id);
        if (!def) return;
        const k = def.effect.kind;
        // 起死回生の羽・先手必勝の翼：カード種別を問わず適用
        if (k === "lowHpDamageBoost" && source.hp <= getMaxHP(source) * def.effect.threshold) {
          out.push({ def, pct: def.effect.perLevel * e.level });
        } else if (k === "firstHitBoost" && !source._equipFirstHitDone) {
          out.push({ def, pct: def.effect.perLevel * e.level });
          source._equipFirstHitDone = true;
        }
        if (!card) return; // 以下はカード由来のダメージにのみ適用
        if (k === "dmgStar1" && card.rarity === 1) out.push({ def, pct: def.effect.perLevel * e.level });
        else if (k === "dmgAll") out.push({ def, pct: def.effect.perLevel * e.level });
        else if (k === "dmgSub" && card.type === "sub") out.push({ def, pct: def.effect.perLevel * e.level });
        else if (k === "lowHandDamageBoost" && card.type === "main" && source.hand.length <= 1) {
          out.push({ def, pct: def.effect.perLevel * e.level });
        }
        else if (k === "star1CountHpPercentPlusDmg") {
          const deckIds = source.deckManifest || source.deck || [];
          out.push({ def, pct: def.effect.pctPerStar1 * countStar1Cards(deckIds) });
        }
      });
      return out;
    }
    // 簡易プロテクター：相手からの最初の攻撃を1回だけ防ぐ（状態異常ダメージは対象外）
    function equipTryBlockFirstAttack(source, target, label, amount, ailmentKey) {
      if (!hasEquip(target, "protector") || target._protectorUsed) return false;
      if (source === target || ailmentKey) return false;
      target._protectorUsed = true;
      log(`${target.label}の『簡易プロテクター』🛡️が${label}の${amount}ダメージを防いだ。`, "good");
      return true;
    }
    // 対戦開始時の効果をまとめて処理（コスト獲得・追加ドロー・相手への状態異常付与・月照付与など）
    function equipOnBattleStart(owner) {
      if (!owner.equip || owner.equip.length === 0) return;
      owner.equip.forEach(e => {
        const def = getEquipDef(e.id);
        if (!def) return;
        const k = def.effect.kind;
        if (k === "startCost") {
          owner.elementCost = Math.min(ELEMENT_COST_MAX, (owner.elementCost || 0) + def.effect.value);
          log(`『${def.name}』${def.icon}：コストを${def.effect.value}獲得した。`, "good");
        } else if (k === "startExtraDraw") {
          const room = Math.min(def.effect.value, MAX_HAND - owner.hand.length);
          if (room > 0) {
            const drawn = drawCards(owner, room);
            owner.hand.push(...drawn);
            log(`『${def.name}』${def.icon}：山札から${drawn.length}枚追加で引いた。`, "good");
          }
        } else if (k === "startEnemyStatus") {
          const target = opponentOf(owner);
          applyStatus(target, def.effect.status, def.effect.value);
          log(`『${def.name}』${def.icon}：${target.label}に「${STATUS_DEFS[def.effect.status].label}」を付与した。`, "good");
        } else if (k === "moon") {
          log(`『${def.name}』${def.icon}：${owner.label}に「月照」を付与する。`, "good");
          applyStatus(owner, "moonlit", def.effect.stacks);
        } else if (k === "arcanaWandOnDetonate") {
          const target = opponentOf(owner);
          applyStatus(target, "arcana", def.effect.stacks);
          log(`『${def.name}』${def.icon}：${target.label}に「アルカナ」を付与した。`, "good");
        } else if (k === "startRandomBeaconAll") {
          let count = 0;
          owner.deck.forEach(c => { if (grantBeacon(c)) count++; });
          log(`『${def.name}』${def.icon}：${owner.label}の全カード（${count}枚）にランダムなビーコンを付与した。`, "good");
        }
      });
    }
    // 初期手札の引き直し回数の上限（基本1回＋蛇の人形）
    function getInitialRedrawLimit() {
      return 1 + (game.player && hasEquip(game.player, "snake") ? 1 : 0);
    }
    // 連続攻撃の追加回数（火のついた爆竹）
    function equipExtraHitCount(owner) {
      return hasEquip(owner, "firecracker") ? 1 : 0;
    }
    // エレメントスキル使用時：研がれた包丁（ダメージ）・デコられた本（コスト一部返還）
    function equipOnElementSkillUse(owner, spentCost) {
      if (!owner.equip || owner.equip.length === 0) return;
      const knife = getEquipEntry(owner, "knife");
      if (knife) {
        const damage = getEquipDef("knife").effect.perLevel * knife.level;
        applyDamage(owner, opponentOf(owner), damage, `『研がれた包丁』🔪`, true);
      }
      const book = getEquipEntry(owner, "book");
      if (book) {
        const pct = getEquipDef("book").effect.perLevel * book.level;
        const refund = Math.round(spentCost * pct / 100);
        owner.elementCost = Math.min(ELEMENT_COST_MAX, (owner.elementCost || 0) + refund);
        log(`『デコられた本』📔：コストを${refund}獲得した（消費コストの${pct}%）。`, "good");
      }
    }
    // 自分が回復した時：怪しい蒸留器（回復量の一部を相手へダメージとして与える）
    function equipOnHeal(owner, healed) {
      const entry = getEquipEntry(owner, "retort");
      if (!entry) return;
      const pct = getEquipDef("retort").effect.perLevel * entry.level;
      const dmg = Math.round(healed * pct / 100);
      if (dmg > 0) applyDamage(owner, opponentOf(owner), dmg, `『怪しい蒸留器』⚗️`, true);
    }
    // サブカードを設置した時：花束の贈り物
    function equipOnSubPlace(owner) {
      if (!hasEquip(owner, "bouquet")) return;
      const healed = healHp(owner, getEquipDef("bouquet").effect.value);
      if (healed > 0) log(`『花束の贈り物』💐：サブカード設置でHPを${healed}回復した。`, "good");
    }
    // 自身のサブカードが破棄された時：クラゲの置物
    function equipOnSubDiscard(owner) {
      const jelly = getEquipEntry(owner, "jellyfish");
      if (!jelly) return;
      const eff = getEquipDef("jellyfish").effect;
      if (Math.random() < eff.perLevel * jelly.level / 100) {
        const target = opponentOf(owner);
        applyStatus(target, eff.status, eff.value);
        log(`『クラゲの置物』🪼：${target.label}に「猛毒」を${eff.value}層付与した。`, "good");
      }
    }
    // 手札補充枚数（通常3枚、重い工具箱を装備中は4枚）
    function equipHandRefillCount(owner) {
      const entry = getEquipEntry(owner, "insurance");
      return entry ? getEquipDef("insurance").effect.value : 3;
    }
    // 反射鏡：自分が受けたダメージが2000以上の場合、その一部を相手にも与える（applyDamageから呼ばれる）
    function equipOnCombatDamageTaken(target, source, amount) {
      if (!source || source === target) return;
      const entry = getEquipEntry(target, "mirror");
      if (!entry) return;
      const eff = getEquipDef("mirror").effect;
      if (amount < eff.threshold) return;
      const back = Math.round(amount * eff.pct / 100);
      if (back > 0) applyDamage(target, source, back, `『反射鏡』🪞`, true);
    }
    // ラウンド（自分のターン開始）ごとの効果：混沌の仮面・時限爆弾
    function equipTickRoundEffects(roundNumber) {
      const owner = game.player; // 相手（AI）の装備は後日実装予定
      if (!owner.equip || owner.equip.length === 0 || game.gameOver) return;
      const mask = getEquipEntry(owner, "mask");
      if (mask) {
        const eff = getEquipDef("mask").effect;
        const chance = eff.perLevel * mask.level / 100;
        if (Math.random() < chance) {
          owner.hp = Math.max(0, owner.hp - eff.value);
          log(`『混沌の仮面』🎭：${owner.label}が${eff.value}ダメージを受けた。`, "strong");
          checkWin();
        }
        if (!game.gameOver && Math.random() < chance) {
          const target = opponentOf(owner);
          target.hp = Math.max(0, target.hp - eff.value);
          log(`『混沌の仮面』🎭：${target.label}が${eff.value}ダメージを受けた。`, "strong");
          checkWin();
        }
      }
      if (game.gameOver) return;
      const bomb = getEquipEntry(owner, "bomb");
      if (bomb && !owner._bombExploded && roundNumber >= getEquipDef("bomb").effect.turns) {
        owner._bombExploded = true;
        const eff = getEquipDef("bomb").effect;
        const target = opponentOf(owner);
        applyDamage(owner, target, eff.perLevel * bomb.level, `『時限爆弾』💣の爆発`, true);
        owner.hp = Math.max(0, owner.hp - eff.dmgSelf);
        log(`『時限爆弾』💣：${owner.label}も爆発に巻き込まれ${eff.dmgSelf}ダメージを受けた。`, "strong");
        checkWin();
      }
    }
    // 古代の金貨：初期手札（山札の末尾から引く3枚）に☆3カードを必ず含める
    function equipEnsureStar3InInitialHand(owner) {
      if (!hasEquip(owner, "goldcoin")) return;
      if (owner.deck.slice(-3).some(c => c.rarity === 3)) return;
      const idxs = [];
      owner.deck.forEach((c, i) => { if (c.rarity === 3) idxs.push(i); });
      if (idxs.length === 0) return;
      const pickIdx = idxs[Math.floor(Math.random() * idxs.length)];
      const [card] = owner.deck.splice(pickIdx, 1);
      owner.deck.push(card);
    }
    // 開かずの封筒：墓地リセット時にHP回復。発動の度に回復量+200
    function equipOnGraveReset(owner) {
      const entry = getEquipEntry(owner, "envelope");
      if (entry) {
        const eff = getEquipDef("envelope").effect;
        const heal = eff.heal + eff.step * (owner._envelopeCount || 0);
        owner._envelopeCount = (owner._envelopeCount || 0) + 1;
        const healed = healHp(owner, heal);
        log(`『開かずの封筒』✉️：墓地リセットでHPを${healed}回復した（次回の回復量：${heal + eff.step}）。`, "good");
      }
      if (hasEquip(owner, "wand") && !owner._wandUsed) {
        owner._wandUsed = true;
        const target = opponentOf(owner);
        log(`『魔法の杖』🪄：墓地リセットに反応し、${target.label}の「アルカナ」を起爆させる。`, "strong");
        detonateArcana(owner, target);
      }
    }
    // 天狗のお面：山札から引いたカードに一定確率でノーマルビーコンを付与
    function equipOnDraw(owner, card) {
      const tengu = getEquipEntry(owner, "tengu");
      if (!tengu) return;
      if (Math.random() >= getEquipDef("tengu").effect.perLevel * tengu.level / 100) return;
      if (grantNormalBeacon(card)) log(`『天狗のお面』👺：『${card.name}』にノーマルビーコンが付与された。`, "good");
    }
    // ビッグハンバーガー：自身のターン終了時にHP回復（HP50%以下で増加）
    function equipOnTurnEnd(owner) {
      if (hasEquip(owner, "burger")) {
        const eff = getEquipDef("burger").effect;
        const low = owner.hp <= getMaxHP(owner) * eff.threshold;
        const healed = healHp(owner, low ? eff.lowHeal : eff.heal);
        log(`『ビッグハンバーガー』🍔：ターン終了時にHPを${healed}回復した${low ? "（HP50%以下）" : ""}。`, "good");
      }
      if (hasEquip(owner, "ring")) {
        const healed = healHp(owner, getEquipDef("ring").effect.heal);
        if (healed > 0) log(`『ダイヤの指輪』💍：ターン終了時にHPを${healed}回復した。`, "good");
      }
    }
    // 月の模型：月照によるダメージが発生した際にHP回復
    function equipOnMoonlitDamage(owner) {
      if (!hasEquip(owner, "moon")) return;
      const healed = healHp(owner, getEquipDef("moon").effect.heal);
      log(`『月の模型』🌕：月照のダメージでHPを${healed}回復した。`, "good");
    }

    // ============================================================
    // 編成画面の装備一覧（カード群の下）
    // ============================================================
    function renderEquipmentGrid() {
      const grid = document.getElementById("ownedEquipGrid");
      if (!grid) return;
      const used = equipCostUsed();
      const chip = document.getElementById("equipCostChip");
      if (chip) {
        chip.textContent = `制限コスト ${used} / ${EQUIP_COST_LIMIT} C`;
        chip.classList.toggle("full", used >= EQUIP_COST_LIMIT);
      }
      const topCost = document.getElementById("formationEquipCost");
      if (topCost) topCost.textContent = used;
      const list = ownedEquipList();
      const exp = equipExpBonusPercent(snapshotEquipForBattle());
      const expEl = document.getElementById("equipExpChip");
      if (expEl) expEl.textContent = `装備の獲得経験値ボーナス +${exp}%`;
      grid.innerHTML = "";
      if (list.length === 0) {
        const empty = document.createElement("div");
        empty.className = "equip-empty";
        empty.textContent = "装備品をまだ持っていません。ガチャの「装備品Ⅰ」「装備品Ⅱ」で入手できます。";
        grid.appendChild(empty);
        return;
      }
      list.forEach(def => {
        const info = playerState.equipOwned[def.id];
        const equipped = isEquipped(def.id);
        const overLimit = !equipped && used + def.cost > EQUIP_COST_LIMIT;
        const cell = document.createElement("div");
        cell.className = `owned-card-cell equip-cell${equipped ? " in-formation" : ""}${overLimit ? " over-limit" : ""}`;
        cell.appendChild(createEquipEl(def, { small: true, level: info.level, dupe: info.dupe }));
        const nameEl = document.createElement("div");
        nameEl.className = "equip-cell-name";
        nameEl.textContent = def.name;
        cell.appendChild(nameEl);
        const mark = document.createElement("div");
        mark.className = "card-select-mark";
        mark.textContent = "✓";
        cell.appendChild(mark);
        const lvBadge = document.createElement("div");
        lvBadge.className = "card-lv-badge";
        lvBadge.textContent = `Lv.${info.level}/${EQUIP_MAX_LEVEL}${info.dupe ? ` ＋${info.dupe}` : ""}`;
        cell.appendChild(lvBadge);
        const row = document.createElement("div");
        row.className = "enhance-action-row";
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "enhance-mini-btn";
        btn.textContent = "強化";
        btn.addEventListener("click", event => { event.stopPropagation(); openEquipEnhance(def.id); });
        row.appendChild(btn);
        cell.appendChild(row);
        cell.addEventListener("click", () => {
          const err = toggleEquipped(def.id);
          if (err) { window.alert(err); return; }
          renderOwnedCardGrid();
        });
        grid.appendChild(cell);
      });
    }
    document.getElementById("equipResetBtn").addEventListener("click", () => {
      playerState.equipFormation = [];
      renderEquipmentGrid();
    });

    // ============================================================
    // 装備強化画面
    // ============================================================
    let currentEquipEnhanceId = null;
    function openEquipEnhance(id) {
      currentEquipEnhanceId = id;
      renderEquipEnhance();
      showScreen("equipEnhanceScreen");
    }
    function renderEquipEnhance() {
      const def = getEquipDef(currentEquipEnhanceId);
      const info = def && playerState.equipOwned[def.id];
      if (!def || !info) return;
      const $ = id => document.getElementById(id);
      $("equipEnhanceName").textContent = `『${def.name}』強化`;
      $("equipEnhanceResExp").textContent = playerState.exp.toLocaleString();
      const visual = $("equipEnhanceVisual");
      visual.innerHTML = "";
      visual.appendChild(createEquipEl(def, { small: true, level: info.level, dupe: info.dupe }));
      $("equipEnhanceLevel").textContent = info.level;
      $("equipEnhanceMaxLevel").textContent = EQUIP_MAX_LEVEL;
      $("equipEnhanceDupe").textContent = info.dupe;
      $("equipEnhanceDupeCap").textContent = EQUIP_DUPE_CAP;
      $("equipEnhanceCost").textContent = def.cost;
      const hasPerLevel = def.effect.perLevel !== undefined;
      let effectHtml = `<div>${equipEffectText(def, info.level)}</div>`;
      if (hasPerLevel && info.level < EQUIP_MAX_LEVEL) {
        effectHtml += `<div class="equip-next">次のLv：${equipEffectText(def, info.level + 1)}</div>`;
      }
      $("equipEnhanceEffect").innerHTML = effectHtml;
      const own = equipExpPercentOf(def.id, info.level, info.dupe);
      $("equipEnhanceExpBonus").textContent =
        `獲得経験値 +${own}%（基礎効果 +${equipBaseExpPercent(info.level, info.dupe)}%`
        + (own !== equipBaseExpPercent(info.level, info.dupe) ? `＋この装備の効果 +${own - equipBaseExpPercent(info.level, info.dupe)}%` : "")
        + "）";
      const equipped = isEquipped(def.id);
      $("equipEnhanceToggleBtn").textContent = equipped ? "装備を外す" : "装備する";
      $("equipEnhanceCostNote").textContent = `現在の制限コスト：${equipCostUsed()} / ${EQUIP_COST_LIMIT} C${equipped ? "（装備中）" : ""}`;
      const btn = $("equipEnhanceLevelUpBtn");
      const note = $("equipEnhanceExpNote");
      const fill = $("equipEnhanceExpBarFill");
      if (info.level >= EQUIP_MAX_LEVEL) {
        note.textContent = "最大レベルに到達しています。";
        fill.style.width = "100%";
        btn.disabled = true;
        btn.textContent = "Lv.MAX";
      } else {
        const cost = equipExpRequiredForLevel(def, info.level);
        note.textContent = `次のLvまで必要EXP：${cost.toLocaleString()}（所持EXP：${playerState.exp.toLocaleString()}）`;
        fill.style.width = `${Math.min(100, Math.round((playerState.exp / cost) * 100))}%`;
        btn.disabled = playerState.exp < cost;
        btn.textContent = "EXPを消費してレベルアップ";
      }
    }
    document.getElementById("equipEnhanceBackBtn").addEventListener("click", () => {
      renderOwnedCardGrid();
      showScreen("formationScreen");
    });
    document.getElementById("equipEnhanceLevelUpBtn").addEventListener("click", () => {
      const def = getEquipDef(currentEquipEnhanceId);
      const info = def && playerState.equipOwned[def.id];
      if (!def || !info || info.level >= EQUIP_MAX_LEVEL) return;
      const cost = equipExpRequiredForLevel(def, info.level);
      if (playerState.exp < cost) return;
      playerState.exp -= cost;
      info.level += 1;
      updateResBar();
      renderEquipEnhance();
    });
    document.getElementById("equipEnhanceToggleBtn").addEventListener("click", () => {
      const err = toggleEquipped(currentEquipEnhanceId);
      if (err) { window.alert(err); return; }
      renderEquipEnhance();
    });
