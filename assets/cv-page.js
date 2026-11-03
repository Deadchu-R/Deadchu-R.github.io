/* The résumé page: fits the A4 sheet to the screen, opens other public versions (cv.html?v=…), share and download. */
(function(){
  "use strict";
  const $=s=>document.querySelector(s);
  let data={};try{data=JSON.parse($("#cv-data").textContent)}catch(e){}
  const stage=$("#cvStage");if(!stage)return;
  let cur=data.default;
  // Scale the A4 sheet to fit the screen width.
  function fit(){
    const sh=stage.querySelector(".cvdoc");if(!sh)return;
    sh.style.zoom="";const w=stage.clientWidth-(innerWidth<600?16:48);
    const z=Math.min(1,w/sh.offsetWidth);sh.style.zoom=z<1?String(z):"";
  }
  // Load the résumé's font from Google Fonts.
  function setFont(href){let l=$("#cv-font");if(!l){l=document.createElement("link");l.rel="stylesheet";l.id="cv-font";document.head.append(l)}if(l.href!==href)l.href=href}
  // Show résumé id (data v) on the page and point the download/share buttons at its files.
  function show(id,v,env){
    v=v||(data.variants||{})[id];if(!v||!window.RTCV)return;
    cur=id;stage.innerHTML=RTCV.render(v,id,env||{icons:data.icons||{}});setFont(RTCV.fontHref(RTCV.normalize(v)));
    const f=(data.files||{})[id],nm=(data.names||{})[id]||"CV";
    const pdf=$("#cvPdf"),png=$("#cvPng");
    if(pdf&&f){pdf.href=f;pdf.download=nm+".pdf"}if(png&&f){png.href=f.replace(/\.pdf$/,".png");png.download=nm+".png"}
    fit();return stage.firstElementChild;
  }
  const q=new URLSearchParams(location.search).get("v");
  if(q&&q!==data.default&&(data.variants||{})[q])show(q);
  addEventListener("resize",fit);if(document.fonts)document.fonts.ready.then(fit);fit();
  // share: the PDF itself (WhatsApp, mail…) through the phone's share menu; the file is fetched ahead so the menu opens right away
  const share=$("#cvShare"),cache={};
  const fileOf=id=>(data.files||{})[id];
  // The résumé's PDF as a Blob (for sharing to WhatsApp, mail… via the phone's share menu).
  async function blobFor(id){const f=fileOf(id);if(!f)return null;if(!cache[id])cache[id]=fetch(f).then(r=>r.ok?r.blob():null).catch(()=>null);return cache[id]}
  setTimeout(()=>blobFor(cur),1200);
  const note=(el,t)=>{if(el._h==null)el._h=el.innerHTML;el.textContent=t;clearTimeout(el._t);el._t=setTimeout(()=>{el.innerHTML=el._h},2600)};
  if(share)share.addEventListener("click",async e=>{
    e.preventDefault();
    const url=new URL("cv.html"+(cur!==data.default?"?v="+encodeURIComponent(cur):""),location.href).href;
    const name=(((data.variants||{})[cur]||{}).person||{}).name||"Résumé";
    const b=cache[cur]?await cache[cur]:null;
    try{
      if(b&&navigator.canShare){const file=new File([b],((data.names||{})[cur]||"CV")+".pdf",{type:"application/pdf"});
        if(navigator.canShare({files:[file]})){await navigator.share({files:[file],title:name+" — Résumé",text:url});return}}
      if(navigator.share){await navigator.share({title:name+" — Résumé",text:name+" — Résumé",url});return}
      await navigator.clipboard.writeText(url);note(share,"Link copied ✓");
    }catch(err){if(err&&err.name==="AbortError")return;try{await navigator.clipboard.writeText(url);note(share,"Link copied ✓")}catch(_){note(share,"Couldn't share")}}
  });
  share&&share.addEventListener("pointerenter",()=>blobFor(cur));
  ["#cvPdf","#cvPng"].forEach(s_=>{const a=$(s_);if(a)a.addEventListener("click",()=>setTimeout(()=>note(a,"Saved to Downloads ✓"),300))});
  window.RTCVPage={data,show,fit,get current(){return cur},stage};
})();
