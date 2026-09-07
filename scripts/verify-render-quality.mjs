import {webkit,chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const url=process.env.VIEWER_URL||'http://127.0.0.1:4173/';
const out=process.env.QUALITY_QA_DIR||'work/qa/render-quality';await fs.mkdir(out,{recursive:true});
const checks=[],errors=[],samples=[];
const dimensions=page=>page.evaluate(()=>{const c=document.getElementById('scene');return {css:[c.clientWidth,c.clientHeight],buffer:[c.width,c.height],dpr:devicePixelRatio};});
async function verifyPixels(page,ratio,label){
 await page.waitForFunction(r=>{const c=document.getElementById('scene');return Math.abs(c.width-c.clientWidth*r)<=1&&Math.abs(c.height-c.clientHeight*r)<=1;},ratio,{timeout:10000});
 const d=await dimensions(page);d.css.forEach((size,i)=>assert(Math.abs(d.buffer[i]-size*ratio)<=1,`${label}: ${JSON.stringify(d)}`));samples.push({label,...d});
 const state=await page.evaluate(()=>(window.postOfficeTime||window.postOffice).getState());assert.equal(state.rendering.pixelRatio,ratio);
}
const ready=(page,api)=>page.waitForFunction(k=>window[k]?.getState().ready,api,{timeout:120000});
for(const [type,dpr] of [[webkit,3],[chromium,1],[chromium,2]]){
 const browser=await type.launch(type===chromium?{headless:true,args:['--use-gl=angle','--use-angle=swiftshader']}:{});
 try{
  const page=await browser.newPage({viewport:dpr===3?{width:390,height:844}:{width:1280,height:900},deviceScaleFactor:dpr,isMobile:dpr===3,hasTouch:dpr===3,reducedMotion:'reduce'});page.setDefaultTimeout(90000);
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.goto(url);await ready(page,'postOfficeTime');await verifyPixels(page,Math.min(dpr,2),`${type.name()} DPR ${dpr} default`);
  if(dpr!==3){checks.push(`Desktop DPR ${dpr} respects display density`);continue;}
  await page.locator('.viewport').screenshot({path:out+'/phone-high.png'});
  const before=await page.evaluate(()=>window.postOfficeTime.getState().camera);
  for(const [option,ratio] of [['maximum',3],['standard',1],['high',2]]){
   await page.getByLabel('Image quality').selectOption(option);await verifyPixels(page,ratio,`Phone ${option}`);
   const after=await page.evaluate(()=>window.postOfficeTime.getState().camera);assert.deepEqual(after,before);
  }
  checks.push('WebKit 3x display uses 2x by default; all three quality settings change actual canvas pixels without moving the camera');
  const radius=before.radius;await page.locator('#zoom-in').click();assert((await page.evaluate(()=>window.postOfficeTime.getState())).camera.radius<radius);await page.locator('#reset').click();
  await page.getByLabel('Image quality').selectOption('maximum');await page.locator('.viewport').screenshot({path:out+'/phone-maximum.png'});
  await page.setViewportSize({width:844,height:390});await verifyPixels(page,3,'Phone landscape');
  await page.setViewportSize({width:390,height:844});await verifyPixels(page,3,'Phone portrait restored');
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:out+'/phone-controls.png',fullPage:true});
  await page.reload();await ready(page,'postOfficeTime');await verifyPixels(page,3,'Phone maximum after reload');
  checks.push('Zoom and orientation changes work; the selected quality survives reload');
  await page.getByRole('link',{name:'Photo comparison',exact:true}).click();await ready(page,'postOffice');await verifyPixels(page,3,'Comparison shares maximum preference');
  await page.locator('[data-view="front-2015"]').click();await page.waitForFunction(()=>document.getElementById('reference').complete&&document.getElementById('reference').naturalWidth>0);
  await verifyPixels(page,3,'Comparison photo aspect resize');const photoCamera=await page.evaluate(()=>window.postOffice.getState().camera);
  await page.getByLabel('Image quality').selectOption('high');await verifyPixels(page,2,'Comparison high');assert.deepEqual(await page.evaluate(()=>window.postOffice.getState().camera),photoCamera);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:out+'/phone-comparison.png',fullPage:true});
  checks.push('Comparison respects saved quality and photo aspect; changing quality preserves the overlay camera');
 }finally{await browser.close();}
}
assert.deepEqual(errors,[]);
const result={status:'passed',scope:'WebKit with an emulated 3x phone display; Chromium 1x and 2x desktops. Not a physical iPhone performance measurement.',checks,samples,errors};
await fs.writeFile(out+'/validation.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
