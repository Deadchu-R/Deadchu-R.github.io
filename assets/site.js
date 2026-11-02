// Clips: muted loops that play only while on screen. Tap (or the full-screen icon) opens the video
// full screen, like YouTube. Screenshots and character art open in a zoomable lightbox.
// Visual editor: roeetal.com/?edit turns on edit mode for this tab (assets/edit.js). Visitors never load it.
(function(){
  const me=document.currentScript;
  try{
    if(/[?&]edit\b/.test(location.search)||location.hash==="#edit")sessionStorage.setItem("rt-edit","1");
    if(sessionStorage.getItem("rt-edit")&&me&&me.dataset.edit)document.head.appendChild(Object.assign(document.createElement("script"),{src:me.dataset.edit}));
  }catch(e){}
})();
(function(){
  const drivePreview=id=>`https://drive.google.com/file/d/${id}/preview`;
  const $=s=>document.querySelector(s);

  /* ---------- inline clips ---------- */
  const clips=[...document.querySelectorAll(".clip")];
  const io="IntersectionObserver" in window ? new IntersectionObserver(entries=>{
    entries.forEach(en=>{
      const btn=en.target,v=btn.querySelector("video");
      if(!v||!btn.dataset.src||"still" in btn.dataset)return;
      if(en.isIntersecting){if(!v.src)v.src=btn.dataset.src;v.play().catch(()=>{})}else v.pause();
    });
  },{threshold:.4}) : null;
  clips.forEach(c=>{
    const v=c.querySelector("video");
    if(v)v.addEventListener("error",()=>{c.dataset.src=""},{once:true});
    io&&io.observe(c);
  });

  /* ---------- hero reel ---------- */
  const heroVideo=$(".hero-video");
  if(heroVideo){
    const tall=matchMedia("(max-aspect-ratio: 1/1)").matches;
    const src=tall?heroVideo.dataset.tall:heroVideo.dataset.wide;
    heroVideo.poster=src.replace(".mp4",".jpg");heroVideo.src=src;
    heroVideo.play().catch(()=>{});
  }

  /* ---------- viewer: arrows move through the clicked item's group ---------- */
  const viewer=$("#viewer"),stage=$("#viewerStage"),title=$("#viewerTitle"),cap=$("#viewerCap"),infoBtn=$("#viewerInfo"),credit=$("#viewerCredit"),moreText=$("#viewerMoreText"),moreLink=$("#viewerLink");
  let last=null,gallery=[],gi=0,open_=false,fsOwned=false;
  const pauseAll=()=>{document.querySelectorAll(".clip video").forEach(x=>x.pause());heroVideo&&heroVideo.pause()};
  const isFs=()=>document.fullscreenElement||document.webkitFullscreenElement;
  const isVideo=el=>el.classList.contains("clip")||"playDrive" in el.dataset;
  const visible=el=>{const g=el.closest(".gitem");return !g||!g.hidden};
  const count=()=>gallery.length>1?`${gi+1} / ${gallery.length}`:"";

  function close(){
    if(!open_)return;
    open_=false;
    if(isFs()){fsOwned=false;try{(document.exitFullscreen||document.webkitExitFullscreen).call(document)}catch(e){}}
    viewer.hidden=true;stage.innerHTML="";viewer.className="viewer";document.body.style.overflow="";
    infoBtn.setAttribute("aria-expanded","false");infoBtn.blur();
    heroVideo&&heroVideo.play().catch(()=>{});
    last&&last.blur&&last.blur();
  }
  // the video's own full-screen button is used; Chrome locks landscape when it opens,
  // so release the lock right away and let the phone's rotation decide
  // screenshots and character art have no player controls, so they get their own full-screen button
  const maxBtn=$("#viewerMax"),canFs=!!(viewer.requestFullscreen||viewer.webkitRequestFullscreen);
  function toggleMax(){
    if(isFs()){try{(document.exitFullscreen||document.webkitExitFullscreen).call(document)}catch(e){}return}
    try{Promise.resolve((viewer.requestFullscreen||viewer.webkitRequestFullscreen).call(viewer)).catch(()=>{})}catch(e){}
  }
  ["fullscreenchange","webkitfullscreenchange"].forEach(ev=>document.addEventListener(ev,()=>{
    const on=document.fullscreenElement===viewer||document.webkitFullscreenElement===viewer;
    viewer.classList.toggle("is-max",on);maxBtn.setAttribute("aria-label",on?"Exit full screen":"Full screen")}));
  const freeRotation=()=>{try{screen.orientation&&screen.orientation.unlock&&screen.orientation.unlock()}catch(e){}};
  ["fullscreenchange","webkitfullscreenchange"].forEach(ev=>document.addEventListener(ev,()=>{
    if(isFs()){freeRotation();setTimeout(freeRotation,150);setTimeout(freeRotation,600)}}));
  function playInStage(name,src,driveId){
    stage.innerHTML="";let v=null;
    const drive=()=>{stage.innerHTML=`<iframe src="${drivePreview(driveId)}" allow="autoplay; fullscreen" allowfullscreen title="${String(name).replace(/"/g,"")}"></iframe>`};
    if(src){
      v=document.createElement("video");
      Object.assign(v,{src,controls:true,autoplay:true,loop:true,playsInline:true});
      v.addEventListener("error",drive,{once:true});
      stage.appendChild(v);
    }else drive();
    return v;
  }
  function render(){
    const el=gallery[gi],vid=isVideo(el);
    viewer.className="viewer "+(vid?"is-video":"is-image")+(gallery.length>1?" has-nav":"");
    title.textContent=[el.dataset.title,count()].filter(Boolean).join(" · ");
    cap.textContent=el.dataset.cap||"";
    viewer.classList.remove("cap-open");infoBtn.setAttribute("aria-expanded","false");infoBtn.querySelector(".i-tx").textContent="Read more";
    const more=el.dataset.more||"";moreText.textContent=more;
    moreLink.hidden=!el.dataset.href;if(el.dataset.href)moreLink.href=el.dataset.href;
    infoBtn.hidden=!more;
    maxBtn.hidden=vid||!canFs;
    if(vid&&(document.fullscreenElement===viewer))toggleMax();
    credit.textContent=el.dataset.credit||"";credit.hidden=!el.dataset.credit||!vid;
    if(vid)return playInStage(el.dataset.title,el.dataset.src,el.dataset.drive||el.dataset.playDrive);
    stage.innerHTML=`<img src="${el.dataset.full}" alt="${(el.querySelector("img")||{}).alt||""}">`;
    return null;
  }
  function closeTileInfo(){document.querySelectorAll(".gitem.show-info").forEach(f=>{f.classList.remove("show-info");const b=f.querySelector(".info");b.setAttribute("aria-expanded","false");b.querySelector(".i-tx").textContent="Info"})}
  function open(el){
    closeTileInfo();
    last=document.activeElement;open_=true;
    const g=el.dataset.group;
    let list=[el];
    if(g)list=[...document.querySelectorAll(`[data-group="${g}"]`)].filter(visible);
    else if(el.classList.contains("clip"))list=[...document.querySelectorAll(".clip:not([data-group])")];
    gallery=list;gi=Math.max(0,gallery.indexOf(el));
    const v=render();
    viewer.hidden=false;document.body.style.overflow="hidden";pauseAll();
    $("#viewerClose").focus({preventScroll:true});
  }
  function step(d){if(!open_||gallery.length<2)return;gi=(gi+d+gallery.length)%gallery.length;render()}

  document.addEventListener("click",e=>{
    if(e.target.closest("#viewerInfo")){const on=viewer.classList.toggle("cap-open");infoBtn.setAttribute("aria-expanded",on);infoBtn.querySelector(".i-tx").textContent=on?"Show less":"Read more";return}
    const gi_=e.target.closest(".gitem .info");
    if(gi_){
      const fig=gi_.closest(".gitem"),on=!fig.classList.contains("show-info");
      document.querySelectorAll(".gitem.show-info").forEach(f=>{f.classList.remove("show-info");f.querySelector(".info").setAttribute("aria-expanded","false")});
      fig.classList.toggle("show-info",on);gi_.setAttribute("aria-expanded",on);document.querySelectorAll(".gitem .info .i-tx").forEach(t=>t.textContent=t.closest(".info")===gi_&&on?"Close":"Info");return;
    }
    if(!e.target.closest(".gitem.show-info"))document.querySelectorAll(".gitem.show-info").forEach(f=>{f.classList.remove("show-info");const b=f.querySelector(".info");b.setAttribute("aria-expanded","false");b.querySelector(".i-tx").textContent="Info"});
    const item=e.target.closest(".clip,.zoom,[data-play-drive]");
    if(item&&!viewer.contains(item)){if(!item.dataset.title&&isVideo(item))item.dataset.title="Video";open(item);return}
    if(e.target.closest("#viewerPrev")){step(-1);return}
    if(e.target.closest("#viewerNext")){step(1);return}
    if(e.target.closest("#viewerMax")){toggleMax();return}
    if(e.target.closest("#viewerClose")){close();return}
    if(open_&&e.target===stage&&!isVideo(gallery[gi])){if(isFs())toggleMax();else close();return}
    const chip=e.target.closest("[data-filter]");
    if(chip)filter(chip);
    const cp=e.target.closest("[data-copy]");
    if(cp){
      const el=$(cp.dataset.copy);
      const done=t=>{cp.textContent=t;setTimeout(()=>cp.textContent="Copy",1600)};
      navigator.clipboard?.writeText(el.textContent).then(()=>done("Copied"),()=>{
        const r=document.createRange();r.selectNodeContents(el);const s=getSelection();s.removeAllRanges();s.addRange(r);done("Selected")});
    }
  });
  document.addEventListener("keydown",e=>{
    if(!open_)return;
    if(e.key==="Escape")close();
    if(e.key==="ArrowLeft")step(-1);
    if(e.key==="ArrowRight")step(1);
  });
  // leaving full screen (the player's minimise button, Back, Esc) returns to the small player; Close shuts it
  // swipe between images
  let sx=null;
  stage.addEventListener("touchstart",e=>{sx=e.target.tagName==="VIDEO"&&e.touches[0].clientY>stage.clientHeight-70?null:e.touches[0].clientX},{passive:true});
  stage.addEventListener("touchend",e=>{if(sx===null)return;const dx=e.changedTouches[0].clientX-sx;if(Math.abs(dx)>50)step(dx<0?1:-1);sx=null},{passive:true});

  /* ---------- projects band colors ----------
     one card per row (phones): the band follows the card in the middle of the screen.
     several cards per row (desktop): scrolling can't pick one, so the band stays calm
     and only takes a card's colors while the mouse is over it. */
  const band=$(".palette-band");
  if(band){
    const cards=[...band.querySelectorAll(".ptile")],root=document.documentElement;
    const BASE=["#1758b0","#0c2f6e"];
    let raf=0,cur=null,hoverCard=null;
    const multi=()=>cards.length>1&&Math.abs(cards[0].offsetTop-cards[1].offsetTop)<4; // layout position, unaffected by the reveal animation
    const setBand=(top,bottom,active)=>{
      cards.forEach(c=>c.classList.toggle("is-active",c===active));
      if(top!==cur){cur=top;root.style.setProperty("--band-top",top);root.style.setProperty("--band-bottom",bottom)}
    };
    const pick=()=>{
      raf=0;
      const isMulti=multi();band.classList.toggle("multi",isMulti);
      if(isMulti){hoverCard?setBand(hoverCard.dataset.mid,hoverCard.dataset.deep,hoverCard):setBand(BASE[0],BASE[1],null);return}
      const r=band.getBoundingClientRect(),vh=innerHeight;
      if(r.bottom<0||r.top>vh)return;
      const mid=vh/2;let best=null,bd=1e9;
      cards.forEach(c=>{const b=c.getBoundingClientRect();const d=Math.abs((b.top+b.bottom)/2-mid);if(d<bd){bd=d;best=c}});
      // stick with the current card until another one is clearly closer (no flicker at the boundary)
      const prev=cards.find(c=>c.classList.contains("is-active"));
      if(prev&&prev!==best){const pb=prev.getBoundingClientRect();if(Math.abs((pb.top+pb.bottom)/2-mid)-bd<60)best=prev}
      const before=cards[0].getBoundingClientRect().top>vh*.75;
      before?setBand(BASE[0],BASE[1],null):setBand(best.dataset.mid,best.dataset.deep,best);
    };
    cards.forEach(c=>{
      c.addEventListener("mouseenter",()=>{hoverCard=c;if(multi())pick()});
      c.addEventListener("mouseleave",()=>{if(hoverCard===c)hoverCard=null;if(multi())pick()});
    });
    addEventListener("scroll",()=>{if(!raf)raf=requestAnimationFrame(pick)},{passive:true});
    addEventListener("resize",pick);pick();
  }

  /* ---------- reveal on scroll ---------- */
  if("IntersectionObserver" in window&&!matchMedia("(prefers-reduced-motion: reduce)").matches){
    const els=[];
    const add=(sel,stagger)=>document.querySelectorAll(sel).forEach((el,i)=>{el.classList.add("reveal");if(stagger)el.style.setProperty("--d",(i%3)*.1+"s");els.push(el)});
    add(".sec-head");add(".ptile",1);add(".repo",1);add(".now-copy");add(".bp");add(".timeline li",1);add(".lab-row");add(".foot-grid > *",1);
    const extra=[...document.querySelectorAll(".timeline,.foot")];
    document.documentElement.classList.add("rv");
    const ro=new IntersectionObserver(en=>en.forEach(x=>{if(x.isIntersecting){x.target.classList.add("in");ro.unobserve(x.target)}}),{threshold:.15,rootMargin:"0px 0px -8% 0px"});
    [...els,...extra].forEach(el=>ro.observe(el));
  }

  /* ---------- ongoing job: time since the start date, always current ---------- */
  document.querySelectorAll("[data-since]").forEach(el=>{
    const [y,m]=el.dataset.since.split("-").map(Number),now=new Date();
    let months=(now.getFullYear()-y)*12+(now.getMonth()+1-m);if(months<1)months=1;
    const yrs=Math.floor(months/12),mos=months%12;
    el.textContent=[yrs?yrs+(yrs>1?" yrs":" yr"):"",mos?mos+(mos>1?" mos":" mo"):""].filter(Boolean).join(" ");
  });

  /* specs open on wide screens, folded on phones */
  if(matchMedia("(min-width: 861px)").matches)document.querySelectorAll("details[data-open-wide]").forEach(d=>d.open=true);

  /* ---------- More code: highlight the card in focus ----------
     one card per row (phones): the card nearest the middle of the screen, with a dead zone so it never flickers.
     several cards per row (desktop): only the card under the mouse, so scrolling can't make it jump. */
  const repos=[...document.querySelectorAll(".repo")];
  if(repos.length){
    const multiRow=()=>repos.length>1&&Math.abs(repos[0].offsetTop-repos[1].offsetTop)<4;
    const set=el=>repos.forEach(r=>r.classList.toggle("is-active",r===el));
    let hover=null,rafR=0;
    const pickR=()=>{
      rafR=0;
      if(multiRow()){set(hover);return}
      const mid=innerHeight/2,box=repos[0].parentElement.getBoundingClientRect();
      if(box.bottom<0||box.top>innerHeight){set(null);return}
      let best=null,bd=1e9;
      repos.forEach(r=>{const b=r.getBoundingClientRect();const d=Math.abs((b.top+b.bottom)/2-mid);if(d<bd){bd=d;best=r}});
      const prev=repos.find(r=>r.classList.contains("is-active"));
      if(prev&&prev!==best){const pb=prev.getBoundingClientRect();if(Math.abs((pb.top+pb.bottom)/2-mid)-bd<60)best=prev}
      if(bd>innerHeight*.6)best=null;
      set(best);
    };
    repos.forEach(r=>{r.addEventListener("mouseenter",()=>{hover=r;if(multiRow())set(r)});r.addEventListener("mouseleave",()=>{if(hover===r)hover=null;if(multiRow())set(null)})});
    addEventListener("scroll",()=>{if(!rafR)rafR=requestAnimationFrame(pickR)},{passive:true});
    addEventListener("resize",pickR);pickR();
  }

  /* ---------- gallery mosaic: new random order on every visit ---------- */
  const mos=$(".mosaic[data-pool]");
  if(mos){
    const pool=mos.dataset.pool.split(" ");
    for(let i=pool.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]]}
    mos.querySelectorAll(".mtrack").forEach((tr,r)=>{
      const imgs=[...tr.querySelectorAll("img")],n=imgs.length/2;
      imgs.forEach((im,k)=>{im.src=pool[(r*n+(k%n))%pool.length]});
      tr.style.animationDelay=-(Math.random()*60)+"s";
    });
  }

  /* ---------- jump menu ---------- */
  const jump=$("#jump");
  if(jump){
    const btn=jump.querySelector(".jump-btn"),panel=$("#jumpPanel"),links=[...panel.querySelectorAll("a")];
    const targets=links.map(a=>{const h=a.getAttribute("href");return h.startsWith("#")?document.getElementById(h.slice(1)):null});
    const setOpen=on=>{jump.classList.toggle("open",on);panel.hidden=!on;btn.setAttribute("aria-expanded",on);btn.setAttribute("aria-label",on?"Close section menu":"Jump to a section")};
    // press-and-slide like an iPhone menu: hold the button, slide over the list, let go on a section to jump there.
    // A plain tap still just opens / closes the menu.
    let drag=null,ignoreClick=false;
    const items=[...panel.querySelectorAll("a")];
    const hl=a=>{items.forEach(i=>i.classList.toggle("hl",i===a));if(a&&drag.last!==a){drag.last=a;try{navigator.vibrate&&navigator.vibrate(6)}catch(e){}}};
    const itemAt=(x,y)=>{const el=document.elementFromPoint(x,y);return el?el.closest(".jump-panel a"):null};
    btn.addEventListener("pointerdown",ev=>{
      if(ev.pointerType==="mouse")return;
      drag={x:ev.clientX,y:ev.clientY,moved:false,last:null,wasOpen:!panel.hidden};
      if(panel.hidden)setOpen(true);
      try{btn.setPointerCapture(ev.pointerId)}catch(e){}
    });
    btn.addEventListener("pointermove",ev=>{
      if(!drag)return;
      if(!drag.moved&&Math.hypot(ev.clientX-drag.x,ev.clientY-drag.y)>10){drag.moved=true;jump.classList.add("sliding")}
      if(!drag.moved)return;
      ev.preventDefault();
      hl(itemAt(ev.clientX,ev.clientY));
      const r=panel.getBoundingClientRect();                       // auto-scroll a long list near its edges,
      const inside=ev.clientX>=r.left&&ev.clientX<=r.right&&ev.clientY>=r.top&&ev.clientY<=r.bottom;
      if(inside)drag.entered=true;                                  // only once the finger is inside it
      if(drag.entered&&inside&&panel.scrollHeight>panel.clientHeight+2){
        if(ev.clientY<r.top+36)panel.scrollTop-=10;else if(ev.clientY>r.bottom-36)panel.scrollTop+=10;
      }
    });
    const endDrag=ev=>{
      if(!drag)return;
      const d=drag;drag=null;jump.classList.remove("sliding");
      const target=d.moved?itemAt(ev.clientX,ev.clientY):null;
      items.forEach(i=>i.classList.remove("hl"));
      ignoreClick=true;setTimeout(()=>ignoreClick=false,350);
      if(target){
        setOpen(false);
        const href=target.getAttribute("href");
        if(href.startsWith("#"))target.click();                    // section on this page
        else if(target.target==="_blank")window.open(target.href,"_blank","noopener");
        else location.href=target.href;                            // Gallery, Lab
        return;
      }
      if(d.moved){setOpen(false);return}                            // slid off the list: just close
      if(d.wasOpen)setOpen(false);                                  // plain tap toggles
    };
    btn.addEventListener("pointerup",endDrag);
    btn.addEventListener("pointercancel",ev=>{drag=null;jump.classList.remove("sliding");items.forEach(i=>i.classList.remove("hl"))});
    btn.addEventListener("click",()=>{if(ignoreClick)return;setOpen(panel.hidden)});
    links.forEach(a=>a.addEventListener("click",()=>setOpen(false)));
    document.addEventListener("click",e=>{if(!panel.hidden&&!jump.contains(e.target))setOpen(false)});
    document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!panel.hidden){setOpen(false);btn.focus()}});
    let cur=-1,raf2=0;
    const upd=()=>{
      raf2=0;let k=0;const line=innerHeight*.45;
      targets.forEach((t,i)=>{if(t&&t.getBoundingClientRect().top<=line)k=i});
      if(innerHeight+scrollY>=document.body.scrollHeight-4){for(let i=targets.length-1;i>=0;i--)if(targets[i]){k=i;break}}
      if(k===cur)return;cur=k;
      links.forEach((a,i)=>a.classList.toggle("on",i===k));
      const c=getComputedStyle(links[k]).getPropertyValue("--c").trim();
      jump.style.setProperty("--cur",c.startsWith("conic")?"#7fb2ff":c);
    };
    addEventListener("scroll",()=>{if(!raf2)raf2=requestAnimationFrame(upd)},{passive:true});
    addEventListener("resize",upd);upd();
  }

  /* ---------- gallery filters ---------- */
  const grid=$("#ggrid"),gcount=$("#gcount");
  function filter(chip){
    const f=chip.dataset.filter;
    document.querySelectorAll("[data-filter]").forEach(c=>c.setAttribute("aria-pressed",c===chip));
    let n=0;
    grid.querySelectorAll(".gitem").forEach(it=>{
      const show=f==="all"||it.dataset.kind===f||it.dataset.proj===f;
      it.hidden=!show;if(show)n++;
    });
    gcount.textContent=`Showing ${n} items`;
  }
  if(grid){const first=$('[data-filter="all"]');first&&filter(first)}
})();
