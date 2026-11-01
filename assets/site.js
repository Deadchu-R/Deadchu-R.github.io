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

  /* ---------- viewer (video + lightbox) ---------- */
  const viewer=$("#viewer"),stage=$("#viewerStage"),title=$("#viewerTitle");
  let last=null,gallery=[],gi=0,mode="";
  const pauseAll=()=>{document.querySelectorAll(".clip video").forEach(x=>x.pause());heroVideo&&heroVideo.pause()};
  const isFs=()=>document.fullscreenElement||document.webkitFullscreenElement;

  function show(){
    viewer.hidden=false;document.body.style.overflow="hidden";pauseAll();
    $("#viewerClose").focus({preventScroll:true});
  }
  function close(){
    if(viewer.hidden)return;
    if(isFs()){(document.exitFullscreen||document.webkitExitFullscreen).call(document).catch?.(()=>{})}
    viewer.hidden=true;stage.innerHTML="";viewer.className="viewer";document.body.style.overflow="";
    heroVideo&&heroVideo.play().catch(()=>{});
    last&&last.focus({preventScroll:true});
  }
  function goFullscreen(video){
    // Android/desktop: the whole player goes full screen, turned sideways on phones.
    const el=viewer;
    const req=el.requestFullscreen||el.webkitRequestFullscreen;
    if(req){
      Promise.resolve(req.call(el)).then(()=>{try{screen.orientation.lock("landscape").catch(()=>{})}catch(e){}}).catch(()=>{});
    }else if(video&&video.webkitEnterFullscreen){ // iPhone
      video.addEventListener("loadedmetadata",()=>{try{video.webkitEnterFullscreen()}catch(e){}},{once:true});
      video.addEventListener("webkitendfullscreen",close,{once:true});
    }
  }
  function openVideo(name,src,driveId){
    last=document.activeElement;mode="video";title.textContent=name;stage.innerHTML="";
    viewer.className="viewer is-video";
    let v=null;
    const drive=()=>{stage.innerHTML=`<iframe src="${drivePreview(driveId)}" allow="autoplay; fullscreen" allowfullscreen title="${name.replace(/"/g,"")}"></iframe>`};
    if(src){
      v=document.createElement("video");
      Object.assign(v,{src,controls:true,autoplay:true,loop:true,playsInline:true});
      v.addEventListener("error",drive,{once:true});
      stage.appendChild(v);
    }else drive();
    show();goFullscreen(v);
  }
  function renderImage(){
    const b=gallery[gi];
    title.textContent=b.dataset.title||(gallery.length>1?`${gi+1} / ${gallery.length}`:"");
    stage.innerHTML=`<img src="${b.dataset.full}" alt="${(b.querySelector("img")||{}).alt||""}">`;
    viewer.classList.toggle("has-nav",gallery.length>1);
  }
  function openImage(btn){
    last=btn;mode="image";viewer.className="viewer is-image";
    gallery=[...document.querySelectorAll(`.zoom[data-group="${btn.dataset.group}"]`)];
    gi=Math.max(0,gallery.indexOf(btn));renderImage();show();
  }
  function step(d){if(mode!=="image"||gallery.length<2)return;gi=(gi+d+gallery.length)%gallery.length;renderImage()}

  document.addEventListener("click",e=>{
    const c=e.target.closest(".clip");
    if(c){openVideo(c.dataset.title,c.dataset.src,c.dataset.drive);return}
    const z=e.target.closest(".zoom");
    if(z){openImage(z);return}
    const d=e.target.closest("[data-play-drive]");
    if(d){openVideo(d.dataset.title||"Video",d.dataset.src||"",d.dataset.playDrive);return}
    if(e.target.closest("#viewerPrev")){step(-1);return}
    if(e.target.closest("#viewerNext")){step(1);return}
    if(mode==="image"&&e.target===stage)close();
    const cp=e.target.closest("[data-copy]");
    if(cp){
      const el=$(cp.dataset.copy);
      const done=t=>{cp.textContent=t;setTimeout(()=>cp.textContent="Copy",1600)};
      navigator.clipboard?.writeText(el.textContent).then(()=>done("Copied"),()=>{
        const r=document.createRange();r.selectNodeContents(el);const s=getSelection();s.removeAllRanges();s.addRange(r);done("Selected")});
    }
  });
  $("#viewerClose").addEventListener("click",close);
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
  stage.addEventListener("touchstart",e=>{sx=e.touches[0].clientX},{passive:true});
  stage.addEventListener("touchend",e=>{if(sx===null)return;const dx=e.changedTouches[0].clientX-sx;if(Math.abs(dx)>50)step(dx<0?1:-1);sx=null},{passive:true});
})();
