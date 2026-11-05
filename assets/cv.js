/* Résumé builder: one renderer for the CV page, the PDFs/images built by the site, and the visual editor.
   A résumé ("variant") is data in content/cv.json: person + two lists of sections (main, side) + design (template, color, font).
   Templates: "ats" (one column, built for applicant-tracking systems), "novo" (two columns with photo), "studio" (sidebar). */
(function(root){
  "use strict";
  const TEMPLATES={
    ats:{label:"ATS Pro",about:"One clean column. Parses perfectly in applicant-tracking systems. Best for job applications."},
    novo:{label:"Novo",about:"Two columns, photo and skill chips, like the NovoResume design."},
    studio:{label:"Studio",about:"Colored sidebar with photo, contact and skills; main column for experience and projects."},
  };
  const FONTS={
    "Open Sans":"Open+Sans:ital,wght@0,400;0,600;0,700;1,400",
    "Inter":"Inter:wght@400;500;600;700",
    "Lato":"Lato:ital,wght@0,400;0,700;1,400",
    "Source Serif 4":"Source+Serif+4:ital,wght@0,400;0,600;0,700;1,400",
    "Rubik":"Rubik:ital,wght@0,400;0,500;0,700;1,400",
    "Assistant":"Assistant:wght@400;600;700",
  };
  const DENSITY=["compact","normal","roomy"];
  const COLORS=["#2a8a8f","#1f6feb","#0b7a4b","#b5452a","#7c3aed","#c2185b","#334155","#d4a017"];
  const SECTION_TYPES={
    experience:{label:"Experience",item:{role:"Job title",org:"Company",dates:"MM/YYYY – Present",location:"City",about:"",label:"",bullets:["What you achieved, with a number if you can."]}},
    projects:{label:"Projects",item:{name:"Project name",meta:"Engine · role",dates:"YYYY",link:"",link_label:"",bullets:["What you built and how."]}},
    education:{label:"Education",item:{degree:"Degree / program",school:"School",dates:"YYYY – YYYY",location:"City",about:"",label:"Courses",bullets:[]}},
    skills:{label:"Skills",item:{label:"",items:["Skill"]}},
    tags:{label:"Interests",item:{label:"",items:["Interest"]}},
    languages:{label:"Languages",item:{name:"Language",level:"Level"}},
    list:{label:"Certificates / awards",item:{title:"Title",sub:"Issuer",dates:"YYYY",text:""}},
    text:{label:"Text",item:{text:"A short paragraph."}},
  };

  const esc=s=>String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  const ICON={
    mail:'<path d="M3 6h18v12H3z"/><path d="m3 7 9 6 9-6"/>',
    phone:'<rect x="7" y="2.5" width="10" height="19" rx="2"/><path d="M11 18.5h2"/>',
    pin:'<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
    web:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
    linkedin:'<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 10.5V16M8 7.5v.01M12 16v-3.2a2.2 2.2 0 0 1 4.4 0V16M12 10.5V16"/>',
    github:'<path d="M9 19c-4 1.4-4-2-6-2.5M15 21v-3.5a3 3 0 0 0-.9-2.4c3-.3 6-1.4 6-6.5a5 5 0 0 0-1.4-3.5 4.6 4.6 0 0 0-.1-3.5s-1.1-.3-3.6 1.4a12.4 12.4 0 0 0-6.5 0C6 1.3 4.9 1.6 4.9 1.6a4.6 4.6 0 0 0-.1 3.5A5 5 0 0 0 3.4 8.6c0 5.1 3 6.2 6 6.5a3 3 0 0 0-.9 2.4V21"/>',
    link:'<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  };
  const svg=(n,s)=>`<svg class="cv-i" viewBox="0 0 24 24" width="${s||13}" height="${s||13}" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICON[n]||ICON.link}</svg>`;
  const linkIcon=u=>/linkedin/i.test(u)?"linkedin":/github/i.test(u)?"github":"web";
  const pretty=u=>String(u||"").replace(/^https?:\/\/(www\.)?/,"").replace(/\/$/,"");
  const full=u=>{u=String(u||"").trim();return !u?"":/^(https?:|mailto:|tel:)/.test(u)?u:"https://"+u};

  // markers for the visual editor (harmless for visitors and PDFs)
  const E=(p,ph)=>` data-e="${p}"`+(ph?` data-ph="${esc(ph)}"`:"");
  const X=(...f)=>` data-x="${esc(JSON.stringify(f))}"`;
  // an optional bit of text: hidden when empty, shown (as a placeholder to fill) in edit mode
  const opt=(tag,cls,p,v,ph)=>`<${tag} class="${cls}"${E(p,ph)}${v?"":" hidden data-edit-show"}>${esc(v)}</${tag}>`;

  // Fill in missing parts of a résumé so the renderer can rely on them.
  function normalize(v){
    v=Object.assign({template:"ats",accent:"#2a8a8f",font:"Inter",density:"normal",show_photo:true,dir:"ltr",lang:"en"},v||{});
    v.person=Object.assign({name:"Your Name",title:"",summary:"",email:"",phone:"",location:"",links:[]},v.person||{});
    for(const c of ["main","side"])v[c]=(Array.isArray(v[c])?v[c]:[]).filter(Boolean).map(s=>Object.assign({type:"text",title:"",items:[]},s,{items:Array.isArray(s.items)?s.items:[]}));
    if(!TEMPLATES[v.template])v.template="ats";
    return v;
  }
  function fontHref(v){const f=FONTS[v.font]||FONTS.Inter;return "https://fonts.googleapis.com/css2?family="+f+"&display=swap"}

  // HTML for a list of bullet points.
  function bullets(ip,list){
    const b=Array.isArray(list)?list:[];
    return `<ul class="cv-bul" data-l="${ip}.bullets"${b.length?"":" hidden data-edit-show"}>`+b.map((t,k)=>`<li class="cv-bullet-item" data-i="${k}"${E(`${ip}.bullets.${k}`)}>${esc(t)}</li>`).join("")+`</ul>`;
  }
  // HTML for an item's link.
  function linkHTML(ip,it){const url=full(it.link);return url?`<p class="cv-link"><a href="${esc(url)}">${svg("link",11)}<span${E(ip+".link_label")}>${esc(it.link_label||pretty(url))}</span></a></p>`:""}
  // HTML for one entry (job, school, project, skill…) of a section.
  function itemHTML(s,sp,it,i,v){
    const ip=`${sp}.items.${i}`,T=v.template;
    switch(s.type){
      case "experience":return `<div class="cv-item" data-i="${i}"${X(["Link (web address, optional)",ip+".link","text"])}>`+
        `<div class="cv-row"><h3><span${E(ip+".role")}>${esc(it.role)}</span>${T!=="novo"?`<span class="cv-sep"> — </span>`:""}<span class="cv-org"${E(ip+".org")}>${esc(it.org)}</span></h3>`+
        `<p class="cv-when"><span${E(ip+".dates")}>${esc(it.dates)}</span>${opt("span","cv-loc",ip+".location",it.location,"city")}</p></div>`+
        opt("p","cv-about",ip+".about",it.about,"one line about the company")+linkHTML(ip,it)+opt("p","cv-lbl",ip+".label",it.label,"label above the list")+bullets(ip,it.bullets)+`</div>`;
      case "education":return `<div class="cv-item" data-i="${i}">`+
        `<div class="cv-row"><h3><span${E(ip+".degree")}>${esc(it.degree)}</span>${T!=="novo"?`<span class="cv-sep"> — </span>`:""}<span class="cv-org"${E(ip+".school")}>${esc(it.school)}</span></h3>`+
        `<p class="cv-when"><span${E(ip+".dates")}>${esc(it.dates)}</span>${opt("span","cv-loc",ip+".location",it.location,"city")}</p></div>`+
        opt("p","cv-about",ip+".about",it.about,"one line")+
        (T==="ats"&&(it.bullets||[]).length?`<p class="cv-inline"><span${E(ip+".label")}>${esc(it.label||"Courses")}</span>: `+(it.bullets||[]).map((t,k)=>`<span class="cv-inline-bullet" data-i="${k}"${E(`${ip}.bullets.${k}`)}>${esc(t)}</span>`).join(", ")+`</p>`
          :opt("p","cv-lbl",ip+".label",it.label,"label above the list")+bullets(ip,it.bullets).replace('class="cv-bul"','class="cv-bul cols"'))+`</div>`;
      case "projects":{const url=full(it.link);
        return `<div class="cv-item" data-i="${i}"${X(["Link (web address)",ip+".link","text"])}>`+
        `<div class="cv-row"><h3><span${E(ip+".name")}>${esc(it.name)}</span>${it.meta||T!=="ats"?`<span class="cv-sep"> — </span>`:""}${opt("span","cv-meta",ip+".meta",it.meta,"engine · role")}</h3>`+
        `<p class="cv-when"><span${E(ip+".dates")}>${esc(it.dates)}</span></p></div>`+
        linkHTML(ip,it)+
        bullets(ip,it.bullets)+`</div>`}
      case "skills":case "tags":{
        const lp=`${ip}.items`,chips=T!=="ats";
        return `<div class="cv-item cv-grp" data-i="${i}">`+(chips?opt("p","cv-glbl",ip+".label",it.label,"group name (optional)")+`<div class="cv-chips${s.type==="tags"?" outline":""}" data-l="${lp}">`+
          (it.items||[]).map((t,k)=>`<span class="cv-chip" data-i="${k}"${E(`${lp}.${k}`)}>${esc(t)}</span>`).join("")+`</div>`
          :`<p class="cv-inline"><b${E(ip+".label","group")}${it.label?"":" hidden data-edit-show"}>${esc(it.label)}</b>${it.label?": ":""}<span data-l="${lp}">`+
            (it.items||[]).map((t,k)=>`<span data-i="${k}"><span${E(`${lp}.${k}`)}>${esc(t)}</span>${k<(it.items.length-1)?", ":""}</span>`).join("")+`</span></p>`)+`</div>`}
      case "languages":return `<div class="cv-item cv-lang" data-i="${i}"><b${E(ip+".name")}>${esc(it.name)}</b>${T==="ats"?" — ":""}<span${E(ip+".level")}>${esc(it.level)}</span></div>`;
      case "list":return `<div class="cv-item" data-i="${i}"><div class="cv-row"><h3><span${E(ip+".title")}>${esc(it.title)}</span>${opt("span","cv-org",ip+".sub",it.sub,"issuer")}</h3>`+
        `<p class="cv-when">${opt("span","",ip+".dates",it.dates,"year")}</p></div>${opt("p","cv-about",ip+".text",it.text,"details")}</div>`;
      default:return `<div class="cv-item" data-i="${i}"><p class="cv-text"${E(ip+".text","text")}>${esc(it.text)}</p></div>`;
    }
  }
  const SEC_ICON={experience:"brief",projects:"gamepad",education:"school",skills:"code",tags:"heart",languages:"language",list:"trophy",text:"user"};
  // An icon as inline SVG (or <img> for uploaded icons).
  function iconHTML(env,name,size){
    const I=env.icons||{},raw=I[name];if(!raw)return "";
    return raw.startsWith("<svg")?raw.replace("<svg ",`<svg width="${size}" height="${size}" `):`<svg viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${raw}</svg>`;
  }
  // HTML for one section (heading + entries).
  function sectionHTML(s,sp,i,col,v,env){
    const lay=(s.type==="languages"&&v.template!=="ats")?" cv-lang-grid":"";
    const ic=v.show_icons?(s.icon||SEC_ICON[s.type]||"star"):"";
    return `<section class="cv-sec cv-${s.type}" data-i="${i}"`+
      X(["Column",sp+".col","select",[col,col==="main"?"side":"main"]],...(env.icons?[["Icon (when section icons are on)",sp+".icon","select",[""].concat(Object.keys(env.icons))]]:[]))+
      `><h2>${ic?`<span class="cv-hi" data-ico="${sp}.icon">${iconHTML(env,ic,15)}</span>`:""}<span${E(sp+".title")}>${esc(s.title||SECTION_TYPES[s.type]&&SECTION_TYPES[s.type].label||"")}</span></h2>`+
      `<div class="cv-items${lay}" data-l="${sp}.items">`+s.items.map((it,k)=>itemHTML(s,sp,it||{},k,v)).join("")+`</div></section>`;
  }
  // HTML for a column (main or side) of the résumé.
  function column(v,base,col,env){
    const list=v[col];
    return `<div class="cv-col cv-${col}" data-l="${base}.${col}">`+list.map((s,i)=>sectionHTML(s,`${base}.${col}.${i}`,i,col,v,env)).join("")+`</div>`;
  }
  // The contact line (email, phone, place, links), with icons in designed templates.
  function contact(v,base,withIcons,edit){
    const P=v.person,pp=base+".person",rows=[];
    const row=(ic,val,inner,href,cls,extra)=>`<li class="cv-contact-item${cls?" "+cls:""}"${extra||""}${val?"":" hidden data-edit-show"}>${withIcons?svg(ic):""}${href?`<a href="${esc(href)}">${inner}</a>`:inner}</li>`;
    rows.push(row("mail",P.email,`<span${E(pp+".email","email")}>${esc(P.email)}</span>`,P.email?"mailto:"+P.email:"","contact-mail",' data-contact="email"'));
    rows.push(row("phone",P.phone,`<span${E(pp+".phone","phone")}>${esc(P.phone)}</span>`,P.phone?"tel:"+String(P.phone).replace(/[^\d+]/g,""):"","contact-phone",' data-contact="phone"'));
    rows.push(row("pin",P.location,`<span${E(pp+".location","location")}>${esc(P.location)}</span>`,"","contact-loc",' data-contact="location"'));
    (P.links||[]).forEach((l,k)=>{const u=full(l.url);rows.push(`<li class="cv-contact-item contact-link" data-contact="link" data-i="${k}"${X(["Web address",`${pp}.links.${k}.url`,"text"])}>${withIcons?svg(linkIcon(u)):""}<a href="${esc(u)}"><span${E(`${pp}.links.${k}.label`)}>${esc(l.label||pretty(u))}</span></a></li>`)});
    return rows;
  }
  // The person's photo (when the template shows one).
  function photo(v,base,env,cls){
    if(!v.show_photo||!v.photo)return env.edit?`<button type="button" class="${cls} cv-photo-add rt-pick" data-m="${base}.photo" data-mk="image" data-cls="${cls}" title="Add your photo">＋ Photo</button>`:"";
    return `<img class="${cls}" src="${esc(env.photo?env.photo(v.photo,base+".photo"):v.photo)}" alt="" data-m="${base}.photo" data-mk="image">`;
  }
  // Render a whole résumé to HTML. env: {edit, base path, asset root}.
  function render(v,id,env){
    env=env||{};v=normalize(v);
    const base=`${env.doc||"cv"}:variants.${id}`,P=v.person,pp=base+".person",T=v.template;
    const settings=X(["Design",base+".template","select",Object.keys(TEMPLATES)],["Color",base+".accent","color",["","--cv-accent"]],
      ["Font",base+".font","select",Object.keys(FONTS)],["Spacing",base+".density","select",DENSITY],["Show photo",base+".show_photo","toggle",["",""]],["Section icons",base+".show_icons","toggle",["",""]],
      ["Photo",base+".photo","image"],["Text direction",base+".dir","select",["ltr","rtl"]]);
    const name=`<h1${E(pp+".name","Your name")}>${esc(P.name)}</h1>`,title=opt("p","cv-title",pp+".title",P.title,"Job title");
    const summary=opt("p","cv-summary",pp+".summary",P.summary,"2-3 lines: who you are and what you are looking for");
    const links=contact(v,base,T!=="ats",env.edit);
    let body;
    if(T==="ats"){
      const line=links.filter(r=>env.edit||!/ hidden data-edit-show/.test(r.slice(0,40))).map(r=>r.replace(/^<li/,"<span").replace(/<\/li>$/,"</span>")).join('<span class="cv-dot" aria-hidden="true"> · </span>');
      const ph=photo(v,base,env,"cv-photo");
      body=`<header class="cv-head${ph&&!/cv-photo-add/.test(ph)?" has-photo":ph?" has-photo add":""}">${ph}<div class="cv-id">${name}${title}<p class="cv-contact" data-l="${pp}.links">${line}</p></div></header>`+
        (P.summary||env.edit?`<section class="cv-sec cv-sum"><h2>Summary</h2>${summary}</section>`:"")+column(v,base,"main",env)+column(v,base,"side",env);
    }else if(T==="novo"){
      body=`<header class="cv-head"><div class="cv-id">${name}${title}${summary}</div>${photo(v,base,env,"cv-photo")}<ul class="cv-contact" data-l="${pp}.links">${links.join("")}</ul></header>`+
        `<div class="cv-cols">${column(v,base,"main",env)}${column(v,base,"side",env)}</div>`;
    }else{
      body=`<aside class="cv-aside">${photo(v,base,env,"cv-photo")}<ul class="cv-contact" data-l="${pp}.links">${links.join("")}</ul>${column(v,base,"side",env)}</aside>`+
        `<div class="cv-body"><header class="cv-head">${name}${title}</header>${P.summary||env.edit?`<section class="cv-sec cv-sum">${summary}</section>`:""}${column(v,base,"main",env)}</div>`;
    }
    return `<article class="cvdoc t-${T} d-${v.density}" id="cv-${esc(id)}" dir="${v.dir==="rtl"?"rtl":"ltr"}" lang="${esc(v.lang||"en")}" style="--cv-accent:${esc(v.accent||"#2a8a8f")};--cv-font:'${esc(v.font||"Inter")}'" data-cv="${esc(id)}"${settings}>${body}</article>`;
  }
  // A new empty section of a type, with one example entry.
  function newSection(type){const T=SECTION_TYPES[type]||SECTION_TYPES.text;return {type,title:T.label,items:[JSON.parse(JSON.stringify(T.item))]}}
  // A new blank résumé.
  function blank(name){return normalize({label:"New résumé",template:"ats",person:{name:name||"Your Name",title:"Job title",summary:"",email:"",phone:"",location:"",links:[]},
    main:[newSection("experience"),newSection("projects"),newSection("education"),newSection("skills")],side:[newSection("languages")]})}
  // plain text of a résumé, in reading order (what an ATS sees) — used for the "ATS check"
  function plainText(v){
    v=normalize(v);const P=v.person,out=[P.name,P.title,[P.email,P.phone,P.location].concat((P.links||[]).map(l=>full(l.url))).filter(Boolean).join(" | "),P.summary];
    for(const s of v.main.concat(v.side)){out.push("",(s.title||"").toUpperCase());for(const it of s.items){out.push(Object.values(it).flat().filter(x=>typeof x==="string"&&x).join(" | "))}}
    return out.filter(x=>x!=null).join("\n");
  }
  const api={SEC_ICON,TEMPLATES,FONTS,DENSITY,COLORS,SECTION_TYPES,render,normalize,fontHref,newSection,blank,plainText,esc};
  if(typeof module!=="undefined"&&module.exports)module.exports=api;else root.RTCV=api;
})(typeof self!=="undefined"?self:this);
