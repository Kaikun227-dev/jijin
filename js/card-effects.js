    // 帝(mikadoAdaptive)：各デッキ効果ごとの分岐処理（凸1/4によるランダム追加発動と共有）
    function mikadoDeckEffect(owner, target, card, deckId) {
      if (deckId === "standard") {
        const hit = applyDamage(owner, target, 1500, `『${card.name}』`, false, true);
        if (hit) applyMirrorOnce(owner, target, 1500);
        healHp(owner, 3000);
        log(`『${card.name}』：スタンダードの力でHPを3000回復した。`, "good");
      } else if (deckId === "number") {
        const hit = applyDamage(owner, target, 2000, `『${card.name}』`, false, true);
        if (hit) applyMirrorOnce(owner, target, 2000);
        const count = owner.grave.length;
        owner.deck.push(...owner.grave.splice(0).map(c => ({ ...c, elapsed: 0 })));
        owner.deck = shuffle(owner.deck);
        if (count > 0) log(`『${card.name}』：墓地の${count}枚を山札へ戻した。`, "good");
      } else if (deckId === "king") {
        const dmg = owner.subs.length * 600;
        if (dmg > 0) {
          const hit = applyDamage(owner, target, dmg, `『${card.name}』`, false, true);
          if (hit) applyMirrorOnce(owner, target, dmg);
        } else {
          log(`『${card.name}』：サブフィールドが空のためダメージは発生しなかった。`);
        }
        if (kingNotInHandOrSub(owner)) fetchKingTo(owner, "hand");
      } else if (deckId === "trick") {
        let mirrored = false;
        for (let i = 1; i <= 2; i++) {
          const dmg = rollRangeDamage(owner, 1600, 2400);
          log(`『${card.name}』${i}撃目：${dmg}ダメージ`);
          const hit = applyDamage(owner, target, dmg, `『${card.name}』${i}撃目`, false, true);
          if (hit && !mirrored) mirrored = applyMirrorOnce(owner, target, dmg);
        }
      }
    }

    function resolveMain(owner, card) {
      const target = opponentOf(owner);
      const eff = card.effect;
      const _prevActiveDamageCard = owner._activeDamageCard;
      owner._activeDamageCard = card;

      if (eff.kind === "damage") {
        const hit = applyDamage(owner, target, eff.value, `『${card.name}』`, false, true);
        if (hit) applyMirrorOnce(owner, target, eff.value);
        // 鼠・鉛：相手に「猛毒」を1層付与する
        if (card.id === "nez" || card.id === "namari") {
          applyStatus(target, "toxin", 1);
        }
      }
      else if (eff.kind === "multiDamage") {
        // 連(extraHit)：追加1撃ごとに発動カウント
        const renCard = owner.subs.find(s => s.effect.kind === "extraHit");
        let mdValue = eff.value;
        let mdHits = eff.hits;
        if (card.id === "bak") {
          const bakLB = getLimitBreak("bak", owner.isAI);
          if (bakLB >= 1) mdValue = 700;
          if (bakLB >= 2) mdHits = 5;
        }
        const totalHits = mdHits + (renCard ? 1 : 0) + equipExtraHitCount(owner);
        if (renCard) {
          renCard.elapsed = (renCard.elapsed || 0) + 1;
          log(`『連』発動（${renCard.elapsed}/${renCard.maxTriggers}）: ${mdHits}→${totalHits}撃`);
          if (renCard.elapsed >= renCard.maxTriggers) moveSubToGrave(owner, renCard, "1回発動し破棄");
        }
        let mirrored = false;
        for (let i = 1; i <= totalHits; i++) {
          const hit = applyDamage(owner, target, mdValue, `『${card.name}』${i}撃目`, false, true);
          if (hit && !mirrored) mirrored = applyMirrorOnce(owner, target, mdValue);
        }
        // 蛇：相手に「猛毒」を1層付与する
        if (card.id === "heb") {
          applyStatus(target, "toxin", 1);
        }
        if (card.id === "bak" && getLimitBreak("bak", owner.isAI) >= 4) {
          if (target.subs.length === 0) {
            log(`『爆』の凸効果：相手のサブフィールドには何もない。`);
          } else {
            for (const s of [...target.subs]) {
              const idx = target.subs.findIndex(c => c.instanceId === s.instanceId);
              if (idx < 0) continue;
              target.subs.splice(idx, 1);
              if (s.beacons && s.beacons.includes("counter")) {
                applyDamage(target, owner, 600, `『${s.name}』のビーコン「カウンター」🪞`, true);
              }
              stripBeaconsOnGrave(s);
              if (!s.noGrave) target.grave.push(s);
              log(`『爆』の凸効果：${target.label}の『${s.name}』を破棄した。`, "good");
            }
          }
        }
      }
      else if (eff.kind === "heal") {
        healHp(owner, eff.value);
        log(`『${card.name}』で${owner.label}のHPを${eff.value}回復した。`, "good");
      }
      // ── ショップ交換専用カード（追加分） ──
      else if (eff.kind === "healAndClearAllStatus") {
        // 洗：HP回復＋自身の状態異常を全て除去
        healHp(owner, eff.value);
        clearStatusEffects(owner, true);
        log(`『${card.name}』：HPを${eff.value}回復し、自身の状態異常を全て除去した。`, "good");
      }
      else if (eff.kind === "deckSendLowRarityToGrave") {
        // 葬：山札にある☆1〜2カードのうち最大count枚をランダムに墓地へ送る
        const idxList = [];
        owner.deck.forEach((c, i) => { if (c.rarity <= (eff.maxRarity || 2)) idxList.push(i); });
        for (let i = idxList.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [idxList[i], idxList[j]] = [idxList[j], idxList[i]];
        }
        const picked = idxList.slice(0, eff.count || 6).sort((a, b) => b - a);
        const sent = picked.map(i => owner.deck.splice(i, 1)[0]);
        owner.grave.push(...sent);
        if (sent.length > 0) {
          log(`『${card.name}』：山札の☆1〜2カード${sent.length}枚を墓地に送った。`, "good");
        } else {
          log(`『${card.name}』：山札に☆1〜2カードがなかったため、効果は不発だった。`);
        }
      }
      else if (eff.kind === "damageDiscardHandAndSubs") {
        // 撃：大ダメージの代償に自身の残り手札とサブ全てを破棄する
        const gekiLB = getLimitBreak("geki", owner.isAI);
        let dmg = eff.value;
        // 凸：『撃』4凸 - 与えるダメージが[3200→4500]
        if (gekiLB >= 4) dmg = 4500;
        const hit = applyDamage(owner, target, dmg, `『${card.name}』`, false, true);
        if (hit) applyMirrorOnce(owner, target, dmg);
        if (owner.hand.length) {
          owner.grave.push(...owner.hand);
          log(`${owner.label}の手札${owner.hand.length}枚が代償として破棄された。`);
          owner.hand = [];
        }
        for (const s of [...owner.subs]) {
          moveSubToGrave(owner, s, "『撃』の代償で破棄");
        }
        // 凸：『撃』1凸 - 山札からカードを1枚引く
        if (gekiLB >= 1) {
          const drawn = drawCards(owner, 1);
          owner.hand.push(...drawn);
          if (drawn.length) log(`『${card.name}』の凸効果：${owner.label}は山札から${drawn.length}枚引いた。`, "good");
        }
        // 凸：『撃』2凸 - 相手に「出血」を2層付与する
        if (gekiLB >= 2) {
          applyStatus(target, "shukketsu", 2);
          log(`『${card.name}』の凸効果：${target.label}に「出血」を2層付与した。`, "good");
        }
      }
      else if (eff.kind === "damageGraveScaleSummonShield") {
        // 暁：墓地の枚数分ダメージ強化＋自身のサブフィールドに『盾』(noGrave扱い)を召喚
        const akatsukiLB = getLimitBreak("akatsuki", owner.isAI);
        const graveCount = owner.grave.length;
        // 凸：『暁』2凸 - 墓地にあるカードの枚数による与えるダメージ+[3％→4%]
        const percentPerGrave = akatsukiLB >= 2 ? 0.04 : (eff.percentPerGrave || 0);
        let dmg = Math.round(eff.value * (1 + percentPerGrave * graveCount));
        if (graveCount > 0) log(`『${card.name}』：墓地${graveCount}枚分、ダメージが${dmg}に増加した。`);
        // 凸：『暁』4凸 - 与えるダメージ＋15％
        if (akatsukiLB >= 4) {
          const before = dmg;
          dmg = Math.round(dmg * 1.15);
          if (dmg !== before) log(`『暁』の凸効果でダメージが${before}→${dmg}に増加した。`, "good");
        }
        const hit = applyDamage(owner, target, dmg, `『${card.name}』`, false, true);
        if (hit) applyMirrorOnce(owner, target, dmg);
        if (owner.subs.length < getSubLimit(owner)) {
          const shield = makeCardCopy(eff.summonId || "tate", { noGrave: true });
          if (shield) {
            owner.subs.push(shield);
            log(`${owner.label}のサブフィールドに『${shield.name}』を召喚した。`, "good");
          }
        } else {
          log(`${owner.label}のサブフィールドが満杯で『盾』は召喚できなかった。`);
        }
        // 凸：『暁』1凸 - 相手に「火傷」を2層付与する
        if (akatsukiLB >= 1) {
          applyStatus(target, "burn", 2);
          log(`『${card.name}』の凸効果：${target.label}に「火傷」を2層付与した。`, "good");
        }
        // 凸：『暁』4凸 - 墓地にあるカードを山札へ戻す
        if (akatsukiLB >= 4 && owner.grave.length) {
          const returned = owner.grave.splice(0, owner.grave.length);
          owner.deck = shuffle([...owner.deck, ...returned]);
          log(`『${card.name}』の凸効果：墓地の${returned.length}枚を山札へ戻した。`, "good");
        }
      }
      else if (eff.kind === "drawCards") {
        const drawn = drawCards(owner, eff.value);
        owner.hand.push(...drawn);
        log(`『${card.name}』で${drawn.length}枚ドローした。`, "good");
      }
      else if (eff.kind === "damageAndDestroySub") {
        const hit = applyDamage(owner, target, eff.value, `『${card.name}』`, false, true);
        if (hit) {
          applyMirrorOnce(owner, target, eff.value);
          if (target.subs.length > 0) {
            const idx = Math.floor(Math.random() * target.subs.length);
            const destroyed = target.subs[idx];
            if (checkWallProtection(target, destroyed)) {
              moveSubToGrave(target, destroyed, "『虎』に破壊された");
            }
          }
        }
      }
      else if (eff.kind === "kiDamage") {
        const kiLB = getLimitBreak("ki", owner.isAI);
        const effHandCount = owner.hand.length + (kiLB >= 1 ? 1 : 0);
        const halfHpThresholdDamage = kiLB >= 2 ? 3000 : 2400;
        const baseDamage = owner.hp <= Math.floor(getMaxHP(owner) / 2) ? halfHpThresholdDamage : 1500;
        const bonusDamage = effHandCount * 400;
        let totalDamage = baseDamage + bonusDamage;
        log(`『騎』：${baseDamage}ダメージ＋手札${effHandCount}枚×400＝${totalDamage}ダメージ`);
        if (kiLB >= 4) {
          const before = totalDamage;
          totalDamage = Math.round(totalDamage * (1 + (effHandCount * 10) / 100));
          if (totalDamage !== before) log(`『騎』の凸効果：手札換算${effHandCount}枚×10％でダメージが${before}→${totalDamage}に増加した。`, "good");
        }
        const hit = applyDamage(owner, target, totalDamage, `『${card.name}』`, false, true);
        if (hit) applyMirrorOnce(owner, target, totalDamage);
      }
      else if (eff.kind === "subRarityDamageV2") {
        const total = owner.subs.reduce((sum, c) => sum + c.rarity, 0);
        const dmg = 500 + total * 250;
        const hit = applyDamage(owner, target, dmg, `『${card.name}』`, false, true);
        if (hit) applyMirrorOnce(owner, target, dmg);
      }
      else if (eff.kind === "darkDamage") {
        let dmgValue = eff.value;
        let selfDmg = eff.self;
        if (card.id === "yam") {
          const yamLB = getLimitBreak("yam", owner.isAI);
          if (yamLB >= 1) dmgValue = 3500;
          if (yamLB >= 4) dmgValue = 4000;
          if (yamLB >= 2) selfDmg = 0;
        }
        const hit = applyDamage(owner, target, dmgValue, `『${card.name}』`, false, true);
        if (hit) applyMirrorOnce(owner, target, dmgValue);
        if (selfDmg > 0) {
          owner.hp = Math.max(0, owner.hp - selfDmg);
          log(`『${card.name}』の反動で${owner.label}が${selfDmg}ダメージを受けた。`, "strong");
        }
      }
      // ── 新カード ──
      else if (eff.kind === "randomDamage") {
        const dmg = eff.choices[Math.floor(Math.random() * eff.choices.length)];
        log(`『${card.name}』のダイス：${dmg}ダメージ！`);
        const hit = applyDamage(owner, target, dmg, `『${card.name}』`, false, true);
        if (hit) applyMirrorOnce(owner, target, dmg);
      }
      else if (eff.kind === "birdAttack") {
        const hit = applyDamage(owner, target, eff.value, `『${card.name}』`, false, true);
        if (hit) applyMirrorOnce(owner, target, eff.value);
        // 自分と相手のサブの卵を破棄
        for (const o of [owner, target]) {
          for (const s of [...o.subs]) {
            if (s.effect.kind === "eggBurst") {
              moveSubToGrave(o, s, "『鳥』に割られ");
            }
          }
        }
      }
      else if (eff.kind === "subCountDamage") {
        // 邪など「デッキに編成されたサブの枚数」を参照するカードは deckManifest（30枚構成）を数える。
        // 協・剣・銃など「自分の（場の）サブ枚数」を参照するカードは従来通り owner.subs（場のサブ）を数える。
        const useDeckManifest = eff.useDeckManifest === true;
        const subCount = useDeckManifest
          ? (owner.deckManifest || []).filter(c => c.type === "sub").length
          : owner.subs.length;
        const base = eff.base || 0;
        const bonus = subCount * eff.perSub;
        const total = base + bonus;
        log(`${owner.label}の${useDeckManifest ? "デッキ編成中の" : "場の"}サブ${subCount}枚 → ${base}+${bonus}=${total}ダメージ`);
        const hit = applyDamage(owner, target, total, `『${card.name}』`, false, true);
        if (hit) applyMirrorOnce(owner, target, total);
      }
      else if (eff.kind === "destroyAllSubs") {
        // 盾・護貫通で全破棄
        if (target.subs.length === 0) {
          log(`相手のサブフィールドには何もない。`);
        } else {
          for (const s of [...target.subs]) {
            const idx = target.subs.findIndex(c => c.instanceId === s.instanceId);
            if (idx < 0) continue;
            target.subs.splice(idx, 1);
            if (s.beacons && s.beacons.includes("counter")) {
              applyDamage(target, owner, 600, `『${s.name}』のビーコン「カウンター」🪞`, true);
            }
            stripBeaconsOnGrave(s);
            if (!s.noGrave) target.grave.push(s);
            log(`${target.label}の『${s.name}』を破棄した。`);
            if (s.effect.kind === "eggBurst") {
              const need = MAX_HAND - target.hand.length;
              if (need > 0) {
                const drawn = drawCards(target, need);
                target.hand.push(...drawn);
                log(`『卵』が孵化！${drawn.length}枚ドロー。`, "good");
              }
            }
            if (s.effect.kind === "timeBomb") {
              applyDamage(target, owner, 2700, `『兆』早期破棄`, false, true);
            }
          }
        }
        // 壊：相手の状態異常のうち「栄光」「月照」も破壊する
        clearProtectedStatusOnly(target);
      }
      else if (eff.kind === "summonPoison") {
        // 蝕：相手に毒を設置（サブ枠があれば）
        if (target.subs.length < getSubLimit(target)) {
          const poison = makeSpecial("poison");
          target.subs.push(poison);
          log(`${owner.label}が${target.label}のサブに『毒』を召喚した！`, "strong");
        } else {
          log(`${target.label}のサブフィールドが満杯で『毒』を召喚できなかった。`);
        }
        // 蝕：また、相手に「猛毒」を2層付与する
        applyStatus(target, "toxin", 2);
      }
      else if (eff.kind === "healAndCurePoison") {
        const kaiLB = card.id === "kai2" ? getLimitBreak("kai2", owner.isAI) : 0;
        const healValue = kaiLB >= 2 ? 3000 : eff.value;
        healHp(owner, healValue);
        log(`『${card.name}』で${owner.label}のHPを${healValue}回復した。`, "good");
        const poisons = owner.subs.filter(s => s.effect.kind === "poisonTick");
        for (const p of poisons) moveSubToGrave(owner, p, "快で解毒され");
        // 快：自身に付与された状態異常（栄光・月照を除く）を全て除去する
        clearStatusEffects(owner, false);
        if (kaiLB >= 4) {
          applyDamage(owner, target, 1000, `『${card.name}』の凸効果`, false, true);
        }
      }
      else if (eff.kind === "gainElementCost") {
        // 活：コストを直接獲得する
        owner.elementCost = Math.min(ELEMENT_COST_MAX, (owner.elementCost || 0) + eff.value);
        log(`『${card.name}』でコストを${eff.value}獲得した。`, "good");
      }
      else if (eff.kind === "gainElementCostAndSummon") {
        // 輝：コストを獲得し、サブフィールドに「光」を最大数まで召喚する
        const kagayakiLB = getLimitBreak("kagayaki2", owner.isAI);
        owner.elementCost = Math.min(ELEMENT_COST_MAX, (owner.elementCost || 0) + eff.value);
        log(`『${card.name}』でコストを${eff.value}獲得した。`, "good");
        let spawned = 0;
        const limit = getSubLimit(owner);
        for (let i = 0; i < limit && owner.subs.length < limit; i++) {
          const summonCard = makeSpecial(eff.summonKey);
          // 凸：『輝』2凸 - 召喚した「光」の継続ターン[2→3]
          if (card.id === "kagayaki2" && kagayakiLB >= 2) summonCard.duration = 3;
          owner.subs.push(summonCard);
          // 召喚カードも他のカード同様、レアリティに応じたコストを自動獲得する
          gainElementCost(owner, summonCard);
          spawned++;
        }
        if (spawned > 0) log(`${owner.label}のサブに『${SPECIAL_CARDS[eff.summonKey].name}』を${spawned}枚召喚した。`, "good");
        else log(`サブフィールドが満杯で『${SPECIAL_CARDS[eff.summonKey].name}』は召喚されなかった。`);
        // 凸：『輝』1凸 - 相手に1000ダメージを与える
        if (card.id === "kagayaki2" && kagayakiLB >= 1) {
          const hit = applyDamage(owner, target, 1000, `『${card.name}』の凸効果`, false, true);
          if (hit) applyMirrorOnce(owner, target, 1000);
        }
        // 凸：『輝』4凸 - 自身に付与された状態異常（栄光・月照を除く）を全て除去する
        if (card.id === "kagayaki2" && kagayakiLB >= 4) {
          clearStatusEffects(owner, false);
          log(`『${card.name}』の凸効果：${owner.label}の状態異常を除去した（栄光・月照を除く）。`, "good");
        }
      }
      else if (eff.kind === "dragonAttack") {
        const hit = applyDamage(owner, target, eff.value, `『${card.name}』`, false, true);
        if (hit) applyMirrorOnce(owner, target, eff.value);
        if (owner.subs.length < getSubLimit(owner)) {
          const egg = makeSpecial("egg");
          owner.subs.push(egg);
          gainElementCost(owner, egg);
          log(`${owner.label}のサブに『卵』を召喚した。`, "good");
        } else {
          log(`サブフィールドが満杯で『卵』は召喚されなかった。`);
        }
      }
      else if (eff.kind === "treeAttack") {
        const juLB = card.id === "ju" ? getLimitBreak("ju", owner.isAI) : 0;
        const dmgValue = juLB >= 2 ? 1200 : eff.value;
        if (juLB >= 1) {
          healHp(owner, 600);
          log(`『${card.name}』の凸効果で${owner.label}のHPを600回復した。`, "good");
        }
        const hit = applyDamage(owner, target, dmgValue, `『${card.name}』`, false, true);
        if (hit) applyMirrorOnce(owner, target, dmgValue);
        let spawned = 0;
        const limit = getSubLimit(owner);
        for (let i = 0; i < limit && owner.subs.length < limit; i++) {
          const wood = makeSpecial("wood");
          owner.subs.push(wood);
          gainElementCost(owner, wood);
          spawned++;
          if (juLB >= 4) {
            grantNormalBeacon(wood);
            grantNormalBeacon(wood);
            // ノーマルビーコンの中には「置いた時」に発動するものがあるため、
            // 通常のサブ設置と同様にここで即座に発動させる。
            applySubPlacementBeacons(owner, wood);
          }
        }
        if (spawned > 0) log(`${owner.label}のサブに『木』を${spawned}枚召喚した。`, "good");
      }
      // ── ナンバーデッキ ──
      else if (eff.kind === "numDraw") {
        // 壱：山札から弐～拾を最大2枚引く
        const targets = eff.targets;
        const matching = owner.deck.filter(c => targets.includes(c.id));
        const drawn = [];
        for (const c of shuffle([...matching])) {
          if (drawn.length >= 2) break;
          if (owner.hand.length + drawn.length >= MAX_HAND) break;
          const idx = owner.deck.findIndex(d => d.instanceId === c.instanceId);
          if (idx >= 0) { drawn.push(owner.deck.splice(idx, 1)[0]); }
        }
        owner.hand.push(...drawn);
        log(`『壱』：山札から${drawn.map(c=>`『${c.name}』`).join("")}を引いた。`, "good");
      }
      else if (eff.kind === "numNi") {
        // 弐：222×2 + 手持ち枚数分追加
        const baseHits = 2;
        const bonusHits = owner.hand.length; // 使用後の手持ち枚数
        const totalHits = baseHits + bonusHits;
        log(`『弐』：${baseHits}回＋手持ち${bonusHits}枚＝${totalHits}回攻撃！`);
        const renCard = owner.subs.find(s => s.effect.kind === "extraHit");
        const extra = (renCard ? 1 : 0) + equipExtraHitCount(owner);
        if (renCard) { renCard.elapsed=(renCard.elapsed||0)+1; log(`『連』発動`); if(renCard.elapsed>=renCard.maxTriggers) moveSubToGrave(owner,renCard,"2回発動し破棄"); }
        let mirrored = false;
        for (let i = 1; i <= totalHits + extra; i++) {
          const hit = applyDamage(owner, target, 222, `『弐』${i}撃目`, false, true);
          if (hit && !mirrored) mirrored = applyMirrorOnce(owner, target, 222);
        }
      }
      else if (eff.kind === "deckCountDamage") {
        const dmg = owner.deck.length * eff.multiplier;
        log(`『陸』：山札${owner.deck.length}枚×${eff.multiplier}＝${dmg}ダメージ`);
        const hit = applyDamage(owner, target, dmg, `『${card.name}』`, false, true);
        if (hit) applyMirrorOnce(owner, target, dmg);
      }
      else if (eff.kind === "graveCountDamage") {
        const dmg = owner.grave.length * eff.multiplier;
        log(`『漆』：墓地${owner.grave.length}枚×${eff.multiplier}＝${dmg}ダメージ`);
        const hit = applyDamage(owner, target, Math.max(dmg, 0), `『${card.name}』`, false, true);
        if (hit) applyMirrorOnce(owner, target, dmg);
      }
      else if (eff.kind === "damageDiscardHand") {
        const hit = applyDamage(owner, target, eff.value, `『${card.name}』`, false, true);
        if (hit) applyMirrorOnce(owner, target, eff.value);
        // 残り手札を全て墓地へ
        const discarded = [...owner.hand];
        owner.hand = [];
        owner.grave.push(...discarded);
        if (discarded.length > 0) log(`${owner.label}の手札${discarded.length}枚を墓地へ送った。`);
      }
      else if (eff.kind === "damageGraveReturn") {
        // 拾：ダメージ＋墓地を全て山札に戻し、山札と墓地を再シャッフルしてから3枚ドロー
        const juuLB = getLimitBreak("juu", owner.isAI);
        const juuDmg = juuLB >= 1 ? 1600 : eff.value;
        const hit = applyDamage(owner, target, juuDmg, `『${card.name}』`, false, true);
        if (hit) applyMirrorOnce(owner, target, juuDmg);
        const returned = owner.grave.splice(0).map(c => ({ ...c, elapsed: 0 }));
        owner.deck = shuffle([...owner.deck, ...returned]);
        log(`${owner.label}の墓地${returned.length}枚を山札へ戻した。`, "good");
        const drawn = [];
        const drawCount = juuLB >= 4 ? 5 : 3;
        const drawLimit = Math.min(drawCount, MAX_HAND - owner.hand.length);
        for (let i = 0; i < drawLimit && owner.deck.length > 0; i++) {
          drawn.push(owner.deck.pop());
        }
        owner.hand.push(...drawn);
        if (drawn.length > 0) log(`山札から${drawn.length}枚ドローした。`, "good");
      }
      else if (eff.kind === "numZero") {
        // 零：1200ダメ＋前ターンの数字カード効果再発動
        const zeroLB = getLimitBreak("zero", owner.isAI);
        const zeroDmg = zeroLB >= 2 ? 2000 : eff.value;
        const hit = applyDamage(owner, target, zeroDmg, `『零』`, false, true);
        if (hit) applyMirrorOnce(owner, target, zeroDmg);
        const prevCard = owner === game.player ? game.playerPrevCard : game.aiPrevCard;
        if (prevCard) {
          log(`『零』の追加効果：前ターンの『${prevCard.name}』を再発動！`, "strong");
          if (zeroLB >= 4) owner._zeroRepeatBoostPercent = 50;
          resolveMain(owner, prevCard);
          owner._zeroRepeatBoostPercent = 0;
        } else {
          log(`前ターンに対象の数字カードを使っていないため追加効果なし。`);
        }
        // 零：また、相手に「悪寒」を2層付与する
        applyStatus(target, "chill", 2);
      }
      else if (eff.kind === "damageAndHeal") {
        // 猫／氷(素材効果)：キー名が dmg のものと damage のものが混在しているため両対応
        const dmgValue = eff.dmg !== undefined ? eff.dmg : eff.damage;
        const hit = applyDamage(owner, target, dmgValue, `『${card.name}』`, false, true);
        if (hit) applyMirrorOnce(owner, target, dmgValue);
        healHp(owner, eff.heal);
        log(`『${card.name}』で${owner.label}のHPを${eff.heal}回復した。`, "good");
      }
      else if (eff.kind === "destroySelfSubs") {
        // 捨：自分サブを全破棄
        if (owner.subs.length === 0) { log(`サブフィールドには何もない。`); }
        else {
          for (const s of [...owner.subs]) {
            const idx = owner.subs.findIndex(c => c.instanceId === s.instanceId);
            if (idx < 0) continue;
            owner.subs.splice(idx, 1);
            if (!s.noGrave) owner.grave.push(s);
            log(`${owner.label}の『${s.name}』を破棄した。`);
            if (s.effect.kind === "eggBurst") {
              const need = MAX_HAND - owner.hand.length;
              const drawn = drawCards(owner, need);
              owner.hand.push(...drawn);
              if (drawn.length) log(`『卵』が孵化！${drawn.length}枚ドロー。`, "good");
            }
            if (s.effect.kind === "timeBomb") {
              applyDamage(owner, target, 2700, `『億』早期破棄`, false, true);
            }
          }
        }
      }
      else if (eff.kind === "emptyHandDamage") {
        // 札：手持ち0なら1000、それ以外200
        const dmg = owner.hand.length === 0 ? eff.emptyDmg : eff.normalDmg;
        log(`『札』：手持ち${owner.hand.length}枚 → ${dmg}ダメージ`);
        const hit = applyDamage(owner, target, dmg, `『${card.name}』`, false, true);
        if (hit) applyMirrorOnce(owner, target, dmg);
      }
      else if (eff.kind === "skipEnemyTurn") {
        // 鎖：次の相手ターンをスキップ
        if (owner.isAI) game.skipNextPlayerTurn = true;
        else game.skipNextAITurn = true;
        log(`『鎖』：次の相手のターンをスキップした！`, "strong");
      }
      else if (eff.kind === "drawSubCards") {
        // 助：山札からサブカードを最大2枚引く
        const matching = owner.deck.filter(c => c.type === "sub");
        const drawn = [];
        for (const c of shuffle([...matching])) {
          if (drawn.length >= eff.count) break;
          if (owner.hand.length + drawn.length >= MAX_HAND) break;
          const idx = owner.deck.findIndex(d => d.instanceId === c.instanceId);
          if (idx >= 0) drawn.push(owner.deck.splice(idx, 1)[0]);
        }
        owner.hand.push(...drawn);
        log(`『助』：山札から${drawn.length}枚のサブカードを引いた。`, "good");
      }
      else if (eff.kind === "graveReturn") {
        // 蘇：墓地からランダム最大2枚を手札へ
        if (owner.grave.length === 0) { log(`墓地にカードがない。`); }
        else {
          const picks = shuffle([...owner.grave]).slice(0, Math.min(eff.count, MAX_HAND - owner.hand.length));
          picks.forEach(p => {
            const idx = owner.grave.findIndex(c => c.instanceId === p.instanceId);
            if (idx >= 0) owner.grave.splice(idx, 1);
            owner.hand.push({ ...p, elapsed: 0 });
          });
          log(`『蘇』：墓地から${picks.map(c=>`『${c.name}』`).join("")}を手札へ戻した。`, "good");
        }
      }
      else if (eff.kind === "swapHandAndSubs") {
        // 換：手札＋サブを全て墓地→その枚数分ドロー
        const count = owner.hand.length + owner.subs.length;
        owner.grave.push(...owner.hand);
        owner.hand = [];
        for (const s of [...owner.subs]) {
          if (!s.noGrave) owner.grave.push(s);
          if (s.effect.kind === "eggBurst") { /* バースト発動 */ const n=MAX_HAND; const d=drawCards(owner,n); owner.hand.push(...d); }
          if (s.effect.kind === "timeBomb") applyDamage(owner, target, 2700, `『億』早期破棄`, false, true);
        }
        owner.subs = [];
        log(`${owner.label}の手札とサブを全て墓地へ（${count}枚）。`);
        const drawn = drawCards(owner, count);
        owner.hand.push(...drawn);
        log(`山札から${drawn.length}枚ドローした。`, "good");
      }
      else if (eff.kind === "halfDeckToGrave") {
        // 送：山札の半分を墓地へ
        let deck = owner.deck;
        if (deck.length % 2 !== 0) {
          const bonus = drawCards(owner, 1);
          owner.hand.push(...bonus);
          if (bonus.length) log(`『送』：奇数のため先に『${bonus[0].name}』を1枚引いた。`, "good");
          deck = owner.deck;
        }
        const half = Math.floor(deck.length / 2);
        const sent = deck.splice(0, half);
        owner.grave.push(...sent);
        log(`『送』：山札${half}枚を墓地へ送った。`);
      }
      else if (eff.kind === "shitsuAdaptive") {
        // 疾：自身のHPが90%以上か否かでダメージ・追加効果が変化
        const shitsuLB = getLimitBreak("shitsu", owner.isAI);
        const maxHp = getMaxHP(owner);
        const isHigh = owner.hp >= maxHp * 0.9;
        let dmg = isHigh ? eff.highValue : eff.lowValue;
        // 凸：『疾』4凸 - ダメージがHP90%以上[2400→3200]／90%未満[800→1600]
        if (shitsuLB >= 4) dmg = isHigh ? 3200 : 1600;
        log(`『${card.name}』：自HP${owner.hp}/${maxHp}（${isHigh ? "90%以上" : "90%未満"}）→${dmg}ダメージ`);
        const hit = applyDamage(owner, target, dmg, `『${card.name}』`, false, true);
        if (hit) applyMirrorOnce(owner, target, dmg);
        if (isHigh) {
          owner.elementCost = Math.min(ELEMENT_COST_MAX, (owner.elementCost || 0) + 9);
          log(`『${card.name}』でコストを9獲得した。`, "good");
        } else {
          const drawn = drawCards(owner, 2);
          owner.hand.push(...drawn);
          if (drawn.length) log(`『${card.name}』で山札から${drawn.length}枚引いた。`, "good");
        }
        // 凸：『疾』1凸 - 相手に「油」を付与する
        if (shitsuLB >= 1) {
          applyStatus(target, "oil", 1);
          log(`『${card.name}』の凸効果：${target.label}に「油」を付与した。`, "good");
        }
      }
      else if (eff.kind === "desperateDamage") {
        // 千：HPが半分以下なら強化ダメージ、それ以外通常
        const halfLine = Math.floor(getMaxHP(owner) / 2);
        let dmg = owner.hp <= halfLine ? eff.low : eff.normal;
        log(`『千』：自HP${owner.hp}${owner.hp<=halfLine?"≤"+halfLine+"（半分以下）：超強化！":"：通常"}→${dmg}ダメージ`);
        if (getLimitBreak("sen", owner.isAI) >= 4) {
          const before = dmg;
          dmg = Math.round(dmg * 1.3);
          if (dmg !== before) log(`『千』の凸効果でダメージが${before}→${dmg}に増加した。`, "good");
        }
        const hit = applyDamage(owner, target, dmg, `『${card.name}』`, false, true);
        if (hit) applyMirrorOnce(owner, target, dmg);
      }
      else if (eff.kind === "halfHpDamage") {
        // 割：相手HP半減、自分1000ダメ
        const wariLB = getLimitBreak("wari", owner.isAI);
        const selfDmg = wariLB >= 4 ? 1000 : eff.selfDmg;
        const dmg = Math.floor(target.hp / 2);
        log(`『割』：${target.label}のHPを半分（${dmg}）削る。自分は${selfDmg}ダメージ。`, "strong");
        target.hp = Math.max(0, target.hp - dmg);
        owner.hp = Math.max(0, owner.hp - selfDmg);
        checkWin();
      }
      // ── キングデッキ ──
      else if (eff.kind === "kingScaleDamage") {
        // 姫・臣：王がいるかでダメージ倍化
        let dmg = hasKing(owner) ? eff.withKing : eff.base;
        if (card.id === "hime" && getLimitBreak("hime", owner.isAI) >= 2) {
          dmg = hasKing(owner) ? 3200 : 1600;
        }
        log(`『${card.name}』：王${hasKing(owner) ? "あり" : "なし"} → ${dmg}ダメージ`);
        const hit = applyDamage(owner, target, dmg, `『${card.name}』`, false, true);
        if (hit) applyMirrorOnce(owner, target, dmg);
      }
      else if (eff.kind === "kanFetchKing") {
        // 冠：王がいなければサーチ、さらに最大7枚ドロー
        if (kingNotInHandOrSub(owner)) {
          const found = fetchKingTo(owner, "hand");
          if (!found) log(`『冠』：王は山札・墓地のどこにも見つからなかった。`);
        } else {
          log(`『冠』：王はすでに手札かサブにいる。`);
        }
        const need = Math.max(0, eff.drawCount - 0);
        const drawn = drawCards(owner, Math.min(need, MAX_HAND - owner.hand.length));
        owner.hand.push(...drawn);
        if (drawn.length) log(`『冠』：山札から${drawn.length}枚引いた。`, "good");
        // 凸：『冠』1凸 - 相手に1700ダメージを与える
        if (getLimitBreak("kanm", owner.isAI) >= 1) {
          const hit = applyDamage(owner, target, 1700, `『冠』の凸効果`, false, true);
          if (hit) applyMirrorOnce(owner, target, 1700);
        }
        // 凸：『冠』4凸 - サブフィールドか手札に「王」がいる場合、その「王」にノーマルビーコンを3つ付与する
        if (getLimitBreak("kanm", owner.isAI) >= 4) {
          const kingCard = owner.subs.find(c => c.id === "ou") || owner.hand.find(c => c.id === "ou");
          if (kingCard) {
            let granted = 0;
            for (let i = 0; i < 3; i++) {
              if (grantNormalBeacon(kingCard)) granted++;
            }
            if (granted > 0) log(`『冠』の凸効果：『王』にノーマルビーコンを${granted}個付与した。`, "good");
          }
        }
        // 冠：また、自身に「栄光」を1層付与する
        applyStatus(owner, "glory", 1);
      }
      else if (eff.kind === "takuCraft") {
        // 匠：☆2以上を1枚、王がいれば+2枚
        const pool = owner.deck.filter(c => c.rarity >= 2);
        const want = 1 + (hasKing(owner) ? 2 : 0);
        const drawn = [];
        for (const c of shuffle([...pool])) {
          if (drawn.length >= want) break;
          if (owner.hand.length + drawn.length >= MAX_HAND) break;
          const idx = owner.deck.findIndex(d => d.instanceId === c.instanceId);
          if (idx >= 0) drawn.push(owner.deck.splice(idx, 1)[0]);
        }
        owner.hand.push(...drawn);
        log(`『匠』：☆2以上のカードを${drawn.length}枚引いた。`, "good");
      }
      else if (eff.kind === "ishaDoctor") {
        const heal = hasKing(owner) ? eff.withKing : eff.base;
        healHp(owner, heal);
        log(`『医』：王${hasKing(owner) ? "あり" : "なし"} → HPを${heal}回復した。`, "good");
      }
      else if (eff.kind === "eiGuard") {
        // 衛：320×2、王がいれば+2回
        const totalHits = eff.baseHits + (hasKing(owner) ? eff.kingBonusHits : 0);
        log(`『衛』：王${hasKing(owner) ? "あり" : "なし"} → ${totalHits}回攻撃`);
        let mirrored = false;
        for (let i = 1; i <= totalHits; i++) {
          const hit = applyDamage(owner, target, eff.value, `『衛』${i}撃目`, false, true);
          if (hit && !mirrored) mirrored = applyMirrorOnce(owner, target, eff.value);
        }
      }
      else if (eff.kind === "onoAxe") {
        const hit = applyDamage(owner, target, eff.value, `『${card.name}』`, false, true);
        if (hit) applyMirrorOnce(owner, target, eff.value);
        const wood = target.subs.find(s => s.id === "wood");
        if (wood && checkWallProtection(target, wood)) moveSubToGrave(target, wood, "『斧』に破壊された");
      }
      else if (eff.kind === "tsueReveal") {
        const names = target.hand.length ? target.hand.map(c => `『${c.name}』`).join("、") : "（手札なし）";
        log(`『杖』：${target.label}の手札 → ${names}`, "strong");
      }
      else if (eff.kind === "stealSub") {
        if (target.subs.length === 0) {
          log(`相手のサブフィールドには何もない。`);
        } else {
          const destroyCount = Math.min(2, target.subs.length);
          for (let i = 0; i < destroyCount; i++) {
            if (target.subs.length === 0) break;
            const idx = Math.floor(Math.random() * target.subs.length);
            const destroyed = target.subs[idx];
            if (checkWallProtection(target, destroyed)) {
              moveSubToGrave(target, destroyed, "『盗』に破壊された");
            }
          }
        }
      }
      else if (eff.kind === "yumiBow") {
        const hit = applyDamage(owner, target, eff.value, `『${card.name}』`, false, true);
        if (hit) applyMirrorOnce(owner, target, eff.value);
        const arrow = owner.subs.find(s => s.effect.kind === "yaArrow");
        if (arrow) {
          const bonus = (arrow.elapsed || 0) * eff.multiplier;
          if (bonus > 0) applyDamage(owner, target, bonus, `『弓』追加効果`, false, true);
          moveSubToGrave(owner, arrow, "『弓』に破壊された");
        }
      }
      else if (eff.kind === "doCrossbow") {
        const hit = applyDamage(owner, target, eff.value, `『${card.name}』`, false, true);
        if (hit) applyMirrorOnce(owner, target, eff.value);
        const arrow = owner.subs.find(s => s.effect.kind === "yaArrow");
        if (arrow) {
          applyDamage(owner, target, eff.bonus, `『弩』追加効果`, false, true);
          moveSubToGrave(owner, arrow, "『弩』に破壊された");
        }
      }
      else if (eff.kind === "enSupport") {
        if (owner.hand.length >= MAX_HAND) {
          log(`『援』：手札が満杯で獲得できなかった。`);
        } else {
          const pickId = eff.choices[Math.floor(Math.random() * eff.choices.length)];
          const base = CARD_LIBRARY.find(c => c.id === pickId);
          const acquired = { ...base, instanceId: `${base.id}-${uid++}`, elapsed: 0, noGrave: true, noDirectDiscard: true, beacons: [] };
          owner.hand.push(acquired);
          log(`『援』：『${acquired.name}』を獲得した！（破棄時は消滅扱い）`, "good");
        }
      }
      else if (eff.kind === "zeiTax") {
        const want = owner.subs.length;
        const drawn = drawCards(owner, Math.min(want, MAX_HAND - owner.hand.length));
        owner.hand.push(...drawn);
        log(`『税』：サブ${owner.subs.length}枚分、${drawn.length}枚ドローした。`, "good");
      }
      else if (eff.kind === "hosiStar") {
        let pool = owner.deck.filter(c => c.rarity === 3);
        let fromGrave = false;
        if (pool.length === 0) { pool = owner.grave.filter(c => c.rarity === 3); fromGrave = true; }
        if (pool.length === 0) {
          log(`『星』：☆3のカードが山札・墓地どちらにもなかった。`);
        } else if (owner.hand.length >= MAX_HAND) {
          log(`『星』：手札が満杯で引けなかった。`);
        } else {
          const pick = pool[Math.floor(Math.random() * pool.length)];
          const srcArr = fromGrave ? owner.grave : owner.deck;
          const idx = srcArr.findIndex(c => c.instanceId === pick.instanceId);
          if (idx >= 0) srcArr.splice(idx, 1);
          owner.hand.push(pick);
          log(`『星』：${fromGrave ? "墓地" : "山札"}から『${pick.name}』を引いた。`, "good");
        }
      }
      else if (eff.kind === "maDevil") {
        const subCount = owner.subs.length;
        const maLB = getLimitBreak("ma", owner.isAI);
        const baseValue = maLB >= 1 ? 1500 : eff.value;
        let total = baseValue + subCount * eff.perSub;
        if (maLB >= 2 && subCount > 0) {
          const before = total;
          total = Math.round(total * (1 + 0.15 * subCount));
          if (total !== before) log(`『魔』の凸効果：サブ${subCount}枚分でダメージが${before}→${total}に増加した。`, "good");
        }
        log(`『魔』：基本${baseValue}＋サブ${subCount}枚×${eff.perSub}＝${total}ダメージ（サブは全破棄）`);
        const hit = applyDamage(owner, target, total, `『${card.name}』`, false, true);
        if (hit) applyMirrorOnce(owner, target, total);
        for (const s of [...owner.subs]) {
          // 凸：『魔』4凸 - 他の☆3カードはこの破壊の影響を受けない
          if (maLB >= 4 && s.rarity === 3 && s.id !== "ma") continue;
          moveSubToGrave(owner, s, "『魔』の代償で破棄");
        }
      }
      else if (eff.kind === "houCollapse") {
        let discardedCount = 0;
        for (const o of [owner, target]) {
          if (o.hand.length) { discardedCount += o.hand.length; o.grave.push(...o.hand); log(`${o.label}の手札${o.hand.length}枚が強制破棄された。`); o.hand = []; }
          for (const s of [...o.subs]) { discardedCount++; moveSubToGrave(o, s, "『崩』により強制破棄"); }
        }
        const houkLB = getLimitBreak("houk", owner.isAI);
        // 凸：『崩』1凸 - 山札からカードを1枚引く
        if (houkLB >= 1) {
          const drawn = drawCards(owner, Math.min(1, MAX_HAND - owner.hand.length));
          owner.hand.push(...drawn);
          if (drawn.length) log(`『崩』の凸効果：山札から${drawn.length}枚引いた。`, "good");
        }
        // 凸：『崩』2凸 - 自身のHPを破棄したカードの枚数×150回復する
        if (houkLB >= 2 && discardedCount > 0) {
          const healValue = discardedCount * 150;
          healHp(owner, healValue);
          log(`『崩』の凸効果：破棄${discardedCount}枚分、HPを${healValue}回復した。`, "good");
        }
        // 凸：『崩』4凸 - 相手に破棄したカードの枚数×300のダメージを与える
        if (houkLB >= 4 && discardedCount > 0) {
          const dmg = discardedCount * 300;
          const hit = applyDamage(owner, target, dmg, `『崩』の凸効果`, false, true);
          if (hit) applyMirrorOnce(owner, target, dmg);
        }
        // 崩：また、自身と相手にある状態異常も全て除去する（栄光・月照も含む）
        clearStatusEffects(owner, true);
        clearStatusEffects(target, true);
      }
      else if (eff.kind === "kouEmperor") {
        const lastEnemyMain = target.lastMains[target.lastMains.length - 1];
        if (!lastEnemyMain) {
          log(`『皇』：相手はまだメインカードを使用していない。`);
        } else if (lastEnemyMain.effect.kind === "kouEmperor") {
          log(`『皇』：相手の最後のメインカードが『皇』のため、効果は無効。`);
        } else {
          log(`『皇』：相手の『${lastEnemyMain.name}』の効果を再現する！`, "strong");
          // 凸：『皇』4凸 - このカードによって再現したカードの与えるダメージ+30%
          if (getLimitBreak("kou", owner.isAI) >= 4) owner._kouReplayBoostPercent = 30;
          resolveMain(owner, lastEnemyMain);
          owner._kouReplayBoostPercent = 0;
        }
      }
      // ── トリックデッキ ──
      else if (eff.kind === "rangeDamage") {
        // 凸：『愉』2凸/4凸 - 与える乱数ダメージの範囲が変化する
        let rMin = eff.min, rMax = eff.max;
        if (card.id === "yu2") {
          const yuLv = getLimitBreak("yu2", owner.isAI);
          if (yuLv >= 4) { rMin = 2000; rMax = 5000; }
          else if (yuLv >= 2) { rMin = 2000; rMax = 4000; }
        }
        const dmg = rollRangeDamage(owner, rMin, rMax);
        log(`『${card.name}』：乱数${rMin}～${rMax} → ${dmg}ダメージ`);
        const hit = applyDamage(owner, target, dmg, `『${card.name}』`, false, true);
        if (hit) applyMirrorOnce(owner, target, dmg);
      }
      else if (eff.kind === "rangeMultiDamage") {
        // 凸：『悦』1凸/2凸/4凸
        let rMin = eff.min, rMax = eff.max;
        let etsuHeal = false, etsuForceMax = false;
        if (card.id === "etsu") {
          const etsuLv = getLimitBreak("etsu", owner.isAI);
          if (etsuLv >= 1) { rMin = 300; rMax = 1000; }
          if (etsuLv >= 2) etsuHeal = true;
          if (etsuLv >= 4) etsuForceMax = true;
        }
        const forcedHit = etsuForceMax ? Math.floor(Math.random() * eff.hits) + 1 : -1;
        for (let i = 1; i <= eff.hits; i++) {
          const dmg = (i === forcedHit) ? rMax : rollRangeDamage(owner, rMin, rMax);
          const hit = applyDamage(owner, target, dmg, `『${card.name}』${i}撃目`, false, true);
          if (hit) {
            applyMirrorOnce(owner, target, dmg);
            if (etsuHeal) {
              const heal = 200 + Math.floor(Math.random() * 201); // 200〜400
              healHp(owner, heal);
              log(`『悦』の凸効果：${owner.label}のHPを${heal}回復した。`, "good");
            }
          }
        }
      }
      else if (eff.kind === "fillWithGuest") {
        // 凸：『笑』4凸 - 与えるダメージが[888→1888]となる
        const shoLv = card.id === "sho2" ? getLimitBreak("sho2", owner.isAI) : 0;
        const shoDmg = shoLv >= 4 ? 1888 : eff.value;
        const hit = applyDamage(owner, target, shoDmg, `『${card.name}』`, false, true);
        if (hit) applyMirrorOnce(owner, target, shoDmg);
        // 既存サブを破棄（壁チェックあり）してから「客」で埋める
        for (const s of [...target.subs]) {
          if (checkWallProtection(target, s)) {
            moveSubToGrave(target, s, "『笑』に破棄された");
          } else {
            // 壁で防がれた場合はそれ以上の破棄を中断
            break;
          }
        }
        const limit = getSubLimit(target);
        let filled = 0;
        while (target.subs.length < limit) {
          target.subs.push(makeSpecial("guest"));
          filled++;
        }
        if (filled > 0) log(`${target.label}のサブフィールドが『客』${filled}枚で満たされた！`, "strong");
        // 凸：『笑』1凸 - 相手の全ての手札にランダムなトラブルビーコンを1つ付与する
        if (shoLv >= 1) {
          let granted = 0;
          target.hand.forEach(c => { if (grantBeacon(c, 1)) granted++; });
          if (granted > 0) log(`『笑』の凸効果：${target.label}の手札${granted}枚にトラブルビーコンを付与した。`, "good");
        }
        // 凸：『笑』2凸 - 自身のHPを888回復する
        if (shoLv >= 2) {
          healHp(owner, 888);
          log(`『笑』の凸効果：${owner.label}のHPを888回復した。`, "good");
        }
      }
      else if (eff.kind === "rangeHeal") {
        const heal = rollRangeDamage(owner, eff.min, eff.max);
        healHp(owner, heal);
        log(`『${card.name}』：HPを${heal}回復した。`, "good");
      }
      else if (eff.kind === "rangeDamageHealSelf") {
        const dmg = rollRangeDamage(owner, eff.min, eff.max);
        const hit = applyDamage(owner, target, dmg, `『${card.name}』`, false, true);
        if (hit) {
          applyMirrorOnce(owner, target, dmg);
          healHp(owner, dmg);
          log(`『${card.name}』：与えた${dmg}ダメージ分、自身のHPを回復した。`, "good");
        }
      }
      else if (eff.kind === "probDamage") {
        // 凸：『博』1凸/2凸/4凸
        const hakuLv = card.id === "haku" ? getLimitBreak("haku", owner.isAI) : 0;
        const choices = (hakuLv >= 2) ? eff.choices.filter(v => v !== 0) : eff.choices;
        let dmg = choices[Math.floor(Math.random() * choices.length)];
        log(`『${card.name}』の確率ダメージ：${choices.join("・")}の中から${dmg}！`);
        if (hakuLv >= 4) {
          const boosted = Math.round(dmg * 1.2);
          log(`『博』の凸効果：与えるダメージが${dmg}→${boosted}に増加した。`, "good");
          dmg = boosted;
        }
        const hit = applyDamage(owner, target, dmg, `『${card.name}』`, false, true);
        if (hit) {
          applyMirrorOnce(owner, target, dmg);
          if (hakuLv >= 1 && dmg > 0) {
            healHp(owner, dmg);
            log(`『博』の凸効果：与えたダメージ分（${dmg}）、自身のHPを回復した。`, "good");
          }
        }
      }
      else if (eff.kind === "probDamageRestoreDice") {
        const dmg = eff.choices[Math.floor(Math.random() * eff.choices.length)];
        log(`『${card.name}』の確率ダメージ：${eff.choices.join("・")}の中から${dmg}！`);
        const hit = applyDamage(owner, target, dmg, `『${card.name}』`, false, true);
        if (hit) applyMirrorOnce(owner, target, dmg);
        if (hasDiceEffect(owner) && owner.diceUsesLeft < DICE_MAX_USES) {
          owner.diceUsesLeft += 1;
          log(`『${card.name}』：サイコロの使用可能回数が1回復した（残り${owner.diceUsesLeft}/${DICE_MAX_USES}）。`, "good");
        }
      }
      // ── トリックデッキ（後半） ──
      else if (eff.kind === "noEffect") {
        log(`『${card.name}』：効果なし。ハズレ！`);
      }
      else if (eff.kind === "coinDamage") {
        const win = chanceRoll(0.5);
        const dmg = win ? eff.bonus : eff.base;
        log(`『${card.name}』：コイン${win ? "勝ち" : "通常"} → ${dmg}ダメージ`);
        const hit = applyDamage(owner, target, dmg, `『${card.name}』`, false, true);
        if (hit) applyMirrorOnce(owner, target, dmg);
      }
      else if (eff.kind === "kiOdd") {
        const hit = applyDamage(owner, target, eff.value, `『${card.name}』`, false, true);
        if (hit) applyMirrorOnce(owner, target, eff.value);
        if (owner.diceUsedThisTurn || owner.diceUsedLastTurn) {
          log(`『奇』の効果：サイコロを振った効果をもう一度発動！`, "strong");
          // 直近に振った結果のうち、HP増減等は再現困難なため代表効果（ダメージ系）として⑤相当を再現
          doRollDice(owner, false);
        } else {
          log(`『奇』：サイコロを振っていないため追加効果なし。`);
        }
      }
      else if (eff.kind === "handCountDamage") {
        const bonus = owner.hand.length * eff.perCard;
        const total = eff.base + bonus;
        log(`『鬼』：基本${eff.base}＋手持ち${owner.hand.length}枚×${eff.perCard}＝${total}ダメージ`);
        const hit = applyDamage(owner, target, total, `『${card.name}』`, false, true);
        if (hit) applyMirrorOnce(owner, target, total);
      }
      else if (eff.kind === "drawRarityDamage") {
        const drawn = drawCards(owner, 1);
        if (drawn.length === 0) {
          log(`『籤』：山札にカードがなく引けなかった。`);
        } else {
          const picked = drawn[0];
          owner.hand.push(picked);
          const dmg = picked.rarity * eff.multiplier;
          log(`『籤』：『${picked.name}』（☆${picked.rarity}）を引いた → ${dmg}ダメージ`);
          const hit = applyDamage(owner, target, dmg, `『${card.name}』`, false, true);
          if (hit) applyMirrorOnce(owner, target, dmg);
        }
      }
      else if (eff.kind === "splitHp") {
        const totalHp = owner.hp + target.hp;
        const half = Math.floor(totalHp / 2);
        owner.hp = half;
        target.hp = half;
        log(`『分』：HPを合算（${totalHp}）し、双方${half}に均等化した。`, "strong");
        checkWin();
      }
      else if (eff.kind === "discardHandHealSelf") {
        const count = target.hand.length;
        if (count > 0) {
          target.grave.push(...target.hand);
          target.hand = [];
        }
        const heal = count * eff.multiplier;
        healHp(target, heal);
        log(`『労』：${target.label}の手札${count}枚を破棄させ、相手のHPを${heal}回復した。`, "good");
      }
      else if (eff.kind === "forceDrawDamage") {
        const need = MAX_HAND - target.hand.length;
        const drawn = drawCards(target, need);
        target.hand.push(...drawn);
        const dmg = drawn.length * eff.multiplier;
        log(`『塩』：${target.label}に${drawn.length}枚引かせた → ${dmg}ダメージ`);
        const hit = applyDamage(owner, target, dmg, `『${card.name}』`, false, true);
        if (hit) applyMirrorOnce(owner, target, dmg);
      }
      else if (eff.kind === "sacrificeHp") {
        const cost = Math.floor(owner.hp * eff.ratio);
        owner.hp = Math.max(0, owner.hp - cost);
        log(`『償』：自身のHPを${cost}消費した。`, "strong");
        const hit = applyDamage(owner, target, cost, `『${card.name}』`, false, true);
        if (!hit) {
          healHp(owner, cost);
          log(`攻撃が防がれたため、消費した${cost}のHPが返還された。`, "good");
        } else {
          applyMirrorOnce(owner, target, cost);
        }
        checkWin();
      }
      else if (eff.kind === "addVoidCards") {
        for (let i = 0; i < eff.count; i++) {
          const muBase = CARD_LIBRARY.find(c => c.id === "mu");
          target.deck.push({ ...muBase, instanceId: `mu-extra-${uid++}`, elapsed: 0 });
        }
        target.deck = shuffle(target.deck);
        log(`『空』：${target.label}の山札に『無』を${eff.count}枚追加した。`, "good");
      }
      else if (eff.kind === "heavenDamage") {
        // 凸：『天』4凸 - 使用する度に与えるダメージが300ずつ増加する
        const tenLv = card.id === "ten" ? getLimitBreak("ten", owner.isAI) : 0;
        let tenDmg = eff.value;
        if (tenLv >= 4) {
          card._tenUses = (card._tenUses || 0) + 1;
          tenDmg = eff.value + 300 * (card._tenUses - 1);
          if (card._tenUses > 1) log(`『天』の凸効果：使用回数${card._tenUses}回目、ダメージが${tenDmg}に増加した。`, "good");
        }
        const hit = applyDamage(owner, target, tenDmg, `『${card.name}』`, false, true);
        if (hit) applyMirrorOnce(owner, target, tenDmg);
      }
      else if (eff.kind === "godCombo") {
        // 凸：『神』4凸 - 与えるダメージが[1600→3200]となる
        const kamiLv = card.id === "kami" ? getLimitBreak("kami", owner.isAI) : 0;
        const kamiDmg = kamiLv >= 4 ? eff.value * 2 : eff.value;
        const hit = applyDamage(owner, target, kamiDmg, `『${card.name}』`, false, true);
        if (hit) applyMirrorOnce(owner, target, kamiDmg);
        const drawn = drawCards(owner, eff.draw);
        owner.hand.push(...drawn);
        healHp(owner, eff.heal);
        log(`『神』：${drawn.length}枚ドロー＋HPを${eff.heal}回復した。`, "good");
        // 凸：『神』2凸 - 手札にあるカード全てにランダムなノーマルビーコンを1つずつ付与する
        if (kamiLv >= 2) {
          let granted = 0;
          owner.hand.forEach(c => { if (grantNormalBeacon(c)) granted++; });
          if (granted > 0) log(`『神』の凸効果：手札${granted}枚にノーマルビーコンを付与した。`, "good");
        }
      }
      // ── シンセサイズデッキ ──
      else if (eff.kind === "damageBlockNextSub") {
        const hit = applyDamage(owner, target, eff.value, `『${card.name}』`, false, true);
        if (hit) {
          applyMirrorOnce(owner, target, eff.value);
          target._subBlockedNextTurn = true;
          log(`『${card.name}』：${target.label}は次のターン、サブカードを出せなくなる。`, "strong");
        }
      }
      else if (eff.kind === "destroySubsDamage") {
        const count = target.subs.length;
        for (const s of [...target.subs]) {
          if (checkWallProtection(target, s)) moveSubToGrave(target, s, `『${card.name}』に破棄された`);
        }
        const dmg = count * eff.perCard;
        if (count > 0) log(`『${card.name}』：${target.label}のサブ${count}枚を破棄させた → ${dmg}ダメージ`);
        const hit = applyDamage(owner, target, dmg, `『${card.name}』`, false, true);
        if (hit) applyMirrorOnce(owner, target, dmg);
        // 燃：また、相手に「火傷」を1層付与する
        applyStatus(target, "burn", 1);
      }
      else if (eff.kind === "decomposeSynthCard") {
        const synthCards = owner.hand.filter(c => c.synthSources);
        if (synthCards.length === 0) {
          log(`『${card.name}』：手札に分解できる合成カードがなかった。`);
        } else {
          // 古い方（先頭）を分解
          const target2 = synthCards[0];
          decomposeSynthCard(owner, target2, true);
        }
      }
      else if (eff.kind === "damageDeckToGrave") {
        let dmg = eff.value;
        // 凸：『獄』2凸 - 与えるダメージが[1300→2600]となる
        if (card.id === "goku" && getLimitBreak("goku", owner.isAI) >= 2) dmg = 2600;
        const hit = applyDamage(owner, target, dmg, `『${card.name}』`, false, true);
        if (hit) applyMirrorOnce(owner, target, dmg);
        const moveCount = Math.min(eff.count, target.deck.length);
        const moved = target.deck.splice(0, moveCount);
        target.grave.push(...moved);
        if (moveCount > 0) {
          log(`『${card.name}』：${target.label}の山札から${moveCount}枚を墓地へ送った。`);
          // 凸：『獄』1凸 - 墓地へ送ったカードにトラブルビーコンを1つずつ付与する
          if (card.id === "goku" && getLimitBreak("goku", owner.isAI) >= 1) {
            moved.forEach(c => grantBeacon(c, 1));
            log(`『獄』の凸効果：墓地へ送ったカードにトラブルビーコンを付与した。`, "good");
          }
        }
        // 凸：『獄』4凸 - 自身のHPを1300回復する
        if (card.id === "goku" && getLimitBreak("goku", owner.isAI) >= 4) {
          healHp(owner, 1300);
          log(`『獄』の凸効果：${owner.label}のHPを1300回復した。`, "good");
        }
      }
      else if (eff.kind === "warDamage") {
        const bonus = owner.deck.length * eff.perDeck;
        const total = eff.base + bonus;
        log(`『${card.name}』：基本${eff.base}＋山札${owner.deck.length}枚×${eff.perDeck}＝${total}ダメージ`);
        const hit = applyDamage(owner, target, total, `『${card.name}』`, false, true);
        if (hit) applyMirrorOnce(owner, target, total);
      }
      else if (eff.kind === "synthCombo") {
        resolveSynthComboParts(owner, card, target);
      }
      else if (eff.kind === "graveToDeckAll") {
        const count = owner.grave.length;
        owner.deck.push(...owner.grave.splice(0).map(c => ({ ...c, elapsed: 0 })));
        owner.deck = shuffle(owner.deck);
        if (count > 0) log(`『${card.name}』の素材効果：墓地の${count}枚を山札へ戻した。`, "good");
        if (!owner.isAI && count > 0 && game && game.stats) {
          maybeNotifyMissionProgressUpdate(() => {
            game.stats.graveResetCount = (game.stats.graveResetCount || 0) + 1; // ミッション用：墓地リセット回数
          });
        }
      }
      // ── シンセサイズデッキ追加カード ──
      else if (eff.kind === "resetSubTimers") {
        for (const s of owner.subs) {
          s.elapsed = 0;
          if (typeof s.maxTriggers === "number") s.elapsed = 0;
        }
        log(`『${card.name}』：自軍サブ${owner.subs.length}枚の経過ターン・使用回数をリセットした。`, "good");
      }
      else if (eff.kind === "purgeRarity3Deck") {
        const purged = target.deck.filter(c => c.rarity === 3);
        target.deck = target.deck.filter(c => c.rarity !== 3);
        target.grave.push(...purged);
        log(`『${card.name}』：${target.label}の山札から☆3カード${purged.length}枚を墓地へ送った。`);
        owner.hp = Math.max(0, owner.hp - eff.selfDamage);
        log(`『${card.name}』の反動で${owner.label}が${eff.selfDamage}ダメージを受けた。`, "strong");
        checkWin();
      }
      else if (eff.kind === "damageDestroyOneSub") {
        const hit = applyDamage(owner, target, eff.value, `『${card.name}』`, false, true);
        if (hit) applyMirrorOnce(owner, target, eff.value);
        if (target.subs.length > 0) {
          const victim = target.subs[0];
          moveSubToGrave(target, victim, `『${card.name}』に破棄された`);
        }
      }
      else if (eff.kind === "damagePlusLastTaken") {
        const isEn3 = card.id === "en3";
        const enLB = isEn3 ? getLimitBreak("en3", owner.isAI) : 0;
        const bonus = owner._damageTakenLastTurn || 0;
        let total = eff.base + bonus;
        // 凸：『焔』4凸 - 与えるダメージ+30%
        if (enLB >= 4) total = Math.round(total * 1.3);
        log(`『${card.name}』：基本${eff.base}＋前ターン被ダメージ${bonus}＝${total}ダメージ`);
        const hit = applyDamage(owner, target, total, `『${card.name}』`, false, true);
        if (hit) applyMirrorOnce(owner, target, total);
        // 焔：また、相手に「火傷」を2層付与する（凸：1凸で3層に強化）
        applyStatus(target, "burn", enLB >= 1 ? 3 : 2);
        // 凸：『焔』1凸 - 相手に「油」を付与する
        if (enLB >= 1) applyStatus(target, "oil", 1);
        // 凸：『焔』2凸 - 山札からカードを2枚引く
        if (enLB >= 2) {
          const drawn = drawCards(owner, Math.min(2, MAX_HAND - owner.hand.length));
          owner.hand.push(...drawn);
          if (drawn.length > 0) log(`『焔』の凸効果：山札から${drawn.length}枚引いた。`, "good");
        }
      }
      else if (eff.kind === "repeatLastMain") {
        const history = owner.lastMains || [];
        const prev = history[history.length - 2]; // 末尾は狐自身なので、その1つ前
        if (!prev) {
          log(`『${card.name}』：前のターンで出したカードがなく、発動しなかった。`);
        } else if (repeatMainChainDepth >= 2) {
          // 『改』などで狐入りの合成カードが手札に戻り、狐が狐自身（を含むカード）を
          // 無限に再発動してしまう連鎖を防止する安全装置
          log(`『${card.name}』：効果の連鎖が深すぎるため、これ以上発動しなかった。`, "strong");
        } else {
          log(`『${card.name}』：前のターンの『${prev.name}』の効果を再発動！`, "strong");
          repeatMainChainDepth++;
          // 凸：『狐』4凸 - このカードによって再発動したカードの与えるダメージ+50%
          const boosted = card.id === "kitsune" && getLimitBreak("kitsune", owner.isAI) >= 4;
          if (boosted) owner._kitsuneRepeatBoostPercent = 50;
          try {
            resolveMain(owner, prev);
          } finally {
            repeatMainChainDepth--;
            if (boosted) owner._kitsuneRepeatBoostPercent = 0;
          }
        }
      }
      else if (eff.kind === "trialDraw") {
        let totalDiscarded = owner.hand.length;
        owner.grave.push(...owner.hand);
        owner.hand = [];
        let success = false;
        let guardCount = 0;
        while (!success && guardCount < 6) {
          guardCount++;
          recycleIfNeeded(owner, MAX_HAND);
          if (owner.deck.length === 0) break;
          const batch = [];
          let foundRarity3 = false;
          while (batch.length < MAX_HAND && owner.deck.length > 0) {
            const c = owner.deck.shift();
            batch.push(c);
            if (c.rarity === 3) { foundRarity3 = true; break; }
          }
          if (batch.length === 0) break;
          if (foundRarity3) {
            const picked = batch[batch.length - 1];
            const discardedInBatch = batch.slice(0, -1);
            owner.hand.push(picked);
            owner.grave.push(...discardedInBatch);
            totalDiscarded += discardedInBatch.length;
            let dmg = totalDiscarded * eff.multiplier;
            // 凸：『極』2凸 - 与えるダメージ+20%
            if (card.id === "goku2" && getLimitBreak("goku2", owner.isAI) >= 2) dmg = Math.round(dmg * 1.2);
            log(`『${card.name}』：ここまでで合計${totalDiscarded}枚捨てて☆3『${picked.name}』を引き当てた → ${dmg}ダメージ`, "strong");
            const hit = applyDamage(owner, target, dmg, `『${card.name}』`, false, true);
            if (hit) applyMirrorOnce(owner, target, dmg);
            // 凸：『極』1凸 - 引いた☆3カードにノーマルビーコンを3つ付与する
            if (card.id === "goku2" && getLimitBreak("goku2", owner.isAI) >= 1) {
              for (let i = 0; i < 3; i++) grantNormalBeacon(picked);
              log(`『極』の凸効果：『${picked.name}』にノーマルビーコンを付与した。`, "good");
            }
            success = true;
          } else {
            log(`『${card.name}』：${batch.length}枚引いたが☆3が出ず、破棄して引き直す。`);
            owner.grave.push(...batch);
            totalDiscarded += batch.length;
          }
        }
        if (!success) log(`『${card.name}』：山札が尽きたため発動しなかった。`);
      }
      else if (eff.kind === "hpScaledChance") {
        const isKai5 = card.id === "kai5";
        const kai5LB = isKai5 ? getLimitBreak("kai5", owner.isAI) : 0;
        const maxHp = getMaxHP(owner);
        const missingPercent = Math.max(0, ((maxHp - owner.hp) / maxHp) * 100);
        // 凸：『回』4凸 - 初期確率が[1%→5%]となる
        const baseChance = kai5LB >= 4 ? 5 : eff.baseChance;
        const chance = Math.min(100, baseChance + missingPercent);
        const triggered = chanceRoll(chance / 100);
        log(`『${card.name}』：発動確率${chance.toFixed(1)}%${triggered ? "（発動）" : "（不発）"}`);
        if (triggered) {
          const hit = applyDamage(owner, target, eff.value, `『${card.name}』`, false, true);
          if (hit) applyMirrorOnce(owner, target, eff.value);
        } else {
          log(`『${card.name}』：発動しなかったため、ダメージは与えられなかった。`);
        }
        // 凸：『回』1凸 - 99%の確率で相手に1000ダメージ。HPが1%減るごとに確率-1%。既存の5000ダメージと重複可
        if (kai5LB >= 1) {
          const chance2 = Math.max(0, 99 - missingPercent);
          const triggered2 = chanceRoll(chance2 / 100);
          log(`『回』の凸効果：発動確率${chance2.toFixed(1)}%${triggered2 ? "（発動）" : "（不発）"}`);
          if (triggered2) {
            const hit2 = applyDamage(owner, target, 1000, `『回』の凸効果`, false, true);
            if (hit2) applyMirrorOnce(owner, target, 1000);
          }
        }
        // 凸：『回』2凸 - 相手に「脆弱」を2層付与する
        if (kai5LB >= 2) applyStatus(target, "fragile", 2);
      }
      else if (eff.kind === "damageAndHeal") {
        const hit = applyDamage(owner, target, eff.damage, `『${card.name}』`, false, true);
        if (hit) applyMirrorOnce(owner, target, eff.damage);
        healHp(owner, eff.heal);
        log(`『${card.name}』：HPを${eff.heal}回復した。`, "good");
      }
      else if (eff.kind === "gekokuRevolution") {
        const gekokuLB = getLimitBreak("gekoku", owner.isAI);
        const revoAmount = gekokuLB >= 4 ? 20 : eff.revolutionAmount;
        applyStatus(owner, "revolution", revoAmount);
        // 凸：『克』1凸 - 自身に「栄光」を1層付与する
        if (gekokuLB >= 1) applyStatus(owner, "glory", 1);
        const picked = [];
        for (let i = owner.deck.length - 1; i >= 0 && picked.length < eff.drawCount; i--) {
          if (owner.deck[i].rarity === eff.drawRarity) picked.push(...owner.deck.splice(i, 1));
        }
        const room = MAX_HAND - owner.hand.length;
        owner.hand.push(...picked.slice(0, room));
        if (picked.length > room) owner.grave.push(...picked.slice(room));
        if (picked.length > 0) {
          log(`『${card.name}』：山札から☆${eff.drawRarity}カードを${picked.length}枚引いた。`, "good");
        } else {
          log(`『${card.name}』：山札に☆${eff.drawRarity}カードがなかった。`);
        }
      }
      else if (eff.kind === "drawRarity3") {
        const idx = owner.deck.findIndex(c => c.rarity === 3);
        if (idx < 0) {
          log(`『${card.name}』の素材効果：山札に☆3カードがなかった。`);
        } else {
          const [picked] = owner.deck.splice(idx, 1);
          if (owner.hand.length < MAX_HAND) {
            owner.hand.push(picked);
            log(`『${card.name}』の素材効果：☆3『${picked.name}』を引いた。`, "good");
          } else {
            owner.grave.push(picked);
            log(`『${card.name}』の素材効果：☆3『${picked.name}』を引いたが手札が満杯のため墓地へ。`);
          }
        }
      }
      else if (eff.kind === "drawSubCards") {
        const picked = [];
        for (let i = owner.deck.length - 1; i >= 0 && picked.length < eff.count; i--) {
          if (owner.deck[i].type === "sub") picked.push(...owner.deck.splice(i, 1));
        }
        const room = MAX_HAND - owner.hand.length;
        owner.hand.push(...picked.slice(0, room));
        if (picked.length > room) owner.grave.push(...picked.slice(room));
        log(`『${card.name}』の素材効果：サブカードを${picked.length}枚引いた。`, "good");
      }
      else if (eff.kind === "drawUpTo") {
        const room = Math.max(0, MAX_HAND - owner.hand.length);
        const count = Math.min(eff.count, room);
        const drawn = drawCards(owner, count);
        owner.hand.push(...drawn);
        log(`『${card.name}』の素材効果：${drawn.length}枚引いた。`, "good");
      }
      // ── コインデッキ ──
      else if (eff.kind === "damageSummonSub") {
        const hit = applyDamage(owner, target, eff.value, `『${card.name}』`, false, true);
        if (hit) applyMirrorOnce(owner, target, eff.value);
        if (target.subs.length < getSubLimit(target)) {
          const summon = makeSpecial(eff.summonKey);
          target.subs.push(summon);
          log(`${owner.label}が${target.label}のサブに『${summon.name}』を召喚した！`, "strong");
          // 寒：召喚された時、自身（＝寒の持ち主となったtarget）に「悪寒」を1層付与する
          if (eff.summonKey === "kan3") applyStatus(target, "chill", 1);
        } else {
          log(`${target.label}のサブフィールドが満杯で召喚できなかった。`);
        }
        // 雪：また、相手に「悪寒」を2層付与する
        if (card.id === "yuki") applyStatus(target, "chill", 2);
      }
      else if (eff.kind === "coinCountDamage") {
        const lb = getLimitBreak(card.id, owner.isAI);
        const multiplier = lb >= 4 ? 15 : eff.multiplier;
        const dmg = (owner.coins || 0) * multiplier;
        log(`『${card.name}』：所持コイン${owner.coins || 0}枚×${multiplier}＝${dmg}ダメージ`);
        const hit = applyDamage(owner, target, Math.max(dmg, 0), `『${card.name}』`, false, true);
        if (hit) applyMirrorOnce(owner, target, dmg);
      }
      else if (eff.kind === "coinGainPercent") {
        const gained = Math.floor((owner.coins || 0) * (eff.percent / 100));
        gainCoins(owner, gained);
        log(`『${card.name}』：コインを${gained}枚獲得した。`, "good");
      }
      else if (eff.kind === "discardHandGainCoin") {
        const discarded = [...owner.hand];
        owner.hand = [];
        owner.grave.push(...discarded);
        const starTotal = discarded.reduce((sum, c) => sum + c.rarity, 0);
        const gained = starTotal * eff.multiplier;
        gainCoins(owner, gained);
        log(`『${card.name}』：手札${discarded.length}枚を破棄し、☆合計${starTotal}×${eff.multiplier}＝${gained}コインを獲得した。`, "good");
      }
      else if (eff.kind === "damageDestroyAllSubs") {
        const lb = getLimitBreak(card.id, owner.isAI);
        const value = lb >= 4 ? 2400 : eff.value;
        const hit = applyDamage(owner, target, value, `『${card.name}』`, false, true);
        if (hit) applyMirrorOnce(owner, target, value);
        const count = target.subs.length;
        for (const s of [...target.subs]) {
          if (checkWallProtection(target, s)) moveSubToGrave(target, s, `『${card.name}』に破壊された`);
        }
        if (count > 0) log(`『${card.name}』：${target.label}のサブ${count}枚を全て破壊した。`);
        // 凸：『晴』1凸 - 相手に「火傷」を1層付与する
        if (lb >= 1) applyStatus(target, "burn", 1);
        // 凸：『晴』2凸 - 破壊したサブカードの枚数分、追加で300ダメージを与える
        if (lb >= 2 && count > 0) {
          const bonus = count * 300;
          const hit2 = applyDamage(owner, target, bonus, `『${card.name}』（破壊ボーナス）`, false, true);
          if (hit2) applyMirrorOnce(owner, target, bonus);
        }
      }
      else if (eff.kind === "drawGainCoin") {
        const lb = getLimitBreak(card.id, owner.isAI);
        const count = lb >= 4 ? 5 : eff.count;
        const coin = lb >= 2 ? 160 : eff.coin;
        const drawn = drawCards(owner, Math.min(count, MAX_HAND - owner.hand.length));
        owner.hand.push(...drawn);
        gainCoins(owner, coin);
        log(`『${card.name}』：${drawn.length}枚引き、コインを${coin}枚獲得した。`, "good");
      }
      else if (eff.kind === "healGainCoinRandom") {
        const lb = getLimitBreak(card.id, owner.isAI);
        const heal = lb >= 1 ? 1200 : eff.heal;
        healHp(owner, heal);
        const gained = eff.min + Math.floor(Math.random() * (eff.max - eff.min + 1));
        gainCoins(owner, gained);
        log(`『${card.name}』：HPを${heal}回復し、コインを${gained}枚獲得した。`, "good");
        // 凸：『宝』4凸 - 自身に「栄光」を1層付与する
        if (lb >= 4) applyStatus(owner, "glory", 1);
      }
      else if (eff.kind === "gainCoinFlat") {
        gainCoins(owner, eff.coin);
        log(`『${card.name}』：コインを${eff.coin}枚獲得した。`, "good");
      }
      else if (eff.kind === "healByCoinCount") {
        const heal = (owner.coins || 0) * eff.multiplier;
        healHp(owner, heal);
        log(`『${card.name}』：所持コイン${owner.coins || 0}枚×${eff.multiplier}＝HPを${heal}回復した。`, "good");
      }
      else if (eff.kind === "randomMysteryEffect") {
        const choice = Math.floor(Math.random() * 4);
        if (choice === 0) {
          const hit = applyDamage(owner, target, 750, `『${card.name}』`, false, true);
          if (hit) applyMirrorOnce(owner, target, 750);
          log(`『${card.name}』：謎の力が相手に750ダメージを与えた！`, "good");
        } else if (choice === 1) {
          healHp(owner, 500);
          log(`『${card.name}』：謎の力でHPが500回復した。`, "good");
        } else if (choice === 2) {
          owner.hp = Math.max(0, owner.hp - 1000);
          log(`『${card.name}』：謎の力が自身に1000ダメージを与えた。`, "strong");
          checkWin();
        } else {
          const drawn = drawCards(owner, Math.min(2, MAX_HAND - owner.hand.length));
          owner.hand.push(...drawn);
          log(`『${card.name}』：謎の力で${drawn.length}枚ドローした。`, "good");
        }
      }
      else if (eff.kind === "damageConditionalDestroySumi") {
        const sumiOwnerCard = owner.subs.find(s => s.id === "sumi");
        const sumiTargetCard = target.subs.find(s => s.id === "sumi");
        const boosted = !!(sumiOwnerCard || sumiTargetCard);
        const dmg = boosted ? eff.boosted : eff.base;
        const hit = applyDamage(owner, target, dmg, `『${card.name}』`, false, true);
        if (hit) applyMirrorOnce(owner, target, dmg);
        if (boosted) {
          if (sumiOwnerCard && checkWallProtection(owner, sumiOwnerCard)) moveSubToGrave(owner, sumiOwnerCard, `『${card.name}』により即座に破棄`);
          if (sumiTargetCard && checkWallProtection(target, sumiTargetCard)) moveSubToGrave(target, sumiTargetCard, `『${card.name}』により即座に破棄`);
        }
      }
      else if (eff.kind === "destroyAllSubsBothGainCoin") {
        let starTotal = 0;
        for (const s of [...owner.subs]) {
          if (checkWallProtection(owner, s)) { starTotal += s.rarity; moveSubToGrave(owner, s, `『${card.name}』に破棄された`); }
        }
        for (const s of [...target.subs]) {
          if (checkWallProtection(target, s)) { starTotal += s.rarity; moveSubToGrave(target, s, `『${card.name}』に破棄された`); }
        }
        const gained = starTotal * eff.multiplier;
        gainCoins(owner, gained);
        log(`『${card.name}』：両者のサブを全て破棄し、☆合計${starTotal}×${eff.multiplier}＝${gained}コインを獲得した。`, "good");
      }
      else if (eff.kind === "healDrawRarity3") {
        healHp(owner, eff.heal);
        let drawnCount = 0;
        for (let i = 0; i < eff.count; i++) {
          if (owner.hand.length >= MAX_HAND) break;
          let idx = owner.deck.findIndex(c => c.rarity === 3);
          let fromGrave = false;
          if (idx < 0) { idx = owner.grave.findIndex(c => c.rarity === 3); fromGrave = true; }
          if (idx < 0) break;
          const [picked] = fromGrave ? owner.grave.splice(idx, 1) : owner.deck.splice(idx, 1);
          owner.hand.push(picked);
          drawnCount++;
        }
        log(`『${card.name}』：HPを${eff.heal}回復し、☆3カードを${drawnCount}枚引いた。`, "good");
        // 凸：『福』4凸 - コインを100枚獲得する
        if (getLimitBreak(card.id, owner.isAI) >= 4) {
          gainCoins(owner, 100);
          log(`『${card.name}』の凸効果：${owner.label}はコインを100枚獲得した。`, "good");
        }
      }
      else if (eff.kind === "freeShopHaul") {
        if (!hasCoinSpace(owner)) {
          log(`『${card.name}』：コインスペースを持たないため効果が発動しなかった。`);
        } else {
          const lb = getLimitBreak(card.id, owner.isAI);
          let count = 0;
          for (let i = 0; i < 3; i++) {
            const offer = owner.coinShop[i];
            if (!offer) continue;
            const base = CARD_LIBRARY.find(c => c.id === offer.cardId);
            if (!base) continue;
            const obtained = cloneCard(base);
            // 凸：『得』2凸 - 入手したカードにランダムなノーマルビーコンを1つずつ付与する
            if (lb >= 2) grantNormalBeacon(obtained);
            owner.deck.push(obtained);
            owner.deck = shuffle(owner.deck);
            owner.deckManifest.push(cloneCard(base));
            count++;
            refreshCoinShopSlot(owner, i);
          }
          log(`『${card.name}』：ショップのカードを${count}枚無料で入手し、ショップを更新した。`, "good");
          // 凸：『得』4凸 - 相手に1000ダメージを与える
          if (lb >= 4) {
            const hit = applyDamage(owner, target, 1000, `『${card.name}』`, false, true);
            if (hit) applyMirrorOnce(owner, target, 1000);
          }
        }
      }
      // ── ビーコンデッキ ──
      else if (eff.kind === "beaconSelfHandOne") {
        const pool = owner.hand.filter(c => c.instanceId !== card.instanceId);
        if (pool.length === 0) {
          log(`『${card.name}』：対象となる手札のカードがなかった。`);
        } else {
          const pick = pool[Math.floor(Math.random() * pool.length)];
          let count = 0;
          for (let i = 0; i < 3; i++) {
            const granted = grantBeacon(pick, 0.35);
            if (granted) count++; else break;
          }
          log(`『${card.name}』：『${pick.name}』にビーコンを${count}個付与した。`, "good");
        }
      }
      else if (eff.kind === "damageBeaconChance") {
        const hit = applyDamage(owner, target, eff.value, `『${card.name}』`, false, true);
        if (hit) applyMirrorOnce(owner, target, eff.value);
        if (chanceRoll(0.5)) {
          const pool = owner.hand.filter(c => c.instanceId !== card.instanceId);
          if (pool.length > 0) {
            const pick = pool[Math.floor(Math.random() * pool.length)];
            const granted = grantBeacon(pick, 0.35);
            if (granted) log(`『${card.name}』：『${pick.name}』にビーコン「${BEACON_DEFS[granted].label}」${BEACON_DEFS[granted].icon}を付与した。`, "good");
          }
        }
      }
      else if (eff.kind === "beaconAllHandNormal") {
        const pool = owner.hand.filter(c => c.instanceId !== card.instanceId);
        let count = 0;
        for (const c of pool) {
          if (grantNormalBeacon(c)) count++;
        }
        log(`『${card.name}』：手札${count}枚にノーマルビーコンを付与した。`, "good");
      }
      else if (eff.kind === "stickyBeaconOne") {
        const pool = owner.hand.filter(c => c.instanceId !== card.instanceId);
        if (pool.length === 0) {
          log(`『${card.name}』：対象となる手札のカードがなかった。`);
        } else {
          const r3 = pool.filter(c => c.rarity === 3);
          const candidates = r3.length > 0 ? r3 : pool;
          const pick = candidates[Math.floor(Math.random() * candidates.length)];
          const stickyId = pick.type === "main" ? "sticky" : "stickySub";
          if (pick.beacons.length < BEACON_MAX && !pick.beacons.includes(stickyId)) {
            pick.beacons.push(stickyId);
            log(`『${card.name}』：『${pick.name}』にビーコン「粘着」🛡️を付与した。`, "good");
          } else {
            log(`『${card.name}』：『${pick.name}』はこれ以上ビーコンを付与できなかった。`);
          }
        }
      }
      else if (eff.kind === "purgeTroubleBeacons") {
        let purged = 0;
        for (const zone of [owner.hand, owner.deck, owner.grave, owner.subs, owner.main]) {
          if (!zone) continue;
          const cards = Array.isArray(zone) ? zone : [zone];
          for (const c of cards) {
            if (!c || !c.beacons || c.beacons.length === 0) continue;
            const before = c.beacons.length;
            c.beacons = c.beacons.filter(b => BEACON_DEFS[b].type !== "trouble");
            purged += before - c.beacons.length;
          }
        }
        const dmg = purged * 200;
        log(`『${card.name}』：トラブルビーコンを${purged}個排除した。`, "good");
        if (dmg > 0) {
          const hit = applyDamage(owner, target, dmg, `『${card.name}』`, false, true);
          if (hit) applyMirrorOnce(owner, target, dmg);
        }
      }
      else if (eff.kind === "beaconDeckAllNormal") {
        let count = 0;
        const deckSnapshot = [...owner.deck];
        for (const c of deckSnapshot) {
          const times = 1 + Math.floor(Math.random() * 2); // 1〜2個
          for (let i = 0; i < times; i++) {
            if (grantNormalBeacon(c)) count++; else break;
          }
        }
        log(`『${card.name}』：自身の山札のカードに合計${count}個のノーマルビーコンを付与した。`, "good");

        const drawn = drawCards(owner, Math.min(4, MAX_HAND - owner.hand.length));
        owner.hand.push(...drawn);
        log(`『${card.name}』：${drawn.length}枚ドローした。`, "good");
      }
      else if (eff.kind === "damageAndTroubleBeaconHand") {
        const hit = applyDamage(owner, target, eff.value, `『${card.name}』`, false, true);
        if (hit) applyMirrorOnce(owner, target, eff.value);
        let count = 0;
        if (isTroubleGrantBlocked(target)) {
          log(`ビーコン「電」⚡：${target.label}へのトラブルビーコン付与が防がれた。`);
        } else {
          for (const c of target.hand) {
            const times = 1 + Math.floor(Math.random() * 2); // 1〜2個
            for (let i = 0; i < times; i++) {
              if (grantBeacon(c, 1)) count++; else break;
            }
          }
        }
        log(`『${card.name}』：${target.label}の手札に合計${count}個のトラブルビーコンを付与した。`, "good");
      }
      else if (eff.kind === "swapBeaconTypes") {
        let total = 0;
        for (const c of owner.hand) total += swapBeaconTypesOnCard(c);
        log(`『${card.name}』：手札のビーコン${total}個をノーマル⇔トラブルで入れ替えた。`, "good");
      }
      else if (eff.kind === "reloadBeaconOne") {
        const pool = owner.hand.filter(c => c.instanceId !== card.instanceId);
        if (pool.length === 0) {
          log(`『${card.name}』：対象となる手札のカードがなかった。`);
        } else {
          const r3 = pool.filter(c => c.rarity === 3);
          const candidates = r3.length > 0 ? r3 : pool;
          const pick = candidates[Math.floor(Math.random() * candidates.length)];
          if (pick.beacons.length < BEACON_MAX && !pick.beacons.includes("reload")) {
            pick.beacons.push("reload");
            log(`『${card.name}』：『${pick.name}』にビーコン「リロード」🔁を付与した。`, "good");
          } else {
            log(`『${card.name}』：『${pick.name}』はこれ以上ビーコンを付与できなかった。`);
          }
        }
      }
      else if (eff.kind === "purgeAllBeaconsHand") {
        let purged = 0;
        for (const c of target.hand) {
          if (!c.beacons) continue;
          purged += c.beacons.length;
          c.beacons = [];
        }
        const dmg = purged * 100;
        log(`『${card.name}』：${target.label}の手札のビーコンを${purged}個排除した。`, "good");
        if (dmg > 0) {
          const hit = applyDamage(owner, target, dmg, `『${card.name}』`, false, true);
          if (hit) applyMirrorOnce(owner, target, dmg);
        }
      }
      else if (eff.kind === "damageDrawGiftTrouble") {
        const hit = applyDamage(owner, target, eff.value, `『${card.name}』`, false, true);
        if (hit) applyMirrorOnce(owner, target, eff.value);
        const ownDrawn = drawCards(owner, Math.min(2, MAX_HAND - owner.hand.length));
        for (const c of ownDrawn) {
          if (c.beacons.length < BEACON_MAX && !c.beacons.includes("gift")) c.beacons.push("gift");
        }
        owner.hand.push(...ownDrawn);
        const oppDrawn = drawCards(target, Math.min(2, MAX_HAND - target.hand.length));
        if (!isTroubleGrantBlocked(target)) {
          for (const c of oppDrawn) {
            for (let i = 0; i < 2; i++) {
              if (!grantBeacon(c, 1)) break;
            }
          }
        }
        target.hand.push(...oppDrawn);
        log(`『${card.name}』：自身は${ownDrawn.length}枚ドロー（「ギフト」付与）、${target.label}は${oppDrawn.length}枚ドロー（トラブルビーコン2個付与）した。`, "good");
      }
      else if (eff.kind === "mixAllHandBeacons") {
        let count = 0;
        for (const c of owner.hand) count += rerollAllBeaconsOnCard(c);
        log(`『${card.name}』：手札のビーコン${count}個を別のビーコンに入れ替えた。`, "good");
      }
      else if (eff.kind === "damageChancePollution") {
        const hit = applyDamage(owner, target, eff.value, `『${card.name}』`, false, true);
        if (hit) applyMirrorOnce(owner, target, eff.value);
        if (chanceRoll(eff.chance) && target.hand.length > 0) {
          const pick = target.hand[Math.floor(Math.random() * target.hand.length)];
          const pollutionId = pick.type === "main" ? "pollutionMain" : "pollutionSub";
          if (pick.beacons.length < BEACON_MAX && !pick.beacons.includes(pollutionId)) {
            pick.beacons.push(pollutionId);
            log(`『${card.name}』：${target.label}の『${pick.name}』にビーコン「汚染」☣️を付与した。`, "good");
          }
        }
        // 月：また、自身に「月照」を1層付与する
        applyStatus(owner, "moonlit", 1);
      }
      else if (eff.kind === "boostBeaconOne") {
        const pool = owner.hand.filter(c => c.instanceId !== card.instanceId);
        if (pool.length === 0) {
          log(`『${card.name}』：対象となる手札のカードがなかった。`);
        } else {
          const r3 = pool.filter(c => c.rarity === 3);
          const candidates = r3.length > 0 ? r3 : pool;
          const pick = candidates[Math.floor(Math.random() * candidates.length)];
          if (pick.beacons.length < BEACON_MAX && !pick.beacons.includes("boost")) {
            pick.beacons.push("boost");
            log(`『${card.name}』：『${pick.name}』にビーコン「ブースト」🐦‍🔥を付与した。`, "good");
          } else {
            log(`『${card.name}』：『${pick.name}』はこれ以上ビーコンを付与できなかった。`);
          }
        }
      }
      else if (eff.kind === "handBeaconCountDamage") {
        let total = 0;
        for (const c of owner.hand) total += (c.beacons ? c.beacons.length : 0);
        if (card.id === "a3" && !owner.hand.some(c => c.instanceId === card.instanceId)) {
          total += (card.beacons ? card.beacons.length : 0);
        }
        const dmg = total * eff.multiplier;
        log(`『${card.name}』：手札のビーコン数${total}個分、${dmg}ダメージ！`, "good");
        if (dmg > 0) {
          const hit = applyDamage(owner, target, dmg, `『${card.name}』`, false, true);
          if (hit) applyMirrorOnce(owner, target, dmg);
        }
        // 亜：また、自身に「月照」を1層付与する
        applyStatus(owner, "moonlit", 1);
      }
      else if (eff.kind === "damageSummonWa") {
        const hit = applyDamage(owner, target, eff.value, `『${card.name}』`, false, true);
        if (hit) applyMirrorOnce(owner, target, eff.value);
        if (owner.subs.length < getSubLimit(owner)) {
          const wa = makeSpecial("wa");
          for (let i = 0; i < 3; i++) grantNormalBeacon(wa);
          owner.subs.push(wa);
          gainElementCost(owner, wa);
          log(`『${card.name}』：自身のサブフィールドに『和』を召喚した。`, "good");
        } else {
          log(`『${card.name}』：サブフィールドが満杯のため『和』を召喚できなかった。`);
        }
      }
      else if (eff.kind === "gainShikaCards") {
        const hit = applyDamage(owner, target, eff.value, `『${card.name}』`, false, true);
        if (hit) applyMirrorOnce(owner, target, eff.value);
        let gained = 0;
        for (let i = 0; i < eff.max; i++) {
          if (owner.hand.length >= MAX_HAND) break;
          const shika = makeSpecial("shika");
          grantNormalBeacon(shika);
          owner.hand.push(shika);
          gained++;
        }
        log(`『${card.name}』：『鹿』を${gained}枚獲得した。`, "good");
      }
      else if (eff.kind === "shikaGroupDamage") {
        const others = [];
        for (let i = owner.hand.length - 1; i >= 0; i--) {
          if (owner.hand[i].id === "shika") others.push(owner.hand.splice(i, 1)[0]);
        }
        const totalHits = 1 + others.length;
        const dmg = eff.value * totalHits;
        log(`『${card.name}』：手札の『鹿』${others.length}枚と合わせて${totalHits}体分、${dmg}ダメージ！`, "good");
        const hit = applyDamage(owner, target, dmg, `『${card.name}』`, false, true);
        if (hit) applyMirrorOnce(owner, target, dmg);
      }
      // ---- その他デッキ専用カードの効果 ----
      else if (eff.kind === "damageDraw") {
        const hit = applyDamage(owner, target, eff.value, `『${card.name}』`, false, true);
        if (hit) applyMirrorOnce(owner, target, eff.value);
        const drawn = drawCards(owner, eff.drawCount || 1);
        owner.hand.push(...drawn);
        log(`『${card.name}』で${drawn.length}枚ドローした。`, "good");
      }
      else if (eff.kind === "conditionalHandDamage") {
        const useAlt = owner.hand.length <= eff.altMaxHand;
        let dmg = useAlt ? eff.altValue : eff.value;
        if (useAlt) log(`『${card.name}』：手札が${owner.hand.length}枚のため強化ダメージ！`, "good");
        // 凸：『龍』4凸 - 与えるダメージ+20%
        if (card.id === "ryu2" && getLimitBreak("ryu2", owner.isAI) >= 4) dmg = Math.round(dmg * 1.2);
        const hit = applyDamage(owner, target, dmg, `『${card.name}』`, false, true);
        if (hit) applyMirrorOnce(owner, target, dmg);
        // 凸：『龍』1凸 - 山札からカードを5枚引く
        if (card.id === "ryu2" && getLimitBreak("ryu2", owner.isAI) >= 1) {
          const drawn = drawCards(owner, 5);
          owner.hand.push(...drawn);
          log(`『${card.name}』の凸効果：${owner.label}は山札から${drawn.length}枚引いた。`, "good");
        }
        // 凸：『龍』2凸 - 相手に「火傷」を3層付与する
        if (card.id === "ryu2" && getLimitBreak("ryu2", owner.isAI) >= 2) {
          applyStatus(target, "burn", 3);
          log(`『${card.name}』の凸効果：${target.label}に「火傷」を3層付与した。`, "good");
        }
      }
      else if (eff.kind === "deckRarity1CountDamage") {
        const count = (owner.deckManifest || []).filter(c => c.rarity === 1).length;
        let multiplier = eff.multiplier;
        // 凸：『能』2凸 - 与えるダメージがカードの枚数×[300→400]となる
        if (card.id === "nou2" && getLimitBreak("nou2", owner.isAI) >= 2) multiplier = 400;
        const dmg = count * multiplier;
        log(`『${card.name}』：編成中の☆1カード${count}枚分、${dmg}ダメージ！`, "good");
        if (dmg > 0) {
          const hit = applyDamage(owner, target, dmg, `『${card.name}』`, false, true);
          if (hit) applyMirrorOnce(owner, target, dmg);
        }
        // 凸：『能』1凸 - ☆1のカードの枚数×2のコストを獲得する
        if (card.id === "nou2" && getLimitBreak("nou2", owner.isAI) >= 1) {
          const gain = count * 2;
          if (gain > 0) {
            owner.elementCost = Math.min(ELEMENT_COST_MAX, (owner.elementCost || 0) + gain);
            log(`『${card.name}』の凸効果：コストを${gain}獲得した。`, "good");
          }
        }
        // 凸：『能』4凸 - 自身に「栄光」を1層付与する
        if (card.id === "nou2" && getLimitBreak("nou2", owner.isAI) >= 4) {
          applyStatus(owner, "glory", 1);
          log(`『${card.name}』の凸効果：${owner.label}に「栄光」を1層付与した。`, "good");
        }
      }
      else if (eff.kind === "damageChanceBonus") {
        // 拳：基本ダメージ＋確率で追加ダメージ
        const win = chanceRoll(eff.chance);
        const dmg = eff.base + (win ? eff.bonus : 0);
        log(`『${card.name}』：${win ? "追加ダメージ発動！" : "追加ダメージは発動せず"} → ${dmg}ダメージ`, win ? "good" : "");
        const hit = applyDamage(owner, target, dmg, `『${card.name}』`, false, true);
        if (hit) applyMirrorOnce(owner, target, dmg);
      }
      else if (eff.kind === "damageTroubleBeaconDeck") {
        // 影：ダメージ＋相手の山札からランダムに数枚選びトラブルビーコンを付与
        const hit = applyDamage(owner, target, eff.value, `『${card.name}』`, false, true);
        if (hit) applyMirrorOnce(owner, target, eff.value);
        const picked = shuffle([...target.deck]).slice(0, eff.targets || 3);
        picked.forEach(c => {
          for (let i = 0; i < (eff.stacks || 3); i++) grantBeacon(c, 1);
        });
        if (picked.length > 0) {
          log(`『${card.name}』：${target.label}の山札のカード${picked.length}枚にトラブルビーコンを付与した。`, "good");
        }
      }
      else if (eff.kind === "damageReplayRandomMain") {
        // 凛：ダメージ＋手札のランダムなメインカードの効果を追加発動（破棄しない、☆3優先）
        let dmg = eff.value;
        // 凸：『凛』2凸 - 与えるダメージが[1200→2400]となる
        if (card.id === "rin" && getLimitBreak("rin", owner.isAI) >= 2) dmg = 2400;
        const hit = applyDamage(owner, target, dmg, `『${card.name}』`, false, true);
        if (hit) applyMirrorOnce(owner, target, dmg);
        // 凸：『凛』1凸 - 自身のHPを800回復する
        if (card.id === "rin" && getLimitBreak("rin", owner.isAI) >= 1) {
          healHp(owner, 800);
          log(`『${card.name}』の凸効果：${owner.label}のHPを800回復した。`, "good");
        }
        const mains = owner.hand.filter(c => c.type === "main" && c.instanceId !== card.instanceId);
        if (mains.length > 0) {
          const r3 = mains.filter(c => c.rarity === 3);
          const pool = r3.length > 0 ? r3 : mains;
          const chosen = pool[Math.floor(Math.random() * pool.length)];
          log(`『${card.name}』：『${chosen.name}』の効果を追加発動！`, "strong");
          // 凸：『凛』4凸 - このカードによって発動したカードの与えるダメージ+30%
          if (card.id === "rin" && getLimitBreak("rin", owner.isAI) >= 4) owner._rinReplayBoostPercent = 30;
          resolveMain(owner, chosen);
          owner._rinReplayBoostPercent = null;
        }
      }
      else if (eff.kind === "damagePerFieldSub") {
        // 滝：基本ダメージ＋自身のサブフィールドの枚数分追加ダメージ
        const subCount = owner.subs.length;
        const dmg = eff.base + subCount * eff.perSub;
        log(`『${card.name}』：基本${eff.base}＋サブ${subCount}枚×${eff.perSub}＝${dmg}ダメージ`);
        const hit = applyDamage(owner, target, dmg, `『${card.name}』`, false, true);
        if (hit) applyMirrorOnce(owner, target, dmg);
      }
      else if (eff.kind === "healAndGraveToDeckAll") {
        // 冥：HP回復＋墓地の全カードを山札に戻す
        healHp(owner, eff.heal);
        log(`『${card.name}』で${owner.label}のHPを${eff.heal}回復した。`, "good");
        const count = owner.grave.length;
        owner.deck.push(...owner.grave.splice(0).map(c => ({ ...c, elapsed: 0 })));
        owner.deck = shuffle(owner.deck);
        if (count > 0) log(`『${card.name}』：墓地の${count}枚を山札へ戻した。`, "good");
      }
      // ── スペシャルガチャ限定カード ──
      else if (eff.kind === "mikadoAdaptive") {
        const deckId = owner.deckId || "none";
        const mikadoLB = getLimitBreak("mikado", owner.isAI);
        if (deckId === "standard" || deckId === "number" || deckId === "king" || deckId === "trick") {
          mikadoDeckEffect(owner, target, card, deckId);
        } else if (deckId === "mechanic") {
          const hit = applyDamage(owner, target, 1000, `『${card.name}』`, false, true);
          if (hit) applyMirrorOnce(owner, target, 1000);
          if (card.synthSources && card.synthSources.length === 2) {
            const other = card.synthSources[1];
            if (other) {
              log(`『${card.name}』：合成元『${other.name}』の効果を再発動！`, "strong");
              resolveMain(owner, other);
            }
          }
        } else if (deckId === "coin") {
          const hit = applyDamage(owner, target, 777, `『${card.name}』`, false, true);
          if (hit) applyMirrorOnce(owner, target, 777);
          gainCoins(owner, 200);
          log(`『${card.name}』：コインを200枚獲得した。`, "good");
        } else if (deckId === "beacon") {
          const specials = ["reload", "gift", "boost"];
          const pool3 = owner.deck.filter(c => c.rarity === 3);
          let granted = 0;
          pool3.forEach(c => {
            if (!c.beacons) c.beacons = [];
            if (c.beacons.length < BEACON_MAX) {
              const pick = specials[Math.floor(Math.random() * specials.length)];
              if (!c.beacons.includes(pick)) { c.beacons.push(pick); granted++; }
            }
          });
          log(`『${card.name}』：編成中の☆3カード${granted}枚にスペシャルビーコンを付与した。`, "good");
          const idx3 = owner.deck.findIndex(c => c.rarity === 3);
          if (idx3 >= 0 && owner.hand.length < MAX_HAND) {
            const [drawn3] = owner.deck.splice(idx3, 1);
            owner.hand.push(drawn3);
            log(`『${card.name}』：山札から☆3『${drawn3.name}』を1枚引いた。`, "good");
          }
        } else if (deckId === "arcana") {
          log(`『${card.name}』：合計10層の状態異常をランダムに付与する。`, "good");
          applyRandomAilments(target, 10);
          detonateArcana(owner, target);
        } else {
          const hit = applyDamage(owner, target, 3000, `『${card.name}』`, false, true);
          if (hit) applyMirrorOnce(owner, target, 3000);
        }
        // 凸：『帝』2凸 - デッキ効果が発動していても、デッキ効果なしによる3000ダメージが追加発生する
        if (deckId !== "none" && mikadoLB >= 2) {
          const hit2 = applyDamage(owner, target, 3000, `『${card.name}』の凸効果`, false, true);
          if (hit2) applyMirrorOnce(owner, target, 3000);
        }
        // 凸：『帝』1凸 - デッキ効果なしの時、スタンダード/ナンバー/キング/トリックの中から1つランダムで追加発動
        // 凸：『帝』4凸 - デッキ効果関係なく（1凸の効果が）発動するようになる
        if ((deckId === "none" && mikadoLB >= 1) || (deckId !== "none" && mikadoLB >= 4)) {
          const pool = ["standard", "number", "king", "trick"];
          const picked = pool[Math.floor(Math.random() * pool.length)];
          log(`『${card.name}』の凸効果：ランダムで「${picked}」のデッキ効果を追加発動！`, "strong");
          mikadoDeckEffect(owner, target, card, picked);
        }
        // 凸：『帝』4凸 - 自身に「栄光」を1層付与する
        if (mikadoLB >= 4) {
          applyStatus(owner, "glory", 1);
          log(`『${card.name}』の凸効果：${owner.label}に「栄光」を1層付与した。`, "good");
        }
      }
      else if (eff.kind === "kiramekiFetch") {
        const kiramekiLB = getLimitBreak("kirameki", owner.isAI);
        // 凸：『煌』4凸 - 加えるカードの数が山札[2→3]枚、手札[1→2]枚となる
        const deckAddCount = kiramekiLB >= 4 ? 3 : 2;
        const handAddCount = kiramekiLB >= 4 ? 2 : 1;
        const formationIds = new Set(owner.deckManifest ? owner.deckManifest.map(c => c.id) : []);
        const pool3 = CARD_LIBRARY.filter(c => c.rarity === 3 && !formationIds.has(c.id) && !c.noPull);
        const picks = shuffle([...pool3]).slice(0, deckAddCount + handAddCount);
        let toDeck = 0, toHand = 0;
        picks.forEach((base, i) => {
          const clone = { ...base, instanceId: `${base.id}-${uid++}`, elapsed: 0, beacons: [], noGrave: true };
          // 凸：『煌』2凸 - 加えたカードにそれぞれノーマルビーコンを2つずつ付与する
          if (kiramekiLB >= 2) {
            for (let n = 0; n < 2; n++) grantNormalBeacon(clone);
          }
          if (i < deckAddCount) { owner.deck.push(clone); toDeck++; }
          else if (owner.hand.length < MAX_HAND) { owner.hand.push(clone); toHand++; }
          else { owner.deck.push(clone); toDeck++; }
        });
        owner.deck = shuffle(owner.deck);
        log(`『${card.name}』：デッキ外の☆3カードを山札に${toDeck}枚、手札に${toHand}枚加えた。`, "good");
        // 凸：『煌』1凸 - 相手に1500ダメージを与える
        if (kiramekiLB >= 1) {
          const hit = applyDamage(owner, target, 1500, `『${card.name}』の凸効果`, false, true);
          if (hit) applyMirrorOnce(owner, target, 1500);
        }
      }
      else if (eff.kind === "katanaStrike") {
        const katanaLB = getLimitBreak("katana", owner.isAI);
        // 凸：『刀』2凸 - 相手に与えるダメージが[2100→3400]となる
        const dmg = katanaLB >= 2 ? 3400 : eff.value;
        const hit = applyDamage(owner, target, dmg, `『${card.name}』`, false, true);
        if (hit) applyMirrorOnce(owner, target, dmg);
        if (owner.subs.length < getSubLimit(owner)) {
          const blade = makeSpecial("ha");
          placeSub(owner, blade);
        } else {
          log(`${owner.label}のサブフィールドが満杯のため『刃』を召喚できなかった。`);
        }
        // 凸：『刀』4凸 - 「刃」をもう1枚サブに召喚する
        if (katanaLB >= 4) {
          if (owner.subs.length < getSubLimit(owner)) {
            const blade2 = makeSpecial("ha");
            placeSub(owner, blade2);
          } else {
            log(`${owner.label}のサブフィールドが満杯のため『刃』をもう1枚召喚できなかった。`);
          }
        }
        if (owner.hand.length < MAX_HAND) {
          const zan = makeSpecial("zan");
          owner.hand.push(zan);
          log(`${owner.label}は『斬』を手札に加えた。`, "good");
        }
        // 凸：『刀』1凸 - 自身に「栄光」を1層付与する
        if (katanaLB >= 1) {
          applyStatus(owner, "glory", 1);
          log(`『${card.name}』の凸効果：${owner.label}に「栄光」を1層付与した。`, "good");
        }
      }
      else if (eff.kind === "zanSlash") {
        // 凸：『刀』4凸 - 「刃」が複数ある場合、「斬」は経過ターンの合計値を参照する
        const blades = owner.subs.filter(c => c.effect.kind === "haBlade");
        const elapsed = blades.reduce((sum, b) => sum + (b.elapsed || 0), 0);
        const dmg = eff.base + elapsed * eff.perTurn;
        log(`『${card.name}』：経過ターン${elapsed} → ${dmg}ダメージ`);
        const hit = applyDamage(owner, target, dmg, `『${card.name}』`, false, true);
        if (hit) applyMirrorOnce(owner, target, dmg);
        if (blades.length > 0) {
          blades.forEach(b => moveSubToGrave(owner, b, "『斬』の効果で破棄"));
          log(`『${card.name}』：『刃』を破棄した。`, "good");
        }
      }
      // ── アルカナデッキ ──
      else if (eff.kind === "damageAndArcana") {
        // 吊：ダメージ＋アルカナ付与
        const hit = applyDamage(owner, target, eff.value, `『${card.name}』`, false, true);
        if (hit) applyMirrorOnce(owner, target, eff.value);
        applyStatus(target, "arcana", eff.arcana);
      }
      else if (eff.kind === "damageAndDetonateArcana") {
        // 愚：ダメージ＋アルカナ起爆
        const hit = applyDamage(owner, target, eff.value, `『${card.name}』`, false, true);
        if (hit) applyMirrorOnce(owner, target, eff.value);
        detonateArcana(owner, target);
      }
      else if (eff.kind === "damageAndStatus") {
        // 冷・鋭：ダメージ＋状態異常付与
        const hit = applyDamage(owner, target, eff.value, `『${card.name}』`, false, true);
        if (hit) applyMirrorOnce(owner, target, eff.value);
        applyStatus(target, eff.status, eff.amount);
      }
      else if (eff.kind === "applyStatusOnly") {
        // 油・穢：状態異常のみ付与
        applyStatus(target, eff.status, eff.amount);
      }
      else if (eff.kind === "randomAilments") {
        // 厄：火傷・悪寒・猛毒・脆弱・出血からランダムに合計min〜max層付与
        const count = eff.min + Math.floor(Math.random() * (eff.max - eff.min + 1));
        log(`『${card.name}』：合計${count}層の状態異常をランダムに付与する。`, "good");
        applyRandomAilments(target, count);
      }
      else if (eff.kind === "randomArcana") {
        // 占：アルカナをmin〜max層ランダムで付与
        const amount = eff.min + Math.floor(Math.random() * (eff.max - eff.min + 1));
        applyStatus(target, "arcana", amount);
      }
      else if (eff.kind === "chillWithFreezeBonus") {
        // 凍：悪寒付与。凍結に変化した場合追加ダメージ
        const wasFrozen = getStatusStack(target, "frozen") > 0;
        applyStatus(target, "chill", eff.amount);
        const isFrozenNow = getStatusStack(target, "frozen") > 0;
        if (!wasFrozen && isFrozenNow) {
          log(`『${card.name}』：「凍結」への変化を確認、追加ダメージ！`, "strong");
          const hit = applyDamage(owner, target, eff.bonus, `『${card.name}』の追加効果`, false, true);
          if (hit) applyMirrorOnce(owner, target, eff.bonus);
        }
      }
      else if (eff.kind === "applyMultiStatus") {
        // 病：複数の状態異常を同時付与
        eff.statuses.forEach(s => applyStatus(target, s.status, s.amount));
      }
      else if (eff.kind === "arcanaThenDetonate") {
        // 昏：アルカナ付与→起爆
        applyStatus(target, "arcana", eff.amount);
        detonateArcana(owner, target);
      }
      else if (eff.kind === "randomAilmentsThenTypeDamage") {
        // 骸：ランダム状態異常付与→種類数×perTypeダメージ
        const count = eff.min + Math.floor(Math.random() * (eff.max - eff.min + 1));
        log(`『${card.name}』：合計${count}層の状態異常をランダムに付与する。`, "good");
        applyRandomAilments(target, count);
        const typeCount = STATUS_ORDER.filter(k => getStatusStack(target, k) > 0).length;
        const dmg = typeCount * eff.perType;
        if (dmg > 0) {
          log(`『${card.name}』：${target.label}に付与された状態異常${typeCount}種類分、${dmg}ダメージ！`, "good");
          const hit = applyDamage(owner, target, dmg, `『${card.name}』`, false, true);
          if (hit) applyMirrorOnce(owner, target, dmg);
        }
      }
      else if (eff.kind === "damageAndSelfStatus") {
        // 栄：ダメージ＋自身に状態異常付与
        const hit = applyDamage(owner, target, eff.value, `『${card.name}』`, false, true);
        if (hit) applyMirrorOnce(owner, target, eff.value);
        applyStatus(owner, eff.status, eff.amount);
      }
      else if (eff.kind === "damageAddAoAndSekiju") {
        // 赫：ダメージ＋『蒼』を手札に加える＋自身に赫呪付与
        const hit = applyDamage(owner, target, eff.value, `『${card.name}』`, false, true);
        if (hit) applyMirrorOnce(owner, target, eff.value);
        if (owner.hand.length < MAX_HAND) {
          const ao = makeSpecial("ao");
          owner.hand.push(ao);
          log(`${owner.label}は『蒼』を手札に加えた。`, "good");
        } else {
          log(`${owner.label}の手札が満杯のため『蒼』は加えられなかった。`);
        }
        applyStatus(owner, "sekiju", 1);
      }
      // ── アルカナデッキ（追加カード） ──
      else if (eff.kind === "detonateOpponentArcanaOnly") {
        // 押：相手のアルカナを起爆させる
        detonateArcana(owner, target);
      }
      else if (eff.kind === "drawThenSelfDetonateArcana") {
        // 引：山札から2枚引き、自身のアルカナを起爆させる
        const drawn = drawCards(owner, eff.drawCount || 2);
        owner.hand.push(...drawn);
        log(`『${card.name}』：山札から${drawn.length}枚引いた。`, "good");
        detonateArcana(owner, owner);
      }
      else if (eff.kind === "otsuKabutoCombo") {
        // 乙：サブに『甲』がある場合、ダメージ強化＋相手のアルカナ起爆
        const hasKabuto = owner.subs.some(s => s.id === "kabuto");
        const dmgValue = hasKabuto ? eff.comboValue : eff.value;
        const hit = applyDamage(owner, target, dmgValue, `『${card.name}』`, false, true);
        if (hit) applyMirrorOnce(owner, target, dmgValue);
        if (hasKabuto) detonateArcana(owner, target);
      }
      else if (eff.kind === "mirrorStatusToOpponent") {
        // 染：自身の状態異常を相手にも付与する（除外指定分は除く、自身から消えない）
        let mirrored = 0;
        STATUS_ORDER.forEach(key => {
          if (eff.exclude && eff.exclude.includes(key)) return;
          const stack = getStatusStack(owner, key);
          if (stack > 0) { applyStatus(target, key, stack); mirrored++; }
        });
        if (mirrored === 0) log(`『${card.name}』：相手に移す状態異常がなかった。`);
      }
      else if (eff.kind === "clearOwnStatusExceptGloryMoonlit") {
        // 掃：自身の状態異常を除去する（栄光・月照を除く）
        STATUS_ORDER.forEach(key => {
          if (key === "glory" || key === "moonlit") return;
          owner.status[key] = 0;
        });
        log(`『${card.name}』：自身の状態異常を除去した（栄光・月照を除く）。`, "good");
      }
      else if (eff.kind === "oilDrawEnjouBonus") {
        // 灯：油を付与し、山札から3枚引く。相手が炎上状態なら追加ダメージ
        applyStatus(target, "oil", 1);
        const drawn = drawCards(owner, eff.drawCount || 3);
        owner.hand.push(...drawn);
        log(`『${card.name}』：山札から${drawn.length}枚引いた。`, "good");
        if (getStatusStack(target, "enjou") > 0) {
          const hit = applyDamage(owner, target, eff.bonus, `『${card.name}』の追加効果`, false, true);
          if (hit) applyMirrorOnce(owner, target, eff.bonus);
        }
      }
      else if (eff.kind === "consumeStatusForDamageAndArcana") {
        // 滅：アルカナ以外の状態異常の合計層数分ダメージ＋アルカナ増加、その後全て除去
        let total = 0;
        STATUS_ORDER.forEach(key => {
          if (key === "arcana") return;
          total += getStatusStack(target, key);
        });
        if (total > 0) {
          const dmg = total * (eff.perStack || 200);
          log(`『${card.name}』：状態異常の合計層数${total}分、${dmg}ダメージ！`, "good");
          const hit = applyDamage(owner, target, dmg, `『${card.name}』`, false, true);
          if (hit) applyMirrorOnce(owner, target, dmg);
          applyStatus(target, "arcana", total);
          STATUS_ORDER.forEach(key => {
            if (key === "arcana") return;
            target.status[key] = 0;
          });
        } else {
          log(`『${card.name}』：相手に付与された状態異常がないため、効果は不発だった。`);
        }
      }
      else if (eff.kind === "aoConvertSekijuToSoju") {
        // 蒼：ダメージ＋自身の赫呪を層数分蒼呪に変換
        const hit = applyDamage(owner, target, eff.value, `『${card.name}』`, false, true);
        if (hit) applyMirrorOnce(owner, target, eff.value);
        const sekijuStack = getStatusStack(owner, "sekiju");
        if (sekijuStack > 0) {
          owner.status.sekiju = 0;
          applyStatus(owner, "soju", sekijuStack);
          log(`『${card.name}』：「赫呪」${sekijuStack}層を「蒼呪」に変換した。`, "good");
        }
      }
      checkHaBladeGraveChanges();
      owner._activeDamageCard = _prevActiveDamageCard;
    }

    // シンセサイズ：通常合成カードのパーツ効果を順番に発動する
    function resolveSynthComboParts(owner, card, target) {
      for (const part of card.effect.parts) {
        resolveMain(owner, { ...card, effect: part });
      }
    }


    // 王がフィールドに存在するか判定
    function hasKing(owner) {
      return owner.subs.some(c => c.effect.kind === "kingPresence");
    }
    // 王が手札・サブのどこにもいないか判定（冠・城のサーチ条件）
    function kingNotInHandOrSub(owner) {
      return !owner.hand.some(c => c.id === "ou") && !owner.subs.some(c => c.id === "ou");
    }
    // 王を山札→なければ墓地からサーチして手札に加える（見つかった場合true）
    function fetchKingTo(owner, destination) {
      // destination: "hand" のみ対応
      let idx = owner.deck.findIndex(c => c.id === "ou");
      let foundFrom = null;
      if (idx >= 0) { foundFrom = "deck"; }
      else {
        idx = owner.grave.findIndex(c => c.id === "ou");
        if (idx >= 0) foundFrom = "grave";
      }
      if (!foundFrom) return false;
      const pool = foundFrom === "deck" ? owner.deck : owner.grave;
      const [king] = pool.splice(idx, 1);
      if (owner.hand.length < MAX_HAND) {
        owner.hand.push(king);
        log(`${owner.label}は${foundFrom === "deck" ? "山札" : "墓地"}から『王』をサーチした！`, "good");
        return true;
      } else {
        // 手札が満杯ならそのまま戻す
        pool.push(king);
        return false;
      }
    }
    // 祭(matsuriFestival)が存在するか
    function hasFestival(owner) {
      return owner.subs.some(c => c.effect.kind === "matsuriFestival");
    }

    // 幻(genIllusion)が場（自分・相手どちらか）に存在するか
    function hasGenIllusion() {
      if (!game) return false;
      return (game.player.subs || []).some(c => c.effect.kind === "genIllusion")
        || (game.ai.subs || []).some(c => c.effect.kind === "genIllusion");
    }
    // 確率判定：幻が場にある間は常にtrue（100%発動）
    function chanceRoll(p) {
      return hasGenIllusion() || Math.random() < p;
    }
    // 刃(haBlade)が場にある間、自軍の墓地の枚数が1枚増える度に経過ターンを1進める（増えた枚数分そのまま加算。減少はカウントしない）
    let _tickingHaBlades = false;
    function checkHaBladeGraveChanges() {
      if (!game || _tickingHaBlades) return;
      _tickingHaBlades = true;
      try {
        for (const o of [game.player, game.ai]) {
          for (const c of [...o.subs]) {
            if (c.effect && c.effect.kind === "haBlade") {
              if (c.lastGraveCount === undefined) c.lastGraveCount = o.grave.length;
              const diff = o.grave.length - c.lastGraveCount;
              c.lastGraveCount = o.grave.length;
              if (diff > 0) {
                c.elapsed = (c.elapsed || 0) + diff;
                if (c.elapsed >= c.duration) moveSubToGrave(o, c, "経過ターンが上限に達した");
              }
            }
          }
        }
      } finally {
        _tickingHaBlades = false;
      }
    }

    // 壁(kabeWall)：相手由来のサブ破壊を1度だけ無効化（自分の効果による破壊は対象外）
    // 呼び出し元で「相手の効果によって対象のサブを破壊する直前」に使う。trueなら破壊を実行してよい。
    function checkWallProtection(owner, card) {
      const wall = owner.subs.find(c => c.effect.kind === "kabeWall");
      if (wall) {
        moveSubToGrave(owner, wall, "効果を発動（破壊を無効化）");
        log(`${owner.label}の『壁』が『${card.name}』の破壊を防いだ！`, "good");
        return false; // 破壊しない
      }
      return true; // 破壊してよい
    }

    // 乱数ダメージ：min～maxの範囲で1の位まで決定。①の目or卑が有効なら最高値固定。凶が有効なら最低値固定＋HP回復。
    function rollRangeDamage(owner, min, max) {
      // 凶(minRandomHealOnce)：最低値固定＋与えた数値分HP回復、1回発動後に破棄
      const kyou = owner.subs.find(c => c.effect.kind === "minRandomHealOnce");
      if (kyou) {
        moveSubToGrave(owner, kyou, "効果を発動");
        log(`『凶』発動：乱数ダメージが最低値（${min}）に固定された。`, "good");
        healHp(owner, min);
        log(`『凶』：与えた数値分（${min}）、自身のHPを回復した。`, "good");
        return min;
      }
      if (owner.maxRandomThisTurn) return max;
      const hi = owner.subs.find(c => c.effect.kind === "maxRandomOnce");
      if (hi) {
        moveSubToGrave(owner, hi, "効果を発動");
        return max;
      }
      return min + Math.floor(Math.random() * (max - min + 1));
    }

    // 旧「似」カードの効果名の名残。現在CARD_LIBRARYに mirrorOnce を持つカードは存在しないため、
    // この関数は常に false を返す（呼び出し側は41箇所あるため、安全のため関数自体は維持）。
    function applyMirrorOnce(owner, target, amount) {
      const mirror = owner.subs.find(c => c.effect.kind === "mirrorOnce");
      if (!mirror) return false;
      moveSubToGrave(owner, mirror, "効果を発動");
      applyDamage(owner, target, amount, `『${mirror.name}』の複製`, true);
      return true;
    }

    function checkKuCondition(owner) {
      if (!owner || !Array.isArray(owner.subs)) return;
      if (owner.subs.length < getSubLimit(owner)) return;
      const kuCard = owner.subs.find(card => card.id === "ku");
      if (!kuCard) return;
      moveSubToGrave(owner, kuCard, "サブフィールドが満杯になったため破棄");
    }
    // 凸：『兆』1凸 - サブフィールドが満杯になった場合、即座に破棄される
    function checkTyoCondition(owner) {
      if (!owner || !Array.isArray(owner.subs)) return;
      if (owner.subs.length < getSubLimit(owner)) return;
      const tyoCard = owner.subs.find(card => card.id === "tyo" && card._tyoInstantDiscard);
      if (!tyoCard) return;
      moveSubToGrave(owner, tyoCard, "サブフィールドが満杯になったため破棄");
    }

    function resolveSubEffects(owner) {
      const target = opponentOf(owner);
      const festival = hasFestival(owner); // 祭：ターン消費・回数制限を免除
      // 状態異常：悪寒・凍結・猛毒の自身ターン処理
      tickStatusEffects(owner);
      // エレメント：持続効果（火のダメージバフ・水のリジェネ・風のビーコン付与）のターン経過処理
      tickElementEffects(owner);
      // ビーコン：追従・リジェネ・感電・利敵（サブフィールドにある間、毎ターン発動。ターン消費や破棄には関与しない）
      for (const card of [...owner.subs]) {
        if (!card.beacons || card.beacons.length === 0 || hasBlankBeaconKind(card, "sub")) continue;
        if (card.beacons.includes("follow")) {
          owner._activeBoostMultiplier = card.beacons.includes("boost") ? 2 : 1;
          applyDamage(owner, target, 150, `『${card.name}』のビーコン「追従」🤝`);
          owner._activeBoostMultiplier = 1;
        }
        if (card.beacons.includes("regene")) {
          healHp(owner, 100);
          log(`ビーコン「リジェネ」💊：${owner.label}のHPを100回復した。`, "good");
        }
        if (card.beacons.includes("shockSelf")) {
          owner.hp = Math.max(0, owner.hp - 120);
          log(`ビーコン「感電」⚡：${owner.label}が120ダメージを受けた。`, "strong");
          checkWin();
        }
        if (card.beacons.includes("aid")) {
          healHp(target, 300);
          log(`ビーコン「利敵」🤡：${target.label}のHPが300回復した。`, "strong");
        }
      }
      for (const card of [...owner.subs]) {
        if (hasBlankBeaconKind(card, "sub")) {
          if (!festival) {
            card.elapsed = (card.elapsed || 0) + 1;
            if (card.elapsed >= (card.duration || 1)) moveSubToGrave(owner, card, "継続ターンが終了");
          }
          continue;
        }
        if (card.effect.kind === "turnDamage") {
          owner._activeBoostMultiplier = (card.beacons && card.beacons.includes("boost")) ? 2 : 1;
          owner._activeDamageCard = card;
          let dmgValue = card.effect.value;
          if (card.id === "san" && getLimitBreak("san", owner.isAI) >= 1) dmgValue = 840;
          if (card.id === "kabuto" && card._nextBoosted) {
            dmgValue = 650;
            card._nextBoosted = false;
            card._boostUsed = true;
            log(`『甲』の強化が発動！ダメージが650になった。`, "good");
          }
          applyDamage(owner, target, dmgValue, `サブ『${card.name}』`);
          owner._activeDamageCard = null;
          owner._activeBoostMultiplier = 1;
          if (!festival) {
            card.elapsed += 1;
            if (card.elapsed >= card.duration) moveSubToGrave(owner, card, "継続ターンが終了");
          }
        } else if (card.effect.kind === "turnRandomDamage") {
          const dmg = card.effect.min + Math.floor(Math.random() * (card.effect.max - card.effect.min + 1));
          owner._activeBoostMultiplier = (card.beacons && card.beacons.includes("boost")) ? 2 : 1;
          applyDamage(owner, target, dmg, `サブ『${card.name}』`);
          owner._activeBoostMultiplier = 1;
          if (!festival) {
            card.elapsed += 1;
            if (card.elapsed >= card.duration) moveSubToGrave(owner, card, "継続ターンが終了");
          }
        } else if (card.effect.kind === "graveTickDamage") {
          const dmg = owner.grave.length * card.effect.multiplier;
          if (dmg > 0) {
            owner._activeBoostMultiplier = (card.beacons && card.beacons.includes("boost")) ? 2 : 1;
            applyDamage(owner, target, dmg, `サブ『${card.name}』`);
            owner._activeBoostMultiplier = 1;
          }
          if (!festival) {
            card.elapsed += 1;
            if (card.elapsed >= card.duration) moveSubToGrave(owner, card, "継続ターンが終了");
          }
        } else if (card.effect.kind === "turnPurgeOneTrouble") {
          // 清：自身の手札のトラブルビーコンを1つだけ排除する
          const withTrouble = owner.hand.find(c => c.beacons && c.beacons.some(b => BEACON_DEFS[b].type === "trouble"));
          if (withTrouble) {
            const bIdx = withTrouble.beacons.findIndex(b => BEACON_DEFS[b].type === "trouble");
            const removed = withTrouble.beacons.splice(bIdx, 1)[0];
            log(`『${card.name}』：『${withTrouble.name}』のトラブルビーコン「${BEACON_DEFS[removed].label}」を排除した。`, "good");
          }
          if (!festival) {
            card.elapsed += 1;
            if (card.elapsed >= card.duration) moveSubToGrave(owner, card, "継続ターンが終了");
          }
        } else if (card.effect.kind === "blockTroubleGrant") {
          // 電：効果は付与阻止のみ。ターン経過だけ処理する
          if (!festival) {
            card.elapsed += 1;
            if (card.elapsed >= card.duration) moveSubToGrave(owner, card, "継続ターンが終了");
          }
        } else if (card.effect.kind === "grantBeaconOnMainDamage") {
          // 付：効果はメインダメージ時にapplyDamage側で発動。ここではターン経過のみ処理する
          if (!festival) {
            card.elapsed += 1;
            if (card.elapsed >= card.duration) moveSubToGrave(owner, card, "継続ターンが終了");
          }
        } else if (card.effect.kind === "waTurnEffect") {
          owner._activeBoostMultiplier = (card.beacons && card.beacons.includes("boost")) ? 2 : 1;
          applyDamage(owner, target, card.effect.value, `サブ『${card.name}』`);
          owner._activeBoostMultiplier = 1;
          let granted = 0;
          for (const c of owner.hand) if (grantNormalBeacon(c)) granted++;
          if (granted > 0) log(`『${card.name}』：手札${granted}枚にノーマルビーコンを付与した。`, "good");
          if (!festival) {
            card.elapsed += 1;
            if (card.elapsed >= card.duration) moveSubToGrave(owner, card, "継続ターンが終了");
          }
        } else if (card.effect.kind === "teruDraw") {
          // 照：山札からカードを1〜2枚引き、そのカードにノーマルビーコンを1つ付与する
          const drawCount = 1 + Math.floor(Math.random() * 2);
          const drawn = drawCards(owner, Math.min(drawCount, MAX_HAND - owner.hand.length));
          drawn.forEach(c => grantNormalBeacon(c));
          owner.hand.push(...drawn);
          if (drawn.length > 0) log(`『${card.name}』：山札から${drawn.length}枚引き、ノーマルビーコンを付与した。`, "good");
          if (!festival) {
            card.elapsed += 1;
            if (card.elapsed >= card.duration) moveSubToGrave(owner, card, "継続ターンが終了");
          }
        } else if (card.effect.kind === "auraDamageBuff") {
          // 気・力：ダメージバフのみ（バフ自体はapplyDamage側の汎用処理で発動）。ここではターン経過のみ処理する
          if (!festival) {
            card.elapsed += 1;
            if (card.elapsed >= card.duration) moveSubToGrave(owner, card, "継続ターンが終了");
          }
        } else if (card.effect.kind === "turnDamageRandomAilmentsDiscardArcana") {
          // 呪：ダメージ＋ランダム状態異常を毎ターン付与。破棄された時アルカナを付与（moveSubToGrave側で処理）
          owner._activeBoostMultiplier = (card.beacons && card.beacons.includes("boost")) ? 2 : 1;
          applyDamage(owner, target, card.effect.value, `サブ『${card.name}』`);
          owner._activeBoostMultiplier = 1;
          const count = card.effect.min + Math.floor(Math.random() * (card.effect.max - card.effect.min + 1));
          applyRandomAilments(target, count);
          if (!festival) {
            card.elapsed += 1;
            if (card.elapsed >= card.duration) moveSubToGrave(owner, card, "継続ターンが終了");
          }
        } else if (card.effect.kind === "turnDamageTroubleBeacon") {
          owner._activeBoostMultiplier = (card.beacons && card.beacons.includes("boost")) ? 2 : 1;
          applyDamage(owner, target, card.effect.value, `サブ『${card.name}』`);
          owner._activeBoostMultiplier = 1;
          if (!isTroubleGrantBlocked(target) && target.hand.length > 0) {
            const pick = target.hand[Math.floor(Math.random() * target.hand.length)];
            const granted = grantBeacon(pick, 1);
            if (granted) log(`『${card.name}』：${target.label}の『${pick.name}』にビーコン「${BEACON_DEFS[granted].label}」${BEACON_DEFS[granted].icon}を付与した。`, "good");
          } else if (isTroubleGrantBlocked(target)) {
            log(`ビーコン「電」⚡：${target.label}へのトラブルビーコン付与が防がれた。`);
          }
          if (!festival) {
            card.elapsed += 1;
            if (card.elapsed >= card.duration) moveSubToGrave(owner, card, "継続ターンが終了");
          }
        } else if (card.effect.kind === "turnDamagePurgeOnPlace") {
          owner._activeBoostMultiplier = (card.beacons && card.beacons.includes("boost")) ? 2 : 1;
          applyDamage(owner, target, card.effect.value, `サブ『${card.name}』`);
          owner._activeBoostMultiplier = 1;
          if (!festival) {
            card.elapsed += 1;
            if (card.elapsed >= card.duration) moveSubToGrave(owner, card, "継続ターンが終了");
          }
        } else if (card.effect.kind === "handConditionDamage") {
          if (owner.hand.length <= card.effect.maxHand) {
            applyDamage(owner, target, card.effect.value, `サブ『${card.name}』`);
            moveSubToGrave(owner, card, "効果を発動");
          }
        } else if (card.effect.kind === "healOnDiscard") {
          // 願：3ターン経過で自動破棄（破棄時の回復処理はmoveSubToGrave側で共通処理）
          if (!festival) {
            card.elapsed += 1;
            if (card.elapsed >= card.duration) moveSubToGrave(owner, card, "3ターンが経過");
          }
        } else if (card.effect.kind === "healOnPlaceSelfDamageOnDiscard") {
          // 夢：3ターン経過で自動破棄（破棄時の自傷処理はmoveSubToGrave側で共通処理）
          if (!festival) {
            card.elapsed += 1;
            if (card.elapsed >= card.duration) moveSubToGrave(owner, card, "3ターンが経過");
          }
        } else if (card.effect.kind === "turnDamageGainCoin") {
          applyDamage(owner, target, card.effect.damage, `サブ『${card.name}』`);
          gainCoins(owner, card.effect.coin);
          log(`${owner.label}は『${card.name}』でコインを${card.effect.coin}枚獲得した。`, "good");
          if (!festival) {
            card.elapsed += 1;
            if (card.elapsed >= card.duration) moveSubToGrave(owner, card, "継続ターンが終了");
          }
        } else if (card.effect.kind === "selfDamageBlockSubs") {
          // 痺：設置された側が自傷し、その間新たなサブを置けなくなる（placeSub側でチェック）
          owner.hp = Math.max(0, owner.hp - card.effect.value);
          log(`${owner.label}の『痺』が${card.effect.value}ダメージを与えた。`, "strong");
          queueDamagePopup(owner, card.effect.value, false);
          if (!festival) {
            card.elapsed += 1;
            if (card.elapsed >= card.duration) moveSubToGrave(owner, card, "継続ターンが終了");
          }
          checkWin();
        } else if (card.effect.kind === "selfDamageTick") {
          owner.hp = Math.max(0, owner.hp - card.effect.value);
          log(`${owner.label}の『寒』が${card.effect.value}ダメージを与えた。`, "strong");
          queueDamagePopup(owner, card.effect.value, false);
          if (!festival) {
            card.elapsed += 1;
            if (card.elapsed >= card.duration) moveSubToGrave(owner, card, "継続ターンが終了");
          }
          checkWin();
        } else if (card.effect.kind === "turnBeaconGrantOne") {
          // 撒：手札のランダムな1枚にランダムなビーコンを1つ付与
          if (owner.hand.length > 0) {
            const pick = owner.hand[Math.floor(Math.random() * owner.hand.length)];
            const granted = grantBeacon(pick, 0.35);
            if (granted) log(`${owner.label}の『撒』：『${pick.name}』にビーコン「${BEACON_DEFS[granted].label}」${BEACON_DEFS[granted].icon}を付与した。`);
          }
          if (!festival) {
            card.elapsed += 1;
            if (card.elapsed >= card.duration) moveSubToGrave(owner, card, "継続ターンが終了");
          }
        } else if (card.effect.kind === "turnBeaconGrantMulti") {
          // 健：手札のランダムな1〜3枚にノーマルビーコンを1つずつ付与
          if (owner.hand.length > 0) {
            const num = Math.min(owner.hand.length, 1 + Math.floor(Math.random() * 3));
            const shuffled = [...owner.hand].sort(() => Math.random() - 0.5).slice(0, num);
            let count = 0;
            for (const c of shuffled) if (grantNormalBeacon(c)) count++;
            log(`${owner.label}の『健』：手札${count}枚にノーマルビーコンを付与した。`, "good");
          }
          if (!festival) {
            card.elapsed += 1;
            if (card.elapsed >= card.duration) moveSubToGrave(owner, card, "継続ターンが終了");
          }
        } else if (card.effect.kind === "turnGainCoinPercent") {
          // 利：保有コイン総数の割合分を毎ターン獲得
          const gained = Math.floor((owner.coins || 0) * (card.effect.percent / 100));
          gainCoins(owner, gained);
          log(`${owner.label}の『${card.name}』：コインを${gained}枚獲得した。`, "good");
          if (!festival) {
            card.elapsed += 1;
            if (card.elapsed >= card.duration) moveSubToGrave(owner, card, "継続ターンが終了");
          }
        } else if (card.effect.kind === "turnGainCoinPercentEscalating") {
          // 鉱：保有コイン総数の割合分を毎ターン獲得。割合は1ターンごとに+2%
          // 凸：『鉱』1凸 - 基本割合が5%→10%となる
          const basePercent = getLimitBreak("kou3", owner.isAI) >= 1 ? 10 : card.effect.basePercent;
          const currentPercent = basePercent + (card.elapsed || 0) * card.effect.increment;
          const gained = Math.floor((owner.coins || 0) * (currentPercent / 100));
          gainCoins(owner, gained);
          log(`${owner.label}の『${card.name}』：割合${currentPercent}%でコインを${gained}枚獲得した。`, "good");
          if (!festival) {
            card.elapsed += 1;
            if (card.elapsed >= card.duration) moveSubToGrave(owner, card, "継続ターンが終了");
          }
        } else if (card.effect.kind === "coinOnDiscard") {
          // 預：3ターン後に自動破棄。報酬はmoveSubToGrave側で処理
          if (!festival) {
            card.elapsed += 1;
            if (card.elapsed >= card.duration) moveSubToGrave(owner, card, "継続ターンが終了");
          }
        } else if (card.effect.kind === "damageToCoinTick") {
          // 銀：前ターンに受けたダメージ分をコインに変換
          const taken = owner._damageTakenLastTurn || 0;
          const gained = Math.floor(taken / card.effect.per) * card.effect.coin;
          if (gained > 0) {
            gainCoins(owner, gained);
            log(`${owner.label}の『${card.name}』：受けたダメージ${taken}からコインを${gained}枚獲得した。`, "good");
          }
          if (!festival) {
            card.elapsed += 1;
            if (card.elapsed >= card.duration) moveSubToGrave(owner, card, "継続ターンが終了");
          }
        } else if (card.effect.kind === "turnDamageConditionalHp") {
          // 怪：自身のHPが半分以下なら強化ダメージ
          const dmg = owner.hp <= Math.floor(getMaxHP(owner) / 2) ? card.effect.boosted : card.effect.base;
          applyDamage(owner, target, dmg, `サブ『${card.name}』`);
          if (!festival) {
            card.elapsed += 1;
            if (card.elapsed >= card.duration) moveSubToGrave(owner, card, "継続ターンが終了");
          }
        } else if (card.effect.kind === "turnDamageConditionalFullSubs") {
          // 鯨：自身の他のサブ枠が全て埋まっていれば強化ダメージ
          const otherSubsCount = owner.subs.filter(s => s.instanceId !== card.instanceId).length;
          const isFull = otherSubsCount >= getSubLimit(owner) - 1;
          const dmg = isFull ? card.effect.boosted : card.effect.base;
          applyDamage(owner, target, dmg, `サブ『${card.name}』`);
          if (!festival) {
            card.elapsed += 1;
            if (card.elapsed >= card.duration) moveSubToGrave(owner, card, "継続ターンが終了");
          }
        } else if (card.effect.kind === "poisonTick") {
          owner.hp = Math.max(0, owner.hp - card.effect.value);
          log(`${owner.label}の『毒』が${card.effect.value}ダメージを与えた。`, "strong");
          queueDamagePopup(owner, card.effect.value, false);
          if (!festival) {
            card.elapsed += 1;
            if (card.elapsed >= card.duration) moveSubToGrave(owner, card, "継続ターンが終了");
          }
          checkWin();
        } else if (card.effect.kind === "guestTick") {
          const dmg = rollRangeDamage(owner, card.effect.min, card.effect.max);
          owner.hp = Math.max(0, owner.hp - dmg);
          log(`${owner.label}の『客』が${dmg}ダメージを与えた。`, "strong");
          queueDamagePopup(owner, dmg, false);
          if (!festival) {
            card.elapsed += 1;
            if (card.elapsed >= card.duration) moveSubToGrave(owner, card, "継続ターンが終了");
          }
          checkWin();
        } else if (card.effect.kind === "eggBurst") {
          if (!festival) {
            card.elapsed += 1;
            if (card.elapsed >= card.duration) moveSubToGrave(owner, card, "3ターンが経過");
          }
        } else if (card.effect.kind === "healOverTime") {
          healHp(owner, card.effect.value);
          log(`${owner.label}の『${card.name}』でHPを${card.effect.value}回復した。`, "good");
          if (!festival) {
            card.elapsed += 1;
            if (card.elapsed >= card.duration) moveSubToGrave(owner, card, "継続ターンが終了");
          }
        } else if (card.effect.kind === "healOverTimeEscalating") {
          // 爽：回復量がターン経過ごとに増加していく
          if (card._healValue === undefined) card._healValue = card.effect.value;
          healHp(owner, card._healValue);
          log(`${owner.label}の『${card.name}』でHPを${card._healValue}回復した。`, "good");
          card._healValue += (card.effect.growth || 0);
          if (!festival) {
            card.elapsed += 1;
            if (card.elapsed >= card.duration) moveSubToGrave(owner, card, "継続ターンが終了");
          }
        } else if (card.effect.kind === "healAndTurnDamage") {
          // 菌：毎ターンHP回復しつつ相手にダメージ
          healHp(owner, card.effect.heal);
          log(`${owner.label}の『${card.name}』でHPを${card.effect.heal}回復した。`, "good");
          owner._activeBoostMultiplier = (card.beacons && card.beacons.includes("boost")) ? 2 : 1;
          applyDamage(owner, target, card.effect.value, `サブ『${card.name}』`);
          owner._activeBoostMultiplier = 1;
          if (!festival) {
            card.elapsed += 1;
            if (card.elapsed >= card.duration) moveSubToGrave(owner, card, "継続ターンが終了");
          }
        } else if (card.effect.kind === "hpBarrier") {
          // 凪・耐：バリア展開中はターン経過のみ処理（ダメージ吸収はapplyDamage側）
          if (!festival) {
            card.elapsed += 1;
            if (card.elapsed >= card.duration) moveSubToGrave(owner, card, "継続ターンが終了");
          }
        } else if (card.effect.kind === "healOverTimeDamageOnDiscard") {
          // 桜：毎ターンHP回復。破棄時の反撃ダメージはmoveSubToGrave側で共通処理
          healHp(owner, card.effect.value);
          log(`${owner.label}の『${card.name}』でHPを${card.effect.value}回復した。`, "good");
          if (!festival) {
            card.elapsed += 1;
            if (card.elapsed >= card.duration) moveSubToGrave(owner, card, "継続ターンが終了");
          }
        } else if (card.effect.kind === "bonusDamage") {
          // 凸：『怨』4凸 - ターンが経過する度に与えるダメージ+5%
          if (card.id === "urami" && getLimitBreak("urami", owner.isAI) >= 4 && !festival) {
            card._urami5pctStacks = (card._urami5pctStacks || 0) + 1;
          }
          if (!festival) {
            card.elapsed += 1;
            if (card.elapsed >= card.duration) moveSubToGrave(owner, card, "継続ターンが終了");
          }
        } else if (card.effect.kind === "guardTurn") {
          if (card.id === "go" && getLimitBreak("go", owner.isAI) >= 2) {
            healHp(owner, 400);
            log(`『${card.name}』の凸効果で${owner.label}のHPを400回復した。`, "good");
          }
          if (!festival) {
            card.elapsed += 1;
            if (card.elapsed >= card.duration) moveSubToGrave(owner, card, "継続ターンが終了");
          }
        } else if (card.effect.kind === "extraHit") {
          // 連：elapsed は攻撃発動時にカウント
        } else if (card.effect.kind === "healTick") {
          // 玖：HPを毎ターン回復
          healHp(owner, card.effect.value);
          log(`${owner.label}の『玖』でHPを${card.effect.value}回復した。`, "good");
          if (!festival) {
            card.elapsed += 1;
            if (card.elapsed >= card.duration) moveSubToGrave(owner, card, "継続ターンが終了");
          }
        } else if (card.effect.kind === "timeBomb") {
          // 億：ターンカウント
          if (!festival) {
            card.elapsed += 1;
            if (card.elapsed >= card.duration) {
              const idx = owner.subs.findIndex(c => c.instanceId === card.instanceId);
              if (idx >= 0) owner.subs.splice(idx, 1);
              log(`${owner.label}の『億』が${card.duration}ターン経過で自動破棄。相手に270ダメージ。`);
              applyDamage(owner, target, 270, `『億』自動破棄`);
            }
          }
        } else if (card.effect.kind === "endTurnDraw") {
          // 肆：ターン終了時に1枚ドロー
          const drawn = drawCards(owner, 1);
          owner.hand.push(...drawn);
          if (drawn.length) log(`${owner.label}の『肆』で${drawn.length}枚ドローした。`, "good");
          if (!festival) {
            card.elapsed += 1;
            if (card.elapsed >= card.duration) moveSubToGrave(owner, card, "継続ターンが終了");
          }
        }
        // ── キングデッキ ──
        else if (card.effect.kind === "kingPresence") {
          // 王：毎ターンダメージ、ターン経過で消失しない
          const ouLB = getLimitBreak("ou", owner.isAI);
          const ouDmg = ouLB >= 2 ? 800 : card.effect.value;
          applyDamage(owner, target, ouDmg, `『王』`);
        } else if (card.effect.kind === "shiroCity") {
          // 城：自ターン終了時1枚ドロー、3T継続（王がいれば消失しない）。王がいなければサーチ。
          const drawn = drawCards(owner, 1);
          owner.hand.push(...drawn);
          if (drawn.length) log(`${owner.label}の『城』で${drawn.length}枚ドローした。`, "good");
          if (kingNotInHandOrSub(owner)) fetchKingTo(owner, "hand");
          if (!hasKing(owner) && !festival) {
            card.elapsed += 1;
            if (card.elapsed >= card.duration) moveSubToGrave(owner, card, "継続ターンが終了");
          }
        } else if (card.effect.kind === "muraVillage") {
          // 村：HP回復、王がいれば消失しない
          healHp(owner, card.effect.value);
          log(`${owner.label}の『村』でHPを${card.effect.value}回復した。`, "good");
          if (!hasKing(owner) && !festival) {
            card.elapsed += 1;
            if (card.elapsed >= card.duration) moveSubToGrave(owner, card, "継続ターンが終了");
          }
        } else if (card.effect.kind === "touTower") {
          // 塔：メインダメージ時+250（applyDamageのbonusDamageと同種に近いが個別kindのため毎ターンの消費のみ処理）
          if (!hasKing(owner) && !festival) {
            card.elapsed += 1;
            if (card.elapsed >= card.duration) moveSubToGrave(owner, card, "継続ターンが終了");
          }
        } else if (card.effect.kind === "yaArrow") {
          // 矢：8ターン後に自動破棄、破棄時に相手へ265ダメ
          if (!festival) {
            card.elapsed += 1;
            if (card.elapsed >= card.duration) {
              moveSubToGrave(owner, card, `${card.duration}ターンが経過`);
            }
          }
        } else if (card.effect.kind === "gaiArmor") {
          if (!festival) {
            card.elapsed += 1;
            if (card.elapsed >= card.duration) moveSubToGrave(owner, card, "継続ターンが終了");
          }
        } else if (card.effect.kind === "matsuriFestival") {
          // 祭自身は常にカウントが進む（祭の免除対象外）
          // 凸：『祭』2凸 - 毎ターンHPを250回復する
          if (getLimitBreak("matsuri", owner.isAI) >= 2) {
            healHp(owner, 250);
            log(`『祭』の凸効果で${owner.label}のHPを250回復した。`, "good");
          }
          card.elapsed += 1;
          if (card.elapsed >= card.duration) moveSubToGrave(owner, card, "4ターンが経過");
        } else if (card.effect.kind === "genIllusion") {
          // 幻：毎ターン680ダメージ。確率100%化効果と合わせて継続ターンを管理
          owner._activeBoostMultiplier = (card.beacons && card.beacons.includes("boost")) ? 2 : 1;
          owner._activeDamageCard = card;
          applyDamage(owner, target, card.effect.value, `サブ『${card.name}』`);
          owner._activeDamageCard = null;
          owner._activeBoostMultiplier = 1;
          if (!festival) {
            card.elapsed += 1;
            if (card.elapsed >= card.duration) moveSubToGrave(owner, card, "継続ターンが終了");
          }
        } else if (card.effect.kind === "haBlade") {
          // 刃：ターン経過では変化しない（自軍墓地の枚数変化はcheckHaBladeGraveChangesで検知）
        } else if (card.effect.kind === "lightPresence") {
          // 光：自ターン終了時（このtick）に毎回コストを獲得する
          owner.elementCost = Math.min(ELEMENT_COST_MAX, (owner.elementCost || 0) + card.effect.costGain);
          log(`${owner.label}の『${card.name}』でコストを${card.effect.costGain}獲得した。`, "good");
          if (!festival) {
            card.elapsed += 1;
            if (card.elapsed >= card.duration) moveSubToGrave(owner, card, "継続ターンが終了");
          }
        }
      }
      // 玖の満杯チェック：自分か相手のサブが満杯なら破棄
      checkKuCondition(owner);
      checkKuCondition(opponentOf(owner));
      // 兆の満杯チェック（1凸）：自分か相手のサブが満杯なら破棄
      checkTyoCondition(owner);
      checkTyoCondition(opponentOf(owner));
    }

    function moveSubToGrave(owner, card, reason) {
      const index = owner.subs.findIndex(item => item.instanceId === card.instanceId);
      if (index < 0) return;
      owner.subs.splice(index, 1);
      equipOnSubDiscard(owner); // 装備品『クラゲの置物』
      checkHaBladeGraveChanges();
      // ビーコン「カウンター」：破棄時に相手へ600ダメージ
      if (card.beacons && card.beacons.includes("counter")) {
        owner._activeBoostMultiplier = (card.beacons && card.beacons.includes("boost")) ? 2 : 1;
        applyDamage(owner, opponentOf(owner), 600, `『${card.name}』のビーコン「カウンター」🪞`, true);
        owner._activeBoostMultiplier = 1;
      }
      // 夢：理由問わず破棄された時、自身は5000ダメージを受ける
      if (card.effect.kind === "healOnPlaceSelfDamageOnDiscard") {
        owner.hp = Math.max(0, owner.hp - card.effect.selfDamage);
        log(`『${card.name}』が破棄され、${owner.label}は${card.effect.selfDamage}ダメージを受けた。`, "strong");
        checkWin();
      }
      // ビーコン「粘着」があれば粘着自身だけ剝がし、なければ全て剝がす
      stripBeaconsOnGrave(card);
      // 移動元が記録されているカードは元の持ち主の墓地へ
      const graveOwner = card._stolenFrom
        ? (card._stolenFrom === "player" ? game.player : game.ai)
        : owner;
      // 凸：『王』1凸 - 破棄されても墓地に行かず山札へ戻る
      if (card.id === "ou" && getLimitBreak("ou", owner.isAI) >= 1) {
        card.elapsed = 0;
        graveOwner.deck = shuffle([...graveOwner.deck, card]);
        log(`${owner.label}の『${card.name}』は${reason}し、${graveOwner === owner ? "山札へ戻っ" : `${graveOwner.label}の山札へ戻っ`}た。`, "good");
      } else {
        if (!card.noGrave) graveOwner.grave.push(card);
        log(`${owner.label}の『${card.name}』は${reason}し、${card.noGrave ? "消滅" : (graveOwner === owner ? "墓地へ送られ" : `${graveOwner.label}の墓地へ送られ`)}た。`);
      }
      if (card.effect.kind === "yaArrow") {
        applyDamage(owner, opponentOf(owner), card.effect.value, `『矢』破棄`, false, true);
      }
      // 願(healOnDiscard)：理由問わず破棄された時、HPを回復する
      if (card.effect.kind === "healOnDiscard") {
        healHp(owner, card.effect.value);
        log(`${owner.label}の『${card.name}』が破棄され、HPを${card.effect.value}回復した。`, "good");
      }
      // 桜(healOverTimeDamageOnDiscard)：理由問わず破棄された時、相手にダメージを与える
      if (card.effect.kind === "healOverTimeDamageOnDiscard") {
        applyDamage(owner, opponentOf(owner), card.effect.discardDamage, `『${card.name}』破棄`, false, false);
        log(`${owner.label}の『${card.name}』が破棄され、相手に${card.effect.discardDamage}ダメージを与えた。`, "good");
      }
      // 預(coinOnDiscard)：理由問わず破棄された時、保有コイン総数の割合分を獲得
      if (card.effect.kind === "coinOnDiscard") {
        const gained = Math.floor((owner.coins || 0) * (card.effect.percent / 100));
        gainCoins(owner, gained);
        log(`${owner.label}の『${card.name}』が破棄され、コインを${gained}枚獲得した。`, "good");
      }
      // 鉱(turnGainCoinPercentEscalating)：継続ターン終了以外の理由で早期に破棄された場合のボーナス
      if (card.effect.kind === "turnGainCoinPercentEscalating" && reason !== "継続ターンが終了") {
        gainCoins(owner, card.effect.earlyBonus);
        log(`${owner.label}の『${card.name}』が早期に破棄され、コインを${card.effect.earlyBonus}枚獲得した。`, "good");
      }
      // 兆(timeBomb)：duration経過による自動破棄以外（早期破棄）は全てここを通るため、ここで2700ダメージを処理する
      if (card.effect.kind === "timeBomb") {
        applyDamage(owner, opponentOf(owner), 2700, `『兆』早期破棄`, false, true);
      }
      // 凸：『狂』1凸 - このカードが破棄された時、相手に1200ダメージを与える
      if (card.id === "kyo3" && getLimitBreak("kyo3", owner.isAI) >= 1) {
        applyDamage(owner, opponentOf(owner), 1200, `『${card.name}』の凸効果`, true);
      }
      // 凸：『億』2凸 - このカードが破棄された時、山札からカードを2枚引く
      if (card.id === "oku" && getLimitBreak("oku", owner.isAI) >= 2) {
        const drawn = drawCards(owner, Math.min(2, MAX_HAND - owner.hand.length));
        if (drawn.length > 0) {
          owner.hand.push(...drawn);
          log(`『${card.name}』の凸効果：${owner.label}は山札から${drawn.length}枚引いた。`, "good");
        }
      }
      // 卵バースト：手札が7枚になるまでドロー
      if (card.effect.kind === "eggBurst") {
        const need = MAX_HAND - owner.hand.length;
        if (need > 0) {
          const drawn = drawCards(owner, need);
          owner.hand.push(...drawn);
          log(`${owner.label}の『卵』が孵化！${drawn.length}枚ドローした。`, "good");
        }
      }
      // 照：破棄された時、追加で「月照」を3層付与する
      if (card.effect.kind === "teruDraw") {
        applyStatus(owner, "moonlit", 3);
      }
      // 呪：破棄された時、相手に「アルカナ」を付与する
      if (card.effect.kind === "turnDamageRandomAilmentsDiscardArcana") {
        const t = opponentOf(owner);
        applyStatus(t, "arcana", card.effect.arcanaOnDiscard || 6);
        log(`${owner.label}の『${card.name}』が破棄され、相手に「アルカナ」🔮を${card.effect.arcanaOnDiscard || 6}層付与した。`, "good");
      }
    }

