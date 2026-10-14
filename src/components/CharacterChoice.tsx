import { RotateCw } from 'lucide-react';
import type { Lang } from '../types';
import { playerCharacterOption } from '../logic/playerCharacter';
import CharacterPreview from './CharacterPreview';
import './CharacterChoice.css';

/** The selected full-body character also serves as the entry into the wheel. */
export default function CharacterChoice({ avatar, lang, appearance = 'current', onChoose }: {
  avatar?: string; lang: Lang; appearance?: 'current' | 'retro'; onChoose: () => void;
}) {
  const character = playerCharacterOption(avatar);
  return <button type="button" className={`character-choice character-choice-${appearance}`} onClick={onChoose}
    aria-label={`${lang === 'zh' ? '选择人物' : 'Choose character'} · ${character.name[lang]}`} aria-haspopup="dialog">
    <span className="character-choice-model"><CharacterPreview avatar={character.path} name={character.name[lang]} lang={lang} active={false} reduced /></span>
    <strong className="character-choice-name">{character.name[lang]}</strong>
    <span className="character-choice-label"><RotateCw size={12} />{lang === 'zh' ? '选择人物' : 'Choose character'}</span>
  </button>;
}
