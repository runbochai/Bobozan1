/** Invitations use the same six-digit room IDs accepted by the room service. */
export function readInvitedRoom(search: string): string | null {
  const room = new URLSearchParams(search).get('room');
  return room && /^\d{6}$/.test(room) ? room : null;
}

export function readPlayerName(): string {
  try { return (localStorage.getItem('bobozan-player-name') ?? '').trim().slice(0, 10); }
  catch { return ''; }
}

export function savePlayerName(name: string): void {
  try { localStorage.setItem('bobozan-player-name', name.trim().slice(0, 10)); }
  catch { /* Private browsing or disabled storage must not block play. */ }
}
