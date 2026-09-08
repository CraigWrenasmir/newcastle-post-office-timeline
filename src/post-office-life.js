import { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData.js';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode.js';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import { ShaderMaterial } from '@babylonjs/core/Materials/shaderMaterial.js';
import { Color3 } from '@babylonjs/core/Maths/math.color.js';
import { Vector3, Quaternion } from '@babylonjs/core/Maths/math.vector.js';
import { clamp, smooth } from './post-office-time-data.js';
import {createCountryLife} from './post-office-country.js';

// A separate clock animates activity within a year. Every pose is evaluated
// directly from (year, seconds, season), so seeks never accumulate transforms.
const TAU=Math.PI*2,mod=(n,d)=>((n%d)+d)%d;
export const periodFor=year=>year<1903?null:year<1960?'1920s':year<2005?'1970s':year<2080?'contemporary':null;
export function treeLife(year,seconds,index){
 const elapsed=Math.max(0,year-1026+seconds*.06),steady=index%7!==6;
 if(steady){const age=clamp((elapsed+index*5)/650);return {age,steady,scale:.64+(index%5)*.065+.65*smooth(0,1,age),fall:0};}
 // Only three of 27 trees cycle through loss and regeneration. The long,
 // staggered cycle prevents a forest full of simultaneous falling trunks.
 const age=mod(elapsed+index*41,480)/480;
 return {age,steady,scale:(.16+1.13*smooth(0,.44,age))*(1-smooth(.97,1,age)),fall:smooth(.91,.94,age)*1.42};
}

export function createSiteLife(scene,components,materials,shadow){
 const roots=[],cars=[],birds=[],vines=[],crackPlants=[],flowers=[];
 let serial=0,lastState={};const colourCache=new Map();
 const material=(name,hex)=>{if(colourCache.has(hex))return colourCache.get(hex);const m=new StandardMaterial('Life '+name,scene);m.diffuseColor=Color3.FromHexString(hex);m.specularColor.set(.08,.08,.08);m.backFaceCulling=false;colourCache.set(hex,m);return m;};
 const C={hair:material('hair','#39332c'),white:material('ivory','#e9e3cc'),black:material('rubber','#252c29'),chrome:material('metal','#90998f'),glass:material('windows','#3c626a'),bark:material('roots','#594936'),leaf:material('leaves','#445f31'),grass:material('new grass','#61803b'),flower:material('spring flowers','#d7d494')};
 const palettes={ '1920s':['#4b544b','#76604b','#847970','#443c37','#bbad8b'], '1970s':['#c28d39','#a15836','#526d86','#b8ad86','#576b54'], contemporary:['#d3d2c4','#4a6372','#6d8a77','#344044','#be715b']};
 const palette=Object.fromEntries(Object.entries(palettes).map(([k,v])=>[k,v.map((h,i)=>material(k+i,h))]));
 const node=(name,parent)=>{const n=new TransformNode(name,scene);if(parent)n.parent=parent;else roots.push(n);return n;};
 function finish(mesh,mat,parent,pos=[0,0,0]){mesh.material=mat;mesh.parent=parent;mesh.position.set(...pos);mesh.isPickable=false;mesh.receiveShadows=true;return mesh;}
 const box=(name,dimensions,pos,mat,parent)=>finish(MeshBuilder.CreateBox(name+serial++,{width:dimensions[0],height:dimensions[1],depth:dimensions[2]},scene),mat,parent,pos);
 const sphere=(name,size,pos,mat,parent)=>finish(MeshBuilder.CreateSphere(name+serial++,{diameter:1,segments:5},scene),mat,parent,pos).scaling.set(...size);
 const cylinder=(name,height,top,bottom,pos,mat,parent)=>finish(MeshBuilder.CreateCylinder(name+serial++,{height,diameterTop:top,diameterBottom:bottom,tessellation:10},scene),mat,parent,pos);
 function car(period,index){
  const root=node(`Traffic ${period} ${index}`),paint=palette[period][index%5],old=period==='1920s',seventies=period==='1970s';
  const len=old?4.35:seventies?4.8:4.35;
  box('chassis',[len,.36,1.75],[0,.55,0],paint,root);
  box('bonnet',[old?1.45:1.35,old?.56:.20,old?1.17:1.74],[-1.35,old?.98:.84,0],paint,root);
  box('cabin',[old?1.70:2.15,old?1.15:.75,1.51],[.20,old?1.31:1.22,0],C.glass,root);
  box('roof',[old?1.84:2.25,.13,1.62],[.20,old?1.94:1.65,0],old?C.black:paint,root);
  box('window pillar',[.10,.70,1.55],[.25,1.25,0],paint,root);
  box('grille',[.06,.35,old?1.02:1.43],[-len/2-.02,.81,0],C.chrome,root);
  for(const z of [-.64,.64]){sphere('headlight',[.12,.18,.22],[-len/2-.07,.91,z],C.white,root);box('rear light',[.06,.14,.28],[len/2+.035,.78,z],material('tail lamp','#9e4439'),root);}
  if(old)for(const z of [-.89,.89])box('running board',[3.25,.10,.30],[0,.42,z],C.black,root);
  if(seventies)box('long boot',[1.15,.24,1.73],[1.67,.82,0],paint,root);
  if(period==='contemporary'){box('rear hatch',[.64,.48,1.68],[1.65,1.03,0],paint,root);box('bumper',[.16,.16,1.83],[-2.2,.50,0],C.black,root);}
  const wheels=[];
  for(const x of [-1.43,1.42])for(const z of [-.91,.91]){
   // The tyre's cylinder axis is fixed along the car's Z axle. Spin the
   // complete assembly around that axle, rather than tipping the cylinder.
   const axle=node('wheel axle',root),radius=old?.425:.335;axle.position.set(x,.38,z);
   const tyre=cylinder('wheel',.18,radius*2,radius*2,[0,0,0],C.black,axle);tyre.rotation.x=Math.PI/2;
   const hub=cylinder('hub',.19,.28,.28,[0,0,0],C.chrome,axle);hub.rotation.x=Math.PI/2;
   for(const angle of [0,Math.PI/2]){const spoke=box('wheel spoke',[radius*1.5,.035,.025],[0,0,Math.sign(z)*.11],C.chrome,axle);spoke.rotation.z=angle;}
   wheels.push({axle,tyre,hub,radius});
  }
  const record={root,period,index,side:index<2?'hunter':'bolton',direction:index%2?1:-1,wheels};cars.push(record);
 }
 for(const period of Object.keys(palettes))for(let i=0;i<3;i++)car(period,i);
 const countryLife=createCountryLife(scene,components,{node,finish,cylinder,material,C});
 // Simple generic birds: original silhouettes, not a species census.
 for(let i=0;i<7;i++){
  const root=node('Bird '+i),wings=[];sphere('bird body',[.20,.15,.46],[0,0,0],i%2?C.white:C.hair,root);
  for(const side of [-1,1]){const wing=node('wing',root);wing.position.x=side*.08;const mesh=box('feathered wing',[.69,.04,.20],[side*.30,0,-.04],i%2?C.white:C.hair,wing);mesh.rotation.y=side*.28;wings.push(wing);}
  box('tail',[.18,.04,.30],[0,.025,-.30],C.hair,root);birds.push({root,wings,index:i});
 }
 // Thick branching roots cross the facade, growing from a fixed attachment.
 for(let i=0;i<26;i++){
  const root=node('Facade roots '+i),bolton=i%2===1,u=1.1+Math.floor(i/2)*2.3;
  root.position.set(bolton?-.5:u,-.62,bolton?-u:.5);
  const path=[];for(let j=0;j<15;j++)path.push(new Vector3(Math.sin(j*.7+i)*.40,j*.95,Math.cos(j*.47+i)*.27));
  finish(MeshBuilder.CreateTube('woody climber',{path,radius:.115+(i%3)*.024,tessellation:7},scene),C.bark,root);
  for(let j=3;j<13;j+=3){const start=path[j],end=start.add(new Vector3((i%2?1:-1)*(1.5+j*.08),1.8,0));finish(MeshBuilder.CreateTube('branching root',{path:[start,start.add(new Vector3(.6,1,.1)),end],radius:.052,tessellation:5},scene),C.bark,root);for(let k=0;k<3;k++)sphere('root leaves',[.65,.25,.39],[end.x+(k-1)*.28,end.y+(k%2)*.19,end.z],C.leaf,root);}
  vines.push({root,index:i});
 }
 // Grass grows along the actual 2.4 m paving joints, rather than scattering
 // randomly above the surface. Three batches keep draw calls low.
 function grassBatch(name,points,mat,height=.70){
  const mesh=new Mesh(name,scene),positions=[],indices=[],col=[];let seed=73;
  const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  for(const [x,y,z] of points){if(random()<.32)continue;for(let b=0;b<4;b++){
   const px=x+(random()-.5)*.28,pz=z+(random()-.5)*.26,h=height*(.4+random()),w=.028+random()*.04,k=positions.length/3;
   positions.push(px-w,y,pz,px+w,y,pz,px+.13,y+h,pz+.10);indices.push(k,k+1,k+2);col.push(0,0,0);
  }}
  const normals=[];VertexData.ComputeNormals(positions,indices,normals);const vd=new VertexData();vd.positions=positions;vd.indices=indices;vd.normals=normals;vd.applyToMesh(mesh);finish(mesh,mat,null);roots.push(mesh);return mesh;
 }
 const seams=[];
 for(let x=-14;x<53;x+=2.4)for(let z=8;z<17;z+=.67)seams.push([x,-.45,z]);
 for(let z=-47;z<7;z+=2.4)for(let x=-16;x<-7;x+=.67)seams.push([x,-.45,z]);
 for(let x=-5;x<35;x+=2.4)for(let z=.5;z<6;z+=.75)seams.push([x,-.43,z]);
 for(let z=-37;z<0;z+=2.4)for(let x=-5;x<-.4;x+=.75)seams.push([x,-.43,z]);
 for(let i=0;i<3;i++){const root=grassBatch('Grass in pavement '+i,seams.filter((_,j)=>j%3===i),C.grass,.65+i*.13);crackPlants.push({root,index:i});}
 const flowerPoints=[];for(let i=0;i<380;i++){const x=-15+mod(i*13.17,62),z=-45+mod(i*7.29,60);flowerPoints.push([x,-.75,z]);}
 flowers.push(grassBatch('Seasonal ground flowers',flowerPoints,C.flower,.28));

 const water=MeshBuilder.CreateGround('Optional future tidal water',{width:74,height:74,subdivisions:70},scene);water.position.set(14,-1.2,-12);water.isPickable=false;
 const waterMat=new ShaderMaterial('Tidal surface',scene,{
  vertexSource:`precision highp float; attribute vec3 position; attribute vec2 uv; uniform mat4 world; uniform mat4 worldViewProjection; uniform float time; varying vec3 point; varying vec3 waveNormal; varying vec2 tex;
   void main(){vec3 p=position;float a=p.z*.64-time*1.5;float b=p.x*.4+p.z*.17-time*.83;p.y+=.10*sin(a)+.045*sin(b);waveNormal=normalize(vec3(-.018*cos(b),1.,-.064*cos(a)-.00765*cos(b)));point=(world*vec4(p,1.)).xyz;tex=uv;gl_Position=worldViewProjection*vec4(p,1.);}`,
  fragmentSource:`precision highp float; varying vec3 point; varying vec3 waveNormal; varying vec2 tex; uniform float time; uniform vec3 eye;
   void main(){vec3 n=normalize(waveNormal);vec3 view=normalize(eye-point);float glint=pow(max(0.,dot(n,normalize(view+normalize(vec3(.4,1.,.3))))),90.);float waves=sin(point.z*2.8-time*2.5+sin(point.x*.61))*sin(point.x*1.4+point.z*.30-time*.6);float crest=pow(.5+.5*sin(point.z*.64-time*1.5+sin(point.x*.26)*.65),18.)*(.5+.5*sin(point.x*1.21+time*.19));float edge=min(min(tex.x,1.-tex.x),min(tex.y,1.-tex.y));float alpha=.72*smoothstep(0.,.045,edge);vec3 base=mix(vec3(.20,.34,.33),vec3(.37,.54,.51),.5+.25*waves);gl_FragColor=vec4(base+glint*.35+crest*.17,alpha);}`
 },{attributes:['position','uv'],uniforms:['world','worldViewProjection','time','eye'],needAlphaBlending:true});
 waterMat.backFaceCulling=false;water.material=waterMat;
 const plants=components.filter(c=>['earlyTree','futureTree','shrub','grass','ivy'].includes(c.rec.kind)).map(c=>({c,position:c.mesh.position.clone(),rotation:c.mesh.rotationQuaternion?.clone()||Quaternion.FromEulerVector(c.mesh.rotation),sway:new Quaternion(),index:Number(c.rec.name.match(/(?:Tree|shrub|grass)_([0-9]+)/)?.[1]||0)}));
 const plantMaterials=materials.filter(m=>['TIME_leaf','TIME_leafLight','TIME_grass'].includes(m.name));
 // The old single parked scale cues are superseded by the period traffic and
 // become one stationary wreck in the future, kept clear of moving lanes.
 const parked=components.filter(c=>c.rec.kind==='vehicle');
 function update(year,seconds,season='cycle',waterOn=false){
  const period=periodFor(year),seasonIndex=['summer','autumn','winter','spring'].indexOf(season),phase=seasonIndex<0?mod(seconds/64,1)*4:seasonIndex;
  const spring=(1+Math.cos((phase-3)*TAU/4))/2,wet=(1+Math.cos((phase-2)*TAU/4))/2,w= smooth(2260,2510,year),future=smooth(2070,2470,year),early=1-smooth(1810,1837,year);
  for(const car of cars){
   car.root.setEnabled(car.period===period);if(car.period!==period)continue;const speed=car.period==='1920s'?3.1:car.period==='1970s'?4.5:4.0;
   const distance=mod(seconds*speed+car.index*29,76),along=car.direction>0?-21+distance:55-distance,fade=smooth(0,5,distance)*(1-smooth(70,76,distance));car.root.scaling.setAll(fade);
   // Australian left-hand traffic on the two provisional road strips.
   if(car.side==='hunter'){car.root.position.set(along,-.57,car.direction>0?9.7:14.0);car.root.rotation.y=car.direction>0?Math.PI:0;}
   else {car.root.position.set(car.direction>0?-14:-9.7,-.57,-along);car.root.rotation.y=car.direction>0?-Math.PI/2:Math.PI/2;}
   // Cars face local -X, so positive Z rotation rolls forward. Vehicle yaw
   // supplies the world-space direction on each lane; angle = distance/radius.
   for(const wheel of car.wheels)wheel.axle.rotation.z=seconds*speed/wheel.radius;
  }
  for(const b of birds){const t=seconds*.095+b.index*.90;b.root.position.set(14+Math.cos(t)*25,10+b.index*.9+Math.sin(t*2.1),-11+Math.sin(t)*22);b.root.rotation.y=-t;b.root.rotation.z=.12*Math.sin(t);b.wings[0].rotation.z=.56*Math.sin(seconds*6+b.index);b.wings[1].rotation.z=-b.wings[0].rotation.z;}
  const treeSamples=[];
  for(const p of plants){
   const {c,index}=p,kind=c.rec.kind;let size=c.growth,fall=0;const tree=kind==='earlyTree'||kind==='futureTree';
   if(kind==='earlyTree'){const life=treeLife(year,seconds,index);size*=life.scale;fall=life.fall;if(c.rec.name.endsWith('_trunk'))treeSamples.push({index,age:life.age,steady:life.steady,fall,size});}
   if(kind==='grass')size*=.66+.34*wet;
   if(tree||kind==='shrub'||kind==='grass')c.mesh.scaling.setAll(Math.max(.00001,size));else c.mesh.scaling.set(1,Math.max(.00001,size),1);
   const breeze=(Math.sin(seconds*1.1+index*.7)+.35*Math.sin(seconds*2.2+index))*(tree?.012:kind==='grass'?.04:.009);
   Quaternion.RotationYawPitchRollToRef(0,breeze,fall+breeze*.55,p.sway);p.rotation.multiplyToRef(p.sway,c.mesh.rotationQuaternion||(c.mesh.rotationQuaternion=new Quaternion()));
   c.mesh.setEnabled(c.growth>.00001);
  }
  for(const m of plantMaterials){const grass=m.name==='TIME_grass',dry=grass?new Color3(.43,.40,.19):new Color3(.22,.29,.11),lush=grass?new Color3(.23,.35,.12):m.original;Color3.LerpToRef(dry,lush,.30+.70*wet,m.material.albedoColor);}
  C.grass.diffuseColor.set(.30+.16*(1-wet),.40+.07*wet,.14);C.flower.diffuseColor.set(.74,.73,.39);
  for(const v of vines){const g=smooth(2070+v.index*2,2270+v.index,year);v.root.setEnabled(g>.001);v.root.scaling.set(.40+.60*g,Math.max(.00001,g*(1-.87*w)),.4+.60*g);v.root.rotation.z=Math.sin(seconds*.8+v.index)*.012*g;}
  for(const plant of crackPlants){const g=smooth(2090+plant.index*30,2460,year);plant.root.setEnabled(g>.001);plant.root.scaling.y=Math.max(.00001,g*(.70+.30*wet));plant.root.position.y=-.45*(1-plant.root.scaling.y)+.035*Math.sin(seconds+plant.index);}
  for(const flower of flowers){const g=Math.max(early,future)*spring;flower.setEnabled(g>.08);flower.scaling.y=Math.max(.01,g);flower.position.y=-.75*(1-flower.scaling.y);}
  for(const c of parked){const wreck=year>=2080&&c.rec.name.includes('2026')&&c.growth>.001;c.mesh.setEnabled(wreck);}
  const flood=waterOn?smooth(2160,2460,year):0;water.setEnabled(flood>.001);water.position.y=-.82+flood*.64;
  waterMat.setFloat('time',seconds);waterMat.setVector3('eye',scene.activeCamera.position);
  countryLife.update(year,seconds,waterOn);const country=countryLife.getState();
  lastState={seconds,period,season:seasonIndex<0?'cycling':season,seasonPhase:phase,movingPeople:0,firstNationsPeople:0,countryLife:country,movingCars:period?3:0,birds:birds.length,treeSamples:treeSamples.filter(t=>t.index<4||!t.steady),trees:{visible:year<1837?treeSamples.filter(t=>t.size>.001).length:0,steady:treeSamples.filter(t=>t.steady).length,falling:year<1837?treeSamples.filter(t=>t.fall>.01&&t.size>.01).length:0,maxScale:Math.max(...treeSamples.map(t=>t.size))},roots:vines.filter(v=>v.root.isEnabled()).length,crackGrass:crackPlants[0].root.scaling.y,water:{requested:waterOn,visible:water.isEnabled(),level:water.position.y,scenario:'Authored tidal inundation; not a flood forecast'},actorSample:[],trafficSample:cars.filter(a=>a.root.isEnabled()).map(a=>({position:a.root.position.asArray(),period:a.period})),birdPosition:birds[0].root.position.asArray()};
 }
 function wheelDiagnostics(){return cars.filter(c=>c.root.isEnabled()).flatMap(car=>car.wheels.map(w=>{
  car.root.computeWorldMatrix(true);w.axle.computeWorldMatrix(true);w.tyre.computeWorldMatrix(true);w.hub.computeWorldMatrix(true);
  return {period:car.period,car:car.index,carCentre:car.root.position.asArray(),forward:car.root.getDirection(new Vector3(-1,0,0)).normalize().asArray(),radius:w.radius,angle:w.axle.rotation.z,axle:w.tyre.getDirection(Vector3.Up()).normalize().asArray(),expectedAxle:car.root.getDirection(new Vector3(0,0,1)).normalize().asArray(),radial:w.tyre.getDirection(Vector3.Right()).normalize().asArray(),tyreCentre:w.tyre.getAbsolutePosition().asArray(),hubCentre:w.hub.getAbsolutePosition().asArray(),expectedCentre:w.axle.getAbsolutePosition().asArray()};
 }));}
 return {update,getState:()=>lastState,fingerprint:()=>JSON.stringify(lastState),wheelDiagnostics,meshCount:scene.meshes.length-components.length};
}
