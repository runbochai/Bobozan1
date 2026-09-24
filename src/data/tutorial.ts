// --- TUTORIAL STEPS ---
export const TUTORIAL_STEPS = [
    // --- BASIC MECHANICS ---
    {
      id: 0,
      title: { zh: "教程 1: 能量", en: "Lesson 1: Energy" },
      sub: { zh: "战斗需要能量。点击 [攒] 获得 +2 能量。", en: "Combat costs Energy. Click [Charge] to gain +2 Energy." },
      allowed: ['charge'],
      setup: { energy: 0, botEnergy: 0, botAction: 'charge' } 
    },
    {
      id: 1,
      title: { zh: "教程 2: 攻击", en: "Lesson 2: Attacking" },
      sub: { zh: "敌人没有能量了，他可能要攒气! 使用任意攻击技能进行攻击！", en: "The enemy is Charging (Vulnerable!). Use [Blast] (Red) to attack!" },
      allowed: ['hong', 'hong2'],
      setup: { energy: 2, botEnergy: 0, botAction: 'charge' } 
    },
    {
      id: 2,
      title: { zh: "教程 3: 防守", en: "Lesson 3: Defending" },
      sub: { zh: "敌人要攻击了！使用 [防] 抵挡伤害。", en: "The enemy is Attacking! Use [Defend] (Blue) to block damage." },
      allowed: ['defend'],
      setup: { energy: 1, botEnergy: 2, botAction: 'hong' } 
    },
    {
      id: 3,
      title: { zh: "教程 4: 终极技能", en: "Lesson 4: Ultimate" },
      sub: { zh: "防御是可以被击破的！当你有3费或更多时，使用 [终极技能] (紫色) 击溃他们。", en: "Defenses can be broken! Use an [Ultimate] (Purple) to crush them." },
      allowed: ['ka', 'ji'],
      setup: { energy: 4, botEnergy: 2, botAction: 'defend' } 
    },

    // --- GROUP: CLASH STATE (等压状态) ---
    {
      id: 4,
      title: { zh: "等级压制 1: 攻击压制", en: "Clash 1: Atk Pressure" },
      sub: { zh: "同类技能对拼时，高等级攻击卡会击败低等级。", en: "High Level (Lv3) beats Low Level (Lv1) in a clash." },
      allowed: ['dragonclaw'], // Lv 3 Attack
      setup: { energy: 1, botEnergy: 1, botAction: 'pegasus' } // Bot uses Lv 1 Attack
    },
    {
      id: 5,
      title: { zh: "等级压制 2: 攻击抵消", en: "Clash 2: Atk Cancellation" },
      sub: { zh: "在对方等级压制下，用 2费攻击(轰轰/六克) 可以和对方的高级攻击打成平手！", en: "Basic Strong Atk (Double Blast) TIES with higher level attacks!" },
      allowed: ['hong2', 'liuke'], // Double Blast (Cost 2)
      setup: { energy: 2, botEnergy: 1, botAction: 'madian' } // Bot uses Lv 5 Madian
    },
    {
      id: 6,
      title: { zh: "等级压制 3: 终极压制", en: "Clash 3: Ult Pressure" },
      sub: { zh: "当双方都使用终极技能时，等级高的一方获胜 (Lv3 > Lv1)。", en: "When Ults clash, the HIGHER LEVEL wins (Lv3 > Lv1)." },
      allowed: ['fireclaw'], // Lv 3 Ult
      setup: { energy: 3, botEnergy: 3, botAction: 'meteor' } // Bot uses Lv 1 Ult
    },
    {
      id: 7,
      title: { zh: "等级压制 4: 终极抵消", en: "Clash 4: Ult Cancellation" },
      sub: { zh: "在对方等级压制下，你可以使出 [叽] (4费) 和对方的高级终极技能打成平手。", en: "Use [Ji] (Cost 4) to TIE against a higher level Ultimate!" },
      allowed: ['ji'], // Base Ult (Cost 4)
      setup: { energy: 4, botEnergy: 3, botAction: 'fireclaw' } // Bot uses Lv 3 Ult
    },

    // --- GROUP: Special Skills (进阶教程) ---
    {
      id: 8,
      title: { zh: "进阶: 特殊防御", en: "Adv: Special Def" },
      sub: { zh: "普通[防]挡不住[天下第一波]，但[小飞] (Lv2) 可以！", en: "Normal [Defend] fails vs [Wave], but [Small Fly] (Lv2) works!" },
      allowed: ['smallfly'], // Lv 2 Defend
      setup: { energy: 1, botEnergy: 1, botAction: 'wave' } // Bot uses Wave
    },
    {
      id: 9,
      title: { zh: "进阶: 必杀技 (Tier)", en: "Adv: Super Ult (Tier)" },
      sub: { zh: "咔叽粉 (T5) 是必杀技，可以压制常规终极技能 (如 叽 T4)。", en: "KaJiFen (Tier 5) is a SUPER. It beats normal Ults like Ji (Tier 4)." },
      allowed: ['kajifen'], 
      setup: { energy: 5, botEnergy: 4, botAction: 'ji' } 
    },
    {
      id: 10,
      title: { zh: "进阶: 联合技能", en: "Adv: Combo Skills" },
      sub: { zh: "当你集齐特定等级(如 Lv2+5)时，会自动解锁特殊的【联合技能】！", en: "Collecting specific levels (e.g. Lv2+5) unlocks secret COMBOS!" },
      allowed: ['doublewing'], 
      setup: { energy: 1, botEnergy: 3, botAction: 'meteor' } 
    }
];
