/* The résumé page: fits the A4 sheet to the screen, opens other public versions (cv.html?v=…), share and download. */
(function(){
  "use strict";
  const $=s=>document.querySelector(s);
  let data={};try{data=JSON.parse($("#cv-data").textContent)}catch(e){}
  const stage=$("#cvStage");if(!stage)return;
  let cur=data.default;
  function fit(){
    const sh=stage.querySelector(".cvdoc");if(!sh)return;
    sh.style.zoom="";const w=stage.clientWidth-(innerWidth<600?16:48);
    const z=Math.min(1,w/sh.offsetWidth);sh.style.zoom=z<1?String(z):"";
  }
  function setFont(href){let l=$("#cv-font");if(!l){l=document.createElement("link");l.rel="stylesheet";l.id="cv-font";document.head.append(l)}if(l.href!==href)l.href=href}
  function show(id,v,env){
    v=v||(data.variants||{})[id];if(!v||!window.RTCV)return;
    cur=id;stage.innerHTML=RTCV.render(v,id,env||{});setFont(RTCV.fontHref(RTCV.normalize(v)));
    const f=(data.files||{})[id],nm=(data.names||{})[id]||"CV";
    const pdf=$("#cvPdf"),png=$("#cvPng");
    if(pdf&&f){pdf.href=f;pdf.download=nm+".pdf"}if(png&&f){png.href=f.replace(/\.pdf$/,".png");png.download=nm+".png"}
    fit();return stage.firstElementChild;
  }
  const q=new URLSearchParams(location.search).get("v");
  if(q&&q!==data.default&&(data.variants||{})[q])show(q);
  addEventListener("resize",fit);if(document.fonts)document.fonts.ready.then(fit);fit();
  const share=$("#cvShare");
  if(share)share.addEventListener("click",async()=>{
    const url=new URL("cv.html"+(cur!==data.default?"?v="+encodeURIComponent(cur):""),location.href).href;
    const title=((data.variants||{})[cur]||{}).person?.name+" — Résumé";
    try{
      const f=(data.files||{})[cur];
      if(f&&navigator.canShare){const b=await (await fetch(f)).blob(),file=new File([b],((data.names||{})[cur]||"CV")+".pdf",{type:"application/pdf"});
        if(navigator.canShare({files:[file]})){await navigator.share({files:[file],title});return}}
      if(navigator.share){await navigator.share({title,url});return}
      await navigator.clipboard.writeText(url);share.textContent="Link copied ✓";setTimeout(()=>share.textContent="Share",1800);
    }catch(e){if(e&&e.name!=="AbortError"){try{await navigator.clipboard.writeText(url);share.textContent="Link copied ✓"}catch(_){}}}
  });
  window.RTCVPage={data,show,fit,get current(){return cur},stage};
})();
