import type { GameState, Lang, LogEntry } from '../types';
import { SKILL_DB } from '../data/skills';

interface RevealedCard {
  playerId: string;
  name: string;
  cardId: string;
  cardName: string;
}

export interface MultiplayerRecap {
  turn: number;
  logs: LogEntry[];
  revealed: RevealedCard[];
  explanation: string | null;
}

/** Reconstruct only public evidence; a quiet turn need not generate a combat log. */
export function getMultiplayerRecap(game: GameState, lang: Lang): MultiplayerRecap | null {
  const turn = game.status === 'GAMEOVER' ? game.turn : game.turn - 1;
  if ((game.status !== 'PLAYING' && game.status !== 'GAMEOVER') || turn < 1) return null;
  const boundary = game.logs.findIndex(log => log.type === 'info' && (
    log.text === '游戏开始!' || log.text === 'Game Started!'
    || /^--- (?:第 \d+ 局|MATCH \d+) ---$/.test(log.text)
  ));
  const logs = (boundary < 0 ? game.logs : game.logs.slice(0, boundary)).filter(log => log.turn === turn);
  const revealed = game.players.flatMap(player => {
    const card = SKILL_DB.find(candidate => candidate.id === player.lastCardId);
    return card ? [{ playerId: player.id, name: player.name, cardId: card.id, cardName: card.name[lang] }] : [];
  });
  if (!logs.length && !revealed.length) return null;

  // With more than two players, a lastCardId may belong to an earlier elimination.
  // Explain only exact, silent base-card interactions between two living players.
  let explanation: string | null = null;
  if (!logs.length && game.players.length === 2 && game.players.every(player => !player.isDead) && revealed.length === 2) {
    const [first, second] = game.players;
    const zh = lang === 'zh';
    if (first.lastCardId === 'charge' && second.lastCardId === 'charge') {
      explanation = zh ? '双方都选择了攒，各获得 2 能量。' : 'Both chose Charge and each gained 2 energy.';
    } else if (first.layer === second.layer) {
      const defender = game.players.find(player => player.lastCardId === 'defend');
      const attacker = game.players.find(player => player.lastCardId === 'hong');
      if (defender && attacker && !attacker.pierce) {
        explanation = zh ? `${defender.name} 的防挡住了 ${attacker.name} 的轰。防不花能量，也不会增加能量。`
          : `${defender.name} blocked ${attacker.name}’s Blast with Defend. Defend is free and does not build energy.`;
      } else if (first.lastCardId === 'hong' && second.lastCardId === 'hong') {
        explanation = zh ? '双方都出了轰，攻击相抵。' : 'Both played Blast, so their attacks canceled each other.';
      }
    }
  }
  return { turn, logs, revealed, explanation };
}
