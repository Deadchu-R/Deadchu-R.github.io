/* Visual editor for roeetal.com.
   Open any page with ?edit (e.g. roeetal.com/?edit). Click text to type, click anything to get its
   settings (move, duplicate, delete, replace image/video, colors, layout), drag the ⠿ handle to reorder,
   then Publish: the changes are committed to GitHub and the GitHub Action rebuilds the site.
   Visitors never load this file; publishing needs your own GitHub token. */
(function(){
  if(window.__rtEdit)return;window.__rtEdit=1;
  const ME=(document.currentScript&&document.currentScript.src)||location.href;
  const REPO="Deadchu-R/Deadchu-R.github.io",BR="main",API="https://api.github.com";
  const FILES={site:"content/site.json",projects:"content/projects.json","code-pages":"content/code-pages.json",lab:"content/lab.json","early-work":"content/early-work.json",about:"content/about.json"};
  const TOKEN_KEY="rt-edit-token";
  const NEW_TOKEN="https://github.com/settings/personal-access-tokens/new?name=roeetal.com+editor&description=Visual+editor+for+roeetal.com&target_name=Deadchu-R&contents=write&actions=read";
  const store={get(k){try{return localStorage.getItem(k)||""}catch(e){return ""}},set(k,v){try{v?localStorage.setItem(k,v):localStorage.removeItem(k)}catch(e){}}};
  const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
  const h=(tag,attrs={},...kids)=>{const el=document.createElement(tag);for(const[k,v]of Object.entries(attrs)){if(k==="on")for(const[ev,fn]of Object.entries(v))el.addEventListener(ev,fn);else if(k==="class")el.className=v;else if(v!==false&&v!=null)el.setAttribute(k,v===true?"":v)}for(const c of kids.flat())if(c!=null&&c!==false)el.append(c.nodeType?c:document.createTextNode(c));return el};
  const reEsc=s=>s.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");

  /* ------------------------------------------------------------ state */
  let docs={},shas={},loaded=false;
  const dirty=new Set(),uploads=new Map();      // uploads: repo path -> Blob
  let changes=0;

  const parse=p=>{const i=p.indexOf(":");return i<0?[p,[]]:[p.slice(0,i),p.slice(i+1).split(".").filter(Boolean)]};
  function get(p){const[f,ks]=parse(p);let o=docs[f];for(const k of ks){if(o==null)return undefined;o=o[k]}return o}
  function set(p,v){
    const[f,ks]=parse(p);
    if(!ks.length)docs[f]=v;
    else{let o=docs[f];for(let i=0;i<ks.length-1;i++){const k=ks[i];if(o[k]==null)o[k]=/^\d+$/.test(ks[i+1])?[]:{};o=o[k]}o[ks[ks.length-1]]=v}
    dirty.add(f);changes++;updateBar();
  }

  /* ------------------------------------------------------------ GitHub */
  async function gh(path,opt={}){
    const r=await fetch(API+path,{...opt,cache:"no-store",headers:{Authorization:"Bearer "+store.get(TOKEN_KEY),Accept:"application/vnd.github+json",...(opt.body?{"Content-Type":"application/json"}:{})}});
    if(!r.ok){const t=await r.text().catch(()=>"");const err=new Error(r.status+" "+(t.match(/"message":"([^"]+)/)||[,t.slice(0,160)])[1]);err.status=r.status;throw err}
    return r.status===204?null:r.json();
  }
  const b64dec=s=>new TextDecoder().decode(Uint8Array.from(atob(s.replace(/\s/g,"")),c=>c.charCodeAt(0)));
  const blobB64=b=>new Promise((ok,no)=>{const r=new FileReader();r.onload=()=>ok(String(r.result).split(",")[1]);r.onerror=no;r.readAsDataURL(b)});

  async function loadDocs(){
    const out={},sh={};
    await Promise.all(Object.entries(FILES).map(async([k,path])=>{
      const r=await gh(`/repos/${REPO}/contents/${path}?ref=${BR}&t=${Date.now()}`);
      out[k]=JSON.parse(b64dec(r.content));sh[k]=r.sha;
    }));
    docs=out;shas=sh;loaded=true;
  }

  async function publish(){
    if(!dirty.size&&!uploads.size){toast("Nothing to publish yet.");return}
    setBusy("Publishing…");
    try{
      const ref=await gh(`/repos/${REPO}/git/ref/heads/${BR}`),head=ref.object.sha;
      // someone else changed the same content file since this page opened? stop instead of overwriting it
      for(const f of dirty){
        const cur=await gh(`/repos/${REPO}/contents/${FILES[f]}?ref=${head}&t=${Date.now()}`);
        if(cur.sha!==shas[f]){setBusy("");alertBox("The content changed somewhere else since you opened this page (another tab or Pages CMS). Copy anything you typed, reload, and edit again so nothing gets overwritten.");return}
      }
      const commit=await gh(`/repos/${REPO}/git/commits/${head}`);
      const tree=[];let n=0;
      for(const[p,blob]of uploads){
        setBusy(`Uploading ${++n} of ${uploads.size}…`);
        const r=await gh(`/repos/${REPO}/git/blobs`,{method:"POST",body:JSON.stringify({content:await blobB64(blob),encoding:"base64"})});
        tree.push({path:p,mode:"100644",type:"blob",sha:r.sha});
      }
      setBusy("Saving…");
      for(const f of dirty)tree.push({path:FILES[f],mode:"100644",type:"blob",content:JSON.stringify(docs[f],null,2)+"\n"});
      const t=await gh(`/repos/${REPO}/git/trees`,{method:"POST",body:JSON.stringify({base_tree:commit.tree.sha,tree})});
      const what=[...dirty].map(f=>FILES[f].replace("content/","")).concat(uploads.size?[`${uploads.size} upload${uploads.size>1?"s":""}`]:[]).join(", ");
      const c=await gh(`/repos/${REPO}/git/commits`,{method:"POST",body:JSON.stringify({message:"Edit on the site: "+what,tree:t.sha,parents:[head]})});
      await gh(`/repos/${REPO}/git/refs/heads/${BR}`,{method:"PATCH",body:JSON.stringify({sha:c.sha})});
      for(const f of dirty){const cur=await gh(`/repos/${REPO}/contents/${FILES[f]}?ref=${c.sha}`).catch(()=>null);if(cur)shas[f]=cur.sha}
      dirty.clear();uploads.clear();changes=0;updateBar();
      watchBuild(c.sha);
    }catch(err){
      setBusy("");
      alertBox(err.status===401||err.status===403||err.status===404
        ?"GitHub refused the save ("+err.message+"). The token may have expired or may be missing Contents: Read and write on Deadchu-R.github.io. Use Token… in the bar to paste a new one."
        :"Publishing failed: "+err.message+". Your edits are still here, so you can try again.");
    }
  }

  async function watchBuild(sha){
    setBusy("Published ✓ Rebuilding the site…");
    const t0=Date.now();
    for(;;){
      await new Promise(r=>setTimeout(r,8000));
      let run=null;
      try{const r=await gh(`/repos/${REPO}/actions/runs?branch=${BR}&per_page=5`);run=r.workflow_runs.find(w=>w.head_sha===sha)}
      catch(e){setBusy("");status("Published ✓ The site will be live in about 3 minutes.",true);return}
      const sec=Math.round((Date.now()-t0)/1000);
      if(run&&run.status==="completed"){
        setBusy("");
        if(run.conclusion==="success")status("Rebuilt ✓ Live in about a minute. ",true,h("button",{class:"rt-link",type:"button",on:{click:()=>location.reload()}},"Reload"));
        else status("The rebuild failed. Your text is saved; open GitHub › Actions to see why.",true);
        return;
      }
      setBusy(`Published ✓ Rebuilding the site… ${sec}s`);
      if(sec>600){setBusy("");status("Still rebuilding. Check again in a few minutes.",true);return}
    }
  }

  /* ------------------------------------------------------------ UI shell */
  const STYLE=`
  .rt-on body{touch-action:manipulation}
  .rt-on [data-e]{outline:1px dashed transparent;outline-offset:3px;border-radius:3px;transition:outline-color .15s}
  .rt-on [data-e]:hover{outline-color:rgba(255,210,63,.6)}
  .rt-on [data-e][contenteditable]{outline:2px solid #ffd23f;outline-offset:3px;background:rgba(255,210,63,.08);cursor:text}
  .rt-on [data-e]:empty::before{content:attr(data-ph);opacity:.45;font-style:italic}
  .rt-on [data-e]:empty:not([data-ph])::before{content:"double-tap to write"}
  .rt-on pre code[data-e]{display:block;white-space:pre}
  .rt-on .reveal,.rt-on [data-reveal]{opacity:1!important;transform:none!important}
  #rt-sel{position:fixed;z-index:2147483000;pointer-events:none;border:2px solid #ffd23f;border-radius:8px;box-shadow:0 0 0 1px rgba(0,0,0,.35);display:none}
  #rt-tb{position:fixed;z-index:2147483050;display:none;align-items:center;gap:2px;background:#111;border:1px solid #333;border-radius:11px;padding:3px;box-shadow:0 8px 24px rgba(0,0,0,.45)}
  #rt-tb .rt-name{color:#ffd23f;font:700 11px/1 system-ui,sans-serif;padding:0 6px 0 5px;white-space:nowrap;text-transform:uppercase;letter-spacing:.05em}
  #rt-tb button{appearance:none;width:32px;height:30px;border:0;border-radius:8px;background:none;color:#fff;font:600 16px/1 system-ui,sans-serif;cursor:pointer;display:grid;place-items:center;padding:0}
  #rt-tb button:hover:not(:disabled){background:#2a2a2a;color:#ffd23f}
  #rt-tb button:disabled{opacity:.28;cursor:default}
  #rt-tb .rt-grip{cursor:grab;touch-action:none;color:#ffd23f}
  #rt-tb .rt-sep{width:1px;height:18px;background:#333;margin:0 2px}
  #rt-tb button.on{background:#ffd23f;color:#111}
  .rt-secbar{position:absolute;z-index:60;top:8px;right:8px;display:flex;align-items:center;gap:3px;background:rgba(17,17,17,.85);border:1px solid rgba(255,210,63,.7);border-radius:10px;padding:3px;color:#ffd23f;font:700 11px/1 system-ui,sans-serif;opacity:.7;transition:opacity .15s}
  .rt-secbar:hover{opacity:1}
  .rt-secbar .rt-sl{padding:0 4px 0 6px;max-width:0;overflow:hidden;white-space:nowrap;transition:max-width .2s;text-transform:uppercase;letter-spacing:.05em}
  .rt-secbar:hover .rt-sl{max-width:200px}
  .rt-secbar button{appearance:none;width:32px;height:30px;border-radius:7px;border:0;background:#222;color:#fff;font:800 17px/1 system-ui,sans-serif;cursor:pointer}
  .rt-secbar button:hover:not(:disabled){color:#ffd23f}
  .rt-secbar button:disabled{opacity:.25;cursor:default}
  .rt-hist{display:flex;flex-direction:column;gap:6px;max-height:50vh;overflow:auto;margin:10px 0}
  .rt-hrow{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:9px 10px;border:1px solid #2c2c2c;border-radius:10px;background:#1b1b1b}
  .rt-hrow div{display:flex;flex-direction:column;gap:2px;min-width:0}
  .rt-hrow span{color:#aaa;font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .rt-cur{color:#9be15d!important;font-weight:700;font-size:13px}
  #rt-drop{position:fixed;z-index:2147483001;background:#ffd23f;border-radius:3px;pointer-events:none;display:none;box-shadow:0 0 12px #ffd23f}
  #rt-ghost{position:fixed;z-index:2147483002;pointer-events:none;opacity:.85;transform:rotate(1.5deg);box-shadow:0 18px 40px rgba(0,0,0,.5);border-radius:10px;overflow:hidden;display:none;background:#222}
  .rt-ui,.rt-ui *{box-sizing:border-box;font-family:system-ui,-apple-system,"Segoe UI",sans-serif;letter-spacing:0;text-transform:none}
  #rt-bar{position:fixed;z-index:2147483100;left:12px;bottom:12px;display:flex;gap:4px;align-items:center;background:#111;border:1px solid #333;border-radius:12px;padding:4px;box-shadow:0 8px 24px rgba(0,0,0,.45)}
  #rt-bar .rt-pub{appearance:none;border:0;border-radius:9px;background:#ffd23f;color:#111;font:700 14px/1 system-ui,sans-serif;padding:9px 14px;cursor:pointer;display:flex;align-items:center;gap:7px}
  #rt-bar .rt-pub:disabled{background:#2a2a2a;color:#888;cursor:default}
  #rt-bar .rt-pub i{width:7px;height:7px;border-radius:50%;background:#e03b3b;display:none}
  #rt-bar .rt-pub.dirty i{display:block}
  #rt-bar .rt-more{appearance:none;border:0;border-radius:9px;background:none;color:#fff;font:700 18px/1 system-ui,sans-serif;width:36px;height:34px;cursor:pointer}
  #rt-bar .rt-more:hover{background:#2a2a2a}
  #rt-toast{position:fixed;z-index:2147483100;left:12px;bottom:62px;max-width:min(420px,calc(100vw - 100px));background:#111;color:#e8e8e8;border:1px solid #333;border-radius:10px;padding:8px 12px;font:13px/1.4 system-ui,sans-serif;box-shadow:0 8px 24px rgba(0,0,0,.45);display:none}
  #rt-menu{position:fixed;z-index:2147483150;left:12px;bottom:62px;background:#151515;border:1px solid #333;border-radius:12px;padding:5px;box-shadow:0 12px 32px rgba(0,0,0,.5);display:none;min-width:190px}
  #rt-menu button{display:block;width:100%;text-align:left;appearance:none;border:0;background:none;color:#eee;font:600 14px/1 system-ui,sans-serif;padding:11px 12px;border-radius:8px;cursor:pointer}
  #rt-menu button:hover{background:#2a2a2a}
  #rt-menu .dan{color:#ff8a8a}
  .rt-btn{appearance:none;border:1px solid #444;background:#222;color:#fff;border-radius:9px;padding:8px 12px;font:600 14px/1 system-ui,sans-serif;cursor:pointer;white-space:nowrap}
  .rt-btn:hover{border-color:#ffd23f}
  .rt-btn.pri{background:#ffd23f;color:#111;border-color:#ffd23f}
  .rt-btn.dan{color:#ff8a8a}
  .rt-btn.sm{padding:6px 9px;font-size:13px}
  .rt-link{background:none;border:0;color:#ffd23f;text-decoration:underline;cursor:pointer;font:inherit;padding:0}
  #rt-panel{position:fixed;z-index:2147483060;width:300px;max-height:min(52vh,460px);overflow:auto;background:#151515;color:#eee;border:1px solid #333;border-radius:12px;box-shadow:0 14px 40px rgba(0,0,0,.5);padding:10px 12px 12px;display:none;font-size:14px}
  #rt-panel .rt-row{display:flex;flex-wrap:wrap;gap:6px}
  #rt-panel label{display:block;font-size:12px;color:#aaa;margin:10px 0 4px}
  #rt-panel input[type=text],#rt-panel select{width:100%;background:#0e0e0e;color:#fff;border:1px solid #3a3a3a;border-radius:8px;padding:8px;font:14px system-ui,sans-serif}
  #rt-panel .rt-color{display:flex;gap:6px;align-items:center}
  #rt-panel input[type=color]{width:44px;height:36px;padding:0;border:1px solid #3a3a3a;border-radius:8px;background:none;cursor:pointer;flex:none}
  #rt-panel .rt-file{font-size:12px;color:#888;word-break:break-all;margin-top:4px}
  #rt-panel .rt-head{display:flex;justify-content:space-between;align-items:center;color:#ffd23f;font:700 12px/1 system-ui,sans-serif;text-transform:uppercase;letter-spacing:.05em}
  #rt-panel .rt-x{background:none;border:0;color:#aaa;font-size:18px;cursor:pointer;padding:2px 6px}
  #rt-panel .rt-hint{color:#999;font-size:12px;margin:6px 0 0;line-height:1.4}
  .rt-modal{position:fixed;inset:0;z-index:2147483200;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;padding:16px}
  .rt-card{background:#151515;color:#eee;border:1px solid #333;border-radius:16px;max-width:520px;width:100%;padding:20px;box-shadow:0 20px 60px rgba(0,0,0,.6);font-size:15px;line-height:1.5;max-height:90vh;overflow:auto}
  .rt-card h3{margin:0 0 10px;font:800 20px/1.2 system-ui,sans-serif;color:#fff}
  .rt-card ol{padding-left:20px;margin:8px 0}
  .rt-card a{color:#ffd23f}
  .rt-card input{width:100%;margin:10px 0;background:#0e0e0e;color:#fff;border:1px solid #3a3a3a;border-radius:8px;padding:10px;font:14px ui-monospace,monospace}
  .rt-card .rt-row{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap;margin-top:8px}
  .rt-banner{position:fixed;z-index:2147483098;left:50%;top:70px;transform:translateX(-50%);background:#3b2a00;color:#ffe9a8;border:1px solid #ffd23f;border-radius:10px;padding:10px 14px;font:14px/1.4 system-ui,sans-serif;max-width:min(560px,calc(100vw - 24px));box-shadow:0 10px 30px rgba(0,0,0,.4)}
  @media (max-width:640px){
    #rt-panel{left:8px!important;right:8px;width:auto;top:auto!important;bottom:62px;max-height:40vh}
    #rt-menu{left:8px}
    #rt-toast{left:8px;right:8px;max-width:none;bottom:auto;top:64px}
    .rt-secbar .rt-sl{display:none}
  }`;
  document.head.append(h("style",{id:"rt-css"},STYLE));
  document.documentElement.classList.add("rt-on");

  const ui=h("div",{class:"rt-ui"});
  const pubBtn=h("button",{class:"rt-pub",type:"button",disabled:true,on:{click:publish}},h("i"),"Publish");
  const menu=h("div",{id:"rt-menu"});
  const item=(label,fn,cls)=>h("button",{type:"button",class:cls||"",on:{click:()=>{menu.style.display="none";fn()}}},label);
  menu.append(item("↺  Versions / undo",()=>historyBox()),item("?  How it works",()=>help()),item("🔑  GitHub token",()=>askToken()),item("✕  Exit editing",()=>exitEdit(),"dan"));
  const bar=h("div",{id:"rt-bar"},pubBtn,h("button",{class:"rt-more",type:"button",title:"More",on:{click:e=>{e.stopPropagation();menu.style.display=menu.style.display==="block"?"none":"block"}}},"⋯"));
  const toastEl=h("div",{id:"rt-toast"});
  const panel=h("div",{id:"rt-panel"});
  const sel=h("div",{id:"rt-sel"});
  const B=(glyph,title,fn,cls)=>h("button",{type:"button",title,"aria-label":title,class:cls||"",on:{click:e=>{e.stopPropagation();fn()}}},glyph);
  const tb=h("div",{id:"rt-tb",class:"rt-ui"});
  const T={
    name:h("span",{class:"rt-name"}),
    grip:h("button",{type:"button",class:"rt-grip",title:"Drag to move","aria-label":"Drag to move"},"⠿"),
    up:B("↑","Move earlier",()=>current&&step(current,-1)),
    down:B("↓","Move later",()=>current&&step(current,1)),
    edit:B("✎","Edit text",()=>clickedText&&startEdit(clickedText)),
    media:B("🖼","Replace image / video",()=>clickedMedia&&replaceMedia(clickedMedia.dataset.m,clickedMedia.dataset.mk,clickedMedia)),
    dup:B("⧉","Duplicate",()=>current&&duplicate(current)),
    del:B("🗑","Delete",()=>current&&remove(current)),
    gear:B("⚙","Settings",()=>{panelOpen=!panelOpen;renderPanel()}),
    parent:B("⤴","Select what's around it",()=>{const k=chain.indexOf(current);if(chain[k+1]){current=chain[k+1];clickedText=clickedMedia=null;panelOpen=false;renderPanel();place()}}),
  };
  tb.append(T.name,T.grip,T.up,T.down,T.edit,T.media,T.dup,T.del,T.gear,T.parent);
  const drop=h("div",{id:"rt-drop"}),ghost=h("div",{id:"rt-ghost"});
  const isIndex=!!$("#projects .ptiles");
  const linkOpts=(isIndex?["#now","#projects","#more-code","#about","#gallery-lab","#contact"]:["index.html","index.html#projects","index.html#more-code","index.html#contact"])
    .concat(["gallery.html","lab.html","Roee-Tal-CV.pdf","mailto:roeetal17@gmail.com","https://www.linkedin.com/in/roee-tal/"]);
  ui.append(h("datalist",{id:"rt-links"},...linkOpts.map(v=>h("option",{value:v}))));
  ui.append(bar,menu,toastEl,panel);document.body.append(ui,sel,tb,drop,ghost);
  document.addEventListener("click",e=>{if(!e.target.closest("#rt-menu,.rt-more"))menu.style.display="none"});

  let busyMsg="",toastTimer=0;
  function setBusy(m){busyMsg=m;updateBar()}
  function status(text,keep,...extra){
    clearTimeout(toastTimer);
    if(!text&&!extra.length){toastEl.style.display="none";return}
    toastEl.replaceChildren(text,...extra);toastEl.style.display="block";
    if(!keep)toastTimer=setTimeout(()=>{toastEl.style.display="none"},4000);
  }
  function updateBar(){
    pubBtn.classList.toggle("dirty",!!changes);
    pubBtn.disabled=!!busyMsg||!changes;
    if(busyMsg)status(busyMsg,true);
  }
  function toast(m){status(m)}
  function modal(...kids){const m=h("div",{class:"rt-modal rt-ui",on:{click:e=>{if(e.target===m)m.remove()}}},h("div",{class:"rt-card"},...kids));document.body.append(m);return m}
  function alertBox(msg){const m=modal(h("h3",{},"Heads up"),h("p",{},msg),h("div",{class:"rt-row"},h("button",{class:"rt-btn pri",type:"button",on:{click:()=>m.remove()}},"OK")))}

  function askToken(first){
    return new Promise(done=>{
      const inp=h("input",{type:"password",placeholder:"github_pat_…",autocomplete:"off",value:store.get(TOKEN_KEY)});
      const err=h("p",{style:"color:#ff8a8a;margin:0"});
      const save=async()=>{
        const v=inp.value.trim();if(!v){err.textContent="Paste the token first.";return}
        store.set(TOKEN_KEY,v);err.style.color="#aaa";err.textContent="Checking…";
        try{await loadDocs();m.remove();done(true)}catch(e){err.style.color="#ff8a8a";err.textContent="That token doesn't open the site's repo ("+e.message+").";}
      };
      const m=modal(
        h("h3",{},first===true?"One-time setup":"GitHub token"),
        h("p",{style:"margin:0"},"Publishing saves straight to the site's GitHub repo, so this browser needs a key that can write to that one repo only."),
        h("ol",{},
          h("li",{},h("a",{href:NEW_TOKEN,target:"_blank",rel:"noopener"},"Open GitHub › New fine-grained token"),"."),
          h("li",{},"Repository access: ",h("b",{},"Only select repositories")," › Deadchu-R.github.io."),
          h("li",{},"Permissions: ",h("b",{},"Contents: Read and write"),". Optional: Actions: Read, so the editor can tell you when the rebuild is done."),
          h("li",{},"Generate, copy it, paste it here.")),
        inp,err,
        h("p",{style:"font-size:13px;color:#999;margin:4px 0 0"},"It stays in this browser only. You can delete it on GitHub any time."),
        h("div",{class:"rt-row"},h("button",{class:"rt-btn",type:"button",on:{click:()=>{m.remove();done(false)}}},"Cancel"),h("button",{class:"rt-btn pri",type:"button",on:{click:save}},"Save token")));
      inp.addEventListener("keydown",e=>{if(e.key==="Enter")save()});
      setTimeout(()=>inp.focus(),50);
    });
  }
  const fmtDate=d=>new Date(d).toLocaleString("en-GB",{day:"numeric",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"});
  async function historyBox(){
    const list=h("div",{class:"rt-hist"},"Loading…");
    const m=modal(h("h3",{},"Versions"),
      h("p",{style:"margin:0"},"Every Publish is saved as a version. Restore puts all the text, order, images and videos back the way they were at that moment. The restore is a new version too, so it can be undone the same way."),
      list,h("div",{class:"rt-row"},h("button",{class:"rt-btn",type:"button",on:{click:()=>m.remove()}},"Close")));
    try{
      const commits=await gh(`/repos/${REPO}/commits?sha=${BR}&path=content&per_page=30`);
      list.replaceChildren(...commits.map((c,i)=>h("div",{class:"rt-hrow"},
        h("div",{},h("b",{},fmtDate(c.commit.committer.date)),h("span",{title:c.commit.message},c.commit.message.split("\n")[0])),
        i===0?h("span",{class:"rt-cur"},"Current"):h("button",{class:"rt-btn sm",type:"button",on:{click:()=>{m.remove();restore(c)}}},"Restore"))));
    }catch(e){list.textContent="Couldn't load the versions ("+e.message+").";}
  }
  async function restore(c){
    const when=fmtDate(c.commit.committer.date);
    if(changes&&!confirm("You have unpublished changes on this page. Restoring will throw them away. Continue?"))return;
    if(!confirm(`Restore the site to the version from ${when}?`))return;
    setBusy("Restoring…");
    try{
      const ref=await gh(`/repos/${REPO}/git/ref/heads/${BR}`),head=ref.object.sha,commit=await gh(`/repos/${REPO}/git/commits/${head}`);
      const files=await gh(`/repos/${REPO}/contents/content?ref=${c.sha}`),want=Object.values(FILES);
      const tree=files.filter(f=>want.includes(f.path)).map(f=>({path:f.path,mode:"100644",type:"blob",sha:f.sha}));
      const t=await gh(`/repos/${REPO}/git/trees`,{method:"POST",body:JSON.stringify({base_tree:commit.tree.sha,tree})});
      const nc=await gh(`/repos/${REPO}/git/commits`,{method:"POST",body:JSON.stringify({message:`Restore the version from ${when} (${c.sha.slice(0,7)})`,tree:t.sha,parents:[head]})});
      await gh(`/repos/${REPO}/git/refs/heads/${BR}`,{method:"PATCH",body:JSON.stringify({sha:nc.sha})});
      dirty.clear();uploads.clear();changes=0;updateBar();
      watchBuild(nc.sha);
    }catch(err){setBusy("");alertBox("Restoring failed: "+err.message+". Nothing was changed.")}
  }
  function help(){
    const m=modal(h("h3",{},"How editing works"),
      h("ol",{},
        h("li",{},h("b",{},"Tap"),", anything to select it. A small toolbar appears next to it."),
        h("li",{},h("b",{},"Double-tap text"),", to change it (or tap ✎). Tap outside when you're done."),
        h("li",{},h("b",{},"↑ ↓"),", move it. Whole sections have their own ↑ ↓ in the corner. You can also drag ⠿."),
        h("li",{},h("b",{},"🖼"),", replace the image or video. ",h("b",{},"⧉")," duplicate (that's how you add a new one). ",h("b",{},"🗑")," delete."),
        h("li",{},h("b",{},"⚙"),", more options: links, icons, colors, layouts, background videos. ",h("b",{},"⤴")," selects what's around it."),
        h("li",{},h("b",{},"Publish"),", saves to the site; it rebuilds in about 2 minutes. ⋯ › Versions brings back any earlier version.")),
      h("p",{style:"color:#aaa;font-size:13px"},"Publish before moving to another page. Links and videos don't open while editing; use the top menu or the jump menu to change pages."),
      h("div",{class:"rt-row"},h("button",{class:"rt-btn pri",type:"button",on:{click:()=>m.remove()}},"Got it")));
  }
  function exitEdit(){
    if(changes&&!confirm("Leave without publishing? Your changes on this page will be lost."))return;
    changes=0;try{sessionStorage.removeItem("rt-edit")}catch(e){}
    const u=new URL(location.href);u.searchParams.delete("edit");if(u.hash==="#edit")u.hash="";location.href=u.toString();
  }
  addEventListener("beforeunload",e=>{if(changes){e.preventDefault();e.returnValue=""}});

  /* ------------------------------------------------------------ text */
  const PT=(()=>{const d=document.createElement("div");try{d.contentEditable="plaintext-only";return d.contentEditable==="plaintext-only"}catch(e){return false}})();
  const norm=s=>String(s??"").replace(/\s+/g," ").trim();
  function readText(el){return el.hasAttribute("data-code")?el.innerText.replace(/ /g," "):norm(el.innerText)}
  function startEdit(el,x,y){
    if(el.isContentEditable)return;
    el.contentEditable=PT?"plaintext-only":"true";el.spellcheck=true;el.focus();
    try{
      const r=x!=null&&document.caretRangeFromPoint?document.caretRangeFromPoint(x,y):null;
      const sl=getSelection();sl.removeAllRanges();
      if(r&&el.contains(r.startContainer))sl.addRange(r);else{const rr=document.createRange();rr.selectNodeContents(el);rr.collapse(false);sl.addRange(rr)}
    }catch(e){}
    T.edit.classList.add("on");
  }
  function initText(el){
    el.addEventListener("blur",()=>{el.removeAttribute("contenteditable");T.edit.classList.remove("on");place()});
    el.addEventListener("input",()=>{
      const p=el.dataset.e;let v=readText(el);
      if(el.hasAttribute("data-code")){const old=get(p)||"";if(old.endsWith("\n")&&!v.endsWith("\n"))v+="\n"}
      set(p,v);
      $$(`[data-e="${CSS.escape(p)}"]`).forEach(o=>{if(o!==el)o.textContent=v});
    });
    el.addEventListener("keydown",e=>{if(e.key==="Enter"&&!el.hasAttribute("data-code")){e.preventDefault();el.blur()}});
    if(!PT)el.addEventListener("paste",e=>{e.preventDefault();document.execCommand("insertText",false,(e.clipboardData||window.clipboardData).getData("text"))});
  }

  /* ------------------------------------------------------------ units: anything you can select */
  const UNIT="[data-i],[data-k],[data-x],[data-m]";
  const LIST_NAMES={projects:"Project card","code-pages":"Code card",lab:"Lab clip","early-work":"Early-work clip",job_bullets:"Bullet",timeline:"Timeline entry",
    what_i_built:"Bullet",teammates_built:"Bullet",tech:"Tag",ai_tools:"Tag",hobbies:"Hobby",games:"Game",rig:"Rig part",sections:"Clip section",clips:"Clip",
    screenshots:"Screenshot",characters:"Character",about:"Paragraph",flow:"Step",code:"Code block",
    hero_buttons:"Button",gallery_lab_buttons:"Button",footer_buttons:"Button"};
  const KEY_NAMES={experience:"Experience",projects:"Projects",more_code:"More code",about:"Get to know me",gallery_lab:"Gallery & lab",code_sample:"Code sample",
    clips:"Clip sections",screenshots:"Screenshots",full_video:"Full video",characters:"Characters",credits:"Credits",flow:"How it fits together",clip:"In action",code:"The code"};
  const listOf=item=>item.parentElement&&item.parentElement.closest("[data-l]");
  const listPath=item=>{const l=listOf(item);return l&&l.dataset.l};
  function unitName(u){
    if(u.hasAttribute("data-i")){const lp=listPath(u)||"";const last=lp.split(/[:.]/).pop();return LIST_NAMES[last]||LIST_NAMES[lp]||"Item"}
    if(u.hasAttribute("data-k"))return "Section · "+(KEY_NAMES[u.dataset.k]||u.dataset.k);
    if(u.hasAttribute("data-m"))return u.dataset.mk==="video"?"Video":"Image";
    if(u.classList.contains("phero"))return "Page header";
    if(u.classList.contains("hero"))return "Top of the page";
    if(u.tagName==="FOOTER")return "Footer";
    if(/^H\d$/.test(u.tagName)||u.classList.contains("exp-kicker"))return "Heading";
    return "Settings";
  }
  const siblingsOf=u=>u.hasAttribute("data-i")?[...u.parentElement.children].filter(c=>c.hasAttribute("data-i")):[...u.parentElement.children].filter(c=>c.dataset.ok===u.dataset.ok);
  const movable=u=>u.hasAttribute("data-i")||u.hasAttribute("data-k");

  let current=null,chain=[],clickedText=null,clickedMedia=null,panelOpen=false;
  const owner=m=>{let p=m.parentElement&&m.parentElement.closest(UNIT);while(p&&p.matches("[data-m]")&&!p.matches("[data-i],[data-k],[data-x]"))p=p.parentElement&&p.parentElement.closest(UNIT);return p};
  const mediaOf=u=>[u,...u.querySelectorAll("[data-m]")].filter(m=>m.hasAttribute("data-m")&&(m===u||owner(m)===u));
  const fieldsOf=u=>{try{return u.dataset.x?JSON.parse(u.dataset.x):[]}catch(e){return []}};
  function select(target){
    chain=[];
    for(let u=target&&target.closest(UNIT);u;u=u.parentElement&&u.parentElement.closest(UNIT))chain.push(u);
    current=chain[0]||null;
    // an image inside a card selects the card (the image is replaced from the toolbar)
    if(current&&chain[1]&&current.matches("[data-m]")&&!current.matches("[data-i],[data-k],[data-x]"))current=chain[1];
    clickedText=target&&target.closest("[data-e]");if(clickedText&&current&&!current.contains(clickedText))clickedText=null;
    clickedMedia=target&&target.closest("[data-m]");
    if(!clickedMedia&&current){const m=mediaOf(current);if(m.length===1&&m[0].tagName==="IMG")clickedMedia=m[0]}
    panelOpen=false;
    renderPanel();place();
  }
  const show=(el,on)=>{el.style.display=on?"":"none"};
  function place(){
    if(!current||!document.contains(current)){sel.style.display=tb.style.display="none";panel.style.display="none";return}
    const r=current.getBoundingClientRect();
    if(!r.width&&!r.height){sel.style.display=tb.style.display="none";return}
    Object.assign(sel.style,{display:"block",left:r.left-4+"px",top:r.top-4+"px",width:r.width+8+"px",height:r.height+8+"px"});
    const mv=movable(current),sib=mv?siblingsOf(current):[],k=sib.indexOf(current);
    const horiz=sib.length>1&&Math.abs(sib[0].getBoundingClientRect().top-sib[1].getBoundingClientRect().top)<8;
    T.name.textContent=unitName(current);
    show(T.grip,mv&&sib.length>1);show(T.up,mv&&sib.length>1);show(T.down,mv&&sib.length>1);
    T.up.textContent=horiz?"←":"↑";T.down.textContent=horiz?"→":"↓";T.up.disabled=k<=0;T.down.disabled=k===sib.length-1;
    show(T.edit,!!clickedText);show(T.media,!!clickedMedia);
    show(T.dup,current.hasAttribute("data-i"));show(T.del,current.hasAttribute("data-i"));
    show(T.gear,hasSettings(current));T.gear.classList.toggle("on",panelOpen);
    show(T.parent,!!chain[chain.indexOf(current)+1]);
    tb.style.display="flex";
    const tw=tb.offsetWidth,th=tb.offsetHeight;
    let top=r.top-th-10;if(top<64)top=r.bottom+10;if(top>innerHeight-th-70)top=Math.max(64,Math.min(innerHeight-th-70,r.top+10));
    tb.style.top=top+"px";tb.style.left=Math.max(8,Math.min(innerWidth-tw-8,r.left))+"px";
    if(panelOpen&&innerWidth>640){
      const pw=panel.offsetWidth,ph=panel.offsetHeight;
      let pt=top+th+6;if(pt+ph>innerHeight-70)pt=Math.max(64,top-ph-6);
      panel.style.top=pt+"px";panel.style.left=Math.max(8,Math.min(innerWidth-pw-8,r.left))+"px";
    }
  }
  addEventListener("scroll",place,{passive:true});addEventListener("resize",place);

  /* ------------------------------------------------------------ list + order operations */
  function renumber(container,lp,remap){
    // rewrite every path inside each item from its old index to its new one (two passes so indexes can't collide)
    const items=[...container.children].filter(c=>c.hasAttribute("data-i"));
    const attrs=["data-e","data-m","data-x","data-l","data-ok","data-ico"];
    const sep=lp.includes(":")?".":":";   // top-level lists ("projects") index as projects:0, nested ones as …sections.0
    const pass=(el,from,to)=>{const re=new RegExp(reEsc(lp+sep+from)+"(?=[.\"]|$)","g");
      [el,...el.querySelectorAll("*")].forEach(n=>attrs.forEach(a=>{const v=n.getAttribute(a);if(v&&v.includes(lp+sep+from))n.setAttribute(a,v.replace(re,lp+sep+to))}))};
    items.forEach(it=>{const from=it.dataset.from??it.dataset.i,to=remap(it);pass(it,from,"\u0001"+to);it.dataset.i=to;delete it.dataset.from});
    items.forEach(it=>pass(it,"\u0001"+it.dataset.i,it.dataset.i));
  }
  function listOp(item,op){
    const lc=listOf(item),lp=lc.dataset.l,arr=get(lp);
    if(!Array.isArray(arr))return;
    const perm=arr.map((_,k)=>k),pos=perm.indexOf(+item.dataset.i);
    op(arr,perm,pos);
    set(lp,arr);
    renumber(lc,lp,it=>it.dataset.i==="new"?perm.indexOf(-1):perm.indexOf(+it.dataset.i));
  }
  function moveItem(item,target,after){
    if(item===target)return;
    if(item.hasAttribute("data-k")){
      after?target.after(item):target.before(item);
      const keys=siblingsOf(item).map(s=>s.dataset.k),old=get(item.dataset.ok)||[];
      set(item.dataset.ok,keys.concat(old.filter(k=>!keys.includes(k))));
    }else{
      const tOld=+target.dataset.i;
      listOp(item,(arr,perm,pos)=>{
        const[x]=arr.splice(pos,1),[px]=perm.splice(pos,1);
        const at=perm.indexOf(tOld)+(after?1:0);arr.splice(at,0,x);perm.splice(at,0,px);
      });
      after?target.after(item):target.before(item);
      // keep the arrows between flow steps where they belong
      const fl=item.closest(".flow");if(fl){const steps=$$(".flow-step",fl),arrow=$(".flow-arrow",fl);$$(".flow-arrow",fl).forEach(a=>a.remove());steps.forEach((s,k)=>{if(k)s.before(arrow.cloneNode(true))})}
    }
    if(item.hasAttribute("data-k"))item.scrollIntoView({block:"start"});   // follow the section to its new place
    flash(item);select(item);secBars();
  }
  function secBars(){
    $$("[data-k]").forEach(sec=>{
      let b=$(":scope>.rt-secbar",sec);
      if(!b){
        if(getComputedStyle(sec).position==="static")sec.style.position="relative";
        b=h("div",{class:"rt-secbar rt-ui"},h("span",{class:"rt-sl"},KEY_NAMES[sec.dataset.k]||sec.dataset.k),
          h("button",{type:"button",title:"Move this whole section up",on:{click:()=>step(sec,-1)}},"↑"),
          h("button",{type:"button",title:"Move this whole section down",on:{click:()=>step(sec,1)}},"↓"));
        sec.prepend(b);
      }
      const sib=siblingsOf(sec),k=sib.indexOf(sec),[up,down]=$$("button",b);
      up.disabled=k<=0;down.disabled=k===sib.length-1;b.hidden=sib.length<2;
    });
  }
  function step(u,dir){
    const sib=siblingsOf(u),k=sib.indexOf(u),t=sib[k+dir];
    if(t)moveItem(u,t,dir>0);
  }
  function duplicate(item){
    const clone=item.cloneNode(true);
    clone.dataset.from=item.dataset.i;clone.dataset.i="new";
    listOp(item,(arr,perm,pos)=>{
      const copy=structuredClone(arr[pos]);
      if(copy&&typeof copy==="object"&&copy.slug){copy.slug+="-copy";if(copy.title)copy.title+=" (copy)"}
      arr.splice(pos+1,0,copy);perm.splice(pos+1,0,-1);
      item.after(clone);
    });
    $$("[data-e]",clone).concat(clone.hasAttribute("data-e")?[clone]:[]).forEach(el=>{initText(el);const v=get(el.dataset.e);if(typeof v==="string")el.textContent=v});
    if(clone.tagName==="A")clone.draggable=false;
    flash(clone);select(clone);
  }
  function remove(item){
    if(!confirm(`Delete this ${unitName(item).toLowerCase()}?`))return;
    listOp(item,(arr,perm,pos)=>{arr.splice(pos,1);perm.splice(pos,1)});
    item.remove();
    current=null;chain=[];panelOpen=false;renderPanel();place();
  }
  function flash(el){el.animate([{outline:"3px solid #ffd23f",outlineOffset:"4px"},{outline:"3px solid transparent",outlineOffset:"4px"}],{duration:900})}

  /* ------------------------------------------------------------ media */
  const rand=()=>Math.random().toString(36).slice(2,6);
  const slugify=s=>(s||"file").toLowerCase().replace(/\.[^.]+$/,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,40)||"file";
  function pickFile(kind){
    return new Promise(done=>{
      const inp=h("input",{type:"file",accept:kind==="video"?"video/*":"image/*",style:"display:none"});
      inp.addEventListener("change",()=>{done(inp.files[0]||null);inp.remove()});
      ui.append(inp);inp.click();
    });
  }
  async function prepImage(file,kind){
    // phone photos (HEIC, huge JPEGs) are converted here so the build can read them
    const okType=/^image\/(jpeg|png|webp|gif)$/.test(file.type);
    const bmp=await new Promise((ok,no)=>{const i=new Image();i.onload=()=>ok(i);i.onerror=()=>no(new Error("This image format can't be read in this browser."));i.src=URL.createObjectURL(file)});
    const max=kind==="art"?1400:2400,big=Math.max(bmp.naturalWidth,bmp.naturalHeight);
    if(okType&&big<=max&&file.size<8e6)return{blob:file,ext:file.type==="image/jpeg"?"jpg":file.type.split("/")[1]};
    const sc=Math.min(1,max/big),c=document.createElement("canvas");
    c.width=Math.round(bmp.naturalWidth*sc);c.height=Math.round(bmp.naturalHeight*sc);
    c.getContext("2d").drawImage(bmp,0,0,c.width,c.height);
    const alpha=kind==="art"&&/png|webp|gif/.test(file.type);
    const blob=await new Promise(ok=>c.toBlob(ok,alpha?"image/png":"image/jpeg",.88));
    return{blob,ext:alpha?"png":"jpg"};
  }
  async function replaceMedia(path,kind,el){
    const file=await pickFile(kind);if(!file)return;
    let blob=file,ext=(file.name.split(".").pop()||"").toLowerCase();
    try{
      if(kind==="video"){
        if(file.size>70e6){alertBox("That video is "+Math.round(file.size/1e6)+" MB. GitHub takes up to about 70 MB per file here; trim it or export it smaller first.");return}
        if(!/^(mp4|mov|webm|m4v)$/.test(ext))ext="mp4";
      }else({blob,ext}=await prepImage(file,kind));
    }catch(e){alertBox(e.message);return}
    const repoPath=`assets/uploads/${slugify(file.name)}-${rand()}.${ext}`;
    const old=get(path);if(typeof old==="string"&&old.startsWith("/assets/uploads/"))uploads.delete(old.slice(1));
    uploads.set(repoPath,blob);set(path,"/"+repoPath);
    const url=URL.createObjectURL(blob);
    $$(`[data-m="${CSS.escape(path)}"]`).forEach(m=>{
      if(m.tagName==="IMG"){m.src=url;m.removeAttribute("srcset");m.style.visibility=""}
      else{const v=$("video",m);if(v){v.removeAttribute("poster");v.src=url;v.play().catch(()=>{})}m.dataset.src=url}
    });
    if(path.endsWith(".cover")&&$(".phero-bg"))$(".phero-bg").src=url;
    $$("[data-bg]").filter(b=>b.dataset.bg.split(" ").includes(path)).forEach(b=>{b.removeAttribute("poster");b.src=url;if(b.play)b.play().catch(()=>{})});
    toast(kind==="video"?"New video ready. It gets compressed when you publish.":"New image ready.");
    renderPanel();
  }

  /* ------------------------------------------------------------ settings panel */
  const COLOR_VAR={color_main:"--mid",color_deep:"--deep",color_accent:"--accent"};
  function previewColor(holder,path,v,opts){
    const k=path.split(".").pop();
    if(opts&&opts.length){const t=opts[0]?$(opts[0],holder):holder;if(t)t.style.setProperty(opts[1],v);return}
    const cv=COLOR_VAR[k];if(!cv){holder.style.setProperty("--c",v);return}
    const tgt=holder.classList.contains("phero")?document.documentElement:holder;
    tgt.style.setProperty(cv,v);
    if(holder.dataset.mid!==undefined&&k==="color_main")holder.dataset.mid=v;
    if(holder.dataset.deep!==undefined&&k==="color_deep")holder.dataset.deep=v;
  }
  function previewLayout(holder,v){
    const g=$(".mech-grid",holder);if(!g)return;
    const n=$$(":scope>[data-i]",g).length,cols={"one-big":1,two:2,three:3}[v]||Math.min(Math.max(n,1),3);
    g.className=g.className.replace(/\bn\d\b/,"n"+cols);
  }
  function field(holder,[label,path,type,opts]){
    const val=get(path)??"";
    const wrap=h("div",{},h("label",{},label));
    if(type==="color"){
      const hex=/^#[0-9a-f]{6}$/i.test(val)?val:"#000000";
      const t=h("input",{type:"text",value:val,spellcheck:"false"}),c=h("input",{type:"color",value:hex});
      c.addEventListener("input",()=>{t.value=c.value;set(path,c.value);previewColor(holder,path,c.value,opts)});
      t.addEventListener("change",()=>{const v=t.value.trim();if(/^#[0-9a-f]{6}$/i.test(v)){c.value=v;set(path,v);previewColor(holder,path,v,opts)}else t.value=get(path)||""});
      wrap.append(h("div",{class:"rt-color"},c,t));
    }else if(type==="select"){
      const s=h("select",{},...opts.map(o=>h("option",{value:o,selected:o===val},o||"(none)")));
      s.addEventListener("change",()=>{set(path,s.value);if(path.endsWith(".layout"))previewLayout(holder,s.value);if(path.endsWith(".icon"))previewIcon(path,s.value);
        if(path.endsWith(".style")&&holder.classList.contains("btn"))holder.classList.toggle("ghost",s.value==="ghost")});
      wrap.append(s);
    }else if(type==="image"||type==="art"||type==="video"){
      wrap.append(h("div",{class:"rt-row"},h("button",{class:"rt-btn sm",type:"button",on:{click:()=>replaceMedia(path,type,holder)}},val?"Replace…":"Add…"),
        val&&!/^(cover)$/.test(path.split(".").pop())?h("button",{class:"rt-btn sm dan",type:"button",on:{click:()=>{set(path,"");renderPanel();toast("Removed. The site updates after you publish.")}}},"Remove"):null),
        h("div",{class:"rt-file"},val?String(val).split("/").pop():"none"));
    }else if(type==="link"){
      const t=h("input",{type:"text",value:val,list:"rt-links",spellcheck:"false"});
      t.addEventListener("input",()=>{set(path,t.value.trim());if(holder.tagName==="A")holder.setAttribute("href",t.value.trim())});
      wrap.append(t,h("p",{class:"rt-hint"},"Pick from the list or paste any web address."));
    }else{
      const t=h("input",{type:"text",value:val});
      t.addEventListener("input",()=>{let v=t.value;if(path.endsWith(".slug"))v=v.toLowerCase().replace(/[^a-z0-9-]+/g,"-");set(path,v)});
      if(path.endsWith(".slug"))wrap.append(t,h("p",{class:"rt-hint"},"Changing it changes the page's web address."));
      else wrap.append(t);
    }
    return wrap;
  }
  let ICONS={};
  fetch(new URL("icons.json",ME).href).then(r=>r.json()).then(j=>{ICONS=j}).catch(()=>{});
  function previewIcon(path,name){
    $$(`[data-ico="${CSS.escape(path)}"]`).forEach(c=>{
      const old=$("svg",c),size=old?old.getAttribute("width"):"18";
      c.innerHTML=name&&ICONS[name]?`<svg viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="${size>18?1.9:2}" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</svg>`:"";
      if(c.classList.contains("h-ico"))c.hidden=!name;
    });
  }
  function hasSettings(u){return mediaOf(u).some(m=>m!==clickedMedia)||fieldsOf(u).length>0||(u.tagName==="A"&&!!u.getAttribute("href"))}
  function renderPanel(){
    panel.replaceChildren();
    if(!current||!panelOpen){panel.style.display="none";place();return}
    const u=current;
    panel.append(h("div",{class:"rt-head"},h("span",{},unitName(u)),h("button",{class:"rt-x",type:"button","aria-label":"Close",on:{click:()=>{panelOpen=false;renderPanel()}}},"✕")));
    const mseen=new Set();
    mediaOf(u).forEach(m=>{const p=m.dataset.m;if(mseen.has(p))return;mseen.add(p);
      const kind=m.dataset.mk,last=p.split(".").pop(),lab={showreel_video:"Showreel video",full_video:"Full video",mascot:"Character cut-out",cover:"Cover image",video:"Clip video"}[last]||(kind==="video"?"Video":"Image");
      panel.append(h("label",{},lab),h("div",{class:"rt-row"},h("button",{class:"rt-btn sm",type:"button",on:{click:()=>replaceMedia(p,kind,m)}},"Replace…")),h("div",{class:"rt-file"},String(get(p)||"").split("/").pop()))});
    fieldsOf(u).filter(f=>!mseen.has(f[1])).forEach(f=>panel.append(field(u,f)));
    if(u.tagName==="A"&&u.getAttribute("href"))panel.append(h("div",{class:"rt-row",style:"margin-top:12px"},h("button",{class:"rt-btn sm",type:"button",on:{click:()=>{if(!changes||confirm("Leave without publishing? Changes on this page will be lost.")){changes=0;location.href=u.href}}}},"↗ Open this link")));
    panel.style.display="block";
    place();
  }

  /* ------------------------------------------------------------ drag to reorder */
  let drag=null;
  T.grip.addEventListener("pointerdown",e=>{
    if(!current||!movable(current))return;
    e.preventDefault();e.stopPropagation();
    const r=current.getBoundingClientRect();
    drag={u:current,sib:siblingsOf(current),dx:e.clientX-r.left,dy:e.clientY-r.top,target:null,after:false};
    ghost.replaceChildren(current.cloneNode(true));
    Object.assign(ghost.style,{display:"block",width:Math.min(r.width,420)+"px",height:Math.min(r.height,260)+"px"});
    e.target.setPointerCapture(e.pointerId);
    moveDrag(e);
  });
  function moveDrag(e){
    if(!drag)return;
    ghost.style.left=e.clientX-Math.min(drag.dx,200)+"px";ghost.style.top=e.clientY-Math.min(drag.dy,120)+"px";
    let best=null,bd=1e9;
    for(const s of drag.sib){const r=s.getBoundingClientRect();const cx=Math.max(r.left,Math.min(e.clientX,r.right)),cy=Math.max(r.top,Math.min(e.clientY,r.bottom));const d=Math.hypot(cx-e.clientX,cy-e.clientY);if(d<bd){bd=d;best=s}}
    if(!best)return;
    const r=best.getBoundingClientRect(),pr=best.parentElement.getBoundingClientRect();
    const horiz=r.width<pr.width*.8;
    const after=horiz?e.clientX>r.left+r.width/2:e.clientY>r.top+r.height/2;
    drag.target=best;drag.after=after;
    Object.assign(drop.style,horiz
      ?{display:"block",left:(after?r.right:r.left)-2+"px",top:r.top+"px",width:"4px",height:r.height+"px"}
      :{display:"block",left:r.left+"px",top:(after?r.bottom:r.top)-2+"px",width:r.width+"px",height:"4px"});
    const edge=70;if(e.clientY<edge)scrollBy(0,-14);else if(e.clientY>innerHeight-edge)scrollBy(0,14);
  }
  function endDrag(){
    if(!drag)return;
    const{u,target,after}=drag;drag=null;ghost.style.display="none";drop.style.display="none";
    if(target&&target!==u)moveItem(u,target,after);else place();
  }
  const grip=T.grip;
  grip.addEventListener("pointermove",moveDrag);grip.addEventListener("pointerup",endDrag);grip.addEventListener("pointercancel",endDrag);

  /* ------------------------------------------------------------ clicks: select instead of navigate */
  let lastTap={};
  document.addEventListener("click",e=>{
    const t=e.target;
    if(!loaded||t.closest(".rt-ui,.rt-modal,#rt-sel"))return;
    if(t.closest(".topbar,.jump,.viewer"))return;            // site navigation still works
    const act=t.closest("a,button,summary,label,.clip,.zoom");
    const te=t.closest("[data-e]");
    if(act){e.preventDefault();e.stopImmediatePropagation()}
    if(te&&te.isContentEditable)return;                       // typing: let the caret move
    const now=Date.now();
    if(te&&lastTap.el===te&&now-lastTap.t<450){lastTap={};select(t);startEdit(te,e.clientX,e.clientY);return}
    lastTap={el:te,t:now};
    select(t);
  },true);
  document.addEventListener("dblclick",e=>{const te=e.target.closest("[data-e]");if(loaded&&te&&!e.target.closest(".rt-ui")){e.preventDefault();startEdit(te,e.clientX,e.clientY)}},true);
  document.addEventListener("keydown",e=>{if(e.key==="Escape"){if(document.activeElement?.isContentEditable)document.activeElement.blur();else{current=null;chain=[];panelOpen=false;renderPanel();place()}}});

  /* ------------------------------------------------------------ start */
  function staleCheck(){
    let bad=0;
    $$("[data-e]").forEach(el=>{const v=get(el.dataset.e);if(typeof v!=="string")return;
      const a=el.hasAttribute("data-code")?v.trim():norm(v),b=el.hasAttribute("data-code")?el.textContent.trim():norm(el.textContent);if(a!==b)bad++});
    if(bad){
      const b=h("div",{class:"rt-banner rt-ui"},`This page is older than the saved content (${bad} text${bad>1?"s":""} differ), probably because a rebuild is still running. Reload in a minute before editing. `,
        h("button",{class:"rt-link",type:"button",on:{click:()=>location.reload()}},"Reload"));
      document.body.append(b);
    }
  }
  async function start(){
    if(document.body.classList.contains("gallery")||/gallery\.html$/.test(location.pathname)){
      document.body.append(h("div",{class:"rt-banner rt-ui"},"The gallery is built automatically from the project pages and the lab. Edit those, and it updates by itself."));
    }
    if(!store.get(TOKEN_KEY)){if(!(await askToken(true))){status("No token: you can look around, but not publish.",true);return}}
    else{try{await loadDocs()}catch(e){status("",true);if(!(await askToken()))return}}
    $$("[data-edit-show]").forEach(x=>{x.hidden=false});
    $$("details").forEach(d=>{if($("[data-e]",d))d.open=true});
    $$("[data-e]").forEach(initText);
    secBars();
    $$("a").forEach(a=>{a.draggable=false});
    $$("summary").forEach(su=>su.addEventListener("keyup",e=>{if(e.key===" ")e.preventDefault()},true));
    staleCheck();
    loaded=true;updateBar();
    status("Tap anything to select it · double-tap text to change it");
    if(!store.get("rt-edit-helped")){store.set("rt-edit-helped","1");help()}
  }
  start();
})();
