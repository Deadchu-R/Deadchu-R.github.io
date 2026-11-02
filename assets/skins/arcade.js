/* Arcade style: a tiny platformer on the first screen. The jump links (and the CV) are coins: collect one to go there.
   Keyboard: ← → / A D to move, ↑ / W / Space to jump. Phone: the on-screen pad, or tap where to go. */
(function(){
  "use strict";
  const R=window.RTSkins=window.RTSkins||{};
  let st=null;
  function beep(f,d){if(!st||!st.sound)return;try{st.ac=st.ac||new (window.AudioContext||window.webkitAudioContext)();const o=st.ac.createOscillator(),g=st.ac.createGain();
    o.type="square";o.frequency.value=f;g.gain.value=.05;o.connect(g).connect(st.ac.destination);o.start();g.gain.exponentialRampToValueAtTime(.0001,st.ac.currentTime+d);o.stop(st.ac.currentTime+d)}catch(e){}}
  function on(){
    const hero=document.querySelector(".hero");if(!hero||st)return;
    const cv=document.createElement("canvas");cv.className="arc-game";cv.setAttribute("aria-hidden","true");
    const hud=document.createElement("div");hud.className="arc-hud";
    const score=document.createElement("span");score.textContent="COINS 0";
    const snd=document.createElement("button");snd.type="button";snd.textContent="SOUND OFF";
    hud.append(score,snd);
    const pad=document.createElement("div");pad.className="arc-pad";pad.setAttribute("aria-hidden","true");
    const mk=(t,k)=>{const b=document.createElement("button");b.type="button";b.textContent=t;b.dataset.k=k;return b};
    pad.append(mk("◀","l"),mk("▶","r"),mk("▲","j"));
    hero.querySelector(".hero-media").after(cv);hero.append(hud,pad);
    st={hero,cv,hud,pad,ctx:cv.getContext("2d"),keys:{},p:{x:20,y:0,vx:0,vy:0,on:false,f:1,t:0},coins:[],plats:[],sound:false,n:0,raf:0,go:null,target:null};
    snd.addEventListener("click",()=>{st.sound=!st.sound;snd.textContent=st.sound?"SOUND ON":"SOUND OFF";beep(660,.1)});
    const press=(k,v)=>{st.keys[k]=v;if(k==="j"&&v)jump()};
    pad.querySelectorAll("button").forEach(b=>{b.addEventListener("pointerdown",e=>{e.preventDefault();press(b.dataset.k,true)});["pointerup","pointercancel","pointerleave"].forEach(ev=>b.addEventListener(ev,()=>press(b.dataset.k,false)))});
    st.kd=e=>{if((document.documentElement.classList.contains("rt-on")&&!document.documentElement.classList.contains("rt-preview"))||/INPUT|TEXTAREA/.test((e.target||{}).tagName||"")||e.target.isContentEditable)return;
      const r=hero.getBoundingClientRect();if(r.bottom<80)return;
      const k={ArrowLeft:"l",a:"l",A:"l",ArrowRight:"r",d:"r",D:"r",ArrowUp:"j",w:"j",W:"j"," ":"j"}[e.key];if(!k)return;
      if(e.type==="keydown"){if(k==="j"&&!st.keys.j)jump();st.keys[k]=true;e.preventDefault()}else st.keys[k]=false};
    addEventListener("keydown",st.kd);addEventListener("keyup",st.kd);
    // tap the play area: walk there (and jump if you tapped above the player)
    st.tap=e=>{if((document.documentElement.classList.contains("rt-on")&&!document.documentElement.classList.contains("rt-preview")))return;if(e.target.closest("a,button,.hero-panel,.hero-links,.btns,.arc-hud,.arc-pad,.topbar,.jump"))return;
      const r=cv.getBoundingClientRect();if(e.clientY<r.top||e.clientY>r.bottom)return;
      const S=st.S;st.target=(e.clientX-r.left)/S;if((e.clientY-r.top)/S<st.p.y-20)jump()};
    hero.addEventListener("click",st.tap);
    st.ro=new ResizeObserver(layout);st.ro.observe(hero);layout();
    loop();
  }
  function jump(){if(!st)return;if(st.p.on){st.p.vy=-4.6;st.p.on=false;beep(520,.08)}}
  function layout(){
    if(!st)return;const {hero,cv}=st,W=hero.clientWidth,H=hero.clientHeight,S=W<600?3:4,dpr=Math.min(2,devicePixelRatio||1);st.S=S;
    // the game thinks in big "pixels" (S screen px each); the canvas is full resolution so the labels stay sharp
    cv.width=Math.ceil(W*dpr);cv.height=Math.ceil(H*dpr);st.lw=Math.ceil(W/S);st.lh=Math.ceil(H/S);st.ctx.setTransform(S*dpr,0,0,S*dpr,0,0);st.ctx.imageSmoothingEnabled=false;
    const panel=hero.querySelector(".hero-panel"),hr=hero.getBoundingClientRect(),pr=panel?panel.getBoundingClientRect():null;
    const mobile=W<760;
    let ground=(H-120)/S;
    if(mobile&&pr){ground=Math.max(90,(pr.top-hr.top-14)/S)}
    st.ground=ground;
    const w=st.lw,top=(mobile?84:96)/S,L=Math.max(.45,Math.min(1,(ground-top)/92)),pr_=pr?(pr.right-hr.left)/S:0,links=[...hero.querySelectorAll(".hero-links a")].map(a=>({label:(a.textContent||"").trim().toUpperCase(),href:a.getAttribute("href")}));
    const cvl=document.querySelector('.topbar nav a[href$="cv.html"]');if(cvl)links.push({label:"CV",href:cvl.getAttribute("href")});
    // platforms: on phones above the text, on computers on the right half
    const x0=mobile?w*.08:Math.max(w*.56,pr_+12),span=mobile?w*.84:Math.max(w*.3,w*.96-x0);
    st.plats=[{x:x0+span*.05,y:ground-26*L,w:span*.32},{x:x0+span*.5,y:ground-48*L,w:span*.3},{x:x0+span*.18,y:ground-72*L,w:span*.3}].map(p=>({x:Math.round(p.x),y:Math.round(p.y),w:Math.round(p.w)}));
    const spots=[{x:x0+span*.2,y:ground-26*L-10},{x:x0+span*.65,y:ground-48*L-10},{x:x0+span*.33,y:ground-72*L-10},{x:x0+span*.9,y:ground-8},{x:x0+span*.02,y:ground-8}];
    const got=new Set(st.coins.filter(c=>c.got).map(c=>c.label));
    st.coins=links.slice(0,5).map((l,i)=>Object.assign({},l,spots[i],{got:got.has(l.label)}));
    if(!st.p.placed){st.p.x=mobile?w*.06:w*.52;st.p.y=ground-16;st.p.placed=true}
  }
  function solidUnder(p){
    if(p.y+16>=st.ground)return st.ground;
    for(const q of st.plats)if(p.vy>=0&&p.x+10>q.x&&p.x+2<q.x+q.w&&p.y+16<=q.y+1&&p.y+16+p.vy>=q.y)return q.y;
    return null;
  }
  function step(){
    const p=st.p,k=st.keys,w=st.lw;let dir=(k.r?1:0)-(k.l?1:0);
    if(!dir&&st.target!=null){const dx=st.target-(p.x+6);if(Math.abs(dx)>2)dir=Math.sign(dx);else st.target=null}
    if(dir)st.target=k.l||k.r?null:st.target;
    p.vx=dir*1.35;if(dir)p.f=dir;
    p.x=Math.max(0,Math.min(w-12,p.x+p.vx));
    p.vy=Math.min(p.vy+.22,5);
    const g=solidUnder(p);
    if(g!=null&&p.vy>=0){p.y=g-16;p.vy=0;p.on=true}else{p.y+=p.vy;p.on=false}
    if(dir&&p.on)p.t++;
    for(const c of st.coins){if(c.got)continue;
      if(Math.abs(p.x+6-c.x)<10&&Math.abs(p.y+8-c.y)<14){c.got=true;st.n++;st.hud.firstChild.textContent="COINS "+st.n;beep(988,.07);setTimeout(()=>beep(1319,.12),70);
        st.pop={x:c.x,y:c.y,t:30,label:c.label};const h=c.href;setTimeout(()=>{if(!h)return;if(h.startsWith("#")){const t=document.querySelector(h);if(t)t.scrollIntoView({behavior:"smooth"})}else location.href=h},450)}}
  }
  const PAL={k:"#111",s:"#f2c29b",h:"#3a2418",c:"#29e7ff",m:"#ff3df2",b:"#2b3dbb",w:"#fff"};
  const HERO=["....hhhh....","...hhhhhh...","...hsssshh..","..cssksksc..","..csssssc...","...ssmss....","..mmmmmmm...",".mmmmmmmmm..",".s.mmmmm.s..","...mmmmm....","...bbbbb....","...bb.bb....","...bb.bb....","..kk...kk..."];
  const HERO2=["....hhhh....","...hhhhhh...","...hsssshh..","..cssksksc..","..csssssc...","...ssmss....","..mmmmmmm...",".mmmmmmmmm..",".s.mmmmm.s..","...mmmmm....","...bbbbb....","..bb...bb...",".bb.....bb..",".kk.....kk.."];
  function draw(){
    const {ctx}=st,w=st.lw,h=st.lh,t=performance.now()/1000;ctx.clearRect(0,0,w,h);
    // ground + platforms
    ctx.fillStyle="#29e7ff";ctx.fillRect(0,st.ground,w,1);ctx.fillStyle="rgba(41,231,255,.15)";ctx.fillRect(0,st.ground+1,w,3);
    for(const q of st.plats){ctx.fillStyle="#ff3df2";ctx.fillRect(q.x,q.y,q.w,3);ctx.fillStyle="rgba(255,61,242,.35)";ctx.fillRect(q.x,q.y+3,q.w,2)}
    // coins with labels
    ctx.font=(11/st.S).toFixed(2)+'px "Press Start 2P",monospace';ctx.textAlign="center";
    for(const c of st.coins){if(c.got)continue;const bob=Math.round(Math.sin(t*3+c.x)*2),cy=c.y+bob,sw=Math.abs(Math.round(Math.cos(t*4+c.x)*3))+1;
      ctx.fillStyle="#ffd23f";ctx.fillRect(c.x-sw,cy-4,sw*2,8);ctx.fillStyle="#b8860b";ctx.fillRect(c.x-sw,cy+3,sw*2,1);
      ctx.fillStyle="#000";ctx.fillText(c.label,c.x+.5,cy-6.5);ctx.fillStyle="#fff";ctx.fillText(c.label,c.x,cy-7)}
    if(st.pop&&st.pop.t>0){st.pop.t--;ctx.fillStyle="#ffd23f";ctx.fillText("+1 "+st.pop.label,st.pop.x,st.pop.y-14-(30-st.pop.t)/2)}
    // the player
    const p=st.p,spr=p.on&&Math.abs(p.vx)>0&&(p.t>>3)%2?HERO2:HERO,px=Math.round(p.x),py=Math.round(p.y)+2;
    for(let y=0;y<spr.length;y++)for(let x=0;x<12;x++){const ch=spr[y][p.f<0?11-x:x];if(ch==="."||!PAL[ch])continue;ctx.fillStyle=PAL[ch];ctx.fillRect(px+x,py+y-2,1,1)}
    if(st.n===0&&!st.moved){ctx.fillStyle="rgba(255,255,255,.8)";ctx.textAlign="left";const tip=matchMedia("(pointer:coarse)").matches?"TAP OR USE THE PAD":"← → MOVE  ↑ JUMP";if((t*2|0)%2)ctx.fillText(tip,Math.max(4,px-20),py-12)}
    if(st.keys.l||st.keys.r||st.target!=null)st.moved=true;
  }
  function loop(){if(!st)return;const r=st.hero.getBoundingClientRect();if(r.bottom>0&&!document.hidden){step();draw()}st.raf=requestAnimationFrame(loop)}
  function off(){if(!st)return;cancelAnimationFrame(st.raf);removeEventListener("keydown",st.kd);removeEventListener("keyup",st.kd);st.hero.removeEventListener("click",st.tap);
    st.ro.disconnect();st.cv.remove();st.hud.remove();st.pad.remove();st=null}
  R.arcade={on,off};
  const start=()=>{if(document.documentElement.dataset.skin==="arcade")(document.fonts?document.fonts.load('8px "Press Start 2P"').catch(()=>{}):Promise.resolve()).then(on)};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start();
})();
