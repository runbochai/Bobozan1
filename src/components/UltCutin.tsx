import './UltCutin.css';
// src/components/UltCutin.tsx
// 必杀技演出 overlay：左侧闪入巨型像素立绘 → 压暗全屏 → 漫画对话框喊话 → 像素风技能特效
import { useEffect, useMemo, useState } from 'react';
import type { UltCutinDef } from '../data/ultCutins';
import { pickShout } from '../data/ultCutins';
import { assetUrl } from '../assets';
import { playSound } from '../audio/sound';

interface Props {
  def: UltCutinDef;
  playerName: string;
  skillName: string;
  level: number;
  lang: 'zh' | 'en';
  muted: boolean;
  /** 多个同屏时的序号（0 起） */
  index?: number;
  /** 同屏总数 */
  total?: number;
}

const METEORS = [0, 1, 2, 3, 4, 5, 6, 7];
const SPARKS = Array.from({ length: 18 }, (_, i) => i);

export default function UltCutin({ def, playerName, skillName, level, lang, muted, index = 0, total = 1 }: Props) {
  const shout = useMemo(() => pickShout(def, lang), [def, lang]);
  // 立绘缺失时降级为像素徽章，保证演出不断
  const [imgOk, setImgOk] = useState(true);
  // 多个同屏：立绘横向排开、横幅纵向错开，避免完全重叠
  const multi = total > 1;
  const columns = total > 1 ? 2 : 1;
  const rows = Math.ceil(total / columns);

  // 冲击音效（流星落地 / 特效爆发时）
  useEffect(() => {
    if (index > 0) return;
    const t = setTimeout(() => playSound('combat', muted), 1150);
    return () => clearTimeout(t);
  }, [muted, index]);

  return (
    <div
      className="fixed inset-0 z-[120] pointer-events-none overflow-hidden animate-ultcutin-dim"
      style={{ ['--ultdim' as string]: index === 0 ? 0.68 : 0 }}
    >
      {/* 速度线 + 震动容器 */}
      {index === 0 && <div className="absolute inset-0 ultcutin-speedlines" />}
      <div className="absolute inset-0 animate-ultcutin-shake" style={multi ? {
        left: `${(index % columns) * 100 / columns}%`, top: `${Math.floor(index / columns) * 100 / rows}%`,
        width: `${100 / columns}%`, height: `${100 / rows}%`, overflow: 'hidden',
      } : undefined}>

        {/* 巨型立绘：从左侧闪入（缺图时用像素徽章兜底）；多同屏时横向排开 */}
        <div
          className="absolute animate-ultcutin-enter"
          style={{ left: '2%', bottom: '4%', width: multi ? '96%' : 'min(78vw, 760px)', height: multi ? '65%' : '68%' }}
        >
          <div className="animate-ultcutin-bob h-full">
            {imgOk ? (
              <img
                src={assetUrl(def.image)}
                alt={skillName}
                onError={() => setImgOk(false)}
                className="ultcutin-img object-contain object-left-bottom h-full w-full drop-shadow-[6px_6px_0_#080e26]"
                draggable={false}
              />
            ) : (
              <div className="relative h-full w-full flex items-center justify-center">
                <div
                  className="absolute inset-4 border-8 border-black shadow-[8px_8px_0_#0f172a]"
                  style={{ background: def.fxColor }}
                />
                <div className="absolute inset-8 border-4 border-white/60" />
                <div className="ultcutin-pixeltext relative font-black text-white" style={{ fontSize: '17vh' }}>
                  {skillName[0]}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 技能名横幅；多同屏时纵向错开 */}
        <div
          className="absolute inset-x-0 flex flex-col items-center animate-ultcutin-banner"
          style={{ top: '12%', padding: '0 12px', textAlign: 'center' }}
        >
          <div
            className={`ultcutin-pixeltext font-black tracking-wider ${multi ? 'text-xl md:text-3xl' : 'text-3xl sm:text-5xl md:text-7xl'}`}
            style={{ color: def.fxColor }}
          >
            {skillName}！！
          </div>
          <div className={`ultcutin-pixeltext mt-3 font-bold text-white/90 ${multi ? 'text-xs md:text-sm' : 'text-sm md:text-xl'}`}>
            Lv.{level} · {playerName}
          </div>
        </div>

        {/* 漫画对话框；多同屏时错开位置 */}
        <div
          className="absolute animate-ultcutin-bubble"
          style={{ right: '5%', top: '34%', maxWidth: multi ? '80%' : '55%' }}
        >
          <div className="relative bg-white border-4 border-black px-3 py-2 shadow-[6px_6px_0_rgba(0,0,0,0.85)]">
            <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-0 h-0 border-y-[14px] border-y-transparent border-r-[16px] border-r-black" />
            <div className="absolute -left-[9px] top-1/2 -translate-y-1/2 w-0 h-0 border-y-[9px] border-y-transparent border-r-[11px] border-r-white" />
            <div className={`font-black text-black break-words ${multi ? "text-sm md:text-xl" : "text-lg md:text-3xl"}`}>{shout}</div>
          </div>
        </div>

        {/* 特效层 */}
        {(def.fx === 'meteor' || def.fx === 'ice') && (
          <div className="absolute inset-0">
            {METEORS.map(i => (
              <div
                key={i}
                className="px-meteor"
                style={{
                  right: `${-6 + i * 13}%`,
                  top: `${-14 - (i % 3) * 9}%`,
                  animation: `ultcutin-meteor-fall ${0.85 + (i % 4) * 0.14}s steps(16) ${0.85 + i * 0.07}s both`,
                }}
              >
                <div className={def.fx === "ice" ? "px-ice-core" : "px-meteor-core"} />
              </div>
            ))}
            {def.fx === "meteor" && <div className="px-impact" />}
            <div className="absolute inset-0 animate-ultcutin-flash" style={{ background: def.fxColor }} />
          </div>
        )}

        {(def.fx === 'palm' || def.fx === 'kick') && (
          <div className="absolute inset-0 overflow-hidden">
            {Array.from({ length: def.fx === 'palm' ? 5 : 3 }, (_, i) => (
              <div key={i} className={`px-strike ${def.fx === 'palm' ? 'px-palm' : 'px-boot'}`}
                style={{ left: `${28 + (i % 3) * 20}%`, top: `${38 + (i % 2) * 22}%`,
                  color: def.fxColor, animationDelay: `${1.05 + i * 0.2}s` }} />
            ))}
          </div>
        )}

        {def.fx === 'slash' && (
          <div className="absolute inset-0 overflow-hidden">
            {[0, 1, 2].map(i => (
              <div
                key={i}
                className="absolute left-0 w-[130vw] animate-ultcutin-slash"
                style={{
                  top: `${22 + i * 16}%`,
                  height: `${10 - i * 2}px`,
                  background: def.fxColor,
                  boxShadow: `8px 8px 0 #fff, -8px -8px 0 ${def.fxColor}`,
                  animationDelay: `${1.05 + i * 0.16}s`,
                }}
              />
            ))}
            <div className="absolute inset-0 bg-white animate-ultcutin-flash" />
          </div>
        )}

        {(['burst', 'steam', 'stars'] as string[]).includes(def.fx) && (
          <div className="absolute inset-0">
            <div className="absolute left-1/2 top-1/2">
              {(def.fx === 'stars' ? [0, 1, 2] : SPARKS).map(i => {
                const ang = (i / (def.fx === 'stars' ? 3 : SPARKS.length)) * Math.PI * 2;
                const dist = 26 + (i % 3) * 14;
                const steam = def.fx === 'steam';
                return (
                  <div
                    key={i}
                    className="absolute w-3 h-3 animate-ultcutin-spark"
                    style={{
                      background: steam ? '#fff4d6' : def.fxColor,
                      width: def.fx === 'stars' ? 32 : steam ? 24 : 12,
                      height: def.fx === 'stars' ? 32 : steam ? 24 : 12,
                      clipPath: def.fx === 'stars' ? 'polygon(33% 0,66% 0,66% 33%,100% 33%,100% 66%,66% 66%,66% 100%,33% 100%,33% 66%,0 66%,0 33%,33% 33%)' : undefined,
                      boxShadow: `4px 4px 0 #0f172a`,
                      ['--sx' as string]: `${Math.cos(ang) * dist}vw`,
                      ['--sy' as string]: `${steam ? -dist : Math.sin(ang) * dist}vh`,
                      animationDelay: `${1.15 + (i % 5) * 0.05}s`,
                    }}
                  />
                );
              })}
            </div>
            <div className="absolute inset-0 animate-ultcutin-flash" style={{ background: def.fxColor }} />
          </div>
        )}

        {(def.fx === 'wave' || def.fx === 'beam') && (
          <div className="absolute inset-0 overflow-hidden">
            {[0, 1, 2].map(i => (
              <div
                key={i}
                className={def.fx === "beam" ? "absolute w-32 h-4 animate-ultcutin-beam" : "absolute inset-x-0 h-16 animate-ultcutin-wave"}
                style={{
                  background: `repeating-linear-gradient(90deg, ${def.fxColor} 0 18px, transparent 18px 36px)`,
                  top: def.fx === 'beam' ? `${40 + i * 12}%` : undefined,
                  opacity: 0.75 - i * 0.18,
                  animationDelay: `${1.0 + i * 0.22}s`,
                }}
              />
            ))}
            <div className="absolute inset-0 animate-ultcutin-flash" style={{ background: def.fxColor }} />
          </div>
        )}
      </div>
    </div>
  );
}
