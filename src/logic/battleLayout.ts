export type BattleDirection = 's' | 'sw' | 'w' | 'nw' | 'n' | 'ne' | 'e' | 'se';
export const BATTLE_DIRECTIONS: readonly BattleDirection[] = ['s', 'sw', 'w', 'nw', 'n', 'ne', 'e', 'se'];
export interface BattleSeat { x: number; y: number; size?: number; facing?: BattleDirection; edge?: 'near' | 'right' | 'far' | 'left' }
export interface BattleBounds { width: number; height: number }
export const SELF_SEAT = { x: 50, y: 85 };

/** The SVG and the seating share the same projected quadrilateral. */
export function getTableGeometry(compact = false) {
  const farY = compact ? 22 : 28;
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
        const edge = (['near','right','far','left','near'] as const)[i];
        return { x:a.x+(b.x-a.x)*t, y:a.y+(b.y-a.y)*t, edge };
      }
      distance -= lengths[i];
    }
    return { ...SELF_SEAT, edge: 'near' as const };
  });
  const scales = seats.map((s,i) => i===0 ? 1.22 : 1+.16*(s.y-corners[0].y)/(SELF_SEAT.y-corners[0].y));
  let size = Math.min(bounds.width*(compact?.26:.18), bounds.height*.25, 285);
  // Seats are waist contacts with the table, not feet standing on its surface.
  for (let i=0;i<total;i++) {
    const a=seats[i];
    size=Math.min(size,(Math.min(a.x,100-a.x)*bounds.width/50-12)/scales[i]);
    if(i>0)size=Math.min(size,(a.y*bounds.height/100-54)/(scales[i]*4/3*.55));
    for(let j=i+1;j<total;j++) {
      const b=seats[j], dx=Math.abs(a.x-b.x)*bounds.width/100, dy=Math.abs(a.y-b.y)*bounds.height/100;
      const across=(dx-14)/(.84*(scales[i]+scales[j])/2);
      const stacked=(dy-52)/(Math.max(scales[i],scales[j])*.8);
      size=Math.min(size,Math.max(across,stacked));
    }
  }
  return Array.from({length:total},(_,index)=>{
    const relative=((index-Math.max(0,myIndex))%total+total)%total;
    const seat=seats[relative];
    const facing=relative===0?'n':directionTowardTable(seat,compact);
    const result: BattleSeat = {...seat,size:Math.max(36,size)*scales[relative],facing};
    const depth=(seat.y-corners[0].y)/(SELF_SEAT.y-corners[0].y);
    if(compact && relative!==0 && depth<.70-1e-8 && (seat.edge==='left'||seat.edge==='right')) {
      // Reserve room for the full outward move. Only the cramped side figure
      // shrinks; the viewer and the far/near cast keep their chosen scale.
      const fits=(candidateSize:number)=>{
        const candidate={...result,size:candidateSize}, figure=getBattleFigure(candidate,false,bounds);
        const moved=Math.hypot((figure.x-seat.x)*bounds.width/100,(figure.y-seat.y)*bounds.height/100);
        return moved>=candidateSize*.36+4-1e-6;
      };
      if(!fits(result.size!)) {
        let low=0,high=result.size!;
        for(let step=0;step<16;step++){
          const middle=(low+high)/2;
          if(fits(middle))low=middle;else high=middle;
        }
        result.size=Math.floor(low*10)/10;
      }
    }
    return result;
  });
}

export function getBattleSeat(index: number,total: number,myIndex: number,compact=false,bounds?: BattleBounds): BattleSeat {
  return getBattleFormation(total,myIndex,compact,bounds)[index] ?? {...SELF_SEAT,facing:'n'};
}

/** Inset near-side labels toward the tabletop so they clear the rear players' feet. */
export function getBattleStatusOffset(seat: BattleSeat, self: boolean, bounds: BattleBounds): number {
  if (self || !getBattleFigure(seat, self, bounds).foreground) return 0;
  return Math.sign(50 - seat.x) * Math.min(40, (seat.size ?? 100) * .18);
}

/** Visual waist position; logical seats and their card slots stay on the rim. */
export function getBattleFigure(seat: BattleSeat, self: boolean, bounds: BattleBounds): { x: number; y: number; foreground: boolean } {
  const compact = bounds.width < 768;
  const { corners } = getTableGeometry(compact);
  const depth = (seat.y - corners[0].y) / (corners[3].y - corners[0].y);
  const foreground = self || seat.edge === 'near' || depth >= .70 - 1e-8;
  if (!Number.isFinite(bounds.width) || !Number.isFinite(bounds.height) || bounds.width <= 0 || bounds.height <= 0) return { x: seat.x, y: seat.y, foreground };
  const size = seat.size ?? Math.min(bounds.width * .18, bounds.height * .25);
  const height = size * 4 / 3;
  const x = seat.x * bounds.width / 100, y = seat.y * bounds.height / 100;
  const labelWidth = self ? 0 : Math.min(compact ? 86 : 116, size + 12);
  const edgePadding = Math.max(size / 2, labelWidth / 2) + 6;
  const anchor = self ? .5 : .55;
  const minY = Math.max(height * anchor + 4, self ? 0 : height * (anchor - .04) + 49);
  let nx = 0, ny = -1, distance = height * .08;
  if (!foreground && seat.edge === 'far') distance = height * .12 + 4;
  if (!foreground && (seat.edge === 'left' || seat.edge === 'right')) {
    const right = seat.edge === 'right';
    const a = corners[right ? 1 : 0], b = corners[right ? 2 : 3];
    const dx = (b.x - a.x) * bounds.width / 100, dy = (b.y - a.y) * bounds.height / 100;
    const length = Math.hypot(dx, dy);
    nx = (right ? dy : -dy) / length;
    ny = -Math.abs(dx) / length;
    distance = size * (compact ? .36 : .22) + 4;
  }
  // Clamp the displacement, not individual coordinates: side characters keep
  // moving along the actual projected edge normal even beside a narrow viewport.
  if (nx > 0) distance = Math.min(distance, (bounds.width - edgePadding - x) / nx);
  if (nx < 0) distance = Math.min(distance, (x - edgePadding) / -nx);
  if (ny < 0) distance = Math.min(distance, (y - minY) / -ny);
  distance = Math.max(0, distance);
  return { x: (x + nx * distance) / bounds.width * 100, y: (y + ny * distance) / bounds.height * 100, foreground };
}
