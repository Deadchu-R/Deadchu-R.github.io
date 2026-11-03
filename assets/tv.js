/* The TV app: a Netflix-style screen for the remote, built from the site's own pages (so it updates by itself).
   ← → move along a row, ↑ ↓ between rows, OK opens / plays, Back closes / returns, CH ▲▼ jump rows, ← at the start opens the menu. */
(function(){
  "use strict";
  const $=(s,r)=>(r||document).querySelector(s),$$=(s,r)=>[...(r||document).querySelectorAll(s)];
  const h=(tag,attrs,...kids)=>{const el=document.createElement(tag);for(const[k,v]of Object.entries(attrs||{})){if(k==="class")el.className=v;else if(k==="style")el.setAttribute("style",v);else if(v!=null&&v!==false)el.setAttribute(k,v===true?"":v)}for(const c of kids.flat())if(c!=null&&c!==false)el.append(c.nodeType?c:document.createTextNode(c));return el};
  const txt=el=>(el&&el.textContent||"").replace(/\s+/g," ").trim();
  const big=src=>String(src||"").replace(/-s\.jpg$/,".jpg");
  const root=$("#tv");
  // Fetch a site page and parse it.
  async function page(url){const r=await fetch(url,{cache:"no-cache"});if(!r.ok)throw new Error(url);return new DOMParser().parseFromString(await r.text(),"text/html")}

  // Build the TV rows from index.html and gallery.html (projects, code, clips, pictures, about, links).
  async function load(){
    const [idx,gal]=await Promise.all([page("index.html"),page("gallery.html").catch(()=>null)]);
    const clipsOf=key=>gal?$$(`.gitem[data-proj="${key}"]`,gal).map(f=>{const b=$(".clip,.zoom",f);if(!b)return null;const v=$("video",b),im=$("img",b);
      return{title:b.dataset.title||txt($("b",f)),desc:b.dataset.cap||"",img:(v&&v.getAttribute("poster"))||(im&&im.getAttribute("src"))||"",video:b.classList.contains("clip")?(b.dataset.src||""):"",drive:b.dataset.drive||"",
        full:b.dataset.full||"",kind:b.classList.contains("clip")?"video":"image",href:b.dataset.href||"",more:b.dataset.more||""}}).filter(Boolean):[];
    const rows=[];
    // the showreel and the full videos
    const sr=$('[data-m="site:showreel_video"]',idx)||$(".hero .btns .btn",idx);
    const heroImg=(($(".hero-video",idx)||{}).dataset||{}).wide?"assets/hero.jpg":"assets/hero.jpg";
    const name=txt($(".hero h1",idx))||"Roee Tal",lead=txt($(".hero .lead",idx)),kick=txt($(".hero .kicker",idx));
    const show={type:"video",title:"Showreel",kick:"Watch",meta:kick,desc:(sr&&sr.dataset.cap)||lead,img:heroImg,video:sr&&sr.dataset.src,drive:sr&&(sr.dataset.playDrive||sr.dataset.drive)};
    // projects
    const projects=$$(".ptile",idx).map(a=>{const slug=(a.getAttribute("href")||"").replace(/^.*\/|\.html$/g,"");const im=$(".ptile-img img",a);const clips=clipsOf(slug);const fullv=clips.find(c=>/full/i.test(c.title));
      return{type:"project",slug,title:txt($(".ptile-title",a)),kick:txt($(".kicker",a)),meta:txt($(".role-tag",a)),desc:txt($(".ptile-hook",a)),img:big(im&&im.getAttribute("src")),thumb:im&&im.getAttribute("src"),href:a.getAttribute("href"),
        c1:a.style.getPropertyValue("--mid"),c2:a.style.getPropertyValue("--deep"),ac:a.style.getPropertyValue("--accent"),play:fullv||clips.find(c=>c.kind==="video"),clips}});
    rows.push({title:"Projects",items:projects});
    const fulls=[show].concat(projects.map(p=>p.clips.filter(c=>/full/i.test(c.title)).map(c=>Object.assign({},c,{type:"video",title:p.title+" · full video",kick:"Full video",ac:p.ac,c1:p.c1,c2:p.c2}))).flat());
    rows.push({title:"Showreel & full videos",items:fulls});
    for(const p of projects){const cl=p.clips.filter(c=>!/full/i.test(c.title));if(cl.length)rows.push({title:p.title+" · clips & pictures",items:cl.map(c=>Object.assign({},c,{type:c.kind,kick:p.title,ac:p.ac,c1:p.c1,c2:p.c2,href:p.href}))})}
    // code
    const code=$$(".repo",idx).map(a=>({type:"link",title:txt($(".repo-title",a)),kick:"Code · "+txt($(".repo-bar span:last-child",a)),meta:$$(".repo-tech span",a).map(txt).join(" · "),desc:txt($(".repo-desc",a)),href:a.getAttribute("href"),
      c1:a.style.getPropertyValue("--mid"),c2:a.style.getPropertyValue("--deep"),ac:a.style.getPropertyValue("--accent"),icon:"</>"}));
    if(code.length)rows.push({title:"More code",items:code});
    const lab=clipsOf("lab").map(c=>Object.assign({},c,{type:c.kind,kick:"Lab"})),early=clipsOf("early").map(c=>Object.assign({},c,{type:c.kind,kick:"Early work"}));
    if(lab.length)rows.push({title:"The lab",items:lab});
    if(early.length)rows.push({title:"Early work",items:early});
    // about + résumé + contact
    const about=[];
    const exp=$(".now-copy",idx);if(exp)about.push({type:"link",title:txt($("h2",exp)),kick:"Experience",desc:txt($("p.muted,.lead,p:not(.kicker)",exp)),href:"index.html?web=1#now",icon:"💼",c1:"#1f4f8e",c2:"#0c1f3e"});
    const ab=$(".band.about",idx);if(ab)about.push({type:"link",title:txt($("h2",ab))||"About me",kick:"About",desc:txt($("p.lead,p.muted",ab)),href:"index.html?web=1#about",icon:"🙂",c1:"#7a3b2e",c2:"#2a120d"});
    const ai=$(".ai-card",idx);if(ai)about.push({type:"link",title:txt($("h3",ai)),kick:txt($(".kicker",ai)),desc:txt($("p.muted",ai)),href:"index.html?web=1#about",icon:"🤖",c1:"#2e5a2e",c2:"#0d1f0d"});
    if(about.length)rows.push({title:"About me",items:about});
    const email=txt($(".foot .email",idx));
    const contact=[{type:"link",title:"Résumé",kick:"CV",desc:"Read it here or download the PDF.",href:"cv.html",icon:"📄",c1:"#5b4a1e",c2:"#1e1708"}];
    if(email)contact.push({type:"info",title:email,kick:"Email me",desc:"Write to me: I answer quickly.",icon:"✉️",c1:"#1e4f5b",c2:"#08191e"});
    $$(".foot .btns a",idx).forEach(a=>{const t=txt(a),u=a.getAttribute("href")||"";if(/mailto|cv\.html|\.pdf/i.test(u))return;contact.push({type:"link",href:u,title:t,kick:"Find me",desc:u.replace(/^https?:\/\/(www\.)?/,""),icon:/linkedin/i.test(u)?"in":/github/i.test(u)?"⌥":"🔗",c1:"#25304f",c2:"#0b0f1e"})});
    contact.push({type:"link",title:"Website view",kick:"Switch",desc:"The normal website, with the remote's arrows.",href:"index.html?web=1",icon:"🖥",c1:"#333",c2:"#111"});
    rows.push({title:"Résumé & contact",items:contact});
    return {name,lead,kick,show,rows,avatar:($(".mark-ava",idx)||{}).getAttribute?($(".mark-ava",idx).getAttribute("src")):""};
  }

  // ---------------- screen
  let D,S={area:"bill",b:0,r:0,cols:[],off:[],rail:0},els={};
  // One card in a row.
  function card(it){
    const imgs=it.thumb||it.img;
    const c=h("button",{class:"tv-card"+(imgs?"":" text"),type:"button",style:`--c1:${it.c1||"#1f2b4d"};--c2:${it.c2||"#0b0b10"}`},
      imgs?h("img",{src:imgs,alt:"",loading:"lazy"}):null,
      imgs?h("span",{class:"tv-cl"},it.title,it.kick?h("small",{},it.kick):null):[h("i",{class:"tv-ico"},it.icon||"★"),h("b",{},it.title),h("span",{},it.desc||"")],
      it.type==="video"||it.play?h("span",{class:"tv-play"},"▶"):null);
    c.addEventListener("click",()=>openItem(it));
    return c;
  }
  // Build the whole TV screen (menu rail, billboard, rows).
  function build(){
    root.innerHTML="";
    els.bg1=h("div",{class:"tv-bg"});els.bg2=h("div",{class:"tv-bg"});
    els.kick=h("p",{class:"tv-kick"});els.title=h("h1",{class:"tv-title"});els.meta=h("p",{class:"tv-meta"});els.desc=h("p",{class:"tv-desc"});
    els.play=h("button",{class:"tv-btn pri",type:"button"},"▶ Play");els.more=h("button",{class:"tv-btn",type:"button"},"ⓘ More info");
    els.play.addEventListener("click",()=>act(0));els.more.addEventListener("click",()=>act(1));
    const bill=h("section",{class:"tv-bill"},els.bg1,els.bg2,h("div",{class:"tv-brand"},D.avatar?h("img",{src:D.avatar,alt:""}):null,D.name.toUpperCase()),
      h("div",{class:"tv-info"},els.kick,els.title,els.meta,els.desc,h("div",{class:"tv-acts"},els.play,els.more)));
    els.rowsin=h("div",{class:"tv-rowsin"});
    els.rows=D.rows.map((r,i)=>{const tr=h("div",{class:"tv-track"},...r.items.map(card));
      const prev=h("button",{class:"tv-arr l",type:"button","aria-label":"Back"},"‹"),next=h("button",{class:"tv-arr r",type:"button","aria-label":"More"},"›");
      const page_=d=>{S.area="rows";S.r=i;const fit=Math.max(1,Math.floor((innerWidth*.92)/((tr.firstChild||{}).offsetWidth+innerWidth*.01||1)));S.hover=true;
        S.off[i]=Math.max(0,(S.off[i]||0)+d*fit);S.cols[i]=Math.min(r.items.length-1,S.off[i]);render()};
      prev.addEventListener("click",()=>page_(-1));next.addEventListener("click",()=>page_(1));
      const row=h("div",{class:"tv-row"},h("h2",{class:"tv-rt"},r.title),h("div",{class:"tv-trackwrap"},tr,prev,next));els.rowsin.append(row);return{row,tr,prev,next}});
    const RAIL=[["🏠","Home",()=>{S.area="bill";S.b=0}],["🎮","Projects",()=>go(0)],["▶","Videos",()=>go(1)],["</>","Code",()=>go(D.rows.findIndex(r=>r.title==="More code"))],
      ["🧪","Lab",()=>go(D.rows.findIndex(r=>r.title==="The lab"))],["📄","Résumé",()=>{location.href="cv.html"}],["✉️","Contact",()=>go(D.rows.length-1)],["🖥","Website",()=>{location.href="index.html?web=1"}]];
    els.railItems=RAIL.map(([i,l,f])=>{const b=h("button",{class:"tv-ri",type:"button"},h("i",{},i),h("span",{},l));b.addEventListener("click",()=>{f();closeRail();render()});return{b,f}});
    els.rail=h("nav",{class:"tv-rail"},...els.railItems.map(x=>x.b));
    root.append(bill,h("section",{class:"tv-rows"},els.rowsin),els.rail,h("div",{class:"tv-hint"},"◀ ▶ ▲ ▼ move  ·  OK open  ·  CH ▲▼ rows  ·  Back"));
    S.cols=D.rows.map(()=>0);
    // a pointer remote (LG Magic Remote) or a mouse works too
    addEventListener("mousemove",()=>{if(!document.documentElement.classList.contains("tv-pointer")){document.documentElement.classList.add("tv-pointer");render()}},{passive:true});
    bill.addEventListener("mouseenter",()=>{if(S.area==="rows"){S.area="bill";S.billItem=D.show;render()}});
    $$(".tv-card",root).forEach((c,k)=>c.addEventListener("mouseenter",()=>{const r=els.rows.findIndex(x=>x.tr.contains(c));S.area="rows";S.r=r;S.hover=true;S.cols[r]=[...els.rows[r].tr.children].indexOf(c);render()}));
  }
  // Go to row r.
  function go(r){if(r<0)return;S.area="rows";S.r=r;S.cols[r]=S.cols[r]||0}
  // The item under focus.
  function cur(){if(S.area==="rows")return D.rows[S.r].items[S.cols[S.r]];return S.billItem||D.show}
  let bgFlip=false,bgT=null,lastBg="";
  // Fill the billboard (big picture, title, text, buttons) for an item.
  function setBill(it){
    S.billItem=it;
    els.kick.textContent=it.kick||"";els.title.textContent=it.title||"";els.meta.textContent=it.meta||"";els.desc.textContent=it.desc||it.more||"";
    root.style.setProperty("--ac",it.ac||"#ffd23f");
    const pl=it.type==="video"||it.play,pic=it.type==="image";
    els.play.textContent=pl?"▶ Play":pic?"⤢ View":it.type==="info"?"✓ OK":"→ Open";
    els.more.style.display=(it.type==="project"||(it.href&&it.type!=="link"))?"":"none";
    const src=it.img||"";clearTimeout(bgT);
    bgT=setTimeout(()=>{if(src===lastBg)return;lastBg=src;const a=bgFlip?els.bg1:els.bg2,b=bgFlip?els.bg2:els.bg1;bgFlip=!bgFlip;
      if(src){a.style.backgroundImage=`url("${src}")`;a.classList.add("on")}else a.classList.remove("on");b.classList.remove("on")},140);
  }
  // Redraw focus, rows position and the billboard.
  function render(){
    const it=cur();setBill(it);
    els.play.classList.toggle("f",S.area==="bill"&&S.b===0);els.more.classList.toggle("f",S.area==="bill"&&S.b===1);
    const rowH=els.rows[0]?els.rows[0].row.offsetHeight:0;
    const inRows=S.area==="rows"||(S.area==="rail"&&S.prev==="rows");
    els.rowsin.style.transform=`translateY(${-(inRows?S.r:0)*rowH}px)`;
    els.rows.forEach((x,i)=>{x.row.classList.toggle("cur",inRows?i===S.r:i===0);x.row.classList.toggle("gone",inRows&&i<S.r);
      const cards=[...x.tr.children];cards.forEach((c,k)=>c.classList.toggle("f",S.area==="rows"&&i===S.r&&k===S.cols[i]));
      // the row only slides when the highlighted card would leave the screen (so a pointer can rest on a card without the row running away)
      const w=cards[0]?cards[0].offsetWidth+innerWidth*.01:0,c=S.cols[i]||0,fit=Math.max(1,Math.floor((innerWidth*.92)/(w||1)));
      let off=S.off[i]||0;if(!S.hover){if(c<off)off=c;if(c>off+fit-1)off=c-fit+1}off=Math.max(0,Math.min(off,Math.max(0,cards.length-fit)));S.off[i]=off;
      x.tr.style.transform=`translateX(${-off*w}px)`;
      if(x.prev){x.prev.hidden=off<=0;x.next.hidden=off>=cards.length-fit}});
    els.rail.classList.toggle("open",S.area==="rail");els.railItems.forEach((x,k)=>x.b.classList.toggle("f",S.area==="rail"&&k===S.rail));
  }
  // Close the left menu.
  function closeRail(){if(S.area==="rail")S.area=S.prev||"rows"}
  // OK on the billboard buttons: 0 = play/open, 1 = go to the page.
  function act(which){const it=cur();if(which===1){if(it.href)location.href=it.href;return}openItem(it)}
  // Open an item: play its clip, show its picture, or go to its page.
  function openItem(it){
    if(it.type==="project"){if(it.play)return play(it.play,it.title);location.href=it.href;return}
    if(it.type==="video")return play(it,it.title);
    if(it.type==="image")return picture(it);
    if(it.type==="link"&&it.href){location.href=it.href;return}
  }
  let over=null;
  // Close the player/picture.
  function closeOver(){if(!over)return;over.remove();over=null;render()}
  // Fade the player hints after a few seconds.
  function hintFade(o){const t=$(".tv-ohint",o),n=$(".tv-otitle",o);setTimeout(()=>{t&&t.classList.add("hide");n&&n.classList.add("hide")},3500)}
  // Play a clip full screen.
  function play(it,title){
    let media;
    if(it.video){media=h("video",{src:it.video,autoplay:true,controls:true,playsinline:true});media.addEventListener("ended",closeOver)}
    else if(it.drive)media=h("iframe",{src:`https://drive.google.com/file/d/${it.drive}/preview`,allow:"autoplay; fullscreen"});
    else return;
    over=h("div",{class:"tv-over"},media,h("div",{class:"tv-otitle"},title||""),h("div",{class:"tv-ohint"},it.video?"OK pause · ◀ ▶ 10 seconds · Back close":"Back close"));
    document.body.append(over);hintFade(over);if(media.play)media.play().catch(()=>{});
  }
  // Show a picture full screen.
  function picture(it){over=h("div",{class:"tv-over"},h("img",{src:it.full||it.img,alt:""}),h("div",{class:"tv-otitle"},it.title||""),h("div",{class:"tv-ohint"},"Back close"));document.body.append(over);hintFade(over)}

  // Remote keys: arrows, OK, Back, CH ▲▼ / Page Up/Down.
  function key(e){
    S.hover=false;
    const k=e.key,back=k==="Escape"||k==="Backspace"||k==="GoBack"||k==="BrowserBack"||e.keyCode===10009||e.keyCode===461;
    const ch=k==="ChannelUp"||k==="PageUp"||e.keyCode===427||e.keyCode===166?-1:k==="ChannelDown"||k==="PageDown"||e.keyCode===428||e.keyCode===167?1:0;
    if(over){const v=$("video",over);
      if(back){e.preventDefault();closeOver();return}
      if(v&&(k==="Enter"||k===" "||k==="MediaPlayPause")){e.preventDefault();v.paused?v.play():v.pause();return}
      if(v&&(k==="ArrowRight"||k==="MediaFastForward")){e.preventDefault();v.currentTime=Math.min(v.duration||1e9,v.currentTime+10);return}
      if(v&&(k==="ArrowLeft"||k==="MediaRewind")){e.preventDefault();v.currentTime=Math.max(0,v.currentTime-10);return}
      return}
    const R=D.rows.length;
    if(ch){e.preventDefault();if(S.area!=="rows"){S.area="rows";S.r=0}else S.r=Math.max(0,Math.min(R-1,S.r+ch));render();return}
    if(back){e.preventDefault();if(S.area==="rail"){closeRail()}else if(S.area==="rows"){if(S.r>0)S.r=0;else{S.area="bill";S.billItem=D.show}}else{if(history.length>1)history.back()}render();return}
    if(!/^Arrow|^Enter$|^ $/.test(k))return;
    e.preventDefault();
    if(S.area==="rail"){
      if(k==="ArrowUp")S.rail=Math.max(0,S.rail-1);else if(k==="ArrowDown")S.rail=Math.min(els.railItems.length-1,S.rail+1);
      else if(k==="ArrowRight")closeRail();else if(k==="Enter"||k===" "){const f=els.railItems[S.rail].f;S.area=S.prev||"rows";f()}
      render();return}
    if(S.area==="bill"){
      if(k==="ArrowRight"&&els.more.style.display!=="none")S.b=1;else if(k==="ArrowLeft"){if(S.b===1)S.b=0;else{S.prev="bill";S.area="rail"}}
      else if(k==="ArrowDown"){S.area="rows";S.r=0}else if(k==="Enter"||k===" ")act(S.b);
      render();return}
    const n=D.rows[S.r].items.length;
    if(k==="ArrowRight")S.cols[S.r]=Math.min(n-1,S.cols[S.r]+1);
    else if(k==="ArrowLeft"){if(S.cols[S.r]>0)S.cols[S.r]--;else{S.prev="rows";S.area="rail"}}
    else if(k==="ArrowDown")S.r=Math.min(R-1,S.r+1);
    else if(k==="ArrowUp"){if(S.r>0)S.r--;else{S.area="bill";S.b=0;S.billItem=D.show}}
    else if(k==="Enter"||k===" ")openItem(cur());
    render();
  }
  addEventListener("keydown",key,true);
  addEventListener("resize",()=>D&&render());
  load().then(d=>{D=d;build();S.billItem=d.show;render()}).catch(e=>{root.innerHTML="";root.append(h("div",{class:"tv-loading"},"Couldn't load the site ("+e.message+"). Press Back."))});
})();
