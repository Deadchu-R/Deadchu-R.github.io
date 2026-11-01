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
      if(!v||!btn.dataset.src)return;
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

  /* ---------- viewer: one gallery per kind (clips, screenshots, characters) ---------- */
  const viewer=$("#viewer"),stage=$("#viewerStage"),title=$("#viewerTitle");
  let last=null,gallery=[],gi=0,mode="";
  const pauseAll=()=>{document.querySelectorAll(".clip video").forEach(x=>x.pause());heroVideo&&heroVideo.pause()};
  const isFs=()=>document.fullscreenElement||document.webkitFullscreenElement;
  const count=()=>gallery.length>1?`${gi+1} / ${gallery.length}`:"";

  function show(){
    viewer.hidden=false;document.body.style.overflow="hidden";pauseAll();
    viewer.classList.toggle("has-nav",gallery.length>1);
    $("#viewerClose").focus({preventScroll:true});
  }
  function close(){
    if(viewer.hidden)return;
    mode="";
    if(isFs()){try{(document.exitFullscreen||document.webkitExitFullscreen).call(document)}catch(e){}}
    viewer.hidden=true;stage.innerHTML="";viewer.className="viewer";document.body.style.overflow="";
    heroVideo&&heroVideo.play().catch(()=>{});
    last&&last.focus({preventScroll:true});
  }
  function goFullscreen(video){
    if(isFs())return;
    const req=viewer.requestFullscreen||viewer.webkitRequestFullscreen;
    if(req){
      try{Promise.resolve(req.call(viewer)).then(()=>{try{screen.orientation.lock("landscape").catch(()=>{})}catch(e){}}).catch(()=>{})}catch(e){}
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
    const el=gallery[gi];
    if(mode==="video"){
      const n=el.dataset.title;title.textContent=count()?`${n} · ${count()}`:n;
      return playInStage(n,el.dataset.src,el.dataset.drive||el.dataset.playDrive);
    }
    title.textContent=[el.dataset.title,count()].filter(Boolean).join(" · ");
    stage.innerHTML=`<img src="${el.dataset.full}" alt="${(el.querySelector("img")||{}).alt||""}">`;
  }
  function open(kind,el,list){
    last=document.activeElement;mode=kind;
    viewer.className="viewer "+(kind==="video"?"is-video":"is-image");
    gallery=list&&list.length?list:[el];gi=Math.max(0,gallery.indexOf(el));
    const v=render();show();
    if(kind==="video")goFullscreen(v);
  }
  function step(d){if(!mode||gallery.length<2)return;gi=(gi+d+gallery.length)%gallery.length;render()}

  document.addEventListener("click",e=>{
    const c=e.target.closest(".clip");
    if(c){open("video",c,[...document.querySelectorAll(".clip")]);return}
    const z=e.target.closest(".zoom");
    if(z){open("image",z,[...document.querySelectorAll(`.zoom[data-group="${z.dataset.group}"]`)]);return}
    const d=e.target.closest("[data-play-drive]");
    if(d){if(!d.dataset.title)d.dataset.title="Video";open("video",d,[d]);return}
    if(e.target.closest("#viewerPrev")){step(-1);return}
    if(e.target.closest("#viewerNext")){step(1);return}
    if(mode==="image"&&e.target===stage)close();
    if(e.target.closest("#viewerClose")){close();return}
    const cp=e.target.closest("[data-copy]");
    if(cp){
      const el=$(cp.dataset.copy);
      const done=t=>{cp.textContent=t;setTimeout(()=>cp.textContent="Copy",1600)};
      navigator.clipboard?.writeText(el.textContent).then(()=>done("Copied"),()=>{
        const r=document.createRange();r.selectNodeContents(el);const s=getSelection();s.removeAllRanges();s.addRange(r);done("Selected")});
    }
  });
  document.addEventListener("keydown",e=>{
    if(viewer.hidden)return;
    if(e.key==="Escape")close();
    if(e.key==="ArrowLeft")step(-1);
    if(e.key==="ArrowRight")step(1);
  });
  // leaving full screen (Back button, Esc, the player's own button) closes the player
  ["fullscreenchange","webkitfullscreenchange"].forEach(ev=>document.addEventListener(ev,()=>{if(!isFs()&&mode==="video")close()}));
  // swipe between images
  let sx=null;
  stage.addEventListener("touchstart",e=>{sx=e.target.tagName==="VIDEO"&&e.touches[0].clientY>stage.clientHeight-70?null:e.touches[0].clientX},{passive:true});
  stage.addEventListener("touchend",e=>{if(sx===null)return;const dx=e.changedTouches[0].clientX-sx;if(Math.abs(dx)>50)step(dx<0?1:-1);sx=null},{passive:true});
})();
