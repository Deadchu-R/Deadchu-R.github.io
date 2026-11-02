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
  let docs={},orig={},loaded=false,inited=false;
  const canon=o=>JSON.stringify(o);
  const dirty=new Set(),uploads=new Map();      // uploads: repo path -> Blob
  let changes=0;

  const parse=p=>{const i=p.indexOf(":");return i<0?[p,[]]:[p.slice(0,i),p.slice(i+1).split(".").filter(Boolean)]};
  function get(p){const[f,ks]=parse(p);let o=docs[f];for(const k of ks){if(o==null)return undefined;o=o[k]}return o}
  function set(p,v){
    const[f,ks]=parse(p);
    if(!ks.length)docs[f]=v;
    else{let o=docs[f];for(let i=0;i<ks.length-1;i++){const k=ks[i];if(o[k]==null)o[k]=/^\d+$/.test(ks[i+1])?[]:{};o=o[k]}o[ks[ks.length-1]]=v}
    dirty.add(f);changes++;updateBar();
    const m_=p.match(/^site:custom_sections\.(\w+)\.(.+)$/);if(m_&&csStruct(m_[2]))csChanged(m_[1],m_[2],v);
  }

  /* ------------------------------------------------------------ GitHub */
  // fetch that gives up instead of hanging forever on a bad connection
  async function fetchT(url,opt={},ms=25000){
    const ac=new AbortController(),t=setTimeout(()=>ac.abort(),ms);
    try{return await fetch(url,{...opt,signal:ac.signal})}
    catch(e){if(e.name==="AbortError")throw new Error("no answer after "+Math.round(ms/1000)+"s, check the connection");throw e}
    finally{clearTimeout(t)}
  }
  async function gh(path,opt={}){
    const r=await fetchT(API+path,{...opt,cache:"no-store",headers:{Authorization:"Bearer "+store.get(TOKEN_KEY),Accept:"application/vnd.github+json",...(opt.body?{"Content-Type":"application/json"}:{})}},opt.long?300000:25000);
    if(!r.ok){const t=await r.text().catch(()=>"");const err=new Error(r.status+" "+(t.match(/"message":"([^"]+)/)||[,t.slice(0,160)])[1]);err.status=r.status;throw err}
    return r.status===204?null:r.json();
  }
  const b64dec=s=>new TextDecoder().decode(Uint8Array.from(atob(s.replace(/\s/g,"")),c=>c.charCodeAt(0)));
  const blobB64=b=>new Promise((ok,no)=>{const r=new FileReader();r.onload=()=>ok(String(r.result).split(",")[1]);r.onerror=no;r.readAsDataURL(b)});

  async function loadDocs(){
    // read the content straight from the site (fast, no GitHub needed); GitHub is only used to publish
    const root=new URL("../",ME).href,out={};
    await Promise.all(Object.entries(FILES).map(async([k,path])=>{
      let o;
      try{const r=await fetchT(root+path+"?t="+Date.now(),{cache:"no-store"},15000);if(!r.ok)throw new Error(r.status);o=await r.json()}
      catch(e){const r=await gh(`/repos/${REPO}/contents/${path}?ref=${BR}&t=${Date.now()}`);o=JSON.parse(b64dec(r.content))}
      out[k]=o;orig[k]=canon(o);
    }));
    docs=out;
  }

  async function publish(){
    if(!dirty.size&&!uploads.size){toast("Nothing to publish yet.");return}
    setBusy("Publishing…");
    try{
      const ref=await gh(`/repos/${REPO}/git/ref/heads/${BR}`),head=ref.object.sha;
      // someone else changed the same content file since this page opened? stop instead of overwriting it
      for(const f of dirty){
        const cur=await gh(`/repos/${REPO}/contents/${FILES[f]}?ref=${head}&t=${Date.now()}`);
        if(canon(JSON.parse(b64dec(cur.content)))!==orig[f]){setBusy("");alertBox("The content changed somewhere else since you opened this page (another tab or Pages CMS). Copy anything you typed, reload, and edit again so nothing gets overwritten.");return}
      }
      const commit=await gh(`/repos/${REPO}/git/commits/${head}`);
      const tree=[];let n=0;
      for(const[p,blob]of uploads){
        setBusy(`Uploading ${++n} of ${uploads.size}…`);
        const r=await gh(`/repos/${REPO}/git/blobs`,{method:"POST",long:true,body:JSON.stringify({content:await blobB64(blob),encoding:"base64"})});
        tree.push({path:p,mode:"100644",type:"blob",sha:r.sha});
      }
      setBusy("Saving…");
      for(const f of dirty)tree.push({path:FILES[f],mode:"100644",type:"blob",content:JSON.stringify(docs[f],null,2)+"\n"});
      const t=await gh(`/repos/${REPO}/git/trees`,{method:"POST",body:JSON.stringify({base_tree:commit.tree.sha,tree})});
      const what=[...dirty].map(f=>FILES[f].replace("content/","")).concat(uploads.size?[`${uploads.size} upload${uploads.size>1?"s":""}`]:[]).join(", ");
      const c=await gh(`/repos/${REPO}/git/commits`,{method:"POST",body:JSON.stringify({message:"Edit on the site: "+what,tree:t.sha,parents:[head]})});
      await gh(`/repos/${REPO}/git/refs/heads/${BR}`,{method:"PATCH",body:JSON.stringify({sha:c.sha})});
      for(const f of dirty)orig[f]=canon(docs[f]);
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
  #rt-tb{position:fixed;z-index:2147483050;display:none;align-items:center;flex-wrap:wrap;max-width:calc(100vw - 16px);gap:2px;background:#111;border:1px solid #333;border-radius:11px;padding:3px;box-shadow:0 8px 24px rgba(0,0,0,.45)}
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
  .rt-secbar button{appearance:none;min-width:32px;height:30px;border-radius:7px;border:0;background:#222;color:#fff;font:800 17px/1 system-ui,sans-serif;cursor:pointer}
  .rt-secbar button:hover:not(:disabled){color:#ffd23f}
  .rt-secbar button:disabled{opacity:.25;cursor:default}
  .rt-on .xrow-block{min-height:52px;border:1px dashed rgba(255,210,63,.45);border-radius:12px;padding:6px}
  .rt-on .xrow-block:has(.xrow:empty)::after{content:"Button row · tap + to add buttons";display:block;color:rgba(255,210,63,.75);font:600 13px/40px system-ui,sans-serif;padding-left:8px}
  .rt-preview .rt-secbar,.rt-preview #rt-sel,.rt-preview #rt-tb,.rt-preview #rt-panel{display:none!important}
  .rt-preview [data-e]{outline:none!important;background:none!important}
  .rt-preview .xrow-block{border:0!important;min-height:0!important;padding:0!important}
  .rt-preview .xrow-block:has(.xrow:empty){display:none}
  .rt-preview .xrow-block:has(.xrow:empty)::after{content:none}
  #rt-bar .rt-eye{font-size:17px}
  .rt-gif{object-fit:cover}
  .clip .rt-gif{position:absolute;inset:0;width:100%;height:100%;border-radius:inherit}
  .rt-on .peekcat{pointer-events:auto}
  .rt-on .peekcat img{transform:translateY(8%) rotate(-4deg)!important;cursor:pointer}
  #rt-ai{position:fixed;z-index:2147483120;right:12px;bottom:12px;width:380px;max-height:min(70vh,620px);display:flex;flex-direction:column;background:#151515;color:#eee;border:1px solid #333;border-radius:14px;box-shadow:0 14px 40px rgba(0,0,0,.55);padding:10px 12px 12px;font-size:14px}
  #rt-ai[hidden]{display:none}
  #rt-ai .rt-head{display:flex;justify-content:space-between;align-items:center;color:#ffd23f;font:700 13px/1 system-ui,sans-serif;margin-bottom:8px}
  #rt-ai .rt-x{background:none;border:0;color:#aaa;font-size:16px;cursor:pointer;padding:2px 6px}
  .rt-ailog{flex:1;overflow:auto;display:flex;flex-direction:column;gap:6px;min-height:120px;padding:2px}
  .rt-msg{padding:8px 11px;border-radius:12px;line-height:1.45;max-width:92%;white-space:pre-wrap;word-break:break-word;unicode-bidi:plaintext}
  .rt-msg.me{align-self:flex-end;background:#ffd23f;color:#111}
  .rt-msg.ai{align-self:flex-start;background:#232323}
  .rt-msg.act{align-self:flex-start;background:none;color:#9be15d;font:12px ui-monospace,monospace;padding:0 4px}
  .rt-msg.sys{align-self:flex-start;color:#888;animation:rtpulse 1s infinite alternate}
  .rt-msg.err{align-self:flex-start;background:#3b1414;color:#ffb3b3}
  @keyframes rtpulse{to{opacity:.3}}
  .rt-files{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0 0}
  .rt-chip{display:inline-flex;align-items:center;gap:4px;background:#222;border:1px solid #444;border-radius:8px;padding:3px 4px 3px 8px;font-size:12px}
  .rt-chip button{background:none;border:0;color:#aaa;cursor:pointer;font-size:14px}
  .rt-airow{display:flex;gap:6px;align-items:flex-end;margin-top:8px}
  .rt-airow textarea{flex:1;resize:none;background:#0e0e0e;color:#fff;border:1px solid #3a3a3a;border-radius:10px;padding:9px;font:14px/1.35 system-ui,sans-serif;unicode-bidi:plaintext;min-height:42px;max-height:120px}
  .rt-aibtn{appearance:none;width:40px;height:42px;border-radius:10px;border:1px solid #3a3a3a;background:#222;color:#fff;font-size:17px;cursor:pointer;flex:none}
  .rt-aibtn.sm{width:34px;font:700 12px system-ui,sans-serif}
  .rt-aibtn.pri{background:#ffd23f;color:#111;border-color:#ffd23f}
  .rt-aibtn.on{background:#e03b3b;border-color:#e03b3b;animation:rtpulse .7s infinite alternate}
  @media (max-width:640px){#rt-ai{left:8px;right:8px;width:auto;bottom:8px;max-height:62vh}}
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
  #rt-panel .rt-sw{width:44px;height:36px;flex:none;border:1px solid #555;border-radius:8px;cursor:pointer;background-image:none;box-shadow:inset 0 0 0 2px #151515}
  #rt-panel .rt-color input[type=text]{font-family:ui-monospace,Consolas,monospace;letter-spacing:.04em}
  #rt-panel .rt-wheel{margin-top:10px;padding:12px;border:1px solid #2c2c2c;border-radius:12px;background:#101010}
  #rt-panel .rt-wheel[hidden]{display:none}
  #rt-panel .rt-disc{position:relative;width:210px;height:210px;margin:0 auto;touch-action:none;cursor:crosshair}
  #rt-panel .rt-disc canvas{display:block;border-radius:50%}
  #rt-panel .rt-shade{position:absolute;inset:0;border-radius:50%;background:#000;pointer-events:none}
  #rt-panel .rt-wdot{position:absolute;width:20px;height:20px;margin:-10px 0 0 -10px;border-radius:50%;border:3px solid #fff;box-shadow:0 0 0 1px rgba(0,0,0,.5),0 2px 6px rgba(0,0,0,.5);pointer-events:none;z-index:1}
  #rt-panel .rt-vrow{display:flex;align-items:center;gap:10px;margin-top:12px;color:#aaa}
  #rt-panel .rt-val{flex:1;-webkit-appearance:none;appearance:none;height:14px;border-radius:7px;outline:none}
  #rt-panel .rt-val::-webkit-slider-thumb{-webkit-appearance:none;width:22px;height:22px;border-radius:50%;background:#fff;border:2px solid #111;box-shadow:0 1px 4px rgba(0,0,0,.6)}
  #rt-panel .rt-val::-moz-range-thumb{width:22px;height:22px;border-radius:50%;background:#fff;border:2px solid #111}
  #rt-panel .rt-prev{width:28px;height:28px;border-radius:50%;border:2px solid #333;flex:none}
  #rt-panel .rt-color input[type=range]{flex:1;accent-color:#ffd23f}
  #rt-panel .rt-num{min-width:52px;color:#ddd;font:600 13px ui-monospace,monospace;text-align:right}
  #rt-panel .rt-switch{display:inline-flex;align-items:center;gap:10px;cursor:pointer;margin:0;color:#ddd}
  #rt-panel .rt-switch input{display:none}
  #rt-panel .rt-switch span{width:44px;height:26px;border-radius:13px;background:#333;position:relative;transition:background .2s}
  #rt-panel .rt-switch span::after{content:"";position:absolute;left:3px;top:3px;width:20px;height:20px;border-radius:50%;background:#fff;transition:transform .2s}
  #rt-panel .rt-switch input:checked+span{background:#ffd23f}
  #rt-panel .rt-switch input:checked+span::after{transform:translateX(18px)}
  #rt-panel .rt-sws{display:flex;flex-wrap:wrap;gap:7px;margin-top:12px;justify-content:center}
  #rt-panel .rt-sws button{width:24px;height:24px;border-radius:50%;border:2px solid #2a2a2a;cursor:pointer;padding:0}
  #rt-panel .rt-file{font-size:12px;color:#888;word-break:break-all;margin-top:4px}
  #rt-panel .rt-head{display:flex;justify-content:space-between;align-items:center;color:#ffd23f;font:700 12px/1 system-ui,sans-serif;text-transform:uppercase;letter-spacing:.05em}
  #rt-panel .rt-x{background:none;border:0;color:#aaa;font-size:18px;cursor:pointer;padding:2px 6px}
  #rt-panel .rt-hint{color:#999;font-size:12px;margin:6px 0 0;line-height:1.4}
  .rt-modal{position:fixed;inset:0;z-index:2147483200;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;padding:16px}
  .rt-card{background:#151515;color:#eee;border:1px solid #333;border-radius:16px;max-width:520px;width:100%;padding:20px;box-shadow:0 20px 60px rgba(0,0,0,.6);font-size:15px;line-height:1.5;max-height:90vh;overflow:auto}
  .rt-plus{width:auto!important;min-width:32px;padding:0 7px 0 6px!important;display:inline-flex!important;align-items:center;gap:4px;position:relative;
    user-select:none;-webkit-user-select:none;-webkit-touch-callout:none;touch-action:none;overflow:hidden;isolation:isolate}
  .rt-plus small{font:700 11px/1 system-ui,sans-serif;color:#ffd23f;max-width:76px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .rt-plus small:empty{display:none}
  .rt-plus::after{content:"";position:absolute;right:2px;bottom:2px;border:3px solid transparent;border-right-color:#ffd23f;border-bottom-color:#ffd23f;opacity:.75}
  .rt-plus::before{content:"";position:absolute;inset:0;z-index:-1;background:#ffd23f;opacity:.28;transform:scaleX(0);transform-origin:left}
  .rt-plus.rt-holding::before{transform:scaleX(1);transition:transform .38s linear}
  .rt-pm-back{position:fixed;inset:0;z-index:2147483300;background:rgba(0,0,0,.18)}
  .rt-pm{position:fixed;z-index:2147483310;min-width:220px;max-width:min(320px,calc(100vw - 16px));max-height:min(70vh,520px);overflow:auto;padding:5px;border-radius:14px;
    background:rgba(30,30,32,.92);backdrop-filter:blur(18px) saturate(1.6);-webkit-backdrop-filter:blur(18px) saturate(1.6);border:1px solid rgba(255,255,255,.12);
    box-shadow:0 18px 50px rgba(0,0,0,.55);animation:rtPm .17s cubic-bezier(.2,.9,.3,1.2);touch-action:none}
  @keyframes rtPm{from{opacity:0;transform:scale(.85)}to{opacity:1;transform:none}}
  .rt-pm-t{font:700 11px/1 system-ui,sans-serif;letter-spacing:.06em;text-transform:uppercase;color:#999;padding:8px 10px 6px}
  .rt-pm-opt{appearance:none;display:flex;width:100%;align-items:center;justify-content:space-between;gap:10px;border:0;background:none;color:#f2f2f2;
    font:500 15px/1.2 system-ui,sans-serif;padding:11px 10px;border-radius:9px;cursor:pointer;text-align:left}
  .rt-pm-opt{user-select:none;-webkit-user-select:none}
  .rt-pm-back-row{color:#ffd23f;font-weight:700}
  .rt-pm-in{animation:rtPmIn .16s ease-out}
  @keyframes rtPmIn{from{opacity:.3;transform:translateX(14px)}to{opacity:1;transform:none}}
  .rt-pm-opt+.rt-pm-opt{box-shadow:0 -1px 0 rgba(255,255,255,.07)}
  .rt-pm-opt em{font-style:normal;font-size:12px;color:#8d8d8d;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:46%}
  .rt-pm-opt i{font-style:normal;color:#ffd23f;font-weight:800}
  .rt-pm-opt.hi,.rt-pm-opt:hover{background:#ffd23f;color:#111}.rt-pm-opt.hi em,.rt-pm-opt:hover em,.rt-pm-opt.hi i,.rt-pm-opt:hover i{color:#111}
  .rt-addlist{display:grid;gap:6px}.rt-addlist.grid{grid-template-columns:1fr 1fr}
  .rt-addopt{appearance:none;text-align:left;border:1px solid #333;background:#1e1e1e;color:#eee;border-radius:10px;padding:11px 12px;cursor:pointer;display:flex;flex-direction:column;gap:3px;font:600 14.5px/1.25 system-ui,sans-serif}
  .rt-addopt:hover{border-color:#ffd23f;background:#262626}.rt-addopt span{font-weight:400;font-size:12.5px;color:#aaa}
  @media (max-width:420px){.rt-addlist.grid{grid-template-columns:1fr}}
  .rt-card h3{margin:0 0 10px;font:800 20px/1.2 system-ui,sans-serif;color:#fff}
  .rt-card ol{padding-left:20px;margin:8px 0}
  .rt-card a{color:#ffd23f}
  .rt-card input{width:100%;margin:10px 0;background:#0e0e0e;color:#fff;border:1px solid #3a3a3a;border-radius:8px;padding:10px;font:14px ui-monospace,monospace}
  .rt-card .rt-row{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap;margin-top:8px}
  .rt-banner{position:fixed;z-index:2147483098;left:50%;top:70px;transform:translateX(-50%);background:#3b2a00;color:#ffe9a8;border:1px solid #ffd23f;border-radius:10px;padding:10px 14px;font:14px/1.4 system-ui,sans-serif;max-width:min(560px,calc(100vw - 24px));box-shadow:0 10px 30px rgba(0,0,0,.4)}
  @media (max-width:640px){
    #rt-panel{left:8px!important;right:8px;width:auto;top:auto!important;bottom:62px;max-height:52vh}
    #rt-menu{left:8px}
    #rt-toast{left:8px;right:8px;max-width:none;bottom:auto;top:8px}
    .rt-secbar .rt-sl{display:none}
  }`;
  document.head.append(h("style",{id:"rt-css"},STYLE));
  document.documentElement.classList.add("rt-on");

  const ui=h("div",{class:"rt-ui"});
  const pubBtn=h("button",{class:"rt-pub",type:"button",disabled:true,on:{click:publish}},h("i"),"Publish");
  const menu=h("div",{id:"rt-menu"});
  const item=(label,fn,cls)=>h("button",{type:"button",class:cls||"",on:{click:()=>{menu.style.display="none";fn()}}},label);
  menu.append(item("＋  New section (main page)",()=>sectionPicker(current&&current.closest('[data-ok="site:section_order"]'),$(".rt-more"))),item("✨  AI assistant",()=>openAI()),item("⚙  Site settings · sound & CSS",()=>siteSettings()),item("↺  Versions / undo",()=>historyBox()),item("?  How it works",()=>help()),item("🔑  GitHub token",()=>askToken()),item("✕  Exit editing",()=>exitEdit(),"dan"));
  const prevBtn=h("button",{class:"rt-more rt-eye",type:"button",title:"Preview the page as visitors will see it",on:{click:e=>{e.stopPropagation();togglePreview()}}},"👁");
  function togglePreview(){
    const on=document.documentElement.classList.toggle("rt-preview");
    prevBtn.textContent=on?"✎":"👁";prevBtn.title=on?"Back to editing":"Preview the page as visitors will see it";
    if(on){current=null;chain=[];panelOpen=false;renderPanel();if(document.activeElement?.isContentEditable)document.activeElement.blur();
      status("Preview: this is how the page will look after Publish. Videos and images play like for visitors. Tap ✎ to keep editing.")}
    else status("Back to editing.");
  }
  const aiBtn=h("button",{class:"rt-more rt-eye",type:"button",title:"AI assistant",on:{click:e=>{e.stopPropagation();openAI()}}},"✨");
  const bar=h("div",{id:"rt-bar"},pubBtn,prevBtn,aiBtn,h("button",{class:"rt-more",type:"button",title:"More",on:{click:e=>{e.stopPropagation();menu.style.display=menu.style.display==="block"?"none":"block"}}},"⋯"));
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
    bg:B("🎬","Background / cover: change the video or image",()=>{panelOpen=true;renderPanel()}),
    add:(()=>{const pb=h("button",{type:"button",class:"rt-plus",title:"Add"},"＋");wirePlus(pb,()=>current,()=>plusTap(current,pb));return pb})(),
    plus:B("＋","Add a new one after this",()=>current&&addNew(current)),
    parent:B("⤴","Select what's around it",()=>{const k=chain.indexOf(current);if(chain[k+1]){current=chain[k+1];clickedText=clickedMedia=null;panelOpen=false;renderPanel();place()}}),
  };
  tb.append(T.name,T.grip,T.up,T.down,T.edit,T.media,T.bg,T.add,T.plus,T.dup,T.del,T.gear,T.parent);
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
        try{await gh(`/repos/${REPO}`);m.remove();saveTokenForLogin(true);done(true)}catch(e){err.style.color="#ff8a8a";err.textContent="That token doesn't open the site's repo ("+e.message+").";}
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
        h("li",{},h("b",{},"🖼"),", replace the image or video (photos, GIFs and MP4s all work). ",h("b",{},"🎬")," changes a background video or cover. ",h("b",{},"⧉")," duplicate. ",h("b",{},"🗑")," delete."),
        h("li",{},h("b",{},"＋"),", adds a button. Every section has + in its corner; the hero and footer get it in their toolbar. Then ⚙ sets its link, icon and style, and ⤴ › ⚙ sets where the row sits."),
        h("li",{},h("b",{},"⚙"),", more options: links, icons, colors, layouts, background videos. ",h("b",{},"⤴")," selects what's around it."),
        h("li",{},h("b",{},"👁 Preview"),", shows the page exactly as visitors will see it, with your new images and videos, before you publish. ✎ goes back to editing."),
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
  const UNIT="[data-i],[data-k],[data-x],[data-m],[data-add]";
  const LIST_NAMES={projects:"Project card","code-pages":"Code card",lab:"Lab clip","early-work":"Early-work clip",job_bullets:"Bullet",timeline:"Timeline entry",
    what_i_built:"Bullet",teammates_built:"Bullet",tech:"Tag",ai_tools:"Tag",hobbies:"Hobby",games:"Game",rig:"Rig part",sections:"Clip section",clips:"Clip",
    screenshots:"Screenshot",characters:"Character",about:"Paragraph",flow:"Step",code:"Code block",
    hero_buttons:"Button",gallery_lab_buttons:"Button",footer_buttons:"Button",nav:"Menu link",job_tools:"Tool",items:"Button"};
  const KEY_NAMES={experience:"Experience",projects:"Projects",more_code:"More code",about:"Get to know me",gallery_lab:"Gallery & lab",code_sample:"Code sample",
    clips:"Clip sections",screenshots:"Screenshots",full_video:"Full video",characters:"Characters",credits:"Credits",flow:"How it fits together",clip:"In action",code:"The code"};
  const listOf=item=>item.parentElement&&item.parentElement.closest("[data-l]");
  const listPath=item=>{const l=listOf(item);return l&&l.dataset.l};
  function unitName(u){
    if(u.hasAttribute("data-i")){const lp=listPath(u)||"";
      const cm=lp.match(/^site:custom_sections\.(\w+)\.items$/);if(cm)return {cards:"Card",stats:"Number",gallery:"Picture",list:"Point",faq:"Question",steps:"Step"}[get(`site:custom_sections.${cm[1]}.type`)]||"Item";const last=lp.split(/[:.]/).pop();return LIST_NAMES[last]||LIST_NAMES[lp]||"Item"}
    if(u.hasAttribute("data-k"))return "Section · "+(KEY_NAMES[u.dataset.k]||(u.dataset.k.startsWith("cs_")?(get(`site:custom_sections.${u.dataset.k.slice(3)}.title`)||"yours"):u.dataset.k));
    if(u.classList.contains("bp"))return "Illustration window";
    if(/showreel/.test(u.dataset.m||""))return "Showreel button";
    if(u.classList.contains("repo"))return "Code card";
    if(/peek/.test(u.dataset.m||""))return "Peeking character";
    if(u.hasAttribute("data-m"))return u.dataset.mk==="video"?"Video":"Image";
    if(u.classList.contains("phero"))return "Page header";
    if(u.classList.contains("hero"))return "Top of the page";
    if(u.tagName==="FOOTER")return "Footer";
    if(/^H\d$/.test(u.tagName)||u.classList.contains("exp-kicker"))return "Heading";
    if((u.dataset.x||"").includes("site:ui."))return /^H\d$/.test(u.tagName)?"Heading":u.closest("a,button")?"Button text":"Text";
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
    if(!clickedMedia&&current){const m=mediaOf(current);if(m.length===1&&(m[0].tagName==="IMG"||current.hasAttribute("data-i")))clickedMedia=m[0]}
    panelOpen=false;
    renderPanel();place();
  }
  const show=(el,on)=>{el.style.display=on?"":"none"};
  function place(){
    if(!current||!document.contains(current)){sel.style.display=tb.style.display="none";if(!settingsOpen)panel.style.display="none";return}
    const r=current.getBoundingClientRect();
    if(!r.width&&!r.height){sel.style.display=tb.style.display="none";return}
    Object.assign(sel.style,{display:"block",left:r.left-4+"px",top:r.top-4+"px",width:r.width+8+"px",height:r.height+8+"px"});
    const mv=movable(current),sib=mv?siblingsOf(current):[],k=sib.indexOf(current);
    const horiz=sib.length>1&&Math.abs(sib[0].getBoundingClientRect().top-sib[1].getBoundingClientRect().top)<8;
    T.name.textContent=unitName(current);
    show(T.grip,mv&&sib.length>1);show(T.up,mv&&sib.length>1);show(T.down,mv&&sib.length>1);
    T.up.textContent=horiz?"←":"↑";T.down.textContent=horiz?"→":"↓";T.up.disabled=k<=0;T.down.disabled=k===sib.length-1;
    show(T.edit,!!clickedText);show(T.media,!!clickedMedia);
    show(T.dup,current.hasAttribute("data-i"));show(T.del,current.hasAttribute("data-i")||(current.dataset.k||"").startsWith("cs_"));
    show(T.gear,hasSettings(current));
    show(T.bg,fieldsOf(current).some(f=>/^(video|image|art|media)$/.test(f[2])&&/background|cover|picture|thumbnail/i.test(f[0])));
    show(T.add,plusLabel(T.add,current));show(T.plus,false);T.gear.classList.toggle("on",panelOpen);
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
    const cm=lp.match(/^site:custom_sections\.(\w+)\.items$/);if(cm)setTimeout(()=>{const n=$(".cs-steps",$("#cs-"+cm[1]));if(n)$$(".cs-num",n).forEach((x,k)=>x.textContent=k+1)},0);
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
        const mainPage=sec.dataset.ok==="site:section_order";
        b=h("div",{class:"rt-secbar rt-ui"},h("span",{class:"rt-sl"},KEY_NAMES[sec.dataset.k]||(sec.dataset.k.startsWith("cs_")?"Your section":sec.dataset.k)),
          mainPage?h("button",{type:"button",class:"rt-secadd",title:"Add a new section below this one",on:{click:e=>{e.stopPropagation();sectionPicker(sec,e.currentTarget)}}},"⊞"):null,
          h("button",{type:"button",class:"rt-up",title:"Move this whole section up",on:{click:()=>step(sec,-1)}},"↑"),
          h("button",{type:"button",class:"rt-down",title:"Move this whole section down",on:{click:()=>step(sec,1)}},"↓"),
          (()=>{const pb=h("button",{type:"button",class:"rt-addm rt-plus"},"＋");wirePlus(pb,()=>sec,()=>plusTap(sec,pb));return pb})());
        sec.prepend(b);
      }
      const sib=siblingsOf(sec),k=sib.indexOf(sec),up=$(".rt-up",b),down=$(".rt-down",b),am=$(".rt-addm",b);
      up.disabled=k<=0;down.disabled=k===sib.length-1;const can=plusLabel(am,sec);am.hidden=!can;b.hidden=sib.length<2&&!can;
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
  function addItem(holder){
    const lp=holder.dataset.add,tpl=holder.dataset.tpl||"btn";
    const box=$(`[data-l="${CSS.escape(lp)}"]`);
    if(!box){toast("This spot gets its buttons after the next publish.");return}
    let arr=get(lp);if(!Array.isArray(arr)){set(lp,[]);arr=get(lp)}
    const i=arr.length,it=tpl==="hero"?{label:"New button",link:"#projects",icon:"star",color:"#ffd23f"}:{label:"New button",link:"#contact",style:"ghost",icon:""};
    arr.push(it);set(lp,arr);
    const bp=`${lp}.${i}`,ICN=[""].concat(Object.keys(ICONS));
    const x=tpl==="hero"?[["Link",bp+".link","link"],["Icon",bp+".icon","select",ICN],["Color",bp+".color","color",["","--c"]]]
                       :[["Link",bp+".link","link"],["Style",bp+".style","select",["solid","ghost"]],["Icon",bp+".icon","select",ICN]];
    const cls=tpl==="hero"?"":box.classList.contains("xrow")?"btn small ghost":"btn ghost";
    const ico=h("span",{class:"ic","data-ico":bp+".icon"});
    const lab=h("span",{"data-e":bp+".label"},it.label);
    const a=h("a",{class:cls,href:it.link,"data-i":String(i),"data-x":JSON.stringify(x),draggable:"false",style:tpl==="hero"?"--c:"+it.color:null},ico,lab);
    box.append(a);
    if(tpl==="hero")previewIcon(bp+".icon","star");
    for(let n=box;n&&n!==document.body;n=n.parentElement)if(n.hidden)n.hidden=false;
    initText(lab);flash(a);select(lab);startEdit(lab);
    try{getSelection().selectAllChildren(lab)}catch(e){}
    secBars();
  }
  /* ---- the ＋ menu: what can be added depends on where you are */
  const listsIn=el=>$$("[data-l]",el).filter(l=>[...l.children].some(c=>c.hasAttribute("data-i"))&&!l.closest(".rt-ui"));
  function addOptions(u){
    if(!u||!document.contains(u))return [];
    const out=[],seen=new Set(),sec=u.closest("[data-k]")||u;
    const push=(key,label,fn,hint,short)=>{if(seen.has(key))return;seen.add(key);out.push({key,label,fn,hint,short})};
    // 1. another one of the thing you tapped, right after it
    for(const it of chain.length&&chain[0]===u?chain:[u])if(it.hasAttribute&&it.hasAttribute("data-i")&&listOf(it)){const n=unitName(it);push("L"+listPath(it),"Another "+n.toLowerCase(),()=>addLike(it),"right after this one",n);break}
    // 2. the other lists in this section
    listsIn(sec).forEach(l=>{const items=[...l.children].filter(c=>c.hasAttribute("data-i"));const last=items[items.length-1];if(!last)return;
      const n=unitName(last);if(l.dataset.l===((sec.dataset.add||u.dataset.add)||"")&&last.tagName==="A")return;
      push("L"+l.dataset.l,"A "+n.toLowerCase(),()=>addLike(last),"at the end of the list",n)});
    // 3. a button
    const holder=u.hasAttribute("data-add")?u:sec.hasAttribute("data-add")?sec:null;
    if(holder)push("B","A button",()=>addItem(holder),"label, icon and link","Button");
    // 4. a whole new section (main page)
    const main=u.closest('[data-ok="site:section_order"]');
    if(main||$("#projects .ptiles")){const lt=store.get("rt-last-section"),T_=SEC&&SEC.TYPES[lt];
      push("S","A new section…",()=>T_?addSectionOf(main,lt):sectionPicker(main,lastAnchor),"",T_?"New "+T_.label.split(/[ -]/)[0].toLowerCase():"Section");
      out[out.length-1].sub=()=>sectionItems(main)}
    // 5. anything else: describe it to the AI (it gets this spot as context)
    push("AI","✨ Something else…",()=>{select(u);openAI();setTimeout(()=>{const ta=$("#rt-ai textarea");if(ta){ta.value="תוסיף כאן ";ta.focus()}},150)},"tell the AI; it sees this spot","AI");
    return out.length>1?out:[];
  }
  /* tap ＋ = add the usual thing (shown on the button); hold ＋ = menu, slide to a choice and let go (or tap one) */
  const ADD_LAST="rt-add-last";
  const addCtx=u=>(u.closest("[data-k]")||u).dataset.k||"page";
  function lastMap(){try{return JSON.parse(store.get(ADD_LAST)||"{}")}catch(e){return {}}}
  function defaultOpt(u,opts){const k=lastMap()[addCtx(u)];return opts.find(o=>o.key===k)||opts[0]}
  function remember(u,key){const m=lastMap();m[addCtx(u)]=key;store.set(ADD_LAST,JSON.stringify(m))}
  let lastAnchor=null;
  function runOpt(u,o,btn){remember(u,o.key);lastAnchor=btn;o.fn();lastAnchor=null;secBars();place()}
  function plusLabel(btn,u){
    const opts=addOptions(u);if(!opts.length)return false;
    const d=defaultOpt(u,opts);btn.replaceChildren("＋",h("small",{},d.short||""));
    btn.title=`Tap: add ${d.label.replace(/^(A|An|Another) /,"a ").toLowerCase()} · Hold: more choices`;btn.setAttribute("aria-label",btn.title);return true;
  }
  let pm=null;                      // the open hold menu (slide to a choice and let go; rows with › open a sub-menu in place)
  function closePm(){if(pm){clearTimeout(pm.dwell);pm.el.remove();pm.back.remove();pm=null}}
  function pmRender(items,title,sub){
    pm.items=items;pm.title=title;pm.hi=-1;clearTimeout(pm.dwell);
    pm.el.replaceChildren(sub?h("div",{class:"rt-pm-opt rt-pm-back-row","data-n":"-2"},h("span",{},"‹ "+title)):title?h("div",{class:"rt-pm-t"},title):null,
      ...items.map((it,k)=>h("div",{class:"rt-pm-opt"+(it.def?" def":""),"data-n":String(k),role:"menuitem"},
        h("span",{},it.label),it.sub?h("i",{},"›"):it.def?h("i",{},"✓"):it.hint?h("em",{},it.hint):null)));
    pm.el.classList.remove("rt-pm-in");void pm.el.offsetWidth;if(sub!==undefined)pm.el.classList.add("rt-pm-in");
    pmPlace();
  }
  function pmPlace(){
    const el=pm.el,a=pm.anchor,r=a&&document.contains(a)?a.getBoundingClientRect():{right:innerWidth/2+120,top:innerHeight-80,bottom:innerHeight-80};
    const w=el.offsetWidth,hh=el.offsetHeight;
    let top=r.bottom+8;if(top+hh>innerHeight-8)top=Math.max(8,r.top-hh-8);
    el.style.left=Math.max(8,Math.min(innerWidth-w-8,r.right-w))+"px";el.style.top=top+"px";
    el.style.transformOrigin=(top<r.top?"bottom ":"top ")+(r.right-w>8?"right":"left");
  }
  function pmEnter(it){pm.stack.push([pm.items,pm.title]);pmRender(it.sub(),it.label.replace(/…$/,""),true);try{navigator.vibrate&&navigator.vibrate(10)}catch(e){}}
  function pmBack(){const p_=pm.stack.pop();if(p_)pmRender(p_[0],p_[1],pm.stack.length?true:false)}
  function holdMenu(anchor,items,title){
    closePm();
    const back=h("div",{class:"rt-pm-back rt-ui",on:{pointerdown:e=>{e.preventDefault();closePm()}}});
    const el=h("div",{class:"rt-pm rt-ui",role:"menu"});
    document.body.append(back,el);
    pm={el,back,anchor,stack:[],items:[],hi:-1,drag:false,dwell:null};
    pmRender(items,title);
    // inside the menu too: press, slide, let go
    el.addEventListener("pointerdown",e=>{e.preventDefault();e.stopPropagation();try{el.setPointerCapture(e.pointerId)}catch(_){}if(pm)pm.drag=true;pmHover(e.clientX,e.clientY)});
    el.addEventListener("pointermove",e=>{if(pm&&pm.drag)pmHover(e.clientX,e.clientY)});
    el.addEventListener("pointerup",e=>{e.stopPropagation();pmRelease()});
    el.addEventListener("pointercancel",()=>{if(pm)pm.drag=false});
    el.addEventListener("click",e=>e.stopPropagation());
    try{navigator.vibrate&&navigator.vibrate(12)}catch(e){}
    return pm;
  }
  function pmHover(x,y){
    if(!pm)return;const b=document.elementFromPoint(x,y),o=b&&b.closest(".rt-pm-opt");const k=o&&pm.el.contains(o)?+o.dataset.n:-1;
    if(k===pm.hi)return;
    $$(".rt-pm-opt",pm.el).forEach(x=>x.classList.toggle("hi",+x.dataset.n===k));pm.hi=k;clearTimeout(pm.dwell);
    if(k!==-1)try{navigator.vibrate&&navigator.vibrate(6)}catch(e){}
    const it=pm.items[k];
    if(k===-2||(it&&it.sub))pm.dwell=setTimeout(()=>{if(!pm||pm.hi!==k)return;k===-2?pmBack():pmEnter(it)},420);   // rest on › to open it, on ‹ to go back
  }
  function pmRelease(){
    if(!pm)return;pm.drag=false;clearTimeout(pm.dwell);const k=pm.hi;
    if(k===-2)return pmBack();
    const it=pm.items[k];if(!it)return;                     // let go outside the rows: the menu stays open
    if(it.sub)return pmEnter(it);
    closePm();it.fn();
  }
  function wirePlus(btn,getU,onTap){
    let timer=null,held=false,sx=0,sy=0,moved=false;
    const reset=()=>{clearTimeout(timer);timer=null;btn.classList.remove("rt-holding")};
    btn.addEventListener("contextmenu",e=>e.preventDefault());
    btn.addEventListener("click",e=>{e.stopPropagation();e.preventDefault()},true);
    btn.addEventListener("pointerdown",e=>{
      if(e.button>0)return;e.preventDefault();e.stopPropagation();held=false;moved=false;sx=e.clientX;sy=e.clientY;
      btn.classList.add("rt-holding");
      timer=setTimeout(()=>{timer=null;held=true;btn.classList.remove("rt-holding");
        const u=getU();if(!u)return;if(u!==current)select(u);
        const opts=addOptions(u);if(!opts.length)return;const d=defaultOpt(u,opts);
        holdMenu(btn,opts.map(o=>({label:o.label,hint:o.hint,def:o===d,fn:()=>runOpt(u,o,btn),sub:o.sub&&(()=>o.sub().map(x=>Object.assign({},x,{fn:()=>{remember(u,o.key);x.fn();secBars();place()}})))})),"Add here");
      },380);
      const mv=ev=>{if(pm&&held)pmHover(ev.clientX,ev.clientY);else if(Math.hypot(ev.clientX-sx,ev.clientY-sy)>12){moved=true;reset()}};
      const up=ev=>{removeEventListener("pointermove",mv,true);removeEventListener("pointerup",up,true);removeEventListener("pointercancel",up,true);
        if(timer){reset();if(!moved&&ev.type==="pointerup")onTap();return}
        if(held){const eat=e2=>{if(e2.target.closest&&e2.target.closest(".rt-pm"))return;e2.stopPropagation();e2.preventDefault()};addEventListener("click",eat,true);setTimeout(()=>removeEventListener("click",eat,true),450)}   // the click that follows letting go
        if(pm&&held)pmRelease();      // let go on a choice = pick it; let go elsewhere = menu stays open
      };
      addEventListener("pointermove",mv,true);addEventListener("pointerup",up,true);addEventListener("pointercancel",up,true);
    });
  }
  function plusTap(u,btn){
    if(!u)return;if(u!==current)select(u);
    const opts=addOptions(u);if(!opts.length)return;const d=defaultOpt(u,opts);
    runOpt(u,d,btn);
    if(!store.get("rt-hold-tip")){store.set("rt-hold-tip","1");setTimeout(()=>toast("Tip: hold ＋ for more choices (slide to one and let go)."),1200)}
  }
  function addLike(item){
    // a copy of this item after it, with fresh text ready to type
    duplicate(item);
    const c=item.nextElementSibling;if(!c||c.dataset.i===item.dataset.i)return;
    const texts=c.matches("[data-e]")?[c]:$$("[data-e]",c);
    texts.forEach((te,k)=>{const v=k?"Write something here.":"New "+unitName(c).toLowerCase();set(te.dataset.e,v);te.textContent=v});
    const t0=texts[0];if(t0){select(t0);startEdit(t0);try{getSelection().selectAllChildren(t0)}catch(e){}}
  }
  function addSectionOf(after,type){
    const ref=after&&after.dataset.ok==="site:section_order"?after:null;
    store.set("rt-last-section",type);const r_=addSection(ref,{type});if(r_)startEdit($(`[data-e="${r_.base}.title"]`));
  }
  const SEC_HINT={"text-media":"title, text, picture","cards":"grid of boxes","stats":"big numbers","gallery":"pictures","quote":"testimonial","cta":"message + button","list":"short points","faq":"opens on tap","steps":"numbered","banner":"picture/video behind"};
  function sectionItems(after){
    const last=store.get("rt-last-section");
    return Object.entries(SEC.TYPES).map(([k,t])=>({label:t.label,hint:SEC_HINT[k]||"",def:k===last,fn:()=>addSectionOf(after,k)}))
      .concat([{label:"✨ Let the AI build it",fn:()=>{const ref=after&&after.dataset.ok==="site:section_order"?after:null;if(ref)select(ref);openAI();setTimeout(()=>{const ta=$("#rt-ai textarea");if(ta){ta.value="תוסיף סקשן ";ta.focus()}},150)}}]);
  }
  function sectionPicker(after,anchor){
    if(!SEC){toast("One moment, still loading…");return}
    holdMenu(anchor||null,sectionItems(after),"New section");
  }
  /* ---- sections you add yourself (main page) */
  function delPath(p){const[f,ks]=parse(p);let o=docs[f];for(let i=0;i<ks.length-1;i++){if(o==null)return;o=o[ks[i]]}if(o)delete o[ks[ks.length-1]];dirty.add(f);changes++;updateBar()}
  /* one renderer (assets/sections.js) draws these on the site and here, so what you see is what gets published */
  function csStruct(k){return /^(type|layout|cols|width|align|pad|height|icon|media|buttons\.align|items\.\d+\.(icon|image))$/.test(k)}
  let SEC=window.RTSections||null;
  const secLib=SEC?Promise.resolve(SEC):new Promise(ok=>{const sc=document.createElement("script");sc.src=new URL("sections.js"+new URL(ME).search,ME).href;sc.onload=()=>ok(SEC=window.RTSections);sc.onerror=()=>ok(null);document.head.append(sc)});
  function csEnv(){
    return {icons:ICONS,
      media:(path,value)=>{const p_=pending.get(path);if(p_)return{kind:p_.type==="video"?"video":"img",url:p_.url};if(!value)return null;
        const old=$(`[data-cs="${CSS.escape(path)}"]`);if(old&&old.getAttribute("src")&&!/^\//.test(value))return{kind:old.tagName==="VIDEO"?"video":"img",url:old.getAttribute("src")};
        const v=String(value);return{kind:/\.(mp4|mov|webm|m4v)$/i.test(v)?"video":"img",url:/^(\/|https?:|blob:)/.test(v)?v:"https://drive.google.com/thumbnail?id="+v+"&sz=w1600"}},
      iconSrc:name=>{for(const[p_,x]of pending)if(get(p_)===name)return x.url;return name}};
  }
  function csElement(id,c){
    const t=document.createElement("template");t.innerHTML=SEC.render(id,c,csEnv()).trim();return t.content.firstElementChild;
  }
  let csTimer={};
  function csChanged(id,key,v){
    if(key==="type"&&SEC){const T=SEC.TYPES[v];const c=get(`site:custom_sections.${id}`)||{};
      if(T&&T.item)c.items=SEC.convertItems(v,c.items);
      if((v==="cta"||v==="banner")&&!c.align)c.align="center";}
    if(key==="media"&&v){const c=get(`site:custom_sections.${id}`)||{};if((c.type||"text-media")==="text-media"&&(c.layout||"text")==="text")c.layout="image-right"}
    clearTimeout(csTimer[id]);csTimer[id]=setTimeout(()=>rerenderSection(id),120);
  }
  function rerenderSection(id){
    const old=$("#cs-"+id),c=get(`site:custom_sections.${id}`);if(!old||!c||!SEC)return;
    // remember what was selected so it stays selected
    const keep=current&&old.contains(current)?(current===old?{k:1}:current.dataset.i!=null&&current.parentElement&&current.parentElement.dataset.l?{l:current.parentElement.dataset.l,i:current.dataset.i}:{k:1}):null,wasOpen=panelOpen;
    const sec=csElement(id,c);old.replaceWith(sec);
    $$("[data-e]",sec).forEach(initText);secBars();
    if(keep){const el=keep.l?itemEl(keep.l,keep.i)||sec:sec;select(el);if(wasOpen){panelOpen=true;renderPanel();place()}}
  }
  function addSection(after,data){
    if(!$("#projects .ptiles")){toast("New sections go on the main page.");return null}
    if(!SEC){toast("One moment, still loading…");return null}
    const id="s"+Math.random().toString(36).slice(2,7);
    data=Object.assign({},data||{});const type=SEC.TYPES[data.type]?data.type:"text-media";
    const c=SEC.normalize(Object.assign({title:"New section",text:type==="text-media"?"Write something here.":""},type==="cta"||type==="banner"?{align:"center"}:{},
      SEC.TYPES[type].item?{items:SEC.defaults(type,{}).items}:{},data,{type}));
    for(const k of Object.keys(c))if(c[k]===""||c[k]==null)delete c[k];
    if(!get("site:custom_sections"))set("site:custom_sections",{});
    set(`site:custom_sections.${id}`,c);
    const sec=csElement(id,c);
    const ref=after&&after.dataset.ok==="site:section_order"?after:null;
    const all=$$('[data-ok="site:section_order"]');
    if(ref)ref.after(sec);else if(all.length)all[all.length-1].after(sec);else $("footer").before(sec);
    const keys=siblingsOf(sec).map(x=>x.dataset.k),old=get("site:section_order")||[];
    set("site:section_order",keys.concat(old.filter(k=>!keys.includes(k))));
    $$("[data-e]",sec).forEach(initText);secBars();
    sec.scrollIntoView({block:"start"});flash(sec);select($(".cs-copy h2",sec));
    return {id,key:"cs_"+id,base:`site:custom_sections.${id}`};
  }
  function deleteSection(sec,quiet){
    if(!quiet&&!confirm("Delete this whole section?"))return "cancelled";
    const id=sec.dataset.k.slice(3);delPath(`site:custom_sections.${id}`);
    set("site:section_order",(get("site:section_order")||[]).filter(k=>k!==sec.dataset.k));
    sec.remove();current=null;chain=[];panelOpen=false;renderPanel();place();secBars();return "removed";
  }
  function addNew(item){
    // a fresh item right after this one: same look, text ready to type
    duplicate(item);
    const c=item.nextElementSibling;if(!c)return;
    const te=c.matches("[data-e]")?c:$("[data-e]",c);
    if(te){set(te.dataset.e,"New");te.textContent="New";select(te);startEdit(te);try{getSelection().selectAllChildren(te)}catch(e){}}
    if(c.parentElement&&c.parentElement.classList.contains("repo-tech"))status("The card shows the first 4 skills, the code page shows all of them. Move one with the arrows to choose which 4.");
  }
  function remove(item,quiet){
    if((item.dataset.k||"").startsWith("cs_"))return deleteSection(item,quiet);
    if(!quiet&&!confirm(`Delete this ${unitName(item).toLowerCase()}?`))return;
    listOp(item,(arr,perm,pos)=>{arr.splice(pos,1);perm.splice(pos,1)});
    item.remove();
    current=null;chain=[];panelOpen=false;renderPanel();place();
  }
  function flash(el){el.animate([{outline:"3px solid #ffd23f",outlineOffset:"4px"},{outline:"3px solid transparent",outlineOffset:"4px"}],{duration:900})}

  /* ------------------------------------------------------------ media */
  const rand=()=>Math.random().toString(36).slice(2,6);
  const slugify=s=>(s||"file").toLowerCase().replace(/\.[^.]+$/,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,40)||"file";
  const pending=new Map();              // content path -> {url,type,name} of media chosen but not published yet
  function previewBox(url,type,name,extra,small){
    return new Promise(done=>{
      const media=type==="audio"?h("audio",{src:url,controls:true,autoplay:true,style:"width:100%;display:block"}):type==="video"
        ?h("video",{src:url,controls:true,autoplay:true,muted:true,loop:true,playsinline:true,style:"width:100%;max-height:55vh;border-radius:10px;background:#000;display:block"})
        :small?h("div",{style:"display:flex;gap:18px;align-items:center;justify-content:center;padding:18px;background:#0b0b0b;border-radius:10px"},
            h("img",{src:url,alt:"",style:"width:96px;height:96px;object-fit:contain"}),h("img",{src:url,alt:"",style:"width:32px;height:32px;object-fit:contain"}),h("img",{src:url,alt:"",style:"width:18px;height:18px;object-fit:contain"}))
        :h("img",{src:url,alt:"",style:"width:100%;max-height:55vh;object-fit:contain;border-radius:10px;background:#0b0b0b;display:block"});
      const note=h("p",{style:"color:#aaa;font-size:13px;margin:8px 0 0"},name,extra?h("br"):null,extra||null);
      if(type==="video")media.addEventListener("error",()=>{note.textContent="This browser can't play "+name+" here, but it will be converted to a web video when you publish."});
      const close=v=>{m.remove();done(v)};
      const m=modal(h("h3",{},"Preview"),media,note,
        h("div",{class:"rt-row"},h("button",{class:"rt-btn",type:"button",on:{click:()=>close("cancel")}},"Cancel"),
          h("button",{class:"rt-btn",type:"button",on:{click:()=>close("again")}},"Choose another"),
          h("button",{class:"rt-btn pri",type:"button",on:{click:()=>close("use")}},"Use it")));
    });
  }
  function thumb(path){
    const p=pending.get(path);if(!p)return null;
    const el=p.type==="video"?h("video",{src:p.url,muted:true,loop:true,autoplay:true,playsinline:true}):h("img",{src:p.url,alt:""});
    el.style.cssText="width:100%;max-height:150px;object-fit:cover;border-radius:8px;margin-top:6px;display:block;background:#000";
    return h("div",{},el,h("div",{class:"rt-file"},"New, not published yet · "+p.name));
  }
  function pickFile(kind){
    return new Promise(done=>{
      const inp=h("input",{type:"file",accept:kind==="video"?"video/*,image/gif":kind==="media"?"image/*,video/*":kind==="audio"?"audio/*":"image/*",style:"display:none"});   // icons: any image, GIF included
      inp.addEventListener("change",()=>{done(inp.files[0]||null);inp.remove()});
      ui.append(inp);inp.click();
    });
  }
  async function prepIcon(file){
    // icons show at 16–32 px; a square 128×128 keeps them sharp on any screen
    const bmp=await new Promise((ok,no)=>{const i=new Image();i.onload=()=>ok(i);i.onerror=()=>no(new Error("This image can't be read in this browser."));i.src=URL.createObjectURL(file)});
    const w=bmp.naturalWidth,hh=bmp.naturalHeight,sq=Math.abs(w-hh)<=Math.max(w,hh)*.1;
    const tip=(sq?"":"Square images work best. ")+"Recommended: 128×128 px"+(file.type==="image/gif"?", under 300 KB.":".");
    if(file.type==="image/gif")
      return{blob:file,ext:"gif",note:`GIF ${w}×${hh}, ${Math.round(file.size/1024)} KB. It keeps its animation and is shrunk to 128 px when you publish. ${tip}`};
    const sc=Math.min(1,128/Math.max(w,hh)),c=document.createElement("canvas");
    c.width=Math.max(1,Math.round(w*sc));c.height=Math.max(1,Math.round(hh*sc));
    c.getContext("2d").drawImage(bmp,0,0,c.width,c.height);
    const blob=await new Promise(ok=>c.toBlob(ok,"image/png"));
    return{blob,ext:"png",note:`Resized from ${w}×${hh} to ${c.width}×${c.height} px. ${tip}`};
  }
  async function prepImage(file,kind){
    // phone photos (HEIC, huge JPEGs) are converted here so the build can read them
    if(file.type==="image/gif")return{blob:file,ext:"gif"};      // keep GIFs as they are
    const okType=/^image\/(jpeg|png|webp)$/.test(file.type);
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
  async function replaceMedia(path,kind0,el,given){
    const file=given||await pickFile(kind0);if(!file)return;
    let kind=kind0;if(kind==="media")kind=file.type.startsWith("video/")||file.type==="image/gif"?"video":"image";   // either works here
    let blob=file,ext=(file.name.split(".").pop()||"").toLowerCase(),note="";
    try{
      if(kind==="audio"){
        if(file.size>25e6){alertBox("That sound is "+Math.round(file.size/1e6)+" MB. Keep it under about 25 MB (a few minutes of music).");return}
        if(!/^(mp3|m4a|aac|wav|ogg|oga|flac|webm)$/.test(ext))ext="mp3";
      }else if(kind==="video"){
        if(file.size>70e6){alertBox("That video is "+Math.round(file.size/1e6)+" MB. GitHub takes up to about 70 MB per file here; trim it or export it smaller first.");return}
        if(!/^(mp4|mov|webm|m4v|gif)$/.test(ext))ext="mp4";      // a GIF here becomes a looping video
      }else if(kind==="icon")({blob,ext,note}=await prepIcon(file));
      else({blob,ext}=await prepImage(file,kind));
    }catch(e){alertBox(e.message);return}
    const url=URL.createObjectURL(blob),isGif=blob.type==="image/gif"||ext==="gif";
    const choice=given?"use":await previewBox(url,kind==="audio"?"audio":kind==="video"&&!isGif?"video":"image",file.name,note,kind==="icon");
    if(choice==="again"){URL.revokeObjectURL(url);return replaceMedia(path,kind0,el)}
    if(choice!=="use"){URL.revokeObjectURL(url);return}
    const repoPath=`assets/uploads/${slugify(file.name)}-${rand()}.${ext}`;
    const old=get(path);if(typeof old==="string"&&old.startsWith("/assets/uploads/"))uploads.delete(old.slice(1));
    uploads.set(repoPath,blob);set(path,"/"+repoPath);
    pending.set(path,{url,type:kind==="video"&&!isGif?"video":"image",name:file.name});
    if(kind==="audio"){toast("Sound ready. It goes live when you publish.");if(settingsOpen)siteSettings();return}
    if(kind==="icon"){previewIcon(path,url);toast("New icon in place. It goes live when you publish.");renderPanel();return}
    const swapVideo=v=>{                     // a GIF can't play inside <video>: lay an image over it
      let im=v.nextElementSibling;if(!(im&&im.classList.contains("rt-gif"))){im=document.createElement("img");im.className=v.className+" rt-gif";im.alt="";v.after(im)}
      im.src=url;v.style.visibility="hidden";
    };
    const setVideo=v=>{const g=v.nextElementSibling;if(g&&g.classList.contains("rt-gif"))g.remove();v.style.visibility="";v.removeAttribute("poster");v.src=url;v.load();v.play().catch(()=>{})};
    $$(`[data-m="${CSS.escape(path)}"]`).forEach(m=>{
      if(m.tagName==="IMG"){m.src=url;m.removeAttribute("srcset");m.style.visibility=""}
      else{const v=$("video",m);if(v)isGif?swapVideo(v):setVideo(v);if(!isGif)m.dataset.src=url;m.classList.add("rt-new")}
    });
    if(path.endsWith(".cover")&&$(".phero-bg"))$(".phero-bg").src=url;
    const heroMain=path==="site:hero_video",heroPhone=path==="site:hero_video_mobile",tall=matchMedia("(max-aspect-ratio: 1/1)").matches;
    if(heroMain){set("site:hero_video_mobile","/"+repoPath);pending.set("site:hero_video_mobile",pending.get(path))}   // same video on phones unless a phone version is picked
    $$("[data-bg]").filter(b=>b.dataset.bg.split(" ").includes(path)).forEach(b=>{
      if(b.tagName==="VIDEO"){if(heroPhone&&!tall)return;isGif?swapVideo(b):setVideo(b);b.scrollIntoView&&scrollTo({top:0,behavior:"smooth"})}
      else{b.src=url;b.hidden=false;if(b.parentElement&&b.parentElement.hidden)b.parentElement.hidden=false}});
    if(path==="site:bp_media"){                 // the Blueprint window: swap the drawing for the new picture
      const body=$(".bp-body");if(body){$$(":scope>svg,:scope>.bp-media",body).forEach(x=>x.remove());
        const m=kind==="video"&&!isGif?h("video",{class:"bp-media",src:url,autoplay:true,muted:true,loop:true,playsinline:true}):h("img",{class:"bp-media",src:url,alt:""});
        body.append(m);if(m.play)m.play().catch(()=>{})}}
    if(path.endsWith(".poster")){const v=el&&$("video",el);if(v){v.poster=url;v.removeAttribute("src");v.load()}}
    panelOpen=false;renderPanel();                       // close settings so the new media is in view
    if(/(showreel_video|full_video)$/.test(path)){toast("Saved. This video opens when someone taps its play button; tap it in 👁 Preview to watch it.");renderPanel();return}
    if(heroPhone&&!tall){toast("Saved as the phone version: it shows on phones (tap 👁 Preview on your phone to see it).");renderPanel();return}
    toast(kind==="video"?"Swapped in. Tap 👁 Preview to see the page as visitors will, then Publish.":"Swapped in. Tap 👁 Preview to see the page as visitors will, then Publish.");
    renderPanel();
  }

  /* ------------------------------------------------------------ settings panel */
  const COLOR_VAR={color_main:"--mid",color_deep:"--deep",color_accent:"--accent"};
  const tgtOf=(holder,sel)=>!sel?holder:sel[0]==="^"?holder.closest(sel.slice(1)):$(sel,holder);
  function previewColor(holder,path,v,opts){
    const k=path.split(".").pop();
    if(opts&&opts.length){const t=tgtOf(holder,opts[0]);if(t){if(v)t.style.setProperty(opts[1],v);else t.style.removeProperty(opts[1])}return}
    const cv=COLOR_VAR[k];if(!cv){holder.style.setProperty("--c",v);return}
    const tgt=holder.classList.contains("phero")?document.documentElement:holder;
    tgt.style.setProperty(cv,v);
    if(holder.dataset.mid!==undefined&&k==="color_main")holder.dataset.mid=v;
    if(holder.dataset.deep!==undefined&&k==="color_deep")holder.dataset.deep=v;
  }
  /* ---- color wheel: hue around the circle, saturation toward the edge, brightness slider, exact HEX */
  const hexOk=v=>/^#[0-9a-f]{6}$/i.test(v);
  const toRgb=x=>[1,3,5].map(i=>parseInt(x.slice(i,i+2),16));
  const toHex=(r,g,b)=>"#"+[r,g,b].map(v=>Math.round(Math.max(0,Math.min(255,v))).toString(16).padStart(2,"0")).join("");
  function hsv2rgb(hh,ss,vv){const f=n=>{const k=(n+hh/60)%6;return vv-vv*ss*Math.max(0,Math.min(k,4-k,1))};return[f(5)*255,f(3)*255,f(1)*255]}
  function rgb2hsv(r,g,b){r/=255;g/=255;b/=255;const mx=Math.max(r,g,b),mn=Math.min(r,g,b),d=mx-mn;let hh=0;
    if(d){hh=mx===r?((g-b)/d)%6:mx===g?(b-r)/d+2:(r-g)/d+4;hh*=60;if(hh<0)hh+=360}return[hh,mx?d/mx:0,mx]}
  const SWATCHES=["#ffd23f","#ff8fc0","#38b6ff","#9be15d","#ff9f5a","#6fd3c2","#b07cff","#ff5a5a","#ffffff","#0c2f6e"];
  function colorField(val,apply){
    let [H,S,V]=hexOk(val)?rgb2hsv(...toRgb(val)):[45,.75,1];
    const sw=h("button",{type:"button",class:"rt-sw",title:"Open the color wheel",style:`background:${val||"transparent"}`});
    const hexIn=h("input",{type:"text",value:val,placeholder:"#rrggbb",spellcheck:"false",maxlength:"7"});
    const size=210,cv=h("canvas",{width:size*2,height:size*2,style:`width:${size}px;height:${size}px`}),dot=h("span",{class:"rt-wdot"});
    const val_=h("input",{type:"range",min:"0",max:"100",value:String(Math.round(V*100)),class:"rt-val"});
    const prev=h("span",{class:"rt-prev"});
    const sws=h("div",{class:"rt-sws"},...SWATCHES.map(c=>h("button",{type:"button",title:c,style:`background:${c}`,on:{click:()=>{[H,S,V]=rgb2hsv(...toRgb(c));sync(true)}}})));
    const wheel=h("div",{class:"rt-wheel",hidden:true},h("div",{class:"rt-disc"},cv,dot),h("div",{class:"rt-vrow"},h("span",{},"☀"),val_,prev),sws);
    // the disc is drawn once at full brightness; the slider darkens it with an overlay
    const ctx=cv.getContext("2d"),img=ctx.createImageData(size*2,size*2),R0=size;
    for(let y=0;y<size*2;y++)for(let x=0;x<size*2;x++){const dx=x-R0,dy=y-R0,r=Math.hypot(dx,dy),i=(y*size*2+x)*4;
      if(r>R0){img.data[i+3]=0;continue}
      const [rr,gg,bb]=hsv2rgb((Math.atan2(dy,dx)*180/Math.PI+360)%360,r/R0,1);img.data[i]=rr;img.data[i+1]=gg;img.data[i+2]=bb;img.data[i+3]=r>R0-1.5?Math.round((R0-r)/1.5*255):255}
    ctx.putImageData(img,0,0);
    const shade=h("span",{class:"rt-shade"});
    function sync(commit){
      const hex=toHex(...hsv2rgb(H,S,V));
      const a=H*Math.PI/180;dot.style.left=(size/2+Math.cos(a)*S*size/2)+"px";dot.style.top=(size/2+Math.sin(a)*S*size/2)+"px";
      dot.style.background=hex;shade.style.opacity=String(1-V);
      val_.style.background=`linear-gradient(90deg,#000,${toHex(...hsv2rgb(H,S,1))})`;val_.value=String(Math.round(V*100));
      prev.style.background=hex;sw.style.background=hex;
      if(document.activeElement!==hexIn)hexIn.value=hex;
      if(commit)apply(hex);
    }
    $(".rt-disc",wheel).append(shade);
    const pick=e=>{const r=cv.getBoundingClientRect(),dx=e.clientX-r.left-r.width/2,dy=e.clientY-r.top-r.height/2;
      H=(Math.atan2(dy,dx)*180/Math.PI+360)%360;S=Math.min(1,Math.hypot(dx,dy)/(r.width/2));if(V<.08)V=1;sync(true)};
    const disc=$(".rt-disc",wheel);
    disc.addEventListener("pointerdown",e=>{e.preventDefault();disc.setPointerCapture(e.pointerId);pick(e)});
    disc.addEventListener("pointermove",e=>{if(e.buttons||e.pressure)pick(e)});
    val_.addEventListener("input",()=>{V=val_.value/100;sync(true)});
    hexIn.addEventListener("input",()=>{let v=hexIn.value.trim();if(v&&v[0]!=="#")v="#"+v;if(hexOk(v)){[H,S,V]=rgb2hsv(...toRgb(v));sync(true)}});
    hexIn.addEventListener("blur",()=>{hexIn.value=hexOk(hexIn.value)?hexIn.value.toLowerCase():toHex(...hsv2rgb(H,S,V))});
    sw.addEventListener("click",()=>{wheel.hidden=!wheel.hidden;if(!wheel.hidden)sync(false);place()});
    sync(false);if(!val){sw.style.background="transparent";hexIn.value=""}
    const reset=h("button",{class:"rt-btn sm",type:"button",title:"Back to the default color",on:{click:()=>{apply("");hexIn.value="";sw.style.background="transparent";wheel.hidden=true}}},"↺");
    return h("div",{},h("div",{class:"rt-color"},sw,hexIn,reset),wheel);
  }
  function previewLayout(holder,v){
    const g=$(".mech-grid",holder);if(!g)return;
    const n=$$(":scope>[data-i]",g).length,cols={"one-big":1,two:2,three:3}[v]||Math.min(Math.max(n,1),3);
    g.className=g.className.replace(/\bn\d\b/,"n"+cols);
  }
  function field(holder,[label,path,type,opts]){
    let val=get(path)??"";
    const wrap=h("div",{},h("label",{},label));
    if(type==="color"){
      const apply=v=>{set(path,v);previewColor(holder,path,v,opts)};
      wrap.append(colorField(/^#[0-9a-f]{6}$/i.test(val)?val:"",apply));
    }else if(type==="textarea"){
      const t=h("textarea",{rows:"8",spellcheck:"false",style:"width:100%;background:#0e0e0e;color:#e6edf3;border:1px solid #3a3a3a;border-radius:8px;padding:8px;font:12.5px/1.5 ui-monospace,Consolas,monospace;direction:ltr"},String(val||""));
      t.addEventListener("input",()=>{set(path,t.value);if(path==="site:custom_css")applyCustomCss(t.value)});
      wrap.append(t);
    }else if(type==="range"){
      const [mn,mx,st,unit,cssVar,sel]=opts,tg=()=>tgtOf(holder,sel);
      const num=h("span",{class:"rt-num"}),r=h("input",{type:"range",min:String(mn),max:String(mx),step:String(st),value:String(val===""?mn:val)});
      const show_=()=>{num.textContent=val===""&&r.dataset.touched!=="1"?"default":r.value+unit};
      r.addEventListener("input",()=>{r.dataset.touched="1";set(path,Number(r.value));const t=cssVar&&tg();if(t)t.style.setProperty(cssVar,r.value+unit);show_()});
      const reset=h("button",{class:"rt-btn sm",type:"button",title:"Back to the default",on:{click:()=>{set(path,"");r.dataset.touched="";r.value=String(mn);const t=cssVar&&tg();if(t)t.style.removeProperty(cssVar);val="";show_()}}},"↺");
      show_();wrap.append(h("div",{class:"rt-color"},r,num,reset));
    }else if(type==="toggle"){
      const [cls,sel]=opts;
      const cb=h("input",{type:"checkbox",checked:!!val}),lab=h("label",{class:"rt-switch"},cb,h("span",{}),h("b",{},val?"On":"Off"));
      cb.addEventListener("change",()=>{set(path,cb.checked);const t=cls&&tgtOf(holder,sel);if(t)t.classList.toggle(cls,cb.checked);$("b",lab).textContent=cb.checked?"On":"Off"});
      wrap.append(lab);
    }else if(type==="select"){
      const own=/icon$/.test(path)&&/^\//.test(val);
      const s=h("select",{},...(own?[h("option",{value:val,selected:true},"(your image)")]:[]),...opts.map(o=>h("option",{value:o,selected:o===val},o||"(none)")));
      if(/icon$/.test(path))setTimeout(()=>wrap.append(h("div",{class:"rt-row",style:"margin-top:6px"},
        h("button",{class:"rt-btn sm",type:"button",on:{click:()=>replaceMedia(path,"icon",holder)}},"⬆ Upload your own icon (image / GIF)")),thumb(path)||h("p",{class:"rt-hint"},"Best: a square image, 128×128 px. Bigger ones are shrunk for you.")));
      s.addEventListener("change",()=>{set(path,s.value);if(path.endsWith(".layout"))(holder.classList.contains("custom-sec")?holder.className=holder.className.replace(/\blay-\S+/,"lay-"+s.value):previewLayout(holder,s.value));if(/icon$/.test(path))previewIcon(path,s.value);
        if(path.endsWith(".style")&&holder.classList.contains("btn"))holder.classList.toggle("ghost",s.value==="ghost");
        if(path.endsWith(".align"))holder.className=holder.className.replace(/\bal-\w+/,"al-"+s.value);
        if(path.endsWith(".position")){const sec=holder.closest("[data-k]"),w=holder.parentElement,bar=$(":scope>.rt-secbar",sec);
          holder.classList.toggle("top",s.value==="top");if(s.value==="top")(bar?bar.after(w):sec.prepend(w));else sec.append(w);place()}});
      wrap.append(s);
    }else if(type==="audio"){
      const p_=pending.get(path);
      wrap.append(h("div",{class:"rt-row"},h("button",{class:"rt-btn sm",type:"button",on:{click:()=>replaceMedia(path,"audio",holder)}},val?"Replace…":"Upload a sound…"),
        val?h("button",{class:"rt-btn sm dan",type:"button",on:{click:()=>{set(path,"");pending.delete(path);siteSettings()}}},"Remove"):null),
        h("div",{class:"rt-file"},p_?"New, not published yet · "+p_.name:val?String(val).split("/").pop():"none"));
    }else if(type==="image"||type==="art"||type==="video"||type==="media"){
      wrap.append(h("div",{class:"rt-row"},h("button",{class:"rt-btn sm",type:"button",on:{click:()=>replaceMedia(path,type,holder)}},val?"Replace…":"Add…"),
        val&&!/^(cover)$/.test(path.split(".").pop())?h("button",{class:"rt-btn sm dan",type:"button",on:{click:()=>{set(path,"");renderPanel();toast("Removed. The site updates after you publish.")}}},"Remove"):null),
        thumb(path)||h("div",{class:"rt-file"},val?String(val).split("/").pop():"none"));
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
      const old=$("svg,img",c),size=old?old.getAttribute("width"):"18";
      if(name&&/^(blob:|\/)/.test(name)){c.innerHTML=`<img class="ico-img" src="${name}" width="${size}" height="${size}" alt="">`;if(c.classList.contains("h-ico"))c.hidden=false;return}
      if(name&&ICONS[name]&&ICONS[name].startsWith("<svg")){c.innerHTML=ICONS[name].replace("<svg ",`<svg width="${size}" height="${size}" `);if(c.hidden)c.hidden=false;return}
      if(c.matches(".ui-ic"))c.hidden=!name;
      c.innerHTML=name&&ICONS[name]?`<svg viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="${size>18?1.9:2}" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</svg>`:"";
      if(c.classList.contains("h-ico"))c.hidden=!name;
    });
  }
  function hasSettings(u){return mediaOf(u).some(m=>m!==clickedMedia)||fieldsOf(u).length>0||(u.tagName==="A"&&!!u.getAttribute("href"))}
  let settingsOpen=false;
  function aiSettingsBlock(){
    // saved on this device only (not on the site)
    const pv=h("select",{},h("option",{value:"app",selected:provider()==="app"},"🔌 AI app on this device (Ollama / LM Studio)"),h("option",{value:"local",selected:provider()==="local"},"📱 Inside the browser (free, private)"),h("option",{value:"gemini",selected:provider()==="gemini"},"Gemini (free key, backup)"));
    pv.addEventListener("change",()=>{store.set(AI_PROV,pv.value);if(provBtn)provBtn.textContent=PROV_ICON[pv.value]});
    const au=h("input",{type:"text",value:appUrl(),spellcheck:"false"});au.addEventListener("change",()=>{store.set(APP_URL,au.value.trim());store.set(APP_MODEL,"");isOllama=null});
    const am=h("select",{},h("option",{value:store.get(APP_MODEL)||""},store.get(APP_MODEL)||"(first model the app offers)"));
    am.addEventListener("change",()=>store.set(APP_MODEL,am.value));
    const ast=h("p",{class:"rt-hint"},"");
    const chk=h("button",{class:"rt-btn sm",type:"button",on:{click:async()=>{ast.textContent="Connecting…";try{const ms=await appModels();am.replaceChildren(...ms.map(m=>h("option",{value:m,selected:m===store.get(APP_MODEL)},m)));if(!store.get(APP_MODEL)&&ms[0])store.set(APP_MODEL,ms[0]);ast.textContent="Connected ✓ "+ms.length+" model(s)"}catch(e){ast.textContent="Can't reach it: "+errText(e)}}}},"🔌 Check connection");
    const md=h("select",{},...LOCAL_MODELS.map(([v,l])=>h("option",{value:v,selected:(store.get(AI_LOCAL)||"auto")===v},l)));
    md.addEventListener("change",()=>{store.set(AI_LOCAL,md.value)});
    const st=h("p",{class:"rt-hint"},"gpu" in navigator?"This browser can run it.":"This browser can't run on-device AI (no WebGPU); Gemini will be used.");
    const dl=h("button",{class:"rt-btn sm",type:"button",on:{click:async()=>{dl.disabled=true;try{await ensureEngine(r=>{st.textContent=`Downloading… ${Math.round((r.progress||0)*100)}%`});st.textContent="Ready on this device ✓"}catch(e){st.textContent="Couldn't load: "+e.message}dl.disabled=false}}},"⬇ Download the model now (Wi-Fi)");
    return h("div",{},h("label",{},"✨ AI assistant on this device"),pv,
      h("label",{},"AI app address"),au,h("label",{},"AI app model"),am,h("div",{class:"rt-row",style:"margin-top:8px"},chk),ast,
      h("label",{},"In-browser model"),md,h("div",{class:"rt-row",style:"margin-top:8px"},dl,
      h("button",{class:"rt-btn sm",type:"button",on:{click:aiKeyBox}},"🔑 Gemini key")),st);
  }
  function siteSettings(){
    // sound for the whole site; off until switched on here
    settingsOpen=true;current=null;chain=[];panelOpen=false;place();
    const sp="site:sound",snd=get(sp)||{},F=(f)=>field(document.body,f);
    const audioUrl=pth=>{const pn=pending.get(pth);if(pn)return pn.url;const v=get(pth);return v?new URL(String(v).replace(/^\//,""),new URL("../",ME)).href:""};
    let playing=null;
    const own=/^\//.test(snd.click||"");
    panel.replaceChildren(
      h("div",{class:"rt-head"},h("span",{},"Site settings · sound"),h("button",{class:"rt-x",type:"button","aria-label":"Close",on:{click:()=>{settingsOpen=false;if(playing)playing.pause();panel.style.display="none"}}},"✕")),
      F(["Sound on the site (visitors get a small speaker button)",sp+".enabled","toggle",["",null]]),
      F(["Start with sound on (otherwise visitors turn it on themselves)",sp+".start","toggle",["",null]]),
      F(["Background music",sp+".music","audio"]),
      F(["Music volume",sp+".mv","range",[0,100,5,"%",null]]),
      h("div",{class:"rt-row",style:"margin-top:8px"},h("button",{class:"rt-btn sm",type:"button",on:{click:e=>{
        if(playing){playing.pause();playing=null;e.target.textContent="▶ Play music";return}
        const u=audioUrl(sp+".music");if(!u){toast("Upload background music first.");return}
        playing=window.rtSound&&window.rtSound.music(u,(get(sp+".mv")??40)/100);e.target.textContent="■ Stop music"}}},"▶ Play music")),
      F(["Click sound on buttons and links",sp+".click","select",(own?[snd.click]:[]).concat(["none","soft","pop","blip","tick","wood"])]),
      h("div",{class:"rt-row",style:"margin-top:6px"},h("button",{class:"rt-btn sm",type:"button",on:{click:()=>replaceMedia(sp+".click","audio",document.body)}},"⬆ Use my own click sound")),
      F(["Click volume",sp+".cv","range",[0,100,5,"%",null]]),
      h("div",{class:"rt-row",style:"margin-top:8px"},h("button",{class:"rt-btn sm",type:"button",on:{click:()=>{
        const k=get(sp+".click")||"soft",u=/^\//.test(k)?audioUrl(sp+".click"):k;window.rtSound&&window.rtSound.click(u,(get(sp+".cv")??50)/100)}}},"▶ Test click")),
      h("div",{style:"margin-top:16px;border-top:1px solid #2c2c2c"}),
      aiSettingsBlock(),
      h("div",{style:"margin-top:16px;border-top:1px solid #2c2c2c"}),
      F(["Notes for the AI (your own words, terms and style; it reads these every time, on top of its guide)","site:ai_notes","textarea"]),
      F(["Custom CSS (advanced, all pages · the ✨ AI writes here for layout changes)","site:custom_css","textarea"]),
      h("p",{class:"rt-hint"},"Everything is off until you switch on the first option. Browsers only let music start after the visitor touches the page; music pauses while a video plays."));
    const sel_=$$("select",panel).find(x=>[...x.options].some(o=>o.value==="pop"));if(own&&sel_&&sel_.options[0])sel_.options[0].textContent="(your sound)";
    panel.style.display="block";
    if(innerWidth>640){panel.style.top="72px";panel.style.left="";panel.style.right="12px"}
  }
  function renderPanel(){
    if(settingsOpen&&!current)return;
    settingsOpen=false;panel.style.right="";
    panel.replaceChildren();
    if(!current||!panelOpen){panel.style.display="none";place();return}
    const u=current;
    panel.append(h("div",{class:"rt-head"},h("span",{},unitName(u)),h("button",{class:"rt-x",type:"button","aria-label":"Close",on:{click:()=>{panelOpen=false;renderPanel()}}},"✕")));
    const mseen=new Set(),fl=fieldsOf(u),isMediaF=f=>/^(video|image|art|media)$/.test(f[2]);
    fl.filter(isMediaF).forEach(f=>{mseen.add(f[1]);panel.append(field(u,f))});   // backgrounds / covers first
    mediaOf(u).forEach(m=>{const p=m.dataset.m;if(mseen.has(p))return;mseen.add(p);
      const kind=m.dataset.mk,last=p.split(/[.:]/).pop(),lab={showreel_video:"Video that opens from the \u201cWatch showreel\u201d button",full_video:"Full video",mascot:"Character cut-out",cover:"Cover image",video:"Clip video"}[last]||(kind==="video"?"Video":"Image");
      panel.append(h("label",{},lab),h("div",{class:"rt-row"},h("button",{class:"rt-btn sm",type:"button",on:{click:()=>replaceMedia(p,kind,m)}},"Replace…")),thumb(p)||h("div",{class:"rt-file"},String(get(p)||"").split("/").pop()))});
    fl.filter(f=>!isMediaF(f)&&!mseen.has(f[1])).forEach(f=>panel.append(field(u,f)));
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
    if(document.documentElement.classList.contains("rt-preview")){   // preview: everything works except leaving the page
      const a=t.closest("a[href]");const hr=a&&a.getAttribute("href");
      if(a&&hr&&!hr.startsWith("#")){e.preventDefault();e.stopImmediatePropagation();toast("Links stay off until you publish, so your changes aren't lost.")}
      return;
    }
    if(t.closest(".jump,.viewer,.edit-in"))return;           // the jump menu still moves between pages (top-bar links are editable now)
    const act=t.closest("a,button,summary,label,.clip,.zoom");
    const te=t.closest("[data-e]");
    if(act){e.preventDefault();e.stopImmediatePropagation()}
    if(te&&te.isContentEditable)return;                       // typing: let the caret move
    const now=Date.now();
    if(te&&lastTap.el===te&&now-lastTap.t<450){lastTap={};select(t);startEdit(te,e.clientX,e.clientY);return}
    lastTap={el:te,t:now};
    select(t);
  },true);
  document.addEventListener("dblclick",e=>{const te=e.target.closest("[data-e]");if(loaded&&!document.documentElement.classList.contains("rt-preview")&&te&&!e.target.closest(".rt-ui")){e.preventDefault();startEdit(te,e.clientX,e.clientY)}},true);
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
  /* ------------------------------------------------------------ ✨ AI assistant (Gemini, free key from Google AI Studio)
     It reads what this page can change, then calls the same tools you use by hand. Nothing is published until you press Publish. */
  const AI_KEY="rt-gemini-key",AI_MODEL="rt-gemini-model",GAPI="https://generativelanguage.googleapis.com/v1beta";
  const PROV_ICON={local:"📱",app:"🔌",gemini:"G"};
  let provBtn=null,aiBox=null,aiLog=null,aiHist=[],aiFiles=[],aiBusy=false,rec=null,aiLang="he-IL";
  function applyCustomCss(css){let st=document.getElementById("custom-css");if(!st){st=document.createElement("style");st.id="custom-css";document.head.append(st)}st.textContent=css||""}
  function fieldDef(path){
    for(const el of $$("[data-x]")){if(!el.dataset.x.includes(path))continue;try{const f=JSON.parse(el.dataset.x).find(x=>x[1]===path);if(f)return{holder:el,f}}catch(e){}}
    return null;
  }
  function applyValue(path,raw){
    const fd=fieldDef(path),type=fd?fd.f[2]:"text",opts=fd?fd.f[3]:null,holder=fd&&fd.holder;
    const texts=$$(`[data-e="${CSS.escape(path)}"]`);
    if(!fd&&!texts.length&&path!=="site:custom_css"&&get(path)===undefined)return "unknown path "+path+" (use one from the list)";
    let v=raw;
    if(type==="range")v=Number(raw);else if(type==="toggle")v=raw===true||raw==="true"||raw==="on";
    if(type==="color"&&v&&!/^#[0-9a-f]{6}$/i.test(v))return "colors must be #rrggbb";
    if(type==="select"&&opts&&!opts.includes(v)&&!/icon$/.test(path))return "allowed values: "+opts.join(", ");
    set(path,v);
    texts.forEach(t=>{t.textContent=v});
    if(path==="site:custom_css")applyCustomCss(v);
    if(fd){
      if(type==="color")previewColor(holder,path,v,opts);
      else if(type==="select"){if(/icon$/.test(path))previewIcon(path,v);if(path.endsWith(".layout"))(holder.classList.contains("custom-sec")?holder.className=holder.className.replace(/\blay-\S+/,"lay-"+v):previewLayout(holder,v));
        if(path.endsWith(".style")&&holder.classList.contains("btn"))holder.classList.toggle("ghost",v==="ghost");
        if(path.endsWith(".align"))holder.className=holder.className.replace(/\bal-\w+/,"al-"+v)}
      else if(type==="range"){const [, , , unit,cssVar,sel]=opts;const t=cssVar&&tgtOf(holder,sel);if(t)t.style.setProperty(cssVar,v+unit)}
      else if(type==="toggle"){const [cls,sel]=opts;const t=cls&&tgtOf(holder,sel);if(t)t.classList.toggle(cls,!!v)}
      else if(type==="link"&&holder.tagName==="A")holder.setAttribute("href",v);
    }
    return "ok";
  }
  // turn whatever the AI sent (fields, a JSON string, buttons as a plain list) into a clean section
  function sectionData(a){
    let d=a&&typeof a==="object"?Object.assign({},a):{};
    for(const k of ["section","content","json"])if(typeof d[k]==="string"){try{Object.assign(d,JSON.parse(d[k]))}catch(e){}delete d[k]}else if(d[k]&&typeof d[k]==="object"){Object.assign(d,d[k]);delete d[k]}
    delete d.after;delete d.do;
    if(Array.isArray(d.buttons))d.buttons={align:d.align==="center"?"center":"left",items:d.buttons};
    if(d.buttons&&Array.isArray(d.buttons.items))d.buttons.items=d.buttons.items.filter(b=>b&&b.label).slice(0,4).map(b=>({label:String(b.label).slice(0,40),link:String(b.link||"#contact"),icon:b.icon&&ICONS[b.icon]?b.icon:"",style:b.style==="solid"?"solid":"ghost"}));
    if(d.icon&&!ICONS[d.icon])d.icon="";
    if(Array.isArray(d.items))d.items=d.items.map(it=>it&&typeof it==="object"&&it.icon&&!ICONS[it.icon]?Object.assign({},it,{icon:"star"}):it);
    for(const k of ["bg","accent","text_color"])if(d[k]&&!/^#[0-9a-f]{6}$/i.test(d[k]))delete d[k];
    if(SEC&&!SEC.TYPES[d.type])d.type=d.media||d.layout?"text-media":(Array.isArray(d.items)&&d.items.length?(d.items[0].q?"faq":d.items[0].value?"stats":"cards"):"text-media");
    if(d.width&&!["contained","full"].includes(d.width))d.width=/full|wide/.test(d.width)?"full":"contained";
    for(const [k,ok] of [["align",["left","center"]],["pad",["compact","normal","spacious"]],["layout",["text","image-right","image-left","image-top"]],["height",["short","tall","screen"]]])if(d[k]&&!ok.includes(d[k]))delete d[k];
    for(const k of ["title","kicker","text","quote","author","role"])if(d[k]!=null)d[k]=String(d[k]).slice(0,k==="text"||k==="quote"?900:120);
    return d;
  }
  const itemEl=(lp,i)=>{const c=$(`[data-l="${CSS.escape(lp)}"]`);return c&&[...c.children].find(x=>x.dataset.i===String(i))};
  const AI_TOOLS={
    add_section:(a)=>{const ref=a.after?$$('[data-ok="site:section_order"]').find(x=>x.dataset.k===a.after):null;
      const data=sectionData(a);
      const r_=addSection(ref,data);
      return r_?`added ${data.type} section ${r_.key}; its paths start with ${r_.base} (.title .text .kicker .type .width .align .pad .bg .accent .text_color .icon .media${data.items?", items list "+r_.base+".items":""}; buttons list ${r_.base}.buttons.items)`:"sections can only be added on the main page"},
    remove_section:({key})=>{const s_=$$('[data-ok="site:section_order"]').find(x=>x.dataset.k===key);if(!s_||!key.startsWith("cs_"))return "only sections added in the editor (cs_…) can be removed";return deleteSection(s_,true)},
    set_value:({path,value})=>applyValue(path,value),
    move_item:({list_path,index,to_index})=>{let it=itemEl(list_path,index);if(!it)return "no item "+index+" in "+list_path;
      for(let n=0;n<60&&it.dataset.i!==String(to_index);n++){const sib=siblingsOf(it),k=sib.indexOf(it);const d=+to_index>+it.dataset.i?1:-1;if(!sib[k+d])break;step(it,d)}return "now at "+it.dataset.i},
    move_section:({order_path,key,to_index})=>{const s_=$$(`[data-ok="${CSS.escape(order_path)}"]`).find(x=>x.dataset.k===key);if(!s_)return "no section "+key;
      for(let n=0;n<30;n++){const sib=siblingsOf(s_),k=sib.indexOf(s_);if(k===+to_index)break;step(s_,+to_index>k?1:-1);if(siblingsOf(s_).indexOf(s_)===k)break}return "order: "+siblingsOf(s_).map(x=>x.dataset.k).join(",")},
    add_item:({list_path,after_index,text})=>{const it=itemEl(list_path,after_index);if(!it)return "no item "+after_index+" to copy in "+list_path;
      duplicate(it);const c=it.nextElementSibling;const te=c&&(c.matches("[data-e]")?c:$("[data-e]",c));if(te&&text!=null){set(te.dataset.e,text);te.textContent=text}return "added at index "+(c?c.dataset.i:"?")},
    remove_item:({list_path,index})=>{const it=itemEl(list_path,index);if(!it)return "no item "+index;listOp(it,(arr,perm,pos)=>{arr.splice(pos,1);perm.splice(pos,1)});it.remove();secBars();return "removed"},
    set_custom_css:({css})=>applyValue("site:custom_css",css||""),
    use_attachment:async({path,attachment})=>{const f=aiFiles[+attachment||0];if(!f)return "no attachment "+attachment;
      const fd=fieldDef(path),m=$(`[data-m="${CSS.escape(path)}"]`);const kind=(fd&&fd.f[2])||(m&&m.dataset.mk)||"image";
      await replaceMedia(path,kind,(fd&&fd.holder)||m||document.body,f);return "placed "+f.name},
  };
  const AI_DECL=[
    {name:"set_value",description:"Set any text or setting from the catalog (text, color #rrggbb, icon name, select option, link, number for ranges, true/false for switches).",parameters:{type:"OBJECT",properties:{path:{type:"STRING"},value:{type:"STRING"}},required:["path","value"]}},
    {name:"move_item",description:"Reorder an item inside a LIST.",parameters:{type:"OBJECT",properties:{list_path:{type:"STRING"},index:{type:"INTEGER"},to_index:{type:"INTEGER"}},required:["list_path","index","to_index"]}},
    {name:"move_section",description:"Reorder a whole section or page block (ORDER lists).",parameters:{type:"OBJECT",properties:{order_path:{type:"STRING"},key:{type:"STRING"},to_index:{type:"INTEGER"}},required:["order_path","key","to_index"]}},
    {name:"add_item",description:"Add an item to a LIST by copying the item at after_index and giving it new text.",parameters:{type:"OBJECT",properties:{list_path:{type:"STRING"},after_index:{type:"INTEGER"},text:{type:"STRING"}},required:["list_path","after_index"]}},
    {name:"remove_item",description:"Delete an item from a LIST.",parameters:{type:"OBJECT",properties:{list_path:{type:"STRING"},index:{type:"INTEGER"}},required:["list_path","index"]}},
    {name:"set_custom_css",description:"Replace the site's custom CSS (applies to every page). Use for layout, spacing, sizes, fonts, backgrounds, animations and anything without a setting. Send the full stylesheet: it replaces the old one.",parameters:{type:"OBJECT",properties:{css:{type:"STRING"}},required:["css"]}},
    {name:"add_section",description:"Add a complete new section to the main page after the section key `after`. type: text-media|cards|stats|gallery|quote|cta|list|faq|steps|banner. section: the full section as a JSON string (kicker, title, text, icon, width, align, pad, bg, accent, text_color, layout, cols, items, buttons, quote, author, role, height, overlay) as described in GUIDE › Section types.",parameters:{type:"OBJECT",properties:{type:{type:"STRING"},section:{type:"STRING"},after:{type:"STRING"}},required:["type","section"]}},
    {name:"remove_section",description:"Delete a section that was added in the editor (key starts with cs_).",parameters:{type:"OBJECT",properties:{key:{type:"STRING"}},required:["key"]}},
    {name:"use_attachment",description:"Put a file the owner attached (0 = first) into an image/video/media/icon/audio slot.",parameters:{type:"OBJECT",properties:{path:{type:"STRING"},attachment:{type:"INTEGER"}},required:["path"]}},
  ];
  function catalog(){
    const L=[],seen=new Set(),cut=(v,n=160)=>{v=v==null?"":typeof v==="string"?v:JSON.stringify(v);return v.length>n?v.slice(0,n)+"…":v};
    L.push("PAGE "+location.pathname+(document.title?" · "+document.title:""));
    const oks=[...new Set($$("[data-ok]").map(e=>e.dataset.ok))];
    oks.forEach(o=>{const s_=$$(`[data-ok="${CSS.escape(o)}"]`);L.push(`ORDER ${o} = [${siblingsOf(s_[0]).map(x=>x.dataset.k).join(", ")}]`)});
    $$("[data-l]").forEach(c=>{const lp=c.dataset.l;if(seen.has("L"+lp))return;seen.add("L"+lp);const arr=get(lp);L.push(`LIST ${lp} (${Array.isArray(arr)?arr.length:0} items)`)});
    $$("[data-e]").forEach(el=>{const p=el.dataset.e;if(seen.has(p))return;seen.add(p);L.push(`TEXT ${p} = ${cut(get(p)??el.textContent)}`)});
    $$("[data-x]").forEach(el=>{let fs=[];try{fs=JSON.parse(el.dataset.x)}catch(e){}fs.forEach(([lab,p,t,o])=>{if(seen.has(p))return;seen.add(p);
      const opt=t==="select"?(/icon$/.test(p)?" icon names: see ICONS":" options: "+o.join("|")):t==="range"?` ${o[0]}-${o[1]}${o[3]}`:"";
      L.push(`FIELD ${p} [${t}${opt}] "${lab}" = ${cut(get(p)??"",60)}`)})});
    $$("[data-m]").forEach(el=>{const p=el.dataset.m;if(seen.has(p))return;seen.add(p);L.push(`MEDIA ${p} [${el.dataset.mk}] = ${cut(get(p),80)}`)});
    L.push("ICONS "+Object.keys(ICONS).join(", "));
    L.push("CUSTOM_CSS (site:custom_css) =\n"+(get("site:custom_css")||"(empty)"));
    L.push("PAGE STRUCTURE (for CSS selectors):");
    $$("body>header,body>section,body>div:not(.rt-ui):not([id^=rt-]),body>footer,.project>*,.project section,[data-k]").slice(0,60).forEach(el=>{
      if(el.closest(".rt-ui"))return;const id=el.id?"#"+el.id:"",cl=(el.className&&typeof el.className==="string")?"."+el.className.trim().split(/\s+/).filter(c=>!c.startsWith("rt-")).join("."):"";
      const k=id+cl;if(k&&!seen.has("S"+k)){seen.add("S"+k);L.push("  "+el.tagName.toLowerCase()+k)}});
    return L.join("\n").slice(0,60000);
  }
  /* the AI's guide: assets/ai-guide.md (words, section types, recipes) + the owner's own notes */
  let GUIDE="";
  const guideP=fetchT(new URL("ai-guide.md",ME).href,{cache:"no-cache"},15000).then(r=>r.ok?r.text():"").then(t=>GUIDE=t).catch(()=>"");
  const smallGuide=()=>{const m=GUIDE.match(/<!-- small -->([\s\S]*?)<!-- \/small -->/);return (m?m[1]:GUIDE).trim()};
  const notes=()=>{const n=String(get("site:ai_notes")||"").trim();return n?"\n\nOWNER'S NOTES (follow these first):\n"+n:""};
  const guideFull=()=>GUIDE?"\n\nGUIDE:\n"+GUIDE+notes():notes();
  const guidePart=re=>{const g=smallGuide(),i=g.search(re);if(i<0)return "";const j=g.slice(i+3).search(/\n## /);return g.slice(i,j<0?undefined:i+3+j).trim()};
  const guideSmall=()=>(GUIDE?"\n\n"+guidePart(/## Words/):"")+notes();               // everyday requests: just the words
  const guideSections=()=>(GUIDE?"\n\n"+guidePart(/## Words/)+"\n\n"+guidePart(/## Section types/)+"\n\n"+guidePart(/## Recipes/):"")+notes();
  const AI_SYS_BASE=`You are the design-and-content assistant inside the visual editor of Roee Tal's portfolio site (a game developer).
The owner talks to you (often in Hebrew, sometimes by voice) and you change the CURRENT PAGE live with tools. Changes stay unpublished until he presses Publish, and every publish is kept in Versions, so act directly; don't ask for confirmation unless the request is unclear.
Rules:
- Only use paths that appear in the catalog. Text: set_value on TEXT paths. Settings: FIELD paths (respect their type). Colors are #rrggbb.
- Reorder with move_item / move_section; add/remove list items with add_item / remove_item.
- A new section on the main page ("add a section about…", "סקשן"): add_section with type and section = the FULL section JSON (see GUIDE › Section types): pick the type that fits, write real content (title, kicker, text, 3-6 items, buttons when useful), set width/align/pad/colors when asked. Afterwards adjust it with set_value on its paths.
- Layout and visual design without a FIELD (sizes, spacing, columns, fonts, backgrounds, effects, animations): write CSS with set_custom_css. Keep the existing custom CSS and add to it; scope rules to selectors from PAGE STRUCTURE; keep it mobile-friendly; never hide the editor (classes starting with rt-).
- Images/videos/GIFs/sounds: only files the owner attached, via use_attachment into a MEDIA or media FIELD path. You cannot create images.
- Keep the site's English text in English unless he asks otherwise. Reply in the language he used, in 1-3 short sentences: what you changed, and remind him to check with 👁 Preview and press Publish.`;
  const AI_SYS=()=>AI_SYS_BASE+guideFull();
  // the models this key can use right now, best first (asked from Google, so new ones like Gemini 4 are picked up by themselves)
  let modelList=null;
  async function rankModels(key){
    if(modelList)return modelList;
    const r=await fetchT(`${GAPI}/models?key=${encodeURIComponent(key)}&pageSize=200`,{},20000);const j=await r.json();
    const ok=(j.models||[]).filter(x=>(x.supportedGenerationMethods||[]).includes("generateContent")&&/gemini/.test(x.name)&&!/(image|tts|audio|live|embedding|thinking|vision|robotics|computer|nano|gemma)/.test(x.name));
    const ver=n=>parseFloat((n.match(/gemini-(\d+(?:\.\d+)?)/)||[,0])[1]);
    const rank=n=>(/flash/.test(n)&&!/lite/.test(n)?0:/flash-lite/.test(n)?2:/pro/.test(n)?3:1)*10+(/preview|exp/.test(n)?1:0);   // Flash first: fast and the biggest free quota
    ok.sort((a,b)=>(rank(a.name)-rank(b.name))||(ver(b.name)-ver(a.name)));
    modelList=ok.map(x=>x.name.replace(/^models\//,""));
    return modelList;
  }
  async function pickModel(key){
    let m=store.get(AI_MODEL);const t=+store.get(AI_MODEL+"-at")||0;
    if(m&&Date.now()-t<3*864e5)return m;            // look again every few days for newer models
    try{const l=await rankModels(key);m=l[0]||m||"gemini-flash-latest"}catch(e){m=m||"gemini-flash-latest"}
    store.set(AI_MODEL,m);store.set(AI_MODEL+"-at",String(Date.now()));return m;
  }
  const fileToPart=f=>new Promise(ok=>{const r=new FileReader();r.onload=()=>ok({inlineData:{mimeType:f.type||"application/octet-stream",data:String(r.result).split(",")[1]}});r.readAsDataURL(f)});
  function aiSay(who,text){const el=h("div",{class:"rt-msg "+who},text);aiLog.append(el);aiLog.scrollTop=aiLog.scrollHeight;return el}
  /* ---- on-device AI (WebLLM): the model downloads once and runs on this phone's / PC's graphics chip. No key, nothing leaves the device. */
  const WEBLLM="https://esm.run/@mlc-ai/web-llm@0.2.87",AI_PROV="rt-ai-provider",AI_LOCAL="rt-ai-local-model";
  const LOCAL_MODELS=[["auto","Automatic (4B on phones, 9B on computers)"],["Qwen3.5-2B","Light · about 1.5 GB · fastest"],["Qwen3.5-4B","Balanced · about 2.5 GB"],["Qwen3.5-9B","Smartest · about 5 GB · computers"]];
  let wl=null,engine=null,engineId="",loadingP=null;
  const isPhone=()=>matchMedia("(pointer:coarse)").matches&&Math.min(screen.width,screen.height)<900;
  const provider=()=>store.get(AI_PROV)||("gpu" in navigator?"local":"gemini");
  async function localModelId(){
    let base=store.get(AI_LOCAL)||"auto";if(base==="auto")base=isPhone()?"Qwen3.5-4B":"Qwen3.5-9B";
    let f16=false;try{const ad=await navigator.gpu.requestAdapter();f16=!!(ad&&ad.features.has("shader-f16"))}catch(e){}
    return base+(f16?"-q4f16_1-MLC":"-q4f32_1-MLC");
  }
  async function ensureEngine(onProgress){
    if(!("gpu" in navigator))throw new Error("this browser has no WebGPU. Use Chrome, or switch to Gemini in ⋯ › Site settings");
    const id=await localModelId();
    if(engine&&engineId===id)return engine;
    if(loadingP)return loadingP;
    loadingP=(async()=>{
      wl=wl||await import(WEBLLM);
      const src=`import {WebWorkerMLCEngineHandler} from "${WEBLLM}";const h=new WebWorkerMLCEngineHandler();self.onmessage=m=>h.onmessage(m);`;
      const worker=new Worker(URL.createObjectURL(new Blob([src],{type:"text/javascript"})),{type:"module"});
      engine=await wl.CreateWebWorkerMLCEngine(worker,id,{initProgressCallback:r=>onProgress&&onProgress(r)},{context_window_size:isPhone()?4096:8192});   // phones: less GPU memory
      engineId=id;return engine;
    })();
    try{return await loadingP}finally{loadingP=null}
  }
  const errText=e=>String((e&&(e.message||e.content))||e||"unknown error").replace(/^Error:\s*/,"").slice(0,300);
  function smallCatalog(limit=6000){
    // the device model reads ~4k tokens: send the selected thing and its section, or a compact list of the page
    const L=[],seen=new Set(),cut=(v,n)=>{v=v==null?"":typeof v==="string"?v:JSON.stringify(v);return v.length>n?v.slice(0,n)+"…":v};
    const scope=current?(current.closest("[data-k]")||chain[chain.length-1]||current):document.body;
    if(current){L.push("SELECTED (\"this\" means this): "+unitName(current));
      const add=el=>{if(el.dataset.e&&!seen.has(el.dataset.e)){seen.add(el.dataset.e);L.push(`  TEXT ${el.dataset.e} = ${cut(get(el.dataset.e),60)}`)}
        if(el.dataset.x)try{JSON.parse(el.dataset.x).forEach(([lab,p,t,o])=>{if(seen.has(p))return;seen.add(p);L.push(`  FIELD ${p} [${t}${t==="select"&&!/icon$/.test(p)?": "+o.join("|"):""}] ${lab} = ${cut(get(p)??"",40)}`)})}catch(e){}
        if(el.dataset.m&&!seen.has(el.dataset.m)){seen.add(el.dataset.m);L.push(`  MEDIA ${el.dataset.m} [${el.dataset.mk}]`)}};
      [current,...current.querySelectorAll("[data-e],[data-x],[data-m]")].forEach(add);}
    [...new Set($$("[data-ok]").map(e=>e.dataset.ok))].forEach(o=>{const s_=$$(`[data-ok="${CSS.escape(o)}"]`);L.push(`ORDER ${o} = [${siblingsOf(s_[0]).map(x=>x.dataset.k).join(", ")}]`)});
    $$("[data-l]",scope===document.body?document:scope).forEach(c=>{const lp=c.dataset.l;if(seen.has("L"+lp))return;seen.add("L"+lp);const a=get(lp);L.push(`LIST ${lp} (${Array.isArray(a)?a.length:0})`)});
    const pool=scope===document.body?document:scope;
    $$("[data-e]",pool).forEach(el=>{const p=el.dataset.e;if(seen.has(p))return;seen.add(p);L.push(`TEXT ${p} = ${cut(get(p)??el.textContent,45)}`)});
    $$("[data-x]",pool).forEach(el=>{try{JSON.parse(el.dataset.x).forEach(([lab,p,t])=>{if(seen.has(p))return;seen.add(p);L.push(`FIELD ${p} [${t}] ${lab}`)})}catch(e){}});
    L.push("ICONS: "+Object.keys(ICONS).join(","));
    if(get("site:custom_css"))L.push("CUSTOM_CSS now: "+cut(get("site:custom_css"),600));
    return L.join("\n").slice(0,limit);
  }
  const LOCAL_SYS=`You edit Roee Tal's portfolio page. Answer ONLY with JSON: {"actions":[...],"reply":"short text"}.
Actions (use paths exactly as listed):
{"do":"set","path":"<TEXT or FIELD path>","value":"<text | #rrggbb | icon name | option | number | true/false>"}
{"do":"move_section","order_path":"<ORDER path>","key":"<key>","to_index":0}
{"do":"move_item","list_path":"<LIST path>","index":0,"to_index":1}
{"do":"add","list_path":"<LIST path>","after_index":0,"text":"..."}
{"do":"remove","list_path":"<LIST path>","index":0}
{"do":"css","css":"<full custom CSS: keep the old rules and add yours>"}
{"do":"add_section","after":"<section key from ORDER>","section":{"type":"<a section type>","kicker":"...","title":"...","text":"...","items":[...],"buttons":[{"label":"...","link":"..."}],"width":"contained|full","align":"left|center"}}
{"do":"remove_section","key":"cs_…"}
{"do":"attach","path":"<MEDIA or image/video FIELD path>","attachment":0}
Only add a menu link (site:nav) or a button when the owner asks for a link/button. "this"/"זה" means the SELECTED item. Keep the site's text in English unless asked. reply = one short sentence in the owner's language.`;
  const LOCAL_SYS_FULL=()=>LOCAL_SYS+guideSmall();
  async function applyJsonAnswer(content,thinking){
    const raw=String(content||"").replace(/<think>[\s\S]*?<\/think>/g,"").replace(/^```(?:json)?|```$/gm,"").trim();let out;
    try{out=JSON.parse(raw)}catch(e){const m=raw.match(/\{[\s\S]*\}/);try{out=m?JSON.parse(m[0]):null}catch(e2){out=null}if(!out)out={actions:[],reply:raw}}
    const MAP={add_section:a=>AI_TOOLS.add_section(a),remove_section:a=>AI_TOOLS.remove_section(a),set:a=>AI_TOOLS.set_value(a),move_section:a=>AI_TOOLS.move_section(a),move_item:a=>AI_TOOLS.move_item(a),add:a=>AI_TOOLS.add_item(a),remove:a=>AI_TOOLS.remove_item(a),css:a=>AI_TOOLS.set_custom_css(a),attach:a=>AI_TOOLS.use_attachment(a)};
    for(const a of (out.actions||[]).slice(0,20)){let r_;try{r_=MAP[a.do]?await MAP[a.do](a):"unknown action "+a.do}catch(e){r_="error: "+e.message}
      aiSay("act",(r_==="ok"||/^(now|added|removed|order|placed)/.test(r_)?"✓ ":"⚠ ")+a.do+" "+(a.path||a.list_path||a.key||"")+(r_==="ok"?"":" · "+r_))}
    if(thinking)thinking.remove();
    aiSay("ai",out.reply||((out.actions||[]).length?"Done. Check with 👁 Preview, then Publish.":"I didn't find what to change. Tap the thing first, then ask again."));
    aiFiles=[];renderFiles();place();secBars();
  }
  /* ---- AI app on this phone / PC: any app with an OpenAI-style local server (Ollama in Termux, LM Studio, Ollama on the PC) */
  const APP_URL="rt-ai-app-url",APP_MODEL="rt-ai-app-model";
  const appUrl=()=>(store.get(APP_URL)||(isPhone()?"http://127.0.0.1:11434/v1":"http://localhost:1234/v1")).replace(/\/+$/,"");
  async function appModels(){
    const r=await fetchT(appUrl()+"/models",{},8000);if(!r.ok)throw new Error("the app answered "+r.status);
    const j=await r.json();return (j.data||j.models||[]).map(m=>m.id||m.name).filter(Boolean);
  }
  // Ollama has its own API that can switch off "thinking", force JSON and stream progress; LM Studio etc. use the OpenAI-style one
  const appBase=()=>appUrl().replace(/\/v1$/,"");
  let isOllama=null;
  async function detectOllama(){if(isOllama!==null)return isOllama;try{const r=await fetchT(appBase()+"/api/tags",{},6000);isOllama=r.ok}catch(e){isOllama=false}return isOllama}
  async function appModel(){
    let model=store.get(APP_MODEL);
    if(!model){const ms=await appModels();model=ms.find(m=>!/embed/i.test(m))||ms[0];if(!model)throw new Error("the app has no model loaded");store.set(APP_MODEL,model)}
    return model;
  }
  async function warmApp(){   // load the model into memory while you type
    try{if(provider()!=="app"||!(await detectOllama()))return;const model=await appModel();
      fetchT(appBase()+"/api/generate",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model,prompt:"",keep_alive:"30m"})},300000).catch(()=>{})}catch(e){}
  }
  async function appSend(text){
    const thinking=aiSay("sys","Asking the AI app…");
    try{
      const model=await appModel(),big=!isPhone();
      const userMsg=`PAGE ${location.pathname}\n${big?catalog().slice(0,24000):smallCatalog(current?3000:3500)}\n`+(aiFiles.length?`ATTACHMENTS: ${aiFiles.map((f,i)=>i+"="+f.name).join(", ")}\n`:"")+`REQUEST: ${text}`;
      const content=await appChat([{role:"system",content:LOCAL_SYS_FULL()},{role:"user",content:userMsg}],thinking,700);
      await applyJsonAnswer(content,thinking);
    }catch(e){thinking.remove();aiSay("err",appErr(e))}
  }
  function appErr(e){
    const m=errText(e);
    return /fetch|network|load failed/i.test(m)
      ?`Can't reach the AI app at ${appUrl()}. Phone: is Termux open with ollama serve running (OLLAMA_ORIGINS="*")? PC: is the LM Studio server on (with CORS) or Ollama running? (${m})`
      :/memory|ram|alloc/i.test(m)?"AI app: not enough memory for "+(store.get(APP_MODEL)||"this model")+". Try a smaller one (e.g. qwen3:1.7b) in ⋯ › Site settings. ("+m+")"
      :"AI app: "+m;
  }
  async function appChat(messages,thinking,maxTok){
      const model=await appModel(),big=!isPhone();
      let content="";
      if(await detectOllama()){
        const r=await fetchT(appBase()+"/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model,messages,stream:true,think:false,format:"json",keep_alive:"30m",
          options:{temperature:.2,num_ctx:big?16384:4096,num_predict:maxTok||700}})},600000);
        if(!r.ok){const t=await r.text().catch(()=>"");throw new Error((t.match(/"error":"([^"]+)/)||[,"the app answered "+r.status])[1])}
        const rd=r.body.getReader(),dec=new TextDecoder();let buf="",t0=Date.now(),first=0;
        thinking.textContent=`Reading the page… (${model})`;
        for(;;){const {done,value}=await rd.read();if(done)break;buf+=dec.decode(value,{stream:true});let i;
          while((i=buf.indexOf("\n"))>=0){const line=buf.slice(0,i).trim();buf=buf.slice(i+1);if(!line)continue;let j;try{j=JSON.parse(line)}catch(e){continue}
            if(j.error)throw new Error(j.error);
            if(j.message&&j.message.content){content+=j.message.content;if(!first)first=Date.now();thinking.textContent=`Writing… ${content.length} characters · ${Math.round((Date.now()-t0)/1000)}s`}}}
      }else{
        const r=await fetchT(appUrl()+"/chat/completions",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model,temperature:.2,max_tokens:900,stream:false,
          messages:[{role:"system",content:messages[0].content+"\n/no_think"},...messages.slice(1)]})},600000);
        const j=await r.json().catch(()=>({}));
        if(!r.ok)throw new Error((j.error&&(j.error.message||j.error))||("the app answered "+r.status));
        content=j.choices&&j.choices[0]&&j.choices[0].message&&j.choices[0].message.content;
      }
      return content;
  }
  /* ---- "add a section about…": the editor builds the section itself; the small model only writes its words */
  const SECTION_ASK=/(סקשן|סעיף|אזור|קטע|בלוק|section|block)/i,SECTION_DO=/(הוסף|תוסיף|הכנס|תכניס|תכין|הכן|צור|תיצור|תעשה|תבנה|בנה|add|create|make|new|build|insert)/i;
  const wantsSection=t=>SECTION_ASK.test(t)&&SECTION_DO.test(t);
  const SECTION_SYS=()=>`You build one complete new section for Roee Tal's game-developer portfolio (main page). Reply ONLY with the section as JSON:
{"type":"text-media|cards|stats|gallery|quote|cta|list|faq|steps|banner","kicker":"...","title":"...","text":"...","items":[...],"buttons":[{"label":"...","link":"..."}],"width":"contained|full","align":"left|center","pad":"compact|normal|spacious","bg":"#rrggbb","accent":"#rrggbb","text_color":"#rrggbb","icon":"<icon name>"}
Leave out fields you don't need. items follow the type (see Section types). Write in English: title up to 6 words, kicker up to 4 words, text 1-3 short sentences, 3-6 items with real, specific content for a game developer. Only use colors when the owner asks for colors or a skin, with good contrast. If the owner asks for Hebrew, write in Hebrew.${guideSections()}`;
  // a hint from the owner's words, in case the small model picks a type that doesn't fit
  const TYPE_HINTS=[["faq",/(שאלות|faq|q&a)/i],["stats",/(מספרים|סטטיסטיק|stats|numbers|הישגים במספרים)/i],["gallery",/(גלרי|gallery|תמונות)/i],["quote",/(ציטוט|המלצ|quote|testimonial)/i],
    ["steps",/(שלבים|תהליך|steps|process|איך אני עובד)/i],["cta",/(קריאה לפעולה|צור קשר|בוא נעבוד|cta|call to action|contact me)/i],["banner",/(באנר|banner|רקע וידאו|וידאו ברקע|רקע תמונה)/i],
    ["cards",/(כרטיס|קלפים|cards?)/i],["list",/(רשימה|נקודות|bullet|list)/i]];
  const hintType=t=>{for(const [k,re] of TYPE_HINTS)if(re.test(t))return k;return ""};
  const WIDE=/(רחב|מלא|פול|פלאפ|מקצה לקצה|full|wide|edge)/i;
  async function sectionFlow(text){
    const thinking=aiSay("sys","Building the new section…");
    try{
      await guideP;
      const hint=hintType(text),icons="ICONS: "+Object.keys(ICONS).join(",");
      const msgs=[{role:"system",content:SECTION_SYS()},{role:"user",content:icons+"\n"+(hint?`TYPE: ${hint}\n`:"")+(WIDE.test(text)?"WIDTH: full\n":"")+(aiFiles.length?"The owner attached a picture/video: it goes into the section's media.\n":"")+"REQUEST: "+text}];
      let content;
      if(provider()==="app")content=await appChat(msgs,thinking,900);
      else{const eng=await ensureEngine(r=>{thinking.textContent=`Downloading the AI model… ${Math.round((r.progress||0)*100)}%`});
        const res=await eng.chat.completions.create({messages:msgs,temperature:.5,max_tokens:900,extra_body:{enable_thinking:false},response_format:{type:"json_object"}});
        content=res.choices[0].message.content}
      const raw=String(content||"").replace(/<think>[\s\S]*?<\/think>/g,"").replace(/^```(?:json)?|```$/gm,"").trim();
      let d={};try{d=JSON.parse(raw)}catch(e){const m=raw.match(/\{[\s\S]*\}/);try{d=m?JSON.parse(m[0]):{}}catch(e2){}}
      if(d.section&&typeof d.section==="object")d=d.section;
      if(hint&&(!SEC.TYPES[d.type]||(d.type==="text-media"&&hint!=="text-media")))d.type=hint;
      if(WIDE.test(text)&&!d.width)d.width="full";
      if(d.type==="banner"||WIDE.test(text)&&!d.align)d.align=d.align||"center";
      const fallback=text.replace(SECTION_DO,"").replace(SECTION_ASK,"").replace(/\b(a|an|the|me|for|of|about|לי|של|על|חדש|חדשה)\b/gi,"").trim();
      if(!d.title)d.title=fallback.slice(0,60)||"New section";
      const after=current&&current.closest('[data-ok="site:section_order"]');
      const data=sectionData(d);
      const r_=addSection(after,data);
      thinking.remove();
      if(!r_){aiSay("err","New sections go on the main page. Open roeetal.com (the home page) and ask again.");return}
      aiSay("act",`✓ add section ${r_.key} · ${SEC.TYPES[data.type].label}${data.items?" · "+data.items.length+" items":""}`);
      const file=aiFiles.find(f=>/^(image|video)\//.test(f.type));
      if(file){await replaceMedia(r_.base+".media","media",$(`#cs-${r_.id}`),file);aiSay("act","✓ picture placed in the section")}
      aiFiles=[];renderFiles();
      aiSay("ai",/[֐-׿]/.test(text)?"בניתי סקשן חדש. לחיצה כפולה על טקסט כדי לערוך; לחיצה על הסקשן ואז ⚙ כדי להחליף סוג, רוחב, צבעים ותמונה. אחר כך Publish.":"Built the section. Double-tap any text to edit; tap the section, then ⚙ to change its type, width, colors and picture. Then Publish.");
    }catch(e){thinking.remove();aiSay("err",provider()==="app"?appErr(e):"On-device AI: "+errText(e))}
  }
  async function localSend(text){
    const thinking=aiSay("sys","Loading the on-device model…");
    try{
      const eng=await ensureEngine(r=>{const pct=Math.round((r.progress||0)*100);thinking.textContent=engine?"…":`Downloading the AI model to this device (first time only)… ${pct}%`});
      thinking.textContent="Thinking on this device…";
      let cur=eng;
      const ask=(limit,strict,maxTok=700)=>cur.chat.completions.create({messages:[{role:"system",content:LOCAL_SYS_FULL()},
          {role:"user",content:`PAGE ${location.pathname}\n${smallCatalog(limit)}\n`+(aiFiles.length?`ATTACHMENTS: ${aiFiles.map((f,i)=>i+"="+f.name).join(", ")}\n`:"")+`REQUEST: ${text}`}],
        temperature:.2,max_tokens:maxTok,extra_body:{enable_thinking:false},...(strict?{response_format:{type:"json_object"}}:{})});
      const gpuLost=m=>/dispos|device|lost|memory|out of/i.test(m||"");
      // if one way fails, try simpler ones: shorter page list, then without forced JSON; if the GPU dropped the model, reload it once
      let res,last,reloaded=false;
      for(const [limit,strict] of [[isPhone()?4000:6000,true],[2500,true],[2000,false]]){
        try{res=await ask(limit,strict);break}
        catch(e){last=errText(e);
          if(gpuLost(last)){
            engine=null;engineId="";
            if(reloaded){if((store.get(AI_LOCAL)||"auto")!=="Qwen3.5-2B"){store.set(AI_LOCAL,"Qwen3.5-2B");
                throw new Error("this phone's browser ran out of graphics memory with the bigger model. I switched to the Light model (about 1.5 GB). Send your message again to download it")}
              break}
            reloaded=true;thinking.textContent="The graphics chip reset; reloading the model…";
            try{cur=await ensureEngine()}catch(e2){last=errText(e2);break}
          }else thinking.textContent="Retrying… ("+last.slice(0,80)+")";
        }
      }
      if(!res)throw new Error(last);
      await applyJsonAnswer(res.choices[0].message.content,thinking);
    }catch(e){thinking.remove();aiSay("err","On-device AI: "+errText(e)+". You can switch to Gemini with the 📱/G button above.");if(/load|fetch|network|device/i.test(errText(e))){engine=null;engineId=""}}
  }
  async function aiSend(text){
    if(aiBusy||!text.trim()&&!aiFiles.length)return;
    await Promise.race([guideP,new Promise(r=>setTimeout(r,4000))]);
    if(provider()==="local"||provider()==="app"){aiBusy=true;aiSay("me",text+(aiFiles.length?`  📎×${aiFiles.length}`:""));
      await (wantsSection(text)?sectionFlow(text):provider()==="app"?appSend(text):localSend(text));aiBusy=false;return}
    const key=store.get(AI_KEY);if(!key){aiKeyBox();return}
    aiBusy=true;aiSay("me",text+(aiFiles.length?`  📎×${aiFiles.length}`:""));
    const thinking=aiSay("sys","…");
    try{
      const model=await pickModel(key);
      const parts=[{text:`CATALOG OF THE CURRENT PAGE:\n${catalog()}\n\nREQUEST: ${text}`+(aiFiles.length?`\n(${aiFiles.length} attachment(s): ${aiFiles.map((f,i)=>i+"="+f.name).join(", ")})`:"")}];
      for(const f of aiFiles.filter(f=>/^image\//.test(f.type)&&f.size<4e6))parts.push(await fileToPart(f));
      // keep the chat short: drop whole old turns (a turn starts with a typed request), never half of one
      while(aiHist.length>20){const i=aiHist.findIndex((m,k)=>k>0&&m.role==="user"&&m.parts[0]&&m.parts[0].text);if(i<1)break;aiHist=aiHist.slice(i)}
      aiHist.push({role:"user",parts});
      // Gemini is sometimes "busy" (503) or a model's free quota runs out (429): wait and retry, then try other Flash models
      let others=[];try{others=await rankModels(key)}catch(e){}
      const models=[...new Set([model,...others.slice(0,5),"gemini-flash-latest"])];let mi=0;
      const busy=(st,msg)=>st===503||st===429||st===500||/demand|overload|unavailable|exhausted|quota|try again/i.test(msg);
      async function call(){
        for(let attempt=0;;attempt++){
          const m_=models[mi];
          const r=await fetchT(`${GAPI}/models/${m_}:generateContent?key=${encodeURIComponent(key)}`,{method:"POST",headers:{"Content-Type":"application/json"},
            body:JSON.stringify({systemInstruction:{parts:[{text:AI_SYS()}]},contents:aiHist,tools:[{functionDeclarations:AI_DECL}]})},90000);
          const j=await r.json().catch(()=>({}));
          if(r.ok){if(!store.get(AI_MODEL)){store.set(AI_MODEL,m_);store.set(AI_MODEL+"-at",String(Date.now()))}return j}
          const msg=String((j.error&&j.error.message)||r.status);
          const gone=r.status===404||/no longer available|not found|deprecated/i.test(msg);
          if(gone&&m_===model)store.set(AI_MODEL,"");
          if(!(busy(r.status,msg)||gone)||mi>=models.length-1&&attempt>=1)throw new Error(msg+(busy(r.status,msg)?" (Gemini is busy right now; try again in a minute, or use 📱 the app on your phone)":""));
          if(attempt===0&&!gone&&r.status!==429){thinking.textContent=`Gemini is busy, retrying… (${m_})`;await new Promise(ok=>setTimeout(ok,2500));continue}
          if(mi<models.length-1){mi++;attempt=-1;thinking.textContent=`Gemini is busy, trying ${models[mi]}…`;await new Promise(ok=>setTimeout(ok,800))}
        }
      }
      for(let round=0;round<8;round++){
        const j=await call();
        const c=(j.candidates||[])[0],ps=(c&&c.content&&c.content.parts)||[];
        aiHist.push({role:"model",parts:ps.length?ps:[{text:"(no answer)"}]});
        const calls=ps.filter(p=>p.functionCall);
        if(!calls.length){thinking.remove();aiSay("ai",ps.map(p=>p.text||"").join("").trim()||"Done.");break}
        const out=[];
        for(const p of calls){const {name,args}=p.functionCall;let res;
          try{res=AI_TOOLS[name]?await AI_TOOLS[name](args||{}):"unknown tool"}catch(e){res="error: "+e.message}
          aiSay("act",(res==="ok"||/^(now|added|removed|order|placed)/.test(res)?"✓ ":"⚠ ")+name.replace("_"," ")+" "+(args.path||args.list_path||args.key||"")+(res==="ok"?"":" · "+String(res).slice(0,70)));
          out.push({functionResponse:{name,response:{result:res}}})}
        aiHist.push({role:"user",parts:out});
        if(round===7){thinking.remove();aiSay("ai","Done. Check with 👁 Preview, then Publish.")}
      }
      aiFiles=[];renderFiles();place();secBars();
    }catch(e){thinking.remove();aiSay("err","AI error: "+e.message)}
    aiBusy=false;
  }
  let filesRow=null;
  function renderFiles(){if(filesRow)filesRow.replaceChildren(...aiFiles.map((f,i)=>h("span",{class:"rt-chip"},`${i}: ${f.name}`,h("button",{type:"button",on:{click:()=>{aiFiles.splice(i,1);renderFiles()}}},"×"))))}
  function aiKeyBox(){
    const inp=h("input",{type:"password",placeholder:"AIza…",autocomplete:"off",value:store.get(AI_KEY)});
    const m=modal(h("h3",{},"✨ Free AI key (one time)"),
      h("ol",{},h("li",{},h("a",{href:"https://aistudio.google.com/apikey",target:"_blank",rel:"noopener"},"Open Google AI Studio › API keys"),", sign in with Google."),
        h("li",{},"Create API key (free, no credit card). Copy it."),h("li",{},"Paste it here.")),inp,
      h("p",{style:"font-size:13px;color:#999;margin:4px 0 0"},"Stays in this browser, and is saved encrypted with your editor password so other devices get it when you sign in. On the free plan Google may use the requests to improve its products; your site is public anyway."),
      h("div",{class:"rt-row"},h("button",{class:"rt-btn",type:"button",on:{click:()=>m.remove()}},"Cancel"),
        h("button",{class:"rt-btn pri",type:"button",on:{click:()=>{const v=inp.value.trim();if(!v)return;store.set(AI_KEY,v);store.set(AI_MODEL,"");m.remove();saveTokenForLogin(true);openAI()}}},"Save")));
    setTimeout(()=>inp.focus(),50);
  }
  function openAI(){
    if(provider()==="gemini"&&!store.get(AI_KEY)){aiKeyBox();return}
    if(aiBox){aiBox.hidden=!aiBox.hidden;if(!aiBox.hidden)warmApp();return}
    aiLog=h("div",{class:"rt-ailog"});
    const ta=h("textarea",{rows:"2",placeholder:"מה לשנות? / What should I change?"});
    const send=()=>{const t=ta.value;ta.value="";aiSend(t)};
    ta.addEventListener("keydown",e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send()}});
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
    const mic=h("button",{type:"button",class:"rt-aibtn",title:"Talk",on:{click:()=>{
      if(!SR){toast("Voice isn't supported in this browser; Chrome works.");return}
      if(rec){rec.stop();return}
      rec=new SR();rec.lang=aiLang;rec.interimResults=true;rec.continuous=false;const base=ta.value;mic.classList.add("on");
      rec.onresult=ev=>{let t="";for(const r of ev.results)t+=r[0].transcript;ta.value=(base?base+" ":"")+t};
      rec.onend=()=>{mic.classList.remove("on");rec=null;if(ta.value.trim())send()};rec.onerror=()=>{mic.classList.remove("on");rec=null};rec.start()}}},"🎤");
    const lang=h("button",{type:"button",class:"rt-aibtn sm",title:"Voice language",on:{click:()=>{aiLang=aiLang==="he-IL"?"en-US":"he-IL";lang.textContent=aiLang==="he-IL"?"עב":"EN"}}},"עב");
    const att=h("input",{type:"file",accept:"image/*,video/*,audio/*",multiple:true,style:"display:none"});
    att.addEventListener("change",()=>{aiFiles.push(...att.files);att.value="";renderFiles()});
    filesRow=h("div",{class:"rt-files"});
    aiBox=h("div",{id:"rt-ai",class:"rt-ui"},
      h("div",{class:"rt-head"},h("span",{},"✨ AI assistant"),h("span",{},
        h("button",{class:"rt-x",type:"button",title:"Undo everything not published yet",on:{click:()=>{if(changes&&confirm("Throw away every change that isn't published yet (yours and the AI's)?")){changes=0;location.reload()}}}},"↺"),
        provBtn=h("button",{class:"rt-x",type:"button",title:"Switch AI: in the browser 📱 / AI app 🔌 / Gemini G",on:{click:()=>{const order=["app","local","gemini"];store.set(AI_PROV,order[(order.indexOf(provider())+1)%3]);provBtn.textContent=PROV_ICON[provider()];
          aiSay("ai",{local:"Using the AI inside the browser.",app:"Using the AI app on this device ("+appUrl()+").",gemini:"Using Gemini."+(store.get(AI_KEY)?"":" Tap 🔑 to add its free key.")}[provider()]);warmApp()}}},PROV_ICON[provider()]),
        h("button",{class:"rt-x",type:"button",title:"Gemini key",on:{click:aiKeyBox}},"🔑"),
        h("button",{class:"rt-x",type:"button","aria-label":"Close",on:{click:()=>{aiBox.hidden=true}}},"✕"))),
      aiLog,filesRow,
      h("div",{class:"rt-airow"},h("button",{type:"button",class:"rt-aibtn",title:"Attach image, video or sound",on:{click:()=>ui.append(att)||att.click()}},"📎"),ta,lang,mic,h("button",{type:"button",class:"rt-aibtn pri",title:"Send",on:{click:send}},"➤")));
    document.body.append(aiBox);
    if(provider()==="app")aiSay("ai","🔌 Using the AI app at "+appUrl()+". Tip: tap the thing you mean first, then ask.");
    warmApp();
    if(provider()==="local")aiSay("ai","📱 Running on this device. The first message downloads the model once (use Wi-Fi). Tip: tap the thing you mean first, then ask, e.g. \"make this purple\" or \"תעביר את הסקשן הזה למעלה\".");
    aiSay("ai","Hi! Tell me what to change on this page: text, colors, icons, layout, button styles, order, or attach a picture/video to put somewhere. Changes show up right away; Publish when you like them.");
    setTimeout(()=>ta.focus(),50);
  }

  /* ------------------------------------------------------------ sign in */
  const AUTH_PATH="assets/editor-auth.json";
  let authKey=null,authDoc=null;
  const b64=u=>btoa(String.fromCharCode(...new Uint8Array(u))),unb64=t=>Uint8Array.from(atob(t),c=>c.charCodeAt(0));
  const hex=u=>[...new Uint8Array(u)].map(x=>x.toString(16).padStart(2,"0")).join("");
  async function derive(user,pw,a){
    const base=await crypto.subtle.importKey("raw",new TextEncoder().encode(user.trim().toLowerCase()+"\n"+pw),"PBKDF2",false,["deriveBits"]);
    const bits=new Uint8Array(await crypto.subtle.deriveBits({name:"PBKDF2",hash:"SHA-256",salt:unb64(a.salt),iterations:a.iter},base,512));
    return{check:hex(bits.slice(0,32)),key:await crypto.subtle.importKey("raw",bits.slice(32),"AES-GCM",false,["encrypt","decrypt"])};
  }
  function loginBox(){
    return new Promise(done=>{
      const u=h("input",{type:"text",placeholder:"Name",autocomplete:"username",autocapitalize:"off",spellcheck:"false"});
      const p=h("input",{type:"password",placeholder:"Password",autocomplete:"current-password"});
      const err=h("p",{style:"color:#ff8a8a;margin:0;min-height:1.4em"});
      const go=async()=>{
        err.style.color="#aaa";err.textContent="Checking…";
        try{
          authDoc=await (await fetch(new URL("editor-auth.json",ME).href+"?t="+Date.now(),{cache:"no-store"})).json();
          const d=await derive(u.value,p.value,authDoc);
          if(d.check!==authDoc.check){await new Promise(r=>setTimeout(r,700));err.style.color="#ff8a8a";err.textContent="Wrong name or password.";return}
          authKey=d.key;
          if(authDoc.gemini&&!store.get(AI_KEY)){try{const g=await crypto.subtle.decrypt({name:"AES-GCM",iv:unb64(authDoc.gemini.iv)},authKey,unb64(authDoc.gemini.ct));store.set(AI_KEY,new TextDecoder().decode(g))}catch(e){}}
          if(authDoc.token&&!store.get(TOKEN_KEY)){
            const tk=await crypto.subtle.decrypt({name:"AES-GCM",iv:unb64(authDoc.token.iv)},authKey,unb64(authDoc.token.ct));
            store.set(TOKEN_KEY,new TextDecoder().decode(tk));
          }
          m.remove();done(true);
        }catch(e){err.style.color="#ff8a8a";err.textContent="Couldn't sign in ("+e.message+").";}
      };
      const m=modal(h("h3",{},"Sign in to edit"),u,p,err,
        h("div",{class:"rt-row"},h("button",{class:"rt-btn",type:"button",on:{click:()=>{m.remove();done(false)}}},"Cancel"),h("button",{class:"rt-btn pri",type:"button",on:{click:go}},"Sign in")));
      p.addEventListener("keydown",e=>{if(e.key==="Enter")go()});u.addEventListener("keydown",e=>{if(e.key==="Enter")p.focus()});
      setTimeout(()=>u.focus(),50);
    });
  }
  async function saveTokenForLogin(force){
    // store the token encrypted with the password, so signing in on another device is enough
    if(!authKey||!authDoc||(authDoc.token&&!force)||!store.get(TOKEN_KEY))return;
    try{
      const iv=crypto.getRandomValues(new Uint8Array(12));
      const ct=await crypto.subtle.encrypt({name:"AES-GCM",iv},authKey,new TextEncoder().encode(store.get(TOKEN_KEY)));
      const doc={...authDoc,token:{iv:b64(iv),ct:b64(ct)}};
      if(store.get(AI_KEY)){const iv2=crypto.getRandomValues(new Uint8Array(12));const ct2=await crypto.subtle.encrypt({name:"AES-GCM",iv:iv2},authKey,new TextEncoder().encode(store.get(AI_KEY)));doc.gemini={iv:b64(iv2),ct:b64(ct2)}}
      const cur=await gh(`/repos/${REPO}/contents/${AUTH_PATH}?ref=${BR}&t=${Date.now()}`);
      const body=JSON.stringify(doc,null,2)+"\n";
      await gh(`/repos/${REPO}/contents/${AUTH_PATH}`,{method:"PUT",body:JSON.stringify({message:"Editor sign-in: keep the GitHub token encrypted",content:btoa(unescape(encodeURIComponent(body))),sha:cur.sha,branch:BR})});
      authDoc=doc;
    }catch(e){/* not critical: the token still works in this browser */}
  }
  function leaveQuietly(){try{sessionStorage.removeItem("rt-edit");sessionStorage.removeItem("rt-login")}catch(e){}
    const u=new URL(location.href);u.searchParams.delete("edit");if(u.hash==="#edit")u.hash="";location.replace(u.toString())}
  async function start(){
    let viaLogin=false;try{viaLogin=!!sessionStorage.getItem("rt-login")}catch(e){}
    if(viaLogin||!store.get(TOKEN_KEY)){
      if(!(await loginBox())){leaveQuietly();return}
      try{sessionStorage.removeItem("rt-login")}catch(e){}
    }
    if(document.body.classList.contains("gallery")||/gallery\.html$/.test(location.pathname)){
      document.body.append(h("div",{class:"rt-banner rt-ui"},"The gallery is built automatically from the project pages and the lab. Edit those, and it updates by itself."));
    }
    if(!store.get(TOKEN_KEY)&&!(await askToken(true))){status("No token: you can look around, but not publish.",true);return}
    status("Loading the page's content…",true);
    try{await loadDocs()}
    catch(e){status("Couldn't load the content: "+e.message+". ",true,h("button",{class:"rt-link",type:"button",on:{click:()=>start()}},"Try again"));return}
    saveTokenForLogin();
    gh(`/repos/${REPO}`).catch(e=>{if(e.status===401||e.status===403||e.status===404)status("Your GitHub token isn't working any more. Open ⋯ › GitHub token and paste a new one before publishing.",true)});
    if(inited){loaded=true;updateBar();status("Tap anything to select it · double-tap text to change it");return}
    inited=true;
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
