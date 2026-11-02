/* Hobbies style: the first screen is a bouldering wall. Each colored hold is a place on the site;
   tap one and the climber climbs the route up to it, then you go there. */
(function(){
  "use strict";
  const R=window.RTSkins=window.RTSkins||{};
  const COLORS=["#ff6b6b","#ffd23f","#4cd38a","#5aa2ff","#c084fc","#ff9f43"];
  const SHAPES=["M10 30c-6-12 4-24 18-24s28 6 30 18-6 22-22 24S16 42 10 30z","M8 22c2-12 18-18 30-14s20 16 14 26-20 14-32 10S6 34 8 22z","M14 12c10-8 30-6 36 6s0 26-14 30-26-2-28-14 0-16 6-22z","M6 28c0-10 10-20 24-20 10 0 24 4 26 14s-8 18-20 22-30-2-30-16z"];
  let st=null;
  const svgHold=(i)=>`<svg viewBox="0 0 64 52" aria-hidden="true"><path d="${SHAPES[i%SHAPES.length]}" fill="${COLORS[i%COLORS.length]}" stroke="#111" stroke-width="3"/><circle cx="32" cy="26" r="4" fill="#3a3a3a" stroke="#111" stroke-width="1.5"/></svg>`;
  const CLIMBER='<svg viewBox="0 0 60 80" aria-hidden="true"><g fill="none" stroke="#111" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"><path d="M30 30 L30 52"/><path d="M30 34 L14 18"/><path d="M30 34 L46 16"/><path d="M30 52 L18 70"/><path d="M30 52 L44 66"/></g><circle cx="30" cy="20" r="8" fill="#ffd9b8" stroke="#111" stroke-width="4"/><path d="M22 16 q8 -10 16 0" fill="#ff4d4d" stroke="#111" stroke-width="3"/><rect x="33" y="44" width="10" height="11" rx="3" fill="#5aa2ff" stroke="#111" stroke-width="3"/></svg>';
  function on(){
    const hero=document.querySelector(".hero");if(!hero||st)return;
    const wall=document.createElement("div");wall.className="hb-wall";
    hero.querySelector(".hero-media").after(wall);
    st={hero,wall,holds:[],at:0,busy:false};
    st.ro=new ResizeObserver(layout);st.ro.observe(hero);layout();
  }
  function places(){
    const out=[...document.querySelectorAll(".hero .hero-links a")].map(a=>({label:(a.textContent||"").trim(),href:a.getAttribute("href")}));
    document.querySelectorAll(".topbar nav a").forEach(a=>{const href=a.getAttribute("href")||"",label=(a.textContent||"").trim();
      if(!/#projects|#contact/.test(href)&&!out.some(o=>o.href===href))out.push({label,href})});
    out.push({label:"Top out: say hi",href:"#contact"});
    return out.slice(0,7);
  }
  function layout(){
    if(!st)return;const {hero,wall}=st,W=hero.clientWidth,H=hero.clientHeight,mobile=W<760;
    const panel=hero.querySelector(".hero-panel"),hr=hero.getBoundingClientRect(),pr=panel?panel.getBoundingClientRect():null;
    // the route zigzags up: on computers in the right half, on phones in the space above the text
    const top=mobile?84:110,bottom=mobile&&pr?Math.max(top+160,pr.top-hr.top-40):H-140,left=mobile?.12:Math.max(.58,pr?(pr.right-hr.left)/W+.05:.58),right=mobile?.88:.95;
    const P=places().slice(0,mobile?5:7),n=P.length;
    wall.innerHTML="";st.holds=[];
    P.forEach((p,i)=>{
      const k=n>1?i/(n-1):0,y=bottom-(bottom-top)*k,x=W*(left+(right-left)*(i%2?.78:.22)+(i%3===2?.06:0));
      const a=document.createElement("a");a.className="hb-hold";a.href=p.href;a.style.left=x+"px";a.style.top=y+"px";a.innerHTML=svgHold(i)+`<span class="hb-tag">${p.label.replace(/[<>&]/g,"")}</span>`;
      a.addEventListener("click",e=>{if((document.documentElement.classList.contains("rt-on")&&!document.documentElement.classList.contains("rt-preview")))return;e.preventDefault();climb(i,p.href)});
      wall.append(a);st.holds.push({x,y});
    });
    // start: the climber hangs on the first hold
    const c=document.createElement("div");c.className="hb-climber";c.innerHTML=CLIMBER;wall.append(c);st.c=c;
    const s=st.holds[Math.min(st.at,st.holds.length-1)]||{x:W*.7,y:H-120};c.style.left=s.x+"px";c.style.top=s.y+"px";
    if(!st.at){const t=document.createElement("div");t.className="hb-hint";t.textContent="Tap a hold to climb there!";const h0=st.holds[0];
      if(h0){t.style.left=Math.max(8,Math.min(W-220,h0.x-180))+"px";t.style.top=(h0.y+44)+"px"}wall.append(t);st.hint=t}
  }
  function climb(i,href){
    if(!st||st.busy)return;st.busy=true;if(st.hint)st.hint.remove();
    const go=()=>{if(href&&href.startsWith("#")){const t=document.querySelector(href);if(t)t.scrollIntoView({behavior:"smooth"})}else if(href)location.href=href;st.busy=false};
    const path=[];const dir=i>st.at?1:-1;for(let k=st.at;k!==i;k+=dir)path.push(k+dir);
    if(!path.length){go();return}
    let n=0;const next=()=>{if(!st)return;if(n>=path.length){st.at=i;setTimeout(go,260);return}const h=st.holds[path[n++]];st.c.style.left=h.x+"px";st.c.style.top=h.y+"px";setTimeout(next,330)};
    next();
  }
  function off(){if(!st)return;st.ro.disconnect();st.wall.remove();st=null}
  R.hobbies={on,off};
  const start=()=>{if(document.documentElement.dataset.skin==="hobbies")on()};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start();
})();
