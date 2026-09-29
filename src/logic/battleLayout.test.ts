import assert from 'node:assert/strict';
import test from 'node:test';
import { BATTLE_DIRECTIONS, SELF_SEAT, directionToward, directionTowardTable, getBattleFormation, getBattleSeat, getTableGeometry } from './battleLayout';

test('atlas compass directions remain consistent',()=>{
  const p=[{x:50,y:0},{x:100,y:0},{x:100,y:50},{x:100,y:100},{x:50,y:100},{x:0,y:100},{x:0,y:50},{x:0,y:0}];
  assert.deepEqual(p.map(s=>directionToward(s,{x:50,y:50})),BATTLE_DIRECTIONS);
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
