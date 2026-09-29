import assert from 'node:assert/strict';
import test from 'node:test';
import { BATTLE_DIRECTIONS, SELF_SEAT, directionToward, directionTowardTable, getBattleFigure, getBattleFormation, getBattleSeat, getBattleStatusOffset, getTableGeometry } from './battleLayout';

test('atlas compass directions remain consistent',()=>{
  const p=[{x:50,y:0},{x:100,y:0},{x:100,y:50},{x:100,y:100},{x:50,y:100},{x:0,y:100},{x:0,y:50},{x:0,y:0}];
  assert.deepEqual(p.map(s=>directionToward(s,{x:50,y:50})),BATTLE_DIRECTIONS);
});

test('near-side labels inset symmetrically without moving far-side labels or the viewer',()=>{
  for(const width of [320,390,768,844,1199,1200,1440])for(let total=2;total<=8;total++){
    const bounds={width,height:width<768?960:1000},seats=getBattleFormation(total,0,width<768,bounds);
    seats.forEach((seat,index)=>{
      const offset=getBattleStatusOffset(seat,index===0,bounds),figure=getBattleFigure(seat,index===0,bounds);
      assert.ok(Math.abs(offset)<=40);
      if(index===0||!figure.foreground)assert.equal(offset,0);
      else assert.ok(Math.abs(seat.x-50)<.001||Math.sign(offset)===Math.sign(50-seat.x));
      const mirror={...seat,x:100-seat.x};
      assert.ok(Math.abs(offset+getBattleStatusOffset(mirror,index===0,bounds))<1e-8);
    });
  }
});

test('all viewers stay front-center with a straight back; duels face straight across',()=>{
  for(const compact of [false,true])for(let n=2;n<=8;n++)for(let viewer=0;viewer<n;viewer++){
    const seats=getBattleFormation(n,viewer,compact);
    assert.equal(seats[viewer].x,50);assert.equal(seats[viewer].y,85);assert.equal(seats[viewer].facing,'n');
    assert.equal(new Set(seats.map(s=>s.x+','+s.y)).size,n);
    if(n===2){const opponent=seats[1-viewer];assert.ok(Math.abs(opponent.x-50)<1e-8);assert.equal(opponent.facing,'s');}
  }
});

test('seat distances around the rendered quadrilateral are equal and mirror-symmetric',()=>{
  for(const [width,height] of [[1440,760],[1920,900],[844,760],[768,1100],[844,1100],[1024,1000],[390,960],[320,680]])for(let n=2;n<=8;n++){
    const compact=width<768,{corners}=getTableGeometry(compact);
    const pixels=(p:{x:number;y:number})=>({x:p.x*width/100,y:p.y*height/100});
    const path=[SELF_SEAT,corners[2],corners[1],corners[0],corners[3],SELF_SEAT].map(pixels);
    const lengths=path.slice(1).map((b,i)=>Math.hypot(b.x-path[i].x,b.y-path[i].y));
    const perimeter=lengths.reduce((a,b)=>a+b,0),seats=getBattleFormation(n,0,compact,{width,height});
    seats.forEach((s,r)=>{
      const p=pixels(s);let offset=0,found=false;
      for(let i=0;i<lengths.length;i++){
        const a=path[i],b=path[i+1],distance=Math.hypot(p.x-a.x,p.y-a.y);
        if(Math.abs(distance+Math.hypot(p.x-b.x,p.y-b.y)-lengths[i])<1e-5){
          assert.ok(Math.abs(offset+distance-r*perimeter/n)<1e-4);found=true;break;
        }
        offset+=lengths[i];
      }
      assert.ok(found,'seat must lie on tabletop edge');
      const opposite=seats[(n-r)%n];
      assert.ok(Math.abs(s.x+opposite.x-100)<1e-8);
      assert.ok(Math.abs(s.y-opposite.y)<1e-8);
      assert.ok(Number.isFinite(s.size)&&s.size!>0);
      assert.equal(s.facing,directionTowardTable(s,compact));
    });
  }
});

test('perspective keeps far, side and near views distinct on both screen shapes',()=>{
  for(const compact of [false,true]){
    const {corners,center}=getTableGeometry(compact);
    assert.equal(directionTowardTable({x:50,y:corners[0].y},compact),'s');
    assert.equal(directionTowardTable({x:80,y:center.y},compact),'w');
    assert.equal(directionTowardTable(corners[2],compact),'nw');
    assert.equal(directionTowardTable(corners[3],compact),'ne');
  }
  assert.deepEqual(getBattleFormation(0,0),[]);
  assert.equal(getBattleSeat(0,0,0).facing,'n');
});

test('figure offsets preserve rim seats and move side figures along the projected outward normal', () => {
  for (const width of [320,390,767,768,844,1024,1440,1920,3627]) for (let total=2; total<=8; total++) {
    const compact=width<768;
    const height=compact?(total>4?960:680):total===8&&width<=900?1100:total===7&&width<=1199?1000:width>=1600?900:760;
    const bounds={width,height}, seats=getBattleFormation(total,0,compact,bounds);
    const original=JSON.stringify(seats), {corners}=getTableGeometry(compact);
    seats.forEach((seat,index)=>{
      const figure=getBattleFigure(seat,index===0,bounds), size=seat.size!, modelHeight=size*4/3;
      const x=figure.x*width/100,y=figure.y*height/100,dx=(figure.x-seat.x)*width/100,dy=(figure.y-seat.y)*height/100;
      const labelWidth=index===0?0:Math.min(compact?86:116,size+12);
      assert.ok(x-Math.max(size,labelWidth)/2>=5.99 && x+Math.max(size,labelWidth)/2<=width-5.99);
      assert.ok(y-modelHeight*(index===0?.5:.55)>=3.99);
      if(index>0)assert.ok(y-modelHeight*.51-45>=3.99,'Header stays inside the board');
      assert.ok(dy<=.001,'Near/far figures never move down the screen');
      if(figure.foreground||seat.edge==='far')assert.ok(Math.abs(dx)<1e-7);
      else {
        const right=seat.edge==='right', a=corners[right?1:0],b=corners[right?2:3];
        const edgeX=(b.x-a.x)*width/100,edgeY=(b.y-a.y)*height/100;
        assert.ok(Math.abs(dx*edgeX+dy*edgeY)<1e-5,'Side shift stays perpendicular to its tabletop edge');
        assert.ok(right?dx>=-.001:dx<=.001,'Side shift points out of the tabletop');
      }
      const mirror=getBattleFigure(seats[(total-index)%total],index===0,bounds);
      assert.equal(figure.foreground,mirror.foreground);
      assert.ok(Math.abs(figure.x+mirror.x-100)<1e-7 && Math.abs(figure.y-mirror.y)<1e-7);
    });
    assert.equal(JSON.stringify(seats),original,'Visual adjustment never mutates logical seats');
  }
});

test('near table corners share the foreground treatment without changing their logical side', () => {
  for (const width of [390,1440]) {
    const {corners}=getTableGeometry(width<768), bounds={width,height:960};
    const nearCorner={x:80,y:corners[0].y+(corners[3].y-corners[0].y)*.76,size:80,edge:'right' as const};
    const figure=getBattleFigure(nearCorner,false,bounds);
    assert.ok(figure.foreground);
    assert.equal(figure.x,nearCorner.x);
    assert.ok(figure.y<nearCorner.y);
    assert.equal(nearCorner.edge,'right');
    const middle={...nearCorner,y:corners[0].y+(corners[3].y-corners[0].y)*.6};
    assert.equal(getBattleFigure(middle,false,bounds).foreground,false);
  }
});

test('narrow side figures have room for their entire retreat without moving logical seats', () => {
  for (const width of [320,360,390,428,600,767]) for (let total=2;total<=8;total++) {
    const bounds={width,height:total>4?960:680},seats=getBattleFormation(total,0,true,bounds);
    for(const [index,seat] of seats.entries()) {
      const figure=getBattleFigure(seat,index===0,bounds);
      if(figure.foreground||!(seat.edge==='left'||seat.edge==='right'))continue;
      const distance=Math.hypot((figure.x-seat.x)*bounds.width/100,(figure.y-seat.y)*bounds.height/100);
      assert.ok(Math.abs(distance-(seat.size!*.36+4))<.001, 'Side retreat is not clipped by viewport or header clearance');
      assert.ok(seat.size!>=36,'Even a cramped side model remains visible');
    }
  }
});
