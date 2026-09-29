import { useState } from 'react';
import { Coins, Chest, Shield, Scroll } from './PixelIcons';
import { EXPEDITION_RELICS, EXPEDITION_EQUIPMENTS } from '../data/expedition';
import { SKILL_DB } from '../data/skills';

export interface TempCardEntry {
  cardId: string;
  usesLeft: number;
}

interface InventoryBarProps {
  gold: number;
  relics: string[];
  equipment: string[];
  tempCards: TempCardEntry[];
  lang: 'zh' | 'en';
  playClick: () => void;
}

/** 单个物品格：悬停/点击弹出简介窗（桌面 hover，移动端点击切换） */
function Slot({
  tipKey,
  activeTip,
  setActiveTip,
  playClick,
  icon,
  tipTitle,
  tipDesc,
  className,
  children,
}: {
  tipKey: string;
  activeTip: string | null;
  setActiveTip: (k: string | null) => void;
  playClick: () => void;
  icon?: React.ReactNode;
  tipTitle: string;
  tipDesc: string;
  className: string;
  children: React.ReactNode;
}) {
  const open = activeTip === tipKey;
  return (
    <span
      onMouseEnter={() => setActiveTip(tipKey)}
      onMouseLeave={() => setActiveTip(null)}
      onClick={(e) => {
        e.stopPropagation();
        playClick();
        setActiveTip(open ? null : tipKey);
      }}
      className={`relative cursor-help ${className}`}
    >
      {children}
      {open && (
        <div className="inventory-tip absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-50 w-44 max-w-[70vw] rounded-xl border border-white/20 bg-slate-900/95 p-2.5 text-left shadow-2xl pointer-events-none whitespace-normal">
          <div className="text-xs font-black text-white mb-0.5">
            {icon} {tipTitle}
          </div>
          <div className="text-[11px] text-slate-300 leading-snug">{tipDesc}</div>
          <span className="absolute top-full left-1/2 -translate-x-1/2 border-[6px] border-transparent border-t-slate-900/95" />
        </div>
      )}
    </span>
  );
}

const Divider = () => <div className="h-6 w-px bg-white/15 shrink-0" />;

/**
 * 远征物品栏：金币 / 遗物 / 装备 / 限次秘技。
 * 每个格子悬停（或点击）弹出名称+简介。
 */
export default function InventoryBar({ gold, relics, equipment, tempCards, lang, playClick }: InventoryBarProps) {
  const [tip, setTip] = useState<string | null>(null);

  const relicDefs = relics
    .map(id => ({ id, def: EXPEDITION_RELICS.find(x => x.id === id) }))
    .filter((x): x is { id: string; def: (typeof EXPEDITION_RELICS)[number] } => !!x.def);
  const equipDefs = equipment
    .map(id => ({ id, def: EXPEDITION_EQUIPMENTS.find(x => x.id === id) }))
    .filter((x): x is { id: string; def: (typeof EXPEDITION_EQUIPMENTS)[number] } => !!x.def);

  return (
    <div className="pixel-inventory flex items-center gap-1.5 rounded-2xl border border-amber-200/20 bg-gradient-to-b from-slate-900/95 to-slate-950/95 px-3 py-2 shadow-[0_10px_40px_rgba(0,0,0,0.6)] backdrop-blur-xl whitespace-nowrap">
      {/* 金币 */}
      <Slot
        tipKey="gold"
        activeTip={tip}
        setActiveTip={setTip}
        playClick={playClick}
        icon={<Coins size={14} />}
        tipTitle={lang === 'zh' ? '金币' : 'Gold'}
        tipDesc={lang === 'zh'
          ? '战斗胜利获得，可在商城购买限次秘技、装备与疗伤药'
          : 'Earned from battle victories. Spend it in the shop on secret cards, equipment and heal potions.'}
        className="flex items-center gap-1.5 rounded-xl border border-yellow-400/40 bg-gradient-to-b from-yellow-400/25 to-amber-600/20 px-2.5 py-1 hover:border-yellow-300/70"
      >
        <span className="text-base leading-none drop-shadow-[0_0_6px_rgba(250,204,21,0.8)]"><Coins size={20} /></span>
        <span className="text-sm font-black text-yellow-200 tabular-nums">{gold}</span>
      </Slot>

      {/* 遗物 */}
      {relicDefs.length > 0 && (
        <>
          <Divider />
          {relicDefs.map(({ id, def }) => (
            <Slot
              key={id}
              tipKey={`relic-${id}`}
              activeTip={tip}
              setActiveTip={setTip}
              playClick={playClick}
              icon={<Chest size={14} />}
              tipTitle={`${def.name[lang]}${lang === 'zh' ? ' · 遗物' : ' · Relic'}`}
              tipDesc={def.desc[lang]}
              className="grid place-items-center w-8 h-8 rounded-lg border border-sky-400/30 bg-sky-500/10 text-lg leading-none hover:border-sky-300/60"
            >
              <Chest size={22} />
            </Slot>
          ))}
        </>
      )}

      {/* 装备 */}
      {equipDefs.length > 0 && (
        <>
          <Divider />
          {equipDefs.map(({ id, def }) => (
            <Slot
              key={id}
              tipKey={`equip-${id}`}
              activeTip={tip}
              setActiveTip={setTip}
              playClick={playClick}
              icon={<Shield size={14} />}
              tipTitle={`${def.name[lang]}${lang === 'zh' ? ' · 装备' : ' · Gear'}`}
              tipDesc={def.desc[lang]}
              className="grid place-items-center w-8 h-8 rounded-lg border border-amber-400/30 bg-amber-500/10 text-lg leading-none hover:border-amber-300/60"
            >
              <Shield size={22} />
            </Slot>
          ))}
        </>
      )}

      {/* 限次秘技 */}
      {tempCards.length > 0 && (
        <>
          <Divider />
          {tempCards.map(t => {
            const c = SKILL_DB.find(x => x.id === t.cardId);
            const name = c ? c.name[lang] : t.cardId;
            return (
              <Slot
                key={t.cardId}
                tipKey={`temp-${t.cardId}`}
                activeTip={tip}
                setActiveTip={setTip}
                playClick={playClick}
                icon={<Scroll size={14} />}
                tipTitle={`${name}${lang === 'zh' ? ' · 限次秘技' : ' · Secret Card'}`}
                tipDesc={lang === 'zh'
                  ? `剩余 ${t.usesLeft} 次${c ? ` · 费用 ${c.cost}⚡` : ''}`
                  : `${t.usesLeft} uses left${c ? ` · costs ${c.cost}⚡` : ''}`}
                className="flex items-center gap-1 rounded-lg border border-fuchsia-400/30 bg-fuchsia-500/10 px-2 py-1.5 text-[11px] font-bold text-fuchsia-200 hover:border-fuchsia-300/60"
              >
                <Scroll size={16} />×{t.usesLeft}
              </Slot>
            );
          })}
        </>
      )}
    </div>
  );
}
