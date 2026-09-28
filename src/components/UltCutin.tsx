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
  lang: 'zh' | 'en';
  muted: boolean;
}

const METEORS = [0, 1, 2, 3, 4, 5, 6, 7];
const SPARKS = Array.from({ length: 18 }, (_, i) => i);

export default function UltCutin({ def, playerName, skillName, lang, muted }: Props) {
  const shout = useMemo(() => pickShout(def, lang), [def, lang]);
  // 立绘缺失时降级为像素徽章，保证演出不断
  const [imgOk, setImgOk] = useState(true);

  // 冲击音效（流星落地 / 特效爆发时）
  useEffect(() => {
    const t = setTimeout(() => playSound('combat', muted), 1150);
    return () => clearTimeout(t);
  }, [muted]);

  return (
    <div className="fixed inset-0 z-[120] pointer-events-none overflow-hidden animate-ultcutin-dim">
      <style>{`
        @keyframes ultcutin-dim { from { background-color: rgba(0,0,0,0); } to { background-color: rgba(0,0,0,0.72); } }
        .animate-ultcutin-dim { animation: ultcutin-dim 0.25s ease-out forwards, ultcutin-dim-out 0.3s ease-in 2.4s forwards; }
        @keyframes ultcutin-dim-out { to { background-color: rgba(0,0,0,0); } }

        /* 角色从左侧闪入 */
        @keyframes ultcutin-enter { 0% { transform: translateX(-75vw); } 70% { transform: translateX(2vw); } 100% { transform: translateX(0); } }
        .animate-ultcutin-enter { animation: ultcutin-enter 0.45s steps(9) forwards, ultcutin-exit 0.3s ease-in 2.4s forwards; }
        @keyframes ultcutin-exit { to { transform: translateX(-75vw); opacity: 0; } }
        @keyframes ultcutin-bob { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
        .animate-ultcutin-bob { animation: ultcutin-bob 0.9s steps(4) infinite; }

        /* 速度线背景 */
        @keyframes ultcutin-speed { from { background-position: 0 0; } to { background-position: -240px 0; } }
        .ultcutin-speedlines {
          background: repeating-linear-gradient(-45deg, transparent 0 26px, rgba(255,255,255,0.06) 26px 30px);
          animation: ultcutin-speed 0.5s linear infinite;
        }

        /* 技能名横幅砸入 */
        @keyframes ultcutin-banner { 0% { transform: scale(3.2) rotate(-6deg); opacity: 0; } 18% { transform: scale(1) rotate(0deg); opacity: 1; } 82% { transform: scale(1); opacity: 1; } 100% { transform: scale(1.15); opacity: 0; } }
        .animate-ultcutin-banner { animation: ultcutin-banner 2.1s cubic-bezier(0.2,1.4,0.4,1) 0.35s both; }

        /* 漫画对话框弹出 */
        @keyframes ultcutin-bubble { 0% { transform: scale(0); } 55% { transform: scale(1.18); } 75% { transform: scale(0.95); } 100% { transform: scale(1); } }
        .animate-ultcutin-bubble { transform-origin: left center; animation: ultcutin-bubble 0.4s cubic-bezier(0.2,1.6,0.4,1) 0.75s both, ultcutin-bubble-out 0.25s ease-in 2.35s forwards; }
        @keyframes ultcutin-bubble-out { to { transform: scale(0); opacity: 0; } }

        /* 屏幕震动（像素步进） */
        @keyframes ultcutin-shake { 0%,100% { transform: translate(0,0); } 20% { transform: translate(-8px,4px); } 40% { transform: translate(6px,-6px); } 60% { transform: translate(-5px,-3px); } 80% { transform: translate(4px,5px); } }
        .animate-ultcutin-shake { animation: ultcutin-shake 0.45s steps(5) 1.15s 2; }

        /* 像素流星：左上 → 右下坠落 */
        @keyframes ultcutin-meteor-fall { from { transform: translate(0,0); } to { transform: translate(-46vw, 72vh); } }
        .px-meteor { position: absolute; width: 10px; height: 10px; }
        .px-meteor-core { width: 10px; height: 10px; background: #fff7ed;
          box-shadow: 10px 0 #ffedd5, 0 10px #fed7aa, 10px 10px #fdba74,
            20px -10px #fb923c, 30px -20px #f97316, 40px -30px #ea580c, 50px -40px #c2410c,
            -10px 20px #fdba74, -20px 30px #fb923c; }

        /* 像素火花爆裂 */
        @keyframes ultcutin-spark { from { transform: translate(0,0) scale(1); opacity: 1; } to { transform: translate(var(--sx), var(--sy)) scale(0.4); opacity: 0; } }
        .animate-ultcutin-spark { animation: ultcutin-spark 0.8s steps(8) 1.15s both; }

        /* 斩击横扫 */
        @keyframes ultcutin-slash-sweep { from { transform: translateX(110vw) skewX(-24deg); } to { transform: translateX(-110vw) skewX(-24deg); } }
        .animate-ultcutin-slash { animation: ultcutin-slash-sweep 0.5s steps(10) both; }

        /* 气浪横波 */
        @keyframes ultcutin-wave-roll { from { transform: translateY(-30vh); } to { transform: translateY(130vh); } }
        .animate-ultcutin-wave { animation: ultcutin-wave-roll 1.1s steps(14) 1.05s both; }

        /* 冲击闪光 */
        @keyframes ultcutin-flash { 0% { opacity: 0; } 12% { opacity: 0.9; } 100% { opacity: 0; } }
        .animate-ultcutin-flash { animation: ultcutin-flash 0.6s ease-out 1.15s both; }

        .ultcutin-pixeltext { text-shadow: 4px 4px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000; }
        .ultcutin-img { image-rendering: pixelated; }
      `}</style>

      {/* 速度线 + 震动容器 */}
      <div className="absolute inset-0 ultcutin-speedlines" />
      <div className="absolute inset-0 animate-ultcutin-shake">

        {/* 巨型立绘：从左侧闪入（缺图时用像素徽章兜底） */}
        <div className="absolute left-0 bottom-[6vh] animate-ultcutin-enter">
          <div className="animate-ultcutin-bob">
            {imgOk ? (
              <img
                src={assetUrl(def.image)}
                alt={skillName}
                onError={() => setImgOk(false)}
                className="ultcutin-img h-[58vh] max-w-[72vw] object-contain drop-shadow-[0_0_30px_rgba(0,0,0,0.9)]"
                draggable={false}
              />
            ) : (
              <div className="relative h-[44vh] w-[44vh] max-w-[64vw] flex items-center justify-center">
                <div
                  className="absolute inset-0 rotate-45 border-8 border-black shadow-[0_0_40px_rgba(0,0,0,0.9)]"
                  style={{ background: `linear-gradient(135deg, ${def.fxColor}, #0f172a)` }}
                />
                <div className="absolute inset-5 rotate-45 border-4 border-white/60" />
                <div className="ultcutin-pixeltext relative font-black text-white" style={{ fontSize: '17vh' }}>
                  {skillName[0]}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 技能名横幅 */}
        <div className="absolute inset-x-0 top-[30vh] flex flex-col items-center animate-ultcutin-banner">
          <div
            className="ultcutin-pixeltext text-6xl md:text-8xl font-black tracking-wider"
            style={{ color: def.fxColor }}
          >
            {skillName}！！
          </div>
          <div className="ultcutin-pixeltext mt-3 text-lg md:text-2xl font-bold text-white/90">
            — {playerName} —
          </div>
        </div>

        {/* 漫画对话框 */}
        <div className="absolute left-[34vw] md:left-[30vw] top-[10vh] max-w-[58vw] animate-ultcutin-bubble">
          <div className="relative bg-white border-4 border-black rounded-2xl px-5 py-3 shadow-[6px_6px_0_rgba(0,0,0,0.85)]">
            <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-0 h-0 border-y-[14px] border-y-transparent border-r-[16px] border-r-black" />
            <div className="absolute -left-[9px] top-1/2 -translate-y-1/2 w-0 h-0 border-y-[9px] border-y-transparent border-r-[11px] border-r-white" />
            <div className="text-2xl md:text-4xl font-black text-black whitespace-nowrap">{shout}</div>
          </div>
        </div>

        {/* 特效层 */}
        {def.fx === 'meteor' && (
          <div className="absolute inset-0">
            {METEORS.map(i => (
              <div
                key={i}
                className="px-meteor"
                style={{
                  right: `${-6 + i * 13}%`,
                  top: `${-14 - (i % 3) * 9}%`,
                  animation: `ultcutin-meteor-fall ${0.85 + (i % 4) * 0.14}s steps(16) ${1.0 + i * 0.09}s both`,
                }}
              >
                <div className="px-meteor-core" />
              </div>
            ))}
            <div className="absolute inset-0 bg-orange-200 animate-ultcutin-flash" />
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
                  background: `linear-gradient(90deg, transparent, ${def.fxColor}, #ffffff, transparent)`,
                  boxShadow: `0 0 24px ${def.fxColor}`,
                  animationDelay: `${1.05 + i * 0.16}s`,
                }}
              />
            ))}
            <div className="absolute inset-0 bg-white animate-ultcutin-flash" />
          </div>
        )}

        {def.fx === 'burst' && (
          <div className="absolute inset-0">
            <div className="absolute left-1/2 top-1/2">
              {SPARKS.map(i => {
                const ang = (i / SPARKS.length) * Math.PI * 2;
                const dist = 26 + (i % 3) * 14;
                return (
                  <div
                    key={i}
                    className="absolute w-3 h-3 animate-ultcutin-spark"
                    style={{
                      background: def.fxColor,
                      boxShadow: `0 0 12px ${def.fxColor}`,
                      ['--sx' as string]: `${Math.cos(ang) * dist}vw`,
                      ['--sy' as string]: `${Math.sin(ang) * dist}vh`,
                      animationDelay: `${1.15 + (i % 5) * 0.05}s`,
                    }}
                  />
                );
              })}
            </div>
            <div className="absolute inset-0 animate-ultcutin-flash" style={{ background: def.fxColor }} />
          </div>
        )}

        {def.fx === 'wave' && (
          <div className="absolute inset-0 overflow-hidden">
            {[0, 1, 2].map(i => (
              <div
                key={i}
                className="absolute inset-x-0 h-16 animate-ultcutin-wave"
                style={{
                  background: `repeating-linear-gradient(90deg, ${def.fxColor} 0 18px, transparent 18px 36px)`,
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
