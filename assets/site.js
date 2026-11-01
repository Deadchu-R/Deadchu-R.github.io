// Clips: muted loops that play only while on screen. Tap (or the full-screen icon) opens the video
// full screen, like YouTube. Screenshots and character art open in a zoomable lightbox.
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
    viewer.classList.remove("cap-open");infoBtn.setAttribute("aria-expanded","false");
    const more=el.dataset.more||"";moreText.textContent=more;
    moreLink.hidden=!el.dataset.href;if(el.dataset.href)moreLink.href=el.dataset.href;
    infoBtn.hidden=!more;
    credit.textContent=el.dataset.credit||"";credit.hidden=!el.dataset.credit||!vid;
    if(vid)return playInStage(el.dataset.title,el.dataset.src,el.dataset.drive||el.dataset.playDrive);
    stage.innerHTML=`<img src="${el.dataset.full}" alt="${(el.querySelector("img")||{}).alt||""}">`;
    return null;
  }
  function closeTileInfo(){document.querySelectorAll(".gitem.show-info").forEach(f=>{f.classList.remove("show-info");f.querySelector(".info").setAttribute("aria-expanded","false")})}
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
    if(e.target.closest("#viewerInfo")){const on=viewer.classList.toggle("cap-open");infoBtn.setAttribute("aria-expanded",on);return}
    const gi_=e.target.closest(".gitem .info");
    if(gi_){
      const fig=gi_.closest(".gitem"),on=!fig.classList.contains("show-info");
      document.querySelectorAll(".gitem.show-info").forEach(f=>{f.classList.remove("show-info");f.querySelector(".info").setAttribute("aria-expanded","false")});
      fig.classList.toggle("show-info",on);gi_.setAttribute("aria-expanded",on);return;
    }
    if(!e.target.closest(".gitem.show-info"))document.querySelectorAll(".gitem.show-info").forEach(f=>{f.classList.remove("show-info");f.querySelector(".info").setAttribute("aria-expanded","false")});
    const item=e.target.closest(".clip,.zoom,[data-play-drive]");
    if(item&&!viewer.contains(item)){if(!item.dataset.title&&isVideo(item))item.dataset.title="Video";open(item);return}
    if(e.target.closest("#viewerPrev")){step(-1);return}
    if(e.target.closest("#viewerNext")){step(1);return}
    if(e.target.closest("#viewerClose")){close();return}
    if(open_&&e.target===stage&&!isVideo(gallery[gi])){close();return}
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

  /* ---------- projects band follows the card in view ---------- */
  const band=$(".palette-band");
  if(band){
    const cards=[...band.querySelectorAll(".ptile")],root=document.documentElement;
    let raf=0,cur=null;
    const pick=()=>{
      raf=0;
      const r=band.getBoundingClientRect(),vh=innerHeight;
      if(r.bottom<0||r.top>vh)return;
      const mid=vh/2;let best=null,bd=1e9;
      cards.forEach(c=>{const b=c.getBoundingClientRect();const d=Math.abs((b.top+b.bottom)/2-mid);if(d<bd){bd=d;best=c}});
      const before=cards.length&&cards[0].getBoundingClientRect().top>vh*.75;
      const top=before?"#1758b0":best.dataset.mid,bottom=before?"#0c2f6e":best.dataset.deep;
      cards.forEach(c=>c.classList.toggle("is-active",!before&&c===best));
      if(top!==cur){cur=top;root.style.setProperty("--band-top",top);root.style.setProperty("--band-bottom",bottom)}
    };
    addEventListener("scroll",()=>{if(!raf)raf=requestAnimationFrame(pick)},{passive:true});
    addEventListener("resize",pick);pick();
  }

  /* ---------- reveal on scroll ---------- */
  if("IntersectionObserver" in window&&!matchMedia("(prefers-reduced-motion: reduce)").matches){
    const els=[];
    const add=(sel,stagger)=>document.querySelectorAll(sel).forEach((el,i)=>{el.classList.add("reveal");if(stagger)el.style.setProperty("--d",(i%3)*.1+"s");els.push(el)});
    add(".sec-head");add(".ptile",1);add(".now-copy");add(".bp");add(".timeline li",1);add(".lab-row");add(".foot-grid > *",1);
    const extra=[...document.querySelectorAll(".timeline,.foot")];
    document.documentElement.classList.add("rv");
    const ro=new IntersectionObserver(en=>en.forEach(x=>{if(x.isIntersecting){x.target.classList.add("in");ro.unobserve(x.target)}}),{threshold:.15,rootMargin:"0px 0px -8% 0px"});
    [...els,...extra].forEach(el=>ro.observe(el));
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
    const targets=links.map(a=>document.getElementById(a.hash.slice(1)));
    const setOpen=on=>{jump.classList.toggle("open",on);panel.hidden=!on;btn.setAttribute("aria-expanded",on);btn.setAttribute("aria-label",on?"Close section menu":"Jump to a section")};
    btn.addEventListener("click",()=>setOpen(panel.hidden));
    links.forEach(a=>a.addEventListener("click",()=>setOpen(false)));
    document.addEventListener("click",e=>{if(!panel.hidden&&!jump.contains(e.target))setOpen(false)});
    document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!panel.hidden){setOpen(false);btn.focus()}});
    let cur=-1,raf2=0;
    const upd=()=>{
      raf2=0;let k=0;const line=innerHeight*.45;
      targets.forEach((t,i)=>{if(t&&t.getBoundingClientRect().top<=line)k=i});
      if(innerHeight+scrollY>=document.body.scrollHeight-4)k=targets.length-1;
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
