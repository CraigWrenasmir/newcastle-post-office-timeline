const limits={standard:1,high:2,maximum:3};
const preferenceKey='post-office-image-quality';

export function createRenderQuality(engine,canvas,render=()=>{}){
 const control=document.getElementById('image-quality');
 let quality='high';
 try{const saved=localStorage.getItem(preferenceKey);if(Object.hasOwn(limits,saved))quality=saved;}catch{}
 function resize(){
  const ratio=Math.min(Math.max(1,window.devicePixelRatio||1),limits[quality]);
  // Babylon divides the canvas CSS size by this value: Retina needs its reciprocal.
  engine.setHardwareScalingLevel(1/ratio);
  render();
 }
 function select(value){
  if(!Object.hasOwn(limits,value))return;
  quality=value;control.value=quality;
  try{localStorage.setItem(preferenceKey,quality);}catch{}
  resize();
 }
 control.value=quality;control.addEventListener('change',()=>select(control.value));resize();
 return{resize,getState:()=>({quality,devicePixelRatio:window.devicePixelRatio||1,pixelRatio:1/engine.getHardwareScalingLevel(),width:canvas.width,height:canvas.height})};
}
