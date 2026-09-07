import './post-office.css';
import { Engine } from '@babylonjs/core/Engines/engine.js';
import { Scene } from '@babylonjs/core/scene.js';
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera.js';
import { FreeCamera } from '@babylonjs/core/Cameras/freeCamera.js';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight.js';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight.js';
import { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator.js';
import { ImportMeshAsync } from '@babylonjs/core/Loading/sceneLoader.js';
import '@babylonjs/loaders/glTF/2.0/glTFLoader.js';
const $=id=>document.getElementById(id);const canvas=$('scene');
const state={ready:false,view:'orbit',opacity:55,wireframe:false,photoVisible:false,error:null};
let engine,scene,orbit,photo,camera,manifest,fits,sources,meshes=[];
function blend(value){state.opacity=Number(value);$('blend').value=state.opacity;$('blend-value').textContent=`${state.opacity}%`;canvas.style.opacity=state.view==='orbit'?1:state.opacity/100;}
function select(view){
 if(!state.ready)return;const data=fits.views.find(v=>v.id===view);if(view!=='orbit'&&!data)return;
 state.view=view;state.photoVisible=!!data;$('reference').hidden=!data;$('comparison-controls').hidden=!data;$('stage').classList.toggle('comparing',!!data);
 document.querySelectorAll('[data-view]').forEach(b=>{const yes=b.dataset.view===view;b.classList.toggle('active',yes);b.setAttribute('aria-pressed',String(yes));});
 if(data){
  camera=photo;scene.activeCamera=photo;photo.position.copyFrom(Vector3.FromArray(data.camera.position));photo.upVector=new Vector3(0,1,0);photo.setTarget(Vector3.FromArray(data.camera.target));photo.rotation.z=data.camera.roll;photo.fov=data.camera.fov;
  const src=sources.find(s=>s.id===(view==='front-2015'?2:1));$('reference').src=src.file;$('reference').alt=`Newcastle Post Office, ${src.date}, photograph by ${src.author}`;$('stage').style.setProperty('--photo-aspect',data.camera.aspect);
  $('caption').replaceChildren(document.createTextNode(`${src.author} · ${src.date.split(' ')[0]} · ${src.licence}. `));const a=document.createElement('a');a.href=src.url;a.textContent='Original photograph';a.target='_blank';a.rel='noreferrer';$('caption').append(a,document.createTextNode(' · Model dimensions remain estimated.'));
  $('view-label').textContent='Slide to compare photograph and geometry';blend(55);
 }else{
  camera=orbit;scene.activeCamera=orbit;const p=manifest.cameras.orbit;orbit.setTarget(Vector3.FromArray(p.target));orbit.setPosition(Vector3.FromArray(p.position));if(innerWidth<700)orbit.radius*=1.4;orbit.fov=p.fov;orbit.inertialAlphaOffset=orbit.inertialBetaOffset=orbit.inertialRadiusOffset=0;canvas.style.opacity=1;
  $('caption').textContent='Seven-bay arcades, recessed colonnades and corner pavilions. Dimensions remain estimated.';$('view-label').textContent='Drag to orbit · scroll to zoom';
 }
 engine.resize();scene.render();
}
async function initialise(){
 engine=new Engine(canvas,true,{alpha:true,preserveDrawingBuffer:true,powerPreference:'high-performance'});engine.setHardwareScalingLevel(Math.max(1,devicePixelRatio/1.5));
 scene=new Scene(engine);scene.useRightHandedSystem=true;scene.clearColor=new Color4(0,0,0,0);scene.imageProcessingConfiguration.exposure=.95;scene.imageProcessingConfiguration.contrast=1.15;scene.imageProcessingConfiguration.toneMappingEnabled=true;scene.imageProcessingConfiguration.toneMappingType=1;
 orbit=new ArcRotateCamera('Orbit',1,1,60,Vector3.Zero(),scene);orbit.minZ=.1;orbit.maxZ=500;orbit.lowerRadiusLimit=8;orbit.upperRadiusLimit=150;orbit.lowerBetaLimit=.1;orbit.upperBetaLimit=1.65;orbit.wheelDeltaPercentage=.018;orbit.panningSensibility=0;orbit.attachControl(canvas,true);orbit.inputs.removeByType('ArcRotateCameraKeyboardMoveInput');
 photo=new FreeCamera('Photo',Vector3.Zero(),scene);photo.minZ=.1;photo.maxZ=500;photo.inputs.clear();scene.activeCamera=orbit;
 const sky=new HemisphericLight('Sky',new Vector3(0,1,0),scene);sky.intensity=.8;sky.groundColor=new Color3(.50,.48,.40);
 const sun=new DirectionalLight('Sun',new Vector3(.5,-1,-.6),scene);sun.position=new Vector3(-35,65,45);sun.intensity=1.3;
 const shadow=new ShadowGenerator(2048,sun);shadow.usePercentageCloserFiltering=true;shadow.filteringQuality=ShadowGenerator.QUALITY_LOW;shadow.normalBias=.018;shadow.bias=.0003;shadow.setDarkness(.25);
 const json=async url=>{const r=await fetch(url);if(!r.ok)throw Error(`Could not load ${url}`);return r.json();};
 const [m,f,s,asset]=await Promise.all([json('./models/post-office.json'),json('./models/post-office-cameras.json'),json('./references/post-office/sources.json'),ImportMeshAsync('./models/post-office.glb',scene)]);manifest=m;fits=f;sources=s;meshes=asset.meshes.filter(m=>m.getTotalVertices()>0);
 for(const mesh of meshes){mesh.receiveShadows=true;shadow.addShadowCaster(mesh,false);if(mesh.material){mesh.material.backFaceCulling=false;mesh.material.environmentIntensity=.8;}}
 for(const s of sources){const div=document.createElement('div');const a=document.createElement('a');a.href=s.url;a.target='_blank';a.rel='noreferrer';a.textContent=s.role;const p=document.createElement('p');p.append(document.createTextNode(`${s.author} · ${s.date} · `));const license=document.createElement('a');license.href=s.licenceUrl;license.textContent=s.licence;license.target='_blank';license.rel='noreferrer';p.append(license,document.createTextNode('. Browser copy resized; original linked above.'));div.append(a,p);$('sources').append(div);}
 state.ready=true;select('orbit');state.ready=false;scene.render();await scene.whenReadyAsync();scene.render();state.ready=true;$('loading').hidden=true;engine.runRenderLoop(()=>{if(state.view==='orbit')scene.render();});
}
document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>select(b.dataset.view)));
$('reset').addEventListener('click',()=>select(state.view));$('blend').addEventListener('input',()=>{state.photoVisible=true;$('reference').hidden=false;blend($('blend').value);});$('photo-only').addEventListener('click',()=>{state.photoVisible=true;$('reference').hidden=false;blend(0);});$('model-only').addEventListener('click',()=>{state.photoVisible=false;$('reference').hidden=true;blend(100);});
$('wireframe').addEventListener('change',()=>{state.wireframe=$('wireframe').checked;for(const mesh of meshes)if(mesh.material)mesh.material.wireframe=state.wireframe;scene?.render();});
window.addEventListener('resize',()=>{engine?.resize();scene?.render();});
document.addEventListener('keydown',e=>{if(e.ctrlKey||e.metaKey||e.altKey||['INPUT','BUTTON','A'].includes(document.activeElement?.tagName))return;if(e.key.toLowerCase()==='r')select(state.view);if(e.key.toLowerCase()==='f')document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen().catch(()=>{});});
window.advanceTime=()=>scene?.render();window.render_game_to_text=()=>JSON.stringify({...state,meshes:meshes.length,camera:camera?{position:camera.position.asArray(),target:camera.getTarget().asArray(),fov:camera.fov}:null});window.postOffice={getState:()=>JSON.parse(window.render_game_to_text()),select,blend};
initialise().catch(e=>{state.error=e.message;$('loading').textContent=`Could not load model: ${e.message}`;console.error(e);});
