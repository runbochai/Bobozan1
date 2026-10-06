import './ExpeditionSpeech.css';

export interface ExpeditionSpeechProps {
  line: string;
  speaker: string;
  /** Place speech toward the middle of the table, away from the screen edge. */
  side?: 'left' | 'right';
  reduceMotion?: boolean;
}

/** The caller chooses dialogue from public events, never from a pending move. */
export default function ExpeditionSpeech({ line, speaker, side = 'right', reduceMotion = false }: ExpeditionSpeechProps) {
  if (!line.trim()) return null;
  return <div className="expedition-speech" data-side={side} data-still={reduceMotion}
    role="note" aria-label={`${speaker}：${line}`}>
    <span className="expedition-speech-line" aria-hidden="true">{line}</span>
  </div>;
}
