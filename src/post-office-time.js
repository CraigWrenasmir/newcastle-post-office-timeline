import {createRenderQuality} from './render-quality.js';
import './post-office-time.css';
import { Engine } from '@babylonjs/core/Engines/engine.js';
import { Scene } from '@babylonjs/core/scene.js';
import { Color3,Color4 } from '@babylonjs/core/Maths/math.color.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera.js';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight.js';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight.js';
import { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator.js';
import { ImportMeshAsync } from '@babylonjs/core/Loading/sceneLoader.js';
import '@babylonjs/loaders/glTF/2.0/glTFLoader.js';
import {FIRST,LAST,clamp,smooth,positionToYear,yearToPosition,milestones,describe,growth,weights} from './post-office-time-data.js';
import {createSiteLife} from './post-office-life.js';
import {pickVisibleSurface} from './post-office-inspection.js';
const $=id=>document.getElementById(id),state={ready:false,year:2026,playing:false,direction:1,speed:1,view:'overview',focus:null,labelsVisible:true,error:null};
const ambience={motion:!matchMedia('(prefers-reduced-motion: reduce)').matches,seconds:0,season:'cycle',water:false};
let renderQuality,engine,scene,camera,manifest,shadow,life;const components=[],materials=[],uniformKinds=new Set(['earlyTree','futureTree','grass','shrub','vehicle']);
const values={construction:1,damage:0,ruin:0,futureGrowth:0};
const labelsPreferenceKey='post-office-time-show-labels';
function setLabelsVisible(value,persist=true){
 state.labelsVisible=!!value;$('show-labels').checked=state.labelsVisible;
 document.querySelector('.viewport').classList.toggle('labels-hidden',!state.labelsVisible);
 // Storage may be unavailable in private or restricted browser sessions.
 if(persist){try{localStorage.setItem(labelsPreferenceKey,String(state.labelsVisible));}catch{}}
}
try{setLabelsVisible(localStorage.getItem(labelsPreferenceKey)!=='false',false);}catch{setLabelsVisible(true,false);}
$('show-labels').addEventListener('change',()=>setLabelsVisible($('show-labels').checked));
function clearCameraInertia(){camera.inertialAlphaOffset=camera.inertialBetaOffset=camera.inertialRadiusOffset=0;camera.inertialPanningX=camera.inertialPanningY=0;}
function reset(){if(!camera||!manifest)return;state.view='overview';state.focus=null;const p=manifest.camera;camera.upperBetaLimit=1.50;camera.setTarget(Vector3.FromArray(p.target));camera.setPosition(Vector3.FromArray(p.position));camera.fov=p.fov;if(innerWidth<700)camera.radius*=1.65;clearCameraInertia();}
function streetView(){if(!camera)return;state.view='street';state.focus=null;camera.upperBetaLimit=1.567;const early=state.year<1837;camera.setTarget(early?new Vector3(13,1.3,7):new Vector3(11,3,-4));camera.setPosition(early?new Vector3(-9,8,31):new Vector3(-20,3.6,22));camera.fov=early?.75:.95;clearCameraInertia();}
function zoom(factor){if(!state.ready)return;clearCameraInertia();camera.radius=clamp(camera.radius*factor,camera.lowerRadiusLimit,camera.upperRadiusLimit);state.view='detail';}
function focusAt(clientX,clientY){
 if(!state.ready)return;const rect=$('scene').getBoundingClientRect();
 const hit=pickVisibleSurface(scene,camera,components,clientX-rect.left,clientY-rect.top);
 if(!hit)return;clearCameraInertia();camera.setTarget(hit.point,false,true,true);
 camera.radius=clamp(Math.min(camera.radius*.5,14),camera.lowerRadiusLimit,camera.upperRadiusLimit);camera.fov=manifest.camera.fov;
 state.view='detail';state.focus={mesh:hit.mesh.name,point:hit.point.asArray()};
}
function play(value){state.playing=!!value;$('play').textContent=state.playing?'Ⅱ Pause':'▶ Play';$('play').setAttribute('aria-label',state.playing?'Pause timeline':'Play timeline');}
function setYear(value,pause=true){
 if(!Number.isFinite(Number(value)))return;if(pause)play(false);state.year=clamp(Number(value),FIRST,LAST);if(!state.ready)return;const year=state.year,w=weights(year);Object.assign(values,w);let construction=0,poCount=0,future=0,futureCount=0;
 for(const c of components){
  const amount=growth(c.rec,year);c.growth=amount;c.mesh.setEnabled(amount>.00001);
  if(uniformKinds.has(c.rec.kind))c.mesh.scaling.setAll(Math.max(.00001,amount));else c.mesh.scaling.set(1,Math.max(.00001,amount),1);
  if(c.damage)c.damage.influence=w.damage;if(c.ruin)c.ruin.influence=w.ruin;
  if(c.rec.kind==='postOffice'){construction+=amount;poCount++;}if(['futureTree','shrub','ivy','grass'].includes(c.rec.kind)){future+=year>2026?amount:0;futureCount++;}
 }
 values.construction=construction/Math.max(1,poCount);values.futureGrowth=future/Math.max(1,futureCount);
 const ageing=smooth(2040,2480,year);
 for(const m of materials){
  let target=m.original,amount=0;
  if(m.name.includes('copper')){target=year<1935?new Color3(.38,.19,.08):new Color3(.10,.17,.10);amount=year<1935?(1-smooth(1903,1935,year))*.80:ageing*.85;}
  else if(m.name.includes('PO_')&&!m.name.includes('glass')){target=new Color3(.25,.29,.15);amount=ageing*.70;}
  else if(m.name==='TIME_carNow'){target=new Color3(.20,.12,.065);amount=smooth(2050,2240,year);}
  else if(m.name==='TIME_soil'){target=new Color3(.18,.25,.115);amount=Math.max(1-smooth(1810,1837,year),smooth(2110,2470,year))*.65;}
  Color3.LerpToRef(m.original,target,amount,m.material.albedoColor);
 }
 const d=describe(year);$('year').value=Math.round(year);$('time').value=yearToPosition(year);$('time').setAttribute('aria-valuetext',`${Math.round(year)}: ${d.title}`);$('scene-year').textContent=Math.round(year).toString();$('era-title').textContent=d.title;$('era-type').textContent=d.type;$('era-text').textContent=d.text;$('era-source').textContent=d.source;$('era-source').href=d.url;
 $('construction-meter').value=values.construction;$('collapse-meter').value=w.ruin;$('growth-meter').value=values.futureGrowth;
 document.querySelectorAll('[data-year]').forEach(b=>{const active=Math.abs(Number(b.dataset.year)-year)<.6;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});
 $('street-view').textContent=year<1837?'Ground view':'Street view';$('water').disabled=year<=2026;$('water-note').hidden=!(ambience.water&&year>2026);updateLife();
}
function updateLife(){life?.update(state.year,ambience.seconds,ambience.season,ambience.water);}
function setMotion(value){ambience.motion=!!value;$('motion').textContent=ambience.motion?'Ⅱ Pause movement':'▶ Resume movement';$('motion').setAttribute('aria-pressed',String(ambience.motion));}
function step(ms){if(!state.ready)return;if(ambience.motion)ambience.seconds+=Math.max(0,ms)/1000;if(state.playing){const position=yearToPosition(state.year)+ms/1000*10*state.speed*state.direction;setYear(positionToYear(position),false);if(position<=0||position>=1000)play(false);}else updateLife();}
async function initialise(){
 engine=new Engine($('scene'),true,{preserveDrawingBuffer:true,powerPreference:'high-performance'});renderQuality=createRenderQuality(engine,$('scene'),()=>{if(state.ready)scene?.render();});scene=new Scene(engine);scene.useRightHandedSystem=true;scene.clearColor=Color4.FromHexString('#dfe6daff');scene.imageProcessingConfiguration.exposure=.96;scene.imageProcessingConfiguration.contrast=1.15;scene.imageProcessingConfiguration.toneMappingEnabled=true;scene.imageProcessingConfiguration.toneMappingType=1;
 camera=new ArcRotateCamera('Time camera',1,1,80,Vector3.Zero(),scene);camera.minZ=.1;camera.maxZ=800;camera.lowerBetaLimit=.12;camera.upperBetaLimit=1.50;camera.lowerRadiusLimit=2.5;camera.upperRadiusLimit=210;camera.wheelDeltaPercentage=.015;camera.panningSensibility=600;camera.useNaturalPinchZoom=true;camera.attachControl($('scene'),true);camera.inputs.removeByType('ArcRotateCameraKeyboardMoveInput');
 const sky=new HemisphericLight('Sky',new Vector3(0,1,0),scene);sky.intensity=.85;sky.groundColor=new Color3(.40,.45,.32);const sun=new DirectionalLight('Sun',new Vector3(.4,-1,-.55),scene);sun.position=new Vector3(-35,65,45);sun.intensity=1.35;shadow=new ShadowGenerator(1024,sun);shadow.usePercentageCloserFiltering=true;shadow.filteringQuality=ShadowGenerator.QUALITY_LOW;shadow.normalBias=.04;shadow.bias=.0005;shadow.setDarkness(.25);
 const [m,asset]=await Promise.all([fetch('./models/post-office-time.json').then(r=>{if(!r.ok)throw Error('Missing timeline manifest');return r.json();}),ImportMeshAsync('./models/post-office-time.glb',scene)]);manifest=m;const map=new Map(asset.meshes.map(m=>[m.name,m])),seen=new Set();
 for(const rec of manifest.components){const mesh=map.get(rec.name);if(!mesh)throw Error(`Missing component ${rec.name}`);let damage,ruin;
  if(mesh.morphTargetManager){for(let i=0;i<mesh.morphTargetManager.numTargets;i++){const t=mesh.morphTargetManager.getTarget(i);if(t.name==='Damage')damage=t;if(t.name==='Ruin')ruin=t;}}
  if(rec.morph&&(!damage||!ruin))throw Error(`Missing collapse targets on ${rec.name}`);
  components.push({rec,mesh,damage,ruin,growth:1});mesh.receiveShadows=true;mesh.isPickable=false;
  if(!['terrain','grass'].includes(rec.kind))shadow.addShadowCaster(mesh,false);
  if(mesh.material){const mat=mesh.material;mat.backFaceCulling=false;mat.environmentIntensity=.65;if(mat.albedoColor&&!seen.has(mat.uniqueId)){seen.add(mat.uniqueId);materials.push({name:mat.name,material:mat,original:mat.albedoColor.clone()});}}
 }
 life=createSiteLife(scene,components,materials,shadow);setMotion(ambience.motion);
 reset();state.ready=true;setYear(2026);state.ready=false;scene.render();await scene.whenReadyAsync();state.ready=true;$('loading').hidden=true;scene.render();
 engine.runRenderLoop(()=>{step(Math.min(engine.getDeltaTime(),100));scene.render();});
}
for(const m of milestones){const b=document.createElement('button');b.dataset.year=m.year;b.append(document.createTextNode(m.year));const label=document.createElement('span');label.textContent=m.label;b.append(label);b.setAttribute('aria-label',`${m.year}: ${m.label}`);b.addEventListener('click',()=>setYear(m.year));$('milestones').append(b);}
function togglePlayback(){if(!state.playing&&((state.year===LAST&&state.direction===1)||(state.year===FIRST&&state.direction===-1)))setYear(state.direction===1?FIRST:LAST);play(!state.playing);}
$('time').addEventListener('input',()=>setYear(positionToYear(Number($('time').value))));$('year').addEventListener('change',()=>{if($('year').value==='')$('year').value=Math.round(state.year);else setYear(Number($('year').value));});$('play').addEventListener('click',togglePlayback);
function reverse(){state.direction*=-1;$('reverse').setAttribute('aria-pressed',String(state.direction===-1));$('reverse').textContent=state.direction===-1?'→ Forward':'← Reverse';}
$('reverse').addEventListener('click',reverse);$('speed').addEventListener('change',()=>state.speed=Number($('speed').value));$('reset').addEventListener('click',reset);
$('street-view').addEventListener('click',streetView);
$('zoom-in').addEventListener('click',()=>zoom(.8));$('zoom-out').addEventListener('click',()=>zoom(1.25));
$('scene').addEventListener('dblclick',e=>{e.preventDefault();focusAt(e.clientX,e.clientY);});
$('scene').addEventListener('contextmenu',e=>e.preventDefault());
$('scene').addEventListener('pointerdown',()=>{if(state.ready)state.view='detail';});
$('scene').addEventListener('wheel',()=>{if(state.ready)state.view='detail';},{passive:true});
$('motion').addEventListener('click',()=>setMotion(!ambience.motion));$('season').addEventListener('change',()=>{ambience.season=$('season').value;updateLife();});$('water').addEventListener('change',()=>{ambience.water=$('water').checked;$('water-note').hidden=!(ambience.water&&state.year>2026);updateLife();});
// Keep the actual inspection position when resizing or entering fullscreen.
window.addEventListener('resize',()=>renderQuality?.resize());
document.addEventListener('keydown',e=>{if(e.ctrlKey||e.metaKey||e.altKey||['INPUT','BUTTON','A','SELECT','SUMMARY'].includes(document.activeElement?.tagName))return;const k=e.key.toLowerCase();if(k===' '){e.preventDefault();togglePlayback();}if(k==='arrowleft'||k==='arrowright'){e.preventDefault();setYear(state.year+(k==='arrowleft'?-1:1)*(e.shiftKey?25:1));}if(k==='home'){e.preventDefault();setYear(FIRST);}if(k==='end'){e.preventDefault();setYear(LAST);}if(k==='+'||k==='='){e.preventDefault();zoom(.8);}if(k==='-'||k==='_'){e.preventDefault();zoom(1.25);}if(k==='r')reset();if(k==='f')document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen().catch(()=>{});});
window.advanceTime=ms=>{step(Number(ms)||0);scene?.render();};
window.render_game_to_text=()=>JSON.stringify({...state,rendering:renderQuality?.getState(),era:describe(state.year),process:values,ambience:{...ambience,...life?.getState()},coordinateSystem:manifest?.coordinateSystem,meshes:components.length,visible:components.filter(c=>c.mesh.isEnabled()).length,visibleByKind:Object.fromEntries([...new Set(components.map(c=>c.rec.kind))].map(k=>[k,components.filter(c=>c.rec.kind===k&&c.mesh.isEnabled()).length])),camera:camera?{position:camera.position.asArray(),target:camera.target.asArray(),fov:camera.fov,radius:camera.radius,limits:[camera.lowerRadiusLimit,camera.upperRadiusLimit]}:null});
window.postOfficeTime={setYear,play,reverse,setMotion,setLifeTime:seconds=>{if(Number.isFinite(seconds)){ambience.seconds=Math.max(0,seconds);updateLife();}},setSeason:value=>{if(['cycle','summer','autumn','winter','spring'].includes(value)){ambience.season=value;$('season').value=value;updateLife();}},setWater:value=>{ambience.water=!!value;$('water').checked=ambience.water;$('water-note').hidden=!(ambience.water&&state.year>2026);updateLife();},getState:()=>JSON.parse(window.render_game_to_text()),lifeFingerprint:()=>life?.fingerprint(),wheelDiagnostics:()=>life?.wheelDiagnostics(),fingerprint:()=>components.map(c=>[c.mesh.name,c.mesh.isEnabled(),...c.mesh.position.asArray(),...c.mesh.scaling.asArray(),c.damage?.influence||0,c.ruin?.influence||0]),materialFingerprint:()=>materials.map(m=>[m.name,...m.material.albedoColor.asArray()])};
initialise().catch(e=>{state.error=e.message;$('loading').textContent=`Could not load timeline: ${e.message}`;console.error(e);});
