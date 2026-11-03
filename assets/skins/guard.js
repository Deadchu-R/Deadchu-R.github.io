/* Readability guard for the site styles: any text whose color is too close to what is behind it
   is switched to black or white (with a soft shadow over pictures). Runs after the style loads and after edits. */
(function(){
  "use strict";
  const P=s=>{const m=String(s||"").match(/rgba?\(([^)]+)\)/);if(!m)return null;const a=m[1].split(/[ ,/]+/).filter(Boolean).map(Number);return{r:a[0],g:a[1],b:a[2],a:a.length>3?a[3]:1}};
  const lum=c=>{const f=v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)};return .2126*f(c.r)+.7152*f(c.g)+.0722*f(c.b)};
  const ratio=(a,b)=>{const x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)};
  const mix=(top,under)=>({r:top.r*top.a+under.r*(1-top.a),g:top.g*top.a+under.g*(1-top.a),b:top.b*top.a+under.b*(1-top.a),a:1});
  function bgOf(el){
    // what is behind this text: solid colors are blended down the tree; a gradient counts as its average color; a picture counts as "photo"
    const layers=[];
    for(let n=el;n&&n.nodeType===1;n=n.parentElement){
      const cs=getComputedStyle(n),bi=cs.backgroundImage,bc=P(cs.backgroundColor);
      if(bc&&bc.a>0)layers.push(bc);
      if(bc&&bc.a>=.95)break;
      if(bi&&bi!=="none"){
        if(/url\(/.test(bi)&&!/gradient/.test(bi)&&!/data:image\/svg/.test(bi)){return{photo:true}}   // small drawn doodles (svg) don't count
        const cols=(bi.match(/rgba?\([^)]+\)/g)||[]).map(P).filter(c=>c&&c.a>.3);
        if(cols.length&&!/repeating|radial-gradient\(circle/.test(bi)){const n_=cols.length;layers.push({r:cols.reduce((s,c)=>s+c.r,0)/n_,g:cols.reduce((s,c)=>s+c.g,0)/n_,b:cols.reduce((s,c)=>s+c.b,0)/n_,a:Math.min(1,cols.reduce((s,c)=>s+c.a,0)/n_)});if(layers[layers.length-1].a>=.9)break}
      }
      if(n.matches("img,video,canvas"))return{photo:true};
      // bands with pictures or video laid behind the text (lab teaser, next-project band, page headers)
      if(n.matches(".lab-teaser,.next-band,.phero,.hero")){const rg=document.createRange();rg.selectNodeContents(el);const er=rg.getBoundingClientRect();
        if([...n.querySelectorAll("img,video,canvas")].some(m=>{if(m.offsetParent===null||m.closest(".next-art,.mascot,.hero-panel")||+getComputedStyle(m).opacity<=.15)return false;const r=m.getBoundingClientRect();return r.left<er.right&&r.right>er.left&&r.top<er.bottom&&r.bottom>er.top}))return{photo:true}}
    }
    let c={r:255,g:255,b:255,a:1};for(let i=layers.length-1;i>=0;i--)c=mix(layers[i],c);return c;
  }
  const BLACK={r:17,g:17,b:17,a:1},WHITE={r:255,g:255,b:255,a:1};
  // Check all text on the page (or under root) and fix colors that are hard to read.
  function fix(root){
    const skin=document.documentElement.dataset.skin;
    if(!skin||skin==="classic"){document.querySelectorAll("[data-guard]").forEach(el=>{el.style.removeProperty("color");el.style.removeProperty("-webkit-text-fill-color");el.style.removeProperty("text-shadow");delete el.dataset.guard});return}
    const els=(root||document.body).querySelectorAll("h1,h2,h3,h4,p,li,a,span,b,strong,em,small,label,figcaption,summary,dt,dd,td,th,div,button,pre,code");
    for(const el of els){
      if(el.closest(".cvdoc,.rt-ui,svg,.bp,.viewer,.rt-pm,.rt-modal")||el.dataset.guard==="keep")continue;
      if(![...el.childNodes].some(n=>n.nodeType===3&&n.textContent.trim()))continue;
      if(el.dataset.guard){el.style.removeProperty("color");el.style.removeProperty("-webkit-text-fill-color");el.style.removeProperty("text-shadow");delete el.dataset.guard}
      const cs=getComputedStyle(el);if(cs.visibility==="hidden"||cs.display==="none")continue;
      if(parseFloat(cs.webkitTextStrokeWidth)>0)continue;                       // outlined comic titles are readable by design
      const fg=P(cs.webkitTextFillColor&&cs.webkitTextFillColor!==cs.color&&!/^rgba?\(0, 0, 0, 0\)$/.test(cs.webkitTextFillColor)?cs.webkitTextFillColor:cs.color);if(!fg)continue;
      const bg=bgOf(el);
      if(bg.photo){if(lum(fg)<.35){el.style.setProperty("color","#fff","important");el.style.setProperty("-webkit-text-fill-color","#fff","important");el.style.setProperty("text-shadow","0 1px 3px rgba(0,0,0,.85),0 0 10px rgba(0,0,0,.6)","important");el.dataset.guard="1"}continue}
      const f=fg.a<1?mix(fg,bg):fg;
      const big=parseFloat(cs.fontSize)>=22||(parseFloat(cs.fontSize)>=18&&+cs.fontWeight>=700);
      if(ratio(f,bg)>=(big?3:4.2))continue;
      const use=ratio(BLACK,bg)>=ratio(WHITE,bg)?"#111":"#fff";
      el.style.setProperty("color",use,"important");el.style.setProperty("-webkit-text-fill-color",use,"important");el.dataset.guard="1";
    }
  }
  let t=null;const soon=(ms)=>{clearTimeout(t);t=setTimeout(()=>fix(),ms||400)};
  window.RTGuard={fix,soon};
  const start=()=>{soon(300);if(document.fonts)document.fonts.ready.then(()=>soon(200));addEventListener("load",()=>soon(200))};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start();
})();
