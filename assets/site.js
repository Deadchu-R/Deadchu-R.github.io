// Clips: muted loops that play only while on screen. Tap opens the full-screen player.
// A clip with no local file shows its Drive thumbnail and plays the Drive copy when opened.
(function(){
  const drivePreview=id=>`https://drive.google.com/file/d/${id}/preview`;
  const clips=[...document.querySelectorAll(".clip")];

  const io="IntersectionObserver" in window ? new IntersectionObserver(entries=>{
    entries.forEach(en=>{
      const btn=en.target,v=btn.querySelector("video");
      if(!v||!btn.dataset.src)return;
      if(en.isIntersecting){
        if(!v.src)v.src=btn.dataset.src;
        v.play().catch(()=>{});
      }else v.pause();
    });
  },{threshold:.4}) : null;
  clips.forEach(c=>{
    const v=c.querySelector("video");
    if(v)v.addEventListener("error",()=>{c.dataset.src=""},{once:true});
    io&&io.observe(c);
  });

  const viewer=document.getElementById("viewer"),stage=document.getElementById("viewerStage"),title=document.getElementById("viewerTitle");
  const heroVideo=document.querySelector(".hero-video");
  if(heroVideo){ // portrait screens get the vertical cut of the reel
    const tall=matchMedia("(max-aspect-ratio: 1/1)").matches;
    const src=tall?heroVideo.dataset.tall:heroVideo.dataset.wide;
    heroVideo.poster=src.replace(".mp4",".jpg");heroVideo.src=src;
    heroVideo.play().catch(()=>{});
  }
  let last=null;
  function open(name,src,driveId){
    last=document.activeElement;title.textContent=name;stage.innerHTML="";
    const drive=()=>{stage.innerHTML=`<iframe src="${drivePreview(driveId)}" allow="autoplay; fullscreen" allowfullscreen title="${name.replace(/"/g,"")}"></iframe>`};
    if(src){
      const v=document.createElement("video");
      Object.assign(v,{src,controls:true,autoplay:true,loop:true,playsInline:true});
      v.addEventListener("error",drive,{once:true});
      stage.appendChild(v);
    }else drive();
    viewer.hidden=false;document.body.style.overflow="hidden";
    document.querySelectorAll(".clip video").forEach(x=>x.pause());
    heroVideo&&heroVideo.pause();
    document.getElementById("viewerClose").focus();
  }
  function close(){
    viewer.hidden=true;stage.innerHTML="";document.body.style.overflow="";
    heroVideo&&heroVideo.play().catch(()=>{});
    last&&last.focus();
  }
  document.addEventListener("click",e=>{
    const c=e.target.closest(".clip");
    if(c){open(c.dataset.title,c.dataset.src,c.dataset.drive);return}
    const d=e.target.closest("[data-play-drive]");
    if(d){open(d.dataset.title||"Video",d.dataset.src||"",d.dataset.playDrive);return}
    const cp=e.target.closest("[data-copy]");
    if(cp){
      const el=document.querySelector(cp.dataset.copy);
      const done=t=>{cp.textContent=t;setTimeout(()=>cp.textContent="Copy",1600)};
      navigator.clipboard?.writeText(el.textContent).then(()=>done("Copied"),()=>{
        const r=document.createRange();r.selectNodeContents(el);const s=getSelection();s.removeAllRanges();s.addRange(r);done("Selected")});
    }
  });
  document.getElementById("viewerClose").addEventListener("click",close);
  document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!viewer.hidden)close()});
})();
