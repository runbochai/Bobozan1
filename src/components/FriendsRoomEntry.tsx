import type { Lang } from '../types';
import { avatarUrl } from '../assets';
import { AlertTriangle, Edit, Loader, Play, Target, User, Users } from './PixelIcons';
import './FriendsRoomEntry.css';

interface Props {
  lang: Lang;
  name: string;
  avatar?: string;
  roomCode: string;
  invitedRoom: string | null;
  loading: boolean;
  onlineReady: boolean;
  connectionMessage: string;
  error: string;
  onEditProfile: () => void;
  onRoomCodeChange: (code: string) => void;
  onCreate: () => void;
  onJoin: () => void;
}

export default function FriendsRoomEntry({ lang, name, avatar, roomCode, invitedRoom, loading,
  onlineReady, connectionMessage, error, onEditProfile, onRoomCodeChange, onCreate, onJoin }: Props) {
  const zh = lang === 'zh';
  const unavailable = loading || !onlineReady;
  const canJoin = !unavailable && /^\d{6}$/.test(roomCode);
  const message = connectionMessage || error;
  return <main className="friends-room-entry" aria-labelledby="friends-room-title">
    <div className="friends-entry-panel" aria-busy={loading}>
      <header className="friends-entry-heading">
        <h1 id="friends-room-title">{zh ? '和朋友玩' : 'Play with friends'}</h1>
        <p>{zh ? '创建房间，或输入房间码加入。' : 'Create a room, or join with a room code.'}</p>
      </header>

      <div className="friends-entry-profile">
        <span className="friends-entry-avatar" aria-hidden="true">
          {avatar ? <img src={avatarUrl(avatar)} alt="" draggable={false} /> : <User size={32} />}
        </span>
        <strong className="friends-entry-name" title={name}>{name}</strong>
        <button type="button" className="friends-entry-button friends-entry-edit" onClick={onEditProfile} disabled={loading}
          aria-label={zh ? '修改玩家资料' : 'Edit player profile'} title={zh ? '修改玩家资料' : 'Edit player profile'}>
          <Edit size={18} />
        </button>
      </div>

      <button type="button" className="friends-entry-button friends-entry-create" disabled={unavailable}
        onClick={() => { if (!unavailable) onCreate(); }}>
        <span className="friends-entry-seal" aria-hidden="true">{loading ? <Loader className="friends-entry-spinner" size={20} /> : <Users size={20} />}</span>
        <span>{zh ? '创建房间' : 'Create room'}</span>
      </button>

      <form className="friends-entry-join" onSubmit={event => { event.preventDefault(); if (canJoin) onJoin(); }}>
        <label htmlFor="friends-room-code" className="friends-entry-code-label">{zh ? '已有房间码' : 'Have a room code?'}</label>
        <div className="friends-entry-join-row">
          <div className="friends-entry-code-well">
            <Target size={18} />
            <input id="friends-room-code" type="text" inputMode="numeric" autoComplete="off" spellCheck={false}
              pattern="[0-9]{6}" maxLength={6} required disabled={loading} aria-label={zh ? '房间码' : 'Room code'}
              placeholder={zh ? '输入6位房间码' : '6-digit code'} value={roomCode}
              onChange={event => onRoomCodeChange(event.target.value.replace(/\D/g, '').slice(0, 6))} />
          </div>
          <button type="submit" className="friends-entry-button friends-entry-join-button" disabled={!canJoin}>
            <span className="friends-entry-seal" aria-hidden="true">{loading ? <Loader className="friends-entry-spinner" size={18} /> : <Play size={16} />}</span>
            <span>{zh ? '加入房间' : 'Join room'}</span>
          </button>
        </div>
      </form>

      {invitedRoom && roomCode === invitedRoom && <p className="friends-entry-invitation" role="status">
        {zh ? `收到房间 ${invitedRoom} 的邀请，点击「加入房间」。` : `Invitation to room ${invitedRoom}. Choose “Join room”.`}
      </p>}
      {message && <p className="friends-entry-message" role={connectionMessage ? 'status' : 'alert'}>
        <AlertTriangle size={16} /><span>{message}</span>
      </p>}
    </div>
  </main>;
}
