import {MeshBuilder} from '@babylonjs/core/Meshes/meshBuilder.js';
import {Vector3} from '@babylonjs/core/Maths/math.vector.js';
import {smooth} from './post-office-time-data.js';

const TAU=Math.PI*2,mod=(n,d)=>((n%d)+d)%d;
// The terrain is the original, provisional landscape surface, not a survey.
function groundHeight(x,z){const edge=Math.max(Math.abs(x-14)/38,Math.abs(-z-12)/36);return -1.05+.55*Math.sin(x*.14)*Math.cos(z*.12)*Math.min(1,Math.max(0,(edge-.25)*1.5));}
function surfaceHeight(year,x,z){const path=year>=1838&&((x>=-6&&x<=36&&z>=.35&&z<=6)||(x>=-6&&x<=-.4&&z>=-39&&z<=.35));const road=year>=1920&&((x>=-16&&x<=54&&z>=7&&z<=17)||(x>=-17&&x<=-7&&z>=-50&&z<=7));return path||road?-.60:groundHeight(x,z);}

export function createCountryLife(scene,components,{node,finish,cylinder,material,C}){
 const animals=[];
 const fur=material('dingo fur','#aa783d'),pale=material('pale fur','#d7c5a0'),dark=material('wallaby fur','#514d40'),brown=material('bandicoot fur','#89745b');
 let serial=0,lastState={};
 function oval(name,size,pos,mat,parent){const mesh=finish(MeshBuilder.CreateSphere(name+serial++,{diameter:1,segments:6},scene),mat,parent,pos);mesh.scaling.set(...size);return mesh;}
 function tube(name,points,radius,mat,parent){return finish(MeshBuilder.CreateTube(name+serial++,{path:points.map(p=>new Vector3(...p)),radius,tessellation:6},scene),mat,parent);}
 function quadruped(kind,index){
  const root=node(kind+' '+index),body=node('animal body',root),dingo=kind==='Dingo',mat=dingo?fur:brown,legs=[];
  oval('animal torso',dingo?[.40,.46,1.06]:[.25,.23,.43],[0,dingo?.57:.21,0],mat,body);
  const head=node('animal head',body);head.position.set(0,dingo?.79:.22,dingo?.52:.25);
  oval('head',dingo?[.29,.31,.36]:[.15,.15,.19],[0,0,0],mat,head);
  const muzzle=cylinder('tapered muzzle',dingo?.30:.18,dingo?.09:.015,dingo?.20:.10,[0,dingo?-.05:-.035,dingo?.25:.13],mat,head);muzzle.rotation.x=Math.PI/2;
  oval('nose',dingo?[.09,.07,.065]:[.035,.03,.035],[0,dingo?-.05:-.035,dingo?.405:.225],C.black,head);
  for(const side of [-1,1]){
   const ear=cylinder('pointed ear',dingo?.23:.10,0,dingo?.16:.065,[side*(dingo?.105:.065),dingo?.235:.11,-.045],mat,head);ear.scaling.z=.55;
   oval('eye',[dingo?.035:.02,dingo?.035:.02,.025],[side*(dingo?.13:.066),.035,dingo?.125:.06],C.black,head);
   for(const front of [-1,1]){
    const leg=node('animal leg',body);leg.position.set(side*(dingo?.15:.09),dingo?.53:.20,front*(dingo?.34:.14));legs.push(leg);
    cylinder('lower leg',dingo?.48:.16,dingo?.10:.042,dingo?.068:.035,[0,dingo?-.23:-.07,0],mat,leg);
    oval('paw',dingo?[.10,.08,.17]:[.06,.05,.09],[0,dingo?-.49:-.175,.035],dingo?pale:mat,leg);
   }
  }
  const tail=node('tail',body);tail.position.set(0,dingo?.59:.22,dingo?-.49:-.21);
  tube('tail',dingo?[[0,0,0],[0,-.13,-.20],[.04,-.27,-.40],[.06,-.24,-.57]]:[[0,0,0],[0,-.08,-.15],[.02,-.12,-.27]],dingo?.055:.017,mat,tail);
  if(dingo)oval('pale tail tip',[.09,.10,.15],[.06,-.24,-.55],pale,tail);
  animals.push({kind,index,root,body,head,legs,tail});
 }
 quadruped('Dingo',0);for(let i=0;i<3;i++)quadruped('Bandicoot',i);
 for(let i=0;i<2;i++){
  const root=node('Swamp wallaby '+i),body=node('wallaby body',root),legs=[],arms=[];
  oval('haunch',[.45,.60,.49],[0,.49,-.04],dark,body);oval('chest',[.30,.49,.29],[0,.80,.13],dark,body);oval('pale chest',[.20,.32,.035],[0,.81,.29],pale,body);
  const head=node('wallaby head',body);head.position.set(0,1.09,.22);oval('head',[.22,.27,.28],[0,0,0],dark,head);oval('muzzle',[.16,.13,.22],[0,-.07,.15],brown,head);
  for(const side of [-1,1]){
   const ear=oval('long ear',[.075,.30,.09],[side*.10,.23,-.025],dark,head);ear.rotation.z=-side*.14;
   oval('eye',[.029,.032,.025],[side*.105,.02,.105],C.black,head);
   const leg=node('hind leg',body);leg.position.set(side*.17,.36,-.01);legs.push(leg);oval('thigh',[.21,.31,.23],[0,0,0],dark,leg);oval('long foot',[.13,.09,.40],[0,-.30,.13],dark,leg);
   const arm=node('small forearm',body);arm.position.set(side*.16,.87,.18);arms.push(arm);cylinder('forearm',.29,.065,.045,[0,-.13,.04],dark,arm);
  }
  const tail=node('wallaby tail',body);tube('long balancing tail',[[0,.29,-.19],[0,.13,-.49],[0,.07,-.84],[0,.065,-1.07]],.064,dark,tail);
  animals.push({kind:'Swamp wallaby',index:i,root,body,head,legs,arms,tail});
 }
 const trunks=components.filter(c=>c.rec.kind==='earlyTree'&&c.rec.name.endsWith('_trunk')).map(c=>({mesh:c.mesh,point:c.mesh.getAbsolutePosition().clone()}));
 function avoidTrunks(x,z){for(const t of trunks){if(!t.mesh.isEnabled())continue;const dx=x-t.point.x,dz=z-t.point.z,d=Math.hypot(dx,dz),clear=.85;if(d<clear){x+=(dx/(d||1))* (clear-d);z+=(dz/(d||1))*(clear-d);}}return [x,z];}
 function update(year,seconds,waterOn){
  const habitat=Math.max(1-smooth(1800,1837,year),smooth(2220,2400,year)),flooded=waterOn&&year>2160;
  for(const a of animals){
   const active=habitat>.01&&!flooded;a.root.setEnabled(active);if(!active)continue;
   a.root.scaling.setAll(habitat);
   const wallaby=a.kind==='Swamp wallaby',dingo=a.kind==='Dingo',offset=dingo?.11:wallaby?.41+a.index*.20:.17+a.index*.26;
   const phase=mod(seconds/(dingo?75:wallaby?65:58)+offset,1),travel=smooth(0,wallaby?.42:.64,phase),moving=phase>.02&&phase<(wallaby?.40:.62),angle=TAU*travel;
   const rx=dingo?17:wallaby?3.2:1.7,rz=dingo?1.2:wallaby?1.4:.7,cx=dingo?10:wallaby?7+a.index*19:1+a.index*13,cz=dingo?13:wallaby?8+a.index*4:6+a.index*3;
   let x=cx+rx*Math.cos(angle),z=cz+rz*Math.sin(angle);if(year<1837)[x,z]=avoidTrunks(x,z);
   a.root.position.set(x,surfaceHeight(year,x,z),z);a.root.rotation.y=Math.atan2(-rx*Math.sin(angle),rz*Math.cos(angle));
   const gait=seconds*(wallaby?7:dingo?8:15)+a.index;
   a.body.position.y=wallaby&&moving?.18*Math.abs(Math.sin(gait)):moving?.012*Math.sin(gait*2):0;
   a.legs.forEach((l,i)=>l.rotation.x=moving?(wallaby?.23*Math.sin(gait):.32*Math.sin(gait+(i===0||i===3?0:Math.PI))):0);
   a.head.rotation.x=moving?0:.20+.12*Math.sin(seconds*.65+a.index);a.head.rotation.y=moving?0:.12*Math.sin(seconds*.45+a.index);
   a.tail.rotation.y=Math.sin(seconds*1.2+a.index)*.045;a.arms?.forEach(l=>l.rotation.x=moving?-.35:.12);
  }
  const visibleAnimals=animals.filter(a=>a.root.isEnabled());
  lastState={people:0,peopleSamples:[],wardrobe:null,animals:visibleAnimals.map(a=>({species:a.kind,index:a.index,position:a.root.position.asArray(),stride:a.legs[0].rotation.x,head:a.head.rotation.x})),habitat,animalsHiddenForWater:flooded};
 }
 return {update,getState:()=>lastState};
}
