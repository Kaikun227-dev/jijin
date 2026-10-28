    function applyDamage(source, target, amount, label, isBonus = false, isMain = false, ailmentKey = null) {
      if (!Number.isFinite(amount) || amount <= 0 || game.gameOver) return false;

      // ビーコン「ブースト」：現在発動中のカードの与えるダメージを常に2倍にする
      if (!isBonus && source._activeBoostMultiplier && source._activeBoostMultiplier !== 1) {
        const beforeBoost = amount;
        amount = amount * source._activeBoostMultiplier;
        log(`ビーコン「ブースト」🐦‍🔥：ダメージが${beforeBoost}→${amount}に倍増した。`, "good");
      }

      // 凸：このカードが与える全てのダメージ％アップ
      if (!isBonus && source._activeDamageCard) {
        const pct = limitBreakDamagePercent(source._activeDamageCard, source.isAI);
        if (pct > 0) {
          const before = amount;
          amount = Math.round(amount * (1 + pct / 100));
          if (amount !== before) log(`凸効果でダメージが${before}→${amount}に増加した。`, "good");
        }
      }

      // 装備品：木こりの斧（☆1カード）・水鉄砲（全カード）・風景画（サブカード）
      if (!isBonus && !ailmentKey) {
        equipDamageEffects(source).forEach(({ def, pct }) => {
          const before = amount;
          amount = Math.round(amount * (1 + pct / 100));
          if (amount !== before) log(`『${def.name}』${def.icon}で${source.label}の与えるダメージが${before}→${amount}に増加した。`, "good");
        });
      }

      // 凸：『似』4凸 - 似によって再発動したカードのダメージ50%アップ
      if (!isBonus && source._niRepeatBoostPercent) {
        const before = amount;
        amount = Math.round(amount * (1 + source._niRepeatBoostPercent / 100));
        if (amount !== before) log(`『似』の凸効果でダメージが${before}→${amount}に増加した。`, "good");
      }

      // 凸：『狐』4凸 - 狐によって再発動したカードのダメージ50%アップ
      if (!isBonus && source._kitsuneRepeatBoostPercent) {
        const before = amount;
        amount = Math.round(amount * (1 + source._kitsuneRepeatBoostPercent / 100));
        if (amount !== before) log(`『狐』の凸効果でダメージが${before}→${amount}に増加した。`, "good");
      }

      // 凸：『防』4凸 - このカードがフィールドに存在する間、全てのカードの与えるダメージ+10%
      if (!isBonus) {
        const ki3Present = [source, target].some(o => o.subs && o.subs.some(s => s.id === "ki3" && getLimitBreak("ki3", o.isAI) >= 4));
        if (ki3Present) {
          const before = amount;
          amount = Math.round(amount * 1.1);
          if (amount !== before) log(`『防』の凸効果で与えるダメージが${before}→${amount}に増加した。`, "good");
        }
      }

      // 凸：『鯨』1凸 - このカードがフィールドに存在する間、全てのカードの与えるダメージ+10%
      if (!isBonus) {
        const kujiraPresent = [source, target].some(o => o.subs && o.subs.some(s => s.id === "kujira" && getLimitBreak("kujira", o.isAI) >= 1));
        if (kujiraPresent) {
          const before = amount;
          amount = Math.round(amount * 1.1);
          if (amount !== before) log(`『鯨』の凸効果で与えるダメージが${before}→${amount}に増加した。`, "good");
        }
      }

      // 凸：『酸』2凸 - 場に存在する間、自分の与える全てのダメージ+10%
      if (!isBonus && source.subs && source.subs.some(s => s.id === "san" && getLimitBreak("san", source.isAI) >= 2)) {
        const before = amount;
        amount = Math.round(amount * 1.1);
        if (amount !== before) log(`『酸』の凸効果で${source.label}の与えるダメージが${before}→${amount}に増加した。`, "good");
      }

      // 凸：『玖』2凸 - 場に存在する間、他のカードの与えるダメージ+10%
      if (!isBonus && source.subs && source.subs.some(s => s.id === "ku" && getLimitBreak("ku", source.isAI) >= 2)) {
        const before = amount;
        amount = Math.round(amount * 1.1);
        if (amount !== before) log(`『玖』の凸効果で${source.label}の与えるダメージが${before}→${amount}に増加した。`, "good");
      }

      // 凸：『零』4凸 - 再発動されたカードのダメージ+50%
      if (!isBonus && source._zeroRepeatBoostPercent) {
        const before = amount;
        amount = Math.round(amount * (1 + source._zeroRepeatBoostPercent / 100));
        if (amount !== before) log(`『零』の凸効果でダメージが${before}→${amount}に増加した。`, "good");
      }

      // 凸：『兆』2凸 - 場に存在する間、相手の与えるダメージ-15%
      if (!isBonus && target.subs && target.subs.some(s => s.id === "tyo" && getLimitBreak("tyo", target.isAI) >= 2)) {
        const before = amount;
        amount = Math.round(amount * 0.85);
        if (amount !== before) log(`『兆』の凸効果で${target.label}が受けるダメージが${before}→${amount}に減少した。`, "good");
      }

      // 凸：『皇』4凸 - 再現したカードのダメージ+30%
      if (!isBonus && source._kouReplayBoostPercent) {
        const before = amount;
        amount = Math.round(amount * (1 + source._kouReplayBoostPercent / 100));
        if (amount !== before) log(`『皇』の凸効果でダメージが${before}→${amount}に増加した。`, "good");
      }

      // 凸：『凛』4凸 - このカードによって発動したカードのダメージ+30%
      if (!isBonus && source._rinReplayBoostPercent) {
        const before = amount;
        amount = Math.round(amount * (1 + source._rinReplayBoostPercent / 100));
        if (amount !== before) log(`『凛』の凸効果でダメージが${before}→${amount}に増加した。`, "good");
      }

      // 凸：『耐』1凸 - 場に存在する間、自分の他のカードが与えるダメージ+10%
      if (!isBonus && source.subs && source.subs.some(s => s.id === "tai2" && getLimitBreak("tai2", source.isAI) >= 1)) {
        const before = amount;
        amount = Math.round(amount * 1.1);
        if (amount !== before) log(`『耐』の凸効果で${source.label}の与えるダメージが${before}→${amount}に増加した。`, "good");
      }
      // 凸：『耐』2凸 - 場に存在する時、相手の与えるダメージ-20%
      if (!isBonus && target.subs && target.subs.some(s => s.id === "tai2" && getLimitBreak("tai2", target.isAI) >= 2)) {
        const before = amount;
        amount = Math.round(amount * 0.8);
        if (amount !== before) log(`『耐』の凸効果で${target.label}が受けるダメージが${before}→${amount}に減少した。`, "good");
      }

      // 凸：『幻』4凸 - 場に存在する間、自分の他のカードが与えるダメージ+20%（自身の設置ダメージには乗らない）
      if (!isBonus && source.subs && source.subs.some(s => s.id === "gen" && getLimitBreak("gen", source.isAI) >= 4)
          && !(source._activeDamageCard && source._activeDamageCard.id === "gen")) {
        const before = amount;
        amount = Math.round(amount * 1.2);
        if (amount !== before) log(`『幻』の凸効果で${source.label}の与えるダメージが${before}→${amount}に増加した。`, "good");
      }

      // 凸：『王』4凸 - 場に存在する間、他のカードの与えるダメージ+20%
      if (!isBonus && source.subs && source.subs.some(s => s.id === "ou" && getLimitBreak("ou", source.isAI) >= 4)) {
        const before = amount;
        amount = Math.round(amount * 1.2);
        if (amount !== before) log(`『王』の凸効果で${source.label}の与えるダメージが${before}→${amount}に増加した。`, "good");
      }

      // アルカナデッキ：『気』『力』など、場に存在する間他カードの与えるダメージ+n%（複数所持時は重ね掛け）
      if (!isBonus && source.subs) {
        source.subs.filter(s => s.effect.kind === "auraDamageBuff").forEach(auraCard => {
          const before = amount;
          amount = Math.round(amount * (1 + auraCard.effect.pct / 100));
          if (amount !== before) log(`『${auraCard.name}』の効果で${source.label}の与えるダメージが${before}→${amount}に増加した。`, "good");
        });
      }

      // ビーコン「ダメージバフ」🏹：場に存在する間、他のカードの与えるダメージ+10%
      if (!isBonus && source.subs && source.subs.some(s => s.beacons && s.beacons.includes("dmgBuffAura") && !hasBlankBeaconKind(s, "sub"))) {
        const before = amount;
        amount = Math.round(amount * 1.1);
        if (amount !== before) log(`ビーコン「ダメージバフ」🏹で${source.label}の与えるダメージが${before}→${amount}に増加した。`, "good");
      }
      // ビーコン「ダメージデバフ」🎭：場に存在する間、他のカードの与えるダメージ-20%
      if (!isBonus && source.subs && source.subs.some(s => s.beacons && s.beacons.includes("dmgDebuffAura") && !hasBlankBeaconKind(s, "sub"))) {
        const before = amount;
        amount = Math.round(amount * 0.8);
        if (amount !== before) log(`ビーコン「ダメージデバフ」🎭で${source.label}の与えるダメージが${before}→${amount}に減少した。`, "strong");
      }

      // 状態異常「火傷」🔥：与えるダメージ-5%×層数
      if (!isBonus && getStatusStack(source, "burn") > 0) {
        const before = amount;
        amount = Math.round(amount * (1 - 0.05 * getStatusStack(source, "burn")));
        if (amount !== before) log(`状態異常「火傷」🔥で${source.label}の与えるダメージが${before}→${amount}に減少した。`, "strong");
      }
      // 状態異常「栄光」⚜️：与えるダメージ+10%×層数
      if (!isBonus && getStatusStack(source, "glory") > 0) {
        const before = amount;
        amount = Math.round(amount * (1 + 0.10 * getStatusStack(source, "glory")));
        if (amount !== before) log(`状態異常「栄光」⚜️で${source.label}の与えるダメージが${before}→${amount}に増加した。`, "good");
      }
      // 状態異常「脆弱」💔：受けるダメージ+5%×層数
      if (!isBonus && getStatusStack(target, "fragile") > 0) {
        const before = amount;
        amount = Math.round(amount * (1 + 0.05 * getStatusStack(target, "fragile")));
        if (amount !== before) log(`状態異常「脆弱」💔で${target.label}が受けるダメージが${before}→${amount}に増加した。`, "strong");
      }
      // 状態異常「革命」🚩：☆1カードの与えるダメージ+300％、☆2・☆3カードの与えるダメージ-50％
      if (!isBonus && getStatusStack(source, "revolution") > 0 && source._activeDamageCard) {
        const cardRarity = source._activeDamageCard.rarity;
        const before = amount;
        if (cardRarity === 1) {
          amount = Math.round(amount * 4);
        } else if (cardRarity === 2 || cardRarity === 3) {
          amount = Math.round(amount * 0.5);
        }
        if (amount !== before) log(`状態異常「革命」🚩で${source.label}の与えるダメージが${before}→${amount}に変化した。`, "strong");
      }

      // 凸：『城』4凸 - 場に存在する時、相手の与えるダメージ-10%
      if (!isBonus && target.subs && target.subs.some(s => s.id === "shir" && getLimitBreak("shir", target.isAI) >= 4)) {
        const before = amount;
        amount = Math.round(amount * 0.9);
        if (amount !== before) log(`『城』の凸効果で${target.label}が受けるダメージが${before}→${amount}に減少した。`, "good");
      }

      // 凸：『祭』4凸 - 場に存在する時、他のサブカードの与えるダメージ+20%
      if (!isBonus && !isMain && source.subs && source.subs.some(s => s.id === "matsuri" && getLimitBreak("matsuri", source.isAI) >= 4)) {
        const before = amount;
        amount = Math.round(amount * 1.2);
        if (amount !== before) log(`『祭』の凸効果で${source.label}のサブの与えるダメージが${before}→${amount}に増加した。`, "good");
      }

      // エレメント「火」：3ターンの間、与えるダメージ％アップ
      if (!isBonus && source._elementFireBuff && source._elementFireBuff.turnsLeft > 0) {
        const before = amount;
        amount = Math.round(amount * (1 + source._elementFireBuff.pct / 100));
        if (amount !== before) log(`エレメント「火」の効果でダメージが${before}→${amount}に増加した。`, "good");
      }
      // エレメント「土」（強化版）：次に出したメインカードのダメージ+80%
      if (!isBonus && isMain && source._activeEarthMainBoostPct) {
        const before = amount;
        amount = Math.round(amount * (1 + source._activeEarthMainBoostPct / 100));
        if (amount !== before) log(`エレメント「土」の効果でダメージが${before}→${amount}に増加した。`, "good");
      }

      // 倍(damageDouble)：次のダメージを2倍
      if (!isBonus && source._nextDamageDouble) {
        amount = amount * 2;
        log(`『倍』発動！ダメージが${amount}に倍増。`, "good");
        source._nextDamageDouble = false;
        // 倍カード自体を破棄
        const dblCard = source.subs.find(s => s.effect.kind === "damageDouble");
        if (dblCard) moveSubToGrave(source, dblCard, "効果を発動");
      }

      // 強(nextMainDamageBoost)：次に出すメインカードの与えるダメージ+30%
      if (!isBonus && isMain && source._nextMainDamageBoostPct) {
        const before = amount;
        amount = Math.round(amount * (1 + source._nextMainDamageBoostPct / 100));
        if (amount !== before) log(`『強』発動！ダメージが${before}→${amount}に増加した。`, "good");
        source._nextMainDamageBoostPct = 0;
        const kyouCard = source.subs.find(s => s.effect.kind === "nextMainDamageBoost");
        if (kyouCard) moveSubToGrave(source, kyouCard, "効果を発動");
      }

      // コイン強化：このターン中、メインダメージを倍率強化
      if (isMain && !isBonus && source._coinBuffMultiplier) {
        amount = Math.round(amount * source._coinBuffMultiplier);
        log(`コインの強化効果でダメージが${amount}に増加！`, "good");
      }

      // ビーコン：ダメージアップ／ダメージダウン（メインカードの与えるダメージを増減）
      if (isMain && !isBonus && source._mainBeaconDmgMod) {
        const before = amount;
        amount = Math.max(0, amount + source._mainBeaconDmgMod);
        if (amount !== before) log(`ビーコン効果でダメージが${before}→${amount}に変化した。`, "good");
      }

      // 装備品：簡易プロテクター（相手からの最初の攻撃を1回だけ防ぐ）
      if (equipTryBlockFirstAttack(source, target, label, amount, ailmentKey)) return false;

      const guard = target.subs.find(card => card.effect.kind === "guardTurn");
      if (guard) {
        log(`${target.label}の『${guard.name}』が${label}の${amount}ダメージを防いだ。`);
        return false;
      }

      // 凪・耐(hpBarrier)：バリアが受けたダメージを吸収する。バリアを超えた分は通常通り受ける
      const barrier = target.subs.find(card => card.effect.kind === "hpBarrier");
      if (barrier) {
        if (barrier.barrierHp === undefined) {
          // 凸：『耐』4凸 - バリアの耐久値[5000→6000]
          barrier.barrierHp = (barrier.id === "tai2" && getLimitBreak("tai2", target.isAI) >= 4)
            ? 6000
            : barrier.effect.value;
        }
        if (barrier.barrierHp >= amount) {
          barrier.barrierHp -= amount;
          log(`${target.label}の『${barrier.name}』が${label}の${amount}ダメージを防いだ（残りバリア：${barrier.barrierHp}）。`);
          return false;
        } else {
          const overflow = amount - barrier.barrierHp;
          log(`${target.label}の『${barrier.name}』が${label}の${barrier.barrierHp}ダメージを防いだが、バリアが破壊され超過分${overflow}ダメージを受けた。`, "strong");
          moveSubToGrave(target, barrier, "バリアが破壊された");
          amount = overflow;
        }
      }

      // 鎧(gaiArmor)：サブカードからのダメージを無効化（メイン由来かサブ由来かで判定）
      if (!isMain) {
        const armor = target.subs.find(card => card.effect.kind === "gaiArmor");
        if (armor) {
          log(`${target.label}の『鎧』がサブ由来の${label}の${amount}ダメージを無効化した。`);
          return false;
        }
      }

      // 鏡(reflectOnce)：ダメージを反射
      const mirror = target.subs.find(card => card.effect.kind === "reflectOnce");
      if (mirror && !isBonus) {
        mirror.elapsed = (mirror.elapsed || 0) + 1;
        log(`${target.label}の『鏡』が${label}の${amount}ダメージを反射！（${mirror.elapsed}/${mirror.maxTriggers}）`, "strong");
        if (mirror.elapsed >= mirror.maxTriggers) moveSubToGrave(target, mirror, "反射効果を発動");
        source.hp = Math.max(0, source.hp - amount);
        log(`${label}が${source.label}に${amount}ダメージを与えた！（反射）`, "strong");
        if (ailmentKey) queueAilmentPopup(source, amount, ailmentKey);
        else queueDamagePopup(source, amount, isMain);
        checkWin();
        return false;
      }

      const shield = target.subs.find(card => card.effect.kind === "blockOnce");
      if (shield) {
        log(`${target.label}の『${shield.name}』が${label}の${amount}ダメージを防いだ。`);
        moveSubToGrave(target, shield, "攻撃を防いだ");
        return false;
      }

      // 防(blockMulti)：メイン・サブ問わずダメージを防ぐ。3回発動後に破棄。
      if (!isBonus) {
        const kiBlock = target.subs.find(card => card.effect.kind === "blockMulti");
        if (kiBlock) {
          kiBlock.elapsed = (kiBlock.elapsed || 0) + 1;
          log(`${target.label}の『${kiBlock.name}』が${label}の${amount}ダメージを防いだ（${kiBlock.elapsed}/${kiBlock.maxTriggers}）。`);
          if (kiBlock.elapsed >= kiBlock.maxTriggers) moveSubToGrave(target, kiBlock, "3回発動し破棄");
          return false;
        }
      }

      // 騙(damageReduceRandom)：受けるダメージを0～元の値の乱数値に軽減。2回発動後に破棄。
      if (!isBonus) {
        const hen = target.subs.find(card => card.effect.kind === "damageReduceRandom");
        if (hen) {
          const original = amount;
          amount = Math.floor(Math.random() * (original + 1));
          hen.elapsed = (hen.elapsed || 0) + 1;
          log(`『騙』発動（${hen.elapsed}/${hen.maxTriggers}）：${original}ダメージ→${amount}ダメージに軽減！`, "good");
          if (hen.elapsed >= hen.maxTriggers) moveSubToGrave(target, hen, "2回発動し破棄");
        }
      }

      target.hp = Math.max(0, target.hp - amount);
      equipOnCombatDamageTaken(target, source, amount); // 装備品『反射鏡』
      if (ailmentKey) queueAilmentPopup(target, amount, ailmentKey);
      else queueDamagePopup(target, amount, isMain);
      if (game.stats && source === game.player) {
        game.stats.maxDamage = Math.max(game.stats.maxDamage, amount);
        if (amount >= 10000) {
          maybeNotifyMissionProgressUpdate(() => {
            game.stats.hits10kCount = (game.stats.hits10kCount || 0) + 1; // ミッション用
          });
        }
      }
      log(`${label}が${target.label}に${amount}ダメージを与えた！`, "strong");
      if (!isBonus) target._damageTakenThisTurn = (target._damageTakenThisTurn || 0) + amount;

      // 状態異常「出血」🩸：カードによってダメージを受ける度に、追加で100ダメージ×層数を受ける
      if (!isBonus && getStatusStack(target, "shukketsu") > 0) {
        const bleedDmg = getStatusStack(target, "shukketsu") * 100;
        applyDamage(source, target, bleedDmg, `状態異常「出血」🩸の追加ダメージ`, true, false, "shukketsu");
      }

      // コインデッキ：与えたダメージ100につきコインを1枚獲得
      if (hasCoinSpace(source) && source !== target) {
        const coinGain = Math.floor(amount / 100);
        if (coinGain > 0) {
          gainCoins(source, coinGain);
          log(`${source.label}はダメージによりコインを${coinGain}枚獲得した。`, "good");
        }
      }

      // 溶(healOnDamage)：ダメージを受けた時、HPを370回復する。3回発動後に破棄。
      const you2Card = target.subs.find(card => card.effect.kind === "healOnDamage");
      if (you2Card) {
        you2Card.elapsed = (you2Card.elapsed || 0) + 1;
        healHp(target, you2Card.effect.value);
        log(`${target.label}の『溶』発動（${you2Card.elapsed}/${you2Card.maxTriggers}）：HPを${you2Card.effect.value}回復した。`, "good");
        if (you2Card.elapsed >= you2Card.maxTriggers) moveSubToGrave(target, you2Card, "3回発動し破棄");
      }

      // 保(healOnDamageOnce)：ダメージを受けた時、HPを1000回復する。1回発動後に破棄。
      const hoCard = target.subs.find(card => card.effect.kind === "healOnDamageOnce");
      if (hoCard) {
        healHp(target, hoCard.effect.value);
        log(`${target.label}の『保』発動：HPを${hoCard.effect.value}回復した。`, "good");
        moveSubToGrave(target, hoCard, "効果を発動");
      }

      // 塔(touTower)：メインダメージ時、追加で250ダメージ
      if (isMain && !isBonus) {
        const tower = source.subs.find(card => card.effect.kind === "touTower");
        if (tower) applyDamage(source, target, tower.effect.value, `『塔』の追加効果`, true);
      }
      // 追(mainBonusCounted)：メインダメージ時、追加ダメージ。5回発動後に破棄。
      if (isMain && !isBonus) {
        const tsuiCard = source.subs.find(card => card.effect.kind === "mainBonusCounted");
        if (tsuiCard) {
          tsuiCard.elapsed = (tsuiCard.elapsed || 0) + 1;
          applyDamage(source, target, tsuiCard.effect.value, `『追』の追加効果`, true);
          log(`『追』発動（${tsuiCard.elapsed}/${tsuiCard.maxTriggers}）！`, "good");
          if (tsuiCard.elapsed >= tsuiCard.maxTriggers) moveSubToGrave(source, tsuiCard, "5回発動し破棄");
        }
      }
      // 付(grantBeaconOnMainDamage)：メインダメージ時、自身の手札1枚にノーマルビーコンを付与
      if (isMain && !isBonus) {
        const fuCard = source.subs.find(card => card.effect.kind === "grantBeaconOnMainDamage");
        if (fuCard && source.hand.length > 0) {
          const pick = source.hand[Math.floor(Math.random() * source.hand.length)];
          if (grantNormalBeacon(pick)) {
            log(`『付』：『${pick.name}』にノーマルビーコンを付与した。`, "good");
          }
        }
      }
      // 吸(kyuuAbsorb)：メインダメージ時、そのダメージ分HP回復。1回発動後に破棄。
      if (isMain && !isBonus) {
        const kyuu = source.subs.find(card => card.effect.kind === "kyuuAbsorb");
        if (kyuu) {
          healHp(source, amount);
          log(`${source.label}の『吸』でHPを${amount}回復した。`, "good");
          moveSubToGrave(source, kyuu, "効果を発動");
        }
      }
      // 反(hanCounter)：相手のメインダメージを受けた時、反撃。2回発動後に破棄。
      if (isMain && !isBonus) {
        const han = target.subs.find(card => card.effect.kind === "hanCounter");
        if (han) {
          han.elapsed = (han.elapsed || 0) + 1;
          log(`『反』発動（${han.elapsed}/${han.maxTriggers}）`);
          applyDamage(target, source, han.effect.value, `『反』の反撃`, true);
          if (han.elapsed >= han.maxTriggers) moveSubToGrave(target, han, "2回発動し破棄");
        }
      }

      if (!isBonus) {
        const bonusCards = source.subs.filter(card => card.effect.kind === "bonusDamage");
        for (const bonusCard of bonusCards) {
          let bonusValue = bonusCard.effect.value;
          // 凸：『怨』1凸 - 与えるダメージが[360→420]となる
          if (bonusCard.id === "urami" && getLimitBreak("urami", source.isAI) >= 1) bonusValue = 420;
          // 凸：『怨』4凸 - ターンが経過する度に与えるダメージ+5%
          if (bonusCard.id === "urami" && bonusCard._urami5pctStacks) {
            bonusValue = Math.round(bonusValue * (1 + 0.05 * bonusCard._urami5pctStacks));
          }
          applyDamage(source, target, bonusValue, `『${bonusCard.name}』の追加効果`, true);
        }
      }
      return true;
    }

    function canEndWithoutMain() {
      // 手持ちの状況に関わらず常にターン終了可能
      return true;
    }

    function endPlayerTurn() {
      if (game.gameOver) return;
      equipOnTurnEnd(game.player); // 装備品『ビッグハンバーガー』：自身のターン終了時にHP回復
      game.turn = "ai";
      game.phase = "ai-start";
      render();
      if (game.skipNextAITurn) {
        game.skipNextAITurn = false;
        log("『鎖』の効果で相手のターンをスキップ！（サブ効果は発動）", "good");
        handleSkippedTurn(game.ai);
        checkWin();
        if (!game.gameOver) { render(); setTimeout(startPlayerTurn, 800); }
        return;
      }
      setTimeout(runAITurn, 650);
    }

    function startPlayerTurn() {
      if (game.gameOver) return;
      // 装備品『熱い心』：万一「凍結」が残っていても効果を発揮させない
      if (hasEquip(game.player, "hotheart") && getStatusStack(game.player, "frozen") > 0) game.player.status.frozen = 0;
      // 凍結：自身のターン開始時に最大HPの10%のダメージを受け、このターンそのものをスキップする
      if (getStatusStack(game.player, "frozen") > 0) {
        const maxHp = getMaxHP(game.player);
        const dmg = Math.round(maxHp * 0.10);
        game.player.hp = Math.max(0, game.player.hp - dmg);
        game.player.status.frozen = 0;
        log(`自分は「凍結」🧊で${dmg}ダメージを受け、ターンがスキップされた。`, "strong");
        checkWin();
        if (!game.gameOver) {
          game.turn = "player";
          handleSkippedTurn(game.player);
          checkWin();
        }
        render();
        if (!game.gameOver) {
          game.turn = "ai";
          game.phase = "ai-start";
          setTimeout(runAITurn, 800);
        }
        return;
      }
      game.turn = "player";
      game.phase = "main";
      if (game.stats) game.stats.turn += 1;
      game.player._equipRoundCount = (game.player._equipRoundCount || 0) + 1;
      equipTickRoundEffects(game.player._equipRoundCount); // 装備品『混沌の仮面』『時限爆弾』
      game.discardedThisTurnCount = 0;
      game.player.diceUsedLastTurn = game.player.diceUsedThisTurn;
      game.player.diceUsedThisTurn = false;
      game.player.maxRandomThisTurn = false;
      // 鮫(damageBlockNextSub)：前ターンに受けた効果でこのターンはサブを出せない
      game.player._subBlockThisTurn = !!game.player._subBlockedNextTurn;
      game.player._subBlockedNextTurn = false;
      // 焔(damagePlusLastTaken)：前ターンに受けたダメージを記録
      game.player._damageTakenLastTurn = game.player._damageTakenThisTurn || 0;
      game.player._damageTakenThisTurn = 0;
      // コインデッキ：ターンごとの状態リセット
      game.player._coinBuffMultiplier = null;
      game.player.coinGreenUsedThisTurn = false;
      game.player.coinRerollsThisTurn = 0;
      if (hasCoinSpace(game.player)) ensureCoinShopFilled(game.player);
      if (needsRefill(game.player)) {
        game.phase = "draw";
        game.waitingForPlayerDraw = true;
        openDraw("player", false);
      }
      log("自分のターン。");
      render();
    }

    function handleSkippedTurn(owner) {
      resolveSubEffects(owner);
    }

    function runAITurn() {
      if (game.gameOver) return;
      // 凍結：自身のターン開始時に最大HPの10%のダメージを受け、このターンそのものをスキップする
      if (getStatusStack(game.ai, "frozen") > 0) {
        const maxHp = getMaxHP(game.ai);
        const dmg = Math.round(maxHp * 0.10);
        game.ai.hp = Math.max(0, game.ai.hp - dmg);
        game.ai.status.frozen = 0;
        log(`相手は「凍結」🧊で${dmg}ダメージを受け、ターンがスキップされた。`, "strong");
        checkWin();
        if (!game.gameOver) {
          game.turn = "ai";
          handleSkippedTurn(game.ai);
          checkWin();
        }
        render();
        if (!game.gameOver) {
          game.turn = "player";
          setTimeout(startPlayerTurn, 800);
        }
        return;
      }
      game.ai.diceUsedLastTurn = game.ai.diceUsedThisTurn;
      game.ai.diceUsedThisTurn = false;
      game.ai.maxRandomThisTurn = false;
      game.ai._subBlockThisTurn = !!game.ai._subBlockedNextTurn;
      game.ai._subBlockedNextTurn = false;
      game.ai._damageTakenLastTurn = game.ai._damageTakenThisTurn || 0;
      game.ai._damageTakenThisTurn = 0;
      game.ai._coinBuffMultiplier = null;
      game.ai.coinGreenUsedThisTurn = false;
      game.ai.coinRerollsThisTurn = 0;
      if (hasCoinSpace(game.ai)) ensureCoinShopFilled(game.ai);
      drawForAIIfNeeded();
      game.phase = "ai-action";
      render();
      setTimeout(() => {
        aiRollDiceIfGood();
        aiConsiderElementSkill();
        if (hasSynthSpace(game.ai)) aiReserveSynthMaterial();
        if (hasCoinSpace(game.ai)) aiPlayCoin();
        aiPlaySubs();
        if (hasSynthSpace(game.ai)) {
          aiPlaySynth();
        } else {
          const main = chooseAIMain();
          if (main) {
            playMain(game.ai, removeFromHand(game.ai, main.instanceId));
          } else {
            resolveSubEffects(game.ai);
            log("相手はメインカードを出さずにターンを終えた。");
          }
        }
        if (game.gameOver) {
          render();
          return;
        }
        if (game.skipNextPlayerTurn) {
          game.skipNextPlayerTurn = false;
          log("『鎖』の効果で自分のターンをスキップ！（サブ効果は発動）", "good");
          handleSkippedTurn(game.player);
          checkWin();
          if (!game.gameOver) {
            game.turn = "ai";
            game.phase = "ai-start";
            render();
            setTimeout(runAITurn, 800);
          }
          return;
        }
        if (!game.gameOver) {
          game.turn = "player";
          setTimeout(startPlayerTurn, 800);
        }
        render();
      }, 600);
    }

    function aiRollDiceIfGood() {
      if (!canRollDice(game.ai)) return;
      // AIはHPに余裕があり、かつ使用回数が残っている時に積極的に振る
      // HPが低い時は④回復目当て、通常時は⑤攻撃目当てで振る価値が高い
      const shouldRoll = game.ai.hp < getMaxHP(game.ai) * 0.5 || game.ai.diceUsesLeft >= 2;
      if (!shouldRoll) return;
      doRollDice(game.ai);
      renderDicePanel();
    }

    // AI：エレメントスキルの簡易判断（コストが貯まっていれば状況に応じて使用）
    function aiConsiderElementSkill() {
      if (!canUseElementSkill(game.ai)) return;
      const enhanced = (game.ai.elementCost || 0) >= ELEMENT_COST_MAX;
      // 満タンなら基本的に強化版を待たず状況判断で即使う（貯め続けて機会損失しないように）
      let key;
      if (game.ai.hp < getMaxHP(game.ai) * 0.4 && !isElementActive(game.ai, "water")) {
        key = "water"; // HPが低い時は回復優先
      } else if (game.ai.hand.length <= 2 && !isElementActive(game.ai, "wind")) {
        key = "wind"; // 手札が少ない時は補充優先
      } else if (game.ai.grave.length >= 5 && !enhanced && !isElementActive(game.ai, "earth")) {
        key = "earth"; // 墓地が溜まっている時は山札に戻す
      } else if (!isElementActive(game.ai, "fire")) {
        key = "fire"; // それ以外は攻撃力アップ
      } else {
        // 候補が全て発動中の場合、発動中でないものを探す
        key = ["water", "wind", "earth", "fire"].find(k => !isElementActive(game.ai, k));
        if (!key) return;
      }
      useElementSkill(game.ai, key);
    }

    // シンセサイズデッキ：素材候補を先に確保しておく（aiPlaySubsに先取りされないように）
    function aiReserveSynthMaterial() {
      if (!hasSynthSpace(game.ai)) return;
      if (game.ai.synth.material) return;
      if (game.ai.hand.some(c => c.synthSources)) return; // 完成品があるなら素材確保は不要
      const subCards = game.ai.hand.filter(c => c.type === "sub" && c.material);
      if (subCards.length === 0) return;
      subCards.sort((a, b) => aiSubScore(b) - aiSubScore(a));
      const chosen = removeFromHand(game.ai, subCards[0].instanceId);
      game.ai.synth.material = chosen;
      log(`相手は『${chosen.name}』を合成スペースの素材にセットした。`);
    }

    function aiPlaySubs() {
      let playable = game.ai.hand.filter(card => card.type === "sub");
      playable.sort((a, b) => aiSubScore(b) - aiSubScore(a));
      for (const card of playable) {
        if (isPlayBlockedByRefuseBeacon(game.ai, card)) continue;
        if (isSubPlacementLocked(game.ai)) {
          log("カードの効果で相手はサブカードを置けなかった。", "strong");
          break;
        }
        if (game.ai.subs.length >= getSubLimit(game.ai)) {
          const weakestIndex = findWeakestAISubIndex();
          if (weakestIndex < 0 || aiSubScore(card) <= aiSubScore(game.ai.subs[weakestIndex])) continue;
          const discarded = game.ai.subs.splice(weakestIndex, 1)[0];
          game.ai.grave.push(discarded);
          log(`相手は『${discarded.name}』を破棄した。`);
        }
        const fromHand = removeFromHand(game.ai, card.instanceId);
        placeSub(game.ai, fromHand);
      }
    }

    // シンセサイズデッキのAI操作：素材セット→メイン2枚投入(自動合成)→完成したカードを即使用
    // コインデッキのAI操作：ゲージ上げ・回復・強化・購入を状況に応じて行う
    function aiPlayCoin() {
      const ai = game.ai;
      ensureCoinShopFilled(ai);

      // HPが低ければ回復を優先
      if (!ai.coinGreenUsedThisTurn && ai.hp < getMaxHP(ai) * 0.4 && ai.coins >= 30) {
        useCoinHeal(ai);
      } else if (!ai.coinGreenUsedThisTurn && ai.coins >= 90) {
        // 十分コインがあれば強化してから攻撃
        useCoinBuff(ai);
      }

      // 余裕があればゲージを上げる（レベルアップ狙い）
      while (ai.coins >= 34 && coinGaugeNextThreshold(ai) !== null) {
        clickCoinGauge(ai);
      }

      // 手頃な価格のショップカードがあれば購入（コインに余裕がある時のみ）
      ai.coinShop.forEach((offer, i) => {
        if (!offer) return;
        if (ai.coins >= offer.price + 20) {
          buyCoinShopCard(ai, i);
        }
      });
    }

    function aiPlaySynth() {
      if (!hasSynthSpace(game.ai)) return;
      // 既に手札に完成済みの合成カードがあれば、それを使用して攻撃する
      const readyCombined = game.ai.hand.find(c => c.synthSources);
      if (readyCombined) {
        playMain(game.ai, removeFromHand(game.ai, readyCombined.instanceId));
        return;
      }
      if (!game.ai.synth.material) {
        aiReserveSynthMaterial();
      }
      while (game.ai.synth.mains.length < 2) {
        const mainCards = game.ai.hand.filter(c => c.type === "main" && !c.synthSources);
        if (mainCards.length === 0) break;
        mainCards.sort((a, b) => aiMainScore(b) - aiMainScore(a));
        const chosen = removeFromHand(game.ai, mainCards[0].instanceId);
        game.ai.synth.mains.push(chosen);
        log(`相手は『${chosen.name}』を合成スペースに置いた。`);
        if (game.ai.synth.mains.length === 2) resolveSynthesis(game.ai);
      }
      const newlyCombined = game.ai.hand.find(c => c.synthSources);
      if (newlyCombined) {
        playMain(game.ai, removeFromHand(game.ai, newlyCombined.instanceId));
      }
    }

    function aiSubScore(card) {
      let score = 0;
      if (card.effect.kind === "turnDamage")   score = card.effect.value * (card.duration || 1);
      if (card.effect.kind === "bonusDamage")  score = 420;
      if (card.effect.kind === "blockOnce")    score = game.ai.hp < 3500 ? 700 : 340;
      if (card.effect.kind === "guardTurn")    score = game.ai.hp < 4500 ? 1000 : 520;
      if (card.effect.kind === "mirrorOnce")   score = 380;
      if (card.effect.kind === "repeatNextMain") score = 650;
      if (card.effect.kind === "extraHit")     score = 450;
      if (card.effect.kind === "summonPoison") score = game.player.subs.length < getSubLimit(game.player) ? 700 : 0;
      // ナンバーデッキ
      if (card.effect.kind === "endTurnDraw")  score = 280;
      if (card.effect.kind === "healTick")     score = game.ai.hp < 6000 ? 900 : 400;
      if (card.effect.kind === "damageDouble") score = 600;
      if (card.effect.kind === "reflectOnce")  score = game.ai.hp < 4000 ? 850 : 480;
      if (card.effect.kind === "returnMain")   score = 550;
      if (card.effect.kind === "timeBomb")     score = 700;
      // キングデッキ
      if (card.effect.kind === "kingPresence") score = 1200; // 王は最重要
      if (card.effect.kind === "shiroCity")    score = 650;
      if (card.effect.kind === "muraVillage") score = game.ai.hp < 6000 ? 700 : 380;
      if (card.effect.kind === "touTower")     score = 480;
      if (card.effect.kind === "yaArrow")      score = 420;
      if (card.effect.kind === "hanCounter")   score = 400;
      if (card.effect.kind === "kyuuAbsorb")   score = game.ai.hp < 6000 ? 600 : 320;
      if (card.effect.kind === "gaiArmor")     score = 380;
      if (card.effect.kind === "kabeWall")     score = 360;
      if (card.effect.kind === "matsuriFestival") score = 500;
      // トリックデッキ
      if (card.effect.kind === "maxRandomOnce")   score = 500;
      if (card.effect.kind === "healOverTime")    score = game.ai.hp < 6000 ? 380 : 200;
      if (card.effect.kind === "damageReduceRandom") score = 480;
      if (card.effect.kind === "minRandomHealOnce") score = 350;
      if (card.effect.kind === "lowRarityTrigger") score = game.ai.hand.some(c=>c.rarity===1&&c.type==="main") ? 650 : 400;
      if (card.effect.kind === "highRarityEscalate") score = game.ai.hand.some(c=>c.rarity===3&&c.type==="main") ? 700 : 450;
      if (card.effect.kind === "discardTrigger")  score = 380;
      // ── シンセサイズデッキ ──
      if (card.effect.kind === "healOnDamage")      score = game.ai.hp < 6000 ? 550 : 300;
      if (card.effect.kind === "synthNoDecompose")  score = game.ai.hand.some(c => c.synthSources) ? 600 : 300;
      if (card.effect.kind === "turnRandomDamage")  score = ((card.effect.min + card.effect.max) / 2) * (card.duration || 1);
      if (card.effect.kind === "graveTickDamage")   score = game.ai.grave.length * card.effect.multiplier * (card.duration || 1) * 0.6;
      if (card.effect.kind === "handConditionDamage") score = game.ai.hand.length <= card.effect.maxHand ? card.effect.value : 150;
      if (card.effect.kind === "healOnDiscard")     score = 400;
      if (card.effect.kind === "mainBonusCounted")  score = card.effect.value * 3; // 最大5回分の見込み
      if (card.effect.kind === "blockMulti")        score = game.ai.hp < 5000 ? 750 : 420;
      if (card.effect.kind === "synthTriggerDamage") score = card.effect.value * 2; // 複数回合成する前提
      // ── コインデッキ ──
      if (card.effect.kind === "turnDamageGainCoin")   score = card.effect.damage * (card.duration || 1) * 0.7 + card.effect.coin * 10;
      if (card.effect.kind === "doubleNextWeatherMain") score = 500;
      if (card.effect.kind === "selfDamageBlockSubs")   score = 0; // 相手フィールドに強制召喚されるカードなのでAIが手札から選ぶ対象ではない
      if (card.effect.kind === "selfDamageTick")         score = 0;
      // ── ビーコンデッキ ──
      if (card.effect.kind === "turnBeaconGrantOne")    score = 260 * (card.duration || 1) * 0.4;
      if (card.effect.kind === "turnBeaconGrantMulti")  score = 300 * (card.duration || 1) * 0.4;
      if (card.effect.kind === "turnPurgeOneTrouble")   score = 250;
      if (card.effect.kind === "blockTroubleGrant")     score = 300;
      if (card.effect.kind === "grantBeaconOnMainDamage") score = 320;
      if (card.effect.kind === "healOnPlaceSelfDamageOnDiscard") score = game.ai.hp < 15000 ? 700 : 350;
      if (card.effect.kind === "transformIntoNextMain") score = 400;
      if (card.effect.kind === "turnDamageTroubleBeacon") score = card.effect.value * (card.duration || 1) * 0.5;
      if (card.effect.kind === "turnDamagePurgeOnPlace")  score = card.effect.value * (card.duration || 1) * 0.6 + 150;
      // ── コインデッキ（続き） ──
      if (card.effect.kind === "turnGainCoinPercent")           score = (game.ai.coins || 0) * (card.effect.percent / 100) * (card.duration || 1) * 8;
      if (card.effect.kind === "turnGainCoinPercentEscalating") score = (game.ai.coins || 0) * (card.effect.basePercent / 100) * (card.duration || 1) * 5 + 200;
      if (card.effect.kind === "coinOnDiscard")                 score = (game.ai.coins || 0) * (card.effect.percent / 100) * 6 + 150;
      if (card.effect.kind === "damageToCoinTick")               score = 350;
      if (card.effect.kind === "turnDamageConditionalHp")       score = card.effect.base * (card.duration || 1) * (game.ai.hp <= card.effect.threshold ? 1.4 : 1);
      if (card.effect.kind === "turnDamageConditionalFullSubs") score = card.effect.base * (card.duration || 1) * (game.ai.subs.length >= getSubLimit(game.ai) - 1 ? 1.3 : 1);
      // ── その他デッキ（ショップ交換カード） ──
      if (card.effect.kind === "healAndTurnDamage") score = (card.effect.heal + card.effect.value) * (card.duration || 1) * 0.55;
      if (card.effect.kind === "hpBarrier") score = card.effect.value * 0.5 + (game.ai.hp < getMaxHP(game.ai) * 0.5 ? 400 : 150);
      if (card.effect.kind === "healOverTimeDamageOnDiscard") score = card.effect.value * (card.duration || 1) * 0.5 + card.effect.discardDamage * 0.4;
      // ── スペシャルガチャ限定カード ──
      if (card.effect.kind === "genIllusion") score = card.effect.value * 0.6 + 500; // 確率100%化の価値込みで高評価
      return score;
    }

    function findWeakestAISubIndex() {
      if (game.ai.subs.length === 0) return -1;
      let index = 0;
      let min = aiSubScore(game.ai.subs[0]);
      for (let i = 1; i < game.ai.subs.length; i++) {
        const score = aiSubScore(game.ai.subs[i]);
        if (score < min) {
          min = score;
          index = i;
        }
      }
      return index;
    }

    function chooseAIMain() {
      const mains = game.ai.hand.filter(card => card.type === "main" && !isPlayBlockedByRefuseBeacon(game.ai, card));
      if (mains.length === 0) return null;
      mains.sort((a, b) => aiMainScore(b) - aiMainScore(a));
      return mains[0];
    }

    function aiMainScore(card) {
      const eff = card.effect;
      const playerHasGuard  = game.player.subs.some(s => s.effect.kind === "guardTurn");
      const playerHasShield = game.player.subs.some(s => s.effect.kind === "blockOnce");
      const hasBonus        = game.ai.subs.some(s => s.effect.kind === "bonusDamage");

      let damage = 0;
      if (eff.kind === "damage")              damage = eff.value;
      if (eff.kind === "kiDamage")            damage = (game.ai.hp <= Math.floor(getMaxHP(game.ai) / 2) ? 2000 : 1500) + game.ai.hand.length * 300;
      if (eff.kind === "multiDamage")         damage = eff.value * eff.hits;
      if (eff.kind === "damageAndDestroySub") damage = eff.value + (game.player.subs.length > 0 ? 300 : 0);
      if (eff.kind === "subRarityDamageV2") {
        const total = game.ai.subs.reduce((s, c) => s + c.rarity, 0);
        damage = 500 + total * 250;
      }
      if (eff.kind === "darkDamage")     damage = eff.value - eff.self * 0.5;
      if (eff.kind === "heal")           damage = eff.value * (game.ai.hp < 4000 ? 1.5 : 0.4);
      if (eff.kind === "drawCards")      damage = 200;
      if (eff.kind === "randomDamage")   damage = 300;
      if (eff.kind === "birdAttack") {
        const hasEgg = game.player.subs.some(s => s.effect.kind === "eggBurst")
                    || game.ai.subs.some(s => s.effect.kind === "eggBurst");
        damage = eff.value + (hasEgg ? 400 : 0);
      }
      if (eff.kind === "subCountDamage") { const sc = eff.useDeckManifest ? (game.ai.deckManifest || []).filter(c => c.type === "sub").length : game.ai.subs.length; damage = (eff.base || 0) + sc * eff.perSub; }
      if (eff.kind === "destroyAllSubs") damage = game.player.subs.length * 350;
      if (eff.kind === "healAndCurePoison") {
        const hasPoison = game.ai.subs.some(s => s.effect.kind === "poisonTick");
        damage = eff.value * (game.ai.hp < 5000 ? 1.2 : 0.5) + (hasPoison ? 900 : 0);
      }
      if (eff.kind === "dragonAttack")   damage = eff.value + (game.ai.subs.length < getSubLimit(game.ai) ? 300 : 0);
      if (eff.kind === "treeAttack") {
        const slots = getSubLimit(game.ai) - game.ai.subs.length;
        damage = eff.value + slots * 400;
      }
      // ナンバーデッキ
      if (eff.kind === "numDraw")          damage = 250; // ドロー系は中程度
      if (eff.kind === "numNi")            damage = 222 * (2 + game.ai.hand.length);
      if (eff.kind === "deckCountDamage")  damage = game.ai.deck.length * eff.multiplier;
      if (eff.kind === "graveCountDamage") damage = game.ai.grave.length * eff.multiplier;
      if (eff.kind === "damageDiscardHand") damage = eff.value + (game.ai.hand.length > 1 ? -300 : 200);
      if (eff.kind === "damageGraveReturn") damage = eff.value + (game.ai.grave.length > 3 ? 400 : 100);
      if (eff.kind === "numZero") {
        const prev = game.aiPrevCard;
        damage = eff.value + (prev ? aiMainScore(prev) * 0.8 : 0);
      }
      if (eff.kind === "damageAndHeal")    damage = eff.dmg + (game.ai.hp < 5000 ? eff.heal * 0.8 : eff.heal * 0.2);
      if (eff.kind === "destroySelfSubs")  damage = game.ai.subs.length > 0 ? -500 : 50; // 通常は不利
      if (eff.kind === "emptyHandDamage")  damage = game.ai.hand.length === 0 ? eff.emptyDmg : eff.normalDmg;
      if (eff.kind === "skipEnemyTurn")    damage = 600;
      if (eff.kind === "drawSubCards")     damage = 280;
      if (eff.kind === "graveReturn")      damage = game.ai.grave.length > 0 ? 350 : 50;
      if (eff.kind === "swapHandAndSubs")  damage = game.ai.hand.length + game.ai.subs.length > 3 ? 400 : 150;
      if (eff.kind === "halfDeckToGrave")  damage = 100; // 通常は低評価（山札を捨てるリスク）
      if (eff.kind === "desperateDamage")  damage = game.ai.hp <= eff.threshold ? eff.low : eff.normal;
      if (eff.kind === "halfHpDamage")     damage = Math.floor(game.player.hp / 2) - eff.selfDmg * 0.5;
      // キングデッキ
      if (eff.kind === "kingScaleDamage")  damage = hasKing(game.ai) ? eff.withKing : eff.base;
      if (eff.kind === "kanFetchKing")     damage = kingNotInHandOrSub(game.ai) ? 700 : 350;
      if (eff.kind === "takuCraft")        damage = hasKing(game.ai) ? 500 : 250;
      if (eff.kind === "ishaDoctor") {
        const heal = hasKing(game.ai) ? eff.withKing : eff.base;
        damage = heal * (game.ai.hp < 5000 ? 1.3 : 0.4);
      }
      if (eff.kind === "eiGuard") {
        const hits = eff.baseHits + (hasKing(game.ai) ? eff.kingBonusHits : 0);
        damage = eff.value * hits;
      }
      if (eff.kind === "subCountDamage") { const sc = eff.useDeckManifest ? (game.ai.deckManifest || []).filter(c => c.type === "sub").length : game.ai.subs.length; damage = (eff.base || 0) + sc * eff.perSub; }
      if (eff.kind === "onoAxe")  damage = eff.value + (game.player.subs.some(s => s.id === "wood") ? 300 : 0);
      if (eff.kind === "tsueReveal") damage = 80; // 情報開示のみ、低優先
      if (eff.kind === "stealSub") damage = Math.min(2, game.player.subs.length) * 350;
      if (eff.kind === "yumiBow") damage = eff.value + (game.ai.subs.some(s => s.effect.kind === "yaArrow") ? 500 : 0);
      if (eff.kind === "doCrossbow") damage = eff.value + (game.ai.subs.some(s => s.effect.kind === "yaArrow") ? eff.bonus : 0);
      if (eff.kind === "enSupport") damage = game.ai.hand.length < MAX_HAND ? 450 : 0;
      if (eff.kind === "zeiTax") damage = game.ai.subs.length * 200 + 100;
      if (eff.kind === "hosiStar") damage = 400;
      if (eff.kind === "maDevil") damage = eff.value + game.ai.subs.length * eff.perSub - game.ai.subs.length * 150; // サブ失うリスク差し引き
      if (eff.kind === "houCollapse") damage = (game.player.hand.length + game.player.subs.length) * 250 - (game.ai.hand.length + game.ai.subs.length) * 200;
      if (eff.kind === "kouEmperor") {
        const lastMain = game.player.lastMains[game.player.lastMains.length - 1];
        damage = lastMain ? aiMainScore(lastMain) * 0.9 : 0;
      }
      // トリックデッキ
      if (eff.kind === "rangeDamage")     damage = (eff.min + eff.max) / 2 * (game.ai.maxRandomThisTurn ? 1.4 : 1);
      if (eff.kind === "rangeMultiDamage") damage = (eff.min + eff.max) / 2 * eff.hits * (game.ai.maxRandomThisTurn ? 1.4 : 1);
      if (eff.kind === "fillWithGuest")    damage = eff.value + (game.player.subs.length === 0 ? 600 : 900);
      if (eff.kind === "rangeHeal")        damage = ((eff.min + eff.max) / 2) * (game.ai.hp < 5000 ? 1.3 : 0.4);
      if (eff.kind === "rangeDamageHealSelf") damage = ((eff.min + eff.max) / 2) * 1.6;
      if (eff.kind === "probDamage") {
        const avg = eff.choices.reduce((a,b)=>a+b,0) / eff.choices.length;
        damage = avg;
      }
      if (eff.kind === "probDamageRestoreDice") {
        const avg = eff.choices.reduce((a,b)=>a+b,0) / eff.choices.length;
        damage = avg + (hasDiceEffect(game.ai) && game.ai.diceUsesLeft < DICE_MAX_USES ? 250 : 0);
      }
      // トリックデッキ（後半）
      if (eff.kind === "noEffect")     damage = -1000; // ハズレは基本選ばない
      if (eff.kind === "coinDamage")   damage = (eff.base + eff.bonus) / 2;
      if (eff.kind === "kiOdd")        damage = eff.value + ((game.ai.diceUsedThisTurn || game.ai.diceUsedLastTurn) ? 500 : 0);
      if (eff.kind === "handCountDamage") damage = eff.base + game.ai.hand.length * eff.perCard;
      if (eff.kind === "drawRarityDamage") damage = eff.multiplier * 1.8; // 平均レア度想定
      if (eff.kind === "splitHp") damage = (game.player.hp - game.ai.hp) / 2; // 自分が不利なら有利、有利なら不利
      if (eff.kind === "discardHandHealSelf") damage = game.player.hand.length * eff.multiplier * 0.5 + (game.ai.hp < 6000 ? 300 : 0);
      if (eff.kind === "forceDrawDamage") damage = Math.max(0, MAX_HAND - game.player.hand.length) * eff.multiplier;
      if (eff.kind === "sacrificeHp") damage = Math.floor(game.ai.hp * eff.ratio) * (game.ai.hp > getMaxHP(game.ai) * 0.4 ? 1 : 0.3);
      if (eff.kind === "addVoidCards") damage = 120;
      if (eff.kind === "heavenDamage") damage = eff.value + 300; // 戻ってくる可能性込みでやや高評価
      if (eff.kind === "godCombo") damage = eff.value + eff.heal * 0.5 + 200;

      // ── シンセサイズデッキ ──
      if (eff.kind === "damageBlockNextSub") damage = eff.value + (game.player.subs.length < getSubLimit(game.player) ? 250 : 100);
      if (eff.kind === "destroySubsDamage")  damage = game.player.subs.length * eff.perCard + (game.player.subs.length > 0 ? 150 : 0);
      if (eff.kind === "damageDeckToGrave")  damage = eff.value + Math.min(eff.count, game.player.deck.length) * 40;
      if (eff.kind === "warDamage")          damage = eff.base + game.ai.deck.length * eff.perDeck;
      if (eff.kind === "decomposeSynthCard") damage = game.ai.hand.some(c => c.synthSources) ? 450 : -200;
      if (eff.kind === "resetSubTimers")     damage = game.ai.subs.length * 150;
      if (eff.kind === "purgeRarity3Deck") {
        const r3Count = game.player.deck.filter(c => c.rarity === 3).length;
        damage = r3Count * 250 - eff.selfDamage * 0.3;
      }
      if (eff.kind === "damageDestroyOneSub") damage = eff.value + (game.player.subs.length > 0 ? 300 : 0);
      if (eff.kind === "damagePlusLastTaken")  damage = eff.base + (game.ai._damageTakenLastTurn || 0);
      if (eff.kind === "repeatLastMain") {
        const history = game.ai.lastMains || [];
        const prev = history[history.length - 2];
        damage = prev ? aiMainScore(prev) * 0.9 : 0;
      }
      if (eff.kind === "trialDraw")     damage = eff.multiplier * 4; // ☆3を引き当てるまでの試行回数を見込んだ概算
      if (eff.kind === "hpScaledChance") {
        const maxHp = getMaxHP(game.ai);
        const missingPercent = Math.max(0, ((maxHp - game.ai.hp) / maxHp) * 100);
        const chance = Math.min(100, eff.baseChance + missingPercent);
        damage = eff.value * (chance / 100);
      }
      if (eff.kind === "synthCombo") {
        damage = eff.parts.reduce((sum, part) => sum + aiMainScore({ effect: part }), 0);
      }

      // ── コインデッキ ──
      if (eff.kind === "damageSummonSub")   damage = eff.value + (game.player.subs.length < getSubLimit(game.player) ? 200 : 0);
      if (eff.kind === "coinCountDamage")   damage = (game.ai.coins || 0) * (getLimitBreak(card.id, true) >= 4 ? 15 : eff.multiplier);
      if (eff.kind === "coinGainPercent")   damage = (game.ai.coins || 0) * (eff.percent / 100) * 0.5 + 50;
      if (eff.kind === "discardHandGainCoin") damage = game.ai.hand.length <= 1 ? 100 : -300;
      if (eff.kind === "damageDestroyAllSubs") {
        const lb = getLimitBreak(card.id, true);
        const value = lb >= 4 ? 2400 : eff.value;
        const subCount = game.player.subs.length;
        damage = value + subCount * 250 + (lb >= 2 ? subCount * 300 : 0);
      }
      if (eff.kind === "drawGainCoin")      damage = (getLimitBreak(card.id, true) >= 2 ? 160 : eff.coin) * 0.6 + 150;
      if (eff.kind === "healGainCoinRandom") {
        const heal = getLimitBreak(card.id, true) >= 1 ? 1200 : eff.heal;
        damage = ((eff.min + eff.max) / 2) * 0.6 + (game.ai.hp < getMaxHP(game.ai) * 0.6 ? heal * 0.5 : heal * 0.15);
      }
      if (eff.kind === "gainCoinFlat")       damage = eff.coin * 6 + 30;
      if (eff.kind === "healByCoinCount")    damage = ((game.ai.coins || 0) * eff.multiplier) * (game.ai.hp < getMaxHP(game.ai) * 0.6 ? 0.6 : 0.15);
      if (eff.kind === "randomMysteryEffect") damage = 400; // 4通りの平均を見込んだ概算
      if (eff.kind === "damageConditionalDestroySumi") {
        const boosted = game.ai.subs.some(s => s.id === "sumi") || game.player.subs.some(s => s.id === "sumi");
        damage = boosted ? eff.boosted : eff.base;
      }
      if (eff.kind === "destroyAllSubsBothGainCoin") {
        const starTotal = game.ai.subs.reduce((s, c) => s + c.rarity, 0) + game.player.subs.reduce((s, c) => s + c.rarity, 0);
        damage = starTotal * eff.multiplier * 3 + game.player.subs.length * 200;
      }
      if (eff.kind === "healDrawRarity3")    damage = eff.heal * (game.ai.hp < getMaxHP(game.ai) * 0.6 ? 0.5 : 0.15) + eff.count * 200;
      if (eff.kind === "freeShopHaul") {
        const filled = (game.ai.coinShop || []).filter(Boolean).length;
        damage = filled * 350;
      }

      // ── ビーコンデッキ ──
      if (eff.kind === "beaconSelfHandOne")   damage = 260;
      if (eff.kind === "damageBeaconChance")  damage = eff.value + 60;
      if (eff.kind === "beaconAllHandNormal") damage = game.ai.hand.length * 90 + 80;
      if (eff.kind === "stickyBeaconOne")     damage = 150;
      if (eff.kind === "purgeTroubleBeacons") {
        let troubleCount = 0;
        for (const zone of [game.ai.hand, game.ai.deck, game.ai.grave, game.ai.subs]) {
          for (const c of zone) {
            if (c.beacons) troubleCount += c.beacons.filter(b => BEACON_DEFS[b].type === "trouble").length;
          }
        }
        damage = troubleCount * 200 + 50;
      }
      if (eff.kind === "beaconDeckAllNormal") damage = Math.min(game.ai.deck.length, 30) * 40 + 350;
      if (eff.kind === "damageAndTroubleBeaconHand") damage = eff.value + game.player.hand.length * 100;
      if (eff.kind === "swapBeaconTypes") {
        let troubleOnSelf = 0;
        for (const c of game.ai.hand) {
          if (c.beacons) troubleOnSelf += c.beacons.filter(b => BEACON_DEFS[b].type === "trouble").length;
        }
        damage = troubleOnSelf * 150 + 40;
      }
      if (eff.kind === "reloadBeaconOne")     damage = 220;
      if (eff.kind === "purgeAllBeaconsHand") {
        let count = 0;
        for (const c of game.player.hand) if (c.beacons) count += c.beacons.length;
        damage = count * 100 + 50;
      }
      if (eff.kind === "damageDrawGiftTrouble") damage = eff.value + 150;
      if (eff.kind === "mixAllHandBeacons") {
        let troubleOnSelf = 0;
        for (const c of game.ai.hand) if (c.beacons) troubleOnSelf += c.beacons.filter(b => BEACON_DEFS[b].type === "trouble").length;
        damage = troubleOnSelf * 150 + 40;
      }
      if (eff.kind === "damageChancePollution") damage = eff.value + 80;
      if (eff.kind === "boostBeaconOne") damage = 300;
      if (eff.kind === "handBeaconCountDamage") {
        let total = 0;
        for (const c of game.ai.hand) total += (c.beacons ? c.beacons.length : 0);
        damage = total * eff.multiplier;
      }
      if (eff.kind === "damageSummonWa") damage = eff.value + 400;
      if (eff.kind === "gainShikaCards") damage = eff.value + 300;
      if (eff.kind === "shikaGroupDamage") {
        const others = game.ai.hand.filter(c => c.id === "shika").length;
        damage = eff.value * (1 + others);
      }
      // ── その他デッキ（ショップ交換カード） ──
      if (eff.kind === "damageChanceBonus") damage = eff.base + eff.chance * eff.bonus;
      if (eff.kind === "damageTroubleBeaconDeck") damage = eff.value + (eff.targets || 3) * 120;
      if (eff.kind === "damageReplayRandomMain") {
        const mains = game.ai.hand.filter(c => c.type === "main");
        const r3 = mains.filter(c => c.rarity === 3);
        const pool = r3.length > 0 ? r3 : mains;
        const avgReplay = pool.length > 0 ? pool.reduce((s, c) => s + aiMainScore(c), 0) / pool.length : 0;
        damage = eff.value + avgReplay * 0.8;
      }
      if (eff.kind === "damagePerFieldSub") damage = eff.base + game.ai.subs.length * eff.perSub;
      if (eff.kind === "healAndGraveToDeckAll") damage = eff.heal * (game.ai.hp < getMaxHP(game.ai) * 0.6 ? 1.1 : 0.4) + game.ai.grave.length * 30;
      // ── スペシャルガチャ限定カード ──
      if (eff.kind === "mikadoAdaptive") {
        const deckId = game.ai.deckId || "none";
        if (deckId === "standard") damage = 1500 + 900; // 回復込みの評価
        else if (deckId === "number") damage = 2000 + game.ai.grave.length * 30;
        else if (deckId === "king") damage = game.ai.subs.length * 600 + 200;
        else if (deckId === "trick") damage = 2000 * 2 * 0.7;
        else if (deckId === "mechanic") damage = 1000 + (game.ai.hand.some(c => c.synthSources) ? 400 : 0);
        else if (deckId === "coin") damage = 777 + 200 * 1.2;
        else if (deckId === "beacon") damage = 900;
        else damage = 3000;
      }
      if (eff.kind === "kiramekiFetch") damage = 700;
      if (eff.kind === "katanaStrike") damage = eff.value + (game.ai.subs.length < getSubLimit(game.ai) ? 300 : 0) + (game.ai.hand.length < MAX_HAND ? 150 : 0);
      if (eff.kind === "zanSlash") {
        const blade = game.ai.subs.find(c => c.effect.kind === "haBlade");
        damage = eff.base + (blade ? (blade.elapsed || 0) * eff.perTurn : 0);
      }
      // ── 下克上の試練 報酬カード ──
      if (eff.kind === "gekokuRevolution") {
        // ☆1カードが手札・山札に多いほど「革命」の恩恵が大きいため評価を上げる
        const r1InHand = game.ai.hand.filter(c => c.rarity === 1 && c.type === "main").length;
        damage = 500 + r1InHand * 300 + eff.drawCount * 150;
      }

      if (playerHasGuard)  damage *= 0.08;
      if (playerHasShield) {
        damage = eff.kind === "multiDamage"
          ? eff.value * Math.max(0, eff.hits - 1)
          : damage * 0.2;
      }
      if (hasBonus && damage > 0) damage += 100;
      if (game.player.hp <= damage) damage += 5000;
      return damage;
    }

    function checkWin() {
      render();
      if (game.gameOver) return; // 既に勝敗が確定済みの場合、二重で結果処理をしない
      if (game.player.hp <= 0 || game.ai.hp <= 0) {
        game.gameOver = true;
        els.winner.classList.remove("active");
        showResultScreen();
      }
    }

    function log(message, kind = "") {
      const item = document.createElement("div");
      item.className = `log-entry ${kind}`;
      item.textContent = message;
      els.logPanel.prepend(item);
    }

    function render() {
      if (!game) return;
      // カード要素は再描画のたびに作り直されるため、古い要素に残ったホバー説明を必ず消しておく
      hideTooltip();
      renderHands();
      renderSubs(game.player, els.playerSubs);
      renderSubs(game.ai, els.aiSubs);
      renderMain(game.player, els.playerMainDrop);
      renderMain(game.ai, els.aiMain);
      renderSynth(game.player, els.playerSynthZone, els.playerSynthMains, els.playerSynthMaterial);
      renderSynth(game.ai, els.aiSynthZone, els.aiSynthMains, els.aiSynthMaterial);
      renderCoinSpace();
      els.playerDeck.textContent = `${game.player.deck.length}枚`;
      els.aiDeck.textContent = `${game.ai.deck.length}枚`;
      els.playerGrave.textContent = `${game.player.grave.length}枚`;
      els.aiGrave.textContent = `${game.ai.grave.length}枚`;
      const deckRefCountEl = els.deckRefBtn?.querySelector(".pile-count");
      if (deckRefCountEl) deckRefCountEl.textContent = `${game.player.deckManifest.length}枚`;
      els.playerHpText.textContent = game.player.hp;
      els.aiHpText.textContent = game.ai.hp;
      els.playerHpFill.style.transform = `scaleX(${game.player.hp / getMaxHP(game.player)})`;
      els.aiHpFill.style.transform = `scaleX(${game.ai.hp / getMaxHP(game.ai)})`;
      renderStatusRow(game.player, document.getElementById("playerStatusRow"));
      renderStatusRow(game.ai, document.getElementById("aiStatusRow"));
      els.turnBadge.textContent = game.turn === "player" ? "自分のターン" : "相手のターン";
      renderDicePanel();
      renderElementAreas();
      updateHintAndButtons();
    }

    function renderHands() {
      els.playerHand.innerHTML = "";
      if (game.player.hand.length === 0) {
        els.playerHand.innerHTML = `<div class="empty">手札なし</div>`;
      } else {
        game.player.hand.forEach(card => els.playerHand.appendChild(createCardEl(card, { draggable: true, battle: true })));
      }
      els.aiHand.innerHTML = "";
      for (let i = 0; i < game.ai.hand.length; i++) {
        const back = document.createElement("div");
        back.className = "card-back";
        back.textContent = "?";
        els.aiHand.appendChild(back);
      }
    }

    function renderSubs(owner, container) {
      container.innerHTML = "";
      const limit = getSubLimit(owner);
      for (let i = 0; i < limit; i++) {
        const slot = document.createElement("div");
        slot.className = "slot";
        const card = owner.subs[i];
        if (card) {
          slot.classList.add("filled");
          slot.appendChild(createCardEl(card, { small: true, isAi: owner.isAI, battle: true }));
          if (owner === game.player) slot.addEventListener("click", () => replaceSubAt(i));
        } else {
          slot.innerHTML = `<span class="empty">空き</span>`;
        }
        container.appendChild(slot);
      }
    }

    function renderSynth(owner, zoneEl, mainsEl, materialEl) {
      if (!zoneEl) return;
      const active = hasSynthSpace(owner);
      zoneEl.classList.toggle("synth-hidden", !active);
      if (!active) return;

      mainsEl.innerHTML = "";
      for (let i = 0; i < 2; i++) {
        const slot = document.createElement("div");
        slot.className = "synth-slot";
        const card = owner.synth.mains[i];
        if (card) {
          slot.classList.add("filled");
          slot.appendChild(createCardEl(card, { small: true, isAi: owner.isAI, battle: true }));
        } else {
          slot.textContent = "メイン";
        }
        mainsEl.appendChild(slot);
      }

      materialEl.innerHTML = "";
      const matSlot = document.createElement("div");
      matSlot.className = "synth-slot";
      if (owner.synth.material) {
        matSlot.classList.add("filled");
        matSlot.appendChild(createCardEl(owner.synth.material, { small: true, isAi: owner.isAI, battle: true }));
      } else {
        matSlot.textContent = "素材（サブ）";
      }
      materialEl.appendChild(matSlot);
    }

    function renderCoinSpace() {
      if (!game) return;
      const playerActive = hasCoinSpace(game.player);
      els.playerCoinZone.classList.toggle("coin-hidden", !playerActive);
      const aiActive = hasCoinSpace(game.ai);
      els.aiCoinZone.classList.toggle("coin-hidden", !aiActive);

      if (aiActive) {
        els.aiCoinCount.textContent = `💰 ${game.ai.coins || 0}`;
      }
      if (!playerActive) return;

      const owner = game.player;
      els.playerCoinCount.textContent = `💰 ${owner.coins || 0}`;
      els.coinLevel.textContent = owner.coinLevel;
      const idx = coinLevelIndex(owner);
      const prevThreshold = COIN_LEVEL_THRESHOLDS[idx];
      const nextThreshold = coinGaugeNextThreshold(owner);
      if (nextThreshold === null) {
        els.coinGaugeFill.style.width = "100%";
        els.coinGaugeNext.textContent = "MAX";
      } else {
        const progress = owner.coinGaugeTotal - prevThreshold;
        const span = nextThreshold - prevThreshold;
        els.coinGaugeFill.style.width = `${Math.min(100, (progress / span) * 100)}%`;
        els.coinGaugeNext.textContent = `次まで${nextThreshold - owner.coinGaugeTotal}`;
      }

      const isPlayerTurn = game.turn === "player" && game.phase === "main" && !game.gameOver;
      els.coinHealBtn.disabled = !isPlayerTurn || owner.coinGreenUsedThisTurn || owner.coins < 30;
      els.coinBuffBtn.disabled = !isPlayerTurn || owner.coinGreenUsedThisTurn || owner.coins < 50;
      els.coinHealBtn.innerHTML = `回復(${COIN_HEAL_VALUES[idx]})<br><small>30枚</small>`;
      els.coinBuffBtn.innerHTML = `強化(×${COIN_BUFF_MULTIPLIERS[idx]})<br><small>50枚</small>`;

      els.coinShop.innerHTML = "";
      owner.coinShop.forEach((offer, i) => {
        const slot = document.createElement("div");
        slot.className = "coin-shop-slot";
        if (!offer) {
          slot.textContent = "―";
          slot.classList.add("disabled");
        } else {
          const base = CARD_LIBRARY.find(c => c.id === offer.cardId);
          const canBuy = isPlayerTurn && owner.coins >= offer.price;
          if (!canBuy) slot.classList.add("disabled");
          slot.innerHTML = `<div>${"☆".repeat(base.rarity)}</div><div>『${base.name}』</div><div class="coin-shop-price">${offer.price}枚</div>`;
          slot.title = base.text;
          slot.addEventListener("click", () => {
            if (!canBuy) return;
            buyCoinShopCard(owner, i);
            render();
          });
        }
        els.coinShop.appendChild(slot);
      });

      els.coinRerollLeft.textContent = `${owner.coinRerollsThisTurn}/3`;
      els.coinRerollBtn.disabled = !isPlayerTurn || owner.coinRerollsThisTurn >= 3 || owner.coins < 2;
    }

    function renderMain(owner, zone) {
      const title = zone.querySelector(".zone-title")?.outerHTML || "";
      zone.innerHTML = title;

      const stack = document.createElement("div");
      stack.className = "main-stack";

      const history = owner.lastMains;
      if (history.length === 0 && !owner.main) {
        // 何もない
        const empty = document.createElement("div");
        empty.className = "empty";
        empty.textContent = owner === game.player ? "メインカードをドロップ" : "待機中";
        zone.appendChild(empty);
        return;
      }

      // 古いカードをゴースト表示（最大2枚、現在のカードの下）
      const ghosts = history.slice(0, -1).slice(-2); // 最新を除いた最大2枚
      ghosts.forEach(c => {
        const el = createCardEl(c, { small: true, isAi: owner.isAI, battle: true });
        el.classList.add("ghost");
        stack.appendChild(el);
      });

      // 現在（最新）のカード
      const currentCard = owner.main || history[history.length - 1];
      if (currentCard) {
        const el = createCardEl(currentCard, { small: true, isAi: owner.isAI, battle: true });
        el.classList.add("current");
        stack.appendChild(el);
      }

      zone.appendChild(stack);
    }

    function updateHintAndButtons() {
      if (game.gameOver) {
        els.actionHint.textContent = "リスタートできます。";
        els.endTurnBtn.disabled = true;
        return;
      }
      if (replacingSubCardId) {
        els.actionHint.textContent = "破棄するサブカードを選んでください。";
        els.endTurnBtn.disabled = true;
        return;
      }
      if (game.phase === "draw") {
        els.actionHint.textContent = "補充カードを受け取ってください。";
        els.endTurnBtn.disabled = true;
        return;
      }
      if (game.turn === "ai") {
        els.actionHint.textContent = "相手が行動中です。";
        els.endTurnBtn.disabled = true;
        return;
      }
      const discardLimit = getDiscardLimit(game.player);
      const discardNote = game.discardedThisTurnCount >= discardLimit
        ? `（今ターンの捨て札上限に達しました：${game.discardedThisTurnCount}/${discardLimit}）`
        : `墓地ゾーンにドロップで捨て札（このターン ${game.discardedThisTurnCount}/${discardLimit}）。`;
      if (hasSynthSpace(game.player)) {
        const hasReadyCombined = game.player.hand.some(c => c.synthSources);
        els.actionHint.textContent = hasReadyCombined
          ? "手札の合成カードをメインフィールドにドロップして使用してください。"
          : "メインカードはメインフィールドへ直接出せます。合成したい場合は合成スペースへドロップしてください。";
      } else {
        els.actionHint.textContent = `${discardNote}`;
      }
      els.endTurnBtn.disabled = !canEndWithoutMain();
    }

    setupDrop(els.playerMainDrop, "main");
    setupDrop(els.playerSubDrop, "sub");
    setupSynthDrop(els.playerSynthMains, "main");
    setupSynthDrop(els.playerSynthMaterial, "material");
    setupGraveDrop();
    els.acceptDrawBtn.addEventListener("click", acceptDraw);
    els.redrawBtn.addEventListener("click", redrawInitial);
    els.endTurnBtn.addEventListener("click", () => {
      if (!canEndWithoutMain()) return;
      // メインを出さずに終了した場合、山札から1枚ドロー
      const drawn = drawCards(game.player, 1);
      if (drawn.length > 0) {
        game.player.hand.push(...drawn);
        log(`メインを出さずターン終了。山札から1枚ドローした。`, "good");
      } else {
        log(`メインを出さずターン終了（山札なし）。`);
      }
      resolveSubEffects(game.player);
      render();
      setTimeout(endPlayerTurn, 500);
    });
    // リスタート → デッキ選択画面へ戻る
    els.restartBtn.addEventListener("click", () => openDeckSelect());
    els.rollDiceBtn.addEventListener("click", rollDicePlayer);
    els.coinGauge.addEventListener("click", () => {
      if (game.turn !== "player" || game.phase !== "main" || game.gameOver) return;
      clickCoinGauge(game.player);
      render();
    });
    els.coinHealBtn.addEventListener("click", () => {
      if (game.turn !== "player" || game.phase !== "main" || game.gameOver) return;
      useCoinHeal(game.player);
      render();
    });
    els.coinBuffBtn.addEventListener("click", () => {
      if (game.turn !== "player" || game.phase !== "main" || game.gameOver) return;
      useCoinBuff(game.player);
      render();
    });
    els.coinRerollBtn.addEventListener("click", () => {
      if (game.turn !== "player" || game.phase !== "main" || game.gameOver) return;
      rerollCoinShop(game.player);
      render();
    });

    // ── カード選択モーダル（セレクトデッキ） ──
    els.cardSearchInput.addEventListener("input", event => {
      cardSelectFilter.search = event.target.value.trim();
      renderCardSelect();
    });
    els.cardSelectFilters.querySelectorAll(".filter-chip").forEach(chip => {
      chip.addEventListener("click", () => {
        if (chip.dataset.rarity) {
          if (chip.dataset.rarity === "all") {
            cardSelectFilter.rarity = "all";
          } else {
            cardSelectFilter.rarity = cardSelectFilter.rarity === chip.dataset.rarity ? "all" : chip.dataset.rarity;
          }
          els.cardSelectFilters.querySelectorAll("[data-rarity]").forEach(c => {
            c.classList.toggle("active", c.dataset.rarity === cardSelectFilter.rarity);
          });
        } else if (chip.dataset.type) {
          if (cardSelectFilter.types.has(chip.dataset.type)) {
            cardSelectFilter.types.delete(chip.dataset.type);
            chip.classList.remove("active");
          } else {
            cardSelectFilter.types.add(chip.dataset.type);
            chip.classList.add("active");
          }
        }
        renderCardSelect();
      });
    });
    els.cardSelectCancelBtn.addEventListener("click", () => {
      // セレクトを選んでいたが戻る場合は、デッキ選択を「スタンダード」に戻しておく
      if (selectedCustomDeck.length !== FULL_DECK_SIZE) {
        selectedDeckIds.player = "standard";
      }
      closeCardSelect();
    });
    els.cardSelectConfirmBtn.addEventListener("click", () => {
      if (selectedCustomDeck.length !== FULL_DECK_SIZE) return;
      selectedDeckIds.player = "select";
      closeCardSelect();
    });

    // ── デッキ参照（対戦中） ──
    els.deckRefBtn.addEventListener("click", openDeckRef);
    els.deckRefCloseBtn.addEventListener("click", closeDeckRef);

    // デッキの選択可否を判定（select/randomは専用ルール、その他は枚数チェック）
    function isDeckPlayable(deck, who) {
      if (!deck) return { ok: false, reason: "デッキが見つかりません。" };
      if (who === "ai" && deck.playerOnly) return { ok: false, reason: `「${deck.name}」は自分専用のデッキです。` };
      if (deck.random) return { ok: true };
      if (deck.custom) {
        if (who === "ai") return { ok: false, reason: `「${deck.name}」は自分専用のデッキです。` };
        if (selectedCustomDeck.length !== FULL_DECK_SIZE) {
          return { ok: false, reason: `「${deck.name}」はまだ${selectedCustomDeck.length}/30枚しか選択されていません。` };
        }
        return { ok: true };
      }
      if (deck.cards.length < FULL_DECK_SIZE) {
        return { ok: false, reason: `「${deck.name}」は準備中のデッキです（${deck.cards.length}枚）。` };
      }
      return { ok: true };
    }

    // 相手デッキ：レベル調整モーダル
    document.getElementById("aiLevelAdjustBtn").addEventListener("click", () => {
      document.querySelectorAll(".ai-level-option").forEach(btn => {
        btn.classList.toggle("active", btn.dataset.mode === aiDeckConfig.levelMode);
      });
      const modal = document.getElementById("aiLevelModal");
      modal.classList.add("active");
      modal.style.display = "flex";
    });
    document.querySelectorAll(".ai-level-option").forEach(btn => {
      btn.addEventListener("click", () => {
        aiDeckConfig.levelMode = btn.dataset.mode;
        renderAiAdjustLabels();
        document.querySelectorAll(".ai-level-option").forEach(b => b.classList.toggle("active", b === btn));
      });
    });
    document.getElementById("aiLevelModalCloseBtn").addEventListener("click", () => {
      const modal = document.getElementById("aiLevelModal");
      modal.classList.remove("active");
      modal.style.display = "none";
    });

    // 相手デッキ：重複調整モーダル
    document.getElementById("aiDupeAdjustBtn").addEventListener("click", () => {
      document.querySelectorAll(".ai-dupe-option").forEach(btn => {
        btn.classList.toggle("active", Number(btn.dataset.level) === aiDeckConfig.limitBreakLevel);
      });
      const modal = document.getElementById("aiDupeModal");
      modal.classList.add("active");
      modal.style.display = "flex";
    });
    document.querySelectorAll(".ai-dupe-option").forEach(btn => {
      btn.addEventListener("click", () => {
        aiDeckConfig.limitBreakLevel = Number(btn.dataset.level);
        renderAiAdjustLabels();
        document.querySelectorAll(".ai-dupe-option").forEach(b => b.classList.toggle("active", b === btn));
      });
    });
    document.getElementById("aiDupeModalCloseBtn").addEventListener("click", () => {
      const modal = document.getElementById("aiDupeModal");
      modal.classList.remove("active");
      modal.style.display = "none";
    });

    // デッキ確定ボタン
    els.deckConfirmBtn.addEventListener("click", () => {
      if (playerState.formationDeck.length !== FULL_DECK_SIZE) {
        els.deckError.textContent = `自分側：編成デッキが${playerState.formationDeck.length}/30枚です。編成・強化画面で30枚選んでください。`;
        return;
      }
      const aiDeck = DECKS.find(d => d.id === selectedDeckIds.ai);
      const aiCheck = isDeckPlayable(aiDeck, "ai");
      if (!aiCheck.ok) {
        els.deckError.textContent = `相手側：${aiCheck.reason}`;
        return;
      }
      els.deckError.textContent = "";
      startGame();
    });

