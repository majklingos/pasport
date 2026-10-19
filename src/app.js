"use strict";
import {createCap} from "./cap";
const PDFJS="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/";
const JSQR="https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js";
const PALETTE=["#C7392B","#2F6DB5","#D68A00","#3E8E4F","#7B4FB0","#0F8A8A","#B04F7E","#6B6B2F"];
const COLS=["sites","floors","layers","rooms","cats","items","plans"];
const $=s=>document.querySelector(s);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,8);
const ICON={
  cam:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>',
  box:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 7l8-4 8 4v10l-8 4-8-4zM4 7l8 4 8-4M12 11v10"/></svg>',
  chev:'<svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M9 6l6 6-6 6"/></svg>',
  x:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  view:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M5 3l14 8-6 2-2 6z"/></svg>',
  magic:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 20L14 10M15 3v3M15 12v3M20 8h-3M13 8h-3M18.5 4.5l-2 2M18.5 11.5l-2-2"/></svg>',
  all:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M3 4h18v16H3zM12 4v7M3 11h18M8 11v9"/><path d="M15 15l1.2 2.4L19 18l-2 1.8.5 2.7" stroke-linecap="round"/></svg>',
  pen:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M4 6l7-2 9 6-3 10-12-2z"/><circle cx="4" cy="6" r="1.6" fill="currentColor"/><circle cx="11" cy="4" r="1.6" fill="currentColor"/><circle cx="20" cy="10" r="1.6" fill="currentColor"/></svg>',
  pin:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><path d="M12 7v5M9.5 9.5h5" stroke-linecap="round"/></svg>',
  fit:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5"/></svg>',
  ai:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/></svg>',
  dl:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg>',
  filter:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M4 5h16l-6 7v6l-4 2v-8z"/></svg>',
  shapeY:'<svg class="shape" viewBox="0 0 24 24" fill="currentColor" fill-opacity=".2" stroke="currentColor" stroke-width="1.8"><path d="M4 5h11v5h5v9H4z"/></svg>',
  shapeN:'<svg class="shape no" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-dasharray="3 2.5"><path d="M4 5h11v5h5v9H4z"/></svg>'
};

/* ---------------- state ---------------- */
let S={sites:{},floors:{},layers:{},rooms:{},cats:{},items:{},plans:{}};
let CAP={db:null,assets:null,sample:null,downloads:null};
let live=false, loadedCols=new Set(), migrated=false;
const ui={tab:"plan",siteId:null,planId:null,layerOf:{},mode:"view",sel:null,draft:null,sheet:null,cam:{x:0,y:0,s:1},
  search:"",open:{},labelCat:"",gap:0,thr:0,thick:1,color:false,showWalls:false,form:null,vSel:-1,busy:"",filter:null,cands:null,align:null,
  sitesOpen:false,ren:null,addFloor:null,addLayer:null,roomPanel:null,bulk:null};
const blobCache={};
try{const f=JSON.parse(localStorage.getItem("pasport.filter")||"null");if(Array.isArray(f))ui.filter=f}catch(e){}

/* ---------------- store ---------------- */
const clean=o=>JSON.parse(JSON.stringify(o));
async function put(col,id,data){
  S[col][id]={...clean(data),id}; render();
  if(live){try{const {id:_,...d}=S[col][id];await CAP.db.collection(col).doc(id).set(d)}catch(e){toast("Uložení se nepovedlo: "+(e.message||e.code))}}
}
async function patch(col,id,p){
  if(!S[col][id])return; S[col][id]={...S[col][id],...clean(p)}; render();
  if(live){try{await CAP.db.collection(col).doc(id).update(clean(p))}catch(e){toast("Uložení se nepovedlo: "+(e.message||e.code))}}
}
async function del(col,id){
  delete S[col][id]; render();
  if(live){try{await CAP.db.collection(col).doc(id).delete()}catch(e){toast("Smazání se nepovedlo: "+(e.message||e.code))}}
}
const byOrder=(a,b)=>(a.order||0)-(b.order||0)||String(a.name).localeCompare(String(b.name),"cs",{numeric:true});
const byName=(a,b)=>String(a.name).localeCompare(String(b.name),"cs",{numeric:true});
const sites=()=>Object.values(S.sites).sort(byOrder);
const floorsOf=sid=>Object.values(S.floors).filter(f=>f.siteId===sid).sort(byOrder);
const layersOf=fid=>Object.values(S.layers).filter(l=>l.floorId===fid).sort(byOrder);
const curSite=()=>S.sites[ui.siteId]||null;
const curFloor=()=>S.floors[ui.planId]||null;
function curLayer(){const f=curFloor();if(!f)return null;const l=S.layers[ui.layerOf[f.id]];return l&&l.floorId===f.id?l:(layersOf(f.id)[0]||null)}
const roomsOf=fid=>Object.values(S.rooms).filter(r=>r.planId===fid);
const itemsOf=fid=>Object.values(S.items).filter(i=>i.planId===fid);
const siteItems=()=>Object.values(S.items).filter(i=>S.floors[i.planId]?.siteId===ui.siteId);
const siteRooms=()=>Object.values(S.rooms).filter(r=>S.floors[r.planId]?.siteId===ui.siteId);
const hasPoly=r=>Array.isArray(r.poly)&&r.poly.length>=6;
const P=flat=>{const o=[];for(let i=0;i<flat.length;i+=2)o.push([flat[i],flat[i+1]]);return o};
const F=pts=>pts.flatMap(p=>[Math.round(p[0]*10)/10,Math.round(p[1]*10)/10]);
/* similarity transform layer px -> floor coords: x'=a x - b y + tx, y'=b x + a y + ty */
const fwd=(m,x,y)=>[m[0]*x-m[1]*y+m[2],m[1]*x+m[0]*y+m[3]];
const inv=(m,X,Y)=>{const d=m[0]*m[0]+m[1]*m[1],u=X-m[2],v=Y-m[3];return[(m[0]*u+m[1]*v)/d,(-m[1]*u+m[0]*v)/d]};
const mstr=m=>`matrix(${m[0]} ${m[1]} ${-m[1]} ${m[0]} ${m[2]} ${m[3]})`;
function sim(p1,p2,q1,q2){const dx=p2[0]-p1[0],dy=p2[1]-p1[1],ex=q2[0]-q1[0],ey=q2[1]-q1[1];const d=dx*dx+dy*dy||1e-9;
  const a=(ex*dx+ey*dy)/d,b=(ey*dx-ex*dy)/d;return[a,b,q1[0]-(a*p1[0]-b*p1[1]),q1[1]-(b*p1[0]+a*p1[1])]}
const lm=l=>Array.isArray(l?.m)&&l.m.length===4?l.m:[1,0,0,0];

/* categories */
const cats=()=>Object.values(S.cats).sort(byName);
const kids=pid=>cats().filter(c=>(c.parentId||"")===(pid||""));
function catPath(id){const out=[];let c=S.cats[id],g=0;while(c&&g++<20){out.unshift(c.name);c=S.cats[c.parentId]}return out}
function rootOf(id){let c=S.cats[id],g=0;while(c&&c.parentId&&S.cats[c.parentId]&&g++<20)c=S.cats[c.parentId];return c}
function catColor(id){const r=rootOf(id);return r?r.color||PALETTE[0]:"#7A8580"}
function descIds(id){const out=[id];kids(id).forEach(k=>out.push(...descIds(k.id)));return out}
function catOptions(sel){
  const out=['<option value="">— bez kategorie —</option>'];
  const walk=(pid,d)=>kids(pid).forEach(c=>{out.push(`<option value="${c.id}" ${c.id===sel?"selected":""}>${"   ".repeat(d)}${d?"└ ":""}${esc(c.name)}</option>`);walk(c.id,d+1)});
  walk("",0);return out.join("");
}
function addCat(name,parentId){
  name=name.trim();if(!name)return null;
  const id=uid();const roots=kids("").length;
  put("cats",id,{name,parentId:parentId||"",color:parentId?"":PALETTE[roots%PALETTE.length]});return id;
}
const DEFAULT_CATS=[["PBZ",["PHP","Hydrant","Požární klapka","Požární ucpávka","Hlásič EPS","Nouzové osvětlení"]],["VZT",["VZT jednotka","Fancoil","Ventilátor","Vyústka"]],["Elektro",["Rozvaděč","UPS"]],["ZTI",["Čerpadlo","Bojler"]],["MaR",["Regulátor","Čidlo"]]];
function seedCats(){DEFAULT_CATS.forEach(([r,subs])=>{const id=addCat(r,"");subs.forEach(s=>addCat(s,id))});toast("Základní kategorie přidány – můžete je libovolně upravit.")}
/* filter */
function filterSet(){if(!ui.filter)return null;const s=new Set();ui.filter.forEach(id=>{if(id==="_none")s.add("_none");else if(S.cats[id])descIds(id).forEach(x=>s.add(x))});return s}
function itemVisible(it,fs){if(!fs)return true;return S.cats[it.catId]?fs.has(it.catId):fs.has("_none")}
function setFilter(f){ui.filter=f;try{localStorage.setItem("pasport.filter",JSON.stringify(f))}catch(e){}}

/* geometry */
function inPoly(x,y,pts){let c=false;for(let i=0,j=pts.length-1;i<pts.length;j=i++){const[xi,yi]=pts[i],[xj,yj]=pts[j];if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)c=!c}return c}
function area(p){let a=0;for(let i=0,j=p.length-1;i<p.length;j=i++)a+=p[j][0]*p[i][1]-p[i][0]*p[j][1];return a/2}
function centroid(pts){let a=0,cx=0,cy=0;for(let i=0,j=pts.length-1;i<pts.length;j=i++){const f=pts[j][0]*pts[i][1]-pts[i][0]*pts[j][1];a+=f;cx+=(pts[j][0]+pts[i][0])*f;cy+=(pts[j][1]+pts[i][1])*f}
  if(Math.abs(a)<1e-6){const n=pts.length;return[pts.reduce((s,p)=>s+p[0],0)/n,pts.reduce((s,p)=>s+p[1],0)/n]}a*=3;return[cx/a,cy/a]}
function roomAt(fid,x,y){if(x==null)return null;const rs=roomsOf(fid).filter(r=>hasPoly(r)&&inPoly(x,y,P(r.poly)));
  return rs.length?rs.sort((a,b)=>Math.abs(area(P(a.poly)))-Math.abs(area(P(b.poly))))[0]:null}
function nextTag(){let m=0;Object.values(S.items).forEach(i=>{const n=parseInt(String(i.tag||"").replace(/\D/g,""),10);if(n>m)m=n});return "T-"+String(m+1).padStart(4,"0")}
function whereText(it){const f=S.floors[it.planId],r=S.rooms[it.roomId];return [f?.name,r?.name||(f?"bez místnosti":"")].filter(Boolean).join(" › ")}

/* ---------------- images ---------------- */
function loadScript(src){return new Promise((res,rej)=>{const s=document.createElement("script");s.src=src;s.onload=res;s.onerror=()=>rej(new Error("Knihovnu se nepodařilo načíst."));document.head.appendChild(s)})}
async function toBitmap(blob){try{return await createImageBitmap(blob,{imageOrientation:"from-image"})}catch(e){
  return await new Promise((res,rej)=>{const im=new Image();im.onload=()=>res(im);im.onerror=()=>rej(new Error("Obrázek nelze otevřít."));im.src=URL.createObjectURL(blob)})}}
async function compress(file,max=1600,type="image/jpeg",q=.82){
  const bm=await toBitmap(file);const k=Math.min(1,max/Math.max(bm.width,bm.height));
  const c=document.createElement("canvas");c.width=Math.round(bm.width*k);c.height=Math.round(bm.height*k);
  const x=c.getContext("2d");x.fillStyle="#fff";x.fillRect(0,0,c.width,c.height);x.drawImage(bm,0,0,c.width,c.height);
  return await new Promise(r=>c.toBlob(r,type,q));
}
async function storeImage(blob){
  if(CAP.assets){const r=await CAP.assets.upload(blob);blobCache[r.url]=blob;return {a:r.id,u:r.url}}
  const u=URL.createObjectURL(blob);blobCache[u]=blob;return {a:"",u};
}
async function blobOf(u){if(blobCache[u])return blobCache[u];const r=await fetch(u);if(!r.ok)throw new Error("Obrázek nelze stáhnout.");const b=await r.blob();blobCache[u]=b;return b}
/* drawing files -> list of {blob,w,h,name} (PDF: one per page) */
async function fileToSheets(file,maxPages=12){
  const name=file.name.replace(/\.[^.]+$/,"");const ext=(file.name.split(".").pop()||"").toLowerCase();
  if(ext==="dwg"||ext==="dxf")throw new Error("DWG/DXF zatím neumím. Vyexportujte výkres do PDF a nahrajte PDF.");
  if(ext==="pdf"||file.type==="application/pdf"){
    if(!window.pdfjsLib){await loadScript(PDFJS+"pdf.min.js");await loadScript(PDFJS+"pdf.worker.min.js")}
    pdfjsLib.GlobalWorkerOptions.workerSrc=PDFJS+"pdf.worker.min.js";
    const pdf=await pdfjsLib.getDocument({data:new Uint8Array(await file.arrayBuffer())}).promise;
    const n=Math.min(pdf.numPages,maxPages);const out=[];
    for(let p=1;p<=n;p++){
      ui.busy=`Zpracovávám stránku ${p}/${n}…`;render();
      const page=await pdf.getPage(p);const v0=page.getViewport({scale:1});const sc=Math.min(5,3000/Math.max(v0.width,v0.height));const vp=page.getViewport({scale:sc});
      const c=document.createElement("canvas");c.width=Math.round(vp.width);c.height=Math.round(vp.height);const x=c.getContext("2d");x.fillStyle="#fff";x.fillRect(0,0,c.width,c.height);
      await page.render({canvasContext:x,viewport:vp}).promise;
      out.push({blob:await new Promise(r=>c.toBlob(r,"image/png")),w:c.width,h:c.height,name:n>1?`${name} – str. ${p}`:name,pages:pdf.numPages});
    }
    return out;
  }
  const blob=await compress(file,3000,"image/png");const bm=await toBitmap(blob);
  return [{blob,w:bm.width,h:bm.height,name,pages:1}];
}

/* ---------------- demo ---------------- */
const DEMO_ROOMS=[["7.01 Kancelář",65,65,455,435],["7.02 Kancelář",465,65,855,435],["7.03 Zasedací místnost",865,65,1155,435],["7.04 Strojovna VZT",1165,65,1535,435],
  ["7.05 Chodba",65,445,1535,555],["7.06 Open space",65,565,635,935],["7.07 WC",645,565,815,935],["7.08 Úklid",825,565,955,935],["7.09 Serverovna",965,565,1535,935]];
function drawDemoPlan(){
  const c=document.createElement("canvas");c.width=1600;c.height=1000;const x=c.getContext("2d");
  x.fillStyle="#fff";x.fillRect(0,0,1600,1000);x.lineCap="square";
  // grid axes (thin, dash-dot) and dimension line - typical clutter
  x.strokeStyle="#666";x.lineWidth=1;x.setLineDash([18,5,3,5]);
  [60,460,860,1160,1540].forEach(v=>{x.beginPath();x.moveTo(v,10);x.lineTo(v,995);x.stroke()});x.setLineDash([]);
  x.beginPath();x.moveTo(60,30);x.lineTo(1540,30);x.stroke();[60,460,860,1160,1540].forEach(v=>{x.beginPath();x.moveTo(v-6,36);x.lineTo(v+6,24);x.stroke()});
  x.fillStyle="#444";x.font="13px Arial";x.textAlign="center";[[260,"4000"],[660,"4000"],[1010,"3000"],[1350,"3800"]].forEach(([a,t])=>x.fillText(t,a,24));
  x.strokeStyle="#111";
  const wall=(x1,y1,x2,y2,w=10)=>{x.lineWidth=w;x.beginPath();x.moveTo(x1,y1);x.lineTo(x2,y2);x.stroke()};
  wall(60,60,1540,60,14);wall(60,940,1540,940,14);wall(60,60,60,940,14);wall(1540,60,1540,940,14);
  const hw=(y,doors)=>{let xs=60;doors.sort((a,b)=>a-b).forEach(d=>{wall(xs,y,d,y);xs=d+80});wall(xs,y,1540,y)};
  hw(440,[300,700,1000,1300]);hw(560,[400,680,850,1200]);
  [460,860,1160].forEach(v=>wall(v,60,v,440));[640,820,960].forEach(v=>wall(v,560,v,940));
  const door=(dx,y,dir)=>{x.strokeStyle="#333";wall(dx,y,dx,y+dir*80,3);x.strokeStyle="#9a9a9a";x.lineWidth=1.5;x.beginPath();x.arc(dx,y,80,dir>0?0:-Math.PI/2,dir>0?Math.PI/2:0);x.stroke();x.strokeStyle="#111"};
  [300,700,1000,1300].forEach(d=>door(d,440,-1));[400,680,850,1200].forEach(d=>door(d,560,1));
  x.strokeStyle="#888";x.lineWidth=2;for(let wx=120;wx<1500;wx+=240){x.beginPath();x.moveTo(wx,54);x.lineTo(wx+120,54);x.moveTo(wx,66);x.lineTo(wx+120,66);x.stroke()}
  // hatched shaft in server room, furniture in dark thin lines
  x.strokeStyle="#333";x.lineWidth=1.2;x.strokeRect(1440,840,90,90);for(let k=0;k<180;k+=12){x.beginPath();x.moveTo(1440+Math.max(0,k-90),840+Math.min(90,k));x.lineTo(1440+Math.min(90,k),840+Math.max(0,k-90));x.stroke()}
  [[120,140],[280,140],[520,140],[680,140]].forEach(([a,b])=>{x.strokeRect(a,b,110,60);x.beginPath();x.arc(a+55,b+85,14,0,7);x.stroke()});
  x.strokeRect(930,190,170,90);for(let k=0;k<6;k++){x.beginPath();x.arc(950+k*26,170,10,0,7);x.stroke();x.beginPath();x.arc(950+k*26,300,10,0,7);x.stroke()}
  x.strokeRect(1220,140,220,120);x.strokeRect(100,640,480,40);x.strokeRect(100,760,480,40);x.strokeRect(1000,620,60,260);x.strokeRect(1100,620,60,260);
  x.fillStyle="#222";x.font="600 20px Arial";x.textAlign="center";
  DEMO_ROOMS.forEach(([n,a,b,cx,d])=>{const [num,...rest]=n.split(" ");x.fillText(num,(a+cx)/2,(b+d)/2-4);x.font="15px Arial";x.fillText(rest.join(" "),(a+cx)/2,(b+d)/2+16);x.font="600 20px Arial"});
  x.fillStyle="#555";x.font="14px Arial";x.textAlign="left";x.fillText("7. NP — stavební část (ukázka)",72,985);
  return c;
}
function drawDemoVzt(){ // same building drawn at a different scale + offset, like a separate profession's drawing
  const s=.8,ox=40,oy=30;const c=document.createElement("canvas");c.width=1400;c.height=900;const x=c.getContext("2d");
  x.fillStyle="#fff";x.fillRect(0,0,1400,900);x.setTransform(s,0,0,s,ox,oy);
  x.strokeStyle="#B9B9B9";x.lineWidth=8;x.strokeRect(60,60,1480,880);
  [[60,440,1540,440],[60,560,1540,560],[460,60,460,440],[860,60,860,440],[1160,60,1160,440],[640,560,640,940],[820,560,820,940],[960,560,960,940]].forEach(([a,b,cc,d])=>{x.beginPath();x.moveTo(a,b);x.lineTo(cc,d);x.stroke()});
  x.strokeStyle="#1F5FA8";x.lineWidth=16;x.beginPath();x.moveTo(1350,250);x.lineTo(1350,500);x.lineTo(120,500);x.stroke();
  x.lineWidth=10;[260,660,1010].forEach(v=>{x.beginPath();x.moveTo(v,500);x.lineTo(v,260);x.stroke()});[350,730,890,1250].forEach(v=>{x.beginPath();x.moveTo(v,500);x.lineTo(v,750);x.stroke()});
  x.fillStyle="#1F5FA8";[260,660,1010].forEach(v=>x.fillRect(v-18,242,36,36));[350,730,890,1250].forEach(v=>x.fillRect(v-18,740,36,36));
  x.strokeStyle="#C7392B";x.lineWidth=4;[[1160,500],[460,500],[860,500]].forEach(([a,b])=>{x.strokeRect(a-14,b-14,28,28);x.beginPath();x.moveTo(a-14,b-14);x.lineTo(a+14,b+14);x.stroke()});
  x.fillStyle="#1F5FA8";x.fillRect(1230,120,240,110);x.fillStyle="#fff";x.font="bold 22px Arial";x.textAlign="center";x.fillText("AHU-7",1350,182);
  x.setTransform(1,0,0,1,0,0);x.fillStyle="#1F5FA8";x.font="16px Arial";x.textAlign="left";x.fillText("7. NP — VZT (ukázka, jiné měřítko)",20,885);
  return {c,m:[1/s,0,-ox/s,-oy/s]};
}
function canvasImg(c){const u=c.toDataURL("image/png");c.toBlob(b=>{blobCache[u]=b},"image/png");return {a:"",u}}
function loadDemo(){
  S={sites:{},floors:{},layers:{},rooms:{},cats:{},items:{},plans:{}};
  const sid="demo-site",fid="demo-floor";
  S.sites[sid]={id:sid,name:"Ukázkový objekt",order:1};
  S.floors[fid]={id:fid,siteId:sid,name:"7. NP",w:1600,h:1000,order:7};
  S.floors["demo-floor6"]={id:"demo-floor6",siteId:sid,name:"6. NP",w:0,h:0,order:6};
  S.layers["L1"]={id:"L1",floorId:fid,name:"Stavební",img:canvasImg(drawDemoPlan()),w:1600,h:1000,m:[1,0,0,0],order:1};
  const v=drawDemoVzt();S.layers["L2"]={id:"L2",floorId:fid,name:"VZT",img:canvasImg(v.c),w:1400,h:900,m:v.m,order:2};
  const rid={};DEMO_ROOMS.forEach(([n,a,b,cx,d],i)=>{const id="r"+i;rid[n.split(" ")[0]]=id;S.rooms[id]={id,planId:fid,name:n,poly:[a,b,cx,b,cx,d,a,d]}});
  ["6.01 Kancelář","6.02 Kancelář","6.03 Chodba","6.04 WC"].forEach((n,i)=>{S.rooms["q"+i]={id:"q"+i,planId:"demo-floor6",name:n,poly:[]}});
  const cid={};let ci=0;DEFAULT_CATS.forEach(([r,subs],k)=>{const id="c"+(ci++);cid[r]=id;S.cats[id]={id,name:r,parentId:"",color:PALETTE[k]};subs.forEach(s=>{const sid2="c"+(ci++);cid[s]=sid2;S.cats[sid2]={id:sid2,name:s,parentId:id,color:""}})});
  const add=(name,cat,room,x,y,extra={})=>{const id="i"+Object.keys(S.items).length;S.items[id]={id,planId:fid,roomId:rid[room],x,y,name,catId:cid[cat],maker:"",model:"",serial:"",year:"",params:"",note:"",photos:[],plates:[],tag:"T-"+String(Object.keys(S.items).length+1).padStart(4,"0"),...extra}};
  add("Hasicí přístroj CO2 5 kg","PHP","7.05",380,500,{maker:"Hasil",model:"S5 CO2",serial:"24-118833",year:"2024",params:"CO2, 5 kg, 55B"});
  add("Hasicí přístroj práškový 6 kg","PHP","7.05",1140,500,{maker:"Hasil",model:"P6Če",year:"2023"});
  add("Hasicí přístroj CO2 5 kg","PHP","7.09",1490,610);
  add("Hydrant D25","Hydrant","7.05",760,515,{params:"D25, 30 m hadice"});
  add("Fancoil FC-701-1","Fancoil","7.01",130,400,{maker:"FläktGroup",model:"FCM 30"});
  add("Fancoil FC-702-1","Fancoil","7.02",820,400,{maker:"FläktGroup",model:"FCM 30"});
  add("VZT jednotka AHU-7","VZT jednotka","7.04",1350,190,{maker:"Remak",model:"AeroMaster XP 06",year:"2019"});
  add("Rozvaděč RP7.1","Rozvaděč","7.08",890,900,{params:"3×63 A"});
  add("UPS serverovna","UPS","7.09",1250,880,{maker:"APC",model:"Smart-UPS SRT 6kVA"});
  add("Požární klapka PK-7-03","Požární klapka","7.04",1160,500);
  add("Požární klapka PK-7-02","Požární klapka","7.03",860,500);
  add("Požární ucpávka U-7-01","Požární ucpávka","7.04",1300,437,{params:"EI 60, kabelová"});
  ui.siteId=sid;ui.planId=fid;ui.demo=true;ui.needFit=true;
}

/* ---------------- render ---------------- */
let rq=0;function render(){if(!rq)rq=requestAnimationFrame(()=>{rq=0;doRender()})}
function fixSelection(){
  if(!S.sites[ui.siteId])ui.siteId=sites()[0]?.id||null;
  const f=S.floors[ui.planId];
  if(!f||f.siteId!==ui.siteId){ui.planId=floorsOf(ui.siteId)[0]?.id||null;ui.needFit=true;ui.sel=null;ui.sheet=null;ui.draft=null;ui.cands=null;if(ui.mode!=="view")ui.mode="view"}
}
function doRender(){
  fixSelection();
  const s=curSite(),f=curFloor(),l=curLayer();
  $("#locSite").textContent=s?s.name:"Žádný objekt";
  $("#locFloor").textContent=f?f.name+(l&&layersOf(f.id).length>1?" · "+l.name:""):(s?"Přidejte patro":"Založte objekt");
  document.querySelectorAll("nav.tabs button").forEach(b=>b.setAttribute("aria-selected",b.dataset.tab===ui.tab));
  const main=$("#main");const key=ui.tab+"|"+(ui.tab==="plan"?(f&&f.w?"p":"-"):"");
  if(main.dataset.view!==key){main.dataset.view=key;main.innerHTML="";delete main.dataset.built}
  if(ui.tab==="plan")renderPlanTab(main);else if(ui.tab==="rooms")renderRooms(main);else if(ui.tab==="list")renderList(main);else renderLabels(main);
  if(ui.form&&!$("#itemForm"))renderForm();
  renderSites();renderRoomPanel();
}
function banner(){
  if(ui.loading)return "Načítám data…";
  if(live&&CAP.db?.temporary)return "Vývojová verze · data se po zavření stránky ztratí";
  if(!live&&ui.demo)return "Ukázková data · v tomto náhledu se nic neukládá";
  return "";
}
const planBtn=(label,cls,attrs)=>`<label class="${cls||"btn primary"} cap">${label}<input type="file" accept="application/pdf,image/*" ${attrs} aria-label="Vybrat PDF nebo obrázek výkresu"></label>`;
const scanBtn=(label,cls="btn")=>`<label class="${cls} cap">${label}<input type="file" accept="image/*" data-scan aria-label="Vyfotit QR štítek"></label>`;

/* ---------- plan tab ---------- */
function renderPlanTab(main){
  const site=curSite(),fl=curFloor();
  if(!fl||!fl.w){
    if(main.dataset.built==="w"&&main.contains(document.activeElement))return;main.dataset.built="w";
    let body;
    if(!site)body=`<div class="eyebrow">Pasportizace technologií</div><h1>Založte první objekt</h1>
      <p>Objekt je budova. V ní pak přidáte patra a do pater výkresy jednotlivých profesí (stavební, VZT, elektro…).</p>
      <input id="wSite" placeholder="Název objektu, např. Administrativní budova A" autocomplete="off">
      <button class="btn primary" data-act="wCreate">Založit objekt</button>
      <button class="btn" data-act="demoSite">Vyzkoušet na ukázkovém objektu</button>`;
    else if(!fl)body=`<div class="eyebrow">${esc(site.name)}</div><h1>Přidejte první patro</h1>
      <p>Nahrajte výkres patra (PDF nebo obrázek). Každá stránka PDF se uloží jako samostatné patro – názvy pak můžete upravit.</p>
      ${ui.busy?`<p style="display:flex;gap:8px;align-items:center"><span class="spin"></span>${esc(ui.busy)}</p>`:planBtn("Nahrát výkres patra","btn primary",`data-newfloor="${site.id}"`)}
      <button class="btn" data-act="sitesOpen">Patro bez výkresu nebo jiné možnosti</button>`;
    else body=`<div class="eyebrow">${esc(site.name)} › ${esc(fl.name)}</div><h1>Toto patro zatím nemá výkres</h1>
      <p>Místnosti a technologie můžete zapisovat i bez výkresu v záložce Místnosti. Výkres jde nahrát kdykoli.</p>
      ${ui.busy?`<p style="display:flex;gap:8px;align-items:center"><span class="spin"></span>${esc(ui.busy)}</p>`:planBtn("Nahrát výkres patra","btn primary",`data-newlayer="${fl.id}"`)}
      <button class="btn" data-act="tab" data-tab="rooms">Místnosti tohoto patra</button>`;
    main.innerHTML=`<div class="welcome"><div>${banner()?`<span class="banner">${banner()}</span>`:""}${body}</div></div>`;return;
  }
  if(main.dataset.built!=="p"){
    main.dataset.built="p";
    main.innerHTML=`<div id="vp"><svg id="svg" xmlns="http://www.w3.org/2000/svg"><g id="cam"><g id="imgs"></g><g id="walls"></g><g id="ov"></g></g></svg></div>
      <div class="ptop"><div class="lbar" id="lbar"></div><div id="hint"></div></div>
      <div id="bn"></div>
      <button class="iconbtn fitbtn" data-act="fit" aria-label="Zobrazit celý půdorys">${ICON.fit}</button>
      <div class="tools" id="tools"></div><div id="sheetWrap"></div>`;
    bindViewport();ui.imgKey="";
  }
  if(ui.needFit){ui.needFit=false;fit()}
  $("#bn").innerHTML=banner()?`<span class="banner pbanner">${banner()}</span>`:"";
  renderLayerBar();
  const T=[["view","Prohlížet",ICON.view],["detect","Najít místnost",ICON.magic],["all","Najít všechny",ICON.all],["draw","Kreslit",ICON.pen],["place","Umístit",ICON.pin]];
  $("#tools").innerHTML=T.map(([m,l,ic])=>`<button data-act="mode" data-mode="${m}" aria-pressed="${ui.mode===m||(m==="all"&&ui.mode==="cands")}">${ic}${l}</button>`).join("");
  $("#tools").hidden=["edit","move","align","draw-done","copy"].includes(ui.mode)||!!ui.draft&&ui.mode!=="draw"||ui.mode==="cands";
  renderHint();drawImages();drawOverlay();renderSheet();
}
function renderLayerBar(){
  const lb=$("#lbar");if(!lb)return;const fl=curFloor();
  if(ui.mode==="align"){lb.innerHTML="";return}
  const ls=layersOf(fl.id),cur=curLayer();const fs=ui.filter;
  lb.innerHTML=`<div class="chips">${ls.map(l=>`<button class="chip" data-act="layer" data-id="${l.id}" aria-pressed="${l.id===cur?.id}">${esc(l.name)}</button>`).join("")}
    ${ui.busy?`<span class="chip"><span class="spin"></span>${esc(ui.busy)}</span>`:planBtn("+ Vrstva","chip add",`data-newlayer="${fl.id}"`)}</div>
    <button class="chip flt" data-act="filterOpen" data-on="${!!fs}">${ICON.filter}${fs?`Filtr (${fs.length})`:"Filtr"}</button>`;
}
function renderHint(){
  const h=$("#hint");if(!h)return;let html="";const m=ui.mode;
  const sliders=`<div class="row"><label>Dveře/mezery <input type="range" id="gap" min="0" max="4" step="0.2" value="${ui.gap}"><output id="gapOut">${ui.gap?ui.gap.toFixed(1)+" %":"auto"}</output></label>
    <label>Tenké čary ignorovat <input type="range" id="thick" min="0" max="5" step="1" value="${ui.thick}"><output id="thickOut">${ui.thick} px</output></label>
    <label>Odstín stěn <input type="range" id="thr" min="0" max="245" step="5" value="${ui.thr}"><output id="thrOut">${ui.thr?ui.thr:"auto"}</output></label>
    <label><input type="checkbox" id="colorWalls" ${ui.color?"checked":""}> Barevné čáry jsou stěny</label>
    <label><input type="checkbox" id="showWalls" ${ui.showWalls?"checked":""}> Ukázat, co beru jako stěny</label></div>`;
  if(m==="detect"&&!ui.draft)html=`<p><b>Klepněte doprostřed místnosti</b> – hranice najdu podle stěn.</p>${sliders}`;
  else if(m==="all"&&!ui.cands)html=`<p><b>Najdu všechny uzavřené místnosti</b> na této vrstvě. Výsledek pak zkontrolujete.</p><div class="row"><button class="btn sm primary" data-act="runAll">Spustit hledání</button></div>${sliders}`;
  else if(m==="cands")html=`<p><b>Klepnutím místnost vyřadíte</b> nebo vrátíte. Modré se uloží.</p>`;
  else if(m==="draw")html=`<p><b>Klepejte na rohy místnosti${ui.drawFor?` „${esc(S.rooms[ui.drawFor]?.name)}“`:""}.</b> ${ui.draft?.pts?.length||0} bodů · klepnutím na první bod tvar uzavřete.</p>
    <div class="row"><button class="btn sm" data-act="drawUndo" ${ui.draft?.pts?.length?"":"disabled"}>Zpět</button><button class="btn sm primary" data-act="drawDone" ${(ui.draft?.pts?.length||0)>=3?"":"disabled"}>Hotovo</button><button class="btn sm" data-act="cancelDraft">Zrušit</button></div>`;
  else if(m==="place")html=`<p><b>Klepněte, kam technologii umístit.</b> Místnost se přiřadí sama.</p>`;
  else if(m==="copy"&&ui.copy){const t=ui.copy.tpl;html=`<p><b>Kopírování:</b> klepněte na místo dalšího kusu. Další bude <b>${esc(t.name||"bez názvu")}</b>${t.maker||t.model?` · ${esc([t.maker,t.model].filter(Boolean).join(" "))}`:""}.</p>
    <div class="row"><label><input type="checkbox" id="copyQuick" ${ui.copy.quick?"checked":""}> Ukládat hned bez formuláře (fotky a v. č. doplním později)</label><button class="btn sm primary" data-act="copyDone">Hotovo</button></div>`}
  else if(m==="move")html=`<p><b>Klepněte na nové místo</b> pro ${esc(S.items[ui.sel?.id]?.name||"technologii")}.</p><div class="row"><button class="btn sm" data-act="cancelMove">Zrušit</button></div>`;
  else if(m==="edit")html=`<p><b>Táhněte body.</b> Kroužkem s + přidáte bod, klepnutím bod vyberete.</p>
    <div class="row"><button class="btn sm" data-act="vDel" ${ui.vSel>=0&&ui.draft?.pts?.length>3?"":"disabled"}>Smazat bod</button><button class="btn sm primary" data-act="editDone">Hotovo</button><button class="btn sm" data-act="editCancel">Zrušit</button></div>`;
  else if(m==="align"){const A=ui.align;const L=S.layers[A.layerId];const base=layersOf(curFloor().id)[0];
    if(A.step<2)html=`<p><b>Zarovnání vrstvy „${esc(L?.name)}“ · krok 1/2.</b> Na výkresu <b>${esc(base?.name)}</b> klepněte na ${A.step?"<b>druhý</b>":"<b>první</b>"} bod – roh budovy, sloup nebo průsečík os. Body volte co nejdál od sebe. Přibližte si prsty.</p>
      <div class="row">${A.step?`<button class="btn sm" data-act="alignBack">Zpět</button>`:""}<button class="btn sm" data-act="alignSame">Výkresy mají stejný list – srovnat hned</button><button class="btn sm" data-act="alignLater">Později</button></div>`;
    else if(A.step<4)html=`<p><b>Krok 2/2.</b> Teď na výkresu <b>${esc(L?.name)}</b> klepněte na <b>tentýž ${A.step===2?"první":"druhý"}</b> bod (${A.step===2?"1":"2"}).</p>
      <div class="row"><button class="btn sm" data-act="alignBack">Zpět</button><button class="btn sm" data-act="alignLater">Později</button></div>`;
    else html=`<p><b>Kontrola:</b> „${esc(L?.name)}“ leží průhledně přes „${esc(base?.name)}“. Sedí stěny na sebe?</p>
      <div class="row"><label>Průhlednost <input type="range" id="alignOp" min="0" max="1" step="0.05" value="${A.op}"></label>
      <button class="btn sm primary" data-act="alignOk">Sedí, uložit</button><button class="btn sm" data-act="alignRedo">Znovu</button></div>`;
  }
  h.innerHTML=html?`<div class="hint">${html}</div>`:"";
}
function layerImg(l,op=1){return `<g transform="${mstr(lm(l))}"><image href="${esc(l.img.u)}" width="${l.w}" height="${l.h}" preserveAspectRatio="none" opacity="${op}"/></g>`}
function drawImages(){
  const g=$("#imgs");if(!g)return;const fl=curFloor();let html="",key="";
  if(ui.mode==="align"){const A=ui.align,L=S.layers[A.layerId],base=layersOf(fl.id)[0];
    if(A.step<2){html=layerImg(base);key="a0"+base.id}
    else if(A.step<4){html=layerImg({...L,m:[A.s0,0,0,0]});key="a1"+L.id}
    else{html=layerImg(base)+layerImg({...L,m:A.m},A.op);key="a2"+L.id+A.m.join()+A.op}
  }else{const l=curLayer();if(l){html=layerImg(l);key="l"+l.id+lm(l).join()+l.img.u}}
  if(key!==ui.imgKey){g.innerHTML=html;ui.imgKey=key}
}
function drawOverlay(){
  const ov=$("#ov"),fl=curFloor();if(!ov||!fl)return;
  const s=ui.cam.s,fs=14/s,r=10/s;let out="";
  $("#cam").setAttribute("transform",`translate(${ui.cam.x} ${ui.cam.y}) scale(${s})`);
  drawWalls();
  if(ui.mode==="align"){const A=ui.align;const pts=A.step<2?A.q:A.step<4?A.p.map(p=>[p[0]*A.s0,p[1]*A.s0]):[];
    pts.forEach((p,i)=>{out+=`<circle cx="${p[0]}" cy="${p[1]}" r="${16/s}" fill="var(--accent)" fill-opacity=".35" stroke="var(--accent)" stroke-width="${2/s}"/><path d="M${p[0]-24/s} ${p[1]}h${48/s}M${p[0]} ${p[1]-24/s}v${48/s}" stroke="#C7392B" stroke-width="${1.5/s}"/><text x="${p[0]+14/s}" y="${p[1]-14/s}" font-size="${18/s}" font-weight="700" fill="#C7392B" stroke="#fff" stroke-width="${3/s}" paint-order="stroke">${i+1}</text>`});
    ov.innerHTML=out;return}
  const editing=ui.mode==="edit"&&ui.draft?ui.draft.roomId:null;
  const rooms=roomsOf(fl.id).filter(hasPoly);
  rooms.forEach(rm=>{if(rm.id===editing)return;const pts=P(rm.poly);const sel=ui.sel?.type==="room"&&ui.sel.id===rm.id;
    out+=`<polygon data-room="${rm.id}" points="${pts.map(p=>p.join(",")).join(" ")}" fill="${sel?"var(--accent)":"var(--room)"}" fill-opacity="${sel?.28:.12}" stroke="${sel?"var(--accent)":"var(--room)"}" stroke-width="2" vector-effect="non-scaling-stroke"/>`});
  const fset=filterSet();const its=itemsOf(fl.id).filter(i=>i.x!=null&&itemVisible(i,fset));
  rooms.forEach(rm=>{if(rm.id===editing)return;const pp=P(rm.poly);const [cx,cy]=centroid(pp);const n=its.filter(i=>i.roomId===rm.id).length;
    const wpx=(Math.max(...pp.map(p=>p[0]))-Math.min(...pp.map(p=>p[0])))*s;let label=rm.name;if(label.length*7.2>wpx)label=label.split(/\s+/)[0];if(label.length*7.2>wpx)label="";
    if(label)out+=`<text x="${cx}" y="${cy-fs*.2}" text-anchor="middle" font-family="Barlow Condensed,Arial Narrow,sans-serif" font-weight="600" font-size="${fs}" fill="#18201C" stroke="#fff" stroke-width="${3/s}" paint-order="stroke" pointer-events="none">${esc(label)}</text>`;
    if(n)out+=`<text x="${cx}" y="${cy+fs*1.05}" text-anchor="middle" font-family="Barlow,sans-serif" font-size="${fs*.8}" fill="#2C6E5C" stroke="#fff" stroke-width="${3/s}" paint-order="stroke" pointer-events="none">${n} ks</text>`});
  (ui.cands||[]).forEach((c,i)=>{const pts=c.pts;out+=`<polygon data-cand="${i}" points="${pts.map(p=>p.join(",")).join(" ")}" fill="${c.on?"var(--cand)":"#888"}" fill-opacity="${c.on?.28:.12}" stroke="${c.on?"var(--cand)":"#888"}" stroke-width="2" stroke-dasharray="${c.on?"":"5 4"}" vector-effect="non-scaling-stroke"/>`;
    const [cx,cy]=centroid(pts);out+=`<text x="${cx}" y="${cy}" text-anchor="middle" font-family="Barlow Condensed,sans-serif" font-weight="600" font-size="${fs}" fill="${c.on?"#1F4F8A":"#666"}" stroke="#fff" stroke-width="${3/s}" paint-order="stroke" pointer-events="none">${esc(c.name)}</text>`});
  its.forEach(it=>{const sel=ui.sel?.type==="item"&&ui.sel.id===it.id;
    out+=`<g data-item="${it.id}"><circle cx="${it.x}" cy="${it.y}" r="${r*1.9}" fill="transparent"/>${sel?`<circle cx="${it.x}" cy="${it.y}" r="${r*1.6}" fill="none" stroke="var(--accent)" stroke-width="${3/s}"/>`:""}<circle cx="${it.x}" cy="${it.y}" r="${r}" fill="${catColor(it.catId)}" stroke="#fff" stroke-width="${2.5/s}"/></g>`});
  const d=ui.draft;
  if(d&&d.pts?.length){const pts=d.pts;const closed=ui.mode!=="draw";
    out+=`<${closed?"polygon":"polyline"} points="${pts.map(p=>p.join(",")).join(" ")}" fill="${closed?"var(--accent)":"none"}" fill-opacity=".25" stroke="var(--accent)" stroke-width="3" vector-effect="non-scaling-stroke" stroke-dasharray="${closed?"":"6 4"}"/>`;
    if(ui.mode==="draw"||ui.mode==="edit"){
      pts.forEach((p,i)=>{out+=`<circle data-v="${i}" cx="${p[0]}" cy="${p[1]}" r="${(ui.mode==="edit"?11:7)/s}" fill="${i===ui.vSel?"var(--accent)":"#fff"}" stroke="#18201C" stroke-width="${2/s}"/>`});
      if(ui.mode==="edit")pts.forEach((p,i)=>{const q=pts[(i+1)%pts.length];const mx=(p[0]+q[0])/2,my=(p[1]+q[1])/2;
        out+=`<g data-v="${i}" data-ins="1"><circle cx="${mx}" cy="${my}" r="${9/s}" fill="#fff" stroke="#2C6E5C" stroke-width="${1.5/s}" opacity=".9"/><path d="M${mx-4/s} ${my}h${8/s}M${mx} ${my-4/s}v${8/s}" stroke="#2C6E5C" stroke-width="${1.6/s}"/></g>`});
    }}
  ov.innerHTML=out;
}
function fit(){
  const vp=$("#vp"),fl=curFloor();if(!vp||!fl||!fl.w)return;
  const W=vp.clientWidth,H=vp.clientHeight;if(!W||!H){ui.needFit=true;return}
  const s=Math.min(W/fl.w,(H-150)/fl.h)*.95;ui.cam={s,x:(W-fl.w*s)/2,y:56+(H-150-fl.h*s)/2};drawOverlay();
}
function toPlan(cx,cy){const r=$("#vp").getBoundingClientRect();return[(cx-r.left-ui.cam.x)/ui.cam.s,(cy-r.top-ui.cam.y)/ui.cam.s]}
function zoomAt(cx,cy,ns){const r=$("#vp").getBoundingClientRect();const fl=curFloor();
  const min=Math.min(r.width/fl.w,r.height/fl.h)*.3,max=12;ns=Math.max(min,Math.min(max,ns));
  const px=(cx-r.left-ui.cam.x)/ui.cam.s,py=(cy-r.top-ui.cam.y)/ui.cam.s;ui.cam={s:ns,x:cx-r.left-px*ns,y:cy-r.top-py*ns}}
function bindViewport(){
  const vp=$("#vp");const ptrs=new Map();let g=null;
  vp.addEventListener("pointerdown",e=>{
    try{vp.setPointerCapture(e.pointerId)}catch(_){}
    ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(ptrs.size===1){const vh=e.target.closest("[data-v]");
      g={type:vh&&ui.mode==="edit"?"vertex":"tap",sx:e.clientX,sy:e.clientY,cam:{...ui.cam},target:e.target,v:vh?+vh.dataset.v:-1,ins:!!vh?.dataset.ins};
      if(g.type==="vertex"&&g.ins){const pts=ui.draft.pts;const p=pts[g.v],q=pts[(g.v+1)%pts.length];pts.splice(g.v+1,0,[(p[0]+q[0])/2,(p[1]+q[1])/2]);g.v=g.v+1;g.ins=false;ui.vSel=g.v;drawOverlay();renderHint()}
      else if(g.type==="vertex"){ui.vSel=g.v;drawOverlay();renderHint()}
    }else if(ptrs.size===2){const [a,b]=[...ptrs.values()];g={type:"pinch",d0:Math.hypot(a.x-b.x,a.y-b.y),s0:ui.cam.s,last:{x:(a.x+b.x)/2,y:(a.y+b.y)/2}}}
  });
  vp.addEventListener("pointermove",e=>{
    if(!ptrs.has(e.pointerId)||!g)return;ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(g.type==="pinch"&&ptrs.size>=2){const [a,b]=[...ptrs.values()];const m={x:(a.x+b.x)/2,y:(a.y+b.y)/2};
      zoomAt(m.x,m.y,g.s0*Math.hypot(a.x-b.x,a.y-b.y)/g.d0);ui.cam.x+=m.x-g.last.x;ui.cam.y+=m.y-g.last.y;g.last=m;drawOverlay();return}
    const dx=e.clientX-g.sx,dy=e.clientY-g.sy;
    if(g.type==="tap"&&Math.hypot(dx,dy)>8)g.type="pan";
    if(g.type==="pan"){ui.cam.x=g.cam.x+dx;ui.cam.y=g.cam.y+dy;drawOverlay()}
    if(g.type==="vertex"){ui.draft.pts[g.v]=toPlan(e.clientX,e.clientY);drawOverlay()}
  });
  const up=e=>{
    if(!ptrs.has(e.pointerId))return;ptrs.delete(e.pointerId);
    if(g&&g.type==="tap"&&ptrs.size===0){const [px,py]=toPlan(e.clientX,e.clientY);onTap(g.target,px,py)}
    if(ptrs.size===0)g=null;else if(g?.type==="pinch")g={type:"none"};
  };
  vp.addEventListener("pointerup",up);vp.addEventListener("pointercancel",up);
  vp.addEventListener("wheel",e=>{e.preventDefault();zoomAt(e.clientX,e.clientY,ui.cam.s*Math.exp(-e.deltaY*.0015));drawOverlay()},{passive:false});
  new ResizeObserver(()=>{if(ui.needFit)fit()}).observe(vp);
}
function onTap(target,px,py){
  const fl=curFloor();const m=ui.mode;
  if(m==="align"){const A=ui.align;
    if(A.step<2){A.q.push([px,py]);A.step++}
    else if(A.step<4){A.p.push([px/A.s0,py/A.s0]);A.step++;if(A.step===4)A.m=sim(A.p[0],A.p[1],A.q[0],A.q[1])}
    renderHint();drawImages();drawOverlay();return}
  if(m==="view"){
    const it=target.closest?.("[data-item]");
    if(it){ui.sel={type:"item",id:it.dataset.item};ui.sheet={kind:"item",id:it.dataset.item};drawOverlay();renderSheet();return}
    const rm=roomAt(fl.id,px,py);
    if(rm){ui.sel={type:"room",id:rm.id};ui.sheet={kind:"room",id:rm.id}}else{ui.sel=null;ui.sheet=null}
    drawOverlay();renderSheet();return;
  }
  if(m==="cands"){const c=target.closest?.("[data-cand]");if(c){const k=ui.cands[+c.dataset.cand];k.on=!k.on;drawOverlay();renderSheet()}return}
  if(m==="detect"&&!ui.draft){detectRoom(px,py);return}
  if(m==="draw"){
    ui.draft=ui.draft||{pts:[]};const pts=ui.draft.pts;
    if(pts.length>=3&&Math.hypot(pts[0][0]-px,pts[0][1]-py)<14/ui.cam.s){finishDraw();return}
    pts.push([px,py]);drawOverlay();renderHint();return;
  }
  if(m==="place"){if(px<0||py<0||px>fl.w||py>fl.h)return;openForm(null,{planId:fl.id,x:px,y:py});return}
  if(m==="copy"&&ui.copy){if(px<0||py<0||px>fl.w||py>fl.h)return;const tpl=ui.copy.tpl;
    if(ui.copy.quick){const rm=roomAt(fl.id,px,py);const id=uid();const tag=nextTag();
      put("items",id,{planId:fl.id,x:px,y:py,roomId:rm?rm.id:"",serial:"",note:"",photos:[],plates:[],tag,created:new Date().toISOString(),...tpl});
      ui.copy.tpl=copyTpl({...tpl,name:tpl.name});ui.sel={type:"item",id};toast(`${tag} · ${tpl.name}${rm?" › "+rm.name:""}`);drawOverlay();renderHint();return}
    openForm(null,{planId:fl.id,x:px,y:py,tpl});return}
  if(m==="move"&&ui.sel?.type==="item"){const it=S.items[ui.sel.id];const rm=roomAt(it.planId,px,py);
    patch("items",it.id,{x:px,y:py,roomId:rm?rm.id:(it.roomId&&!hasPoly(S.rooms[it.roomId]||{})?it.roomId:"")});ui.mode="view";ui.sheet={kind:"item",id:it.id};toast(rm?`Umístěno do: ${rm.name}`:"Umístěno");render();return}
}
function finishDraw(){
  if(ui.drawFor&&S.rooms[ui.drawFor]){const id=ui.drawFor;assignPoly(id,ui.draft.pts);ui.drawFor=null;ui.draft=null;ui.mode="view";ui.sel={type:"room",id};ui.sheet={kind:"room",id};toast(`Tvar místnosti „${S.rooms[id].name}“ uložen`);render();return}
  ui.mode="draw-done";ui.sheet={kind:"draft"};render()
}
function assignPoly(roomId,pts){const fid=S.rooms[roomId].planId;patch("rooms",roomId,{poly:F(pts)});
  itemsOf(fid).filter(i=>i.x!=null&&!i.roomId&&inPoly(i.x,i.y,pts)).forEach(i=>patch("items",i.id,{roomId}))}

/* ---------- room detection ---------- */
let det=null;
async function layerPixels(l){
  if(det&&det.id===l.id&&det.u===l.img.u)return det;
  const blob=await blobOf(l.img.u);const bm=await toBitmap(blob);
  const D=Math.min(1,2000/Math.max(l.w,l.h));const w=Math.round(l.w*D),h=Math.round(l.h*D);
  const c=document.createElement("canvas");c.width=w;c.height=h;const x=c.getContext("2d",{willReadFrequently:true});
  x.fillStyle="#fff";x.fillRect(0,0,w,h);x.drawImage(bm,0,0,w,h);
  const d=x.getImageData(0,0,w,h).data;const gray=new Uint8Array(w*h),sat=new Uint8Array(w*h);
  for(let i=0;i<w*h;i++){const r=d[4*i],g=d[4*i+1],b=d[4*i+2];gray[i]=r*.299+g*.587+b*.114;sat[i]=Math.max(r,g,b)-Math.min(r,g,b)}
  det={id:l.id,u:l.img.u,w,h,D,gray,sat,bm,cleanKey:"",clean:null};return det;
}
function dilate(m,w,h,r){if(r<1)return m;const t=new Uint8Array(w*h),o=new Uint8Array(w*h);
  for(let y=0;y<h;y++){const row=y*w;let l=-1e9;for(let x=0;x<w;x++){if(m[row+x])l=x;if(x-l<=r)t[row+x]=1}l=1e9;for(let x=w-1;x>=0;x--){if(m[row+x])l=x;if(l-x<=r)t[row+x]=1}}
  for(let x=0;x<w;x++){let l=-1e9;for(let y=0;y<h;y++){if(t[y*w+x])l=y;if(y-l<=r)o[y*w+x]=1}l=1e9;for(let y=h-1;y>=0;y--){if(t[y*w+x])l=y;if(l-y<=r)o[y*w+x]=1}}
  return o}
function erode(m,w,h,r){if(r<1)return m;const inv=new Uint8Array(w*h);for(let i=0;i<w*h;i++)inv[i]=m[i]?0:1;const d=dilate(inv,w,h,r);for(let i=0;i<w*h;i++)inv[i]=d[i]?0:1;return inv}
function dropSmall(m,w,h,lim){ // remove text, symbols and specks: anything whose bounding box is smaller than lim
  const seen=new Uint8Array(w*h),st=new Int32Array(w*h),comp=[];
  for(let i=0;i<w*h;i++){if(!m[i]||seen[i])continue;let sp=0,x0=1e9,y0=1e9,x1=-1,y1=-1;seen[i]=1;st[sp++]=i;comp.length=0;
    while(sp){const p=st[--sp];comp.push(p);const x=p%w,y=(p-x)/w;if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;
      for(let oy=-1;oy<=1;oy++)for(let ox=-1;ox<=1;ox++){const nx=x+ox,ny=y+oy;if(nx<0||ny<0||nx>=w||ny>=h)continue;const q=ny*w+nx;if(m[q]&&!seen[q]){seen[q]=1;st[sp++]=q}}}
    if(x1-x0<lim&&y1-y0<lim)for(const p of comp)m[p]=0}
}
function wallMask(P_){ // dark pixels -> drop thin lines (furniture, hatching, dimensions) -> drop text/symbols
  const key=ui.thr+"|"+ui.thick+"|"+ui.color;if(P_.cleanKey===key)return P_.clean;
  const{w,h,gray,sat}=P_;let raw=new Uint8Array(w*h);const sl=ui.color?255:60; // coloured lines (ducts, pipes, notes) are not walls
  const thr=ui.thr>0?ui.thr:autoThr(P_);P_.autoThr=thr;
  for(let i=0;i<w*h;i++)raw[i]=gray[i]<thr&&sat[i]<sl?1:0;
  if(ui.thick>0)raw=dilate(erode(raw,w,h,ui.thick),w,h,ui.thick);
  dropSmall(raw,w,h,Math.round(Math.max(w,h)*.028));
  P_.clean=raw;P_.cleanKey=key;P_.wallUrl=null;return raw;
}
function autoThr(P_){ // many CAD exports draw walls as a light-grey fill: find that grey level and include it
  const{gray,sat}=P_;const hist=new Uint32Array(256);let n=0;for(let i=0;i<gray.length;i++)if(sat[i]<20){hist[gray[i]]++;n++}
  let best=-1,bc=0;for(let g=185;g<=238;g++){const c=hist[g]+hist[g-1]+hist[g+1];if(c>bc){bc=c;best=g}}
  return bc>n*.006?Math.min(245,best+10):165}
function flood(wall,w,h,s){const reg=new Uint8Array(w*h),st=new Int32Array(w*h);let sp=0,n=0,edge=false;reg[s]=1;st[sp++]=s;
  while(sp){const p=st[--sp];n++;const x=p%w,y=(p-x)/w;if(x===0||y===0||x===w-1||y===h-1)edge=true;
    if(x>0&&!reg[p-1]&&!wall[p-1]){reg[p-1]=1;st[sp++]=p-1}
    if(x<w-1&&!reg[p+1]&&!wall[p+1]){reg[p+1]=1;st[sp++]=p+1}
    if(y>0&&!reg[p-w]&&!wall[p-w]){reg[p-w]=1;st[sp++]=p-w}
    if(y<h-1&&!reg[p+w]&&!wall[p+w]){reg[p+w]=1;st[sp++]=p+w}}
  return{reg,n,edge}}
function trace(m,w,h){let s=-1;for(let i=0;i<w*h;i++)if(m[i]){s=i;break}if(s<0)return[];
  const dx=[1,1,0,-1,-1,-1,0,1],dy=[0,1,1,1,0,-1,-1,-1];const at=(x,y)=>x>=0&&y>=0&&x<w&&y<h&&m[y*w+x];
  const di=(a,b)=>{for(let k=0;k<8;k++)if(dx[k]===a&&dy[k]===b)return k;return 4};
  let cx=s%w,cy=(s-cx)/w;const sx=cx,sy=cy;let b=4;const pts=[[cx,cy]];
  for(let guard=0;guard<600000;guard++){let f=false;
    for(let k=1;k<=8;k++){const d=(b+k)%8,nx=cx+dx[d],ny=cy+dy[d];if(at(nx,ny)){const pd=(b+k-1)%8;const bx=cx+dx[pd],by=cy+dy[pd];cx=nx;cy=ny;b=di(bx-cx,by-cy);f=true;break}}
    if(!f||(cx===sx&&cy===sy))break;pts.push([cx,cy])}
  return pts}
function rdp(pts,eps){if(pts.length<3)return pts.slice();const[a,b]=[pts[0],pts[pts.length-1]];let dm=0,idx=0;
  const L=Math.hypot(b[0]-a[0],b[1]-a[1])||1e-9;
  for(let i=1;i<pts.length-1;i++){const d=Math.abs((b[0]-a[0])*(a[1]-pts[i][1])-(a[0]-pts[i][0])*(b[1]-a[1]))/L;if(d>dm){dm=d;idx=i}}
  if(dm>eps){const l=rdp(pts.slice(0,idx+1),eps),r=rdp(pts.slice(idx),eps);return l.slice(0,-1).concat(r)}return[a,b]}
function simplifyClosed(pts,eps){if(pts.length<4)return pts;let f=0,dm=0;pts.forEach((p,i)=>{const d=Math.hypot(p[0]-pts[0][0],p[1]-pts[0][1]);if(d>dm){dm=d;f=i}});
  const A=rdp(pts.slice(0,f+1),eps),B=rdp(pts.slice(f).concat([pts[0]]),eps);return A.slice(0,-1).concat(B.slice(0,-1))}
function squareUp(pts){const n=pts.length,o=pts.map(p=>p.slice());
  for(let i=0;i<n;i++){const p=o[i],q=o[(i+1)%n];const ang=Math.abs(Math.atan2(q[1]-p[1],q[0]-p[0])*180/Math.PI)%180;
    if(ang<6||ang>174){const y=(p[1]+q[1])/2;p[1]=y;q[1]=y}else if(Math.abs(ang-90)<6){const x=(p[0]+q[0])/2;p[0]=x;q[0]=x}}
  return o}
/* region (in a w×h mask) -> outline in layer pixels, regrown to the wall face; works on a crop for speed */
function regionToPoly(reg,w,h,r,x0,y0,x1,y1,D){
  const kk=Math.max(3,Math.round(r/2)),e=r+kk+3;
  const cx0=Math.max(0,x0-e),cy0=Math.max(0,y0-e),cx1=Math.min(w-1,x1+e),cy1=Math.min(h-1,y1+e);const cw=cx1-cx0+1,ch=cy1-cy0+1;
  const sub=new Uint8Array(cw*ch);for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++)if(reg(y*w+x))sub[(y-cy0)*cw+(x-cx0)]=1;
  const grown=erode(dilate(sub,cw,ch,r+kk),cw,ch,kk);
  let pts=trace(grown,cw,ch);pts=simplifyClosed(pts,Math.max(1.5,r*.35));pts=squareUp(pts);
  return pts.map(p=>[(p[0]+cx0)/D,(p[1]+cy0)/D]);
}
function bbox(mask,w,h){let x0=1e9,y0=1e9,x1=-1,y1=-1;for(let i=0;i<w*h;i++)if(mask[i]){const x=i%w,y=(i-x)/w;if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y}return[x0,y0,x1,y1]}
async function detectRoom(X,Y,forceR){
  const L=curLayer(),m=lm(L);ui.busy="Hledám hranice…";renderLayerBar();
  try{
    const P_=await layerPixels(L);const{w,h,D}=P_;const raw=wallMask(P_);
    const [lx,ly]=inv(m,X,Y);const sx=Math.round(lx*D),sy=Math.round(ly*D);if(sx<0||sy<0||sx>=w||sy>=h){toast("Klepněte do výkresu.");return}
    const M=Math.max(w,h);
    const tryR=r=>{const wall=dilate(raw,w,h,r);let s=sy*w+sx;
      if(wall[s]){let best=-1;for(let rr=1;rr<=r+Math.round(M*.035)&&best<0;rr++)for(let oy=-rr;oy<=rr&&best<0;oy++)for(let ox=-rr;ox<=rr;ox++){const x=sx+ox,y=sy+oy;if(x>=0&&y>=0&&x<w&&y<h&&!wall[y*w+x]){best=y*w+x;break}}
        if(best<0)return null;s=best}
      return {r,...flood(wall,w,h,s)}};
    const ok=x=>x&&!x.edge&&x.n<w*h*.5&&x.n>=30;
    let res=null;
    if(forceR)res=tryR(forceR);
    else if(ui.gap>0)res=tryR(Math.max(1,Math.round(M*ui.gap/100)));
    else{const steps=[];for(let pct=.25;pct<=4.01;pct+=.25)steps.push(Math.max(1,Math.round(M*pct/100)));
      const runs=[];for(const r of steps){const cur=tryR(r);if(cur)runs.push(cur)}
      let k=-1,best=.7;runs.forEach((x,i)=>{if(i>0){const q=x.n/runs[i-1].n;if(q<best){best=q;k=i}}}); // sharpest drop = room got cut off from neighbours
      if(k>0){while(k+1<runs.length&&runs[k+1].n<runs[k].n*.7)k++;res=runs[k]}else res=runs[0]}
    if(!ok(res)){toast("Uzavřenou místnost jsem tu nenašel. Zkuste „Dveře/mezery“ posunout doprava, zapnout náhled stěn, nebo ji nakreslete.");return}
    const[x0,y0,x1,y1]=bbox(res.reg,w,h);
    const pts=regionToPoly(i=>res.reg[i],w,h,res.r,x0,y0,x1,y1,D).map(p=>fwd(m,p[0],p[1]));
    if(pts.length<3){toast("Hranici se nepodařilo obkreslit, zkuste ruční kreslení.");return}
    ui.draft={pts};ui.lastDet={X,Y,r:res.r};ui.mode="detect";ui.sheet={kind:"draft"};render();
  }catch(e){toast("Detekce selhala: "+e.message)}
  finally{ui.busy="";render()}
}
function labelFree(wall,w,h){const lab=new Int32Array(w*h),st=new Int32Array(w*h),comps=[null];
  for(let i=0;i<w*h;i++){if(wall[i]||lab[i])continue;const id=comps.length;let sp=0,n=0,edge=false,x0=1e9,y0=1e9,x1=-1,y1=-1;lab[i]=id;st[sp++]=i;
    while(sp){const p=st[--sp];n++;const x=p%w,y=(p-x)/w;if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;if(x===0||y===0||x===w-1||y===h-1)edge=true;
      if(x>0&&!lab[p-1]&&!wall[p-1]){lab[p-1]=id;st[sp++]=p-1}if(x<w-1&&!lab[p+1]&&!wall[p+1]){lab[p+1]=id;st[sp++]=p+1}
      if(y>0&&!lab[p-w]&&!wall[p-w]){lab[p-w]=id;st[sp++]=p-w}if(y<h-1&&!lab[p+w]&&!wall[p+w]){lab[p+w]=id;st[sp++]=p+w}}
    comps.push({id,n,edge,x0,y0,x1,y1})}
  return{lab,comps}}
async function detectAll(){
  const fl=curFloor(),L=curLayer(),m=lm(L);ui.busy="Hledám místnosti…";render();await new Promise(r=>setTimeout(r,30));
  try{
    const P_=await layerPixels(L);const{w,h,D}=P_;const raw=wallMask(P_);const M=Math.max(w,h);
    const steps=[];if(ui.gap>0)steps.push(Math.max(1,Math.round(M*ui.gap/100)));else for(let pct=.25;pct<=3.51;pct+=.25)steps.push(Math.max(1,Math.round(M*pct/100)));
    let best=null;
    for(const r of steps){const wall=dilate(raw,w,h,r);const{lab,comps}=labelFree(wall,w,h);
      const valid=comps.filter(c=>c&&!c.edge&&c.n>=w*h*.0012&&c.n<=w*h*.3&&(c.x1-c.x0)>M*.012&&(c.y1-c.y0)>M*.012);
      const area=valid.reduce((a,c)=>a+c.n,0);const score=valid.length+area/(w*h); // most rooms, then most covered area
      if(!best||score>best.score)best={r,lab,valid,score};await new Promise(r=>setTimeout(r,0))}
    if(!best||!best.valid.length){toast("Žádné uzavřené místnosti jsem nenašel. Zkuste zapnout náhled stěn a upravit nastavení.");return}
    const existing=roomsOf(fl.id).filter(hasPoly);const unplaced=roomsOf(fl.id).filter(r=>!hasPoly(r));
    const cands=[];let n=0;
    for(const c of best.valid){const pts=regionToPoly(i=>best.lab[i]===c.id,w,h,best.r,c.x0,c.y0,c.x1,c.y1,D).map(p=>fwd(m,p[0],p[1]));
      if(pts.length<3)continue;const [cx,cy]=centroid(pts);if(existing.some(r=>inPoly(cx,cy,P(r.poly))))continue;
      cands.push({pts,name:"Místnost "+(roomsOf(fl.id).length+(++n)),on:true,bb:[c.x0/D,c.y0/D,c.x1/D,c.y1/D]})}
    if(!cands.length){toast("Všechny nalezené místnosti už máte uložené.");return}
    ui.cands=cands;ui.mode="cands";ui.sheet={kind:"cands"};ui.candHint=unplaced.length;toast(`Nalezeno ${cands.length} místností`);
  }catch(e){toast("Hledání selhalo: "+e.message)}
  finally{ui.busy="";render()}
}
function drawWalls(){
  const g=$("#walls");if(!g)return;
  if(!ui.showWalls||!det||ui.mode==="align"||det.id!==curLayer()?.id||!det.clean){g.innerHTML="";return}
  if(!det.wallUrl){const{w,h}=det;const c=document.createElement("canvas");c.width=w;c.height=h;const x=c.getContext("2d");const im=x.createImageData(w,h);
    for(let i=0;i<w*h;i++)if(det.clean[i]){im.data[4*i]=230;im.data[4*i+1]=40;im.data[4*i+2]=30;im.data[4*i+3]=200}
    x.putImageData(im,0,0);det.wallUrl=c.toDataURL()}
  const key=det.wallUrl.length+"|"+det.cleanKey;if(g.dataset.k===key)return;g.dataset.k=key;
  g.innerHTML=`<g transform="${mstr(lm(curLayer()))} scale(${1/det.D})"><image href="${det.wallUrl}" width="${det.w}" height="${det.h}"/></g>`;
}
async function refreshWalls(){if(!ui.showWalls){drawWalls();return}const L=curLayer();if(!L)return;try{const P_=await layerPixels(L);wallMask(P_);const g=$("#walls");if(g)g.dataset.k="";drawWalls()}catch(e){}}
/* AI: read room labels from crops of the drawing */
async function cropBlob(L,bb){
  const P_=await layerPixels(L);const bm=P_.bm;const k=bm.width/L.w;
  const pw=(bb[2]-bb[0])*.08,ph=(bb[3]-bb[1])*.08;const x0=Math.max(0,(bb[0]-pw)*k),y0=Math.max(0,(bb[1]-ph)*k),x1=Math.min(bm.width,(bb[2]+pw)*k),y1=Math.min(bm.height,(bb[3]+ph)*k);
  const sw=x1-x0,sh=y1-y0;const s=Math.min(1,700/Math.max(sw,sh));const c=document.createElement("canvas");c.width=Math.max(1,Math.round(sw*s));c.height=Math.max(1,Math.round(sh*s));
  const x=c.getContext("2d");x.fillStyle="#fff";x.fillRect(0,0,c.width,c.height);x.drawImage(bm,x0,y0,sw,sh,0,0,c.width,c.height);
  return await new Promise(r=>c.toBlob(r,"image/jpeg",.85));
}
function ptsBBoxLayer(pts){const m=lm(curLayer());const lp=pts.map(p=>inv(m,p[0],p[1]));const xs=lp.map(p=>p[0]),ys=lp.map(p=>p[1]);return[Math.min(...xs),Math.min(...ys),Math.max(...xs),Math.max(...ys)]}
async function aiNames(list){ // list of {pts}, returns names array
  const L=curLayer();let max=8;try{const lim=await CAP.sample.limits();if(lim.images?.maxCount)max=Math.max(1,lim.images.maxCount)}catch(e){}
  const unplaced=roomsOf(curFloor().id).filter(r=>!hasPoly(r)).map(r=>r.name);
  const out=[];
  for(let i=0;i<list.length;i+=max){const chunk=list.slice(i,i+max);ui.busy=`Čtu názvy ${i+1}–${i+chunk.length} z ${list.length}…`;render();
    const imgs=[];for(const c of chunk)imgs.push(await cropBlob(L,ptsBBoxLayer(c.pts)));
    const prompt=`Dostáváš ${chunk.length} výřez${chunk.length>1?"ů":""} z architektonického půdorysu, v tomto pořadí. Každý výřez zobrazuje jednu místnost (uprostřed). Přečti označení této místnosti – číslo a/nebo název, jak je napsané ve výkresu (např. "7.12 Kancelář" nebo "1.05 WC").
${unplaced.length?`Pokud odpovídá některé z těchto existujících místností, použij přesně její zápis: ${unplaced.slice(0,80).join("; ")}.`:""}
Vrať POUZE JSON pole ${chunk.length} řetězců ve stejném pořadí. Když není nic čitelné, dej prázdný řetězec. Nic si nevymýšlej.`;
    const r=await CAP.sample.json(prompt,{images:imgs});
    chunk.forEach((c,j)=>out.push(Array.isArray(r)?String(r[j]||"").trim():""))}
  return out;
}

/* ---------- sheets on the plan ---------- */
function renderSheet(){
  const w=$("#sheetWrap");if(!w)return;
  if(w.contains(document.activeElement)&&document.activeElement.tagName==="INPUT")return;
  const sh=ui.sheet;if(!sh){w.innerHTML="";return}
  let h="";const fl=curFloor();
  if(sh.kind==="draft"){
    const n=roomsOf(fl.id).length+1;const unplaced=roomsOf(fl.id).filter(r=>!hasPoly(r)).sort(byName);
    h=`<div class="sh-head"><div><div class="eyebrow">Nová místnost · ${ui.draft?.pts?.length||0} bodů</div><h2>Sedí hranice?</h2></div></div>
      <label class="fld"><span>Název nebo číslo místnosti</span><input id="roomName" list="unplacedList" value="${esc(ui.draftName||"Místnost "+n)}" autocomplete="off"></label>
      ${unplaced.length?`<datalist id="unplacedList">${unplaced.map(r=>`<option value="${esc(r.name)}">`).join("")}</datalist><div class="where">Tip: vyberte název ze seznamu místností – tvar se přiřadí k existující místnosti.</div>`:""}
      <div class="btns"><button class="btn primary" data-act="saveDraft">Uložit místnost</button>
        ${CAP.sample?`<button class="btn" data-act="aiDraftName" ${ui.busy?"disabled":""}>${ICON.ai} Přečíst název</button>`:""}
        <button class="btn" data-act="editDraft">Upravit body</button></div>
      ${ui.lastDet&&ui.mode==="detect"?`<div class="btns"><button class="btn sm" data-act="detMore">Vzalo to i sousední prostor</button><button class="btn sm" data-act="detLess">Je to jen kus místnosti</button></div>`:""}
      <div class="btns"><button class="btn sm" data-act="cancelDraft">Zahodit</button></div>`;
  }else if(sh.kind==="cands"){
    const on=ui.cands.filter(c=>c.on).length;
    h=`<div class="sh-head"><div><div class="eyebrow">Nalezeno ${ui.cands.length} místností</div><h2>Uložit ${on} vybraných?</h2></div></div>
      <p class="where" style="margin:0">Klepnutím na místnost v půdorysu ji vyřadíte. Tvary i názvy půjdou později upravit.${ui.candHint?` Názvy, které odpovídají místnostem ze seznamu (${ui.candHint}), se k nim přiřadí.`:""}</p>
      <div class="btns"><button class="btn primary" data-act="candsSave" ${on?"":"disabled"}>Uložit ${on}</button>
        ${CAP.sample?`<button class="btn" data-act="candsAi" ${ui.busy?"disabled":""}>${ui.busy?`<span class="spin"></span>${esc(ui.busy)}`:`${ICON.ai} Přečíst názvy z výkresu`}</button>`:""}
        <button class="btn" data-act="candsDrop">Zahodit</button></div>`;
  }else if(sh.kind==="room"){
    const rm=S.rooms[sh.id];if(!rm){ui.sheet=null;w.innerHTML="";return}
    const fs=filterSet();const all=itemsOf(rm.planId).filter(i=>i.roomId===rm.id);const its=all.filter(i=>itemVisible(i,fs));
    h=`<div class="sh-head"><div><div class="eyebrow">Místnost · ${all.length} ks technologie${its.length!==all.length?` · filtr ukazuje ${its.length}`:""}</div><h2>${esc(rm.name)}</h2></div>
        <button class="iconbtn" data-act="closeSheet" aria-label="Zavřít">${ICON.x}</button></div>
      <div class="btns"><button class="btn primary" data-act="addInRoom" data-id="${rm.id}">${ICON.cam} Přidat technologii</button>
        <button class="btn" data-act="roomOpen" data-id="${rm.id}">Detail</button>
        <button class="btn" data-act="editRoom">Upravit tvar</button></div>
      ${its.length?`<div class="items">${its.map(itemRow).join("")}</div>`:`<div class="empty">${all.length?"Filtr skrývá všechny technologie této místnosti.":"Zatím tu nic není. Přidejte první technologii a vyfoťte ji."}</div>`}`;
  }else if(sh.kind==="item"){
    const it=S.items[sh.id];if(!it){ui.sheet=null;w.innerHTML="";return}
    h=`<div class="sh-head"><div><div class="eyebrow">${esc(catPath(it.catId).join(" › ")||"Bez kategorie")}</div><h2>${esc(it.name||"Bez názvu")}</h2>
        <div class="where">${esc(whereText(it))} · <span class="code">${esc(it.tag)}</span></div></div>
        <button class="iconbtn" data-act="closeSheet" aria-label="Zavřít">${ICON.x}</button></div>
      ${(it.photos?.length||it.plates?.length)?`<div style="display:flex;gap:8px;overflow-x:auto">${[...(it.photos||[]),...(it.plates||[])].map(p=>`<img src="${esc(p.u)}" alt="" style="height:96px;border-radius:10px">`).join("")}</div>`:""}
      <div class="btns"><button class="btn primary" data-act="openItem" data-id="${it.id}">Detail a úpravy</button><button class="btn" data-act="copyItem" data-id="${it.id}">Kopírovat</button><button class="btn" data-act="moveItem">Přesunout</button></div>`;
  }else if(sh.kind==="filter"){
    const fsx=filterSet();const L=curLayer();
    const row=(id,name,d,color)=>`<label style="padding-left:${6+d*22}px"><input type="checkbox" data-fcat="${id}" ${!fsx||fsx.has(id)?"checked":""}><span class="dot" style="background:${color}"></span>${esc(name)}</label>`;
    const rows=[];const walk=(pid,d)=>kids(pid).forEach(c=>{rows.push(row(c.id,c.name,d,catColor(c.id)));walk(c.id,d+1)});walk("",0);
    rows.push(row("_none","Bez kategorie",0,"#7A8580"));
    h=`<div class="sh-head"><div><div class="eyebrow">Filtr technologií na půdorysu</div><h2>Co chcete vidět?</h2></div><button class="iconbtn" data-act="closeSheet" aria-label="Zavřít">${ICON.x}</button></div>
      <div class="btns"><button class="btn sm" data-act="fAll">Vše</button><button class="btn sm" data-act="fNone">Nic</button>
        ${L?`<button class="btn sm" data-act="fSaveLayer">${L.filter?"Aktualizovat":"Uložit jako"} výchozí pro „${esc(L.name)}“</button>${L.filter?`<button class="btn sm" data-act="fClearLayer">Zrušit výchozí</button>`:""}`:""}</div>
      <div class="where">Zaškrtnutím kategorie zobrazíte i všechny její podkategorie. ${L?.filter?`Vrstva „${esc(L.name)}“ má uložený výchozí filtr – použije se při každém přepnutí na ni.`:""}</div>
      <div class="ftree">${rows.join("")}</div>`;
  }
  w.innerHTML=`<div class="sheet"><div class="grab"></div><div class="in">${h}</div></div>`;
}
function itemRow(it){
  const ph=it.photos?.[0]?.u||it.plates?.[0]?.u;
  return `<button class="irow" data-act="openItem" data-id="${it.id}"><span class="thumb" style="${ph?`background-image:url('${esc(ph)}')`:""}">${ph?"":ICON.box}</span>
    <span class="t"><b>${esc(it.name||"Bez názvu")}</b><small><span class="dot" style="background:${catColor(it.catId)}"></span> ${esc(catPath(it.catId).slice(-1)[0]||"Bez kategorie")} · ${esc(whereText(it))}${it.x==null?" · neumístěno":""}</small></span>
    <span class="code">${esc(it.tag||"")}</span></button>`;
}

/* ---------- suggestions from already entered items ---------- */
function suggest(field,d,selfId){
  const cnt=new Map();
  Object.values(S.items).forEach(i=>{if(i.id===selfId)return;const v=String(i[field]||"").trim();if(!v)return;
    if(field==="model"&&d.maker&&String(i.maker||"").trim().toLowerCase()!==d.maker.trim().toLowerCase())return; // models of the chosen maker
    let w=1;if(d.catId&&i.catId===d.catId)w+=5; // same category first
    const k=v.toLowerCase();const e=cnt.get(k);if(e)e.w+=w;else cnt.set(k,{v,w})});
  return [...cnt.values()].sort((a,b)=>b.w-a.w||a.v.localeCompare(b.v,"cs")).slice(0,40).map(x=>x.v);
}
function datalists(d,selfId){return ["name","maker","model","params"].map(f=>`<datalist id="dl-${f}">${suggest(f,d,selfId).map(v=>`<option value="${esc(v)}">`).join("")}</datalist>`).join("")}
function refreshLists(){const f=ui.form,el=$("#dlists");if(f&&el)el.innerHTML=datalists(f.data,f.id)}
function autofillFrom(field){ // picked a known model/name -> offer the rest of the record
  const f=ui.form;if(!f)return;const d=f.data;const v=String(d[field]||"").trim().toLowerCase();if(!v)return;
  const src=Object.values(S.items).filter(i=>i.id!==f.id&&String(i[field]||"").trim().toLowerCase()===v).sort((a,b)=>String(b.created||"").localeCompare(String(a.created||"")))[0];
  if(!src)return;let n=0;const set=k=>{if(src[k]&&!String(d[k]||"").trim()){d[k]=src[k];n++}};
  ["maker","model","params"].forEach(set);/* name stays unique per piece (e.g. AHU-7), not copied */if(src.catId&&!d.catId&&S.cats[src.catId]){d.catId=src.catId;n++}
  if(n){renderForm();toast(`Doplnil jsem ${n} ${n===1?"údaj":n<5?"údaje":"údajů"} podle ${src.tag||"stejného zařízení"} – zkontrolujte.`)}
}

/* ---------- item form ---------- */
/* copying: shared parameters travel to the next piece, unique ones (serial, photos, tag, position) don't */
function incName(n){n=String(n||"");const m=n.match(/^(.*?)(\d+)(\D*)$/);if(!m)return n;const num=String(+m[2]+1).padStart(m[2].length,"0");return m[1]+num+m[3]}
function copyTpl(it){return{name:incName(it.name),catId:it.catId||"",maker:it.maker||"",model:it.model||"",params:it.params||"",year:it.year||""}}
function startCopy(srcId){
  const it=S.items[srcId]||ui.form?.data;if(!it)return;const tpl=copyTpl(it);const fl=S.floors[it.planId];
  ui.form=null;renderForm();ui.roomPanel=null;
  if(fl&&fl.w){ui.copy={tpl,from:it.name,quick:ui.copy?.quick||false};ui.tab="plan";ui.siteId=fl.siteId;ui.planId=fl.id;ui.mode="copy";ui.sheet=null;ui.draft=null;ui.cands=null;$("#main").dataset.view="";render();
    toast("Klepněte na půdorys, kam patří další kus.")}
  else openForm(null,{planId:it.planId,roomId:it.roomId,x:null,y:null,tpl});
}
function openForm(id,init){
  const base=id?clean(S.items[id]):{planId:init.planId,x:init.x??null,y:init.y??null,roomId:"",name:"",catId:ui.lastCat||"",maker:"",model:"",serial:"",year:"",params:"",note:"",photos:[],plates:[],tag:nextTag(),...(init.tpl||{})};
  if(!id){const rm=init.roomId?S.rooms[init.roomId]:roomAt(init.planId,init.x,init.y);base.roomId=rm?rm.id:""}
  ui.form={id,data:base,newCat:false,ai:""};renderForm();
}
function renderForm(){
  const f=ui.form;const old=$("#itemForm");if(!f){old?.remove();return}
  const d=f.data;const fl=S.floors[d.planId];const rooms=roomsOf(d.planId).sort(byName);
  const shot=(key,title,hint)=>`<div class="shot"><div class="eyebrow">${title}</div>
    <div class="imgs">${(d[key]||[]).map((p,i)=>`<div class="ph" style="background-image:url('${esc(p.u)}')"><button data-act="rmPhoto" data-k="${key}" data-i="${i}" aria-label="Odebrat fotku">×</button></div>`).join("")}</div>
    <label class="btn sm cap">${ICON.cam} ${hint}<input type="file" accept="image/*" capture="environment" data-shot="${key}"></label></div>`;
  const aiOk=!!CAP.sample&&(d.plates||[]).length;
  const html=`<div class="form" id="itemForm" role="dialog" aria-label="Technologie">
    <header><button class="iconbtn" data-act="closeForm" aria-label="Zavřít">${ICON.x}</button><h2>${f.id?esc(d.name||"Technologie"):ui.mode==="copy"?"Kopie technologie":"Nová technologie"}</h2><button class="btn primary sm" data-act="saveForm">Uložit</button></header>
    <div class="body"><div>
      <div class="where">${esc(S.sites[fl?.siteId]?.name||"")} › ${esc(fl?.name||"")} · <span class="code">${esc(d.tag)}</span>${d.x==null?" · zatím neumístěno na půdorysu":""}</div>
      <div class="shots">${shot("photos","Celkový pohled","Vyfotit")}${shot("plates","Výrobní štítek","Vyfotit štítek")}</div>
      ${aiOk?`<div class="aibox">${ICON.ai}<p>Údaje ze štítku umím přečíst a vyplnit za vás.</p><button class="btn sm primary" data-act="aiRead" ${f.ai?"disabled":""}>${f.ai?`<span class="spin"></span>Čtu…`:"Vyčíst"}</button></div>`:""}
      <label class="fld"><span>Název</span><input data-f="name" list="dl-name" autocomplete="off" value="${esc(d.name)}" placeholder="např. Hasicí přístroj CO2 5 kg"></label>
      <div class="fld"><span>Kategorie</span><div class="catrow"><select data-f="catId" aria-label="Kategorie">${catOptions(d.catId)}</select>${d.catId?`<button class="btn sm" data-act="clearCat" aria-label="Odebrat z kategorie" title="Odebrat z kategorie">✕</button>`:""}<button class="btn sm" data-act="toggleNewCat">+ Nová</button></div></div>
      ${f.newCat?`<div class="newcat"><label class="fld"><span>Název nové kategorie</span><input id="ncName" placeholder="např. PHP, Fancoil, Rozvaděč"></label>
        <label class="fld"><span>Nadřazená kategorie</span><select id="ncParent">${catOptions(d.catId).replace("— bez kategorie —","— žádná (hlavní kategorie) —")}</select></label>
        <div class="btns"><button class="btn sm primary" data-act="createCat">Vytvořit</button><button class="btn sm" data-act="toggleNewCat">Zrušit</button></div></div>`:""}
      <label class="fld"><span>Místnost</span><select data-f="roomId"><option value="">— bez místnosti —</option>${rooms.map(r=>`<option value="${r.id}" ${r.id===d.roomId?"selected":""}>${esc(r.name)}</option>`).join("")}</select></label>
      <div class="grid2">
        <label class="fld"><span>Výrobce</span><input data-f="maker" list="dl-maker" autocomplete="off" value="${esc(d.maker)}"></label>
        <label class="fld"><span>Typ / model</span><input data-f="model" list="dl-model" autocomplete="off" value="${esc(d.model)}"></label>
        <label class="fld"><span>Výrobní číslo</span><input data-f="serial" value="${esc(d.serial)}"></label>
        <label class="fld"><span>Rok výroby</span><input data-f="year" value="${esc(d.year)}" inputmode="numeric"></label>
      </div>
      <label class="fld"><span>Parametry</span><input data-f="params" list="dl-params" autocomplete="off" value="${esc(d.params)}" placeholder="výkon, napětí, náplň…"></label>
      <div id="dlists">${datalists(d,f.id)}</div>
      <label class="fld"><span>Kód štítku (QR / NFC)</span><input data-f="tag" value="${esc(d.tag)}" style="font-family:var(--f-mono)"></label>
      <label class="fld"><span>Poznámka</span><textarea data-f="note">${esc(d.note)}</textarea></label>
      <div class="btns">${f.id?`<button class="btn primary" data-act="copyItem" data-id="${f.id}">Kopírovat na další kus</button><button class="btn" data-act="showOnPlan">${d.x==null?"Umístit na půdorys":"Ukázat na půdorysu"}</button><button class="btn danger" data-act="delItem">Smazat technologii</button>`:""}</div>
    </div></div></div>`;
  const body=old?.querySelector(".body");const st=body?body.scrollTop:0;
  if(old)old.outerHTML=html;else document.body.insertAdjacentHTML("beforeend",html);
  const nb=$("#itemForm .body");if(nb)nb.scrollTop=st;
}
async function aiRead(){
  const f=ui.form;if(!f||!CAP.sample)return;f.ai="1";renderForm();
  try{
    const blobs=[];for(const p of f.data.plates.slice(-2))blobs.push(await blobOf(p.u));
    const catList=cats().map(c=>catPath(c.id).join(" > ")).join("; ");
    const prompt=`Na fotce je výrobní štítek technického zařízení v budově (facility management). Vyčti z něj údaje a vrať POUZE JSON objekt s klíči:
"nazev" (krátký český název zařízení, např. "Hasicí přístroj CO2 5 kg" nebo "Fancoil"), "vyrobce", "typ", "vyrobni_cislo", "rok_vyroby" (jen rok), "parametry" (stručně: výkon, napětí, proud, náplň, průtok…), "kategorie" (nejpřesnější cesta z tohoto seznamu, přesně jak je napsaná, nebo prázdný řetězec: ${catList||"(žádné)"}).
Co na štítku není, nech jako prázdný řetězec. Nic si nevymýšlej.`;
    const r=await CAP.sample.json(prompt,{images:blobs});
    const d=f.data;const set=(k,v)=>{if(v&&!String(d[k]||"").trim())d[k]=String(v).trim()};
    set("name",r.nazev);set("maker",r.vyrobce);set("model",r.typ);set("serial",r.vyrobni_cislo);set("year",r.rok_vyroby);set("params",r.parametry);
    if(r.kategorie&&!d.catId){const hit=cats().find(c=>catPath(c.id).join(" > ").toLowerCase()===String(r.kategorie).toLowerCase());if(hit)d.catId=hit.id}
    toast("Vyplněno ze štítku – zkontrolujte údaje.");
  }catch(e){toast(e.code==="not_granted"?"Čtení štítku nebylo povoleno.":"Štítek se nepodařilo přečíst: "+(e.message||e.code))}
  finally{if(ui.form){ui.form.ai="";renderForm()}}
}
function saveForm(){
  const f=ui.form;const d=f.data;
  if(!d.name.trim())d.name=catPath(d.catId).slice(-1)[0]||"Technologie";
  if(d.x!=null){const rm=roomAt(d.planId,d.x,d.y);const curR=S.rooms[d.roomId];if(rm&&!(curR&&hasPoly(curR)&&inPoly(d.x,d.y,P(curR.poly)))&&!f.roomTouched)d.roomId=rm.id}
  const id=f.id||uid();const {id:_,...data}=d;if(!f.id)data.created=new Date().toISOString();
  ui.lastCat=d.catId;put("items",id,data);ui.form=null;renderForm();
  if(ui.mode==="copy"&&ui.copy&&!f.id){ui.copy.tpl=copyTpl(data);ui.sel={type:"item",id};toast(`Přidáno: ${data.name} · klepněte na další kus, nebo Hotovo`);render();return}
  if(ui.tab==="plan"&&d.x!=null){ui.sel={type:"item",id};if(ui.mode==="place")ui.mode="view";ui.sheet=d.roomId?{kind:"room",id:d.roomId}:{kind:"item",id}}
  toast(f.id?"Uloženo":`Přidáno: ${data.name}`);render();
}

/* ---------- objects / floors / layers panel ---------- */
function renderSites(){
  const old=$("#sitesPanel");if(!ui.sitesOpen){old?.remove();return}
  if(old&&old.contains(document.activeElement)&&["INPUT","TEXTAREA"].includes(document.activeElement.tagName))return;
  const ren=(col,id,val)=>ui.ren&&ui.ren.col===col&&ui.ren.id===id?`<span class="inl" style="flex:1 1 100%"><input id="renInput" value="${esc(val)}"><button class="btn xs primary" data-act="renSave">Uložit</button><button class="btn xs" data-act="renCancel">Zrušit</button></span>`:null;
  const busy=ui.busy?`<span class="btn xs" aria-disabled="true"><span class="spin"></span>${esc(ui.busy)}</span>`:"";
  const siteHtml=s=>{const fls=floorsOf(s.id);const cur=s.id===ui.siteId;
    return `<div class="site" data-cur="${cur}"><div class="sh">${ren("sites",s.id,s.name)||`<b>${esc(s.name)}</b>${cur?"":`<button class="btn xs primary" data-act="siteOpen" data-id="${s.id}">Otevřít</button>`}<button class="btn xs" data-act="ren" data-col="sites" data-id="${s.id}">Přejmenovat</button><button class="btn xs danger" data-act="siteDel" data-id="${s.id}">Smazat</button>`}</div>
      ${fls.map(f=>{const ls=layersOf(f.id);const nr=roomsOf(f.id).length,ni=itemsOf(f.id).length;
        return `<div class="floor"><div class="fh">${ren("floors",f.id,f.name)||`<b>${esc(f.name)}</b><span class="where">${nr} místn. · ${ni} ks</span>`}</div>
          ${ren("floors",f.id,f.name)?"":`<div class="btns"><button class="btn xs" data-act="floorOpen" data-id="${f.id}">Otevřít</button><button class="btn xs" data-act="ren" data-col="floors" data-id="${f.id}">Přejmenovat</button><button class="btn xs" data-act="floorUp" data-id="${f.id}" aria-label="Posunout výš">↑</button><button class="btn xs" data-act="floorDown" data-id="${f.id}" aria-label="Posunout níž">↓</button><button class="btn xs danger" data-act="floorDel" data-id="${f.id}">Smazat patro</button></div>`}
          <div class="layers">${ls.map((l,i)=>ui.ren&&ui.ren.col==="layers"&&ui.ren.id===l.id?ren("layers",l.id,l.name):`<span class="lay">${esc(l.name)}${i===0?` <em>podklad</em>`:""}
            <button data-act="ren" data-col="layers" data-id="${l.id}" aria-label="Přejmenovat vrstvu">✎</button>${i>0?`<button data-act="realign" data-id="${l.id}" aria-label="Zarovnat znovu" style="font-weight:600">zarovnat</button>`:""}<button data-act="layerDel" data-id="${l.id}" aria-label="Smazat vrstvu">✕</button></span>`).join("")}
            ${busy||planBtn(ls.length?"+ Vrstva (výkres profese)":"+ Výkres patra","btn xs",`data-newlayer="${f.id}"`)}</div></div>`}).join("")}
      <div class="floor">${ui.addFloor===s.id?`<div class="inl"><input id="newFloorName" placeholder="Název patra, např. 1. PP" autocomplete="off"><button class="btn xs primary" data-act="floorCreate" data-id="${s.id}">Přidat bez výkresu</button><button class="btn xs" data-act="floorAddCancel">Zrušit</button></div>`:
        `<div class="btns">${busy||planBtn("+ Patra z výkresu (PDF)","btn sm primary",`data-newfloor="${s.id}"`)}<button class="btn sm" data-act="floorAdd" data-id="${s.id}">+ Patro bez výkresu</button></div>`}</div>
    </div>`};
  const html=`<div class="form" id="sitesPanel" role="dialog" aria-label="Objekty">
    <header><button class="iconbtn" data-act="sitesClose" aria-label="Zavřít">${ICON.x}</button><h2>Objekty a výkresy</h2></header>
    <div class="body"><div>
      <p class="where" style="margin:0">Objekt › patro › vrstvy. První výkres patra je podklad; každý další (VZT, elektro…) zarovnáte na podklad podle dvou společných bodů, aby technologie seděly přes všechny vrstvy.</p>
      ${!live&&ui.demo?`<p class="where" style="margin:0">Teď vidíte ukázková data – v tomto náhledu se nic neukládá.</p>`:""}
      ${sites().map(siteHtml).join("")||`<div class="empty">Zatím žádný objekt.</div>`}
      <div class="inl"><input id="newSiteName" placeholder="Název nového objektu" autocomplete="off"><button class="btn sm primary" data-act="siteCreate">+ Přidat objekt</button></div>
      <button class="btn" data-act="demoSite">Přidat ukázkový objekt na zkoušku</button>
    </div></div></div>`;
  const st=old?.querySelector(".body")?.scrollTop||0;
  if(old)old.outerHTML=html;else document.body.insertAdjacentHTML("beforeend",html);
  const nb=$("#sitesPanel .body");if(nb)nb.scrollTop=st;
}
async function deleteFloor(id){
  itemsOf(id).forEach(i=>del("items",i.id));roomsOf(id).forEach(r=>del("rooms",r.id));
  for(const l of layersOf(id)){del("layers",l.id);if(l.img?.a&&CAP.assets){try{await CAP.assets.delete(l.img.a)}catch(e){}}}
  del("floors",id);if(ui.planId===id){ui.planId=null;det=null}
}
async function importFloors(siteId,file){
  try{const sheets=await fileToSheets(file);let first=null;const ord=floorsOf(siteId).length;
    for(let i=0;i<sheets.length;i++){const sh=sheets[i];ui.busy=`Ukládám ${i+1}/${sheets.length}…`;render();
      const img=await storeImage(sh.blob);const fid=uid();put("floors",fid,{siteId,name:sh.name,w:sh.w,h:sh.h,order:ord+i+1});
      put("layers",uid(),{floorId:fid,name:"Stavební",img,w:sh.w,h:sh.h,m:[1,0,0,0],order:1});if(!first)first=fid}
    if(sheets[0]?.pages>12)toast("Načetl jsem prvních 12 stránek.");
    ui.siteId=siteId;ui.planId=first;ui.sitesOpen=false;ui.tab="plan";ui.needFit=true;ui.mode="all";ui.sheet=null;det=null;
    toast(sheets.length>1?`Přidáno ${sheets.length} pater – přejmenujte je v Objektech.`:"Patro přidáno. Zkuste „Najít všechny“ místnosti.");
  }catch(e){toast("Výkres se nepodařilo nahrát: "+(e.message||e.code))}
  finally{ui.busy="";render()}
}
async function importLayer(floorId,file){
  try{const sheets=await fileToSheets(file,1);const sh=sheets[0];if(sh.pages>1)toast("PDF má víc stran – jako vrstvu beru první stranu.");
    ui.busy="Ukládám výkres…";render();const img=await storeImage(sh.blob);const fl=S.floors[floorId];const ls=layersOf(floorId);
    const id=uid();const guess=/vzt|vzduchotech/i.test(file.name)?"VZT":/ele|silno|slabo/i.test(file.name)?"Elektro":/zti|kanal|vodo/i.test(file.name)?"ZTI":/ut|vytáp|vytap/i.test(file.name)?"ÚT":/eps|pbř|pbr|pozar|požár/i.test(file.name)?"PBŘ":sh.name;
    if(!fl.w||!ls.length){patch("floors",floorId,{w:sh.w,h:sh.h});put("layers",id,{floorId,name:ls.length?guess:"Stavební",img,w:sh.w,h:sh.h,m:[1,0,0,0],order:1});
      ui.planId=floorId;ui.layerOf[floorId]=id;ui.sitesOpen=false;ui.tab="plan";ui.needFit=true;ui.mode="view";det=null;toast("Výkres patra nahrán.");return}
    const s0=fl.w/sh.w;put("layers",id,{floorId,name:guess,img,w:sh.w,h:sh.h,m:[s0,0,0,0],order:(ls[ls.length-1]?.order||1)+1});
    ui.planId=floorId;ui.sitesOpen=false;ui.tab="plan";startAlign(id);
  }catch(e){toast("Výkres se nepodařilo nahrát: "+(e.message||e.code))}
  finally{ui.busy="";render()}
}
function startAlign(layerId){const L=S.layers[layerId],fl=S.floors[L.floorId];ui.planId=fl.id;
  ui.align={layerId,step:0,q:[],p:[],s0:fl.w/L.w,m:null,op:.5};ui.mode="align";ui.sheet=null;ui.draft=null;ui.cands=null;ui.needFit=true;ui.imgKey="";render()}

/* ---------- rooms tab ---------- */
function renderRooms(main){
  if(main.contains(document.activeElement)&&["INPUT","TEXTAREA"].includes(document.activeElement.tagName)&&document.activeElement.id!=="rq")return;
  const site=curSite();
  if(!site){main.innerHTML=`<div class="page"><div class="page-in"><h1>Nejdřív založte objekt</h1><button class="btn primary" data-act="sitesOpen">Objekty</button></div></div>`;return}
  const fls=floorsOf(site.id);const q=(ui.roomQ||"").toLowerCase();
  const b=ui.bulk;
  const bulkHtml=b?`<div class="box"><div class="r" style="flex-direction:column;align-items:stretch;gap:10px">
      <label class="fld"><span>Patro</span><select id="bulkFloor">${fls.map(f=>`<option value="${f.id}" ${f.id===(b.floorId||ui.planId)?"selected":""}>${esc(f.name)}</option>`).join("")}</select></label>
      <label class="fld"><span>Místnosti – každá na nový řádek (lze vložit sloupec z Excelu)</span><textarea class="bulk" id="bulkText" placeholder="7.01 Kancelář&#10;7.02 Kancelář&#10;7.03 Zasedací místnost">${esc(b.text||"")}</textarea></label>
      <div class="btns"><button class="btn primary" data-act="bulkSave">Přidat místnosti</button><button class="btn" data-act="bulkCancel">Zrušit</button></div></div></div>`:"";
  const sections=fls.map(f=>{const rs=roomsOf(f.id).filter(r=>!q||r.name.toLowerCase().includes(q)).sort(byName);if(q&&!rs.length)return "";
    const cnt=id=>itemsOf(f.id).filter(i=>i.roomId===id).length;const noShape=rs.filter(r=>!hasPoly(r)).length;
    return `<div class="fhead"><h2>${esc(f.name)}</h2><span class="where">${rs.length} místností${noShape?` · ${noShape} bez tvaru`:""}</span></div>
      ${rs.length?`<div class="box">${rs.map(r=>`<button class="rrow" data-act="roomOpen" data-id="${r.id}"><b>${esc(r.name)}</b><span class="where">${cnt(r.id)} ks</span>${hasPoly(r)?ICON.shapeY:ICON.shapeN}</button>`).join("")}</div>`:`<div class="empty">Žádné místnosti. Přidejte je seznamem nebo je najděte na půdorysu.</div>`}`}).join("");
  const sc=main.querySelector(".page")?.scrollTop||0;
  main.innerHTML=`<div class="page"><div class="page-in">${banner()?`<span class="banner">${banner()}</span>`:""}
    <div><div class="eyebrow">${esc(site.name)}</div><h1>Seznam místností</h1></div>
    <div class="btns">${b?"":`<button class="btn primary" data-act="bulkOpen">+ Přidat místnosti</button>`}<button class="btn" data-act="exportRooms">${ICON.dl} Export CSV</button></div>
    ${bulkHtml}
    <input id="rq" class="search" type="search" placeholder="Hledat místnost…" value="${esc(ui.roomQ||"")}">
    ${fls.length?sections||`<div class="empty">Nic nenalezeno.</div>`:`<div class="empty">Objekt nemá žádné patro. Přidejte ho v Objektech.</div>`}
    <p class="where" style="margin:0">Plný symbol = místnost má tvar na půdorysu, čárkovaný = jen v seznamu. Tvar doplníte v detailu místnosti.</p>
  </div></div>`;
  const pg=main.querySelector(".page");if(pg)pg.scrollTop=sc;
  if(document.activeElement?.id!=="rq"&&ui.roomQFocus){const i=$("#rq");i.focus();i.setSelectionRange(i.value.length,i.value.length)}
}
function renderRoomPanel(){
  const old=$("#roomPanel");const id=ui.roomPanel;const rm=S.rooms[id];if(!id||!rm){old?.remove();if(id&&!rm)ui.roomPanel=null;return}
  if(old&&old.contains(document.activeElement)&&document.activeElement.tagName==="INPUT")return;
  const fl=S.floors[rm.planId];const its=itemsOf(rm.planId).filter(i=>i.roomId===rm.id);
  const html=`<div class="form" id="roomPanel" role="dialog" aria-label="Místnost">
    <header><button class="iconbtn" data-act="roomClose" aria-label="Zavřít">${ICON.x}</button><h2>${esc(rm.name)}</h2></header>
    <div class="body"><div>
      <div class="where">${esc(S.sites[fl?.siteId]?.name||"")} › ${esc(fl?.name||"")} · ${hasPoly(rm)?"má tvar na půdorysu":"zatím bez tvaru na půdorysu"}</div>
      <label class="fld"><span>Název místnosti</span><input id="roomRename" value="${esc(rm.name)}"></label>
      <label class="fld"><span>Poznámka (účel, nájemce, plocha…)</span><input id="roomNote" value="${esc(rm.note||"")}"></label>
      <div class="btns"><button class="btn primary" data-act="addInRoom" data-id="${rm.id}">${ICON.cam} Přidat technologii</button>
        ${fl?.w?`<button class="btn" data-act="roomDraw" data-id="${rm.id}">${hasPoly(rm)?"Upravit tvar na půdorysu":"Nakreslit na půdorys"}</button>${hasPoly(rm)?`<button class="btn" data-act="roomShow" data-id="${rm.id}">Ukázat na půdorysu</button>`:`<button class="btn" data-act="roomDetect" data-id="${rm.id}">Najít na půdorysu</button>`}`:""}</div>
      <div class="fhead"><h2>Technologie</h2><span class="where">${its.length} ks</span></div>
      ${its.length?`<div class="items">${its.map(itemRow).join("")}</div>`:`<div class="empty">Zatím žádná technologie.</div>`}
      <div class="btns"><button class="btn danger" data-act="roomDel" data-id="${rm.id}">Smazat místnost</button></div>
    </div></div></div>`;
  if(old)old.outerHTML=html;else document.body.insertAdjacentHTML("beforeend",html);
}

/* ---------- list tab ---------- */
function matches(it,q){if(!q)return true;q=q.toLowerCase();return [it.name,it.maker,it.model,it.serial,it.tag,it.params,it.note,whereText(it),catPath(it.catId).join(" ")].join(" ").toLowerCase().includes(q)}
function renderList(main){
  if(!main.dataset.built){main.dataset.built="1";
    main.innerHTML=`<div class="page"><div class="page-in">${banner()?`<span class="banner">${banner()}</span>`:""}
      <div><div class="eyebrow" id="listSite"></div><h1>Co v objektu máme</h1></div>
      <div id="stats"></div>
      <input id="q" class="search" type="search" placeholder="Hledat název, výrobní číslo, místnost, kód…" value="${esc(ui.search)}">
      <div id="tree" class="tree"></div>
      <section class="block"><div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap"><h2 style="flex:1">Kategorie</h2><button class="btn sm" data-act="exportCsv">${ICON.dl} Export technologií CSV</button></div><div id="catman"></div></section>
    </div></div>`}
  $("#listSite").textContent=curSite()?.name||"";
  const all=siteItems();const vis=all.filter(i=>matches(i,ui.search));
  const noPlate=all.filter(i=>!(i.plates||[]).length).length;
  $("#stats").innerHTML=`<div class="stats"><div class="stat"><b>${all.length}</b><span>kusů technologie</span></div><div class="stat"><b>${siteRooms().length}</b><span>místností</span></div><div class="stat"><b>${all.filter(i=>i.x==null).length}</b><span>neumístěno na půdorysu</span></div><div class="stat ${noPlate?"warn":""}"><b>${noPlate}</b><span>bez fotky štítku</span></div></div>`;
  const q=!!ui.search;
  const node=c=>{const ids=new Set(descIds(c.id));const its=vis.filter(i=>ids.has(i.catId));if(!its.length&&(q||!all.some(i=>ids.has(i.catId))))return "";
    const open=q||ui.open[c.id];const own=its.filter(i=>i.catId===c.id);
    return `<div class="cat"><button class="cat-h" data-act="toggleCat" data-id="${c.id}" aria-expanded="${!!open}">${ICON.chev}<span class="dot" style="background:${catColor(c.id)}"></span><span class="nm">${esc(c.name)}</span><span class="cnt">${its.length}</span></button>
      ${open?`<div class="cat-b">${kids(c.id).map(node).join("")}${own.length?`<div class="items">${own.map(itemRow).join("")}</div>`:""}</div>`:""}</div>`};
  const unc=vis.filter(i=>!S.cats[i.catId]);
  let tree=kids("").map(node).join("");
  if(unc.length)tree+=`<div class="cat"><button class="cat-h" data-act="toggleCat" data-id="_none" aria-expanded="${!!(q||ui.open._none)}">${ICON.chev}<span class="dot" style="background:#7A8580"></span><span class="nm">Bez kategorie</span><span class="cnt">${unc.length}</span></button>${q||ui.open._none?`<div class="cat-b"><div class="items">${unc.map(itemRow).join("")}</div></div>`:""}</div>`;
  $("#tree").innerHTML=tree||`<div class="empty">${q?"Nic nenalezeno.":"Zatím žádná technologie. Na půdorysu klepněte do místnosti a přidejte první kus."}</div>`;
  const cm=$("#catman");if(cm.contains(document.activeElement))return;
  const rows=[];const walk=(pid,d)=>kids(pid).forEach(c=>{const used=Object.values(S.items).some(i=>i.catId===c.id)||kids(c.id).length;
    rows.push(ui.editCat===c.id?`<div class="r" style="padding-left:${10+d*18}px"><input id="ecName" value="${esc(c.name)}"><button class="btn sm primary" data-act="catSave" data-id="${c.id}">Uložit</button></div>`:
      `<div class="r" style="padding-left:${10+d*18}px"><span class="dot" style="background:${catColor(c.id)}"></span><span>${esc(c.name)}</span><button class="btn xs" data-act="catEdit" data-id="${c.id}" aria-label="Přejmenovat" title="Přejmenovat">✎</button><button class="btn xs" data-act="catSub" data-id="${c.id}" title="Přidat podkategorii">+ Pod</button><button class="btn xs danger" data-act="catDel" data-id="${c.id}" aria-label="Smazat" title="Smazat">✕</button></div>`);
    if(ui.catDelFor===c.id){const ids=new Set(descIds(c.id));const ni=Object.values(S.items).filter(i=>i.catId===c.id).length,nk=kids(c.id).length;
      const opts=['<option value="">Bez kategorie</option>'];const w2=(pid,dd)=>kids(pid).forEach(k=>{if(ids.has(k.id))return;opts.push(`<option value="${k.id}" ${k.id===c.parentId?"selected":""}>${"\u00A0\u00A0\u00A0".repeat(dd)}${esc(k.name)}</option>`);w2(k.id,dd+1)});w2("",0);
      rows.push(`<div class="r" style="padding-left:${10+d*18}px;background:var(--sunk);flex-direction:column;align-items:stretch">
        <span style="flex:none">Kategorie <b>${esc(c.name)}</b> obsahuje ${ni?`${ni} ${ni===1?"technologii":ni<5?"technologie":"technologií"}`:""}${ni&&nk?" a ":""}${nk?`${nk} ${nk===1?"podkategorii":nk<5?"podkategorie":"podkategorií"}`:""}. Kam je přesunout?</span>
        <select id="catMoveTo" class="search">${opts.join("")}</select>
        <span class="btns" style="flex:none"><button class="btn sm danger armed" data-act="catDelMove" data-id="${c.id}">Přesunout a smazat</button><button class="btn sm" data-act="catDelCancel">Zrušit</button></span></div>`)}
    walk(c.id,d+1)});
  walk("",0);
  cm.innerHTML=`<div class="box">${rows.join("")||`<div class="r"><span>Žádné kategorie.</span><button class="btn sm primary" data-act="seedCats">Vložit základní (PBZ, VZT, Elektro…)</button></div>`}
    <div class="r">${ui.subOf!==undefined?`<input id="ncList" placeholder="${ui.subOf?`Podkategorie pro ${esc(S.cats[ui.subOf]?.name)}`:"Nová hlavní kategorie"}"><button class="btn sm primary" data-act="catAdd">Přidat</button>`:`<button class="btn sm" data-act="catNewRoot">+ Hlavní kategorie</button>`}</div></div>`;
}

/* ---------- labels tab ---------- */
function qrSvg(text){try{const q=qrcode(0,"M");q.addData(text);q.make();return q.createSvgTag({cellSize:4,margin:0,scalable:true})}catch(e){return ""}}
function labelItems(){const ids=ui.labelCat?new Set(descIds(ui.labelCat)):null;return siteItems().filter(i=>!ids||ids.has(i.catId)).sort((a,b)=>String(a.tag).localeCompare(String(b.tag)))}
function renderLabels(main){
  const its=labelItems();const sc=main.querySelector(".page")?.scrollTop||0;
  main.innerHTML=`<div class="page"><div class="page-in">${banner()?`<span class="banner">${banner()}</span>`:""}
    <div><div class="eyebrow">QR štítky · ${esc(curSite()?.name||"")}</div><h1>Štítky k nalepení</h1></div>
    <p style="margin:0;color:var(--muted)">Každý štítek nese kód technologie. Po nalepení stačí klepnout na skenování a vyfotit ho – otevře se karta zařízení.</p>
    <select class="search" id="labelCat" aria-label="Filtr kategorie">${catOptions(ui.labelCat).replace("— bez kategorie —","Všechny kategorie")}</select>
    <div class="btns"><button class="btn primary" data-act="dlLabels" ${its.length?"":"disabled"}>${ICON.dl} Stáhnout k tisku</button>${scanBtn("Skenovat štítek")}</div>
    <div class="labels">${its.map(i=>`<button class="lab" data-act="openItem" data-id="${i.id}">${qrSvg(i.tag)}<span><b>${esc(i.tag)}</b><small>${esc(i.name)}<br>${esc(whereText(i))}</small></span></button>`).join("")||`<div class="empty">Žádná technologie v této kategorii.</div>`}</div>
  </div></div>`;
  const pg=main.querySelector(".page");if(pg)pg.scrollTop=sc;
}
function labelsHtml(its){
  return `<!doctype html><html lang="cs"><head><meta charset="utf-8"><title>Štítky technologií</title><style>
  @page{size:A4;margin:10mm}body{font-family:Arial,sans-serif;margin:0}.g{display:grid;grid-template-columns:repeat(3,60mm);gap:4mm}
  .l{border:0.3mm dashed #999;height:30mm;padding:2.5mm;display:grid;grid-template-columns:25mm 1fr;gap:2mm;align-items:center;break-inside:avoid}
  .l svg{width:25mm;height:25mm}b{font-family:monospace;font-size:11pt}small{display:block;font-size:7.5pt;line-height:1.2;margin-top:1mm}</style></head><body><div class="g">
  ${its.map(i=>`<div class="l">${qrSvg(i.tag)}<div><b>${esc(i.tag)}</b><small>${esc(i.name)}<br>${esc(whereText(i))}</small></div></div>`).join("")}</div></body></html>`;
}
async function saveFile(name,data,mime){
  if(!CAP.downloads){toast("Stahování funguje v publikované aplikaci (v tomto náhledu ne).");return}
  try{await CAP.downloads.save({filename:name,data:new Blob([data],{type:mime})});}catch(e){if(e.code!=="declined")toast("Soubor se nepodařilo uložit: "+(e.message||e.code))}
}
const csvq=v=>`"${String(v??"").replace(/"/g,'""')}"`;
function csvItems(){
  const head=["Kód","Název","Kategorie","Objekt","Patro","Místnost","Výrobce","Typ","Výrobní číslo","Rok výroby","Parametry","Poznámka","Foto","Štítek foto"];
  const rows=siteItems().sort((a,b)=>String(a.tag).localeCompare(String(b.tag))).map(i=>{const f=S.floors[i.planId];return [i.tag,i.name,catPath(i.catId).join(" > "),S.sites[f?.siteId]?.name,f?.name,S.rooms[i.roomId]?.name,i.maker,i.model,i.serial,i.year,i.params,i.note,(i.photos||[]).map(p=>p.u).join(" "),(i.plates||[]).map(p=>p.u).join(" ")].map(csvq).join(";")});
  return "﻿"+[head.map(csvq).join(";"),...rows].join("\r\n");
}
function csvRooms(){
  const head=["Objekt","Patro","Místnost","Poznámka","Počet technologií","Tvar na půdorysu"];
  const rows=[];floorsOf(ui.siteId).forEach(f=>roomsOf(f.id).sort(byName).forEach(r=>rows.push([curSite()?.name,f.name,r.name,r.note,itemsOf(f.id).filter(i=>i.roomId===r.id).length,hasPoly(r)?"ano":"ne"].map(csvq).join(";"))));
  return "﻿"+[head.map(csvq).join(";"),...rows].join("\r\n");
}

/* ---------- scan ---------- */
async function scanFile(file){
  try{
    if(!window.jsQR)await loadScript(JSQR);
    const bm=await toBitmap(file);const k=Math.min(1,1400/Math.max(bm.width,bm.height));const c=document.createElement("canvas");c.width=Math.round(bm.width*k);c.height=Math.round(bm.height*k);
    const x=c.getContext("2d",{willReadFrequently:true});x.drawImage(bm,0,0,c.width,c.height);const d=x.getImageData(0,0,c.width,c.height);
    const r=jsQR(d.data,c.width,c.height,{inversionAttempts:"attemptBoth"});
    if(!r){toast("QR kód jsem na fotce nenašel. Zkuste to blíž a ostřeji.");return}
    const code=r.data.trim();const it=Object.values(S.items).find(i=>String(i.tag).trim()===code||code.endsWith(String(i.tag)));
    if(!it){toast(`Kód ${code} v pasportu není.`);return}
    const f=S.floors[it.planId];if(f){ui.siteId=f.siteId}openForm(it.id);
  }catch(e){toast("Skenování selhalo: "+e.message)}
}

/* ---------- actions ---------- */
function confirmBtn(el,fn){if(el.classList.contains("armed")){fn()}else{el.classList.add("armed");const t=el.textContent;el.textContent="Opravdu smazat?";setTimeout(()=>{if(el.isConnected){el.classList.remove("armed");el.textContent=t}},3500)}}
function goPlanRoom(rm,then){ui.roomPanel=null;ui.tab="plan";ui.siteId=S.floors[rm.planId].siteId;ui.planId=rm.planId;ui.mode="view";ui.cands=null;ui.draft=null;ui.sheet=null;$("#main").dataset.view="";then&&then();render()}
function centerOn(x,y){requestAnimationFrame(()=>requestAnimationFrame(()=>{const vp=$("#vp");if(!vp)return;fit();const s=Math.max(ui.cam.s,1.4);ui.cam={s,x:vp.clientWidth/2-x*s,y:vp.clientHeight*.38-y*s};drawOverlay()}))}
function newSite(name){name=(name||"").trim()||"Můj objekt";const id=uid();put("sites",id,{name,order:sites().length+1});ui.siteId=id;ui.planId=null;return id}
async function demoToStore(){
  ui.busy="Připravuji ukázkový objekt…";render();
  try{const sid=newSite("Ukázkový objekt");const fid=uid();
    const b1=await new Promise(r=>drawDemoPlan().toBlob(r,"image/png"));const v=drawDemoVzt();const b2=await new Promise(r=>v.c.toBlob(r,"image/png"));
    const i1=await storeImage(b1),i2=await storeImage(b2);
    put("floors",fid,{siteId:sid,name:"7. NP",w:1600,h:1000,order:7});
    put("layers",uid(),{floorId:fid,name:"Stavební",img:i1,w:1600,h:1000,m:[1,0,0,0],order:1});
    const l2=uid();put("layers",l2,{floorId:fid,name:"VZT",img:i2,w:1400,h:900,m:[1600/1400,0,0,0],order:2});
    if(!kids("").length)seedCats();
    ui.planId=fid;ui.sitesOpen=false;ui.tab="plan";ui.needFit=true;det=null;$("#main").dataset.view="";
    startAlign(l2);toast("Ukázka: nejdřív si vyzkoušejte zarovnání vrstvy VZT na stavební výkres.");
  }catch(e){toast("Nepodařilo se: "+(e.message||e.code))}finally{ui.busy="";render()}
}
const ACT={
  tab:a=>{ui.tab=a.dataset.tab;ui.form=null;renderForm();if(ui.mode==="align")ui.mode="view";render()},
  sitesOpen:()=>{ui.sitesOpen=true;ui.ren=null;renderSites()},
  sitesClose:()=>{ui.sitesOpen=false;renderSites()},
  siteOpen:a=>{ui.siteId=a.dataset.id;ui.planId=null;ui.sitesOpen=false;ui.needFit=true;det=null;$("#main").dataset.view="";render()},
  siteCreate:()=>{const v=$("#newSiteName")?.value;newSite(v);ui.addFloor=ui.siteId;document.activeElement?.blur();render();toast("Objekt založen – přidejte patra.")},
  wCreate:()=>{newSite($("#wSite")?.value);if(!kids("").length)seedCats();ui.sitesOpen=true;document.activeElement?.blur();render()},
  siteDel:a=>confirmBtn(a,async()=>{const id=a.dataset.id;for(const f of floorsOf(id))await deleteFloor(f.id);del("sites",id);if(ui.siteId===id){ui.siteId=null;ui.planId=null}render()}),
  ren:a=>{ui.ren={col:a.dataset.col,id:a.dataset.id};$("#sitesPanel")?.remove();renderSites();setTimeout(()=>$("#renInput")?.focus(),40)},
  renSave:()=>{const v=($("#renInput")?.value||"").trim();if(v&&ui.ren)patch(ui.ren.col,ui.ren.id,{name:v});ui.ren=null;document.activeElement?.blur();render()},
  renCancel:()=>{ui.ren=null;document.activeElement?.blur();renderSites()},
  floorOpen:a=>{const f=S.floors[a.dataset.id];ui.siteId=f.siteId;ui.planId=f.id;ui.sitesOpen=false;ui.tab="plan";ui.mode="view";ui.sheet=null;ui.needFit=true;det=null;$("#main").dataset.view="";render()},
  floorUp:a=>moveFloor(a.dataset.id,-1),floorDown:a=>moveFloor(a.dataset.id,1),
  floorDel:a=>confirmBtn(a,async()=>{await deleteFloor(a.dataset.id);render()}),
  floorAdd:a=>{ui.addFloor=a.dataset.id;$("#sitesPanel")?.remove();renderSites();setTimeout(()=>$("#newFloorName")?.focus(),40)},
  floorAddCancel:()=>{ui.addFloor=null;document.activeElement?.blur();renderSites()},
  floorCreate:a=>{const v=($("#newFloorName")?.value||"").trim()||"Nové patro";const id=uid();put("floors",id,{siteId:a.dataset.id,name:v,w:0,h:0,order:floorsOf(a.dataset.id).length+1});ui.addFloor=null;ui.siteId=a.dataset.id;ui.planId=id;document.activeElement?.blur();render()},
  layerDel:a=>confirmBtn(a,async()=>{const l=S.layers[a.dataset.id];del("layers",l.id);if(l.img?.a&&CAP.assets){try{await CAP.assets.delete(l.img.a)}catch(e){}}if(det?.id===l.id)det=null;render()}),
  realign:a=>{ui.sitesOpen=false;ui.tab="plan";startAlign(a.dataset.id)},
  layer:a=>{const f=curFloor();ui.layerOf[f.id]=a.dataset.id;const L=S.layers[a.dataset.id];if(L?.filter)setFilter(L.filter.slice());ui.cands=null;if(ui.mode==="cands")ui.mode="view";render()},
  filterOpen:()=>{ui.sheet={kind:"filter"};ui.sel=null;render()},
  fAll:()=>{setFilter(null);render()},
  fNone:()=>{setFilter([]);render()},
  fSaveLayer:()=>{const L=curLayer();patch("layers",L.id,{filter:ui.filter?ui.filter.slice():null});toast(`Filtr uložen jako výchozí pro „${L.name}“`)},
  fClearLayer:()=>{const L=curLayer();patch("layers",L.id,{filter:null});toast("Výchozí filtr zrušen")},
  alignBack:()=>{const A=ui.align;if(A.step>=4){A.step=3;A.p.pop()}else if(A.step>2){A.step--;A.p.pop()}else if(A.step===2){A.step=1;A.q.pop()}else if(A.step>0){A.step--;A.q.pop()}ui.needFit=A.step===1;render()},
  alignSame:()=>{const A=ui.align,L=S.layers[A.layerId];A.m=[A.s0,0,0,0];A.step=4;ui.imgKey="";render()},
  alignRedo:()=>{const A=ui.align;A.step=0;A.q=[];A.p=[];A.m=null;ui.imgKey="";render()},
  alignOk:()=>{const A=ui.align;patch("layers",A.layerId,{m:A.m});ui.layerOf[S.layers[A.layerId].floorId]=A.layerId;ui.align=null;ui.mode="view";ui.imgKey="";det=null;toast("Vrstva zarovnána");render()},
  alignLater:()=>{const A=ui.align;ui.layerOf[S.layers[A.layerId].floorId]=A.layerId;ui.align=null;ui.mode="view";ui.imgKey="";toast("Vrstva uložena bez zarovnání. Zarovnáte ji v Objektech (tlačítko „zarovnat“ u vrstvy).");render()},
  fit:()=>fit(),
  mode:a=>{ui.copy=null;ui.mode=a.dataset.mode;ui.draft=null;ui.cands=null;ui.vSel=-1;ui.drawFor=null;ui.sheet=null;if(ui.showWalls)refreshWalls();render()},
  runAll:()=>detectAll(),
  drawUndo:()=>{ui.draft?.pts.pop();drawOverlay();renderHint()},
  drawDone:()=>finishDraw(),
  cancelDraft:()=>{ui.draft=null;ui.sheet=null;ui.draftName="";ui.drawFor=null;if(ui.mode==="draw-done")ui.mode="draw";render()},
  editDraft:()=>{ui.draftName=$("#roomName")?.value;ui.prevMode=ui.mode;ui.mode="edit";ui.draft.roomId=null;ui.sheet=null;render()},
  detMore:()=>{const d=ui.lastDet;ui.draft=null;detectRoom(d.X,d.Y,Math.round(d.r*1.5)+2)},
  detLess:()=>{const d=ui.lastDet;ui.draft=null;detectRoom(d.X,d.Y,Math.max(1,Math.round(d.r/1.6)))},
  aiDraftName:async()=>{ui.draftName=$("#roomName")?.value;try{const [n]=await aiNames([{pts:ui.draft.pts}]);if(n){ui.draftName=n;toast("Název přečten: "+n)}else toast("Název ve výkresu jsem nenašel.")}catch(e){toast(e.code==="not_granted"?"Čtení nebylo povoleno.":"Čtení selhalo: "+(e.message||e.code))}finally{ui.busy="";render()}},
  saveDraft:()=>{const name=($("#roomName")?.value||"").trim()||"Místnost";const fid=ui.planId;
    const match=roomsOf(fid).find(r=>!hasPoly(r)&&r.name.trim().toLowerCase()===name.toLowerCase());
    if(match)assignPoly(match.id,ui.draft.pts);else{const id=uid();put("rooms",id,{planId:fid,name,poly:F(ui.draft.pts)});assignPoly(id,ui.draft.pts)}
    const back=ui.prevMode&&ui.mode==="edit"?ui.prevMode:ui.mode==="draw-done"?"draw":ui.mode;ui.prevMode=null;ui.draft=null;ui.draftName="";ui.mode=back==="draw-done"?"draw":back;ui.sheet=null;toast(match?`Tvar přiřazen k „${name}“`:`Místnost „${name}“ uložena`);render()},
  candsSave:()=>{const fid=ui.planId;let n=0,m=0;
    ui.cands.filter(c=>c.on).forEach(c=>{const match=roomsOf(fid).find(r=>!hasPoly(r)&&r.name.trim().toLowerCase()===c.name.trim().toLowerCase());
      if(match){assignPoly(match.id,c.pts);m++}else{const id=uid();put("rooms",id,{planId:fid,name:c.name,poly:F(c.pts)});assignPoly(id,c.pts)}n++});
    ui.cands=null;ui.mode="view";ui.sheet=null;toast(`Uloženo ${n} místností${m?`, ${m} přiřazeno k seznamu`:""}`);render()},
  candsDrop:()=>{ui.cands=null;ui.mode="all";ui.sheet=null;render()},
  candsAi:async()=>{const list=ui.cands.filter(c=>c.on);try{const names=await aiNames(list);let k=0;list.forEach((c,i)=>{if(names[i]){c.name=names[i];k++}});toast(`Přečteno ${k} z ${list.length} názvů`)}catch(e){toast(e.code==="not_granted"?"Čtení nebylo povoleno.":"Čtení selhalo: "+(e.message||e.code))}finally{ui.busy="";render()}},
  closeSheet:()=>{ui.sheet=null;ui.sel=null;render()},
  addInRoom:a=>{const rm=S.rooms[a.dataset.id];let x=null,y=null;
    if(hasPoly(rm)){const pts=P(rm.poly);[x,y]=centroid(pts);const n=itemsOf(rm.planId).filter(i=>i.roomId===rm.id).length;x+=((n%4)-1.5)*18;y+=(Math.floor(n/4)%3)*18+20;if(!inPoly(x,y,pts))[x,y]=centroid(pts)}
    openForm(null,{planId:rm.planId,x,y,roomId:rm.id})},
  editRoom:()=>{const rm=S.rooms[ui.sheet.id];ui.draft={pts:P(rm.poly),roomId:rm.id};ui.mode="edit";ui.vSel=-1;ui.sheet=null;render()},
  editDone:()=>{const d=ui.draft;if(d.roomId){patch("rooms",d.roomId,{poly:F(d.pts)});const pts=d.pts;
      itemsOf(ui.planId).forEach(i=>{if(i.x==null)return;const inside=inPoly(i.x,i.y,pts);if(inside&&!i.roomId)patch("items",i.id,{roomId:d.roomId});if(!inside&&i.roomId===d.roomId)patch("items",i.id,{roomId:roomAt(ui.planId,i.x,i.y)?.id||""})});
      ui.sheet={kind:"room",id:d.roomId};ui.sel={type:"room",id:d.roomId};ui.draft=null;ui.mode="view"}
    else{ui.mode=ui.prevMode||"detect";ui.sheet={kind:"draft"}}
    ui.vSel=-1;render()},
  editCancel:()=>{const d=ui.draft;if(d?.roomId){ui.draft=null;ui.mode="view";ui.sheet={kind:"room",id:d.roomId}}else{ui.mode=ui.prevMode||"detect";ui.sheet={kind:"draft"}}ui.vSel=-1;render()},
  vDel:()=>{if(ui.vSel>=0&&ui.draft.pts.length>3){ui.draft.pts.splice(ui.vSel,1);ui.vSel=-1;drawOverlay();renderHint()}},
  openItem:a=>openForm(a.dataset.id),
  moveItem:()=>{ui.mode="move";ui.sheet=null;render()},
  cancelMove:()=>{ui.mode="view";ui.sheet=ui.sel?{kind:"item",id:ui.sel.id}:null;render()},
  closeForm:()=>{ui.form=null;renderForm()},
  saveForm:()=>saveForm(),
  rmPhoto:a=>{ui.form.data[a.dataset.k].splice(+a.dataset.i,1);renderForm()},
  toggleNewCat:()=>{ui.form.newCat=!ui.form.newCat;renderForm();if(ui.form.newCat)setTimeout(()=>$("#ncName")?.focus(),30)},
  copyItem:a=>{const id=a.dataset.id;const f=ui.form;if(f&&f.id===id){saveForm();}startCopy(id)},
  copyDone:()=>{ui.copy=null;ui.mode="view";render()},
  clearCat:()=>{ui.form.data.catId="";renderForm()},
  createCat:()=>{const n=$("#ncName").value;const p=$("#ncParent").value;const id=addCat(n,p);if(!id){toast("Zadejte název kategorie.");return}ui.form.data.catId=id;ui.form.newCat=false;renderForm()},
  aiRead:()=>aiRead(),
  showOnPlan:()=>{const it=S.items[ui.form.id];ui.form=null;renderForm();ui.roomPanel=null;ui.tab="plan";const f=S.floors[it.planId];ui.siteId=f.siteId;ui.planId=it.planId;ui.sel={type:"item",id:it.id};$("#main").dataset.view="";
    if(it.x==null){ui.mode="move";ui.sheet=null;toast("Klepněte na místo na půdorysu.")}else{ui.mode="view";ui.sheet={kind:"item",id:it.id};centerOn(it.x,it.y)}render()},
  delItem:a=>confirmBtn(a,()=>{const id=ui.form.id;ui.form=null;renderForm();if(ui.sheet?.kind==="item")ui.sheet=null;del("items",id)}),
  roomOpen:a=>{ui.roomPanel=a.dataset.id;renderRoomPanel()},
  roomClose:()=>{const rm=S.rooms[ui.roomPanel];if(rm){const n=($("#roomRename")?.value||"").trim(),note=$("#roomNote")?.value??"";const p={};if(n&&n!==rm.name)p.name=n;if(note!==(rm.note||""))p.note=note;if(Object.keys(p).length)patch("rooms",rm.id,p)}ui.roomPanel=null;document.activeElement?.blur();render()},
  roomDraw:a=>{const rm=S.rooms[a.dataset.id];ACT.roomClose();goPlanRoom(rm,()=>{if(hasPoly(rm)){ui.draft={pts:P(rm.poly),roomId:rm.id};ui.mode="edit"}else{ui.mode="draw";ui.drawFor=rm.id;ui.draft=null}})},
  roomDetect:a=>{const rm=S.rooms[a.dataset.id];ACT.roomClose();goPlanRoom(rm,()=>{ui.mode="detect";ui.draftName=rm.name});toast(`Klepněte doprostřed místnosti „${rm.name}“`)},
  roomShow:a=>{const rm=S.rooms[a.dataset.id];ACT.roomClose();goPlanRoom(rm,()=>{ui.sel={type:"room",id:rm.id};ui.sheet={kind:"room",id:rm.id}});const [x,y]=centroid(P(rm.poly));centerOn(x,y)},
  roomDel:a=>confirmBtn(a,()=>{const id=a.dataset.id;itemsOf(S.rooms[id].planId).filter(i=>i.roomId===id).forEach(i=>patch("items",i.id,{roomId:""}));del("rooms",id);ui.roomPanel=null;if(ui.sheet?.id===id)ui.sheet=null;render()}),
  bulkOpen:()=>{ui.bulk={floorId:ui.planId,text:""};render();setTimeout(()=>$("#bulkText")?.focus(),40)},
  bulkCancel:()=>{ui.bulk=null;document.activeElement?.blur();render()},
  bulkSave:()=>{const fid=$("#bulkFloor")?.value;const lines=($("#bulkText")?.value||"").split(/\r?\n/).map(s=>s.split("\t").filter(Boolean).join(" ").trim()).filter(Boolean);
    if(!fid||!lines.length){toast("Zadejte aspoň jednu místnost.");return}
    const have=new Set(roomsOf(fid).map(r=>r.name.trim().toLowerCase()));let n=0;
    lines.forEach(l=>{if(have.has(l.toLowerCase()))return;have.add(l.toLowerCase());put("rooms",uid(),{planId:fid,name:l,poly:[]});n++});
    ui.bulk=null;document.activeElement?.blur();toast(`Přidáno ${n} místností${lines.length-n?` (${lines.length-n} už existovalo)`:""}`);render()},
  exportRooms:()=>saveFile("mistnosti.csv",csvRooms(),"text/csv;charset=utf-8"),
  toggleCat:a=>{ui.open[a.dataset.id]=!ui.open[a.dataset.id];render()},
  catEdit:a=>{ui.editCat=a.dataset.id;$("#catman").innerHTML="";render();setTimeout(()=>$("#ecName")?.focus(),40)},
  catSave:a=>{const v=($("#ecName")?.value||"").trim();if(v)patch("cats",a.dataset.id,{name:v});ui.editCat=null;document.activeElement?.blur();render()},
  catDel:a=>{const id=a.dataset.id;const used=Object.values(S.items).some(i=>i.catId===id)||kids(id).length;
    if(used){ui.catDelFor=id;$("#catman").innerHTML="";render()}else confirmBtn(a,()=>{del("cats",id);toast("Kategorie smazána")})},
  catDelCancel:()=>{ui.catDelFor=null;$("#catman").innerHTML="";render()},
  catDelMove:a=>{const id=a.dataset.id,to=$("#catMoveTo")?.value||"";const c=S.cats[id];
    let ni=0;Object.values(S.items).filter(i=>i.catId===id).forEach(i=>{patch("items",i.id,{catId:to});ni++});
    kids(id).forEach(k=>{const p={parentId:to};if(!to)p.color=c.color||catColor(id);patch("cats",k.id,p)});
    if(ui.filter)setFilter(ui.filter.filter(x=>x!==id));
    del("cats",id);ui.catDelFor=null;$("#catman").innerHTML="";toast(`Kategorie „${c.name}“ smazána${ni?`, ${ni} ks přesunuto do: ${to?S.cats[to].name:"Bez kategorie"}`:""}`);render()},
  catSub:a=>{ui.subOf=a.dataset.id;document.activeElement?.blur();render();setTimeout(()=>$("#ncList")?.focus(),40)},
  catNewRoot:()=>{ui.subOf="";render();setTimeout(()=>$("#ncList")?.focus(),40)},
  catAdd:()=>{const v=$("#ncList")?.value||"";if(addCat(v,ui.subOf)){if(ui.subOf)ui.open[ui.subOf]=true}ui.subOf=undefined;document.activeElement?.blur();render()},
  seedCats:()=>seedCats(),
  demoSite:()=>{if(live)demoToStore();else{toast("Ukázkový objekt už je načtený.");ui.sitesOpen=false;render()}},
  exportCsv:()=>saveFile("pasport-technologii.csv",csvItems(),"text/csv;charset=utf-8"),
  dlLabels:()=>saveFile("stitky-qr.html",labelsHtml(labelItems()),"text/html;charset=utf-8"),
};
function moveFloor(id,dir){const f=S.floors[id];const fl=floorsOf(f.siteId);const i=fl.findIndex(x=>x.id===id);const j=i+dir;if(j<0||j>=fl.length)return;
  fl.forEach((x,k)=>{if(x.order!==k+1)patch("floors",x.id,{order:k+1})});const a=fl[i],b=fl[j];patch("floors",a.id,{order:j+1});patch("floors",b.id,{order:i+1})}
document.addEventListener("click",e=>{const a=e.target.closest("[data-act]");if(!a)return;if(a.tagName==="LABEL")return;e.preventDefault();ACT[a.dataset.act]?.(a,e)});
document.addEventListener("input",e=>{
  const t=e.target;
  if(t.dataset.f&&ui.form){ui.form.data[t.dataset.f]=t.value;if(t.dataset.f==="roomId")ui.form.roomTouched=true;return}
  if(t.id==="q"){ui.search=t.value;if(ui.tab==="list")renderList($("#main"));return}
  if(t.id==="rq"){ui.roomQ=t.value;ui.roomQFocus=true;renderRooms($("#main"));return}
  if(t.id==="bulkText"&&ui.bulk){ui.bulk.text=t.value;return}
  if(t.id==="gap"){ui.gap=+t.value;const o=$("#gapOut");if(o)o.textContent=ui.gap?ui.gap.toFixed(1)+" %":"auto"}
  if(t.id==="thick"){ui.thick=+t.value;const o=$("#thickOut");if(o)o.textContent=ui.thick+" px";clearTimeout(ui.wt);ui.wt=setTimeout(refreshWalls,250)}
  if(t.id==="thr"){ui.thr=+t.value<90?0:+t.value;const o=$("#thrOut");if(o)o.textContent=ui.thr||"auto";clearTimeout(ui.wt);ui.wt=setTimeout(refreshWalls,250)}
  if(t.id==="alignOp"&&ui.align){ui.align.op=+t.value;drawImages()}
});
document.addEventListener("change",async e=>{
  const t=e.target;
  if(t.dataset.f&&ui.form){ui.form.data[t.dataset.f]=t.value;const k=t.dataset.f;if(k==="roomId")ui.form.roomTouched=true;
    if(k==="catId"){renderForm();return}
    if(k==="maker"||k==="name"||k==="params")refreshLists();
    if(k==="model"||k==="name")autofillFrom(k);return}
  if(t.id==="copyQuick"&&ui.copy){ui.copy.quick=t.checked;return}
  if(t.id==="labelCat"){ui.labelCat=t.value;render()}
  if(t.id==="colorWalls"){ui.color=t.checked;refreshWalls()}
  if(t.id==="showWalls"){ui.showWalls=t.checked;if(ui.showWalls){ui.busy="Připravuji náhled stěn…";render();await refreshWalls();ui.busy="";render()}else drawWalls()}
  if(t.dataset.fcat!==undefined){const id=t.dataset.fcat;let cur=ui.filter?new Set(ui.filter):new Set([...kids("").map(c=>c.id),"_none"]);
    if(t.checked)cur.add(id);else{
      const anc=[];let c=S.cats[id];while(c&&c.parentId){anc.push(c.parentId);c=S.cats[c.parentId]}
      const top=[...anc].reverse().find(a=>cur.has(a)); // a ticked ancestor implies this one: untick it and keep its other branches
      cur.delete(id);anc.forEach(a=>cur.delete(a));descIds(id).forEach(d=>cur.delete(d));
      if(top){const path=new Set(anc);const add=pid=>kids(pid).forEach(k=>{if(k.id===id)return;if(path.has(k.id))add(k.id);else cur.add(k.id)});add(top)}}
    setFilter([...cur]);render()}
  if(t.hasAttribute("data-newfloor")&&t.files[0]){const f=t.files[0];const sid=t.dataset.newfloor;t.value="";ui.busy="Načítám výkres…";render();importFloors(sid,f)}
  if(t.hasAttribute("data-newlayer")&&t.files[0]){const f=t.files[0];const fid=t.dataset.newlayer;t.value="";ui.busy="Načítám výkres…";render();importLayer(fid,f)}
  if(t.hasAttribute("data-scan")&&t.files[0]){const f=t.files[0];t.value="";scanFile(f)}
  if(t.dataset.shot&&ui.form&&t.files.length){
    const key=t.dataset.shot;const files=[...t.files];t.value="";toast("Ukládám fotku…");
    try{for(const f of files){const b=await compress(f,key==="plates"?2000:1600);const img=await storeImage(b);ui.form?.data[key].push(img)}
      renderForm();toast(key==="plates"&&CAP.sample?"Fotka štítku uložena – můžete ji nechat vyčíst.":"Fotka uložena");}
    catch(e){toast("Fotku se nepodařilo uložit: "+(e.message||e.code))}
  }
});
document.addEventListener("focusout",e=>{if(e.target.id==="rq")ui.roomQFocus=false});
document.addEventListener("keydown",e=>{const id=e.target.id;
  if(e.key==="Enter"){if(id==="roomName")ACT.saveDraft();if(id==="ecName")ACT.catSave({dataset:{id:ui.editCat}});if(id==="ncList")ACT.catAdd();if(id==="renInput")ACT.renSave();
    if(id==="newSiteName")ACT.siteCreate();if(id==="wSite")ACT.wCreate();if(id==="newFloorName")ACT.floorCreate({dataset:{id:ui.addFloor}})}
  if(e.key==="Escape"){if(ui.form){ui.form=null;renderForm()}else if(ui.roomPanel)ACT.roomClose();else if(ui.sitesOpen){ui.sitesOpen=false;renderSites()}}});
let tt=0;function toast(msg){let t=$(".toast");if(!t){t=document.createElement("div");t.className="toast";t.setAttribute("role","status");document.body.appendChild(t)}t.textContent=msg;clearTimeout(tt);tt=setTimeout(()=>t.remove(),4200)}

/* ---------------- migration from v1 (plans -> site/floor/layer) ---------------- */
function migrate(){
  if(migrated)return;migrated=true;const ps=Object.values(S.plans);if(!ps.length)return;
  let sid=sites()[0]?.id;if(!sid){sid=uid();put("sites",sid,{name:"Můj objekt",order:1})}
  ps.forEach((p,i)=>{if(!S.floors[p.id]){put("floors",p.id,{siteId:sid,name:p.name,w:p.w,h:p.h,order:p.order||i+1});put("layers",uid(),{floorId:p.id,name:"Stavební",img:p.img,w:p.w,h:p.h,m:[1,0,0,0],order:1})}del("plans",p.id)});
  toast("Vaše dřívější půdorysy jsem převedl do objektu „"+S.sites[sid].name+"“.");
}

/* ---------------- boot ---------------- */
loadDemo();render();
(async()=>{
  // Místo window.claude.use (claude.ai) vlastní úložiště z src/cap.
  const {db,assets,sample,downloads}=createCap();
  CAP={db,assets,sample,downloads};
  if(db){
    live=true;ui.demo=false;ui.loading=true;S={sites:{},floors:{},layers:{},rooms:{},cats:{},items:{},plans:{}};ui.siteId=null;ui.planId=null;ui.sel=null;ui.sheet=null;ui.mode="view";det=null;$("#main").dataset.view="";
    try{const s=JSON.parse(localStorage.getItem("pasport.loc")||"null");if(s){ui.siteId=s.site;ui.planId=s.floor}}catch(e){}
    COLS.forEach(c=>db.collection(c).onSnapshot(snap=>{const o={};snap.docs.forEach(d=>o[d.id]={...d.data(),id:d.id});S[c]=o;loadedCols.add(c);
        if(loadedCols.size===COLS.length){if(ui.loading){ui.loading=false;migrate()}}render()},
      e=>{loadedCols.add(c);if(loadedCols.size===COLS.length)ui.loading=false;toast("Data se nepodařilo načíst: "+e.message);render()}));
  }
  render();
})();
setInterval(()=>{if(live)try{localStorage.setItem("pasport.loc",JSON.stringify({site:ui.siteId,floor:ui.planId}))}catch(e){}},3000);
