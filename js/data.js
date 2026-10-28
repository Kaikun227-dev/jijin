    // ============================================================
    // デッキ定義
    // ============================================================
    // 各デッキは { id, name, desc, cards: [カードid, ...] } の形式
    // cardsはCARD_LIBRARYのidを指定（重複不可、合計30枚が理想。デッキが未完全な場合のみ仮で重複可）
    // cards.length === 0 のデッキは選択できるが開始不可（未実装扱い）
    const DECKS = [
      {
        id: "standard",
        name: "スタンダード",
        desc: "攻守ともに安定してバランスの取れたデッキ。初心者から上級者まで幅広く使える。",
        cards: [
          "hei","inu","sak","heb","chi","un","tor2","ren","iwa",
          "rou","shi","tom","tor","yu","kit","kyo","kai","sho","ryu",
          "ran","tate","jin","ki","bak","yam","ju","kai2","go",
          "ni","san",
        ],
      },
      {
        id: "number",
        name: "ナンバー",
        desc: "旧漢数字で戦う高速サイクルデッキ。墓地・山札を操り何度も強力な数字カードを使い回す。",
        cards: [
          "ichi","go2","hachi","nez","neko","sute","shi2","ari","hyak",
          "ni2","san2","roku","sichi","zou","fuda","kusa","tas","sos","kan",
          "okuri","hono","bai2","juu","zero","sen","wari","ku","kag","oku",
          "tyo",
        ],
      },
      {
        id: "king",
        name: "キング",
        desc: "永続サブカード「王」を中心に守りながら戦う重量級デッキ。サブフィールド上限が6枚に拡張される。",
        cards: [
          "taku","isha","ken","yari","ono","tsue","tou2","ya","han",
          "shin","ei","juu2","yumi","do","en","zei","hosi","mura","tou",
          "kyuu2","gai","kabe","hime","kanm","ma","houk","kou","ou","shir",
          "matsuri",
        ],
      },
      {
        id: "trick",
        name: "トリック",
        desc: "大半のカードにランダム要素を持つ博打デッキ。サイコロを投げることができる。",
        cards: [
          "yu2","etsu","sho2","kou2","raku","hi","haku","kake","ho","sai",
          "su","mu","tai","ritsu","ki2","kan2","hen","nazo","kuji","bun",
          "rou2","en2","sho3","kara","kyou2","kyo2","ten","kami","zen","kyo3",
        ],
      },
      {
        id: "mechanic",
        name: "シンセサイズ",
        desc: "サブフィールド隣の合成スペースにメイン2枚を置くと1枚の合成カードになるデッキ。",
        cards: [
          "jun","kugi","kuru","kiba","tsum","tetsu","same","hou","moe","kai3",
          "kai4","you2","goku","yama","suna","kouri","ran2","sube","koku","sen2",
          "rei","gan","tsui","en3","kitsune","goku2","kai5","urami","ki3","shin2",
        ],
      },
      {
        id: "coin",
        name: "コイン",
        desc: "与えたダメージ100につきコイン1枚を獲得。コインスペースで回復・強化・カード購入ができるデッキ。",
        cards: [
          "ame","zeni","rai","yuki","shisan","zai","kumo","kichi","bai3","kagayaki",
          "kin","takara","ishi2","dou2","namari","en4","yuu2","sumi","ri2","oni",
          "kama","oroshi","azuke","gin2","kai6","kyou3","fuku","toku","kou3","kujira",
        ],
      },
      {
        id: "beacon",
        name: "ビーコン",
        desc: "山札から引いたカードは30%の確率でビーコン（トラブル含む）が1つ付与される。自身や相手のカードにビーコンを付与して戦うデッキ。",
        cards: [
          "jou","shou2","roku2","ten2","maki2","buta","shina","kon2","tsubu","sei3",
          "yo","jo2","sai2","kezu","tsuki","todoroki","hou2","ken2","fu2","yume",
          "den","hen3","kyuu3","han2","hako","a3","miyabi","so3","nou","chou2"
        ],
      },
      {
        id: "arcana",
        name: "アルカナ",
        desc: "開始時、相手に「アルカナ」を5層付与する。状態異常を蓄積させ、アルカナを起爆させて大ダメージを狙うデッキ。",
        cards: [
          "tsuru","gu","hie","surudo","abura","ki4",
          "yaku","sen3","kohru","kegare","yamai","chikara",
          "kurai","mukuro","sakae","kaku","akari","metsu","teru","noroi",
          "osu","hiku","yashi","kizu","kotoba","otsu","some","sou3","kabuto","dai",
        ],
      },
      {
        id: "select",
        name: "セレクト",
        desc: "好きなカードを30枚自分で選んで組む自由構築デッキ。☆3は8枚まで、☆2は13枚まで。デッキ効果はなし。",
        cards: [], // 対戦前にプレイヤーがカード選択モーダルで決定する（playerOnly）
        playerOnly: true,
        custom: true,
      },
      {
        id: "random",
        name: "ランダム",
        desc: "実装済みカードから30枚をランダムに自動構築するデッキ。☆3は8枚まで、☆2は13枚まで。デッキ効果はなし。",
        cards: [], // ゲーム開始時に動的生成（random）
        random: true,
      },
      // ── 試練（相手専用の特別編成デッキ。プレイヤーの編成候補には表示されない） ──
      {
        id: "trial_ouja",
        name: "王者の試練",
        desc: "王を中心に戦うデッキ。試練クリアで☆２カード「強」を獲得可能",
        cards: [
          "ken","isha","taku","yari","tou2","taki","arai","nagi","han",
          "zei","shin","ei","hosi","mei","kyuu2","gai","kabe","tou","mura","kin2","kyou","sawa",
          "ki","hime","kanm","kou","mikado","kirameki","ou","shir",
        ],
        aiOnly: true,
      },
      {
        id: "trial_shippu",
        name: "疾風の試練",
        desc: "開幕から高火力で叩くのを得意とするデッキ。試練クリアで☆３カード「疾」を獲得可能",
        cards: [
          "hei","buta","kobushi","surudo","nami","kouri","shi2","kan2","nagi",
          "tsuki","sichi","you3","same","sai2","kage","hou","sos","hou2","hosi","katsu","hen3","yoru",
          "geki","kitsune","akatsuki","wari","shitsu","ryu2","kyuu3","ni",
        ],
        aiOnly: true,
      },
      {
        id: "trial_gekokujou",
        name: "下克上の試練",
        desc: "☆１カードが多く含まれた風変わりなデッキ。試練クリアで☆３カード「克」を獲得可能",
        cards: [
          "jun","gu","ame","hei","nami","kuru","ken","go2","kobushi","surudo","tsuru","chi","taki",
          "ritsu","inu","namari","buta","kouri","kiba","suna","iwa","sak","han",
          "kyou","chikara","bai2","ju","so3","nou2","gekoku",
        ],
        aiOnly: true,
      },
    ];

    const FULL_DECK_SIZE = 30; // この枚数未満はWIP扱い

    const CARD_LIBRARY = [
      // ── スタンダードデッキ専用カード ──
      { id: "hei",  name: "兵", type: "main", rarity: 1, text: "相手に500ダメージを与える。", effect: { kind: "damage", value: 500 } },
      { id: "inu",  name: "犬", type: "main", rarity: 1, text: "相手に320ダメージを与える。", effect: { kind: "damage", value: 320 } },
      { id: "heb",  name: "蛇", type: "main", rarity: 1, text: "相手に90ダメージを3回与える。また、相手に「猛毒」を1層付与する。", effect: { kind: "multiDamage", value: 90, hits: 3 } },
      { id: "chi",  name: "治", type: "main", rarity: 1, text: "自身のHPを500回復する。", effect: { kind: "heal", value: 500 } },
      { id: "un",   name: "運", type: "main", rarity: 1, text: "相手に100・200・300・400・500の確率ダメージを与える。", effect: { kind: "randomDamage", choices: [100,200,300,400,500] } },
      { id: "tor2", name: "鳥", type: "main", rarity: 1, text: "相手に230ダメージ。自分と相手のサブフィールドに「卵」があれば即破棄。", effect: { kind: "birdAttack", value: 230 } },
      { id: "sak",  name: "魚", type: "sub",  rarity: 1, duration: 3, text: "相手に160ダメージを与える。3ターン継続。", effect: { kind: "turnDamage", value: 160 } },
      { id: "iwa",  name: "岩", type: "sub",  rarity: 1, duration: 2, text: "相手に210ダメージを与える。2ターン継続。", effect: { kind: "turnDamage", value: 210 } },
      { id: "ren",  name: "連", type: "sub",  rarity: 1, text: "連続攻撃の回数＋1。1回発動後に破棄。", effect: { kind: "extraHit" }, maxTriggers: 1 },
      { id: "rou",  name: "狼", type: "main", rarity: 2, text: "相手に800ダメージを与える。", effect: { kind: "damage", value: 800 } },
      { id: "shi",  name: "師", type: "main", rarity: 2, text: "相手に420ダメージを2回連続で与える。", effect: { kind: "multiDamage", value: 420, hits: 2 } },
      { id: "tom",  name: "富", type: "main", rarity: 2, text: "山札から2枚のカードを即座に手札に加える。", effect: { kind: "drawCards", value: 2 } },
      { id: "tor",  name: "虎", type: "main", rarity: 2, text: "相手に410ダメージ与え、相手のサブフィールドのカードを1枚ランダムで破壊する。", effect: { kind: "damageAndDestroySub", value: 410 } },
      { id: "yu",   name: "癒", type: "main", rarity: 2, text: "自身のHPを1000回復する。", effect: { kind: "heal", value: 1000 } },
      { id: "kit",  name: "絆", type: "main", rarity: 2, text: "500ダメージ＋自分のサブフィールドのカードのレア度合計×250ダメージを与える。", effect: { kind: "subRarityDamageV2" } },
      { id: "kyo",  name: "協", type: "main", rarity: 2, text: "420ダメージ＋自分のサブ枚数×300ダメージを与える。", effect: { kind: "subCountDamage", base: 420, perSub: 300 } },
      { id: "kai",  name: "壊", type: "main", rarity: 2, text: "相手のサブフィールドのカードを全て破棄（盾・護も貫通）。また、相手の状態異常のうち「栄光」「月照」も破壊する。", effect: { kind: "destroyAllSubs" } },
      { id: "sho",  name: "蝕", type: "main", rarity: 2, text: "相手のサブフィールドに「毒」を1枚召喚する。また、相手に「猛毒」を2層付与する。", effect: { kind: "summonPoison" } },
      { id: "ryu",  name: "竜", type: "main", rarity: 2, text: "相手に1000ダメージを与え、自分のサブフィールドに「卵」を1枚召喚する。", effect: { kind: "dragonAttack", value: 1000 } },
      { id: "ran",  name: "嵐", type: "sub",  rarity: 2, duration: 3, text: "相手へ320ダメージを与える。3ターン継続。", effect: { kind: "turnDamage", value: 320 } },
      { id: "tate", name: "盾", type: "sub",  rarity: 2, text: "相手からのダメージを1回のみ防ぐ。1回発動後に破棄。", effect: { kind: "blockOnce" }, maxTriggers: 1 },
      { id: "jin",  name: "陣", type: "sub",  rarity: 2, duration: 3, text: "メインやサブでダメージを与えた時、追加で150ダメージを与える。3ターン継続。", effect: { kind: "bonusDamage", value: 150 } },
      { id: "ki",   name: "騎", type: "main", rarity: 3, text: "相手に1500ダメージを与える。使用者のHPが半分以下の場合、ダメージは2400となる。また、手札の枚数分、追加で400ダメージを与える。", effect: { kind: "kiDamage" } },
      { id: "bak",  name: "爆", type: "main", rarity: 3, text: "相手に650ダメージを4回与える。", effect: { kind: "multiDamage", value: 650, hits: 4 } },
      { id: "yam",  name: "闇", type: "main", rarity: 3, text: "相手に3000ダメージを与える。ただし自身も1000のダメージを受ける。", effect: { kind: "darkDamage", value: 3000, self: 1000 } },
      { id: "ju",   name: "樹", type: "main", rarity: 3, text: "相手に900ダメージ。自身のサブフィールドに「木」を最大数まで召喚する。", effect: { kind: "treeAttack", value: 900 } },
      { id: "kai2", name: "快", type: "main", rarity: 3, text: "HPを2000回復。自分のサブに「毒」があれば破棄する。また、自身に付与された状態異常（栄光・月照を除く）を全て除去する。", effect: { kind: "healAndCurePoison", value: 2000 } },
      { id: "go",   name: "護", type: "sub",  rarity: 3, duration: 2, text: "相手からの全ての攻撃を防ぐ。2ターン継続。", effect: { kind: "guardTurn" } },
      { id: "ni",   name: "似", type: "sub",  rarity: 3, text: "次に出すメインカードの効果を再び発動させる。1回発動後に破棄。", effect: { kind: "repeatNextMain" }, maxTriggers: 1 },
      { id: "san",  name: "酸", type: "sub",  rarity: 3, duration: 3, text: "相手に720ダメージを与える。3ターン継続。このカードがサブフィールドに存在する間、相手はサブカードを新たに置けない。また、相手に「脆弱」を1層付与する。", effect: { kind: "turnDamage", value: 720 } },
      // ── ナンバーデッキ専用カード ──
      { id: "ichi", name: "壱", type: "main", rarity: 1, text: "山札から弐～拾のカードを最大2枚手札に引く。", effect: { kind: "numDraw", targets: ["ni2","san2","shi","go","roku","sichi","hachi","ku","juu"] } },
      { id: "go2",   name: "伍", type: "main", rarity: 1, text: "相手に555ダメージを与える。", effect: { kind: "damage", value: 555 } },
      { id: "hachi",name: "捌", type: "main", rarity: 1, text: "相手に480ダメージを与える。自分の残りの手札を全て墓地へ送る。", effect: { kind: "damageDiscardHand", value: 480 } },
      { id: "nez",  name: "鼠", type: "main", rarity: 1, text: "相手に260ダメージを与える。また、相手に「猛毒」を1層付与する。", effect: { kind: "damage", value: 260 } },
      { id: "neko", name: "猫", type: "main", rarity: 1, text: "相手に100ダメージを与える。さらに自身のHPを200回復する。", effect: { kind: "damageAndHeal", dmg: 100, heal: 200 } },
      { id: "sute", name: "捨", type: "main", rarity: 1, text: "自身のサブフィールドにあるサブカードを即座に全て破棄する。", effect: { kind: "destroySelfSubs" } },
      { id: "shi2",  name: "肆", type: "sub",  rarity: 1, duration: 2, text: "自ターン終了時に山札から1枚引く。2ターン継続。", effect: { kind: "endTurnDraw" } },
      { id: "ari", name: "蟻", type: "sub",  rarity: 1, duration: 2, text: "相手に180ダメージを与える。2ターン継続。", effect: { kind: "turnDamage", value: 180 } },
      { id: "hyak", name: "百", type: "sub",  rarity: 1, duration: 3, text: "相手に100ダメージを与える。3ターン継続。", effect: { kind: "turnDamage", value: 100 } },
      { id: "ni2",  name: "弐", type: "main", rarity: 2, text: "相手に222ダメージを2回連続で与える。さらに手札の枚数分、追加で攻撃する。", effect: { kind: "numNi" } },
      { id: "san2", name: "参", type: "main", rarity: 2, text: "相手に333ダメージを3回連続で与える。", effect: { kind: "multiDamage", value: 333, hits: 3 } },
      { id: "roku", name: "陸", type: "main", rarity: 2, text: "山札にあるカードの枚数×50のダメージを与える。", effect: { kind: "deckCountDamage", multiplier: 50 } },
      { id: "sichi",name: "漆", type: "main", rarity: 2, text: "墓地にあるカードの枚数×90のダメージを与える。", effect: { kind: "graveCountDamage", multiplier: 90 } },
      { id: "zou",  name: "象", type: "main", rarity: 2, text: "相手に720ダメージを与える。", effect: { kind: "damage", value: 720 } },
      { id: "fuda", name: "札", type: "main", rarity: 2, text: "残り手札が0枚なら1000ダメージ、それ以外なら200ダメージ。", effect: { kind: "emptyHandDamage", emptyDmg: 1000, normalDmg: 200 } },
      { id: "kusa", name: "鎖", type: "main", rarity: 2, text: "次の相手のターンをスキップする（サブ効果は機能する）。", effect: { kind: "skipEnemyTurn" } },
      { id: "tas",  name: "助", type: "main", rarity: 2, text: "山札からサブカードを最大2枚引く。", effect: { kind: "drawSubCards", count: 2 } },
      { id: "sos",  name: "蘇", type: "main", rarity: 2, text: "墓地のカードからランダムで最大2枚を手札に戻す。", effect: { kind: "graveReturn", count: 2 } },
      { id: "kan",  name: "換", type: "main", rarity: 2, text: "手札とサブフィールドのカードを全て墓地に送り、送った枚数分山札から引く。", effect: { kind: "swapHandAndSubs" } },
      { id: "okuri",name: "送", type: "main", rarity: 2, text: "山札の残りカードの半分を直接墓地へ送る。奇数なら先に1枚引いてから実行。", effect: { kind: "halfDeckToGrave" } },
      { id: "hono", name: "炎", type: "sub",  rarity: 2, duration: 4, text: "相手に250ダメージを与える。4ターン継続。また、相手に「火傷」を1層付与する。", effect: { kind: "turnDamage", value: 250 } },
      { id: "bai2", name: "倍", type: "sub",  rarity: 2, text: "次に出すカードで与えるダメージを2倍にする。1回発動後に破棄。", effect: { kind: "damageDouble" }, maxTriggers: 1 },
      { id: "juu",  name: "拾", type: "main", rarity: 3, text: "相手に1000ダメージ。自分の墓地を全て山札に戻し、山札から最大3枚引く。", effect: { kind: "damageGraveReturn", value: 1000 } },
      { id: "zero", name: "零", type: "main", rarity: 3, text: "相手に1500ダメージ。最後に出した肆・玖以外の壱～拾のカードの効果を再発動する。また、相手に「悪寒」を2層付与する。", effect: { kind: "numZero", value: 1500 } },
      { id: "sen",  name: "千", type: "main", rarity: 3, text: "相手に1000ダメージ。自身のHPが半分以下なら2500ダメージになる。", effect: { kind: "desperateDamage", normal: 1000, low: 2500 } },
      { id: "wari", name: "割", type: "main", rarity: 3, text: "相手の現在HPを半分削る。ただし自身は3000ダメージを受ける。", effect: { kind: "halfHpDamage", selfDmg: 3000 } },
      { id: "ku",   name: "玖", type: "sub",  rarity: 3, duration: 3, text: "HPを999回復する。3ターン継続。", effect: { kind: "healTick", value: 999 } },
      { id: "kag",  name: "鏡", type: "sub",  rarity: 3, text: "相手からのダメージを無効化し、反射する。1回発動後に破棄。", effect: { kind: "reflectOnce" }, maxTriggers: 1 },
      { id: "oku",  name: "億", type: "sub",  rarity: 3, text: "次に使うメインカードを墓地に送らず手札に戻す。1回発動後に破棄。", effect: { kind: "returnMain" }, maxTriggers: 1 },
      { id: "tyo",  name: "兆", type: "sub",  rarity: 3, duration: 6, text: "6ターン後に自動破棄し、相手に270ダメージ与える。6ターンより早く破棄された場合は相手に2700ダメージを与える。", effect: { kind: "timeBomb" }, noGrave: true },
      // ── キングデッキ専用カード ──
      { id: "taku", name: "匠", type: "main", rarity: 1, text: "山札から☆2以上のカードを1枚引く。王がいれば追加で2枚引く。", effect: { kind: "takuCraft" } },
      { id: "isha", name: "医", type: "main", rarity: 1, text: "HPを400回復。王がいれば800回復。", effect: { kind: "ishaDoctor", base: 400, withKing: 800 } },
      { id: "ken",  name: "剣", type: "main", rarity: 1, text: "相手に100ダメージ。さらに自分のサブ枚数分、追加で100ダメージ。", effect: { kind: "subCountDamage", base: 100, perSub: 100 } },
      { id: "yari", name: "槍", type: "main", rarity: 1, text: "150ダメージを2回連続で与える。", effect: { kind: "multiDamage", value: 150, hits: 2 } },
      { id: "ono",  name: "斧", type: "main", rarity: 1, text: "340ダメージ。相手のサブに「木」があればそれらを即破壊。", effect: { kind: "onoAxe", value: 340 } },
      { id: "tsue", name: "杖", type: "main", rarity: 1, text: "相手の現在の手札をログに開示する。", effect: { kind: "tsueReveal" } },
      { id: "tou2", name: "盗", type: "main", rarity: 1, text: "相手のサブをランダムで最大2枚破壊する。", effect: { kind: "stealSub" } },
      { id: "ya",   name: "矢", type: "sub",  rarity: 1, duration: 8, text: "8ターン後に自動破棄。理由問わず破棄された時、相手に260ダメージ。", effect: { kind: "yaArrow", value: 260 } },
      { id: "han",  name: "反", type: "sub",  rarity: 1, text: "相手のメインカードでダメージを受けた時、相手に250ダメージを与える。2回発動後に破棄。", effect: { kind: "hanCounter", value: 250 }, maxTriggers: 2 },
      { id: "shin", name: "臣", type: "main", rarity: 2, text: "相手に550ダメージ。王がいれば1100ダメージ。", effect: { kind: "kingScaleDamage", base: 550, withKing: 1100 } },
      { id: "ei",   name: "衛", type: "main", rarity: 2, text: "320ダメージを2回連続で与える。王がいれば追加で2回攻撃。", effect: { kind: "eiGuard", value: 320, baseHits: 2, kingBonusHits: 2 } },
      { id: "juu2", name: "銃", type: "main", rarity: 2, text: "相手に300ダメージ。さらに自分のサブ枚数分、追加で200ダメージ。", effect: { kind: "subCountDamage", base: 300, perSub: 200 } },
      { id: "yumi", name: "弓", type: "main", rarity: 2, text: "630ダメージ。自分のサブに「矢」があれば、その経過ターン×120の追加ダメージを与え矢を破棄。", effect: { kind: "yumiBow", value: 630, multiplier: 120 } },
      { id: "do",   name: "弩", type: "main", rarity: 2, text: "720ダメージ。自分のサブに「矢」があれば400の追加ダメージを与え矢を破棄。", effect: { kind: "doCrossbow", value: 720, bonus: 400 } },
      { id: "en",   name: "援", type: "main", rarity: 2, text: "兵・騎・盾の中からランダムで1枚獲得（これで獲得したカードは直接墓地へ送れない）。", effect: { kind: "enSupport", choices: ["hei","ki","tate"] } },
      { id: "zei",  name: "税", type: "main", rarity: 2, text: "サブフィールドにあるサブカード1枚につき山札からカードを1枚引く。", effect: { kind: "zeiTax" } },
      { id: "hosi", name: "星", type: "main", rarity: 2, text: "山札から☆3を1枚引く。山札になければ墓地から引く。", effect: { kind: "hosiStar" } },
      { id: "mura", name: "村", type: "sub",  rarity: 2, duration: 3, text: "HPを300回復。3ターン継続。王がいれば消失しない。", effect: { kind: "muraVillage", value: 300 } },
      { id: "tou",  name: "塔", type: "sub",  rarity: 2, duration: 3, text: "メインダメージ時、追加で250ダメージ。3ターン継続。王がいれば消失しない。", effect: { kind: "touTower", value: 250 } },
      { id: "kyuu2",name: "吸", type: "sub",  rarity: 2, text: "メインダメージ時、そのダメージ分HPを回復。1回発動後に破棄。", effect: { kind: "kyuuAbsorb" }, maxTriggers: 1 },
      { id: "gai",  name: "鎧", type: "sub",  rarity: 2, duration: 3, text: "相手のサブからのダメージを無効化。3ターン継続。", effect: { kind: "gaiArmor" } },
      { id: "kabe", name: "壁", type: "sub",  rarity: 2, text: "相手からのサブ破壊を1度だけ無効化（自分の効果による破壊は防げない）。1回発動後に破棄。", effect: { kind: "kabeWall" }, maxTriggers: 1 },
      { id: "hime", name: "姫", type: "main", rarity: 3, text: "相手に1400ダメージ。王が存在する時、ダメージは2800となる。", effect: { kind: "kingScaleDamage", base: 1400, withKing: 2800 } },
      { id: "kanm", name: "冠", type: "main", rarity: 3, text: "山札からカードを7枚になるまで引く。王が手札・サブにない場合、山札か墓地から即座に王を引く。また、自身に「栄光」を1層付与する。", effect: { kind: "kanFetchKing", drawCount: 7 } },
      { id: "ma",   name: "魔", type: "main", rarity: 3, text: "相手に1200ダメージ。さらに自分のサブ枚数分、追加で500ダメージ与えるがそのサブを全て破棄。", effect: { kind: "maDevil", value: 1200, perSub: 500 } },
      { id: "houk", name: "崩", type: "main", rarity: 3, text: "自分と相手の手札・サブフィールドを全て強制破棄する。また、自身と相手にある状態異常も全て除去する。", effect: { kind: "houCollapse" } },
      { id: "kou",  name: "皇", type: "main", rarity: 3, text: "相手が最後に使ったメインカードの効果を再現して発動する。", effect: { kind: "kouEmperor" } },
      { id: "ou",   name: "王", type: "sub",  rarity: 3, text: "相手に600ダメージを与える。ターン経過で消失しない。フィールドに存在する間、他のカードに影響を及ぼす。", effect: { kind: "kingPresence", value: 600 }, isKing: true },
      { id: "shir", name: "城", type: "sub",  rarity: 3, duration: 4, text: "自ターン終了時に1枚引く。4ターン継続。王がいれば消失しない。王が手札・サブにない場合、山札か墓地から即座に王を引く。", effect: { kind: "shiroCity" } },
      { id: "matsuri", name: "祭", type: "sub", rarity: 3, duration: 4, text: "このカードが存在する間、ターン消費・回数制限のあるサブカードが消費・カウントなしで動くようになる。4ターン継続。", effect: { kind: "matsuriFestival" } },
      // ── トリックデッキ専用カード ──
      { id: "sai",  name: "賽", type: "main", rarity: 1, text: "相手に100・200・300・400・500・600の確率ダメージを与える。サイコロの使用可能回数を1回復。", effect: { kind: "probDamageRestoreDice", choices: [100,200,300,400,500,600] } },
      { id: "su",   name: "素", type: "main", rarity: 1, text: "相手に130・170・290・410の確率ダメージを与える。", effect: { kind: "probDamage", choices: [130,170,290,410] } },
      { id: "tai",  name: "怠", type: "main", rarity: 1, text: "相手に1～400の乱数ダメージを与える。", effect: { kind: "rangeDamage", min: 1, max: 400 } },
      { id: "ritsu",name: "律", type: "main", rarity: 1, text: "相手に320ダメージを与える。50%の確率で540ダメージとなる。", effect: { kind: "coinDamage", base: 320, bonus: 540 } },
      { id: "ki2",  name: "奇", type: "main", rarity: 1, text: "100ダメージを与える。前のターンか今回のターンでサイコロを振っていた場合、その効果をもう一度発動する。", effect: { kind: "kiOdd", value: 100 } },
      { id: "rou2", name: "労", type: "main", rarity: 1, text: "相手の手札を全て破棄させる。その代わりに破棄させた枚数×300回復させる。", effect: { kind: "discardHandHealSelf", multiplier: 300 } },
      { id: "mu",   name: "無", type: "main", rarity: 1, text: "効果なし。ハズレ！", effect: { kind: "noEffect" } },
      { id: "kyou2",name: "凶", type: "sub",  rarity: 1, text: "乱数ダメージは全て最低値を出すようになる。ただし与えた数値分自身のHPを回復する。1回発動後に破棄。", effect: { kind: "minRandomHealOnce" }, maxTriggers: 1 },
      { id: "kan2", name: "甘", type: "sub",  rarity: 1, duration: 2, text: "HPを165回復。2ターン継続。", effect: { kind: "healOverTime", value: 165 } },
      { id: "kou2", name: "幸", type: "main", rarity: 2, text: "HPを800～1200の乱数値で回復する。", effect: { kind: "rangeHeal", min: 800, max: 1200 } },
      { id: "raku", name: "楽", type: "main", rarity: 2, text: "相手に400～800の乱数ダメージを与え、与えた数値分自身のHPを回復する。", effect: { kind: "rangeDamageHealSelf", min: 400, max: 800 } },
      { id: "kake", name: "賭", type: "main", rarity: 2, text: "相手に0・1000の確率ダメージを与える。", effect: { kind: "probDamage", choices: [0,1000] } },
      { id: "nazo",  name: "謎", type: "main", rarity: 2, text: "次の効果から1つ、ランダムで発動する。・相手に750ダメージ。・HPを500回復する。・自身が1000のダメージを受ける。・山札からカードを2枚引く。", effect: { kind: "randomMysteryEffect" } },
      { id: "kuji", name: "籤", type: "main", rarity: 2, text: "山札からカードを1枚引く。引いたカードのレア度×500のダメージを相手に与える。", effect: { kind: "drawRarityDamage", multiplier: 500 } },
      { id: "en2",  name: "塩", type: "main", rarity: 2, text: "相手の手札が満杯（7枚）になるまで山札を引かせる。その後、引いた枚数×320のダメージを与える。", effect: { kind: "forceDrawDamage", multiplier: 320 } },
      { id: "sho3", name: "償", type: "main", rarity: 2, text: "現在の自身のHPの20%を消費し、消費した分のダメージを相手に与える。防がれた場合は消費したHPが返還される。", effect: { kind: "sacrificeHp", ratio: 0.2 } },
      { id: "bun",  name: "分", type: "main", rarity: 2, text: "自分と相手のHPを合算し、半分に割った数値をお互いのHPとする。", effect: { kind: "splitHp" } },
      { id: "kara", name: "空", type: "main", rarity: 2, text: "相手の山札に「無」を3枚新たに加える（デッキ枚数を超過してカウントされる）。", effect: { kind: "addVoidCards", count: 3 } },
      { id: "hi",   name: "卑", type: "sub",  rarity: 2, text: "乱数ダメージは全て最高値を出すようになる。1回発動後に破棄。", effect: { kind: "maxRandomOnce" }, maxTriggers: 1 },
      { id: "ho",   name: "保", type: "sub",  rarity: 2, text: "ダメージを受けた時、自身のHPを1000回復する。1回発動後に破棄。", effect: { kind: "healOnDamageOnce", value: 1000 }, maxTriggers: 1 },
      { id: "hen",  name: "騙", type: "sub",  rarity: 2, text: "自分がダメージを受けた時、そのダメージを0～受けるはずだった数値の乱数値に軽減する。2回発動後に破棄。", effect: { kind: "damageReduceRandom" }, maxTriggers: 2 },
      { id: "kyo2", name: "虚", type: "sub",  rarity: 2, text: "☆1のメインカードを使用した時、相手に1000ダメージを与える。1回発動後に破棄。また、相手に「脆弱」を1層付与する。", effect: { kind: "lowRarityTrigger" }, maxTriggers: 1 },
      { id: "yu2",  name: "愉", type: "main", rarity: 3, text: "相手に1000～4000の乱数ダメージを与える。", effect: { kind: "rangeDamage", min: 1000, max: 4000 } },
      { id: "etsu", name: "悦", type: "main", rarity: 3, text: "相手に200～800の乱数ダメージを5回与える。", effect: { kind: "rangeMultiDamage", min: 200, max: 800, hits: 5 } },
      { id: "sho2", name: "笑", type: "main", rarity: 3, text: "相手に888ダメージ。相手のサブフィールド破棄させて全てを「客」で満たす。", effect: { kind: "fillWithGuest", value: 888 } },
      { id: "haku", name: "博", type: "main", rarity: 3, text: "相手に0・1000・2000・4000の確率ダメージを与える。", effect: { kind: "probDamage", choices: [0,1000,2000,4000] } },
      { id: "ten",  name: "天", type: "main", rarity: 3, text: "相手に2000ダメージを与える。40%の確率でこのカードは墓地に行かず手札に戻る。", effect: { kind: "heavenDamage", value: 2000, returnChance: 0.4 } },
      { id: "kami", name: "神", type: "main", rarity: 3, text: "相手に1600ダメージを与え、山札から2枚引く。さらにHPを1000回復する。", effect: { kind: "godCombo", value: 1600, draw: 2, heal: 1000 } },
      { id: "zen",  name: "全", type: "sub",  rarity: 3, text: "☆3のメインカードを使用した時、相手に500ダメージを与える。発動ごとに+500される。4回発動後に破棄。", effect: { kind: "highRarityEscalate", base: 500, step: 500 }, maxTriggers: 4 },
      { id: "kyo3", name: "狂", type: "sub",  rarity: 3, text: "墓地に直接カードを破棄する度に、相手に850ダメージを与える。3回発動後に破棄。", effect: { kind: "discardTrigger", value: 850 }, maxTriggers: 3 },
      // ── シンセサイズデッキ専用カード ──
      { id: "jun",  name: "順", type: "main", rarity: 1, text: "相手に123ダメージを4回与える。", effect: { kind: "multiDamage", value: 123, hits: 4 } },
      { id: "kugi", name: "釘", type: "main", rarity: 1, text: "相手に350ダメージを与える。このカードが合成に使われた時、その合成カードの素材効果が2回発動するようになる。", effect: { kind: "damage", value: 350 }, synthTag: "doubleMaterial" },
      { id: "kuru", name: "車", type: "main", rarity: 1, text: "相手に600ダメージを与える。", effect: { kind: "damage", value: 600 } },
      { id: "yama", name: "山", type: "main", rarity: 1, text: "相手に111・222・333の確率ダメージを与える。", effect: { kind: "randomDamage", choices: [111,222,333] } },
      { id: "kiba", name: "牙", type: "sub",  rarity: 1, duration: 2, text: "相手に250ダメージを与える。2ターン継続。", effect: { kind: "turnDamage", value: 250 }, material: { text: "相手に300ダメージ与える。", effect: { kind: "damage", value: 300 } } },
      { id: "tsum", name: "爪", type: "sub",  rarity: 1, duration: 3, text: "相手に140ダメージを与える。3ターン継続。", effect: { kind: "turnDamage", value: 140 }, material: { text: "相手に450ダメージ与える。", effect: { kind: "damage", value: 450 } } },
      { id: "tetsu",name: "鉄", type: "sub",  rarity: 1, duration: 2, text: "HPを140回復する。2ターン継続。", effect: { kind: "healTick", value: 140 }, material: { text: "HPを320回復する。", effect: { kind: "heal", value: 320 } } },
      { id: "suna", name: "砂", type: "sub",  rarity: 1, text: "手札が1枚以下の時、相手に410ダメージを与える。1回発動後に破棄。", effect: { kind: "handConditionDamage", value: 410, maxHand: 1 }, maxTriggers: 1, material: { text: "290ダメージを与える。", effect: { kind: "damage", value: 290 } } },
      { id: "kouri",  name: "氷", type: "sub",  rarity: 1, duration: 3, text: "相手に100～400の乱数ダメージを与える。3ターン継続。また、相手に「悪寒」を1層付与する。", effect: { kind: "turnRandomDamage", min: 100, max: 400 }, material: { text: "240ダメージを与え、自身のHPを240回復する。", effect: { kind: "damageAndHeal", damage: 240, heal: 240 } } },
      { id: "same", name: "鮫", type: "main", rarity: 2, text: "相手に800ダメージを与える。相手は次のターンでサブカードを出せなくなる。", effect: { kind: "damageBlockNextSub", value: 800 } },
      { id: "hou",  name: "砲", type: "main", rarity: 2, text: "相手に1100ダメージを与える。", effect: { kind: "damage", value: 1100 } },
      { id: "moe",  name: "燃", type: "main", rarity: 2, text: "相手のサブフィールドにあるサブカードを全て破棄させ、破棄させた枚数×500のダメージを与える。また、相手に「火傷」を1層付与する。", effect: { kind: "destroySubsDamage", perCard: 500 } },
      { id: "kai3", name: "解", type: "main", rarity: 2, text: "手札にある合成カードを分解させる。複数選択ある場合は古い方を分解する。分解によって手札が最大数まで行く場合、溢れた分解後のカードを直ちに墓地へ送る。", effect: { kind: "decomposeSynthCard" } },
      { id: "ran2", name: "乱", type: "main", rarity: 2, text: "相手に94ダメージを10回与える。", effect: { kind: "multiDamage", value: 94, hits: 10 } },
      { id: "sube",name: "滑", type: "main", rarity: 2, text: "自軍のサブフィールドにあるサブカードの経過ターン、使用回数を0にリセットする。", effect: { kind: "resetSubTimers" } },
      { id: "koku", name: "剋", type: "main", rarity: 2, text: "相手の山札にある☆3カードを全て墓地へ送る。但し自身は1000ダメージを受ける。", effect: { kind: "purgeRarity3Deck", selfDamage: 1000 } },
      { id: "kai4", name: "改", type: "sub",  rarity: 2, text: "合成カードを使用した時、その合成カードは分解されずに手札に戻る。1回発動後に破棄。", effect: { kind: "synthNoDecompose" }, maxTriggers: 1, material: { text: "山札からカードを2枚引く。", effect: { kind: "drawCards", value: 2 } } },
      { id: "you2", name: "溶", type: "sub",  rarity: 2, text: "ダメージを受けた時、HPを370回復する。3回発動後に破棄。", effect: { kind: "healOnDamage", value: 370 }, maxTriggers: 3, material: { text: "墓地にあるカードを全て山札へ戻す。", effect: { kind: "graveToDeckAll" } } },
      { id: "sen2", name: "戦", type: "sub",  rarity: 2, duration: 3, text: "相手に自身の墓地の枚数×43ダメージを与える。3ターン継続。", effect: { kind: "graveTickDamage", multiplier: 43 }, material: { text: "1200ダメージを与える。", effect: { kind: "damage", value: 1200 } } },
      { id: "rei",  name: "霊", type: "sub",  rarity: 2, duration: 2, text: "相手に490ダメージを与える。2ターン継続。", effect: { kind: "turnDamage", value: 490 }, material: { text: "与えたダメージの半分の数値分、自身のHPを回復する。", effect: { kind: "heal", value: 245 } } },
      { id: "gan",  name: "願", type: "sub",  rarity: 2, duration: 3, text: "3ターン後に破棄。理由問わず破棄された時、自身のHPを1400回復する。", effect: { kind: "healOnDiscard", value: 1400 }, material: { text: "山札から☆3カードを1枚引く。", effect: { kind: "drawRarity3", count: 1 } } },
      { id: "tsui", name: "追", type: "sub",  rarity: 2, text: "メインでダメージ与えた時、追加で230ダメージ与える。5回発動後に破棄。", effect: { kind: "mainBonusCounted", value: 230 }, maxTriggers: 5, material: { text: "山札からサブカードを2枚引く。", effect: { kind: "drawSubCards", count: 2 } } },
      { id: "goku", name: "獄", type: "main", rarity: 3, text: "相手に1300ダメージ。相手の山札から最大10枚を勝手に相手の墓地へ送る。", effect: { kind: "damageDeckToGrave", value: 1300, count: 10 } },
      { id: "en3",  name: "焔", type: "main", rarity: 3, text: "相手に2000ダメージと前のターンで受けたダメージを与える。また、相手に「火傷」を2層付与する。", effect: { kind: "damagePlusLastTaken", base: 2000 } },
      { id: "kitsune", name: "狐", type: "main", rarity: 3, text: "前のターンで出したカードの効果を再び発動させる。", effect: { kind: "repeatLastMain" } },
      { id: "goku2", name: "極", type: "main", rarity: 3, text: "自身の残り手札を即座に破棄させ、☆3カードが引けるまで山札からカードを最大数まで引く（☆3カードが引けたらそこで引きが止まる）。もし☆3カードが引けなかった場合、また手札を全て破棄させカードを引き直す。☆3カードが引けた場合、極の効果で引いたカードの枚数×300のダメージを相手に与える。", effect: { kind: "trialDraw", multiplier: 300 } },
      { id: "kai5", name: "回", type: "main", rarity: 3, text: "1%の確率で5000ダメージを与える。使用者の残りHPが1%減るごとに発動確率が1%上がる。", effect: { kind: "hpScaledChance", value: 5000, baseChance: 1 } },
      { id: "urami",name: "怨", type: "sub",  rarity: 3, duration: 4, text: "メインやサブでダメージを与えた時、追加で360ダメージを与える。4ターン継続。", effect: { kind: "bonusDamage", value: 360 }, material: { text: "2000ダメージを与える。", effect: { kind: "damage", value: 2000 } } },
      { id: "ki3",  name: "防", type: "sub",  rarity: 3, text: "相手からの全てのダメージを防ぐ。3回発動後に破棄。", effect: { kind: "blockMulti" }, maxTriggers: 3, material: { text: "メインの効果が再び発動する。", effect: { kind: "repeatSelf" } } },
      { id: "shin2",name: "真", type: "sub",  rarity: 3, text: "合成する度に相手に780ダメージを与える。4回発動後に破棄。", effect: { kind: "synthTriggerDamage", value: 780 }, maxTriggers: 4, material: { text: "山札からカードを最大7枚まで引く。", effect: { kind: "drawUpTo", count: 7 } } },
      // ── コインデッキ専用カード ──
      { id: "ame",   name: "雨", type: "main", rarity: 1, text: "相手に430ダメージを与える。", effect: { kind: "damage", value: 430 } },
      { id: "ishi2", name: "石", type: "main", rarity: 1, text: "相手に200ダメージを与える。", effect: { kind: "damage", value: 200 } },
      { id: "dou2",  name: "銅", type: "main", rarity: 1, text: "山札からサブカードを1枚引く。", effect: { kind: "drawSubCards", count: 1 } },
      { id: "namari",name: "鉛", type: "main", rarity: 1, text: "相手に330ダメージを与える。また、相手に「猛毒」を1層付与する。", effect: { kind: "damage", value: 330 } },
      { id: "en4",   name: "円", type: "main", rarity: 1, text: "コインを10枚獲得する。", effect: { kind: "gainCoinFlat", coin: 10 } },
      { id: "yuu2",  name: "融", type: "main", rarity: 1, text: "HPを保有するコイン総数×2の数値分回復する。", effect: { kind: "healByCoinCount", multiplier: 2 } },
      { id: "zeni",  name: "銭", type: "sub",  rarity: 1, duration: 3, text: "相手に140ダメージを与え、コインを3枚獲得する。3ターン継続。", effect: { kind: "turnDamageGainCoin", damage: 140, coin: 3 } },
      { id: "sumi",  name: "炭", type: "sub",  rarity: 1, duration: 4, text: "相手に110ダメージを与える。4ターン継続。", effect: { kind: "turnDamage", value: 110 } },
      { id: "ri2",   name: "利", type: "sub",  rarity: 1, duration: 2, text: "保有するコイン総数の10%にあたるコインを獲得する。2ターン継続。", effect: { kind: "turnGainCoinPercent", percent: 10 } },
      { id: "rai",   name: "雷", type: "main", rarity: 2, text: "相手に820ダメージを与え、相手のサブフィールドに「痺」を1枚召喚する。", effect: { kind: "damageSummonSub", value: 820, summonKey: "shibi" } },
      { id: "yuki",  name: "雪", type: "main", rarity: 2, text: "相手に650ダメージを与え、相手のサブフィールドに「寒」を1枚召喚する。また、相手に「悪寒」を2層付与する。", effect: { kind: "damageSummonSub", value: 650, summonKey: "kan3" } },
      { id: "shisan",name: "資", type: "main", rarity: 2, text: "現在保有するコイン総数×4のダメージを与える。", effect: { kind: "coinCountDamage", multiplier: 4 } },
      { id: "zai",   name: "財", type: "main", rarity: 2, text: "現在保有するコイン総数の30%にあたるコインを獲得する。", effect: { kind: "coinGainPercent", percent: 30 } },
      { id: "bai3",  name: "売", type: "main", rarity: 2, text: "自身の手札を全て破棄する。破棄したカードの☆の合計数×5のコインを獲得する。", effect: { kind: "discardHandGainCoin", multiplier: 5 } },
      { id: "oni",  name: "鬼", type: "main", rarity: 2, text: "相手に960ダメージ。手札の枚数分、追加で100ダメージ。", effect: { kind: "handCountDamage", base: 960, perCard: 100 } },
      { id: "kama",  name: "釜", type: "main", rarity: 2, text: "相手に750ダメージを与える。自身か相手のサブフィールドに「炭」がある場合、1250ダメージとなり「炭」を即座に破棄させる。", effect: { kind: "damageConditionalDestroySumi", base: 750, boosted: 1250 } },
      { id: "oroshi",name: "卸", type: "main", rarity: 2, text: "自身と相手のサブフィールドにあるサブカードを全て破棄し、破棄したカードの☆の合計数×3のコインを獲得する。", effect: { kind: "destroyAllSubsBothGainCoin", multiplier: 3 } },
      { id: "kumo",  name: "雲", type: "sub",  rarity: 2, text: "雨・雷・雪・晴のカードをメインに出した時、そのカードの与えるダメージを2倍にする。1回発動後に破棄。", effect: { kind: "doubleNextWeatherMain" }, maxTriggers: 1 },
      { id: "kichi", name: "吉", type: "sub",  rarity: 2, duration: 3, text: "相手に310ダメージを与え、コインを5枚獲得する。3ターン継続。", effect: { kind: "turnDamageGainCoin", damage: 310, coin: 5 } },
      { id: "azuke", name: "預", type: "sub",  rarity: 2, duration: 3, text: "3ターン後に破棄。破棄される時、保有するコイン総数の40%にあたるコインを獲得する。", effect: { kind: "coinOnDiscard", percent: 40 } },
      { id: "gin2",  name: "銀", type: "sub",  rarity: 2, duration: 3, text: "受けたダメージ100につきコインを2枚獲得する。3ターン継続。", effect: { kind: "damageToCoinTick", per: 100, coin: 2 } },
      { id: "kai6",  name: "怪", type: "sub",  rarity: 2, duration: 4, text: "相手に230ダメージを与える。4ターン継続。自身のHPが半分以下の時、340ダメージとなる。", effect: { kind: "turnDamageConditionalHp", base: 230, boosted: 340 } },
      { id: "kagayaki", name: "晴", type: "main", rarity: 3, text: "相手に1200ダメージを与える。相手のサブフィールドにあるサブカードを全て破壊する。", effect: { kind: "damageDestroyAllSubs", value: 1200 } },
      { id: "kin",   name: "金", type: "main", rarity: 3, text: "山札からカードを3枚引き、コインを100枚獲得する。", effect: { kind: "drawGainCoin", count: 3, coin: 100 } },
      { id: "takara",name: "宝", type: "main", rarity: 3, text: "HPを800回復し、コインを100～200枚ランダムで獲得する。", effect: { kind: "healGainCoinRandom", heal: 800, min: 100, max: 200 } },
      { id: "kyou3", name: "京", type: "main", rarity: 3, text: "保有するコイン総数×10のダメージを与える。", effect: { kind: "coinCountDamage", multiplier: 10 } },
      { id: "fuku",  name: "福", type: "main", rarity: 3, text: "HPを1400回復する。山札から☆3のカードを2枚引く（山札から引けない場合は墓地から引く）。", effect: { kind: "healDrawRarity3", heal: 1400, count: 2 } },
      { id: "toku",  name: "得", type: "main", rarity: 3, text: "現在のショップに並んでいるカード3枚を無料で入手する（手札がいっぱいになった場合はその分を山札へ送る）。その後ショップを更新する。", effect: { kind: "freeShopHaul" } },
      { id: "kou3",  name: "鉱", type: "sub",  rarity: 3, duration: 8, text: "保有するコイン総数の5%にあたるコインを獲得する。8ターン継続。1ターン経つごとに+2%される。何らかの形で早期に破棄された場合、50コインを獲得する。", effect: { kind: "turnGainCoinPercentEscalating", basePercent: 5, increment: 2, earlyBonus: 50 } },
      { id: "kujira",name: "鯨", type: "sub",  rarity: 3, duration: 3, text: "相手に960ダメージを与える。3ターン継続。残りのサブフィールドが全て埋まっている場合、1380ダメージとなる。", effect: { kind: "turnDamageConditionalFullSubs", base: 960, boosted: 1380 } },
      // ── ビーコンデッキ専用カード ──
      { id: "jou",  name: "剰", type: "main", rarity: 1, text: "手札にあるカードのうち1枚にビーコン（確率でトラブル含む）を最大3つ付与する。", effect: { kind: "beaconSelfHandOne" } },
      { id: "shou2",name: "少", type: "main", rarity: 1, text: "相手に500ダメージ。50%の確率で手札にあるカード1枚にビーコン（確率でトラブル含む）を1つ付与する。", effect: { kind: "damageBeaconChance", value: 500 } },
      { id: "buta", name: "豚", type: "main", rarity: 1, text: "相手に440ダメージを与える。", effect: { kind: "damage", value: 440 } },
      { id: "shina", name: "品", type: "main", rarity: 1, text: "相手に110ダメージを3回連続で与える。", effect: { kind: "multiDamage", value: 110, hits: 3 } },
      { id: "kon2", name: "混", type: "main", rarity: 1, text: "手札にあるカードについた全てのビーコンを別のランダムなビーコン(確率でトラブルも含む)に入れ替える。", effect: { kind: "mixAllHandBeacons" } },
      { id: "roku2",name: "録", type: "main", rarity: 1, text: "手札にあるカードのうち1枚にビーコン「粘着」を1つ付与する。☆3のカードが優先的に選ばれる。", effect: { kind: "stickyBeaconOne" } },
      { id: "tsubu", name: "粒", type: "sub", rarity: 1, duration: 4, text: "相手に90ダメージを与える。4ターン継続。", effect: { kind: "turnDamage", value: 90 } },
      { id: "maki2",name: "撒", type: "sub",  rarity: 1, duration: 4, text: "手札にあるカード1枚にランダムなビーコン（確率でトラブルも含む）を1つ付与する。4ターン継続。", effect: { kind: "turnBeaconGrantOne" } },
      { id: "sei3", name: "清", type: "sub", rarity: 1, duration: 3, text: "自身の手札に付いたトラブルビーコンを1つだけ排除する。3ターン継続。", effect: { kind: "turnPurgeOneTrouble" } },
      { id: "yo",   name: "与", type: "main", rarity: 2, text: "手札にある全てのカードにノーマルビーコンを1つ付与する。", effect: { kind: "beaconAllHandNormal" } },
      { id: "jo2",  name: "除", type: "main", rarity: 2, text: "カードについたトラブルビーコンを全て排除し、排除した個数×200のダメージを与える。山札・墓地のカードも対象。", effect: { kind: "purgeTroubleBeacons" } },
      { id: "ten2", name: "転", type: "main", rarity: 2, text: "手札にあるカードに付いたノーマルビーコンをランダムなトラブルビーコンに、トラブルビーコンをランダムなノーマルビーコンに入れ替える。", effect: { kind: "swapBeaconTypes" } },
      { id: "kezu", name: "削", type: "main", rarity: 2, text: "相手の手札にあるカードのビーコンを全て排除し、排除したビーコン数×100のダメージを与える。", effect: { kind: "purgeAllBeaconsHand" } },
      { id: "tsuki", name: "月", type: "main", rarity: 2, text: "950ダメージを与える。30%の確率で相手の手札1枚にビーコン「汚染」を1つ付与する。また、自身に「月照」を1層付与する。", effect: { kind: "damageChancePollution", value: 950, chance: 0.3 } },
      { id: "todoroki", name: "轟", type: "main", rarity: 2, text: "相手に380ダメージを3回与える。", effect: { kind: "multiDamage", value: 380, hits: 3 } },
      { id: "sai2", name: "再", type: "main", rarity: 2, text: "手札にあるカード1枚に「リロード」ビーコンを1つ付与する。☆3のカードが優先的に付与される。", effect: { kind: "reloadBeaconOne" } },
      { id: "hou2", name: "鳳", type: "main", rarity: 2, text: "手札にあるカード1枚に「ブースト」ビーコンを1つ付与する。☆3のカードが優先的に付与される。", effect: { kind: "boostBeaconOne" } },
      { id: "ken2", name: "健", type: "sub",  rarity: 2, duration: 2, text: "手札にあるカード1～3枚にノーマルビーコンを1つ付与する。2ターン継続。", effect: { kind: "turnBeaconGrantMulti" } },
      { id: "fu2", name: "付", type: "sub", rarity: 2, duration: 3, text: "メインカードでダメージを与える度に、自身の手札1枚にノーマルビーコンを付与する。3ターン継続。", effect: { kind: "grantBeaconOnMainDamage" } },
      { id: "yume", name: "夢", type: "sub", rarity: 2, duration: 3, text: "このカードをサブフィールドに出した時、HPを5000回復する。3ターン後に破棄。理由問わず破棄された時、自身は5000のダメージを受ける。", effect: { kind: "healOnPlaceSelfDamageOnDiscard", heal: 5000, selfDamage: 5000 } },
      { id: "den", name: "電", type: "sub", rarity: 2, duration: 2, text: "このカードがサブフィールドにある間、相手からのトラブルビーコン付与を全て防ぐ。2ターン継続。", effect: { kind: "blockTroubleGrant" } },
      { id: "hen3", name: "変", type: "sub", rarity: 2, text: "このカードはサブフィールドにある時、次にメインフィールドに出されたカードに変身し、変身したまま破棄され墓地にいく（1回発動後に破棄）。以後このカードは変身先のカードとして扱われる。", effect: { kind: "transformIntoNextMain" }, maxTriggers: 1 },
      { id: "kyuu3",name: "救", type: "main", rarity: 3, text: "山札からカードを4枚引き、自身の山札にある全てのカードにノーマルビーコンを1～2つ付与する。", effect: { kind: "beaconDeckAllNormal" } },
      { id: "han2", name: "犯", type: "main", rarity: 3, text: "相手に999ダメージ与え、相手の手札にある全てのカードにトラブルビーコンを1～2つ付与する。", effect: { kind: "damageAndTroubleBeaconHand", value: 999 } },
      { id: "hako", name: "箱", type: "main", rarity: 3, text: "相手に1000ダメージ与え、自身と相手は山札からカードを2枚引く。自身が引いたカードには「ギフト」ビーコンを1つ、相手が引いたカードにはトラブルビーコンを2つ付与する。", effect: { kind: "damageDrawGiftTrouble", value: 1000 } },
      { id: "a3", name: "亜", type: "main", rarity: 3, text: "手札にあるカードのビーコン数×400のダメージを相手に与える。このカードは山札にある時から常にノーマルビーコンが確定で3つ付与されている（墓地に行くたびにビーコンは変わる）。また、自身に「月照」を1層付与する。", effect: { kind: "handBeaconCountDamage", multiplier: 400 } },
      { id: "miyabi", name: "雅", type: "main", rarity: 3, text: "相手に1500ダメージを与え、自身のサブフィールドにノーマルビーコンが3つ付与された「和」を召喚する。", effect: { kind: "damageSummonWa", value: 1500 } },
      { id: "so3", name: "麤", type: "main", rarity: 3, text: "相手に1330ダメージ与え、自身はノーマルビーコンが1つ付与された「鹿」を最大7枚（手札に）獲得する。", effect: { kind: "gainShikaCards", value: 1330, max: 7 } },
      { id: "nou", name: "脳", type: "sub", rarity: 3, duration: 4, text: "相手に640ダメージを与え、相手の手札1枚にトラブルビーコンを1つ付与する。4ターン継続。", effect: { kind: "turnDamageTroubleBeacon", value: 640 } },
      { id: "chou2", name: "超", type: "sub", rarity: 3, duration: 2, text: "相手に1000ダメージを与える。2ターン継続。このカードをサブフィールドに出した時、手札にあるカードに付いたトラブルビーコンを全て排除する。", effect: { kind: "turnDamagePurgeOnPlace", value: 1000 } },
      // ---- アルカナデッキ ----
      { id: "tsuru",  name: "吊", type: "main", rarity: 1, text: "相手に190ダメージを与え、「アルカナ」を3層付与する。", effect: { kind: "damageAndArcana", value: 190, arcana: 3 } },
      { id: "gu",     name: "愚", type: "main", rarity: 1, text: "相手に350ダメージを与え、相手のアルカナを起爆させる。", effect: { kind: "damageAndDetonateArcana", value: 350 } },
      { id: "hie",    name: "冷", type: "main", rarity: 1, text: "相手に220ダメージを与え、「悪寒」を2層付与する。", effect: { kind: "damageAndStatus", value: 220, status: "chill", amount: 2 } },
      { id: "surudo", name: "鋭", type: "main", rarity: 1, text: "相手に410ダメージを与え、「出血」を1層付与する。", effect: { kind: "damageAndStatus", value: 410, status: "shukketsu", amount: 1 } },
      { id: "abura",  name: "油", type: "main", rarity: 1, text: "相手に「油」を1層付与する。", effect: { kind: "applyStatusOnly", status: "oil", amount: 1 } },
      { id: "osu",    name: "押", type: "main", rarity: 1, text: "相手のアルカナを起爆させる。", effect: { kind: "detonateOpponentArcanaOnly" } },
      { id: "hiku",   name: "引", type: "main", rarity: 1, text: "山札からカードを2枚引き、自身のアルカナを起爆させる。", effect: { kind: "drawThenSelfDetonateArcana", drawCount: 2 } },
      { id: "ki4",    name: "気", type: "sub", rarity: 1, duration: 3, text: "他カードの与えるダメージ+5%。3ターン継続。", effect: { kind: "auraDamageBuff", pct: 5 } },
      { id: "yashi",  name: "養", type: "sub",  rarity: 1, duration: 3, text: "自身のHPを180回復する。3ターン継続。", effect: { kind: "healOverTime", value: 180 } },
      { id: "yaku",   name: "厄", type: "main", rarity: 2, text: "相手に「火傷」、「悪寒」、「猛毒」、「脆弱」、「出血」の中から3〜5つをランダムで付与する。", effect: { kind: "randomAilments", min: 3, max: 5 } },
      { id: "sen3",   name: "占", type: "main", rarity: 2, text: "相手に「アルカナ」を6〜12層ランダムで付与する。", effect: { kind: "randomArcana", min: 6, max: 12 } },
      { id: "kohru",  name: "凍", type: "main", rarity: 2, text: "相手に「悪寒」を4層付与する。この付与によって相手が凍結した場合、追加で1000ダメージを与える。", effect: { kind: "chillWithFreezeBonus", amount: 4, bonus: 1000 } },
      { id: "kegare", name: "穢", type: "main", rarity: 2, text: "相手に「猛毒」を10層付与する。", effect: { kind: "applyStatusOnly", status: "toxin", amount: 10 } },
      { id: "yamai",  name: "病", type: "main", rarity: 2, text: "相手に「猛毒」を4層、「脆弱」を2層付与する。", effect: { kind: "applyMultiStatus", statuses: [{ status: "toxin", amount: 4 }, { status: "fragile", amount: 2 }] } },
      { id: "kizu",   name: "傷", type: "main", rarity: 2, text: "相手に650ダメージを与え、「出血」を3層付与する。", effect: { kind: "damageAndStatus", value: 650, status: "shukketsu", amount: 3 } },
      { id: "kotoba", name: "言", type: "main", rarity: 2, text: "相手に「アルカナ」を5層付与する。その後相手のアルカナを起爆させる。", effect: { kind: "arcanaThenDetonate", amount: 5 } },
      { id: "otsu",   name: "乙", type: "main", rarity: 2, text: "相手に720ダメージを与える。サブフィールドに「甲」がある時、与えるダメージは1120となり、相手のアルカナを起爆させる。", effect: { kind: "otsuKabutoCombo", value: 720, comboValue: 1120 } },
      { id: "some",   name: "染", type: "main", rarity: 2, text: "自身に付与されている状態異常を相手にも付与する。但し「アルカナ」「赫呪」は移されない。また、この付与で自身に付与された状態異常が消えることはない。", effect: { kind: "mirrorStatusToOpponent", exclude: ["arcana", "sekiju"] } },
      { id: "sou3",   name: "掃", type: "main", rarity: 2, text: "自身に付与された状態異常（栄光、月照を除く）を除去する。", effect: { kind: "clearOwnStatusExceptGloryMoonlit" } },
      { id: "chikara",name: "力", type: "sub", rarity: 2, duration: 2, text: "他カードの与えるダメージ+15%。2ターン継続。", effect: { kind: "auraDamageBuff", pct: 15 } },
      { id: "kabuto", name: "甲", type: "sub",  rarity: 2, duration: 3, text: "相手に250ダメージを与える。3ターン継続。メインフィールドに「乙」が出された時、次に与えるダメージが650に強化される。この強化は1回のみ適応される。", effect: { kind: "turnDamage", value: 250 } },
      { id: "dai",    name: "代", type: "sub",  rarity: 2, text: "相手のアルカナが起爆した時、その層数は半減しなくなる。1回発動後に破棄。", effect: { kind: "noHalfArcana" }, maxTriggers: 1 },
      { id: "kurai",  name: "昏", type: "main", rarity: 3, text: "相手に「アルカナ」を20層付与する。その後、相手のアルカナを起爆させる。", effect: { kind: "arcanaThenDetonate", amount: 20 } },
      { id: "mukuro", name: "骸", type: "main", rarity: 3, text: "相手に「火傷」、「悪寒」、「猛毒」、「脆弱」、「出血」の中から5〜8つをランダムで付与する。その後、相手に付与されている状態異常の種類数×400のダメージを与える。", effect: { kind: "randomAilmentsThenTypeDamage", min: 5, max: 8, perType: 400 } },
      { id: "sakae",  name: "栄", type: "main", rarity: 3, text: "相手に1300ダメージを与える。また、自身に「栄光」を1層付与する。", effect: { kind: "damageAndSelfStatus", value: 1300, status: "glory", amount: 1 } },
      { id: "kaku",   name: "赫", type: "main", rarity: 3, text: "相手に1000ダメージを与え、手札に「蒼」を1枚加える。また、自身に「赫呪」を1層付与する。", effect: { kind: "damageAddAoAndSekiju", value: 1000 } },
      { id: "akari",  name: "灯", type: "main", rarity: 3, text: "相手に「油」を付与し、自身は山札からカードを3枚引く。相手に炎上が付与されている場合、更に2200ダメージを与える。", effect: { kind: "oilDrawEnjouBonus", drawCount: 3, bonus: 2200 } },
      { id: "metsu",  name: "滅", type: "main", rarity: 3, text: "相手に付与されたアルカナを除く各状態異常の合計層数分×100のダメージを与え、合計層数分アルカナの層数を増加させる。その後、アルカナ以外の状態異常を全て除去させる。", effect: { kind: "consumeStatusForDamageAndArcana", perStack: 100 } },
      { id: "teru",   name: "照", type: "sub", rarity: 3, duration: 4, text: "山札からカードを1〜2枚引き、そのカードにノーマルビーコンを1つ付与する。4ターン継続。また、自身に「月照」を1層付与する。このカードが破棄された時、追加で「月照」を3層付与する。", effect: { kind: "teruDraw" } },
      { id: "noroi",  name: "呪", type: "sub",  rarity: 3, duration: 4, text: "相手に480ダメージを与え、「火傷」、「悪寒」、「猛毒」、「脆弱」、「出血」の中から1〜2つをランダムで付与する。4ターン継続。このカードが破棄された時、相手に「アルカナ」を6層付与する。", effect: { kind: "turnDamageRandomAilmentsDiscardArcana", value: 480, min: 1, max: 2, arcanaOnDiscard: 6 } }, 
      // ---- その他デッキ（ミッション報酬専用。いずれのデッキにも属さず、デッキ効果の対象外） ----
      { id: "ja2",  name: "邪", type: "main", rarity: 2, text: "デッキに編成されたサブの枚数×150のダメージを相手に与える。", effect: { kind: "subCountDamage", base: 0, perSub: 150, useDeckManifest: true } },
      { id: "you3", name: "妖", type: "main", rarity: 2, text: "相手に920ダメージを与え、山札からカードを1枚引く。", effect: { kind: "damageDraw", value: 920, drawCount: 1 } },
      { id: "yoru", name: "夜", type: "sub", rarity: 2, text: "☆2のメインカードを出した時、相手に620ダメージを与え、山札からカードを2枚引く。この時引いた2枚のカードそれぞれにノーマルビーコンを2つ付与する。2回発動後に破棄。", effect: { kind: "onRarity2MainBonus", value: 620, drawCount: 2 }, maxTriggers: 2 },
      { id: "ryu2", name: "龍", type: "main", rarity: 3, text: "相手に2000ダメージを与える。手札が2枚以下の時に使用した場合、与えるダメージは4000となる。", effect: { kind: "conditionalHandDamage", value: 2000, altValue: 4000, altMaxHand: 2 } },
      { id: "nou2", name: "能", type: "main", rarity: 3, text: "デッキに編成された☆1のカードの枚数×300のダメージを与える。", effect: { kind: "deckRarity1CountDamage", multiplier: 300 } },
      { id: "gekoku", name: "克", type: "main", rarity: 3, text: "自身に「革命」を10層付与し、山札から☆1カードを３枚引く。", effect: { kind: "gekokuRevolution", revolutionAmount: 10, drawRarity: 1, drawCount: 3 } },
      // ---- その他デッキ（ショップ交換専用カード） ----
      { id: "nami",   name: "波", type: "main", rarity: 1, text: "相手に200ダメージを3回与える。", effect: { kind: "multiDamage", value: 200, hits: 3 } },
      { id: "kobushi",name: "拳", type: "main", rarity: 1, text: "相手に450ダメージを与える。50％の確率で追加で250ダメージを与える。", effect: { kind: "damageChanceBonus", base: 450, chance: 0.5, bonus: 250 } },
      { id: "kage",   name: "影", type: "main", rarity: 2, text: "相手に670ダメージを与え、相手の山札にあるランダムなカード3枚にトラブルビーコンを３つずつ付与する。", effect: { kind: "damageTroubleBeaconDeck", value: 670, targets: 3, stacks: 3 } },
      { id: "kin2",   name: "菌", type: "sub", rarity: 2, duration: 3, text: "HPを500回復しながら、相手には500ダメージを与える。３ターン継続。また、相手に「猛毒」を1層付与する。", effect: { kind: "healAndTurnDamage", heal: 500, value: 500 } },
      { id: "rin",    name: "凛", type: "main", rarity: 3, text: "相手に1200ダメージを与える。自身の手札にあるランダムなメインカード1枚の効果を追加で発動させる（☆３優先。発動したカードは破棄されない）。", effect: { kind: "damageReplayRandomMain", value: 1200 } },
      { id: "katsu",  name: "活", type: "main", rarity: 2, text: "コストを10獲得する。", effect: { kind: "gainElementCost", value: 10 } },
      { id: "kyou",   name: "強", type: "sub",  rarity: 2, text: "次に出すメインカードの与えるダメージ+30％。1回発動後に破棄。", effect: { kind: "nextMainDamageBoost", pct: 30 }, maxTriggers: 1 },
      { id: "kagayaki2", name: "輝", type: "main", rarity: 3, text: "コストを20獲得し、サブフィールドに「光」を最大数まで召喚する。", effect: { kind: "gainElementCostAndSummon", value: 20, summonKey: "hikari" } },
      { id: "shitsu", name: "疾", type: "main", rarity: 3, text: "自身のHPが90％以上の時、相手に2400ダメージを与え、コストを９獲得する。90％以下の場合は800ダメージを与え、山札からカードを2枚引く。", effect: { kind: "shitsuAdaptive", highValue: 2400, lowValue: 800 } },
      { id: "taki",   name: "滝", type: "main", rarity: 1, text: "相手に320ダメージを与える。サブフィールドにあるサブの枚数分、追加で140ダメージを与える。", effect: { kind: "damagePerFieldSub", base: 320, perSub: 140 } },
      { id: "nagi",   name: "凪", type: "sub", rarity: 1, duration: 3, text: "HP1000のバリアを展開する。３ターン継続。", effect: { kind: "hpBarrier", value: 1000 } },
      { id: "mei",    name: "冥", type: "main", rarity: 2, text: "HPを800回復し、墓地にあるカードを全て山札に戻す。", effect: { kind: "healAndGraveToDeckAll", heal: 800 } },
      { id: "sakura", name: "桜", type: "sub", rarity: 2, duration: 5, text: "HPを390回復する。5ターン継続。理由問わず破棄された時、相手に1000ダメージを与える。", effect: { kind: "healOverTimeDamageOnDiscard", value: 390, discardDamage: 1000 } },
      { id: "tai2",   name: "耐", type: "sub", rarity: 3, duration: 4, text: "HP5000のバリアを展開する。４ターン継続。（バリアがある間、受けるダメージは全てバリアが受け止めてくれる。ダメージでバリアが破壊された時、超越分は普通にくらってしまう）", effect: { kind: "hpBarrier", value: 5000 } },
      { id: "arai",     name: "洗", type: "main", rarity: 1, text: "自身のHPを200回復する。また、自身に付与された状態異常を全て除去する。", effect: { kind: "healAndClearAllStatus", value: 200 } },
      { id: "sou4",     name: "葬", type: "main", rarity: 2, text: "自身の山札にある☆1～2カードの内、最大6枚を墓地に送る。", effect: { kind: "deckSendLowRarityToGrave", maxRarity: 2, count: 6 } },
      { id: "sawa",     name: "爽", type: "sub",  rarity: 2, duration: 30, text: "自身のHPを100回復する。30ターン継続。ターンが経過する度に回復量＋10。", effect: { kind: "healOverTimeEscalating", value: 100, growth: 10 } },
      { id: "geki",     name: "撃", type: "main", rarity: 3, text: "相手に3200ダメージを与える。ただし自身の残り手札とサブフィールドにあるサブ全てを破棄する。", effect: { kind: "damageDiscardHandAndSubs", value: 3200 } },
      { id: "akatsuki", name: "暁", type: "main", rarity: 3, text: "相手に1500ダメージを与える。墓地にあるカードの枚数分、与えるダメージ＋3％。また、サブフィールドに「盾」を1枚召喚する。", effect: { kind: "damageGraveScaleSummonShield", value: 1500, percentPerGrave: 0.03, summonId: "tate" } },
      // ---- その他デッキ（スペシャルガチャ限定カード） ----
      { id: "mikado", name: "帝", type: "main", rarity: 3,
        text: "発動しているデッキ効果に応じて性能が変わる。スタンダード：1500ダメージ＋HP3000回復／ナンバー：2000ダメージ＋墓地のカードを山札へ戻す／キング：サブ枚数×600ダメージ（王がいなければ即サーチ）／トリック：1600〜2400の乱数ダメージを2回／シンセサイズ：1000ダメージ（合成カードなら合成元のもう片方の効果を再発動）／コイン：777ダメージ＋コイン200枚獲得／ビーコン：編成された☆3全てにランダムなスペシャルビーコンを1つ付与し、☆3を1枚引く／アルカナ：相手に「火傷」、「悪寒」、「猛毒」、「脆弱」、「出血」の中から10つ付与し、その後アルカナを起爆させる／デッキ効果なし：3000ダメージ。",
        effect: { kind: "mikadoAdaptive" }, gachaExclusive: true },
      { id: "kirameki", name: "煌", type: "main", rarity: 3,
        text: "デッキに編成されていない☆3カードを2枚山札に、1枚を手札に加える。この効果で加えたカードは墓地に行かない。",
        effect: { kind: "kiramekiFetch" }, gachaExclusive: true },
      { id: "katana", name: "刀", type: "main", rarity: 3,
        text: "相手に2100ダメージを与える。『刃』を自身のサブフィールドに1枚召喚し、『斬』を手札に1枚加える。",
        effect: { kind: "katanaStrike", value: 2100 }, gachaExclusive: true },
      { id: "gen", name: "幻", type: "sub", rarity: 3, duration: 4,
        text: "相手に680ダメージを与える。4ターン継続。このカードがサブフィールドに存在する間、他カードによる「○○%の確率で～」の効果は100%必ず発動するようになる。",
        effect: { kind: "genIllusion", value: 680 }, gachaExclusive: true },
   ];

    // 特殊召喚カード（山札に存在しない・各種メイン/サブ効果でのみ場に呼び出される。図鑑では最下部「召喚カード」区分に表示）
    const SPECIAL_CARDS = {
      wood:   { id: "wood",   name: "木", type: "sub", rarity: 1, duration: 2,
        text: "相手に350ダメージを与える。2ターン継続。",
        effect: { kind: "turnDamage", value: 350 }, noGrave: true, summonOnly: true },
      poison: { id: "poison", name: "毒", type: "sub", rarity: 2, duration: 3,
        text: "自身が680ダメージを受ける。3ターン継続。",
        effect: { kind: "poisonTick", value: 680 }, noGrave: true, summonOnly: true },
      egg:    { id: "egg",    name: "卵", type: "sub", rarity: 2, duration: 3,
        text: "3ターン後に自動破棄。破棄された時、山札からカードを7枚引く。",
        effect: { kind: "eggBurst" }, noGrave: true, summonOnly: true },
      guest:  { id: "guest",  name: "客", type: "sub", rarity: 2, duration: 4,
        text: "自身が100～300の乱数ダメージを受ける。4ターン継続。",
        effect: { kind: "guestTick", min: 100, max: 300 }, noGrave: true, summonOnly: true },
      shibi:  { id: "shibi",  name: "痺", type: "sub", rarity: 2, duration: 2,
        text: "自身は310ダメージ受ける。2ターン継続。このサブカードがある間、自身は新たにサブカードを置くことができなくなる。",
        effect: { kind: "selfDamageBlockSubs", value: 310 }, noGrave: true, summonOnly: true },
      kan3:   { id: "kan3",   name: "寒", type: "sub", rarity: 1, duration: 4,
        text: "自身は180ダメージ受ける。4ターン継続。また、召喚された時、自身に「悪寒」を1層付与する。",
        effect: { kind: "selfDamageTick", value: 180 }, noGrave: true, summonOnly: true },
      wa:     { id: "wa",     name: "和", type: "sub", rarity: 3, duration: 3,
        text: "相手に500ダメージ与え、自身の全ての手札にノーマルビーコンを1つ付与する。3ターン継続。",
        effect: { kind: "waTurnEffect", value: 500 }, noGrave: true, summonOnly: true },
      shika:  { id: "shika",  name: "鹿", type: "main", rarity: 1,
        text: "相手に330ダメージ与える。手札に「鹿」が複数ある場合、それらも同時に使用してまとめてダメージを与える。",
        effect: { kind: "shikaGroupDamage", value: 330 }, noGrave: true, summonOnly: true },
      ao:     { id: "ao",     name: "蒼", type: "main", rarity: 3,
        text: "相手に2000ダメージを与え、自身に付与された「赫呪」を層数分「蒼呪」に変換する。",
        effect: { kind: "aoConvertSekijuToSoju", value: 2000 }, noGrave: true, summonOnly: true },
      hikari: { id: "hikari", name: "光", type: "sub", rarity: 3, duration: 2,
        text: "自ターン終了時にコストを3獲得する。2ターン継続。",
        effect: { kind: "lightPresence", costGain: 3 }, noGrave: true, summonOnly: true },
      ha:     { id: "ha",     name: "刃", type: "sub", rarity: 3, duration: 99,
        text: "99ターン継続。お互いのターンが終わるたびに経過ターン+1。",
        effect: { kind: "haBlade" }, noGrave: true, summonOnly: true },
      zan:    { id: "zan",    name: "斬", type: "main", rarity: 3,
        text: "相手に500+（『刃』の経過ターン×400）のダメージを与える。その後、『刃』を破棄する。",
        effect: { kind: "zanSlash", base: 500, perTurn: 400 }, noGrave: true, summonOnly: true },
    };

    // メインカードidが「シンセサイズ」デッキ由来かどうかの判定用リスト（合成対象の絞り込みに使用）
    const SYNTHESIZE_MAIN_IDS = ["jun","kugi","kuru","same","hou","moe","kai3","goku","yama","ran2","sube","koku","tanu","en3","kitsune","goku2","kai5"];
    const SYNTHESIZE_SUB_IDS = ["kiba","tsum","tetsu","kai4","you2","suna","sou","sen2","rei","gan","tsui","urami","ki3","shin2"];

    // コインデッキ専用カードid一覧（雲の対象「雨・雷・雪・輝」の判定などに使用）
    const COIN_WEATHER_MAIN_IDS = ["ame", "rai", "yuki", "kagayaki"];

    // コインレベルの必要ゲージ量（累積）と、レベルごとの回復・強化倍率
    const COIN_LEVEL_THRESHOLDS = [0, 16, 64, 196]; // Lv1,2,3,4に到達するための累積ゲージ量
    const COIN_HEAL_VALUES = [100,200, 400, 600];
    const COIN_BUFF_MULTIPLIERS = [1.2, 1.5, 1.8, 2];
    // ☆ごとの価格帯とレベル別販売確率（レベル1〜4）
    const COIN_SHOP_RARITY_INFO = {
      1: { priceMin: 5,  priceMax: 15, chance: [80, 60, 35, 10] },
      2: { priceMin: 20, priceMax: 30, chance: [20, 35, 55, 70] },
      3: { priceMin: 40, priceMax: 50, chance: [0, 5, 10, 20] },
    };

    const MAX_HP = 20000;
    const MAX_HAND = 7;
    const SUB_LIMIT = 3; // デフォルト値（デッキ効果がない場合の基準）

    // ============================================================
    // デッキ効果（選択したデッキによる固有ボーナス）
    // ============================================================
    const DECK_EFFECTS = {
      standard: { label: "最大HP +5000",         hpBonus: 5000, subLimitBonus: 0, discardLimit: 1, hasDice: false },
      number:   { label: "捨て札が1ターン2枚まで", hpBonus: 0,    subLimitBonus: 0, discardLimit: 2, hasDice: false },
      king:     { label: "サブフィールド上限 6枚", hpBonus: 0,    subLimitBonus: 3, discardLimit: 1, hasDice: false },
      trick:    { label: "サイコロ（1ターン1回・全6回まで）", hpBonus: 0, subLimitBonus: 0, discardLimit: 1, hasDice: true },
      mechanic: { label: "合成スペース（メイン最大2枚＋サブ素材1枚）", hpBonus: 0, subLimitBonus: 0, discardLimit: 1, hasDice: false, hasSynthSpace: true },
      coin: { label: "コインスペース（ダメージでコイン獲得、回復・強化・購入）", hpBonus: 0, subLimitBonus: 0, discardLimit: 1, hasDice: false, hasCoinSpace: true },
      beacon: { label: "山札から引いたカードは30%の確率でビーコンが1つ付与される", hpBonus: 0, subLimitBonus: 0, discardLimit: 1, hasDice: false, hasBeaconDraw: true },
      arcana: { label: "開始時、相手に「アルカナ」を5層付与する", hpBonus: 0, subLimitBonus: 0, discardLimit: 1, hasDice: false, grantsArcanaStart: true },
      select:   { label: "なし", hpBonus: 0, subLimitBonus: 0, discardLimit: 1, hasDice: false },
      random:   { label: "なし", hpBonus: 0, subLimitBonus: 0, discardLimit: 1, hasDice: false },
      none:     { label: "発動中のデッキ効果なし", hpBonus: 0, subLimitBonus: 0, discardLimit: 1, hasDice: false },
    };

    // ============================================================
    // ビーコンデッキ：ビーコン定義
    // ============================================================
    // type: "normal" | "trouble"  / slot: "main" | "sub"（メインカード用・サブカード用のプール）
    const BEACON_DEFS = {
      dmgUp1:   { id: "dmgUp1",   icon: "💪",  type: "normal",  slot: "main", label: "ダメージⅠ", desc: "相手に200ダメージを与える。" },
      dmgUp2:   { id: "dmgUp2",   icon: "⚔️",  type: "normal",  slot: "main", label: "ダメージⅡ", desc: "相手に500ダメージを与える。" },
      heal1:    { id: "heal1",    icon: "♥️",  type: "normal",  slot: "main", label: "回復Ⅰ", desc: "自身のHPを300回復する。" },
      heal2:    { id: "heal2",    icon: "💖",  type: "normal",  slot: "main", label: "回復Ⅱ", desc: "自身のHPを600回復する。" },
      draw1:    { id: "draw1",    icon: "🍬",  type: "normal",  slot: "main", label: "ドローⅠ", desc: "山札からカードを1枚引く。" },
      draw2:    { id: "draw2",    icon: "🍭",  type: "normal",  slot: "main", label: "ドローⅡ", desc: "山札からカードを2枚引く。" },
      seal:     { id: "seal",     icon: "🚫",  type: "normal",  slot: "main", label: "禁止", desc: "相手は次のターンでサブカードが置けなくなる。" },
      sticky:   { id: "sticky",   icon: "🛡️",  type: "normal",  slot: "main", label: "粘着", desc: "破棄された時、このカードに付いた「粘着」以外の他のビーコンは剝がれずに残る。" },
      shock1:   { id: "shock1",   icon: "🦾",  type: "normal",  slot: "sub",  label: "衝撃Ⅰ", desc: "このカードをサブフィールドに置いた時、相手に250ダメージを与える。" },
      shock2:   { id: "shock2",   icon: "🗡️",  type: "normal",  slot: "sub",  label: "衝撃Ⅱ", desc: "このカードをサブフィールドに置いた時、相手に500ダメージを与える。" },
      cure1:    { id: "cure1",    icon: "💕",  type: "normal",  slot: "sub",  label: "治療Ⅰ", desc: "このカードをサブフィールドに置いた時、自身はHPを300回復する。" },
      cure2:    { id: "cure2",    icon: "💗",  type: "normal",  slot: "sub",  label: "治療Ⅱ", desc: "このカードをサブフィールドに置いた時、自身はHPを600回復する。" },
      follow:   { id: "follow",   icon: "🤝",  type: "normal",  slot: "sub",  label: "追従", desc: "このカードがサブフィールドにある間、毎ターン相手に150ダメージ与える。" },
      regene:   { id: "regene",   icon: "💊",  type: "normal",  slot: "sub",  label: "リジェネ", desc: "カードがサブフィールドにある間、毎ターンHPを100回復する。" },
      stickySub:{ id: "stickySub",icon: "🛡️",  type: "normal",  slot: "sub",  label: "粘着", desc: "破棄された時、このカードに付いた「粘着」以外の他のビーコンは剝がれずに残る。" },
      counter:  { id: "counter",  icon: "🪞",  type: "normal",  slot: "sub",  label: "カウンター", desc: "このカードが破棄された時、相手に600ダメージ。" },
      dmgDown1: { id: "dmgDown1", icon: "🔵",  type: "trouble", slot: "main", label: "ダメージダウンⅠ", desc: "このカードの与えるダメージ-300。" },
      dmgDown2: { id: "dmgDown2", icon: "🧿",  type: "trouble", slot: "main", label: "ダメージダウンⅡ", desc: "このカードの与えるダメージ-700。" },
      send1:    { id: "send1",    icon: "🌀",  type: "trouble", slot: "main", label: "転送Ⅰ", desc: "自身の手札にあるランダムなカード1枚が墓地へ送られる。" },
      send2:    { id: "send2",    icon: "💥",  type: "trouble", slot: "main", label: "転送Ⅱ", desc: "自身の手札にある全てのカードが墓地へ送られる。" },
      selfDmg:  { id: "selfDmg",  icon: "💀",  type: "trouble", slot: "main", label: "自傷", desc: "自身が800ダメージ受ける。" },
      blankMain:{ id: "blankMain",icon: "📜",  type: "trouble", slot: "main", label: "白紙", desc: "このカードの効果が無効になる。" },
      refuseMain:{id: "refuseMain",icon:"✖️", type: "trouble", slot: "main", label: "拒否", desc: "このカードが手札にある間、他のカードをフィールドに出すことができなくなる(同じ「拒否」ビーコンが付いたカードは出せる)。" },
      burn1:    { id: "burn1",    icon: "🔥",  type: "trouble", slot: "sub",  label: "火傷Ⅰ", desc: "このカードをサブフィールドに置いた時、自身は300ダメージ受ける。" },
      burn2:    { id: "burn2",    icon: "❤️‍🔥", type: "trouble", slot: "sub",  label: "火傷Ⅱ", desc: "このカードをサブフィールドに置いた時、自身は600ダメージ受ける。" },
      shockSelf:{ id: "shockSelf",icon: "⚡",  type: "trouble", slot: "sub",  label: "感電", desc: "このカードがサブフィールドにある間、自身は毎ターン120ダメージ受ける。" },
      aid:      { id: "aid",      icon: "🤡",  type: "trouble", slot: "sub",  label: "利敵", desc: "このカードがサブフィールドにある間、相手は毎ターンHPを300回復する。" },
      blankSub: { id: "blankSub", icon: "📜",  type: "trouble", slot: "sub",  label: "白紙", desc: "このカードの効果が無効になる。" },
      refuseSub:{ id: "refuseSub",icon: "✖️",  type: "trouble", slot: "sub",  label: "拒否", desc: "このカードが手札にある間、他のカードをフィールドに出すことができなくなる(同じ「拒否」ビーコンが付いたカードは出せる)。" },
      pollutionMain:{ id: "pollutionMain", icon: "☣️", type: "trouble", slot: "main", label: "汚染", desc: "このカードを出した時、残りの手札にあるカード全てに「汚染」ビーコン以外のトラブルビーコンを1つ付与する。" },
      pollutionSub: { id: "pollutionSub",  icon: "☣️", type: "trouble", slot: "sub",  label: "汚染", desc: "このカードを出した時、残りの手札にあるカード全てに「汚染」ビーコン以外のトラブルビーコンを1つ付与する。" },
      corrode:  { id: "corrode",  icon: "🧪",  type: "trouble", slot: "sub",  label: "腐食", desc: "このカードがサブフィールドにある間、自身は他のサブカードを出せなくなる。" },
      // ── コスト系ビーコン（エレメントコストに作用） ──
      costGain1:  { id: "costGain1",  icon: "⭐",  type: "normal",  slot: "main", label: "コストⅠ", desc: "コストを3獲得する。" },
      costGain2:  { id: "costGain2",  icon: "🌟",  type: "normal",  slot: "main", label: "コストⅡ", desc: "コストを6獲得する。" },
      costDrain:  { id: "costDrain",  icon: "✨",  type: "normal",  slot: "sub",  label: "コストドレイン", desc: "設置時、相手からコストを5奪う。奪ったコスト分、自身はコストを獲得する。" },
      dmgBuffAura:{ id: "dmgBuffAura",icon: "🏹",  type: "normal",  slot: "sub",  label: "ダメージバフ", desc: "このカードがサブフィールドにある間、他のカードの与えるダメージ+10％。" },
      costLost:   { id: "costLost",   icon: "📉",  type: "trouble", slot: "main", label: "ロスト", desc: "コストを6失う。" },
      dmgDebuffAura:{ id: "dmgDebuffAura", icon: "🎭", type: "trouble", slot: "sub", label: "ダメージデバフ", desc: "このカードがサブフィールドにある間、他のカードの与えるダメージ-20％。" },
      // スペシャルビーコン：ノーマル／トラブルとは別枠。grantBeacon()のランダム抽選では選ばれず、専用カード効果でのみ付与される。
      reload:   { id: "reload",   icon: "🔁",  type: "special", slot: "any",  label: "リロード", desc: "このカードの効果は再び発動する。" },
      gift:     { id: "gift",     icon: "🎁",  type: "special", slot: "any",  label: "ギフト", desc: "このカードをフィールドに出した時、手札にあるカード全てにノーマルビーコンを1つ付与する。" },
      boost:    { id: "boost",    icon: "🐦‍🔥", type: "special", slot: "any",  label: "ブースト", desc: "このカードの与えるダメージ（ビーコン含む）は常に全て2倍となる。" },
    };
    const BEACON_POOL = {
      main:    { normal: ["dmgUp1","dmgUp2","heal1","heal2","draw1","draw2","seal","sticky","costGain1","costGain2"],
                 trouble: ["dmgDown1","dmgDown2","send1","send2","selfDmg","blankMain","refuseMain","pollutionMain","costLost"] },
      sub:     { normal: ["shock1","shock2","cure1","cure2","follow","regene","stickySub","counter","costDrain","dmgBuffAura"],
                 trouble: ["burn1","burn2","shockSelf","aid","blankSub","refuseSub","pollutionSub","corrode","dmgDebuffAura"] },
    };
    const BEACON_MAX = 3;

    // ============================================================
    // 状態異常システム
    // ============================================================
    const STATUS_DEFS = {
      burn:    { id: "burn",    icon: "🔥", label: "火傷", cap: 10, protectedFromClear: false,
                 desc: "与えるダメージ-5%（層ごとに加算）。10層まで。" },
      chill:   { id: "chill",   icon: "❄️", label: "悪寒", cap: 5, protectedFromClear: false,
                 desc: "自身のターンに、最大HPの1%×層数のダメージを受ける。5層まで。6層に達すると「凍結」に変化する。" },
      frozen:  { id: "frozen",  icon: "🧊", label: "凍結", cap: 1, protectedFromClear: false,
                 desc: "自身のターンに、最大HPの10%のダメージを受け、そのターンをスキップする。発動後に除去される。" },
      toxin:   { id: "toxin",   icon: "🍄", label: "猛毒", cap: 30, protectedFromClear: false,
                 desc: "自身のターンに、層数×50のダメージを受ける。30層まで。また30%の確率で層+1。" },
      fragile: { id: "fragile", icon: "💔", label: "脆弱", cap: 10, protectedFromClear: false,
                 desc: "受けるダメージ+5%（層ごとに加算）。10層まで。" },
      glory:   { id: "glory",   icon: "⚜️", label: "栄光", cap: 5, protectedFromClear: true,
                 desc: "与えるダメージ+10%（層ごとに加算）。5層まで。" },
      moonlit: { id: "moonlit", icon: "🌙", label: "月照", cap: 8, protectedFromClear: true,
                 desc: "ビーコンの付いたカードを出す度に層+1。8層まで。8層に達すると、即座に相手へ2000ダメージを与え、層が1にリセットされる。" },
      arcana:  { id: "arcana",  icon: "🔮", label: "アルカナ", cap: 99, protectedFromClear: true,
                 desc: "毎ターン経過する度に層+1。アルカナ以外の状態異常が付与される度に、その付与された層数分だけ増加する。99層まで。特定のカード効果によって起爆され、層数×100のダメージを受けた後、層数が半減する。99層に達した場合、即座に起爆する。" },
      sekiju:  { id: "sekiju",  icon: "🔴", label: "赫呪", cap: 10, protectedFromClear: true,
                 desc: "毎ターン経過する度に200ダメージを受け、層+1（層数が増えてもダメージ量は変動しない）。10層まで。" },
      soju:    { id: "soju",    icon: "🔵", label: "蒼呪", cap: 99, protectedFromClear: true,
                 desc: "自身のターンごとにHPを500回復する。毎ターン経過する度に層-1（層数が減っても回復量は変動しない）。層数が0になると消失する。" },
      shukketsu: { id: "shukketsu", icon: "🩸", label: "出血", cap: 10, protectedFromClear: false,
                 desc: "カードによってダメージを受ける度に、追加で100ダメージ×層数を受ける。10層まで。" },
      oil:     { id: "oil",     icon: "🤎", label: "油", cap: 1, protectedFromClear: false,
                 desc: "付与先に「火傷」がある場合、代わりに「炎上」となる。付与先が既に「炎上」状態の場合、この油は効果を発揮せず不発となる。" },
      enjou:   { id: "enjou",   icon: "❤️‍🔥", label: "炎上", cap: 1, protectedFromClear: false,
                 desc: "付与時および自身のターンごとに、500ダメージ＋「火傷」の層数×50ダメージを受ける。一度付与されると基本的に永続する（自然には消失しない）。" },
      revolution: { id: "revolution", icon: "🚩", label: "革命", cap: 99, protectedFromClear: false,
                 desc: "☆１カードの与えるダメージ+300％。☆２カード及び☆３カードの与えるダメージ－50％。毎ターン経過する度に層-1。層数が0になると消失する。" },
    };
    const STATUS_ORDER = ["burn", "chill", "frozen", "toxin", "fragile", "shukketsu", "oil", "enjou", "sekiju", "soju", "glory", "moonlit", "arcana", "revolution"];
    // 厄・骸・帝(アルカナ)などが「合計n個」ランダム付与する際の対象状態異常プール
    const RANDOM_AILMENT_POOL = ["burn", "chill", "toxin", "fragile", "shukketsu"];

    // アルカナ連動：既にアルカナが付与されている場合、アルカナ以外の状態異常が付与される度に、その付与された層数分アルカナも増加する
    function bumpArcanaOnOtherStatus(owner, amount) {
      if (!owner.status) return;
      const current = owner.status.arcana || 0;
      if (current > 0 && amount > 0) {
        const next = Math.min(STATUS_DEFS.arcana.cap, current + amount);
        if (next !== current) {
          owner.status.arcana = next;
          log(`「アルカナ」🔮が連動して${amount}層増加した（現在${next}層）。`, "strong");
          checkArcanaCapDetonate(owner);
        }
      }
    }

    // 状態異常を付与する（chillの6層目→凍結への変化、moonlitの8層目の即時発動を内包）
    function applyStatus(owner, key, amount = 1) {
      if (amount <= 0) return;
      owner.status = owner.status || {};
      const def = STATUS_DEFS[key];
      if (!def) return;
      // 装備品『熱い心』：「凍結」による効果を無効化する
      if (key === "frozen" && hasEquip(owner, "hotheart")) {
        log(`${owner.label}の『熱い心』❤️‍🔥が「凍結」🧊を無効化した。`, "good");
        return;
      }
      if (key === "chill") {
        const next = (owner.status.chill || 0) + amount;
        if (next >= 6 && hasEquip(owner, "hotheart")) {
          owner.status.chill = def.cap;
          log(`${owner.label}の「悪寒」❄️が6層に達したが、『熱い心』❤️‍🔥が「凍結」🧊への変化を無効化した。`, "good");
        } else if (next >= 6) {
          owner.status.chill = 0;
          owner.status.frozen = 1;
          log(`${owner.label}の「悪寒」❄️が6層に達し、「凍結」🧊に変化した！`, "strong");
        } else {
          owner.status.chill = next;
          log(`${owner.label}に「悪寒」❄️が${amount}層付与された（現在${owner.status.chill}層）。`, "strong");
        }
        bumpArcanaOnOtherStatus(owner, amount);
        return;
      }
      if (key === "moonlit") {
        let next = (owner.status.moonlit || 0) + amount;
        if (next >= def.cap) {
          owner.status.moonlit = def.cap;
          log(`${owner.label}の「月照」🌙が${def.cap}層に達した！`, "strong");
          const target = opponentOf(owner);
          const hit = applyDamage(owner, target, 2000, `状態異常「月照」🌙の発動`, false, false, "moonlit");
          if (hit) {
            applyMirrorOnce(owner, target, 2000);
            equipOnMoonlitDamage(owner); // 装備品『月の模型』：月照のダメージ発生時にHP回復
          }
          owner.status.moonlit = 1;
        } else {
          owner.status.moonlit = next;
        }
        bumpArcanaOnOtherStatus(owner, amount);
        return;
      }
      if (key === "sekiju") {
        const next = Math.min(def.cap, (owner.status.sekiju || 0) + amount);
        owner.status.sekiju = next;
        log(`${owner.label}に「赫呪」🔴が付与された（現在${next}層）。`, "strong");
        bumpArcanaOnOtherStatus(owner, amount);
        return;
      }
      if (key === "soju") {
        const next = (owner.status.soju || 0) + amount;
        owner.status.soju = next;
        log(`${owner.label}に「蒼呪」🔵が${amount}層付与された（現在${next}層）。`, "good");
        bumpArcanaOnOtherStatus(owner, amount);
        return;
      }
      if (key === "oil") {
        if (getStatusStack(owner, "enjou") > 0) {
          log(`${owner.label}は既に「炎上」❤️‍🔥状態のため、「油」🤎は不発に終わった。`, "strong");
        } else if (getStatusStack(owner, "burn") > 0) {
          log(`${owner.label}は「火傷」状態のため、「油」🤎は「炎上」❤️‍🔥に変化した！`, "strong");
          applyStatus(owner, "enjou", 1);
        } else {
          owner.status.oil = 1;
          log(`${owner.label}に「油」🤎が付与された。`, "strong");
          bumpArcanaOnOtherStatus(owner, amount);
        }
        return;
      }
      if (key === "enjou") {
        owner.status.enjou = 1;
        owner.status.oil = 0;
        const burnStack = getStatusStack(owner, "burn");
        const dmg = 500 + burnStack * 50;
        owner.hp = Math.max(0, owner.hp - dmg);
        log(`${owner.label}は「炎上」❤️‍🔥で${dmg}ダメージを受けた。`, "strong");
        queueAilmentPopup(owner, dmg, "enjou");
        checkWin();
        bumpArcanaOnOtherStatus(owner, amount);
        return;
      }
      if (key === "arcana") {
        const next = Math.min(def.cap, (owner.status.arcana || 0) + amount);
        owner.status.arcana = next;
        log(`${owner.label}に「アルカナ」🔮が${amount}層付与された（現在${next}層）。`, "strong");
        checkArcanaCapDetonate(owner);
        return;
      }
      owner.status[key] = Math.min(def.cap, (owner.status[key] || 0) + amount);
      log(`${owner.label}に「${def.label}」${def.icon}が${amount}層付与された（現在${owner.status[key]}層）。`, "strong");
      // 油が先に付与されている場合も、後から火傷が付いた時点で炎上へ変化させる
      if (key === "burn" && getStatusStack(owner, "oil") > 0 && getStatusStack(owner, "enjou") <= 0) {
        owner.status.enjou = 1;
        owner.status.oil = 0;
        const dmg = 500 + getStatusStack(owner, "burn") * 50;
        owner.hp = Math.max(0, owner.hp - dmg);
        log(`${owner.label}は「油」🤎と「火傷」🔥により「炎上」❤️‍🔥へ変化し、${dmg}ダメージを受けた。`, "strong");
        queueAilmentPopup(owner, dmg, "enjou");
        checkWin();
      }
      bumpArcanaOnOtherStatus(owner, amount);
    }

    // アルカナが上限（99層）に達した場合、即座に起爆させる
    function checkArcanaCapDetonate(owner) {
      if (!owner.status) return;
      if ((owner.status.arcana || 0) >= STATUS_DEFS.arcana.cap) {
        log(`「アルカナ」🔮が上限（${STATUS_DEFS.arcana.cap}層）に達し、即座に起爆する！`, "strong");
        detonateArcana(opponentOf(owner), owner);
      }
    }

    // アルカナを起爆する：層数×100のダメージを与え、その後層数を半減する（『代』の効果があれば半減しない）
    function detonateArcana(owner, target) {
      const stack = getStatusStack(target, "arcana");
      if (stack <= 0) {
        log(`${target.label}に「アルカナ」🔮が付与されていないため、起爆は不発に終わった。`);
        return;
      }
      const dmg = stack * 100;
      log(`${target.label}の「アルカナ」🔮（${stack}層）が起爆した！`, "strong");
      const hit = applyDamage(owner, target, dmg, `「アルカナ」🔮の起爆`, false, false, "arcana");
      if (hit) applyMirrorOnce(owner, target, dmg);
      const dai = (owner !== target && owner.subs) ? owner.subs.find(s => s.effect.kind === "noHalfArcana") : null;
      if (dai) {
        log(`『代』の効果により、「アルカナ」🔮は半減しなかった！`, "strong");
        moveSubToGrave(owner, dai, "効果を発動");
      } else {
        target.status.arcana = Math.floor(stack / 2);
        log(`${target.label}の「アルカナ」🔮は${target.status.arcana}層に半減した。`, "strong");
      }
    }

    // 火傷・悪寒・猛毒・脆弱・出血からランダムに合計count層を配分して付与する（厄・骸・帝アルカナ等で共用）
    function applyRandomAilments(owner, count) {
      for (let i = 0; i < count; i++) {
        const key = RANDOM_AILMENT_POOL[Math.floor(Math.random() * RANDOM_AILMENT_POOL.length)];
        applyStatus(owner, key, 1);
      }
    }

    // 状態異常を全て除去する（includeProtected=trueで栄光・月照も含めて除去）
    function clearStatusEffects(owner, includeProtected = false) {
      if (!owner.status) return;
      STATUS_ORDER.forEach(key => {
        if (!includeProtected && STATUS_DEFS[key].protectedFromClear) return;
        owner.status[key] = 0;
      });
    }

    // 壊専用：通常は除去できない栄光・月照・アルカナ・赫呪・蒼呪だけを狙って破壊する
    function clearProtectedStatusOnly(owner) {
      if (!owner.status) return;
      owner.status.glory = 0;
      owner.status.moonlit = 0;
      owner.status.sekiju = 0;
      owner.status.soju = 0;
    }

    function getStatusStack(owner, key) {
      return (owner.status && owner.status[key]) || 0;
    }

    // カードにビーコンが付いている場合、月照の層を進める（メイン使用・サブ設置の両方で呼ばれる）
    // ※月照は「月」「亜」など専用カードの効果で最初に付与されるまでは発生しない
    //   （その前にビーコン付きカードを出しても月照は付与されない）
    function checkMoonlitOnCardPlay(owner, card) {
      if (getStatusStack(owner, "moonlit") <= 0) return;
      if (card.beacons && card.beacons.length > 0) {
        applyStatus(owner, "moonlit", 1);
      }
    }

    // 状態異常の自身ターン処理（悪寒・猛毒など）：resolveSubEffects内から毎ターン1回呼ばれる
    // ※凍結（frozen）はここではなく、startPlayerTurn/runAITurnの開始時に判定される（自身のターンそのものをスキップするため）
    function tickStatusEffects(owner) {
      if (!owner.status) return;
      const maxHp = getMaxHP(owner);
      if (owner.status.chill > 0) {
        const dmg = Math.round(maxHp * 0.01 * owner.status.chill);
        owner.hp = Math.max(0, owner.hp - dmg);
        log(`${owner.label}は「悪寒」❄️（${owner.status.chill}層）で${dmg}ダメージを受けた。`, "strong");
        queueAilmentPopup(owner, dmg, "chill");
        checkWin();
      }
      if (owner.status.toxin > 0) {
        const dmg = owner.status.toxin * 50;
        owner.hp = Math.max(0, owner.hp - dmg);
        log(`${owner.label}は「猛毒」🍄（${owner.status.toxin}層）で${dmg}ダメージを受けた。`, "strong");
        queueAilmentPopup(owner, dmg, "toxin");
        checkWin();
        if (Math.random() < 0.30) {
          owner.status.toxin = Math.min(STATUS_DEFS.toxin.cap, owner.status.toxin + 1);
          log(`「猛毒」🍄が自然に1層増加した（現在${owner.status.toxin}層）。`, "strong");
        }
      }
      if (owner.status.enjou > 0) {
        const dmg = 500 + getStatusStack(owner, "burn") * 50;
        owner.hp = Math.max(0, owner.hp - dmg);
        log(`${owner.label}は「炎上」❤️‍🔥で${dmg}ダメージを受けた。`, "strong");
        queueAilmentPopup(owner, dmg, "enjou");
        checkWin();
      }
      // アルカナ：毎ターン経過する度に層+1
      if (owner.status.arcana > 0) {
        owner.status.arcana = Math.min(STATUS_DEFS.arcana.cap, owner.status.arcana + 1);
        log(`「アルカナ」🔮が自然に1層増加した（現在${owner.status.arcana}層）。`, "strong");
        checkArcanaCapDetonate(owner);
      }
      // 赫呪：毎ターン経過する度に200ダメージを受け、層+1（層数が増えてもダメージ量は変動しない）
      if (owner.status.sekiju > 0) {
        owner.hp = Math.max(0, owner.hp - 200);
        log(`${owner.label}は「赫呪」🔴で200ダメージを受けた。`, "strong");
        queueAilmentPopup(owner, 200, "sekiju");
        checkWin();
        owner.status.sekiju = Math.min(STATUS_DEFS.sekiju.cap, owner.status.sekiju + 1);
        log(`「赫呪」🔴が自然に1層増加した（現在${owner.status.sekiju}層）。`, "strong");
      }
      // 蒼呪：自身のターンごとにHPを500回復し、その後に層-1。0になると消失する
      if (owner.status.soju > 0) {
        healHp(owner, 500);
        log(`${owner.label}は「蒼呪」🔵でHPを500回復した。`, "good");
        owner.status.soju -= 1;
        if (owner.status.soju <= 0) {
          owner.status.soju = 0;
          log(`「蒼呪」🔵が消失した。`, "strong");
        } else {
          log(`「蒼呪」🔵が自然に1層減少した（現在${owner.status.soju}層）。`, "strong");
        }
      }
      // 革命：毎ターン経過する度に層-1。0になると消失する
      if (owner.status.revolution > 0) {
        owner.status.revolution -= 1;
        if (owner.status.revolution <= 0) {
          owner.status.revolution = 0;
          log(`「革命」🚩が消失した。`, "strong");
        } else {
          log(`「革命」🚩が自然に1層減少した（現在${owner.status.revolution}層）。`, "strong");
        }
      }
    }

    function renderStatusRow(owner, container) {
      if (!container) return;
      container.innerHTML = "";
      if (!owner.status) return;
      STATUS_ORDER.forEach(key => {
        const stack = owner.status[key] || 0;
        if (stack <= 0) return;
        const def = STATUS_DEFS[key];
        const badge = document.createElement("span");
        badge.className = "status-badge";
        badge.title = `${def.label}：${def.desc}`;
        badge.textContent = def.icon;
        if (stack > 1) {
          const stackEl = document.createElement("span");
          stackEl.className = "status-stack";
          stackEl.textContent = stack;
          badge.appendChild(stackEl);
        }
        container.appendChild(badge);
      });
    }


    function hasStickyBeacon(card) {
      return !!(card.beacons && (card.beacons.includes("sticky") || card.beacons.includes("stickySub")));
    }
    function hasBlankBeacon(card) {
      return !!(card.beacons && (card.beacons.includes("blankMain") || card.beacons.includes("blankSub")));
    }
    function hasRefuseBeacon(card) {
      return !!(card.beacons && (card.beacons.includes("refuseMain") || card.beacons.includes("refuseSub")));
    }

    // 拒否ビーコン：手札に「拒否」持ちのカードがある間、それ以外のカードをフィールドに出せなくする
    // (拒否持ちのカード同士は出し合える)
    function isPlayBlockedByRefuseBeacon(owner, card) {
      const hasLocker = owner.hand.some(c => c.instanceId !== card.instanceId && hasRefuseBeacon(c));
      if (!hasLocker) return false;
      return !hasRefuseBeacon(card);
    }

    // 破棄時のビーコン整理：「粘着」が付いていれば粘着ビーコン自身だけを剝がし、他は残す。
    // 粘着が付いていなければ全て剝がす。
    function stripBeaconsOnGrave(card) {
      if (!card.beacons || card.beacons.length === 0) return;
      if (hasStickyBeacon(card)) {
        card.beacons = card.beacons.filter(b => b !== "sticky" && b !== "stickySub");
      } else {
        card.beacons = [];
      }
    }

    // カードにビーコンを1つ付与する(同じビーコンは重複不可、最大3つ)。troubleChanceでトラブル抽選確率を指定。
    function grantBeacon(card, troubleChance = 0.3) {
      if (!card || !card.beacons) card.beacons = [];
      if (card.beacons.length >= BEACON_MAX) return null;
      const slot = card.type === "main" ? "main" : "sub";
      // 凸：『玖』1凸 - このカードにはトラブルビーコンが付与されない
      const isTrouble = card._noTroubleBeacon ? false : Math.random() < troubleChance;
      const pool = (isTrouble ? BEACON_POOL[slot].trouble : BEACON_POOL[slot].normal)
        .filter(id => !card.beacons.includes(id));
      if (pool.length === 0) return null;
      const chosen = pool[Math.floor(Math.random() * pool.length)];
      card.beacons.push(chosen);
      return chosen;
    }

    function grantNormalBeacon(card) {
      return grantBeacon(card, 0);
    }

    // 汚染：トラブルビーコンを付与するが「汚染」自身は選ばれない
    function grantTroubleBeaconExcludingPollution(card) {
      if (!card || !card.beacons) card.beacons = [];
      if (card.beacons.length >= BEACON_MAX) return null;
      // 凸：『玖』1凸 - このカードにはトラブルビーコンが付与されない
      if (card._noTroubleBeacon) return null;
      const slot = card.type === "main" ? "main" : "sub";
      const pool = BEACON_POOL[slot].trouble.filter(id => id !== "pollutionMain" && id !== "pollutionSub" && !card.beacons.includes(id));
      if (pool.length === 0) return null;
      const chosen = pool[Math.floor(Math.random() * pool.length)];
      card.beacons.push(chosen);
      return chosen;
    }

    // 汚染：カードを出した時、残りの手札全てに「汚染」以外のトラブルビーコンを1つ付与
    function applyPollutionBeacon(owner) {
      let count = 0;
      for (const c of owner.hand) {
        if (grantTroubleBeaconExcludingPollution(c)) count++;
      }
      if (count > 0) log(`ビーコン「汚染」☣️：${owner.label}の手札${count}枚にトラブルビーコンが付与された。`, "strong");
    }

    // ギフト：カードを出した時、手札全てにノーマルビーコンを1つ付与
    function applyGiftBeacon(owner) {
      let count = 0;
      for (const c of owner.hand) {
        if (grantNormalBeacon(c)) count++;
      }
      if (count > 0) log(`ビーコン「ギフト」🎁：${owner.label}の手札${count}枚にノーマルビーコンが付与された。`, "good");
    }

    function clearBeacons(card) {
      if (!card.beacons || card.beacons.length === 0) return;
      card.beacons = [];
    }

    // 転：カード1枚のノーマル⇔トラブルビーコンを入れ替える（スペシャルビーコンは対象外）
    function swapBeaconTypesOnCard(card) {
      if (!card.beacons || card.beacons.length === 0) return 0;
      const slot = card.type === "main" ? "main" : "sub";
      let changed = 0;
      const newBeacons = [];
      for (const b of card.beacons) {
        const def = BEACON_DEFS[b];
        if (def.type === "normal") {
          const pool = BEACON_POOL[slot].trouble.filter(id => !newBeacons.includes(id));
          if (pool.length > 0) { newBeacons.push(pool[Math.floor(Math.random() * pool.length)]); changed++; }
          else newBeacons.push(b);
        } else if (def.type === "trouble") {
          const pool = BEACON_POOL[slot].normal.filter(id => !newBeacons.includes(id));
          if (pool.length > 0) { newBeacons.push(pool[Math.floor(Math.random() * pool.length)]); changed++; }
          else newBeacons.push(b);
        } else {
          newBeacons.push(b); // スペシャルビーコンは対象外
        }
      }
      card.beacons = newBeacons;
      return changed;
    }

    // 混：カードに付いた全てのビーコンを、別のランダムなビーコン（確率でトラブルも含む）に入れ替える
    function rerollAllBeaconsOnCard(card) {
      if (!card.beacons || card.beacons.length === 0) return 0;
      const count = card.beacons.filter(b => BEACON_DEFS[b].type !== "special").length;
      const specials = card.beacons.filter(b => BEACON_DEFS[b].type === "special");
      card.beacons = [...specials];
      let changed = 0;
      for (let i = 0; i < count; i++) {
        if (grantBeacon(card, 0.3)) changed++;
      }
      return changed;
    }

    // 電：このプレイヤーが相手からのトラブルビーコン付与を防いでいるか判定
    function isTroubleGrantBlocked(owner) {
      return owner.subs.some(s => s.effect.kind === "blockTroubleGrant");
    }

    // ドロー時のビーコン付与判定(ビーコンデッキ専用、30%)
    function maybeAssignBeaconOnDraw(owner, card) {
      if (card.id === "a3") {
        if (!card.beacons || card.beacons.length < 3) assignThreeNormalBeacons(card);
        return;
      }
      // エレメント「風」（強化版）：効果中に引いたカードにノーマルビーコンを1〜2つ付与
      if (owner._elementWindBeaconTurns > 0) {
        const count = 1 + Math.floor(Math.random() * 2);
        for (let i = 0; i < count; i++) grantNormalBeacon(card);
      }
      if (!getDeckEffect(owner).hasBeaconDraw) return;
      if (chanceRoll(0.3)) {
        const granted = grantBeacon(card, 0.35);
        if (granted) log(`${owner.label}が引いた『${card.name}』にビーコン「${BEACON_DEFS[granted].label}」${BEACON_DEFS[granted].icon}が付与された。`);
      }
    }

    function hasBlankBeaconKind(card, slot) {
      const key = slot === "main" ? "blankMain" : "blankSub";
      return !!(card.beacons && card.beacons.includes(key));
    }
    function hasStickyBeaconKind(card, slot) {
      const key = slot === "main" ? "sticky" : "stickySub";
      return !!(card.beacons && card.beacons.includes(key));
    }

    function computeMainBeaconDmgMod(card) {
      if (!card.beacons || card.beacons.length === 0) return 0;
      let mod = 0;
      if (card.beacons.includes("dmgDown1")) mod -= 300;
      if (card.beacons.includes("dmgDown2")) mod -= 700;
      return mod;
    }

    // メインカードのビーコン効果（ダメージ増減以外）：使用時に発動する
    function applyMainBeaconTriggers(owner, card) {
      if (!card.beacons || card.beacons.length === 0) return;
      if (hasBlankBeaconKind(card, "main")) return;
      const target = opponentOf(owner);
      for (const b of card.beacons) {
        if (b === "dmgUp1") {
          applyDamage(owner, target, 200, `『${card.name}』のビーコン「ダメージⅠ」💪`, false, true);
        } else if (b === "dmgUp2") {
          applyDamage(owner, target, 500, `『${card.name}』のビーコン「ダメージⅡ」⚔️`, false, true);
        } else if (b === "heal1") {
          healHp(owner, 300);
          log(`ビーコン「回復Ⅰ」♥️：${owner.label}のHPを300回復した。`, "good");
        } else if (b === "heal2") {
          healHp(owner, 600);
          log(`ビーコン「回復Ⅱ」💖：${owner.label}のHPを600回復した。`, "good");
        } else if (b === "draw1") {
          const d = drawCards(owner, 1);
          owner.hand.push(...d);
          log(`ビーコン「ドローⅠ」🍬：${owner.label}が${d.length}枚ドローした。`, "good");
        } else if (b === "draw2") {
          const d = drawCards(owner, 2);
          owner.hand.push(...d);
          log(`ビーコン「ドローⅡ」🍭：${owner.label}が${d.length}枚ドローした。`, "good");
        } else if (b === "seal") {
          target._subBlockedNextTurn = true;
          log(`ビーコン「禁止」🚫：${target.label}は次のターン、サブカードを置けなくなった。`);
        } else if (b === "selfDmg") {
          owner.hp = Math.max(0, owner.hp - 800);
          log(`ビーコン「自傷」💀：${owner.label}が800ダメージを受けた。`, "strong");
          checkWin();
        } else if (b === "send1") {
          if (owner.hand.length > 0) {
            const idx = Math.floor(Math.random() * owner.hand.length);
            const [sent] = owner.hand.splice(idx, 1);
            owner.grave.push(sent);
            log(`ビーコン「転送Ⅰ」🌀：${owner.label}の『${sent.name}』が墓地へ送られた。`);
          }
        } else if (b === "send2") {
          if (owner.hand.length > 0) {
            log(`ビーコン「転送Ⅱ」💥：${owner.label}の手札${owner.hand.length}枚が全て墓地へ送られた。`);
            owner.grave.push(...owner.hand);
            owner.hand = [];
          }
        } else if (b === "pollutionMain") {
          applyPollutionBeacon(owner);
        } else if (b === "gift") {
          applyGiftBeacon(owner);
        } else if (b === "costGain1") {
          owner.elementCost = Math.min(ELEMENT_COST_MAX, (owner.elementCost || 0) + 3);
          log(`ビーコン「コストⅠ」⭐：${owner.label}はコストを3獲得した。`, "good");
        } else if (b === "costGain2") {
          owner.elementCost = Math.min(ELEMENT_COST_MAX, (owner.elementCost || 0) + 6);
          log(`ビーコン「コストⅡ」🌟：${owner.label}はコストを6獲得した。`, "good");
        } else if (b === "costLost") {
          owner.elementCost = Math.max(0, (owner.elementCost || 0) - 6);
          log(`ビーコン「ロスト」📉：${owner.label}はコストを6失った。`, "strong");
        }
      }
    }

    const DICE_MAX_USES = 6; // 対戦を通して振れる総回数

    function hasDiceEffect(owner) {
      return !!getDeckEffect(owner).hasDice;
    }

    function getDeckEffect(owner) {
      return DECK_EFFECTS[owner.deckId] || DECK_EFFECTS.standard;
    }

    function getMaxHP(owner) {
      const deckIds = (owner.deckManifest || owner.deck || []).map(card => card.id || card);
      const subtotal = MAX_HP + getDeckEffect(owner).hpBonus + levelHpBonusForDeck(deckIds, owner.isAI);
      return subtotal + equipHpBonus(owner.equip, subtotal, deckIds);
    }

    function getSubLimit(owner) {
      return SUB_LIMIT + getDeckEffect(owner).subLimitBonus;
    }

    function getDiscardLimit(owner) {
      return getDeckEffect(owner).discardLimit;
    }

    const els = {
      playerHand: document.getElementById("playerHand"),
      aiHand: document.getElementById("aiHand"),
      playerSubs: document.getElementById("playerSubs"),
      aiSubs: document.getElementById("aiSubs"),
      playerMainDrop: document.getElementById("playerMainDrop"),
      playerSubDrop: document.getElementById("playerSubDrop"),
      aiMain: document.getElementById("aiMain"),
      playerSynthZone: document.getElementById("playerSynthZone"),
      playerCoinZone: document.getElementById("playerCoinZone"),
      playerCoinCount: document.getElementById("playerCoinCount"),
      coinLevel: document.getElementById("coinLevel"),
      coinGauge: document.getElementById("coinGauge"),
      coinGaugeFill: document.getElementById("coinGaugeFill"),
      coinGaugeNext: document.getElementById("coinGaugeNext"),
      coinHealBtn: document.getElementById("coinHealBtn"),
      coinBuffBtn: document.getElementById("coinBuffBtn"),
      coinShop: document.getElementById("coinShop"),
      coinRerollBtn: document.getElementById("coinRerollBtn"),
      coinRerollLeft: document.getElementById("coinRerollLeft"),
      aiCoinZone: document.getElementById("aiCoinZone"),
      aiCoinCount: document.getElementById("aiCoinCount"),
      playerSynthMains: document.getElementById("playerSynthMains"),
      playerSynthMaterial: document.getElementById("playerSynthMaterial"),
      aiSynthZone: document.getElementById("aiSynthZone"),
      aiSynthMains: document.getElementById("aiSynthMains"),
      aiSynthMaterial: document.getElementById("aiSynthMaterial"),
      logPanel: document.getElementById("logPanel"),
      turnBadge: document.getElementById("turnBadge"),
      actionHint: document.getElementById("actionHint"),
      playerHpText: document.getElementById("playerHpText"),
      aiHpText: document.getElementById("aiHpText"),
      playerHpFill: document.getElementById("playerHpFill"),
      aiHpFill: document.getElementById("aiHpFill"),
      playerStatusBox: document.getElementById("playerStatusBox"),
      aiStatusBox: document.getElementById("aiStatusBox"),
      playerDeck: document.querySelector("#playerDeck .pile-count"),
      aiDeck: document.querySelector("#aiDeck .pile-count"),
      playerGrave: document.querySelector("#playerGrave .pile-count"),
      aiGrave: document.querySelector("#aiGrave .pile-count"),
      endTurnBtn: document.getElementById("endTurnBtn"),
      restartBtn: document.getElementById("restartBtn"),
      tooltip: document.getElementById("tooltip"),
      drawModal: document.getElementById("drawModal"),
      drawTitle: document.getElementById("drawTitle"),
      drawText: document.getElementById("drawText"),
      candidateRow: document.getElementById("candidateRow"),
      redrawBtn: document.getElementById("redrawBtn"),
      acceptDrawBtn: document.getElementById("acceptDrawBtn"),
      winner: document.getElementById("winner"),
      deckSelectModal: document.getElementById("deckSelectModal"),
      playerFormationSummary: document.getElementById("playerFormationSummary"),
      aiDeckList: document.getElementById("aiDeckList"),
      deckConfirmBtn: document.getElementById("deckConfirmBtn"),
      deckError: document.getElementById("deckError"),
      dicePanel: document.getElementById("dicePanel"),
      diceFace: document.getElementById("diceFace"),
      diceUses: document.getElementById("diceUses"),
      diceResult: document.getElementById("diceResult"),
      rollDiceBtn: document.getElementById("rollDiceBtn"),
      cardSelectModal: document.getElementById("cardSelectModal"),
      cardSearchInput: document.getElementById("cardSearchInput"),
      cardSelectFilters: document.getElementById("cardSelectFilters"),
      cardSelectCounts: document.getElementById("cardSelectCounts"),
      cardSelectGrid: document.getElementById("cardSelectGrid"),
      cardSelectHint: document.getElementById("cardSelectHint"),
      cardSelectCancelBtn: document.getElementById("cardSelectCancelBtn"),
      cardSelectConfirmBtn: document.getElementById("cardSelectConfirmBtn"),
      deckRefBtn: document.getElementById("deckRefBtn"),
      deckRefModal: document.getElementById("deckRefModal"),
      deckRefCounts: document.getElementById("deckRefCounts"),
      deckRefGrid: document.getElementById("deckRefGrid"),
      deckRefCloseBtn: document.getElementById("deckRefCloseBtn"),
    };

    els.winner.addEventListener("click", () => {
      els.winner.classList.remove("active");
    });

    // 特殊召喚専用カード（山札に存在しない・墓地に行かない）は上部の SPECIAL_CARDS に統合済み

    function makeSpecial(key) {
      const base = SPECIAL_CARDS[key];
      return { ...base, instanceId: `${base.id}-${uid++}`, elapsed: 0, beacons: [] };
    }

    // 通常のCARD_LIBRARY（または召喚専用カード）を指定idからコピー生成する（overridesで noGrave 等を上書き可能）
    function makeCardCopy(id, overrides = {}) {
      const base = CARD_LIBRARY.find(c => c.id === id) || SPECIAL_CARDS[id];
      if (!base) return null;
      return { ...base, instanceId: `${base.id}-${uid++}`, elapsed: 0, beacons: [], ...overrides };
    }

    let uid = 0;
    // 狐(repeatLastMain)の連鎖が無限ループしないようにするための再帰深度カウンタ
    let repeatMainChainDepth = 0;
    let draggedCardId = null;
    let selectedPlacementCardId = null;
    let pendingDrawOwner = null;
    let pendingCards = [];
    let replacingSubCardId = null;
    let game = null;
    let tooltipTimer = null;
    // ダメージフロート表示用：対象ごとにメイン／サブの合計ダメージを一時的に蓄積し、まとめて表示する
    const damagePopupState = {
      player: { main: 0, sub: 0, heal: 0, ailments: {}, scheduled: false },
      ai:     { main: 0, sub: 0, heal: 0, ailments: {}, scheduled: false },
    };
    // 選択中のデッキID
    let selectedDeckIds = { player: "standard", ai: "standard" };
    // セレクトデッキで選んだカードID配列（重複あり、最大30）
    let selectedCustomDeck = [];
    // カード選択モーダルの検索・フィルタ状態
    let cardSelectFilter = { search: "", rarity: "all", types: new Set() };

    // ── デッキ選択UI ──
    function openDeckSelect() {
      selectedDeckIds = { player: "standard", ai: "standard" };
      selectedCustomDeck = [];
      renderDeckSelect();
      els.deckSelectModal.classList.add("active");
      els.cardSelectModal.classList.remove("active");
    }

    function renderDeckSelect() {
      renderPlayerFormationSummary();
      renderDeckList(els.aiDeckList, "ai");
      renderAiAdjustLabels();
      els.deckError.textContent = "";
    }

    function renderAiAdjustLabels() {
      const levelLabels = { none: "無", weak: "弱", mid: "中", strong: "強" };
      const levelLabelEl = document.getElementById("aiLevelAdjustLabel");
      if (levelLabelEl) levelLabelEl.textContent = levelLabels[aiDeckConfig.levelMode] || "無";
      const dupeLabelEl = document.getElementById("aiDupeAdjustLabel");
      if (dupeLabelEl) dupeLabelEl.textContent = String(aiDeckConfig.limitBreakLevel || 0);
    }

    // 自分側：編成・強化画面で組んだ構成のサマリー表示（選択UIではなく確認用）
    function renderPlayerFormationSummary() {
      const container = els.playerFormationSummary;
      if (!container) return;
      const deckIds = playerState.formationDeck;
      const count = deckIds.length;
      const activeId = computeActiveDeckId(deckIds);
      const effect = DECK_EFFECTS[activeId || "none"];
      const el = document.createElement("div");
      el.className = "deck-card selected";
      el.innerHTML = `
        <div class="deck-card-name">編成デッキ</div>
        <div class="deck-card-desc">編成・強化画面で組んだ${count}枚の構成で戦います。</div>
        <div class="deck-card-effect">デッキ効果：${effect.label}</div>
        <div class="deck-card-count">${count} / 30枚${count === FULL_DECK_SIZE ? "" : "（30枚未満のため対戦できません）"}</div>
      `;
      container.innerHTML = "";
      container.appendChild(el);
    }

    function renderDeckList(container, who) {
      container.innerHTML = "";
      DECKS.forEach(deck => {
        // AI側にはplayerOnlyデッキ（セレクト）を表示しない
        if (who === "ai" && deck.playerOnly) return;
        // プレイヤー側には試練専用（aiOnly）デッキを表示しない
        if (who === "player" && deck.aiOnly) return;

        const isUiOnly = !deck.random && !deck.custom && deck.cards.length < FULL_DECK_SIZE; // mechanic/gold/emoji等のWIP
        const isSelected = selectedDeckIds[who] === deck.id;
        const el = document.createElement("div");
        el.className = `deck-card${isSelected ? " selected" : ""}${isUiOnly ? " unavailable ui-only" : ""}`;
        // 編成内容から実際に発動する名称デッキ効果を判定して表示（試練デッキ等、自身とは別の名称デッキ効果が20枚以上の一致で自動発動する場合がある）
        const effectiveDeckId = (deck.cards && deck.cards.length > 0) ? (computeActiveDeckId(deck.cards) || "none") : deck.id;
        const effectLabel = DECK_EFFECTS[effectiveDeckId]?.label || "なし";

        let countLabel;
        if (deck.custom) {
          countLabel = who === "player" && selectedCustomDeck.length > 0
            ? `${selectedCustomDeck.length}/30枚 選択済み`
            : "未選択（対戦前に選ぶ）";
        } else if (deck.random) {
          countLabel = "対戦ごとに30枚を自動生成";
        } else if (isUiOnly) {
          countLabel = "⚠ 準備中（未実装）";
        } else {
          countLabel = `${deck.cards.length}枚`;
        }

        el.innerHTML = `
          <div class="deck-card-name">${deck.name}${isUiOnly ? `<span class="deck-card-badge">開発中</span>` : ""}</div>
          <div class="deck-card-desc">${deck.desc}</div>
          <div class="deck-card-effect">デッキ効果：${effectLabel}</div>
          <div class="deck-card-count">${countLabel}</div>
        `;

        el.addEventListener("click", () => {
          if (isUiOnly) return; // WIPデッキは選択しても進行不可だが、クリック自体は許可してエラー表示に任せる
          selectedDeckIds[who] = deck.id;
          if (deck.custom && who === "player") {
            openCardSelect();
          }
          renderDeckSelect();
        });
        container.appendChild(el);
      });
    }

    // ============================================================
    // カード選択モーダル（セレクトデッキ）
    // ============================================================
    const SELECT_RARITY3_LIMIT = 8;
    const SELECT_RARITY2_LIMIT = 13;

    function openCardSelect() {
      cardSelectFilter = { search: "", rarity: "all", types: new Set() };
      els.cardSearchInput.value = "";
      els.cardSelectFilters.querySelectorAll(".filter-chip").forEach(chip => {
        chip.classList.toggle("active", chip.dataset.rarity === "all");
      });
      els.deckSelectModal.classList.remove("active");
      els.cardSelectModal.classList.add("active");
      renderCardSelect();
    }

    function closeCardSelect() {
      els.cardSelectModal.classList.remove("active");
      els.deckSelectModal.classList.add("active");
      renderDeckSelect();
    }

    // ============================================================
    // デッキ参照モーダル（対戦中、自分のデッキ30枚の現在位置を確認）
    // ============================================================
    function openDeckRef() {
      if (!game || !game.player) return;
      renderDeckRef();
      els.deckRefModal.classList.add("active");
    }

    function closeDeckRef() {
      els.deckRefModal.classList.remove("active");
    }

    function renderDeckRef() {
      const manifest = [...game.player.deckManifest].sort((a, b) => {
        if (a.rarity !== b.rarity) return a.rarity - b.rarity;
        if (a.type !== b.type) return a.type === "main" ? -1 : 1;
        return 0;
      });
      const equipList = game.player.equip || [];
      const equipCost = equipList.reduce((sum, e) => sum + ((getEquipDef(e.id) || {}).cost || 0), 0);
      els.deckRefCounts.innerHTML = `<span>合計：<strong>${manifest.length}</strong>枚</span>`
        + (equipList.length > 0 ? `<span>装備：<strong>${equipList.length}</strong>個（${equipCost} / ${EQUIP_COST_LIMIT}C）</span>` : "");

      els.deckRefGrid.innerHTML = "";
      manifest.forEach(card => {
        const cell = document.createElement("div");
        cell.className = "deck-ref-cell";
        const cardEl = createCardEl({ ...card, elapsed: 0 }, { small: true });
        cell.appendChild(cardEl);
        els.deckRefGrid.appendChild(cell);
      });

      // 装備品（対戦中はここから確認できる）
      if (equipList.length > 0) {
        const title = document.createElement("div");
        title.className = "deck-ref-equip-title";
        title.textContent = `🎒 装備品（${equipList.length}個／${equipCost} / ${EQUIP_COST_LIMIT}C）`;
        els.deckRefGrid.appendChild(title);
        equipList.forEach(e => {
          const def = getEquipDef(e.id);
          if (!def) return;
          const cell = document.createElement("div");
          cell.className = "deck-ref-cell";
          cell.appendChild(createEquipEl(def, { small: true, level: e.level, dupe: e.dupe }));
          const nameEl = document.createElement("div");
          nameEl.className = "equip-cell-name";
          nameEl.textContent = `${def.name} Lv.${e.level}${e.dupe ? `＋${e.dupe}` : ""}`;
          cell.appendChild(nameEl);
          els.deckRefGrid.appendChild(cell);
        });
      }
    }

    function customDeckCounts() {
      let r1 = 0, r2 = 0, r3 = 0;
      selectedCustomDeck.forEach(id => {
        const c = CARD_LIBRARY.find(c => c.id === id);
        if (!c) return;
        if (c.rarity === 1) r1++;
        else if (c.rarity === 2) r2++;
        else if (c.rarity === 3) r3++;
      });
      return { r1, r2, r3, total: selectedCustomDeck.length };
    }

    function countInDeck(cardId) {
      return selectedCustomDeck.filter(id => id === cardId).length;
    }

    function canAddCard(card) {
      if (selectedCustomDeck.length >= FULL_DECK_SIZE) return false;
      const { r2, r3 } = customDeckCounts();
      if (card.rarity === 3 && r3 >= SELECT_RARITY3_LIMIT) return false;
      if (card.rarity === 2 && r2 >= SELECT_RARITY2_LIMIT) return false;
      return true;
    }

    function toggleCardInDeck(cardId) {
      const card = CARD_LIBRARY.find(c => c.id === cardId);
      if (!card) return;
      const idx = selectedCustomDeck.indexOf(cardId);
      if (idx >= 0) {
        // クリックで1枚減らす
        selectedCustomDeck.splice(idx, 1);
      } else if (canAddCard(card)) {
        selectedCustomDeck.push(cardId);
      } else {
        return; // 上限到達時は何もしない
      }
      renderCardSelect();
    }

    function matchesFilter(card) {
      const f = cardSelectFilter;
      if (f.rarity !== "all" && String(card.rarity) !== f.rarity) return false;
      if (f.types.size > 0 && !f.types.has(card.type)) return false;
      if (f.search) {
        const q = f.search.toLowerCase();
        const hay = `${card.name} ${card.text}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    }

    function renderCardSelect() {
      // カウント表示
      const { r1, r2, r3, total } = customDeckCounts();
      els.cardSelectCounts.innerHTML = `
        <span>合計：<strong>${total}</strong> / 30</span>
        <span class="${r3 >= SELECT_RARITY3_LIMIT ? "over" : ""}">☆3：${r3} / ${SELECT_RARITY3_LIMIT}</span>
        <span class="${r2 >= SELECT_RARITY2_LIMIT ? "over" : ""}">☆2：${r2} / ${SELECT_RARITY2_LIMIT}</span>
        <span>☆1：${r1}</span>
      `;
      els.cardSelectConfirmBtn.disabled = total !== FULL_DECK_SIZE;
      els.cardSelectHint.textContent = total === FULL_DECK_SIZE
        ? "30枚選択完了！「このデッキで決定」を押してください。"
        : `あと${FULL_DECK_SIZE - total}枚選んでください（クリックで追加、選択済みカードを再クリックで1枚減らせます）。`;

      // グリッド描画
      els.cardSelectGrid.innerHTML = "";
      const filtered = CARD_LIBRARY.filter(matchesFilter);
      if (filtered.length === 0) {
        els.cardSelectGrid.innerHTML = `<div class="empty">条件に一致するカードがありません</div>`;
        return;
      }
      filtered.forEach(card => {
        const count = countInDeck(card.id);
        const maxed = count === 0 && !canAddCard(card);
        const cell = document.createElement("div");
        cell.className = `select-card-cell${maxed ? " maxed" : ""}`;
        const cardEl = createCardEl({ ...card, elapsed: 0 }, { small: true, draggable: false });
        cell.appendChild(cardEl);
        if (count > 0) {
          const badge = document.createElement("div");
          badge.className = "select-card-count-badge";
          badge.textContent = count;
          cell.appendChild(badge);
        }
        cell.addEventListener("click", () => toggleCardInDeck(card.id));
        els.cardSelectGrid.appendChild(cell);
      });
    }

    function buildDeckFromId(deckId, isAI = false) {
      const def = DECKS.find(d => d.id === deckId) || DECKS[0];
      let cardIds;
      if (def.random) {
        cardIds = buildRandomDeckCardIds();
      } else if (def.custom) {
        cardIds = selectedCustomDeck.length === FULL_DECK_SIZE ? selectedCustomDeck : buildRandomDeckCardIds();
      } else {
        cardIds = def.cards;
      }
      if (isAI) rollAiCardLevelsFor(cardIds);
      return shuffle(cardIds.map(cardId => {
        const base = CARD_LIBRARY.find(c => c.id === cardId);
        if (!base) return null;
        return cloneCard(base, isAI);
      }).filter(Boolean));
    }

    // ランダムデッキ：☆3は8枚まで、☆2は13枚まで、合計30枚になるようランダム選出
    function buildRandomDeckCardIds() {
      const RARITY3_LIMIT = 8;
      const RARITY2_LIMIT = 13;
      const pool = shuffle(CARD_LIBRARY.filter(c => !c.noPull).map(c => c.id));
      const picked = [];
      let r3 = 0, r2 = 0;
      for (const id of pool) {
        if (picked.length >= FULL_DECK_SIZE) break;
        const card = CARD_LIBRARY.find(c => c.id === id);
        if (card.rarity === 3 && r3 >= RARITY3_LIMIT) continue;
        if (card.rarity === 2 && r2 >= RARITY2_LIMIT) continue;
        picked.push(id);
        if (card.rarity === 3) r3++;
        if (card.rarity === 2) r2++;
      }
      // 万が一足りなければ☆1から補充（☆1は無制限なので基本起こらない）
      if (picked.length < FULL_DECK_SIZE) {
        for (const id of pool) {
          if (picked.length >= FULL_DECK_SIZE) break;
          if (!picked.includes(id)) picked.push(id);
        }
      }
      return picked;
    }

    function cloneCard(base, isAI = false) {
      const card = { ...base, instanceId: `${base.id}-${uid++}`, elapsed: 0, beacons: [] };
      if (base.id === "a3") assignThreeNormalBeacons(card);
      // 凸：手札や山札にある時点でも常にビーコンを保持させる処理
      // 『千』2凸以上は常にノーマルビーコンが2つ付与される（手札表示に反映するためここで初期付与）
      if (base.id === "sen" && getLimitBreak("sen", isAI) >= 2) {
        while (card.beacons.length < 2) {
          if (!grantNormalBeacon(card)) break;
        }
      }
      // 『姫』4凸は常にノーマルビーコンが1つ付与される（手札表示に反映するためここで初期付与）
      if (base.id === "hime" && getLimitBreak("hime", isAI) >= 4) {
        if (card.beacons.length < 1) grantNormalBeacon(card);
      }
      // 凸：『護』4凸 - 継続ターン2→3／『酸』4凸 - 継続ターン3→4
      if (base.id === "go" && getLimitBreak("go", isAI) >= 4) card.duration = 3;
      if (base.id === "san" && getLimitBreak("san", isAI) >= 4) card.duration = 4;
      // 凸：『玖』4凸 - 継続ターン3→4／『玖』1凸 - トラブルビーコンが付与されなくなる
      if (base.id === "ku" && getLimitBreak("ku", isAI) >= 4) card.duration = 4;
      if (base.id === "ku" && getLimitBreak("ku", isAI) >= 1) card._noTroubleBeacon = true;
      // 凸：『兆』1凸 - サブフィールドが満杯になった場合、即座に破棄される
      if (base.id === "tyo" && getLimitBreak("tyo", isAI) >= 1) card._tyoInstantDiscard = true;
      // 凸：『鏡』4凸 - 発動可能回数1→2
      if (base.id === "kag" && getLimitBreak("kag", isAI) >= 4) card.maxTriggers = 2;
      // 凸：『城』2凸 - 継続ターン4→5
      if (base.id === "shir" && getLimitBreak("shir", isAI) >= 2) card.duration = 5;
      // 凸：『皇』1凸 - このカードにはトラブルビーコンが付与されない
      if (base.id === "kou" && getLimitBreak("kou", isAI) >= 1) card._noTroubleBeacon = true;
      // 凸：『全』4凸 - 発動可能回数[4→5]
      if (base.id === "zen" && getLimitBreak("zen", isAI) >= 4) card.maxTriggers = 5;
      // 凸：『幻』2凸 - 継続ターン4→5
      if (base.id === "gen" && getLimitBreak("gen", isAI) >= 2) card.duration = 5;
      // 凸：『怨』2凸 - 継続ターン4→5
      if (base.id === "urami" && getLimitBreak("urami", isAI) >= 2) card.duration = 5;
      // 凸：『鉱』2凸 - 継続ターン8→10
      if (base.id === "kou3" && getLimitBreak("kou3", isAI) >= 2) card.duration = 10;
      // 凸：『鯨』4凸 - 継続ターン3→4
      if (base.id === "kujira" && getLimitBreak("kujira", isAI) >= 4) card.duration = 4;
      // 凸：『撃』4凸 - このカードには常にノーマルビーコンが2つ付与される
      if (base.id === "geki" && getLimitBreak("geki", isAI) >= 4) {
        while (card.beacons.length < 2) {
          if (!grantNormalBeacon(card)) break;
        }
      }
      return card;
    }

    // 亜：常にノーマルビーコンを3つ保持させる
    function assignThreeNormalBeacons(card) {
      card.beacons = [];
      for (let i = 0; i < 3; i++) grantNormalBeacon(card);
    }

    function shuffle(items) {
      const arr = [...items];
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    }

    // 凸：『疾』2凸／『克』2凸 - このカードは初期手札に優先的に選ばれる（drawCardsはdeck配列の末尾からpopするため、末尾へ寄せる）
    function applyPriorityInitialCards(deckArr, isAI) {
      ["shitsu", "gekoku"].forEach(id => {
        const idx = deckArr.findIndex(c => c.id === id);
        if (idx >= 0 && getLimitBreak(id, isAI) >= 2) {
          const [card] = deckArr.splice(idx, 1);
          deckArr.push(card);
        }
      });
      return deckArr;
    }

    function makePlayer(label, isAI, deckId) {
      const manifest = buildDeckFromId(deckId, isAI);
      const levelBonus = isAI ? levelHpBonusForDeck(manifest.map(c => c.id), isAI) : 0;
      applyPriorityInitialCards(manifest, isAI);
      // 試練など：編成された30枚の内訳から、該当する名称デッキの効果を自動判定して発動する
      // （固定デッキ自身を選んだ場合は自分自身が20枚以上ヒットするため、従来通りその効果になる）
      const effectiveDeckId = computeActiveDeckId(manifest.map(c => c.id)) || "none";
      return {
        label, isAI, hp: MAX_HP + (DECK_EFFECTS[effectiveDeckId]?.hpBonus || 0) + levelBonus,
        equip: [], // 相手の装備品システムは後日実装予定
        deck: [...manifest], hand: [], grave: [], subs: [], main: null, lastMains: [], deckId: effectiveDeckId,
        synth: { mains: [], material: null, combined: null }, // シンセサイズデッキ専用：合成スペースの状態
        coins: 0, coinLevel: 1, coinGaugeTotal: 0, coinGreenUsedThisTurn: false, coinRerollsThisTurn: 0, coinShop: [null, null, null], // コインデッキ専用
        deckManifest: manifest, // このプレイヤーが今回使う30枚の構成（デッキ参照画面用、固定）
        diceUsesLeft: DICE_MAX_USES,
        diceUsedThisTurn: false,
        diceUsedLastTurn: false, // 奇用：前ターンにサイコロを振ったか
        maxRandomThisTurn: false, // 1の目：このターン乱数ダメージが最高値固定
        elementCost: 0, // エレメントエリア専用のコストゲージ（0〜50、デッキとは無関係）
        status: {}, // 状態異常（火傷・悪寒・凍結・猛毒・脆弱・栄光・月照）
      };
    }

    // 自分側：編成・強化画面で組んだ30枚から対戦用プレイヤーを構築
    function makePlayerFromFormation(cardIds) {
      const manifest = shuffle(cardIds.map(cardId => {
        const base = CARD_LIBRARY.find(c => c.id === cardId);
        return base ? cloneCard(base) : null;
      }).filter(Boolean));
      applyPriorityInitialCards(manifest, false);
      const activeDeckId = computeActiveDeckId(cardIds) || "none";
      const levelBonus = levelHpBonusForDeck(cardIds);
      const equip = snapshotEquipForBattle(); // 装備中の装備品（Lv・重複込みで固定）
      const hpSubtotal = MAX_HP + (DECK_EFFECTS[activeDeckId]?.hpBonus || 0) + levelBonus; // 装備加算前のHP
      return {
        label: "自分", isAI: false,
        hp: hpSubtotal + equipHpBonus(equip, hpSubtotal, cardIds),
        equip,
        deck: [...manifest], hand: [], grave: [], subs: [], main: null, lastMains: [], deckId: activeDeckId,
        synth: { mains: [], material: null, combined: null },
        coins: 0, coinLevel: 1, coinGaugeTotal: 0, coinGreenUsedThisTurn: false, coinRerollsThisTurn: 0, coinShop: [null, null, null],
        deckManifest: manifest,
        diceUsesLeft: DICE_MAX_USES,
        diceUsedThisTurn: false,
        diceUsedLastTurn: false,
        maxRandomThisTurn: false,
        elementCost: 0,
        status: {},
      };
    }

    function startGame() {
      uid = 0;
      game = {
        player: makePlayerFromFormation(playerState.formationDeck),
        ai:     makePlayer("相手", true,  selectedDeckIds.ai),
        turn: "player",
        phase: "draw",
        gameOver: false,
        initialRedrawCount: 0,
        waitingForPlayerDraw: true,
        discardedThisTurnCount: 0,
        playerPrevCard: null,  // 零用：自分が前ターン出したカード
        aiPrevCard: null,      // 零用：AIが前ターン出したカード
        skipNextAITurn: false, // 鎖用
        skipNextPlayerTurn: false, // 鎖用
        stats: { turn: 1, maxDamage: 0, hits10kCount: 0, subUsedCount: 0, subFieldFull: false, graveResetCount: 0 }, // リザルト・ミッション画面用
      };
      els.deckSelectModal.classList.remove("active");
      els.logPanel.innerHTML = "";
      els.winner.classList.remove("active");
      const playerEffectName = DECK_EFFECTS[game.player.deckId]?.label ?? "なし";
      const aiDeckName     = DECKS.find(d => d.id === selectedDeckIds.ai)?.name     ?? selectedDeckIds.ai;
      log(`ゲーム開始。自分：編成デッキ（効果：${playerEffectName}） ／ 相手：${aiDeckName}`, "good");
      // アルカナデッキ：開始時、相手に「アルカナ」を5層付与する
      if (DECK_EFFECTS[game.player.deckId]?.grantsArcanaStart) applyStatus(game.ai, "arcana", 5);
      if (DECK_EFFECTS[game.ai.deckId]?.grantsArcanaStart) applyStatus(game.player, "arcana", 5);
      if (hasCoinSpace(game.player)) ensureCoinShopFilled(game.player);
      if (hasCoinSpace(game.ai)) ensureCoinShopFilled(game.ai);
      // 装備品：対戦開始時の効果（コスト獲得・月照付与）／初期手札に☆3を必ず含める
      equipOnBattleStart(game.player);
      equipOnBattleStart(game.ai);
      equipEnsureStar3InInitialHand(game.player);
      openDraw("player", true);
      drawForAIIfNeeded(true);
      render();
    }

    function opponentOf(owner) {
      return owner === game.player ? game.ai : game.player;
    }
