    // ============================================================
    // サイコロシステム（トリックデッキ専用）
    // ============================================================
    const DICE_FACES = ["", "①", "②", "③", "④", "⑤", "⑥"];

    function canRollDice(owner) {
      return hasDiceEffect(owner) && !owner.diceUsedThisTurn && owner.diceUsesLeft > 0 && !game.gameOver;
    }

    function rollDicePlayer() {
      if (game.turn !== "player" || game.phase !== "main") return;
      if (!canRollDice(game.player)) return;
      doRollDice(game.player);
      render();
    }

    // サイコロを振って効果を発動する。
    // consumesUse: true なら使用可能回数を消費する通常の振り方、false なら「奇」による再発動（回数を消費しない）
    function doRollDice(owner, consumesUse = true) {
      const target = opponentOf(owner);
      let face;
      if (consumesUse) {
        owner.diceUsedThisTurn = true;
        owner.diceUsesLeft -= 1;
        face = 1 + Math.floor(Math.random() * 6);
        log(`${owner.label}はサイコロを振った！ → ${DICE_FACES[face]}の目（残り${owner.diceUsesLeft}回）`, "strong");
      } else {
        face = 1 + Math.floor(Math.random() * 6);
        log(`『奇』の再発動 → ${DICE_FACES[face]}の目！`, "strong");
      }

      if (face === 1) {
        owner.maxRandomThisTurn = true;
        log(`①の目：このターン、${owner.label}の乱数ダメージは全て最高値になる！`, "good");
      } else if (face === 2) {
        const drawn = drawCards(owner, 2);
        owner.hand.push(...drawn);
        log(`②の目：山札から${drawn.length}枚引いた。`, "good");
      } else if (face === 3) {
        owner.hp = Math.max(0, owner.hp - 640);
        log(`③の目：${owner.label}は640ダメージを受けた。`, "strong");
        checkWin();
      } else if (face === 4) {
        healHp(owner, 1000);
        log(`④の目：HPを1000回復した。`, "good");
      } else if (face === 5) {
        applyDamage(owner, target, 500, consumesUse ? "サイコロ⑤の目" : "サイコロ⑤の目（奇）", !consumesUse);
        checkWin();
      } else if (face === 6) {
        if (owner.hand.length) {
          owner.grave.push(...owner.hand);
          log(`⑥の目：${owner.label}の手札${owner.hand.length}枚が破棄された。`);
          owner.hand = [];
        }
        for (const s of [...owner.subs]) moveSubToGrave(owner, s, "サイコロ⑥の目で強制破棄");
      }
      renderDicePanel();
    }

    function renderDicePanel() {
      const owner = game.player;
      const isHidden = !hasDiceEffect(owner);
      els.dicePanel.classList.toggle("is-hidden", isHidden);
      if (isHidden) return;
      els.diceFace.textContent = "🎲";
      els.diceUses.textContent = `残り ${owner.diceUsesLeft}/${DICE_MAX_USES}`;
      const canRoll = canRollDice(owner) && game.turn === "player" && game.phase === "main";
      els.rollDiceBtn.disabled = !canRoll;
      els.rollDiceBtn.textContent = owner.diceUsedThisTurn ? "このターンは振り済み" : "サイコロを振る";
      if (owner.maxRandomThisTurn) {
        els.diceResult.textContent = "①の効果中：乱数ダメージ最高値固定";
      } else {
        els.diceResult.textContent = "";
      }
    }

    // エレメントエリアの表示更新（ゲージ・4アイコンの状態）
    function renderElementAreas() {
      if (!game) return;
      renderElementSide(game.ai, "aiElementCostText", "aiElementGaugeFill", "aiElementIcons", true);
      renderElementSide(game.player, "playerElementCostText", "playerElementGaugeFill", "playerElementIcons", false);
    }
    function renderElementSide(owner, costTextId, gaugeFillId, iconsContainerId, isAiSide) {
      const cost = owner.elementCost || 0;
      const costText = document.getElementById(costTextId);
      if (costText) costText.textContent = cost;
      const gaugeFill = document.getElementById(gaugeFillId);
      if (gaugeFill) {
        gaugeFill.style.width = `${Math.min(100, (cost / ELEMENT_COST_MAX) * 100)}%`;
        gaugeFill.classList.toggle("maxed", cost >= ELEMENT_COST_MAX);
      }
      const container = document.getElementById(iconsContainerId);
      if (!container) return;
      container.innerHTML = "";
      const usable = canUseElementSkill(owner) && !game.gameOver;
      const enhancedReady = cost >= ELEMENT_COST_MAX;
      const activeMap = {
        fire: isElementActive(owner, "fire"),
        water: isElementActive(owner, "water"),
        earth: isElementActive(owner, "earth"),
        wind: isElementActive(owner, "wind"),
      };
      Object.values(ELEMENT_DEFS).forEach(def => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = `element-icon el-${def.key}${usable ? " usable" : ""}${enhancedReady && usable ? " el-enhanced-ready" : ""}${activeMap[def.key] ? " el-active" : ""}`;
        btn.title = activeMap[def.key] ? `${def.label}（効果発動中は再発動できません）` : `${def.label}（コスト30〜／50で強化）`;
        btn.innerHTML = `<span class="element-icon-char">${def.icon}</span><span>${def.label}</span>`;
        const clickable = !isAiSide && usable && !activeMap[def.key] && game.turn === "player" && !game.gameOver;
        if (clickable) {
          btn.addEventListener("click", () => {
            if (game.gameOver) return;
            useElementSkill(owner, def.key);
            render();
          });
        } else {
          btn.disabled = true;
        }
        container.appendChild(btn);
      });
    }

    function ownerByKey(key) {
      return key === "player" ? game.player : game.ai;
    }

    function isSubPlacementLocked(owner) {
      const opponent = opponentOf(owner);
      return opponent.subs.some(card => card.id === "san") || !!owner._subBlockThisTurn
        || owner.subs.some(card => card.effect.kind === "selfDamageBlockSubs")
        || owner.subs.some(card => card.beacons && card.beacons.includes("corrode"));
    }

    function recycleIfNeeded(owner, needed = 1) {
      if (owner.deck.length >= needed) return;
      if (owner.grave.length === 0) return;
      owner.deck = shuffle(owner.grave.splice(0).map(card => ({ ...card, elapsed: 0 })));
      log(`${owner.label}の墓地を山札へ戻した。`);
      equipOnGraveReset(owner); // 装備品『開かずの封筒』
      if (!owner.isAI && game && game.stats) {
        maybeNotifyMissionProgressUpdate(() => {
          game.stats.graveResetCount = (game.stats.graveResetCount || 0) + 1; // ミッション用：墓地リセット回数
        });
      }
    }

    function drawCards(owner, count) {
      const cards = [];
      const limit = Math.min(count, MAX_HAND - owner.hand.length);
      for (let i = 0; i < limit; i++) {
        recycleIfNeeded(owner, 1);
        if (owner.deck.length === 0) break;
        const card = owner.deck.pop();
        maybeAssignBeaconOnDraw(owner, card);
        equipOnDraw(owner, card); // 装備品『天狗のお面』
        cards.push(card);
      }
      return cards;
    }

    function needsRefill(owner) {
      return owner.hand.length <= 1;
    }

    function openDraw(ownerKey, initial) {
      const owner = ownerByKey(ownerKey);
      pendingDrawOwner = ownerKey;
      const drawCount = initial ? 3 : equipHandRefillCount(owner);
      pendingCards = drawCards(owner, drawCount);
      els.drawModal.classList.add("active");
      els.drawTitle.textContent = initial ? "初期手札" : "手札補充";
      els.drawText.textContent = initial
        ? `山札から3枚を引きます。最初だけ${getInitialRedrawLimit()}回引き直せます。`
        : `手札が少ないため、山札から最大${drawCount}枚を補充します。`;
      els.redrawBtn.style.display = initial ? "" : "none";
      els.redrawBtn.disabled = game.initialRedrawCount >= getInitialRedrawLimit();
      els.acceptDrawBtn.textContent = initial ? "この3枚で開始" : "手札に加える";
      renderCandidates();
      render();
    }

    function renderCandidates() {
      els.candidateRow.innerHTML = "";
      if (pendingCards.length === 0) {
        els.candidateRow.innerHTML = `<div class="empty">引けるカードがありません</div>`;
        return;
      }
      pendingCards.forEach(card => els.candidateRow.appendChild(createCardEl(card, { draggable: false, battle: true })));
    }

    function acceptDraw() {
      const owner = ownerByKey(pendingDrawOwner);
      owner.hand.push(...pendingCards);
      log(`${owner.label}は${pendingCards.length}枚を手札に加えた。`);
      pendingCards = [];
      els.drawModal.classList.remove("active");
      game.phase = "main";
      game.waitingForPlayerDraw = false;
      pendingDrawOwner = null;
      render();
    }

    function redrawInitial() {
      if (game.initialRedrawCount >= getInitialRedrawLimit() || pendingDrawOwner !== "player") return;
      game.player.deck.push(...pendingCards);
      game.player.deck = shuffle(game.player.deck);
      equipEnsureStar3InInitialHand(game.player); // 装備品『古代の金貨』：引き直し後も☆3を含める
      pendingCards = drawCards(game.player, 3);
      game.initialRedrawCount += 1;
      log("初期手札を引き直した。");
      renderCandidates();
      render();
    }

    function drawForAIIfNeeded(initial = false) {
      if (!initial && !needsRefill(game.ai)) return;
      const cards = drawCards(game.ai, initial ? 3 : equipHandRefillCount(game.ai));
      game.ai.hand.push(...cards);
      if (cards.length > 0) log(`相手は${cards.length}枚を手札に加えた。`);
    }

    // カード名の漢字が枠（ビーコン付与時など）からはみ出す場合、自動でフォントサイズを縮小する
    function fitCardNameFont(nameEl) {
      if (!nameEl || !nameEl.isConnected) return;
      let fontSize = parseFloat(getComputedStyle(nameEl).fontSize) || 42;
      const minSize = 8;
      let guard = 0;
      while ((nameEl.scrollHeight > nameEl.clientHeight + 1 || nameEl.scrollWidth > nameEl.clientWidth + 1) && fontSize > minSize && guard < 40) {
        fontSize -= 1;
        nameEl.style.fontSize = `${fontSize}px`;
        guard++;
      }
    }

    function createCardEl(card, options = {}) {
      const el = document.createElement("div");
      const isMaxed = !!options.battle && getLimitBreak(card.id, !!options.isAi) >= LIMIT_BREAK_CAP;
      el.className = `card r${card.rarity} ${card.type}-card${options.small ? " small" : ""}${isMaxed ? " lb-maxed" : ""}`;
      el.dataset.cardId = card.instanceId;
      const beaconRow = (card.beacons && card.beacons.length > 0)
        ? `<div class="beacon-row">${card.beacons.map(id => {
            const def = BEACON_DEFS[id];
            return `<span class="beacon-icon ${def.type}" title="${def.label}：${def.desc}">${def.icon}</span>`;
          }).join("")}</div>`
        : "";
      el.innerHTML = `
        <div class="rarity">${"☆".repeat(card.rarity)}</div>
        <div class="card-name${card.name.length > 1 ? " multi-char" : ""}">${card.name}</div>
        <div class="type-label${card.duration >= 10 ? " long-duration" : ""}">${card.type === "main" ? "メイン" : "サブ"}${card.duration ? ` ${card.elapsed}/${card.duration}` : (card.maxTriggers ? ` ${card.elapsed || 0}/${card.maxTriggers}` : "")}</div>
        ${beaconRow}
      `;
      const nameEl = el.querySelector(".card-name");
      requestAnimationFrame(() => fitCardNameFont(nameEl));
      if (options.draggable) {
        el.draggable = true;
        el.addEventListener("dragstart", event => {
          if (game.turn !== "player" || game.phase !== "main" || game.gameOver) {
            event.preventDefault();
            return;
          }
          draggedCardId = card.instanceId;
          event.dataTransfer.setData("text/plain", card.instanceId);
        });
        el.addEventListener("dragend", () => {
          draggedCardId = null;
          clearDropHints();
        });
      }
      // シンセサイズ：合成カードは元の2枚の色を半分ずつ合わせたグラデーションにする
      if (card.synthSources && card.synthSources.length === 2) {
        const colorOf = c => {
          const map = c.type === "main" ? { 1: "var(--blue)", 2: "var(--purple)", 3: "var(--gold)" }
                                         : { 1: "var(--blue-soft)", 2: "var(--purple-soft)", 3: "var(--gold-soft)" };
          return map[c.rarity] || "var(--blue)";
        };
        const [c1, c2] = card.synthSources;
        el.style.background = `linear-gradient(135deg, ${colorOf(c1)} 0%, ${colorOf(c1)} 48%, ${colorOf(c2)} 52%, ${colorOf(c2)} 100%)`;
      }
      addTooltip(el, card);
      return el;
    }

    function addTooltip(el, card) {
      el.addEventListener("mouseenter", () => {
        if (draggedCardId) return; // ドラッグ中はツールチップを出さない
        tooltipTimer = window.setTimeout(() => showTooltip(el, card), 1000);
      });
      el.addEventListener("mouseleave", hideTooltip);
      el.addEventListener("mousemove", event => {
        if (draggedCardId) { hideTooltip(); return; } // ドラッグ中は非表示
        if (els.tooltip.style.display === "block") positionTooltip(event.clientX, event.clientY);
      });
    }

    function showTooltip(el, card) {
      const rect = el.getBoundingClientRect();
      if (card.isEquipment) {
        els.tooltip.innerHTML = equipTooltipHtml(card);
        els.tooltip.style.display = "block";
        positionTooltip(rect.right + 10, rect.top + 10);
        return;
      }
      const materialNote = card.material
        ? `<div style="margin-top:6px;padding-top:6px;border-top:1px dashed rgba(255,255,255,.35);"><b>「素材」として使用時：</b>${card.material.text}</div>`
        : "";
      const beaconNote = (card.beacons && card.beacons.length > 0)
        ? `<div style="margin-top:6px;padding-top:6px;border-top:1px dashed rgba(255,255,255,.35);"><b>付与中のビーコン：</b>${card.beacons.map(id => `<div style="margin-top:2px;">${BEACON_DEFS[id].icon} ${BEACON_DEFS[id].label}：${BEACON_DEFS[id].desc}</div>`).join("")}</div>`
        : "";
      els.tooltip.innerHTML = `<h3>『${card.name}』 ${"☆".repeat(card.rarity)}</h3><div>${card.type === "main" ? "メインカード" : "サブカード"}</div><div>${card.text}</div>${materialNote}${beaconNote}`;
      els.tooltip.style.display = "block";
      positionTooltip(rect.right + 10, rect.top + 10);
    }

    function positionTooltip(x, y) {
      const pad = 12;
      const width = 230;
      const left = Math.min(window.innerWidth - width - pad, Math.max(pad, x + 12));
      const top = Math.min(window.innerHeight - 130, Math.max(pad, y + 12));
      els.tooltip.style.left = `${left}px`;
      els.tooltip.style.top = `${top}px`;
    }

    function hideTooltip() {
      window.clearTimeout(tooltipTimer);
      els.tooltip.style.display = "none";
    }

    // ---- HP回復（ダメージと同様、実際に回復した量をフロート表示する） ----
    function healHp(target, amount) {
      if (!Number.isFinite(amount) || amount <= 0) return 0;
      const before = target.hp;
      target.hp = Math.min(getMaxHP(target), target.hp + amount);
      const healed = target.hp - before;
      if (healed > 0) {
        queueHealPopup(target, healed);
        equipOnHeal(target, healed); // 装備品『怪しい蒸留器』
      }
      return healed;
    }

    function queueHealPopup(target, amount) {
      if (!Number.isFinite(amount) || amount <= 0) return;
      const key = target === game.player ? "player" : "ai";
      const state = damagePopupState[key];
      state.heal += amount;
      if (!state.scheduled) {
        state.scheduled = true;
        window.setTimeout(() => flushDamagePopup(key), 0);
      }
    }

    // ---- ダメージ数値のフロート表示 ----
    // メインカードとサブカードによるダメージは分けて集計し、同時ではなく少しずらして表示する
    function queueDamagePopup(target, amount, isMain) {
      if (!Number.isFinite(amount) || amount <= 0) return;
      const key = target === game.player ? "player" : "ai";
      const state = damagePopupState[key];
      if (isMain) state.main += amount;
      else state.sub += amount;
      if (!state.scheduled) {
        state.scheduled = true;
        window.setTimeout(() => flushDamagePopup(key), 0);
      }
    }

    // ---- 状態異常ダメージのフロート表示 ----
    // 猛毒・悪寒・出血・炎上・アルカナ・月照は、メイン/サブとは別枠でそれぞれ独立して表示する
    const AILMENT_POPUP_INFO = {
      toxin:     { icon: "🍄" },
      chill:     { icon: "❄️" },
      shukketsu: { icon: "🩸" },
      enjou:     { icon: "❤️‍🔥" },
      arcana:    { icon: "🔮" },
      moonlit:   { icon: "🌙" },
      sekiju:    { icon: "🔴" },
    };
    function queueAilmentPopup(target, amount, key) {
      if (!Number.isFinite(amount) || amount <= 0 || !AILMENT_POPUP_INFO[key]) return;
      const popupKey = target === game.player ? "player" : "ai";
      const state = damagePopupState[popupKey];
      state.ailments[key] = (state.ailments[key] || 0) + amount;
      if (!state.scheduled) {
        state.scheduled = true;
        window.setTimeout(() => flushDamagePopup(popupKey), 0);
      }
    }

    function flushDamagePopup(key) {
      const state = damagePopupState[key];
      const mainTotal = state.main;
      const subTotal = state.sub;
      const healTotal = state.heal;
      const ailments = state.ailments;
      state.main = 0;
      state.sub = 0;
      state.heal = 0;
      state.ailments = {};
      state.scheduled = false;
      const box = key === "player" ? els.playerStatusBox : els.aiStatusBox;
      if (!box) return;
      let delay = 0;
      if (mainTotal > 0) { spawnDamageFloat(box, mainTotal, false, delay); delay += 380; }
      if (subTotal > 0) { spawnDamageFloat(box, subTotal, true, delay); delay += 380; }
      // 状態異常は種類ごとに独立表示。メイン→サブの間隔より短く、連続して出す
      let ailmentRow = 0;
      for (const ailmentKey of Object.keys(AILMENT_POPUP_INFO)) {
        const amount = ailments[ailmentKey];
        if (!amount) continue;
        spawnAilmentFloat(box, amount, AILMENT_POPUP_INFO[ailmentKey].icon, ailmentRow, delay);
        delay += 150;
        ailmentRow += 1;
      }
      if (healTotal > 0) spawnHealFloat(box, healTotal, delay);
    }

    function spawnAilmentFloat(box, amount, icon, rowIndex, delay) {
      window.setTimeout(() => {
        const el = document.createElement("div");
        el.className = "dmg-float ailment";
        el.style.top = `${46 + rowIndex * 15}px`;
        el.textContent = `${icon}-${Math.round(amount).toLocaleString()}`;
        box.appendChild(el);
        window.setTimeout(() => el.remove(), 1150);
      }, delay);
    }

    function spawnHealFloat(box, amount, delay) {
      window.setTimeout(() => {
        const el = document.createElement("div");
        el.className = "dmg-float heal";
        el.textContent = `+${Math.round(amount).toLocaleString()}`;
        box.appendChild(el);
        window.setTimeout(() => el.remove(), 1150);
      }, delay);
    }

    function spawnDamageFloat(box, amount, isSub, delay) {
      window.setTimeout(() => {
        const el = document.createElement("div");
        el.className = "dmg-float" + (isSub ? " sub" : "");
        el.textContent = `-${Math.round(amount).toLocaleString()}`;
        box.appendChild(el);
        window.setTimeout(() => el.remove(), 1150);
      }, delay);
    }

    function setupDrop(zone, type) {
      zone.addEventListener("dragover", event => {
        const card = game.player.hand.find(item => item.instanceId === draggedCardId);
        if (!card || card.type !== type || game.turn !== "player" || game.phase !== "main") return;
        if (isPlayBlockedByRefuseBeacon(game.player, card)) return;
        event.preventDefault();
        zone.classList.add("drop-ok");
      });
      zone.addEventListener("dragleave", () => zone.classList.remove("drop-ok"));
      zone.addEventListener("drop", event => {
        event.preventDefault();
        zone.classList.remove("drop-ok");
        const cardId = event.dataTransfer.getData("text/plain");
        playPlayerCard(cardId, type);
      });
    }

    function setupSynthDrop(zone, kind) {
      zone.addEventListener("dragover", event => {
        const card = game.player.hand.find(item => item.instanceId === draggedCardId);
        if (!card || game.turn !== "player" || game.phase !== "main") return;
        if (kind === "main" && (card.type !== "main" || card.synthSources)) return;
        if (kind === "material" && card.type !== "sub") return;
        event.preventDefault();
        zone.classList.add("drop-ok");
      });
      zone.addEventListener("dragleave", () => zone.classList.remove("drop-ok"));
      zone.addEventListener("drop", event => {
        event.preventDefault();
        zone.classList.remove("drop-ok");
        const cardId = event.dataTransfer.getData("text/plain");
        if (kind === "main") placeSynthMainFromHand(cardId);
        else placeSynthMaterialFromHand(cardId);
      });
    }

    function clearDropHints() {
      els.playerMainDrop.classList.remove("drop-ok");
      els.playerSubDrop.classList.remove("drop-ok");
      els.playerSynthMains.classList.remove("drop-ok");
      els.playerSynthMaterial.classList.remove("drop-ok");
      document.getElementById("playerGrave").classList.remove("drop-ok");
    }

    function setupGraveDrop() {
      const graveZone = document.getElementById("playerGrave");
      graveZone.addEventListener("dragover", event => {
        if (!draggedCardId) return;
        if (game.turn !== "player" || game.phase !== "main" || game.gameOver) return;
        if (game.discardedThisTurnCount >= getDiscardLimit(game.player)) return;
        const card = game.player.hand.find(c => c.instanceId === draggedCardId);
        if (!card || card.noDirectDiscard) return;
        event.preventDefault();
        graveZone.classList.add("drop-ok");
      });
      graveZone.addEventListener("dragleave", () => graveZone.classList.remove("drop-ok"));
      graveZone.addEventListener("drop", event => {
        event.preventDefault();
        graveZone.classList.remove("drop-ok");
        if (game.turn !== "player" || game.phase !== "main" || game.gameOver) return;
        const limit = getDiscardLimit(game.player);
        if (game.discardedThisTurnCount >= limit) {
          log(`このターンはすでに捨て札の上限（${limit}枚）に達しています。`, "");
          return;
        }
        const cardId = event.dataTransfer.getData("text/plain");
        const card = game.player.hand.find(c => c.instanceId === cardId);
        if (!card) return;
        if (card.noDirectDiscard) {
          log(`『${card.name}』は直接墓地に送ることができない。`, "");
          return;
        }
        const removed = removeFromHand(game.player, cardId);
        if (!removed) return;
        game.player.grave.push(removed);
        game.discardedThisTurnCount += 1;
        log(`自分は『${removed.name}』を墓地に捨てた。（今ターンの捨て札：${game.discardedThisTurnCount}/${limit}）`);
        triggerDiscardTrigger(game.player);
        render();
      });
    }

    // 狂(discardTrigger)：直接墓地に捨てた時に発動
    function triggerDiscardTrigger(owner) {
      const kyo = owner.subs.find(c => c.effect.kind === "discardTrigger");
      if (!kyo) return;
      const target = opponentOf(owner);
      kyo.elapsed = (kyo.elapsed || 0) + 1;
      log(`『狂』発動（${kyo.elapsed}/${kyo.maxTriggers}）！`, "strong");
      // 凸：『狂』2凸 - 与えるダメージが[850→1150]となる
      const kyoDmg = (kyo.id === "kyo3" && getLimitBreak("kyo3", owner.isAI) >= 2) ? 1150 : kyo.effect.value;
      applyDamage(owner, target, kyoDmg, `『狂』の効果`, true);
      // 凸：『狂』4凸 - 破棄される度にHPを670回復する
      if (kyo.id === "kyo3" && getLimitBreak("kyo3", owner.isAI) >= 4) {
        healHp(owner, 670);
        log(`『狂』の凸効果：${owner.label}のHPを670回復した。`, "good");
      }
      if (kyo.elapsed >= kyo.maxTriggers) moveSubToGrave(owner, kyo, "3回発動し破棄");
    }

    function removeFromHand(owner, cardId) {
      const index = owner.hand.findIndex(card => card.instanceId === cardId);
      if (index < 0) return null;
      return owner.hand.splice(index, 1)[0];
    }

    function playPlayerCard(cardId, fieldType) {
      if (game.turn !== "player" || game.phase !== "main" || game.gameOver) return;
      const card = game.player.hand.find(item => item.instanceId === cardId);
      if (!card || card.type !== fieldType) return;
      if (isPlayBlockedByRefuseBeacon(game.player, card)) {
        log("手札にある「拒否」ビーコン付きのカードにより、他のカードをフィールドに出せない。", "strong");
        render();
        return;
      }
      if (fieldType === "sub") {
        if (isSubPlacementLocked(game.player)) {
          log("カードの効果でサブカードを置けない。", "strong");
          render();
          return;
        }
        if (game.player.subs.length >= getSubLimit(game.player)) {
          replacingSubCardId = cardId;
          els.playerSubDrop.classList.add("sub-replace");
          els.actionHint.textContent = "サブフィールドが満杯です。破棄するサブカードをクリックしてください。";
          render();
          return;
        }
        placeSub(game.player, removeFromHand(game.player, cardId));
        render();
        return;
      }
      const played = removeFromHand(game.player, cardId);
      playMain(game.player, played);
      render();
      if (!game.gameOver) setTimeout(endPlayerTurn, 700);
    }

    function placeSub(owner, card) {
      if (!card) return;
      card.elapsed = 0;

      // 蝕：フィールドに置いた瞬間に相手へ毒を召喚して自分は墓地へ
      if (card.effect.kind === "summonPoison") {
        const target = opponentOf(owner);
        if (target.subs.length < getSubLimit(target)) {
        } else {
          log(`${owner.label}の『蝕』：${opponentOf(owner).label}のサブが満杯で毒を召喚できなかった。`);
        }
        owner.grave.push(card); // 蝕自体は墓地へ
        log(`『蝕』は墓地へ送られた。`);
        return;
      }

      owner.subs.push(card);
      equipOnSubPlace(owner); // 装備品『花束の贈り物』
      // 状態異常「月照」🌙：ビーコンの付いたカードを出す度に層+1
      checkMoonlitOnCardPlay(owner, card);
      if (!owner.isAI && game && game.stats) {
        maybeNotifyMissionProgressUpdate(() => {
          game.stats.subUsedCount = (game.stats.subUsedCount || 0) + 1; // ミッション用：サブカード使用回数
          if (owner.subs.length >= getSubLimit(owner)) {
            game.stats.subFieldFull = true; // ミッション用：サブフィールドを全て埋めたか
          }
        });
      }
      log(`${owner.label}は『${card.name}』をサブフィールドに出した。`);
      owner._activeBoostMultiplier = (card.beacons && card.beacons.includes("boost")) ? 2 : 1;
      // 凸：フィールドに出した時の効果（ダメージ・回復）
      owner._activeDamageCard = card;
      triggerLimitBreakOnField(owner, card);
      // エレメント：フィールドに出した時、レアリティに応じてコストを獲得
      gainElementCost(owner, card);
      // 凸：『護』1凸 - フィールドに出した時、山札からカードを1枚引く
      if (card.id === "go" && getLimitBreak("go", owner.isAI) >= 1) {
        const drawn = drawCards(owner, Math.min(1, MAX_HAND - owner.hand.length));
        if (drawn.length > 0) {
          owner.hand.push(...drawn);
          log(`『${card.name}』の凸効果：${owner.label}は山札から${drawn.length}枚引いた。`, "good");
        }
      }
      // 凸：『全』1凸 - 設置時に山札からカードを2枚引く
      if (card.id === "zen" && getLimitBreak("zen", owner.isAI) >= 1) {
        const drawn = drawCards(owner, Math.min(2, MAX_HAND - owner.hand.length));
        if (drawn.length > 0) {
          owner.hand.push(...drawn);
          log(`『${card.name}』の凸効果：${owner.label}は山札から${drawn.length}枚引いた。`, "good");
        }
      }
      // 凸：『鉱』4凸 - 設置時にコインを50枚獲得する
      if (card.id === "kou3" && getLimitBreak("kou3", owner.isAI) >= 4) {
        gainCoins(owner, 50);
        log(`『${card.name}』の凸効果：${owner.label}はコインを50枚獲得した。`, "good");
      }
      // 凸：『鯨』2凸 - 設置時に自身のHPを1500回復する
      if (card.id === "kujira" && getLimitBreak("kujira", owner.isAI) >= 2) {
        healHp(owner, 1500);
        log(`『${card.name}』の凸効果：${owner.label}のHPが1500回復した。`, "good");
      }
      // 凸：『真』2凸 - 設置した時、山札からカードを3枚引く
      if (card.id === "shin2" && getLimitBreak("shin2", owner.isAI) >= 2) {
        const drawn = drawCards(owner, Math.min(3, MAX_HAND - owner.hand.length));
        if (drawn.length > 0) {
          owner.hand.push(...drawn);
          log(`『${card.name}』の凸効果：${owner.label}は山札から${drawn.length}枚引いた。`, "good");
        }
      }
      // 凸：『全』2凸 - 設置時に墓地にある☆3カードを山札へ戻す
      if (card.id === "zen" && getLimitBreak("zen", owner.isAI) >= 2) {
        const targets = owner.grave.filter(c => c.rarity === 3);
        if (targets.length > 0) {
          owner.grave = owner.grave.filter(c => c.rarity !== 3);
          owner.deck = shuffle([...owner.deck, ...targets]);
          log(`『${card.name}』の凸効果：墓地の☆3カード${targets.length}枚を山札へ戻した。`, "good");
        }
      }
      applySubPlacementBeacons(owner, card);
      if (card.beacons && card.beacons.includes("reload")) {
        log(`ビーコン「リロード」🔁：『${card.name}』の効果が再び発動する！`, "good");
        applySubPlacementBeacons(owner, card);
      }

      // 照：サブフィールドに出した時、自身に「月照」を1層付与する
      if (card.effect.kind === "teruDraw") {
        applyStatus(owner, "moonlit", 1);
      }
      // 刃：召喚時点の自軍墓地枚数を基準値として記録
      if (card.effect.kind === "haBlade") {
        card.lastGraveCount = owner.grave.length;
      }
      // 凸：『億』1凸 - サブフィールドに出した時、相手に1000ダメージを与える
      if (card.id === "oku" && getLimitBreak("oku", owner.isAI) >= 1) {
        applyDamage(owner, opponentOf(owner), 1000, `『${card.name}』の凸効果`, false, true);
      }
      // 夢：サブフィールドに出した時、HPを回復する
      if (card.effect.kind === "healOnPlaceSelfDamageOnDiscard") {
        healHp(owner, card.effect.heal);
        log(`『${card.name}』：${owner.label}のHPを${card.effect.heal}回復した。`, "good");
      }
      // 超：サブフィールドに出した時、手札のトラブルビーコンを全て排除する
      if (card.effect.kind === "turnDamagePurgeOnPlace") {
        let purged = 0;
        for (const c of owner.hand) {
          if (!c.beacons) continue;
          const before = c.beacons.length;
          c.beacons = c.beacons.filter(b => BEACON_DEFS[b].type !== "trouble");
          purged += before - c.beacons.length;
        }
        log(`『${card.name}』：手札のトラブルビーコンを${purged}個排除した。`, "good");
      }
      // 状態異常：特定のサブカードは設置時に状態異常を付与する
      if (card.id === "san") {
        // 酸：また、相手に「脆弱」を1層付与する
        applyStatus(opponentOf(owner), "fragile", 1);
      } else if (card.id === "hono") {
        // 炎：また、相手に「火傷」を1層付与する
        applyStatus(opponentOf(owner), "burn", 1);
      } else if (card.id === "kouri") {
        // 氷：また、相手に「悪寒」を1層付与する
        applyStatus(opponentOf(owner), "chill", 1);
      } else if (card.id === "kin2") {
        // 菌：また、相手に「猛毒」を1層付与する
        applyStatus(opponentOf(owner), "toxin", 1);
      } else if (card.id === "kan3") {
        // 寒：召喚（設置）された時、自身（＝この「寒」の持ち主）に「悪寒」を1層付与する
        applyStatus(owner, "chill", 1);
      }
      owner._activeBoostMultiplier = 1;
      owner._activeDamageCard = null;
    }

    // サブカード設置時のビーコン効果（衝撃・治療・火傷・汚染・ギフト）
    function applySubPlacementBeacons(owner, card) {
      if (!card.beacons || card.beacons.length === 0) return;
      if (hasBlankBeaconKind(card, "sub")) return; // 白紙：このカードの効果は発動しない
      const target = opponentOf(owner);
      for (const b of card.beacons) {
        if (b === "shock1") {
          applyDamage(owner, target, 250, `『${card.name}』のビーコン「衝撃Ⅰ」🦾`);
        } else if (b === "shock2") {
          applyDamage(owner, target, 500, `『${card.name}』のビーコン「衝撃Ⅱ」🗡️`);
        } else if (b === "cure1") {
          healHp(owner, 300);
          log(`ビーコン「治療Ⅰ」💕：${owner.label}のHPを300回復した。`, "good");
        } else if (b === "cure2") {
          healHp(owner, 600);
          log(`ビーコン「治療Ⅱ」💗：${owner.label}のHPを600回復した。`, "good");
        } else if (b === "burn1") {
          owner.hp = Math.max(0, owner.hp - 300);
          log(`ビーコン「火傷Ⅰ」🔥：${owner.label}が300ダメージを受けた。`, "strong");
          checkWin();
        } else if (b === "burn2") {
          owner.hp = Math.max(0, owner.hp - 600);
          log(`ビーコン「火傷Ⅱ」❤️‍🔥：${owner.label}が600ダメージを受けた。`, "strong");
          checkWin();
        } else if (b === "pollutionSub") {
          applyPollutionBeacon(owner);
        } else if (b === "gift") {
          applyGiftBeacon(owner);
        } else if (b === "costDrain") {
          const stolen = Math.min(5, target.elementCost || 0);
          if (stolen > 0) {
            target.elementCost = Math.max(0, (target.elementCost || 0) - stolen);
            owner.elementCost = Math.min(ELEMENT_COST_MAX, (owner.elementCost || 0) + stolen);
            log(`ビーコン「コストドレイン」✨：${target.label}からコストを${stolen}奪い、${owner.label}が獲得した。`, "good");
          } else {
            log(`ビーコン「コストドレイン」✨：${target.label}のコストが無く、奪えなかった。`);
          }
        }
      }
    }

    // ============================================================
    // シンセサイズデッキ：合成スペースのロジック
    // ============================================================
    function hasSynthSpace(owner) {
      return !!getDeckEffect(owner).hasSynthSpace;
    }

    // ============================================================
    // コインデッキ：コインスペースのロジック
    // ============================================================
    function hasCoinSpace(owner) {
      return !!getDeckEffect(owner).hasCoinSpace;
    }

    function gainCoins(owner, amount) {
      if (amount <= 0) return;
      owner.coins = (owner.coins || 0) + Math.floor(amount);
    }

    function coinLevelIndex(owner) {
      return (owner.coinLevel || 1) - 1; // 0-3
    }

    function coinGaugeNextThreshold(owner) {
      const idx = coinLevelIndex(owner);
      return idx < COIN_LEVEL_THRESHOLDS.length - 1 ? COIN_LEVEL_THRESHOLDS[idx + 1] : null;
    }

    function clickCoinGauge(owner) {
      const next = coinGaugeNextThreshold(owner);
      if (next === null) {
        log(`${owner.label}のコインレベルは既に最大です。`);
        return;
      }
      if (owner.coins < 4) {
        log(`${owner.label}はコインが足りずゲージを上げられなかった。`);
        return;
      }
      owner.coins -= 4;
      owner.coinGaugeTotal += 4;
      if (owner.coinGaugeTotal >= next) {
        owner.coinLevel += 1;
        log(`${owner.label}のコインレベルがLv.${owner.coinLevel}に上がった！`, "strong");
      }
    }

    function useCoinHeal(owner) {
      if (owner.coinGreenUsedThisTurn) {
        log(`${owner.label}は今ターン既に回復／強化を使用済み。`);
        return;
      }
      if (owner.coins < 50) {
        log(`${owner.label}はコインが足りず回復できなかった。`);
        return;
      }
      owner.coins -= 50;
      owner.coinGreenUsedThisTurn = true;
      const heal = COIN_HEAL_VALUES[coinLevelIndex(owner)];
      healHp(owner, heal);
      log(`${owner.label}はコインを消費してHPを${heal}回復した。`, "good");
    }

    function useCoinBuff(owner) {
      if (owner.coinGreenUsedThisTurn) {
        log(`${owner.label}は今ターン既に回復／強化を使用済み。`);
        return;
      }
      if (owner.coins < 100) {
        log(`${owner.label}はコインが足りず強化できなかった。`);
        return;
      }
      owner.coins -= 100;
      owner.coinGreenUsedThisTurn = true;
      owner._coinBuffMultiplier = COIN_BUFF_MULTIPLIERS[coinLevelIndex(owner)];
      log(`${owner.label}はコインを消費して今ターンのメインダメージを${owner._coinBuffMultiplier}倍に強化した！`, "strong");
    }

    function rollCoinShopCard(owner) {
      const idx = coinLevelIndex(owner);
      const roll = Math.random() * 100;
      let acc = 0;
      let chosenRarity = 1;
      for (const r of [1, 2, 3]) {
        acc += COIN_SHOP_RARITY_INFO[r].chance[idx];
        if (roll < acc) { chosenRarity = r; break; }
      }
      const ownIds = new Set((DECKS.find(d => d.id === "coin")?.cards) || []);
      const pool = CARD_LIBRARY.filter(c => c.rarity === chosenRarity && !c.synthOnly && !ownIds.has(c.id));
      if (pool.length === 0) return null;
      const base = pool[Math.floor(Math.random() * pool.length)];
      const info = COIN_SHOP_RARITY_INFO[chosenRarity];
      const price = info.priceMin + Math.floor(Math.random() * (info.priceMax - info.priceMin + 1));
      return { cardId: base.id, price };
    }

    function refreshCoinShopSlot(owner, index) {
      owner.coinShop[index] = rollCoinShopCard(owner);
    }

    function ensureCoinShopFilled(owner) {
      if (!hasCoinSpace(owner)) return;
      for (let i = 0; i < 3; i++) {
        if (!owner.coinShop[i]) refreshCoinShopSlot(owner, i);
      }
    }

    function buyCoinShopCard(owner, index) {
      const offer = owner.coinShop[index];
      if (!offer) return;
      if (owner.coins < offer.price) {
        log(`${owner.label}はコインが足りず購入できなかった。`);
        return;
      }
      const base = CARD_LIBRARY.find(c => c.id === offer.cardId);
      if (!base) return;
      owner.coins -= offer.price;
      const bought = cloneCard(base);
      owner.deck.push(bought);
      owner.deck = shuffle(owner.deck);
      owner.deckManifest.push(cloneCard(base));
      log(`${owner.label}は『${base.name}』を${offer.price}コインで購入した。山札へ追加した。`, "good");
      refreshCoinShopSlot(owner, index);
    }

    function rerollCoinShop(owner) {
      if (owner.coinRerollsThisTurn >= 3) {
        log(`${owner.label}は今ターンの更新回数上限に達している。`);
        return;
      }
      if (owner.coins < 2) {
        log(`${owner.label}はコインが足りず更新できなかった。`);
        return;
      }
      owner.coins -= 2;
      owner.coinRerollsThisTurn += 1;
      for (let i = 0; i < 3; i++) refreshCoinShopSlot(owner, i);
      log(`${owner.label}はコインショップを更新した。`);
    }

    function placeSynthMainFromHand(cardId) {
      if (game.turn !== "player" || game.phase !== "main" || game.gameOver) return;
      const card = game.player.hand.find(item => item.instanceId === cardId);
      if (!card || card.type !== "main" || card.synthSources) return;
      if (game.player.synth.mains.length >= 2) {
        log("合成スペースのメイン枠は満杯です。", "strong");
        render();
        return;
      }
      removeFromHand(game.player, cardId);
      game.player.synth.mains.push(card);
      log(`自分は『${card.name}』を合成スペースに置いた。`);
      if (game.player.synth.mains.length === 2) {
        resolveSynthesis(game.player);
      }
      render();
    }

    function placeSynthMaterialFromHand(cardId) {
      if (game.turn !== "player" || game.phase !== "main" || game.gameOver) return;
      const card = game.player.hand.find(item => item.instanceId === cardId);
      if (!card || card.type !== "sub") return;
      if (game.player.synth.material) {
        log("合成スペースの素材枠は既に埋まっています。", "strong");
        render();
        return;
      }
      removeFromHand(game.player, cardId);
      game.player.synth.material = card;
      log(`自分は『${card.name}』を合成スペースの素材にセットした。`);
      render();
    }

    // メイン2枚が揃った時点で自動的に合成する
    function resolveSynthesis(owner) {
      const [a, b] = owner.synth.mains;
      const name = a.name + b.name;
      const text = `${a.text}＋${b.text}`;
      const combined = {
        instanceId: `synth-${uid++}`,
        id: `synth_${a.id}_${b.id}`,
        name, type: "main", rarity: 0,
        text,
        effect: { kind: "synthCombo", parts: [a.effect, b.effect] },
        synthSources: [a, b],
        elapsed: 0,
      };
      log(`合成スペースで『${a.name}』と『${b.name}』が合成され『${combined.name}』になった！`, "strong");
      // 素材の付与（牙・爪・鉄・改・溶などが持つ material 効果を引き継ぐ）
      const material = owner.synth.material;
      if (material && material.material) {
        const doubleMaterial = [a, b].some(c => c.synthTag === "doubleMaterial");
        combined.materialEffect = material.material.effect;
        combined.materialText = material.material.text;
        combined.materialRepeat = doubleMaterial ? 2 : 1;
        combined.text += `＋${material.material.text}`;
        combined.synthMaterialSource = material;
        log(`素材『${material.name}』の効果を引き継いだ${doubleMaterial ? "（『釘』により2回発動）" : ""}。`, "good");
      }
      // 真(synthTriggerDamage)：合成する度に相手にダメージ
      const shinCard = owner.subs.find(s => s.effect.kind === "synthTriggerDamage");
      if (shinCard) {
        shinCard.elapsed = (shinCard.elapsed || 0) + 1;
        const target = opponentOf(owner);
        const hit = applyDamage(owner, target, shinCard.effect.value, `『真』`, false, false);
        if (hit) applyMirrorOnce(owner, target, shinCard.effect.value);
        log(`『真』発動（${shinCard.elapsed}/${shinCard.maxTriggers}）！`, "strong");
        // 凸：『真』1凸 - 合成して出来たカードにノーマルビーコンを1つ付与する
        if (shinCard.id === "shin2" && getLimitBreak("shin2", owner.isAI) >= 1) {
          if (grantNormalBeacon(combined)) log(`『真』の凸効果：『${combined.name}』にノーマルビーコンを付与した。`, "good");
        }
        if (shinCard.elapsed >= shinCard.maxTriggers) moveSubToGrave(owner, shinCard, "4回発動し破棄");
      }
      owner.synth.mains = [];
      owner.synth.material = null;
      if (owner.hand.length < MAX_HAND) {
        owner.hand.push(combined);
        log(`『${combined.name}』が完成し、手札に加わった。`, "strong");
      } else {
        owner.grave.push(combined);
        log(`『${combined.name}』が完成したが、手札が満杯のため直ちに墓地へ送られた。`, "strong");
      }
    }

    // 合成カードを分解する。toHand=true なら『解』の効果で手札に戻す（溢れた分は墓地へ）、
    // false なら使用後の自動分解で墓地へ直接送る。
    function decomposeSynthCard(owner, card, toHand) {
      const sources = card.synthSources || [];
      const pieces = [...sources];
      if (card.synthMaterialSource) pieces.push(card.synthMaterialSource);
      if (toHand) {
        const idx = owner.hand.findIndex(c => c.instanceId === card.instanceId);
        if (idx >= 0) owner.hand.splice(idx, 1);
        let toGrave = 0;
        for (const piece of pieces) {
          if (owner.hand.length < MAX_HAND) {
            owner.hand.push(piece);
          } else {
            owner.grave.push(piece);
            toGrave++;
          }
        }
        log(`『解』：『${card.name}』を分解し、${pieces.map(p => p.name).join("・")}に戻した${toGrave > 0 ? `（手札が満杯のため${toGrave}枚は墓地へ）` : ""}。`, "good");
      } else {
        owner.grave.push(...pieces);
        log(`『${card.name}』は使用後に分解され、${pieces.map(p => p.name).join("・")}が墓地へ送られた。`);
      }
    }


    function replaceSubAt(index) {
      if (!replacingSubCardId || game.player.subs[index] == null) return;
      const discarded = game.player.subs.splice(index, 1)[0];
      if (!discarded.noGrave) game.player.grave.push(discarded);
      log(`自分は『${discarded.name}』を${discarded.noGrave ? "消滅" : "破棄"}した。`);
      // 卵バースト
      if (discarded.effect.kind === "eggBurst") {
        const need = MAX_HAND - game.player.hand.length;
        if (need > 0) {
          const drawn = drawCards(game.player, need);
          game.player.hand.push(...drawn);
          log(`『卵』が孵化！${drawn.length}枚ドロー。`, "good");
        }
      }
      // 兆：入れ替えによる早期破棄
      if (discarded.effect.kind === "timeBomb") {
        applyDamage(game.player, opponentOf(game.player), 2700, `『兆』早期破棄`, false, true);
      }
      const card = removeFromHand(game.player, replacingSubCardId);
      replacingSubCardId = null;
      els.playerSubDrop.classList.remove("sub-replace");
      placeSub(game.player, card);
      render();
    }

    // 変：サブフィールドの「変」を、これから出されるメインカードに変身させ、そのまま墓地へ送る。
    function transformHenCard(owner, henCard, targetCard) {
      const idx = owner.subs.findIndex(s => s.instanceId === henCard.instanceId);
      if (idx < 0) return;
      owner.subs.splice(idx, 1);
      const targetBase = CARD_LIBRARY.find(c => c.id === targetCard.id) || targetCard;
      const patch = {
        name: targetBase.name, type: targetBase.type, rarity: targetBase.rarity,
        text: targetBase.text, effect: targetBase.effect, duration: targetBase.duration,
        maxTriggers: targetBase.maxTriggers,
      };
      const transformed = { ...henCard, ...patch, elapsed: 0, beacons: [] };
      owner.grave.push(transformed);
      log(`『変』は『${targetBase.name}』に変身し、そのまま墓地へ送られた！以後『変』は『${targetBase.name}』として扱われる。`, "strong");
    }

    function playMain(owner, card) {
      // 変(transformIntoNextMain)：サブにあれば、これから出すメインカードに変身して墓地へ
      const henCard = owner.subs.find(s => s.effect.kind === "transformIntoNextMain");
      if (henCard) transformHenCard(owner, henCard, card);

      owner.main = card;
      // 状態異常「月照」🌙：ビーコンの付いたカードを出す度に層+1
      checkMoonlitOnCardPlay(owner, card);
      // スタック履歴に追加（最大3枚）。ビーコンは表示用にこの時点でスナップショットしておく
      // （墓地へ送られる際にビーコンが剝がれても、フィールド上の履歴表示には影響しないように）
      owner.lastMains.push({ ...card, beacons: [...(card.beacons || [])] });
      if (owner.lastMains.length > 3) owner.lastMains.shift();
      game.phase = owner.isAI ? "ai-action" : "resolving";
      log(`${owner.label}は『${card.name}』をメインフィールドに出した。`, "strong");
      render();

      // 凸：フィールドに出した時の効果（ダメージ・回復）
      owner._activeDamageCard = card;
      triggerLimitBreakOnField(owner, card);
      // エレメント：フィールドに出した時、レアリティに応じてコストを獲得
      gainElementCost(owner, card);
      // 凸：『千』1凸 - フィールドに出した時、自身のHPを1000回復する
      if (card.id === "sen" && getLimitBreak("sen", owner.isAI) >= 1) {
        healHp(owner, 1000);
        log(`『${card.name}』の凸効果：${owner.label}のHPを1000回復した。`, "good");
      }
      // 凸：『千』2凸 - このカードには常にノーマルビーコンが2つ付与される
      if (card.id === "sen" && getLimitBreak("sen", owner.isAI) >= 2) {
        while (card.beacons.length < 2) {
          if (!grantNormalBeacon(card)) break;
        }
        // スタック履歴のスナップショットにも反映（そうしないと墓地へ送られた後の表示にビーコンが出ない）
        if (owner.lastMains.length > 0) {
          owner.lastMains[owner.lastMains.length - 1].beacons = [...card.beacons];
        }
        render();
      }
      // 凸：『姫』1凸 - 王が手札・サブにない場合、山札か墓地から即座に王を引く
      if (card.id === "hime" && getLimitBreak("hime", owner.isAI) >= 1 && kingNotInHandOrSub(owner)) {
        const found = fetchKingTo(owner, "hand");
        if (!found) log(`『姫』の凸効果：王は山札・墓地のどこにも見つからなかった。`);
      }
      // 凸：『姫』4凸 - このカードには常にノーマルビーコンが1つ付与される
      if (card.id === "hime" && getLimitBreak("hime", owner.isAI) >= 4) {
        if (card.beacons.length < 1) grantNormalBeacon(card);
        if (owner.lastMains.length > 0) {
          owner.lastMains[owner.lastMains.length - 1].beacons = [...card.beacons];
        }
        render();
      }
      // 凸：『真』4凸 - 合成したカードをフィールドに出した時、残り発動可能回数が3回以下ならこのカードを即座に破棄し、2340ダメージを与える
      if (card.synthSources) {
        const shinCard = owner.subs.find(s => s.id === "shin2");
        if (shinCard && getLimitBreak("shin2", owner.isAI) >= 4) {
          const remaining = (shinCard.maxTriggers || 0) - (shinCard.elapsed || 0);
          if (remaining <= 3) {
            const dmgTarget = opponentOf(owner);
            moveSubToGrave(owner, shinCard, "凸効果により即座に破棄");
            const hit = applyDamage(owner, dmgTarget, 2340, `『真』の凸効果`, false, true);
            if (hit) applyMirrorOnce(owner, dmgTarget, 2340);
            log(`『真』の凸効果：残り発動回数が3回以下だったため即座に破棄し、2340ダメージを与えた！`, "strong");
          }
        }
      }
      // エレメント「土」（強化版）：次に出すメインカードのダメージ+80%
      if (owner._elementEarthNextMainBoost) {
        owner._activeEarthMainBoostPct = owner._elementEarthNextMainBoost;
        owner._elementEarthNextMainBoost = 0;
      }

      // 倍(damageDouble)チェック：次のmainダメージを2倍にするフラグ
      const dblCard = owner.subs.find(s => s.effect.kind === "damageDouble");
      if (dblCard) owner._nextDamageDouble = true;

      // 強(nextMainDamageBoost)チェック：次に出すメインカードの与えるダメージ+30%
      const kyouCard = owner.subs.find(s => s.effect.kind === "nextMainDamageBoost");
      if (kyouCard) owner._nextMainDamageBoostPct = kyouCard.effect.pct || 30;

      // 雲(doubleNextWeatherMain)：雨・雷・雪・輝のダメージを2倍にする。1回発動後に破棄。
      const kumoCard = owner.subs.find(s => s.effect.kind === "doubleNextWeatherMain");
      if (kumoCard && COIN_WEATHER_MAIN_IDS.includes(card.id)) {
        owner._nextDamageDouble = true;
        moveSubToGrave(owner, kumoCard, "効果を発動");
        log(`『雲』の効果で『${card.name}』のダメージが2倍になる！`, "good");
      }

      // ビーコン：ダメージアップ／ダメージダウンの合計値を計算し、このメインカードの間だけ適用する
      owner._mainBeaconDmgMod = computeMainBeaconDmgMod(card);
      owner._activeBoostMultiplier = (card.beacons && card.beacons.includes("boost")) ? 2 : 1;

      if (hasBlankBeaconKind(card, "main")) {
        log(`『${card.name}』は「白紙」ビーコンにより効果が無効になった。`);
      } else {
        resolveMain(owner, card);
        applyMainBeaconTriggers(owner, card);
        // リロード：このカードの効果をもう一度発動する（無限ループ防止のため1回のみ）
        if (card.beacons && card.beacons.includes("reload")) {
          log(`ビーコン「リロード」🔁：『${card.name}』の効果が再び発動する！`, "good");
          resolveMain(owner, card);
          applyMainBeaconTriggers(owner, card);
        }
      }
      owner._mainBeaconDmgMod = 0;
      owner._activeBoostMultiplier = 1;

      // シンセサイズ：合成カードに素材効果が付与されていれば発動（釘の synthTag で2回）
      if (card.materialEffect) {
        const times = card.materialRepeat || 1;
        for (let i = 0; i < times; i++) {
          if (card.materialEffect.kind === "repeatSelf") {
            log(`『${card.name}』の素材効果：もう一度効果が発動する！`, "good");
            resolveMain(owner, card);
          } else {
            log(`『${card.name}』の素材効果（${i + 1}/${times}）：${card.materialText}`, "good");
            resolveMain(owner, { ...card, effect: card.materialEffect });
          }
        }
      }

      // 虚(lowRarityTrigger)：☆1のメインカード使用時に発動。1回発動後に破棄。
      if (card.rarity === 1) {
        const kyo2 = owner.subs.find(s => s.effect.kind === "lowRarityTrigger");
        if (kyo2) {
          const target = opponentOf(owner);
          log(`『虚』発動！☆1カード『${card.name}』の使用で相手に1000ダメージ！`, "strong");
          applyDamage(owner, target, 1000, "『虚』の効果", true);
          // 虚：また、相手に「脆弱」を1層付与する
          applyStatus(target, "fragile", 1);
          moveSubToGrave(owner, kyo2, "効果を発動");
        }
      }
      // 全(highRarityEscalate)：☆3のメインカード使用時に発動。発動ごとにダメージ+500。4回発動後に破棄。
      if (card.rarity === 3) {
        const zen = owner.subs.find(s => s.effect.kind === "highRarityEscalate");
        if (zen) {
          const target = opponentOf(owner);
          zen.elapsed = (zen.elapsed || 0) + 1;
          const dmg = zen.effect.base + zen.effect.step * (zen.elapsed - 1);
          log(`『全』発動（${zen.elapsed}/${zen.maxTriggers}）：☆3カード『${card.name}』の使用で相手に${dmg}ダメージ！`, "strong");
          applyDamage(owner, target, dmg, "『全』の効果", true);
          if (zen.elapsed >= zen.maxTriggers) moveSubToGrave(owner, zen, "4回発動し破棄");
        }
      }
      // 夜(onRarity2MainBonus)：☆2のメインカード使用時に発動。2回発動後に破棄。
      if (card.rarity === 2) {
        const yoru = owner.subs.find(s => s.effect.kind === "onRarity2MainBonus");
        if (yoru) {
          const target = opponentOf(owner);
          yoru.elapsed = (yoru.elapsed || 0) + 1;
          log(`『夜』発動（${yoru.elapsed}/${yoru.maxTriggers}）：☆2カード『${card.name}』の使用で相手に${yoru.effect.value}ダメージ！`, "strong");
          applyDamage(owner, target, yoru.effect.value, "『夜』の効果", true);
          const drawn = drawCards(owner, yoru.effect.drawCount || 2);
          drawn.forEach(d => {
            for (let i = 0; i < 2; i++) grantNormalBeacon(d);
          });
          owner.hand.push(...drawn);
          log(`『夜』：${drawn.length}枚ドローし、引いたカードそれぞれにノーマルビーコンを2つ付与した。`, "good");
          if (yoru.elapsed >= yoru.maxTriggers) moveSubToGrave(owner, yoru, "2回発動し破棄");
        }
      }

      // 甲(kabuto)への強化トリガー：メインフィールドに『乙』が出された時、次のダメージが650に強化される（1回のみ）
      if (card.id === "otsu") {
        const kabutoCard = owner.subs.find(s => s.id === "kabuto");
        if (kabutoCard && !kabutoCard._boostUsed) {
          kabutoCard._nextBoosted = true;
          log(`『甲』の次に与えるダメージが650に強化される！`, "good");
        }
      }

      // 似(repeatNextMain)チェック：このメインの効果をもう一度実行して破棄
      const niCard = owner.subs.find(s => s.effect.kind === "repeatNextMain");
      if (niCard) {
        log(`『${niCard.name}』が発動！『${card.name}』の効果をもう一度実行する！`, "strong");
        moveSubToGrave(owner, niCard, "効果を発動");
        if (getLimitBreak("ni", owner.isAI) >= 4) owner._niRepeatBoostPercent = 50;
        resolveMain(owner, card);
        owner._niRepeatBoostPercent = 0;
      }

      // 万(returnMain)チェック：手札に戻す
      const wanCard = owner.subs.find(s => s.effect.kind === "returnMain");
      // カード解決後の最終ビーコン状態を履歴スナップショットに同期しておく
      // （このあと墓地へ送られてビーコンが剝がれても、フィールド上の表示には影響しないように）
      if (owner.lastMains.length > 0) {
        const lastEntry = owner.lastMains[owner.lastMains.length - 1];
        if (lastEntry.instanceId === card.instanceId) lastEntry.beacons = [...(card.beacons || [])];
      }
      if (card.synthSources) {
        // シンセサイズ：合成カードは使用後、分解されて元のカードに戻り墓地へ行く
        // ただし『改』が発動中なら分解されず手札に戻る（1回発動後に破棄）
        const kai4Card = owner.subs.find(s => s.effect.kind === "synthNoDecompose");
        if (kai4Card) {
          owner.hand.push(card);
          log(`『改』の効果で『${card.name}』は分解されずに手札へ戻った。`, "good");
          moveSubToGrave(owner, kai4Card, "1回発動し破棄");
        } else {
          decomposeSynthCard(owner, card, false);
        }
      } else if (wanCard) {
        moveSubToGrave(owner, wanCard, "効果を発動");
        owner.hand.push(card);
        owner._nextDamageDouble = false;
        log(`『万』の効果で『${card.name}』が手札に戻った。`, "good");
        // 凸：『億』4凸 - このカードの効果によって戻ったカードにスペシャルビーコン「ブースト」を1つ付与する
        if (wanCard.id === "oku" && getLimitBreak("oku", owner.isAI) >= 4) {
          if (card.beacons.length < BEACON_MAX && !card.beacons.includes("boost")) {
            card.beacons.push("boost");
            log(`『億』の凸効果：『${card.name}』にビーコン「ブースト」🐦‍🔥を付与した。`, "good");
          }
        }
      } else if (card.effect.kind === "heavenDamage" && chanceRoll(card.id === "ten" && getLimitBreak("ten", owner.isAI) >= 2 ? 0.6 : card.effect.returnChance)) {
        owner.hand.push(card);
        log(`『天』の効果が発動！確率を引き、墓地に行かず手札に戻った。`, "good");
      } else if (card.noGrave) {
        log(`『${card.name}』は消滅した（援で獲得したカードは墓地に行かない）。`);
      } else if (card.id === "a3") {
        assignThreeNormalBeacons(card);
        owner.grave.push(card);
        log(`『${card.name}』は墓地へ送られ、ビーコンが入れ替わった。`);
      } else {
        stripBeaconsOnGrave(card);
        owner.grave.push(card);
        log(`『${card.name}』は墓地へ送られた。`);
      }
      owner.main = null;

      // 倍フラグリセット
      if (owner._nextDamageDouble) {
        if (dblCard) moveSubToGrave(owner, dblCard, "効果を発動");
        owner._nextDamageDouble = false;
      }
      // 強フラグリセット
      if (owner._nextMainDamageBoostPct) {
        if (kyouCard) moveSubToGrave(owner, kyouCard, "効果を発動");
        owner._nextMainDamageBoostPct = 0;
      }

      // prevCard記録（零用：肆・玖・零以外の壱～拾のみ）
      const numberIds = ["ichi","ni2","san2","shi","go","roku","sichi","hachi","ku","juu"];
      const excludeFromZero = ["shi", "ku"];
      if (numberIds.includes(card.id) && !excludeFromZero.includes(card.id)) {
        if (owner === game.player) game.playerPrevCard = card;
        else game.aiPrevCard = card;
      }

      owner._activeDamageCard = null;
      owner._activeEarthMainBoostPct = 0;
      resolveSubEffects(owner);
      checkWin();
    }
