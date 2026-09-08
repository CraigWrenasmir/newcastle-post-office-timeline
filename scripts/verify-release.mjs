import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createServer} from 'node:http';
import path from 'node:path';

const root=path.resolve('dist'),out='work/qa/release',prefix='/newcastle-post-office-timeline/';
await fs.mkdir(out,{recursive:true});
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.glb':'model/gltf-binary','.jpg':'image/jpeg','.svg':'image/svg+xml'};
const server=createServer(async(req,res)=>{
 try{
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  if(!pathname.startsWith(prefix))throw Error('Outside project');
  const file=path.resolve(root,pathname.slice(prefix.length)||'index.html');
  if(!file.startsWith(root+path.sep))throw Error('Outside build');
  const bytes=await fs.readFile(file);res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});res.end(bytes);
 }catch{res.writeHead(404);res.end('Not found');}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const url=`http://127.0.0.1:${server.address().port}${prefix}`;
const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader']});
const page=await browser.newPage({viewport:{width:1440,height:1100},reducedMotion:'reduce'});
page.setDefaultTimeout(90000);
const errors=[],checks=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
page.on('response',r=>{if(r.url().startsWith(url)&&r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
const ready=async api=>{
 await page.waitForFunction(name=>window[name]?.getState().ready||window[name]?.getState().error,api,{timeout:120000});
 const state=await page.evaluate(name=>window[name].getState(),api);assert(state.ready,state.error);return state;
};
try{
 await page.goto(url);let state=await ready('postOfficeTime');assert.equal(state.year,2026);assert(state.meshes>=900);
 assert.equal(await page.locator('nav a').count(),1);assert.equal(await page.locator('a[href*="block.html"]').count(),0);
 for(const name of ['block.html','post-office-time.html','models/hunter-block.glb','models/transformation-study.glb'])assert.equal((await fetch(url+name)).status,404);
 checks.push('Only the timeline and comparison ship; models load from a project URL prefix');
 await page.screenshot({path:out+'/timeline-desktop.png',fullPage:true});
 await page.locator('[data-year="1026"]').click();state=await page.evaluate(()=>window.postOfficeTime.getState());assert.equal(state.visibleByKind.postOffice,0);assert.equal(state.ambience.firstNationsPeople,0);assert.equal(state.ambience.movingPeople,0);assert.equal(state.ambience.countryLife.animals.length,6);
 await page.locator('[data-year="2526"]').click();state=await page.evaluate(()=>window.postOfficeTime.getState());assert.equal(state.process.ruin,1);
 await page.locator('[data-year="2026"]').click();const radius=(await page.evaluate(()=>window.postOfficeTime.getState())).camera.radius;
 await page.locator('#zoom-in').click();assert((await page.evaluate(()=>window.postOfficeTime.getState())).camera.radius<radius);
 await page.locator('#reset').click();await page.locator('#show-labels').uncheck();assert(!(await page.locator('.scene-top').isVisible()));
 await page.locator('#play').click();await page.evaluate(()=>window.advanceTime(1000));assert((await page.evaluate(()=>window.postOfficeTime.getState())).year>2026);await page.locator('#play').click();
 checks.push('Country, ruins, zoom, labels and playback work in the exported timeline');
 for(const href of await page.locator('a').evaluateAll(links=>links.map(a=>a.href).filter(h=>h.startsWith(location.origin))))assert.equal((await fetch(href)).status,200,href);
 await page.getByRole('link',{name:'Photo comparison',exact:true}).click();await ready('postOffice');assert(page.url().endsWith('/post-office.html'));
 for(const id of ['front-2015','corner-2019']){
  await page.locator(`[data-view="${id}"]`).click();await page.waitForFunction(()=>document.getElementById('reference').complete&&document.getElementById('reference').naturalWidth>0);
  assert.equal((await page.evaluate(()=>window.postOffice.getState())).view,id);
  await page.locator('#photo-only').click();assert.equal((await page.evaluate(()=>window.postOffice.getState())).opacity,0);
  await page.locator('#model-only').click();assert.equal((await page.evaluate(()=>window.postOffice.getState())).opacity,100);
  await page.locator('#blend').fill('55');await page.locator('#blend').dispatchEvent('input');
 }
 await page.locator('summary').click();assert.equal(await page.locator('#sources>div').count(),3);
 await page.screenshot({path:out+'/comparison-desktop.png',fullPage:true});
 checks.push('Both comparison photographs, overlay controls and credits load below the project prefix');
 await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.screenshot({path:out+'/comparison-phone.png',fullPage:true});
 await page.getByRole('link',{name:'Post Office timeline',exact:true}).click();await ready('postOfficeTime');
 assert(!(await page.locator('#show-labels').isChecked()));await page.locator('#show-labels').check();await page.locator('#reset').click();
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:out+'/timeline-phone.png',fullPage:true});
 checks.push('Mobile layouts, return navigation and saved label preference work');
 assert.deepEqual(errors,[]);checks.push('No page, console or local asset errors');
 const result={status:'passed',scope:'Standalone release and project-path hosting; not historical accuracy',checks,errors};
 await fs.writeFile(out+'/validation.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
}catch(e){await page.screenshot({path:out+'/failure.png',fullPage:true}).catch(()=>{});throw e;}
finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
