    // ============================================================
    // ソシャゲ風ラッパー（タイトル／ロビー／編成／図鑑／リザルト／強化／デバッグ）
    // ============================================================
    const STANDARD_DECK_IDS = DECKS.find(d => d.id === "standard").cards;
    const LIBRARY_INDEX = new Map(CARD_LIBRARY.map((c, i) => [c.id, i]));
    const EXP_BASE_BY_RARITY = { 1: 200, 2: 600, 3: 1200 };
    const CARD_MAX_LEVEL = 20;

    // ---- プレイヤーデータ（メモリ上のみ。ページ再読込でリセット） ----
    const NAMED_DECKS = DECKS.filter(d => !d.custom && !d.random && !d.aiOnly);
    const DECK_EFFECT_THRESHOLD = 20;
    const LEVEL_HP_BONUS_BY_RARITY = { 1: 4, 2: 8, 3: 16 };
    const MILESTONE_HP_BONUS_BY_RARITY = { 1: 2, 2: 4, 3: 8 }; // Lv10・Lv20到達時に追加

    const playerState = {
      stone: 0,
      exp: 0,
      shards: 0,        // 欠片（ガチャ・凸の副産物、ショップで使用予定）
      cardLevels: {},   // cardId -> level（未登録は1扱い）
      dupeCounts: {},   // cardId -> 所持している未使用の字魂数（凸の素材）
      limitBreak: {},   // cardId -> 実際に適用された凸レベル（0〜4）
      ownedCardIds: new Set(STANDARD_DECK_IDS),
      acquiredOrder: [...STANDARD_DECK_IDS],
      formationDeck: [...STANDARD_DECK_IDS], // 対戦で実際に使う30枚（初期はスタンダード30枚）
      missionProgress: {
        battleCompleted: 0,
        battleWinTotal: 0,
        gachaPullTotal: 0,
        loginDone: false,
        noDeckEffectWin: false,
        dealt10kOnce: false,
        dealt10kTwiceInBattle: false,
        subFieldFull: false,
        noSubWin: false,
        graveReset3InBattle: false,
        hpDiff10000Win: false,
        trialOujaWin: false,
        trialOujaWinStrong4: false,
        trialShippuWin: false,
        trialShippuWinStrong4: false,
        trialGekokujouWin: false,
        trialGekokujouWinStrong4: false,
      },
      missionClaimedCount: {}, // missionId -> 受け取り済み回数（繰り返し可能ミッション用）
      missionClaimedSet: new Set(), // 「いずれかのミッションをNつクリア」判定用：1度でも受け取ったミッションID
      shopPurchaseCounts: {}, // ショップ商品key -> 購入済み回数
      gachaCounters: {}, // bannerId -> 天井カウンター（0〜1000）
      equipOwned: {},          // 装備品ID -> { level: 1〜10, dupe: 重複取得による＋n（0〜20） }
      equipAcquiredOrder: [],  // 装備品の入手順
      equipFormation: [],      // 装備中の装備品ID（合計コスト20C以内）
    };
    function getCardLevel(cardId, isAI = false) {
      if (isAI) return aiCardLevels[cardId] || 1;
      return playerState.cardLevels[cardId] || 1;
    }
    function getDupeCount(cardId) { return playerState.dupeCounts[cardId] || 0; }
    function getLimitBreak(cardId, isAI = false) {
      if (isAI) return aiDeckConfig.limitBreakLevel || 0;
      return playerState.limitBreak[cardId] || 0;
    }
    // ── 相手（AI）デッキの事前調整：レベル・凸レベル ──
    // levelMode: "none"（Lv1固定）／"weak"（Lv2〜10・カードごとに乱数）／"mid"（Lv11〜20・カードごとに乱数）／"strong"（Lv20固定）
    let aiDeckConfig = { levelMode: "none", limitBreakLevel: 0 };
    let aiCardLevels = {}; // cardId -> レベル（対戦開始時にAIデッキの構成カードごとに決定）
    function rollAiCardLevel(mode) {
      if (mode === "weak") return 2 + Math.floor(Math.random() * 9);   // 2〜10
      if (mode === "mid") return 11 + Math.floor(Math.random() * 10); // 11〜20
      if (mode === "strong") return CARD_MAX_LEVEL;                   // 20固定
      return 1; // none：Lv1固定
    }
    // 指定したカードID群に対して、AI用のレベルを（未決定のものだけ）新規に乱数で割り当てる
    function rollAiCardLevelsFor(cardIds) {
      aiCardLevels = {};
      for (const id of new Set(cardIds)) {
        aiCardLevels[id] = rollAiCardLevel(aiDeckConfig.levelMode);
      }
    }

    // ============================================================
    // 凸（限界突破）システム
    // ☆1・☆2は共通性能。☆3はカードごとに固有（今後実装予定・現状は空）。
    // ============================================================
    const LIMIT_BREAK_CAP = 4;
    const LIMIT_BREAK_EFFECTS = {
      1: {
        hpBonus: { 1: 5, 3: 10 },
        onFieldDamage: { 2: 200 },
        dmgPercent: { 4: 20 },
      },
      2: {
        dmgPercent: { 1: 10, 4: 20 },
        onFieldHeal: { 2: 100 },
        hpBonus: { 3: 20 },
      },
      3: {
        hpBonus: { 3: 40 }, // ☆3は3凸で共通してHP+40
      },
    };
    // ☆3固有：カードごとの追加HPボーナス（3凸の共通+40とは別に加算）
    const STAR3_CARD_HP_BONUS = {
      kai2: { 1: 20 },
      ni: { 1: 10 },
      wari: { 1: 10 },
      kag: { 1: 10 },
      shir: { 1: 10 },
      gen: { 1: 10 },
      kitsune: { 1: 10 },
      ki3: { 1: 10 },
      kyou3: { 1: 10 },
      fuku: { 1: 10 },
    };
    const LIMIT_BREAK_TIER_LABELS = {
      1: { 1: "HP+5", 2: "フィールドに出した時、相手に200ダメージを与える。", 3: "HP+10", 4: "与えるダメージ+20％" },
      2: { 1: "与えるダメージ+10％", 2: "フィールドに出した時、自身のHPを100回復する。", 3: "HP+20", 4: "更に与えるダメージ+20％" },
    };
    // ☆3：カードごとの固有凸性能（表示用ラベル）
    const STAR3_TIER_LABELS = {
      ki:   { 1: "手札の枚数をカウントする時、常に1枚多くカウントする。", 2: "HPが半分以下の時に与えるダメージが[2400→3000]となる。", 3: "HP+40", 4: "手札が1枚あるごとに与えるダメージ+10％" },
      bak:  { 1: "与えるダメージが[650→700]となる。", 2: "攻撃回数[4回→5回]", 3: "HP+40", 4: "相手のサブフィールドにあるカードを全て破壊する。" },
      yam:  { 1: "与えるダメージが[3000→3500]となる。", 2: "1000ダメージの自傷が無効となる。", 3: "HP+40", 4: "与えるダメージが[3500→4000]となる。" },
      ju:   { 1: "自身のHPを600回復する。", 2: "与えるダメージが[900→1200]となる。", 3: "HP+40", 4: "召喚した「木」にノーマルビーコンをそれぞれ２つずつ付与する。" },
      kai2: { 1: "HP+20", 2: "回復量が[2000→3000]となる。", 3: "HP+40", 4: "相手に1000ダメージを与える。" },
      go:   { 1: "このカードをフィールドに出した時、山札からカードを1枚引く。", 2: "毎ターンHPを400回復する。", 3: "HP+40", 4: "継続ターン[2→3]" },
      ni:   { 1: "HP+10", 2: "獲得コスト+2", 3: "HP+40", 4: "このカードによって再び発動したカードの与えるダメージ+50％" },
      san:  { 1: "与えるダメージが[720→840]となる。", 2: "このカードがフィールドに存在する間、全てのカードの与えるダメージ+10％", 3: "HP+40", 4: "継続ターン[3→4]" },
      // ── ナンバーデッキ ☆3 ──
      juu:  { 1: "与えるダメージが[1000→1600]となる。", 2: "獲得コスト+4", 3: "HP+40", 4: "山札から引く数が[3→5]枚となる。" },
      zero: { 1: "獲得コスト+3", 2: "与えるダメージが[1500→2000]となる。", 3: "HP+40", 4: "再発動されたカードのダメージ+50％" },
      sen:  { 1: "自身のHPを1000回復する。", 2: "このカードには常にノーマルビーコンが2つ付与されるようになる。", 3: "HP+40", 4: "与えるダメージ+30％" },
      wari: { 1: "HP+10", 2: "獲得コスト+2", 3: "HP+40", 4: "自傷ダメージが[3000→1000]に軽減される。" },
      ku:   { 1: "このカードにはトラブルビーコンが付与されないようになる。", 2: "このカードがフィールドに存在する間、他のカードの与えるダメージ+10％", 3: "HP+40", 4: "継続ターン[3→4]" },
      kag:  { 1: "HP+10", 2: "獲得コスト+2", 3: "HP+40", 4: "発動可能回数[1→2]" },
      oku:  { 1: "設置時に相手に1000ダメージを与える。", 2: "このカードが破棄された時、山札からカードを2枚引く。", 3: "HP+40", 4: "このカードの効果によって戻ったカードにスペシャルビーコン「ブースト」を1つ付与する。" },
      tyo:  { 1: "このカードがサブフィールドにあり、かつサブフィールドに空きが無くなった場合、このカードは即座に破棄されるようになる。", 2: "このカードがフィールドに存在する時、相手の与えるダメージ-15％", 3: "HP+40", 4: "獲得コスト+4" },
      // ── キングデッキ ☆3 ──
      hime: { 1: "王が手札・サブにない場合、山札か墓地から即座に王を引く。", 2: "与えるダメージが[1400→1600]、王がいる時は[2800→3200]となる。", 3: "HP+40", 4: "このカードには常にノーマルビーコンが1つ付与されるようになる。" },
      kanm: { 1: "相手に1700ダメージを与える。", 2: "獲得コスト+5", 3: "HP+40", 4: "サブフィールドか手札に「王」がいる場合、その「王」にノーマルビーコンを3つ付与する。" },
      ma:   { 1: "与えるダメージが[1200→1500]となる。", 2: "サブが1枚あるごとに与えるダメージ+15％", 3: "HP+40", 4: "他の☆3カードは、このカードによるサブ破壊の影響を受けなくなる。" },
      houk: { 1: "山札からカードを1枚引く。", 2: "自身のHPを破棄したカードの枚数×150回復する。", 3: "HP+40", 4: "相手に破棄したカードの枚数×300のダメージを与える。" },
      kou:  { 1: "このカードにはトラブルビーコンが付与されないようになる。", 2: "山札からカードを3枚引く。", 3: "HP+40", 4: "このカードによって再現したカードの与えるダメージ+30％" },
      ou:   { 1: "このカードは破棄されても墓地に行かず山札へ戻るようになる。", 2: "与えるダメージが[600→800]となる。", 3: "HP+40", 4: "このカードがフィールドに存在する間、他のカードの与えるダメージが+20％" },
      shir: { 1: "HP+10", 2: "継続ターン[4→5]", 3: "HP+40", 4: "このカードがサブフィールドに存在する時、相手の与えるダメージ-10％" },
      matsuri: { 1: "獲得コスト+3", 2: "毎ターンHPを250回復する。", 3: "HP+40", 4: "このカードがサブフィールドに存在する時、他のサブカードの与えるダメージ+20％" },
      // ── トリックデッキ ☆3 ──
      yu2:  { 1: "獲得コスト+3", 2: "与える乱数ダメージが[2000〜4000]となる。", 3: "HP+40", 4: "与える乱数ダメージが[2000〜5000]となる。" },
      etsu: { 1: "与える乱数ダメージが[300〜1000]となる。", 2: "このカードでダメージを与える度に、自身のHPを200〜400回復する。", 3: "HP+40", 4: "5回の乱数の内1回は必ず最高値となる。" },
      sho2: { 1: "相手の全ての手札にランダムなトラブルビーコンを1つ付与する。", 2: "自身のHPを888回復する。", 3: "HP+40", 4: "与えるダメージが[888→1888]となる。" },
      haku: { 1: "与えたダメージ分自身のHPを回復する。", 2: "選択肢から0が除外される。", 3: "HP+40", 4: "与えるダメージ+20％" },
      ten:  { 1: "獲得コスト+2", 2: "手札に戻る確率が[40%→60%]となる。", 3: "HP+40", 4: "使用する度に与えるダメージが300ずつ増加する。" },
      kami: { 1: "獲得コスト+4", 2: "手札にあるカード全てにランダムなノーマルビーコンを1つずつ付与する。", 3: "HP+40", 4: "与えるダメージが[1600→3200]となる。" },
      zen:  { 1: "設置時に山札からカードを2枚引く。", 2: "設置時に墓地にある☆3カードを山札へ戻す。", 3: "HP+40", 4: "発動可能回数[4→5]" },
      kyo3: { 1: "このカードが破棄された時、相手に1200ダメージを与える。", 2: "与えるダメージが[850→1150]となる。", 3: "HP+40", 4: "破棄される度にHPを670回復する。" },
      // ── その他・スペシャルガチャ限定 ──
      ryu2: { 1: "山札からカードを5枚引く。", 2: "相手に「火傷」を3層付与する。", 3: "HP+40", 4: "与えるダメージ+20％" },
      nou2: { 1: "☆1のカードの枚数×2のコストを獲得する。", 2: "与えるダメージがカードの枚数×[300→400]となる。", 3: "HP+40", 4: "自身に「栄光」を1層付与する。" },
      rin:  { 1: "自身のHPを800回復する。", 2: "与えるダメージが[1200→2400]となる", 3: "HP+40", 4: "このカードによって発動したカードの与えるダメージ+30％" },
      tai2: { 1: "このカードがフィールドに存在する間、自身の他のカードが与えるダメージ+10% ", 2: "このカードがフィールドに存在する時、相手の与えるダメージ-20%", 3: "HP+40", 4: "バリアの耐久値[5000→6000]" },
      mikado: { 1: "デッキ効果なしの時、スタンダード、ナンバー、キング、トリックのデッキ効果の中から1つ、ランダムで発動する。(デッキ効果なしによる効果と併用)", 2: "デッキ効果が発動していても、デッキ効果なしによる3000ダメージが発生するようになる。", 3: "HP+40", 4: "1凸による効果は、デッキ効果関係なく発動するようになる。また、自身に「栄光」を1層付与する。" },
      kirameki: { 1: "相手に1500ダメージを与える。", 2: "加えたカードにそれぞれノーマルビーコンを2つずつ付与する。", 3: "HP+40", 4: "加えるカードの数が山札[2→3]枚、手札[1→2]枚となる。" },
      katana: { 1: "自身に「栄光」を1層付与する。", 2: "相手に与えるダメージが[2100→3400]となる", 3: "HP+40", 4: "「刃」をもう1枚サブに召喚する。「刃」が複数ある場合、「斬」は経過ターンの合計値を参照する。" },
      gen:  { 1: "HP+10", 2: "経過ターン[4→5]", 3: "HP+40", 4: "このカードがフィールドに存在する間、自身の他のカードが与えるダメージ+20%" },
      geki: { 1: "山札からカードを1枚引く。", 2: "相手に「出血」を2層付与する。", 3: "HP+40", 4: "与えるダメージが[3200→4500]となる。また、このカードには常にノーマルビーコンが2つ付与されるようになる。" },
      akatsuki: { 1: "相手に「火傷」を2層付与する。", 2: "墓地にあるカードの枚数による与えるダメージ+[3％→4%]", 3: "HP+40", 4: "与えるダメージ＋15％。また、墓地にあるカードを山札へ戻す。" },
      shitsu: { 1: "相手に「油」を付与する。", 2: "このカードは初期手札に優先的に選ばれる。", 3: "HP+40", 4: "与えるダメージがHPが90%以上の時は[2400→3200]、HPが90%以下の時は[800→1600]となる。" },
      kagayaki2: { 1: "相手に1000ダメージを与える。", 2: "召喚した「光」の継続ターン[2→3]", 3: "HP+40", 4: "自身に付与された状態異常（栄光、月照を除く）を全て除去する。" },
      gekoku:  { 1: "自身に「栄光」を1層付与する。", 2: "このカードは初期手札に優先的に選ばれる。", 3: "HP+40", 4: "付与する「革命」の層数[10→20]" },
      // ── シンセサイズデッキ ☆3 ──
      goku:    { 1: "墓地へ送ったカードにトラブルビーコンを1つずつ付与する。", 2: "相手に与えるダメージが[1300→2600]となる", 3: "HP+40", 4: "自身のHPを1300回復する。" },
      en3:     { 1: "相手に「油」を付与する。また、付与する「火傷」の層数[2→3]", 2: "山札からカードを2枚引く。", 3: "HP+40", 4: "与えるダメージ+30%" },
      kitsune: { 1: "HP+10", 2: "獲得コスト+2", 3: "HP+40", 4: "このカードによって再発動したカードの与えるダメージ+50％" },
      goku2:   { 1: "引いた☆3カードにノーマルビーコンを3つ付与する。", 2: "与えるダメージ+20%", 3: "HP+40", 4: "獲得コスト+10" },
      kai5:    { 1: "99%の確率で相手に1000ダメージを与える。使用者の残りHPが1%減るごとに発動確率が1%下がる。この効果は既存の「回」の5000ダメージと重複して発動する場合がある。", 2: "相手に「脆弱」を2層付与する。", 3: "HP+40", 4: "初期確率が[1%→5%]となる。" },
      urami:   { 1: "与えるダメージが[360→420]となる", 2: "継続ターン[4→5]", 3: "HP+40", 4: "ターンが経過する度に与えるダメージ+5%" },
      ki3:     { 1: "HP+10", 2: "獲得コスト+2", 3: "HP+40", 4: "このカードがフィールドに存在する間、全てのカードの与えるダメージ+10%" },
      shin2:   { 1: "合成して出来たカードにノーマルビーコンを1つ付与する。", 2: "設置した時、山札からカードを3枚引く。", 3: "HP+40", 4: "合成したカードをフィールドに出した時、残り発動可能回数が3回以下の場合はこのカードを即座に破棄させ、2340ダメージを相手に与える。" },
      // ── コインデッキ ☆3 ──
      kagayaki: { 1: "相手に「火傷」を1層付与する。", 2: "破壊したサブカードの枚数分、追加で300ダメージを与える。", 3: "HP+40", 4: "与えるダメージが[1200→2400]となる。" },
      kin:      { 1: "獲得コスト+4", 2: "獲得するコイン量が[100→160]となる。", 3: "HP+40", 4: "山札から引く枚数が[3→5]枚となる。" },
      takara:   { 1: "回復量が[800→1200]となる。", 2: "獲得コスト+9", 3: "HP+40", 4: "自身に「栄光」を1層付与する。" },
      kyou3:    { 1: "HP+10", 2: "獲得コスト+2", 3: "HP+40", 4: "与えるダメージがコイン総数×[10→15]となる。" },
      fuku:     { 1: "HP+10", 2: "獲得コスト+2", 3: "HP+40", 4: "コインを100枚獲得する。" },
      toku:     { 1: "獲得コスト+3", 2: "入手したカードにランダムなノーマルビーコンを1つずつ付与する。", 3: "HP+40", 4: "相手に1000ダメージを与える。" },
      kou3:     { 1: "獲得するコイン量がコイン総数の[5%→10%]となる。", 2: "継続ターン[8→10]", 3: "HP+40", 4: "設置時にコインを50枚獲得する。" },
      kujira:   { 1: "このカードがフィールドに存在する間、全てのカードの与えるダメージ+10%", 2: "設置時に自身のHPを1500回復する。", 3: "HP+40", 4: "継続ターン[3→4]" },
    };
    function limitBreakHpBonus(card, level) {
      const table = LIMIT_BREAK_EFFECTS[card.rarity];
      let sum = 0;
      if (table && table.hpBonus) {
        for (let lv = 1; lv <= level; lv++) sum += table.hpBonus[lv] || 0;
      }
      const perCard = STAR3_CARD_HP_BONUS[card.id];
      if (perCard) {
        for (let lv = 1; lv <= level; lv++) sum += perCard[lv] || 0;
      }
      return sum;
    }
    function limitBreakDamagePercent(card, isAI = false) {
      if (!card) return 0;
      const table = LIMIT_BREAK_EFFECTS[card.rarity];
      if (!table || !table.dmgPercent) return 0;
      const level = getLimitBreak(card.id, isAI);
      let pct = 0;
      for (const lv in table.dmgPercent) if (level >= Number(lv)) pct += table.dmgPercent[lv];
      return pct;
    }
    function limitBreakOnFieldDamage(card, isAI = false) {
      const table = LIMIT_BREAK_EFFECTS[card.rarity];
      if (!table || !table.onFieldDamage) return 0;
      const level = getLimitBreak(card.id, isAI);
      let val = 0;
      for (const lv in table.onFieldDamage) if (level >= Number(lv)) val += table.onFieldDamage[lv];
      return val;
    }
    function limitBreakOnFieldHeal(card, isAI = false) {
      const table = LIMIT_BREAK_EFFECTS[card.rarity];
      if (!table || !table.onFieldHeal) return 0;
      const level = getLimitBreak(card.id, isAI);
      let val = 0;
      for (const lv in table.onFieldHeal) if (level >= Number(lv)) val += table.onFieldHeal[lv];
      return val;
    }
    // メイン／サブとしてフィールドに出た瞬間に発動する凸効果（ダメージ・回復）
    function triggerLimitBreakOnField(owner, card) {
      const dmg = limitBreakOnFieldDamage(card, owner.isAI);
      if (dmg > 0) {
        applyDamage(owner, opponentOf(owner), dmg, `『${card.name}』の凸効果`);
      }
      const heal = limitBreakOnFieldHeal(card, owner.isAI);
      if (heal > 0) {
        healHp(owner, heal);
        log(`『${card.name}』の凸効果：${owner.label}のHPを${heal}回復した。`, "good");
      }
    }

    // ============================================================
    // エレメントスキルシステム（デッキとは無関係の新要素）
    // ============================================================
    const ELEMENT_COST_UNLOCK = 30;
    const ELEMENT_COST_MAX = 50;
    const ELEMENT_COST_USE = 30; // スキル使用時の消費量（一律）
    const ELEMENT_COST_GAIN_BY_RARITY = { 1: 4, 2: 2, 3: 1 };
    const ELEMENT_DEFS = {
      fire:  { key: "fire",  label: "火", icon: "🔥", color: "#e53935" },
      water: { key: "water", label: "水", icon: "💧", color: "#1e88e5" },
      earth: { key: "earth", label: "土", icon: "🪨", color: "#8d6e63" },
      wind:  { key: "wind",  label: "風", icon: "🌪️", color: "#43a047" },
    };
    // フィールドにカードを置いた時、レアリティに応じてエレメントコストを獲得する
    function gainElementCost(owner, card) {
      let gain = ELEMENT_COST_GAIN_BY_RARITY[card.rarity] || 0;
      // 凸：『似』2凸 - このカードが場に出た時の獲得コスト+2
      if (card.id === "ni" && getLimitBreak("ni", owner.isAI) >= 2) gain += 2;
      // 凸：ナンバーデッキ ☆3 - カードごとの獲得コスト増加
      if (card.id === "juu" && getLimitBreak("juu", owner.isAI) >= 2) gain += 4;
      if (card.id === "zero" && getLimitBreak("zero", owner.isAI) >= 1) gain += 3;
      if (card.id === "wari" && getLimitBreak("wari", owner.isAI) >= 2) gain += 2;
      if (card.id === "kag" && getLimitBreak("kag", owner.isAI) >= 2) gain += 2;
      if (card.id === "tyo" && getLimitBreak("tyo", owner.isAI) >= 4) gain += 4;
      // 凸：キングデッキ ☆3 - カードごとの獲得コスト増加
      if (card.id === "kanm" && getLimitBreak("kanm", owner.isAI) >= 2) gain += 5;
      if (card.id === "matsuri" && getLimitBreak("matsuri", owner.isAI) >= 1) gain += 3;
      // 凸：トリックデッキ ☆3 - カードごとの獲得コスト増加
      if (card.id === "yu2" && getLimitBreak("yu2", owner.isAI) >= 1) gain += 3;
      if (card.id === "ten" && getLimitBreak("ten", owner.isAI) >= 1) gain += 2;
      if (card.id === "kami" && getLimitBreak("kami", owner.isAI) >= 1) gain += 4;
      // 凸：シンセサイズデッキ ☆3 - カードごとの獲得コスト増加
      if (card.id === "kitsune" && getLimitBreak("kitsune", owner.isAI) >= 2) gain += 2;
      if (card.id === "ki3" && getLimitBreak("ki3", owner.isAI) >= 2) gain += 2;
      if (card.id === "goku2" && getLimitBreak("goku2", owner.isAI) >= 4) gain += 10;
      // 凸：コインデッキ ☆3 - カードごとの獲得コスト増加
      if (card.id === "kin" && getLimitBreak("kin", owner.isAI) >= 1) gain += 4;
      if (card.id === "takara" && getLimitBreak("takara", owner.isAI) >= 2) gain += 9;
      if (card.id === "kyou3" && getLimitBreak("kyou3", owner.isAI) >= 2) gain += 2;
      if (card.id === "fuku" && getLimitBreak("fuku", owner.isAI) >= 2) gain += 2;
      if (card.id === "toku" && getLimitBreak("toku", owner.isAI) >= 1) gain += 3;
      if (gain <= 0) return;
      owner.elementCost = Math.min(ELEMENT_COST_MAX, (owner.elementCost || 0) + gain);
    }
    // そのエレメントが現在使用可能か
    function canUseElementSkill(owner) {
      return (owner.elementCost || 0) >= ELEMENT_COST_UNLOCK;
    }
    // そのエレメントの効果が現在発動中か（終了するまで再発動不可にするため）
    function isElementActive(owner, key) {
      switch (key) {
        case "fire": return !!(owner._elementFireBuff && owner._elementFireBuff.turnsLeft > 0);
        case "water": return !!(owner._elementWaterRegen && owner._elementWaterRegen.turnsLeft > 0);
        case "earth": return !!owner._elementEarthNextMainBoost;
        case "wind": return !!(owner._elementWindBeaconTurns > 0);
        default: return false;
      }
    }
    function useElementSkill(owner, key) {
      if (!canUseElementSkill(owner)) return false;
      if (isElementActive(owner, key)) return false; // 効果発動中は再発動不可
      const enhanced = (owner.elementCost || 0) >= ELEMENT_COST_MAX;
      const spentCost = enhanced ? ELEMENT_COST_MAX : ELEMENT_COST_USE;
      owner.elementCost = Math.max(0, (owner.elementCost || 0) - spentCost);
      equipOnElementSkillUse(owner, spentCost); // 装備品：研がれた包丁・デコられた本
      const target = opponentOf(owner);
      const rank = enhanced ? "強化版" : "通常";
      switch (key) {
        case "fire": {
          const pct = enhanced ? 50 : 30;
          owner._elementFireBuff = { turnsLeft: 3, pct };
          log(`${owner.label}のエレメントスキル「火」（${rank}）発動！3ターンの間、与えるダメージが${pct}％アップする。`, "good");
          break;
        }
        case "water": {
          healHp(owner, 2000);
          log(`${owner.label}のエレメントスキル「水」（${rank}）発動！HPを2000回復した。`, "good");
          if (enhanced) {
            owner._elementWaterRegen = { turnsLeft: 4, amount: 500 };
            log(`更に4ターンの間、毎ターンHPを500回復する。`, "good");
          }
          break;
        }
        case "earth": {
          if (owner.grave.length > 0) {
            const returned = owner.grave.splice(0).map(c => ({ ...c, elapsed: 0 }));
            owner.deck = shuffle([...owner.deck, ...returned]);
            log(`${owner.label}のエレメントスキル「土」（${rank}）発動！墓地の${returned.length}枚を山札へ戻した。`, "good");
          } else {
            log(`${owner.label}のエレメントスキル「土」（${rank}）発動！ただし墓地は空だった。`, "good");
          }
          if (enhanced) {
            owner._elementEarthNextMainBoost = 80;
            log(`更に、次に出すメインカードの与えるダメージが80％アップする。`, "good");
          }
          break;
        }
        case "wind": {
          const drawCount = enhanced ? 6 : 4;
          const drawn = drawCards(owner, drawCount);
          owner.hand.push(...drawn);
          log(`${owner.label}のエレメントスキル「風」（${rank}）発動！山札から${drawn.length}枚引いた。`, "good");
          if (enhanced) {
            owner._elementWindBeaconTurns = 3;
            log(`更に3ターンの間、山札から引いたカードにノーマルビーコンが付与される。`, "good");
          }
          break;
        }
        default:
          return false;
      }
      checkWin();
      return true;
    }
    // ターン経過によるエレメント持続効果の処理（resolveSubEffectsから毎ターン呼ばれる）
    function tickElementEffects(owner) {
      if (owner._elementFireBuff && owner._elementFireBuff.turnsLeft > 0) {
        owner._elementFireBuff.turnsLeft -= 1;
        if (owner._elementFireBuff.turnsLeft <= 0) owner._elementFireBuff = null;
      }
      if (owner._elementWaterRegen && owner._elementWaterRegen.turnsLeft > 0) {
        healHp(owner, owner._elementWaterRegen.amount);
        log(`エレメント「水」の効果で${owner.label}のHPを${owner._elementWaterRegen.amount}回復した。`, "good");
        owner._elementWaterRegen.turnsLeft -= 1;
        if (owner._elementWaterRegen.turnsLeft <= 0) owner._elementWaterRegen = null;
      }
      if (owner._elementWindBeaconTurns > 0) {
        owner._elementWindBeaconTurns -= 1;
      }
    }
    // 編成デッキの構成から、各名称デッキの含有枚数を数える
    function deckCompositionCounts(cardIds) {
      const counts = {};
      NAMED_DECKS.forEach(deck => {
        counts[deck.id] = cardIds.filter(id => deck.cards.includes(id)).length;
      });
      return counts;
    }
    // 20枚以上組み込まれている名称デッキがあれば、そのデッキ効果を発動（複数同時発動はしない想定）
    function computeActiveDeckId(cardIds) {
      const counts = deckCompositionCounts(cardIds);
      const hit = NAMED_DECKS.find(deck => counts[deck.id] >= DECK_EFFECT_THRESHOLD);
      return hit ? hit.id : null;
    }
    // 1枚分のLvによるHPボーナス（基礎＋Lv10・Lv20到達ボーナス）
    function levelHpBonusForCard(card, level, isAI = false) {
      const perLevel = LEVEL_HP_BONUS_BY_RARITY[card.rarity] || 0;
      const milestone = MILESTONE_HP_BONUS_BY_RARITY[card.rarity] || 0;
      let bonus = (level - 1) * perLevel;
      if (level >= 10) bonus += milestone;
      if (level >= 20) bonus += milestone;
      bonus += limitBreakHpBonus(card, getLimitBreak(card.id, isAI));
      return bonus;
    }
    // 強化Lvによる最大HPボーナス（編成中のカードのみ加算）
    function levelHpBonusForDeck(cardIds, isAI = false) {
      return cardIds.reduce((sum, id) => {
        const card = CARD_LIBRARY.find(c => c.id === id);
        if (!card) return sum;
        return sum + levelHpBonusForCard(card, getCardLevel(id, isAI), isAI);
      }, 0);
    }
    function isInFormation(cardId) { return playerState.formationDeck.includes(cardId); }
    const FORMATION_RARITY3_LIMIT = 8;
    const FORMATION_RARITY2_LIMIT = 13;
    function formationRarityCount(rarity) {
      return playerState.formationDeck.reduce((sum, id) => {
        const c = CARD_LIBRARY.find(x => x.id === id);
        return sum + (c && c.rarity === rarity ? 1 : 0);
      }, 0);
    }
    function formationLimitMessage(card) {
      if (playerState.formationDeck.length >= FULL_DECK_SIZE) return "編成は最大30枚までです。";
      if (card && card.rarity === 3) return `☆3カードは編成に最大${FORMATION_RARITY3_LIMIT}枚までです。`;
      if (card && card.rarity === 2) return `☆2カードは編成に最大${FORMATION_RARITY2_LIMIT}枚までです。`;
      return "これ以上編成に加えられません。";
    }
    // 戻り値：true=成功／false=上限超過（30枚上限 or ☆2:13枚 or ☆3:8枚）
    function toggleFormationCard(cardId) {
      const idx = playerState.formationDeck.indexOf(cardId);
      if (idx >= 0) {
        playerState.formationDeck.splice(idx, 1);
        return true;
      }
      if (playerState.formationDeck.length >= FULL_DECK_SIZE) return false;
      const card = CARD_LIBRARY.find(c => c.id === cardId);
      if (card && card.rarity === 3 && formationRarityCount(3) >= FORMATION_RARITY3_LIMIT) return false;
      if (card && card.rarity === 2 && formationRarityCount(2) >= FORMATION_RARITY2_LIMIT) return false;
      playerState.formationDeck.push(cardId);
      return true;
    }
    // 所持カードから無作為に30枚を選ぶ（☆3は8枚まで、☆2は13枚までの従来ルールを踏襲）
    // 所持数が上限以上ある場合は必ず上限数まで選ばれるよう、☆3→☆2→残りの順に優先して選出する。
    function buildRandomFormationDeck() {
      const RARITY3_LIMIT = FORMATION_RARITY3_LIMIT;
      const RARITY2_LIMIT = FORMATION_RARITY2_LIMIT;
      const pool = shuffle(Array.from(playerState.ownedCardIds));
      const byRarity = { 3: [], 2: [], other: [] };
      for (const id of pool) {
        const card = CARD_LIBRARY.find(c => c.id === id);
        if (!card) continue;
        if (card.rarity === 3) byRarity[3].push(id);
        else if (card.rarity === 2) byRarity[2].push(id);
        else byRarity.other.push(id);
      }
      const picked = [];
      // ☆3を上限数まで優先して選出
      for (const id of byRarity[3]) {
        if (picked.length >= FULL_DECK_SIZE) break;
        if (picked.filter(pid => (CARD_LIBRARY.find(c => c.id === pid)||{}).rarity === 3).length >= RARITY3_LIMIT) break;
        picked.push(id);
      }
      // ☆2を上限数まで優先して選出
      for (const id of byRarity[2]) {
        if (picked.length >= FULL_DECK_SIZE) break;
        if (picked.filter(pid => (CARD_LIBRARY.find(c => c.id === pid)||{}).rarity === 2).length >= RARITY2_LIMIT) break;
        picked.push(id);
      }
      // 残りの枠を、上限に達していないレアリティとその他レアリティで埋める
      const remainder = shuffle([
        ...byRarity[3].filter(id => !picked.includes(id)),
        ...byRarity[2].filter(id => !picked.includes(id)),
        ...byRarity.other
      ]);
      for (const id of remainder) {
        if (picked.length >= FULL_DECK_SIZE) break;
        if (picked.includes(id)) continue;
        const card = CARD_LIBRARY.find(c => c.id === id);
        if (card && card.rarity === 3 && picked.filter(pid => (CARD_LIBRARY.find(c => c.id === pid) || {}).rarity === 3).length >= RARITY3_LIMIT) continue;
        if (card && card.rarity === 2 && picked.filter(pid => (CARD_LIBRARY.find(c => c.id === pid) || {}).rarity === 2).length >= RARITY2_LIMIT) continue;
        picked.push(id);
      }
      playerState.formationDeck = shuffle(picked);
    }
    function expRequiredForLevel(card, level) {
      const base = EXP_BASE_BY_RARITY[card.rarity] || 200;
      return Math.round(base * Math.pow(1.1, level - 1));
    }
    function ownedCardList() {
      return Array.from(playerState.ownedCardIds).map(id => CARD_LIBRARY.find(c => c.id === id)).filter(Boolean);
    }
    function grantCard(cardId) {
      if (!playerState.ownedCardIds.has(cardId)) {
        playerState.ownedCardIds.add(cardId);
        playerState.acquiredOrder.push(cardId);
      }
    }

    const wrapEls = {
      titleScreen: document.getElementById("titleScreen"),
      lobbyScreen: document.getElementById("lobbyScreen"),
      formationScreen: document.getElementById("formationScreen"),
      codexScreen: document.getElementById("codexScreen"),
      resultScreen: document.getElementById("resultScreen"),
      cardEnhanceScreen: document.getElementById("cardEnhanceScreen"),
      equipEnhanceScreen: document.getElementById("equipEnhanceScreen"),
      gachaScreen: document.getElementById("gachaScreen"),
      missionScreen: document.getElementById("missionScreen"),
      guideScreen: document.getElementById("guideScreen"),
      shopScreen: document.getElementById("shopScreen"),
      gameScreen: document.getElementById("game"),
      ownedCardGrid: document.getElementById("ownedCardGrid"),
      formationSummary: document.getElementById("formationSummary"),
      codexCardGrid: document.getElementById("codexCardGrid"),
      codexCounts: document.getElementById("codexCounts"),
      codexFilters: document.getElementById("codexFilters"),
      codexSearchInput: document.getElementById("codexSearchInput"),
      resultTitle: document.getElementById("resultTitle"),
      resultSub: document.getElementById("resultSub"),
      resultExp: document.getElementById("resultExp"),
      resultTurns: document.getElementById("resultTurns"),
      resultMaxDamage: document.getElementById("resultMaxDamage"),
      resStone: document.getElementById("resStone"),
      resExp: document.getElementById("resExp"),
      cardDetailModal: document.getElementById("cardDetailModal"),
      cardDetailTitle: document.getElementById("cardDetailTitle"),
      cardDetailBody: document.getElementById("cardDetailBody"),
      debugCommandBar: document.getElementById("debugCommandBar"),
      debugCommandInput: document.getElementById("debugCommandInput"),
      debugCommandLog: document.getElementById("debugCommandLog"),
    };

    const ALL_SCREENS = ["titleScreen", "lobbyScreen", "formationScreen", "codexScreen", "resultScreen", "cardEnhanceScreen", "equipEnhanceScreen", "gachaScreen", "missionScreen", "shopScreen", "guideScreen", "gameScreen"];
    function closeAllModals() {
      document.querySelectorAll(".modal.active").forEach(m => m.classList.remove("active"));
    }
    function showScreen(name) {
      closeAllModals();
      ALL_SCREENS.forEach(key => {
        wrapEls[key].classList.toggle("screen-hidden", key !== name);
      });
    }

    function updateResBar() {
      wrapEls.resStone.textContent = playerState.stone.toLocaleString();
      wrapEls.resExp.textContent = playerState.exp.toLocaleString();
      const resShard = document.getElementById("resShard");
      if (resShard) resShard.textContent = playerState.shards.toLocaleString();
      const enhanceRes = document.getElementById("enhanceResExp");
      if (enhanceRes) enhanceRes.textContent = playerState.exp.toLocaleString();
      const gachaRes = document.getElementById("gachaResStone");
      if (gachaRes) gachaRes.textContent = playerState.stone.toLocaleString();
      const shopStone = document.getElementById("shopResStone");
      if (shopStone) shopStone.textContent = playerState.stone.toLocaleString();
      const shopExp = document.getElementById("shopResExp");
      if (shopExp) shopExp.textContent = playerState.exp.toLocaleString();
      const shopShard = document.getElementById("shopResShard");
      if (shopShard) shopShard.textContent = playerState.shards.toLocaleString();
    }
    updateResBar();

    // ---- タイトル→ロビー ----
    wrapEls.titleScreen.addEventListener("click", () => {
      const before = getClaimableMissionIds();
      playerState.missionProgress.loginDone = true;
      const after = getClaimableMissionIds();
      notifyNewMissionCompletions(before, after);
      showScreen("lobbyScreen");
    });

    // ---- ロビー：ボトムナビ ----
    document.getElementById("navBattleBtn").addEventListener("click", () => {
      if (playerState.formationDeck.length !== FULL_DECK_SIZE) {
        renderOwnedCardGrid();
        showScreen("formationScreen");
        window.alert(`編成デッキが${playerState.formationDeck.length}/30枚です。対戦するには30枚編成してください。`);
        return;
      }
      showScreen("gameScreen");
      openDeckSelect();
    });
    document.getElementById("navFormationBtn").addEventListener("click", () => {
      renderOwnedCardGrid();
      showScreen("formationScreen");
    });
    document.getElementById("navCodexBtn").addEventListener("click", () => {
      renderCodexGrid();
      showScreen("codexScreen");
    });
    document.getElementById("navGachaBtn").addEventListener("click", () => {
      openGachaScreen();
    });
    document.getElementById("navShopBtn").addEventListener("click", () => {
      openShopScreen();
    });
    document.getElementById("gachaShopBtn").addEventListener("click", () => {
      openShopScreen();
    });
    document.getElementById("navMissionBtn").addEventListener("click", () => {
      renderMissionScreen();
      showScreen("missionScreen");
    });
    document.getElementById("navGuideBtn").addEventListener("click", () => {
      openGuideScreen();
    });
    document.getElementById("guideBackBtn").addEventListener("click", () => showScreen("lobbyScreen"));
    document.getElementById("shopStubCloseBtn").addEventListener("click", () => {
      document.getElementById("shopStubModal").classList.remove("active");
    });
    document.getElementById("missionStubCloseBtn").addEventListener("click", () => {
      document.getElementById("missionStubModal").classList.remove("active");
    });

    // ---- 編成・強化画面：ソート ----
    let formationSortMode = "rank"; // rank | acquired | deck
    function sortedOwnedCards() {
      const list = ownedCardList();
      if (formationSortMode === "acquired") {
        const order = playerState.acquiredOrder;
        return list.slice().sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
      }
      if (formationSortMode === "deck") {
        return list.slice().sort((a, b) => LIBRARY_INDEX.get(a.id) - LIBRARY_INDEX.get(b.id));
      }
      // rank（☆順）：レア度が高い順、同レア度内は図鑑順
      return list.slice().sort((a, b) => {
        if (b.rarity !== a.rarity) return b.rarity - a.rarity;
        return LIBRARY_INDEX.get(a.id) - LIBRARY_INDEX.get(b.id);
      });
    }
    document.querySelectorAll('.formation-toolbar .filter-chip').forEach(chip => {
      if (chip.dataset.sort === formationSortMode) chip.classList.add("active");
      chip.addEventListener("click", () => {
        document.querySelectorAll('.formation-toolbar .filter-chip').forEach(c => c.classList.remove("active"));
        chip.classList.add("active");
        formationSortMode = chip.dataset.sort;
        renderOwnedCardGrid();
      });
    });
    document.getElementById("formationResetBtn").addEventListener("click", () => {
      playerState.formationDeck = [];
      renderOwnedCardGrid();
    });
    document.getElementById("formationRandomBtn").addEventListener("click", () => {
      buildRandomFormationDeck();
      renderOwnedCardGrid();
    });

    // ---- 編成・強化画面 ----
    document.getElementById("formationBackBtn").addEventListener("click", () => showScreen("lobbyScreen"));

    function renderFormationSummary() {
      const count = playerState.formationDeck.length;
      document.getElementById("formationCount").textContent = count;
      const counts = deckCompositionCounts(playerState.formationDeck);
      const activeId = computeActiveDeckId(playerState.formationDeck);
      const activeEffect = DECK_EFFECTS[activeId || "none"];
      const breakdownHtml = NAMED_DECKS.map(deck => {
        const c = counts[deck.id];
        const isActive = deck.id === activeId;
        return `<span class="fs-chip${isActive ? " active" : ""}">${deck.name} ${c}/30</span>`;
      }).join("");
      const r1 = formationRarityCount(1);
      const r2 = formationRarityCount(2);
      const r3 = formationRarityCount(3);
      const rarityHtml = `
        <span class="fs-chip fs-rarity fs-rarity1">☆1 ${r1}</span>
        <span class="fs-chip fs-rarity fs-rarity2">☆2 ${r2}/${FORMATION_RARITY2_LIMIT}</span>
        <span class="fs-chip fs-rarity fs-rarity3">☆3 ${r3}/${FORMATION_RARITY3_LIMIT}</span>
      `;
      wrapEls.formationSummary.innerHTML = `
        <span class="fs-effect">発動中の効果：${activeEffect.label}</span>
        <span class="fs-breakdown fs-rarity-breakdown">${rarityHtml}</span>
        <span class="fs-breakdown">${breakdownHtml}</span>
      `;
    }

    function renderOwnedCardGrid() {
      renderFormationSummary();
      wrapEls.ownedCardGrid.innerHTML = "";
      sortedOwnedCards().forEach(card => {
        const inFormation = isInFormation(card.id);
        const cell = document.createElement("div");
        cell.className = `owned-card-cell${inFormation ? " in-formation" : ""}`;
        const cardEl = createCardEl({ ...card, elapsed: 0 }, { small: true, draggable: false });
        cell.appendChild(cardEl);
        const mark = document.createElement("div");
        mark.className = "card-select-mark";
        mark.textContent = "✓";
        cell.appendChild(mark);
        const lvBadge = document.createElement("div");
        lvBadge.className = "card-lv-badge";
        lvBadge.textContent = `Lv.${getCardLevel(card.id)} / ${CARD_MAX_LEVEL}`;
        cell.appendChild(lvBadge);
        const enhanceActionRow = document.createElement("div");
        enhanceActionRow.className = "enhance-action-row";
        const enhanceBtn = document.createElement("button");
        enhanceBtn.type = "button";
        enhanceBtn.className = "enhance-mini-btn";
        enhanceBtn.textContent = "強化";
        enhanceBtn.addEventListener("click", event => {
          event.stopPropagation();
          openEnhanceScreen(card.id);
        });
        enhanceActionRow.appendChild(enhanceBtn);
        const availableLimitBreaks = Math.min(
          getDupeCount(card.id),
          Math.max(0, LIMIT_BREAK_CAP - getLimitBreak(card.id))
        );
        if (availableLimitBreaks > 0) {
          const limitBreakBadge = document.createElement("span");
          limitBreakBadge.className = "limit-break-available";
          limitBreakBadge.textContent = `${availableLimitBreaks}↑`;
          limitBreakBadge.title = `字魂で${availableLimitBreaks}凸できます`;
          enhanceActionRow.appendChild(limitBreakBadge);
        }
        cell.appendChild(enhanceActionRow);
        cell.addEventListener("click", () => {
          const ok = toggleFormationCard(card.id);
          if (!ok) { window.alert(formationLimitMessage(card)); return; }
          renderOwnedCardGrid();
        });
        wrapEls.ownedCardGrid.appendChild(cell);
      });
      renderEquipmentGrid(); // カード群の下：装備品一覧＋現在の制限コスト
    }

    // ---- カード強化画面 ----
    let currentEnhanceCardId = null;
    function openEnhanceScreen(cardId) {
      currentEnhanceCardId = cardId;
      renderEnhanceScreen();
      showScreen("cardEnhanceScreen");
    }
    function renderEnhanceScreen() {
      const card = CARD_LIBRARY.find(c => c.id === currentEnhanceCardId);
      if (!card) return;
      const level = getCardLevel(card.id);
      document.getElementById("enhanceCardName").textContent = `『${card.name}』強化`;
      const visual = document.getElementById("enhanceCardVisual");
      visual.innerHTML = "";
      visual.appendChild(createCardEl({ ...card, elapsed: 0 }, { small: true, draggable: false }));
      document.getElementById("enhanceLevel").textContent = level;
      document.getElementById("enhanceCardDesc").textContent = card.text;
      document.getElementById("enhanceDupeCount").textContent = getDupeCount(card.id);
      document.getElementById("enhanceLimitBreakLevel").textContent = getLimitBreak(card.id);
      const dupeBtn = document.getElementById("enhanceDupeBtn");
      const dupeNote = document.getElementById("enhanceDupeNote");
      if (dupeBtn && dupeNote) {
        const lbLevel = getLimitBreak(card.id);
        const stock = getDupeCount(card.id);
        if (lbLevel >= LIMIT_BREAK_CAP) {
          dupeBtn.disabled = true;
          dupeBtn.textContent = "凸 MAX";
          dupeNote.textContent = "既に完凸（4凸）しています。";
        } else if (stock <= 0) {
          dupeBtn.disabled = true;
          dupeBtn.textContent = "凸する";
          dupeNote.textContent = "字魂がありません。同じカードがガチャで重複するともらえます。";
        } else {
          dupeBtn.disabled = false;
          dupeBtn.textContent = "凸する";
          dupeNote.textContent = `字魂を1個消費して${lbLevel + 1}凸します。`;
        }
      }
      const hpPerLevel = LEVEL_HP_BONUS_BY_RARITY[card.rarity] || 0;
      const milestoneBonus = MILESTONE_HP_BONUS_BY_RARITY[card.rarity] || 0;
      const currentHpBonus = levelHpBonusForCard(card, level);
      const inFormation = isInFormation(card.id);
      const hpNote = document.getElementById("enhanceHpNote");
      if (hpNote) {
        const milestoneNote = `（Lv10・Lv20到達時にさらに+${milestoneBonus}ずつ加算）`;
        hpNote.textContent = inFormation
          ? `現在のHPボーナス：+${currentHpBonus.toLocaleString()}（Lv1につき+${hpPerLevel}${milestoneNote}、編成中のため対戦に反映されます）`
          : `現在のHPボーナス：+${currentHpBonus.toLocaleString()}（Lv1につき+${hpPerLevel}${milestoneNote}、※編成に入っていないため対戦には反映されません）`;
      }
      const formationBtn = document.getElementById("enhanceFormationToggleBtn");
      if (formationBtn) {
        formationBtn.textContent = inFormation ? "編成から外す" : "編成に入れる";
      }
      const levelUpBtn = document.getElementById("enhanceLevelUpBtn");
      const expNote = document.getElementById("enhanceExpNote");
      const expFill = document.getElementById("enhanceExpBarFill");
      if (level >= CARD_MAX_LEVEL) {
        expNote.textContent = "最大レベルに到達しています。";
        expFill.style.width = "100%";
        levelUpBtn.disabled = true;
        levelUpBtn.textContent = "Lv.MAX";
      } else {
        const cost = expRequiredForLevel(card, level);
        expNote.textContent = `次のLvまで必要EXP：${cost.toLocaleString()}（所持EXP：${playerState.exp.toLocaleString()}）`;
        expFill.style.width = `${Math.min(100, Math.round((playerState.exp / cost) * 100))}%`;
        levelUpBtn.disabled = playerState.exp < cost;
        levelUpBtn.textContent = "EXPを消費してレベルアップ";
      }
      updateResBar();
    }
    document.getElementById("enhanceBackBtn").addEventListener("click", () => {
      renderOwnedCardGrid();
      showScreen("formationScreen");
    });
    document.getElementById("enhanceLevelUpBtn").addEventListener("click", () => {
      const card = CARD_LIBRARY.find(c => c.id === currentEnhanceCardId);
      if (!card) return;
      const level = getCardLevel(card.id);
      if (level >= CARD_MAX_LEVEL) return;
      const cost = expRequiredForLevel(card, level);
      if (playerState.exp < cost) return;
      const before = getClaimableMissionIds();
      playerState.exp -= cost;
      playerState.cardLevels[card.id] = level + 1;
      const after = getClaimableMissionIds();
      notifyNewMissionCompletions(before, after);
      renderEnhanceScreen();
    });
    document.getElementById("enhanceFormationToggleBtn").addEventListener("click", () => {
      const card = CARD_LIBRARY.find(c => c.id === currentEnhanceCardId);
      if (!card) return;
      const ok = toggleFormationCard(card.id);
      if (!ok) { window.alert(formationLimitMessage(card)); return; }
      renderEnhanceScreen();
    });
    document.getElementById("enhanceDupeBtn").addEventListener("click", () => {
      const card = CARD_LIBRARY.find(c => c.id === currentEnhanceCardId);
      if (!card) return;
      const lbLevel = getLimitBreak(card.id);
      const stock = getDupeCount(card.id);
      if (lbLevel >= LIMIT_BREAK_CAP || stock <= 0) return;
      playerState.dupeCounts[card.id] = stock - 1;
      playerState.limitBreak[card.id] = lbLevel + 1;
      log(`『${card.name}』を字魂を消費して${lbLevel + 1}凸した！`, "good");
      renderEnhanceScreen();
    });
    document.getElementById("enhanceProbBtn").addEventListener("click", () => {
      const card = CARD_LIBRARY.find(c => c.id === currentEnhanceCardId);
      if (!card) return;
      openLimitBreakModal(card);
    });
    document.getElementById("limitBreakCloseBtn").addEventListener("click", () => {
      closeLimitBreakModal();
    });
    function openLimitBreakModal(card) {
      const modal = document.getElementById("limitBreakModal");
      if (!modal) return;
      document.getElementById("limitBreakModalTitle").textContent = `『${card.name}』凸性能（☆${card.rarity}）`;
      const list = document.getElementById("limitBreakList");
      list.innerHTML = "";
      const labels = card.rarity === 3
        ? (STAR3_TIER_LABELS[card.id] || { 1: "（今後実装予定）", 2: "（今後実装予定）", 3: "HP+40", 4: "（今後実装予定）" })
        : LIMIT_BREAK_TIER_LABELS[card.rarity];
      const currentLevel = getLimitBreak(card.id);
      for (let tier = 1; tier <= LIMIT_BREAK_CAP; tier++) {
        const row = document.createElement("div");
        const achieved = currentLevel >= tier;
        row.className = `lb-tier-row ${achieved ? "achieved" : "locked"}`;
        row.innerHTML = `<div class="lb-tier-badge">${tier}凸</div><div class="lb-tier-desc">${labels[tier] || "（今後実装予定）"}</div>`;
        list.appendChild(row);
      }
      modal.classList.add("active");
      modal.style.display = "flex";
      modal.style.visibility = "visible";
      modal.style.opacity = "1";
    }
    function closeLimitBreakModal() {
      const modal = document.getElementById("limitBreakModal");
      if (!modal) return;
      modal.classList.remove("active");
      modal.style.display = "none";
    }

    // ============================================================
    // ガチャ画面
    // ============================================================
    const GACHA_COST_SINGLE = 120;
    const GACHA_COST_TEN = 1200;
    const GACHA_COST_SINGLE_EQUIP = 60;
    const GACHA_COST_TEN_EQUIP = 600;
    function gachaCostFor(bannerId, times) {
      const banners = getGachaBanners();
      const deck = banners.find(d => d.id === bannerId) || banners[0];
      if (deck.isEquipment) return times === 10 ? GACHA_COST_TEN_EQUIP : GACHA_COST_SINGLE_EQUIP;
      return times === 10 ? GACHA_COST_TEN : GACHA_COST_SINGLE;
    }
    const GACHA_DUPE_CAP = 4; // 字魂の上限（=完凸ライン）
    const GACHA_COUNTER_REQUIRED = 100; // 天井カード確定に必要な回数
    const GACHA_COUNTER_CAP = 1000; // 天井カウンターの上限
    const DUPE_SHARD_BY_RARITY = { 1: 2, 2: 5, 3: 25 };
    const GACHA_PROB_TABLE = [
      { key: "exp_mid",   label: "EXP 1000〜3000", chance: 28 },
      { key: "exp_high",  label: "EXP 10000",       chance: 8 },
      { key: "shard_low", label: "欠片 5〜20",       chance: 12 },
      { key: "shard_high",label: "欠片 50",          chance: 4 },
      { key: "card1",     label: "☆1カード",         chance: 24 },
      { key: "card2",     label: "☆2カード",         chance: 18 },
      { key: "card3",     label: "☆3カード",         chance: 6 },
    ];

    let currentGachaBannerId = "standard";
    let gachaHighlightCache = {};

    // スペシャルガチャ：ショップ交換専用カードを除く全カードが対象（限定カード含む）
    let _specialGachaCardIdsCache = null;
    function getShopCardIds() {
      const ids = new Set();
      Object.values(SHOP_ITEMS).forEach(list => list.forEach(item => { if (item.type === "card") ids.add(item.cardId); }));
      return ids;
    }
    function getSpecialGachaDeck() {
      if (!_specialGachaCardIdsCache) {
        const shopIds = getShopCardIds();
        _specialGachaCardIdsCache = CARD_LIBRARY.filter(c => !shopIds.has(c.id) && !c.noPull).map(c => c.id);
      }
      return {
        id: "special",
        name: "スペシャル",
        desc: "全てのカードが排出対象のビッグガチャ（ショップ交換専用カードを除く）。このガチャ限定のカードもあり、それらの排出率は少し高めに設定されている。",
        cards: _specialGachaCardIdsCache,
        isSpecial: true,
      };
    }
    function getGachaBanners() {
      return [...NAMED_DECKS, getSpecialGachaDeck(), getEquipGachaDeck(), getEquipGachaDeck2()];
    }
    // そのバナーの「ピックアップ表示された☆3カード」一覧（天井交換の対象もこれと同一）
    // バナー内のID→排出物（カード or 装備品）
    function gachaEntryById(deck, id) {
      return deck.isEquipment ? getEquipDef(id) : CARD_LIBRARY.find(c => c.id === id);
    }
    function createGachaEntryEl(entry) {
      return entry.isEquipment
        ? createEquipEl(entry, { small: true })
        : createCardEl({ ...entry, elapsed: 0 }, { small: true, draggable: false });
    }
    function getBannerPickupRarity3(deck) {
      if (deck.isEquipment) return deck.cards.map(getEquipDef).filter(e => e && e.rarity === 3);
      const pickupR3Ids = deck.isSpecial ? ["mikado", "kirameki", "katana", "gen"] : null;
      return pickupR3Ids
        ? pickupR3Ids.map(id => CARD_LIBRARY.find(c => c.id === id)).filter(Boolean)
        : deck.cards.map(id => CARD_LIBRARY.find(c => c.id === id)).filter(c => c && c.rarity === 3);
    }
    function getGachaCounter(bannerId) { return playerState.gachaCounters[bannerId] || 0; }

    function openGachaScreen() {
      // ロビーからガチャ画面に入るたび、各バナーの☆1〜2ピックアップ8枚を再抽選
      gachaHighlightCache = {};
      getGachaBanners().forEach(deck => {
        const r12Ids = deck.cards.filter(id => {
          const c = gachaEntryById(deck, id);
          return c && (c.rarity === 1 || c.rarity === 2);
        });
        gachaHighlightCache[deck.id] = shuffle(r12Ids).slice(0, 8);
      });
      renderGachaBannerList();
      renderGachaDetail();
      showScreen("gachaScreen");
    }

    function renderGachaBannerList() {
      const container = document.getElementById("gachaBannerList");
      container.innerHTML = "";
      getGachaBanners().forEach(deck => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = `gacha-banner-btn${deck.id === currentGachaBannerId ? " active" : ""}`;
        btn.textContent = deck.name;
        btn.addEventListener("click", () => {
          currentGachaBannerId = deck.id;
          renderGachaBannerList();
          renderGachaDetail();
        });
        container.appendChild(btn);
      });
    }

    function renderGachaDetail() {
      const banners = getGachaBanners();
      const deck = banners.find(d => d.id === currentGachaBannerId) || banners[0];
      document.getElementById("gachaBannerTitle").textContent = deck.name;

      const r3Grid = document.getElementById("gachaRarity3Grid");
      r3Grid.innerHTML = "";
      const r3Cards = getBannerPickupRarity3(deck);
      r3Cards.forEach(card => {
        const cell = document.createElement("div");
        cell.className = "gacha-card-cell";
        cell.appendChild(createGachaEntryEl(card));
        r3Grid.appendChild(cell);
      });

      const r2Grid = document.getElementById("gachaRarity2Grid");
      r2Grid.innerHTML = "";
      (gachaHighlightCache[deck.id] || [])
        .map(id => gachaEntryById(deck, id))
        .filter(Boolean)
        .forEach(card => {
          const cell = document.createElement("div");
          cell.className = "gacha-card-cell";
          cell.appendChild(createGachaEntryEl(card));
          r2Grid.appendChild(cell);
        });

      document.getElementById("gachaPull1Btn").textContent = `💎 ${gachaCostFor(deck.id, 1)}で1回引く`;
      document.getElementById("gachaPull10Btn").textContent = `💎 ${gachaCostFor(deck.id, 10)}で10回引く`;

      const counterVal = getGachaCounter(deck.id);
      document.getElementById("gachaCounterValue").textContent = counterVal;
      document.getElementById("gachaCounterClaimBtn").disabled = counterVal < GACHA_COUNTER_REQUIRED;
      document.getElementById("gachaCounterClaimBtn").textContent = deck.isEquipment ? "☆3装備確定" : "☆3カード確定";

      updateResBar();
    }

    document.getElementById("gachaBackBtn").addEventListener("click", () => showScreen("lobbyScreen"));

    function resolveCardPullFromPool(pool, weighted) {
      const card = weighted ? weightedPick(pool) : pool[Math.floor(Math.random() * pool.length)];
      const owned = playerState.ownedCardIds.has(card.id);
      if (!owned) {
        grantCard(card.id);
        return { kind: "card-new", card, label: `『${card.name}』（☆${card.rarity}）を入手！` };
      }
      const dupe = getDupeCount(card.id);
      const totalProgress = getLimitBreak(card.id) + dupe;
      if (totalProgress < GACHA_DUPE_CAP) {
        playerState.dupeCounts[card.id] = dupe + 1;
        const shard = DUPE_SHARD_BY_RARITY[card.rarity] || 0;
        playerState.shards += shard;
        return { kind: "card-dupe", card, shardGained: shard, label: `『${card.name}』の字魂+1、欠片+${shard}獲得（重複）` };
      }
      const shard = (DUPE_SHARD_BY_RARITY[card.rarity] || 0) * 2;
      playerState.shards += shard;
      return { kind: "card-max", card, shardGained: shard, label: `『${card.name}』は字魂が上限のため、欠片+${shard}獲得` };
    }

    // 重み付き抽選：スペシャルガチャでは限定カード(gachaExclusive)の排出率を少し高める
    function weightedPick(pool) {
      const weights = pool.map(c => c.gachaExclusive ? 1.6 : 1);
      const total = weights.reduce((s, w) => s + w, 0);
      let r = Math.random() * total;
      for (let i = 0; i < pool.length; i++) {
        r -= weights[i];
        if (r <= 0) return pool[i];
      }
      return pool[pool.length - 1];
    }

    // 装備品の排出：未所持ならLv1で入手／所持済みならLv＋1（重複分・最大＋20）／上限超過は欠片に変換
    // ※演出まわりは既存のカード用処理を流用するため kind は card-new / card-dupe / card-max を使う（equip:true で区別）
    function resolveEquipPullFromPool(pool) {
      const def = pool[Math.floor(Math.random() * pool.length)];
      const outcome = grantEquipment(def.id);
      if (outcome === "new") {
        return { kind: "card-new", equip: true, card: def, label: `『${def.name}』（☆${def.rarity}）を入手！` };
      }
      if (outcome === "dupe") {
        const info = playerState.equipOwned[def.id];
        return { kind: "card-dupe", equip: true, card: def, shardGained: 0, badgeText: `Lv＋1（重複＋${info.dupe}）`,
                 label: `『${def.name}』の重複Lv＋1（＋${info.dupe}/${EQUIP_DUPE_CAP}）` };
      }
      const shard = (DUPE_SHARD_BY_RARITY[def.rarity] || 0) * 2;
      playerState.shards += shard;
      return { kind: "card-max", equip: true, card: def, shardGained: shard, badgeText: `欠片+${shard}`,
               label: `『${def.name}』は重複Lvが上限のため、欠片+${shard}獲得` };
    }
    function resolveCardPull(deck, rarity) {
      if (deck.isEquipment) return resolveEquipPullFromPool(deck.cards.map(getEquipDef).filter(e => e && e.rarity === rarity));
      let pool = deck.cards.map(id => CARD_LIBRARY.find(c => c.id === id)).filter(c => c && c.rarity === rarity);
      if (pool.length === 0) pool = CARD_LIBRARY.filter(c => c.rarity === rarity && !c.noPull);
      if (deck.isSpecial) return resolveCardPullFromPool(pool, true);
      return resolveCardPullFromPool(pool);
    }

    function resolveGachaOutcome(key, deck) {
      switch (key) {
        case "exp_mid": {
          const amount = Math.floor(Math.random() * 21) * 100 + 1000; // 1000〜3000（100刻み）
          playerState.exp += amount;
          return { kind: "exp", amount, label: `EXP +${amount.toLocaleString()}` };
        }
        case "exp_high": {
          playerState.exp += 10000;
          return { kind: "exp", amount: 10000, label: `EXP +10,000` };
        }
        case "shard_low": {
          const amount = Math.floor(Math.random() * 16) + 5; // 5〜20
          playerState.shards += amount;
          return { kind: "shard", amount, label: `欠片 +${amount}` };
        }
        case "shard_high": {
          playerState.shards += 50;
          return { kind: "shard", amount: 50, label: `欠片 +50` };
        }
        case "card1": return resolveCardPull(deck, 1);
        case "card2": return resolveCardPull(deck, 2);
        case "card3": return resolveCardPull(deck, 3);
        default: return resolveCardPull(deck, 1);
      }
    }

    function rollGachaOnce(bannerId) {
      const banners = getGachaBanners();
      const deck = banners.find(d => d.id === bannerId) || banners[0];
      const r = Math.random() * 100;
      let acc = 0;
      for (const row of GACHA_PROB_TABLE) {
        acc += row.chance;
        if (r < acc) return resolveGachaOutcome(row.key, deck);
      }
      return resolveGachaOutcome("card1", deck);
    }

    function doGachaPull(times) {
      const cost = gachaCostFor(currentGachaBannerId, times);
      if (playerState.stone < cost) {
        window.alert(`石が足りません（必要：${cost}／所持：${playerState.stone}）`);
        return;
      }
      playerState.stone -= cost;
      const before = getClaimableMissionIds();
      const results = [];
      for (let i = 0; i < times; i++) results.push(rollGachaOnce(currentGachaBannerId));
      playerState.missionProgress.gachaPullTotal += times;
      playerState.gachaCounters[currentGachaBannerId] = Math.min(GACHA_COUNTER_CAP, getGachaCounter(currentGachaBannerId) + times);
      const after = getClaimableMissionIds();
      notifyNewMissionCompletions(before, after);
      updateResBar();
      renderGachaDetail();
      startGachaPullAnimation(results);
    }
    document.getElementById("gachaPull1Btn").addEventListener("click", () => doGachaPull(1));
    document.getElementById("gachaPull10Btn").addEventListener("click", () => doGachaPull(10));

    // 天井カウンター：100貯まると、そのバナーのピックアップ☆3から1枚確定入手
    function claimGachaCounter() {
      const banners = getGachaBanners();
      const deck = banners.find(d => d.id === currentGachaBannerId) || banners[0];
      if (getGachaCounter(deck.id) < GACHA_COUNTER_REQUIRED) return;
      const pool = getBannerPickupRarity3(deck);
      if (pool.length === 0) return;
      const card = pool[Math.floor(Math.random() * pool.length)];
      const result = deck.isEquipment ? resolveEquipPullFromPool([card]) : resolveCardPullFromPool([card], false);
      playerState.gachaCounters[deck.id] = getGachaCounter(deck.id) - GACHA_COUNTER_REQUIRED;
      updateResBar();
      renderGachaDetail();
      startGachaPullAnimation([result]);
    }
    document.getElementById("gachaCounterClaimBtn").addEventListener("click", () => claimGachaCounter());

    // ---- ガチャ排出演出（ブルーアーカイブ風カードめくり） ----
    let gachaPullTimers = [];
    let currentPullResults = [];
    const GACHA_REVEAL_START_DELAY = 500;
    const GACHA_REVEAL_STAGGER = 380;
    const GACHA_DUPE_BADGE_DELAY = 450;

    function buildGachaFrontContent(result) {
      if (result.kind.startsWith("card")) {
        const wrap = document.createElement("div");
        wrap.appendChild(createGachaEntryEl(result.card));
        return wrap;
      }
      const wrap = document.createElement("div");
      wrap.className = "gacha-pull-currency-face";
      wrap.textContent = result.label;
      return wrap;
    }

    function revealGachaCard(index, cells) {
      const result = currentPullResults[index];
      const cell = cells[index];
      if (!cell || cell.classList.contains("flipped")) return;
      cell.classList.add("flipped");
      const front = cell.querySelector(".gacha-pull-card-front");
      front.innerHTML = "";
      front.appendChild(buildGachaFrontContent(result));
      if (result.kind === "card-dupe" || result.kind === "card-max") {
        const badgeTimer = setTimeout(() => {
          const badge = document.createElement("div");
          badge.className = "gacha-dupe-badge";
          badge.textContent = result.badgeText || (result.kind === "card-dupe"
            ? `字魂+1 欠片+${result.shardGained}`
            : `欠片+${result.shardGained}`);
          front.appendChild(badge);
          requestAnimationFrame(() => badge.classList.add("show"));
        }, GACHA_DUPE_BADGE_DELAY);
        gachaPullTimers.push(badgeTimer);
      }
    }

    function startGachaPullAnimation(results) {
      currentPullResults = results;
      const overlay = document.getElementById("gachaPullAnimScreen");
      const grid = document.getElementById("gachaPullAnimGrid");
      const skipBtn = document.getElementById("gachaPullAnimSkipBtn");
      const closeBtn = document.getElementById("gachaPullAnimCloseBtn");
      grid.innerHTML = "";
      results.forEach(result => {
        const rarityClass = result.kind.startsWith("card") ? `r${result.card.rarity}` : "currency";
        const cell = document.createElement("div");
        cell.className = "gacha-pull-card";
        cell.innerHTML = `
          <div class="gacha-pull-card-inner">
            <div class="gacha-pull-card-back ${rarityClass}"></div>
            <div class="gacha-pull-card-front"></div>
          </div>
        `;
        grid.appendChild(cell);
      });
      closeBtn.disabled = true;
      skipBtn.disabled = false;
      overlay.classList.add("active");

      gachaPullTimers.forEach(t => clearTimeout(t));
      gachaPullTimers = [];
      const cells = () => Array.from(grid.querySelectorAll(".gacha-pull-card"));
      results.forEach((result, i) => {
        const t = setTimeout(() => revealGachaCard(i, cells()), GACHA_REVEAL_START_DELAY + i * GACHA_REVEAL_STAGGER);
        gachaPullTimers.push(t);
      });
      const finishDelay = GACHA_REVEAL_START_DELAY + results.length * GACHA_REVEAL_STAGGER + 400;
      const finishTimer = setTimeout(() => {
        closeBtn.disabled = false;
        skipBtn.disabled = true;
      }, finishDelay);
      gachaPullTimers.push(finishTimer);
    }

    document.getElementById("gachaPullAnimSkipBtn").addEventListener("click", () => {
      gachaPullTimers.forEach(t => clearTimeout(t));
      gachaPullTimers = [];
      const grid = document.getElementById("gachaPullAnimGrid");
      const cells = Array.from(grid.querySelectorAll(".gacha-pull-card"));
      currentPullResults.forEach((result, i) => {
        cells[i].classList.add("flipped");
        const front = cells[i].querySelector(".gacha-pull-card-front");
        front.innerHTML = "";
        front.appendChild(buildGachaFrontContent(result));
        if (result.kind === "card-dupe" || result.kind === "card-max") {
          const badge = document.createElement("div");
          badge.className = "gacha-dupe-badge show";
          badge.textContent = result.badgeText || (result.kind === "card-dupe"
            ? `字魂+1 欠片+${result.shardGained}`
            : `欠片+${result.shardGained}`);
          front.appendChild(badge);
        }
      });
      document.getElementById("gachaPullAnimCloseBtn").disabled = false;
      document.getElementById("gachaPullAnimSkipBtn").disabled = true;
    });
    document.getElementById("gachaPullAnimCloseBtn").addEventListener("click", () => {
      if (document.getElementById("gachaPullAnimCloseBtn").disabled) return;
      gachaPullTimers.forEach(t => clearTimeout(t));
      gachaPullTimers = [];
      document.getElementById("gachaPullAnimScreen").classList.remove("active");
    });

    function openGachaProbModal() {
      const modal = document.getElementById("gachaProbModal");
      if (!modal) return;
      modal.classList.add("active");
      modal.style.display = "flex";
      modal.style.visibility = "visible";
      modal.style.opacity = "1";
    }

    function closeGachaProbModal() {
      const modal = document.getElementById("gachaProbModal");
      if (!modal) return;
      modal.classList.remove("active");
      modal.style.display = "none";
    }

    document.getElementById("gachaProbBtn").addEventListener("click", () => {
      const list = document.getElementById("gachaProbList");
      list.innerHTML = "";
      const banners = getGachaBanners();
      const deck = banners.find(d => d.id === currentGachaBannerId) || banners[0];

      const catTitle = document.createElement("div");
      catTitle.className = "gacha-prob-section-title";
      catTitle.textContent = "排出カテゴリ";
      list.appendChild(catTitle);
      GACHA_PROB_TABLE.forEach(row => {
        const el = document.createElement("div");
        el.className = "gp-row";
        el.innerHTML = `<span>${row.label}</span><span>${row.chance}%</span>`;
        list.appendChild(el);
      });

      // バナー内カード個別確率（カテゴリ％ ÷ 対象プール枚数）。
      // スペシャルは表示を要約：☆1/☆2はまとめ、☆3は限定カードを個別、残りをまとめる。
      [1, 2, 3].forEach(rarity => {
        const catRow = GACHA_PROB_TABLE.find(r => r.key === `card${rarity}`);
        if (!catRow) return;
        let pool = deck.cards.map(id => gachaEntryById(deck, id)).filter(c => c && c.rarity === rarity);
        if (pool.length === 0 && !deck.isEquipment) pool = CARD_LIBRARY.filter(c => c.rarity === rarity && !c.noPull);
        if (pool.length === 0) return;

        const secTitle = document.createElement("div");
        secTitle.className = "gacha-prob-section-title";
        secTitle.textContent = `☆${rarity}${deck.isEquipment ? "装備品" : "カード"}内訳（${deck.name}／全${pool.length}種）`;
        list.appendChild(secTitle);

        const weights = pool.map(c => (deck.isSpecial && c.gachaExclusive) ? 1.6 : 1);
        const totalWeight = weights.reduce((s, w) => s + w, 0);

        if (deck.isSpecial && (rarity === 1 || rarity === 2)) {
          // まとめ表示：各カードあたりの目安確率を表示（均等割りの平均）
          const perCard = catRow.chance / pool.length;
          const el = document.createElement("div");
          el.className = "gp-row";
          el.innerHTML = `<span>各☆${rarity}カード（スペシャル／全${pool.length}種）</span><span>${perCard.toFixed(3)}% each</span>`;
          list.appendChild(el);
        } else if (deck.isSpecial && rarity === 3) {
          // ☆3は限定カードを個別、その他をまとめる
          const limited = pool.filter(c => c.gachaExclusive);
          const limitedIndices = limited.map(c => pool.indexOf(c)).filter(i => i >= 0);
          // 個別（限定）
          limitedIndices.forEach(i => {
            const card = pool[i];
            const perCard = catRow.chance * (weights[i] / totalWeight);
            const el = document.createElement("div");
            el.className = "gp-row";
            el.innerHTML = `<span>『${card.name}』（限定）</span><span>${perCard.toFixed(3)}%</span>`;
            list.appendChild(el);
          });
          // その他☆3をまとめる
          const otherWeightSum = pool.reduce((s, c, idx) => (!c.gachaExclusive ? s + weights[idx] : s), 0);
          const otherCount = pool.filter(c => !c.gachaExclusive).length;
          if (otherCount > 0) {
            const otherPercent = catRow.chance * (otherWeightSum / totalWeight);
            const el = document.createElement("div");
            el.className = "gp-row";
            el.innerHTML = `<span>その他☆3カード（${otherCount}種）</span><span>${otherPercent.toFixed(3)}%</span>`;
            list.appendChild(el);
          }
        } else {
          // 通常表示
          pool.forEach((card, i) => {
            const perCard = catRow.chance * (weights[i] / totalWeight);
            const el = document.createElement("div");
            el.className = "gp-row";
            el.innerHTML = `<span>『${card.name}』${card.gachaExclusive ? "（限定）" : ""}</span><span>${perCard.toFixed(3)}%</span>`;
            list.appendChild(el);
          });
        }
      });

      const note = document.createElement("div");
      note.style.marginTop = "10px";
      note.style.fontSize = "12px";
      note.style.color = "var(--muted)";
      note.textContent = deck.isEquipment
        ? "※装備品は「装備品1」シリーズ全20種から均等抽選。既に所持している装備品が出ると、その装備品のLvが＋1されます（強化Lvとは別枠・最大＋20。以降は欠片に変換）。"
        : deck.isSpecial
        ? "※スペシャルガチャは全カードが対象（ショップ交換専用カードを除く）。「（限定）」表記のカードはこのガチャ限定で、排出率が少し高めに設定されています。既に所持しているカードが出た場合は字魂（最大4個・以降は欠片が倍）に変換されます。"
        : "※カードは選択中バナーのデッキ内から均等抽選。既に所持しているカードが出た場合は字魂（最大4個・以降は欠片が倍）に変換されます。";
      list.appendChild(note);
      openGachaProbModal();
    });
    document.getElementById("gachaProbCloseBtn").addEventListener("click", () => {
      closeGachaProbModal();
    });

    // ============================================================
    // ショップ画面
    // ============================================================
    const SHOP_CURRENCY_LABEL = { exp: "経験値", stone: "石", shards: "欠片" };
    const SHOP_CURRENCY_ICON  = { exp: "✨", stone: "💎", shards: "🧩" };
    const SHOP_MAX_CARD_COPIES = 1 + GACHA_DUPE_CAP; // 初期入手1 + 凸4 = 5

    const SHOP_TABS = [
      { id: "exp",   label: "経験値交換" },
      { id: "stone", label: "石交換" },
      { id: "shard", label: "欠片交換" },
    ];

    const SHOP_ITEMS = {
      exp: [
        { key: "exp_nami",    type: "card", cardId: "nami",    cost: { exp: 30000 },  limit: 5 },
        { key: "exp_kobushi", type: "card", cardId: "kobushi", cost: { exp: 30000 },  limit: 5 },
        { key: "exp_kage",    type: "card", cardId: "kage",    cost: { exp: 80000 },  limit: 5 },
        { key: "exp_kin2",    type: "card", cardId: "kin2",    cost: { exp: 80000 },  limit: 5 },
        { key: "exp_rin",     type: "card", cardId: "rin",     cost: { exp: 120000 }, limit: 5 },
        { key: "exp_ja2",     type: "card", cardId: "ja2",     cost: { exp: 80000 },  limit: 4, requiresOwned: "ja2" },
        { key: "exp_you3",    type: "card", cardId: "you3",    cost: { exp: 80000 },  limit: 4, requiresOwned: "you3" },
        { key: "exp_yoru",    type: "card", cardId: "yoru",    cost: { exp: 80000 },  limit: 4, requiresOwned: "yoru" },
        { key: "exp_ryu2",    type: "card", cardId: "ryu2",    cost: { exp: 120000 }, limit: 4, requiresOwned: "ryu2" },
        { key: "exp_nou2",    type: "card", cardId: "nou2",    cost: { exp: 120000 }, limit: 4, requiresOwned: "nou2" },
        { key: "exp_kyou",    type: "card", cardId: "kyou",    cost: { exp: 80000 }, limit: 4, requiresOwned: "kyou" },
        { key: "exp_shitsu",  type: "card", cardId: "shitsu",  cost: { exp: 120000 }, limit: 4, requiresOwned: "shitsu" },
        { key: "exp_gekoku",  type: "card", cardId: "gekoku",  cost: { exp: 120000 }, limit: 4, requiresOwned: "gekoku" },
      ],
      stone: [
        { key: "stone_exp", type: "currency", cost: { stone: 1200 }, give: { exp: 50000 }, limit: null },
        { key: "stone_katsu", type: "card", cardId: "katsu", cost: { stone: 600 }, limit: 5 },
        { key: "stone_kagayaki2", type: "card", cardId: "kagayaki2", cost: { stone: 1800 }, limit: 5 },
      ],
      shard: [
        { key: "shard_stone20", type: "currency", cost: { shards: 20 }, give: { stone: 120 },  limit: null },
        { key: "shard_stone10", type: "currency", cost: { shards: 10 }, give: { stone: 120 },  limit: 10 },
        { key: "shard_stone5",  type: "currency", cost: { shards: 5 },  give: { stone: 120 },  limit: 10 },
        { key: "shard_exp2000", type: "currency", cost: { shards: 1 },  give: { exp: 2000 },   limit: null },
        { key: "shard_exp10000",type: "currency", cost: { shards: 40 }, give: { exp: 10000 },  limit: 2 },
        { key: "shard_taki",   type: "card", cardId: "taki",   cost: { shards: 30 },  limit: 5 },
        { key: "shard_nagi",   type: "card", cardId: "nagi",   cost: { shards: 30 },  limit: 5 },
        { key: "shard_mei",    type: "card", cardId: "mei",    cost: { shards: 70 },  limit: 5 },
        { key: "shard_sakura", type: "card", cardId: "sakura", cost: { shards: 70 },  limit: 5 },
        { key: "shard_tai2",   type: "card", cardId: "tai2",   cost: { shards: 120 }, limit: 5 },
        { key: "shard_arai",     type: "card", cardId: "arai",     cost: { shards: 30 },  limit: 5 },
        { key: "shard_sou4",     type: "card", cardId: "sou4",     cost: { shards: 70 },  limit: 5 },
        { key: "shard_sawa",     type: "card", cardId: "sawa",     cost: { shards: 70 },  limit: 5 },
        { key: "shard_geki",     type: "card", cardId: "geki",     cost: { shards: 120 }, limit: 5 },
        { key: "shard_akatsuki", type: "card", cardId: "akatsuki", cost: { shards: 120 }, limit: 5 },
        { key: "shard_equip_sunglasses", type: "equip", equipId: "sunglasses", cost: { shards: 20 },  limit: 21 },
        { key: "shard_equip_bomb",       type: "equip", equipId: "bomb",       cost: { shards: 50 },  limit: 21 },
        { key: "shard_equip_funbox",     type: "equip", equipId: "funbox",     cost: { shards: 50 },  limit: 21 },
        { key: "shard_equip_fan",        type: "equip", equipId: "fan",        cost: { shards: 100 }, limit: 21 },
        { key: "shard_equip_ring",       type: "equip", equipId: "ring",       cost: { shards: 100 }, limit: 21 },        
      ],
    };

    let currentShopTabId = "exp";

    function shopCardCurrentCopies(cardId) {
      return (playerState.ownedCardIds.has(cardId) ? 1 : 0) + getDupeCount(cardId);
    }
    function shopAcquireCardOnce(cardId) {
      if (!playerState.ownedCardIds.has(cardId)) { grantCard(cardId); return true; }
      const dupe = getDupeCount(cardId);
      if (dupe < GACHA_DUPE_CAP) { playerState.dupeCounts[cardId] = dupe + 1; return true; }
      return false;
    }
    function shopRemainingLimit(item) {
      if (item.limit == null) return Infinity;
      const bought = playerState.shopPurchaseCounts[item.key] || 0;
      return Math.max(0, item.limit - bought);
    }
    function shopRemainingCopySlots(item) {
      if (item.type !== "card") return Infinity;
      return Math.max(0, SHOP_MAX_CARD_COPIES - shopCardCurrentCopies(item.cardId));
    }
    function shopMaxAffordableQty(item, desiredQty) {
      let qty = desiredQty;
      qty = Math.min(qty, shopRemainingLimit(item));
      qty = Math.min(qty, shopRemainingCopySlots(item));
      Object.entries(item.cost).forEach(([currencyKey, unitCost]) => {
        const have = playerState[currencyKey] || 0;
        qty = Math.min(qty, Math.floor(have / unitCost));
      });
      return Math.max(0, qty);
    }
    function shopCostLabel(item) {
      return Object.entries(item.cost)
        .map(([k, v]) => `${SHOP_CURRENCY_ICON[k]}${SHOP_CURRENCY_LABEL[k]}${v.toLocaleString()}`)
        .join(" + ");
    }
    function shopGiveLabel(item) {
      return Object.entries(item.give)
        .map(([k, v]) => `${SHOP_CURRENCY_ICON[k]}${SHOP_CURRENCY_LABEL[k]}+${v.toLocaleString()}`)
        .join(" ");
    }

    function openShopScreen() {
      renderShopTabs();
      renderShopItems(currentShopTabId);
      showScreen("shopScreen");
    }

    function renderShopTabs() {
      const container = document.getElementById("shopTabList");
      container.innerHTML = "";
      SHOP_TABS.forEach(tab => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = `shop-tab-btn${tab.id === currentShopTabId ? " active" : ""}`;
        btn.textContent = tab.label;
        btn.addEventListener("click", () => {
          currentShopTabId = tab.id;
          renderShopTabs();
          renderShopItems(currentShopTabId);
        });
        container.appendChild(btn);
      });
    }

    function renderShopItems(tabId) {
      const tab = SHOP_TABS.find(t => t.id === tabId) || SHOP_TABS[0];
      document.getElementById("shopTabTitle").textContent = tab.label;
      const grid = document.getElementById("shopItemGrid");
      grid.innerHTML = "";

      (SHOP_ITEMS[tabId] || []).forEach(item => {
        const locked = item.requiresOwned && !playerState.ownedCardIds.has(item.requiresOwned);
        const remainingLimit = shopRemainingLimit(item);
        const remainingCopy = shopRemainingCopySlots(item);
        const soldOut = !locked && (remainingLimit <= 0 || remainingCopy <= 0);

        const cell = document.createElement("div");
        cell.className = `shop-item-cell${(locked || soldOut) ? " sold-out" : ""}`;

        const visual = document.createElement("div");
        visual.className = "shop-item-visual";
        if (item.type === "card") {
          const card = CARD_LIBRARY.find(c => c.id === item.cardId);
          visual.appendChild(createCardEl({ ...card, elapsed: 0 }, { small: true, draggable: false }));
        } else if (item.type === "equip") {
          const info = playerState.equipOwned[item.equipId];
          visual.appendChild(createEquipEl(getEquipDef(item.equipId), { small: true, level: info && info.level, dupe: info && info.dupe }));
        } else {
          const icon = document.createElement("div");
          icon.className = "shop-item-currency-icon";
          const mainKey = Object.keys(item.give)[0];
          icon.textContent = SHOP_CURRENCY_ICON[mainKey] || "🎁";
          visual.appendChild(icon);
        }
        cell.appendChild(visual);

        const nameEl = document.createElement("div");
        nameEl.className = "shop-item-name";
        nameEl.textContent = item.type === "card"
          ? `『${CARD_LIBRARY.find(c => c.id === item.cardId).name}』`
          : item.type === "equip"
          ? `『${getEquipDef(item.equipId).name}』`
          : shopGiveLabel(item);
        cell.appendChild(nameEl);

        const costEl = document.createElement("div");
        costEl.className = "shop-item-cost";
        costEl.textContent = shopCostLabel(item);
        cell.appendChild(costEl);

        const limitEl = document.createElement("div");
        limitEl.className = "shop-item-limit";
        if (locked) {
          limitEl.textContent = "未入手（ミッションで入手後に購入可能）";
        } else if (item.type === "card") {
          limitEl.textContent = `所持${shopCardCurrentCopies(item.cardId)}/${SHOP_MAX_CARD_COPIES}（残り購入${item.limit == null ? "∞" : remainingLimit}）`;
        } else {
          limitEl.textContent = `購入可能：残り${item.limit == null ? "何度でも" : remainingLimit}`;
        }
        cell.appendChild(limitEl);

        if (!locked && !soldOut) {
          const qtyRow = document.createElement("div");
          qtyRow.className = "shop-item-qty-row";
          const minusBtn = document.createElement("button");
          minusBtn.type = "button";
          minusBtn.textContent = "－";
          const qtyInput = document.createElement("input");
          qtyInput.type = "number";
          qtyInput.min = "1";
          qtyInput.value = "1";
          const plusBtn = document.createElement("button");
          plusBtn.type = "button";
          plusBtn.textContent = "＋";
          const maxQty = Math.min(remainingLimit, remainingCopy, 999);
          minusBtn.addEventListener("click", () => {
            qtyInput.value = String(Math.max(1, parseInt(qtyInput.value || "1", 10) - 1));
          });
          plusBtn.addEventListener("click", () => {
            qtyInput.value = String(Math.min(maxQty, parseInt(qtyInput.value || "1", 10) + 1));
          });
          qtyInput.addEventListener("change", () => {
            let v = parseInt(qtyInput.value || "1", 10);
            if (!Number.isFinite(v) || v < 1) v = 1;
            if (v > maxQty) v = maxQty;
            qtyInput.value = String(v);
          });
          qtyRow.appendChild(minusBtn);
          qtyRow.appendChild(qtyInput);
          qtyRow.appendChild(plusBtn);
          cell.appendChild(qtyRow);

          const buyBtn = document.createElement("button");
          buyBtn.type = "button";
          buyBtn.className = "shop-item-buy-btn";
          buyBtn.textContent = "交換する";
          buyBtn.addEventListener("click", () => {
            const desired = Math.max(1, parseInt(qtyInput.value || "1", 10));
            buyShopItem(item, desired);
          });
          cell.appendChild(buyBtn);
        } else {
          const soldOutLabel = document.createElement("div");
          soldOutLabel.className = "shop-item-note";
          soldOutLabel.textContent = locked ? "" : "交換上限に達しました";
          cell.appendChild(soldOutLabel);
        }

        grid.appendChild(cell);
      });
    }

    function buyShopItem(item, desiredQty) {
      const qty = shopMaxAffordableQty(item, desiredQty);
      if (qty <= 0) {
        window.alert("購入できません（所持数または購入可能回数が不足しています）");
        return;
      }
      Object.entries(item.cost).forEach(([currencyKey, unitCost]) => {
        playerState[currencyKey] -= unitCost * qty;
      });
      playerState.shopPurchaseCounts[item.key] = (playerState.shopPurchaseCounts[item.key] || 0) + qty;
      if (item.type === "currency") {
        Object.entries(item.give).forEach(([currencyKey, unitGive]) => {
          playerState[currencyKey] = (playerState[currencyKey] || 0) + unitGive * qty;
        });
      } else if (item.type === "card") {
        for (let i = 0; i < qty; i++) shopAcquireCardOnce(item.cardId);
      } else if (item.type === "equip") {
        for (let i = 0; i < qty; i++) grantEquipment(item.equipId);
      }
      if (qty < desiredQty) {
        window.alert(`所持数・購入可能回数の都合で${qty}回分のみ交換しました。`);
      }
      updateResBar();
      renderShopItems(currentShopTabId);
    }

    document.getElementById("shopBackBtn").addEventListener("click", () => showScreen("lobbyScreen"));

    // ---- 図鑑画面 ----
    document.getElementById("codexBackBtn").addEventListener("click", () => showScreen("lobbyScreen"));
    const codexFilterState = { rarity: "all", types: new Set(), query: "" };
    // 図鑑に表示する全カード（通常カード＋各種効果でのみ場に呼ばれる「召喚カード」）
    const CODEX_ALL_CARDS = [...CARD_LIBRARY, ...Object.values(SPECIAL_CARDS)];
    function matchesCodexFilter(card) {
      if (codexFilterState.rarity !== "all" && String(card.rarity) !== codexFilterState.rarity) return false;
      if (codexFilterState.types.size > 0 && !codexFilterState.types.has(card.type)) return false;
      const q = codexFilterState.query.trim();
      if (q && !(card.name.includes(q) || (card.text || "").includes(q))) return false;
      return true;
    }
    wrapEls.codexFilters.querySelectorAll(".filter-chip").forEach(chip => {
      chip.addEventListener("click", () => {
        if (chip.dataset.rarity) {
          wrapEls.codexFilters.querySelectorAll(".filter-chip[data-rarity]").forEach(c => c.classList.remove("active"));
          chip.classList.add("active");
          codexFilterState.rarity = chip.dataset.rarity;
        } else if (chip.dataset.type) {
          const type = chip.dataset.type;
          if (codexFilterState.types.has(type)) {
            codexFilterState.types.delete(type);
            chip.classList.remove("active");
          } else {
            codexFilterState.types.add(type);
            chip.classList.add("active");
          }
        }
        renderCodexGrid();
      });
    });
    wrapEls.codexSearchInput.addEventListener("input", () => {
      codexFilterState.query = wrapEls.codexSearchInput.value;
      renderCodexGrid();
    });
    function belongsToNamedDeck(card) {
      return NAMED_DECKS.some(deck => deck.cards.includes(card.id));
    }
    function renderCodexGrid() {
      const summonOrder = Object.keys(SPECIAL_CARDS);
      const filtered = CODEX_ALL_CARDS.filter(matchesCodexFilter).slice().sort((a, b) => {
        const tierOf = c => c.summonOnly ? 2 : (belongsToNamedDeck(c) ? 0 : 1); // 通常 < その他デッキ < 召喚カード
        const aTier = tierOf(a), bTier = tierOf(b);
        if (aTier !== bTier) return aTier - bTier;
        if (aTier === 2) return summonOrder.indexOf(a.id) - summonOrder.indexOf(b.id);
        return LIBRARY_INDEX.get(a.id) - LIBRARY_INDEX.get(b.id);
      });
      // 装備品：レア度・検索は共通で絞り込み。メイン／サブの種別フィルタ中は非表示
      const equipFiltered = EQUIPMENT_LIBRARY.filter(e => {
        if (codexFilterState.types.size > 0) return false;
        if (codexFilterState.rarity !== "all" && String(e.rarity) !== codexFilterState.rarity) return false;
        const q = codexFilterState.query.trim();
        return !q || e.name.includes(q) || e.text.includes(q);
      });
      wrapEls.codexCounts.innerHTML = `<span>収録カード：<strong>${filtered.length}</strong> / ${CODEX_ALL_CARDS.length}</span><span>所持：${playerState.ownedCardIds.size}枚</span><span>装備品：<strong>${equipFiltered.length}</strong> / ${EQUIPMENT_LIBRARY.length}（所持${Object.keys(playerState.equipOwned).length}）</span>`;
      wrapEls.codexCardGrid.innerHTML = "";
      if (filtered.length === 0 && equipFiltered.length === 0) {
        wrapEls.codexCardGrid.innerHTML = `<div class="empty">条件に一致するカードがありません</div>`;
        return;
      }
      let summonHeaderShown = false;
      filtered.forEach(card => {
        if (card.summonOnly && !summonHeaderShown) {
          summonHeaderShown = true;
          const divider = document.createElement("div");
          divider.className = "codex-section-divider";
          divider.textContent = "召喚カード";
          wrapEls.codexCardGrid.appendChild(divider);
        }
        const owned = card.summonOnly ? true : playerState.ownedCardIds.has(card.id);
        const cell = document.createElement("div");
        cell.className = `codex-card-cell${owned ? "" : " locked"}`;
        const cardEl = createCardEl({ ...card, elapsed: 0 }, { small: true, draggable: false });
        cell.appendChild(cardEl);
        if (!owned) {
          const label = document.createElement("div");
          label.className = "locked-label";
          label.textContent = "未所持";
          cell.appendChild(label);
        }
        wrapEls.codexCardGrid.appendChild(cell);
      });
      // 召喚カードのさらに下：装備品
      if (equipFiltered.length > 0) {
        const divider = document.createElement("div");
        divider.className = "codex-section-divider";
        divider.textContent = "装備品";
        wrapEls.codexCardGrid.appendChild(divider);
        equipFiltered.forEach(def => {
          const info = playerState.equipOwned[def.id];
          const cell = document.createElement("div");
          cell.className = `codex-card-cell${info ? "" : " locked"}`;
          cell.appendChild(createEquipEl(def, { small: true, level: info && info.level, dupe: info && info.dupe }));
          const nameEl = document.createElement("div");
          nameEl.className = "equip-cell-name";
          nameEl.textContent = def.name;
          cell.appendChild(nameEl);
          if (!info) {
            const label = document.createElement("div");
            label.className = "locked-label";
            label.textContent = "未所持";
            cell.appendChild(label);
          }
          wrapEls.codexCardGrid.appendChild(cell);
        });
      }
    }

    // ---- カード詳細モーダル（図鑑クリック） ----
    function openCardDetail(card, owned) {
      wrapEls.cardDetailTitle.textContent = `『${card.name}』 ${"☆".repeat(card.rarity)}`;
      const ownedNote = owned ? "" : `<div class="cd-type" style="color:var(--danger);">未所持のカードです</div>`;
      wrapEls.cardDetailBody.innerHTML = `
        <div class="cd-type">${card.type === "main" ? "メインカード" : "サブカード"}</div>
        ${ownedNote}
        <div>${card.text}</div>
      `;
      wrapEls.cardDetailModal.classList.add("active");
    }
    document.getElementById("cardDetailCloseBtn").addEventListener("click", () => {
      wrapEls.cardDetailModal.classList.remove("active");
    });

    // ---- 対戦画面からロビーへ戻る ----
    document.getElementById("backToLobbyBtn").addEventListener("click", () => {
      showScreen("lobbyScreen");
    });

    // ---- リザルト画面 ----
    function recordBattleResultForMissions(victory) {
      const mp = playerState.missionProgress;
      mp.battleCompleted += 1;
      if (victory) {
        mp.battleWinTotal += 1;
        if (game.player.deckId === "none" || !game.player.deckId) mp.noDeckEffectWin = true;
        if (game.player.hp >= 10000) mp.hpDiff10000Win = true;
        if ((game.stats.subUsedCount || 0) === 0) mp.noSubWin = true;
        // 試練：特定のAI編成デッキに勝利した場合の進捗記録（selectedDeckIds.aiは選択した元のデッキIDを保持）
        const strong4 = aiDeckConfig.levelMode === "strong" && aiDeckConfig.limitBreakLevel === 4;
        if (selectedDeckIds.ai === "trial_ouja") {
          mp.trialOujaWin = true;
          if (strong4) mp.trialOujaWinStrong4 = true;
        } else if (selectedDeckIds.ai === "trial_shippu") {
          mp.trialShippuWin = true;
          if (strong4) mp.trialShippuWinStrong4 = true;
        } else if (selectedDeckIds.ai === "trial_gekokujou") {
          mp.trialGekokujouWin = true;
          if (strong4) mp.trialGekokujouWinStrong4 = true;
        }
      }
      if ((game.stats.hits10kCount || 0) >= 1) mp.dealt10kOnce = true;
      if ((game.stats.hits10kCount || 0) >= 2) mp.dealt10kTwiceInBattle = true;
      if (game.stats.subFieldFull) mp.subFieldFull = true;
      if ((game.stats.graveResetCount || 0) >= 3) mp.graveReset3InBattle = true;
    }

    function showResultScreen() {
      if (!game) return;
      const victory = game.ai.hp <= 0;
      const baseExp = victory ? 10000 : 5000;
      // 装備品：基礎EXPに固定値ボーナス（ダイヤの指輪など）を加えた後、獲得経験値％を適用する
      const equipExpPct = equipExpBonusPercent(game.player.equip);
      const equipExpFlat = equipExpFlatBonus(game.player.equip);
      const exp = Math.round((baseExp + equipExpFlat) * (1 + equipExpPct / 100));
      const turns = (game.stats && game.stats.turn) || 1;
      const maxDamage = (game.stats && game.stats.maxDamage) || 0;
      playerState.exp += exp;
      const before = getClaimableMissionIds();
      recordBattleResultForMissions(victory);
      const after = getClaimableMissionIds();
      notifyNewMissionCompletions(before, after);
      updateResBar();
      wrapEls.resultTitle.textContent = victory ? "勝利！" : "敗北…";
      wrapEls.resultSub.textContent = "";
      const expNoteParts = [];
      if (equipExpPct > 0) expNoteParts.push(`+${equipExpPct}%`);
      if (equipExpFlat > 0) expNoteParts.push(`+${equipExpFlat.toLocaleString()}`);
      wrapEls.resultExp.textContent = expNoteParts.length > 0
        ? `${exp.toLocaleString()}（装備${expNoteParts.join("・")}）`
        : exp.toLocaleString();
      wrapEls.resultTurns.textContent = `${turns}`;
      wrapEls.resultMaxDamage.textContent = maxDamage.toLocaleString();
      showScreen("resultScreen");
    }
    document.getElementById("resultLobbyBtn").addEventListener("click", () => {
      showScreen("lobbyScreen");
    });
    document.getElementById("resultRetryBtn").addEventListener("click", () => {
      showScreen("gameScreen");
      openDeckSelect();
    });

    // 勝敗バナーをクリックしたらリザルト画面へ
    els.winner.addEventListener("click", () => {
      els.winner.classList.remove("active");
      showResultScreen();
    }, { capture: true });

    // ============================================================
    // デバッグコマンド（ロビーで「@」キーを押すとコマンドバーが開く）
    // 元ネタ：Lobotomy Corporation baseMOD のチートコマンド
    // ============================================================
    function isDebugBarOpen() { return wrapEls.debugCommandBar.classList.contains("active"); }
    function openDebugBar() {
      wrapEls.debugCommandBar.classList.add("active");
      wrapEls.debugCommandInput.value = "";
      wrapEls.debugCommandLog.textContent = "";
      wrapEls.debugCommandInput.focus();
    }
    function closeDebugBar() {
      wrapEls.debugCommandBar.classList.remove("active");
      wrapEls.debugCommandInput.blur();
    }
    function executeDebugCommand(raw) {
      const parts = raw.trim().split(/\s+/).filter(Boolean);
      if (parts.length === 0) return;
      const cmd = parts[0].toLowerCase();
      if (cmd === "/energy") {
        const amount = parseInt(parts[1], 10);
        if (!Number.isFinite(amount)) { wrapEls.debugCommandLog.textContent = "数値を指定してください。例：/energy 1000"; return; }
        playerState.exp += amount;
        wrapEls.debugCommandLog.textContent = `EXPを${amount.toLocaleString()}獲得した。`;
      } else if (cmd === "/gatya") {
        const amount = parseInt(parts[1], 10);
        if (!Number.isFinite(amount)) { wrapEls.debugCommandLog.textContent = "数値を指定してください。例：/gatya 1000"; return; }
        playerState.stone += amount;
        wrapEls.debugCommandLog.textContent = `石を${amount.toLocaleString()}獲得した。`;
      } else if (cmd === "/lvmax") {
        const ids = [...playerState.ownedCardIds];
        ids.forEach(id => { playerState.cardLevels[id] = CARD_MAX_LEVEL; });
        wrapEls.debugCommandLog.textContent = `所持カード${ids.length}枚のレベルをLv.${CARD_MAX_LEVEL}にしました。`;
      } else if (cmd === "/jikon") {
        const ids = [...playerState.ownedCardIds];
        ids.forEach(id => { playerState.limitBreak[id] = LIMIT_BREAK_CAP; });
        wrapEls.debugCommandLog.textContent = `所持カード${ids.length}枚の凸レベルを${LIMIT_BREAK_CAP}まで上げました。`;
      } else if (cmd === "/allcards") {
        CARD_LIBRARY.forEach(c => grantCard(c.id));
        wrapEls.debugCommandLog.textContent = `全${CARD_LIBRARY.length}種のカードを入手した。`;
      } else if (cmd === "/allequip") {
        EQUIPMENT_LIBRARY.forEach(e => { if (!playerState.equipOwned[e.id]) grantEquipment(e.id); });
        wrapEls.debugCommandLog.textContent = `全${EQUIPMENT_LIBRARY.length}種の装備品を入手した。`;
      } else if (cmd === "/equipmax") {
        Object.values(playerState.equipOwned).forEach(info => { info.level = EQUIP_MAX_LEVEL; info.dupe = EQUIP_DUPE_CAP; });
        wrapEls.debugCommandLog.textContent = `所持装備品のLvを${EQUIP_MAX_LEVEL}（重複＋${EQUIP_DUPE_CAP}）にしました。`;
      } else if (cmd === "/shard") {
        const amount = parseInt(parts[1], 10);
        if (!Number.isFinite(amount)) { wrapEls.debugCommandLog.textContent = "数値を指定してください。例：/shard 1000"; return; }
        playerState.shards += amount;
        wrapEls.debugCommandLog.textContent = `欠片を${amount.toLocaleString()}獲得した。`;
      } else {
        wrapEls.debugCommandLog.textContent = `不明なコマンドです：${parts[0]}`;
      }
      updateResBar();
    }
    wrapEls.debugCommandInput.addEventListener("keydown", event => {
      event.stopPropagation();
      if (event.key === "Enter") {
        executeDebugCommand(wrapEls.debugCommandInput.value);
        wrapEls.debugCommandInput.value = "";
      } else if (event.key === "Escape") {
        closeDebugBar();
      }
    });
    wrapEls.debugCommandBar.addEventListener("click", event => {
      if (event.target === wrapEls.debugCommandBar) closeDebugBar();
    });
    document.addEventListener("keydown", event => {
      if (event.key === "@" && !wrapEls.lobbyScreen.classList.contains("screen-hidden") && !isDebugBarOpen()) {
        event.preventDefault();
        openDebugBar();
      }
    });

    // ============================================================
    // ミッション画面
    // ============================================================
    function countCardsAtLevel(lv) {
      return Object.values(playerState.cardLevels).filter(v => v >= lv).length;
    }
    const MISSION_DEFS = [
      // ---- 対戦 ----
      { id: "battle_complete_1", category: "battle", title: "対戦を1回完了する", note: "（何回でも達成可能。その分報酬も貯まります）", repeatable: true, target: 1,
        reward: { type: "stone", value: 600 }, getCurrent: () => playerState.missionProgress.battleCompleted },
      { id: "battle_win_1", category: "battle", title: "対戦で1回勝利する", target: 1,
        reward: [{ type: "stone", value: 600 }, { type: "equip", equipId: "rock" }], getCurrent: () => playerState.missionProgress.battleWinTotal },
      { id: "battle_win_5", category: "battle", title: "対戦で合計5回勝利する", target: 5,
        reward: { type: "stone", value: 2400 }, getCurrent: () => playerState.missionProgress.battleWinTotal },
      { id: "battle_win_10", category: "battle", title: "対戦で合計10回勝利する", target: 10,
        reward: { type: "stone", value: 4800 }, getCurrent: () => playerState.missionProgress.battleWinTotal },
      { id: "no_deck_effect_win", category: "battle", title: "デッキ効果が発動していない編成で勝利する", target: 1,
        reward: { type: "exp", value: 8000 }, getCurrent: () => playerState.missionProgress.noDeckEffectWin ? 1 : 0 },
      { id: "deal_10k_once", category: "battle", title: "10000以上のダメージを与える", target: 1,
        reward: { type: "exp", value: 8000 }, getCurrent: () => playerState.missionProgress.dealt10kOnce ? 1 : 0 },
      { id: "deal_10k_twice", category: "battle", title: "1回の対戦において、10000以上のダメージを2回与える", target: 1,
        reward: { type: "exp", value: 24000 }, getCurrent: () => playerState.missionProgress.dealt10kTwiceInBattle ? 1 : 0 },
      { id: "subfield_full", category: "battle", title: "サブフィールドを全て埋める", target: 1,
        reward: { type: "exp", value: 8000 }, getCurrent: () => playerState.missionProgress.subFieldFull ? 1 : 0 },
      { id: "no_sub_win", category: "battle", title: "一回もサブカードを使わずに勝利する", target: 1,
        reward: { type: "card", cardId: "ja2" }, getCurrent: () => playerState.missionProgress.noSubWin ? 1 : 0 },
      { id: "grave_reset_3", category: "battle", title: "1回の対戦において、墓地リセット（カードによる効果も含む）を3回行う", target: 1,
        reward: { type: "exp", value: 16000 }, getCurrent: () => playerState.missionProgress.graveReset3InBattle ? 1 : 0 },
      { id: "hp_diff_10000", category: "battle", title: "自身と相手のHP差が10000以上ある状態で勝利する", target: 1,
        reward: { type: "exp", value: 16000 }, getCurrent: () => playerState.missionProgress.hpDiff10000Win ? 1 : 0 },

      // ---- 試練 ----
      { id: "trial_ouja_win", category: "battle", title: "王者の試練に勝利する。", target: 1,
        reward: [{ type: "exp", value: 120000 }, { type: "card", cardId: "kyou" }], getCurrent: () => playerState.missionProgress.trialOujaWin ? 1 : 0 },
      { id: "trial_ouja_win_strong4", category: "battle", title: "レベル調整：強、重複調整：４の状態で王者の試練に勝利する。", target: 1,
        reward: { type: "stone", value: 3600 }, getCurrent: () => playerState.missionProgress.trialOujaWinStrong4 ? 1 : 0 },
      { id: "trial_shippu_win", category: "battle", title: "疾風の試練に勝利する。", target: 1,
        reward: [{ type: "exp", value: 160000 }, { type: "card", cardId: "shitsu" }], getCurrent: () => playerState.missionProgress.trialShippuWin ? 1 : 0 },
      { id: "trial_shippu_win_strong4", category: "battle", title: "レベル調整：強、重複調整：４の状態で疾風の試練に勝利する。", target: 1,
        reward: { type: "stone", value: 4800 }, getCurrent: () => playerState.missionProgress.trialShippuWinStrong4 ? 1 : 0 },
      { id: "trial_gekokujou_win", category: "battle", title: "下克上の試練に勝利する。", target: 1,
        reward: [{ type: "exp", value: 140000 }, { type: "card", cardId: "gekoku" }], getCurrent: () => playerState.missionProgress.trialGekokujouWin ? 1 : 0 },
      { id: "trial_gekokujou_win_strong4", category: "battle", title: "レベル調整：強、重複調整：４の状態で下克上の試練に勝利する。", target: 1,
        reward: { type: "stone", value: 6000 }, getCurrent: () => playerState.missionProgress.trialGekokujouWinStrong4 ? 1 : 0 },

      // ---- 強化 ----
      { id: "lv10_x1", category: "enhance", title: "任意のカード1枚のレベルを10に上げる", target: 1,
        reward: { type: "exp", value: 5000 }, getCurrent: () => countCardsAtLevel(10) },
      { id: "lv10_x5", category: "enhance", title: "任意のカード5枚のレベルを10に上げる", target: 5,
        reward: { type: "exp", value: 30000 }, getCurrent: () => countCardsAtLevel(10) },
      { id: "lv10_x10", category: "enhance", title: "任意のカード10枚のレベルを10に上げる", target: 10,
        reward: { type: "exp", value: 60000 }, getCurrent: () => countCardsAtLevel(10) },
      { id: "lv20_x1", category: "enhance", title: "任意のカード1枚のレベルを20に上げる", target: 1,
        reward: { type: "stone", value: 600 }, getCurrent: () => countCardsAtLevel(20) },
      { id: "lv20_x5", category: "enhance", title: "任意のカード5枚のレベルを20に上げる", target: 5,
        reward: { type: "stone", value: 1200 }, getCurrent: () => countCardsAtLevel(20) },
      { id: "lv20_x10", category: "enhance", title: "任意のカード10枚のレベルを20に上げる", target: 10,
        reward: { type: "stone", value: 2400 }, getCurrent: () => countCardsAtLevel(20) },
      { id: "lv20_x20", category: "enhance", title: "任意のカード20枚のレベルを20に上げる", target: 20,
        reward: { type: "stone", value: 3600 }, getCurrent: () => countCardsAtLevel(20) },
      { id: "lv20_x30", category: "enhance", title: "任意のカード30枚のレベルを20に上げる", target: 30,
        reward: { type: "stone", value: 4800 }, getCurrent: () => countCardsAtLevel(20) },

      // ---- ガチャ ----
      { id: "gacha_10", category: "gacha", title: "ガチャを10回引く", target: 10,
        reward: { type: "exp", value: 10000 }, getCurrent: () => playerState.missionProgress.gachaPullTotal },
      { id: "gacha_20", category: "gacha", title: "ガチャを20回引く", target: 20,
        reward: { type: "shard", value: 20 }, getCurrent: () => playerState.missionProgress.gachaPullTotal },
      { id: "gacha_30", category: "gacha", title: "ガチャを30回引く", target: 30,
        reward: { type: "card", cardId: "you3" }, getCurrent: () => playerState.missionProgress.gachaPullTotal },
      { id: "gacha_40", category: "gacha", title: "ガチャを40回引く", target: 40,
        reward: { type: "exp", value: 40000 }, getCurrent: () => playerState.missionProgress.gachaPullTotal },
      { id: "gacha_50", category: "gacha", title: "ガチャを50回引く", target: 50,
        reward: { type: "equip", equipId: "protector" }, getCurrent: () => playerState.missionProgress.gachaPullTotal },
      { id: "gacha_100", category: "gacha", title: "ガチャを100回引く", target: 100,
        reward: { type: "card", cardId: "yoru" }, getCurrent: () => playerState.missionProgress.gachaPullTotal },
      { id: "gacha_150", category: "gacha", title: "ガチャを150回引く", target: 150,
        reward: { type: "shard", value: 100 }, getCurrent: () => playerState.missionProgress.gachaPullTotal },
      { id: "gacha_200", category: "gacha", title: "ガチャを200回引く", target: 200,
        reward: { type: "card", cardId: "ryu2" }, getCurrent: () => playerState.missionProgress.gachaPullTotal },

      // ---- その他 ----
      { id: "login", category: "other", title: "ゲームにログイン", target: 1,
        reward: { type: "exp", value: 2000 }, getCurrent: () => playerState.missionProgress.loginDone ? 1 : 0 },
      { id: "clear_10", category: "other", title: "いずれかのミッションを10つクリアする", target: 10,
        reward: { type: "stone", value: 1200 }, getCurrent: () => playerState.missionClaimedSet.size },
      { id: "clear_20", category: "other", title: "いずれかのミッションを20つクリアする", target: 20,
        reward: { type: "card", cardId: "nou2" }, getCurrent: () => playerState.missionClaimedSet.size },
    ];

    function rewardLabel(reward) {
      if (Array.isArray(reward)) return reward.map(rewardLabel).join("＆");
      if (reward.type === "stone") return `💎 石${reward.value.toLocaleString()}個`;
      if (reward.type === "exp") return `経験値${reward.value.toLocaleString()}`;
      if (reward.type === "shard") return `🧩 欠片${reward.value}個`;
      if (reward.type === "card") {
        const c = CARD_LIBRARY.find(x => x.id === reward.cardId);
        return `カード『${c ? c.name : reward.cardId}』`;
      }
      if (reward.type === "equip") {
        const e = getEquipDef(reward.equipId);
        return `装備品『${e ? e.name : reward.equipId}』`;
      }
      return "";
    }
    function applyMissionReward(reward) {
      if (Array.isArray(reward)) { reward.forEach(applyMissionReward); return; }
      if (reward.type === "stone") playerState.stone += reward.value;
      else if (reward.type === "exp") playerState.exp += reward.value;
      else if (reward.type === "shard") playerState.shards += reward.value;
      else if (reward.type === "card") grantCard(reward.cardId);
      else if (reward.type === "equip") grantEquipment(reward.equipId);
    }
    // 受け取り可能な回数（繰り返し可能ミッションは差分、通常は0か1）
    function missionStock(mission) {
      const current = mission.getCurrent();
      const claimed = playerState.missionClaimedCount[mission.id] || 0;
      if (mission.repeatable) return Math.max(0, current - claimed);
      return (current >= mission.target && claimed < 1) ? 1 : 0;
    }
    function claimMissionInternal(mission) {
      const stock = missionStock(mission);
      if (stock <= 0) return 0;
      for (let i = 0; i < stock; i++) applyMissionReward(mission.reward);
      playerState.missionClaimedCount[mission.id] = (playerState.missionClaimedCount[mission.id] || 0) + stock;
      playerState.missionClaimedSet.add(mission.id);
      return stock;
    }
    function claimMission(mission) {
      const stock = claimMissionInternal(mission);
      if (stock <= 0) return;
      updateResBar();
      renderMissionScreen();
    }

    let missionTrophyTimer = null;
    function showMissionTrophy(text) {
      const toast = document.getElementById("missionTrophyToast");
      toast.textContent = text;
      toast.classList.remove("show");
      void toast.offsetWidth; // 再アニメーションのための強制リフロー
      toast.classList.add("show");
      clearTimeout(missionTrophyTimer);
      missionTrophyTimer = setTimeout(() => toast.classList.remove("show"), 3200);
    }

    function getClaimableMissionIds() {
      return MISSION_DEFS.filter(mission => missionStock(mission) > 0).map(mission => mission.id);
    }

    function notifyNewMissionCompletions(beforeIds, afterIds) {
      const newIds = afterIds.filter(id => !beforeIds.includes(id));
      if (newIds.length === 0) return;
      const titles = newIds.map(id => {
        const mission = MISSION_DEFS.find(m => m.id === id);
        return mission ? mission.title : id;
      });
      showMissionTrophy(`ミッション達成：${titles.join("、")}`);
    }

    function syncBattleMissionProgressFromStats() {
      const mp = playerState.missionProgress;
      if (!game || !game.stats) return;
      if ((game.stats.hits10kCount || 0) >= 1) mp.dealt10kOnce = true;
      if ((game.stats.hits10kCount || 0) >= 2) mp.dealt10kTwiceInBattle = true;
      if (game.stats.subFieldFull) mp.subFieldFull = true;
      if ((game.stats.graveResetCount || 0) >= 3) mp.graveReset3InBattle = true;
    }

    function maybeNotifyMissionProgressUpdate(action) {
      const before = getClaimableMissionIds();
      action();
      syncBattleMissionProgressFromStats();
      const after = getClaimableMissionIds();
      notifyNewMissionCompletions(before, after);
    }

    let missionActiveTab = "battle";
    document.querySelectorAll("#missionTabs .mission-tab").forEach(tab => {
      tab.addEventListener("click", () => {
        document.querySelectorAll("#missionTabs .mission-tab").forEach(t => t.classList.remove("active"));
        tab.classList.add("active");
        missionActiveTab = tab.dataset.cat;
        renderMissionScreen();
      });
    });
    document.getElementById("missionBackBtn").addEventListener("click", () => showScreen("lobbyScreen"));

    function renderMissionScreen() {
      const list = document.getElementById("missionList");
      list.innerHTML = "";
      MISSION_DEFS.filter(m => m.category === missionActiveTab).forEach(m => {
        const current = m.getCurrent();
        const claimed = playerState.missionClaimedCount[m.id] || 0;
        const stock = missionStock(m);
        const doneNoStock = !m.repeatable && claimed >= 1 && stock === 0;
        const row = document.createElement("div");
        row.className = `mission-row${doneNoStock ? " done" : ""}`;
        const progressText = m.repeatable
          ? `達成回数：${current.toLocaleString()}回（未受取：${stock}回分）`
          : `進捗：${Math.min(current, m.target).toLocaleString()} / ${m.target.toLocaleString()}`;
        const btnLabel = stock > 0 ? `受け取る${stock > 1 ? `(${stock})` : ""}` : (doneNoStock ? "受取済み" : "未達成");
        row.innerHTML = `
          <div class="mission-row-main">
            <div class="mission-row-title">${m.title}</div>
            <div class="mission-row-progress">${progressText}${m.note ? ` ${m.note}` : ""}</div>
            <div class="mission-row-reward">報酬：${rewardLabel(m.reward)}</div>
          </div>
          <button class="mission-claim-btn" type="button" ${stock > 0 ? "" : "disabled"}>${btnLabel}</button>
        `;
        row.querySelector(".mission-claim-btn").addEventListener("click", () => claimMission(m));
        list.appendChild(row);
      });
    }

    document.getElementById("missionClaimAllBtn").addEventListener("click", () => {
      let totalStock = 0;
      MISSION_DEFS.forEach(m => { totalStock += claimMissionInternal(m); });
      if (totalStock <= 0) {
        window.alert("受け取れる報酬がありません。");
        return;
      }
      updateResBar();
      renderMissionScreen();
      showMissionTrophy(`ミッション報酬を一括受け取り（${totalStock}件）`);
    });

    // ============================================================
    // ガイド画面
    // ============================================================
    function guideSampleMainCard() {
      return { instanceId: "guide-sample-main", id: "__guide_main_sample", name: "狼", type: "main", rarity: 2,
        text: "相手に800ダメージを与える。", effect: { kind: "fixedDamage", value: 800 }, beacons: [] };
    }
    function guideSampleSubCard() {
      return { instanceId: "guide-sample-sub", id: "__guide_sub_sample", name: "岩", type: "sub", rarity: 1,
        text: "相手に210ダメージを与える。2ターン継続。", effect: { kind: "fieldPresence" },
        beacons: ["follow"] };
    }
    function guideSampleBeaconMainCard() {
      return { instanceId: "guide-sample-bmain", id: "__guide_bmain_sample", name: "例", type: "main", rarity: 1,
        text: "サンプルカード（ビーコン付与例）", effect: { kind: "fixedDamage", value: 500 }, beacons: ["dmgUp2", "costGain1"] };
    }
    function guideBeaconListHtml(type, slot) {
      const ids = BEACON_POOL[slot][type] || [];
      if (ids.length === 0) return "<div class=\"hint\">該当なし</div>";
      return `<div class="guide-beacon-list">${ids.map(id => {
        const def = BEACON_DEFS[id];
        return `<div class="guide-beacon-row"><span class="beacon-icon ${def.type}">${def.icon}</span><span class="guide-beacon-text"><b>${def.label}</b>：${def.desc}</span></div>`;
      }).join("")}</div>`;
    }
    function guideSpecialBeaconListHtml() {
      const ids = Object.keys(BEACON_DEFS).filter(id => BEACON_DEFS[id].type === "special");
      return `<div class="guide-beacon-list">${ids.map(id => {
        const def = BEACON_DEFS[id];
        return `<div class="guide-beacon-row"><span class="beacon-icon ${def.type}">${def.icon}</span><span class="guide-beacon-text"><b>${def.label}</b>：${def.desc}</span></div>`;
      }).join("")}</div>`;
    }
    function guideStatusListHtml(keys) {
      return `<div class="guide-beacon-list">${keys.map(key => {
        const def = STATUS_DEFS[key];
        if (!def) return "";
        return `<div class="guide-beacon-row"><span class="guide-status-icon">${def.icon}</span><span class="guide-beacon-text"><b>${def.label}</b>：${def.desc}</span></div>`;
      }).join("")}</div>`;
    }

    const GUIDE_DATA = [
      {
        id: "basics", label: "基礎知識",
        topics: [
          {
            id: "field", label: "フィールド",
            body: "対戦フィールドは「メインフィールド」と「サブフィールド」で構成されています。\nメインフィールドには直前に使用したメインカードが表示され、その前に使ったカードも数枚だけ薄い「残像」として並びます。\nサブフィールドには最大3枚（デッキ効果によって変動）のサブカードを同時に設置でき、設置されている間ずっと効果を発揮し続けるカードや、設置した瞬間だけ発動するカードなど様々です。",
            exampleHtml: () => `
              <div class="guide-example-box">
                <div class="guide-example-label">見本：フィールドの構成</div>
                <div class="guide-field-diagram">
                  <div class="guide-field-zone">
                    <div class="guide-field-zone-title">メインフィールド（1枚）</div>
                    <div class="guide-field-zone-cards" id="guideExMainZone"></div>
                  </div>
                  <div class="guide-field-zone">
                    <div class="guide-field-zone-title">サブフィールド（最大3枚）</div>
                    <div class="guide-field-zone-cards" id="guideExSubZone"></div>
                  </div>
                </div>
              </div>`,
            afterRender: () => {
              const m = document.getElementById("guideExMainZone");
              if (m) m.appendChild(createCardEl(guideSampleMainCard(), { small: true }));
              const s = document.getElementById("guideExSubZone");
              if (s) {
                s.appendChild(createCardEl(guideSampleSubCard(), { small: true }));
              }
            },
          },
          {
            id: "mainCard", label: "メインカード",
            body: "手札から使用する攻撃・回復・ドローなどの中心的なカードです。\n1ターンに1枚まで使用でき、使用すると効果が発動してメインフィールドに置かれ、その後は基本的に墓地へ送られます（特殊な効果で手札に戻るカードもあります）。",
            exampleHtml: () => `<div class="guide-example-box"><div class="guide-example-label">見本：メインカード</div><div class="guide-example-cards" id="guideExMainCard"></div></div>`,
            afterRender: () => {
              const el = document.getElementById("guideExMainCard");
              if (el) el.appendChild(createCardEl(guideSampleMainCard(), {}));
            },
          },
          {
            id: "subCard", label: "サブカード",
            body: "サブフィールドに設置するカードです。\n設置した瞬間に発動する効果（衝撃・治療など）や、フィールドに存在し続ける間ずっと働き続ける効果（追従・リジェネなど）、一定回数発動すると自動的に破棄される効果など、多彩な種類があります。",
            exampleHtml: () => `<div class="guide-example-box"><div class="guide-example-label">見本：サブカード</div><div class="guide-example-cards" id="guideExSubCard"></div></div>`,
            afterRender: () => {
              const el = document.getElementById("guideExSubCard");
              if (el) el.appendChild(createCardEl(guideSampleSubCard(), {}));
            },
          },
          {
            id: "deck", label: "山札",
            body: "対戦開始時に編成した30枚のデッキから作られる、カードを引くための束です。\n山札が尽きると、墓地にあるカードをシャッフルして新しい山札として作り直します（このとき手札やビーコンの状態はリセットされます）。",
          },
          {
            id: "hand", label: "手札",
            body: "山札から引いたカードを持つ場所です。最大7枚まで持てます。\n手札が上限に達している場合、それ以上ドローすることはできません。対戦開始時は3枚を引いた状態からスタートし、最初の1回だけ引き直しができます。",
          },
          {
            id: "grave", label: "墓地",
            body: "使用済みのメインカードや、破棄されたサブカードが送られる場所です。\n山札が尽きた際にはシャッフルされ、新しい山札として復活します。カード効果によって墓地から山札へ戻したり、墓地にあるカードの枚数や種類を参照して発動する効果もあります。",
          },
          {
            id: "deckRef", label: "デッキ参照",
            body: "対戦中、画面内の「デッキ参照」ボタンから、自分が編成した30枚のデッキの現在の並び・残り枚数を一覧で確認できます。\n相手のデッキ内容を確認することはできません。",
          },
          {
            id: "element", label: "エレメントエリア＆コスト",
            body: "対戦の勝敗とは別に用意された、専用のコストゲージです。\nフィールドにカードを出すたびに、レアリティに応じたコストが自動的に貯まります（基本値：☆1で+4、☆2で+2、☆3で+1。カードの凸効果で変動する場合もあります）。\nコストが30貯まると「火・水・土・風」いずれかのエレメントスキルを1つ選んで発動でき、50貯まっている状態で発動すると、より強力な「強化版」の効果になります（発動時にゲージは全て消費されます）。\n一部のノーマル／トラブルビーコン（コストⅠ・Ⅱ、コストドレイン、ロストなど）は、このゲージを直接増減させます。\nなお、持続時間のあるエレメントスキルは、効果が終了するまで同じスキルを再発動することはできません。",
            exampleHtml: () => `
              <div class="guide-example-box">
                <div class="guide-example-label">見本：エレメントスキル一覧</div>
                <table class="guide-table">
                  <tr><th>属性</th><th>通常版</th><th>強化版（コスト50時）</th></tr>
                  <tr><td>🔥 火</td><td>3ターンの間、与えるダメージ+30%</td><td>3ターンの間、与えるダメージ+50%</td></tr>
                  <tr><td>💧 水</td><td>HPを2000回復</td><td>HP2000回復＋4ターンの間、毎ターンHP500回復</td></tr>
                  <tr><td>🪨 土</td><td>墓地のカードを全て山札へ戻す</td><td>同左＋次に出すメインカードのダメージ+80%</td></tr>
                  <tr><td>🌪️ 風</td><td>山札から4枚ドロー</td><td>山札から6枚ドロー＋3ターンの間、引いたカードにノーマルビーコン付与</td></tr>
                </table>
              </div>`,
          },
        ],
      },
      {
        id: "enhance", label: "強化",
        topics: [
          {
            id: "cardLevel", label: "カードレベル",
            body: `所持しているカードは、EXPを消費してLv1〜${CARD_MAX_LEVEL}まで強化できます。\nレベルを上げると、編成に入れているカードの最大HPにボーナスが加算されます（レアリティやレベルに応じて上昇幅が変わります）。\n「編成・強化」画面で強化したいカードを選び「強化」ボタンを押すと、カード強化画面に入れます。`,
          },
          {
            id: "limitBreak", label: "重複（凸）",
            body: `ガチャなどで同じカードが重複すると「字魂」が手に入ります。\n字魂を1個消費するごとに、そのカードを凸Lv1〜${LIMIT_BREAK_CAP}まで強化できます。\n凸レベルが上がるごとに、そのカード固有の追加効果（ダメージ上昇・獲得コスト増加・専用効果の解禁など）が段階的に得られます。\n凸Lv${LIMIT_BREAK_CAP}（完凸）まで上げると、そのカードは対戦中の枠が金色にほんのり輝くようになり、ひと目で完凸カードと分かるようになります。\nカード強化画面の「凸性能確認」ボタンから、そのカードの各凸段階の効果をいつでも確認できます。`,
            exampleHtml: () => `
              <div class="guide-example-box">
                <div class="guide-example-label">見本：完凸したカードの見た目</div>
                <div class="guide-example-cards" id="guideExMaxed"></div>
              </div>`,
            afterRender: () => {
              const el = document.getElementById("guideExMaxed");
              if (!el) return;
              const card = { ...guideSampleMainCard(), id: "__guide_maxed_sample" };
              const wrap = createCardEl(card, {});
              wrap.classList.add("lb-maxed");
              el.appendChild(wrap);
            },
          },
        ],
      },
      {
        id: "equipment", label: "装備品",
        topics: [
          {
            id: "equipOverview", label: "装備品とは",
            body: `カードとは別に、獲得経験値やHPなどを底上げする「装備品」を編成できます。\nランクは☆1〜☆3（色はグレー・黄緑・ピンク）に分かれ、それぞれに装備コスト「C」が設定されています。\n編成した装備品のコスト合計は${EQUIP_COST_LIMIT}Cまでという制限があり、これを超える装備品は装備できません。\nすべての装備品には「獲得経験値＋1%」の基礎効果があり、Lvや重複が上がるほどこの数値も伸びていきます。装備中の全装備品の効果は合算され、対戦後の獲得経験値に反映されます。`,
            exampleHtml: () => `
              <div class="guide-example-box">
                <div class="guide-example-label">見本：装備品（ランク別の色）</div>
                <div class="guide-example-cards" id="guideExEquipRank"></div>
              </div>`,
            afterRender: () => {
              const el = document.getElementById("guideExEquipRank");
              if (!el) return;
              [EQUIPMENT_LIBRARY.find(e => e.rarity === 1), EQUIPMENT_LIBRARY.find(e => e.rarity === 2), EQUIPMENT_LIBRARY.find(e => e.rarity === 3)]
                .forEach(def => el.appendChild(createEquipEl(def, { small: true, level: 1, dupe: 0 })));
            },
          },
          {
            id: "equipEnhance", label: "強化・重複",
            body: `装備品はEXPを消費してLv1〜${EQUIP_MAX_LEVEL}まで強化できます。強化するたびに獲得経験値＋1%され、装備品によってはLvに応じて固有効果自体も強化されます。\nガチャなどで同じ装備品が重複すると、その装備品のLvとは別枠で「＋n」が加算されます（最大＋${EQUIP_DUPE_CAP}）。重複による上昇は獲得経験値＋1%のみです。\n「編成・強化」画面下部の装備品一覧から「強化」ボタンを押すと、装備強化画面に入れます。`,
          },
          {
            id: "equipGet", label: "入手方法",
            body: `装備品は現在、ガチャの「装備品1」シリーズから入手できます（全20種・排出確率は他のガチャバナーと同じ）。ミッションやショップでの入手は今後追加予定です。\n図鑑画面の召喚カード欄のさらに下にも、装備品の一覧（未所持含む）が表示されます。`,
          },
          {
            id: "equipBattle", label: "対戦中の効果",
            body: "対戦中に装備している装備品は、デッキ参照画面から一覧を確認できます。\nHPや獲得経験値の底上げのほか、特定のカードのダメージ増加、状態異常の無効化、最初の攻撃を防ぐ、墓地リセットやターン終了時にHP回復するなど、装備品ごとに固有の効果があります。\nなお、相手（AI）側の装備品システムは今後実装予定で、現時点では相手は装備品を持ちません。",
          },
        ],
      },
      {
        id: "deckSpace", label: "デッキスペース",
        topics: [
          {
            id: "dice", label: "サイコロスペース",
            body: `サイコロデッキ専用の特殊スペースです。\n対戦中、1ターンにつき1回、対戦を通して合計最大${DICE_MAX_USES}回までサイコロを振ることができます。`,
            exampleHtml: () => `
              <div class="guide-example-box">
                <div class="guide-example-label">見本：サイコロの目一覧</div>
                <table class="guide-table">
                  <tr><th>目</th><th>効果</th></tr>
                  <tr><td>①</td><td>このターン、自分の乱数ダメージが全て最高値になる</td></tr>
                  <tr><td>②</td><td>山札から2枚ドロー</td></tr>
                  <tr><td>③</td><td>自身が640ダメージを受ける</td></tr>
                  <tr><td>④</td><td>HPを1000回復</td></tr>
                  <tr><td>⑤</td><td>相手に500ダメージ</td></tr>
                  <tr><td>⑥</td><td>自分の手札とサブフィールドが全て破棄される</td></tr>
                </table>
              </div>`,
          },
          {
            id: "synth", label: "合成スペース",
            body: "シンセサイズデッキ専用の特殊スペースです。\nメイン枠が2つと、サブ素材枠が1つ用意されています。\nメインカードを2枚並べると自動的に合成され、2枚の名前と効果を組み合わせた新しいカードが手札に加わります。\nあらかじめサブ素材をセットしておくと、その素材が持つ専用効果も合成後のカードに引き継がれます。",
          },
          {
            id: "coin", label: "コインスペース",
            body: "コインデッキ専用の特殊スペースです。\nカードを使用するとコインが貯まっていきます。コインを4枚消費してゲージを進めるとコインレベルが上がり（Lv1〜4）、レベルが高いほど各効果が強化されます。\n1ターンに1回、コイン50枚を消費してHPを回復するか、コイン100枚を消費してそのターンのメインカードのダメージを倍加させるか、いずれかを選んで使用できます。\nさらに「コインショップ」では、コインを消費して欲しいカードを購入し、手札に加えることができます。",
          },
        ],
      },
      {
        id: "beacon", label: "ビーコン",
        topics: [
          {
            id: "normal", label: "ノーマルビーコン",
            body: "カードにランダムで付与される、自分に有利な効果を持つビーコンです。\nメインカード用とサブカード用があり、種類によって効果が発動するタイミング（使用時・設置時・場に存在する間）が異なります。",
            exampleHtml: () => `
              <div class="guide-example-box">
                <div class="guide-example-label">見本：ノーマルビーコン一覧</div>
                <div class="guide-beacon-groups">
                  <div>
                    <div class="guide-beacon-subgroup-title">メイン用</div>
                    ${guideBeaconListHtml("normal", "main")}
                  </div>
                  <div>
                    <div class="guide-beacon-subgroup-title">サブ用</div>
                    ${guideBeaconListHtml("normal", "sub")}
                  </div>
                </div>
              </div>`,
          },
          {
            id: "trouble", label: "トラブルビーコン",
            body: "カードにランダムで付与される、自分に不利な効果を持つビーコンです。\nダメージの低下や自傷、手札の消失、コストの損失など、様々なデメリット効果があります。",
            exampleHtml: () => `
              <div class="guide-example-box">
                <div class="guide-example-label">見本：トラブルビーコン一覧</div>
                <div class="guide-beacon-groups">
                  <div>
                    <div class="guide-beacon-subgroup-title">メイン用</div>
                    ${guideBeaconListHtml("trouble", "main")}
                  </div>
                  <div>
                    <div class="guide-beacon-subgroup-title">サブ用</div>
                    ${guideBeaconListHtml("trouble", "sub")}
                  </div>
                </div>
              </div>`,
          },
          {
            id: "special", label: "スペシャルビーコン",
            body: "ランダム抽選では付与されない、特定のカード効果でのみ得られる特別なビーコンです。\n「リロード」「ギフト」「ブースト」など、通常のビーコンより強力な効果を持ちます。",
            exampleHtml: () => `<div class="guide-example-box"><div class="guide-example-label">見本：スペシャルビーコン一覧</div>${guideSpecialBeaconListHtml()}</div>`,
          },
        ],
      },
      {
        id: "status", label: "状態異常",
        topics: [
          {
            id: "debuff", label: "デバフ状態異常",
            body: "カードの効果によって相手（あるいは自分自身）に付与される、不利益をもたらす状態異常です。\n多くは付与された側の自分のターンにダメージを受けたり、与える・受けるダメージが変化したりします。「悪寒」は6層貯まると自動的に「凍結」に変化し、「油」は「火傷」状態の相手に付与すると「炎上」に変化します。",
            exampleHtml: () => `<div class="guide-example-box"><div class="guide-example-label">見本：デバフ状態異常一覧</div>${guideStatusListHtml(["burn", "chill", "frozen", "toxin", "fragile", "shukketsu", "oil", "enjou"])}</div>`,
          },
          {
            id: "special2", label: "特殊状態異常",
            body: "特定のデッキ（アルカナデッキなど）に深く関連する、独自の性質を持つ状態異常です。\nダメージ量の変化だけでなく、層数の増減や特殊な起爆条件を持つものもあります。",
            exampleHtml: () => `<div class="guide-example-box"><div class="guide-example-label">見本：特殊状態異常一覧</div>${guideStatusListHtml(["glory", "moonlit", "sekiju", "soju", "arcana","revolution"])}</div>`,
          },
        ],
      },
    ];

    let guideActiveGroupId = GUIDE_DATA[0].id;
    let guideActiveTopicId = GUIDE_DATA[0].topics[0].id;

    function openGuideScreen() {
      renderGuideGroups();
      renderGuideTopics();
      renderGuideContent();
      showScreen("guideScreen");
    }

    function renderGuideGroups() {
      const container = document.getElementById("guideGroups");
      container.innerHTML = "";
      GUIDE_DATA.forEach(group => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = `guide-group-btn${group.id === guideActiveGroupId ? " active" : ""}`;
        btn.textContent = group.label;
        btn.addEventListener("click", () => {
          if (guideActiveGroupId === group.id) return;
          guideActiveGroupId = group.id;
          guideActiveTopicId = group.topics[0].id;
          renderGuideGroups();
          renderGuideTopics();
          renderGuideContent();
        });
        container.appendChild(btn);
      });
    }

    function renderGuideTopics() {
      const container = document.getElementById("guideTopics");
      container.innerHTML = "";
      const group = GUIDE_DATA.find(g => g.id === guideActiveGroupId);
      if (!group) return;
      group.topics.forEach(topic => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = `guide-topic-btn${topic.id === guideActiveTopicId ? " active" : ""}`;
        btn.textContent = topic.label;
        btn.addEventListener("click", () => {
          if (guideActiveTopicId === topic.id) return;
          guideActiveTopicId = topic.id;
          renderGuideTopics();
          renderGuideContent();
        });
        container.appendChild(btn);
      });
    }

    function renderGuideContent() {
      const container = document.getElementById("guideContent");
      const group = GUIDE_DATA.find(g => g.id === guideActiveGroupId);
      const topic = group && group.topics.find(t => t.id === guideActiveTopicId);
      if (!topic) { container.innerHTML = ""; return; }
      const exampleHtml = topic.exampleHtml ? topic.exampleHtml() : "";
      container.innerHTML = `
        <h3>${topic.label}</h3>
        <div class="guide-body-text">${topic.body}</div>
        ${exampleHtml}
      `;
      if (topic.afterRender) topic.afterRender();
    }

    // 初回はタイトル画面から
    showScreen("titleScreen");
