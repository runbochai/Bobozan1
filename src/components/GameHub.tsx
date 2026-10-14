import { useId, useRef, useState, type ReactNode } from 'react';
import { assetUrl, avatarUrl } from '../assets';
import { AVATAR_OPTIONS } from '../data/avatars';
import type { Lang } from '../types';
import CrownTitleScene, { CrownTitleCrest } from './CrownTitleScene';
import { Crown, Edit, Film, Play, Swords, Target, User, Users, X } from './PixelIcons';
import './GameHub.css';

interface GameHubProps {
  lang: Lang;
  playerName: string;
  avatar: string;
  onNameChange: (name: string) => void;
  onAvatarChange: (avatar: string) => void;
  onMultiplayer: () => void;
  onSolo: () => void;
  onPractice: () => void;
  onReplayStory: () => void;
  invitedRoom?: string | null;
  busy?: boolean;
  best?: number;
  /** Display-ready, one-based stage number for the saved journey. */
  savedStage?: number | null;
  onResume?: () => void;
  children?: ReactNode;
}

export default function GameHub({
  lang, playerName, avatar, onNameChange, onAvatarChange,
  onMultiplayer, onSolo, onPractice, onReplayStory,
  invitedRoom, busy = false, best = 0, savedStage, onResume, children,
}: GameHubProps) {
  const profileDialog = useRef<HTMLDialogElement>(null);
  const nameInput = useRef<HTMLInputElement>(null);
  const backdropPressed = useRef(false);
  const [draftName, setDraftName] = useState(playerName);
  const [draftAvatar, setDraftAvatar] = useState(avatar);
  const profileId = useId();
  const zh = lang === 'zh';
  const canResume = !!onResume && typeof savedStage === 'number' && Number.isInteger(savedStage) && savedStage > 0;

  const openProfile = () => {
    setDraftName(playerName);
    setDraftAvatar(avatar);
    profileDialog.current?.showModal();
    nameInput.current?.focus({ preventScroll: true });
  };

  return <main className="pixel-app game-hub" data-lang={lang}>
    {children}
    <div className="game-hub__world"><CrownTitleScene showCart /></div>
    <div className="game-hub__vignette" aria-hidden="true" />

    <div className="game-hub__content">
      <header className="game-hub__brand">
        <h1>啵啵仔</h1>
        <p>{zh ? '王冠战争' : 'THE CROWN WAR'}</p>
        <CrownTitleCrest />
      </header>

      <nav className="game-hub__modes" aria-label={zh ? '选择游戏模式' : 'Choose a game mode'}>
        {invitedRoom && <div className="game-hub__invite" role="status">
          <Users size={18} />
          <span>{zh ? '朋友的牌桌' : 'Your friends’ table'} <strong>{invitedRoom}</strong></span>
        </div>}

        {canResume && <button className="game-hub__continue" type="button" onClick={onResume} disabled={busy}>
          <Play size={18} />
          <span>{zh ? '继续征程' : 'Continue journey'}</span>
          <small>{zh ? `第 ${savedStage} 关开局` : `Stage ${savedStage} start`}</small>
          <span className="game-hub__arrow" aria-hidden="true">›</span>
        </button>}

        <button className="game-hub__mode game-hub__mode--multiplayer" type="button" onClick={onMultiplayer} disabled={busy}>
          <span className="game-hub__mode-icon"><Users size={26} /></span>
          <span className="game-hub__mode-label">
            <strong>{busy ? (zh ? '正在连接…' : 'Connecting…') : invitedRoom ? (zh ? '加入朋友' : 'Join friends') : (zh ? '多人对战' : 'Multiplayer')}</strong>
            <small>{invitedRoom ? (zh ? `前往房间 ${invitedRoom}` : `Enter room ${invitedRoom}`) : (zh ? '2–8 人 · 同时出招' : '2–8 players · Simultaneous moves')}</small>
          </span>
          <span className="game-hub__arrow" aria-hidden="true">›</span>
        </button>

        <button className="game-hub__mode game-hub__mode--solo" type="button" onClick={onSolo} disabled={busy}>
          <span className="game-hub__mode-icon"><Swords size={26} /></span>
          <span className="game-hub__mode-label">
            <strong>{zh ? '单人远征' : 'Solo expedition'}</strong>
            <small>{canResume ? (zh ? '开启新的征程' : 'Begin a new journey') : (zh ? '从灯尾镇走向王城' : 'From Emberwick to the Crown')}</small>
          </span>
          <span className="game-hub__arrow" aria-hidden="true">›</span>
        </button>

        <button className="game-hub__practice" type="button" onClick={onPractice} disabled={busy}>
          <Target size={17} /><span>{zh ? '练习场' : 'Practice arena'}</span>
          <span className="game-hub__practice-note">{zh ? '随时试两手' : 'Try a few moves'}</span>
        </button>
      </nav>

      <footer className="game-hub__footer">
        <div className="game-hub__player-row">
          <button className="game-hub__profile" type="button" onClick={openProfile} aria-haspopup="dialog" aria-label={zh ? '更改昵称和头像' : 'Edit nickname and portrait'}>
            <span className="game-hub__portrait">{avatar ? <img src={avatarUrl(avatar)} alt="" /> : <User size={24} />}</span>
            <span className="game-hub__player-name">{playerName.trim() || (zh ? '旅人' : 'Traveler')}</span>
            <Edit size={13} />
          </button>
          {best > 0 && <span className="game-hub__record"><Crown size={13} />{zh ? `最远 ${best} 关` : `Best · Stage ${best}`}</span>}
        </div>
        <button className="game-hub__story" type="button" onClick={onReplayStory} disabled={busy}><Film size={14} />{zh ? '重看开场漫画' : 'Replay opening comic'}</button>
      </footer>
    </div>

    <dialog ref={profileDialog} className="game-hub__profile-dialog" aria-labelledby={`${profileId}-title`}
      onPointerDown={event => { backdropPressed.current = event.target === event.currentTarget; }}
      onClick={event => { if (event.target === event.currentTarget && backdropPressed.current) profileDialog.current?.close(); backdropPressed.current = false; }}>
      <form className="game-hub__profile-form" onSubmit={event => {
        event.preventDefault();
        onNameChange(draftName.trim());
        onAvatarChange(draftAvatar);
        profileDialog.current?.close();
      }}>
        <header><h2 id={`${profileId}-title`}>{zh ? '你的模样' : 'Your profile'}</h2><button className="game-hub__close" type="button" aria-label={zh ? '关闭' : 'Close'} onClick={() => profileDialog.current?.close()}><X size={16} /></button></header>
        <label htmlFor={`${profileId}-name`}>{zh ? '昵称' : 'Nickname'}<small>{zh ? '可留空' : 'Optional'}</small></label>
        <input ref={nameInput} id={`${profileId}-name`} autoComplete="nickname" maxLength={10} placeholder={zh ? '旅人' : 'Traveler'} value={draftName} onChange={event => setDraftName(event.target.value)} />
        <fieldset>
          <legend>{zh ? '头像' : 'Portrait'}</legend>
          <div className="game-hub__avatar-grid">
            {AVATAR_OPTIONS.map(({ path, name }) => <button key={path} type="button" className="game-hub__avatar-option" aria-label={name[lang]} aria-pressed={!!draftAvatar && avatarUrl(draftAvatar) === assetUrl(path)} title={name[lang]} onClick={() => setDraftAvatar(path)}><img src={assetUrl(path)} alt="" loading="lazy" /></button>)}
            <button type="button" className="game-hub__avatar-option game-hub__avatar-default" aria-label={zh ? '默认头像' : 'Default portrait'} aria-pressed={!draftAvatar} title={zh ? '默认头像' : 'Default portrait'} onClick={() => setDraftAvatar('')}><User size={27} /></button>
          </div>
        </fieldset>
        <button className="game-hub__save" type="submit">{zh ? '就这样' : 'Save profile'}</button>
      </form>
    </dialog>
  </main>;
}
