import type { ReactNode } from 'react';
import { ArrowLeft, Check, Copy, Crown, Edit3, LoaderCircle, Minus, Play, Plus, Share2, Target, User, Users } from 'lucide-react';
import { assetUrl, avatarUrl } from '../assets';
import CharacterChoice from './CharacterChoice';
import EditionSwitch from './EditionSwitch';
import { MAX_PLAYERS, MIN_PLAYERS } from '../data/constants';
import { getBotStyle, playerAvatar } from '../logic/bots';
import { getMultiplayerMode } from '../logic/multiplayerMatch';
import type { GameState, Lang, MultiplayerMode } from '../types';
import RetroBackdrop from './RetroBackdrop';
import './RetroMenu.css';
import RevengeModeSetting from './RevengeModeSetting';
import { isRevengeModeEnabled } from '../logic/revenge';

export interface RetroMenuProps {
  view: 'NAME_INPUT' | 'HOME' | 'LOBBY';
  lang: Lang;
  game: GameState;
  playerId?: string;
  name: string;
  avatar?: string;
  roomCode: string;
  loading: boolean;
  onlineReady: boolean;
  connectionMessage?: string;
  error?: string;
  invited: boolean;
  modePending: boolean;
  revengePending: boolean;
  reduceMotion?: boolean;
  controls?: ReactNode;
  overlays?: ReactNode;
  toast?: string;
  onNameChange: (name: string) => void;
  onChooseCharacter: () => void;
  onRoomCodeChange: (code: string) => void;
  onEnter: () => void;
  onPractice: () => void;
  onCreate: () => void;
  onJoin: () => void;
  onLeave: () => void;
  onStart: () => void;
  onAddBot: () => void;
  onRemoveBot: () => void;
  onModeChange: (mode: MultiplayerMode) => void;
  onToggleRevenge: () => void;
  onCopyInvite: () => void;
  onCopyCode: () => void;
  onModern: () => void;
  onEditProfile?: () => void;
}

function Portrait({ avatar, name, className = '' }: { avatar?: string; name: string; className?: string }) {
  return <span className={`retro-portrait ${className}`}>
    {avatar ? <img src={avatarUrl(avatar)} alt={name} draggable={false} /> : <User size={36} aria-hidden="true" />}
  </span>;
}

/** A second presentation of the same room, actions, catalogue and rules. */
export default function RetroMenu(props: RetroMenuProps) {
  const { view, lang, game, playerId, name, avatar, roomCode, loading, onlineReady, connectionMessage, error,
    invited, modePending, revengePending, reduceMotion = false, controls, overlays, toast, onNameChange, onChooseCharacter,
    onRoomCodeChange, onEnter, onPractice, onCreate, onJoin, onLeave, onStart, onAddBot, onRemoveBot,
    onModeChange, onToggleRevenge, onCopyInvite, onCopyCode, onModern, onEditProfile } = props;
  const zh = lang === 'zh';
  const host = game.hostId === playerId;
  const mode = getMultiplayerMode(game);
  const busy = loading || modePending || revengePending;
  const ready = onlineReady && !loading;
  const notice = connectionMessage || error;
  return <div className={`retro-app retro-menu retro-menu-${view.toLowerCase()}`} data-retro-view={view}>
    <RetroBackdrop reduced={reduceMotion} />
    {view === 'NAME_INPUT' && <EditionSwitch appearance="retro" lang={lang} onSwitch={onModern} />}
    {controls}
    {overlays}
    {toast && <div className="retro-menu-toast" role="status"><Check size={18} />{toast}</div>}

    {view === 'NAME_INPUT' ? <main className="retro-title-main">
      <header className="retro-title-art">
        <img className="retro-title-dragon" src={assetUrl('babydragtitle.png')} alt="" draggable={false} />
        <h1><img src={assetUrl('BoBoZantitle.png')} alt="bobozan" draggable={false} /></h1>
        <span className="retro-edition-label">{zh ? '怀旧版' : 'CLASSIC EDITION'}</span>
      </header>
      <div className="retro-title-setup">
        <div className="retro-character-picker">
          <CharacterChoice avatar={avatar} lang={lang} appearance="retro" onChoose={onChooseCharacter} />
        </div>
        <input type="text" className="retro-name-input" aria-label={zh ? '你的昵称' : 'Your nickname'} value={name} maxLength={10}
          onChange={event => onNameChange(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') onEnter(); }}
          placeholder={zh ? '你的昵称' : 'Your nickname'} autoComplete="nickname" />
      </div>
      {invited && <p className="retro-menu-invitation" role="status">{zh ? `朋友邀请你加入房间 ${roomCode}` : `You’re invited to room ${roomCode}`}</p>}
      <div className="retro-title-actions">
        <button className="retro-menu-primary" type="button" onClick={onEnter} disabled={loading}>
          {loading ? <LoaderCircle className="retro-menu-spinner" size={24} /> : <Users size={24} />}
          {invited ? (zh ? '加入朋友房间' : 'Join your friends') : (zh ? '多人模式' : 'Multiplayer')}
        </button>
        <button className="retro-menu-secondary" type="button" onClick={onPractice}>
          <Target size={18} />{zh ? '自由对练' : 'Free sparring'}
        </button>
      </div>
    </main> : view === 'HOME' ? <main className="retro-menu-panel retro-friends-panel">
      <header className="retro-menu-heading"><span className="retro-edition-label">{zh ? '怀旧版' : 'CLASSIC EDITION'}</span><h1>{zh ? '和朋友玩' : 'Play with friends'}</h1></header>
      <div className="retro-friends-profile">
        <button type="button" className="retro-profile-edit" aria-label={zh ? '修改昵称与人物' : 'Edit name and character'} onClick={onEditProfile} disabled={!onEditProfile}>
          <Portrait avatar={avatar} name={name} /><span className="retro-avatar-edit"><Edit3 size={14} /></span>
        </button>
        <strong>{name}</strong>
      </div>
      {invited && <p className="retro-menu-invitation" role="status">{zh ? `房间 ${roomCode} 的邀请已就绪。` : `Your invitation to room ${roomCode} is ready.`}</p>}
      <div className="retro-friends-actions">
        <button type="button" className="retro-menu-primary" onClick={onCreate} disabled={!ready}>
          {loading ? <LoaderCircle size={24} className="retro-menu-spinner" /> : <Users size={24} />}{zh ? '创建房间' : 'Create room'}
        </button>
        <form className="retro-join-form" onSubmit={event => { event.preventDefault(); if (ready && roomCode.length === 6) onJoin(); }}>
          <input aria-label={zh ? '房间码' : 'Room code'} type="text" inputMode="numeric" maxLength={6} value={roomCode}
            onChange={event => onRoomCodeChange(event.target.value.toUpperCase())} placeholder={zh ? '输入6位房间码' : '6-digit room code'} />
          <button type="submit" className="retro-menu-secondary" disabled={!ready || roomCode.length !== 6}>{zh ? '加入房间' : 'Join room'}</button>
        </form>
      </div>
      {notice && <p className="retro-menu-error" role="alert">{notice}</p>}
    </main> : <main className="retro-menu-panel retro-lobby-panel">
      <header className="retro-lobby-heading">
        <div className="retro-room-info">
          <button type="button" className="retro-menu-text-button" onClick={onLeave}><ArrowLeft size={16} />{zh ? '退出房间' : 'Leave room'}</button>
          <span className="retro-room-code-label">{zh ? '房间号' : 'ROOM CODE'}</span>
          <button type="button" className="retro-room-code" onClick={onCopyCode} aria-label={`${zh ? '复制房间号' : 'Copy room code'} ${roomCode}`}>
            {roomCode}<Copy size={24} />
          </button>
        </div>
        <button type="button" className="retro-menu-primary retro-invite-button" onClick={onCopyInvite}><Share2 size={18} />{zh ? '复制邀请' : 'Copy invitation'}</button>
      </header>
      <fieldset className="retro-mode-picker" disabled={!host || busy || game.status !== 'LOBBY'} aria-busy={modePending}>
        <legend>{zh ? '对战模式' : 'Game mode'}</legend>
        <div>{(['kills', 'survival'] as const).map(value => <label key={value} data-selected={mode === value}>
          <input type="radio" name="multiplayer-mode" value={value} checked={mode === value} onChange={() => onModeChange(value)} />
          <span>{value === 'kills' ? (zh ? '杀敌赛' : 'Kill race') : (zh ? '生存赛' : 'Survival')}</span>
        </label>)}</div>
      </fieldset>
      <RevengeModeSetting enabled={isRevengeModeEnabled(game.revengeMode)} lang={lang} appearance="retro"
        reduceMotion={reduceMotion} disabled={!host || busy || game.status !== 'LOBBY'} pending={revengePending} onToggle={onToggleRevenge} />
      <div className="retro-lobby-players" aria-label={zh ? '房间玩家' : 'Players in room'}>
        {game.players.map(player => <div className="retro-lobby-player" key={player.id} data-self={player.id === playerId}>
          <span className="retro-lobby-avatar"><Portrait avatar={playerAvatar(player)} name={player.name} />
            {player.id === game.hostId && <span className="retro-host-mark" title={zh ? '房主' : 'Host'}><Crown size={14} /></span>}
          </span>
          <span className="retro-lobby-player-name"><strong title={player.name}>{player.name}</strong><small>{player.isBot ? `BOT · ${getBotStyle(player.id).name[lang]}` : (zh ? '玩家' : 'PLAYER')}</small></span>
        </div>)}
        {Array.from({ length: Math.max(0, MAX_PLAYERS - game.players.length) }, (_, index) => <div className="retro-lobby-empty" key={`empty-${index}`}><span />{zh ? '等待加入…' : 'Waiting…'}</div>)}
      </div>
      {notice && <p className="retro-menu-error" role="alert">{notice}</p>}
      <footer className="retro-lobby-footer">
        {host && <div className="retro-bot-controls">
          <button type="button" className="retro-menu-icon-button" aria-label={zh ? '移除机器人' : 'Remove bot'} onClick={onRemoveBot} disabled={busy || !game.players.some(player => player.isBot)}><Minus size={19} /></button>
          <span>{zh ? '机器人' : 'BOTS'}</span>
          <button type="button" className="retro-menu-icon-button" aria-label={zh ? '添加机器人' : 'Add bot'} onClick={onAddBot} disabled={busy || game.players.length >= MAX_PLAYERS}><Plus size={19} /></button>
        </div>}
        {host ? <button type="button" className="retro-menu-primary retro-start-button" onClick={onStart} disabled={busy || game.players.length < MIN_PLAYERS}><Play size={22} fill="currentColor" />{zh ? '开始游戏' : 'Start game'}</button>
          : <p className="retro-waiting-host"><LoaderCircle size={19} className="retro-menu-spinner" />{zh ? '等待房主开始' : 'Waiting for the host'}</p>}
      </footer>
    </main>}
  </div>;
}
