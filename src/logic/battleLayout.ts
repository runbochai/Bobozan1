export type BattleDirection = 's' | 'sw' | 'w' | 'nw' | 'n' | 'ne' | 'e' | 'se';
export const BATTLE_DIRECTIONS: readonly BattleDirection[] = ['s', 'sw', 'w', 'nw', 'n', 'ne', 'e', 'se'];
export interface BattleSeat { x: number; y: number; size?: number; facing?: BattleDirection }
export interface BattleBounds { width: number; height: number }
export const SELF_SEAT = { x: 50, y: 85 };

/** The SVG and the seating share the same projected quadrilateral. */
export function getTableGeometry(compact = false) {
  const farY = compact ? 30 : 42;
  const height = (SELF_SEAT.y - farY) * 620 / 470;
  const frame = { x: compact ? 14 : 7, y: farY - 75 / 620 * height, width: compact ? 72 : 86, height };
  const point = (x: number, y: number) => ({
    x: frame.x + x / 1000 * frame.width,
    y: frame.y + y / 620 * frame.height,
  });
  const corners = [point(180,75), point(820,75), point(975,545), point(25,545)];
  return { frame, corners, center: { x: 50, y: (farY + SELF_SEAT.y) / 2 } };
}

/** Screen coordinates: positive Y points down. Atlas starts at south, clockwise. */
export function directionToward(seat: BattleSeat, target: BattleSeat = { x: 50, y: 48 }): BattleDirection {
  const angle = Math.atan2(target.y - seat.y, target.x - seat.x);
  const index = Math.round((angle - Math.PI / 2) / (Math.PI / 4));
  return BATTLE_DIRECTIONS[((index % 8) + 8) % 8];
}

/** Undo the tabletop perspective before choosing an atlas angle. */
export function directionTowardTable(seat: BattleSeat, compact=false): BattleDirection {
  const {corners}=getTableGeometry(compact);
  const depth=(seat.y-corners[0].y)/(corners[3].y-corners[0].y);
  const halfWidth=(corners[1].x-50)*(1-depth)+(corners[2].x-50)*depth;
  return directionToward({x:(seat.x-50)/halfWidth,y:depth*2-1},{x:0,y:0});
}

export function getBattleFormation(total: number, myIndex: number, compact = false,
  bounds: BattleBounds = { width: compact ? 390 : 1440, height: compact ? 900 : 760 }): BattleSeat[] {
  if (total <= 0) return [];
  const { corners } = getTableGeometry(compact);
  const path = [SELF_SEAT, corners[2], corners[1], corners[0], corners[3], SELF_SEAT];
  const lengths = path.slice(1).map((b,i) => Math.hypot(
    (b.x-path[i].x)*bounds.width/100, (b.y-path[i].y)*bounds.height/100,
  ));
  const perimeter = lengths.reduce((a,b) => a+b, 0);
  const seats = Array.from({ length: total }, (_,relative) => {
    let distance = perimeter * relative / total;
    for (let i=0;i<lengths.length;i++) {
      if (distance <= lengths[i] || i === lengths.length-1) {
        const a=path[i], b=path[i+1], t=distance/lengths[i];
        return { x:a.x+(b.x-a.x)*t, y:a.y+(b.y-a.y)*t };
      }
      distance -= lengths[i];
    }
    return { ...SELF_SEAT };
  });
  const scales = seats.map((s,i) => i===0 ? 1.22 : 1+(s.y-corners[0].y)/240);
  let size = Math.min(bounds.width*(compact?.26:.18), bounds.height*.25, 285);
  // Scale the cast together; labels cannot move the feet off their seats.
  for (let i=0;i<total;i++) {
    const a=seats[i];
    size=Math.min(size,(Math.min(a.x,100-a.x)*bounds.width/50-12)/scales[i]);
    if(i>0)size=Math.min(size,(a.y*bounds.height/100-64)/(scales[i]*4/3));
    for(let j=i+1;j<total;j++) {
      const b=seats[j], dx=Math.abs(a.x-b.x)*bounds.width/100, dy=Math.abs(a.y-b.y)*bounds.height/100;
      const across=(dx-14)/(.84*(scales[i]+scales[j])/2);
      const stacked=(dy-52)/(Math.max(scales[i],scales[j])*1.2);
      size=Math.min(size,Math.max(across,stacked));
    }
  }
  return Array.from({length:total},(_,index)=>{
    const relative=((index-Math.max(0,myIndex))%total+total)%total;
    const seat=seats[relative];
    const facing=relative===0?'n':directionTowardTable(seat,compact);
    return {...seat,size:Math.max(36,size)*scales[relative],facing};
  });
}

export function getBattleSeat(index: number,total: number,myIndex: number,compact=false,bounds?: BattleBounds): BattleSeat {
  return getBattleFormation(total,myIndex,compact,bounds)[index] ?? {...SELF_SEAT,facing:'n'};
}
