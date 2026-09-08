export const FIRST=1026,LAST=2526;
export const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v));
export const smooth=(a,b,v)=>{if(a===b)return v>=a?1:0;const t=clamp((v-a)/(b-a));return t*t*(3-2*t);};
// Expanded construction years keep a three-year build usable on a 1,500-year slider.
const scale=[[0,1026],[200,1830],[320,1900],[450,1903],[640,2026],[1000,2526]];
function map(value,axis){for(let i=1;i<scale.length;i++){const a=scale[i-1],b=scale[i];if(value<=b[axis])return a[1-axis]+(b[1-axis]-a[1-axis])*clamp((value-a[axis])/(b[axis]-a[axis]));}return scale.at(-1)[1-axis];}
export const positionToYear=p=>map(clamp(p,0,1000),0);
export const yearToPosition=y=>map(clamp(y,FIRST,LAST),1);
const culture='https://newcastle.nsw.gov.au/explore/history-and-heritage/aboriginal-culture';
const courthouse='https://thelockup.org.au/history/';
const office='https://apps.environment.nsw.gov.au/dpcheritageapp/ViewHeritageItemDetails.aspx?ID=5051298';
const construction='https://hunterlivinghistories.com/2023/11/14/ralph-snowball-archive/';
export const milestones=[{year:1026,label:'Country'},{year:1838,label:'Courthouse'},{year:1893,label:'Old courthouse'},{year:1901,label:'Construction'},{year:1903,label:'Post Office'},{year:1926,label:'1920s'},{year:1976,label:'1970s'},{year:2026,label:'Contemporary'},{year:2126,label:'Neglect'},{year:2326,label:'Collapse'},{year:2526,label:'Overgrown ruins'}];
export function describe(year){
 if(year<1804)return{title:'Awabakal Country',type:'INTERPRETED EARLY SCENE',text:'Awabakal people lived in and moved through this coastal country. The trees, wallabies, bandicoots, dingo and surrounding landscape are interpretations.',source:'City of Newcastle · Aboriginal culture',url:culture};
 if(year<1837)return{title:'Colonial transition',type:'SITE CONDITIONS UNVERIFIED',text:'First Nations presence continues as the colonial town develops. Vegetation and the clearing sequence towards the courthouse site are illustrative.',source:'Country and continuing connection',url:culture};
 if(year<1899)return{title:'The earlier courthouse',type:'DOCUMENTED BUILDING · APPROXIMATE GEOMETRY',text:'A courthouse was built at Hunter and Bolton Streets in 1838. This separate massing model uses the existing archival study; dimensions and details remain provisional.',source:'The Lock-Up · building history',url:courthouse};
 if(year<1900)return{title:'Courthouse removal',type:'INTERPRETED TRANSITION',text:'The earlier courthouse makes way for the Post Office. The precise demolition sequence is not established; this transition is an animation between documented structures.',source:'The Lock-Up · building history',url:courthouse};
 if(year<1903)return{title:'Post Office construction',type:'DOCUMENTED PERIOD · INTERPRETED SEQUENCE',text:'The Post Office was built during 1900–1903. Stonework rises before the upper colonnade and copper cupolas. The construction order and scaffolding are illustrative.',source:'Snowball archive · construction photograph, 1901',url:construction};
 if(year<1960)return{title:'Post Office in use',type:'HISTORICAL RECONSTRUCTION IN PROGRESS',text:'The Post Office opened in August 1903. Its main facade persists through this period. Copper ageing, finishes and moving traffic are illustrative; exact period dressing needs further references.',source:'Heritage NSW · construction and alterations',url:office};
 if(year<2005)return{title:'Later postal use',type:'HISTORICAL RECONSTRUCTION IN PROGRESS',text:'Mail handling moved to Broadmeadow in 1973. Most documented changes in this period concern use and interiors. Traffic uses 1970s-inspired shapes and colours. Activities are illustrative; the facade remains an estimated reconstruction.',source:'Heritage NSW · changes and dates',url:office};
 if(year<=2026)return{title:'Contemporary reference model',type:'PHOTOGRAPHS + ESTIMATED DIMENSIONS',text:'The building geometry is based principally on 2015 and 2019 photographs. It is not a verified survey of September 2026. Moving traffic is illustrative. Open the photographic comparison to inspect the remaining mismatches.',source:'Open the photographic comparison',url:'./post-office.html'};
 if(year<2200)return{title:'Maintenance stops',type:'AUTHORED FUTURE · NOT A FORECAST',text:'One possible future: maintenance ceases, glazing fails and vegetation takes hold. The dates and causes of abandonment are chosen for this scenario.',source:'Future scenario assumptions',url:'#evidence'};
 if(year<2420)return{title:'Structural collapse',type:'AUTHORED FUTURE · NOT A FORECAST',text:'Roof and upper masonry fall while trees establish in the building. Fragments move into rubble and wall creepers settle with the collapse. This is an authored transformation, not a structural simulation.',source:'Future scenario assumptions',url:'#evidence'};
 return{title:'Overgrown ruins',type:'AUTHORED FUTURE · NOT A FORECAST',text:'The building has largely collapsed. Low masonry, fallen columns and cupola fragments remain beneath dense trees, shrubs and ground cover. This ending is one imagined trajectory for the site.',source:'Future scenario assumptions',url:'#evidence'};
}
export function growth(rec,year){let v=smooth(...rec.birth,year)*(rec.death?1-smooth(...rec.death,year):1);if(rec.early)v=Math.max(v,1-smooth(1810,1837,year));return v;}
export function weights(year){const ruin=smooth(2260,2510,year);return {damage:smooth(2110,2300,year)*(1-ruin),ruin};}
