/* Sections the owner adds himself (main page). One renderer for everything:
   the site build runs it with Node, the visual editor runs it live, and the AI fills its data.
   A section is data like {type:"cards", title:"…", items:[…]} stored in content/site.json › custom_sections. */
(function(root){
  "use strict";
  const TYPES={
    "text-media":{label:"Text + picture",       about:"Kicker, title, text, buttons, and a picture/GIF/video beside, above or none (layout).", item:null},
    "cards":     {label:"Cards",                about:"A grid of cards, each with icon, optional picture, title and text. Good for skills, features, services, hobbies, tools.", item:{icon:"star",image:"",title:"Card title",text:"One or two lines."}},
    "stats":     {label:"Numbers",              about:"Big numbers with labels, e.g. 3 years · 6 projects · 2 engines.", item:{value:"10+",label:"label"}},
    "gallery":   {label:"Gallery",              about:"A grid of pictures with captions (pictures come from attachments).", item:{image:"",caption:"Caption"}},
    "quote":     {label:"Quote",                about:"A big quote with author and role, optional avatar picture (media).", item:null},
    "cta":       {label:"Call to action",       about:"A short centered message with big buttons, e.g. 'Let's work together' + Email me.", item:null},
    "list":      {label:"Bullet list",          about:"A heading and a list of short points, each can have its own icon.", item:{icon:"",text:"A short point."}},
    "faq":       {label:"Questions & answers",  about:"Questions that open to show the answer.", item:{q:"A question?",a:"The answer."}},
    "steps":     {label:"Steps",                about:"Numbered steps in order, each with title and text (process, timeline, how I work).", item:{title:"Step",text:"What happens here."}},
    "banner":    {label:"Full-width banner",    about:"Edge-to-edge picture or video background with a dark overlay, big centered title, text and buttons.", item:null},
  };
  const COMMON={kicker:"",title:"New section",text:"",icon:"",layout:"text",cols:3,width:"contained",align:"left",pad:"normal",bg:"",accent:"",text_color:"",media:"",overlay:55,height:"tall",quote:"",author:"",role:""};
  const LAYOUTS=["text","image-right","image-left","image-top"],WIDTHS=["contained","full"],ALIGNS=["left","center"],PADS=["compact","normal","spacious"],HEIGHTS=["short","tall","screen"];

  const esc=s=>String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  const E=(p,ph)=>` data-e="${p}"`+(ph?` data-ph="${esc(ph)}"`:"");
  const X=(...f)=>` data-x="${esc(JSON.stringify(f))}"`;
  const ICO=p=>` data-ico="${p}"`;

  const RAW_SVG=s=>s.startsWith("<svg");
  // env: {icons:{name:svg-or-paths}, media(path,value)->{kind,url}|null, iconSrc(name)->url of an uploaded icon}
  function icon(env,name,size){
    if(!name)return "";
    if(/^(\/|blob:)/.test(name)){const u=env.iconSrc?env.iconSrc(name):name;return u?`<img class="ico-img" src="${esc(u)}" width="${size}" height="${size}" alt="" loading="lazy">`:""}
    const v=env.icons[name]||env.icons.star||"";
    if(RAW_SVG(v))return v.replace("<svg ",`<svg width="${size}" height="${size}" `);
    return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="${size>18?1.9:2}" stroke-linecap="round" stroke-linejoin="round">${v}</svg>`;
  }
  const iconNames=env=>[""].concat(Object.keys(env.icons));
  const href=l=>{l=String(l||"");return /^(https?:|mailto:|tel:|#)/.test(l)?l:l.replace(/^\/+/,"")};
  const ext=l=>/^https?:/.test(l||"")||/\.pdf$/.test(l||"")?' target="_blank" rel="noopener"':"";
  function btnStyle(d){d=d||{};let v=[["fill","--bf"],["text_color","--bt"],["border","--bb"]].filter(([k])=>d[k]).map(([k,x])=>`${x}:${d[k]};`).join("");
    if(d.bw!=null&&d.bw!=="")v+=`--bw:${d.bw}px;`;return {style:v,cls:d.glow?" glow":""}}
  const btnFields=p=>[["Button color",p+".fill","color",["","--bf"]],["Text color",p+".text_color","color",["","--bt"]],["Outline color",p+".border","color",["","--bb"]],["Outline width",p+".bw","range",[0,8,0.5,"px","--bw",""]],["Glow",p+".glow","toggle",["glow",""]]];
  function defaults(type,data){
    const t=TYPES[type]?type:"text-media",c=Object.assign({},COMMON,{type:t},data||{});
    if(TYPES[t].item&&!Array.isArray(c.items))c.items=[0,1,2].map(()=>Object.assign({},TYPES[t].item));
    if(t==="cta"||t==="banner")c.align=data&&data.align||"center";
    return c;
  }
  // clean up whatever the AI (or an old version) wrote, so a section always renders
  function normalize(c){
    c=Object.assign({},c||{});
    if(!TYPES[c.type])c.type="text-media";
    const T=TYPES[c.type];
    if(T.item){c.items=(Array.isArray(c.items)?c.items:[]).slice(0,24).map(it=>typeof it==="string"?Object.assign({},T.item,{[Object.keys(T.item).find(k=>k!=="icon"&&k!=="image")]:it}):Object.assign({},T.item,it||{}))}
    if((c.type==="cta"||c.type==="banner")&&!c.align)c.align="center";
    for(const k of ["cols","overlay"])if(c[k]!=null&&c[k]!==""){const n=Number(c[k]);c[k]=isNaN(n)?COMMON[k]:n}
    return c;
  }
  function fields(b,c,env){
    const ICN=iconNames(env);
    const f=[["Section type",b+".type","select",Object.keys(TYPES)]];
    if(c.type==="text-media")f.push(["Layout",b+".layout","select",LAYOUTS]);
    if(c.type==="cards"||c.type==="gallery"||c.type==="stats")f.push(["Columns",b+".cols","select",["2","3","4"]]);
    if(["text-media","banner","quote"].includes(c.type))f.push([c.type==="banner"?"Background picture or video":c.type==="quote"?"Avatar picture":"Picture, GIF or video",b+".media","media"]);
    if(c.type==="banner")f.push(["Height",b+".height","select",HEIGHTS],["Darkness over the picture",b+".overlay","range",[0,90,5,"%","--ov",""]]);
    f.push(["Width",b+".width","select",WIDTHS],["Align",b+".align","select",ALIGNS],["Spacing",b+".pad","select",PADS],
      ["Background color",b+".bg","color",["","--sec-bg"]],["Accent color",b+".accent","color",["","--accent"]],["Text color",b+".text_color","color",["","--sec-ink"]],
      ["Heading icon",b+".icon","select",ICN]);
    return f;
  }
  function media(env,path,value,cls){
    const m=env.media(path,value);if(!m)return "";
    return m.kind==="video"?`<video class="${cls}" data-cs="${path}" src="${esc(m.url)}" autoplay muted loop playsinline preload="metadata"></video>`:`<img class="${cls}" data-cs="${path}" src="${esc(m.url)}" alt="" loading="lazy">`;
  }
  function buttons(env,b,cfg){
    const items=(cfg&&cfg.items)||[],al=(cfg&&cfg.align)||"left",lp=b+".buttons.items";
    const out=items.map((bt,i)=>{const p=`${lp}.${i}`,st=btnStyle(bt);
      return `<a class="btn small${(bt.style||"ghost")==="ghost"?" ghost":""}${st.cls}" href="${esc(href(bt.link||"#"))}"${ext(bt.link)} data-i="${i}"${st.style?` style="${st.style}"`:""}`+
        X(["Link",p+".link","link"],["Style",p+".style","select",["solid","ghost"]],["Icon",p+".icon","select",iconNames(env)],...btnFields(p))+
        `><span class="ic"${ICO(p+".icon")}>${bt.icon?icon(env,bt.icon,18):""}</span><span${E(p+".label")}>${esc(bt.label)}</span></a>`}).join("");
    return `<div class="xrow al-${al} blk" data-l="${lp}"${X(["Align",b+".buttons.align","select",["left","center","right"]])}>${out}</div>`;
  }
  function head(env,b,c,tag){
    tag=tag||"h2";
    return `<div class="cs-head"><p class="kicker"${E(b+".kicker","small line above the title")}${c.kicker?"":" hidden data-edit-show"}>${esc(c.kicker)}</p>`+
      `<${tag}><span class="h-ico" style="--c:var(--accent)"${ICO(b+".icon")}${c.icon?"":" hidden"}>${c.icon?icon(env,c.icon,18):""}</span><span${E(b+".title")}>${esc(c.title)}</span></${tag}>`+
      `<p class="muted cs-text"${E(b+".text","text")}${c.text||c.type!=="cta"?"":" hidden data-edit-show"}>${esc(c.text)}</p></div>`;
  }
  function body(env,b,c){
    const L=b+".items",it=c.items||[],T=TYPES[c.type].item;
    const item=(i,inner,cls,extra)=>`<${extra&&extra.tag||"div"} class="${cls}" data-i="${i}"${extra&&extra.x?X(...extra.x):""}>${inner}</${extra&&extra.tag||"div"}>`;
    switch(c.type){
      case "cards":return `<div class="cs-cards cols-${c.cols||3}" data-l="${L}">`+it.map((x,i)=>item(i,
          (x.image?media(env,`${L}.${i}.image`,x.image,"cs-card-img"):"")+
          `<span class="cs-card-ico"${ICO(`${L}.${i}.icon`)}${x.icon?"":" hidden"}>${x.icon?icon(env,x.icon,22):""}</span>`+
          `<h3${E(`${L}.${i}.title`)}>${esc(x.title)}</h3><p class="muted"${E(`${L}.${i}.text`)}>${esc(x.text)}</p>`,
          "cs-card",{tag:"article",x:[["Icon",`${L}.${i}.icon`,"select",iconNames(env)],["Picture (optional)",`${L}.${i}.image`,"image"]]})).join("")+`</div>`;
      case "stats":return `<div class="cs-stats cols-${c.cols||3}" data-l="${L}">`+it.map((x,i)=>item(i,`<b${E(`${L}.${i}.value`)}>${esc(x.value)}</b><span${E(`${L}.${i}.label`)}>${esc(x.label)}</span>`,"cs-stat")).join("")+`</div>`;
      case "gallery":return `<div class="cs-gallery cols-${c.cols||3}" data-l="${L}">`+it.map((x,i)=>item(i,
          (media(env,`${L}.${i}.image`,x.image,"cs-gimg")||`<span class="cs-gph">picture</span>`)+`<figcaption${E(`${L}.${i}.caption`,"caption")}>${esc(x.caption)}</figcaption>`,
          "cs-gitem",{tag:"figure",x:[["Picture",`${L}.${i}.image`,"image"]]})).join("")+`</div>`;
      case "list":return `<ul class="ticks cs-list" data-l="${L}">`+it.map((x,i)=>item(i,
          `<span class="ui-ic tick-ic"${ICO(`${L}.${i}.icon`)}${x.icon?"":" hidden"}>${x.icon?icon(env,x.icon,16):""}</span><span${E(`${L}.${i}.text`)}>${esc(x.text)}</span>`,
          "",{tag:"li",x:[["Bullet icon",`${L}.${i}.icon`,"select",iconNames(env)]]})).join("")+`</ul>`;
      case "faq":return `<div class="cs-faq" data-l="${L}">`+it.map((x,i)=>item(i,`<summary><span${E(`${L}.${i}.q`)}>${esc(x.q)}</span></summary><p class="muted"${E(`${L}.${i}.a`)}>${esc(x.a)}</p>`,"",{tag:"details"})).join("")+`</div>`;
      case "steps":return `<ol class="cs-steps" data-l="${L}">`+it.map((x,i)=>item(i,`<span class="cs-num">${i+1}</span><div><h3${E(`${L}.${i}.title`)}>${esc(x.title)}</h3><p class="muted"${E(`${L}.${i}.text`)}>${esc(x.text)}</p></div>`,"cs-step",{tag:"li"})).join("")+`</ol>`;
      case "quote":return `<blockquote class="cs-quote"><p${E(b+".quote","the quote")}>${esc(c.quote)}</p><footer>${media(env,b+".media",c.media,"cs-avatar")}<span><b${E(b+".author","name")}>${esc(c.author)}</b> <span class="muted"${E(b+".role","role")}>${esc(c.role)}</span></span></footer></blockquote>`;
      default:return "";
    }
  }
  function render(id,data,env){
    const c=normalize(data),b=`site:custom_sections.${id}`;
    const style=[["bg","--sec-bg"],["accent","--accent"],["text_color","--sec-ink"]].filter(([k])=>c[k]).map(([k,v])=>`${v}:${c[k]}`).join(";")+(c.type==="banner"?`;--ov:${c.overlay==null?55:c.overlay}%`:"");
    const cls=`band custom-sec t-${c.type} lay-${c.layout||"text"} w-${c.width||"contained"} al-${c.align||"left"} pad-${c.pad||"normal"} h-${c.height||"tall"}`;
    let inner;
    if(c.type==="text-media"){
      const m=c.layout==="text"?"":media(env,b+".media",c.media,"cs-m");
      inner=`<div class="wrap cs-grid"><div class="cs-copy">${head(env,b,c)}${buttons(env,b,c.buttons)}</div><div class="cs-media"${m?"":" hidden"}>${m}</div></div>`;
    }else if(c.type==="banner"){
      inner=`<div class="cs-bgmedia">${media(env,b+".media",c.media,"cs-bg")}</div><div class="wrap cs-copy">${head(env,b,c,"h2")}${buttons(env,b,c.buttons)}</div>`;
    }else{
      inner=`<div class="wrap">${head(env,b,c)}${body(env,b,c)}${buttons(env,b,c.buttons)}</div>`;
    }
    return `<section class="${cls}" id="cs-${id}" data-k="cs_${id}" data-ok="site:section_order" data-add="${b}.buttons.items" data-tpl="btn"${X(...fields(b,c,env))}${style?` style="${style.replace(/^;/,"")}"`:""}>${inner}</section>`;
  }
  // keep the owner's words when a section changes type (cards -> FAQ etc.)
  function convertItems(type,items){
    const T=TYPES[type];if(!T||!T.item)return undefined;if(!Array.isArray(items)||!items.length)return defaults(type,{}).items;
    return items.map(it=>{it=it&&typeof it==="object"?it:{text:String(it||"")};
      const head=it.title||it.q,main=head||it.value||it.caption||it.text||"",sub=head?(it.text||it.a||""):(it.label||it.a||"");
      const o={cards:{icon:it.icon||"star",image:it.image||"",title:main,text:sub},stats:{value:it.value||main,label:it.value?(it.label||""):(sub||main)},
        gallery:{image:it.image||"",caption:main},list:{icon:it.icon||"",text:sub&&main!==sub?main+": "+sub:main},faq:{q:main,a:sub},steps:{title:main,text:sub}}[type];
      return o||Object.assign({},T.item)});
  }
  // short description of every type, for the AI
  function describe(){
    return Object.entries(TYPES).map(([k,t])=>`- ${k}: ${t.label}. ${t.about}`+(t.item?` items: [${JSON.stringify(t.item)}, …]`:"")).join("\n");
  }
  const api={convertItems,TYPES,COMMON,LAYOUTS,WIDTHS,ALIGNS,PADS,HEIGHTS,render,normalize,defaults,describe,esc};
  if(typeof module!=="undefined"&&module.exports)module.exports=api;else root.RTSections=api;
})(typeof self!=="undefined"?self:this);
