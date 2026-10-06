// src/data/skills.ts
import type { Card } from '../types';

// --- SKILL DATABASE ---
export const SKILL_DB: Card[] = [
  // Lvl 0
  { id: 'charge', name: { zh: '攒', en: 'Charge' }, cost: 0, type: 'CHARGE', levelRequired: 0, tier: 0, description: { zh: '获得2能量；本回合受伤达到1点会中断', en: 'Gain 2 Energy unless damage reaches 1 this turn' } },
  { id: 'defend', name: { zh: '防', en: 'Defend' }, cost: 0, type: 'DEFEND', levelRequired: 0, tier: 0, description: { zh: '抵挡大部分攻击', en: 'Block basic attacks' } },
  { id: 'hong', name: { zh: '轰', en: 'Blast' }, cost: 1, type: 'ATTACK', levelRequired: 0, tier: 1, description: { zh: '基础攻击', en: 'Basic Attack' } },
  { id: 'hong2', name: { zh: '轰轰', en: 'Double Blast' }, cost: 2, type: 'ATTACK', levelRequired: 0, tier: 2, description: { zh: '压过轰；与高级二档攻击打平', en: 'Beats Blast; ties higher-level tier-2 attacks' } },
  { id: 'liuke', name: { zh: '六克', en: '6g Strike' }, cost: 2, type: 'ATTACK', levelRequired: 0, tier: 2, description: { zh: '压过轰；与高级二档攻击打平', en: 'Beats Blast; ties higher-level tier-2 attacks' } },
  { id: 'ka', name: { zh: '咔', en: 'Ka' }, cost: 3, type: 'ULTIMATE', levelRequired: 0, tier: 3, description: { zh: '破普通防，射程自身及上下各1层', en: 'Breaks basic Defend; reaches your layer and ±1' } },
  { id: 'ji', name: { zh: '叽', en: 'Ji' }, cost: 4, type: 'ULTIMATE', levelRequired: 0, tier: 4, description: { zh: '破普通防，射程自身及上下各1层', en: 'Breaks basic Defend; reaches your layer and ±1' } },
  { id: 'kajifen', name: { zh: '咔叽粉', en: 'KaJi' }, cost: 5, type: 'ULTIMATE', levelRequired: 0, tier: 5, description: { zh: '必杀技', en: 'SUPER' } },
  { id: 'kajisuper', name: { zh: '咔叽超粉', en: 'Super KaJi' }, cost: 10, type: 'ULTIMATE', levelRequired: 0, tier: 6, description: { zh: '必杀技', en: 'SUPER' } },
  
  // Special
  { id: 'ascend', name: { zh: '升天', en: 'Ascend' }, cost: 0, type: 'SPECIAL', levelRequired: 0, tier: 0, description: { zh: '上升一层', en: 'Go UP 1 Layer' }, tags: ['layer_up'] },
  { id: 'descend', name: { zh: '遁地', en: 'Descend' }, cost: 0, type: 'SPECIAL', levelRequired: 0, tier: 0, description: { zh: '下降一层', en: 'Go DOWN 1 Layer' }, tags: ['layer_down'] },

  // Lvl 1
  { id: 'pegasus', name: { zh: '天马', en: 'Pegasus' }, cost: 1, type: 'ATTACK', levelRequired: 1, tier: 2, description: { zh: '攻击技能', en: 'Attack Skill' } },
  { id: 'meteor', name: { zh: '流星坠', en: 'Meteor' }, cost: 3, type: 'ULTIMATE', levelRequired: 1, tier: 4, description: { zh: '终极技能', en: 'Ultimate Skill' } },

  // Lvl 2
  { id: 'icesword', name: { zh: '冰剑', en: 'Ice Sword' }, cost: 1, type: 'ATTACK', levelRequired: 2, tier: 2, description: { zh: '攻击技能', en: 'Attack Skill' } },
  { id: 'iceult', name: { zh: '玄天冰剑', en: 'Mystic Ice' }, cost: 3, type: 'ULTIMATE', levelRequired: 2, tier: 4, description: { zh: '终极技能', en: 'Ultimate Skill' } },
  { id: 'smallfly', name: { zh: '小飞', en: 'Small Fly' }, cost: 0, type: 'DEFEND', levelRequired: 2, tier: 0, description: { zh: '本回合暂时上升一层', en: 'Temp UP 1 Layer' }, tags: ['layer_up_temp'] },

  // Lvl 3
  { id: 'dragonclaw', name: { zh: '龙爪', en: 'Dragon Claw' }, cost: 1, type: 'ATTACK', levelRequired: 3, tier: 2, description: { zh: '攻击技能', en: 'Attack Skill' } },
  { id: 'fireclaw', name: { zh: '火焰龙爪', en: 'Fire Claw' }, cost: 3, type: 'ULTIMATE', levelRequired: 3, tier: 4, description: { zh: '终极技能', en: 'Ultimate Skill' } },
  { id: 'dragondef', name: { zh: '龙爪防', en: 'Claw Def' }, cost: 0, type: 'DEFEND', levelRequired: 3, tier: 0, description: { zh: '龙爪防御', en: 'Dragon Defense' } },

  // Lvl 4
  { id: 'hotmilk', name: { zh: '热奶', en: 'Hot Milk' }, cost: 1, type: 'ATTACK', levelRequired: 4, tier: 2, description: { zh: '攻击技能', en: 'Attack Skill' } },
  { id: 'boiler', name: { zh: '热锅炉', en: 'Boiler' }, cost: 3, type: 'ULTIMATE', levelRequired: 4, tier: 4, description: { zh: '终极技能', en: 'Ultimate Skill' } },

  // Lvl 5
  { id: 'madian', name: { zh: '马甸', en: 'Madian' }, cost: 1, type: 'ATTACK', levelRequired: 5, tier: 2, description: { zh: '攻击技能', en: 'Attack Skill' } },
  { id: 'hangman', name: { zh: '吊死鬼', en: 'Hangman' }, cost: 3, type: 'ULTIMATE', levelRequired: 5, tier: 4, description: { zh: '终极技能', en: 'Ultimate Skill' } },
  { id: 'bigfly', name: { zh: '大飞', en: 'Big Fly' }, cost: 0, type: 'DEFEND', levelRequired: 5, tier: 0, description: { zh: '本回合暂时上升两层 (克小飞)', en: 'Temp UP 2 Layers' }, tags: ['layer_up_2_temp'] },

  // Lvl 6
  { id: 'absorb', name: { zh: '锐吸', en: 'Sharp Absorb' }, cost: 1, type: 'ABSORB', levelRequired: 6, tier: 0, description: { zh: '吸收1倍其他玩家打出的技能 (若被轰击中则被淘汰)', en: 'Absorb 1x (Countered by Blast)' }, tags: ['sharp_absorb'] },

  // Lvl 7
  { id: 'gun', name: { zh: '定枪', en: 'Pistol' }, cost: 1, type: 'ATTACK', levelRequired: 7, tier: 2, description: { zh: '穿透一半基础防御', en: 'Pierce Basic Def' }, tags: ['pierce_basic'] },
  { id: 'gungod', name: { zh: '穿梭定枪', en: 'Warp Gun' }, cost: 3, type: 'ULTIMATE', levelRequired: 7, tier: 4, description: { zh: '终极技能', en: 'Ultimate Skill' } },

  // Lvl 8
  { id: 'helmetatk', name: { zh: '头盔攻', en: 'Helm Atk' }, cost: 1, type: 'ATTACK', levelRequired: 8, tier: 2, description: { zh: '攻击技能', en: 'Attack Skill' } },
  { id: 'helmetdef', name: { zh: '头盔防', en: 'Helm Def' }, cost: 0, type: 'DEFEND', levelRequired: 8, tier: 0, description: { zh: '头盔防御', en: 'Helmet Defense' } },

  // Lvl 9
  { id: 'machete', name: { zh: '砍刀', en: 'Machete' }, cost: 1, type: 'ATTACK', levelRequired: 9, tier: 2, description: { zh: '击碎基础防御', en: 'Break Basic Def (Instant Kill)' }, tags: ['break_basic'] },
  { id: 'triplekill', name: { zh: '三连斩', en: 'Triple Slash' }, cost: 3, type: 'ULTIMATE', levelRequired: 9, tier: 4, description: { zh: '一砍刀二砍刀三必杀', en: 'Triple Kill Ultimate' } },

  // Lvl 10
  { id: 'handatk', name: { zh: '手盔攻', en: 'Hand Atk' }, cost: 1, type: 'ATTACK', levelRequired: 10, tier: 2, description: { zh: '攻击技能', en: 'Attack Skill' } },
  { id: 'shatter', name: { zh: '破碎', en: 'Shatter' }, cost: 2, type: 'SPECIAL', levelRequired: 10, tier: 3, description: { zh: '抵消并封印 T4 及以下技能', en: 'Block & Disable Skills (Max T4)' }, tags: ['counter_ult', 'disable_skill'] },
  { id: 'handdef', name: { zh: '手盔防', en: 'Hand Def' }, cost: 0, type: 'DEFEND', levelRequired: 10, tier: 0, description: { zh: '手盔防御', en: 'Hand Defense' } },

  // Lvl 11
  { id: 'footatk', name: { zh: '脚盔攻', en: 'Foot Atk' }, cost: 1, type: 'ATTACK', levelRequired: 11, tier: 2, description: { zh: '攻击技能', en: 'Attack Skill' } },
  { id: 'triplekick', name: { zh: '三连踹', en: 'Triple Kick' }, cost: 3, type: 'ULTIMATE', levelRequired: 11, tier: 4, description: { zh: '终极技能', en: 'Ultimate Skill' } },
  { id: 'footdef', name: { zh: '脚盔防', en: 'Foot Def' }, cost: 0, type: 'DEFEND', levelRequired: 11, tier: 0, description: { zh: '脚盔防御', en: 'Foot Defense' } },

  // Lvl 12
  { id: 'aoxi', name: { zh: '奥吸', en: 'Ultra Absorb' }, cost: 1, type: 'ABSORB', levelRequired: 12, tier: 0, description: { zh: '吸收2倍其他玩家打出的技能 (若被六克击中则被淘汰)', en: 'Absorb 2x (Countered by 6g)' }, tags: ['ao_absorb'] },

  // Lvl 13
  { id: 'oneg', name: { zh: '一克', en: '1g' }, cost: 1, type: 'ATTACK', levelRequired: 13, tier: 2, description: { zh: '攻击技能', en: 'Attack Skill' } },
  { id: 'pointdiff', name: { zh: '点差', en: 'Point Diff' }, cost: 3, type: 'ULTIMATE', levelRequired: 13, tier: 4, description: { zh: '终极技能', en: 'Ultimate Skill' } },

  // Lvl 14
  { id: 'threeg', name: { zh: '三克', en: '3g' }, cost: 1, type: 'ATTACK', levelRequired: 14, tier: 2, description: { zh: '攻击技能', en: 'Attack Skill' } },
  { id: 'threestar', name: { zh: '三星龙', en: '3-Star' }, cost: 3, type: 'ULTIMATE', levelRequired: 14, tier: 4, description: { zh: '终极技能', en: 'Ultimate Skill' } },

  // Lvl 15
  { id: 'fiveg', name: { zh: '五克', en: '5g' }, cost: 1, type: 'ATTACK', levelRequired: 15, tier: 2, description: { zh: '攻击技能', en: 'Attack Skill' } },
  { id: 'fiveslap', name: { zh: '五连拍', en: '5 Slaps' }, cost: 3, type: 'ULTIMATE', levelRequired: 15, tier: 4, description: { zh: '终极技能', en: 'Ultimate Skill' } },
  { id: 'fivedef', name: { zh: '五克防', en: '5g Def' }, cost: 0, type: 'DEFEND', levelRequired: 15, tier: 0, description: { zh: '五克防御', en: '5g Defense' } },

  // Lvl 16
  { id: 'seveng', name: { zh: '七克', en: '7g' }, cost: 1, type: 'ATTACK', levelRequired: 16, tier: 2, description: { zh: '攻击技能', en: 'Attack Skill' } },

  // Lvl 17
  { id: 'bang', name: { zh: '崩!', en: 'Bang!' }, cost: 1, type: 'ATTACK', levelRequired: 17, tier: 2, description: { zh: '攻击技能', en: 'Attack Skill' } },
  { id: 'eightdef', name: { zh: '八克防', en: '8g Def' }, cost: 0, type: 'DEFEND', levelRequired: 17, tier: 0, description: { zh: '八克防御', en: '8g Defense' } },

  // Lvl 18
  { id: 'stab', name: { zh: '捅', en: 'Stab' }, cost: 1, type: 'ATTACK', levelRequired: 18, tier: 2, description: { zh: '攻击技能', en: 'Attack Skill' } },
  { id: 'ninedef', name: { zh: '九克防', en: '9g Def' }, cost: 0, type: 'DEFEND', levelRequired: 18, tier: 0, description: { zh: '九克防御', en: '9g Defense' } },

  // Lvl 19
  { id: 'wave', name: { zh: '天下第一波', en: 'World Wave' }, cost: 1, type: 'ATTACK', levelRequired: 19, tier: 2, description: { zh: '击败任意<九克', en: 'Break Def < 9g (Exc. Fly)' }, tags: ['break_mid_def'] },
  { id: 'superwave', name: { zh: '超级第一波', en: 'Super Wave' }, cost: 3, type: 'ULTIMATE', levelRequired: 19, tier: 4, description: { zh: '终极技能', en: 'Ultimate Skill' } },

  // Lvl 20
  { id: 'hongtian', name: { zh: '轰天', en: 'Sky Bomb' }, cost: 1, type: 'ATTACK', levelRequired: 20, tier: 2, description: { zh: '攻击上层玩家', en: 'Attack Player Above' }, tags: ['hit_up'] },

  // Lvl 21
  { id: 'hongdi', name: { zh: '轰地', en: 'Land Bomb' }, cost: 1, type: 'ATTACK', levelRequired: 21, tier: 2, description: { zh: '攻击下层玩家', en: 'Attack Player Below' }, tags: ['hit_down'] },

  // Lvl 22
  { id: 'hearteye', name: { zh: '诛心诛眼', en: 'Heart & Eye' }, cost: 1, type: 'ATTACK', levelRequired: 22, tier: 2, description: { zh: '攻击技能', en: 'Attack Skill' } },

  // Lvl 23
  { id: 'poison', name: { zh: '散发毒气', en: 'Poison' }, cost: 1, type: 'ATTACK', levelRequired: 23, tier: 2, description: { zh: '攻击技能', en: 'Attack Skill' } },

  // Combos
  { id: 'skydragon', name: { zh: '天龙剑', en: 'Sky Dragon' }, cost: 3, type: 'ULTIMATE', levelRequired: 100, tier: 5, description: { zh: '联合: 压制普通终极，与咔叽粉相抵；射程上下各3层', en: 'Combo: beats ordinary Ults; ties KaJi; reaches ±3 layers' }, tags: ['combo'] },
  { id: 'doublewing', name: { zh: '双翼齐飞', en: '2 Wings' }, cost: 1, type: 'SPECIAL', levelRequired: 100, tier: 3, description: { zh: '联合: 躲避3费终极，本回合升3层', en: 'Combo: Dodge Ult, Up 3 Layers' }, tags: ['combo', 'dodge_ult', 'layer_up_3_temp'] },
  { id: 'vajra', name: { zh: '三大金刚', en: '3 Vajras' }, cost: 3, type: 'ULTIMATE', levelRequired: 100, tier: 5, description: { zh: '联合: 压制普通终极，与咔叽粉相抵；射程上下各3层', en: 'Combo: beats ordinary Ults; ties KaJi; reaches ±3 layers' }, tags: ['combo'] },
  { id: 'allbomb', name: { zh: '轰天轰地轰', en: 'Omni-Bomb' }, cost: 1, type: 'ATTACK', levelRequired: 100, tier: 3, description: { zh: '联合: 攻击任意层玩家', en: 'Combo: Hit All Layers' }, tags: ['combo', 'hit_all'] },
  { id: 'heartpoison', name: { zh: '诛心毒气', en: 'Heart Poison' }, cost: 3, type: 'ULTIMATE', levelRequired: 100, tier: 5, description: { zh: '联合: 压制普通终极，与咔叽粉相抵；射程上下各3层', en: 'Combo: beats ordinary Ults; ties KaJi; reaches ±3 layers' }, tags: ['combo'] },
];
