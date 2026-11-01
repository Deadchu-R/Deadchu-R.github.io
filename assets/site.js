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
  const viewer=$("#viewer"),stage=$("#viewerStage"),title=$("#viewerTitle"),cap=$("#viewerCap"),infoBtn=$("#viewerInfo");
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
    heroVideo&&heroVideo.play().catch(()=>{});
    last&&last.focus({preventScroll:true});
  }
  function goFullscreen(video){
    if(isFs())return;
    const req=viewer.requestFullscreen||viewer.webkitRequestFullscreen;
    if(req){
      try{Promise.resolve(req.call(viewer)).then(()=>{fsOwned=true;try{screen.orientation.lock("landscape").catch(()=>{})}catch(e){}}).catch(()=>{})}catch(e){}
    }else if(video&&video.webkitEnterFullscreen){ // iPhone: native player
      video.addEventListener("loadedmetadata",()=>{try{video.webkitEnterFullscreen()}catch(e){}},{once:true});
      video.addEventListener("webkitendfullscreen",close,{once:true});
    }
  }
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
    requestAnimationFrame(()=>{infoBtn.hidden=cap.scrollHeight<=cap.clientHeight+1});
    if(vid)return playInStage(el.dataset.title,el.dataset.src,el.dataset.drive||el.dataset.playDrive);
    stage.innerHTML=`<img src="${el.dataset.full}" alt="${(el.querySelector("img")||{}).alt||""}">`;
    return null;
  }
  function open(el){
    last=document.activeElement;open_=true;
    const g=el.dataset.group;
    let list=[el];
    if(g)list=[...document.querySelectorAll(`[data-group="${g}"]`)].filter(visible);
    else if(el.classList.contains("clip"))list=[...document.querySelectorAll(".clip:not([data-group])")];
    gallery=list;gi=Math.max(0,gallery.indexOf(el));
    const v=render();
    viewer.hidden=false;document.body.style.overflow="hidden";pauseAll();
    $("#viewerClose").focus({preventScroll:true});
    if(v)goFullscreen(v);
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
  // leaving full screen (Back button, Esc, the player's own button) closes the player
  ["fullscreenchange","webkitfullscreenchange"].forEach(ev=>document.addEventListener(ev,()=>{if(!isFs()&&fsOwned){fsOwned=false;close()}}));
  // swipe between images
  let sx=null;
  stage.addEventListener("touchstart",e=>{sx=e.target.tagName==="VIDEO"&&e.touches[0].clientY>stage.clientHeight-70?null:e.touches[0].clientX},{passive:true});
  stage.addEventListener("touchend",e=>{if(sx===null)return;const dx=e.changedTouches[0].clientX-sx;if(Math.abs(dx)>50)step(dx<0?1:-1);sx=null},{passive:true});

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
