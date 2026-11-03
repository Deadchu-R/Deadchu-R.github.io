/* ==========================================================================
   CVEditor Engine - Standalone Collaborative CV Studio
   Powering roeetal.com/CVEditor
   ========================================================================== */

(function(window, document) {
  "use strict";

  // --- Constants & Dictionaries ---
  const DEFAULT_ADMIN_EMAIL = "roeetal17@gmail.com";
  const PEERJS_CDN = "https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js";

  const KW = [
    "Unity", "Unreal Engine", "Unreal", "C#", "C++", "Blueprints", "Python", "Lua", "JavaScript", "TypeScript",
    "Java", "Go", "Rust", "SQL", "HLSL", "GLSL", "Shader Graph", "shaders", "URP", "HDRP", "Niagara",
    "Gameplay Ability System", "GAS", "DOTS", "ECS", "Addressables", "ScriptableObjects", "UI Toolkit", "UMG",
    "Netcode", "Photon", "Mirror", "Fish-Net", "multiplayer", "networking", "dedicated servers", "physics", "AI",
    "behavior trees", "state machines", "pathfinding", "animation", "rigging", "VFX", "rendering", "graphics",
    "OpenGL", "DirectX", "Vulkan", "Metal", "optimization", "profiling", "performance", "memory management",
    "debugging", "gameplay", "game design", "level design", "tools", "editor tools", "pipelines", "build systems",
    "CI/CD", "Jenkins", "GitHub Actions", "Git", "Perforce", "Plastic SCM", "Jira", "Confluence", "Agile", "Scrum",
    "Kanban", "unit testing", "automated testing", "TDD", "design patterns", "OOP", "SOLID", "data structures",
    "algorithms", "3D math", "linear algebra", "mobile", "iOS", "Android", "console", "PlayStation", "Xbox",
    "Nintendo Switch", "PC", "Steam", "VR", "AR", "XR", "OpenXR", "Meta Quest", "LiveOps", "analytics", "A/B testing",
    "monetization", "F2P", "PlayFab", "Firebase", "REST", "JSON", "backend", "cloud", "AWS", "Azure", "Docker",
    "Kubernetes", "React", "Node.js", "prototyping", "UX", "UI", "localization", "accessibility", "shipped",
    "mentoring", "leadership", "team lead", "communication", "English", "Hebrew", "Bachelor", "B.Sc", "degree",
    "Computer Science", "real-time", "simulation", "digital twin", "Cesium", "Houdini", "Blender", "Maya", "3ds Max",
    "Substance", "Photoshop", "Figma", "Visual Studio", "Rider", "LLM", "Copilot"
  ];

  const SYN = {
    "Unreal Engine": ["unreal", "ue4", "ue5", "unreal engine"],
    "Unreal": ["unreal", "ue4", "ue5"],
    "C#": ["c#", "csharp", "c sharp"],
    "C++": ["c++", "cpp"],
    "JavaScript": ["javascript", "js"],
    "TypeScript": ["typescript", "ts"],
    "Blueprints": ["blueprint", "blueprints"],
    "ScriptableObjects": ["scriptableobject", "scriptable objects", "scriptableobjects"],
    "multiplayer": ["multiplayer", "multi-player", "online", "networked"],
    "CI/CD": ["ci/cd", "continuous integration", "continuous deployment"],
    "AI": ["ai", "artificial intelligence", "navmesh", "behavior trees"],
    "VR": ["vr", "virtual reality"],
    "AR": ["ar", "augmented reality"],
    "UI": ["ui", "user interface", "gui"],
    "UX": ["ux", "user experience"],
    "Git": ["git", "github", "gitlab"],
    "Agile": ["agile", "scrum", "sprints"],
    "OOP": ["oop", "object oriented", "object-oriented"],
    "3D math": ["3d math", "vector math", "linear algebra", "quaternions"],
    "team lead": ["team lead", "led a team", "lead a team", "team leader"],
    "shipped": ["shipped", "released", "launched", "published"]
  };

  const VERBS = {
    build: "built", design: "designed", develop: "developed", implement: "implemented", create: "created",
    lead: "led", manage: "managed", optimize: "optimized", debug: "debugged", integrate: "integrated",
    program: "programmed", write: "wrote", ship: "shipped", launch: "launched", improve: "improved",
    reduce: "reduced", increase: "increased", automate: "automated", architect: "architected",
    prototype: "prototyped", refactor: "refactored", test: "tested", maintain: "maintained",
    deliver: "delivered", coordinate: "coordinated", mentor: "mentored", oversee: "oversaw",
    run: "ran", make: "made", teach: "taught", drive: "drove", grow: "grew", own: "owned",
    support: "supported", collaborate: "collaborated", research: "researched", analyze: "analyzed",
    produce: "produced", handle: "handled", resolve: "resolved", establish: "established",
    train: "trained", model: "modeled", animate: "animated", publish: "published", port: "ported",
    profile: "profiled", fix: "fixed", add: "added", tune: "tuned", balance: "balanced",
    script: "scripted", deploy: "deployed"
  };
  const PAST2PRES = Object.fromEntries(Object.entries(VERBS).map(([a, b]) => [b, a]));

  // --- Helper Functions ---
  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => Array.from(el.querySelectorAll(sel));
  const esc = s => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const escRegex = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  function getByPath(obj, path) {
    if (!path) return obj;
    const parts = path.split(".");
    let cur = obj;
    for (const p of parts) {
      if (cur == null) return undefined;
      cur = cur[p];
    }
    return cur;
  }

  function setByPath(obj, path, val) {
    if (!path) return;
    const parts = path.split(".");
    let cur = obj;
    for (let i = 0; i < parts.length - 1; i++) {
      const p = parts[i];
      if (cur[p] == null) cur[p] = /^\d+$/.test(parts[i + 1]) ? [] : {};
      cur = cur[p];
    }
    cur[parts[parts.length - 1]] = val;
  }

  function hasTerm(text, term) {
    const alts = SYN[term] || [term.toLowerCase()];
    return alts.some(a => new RegExp("(^|[^a-z0-9+#])" + escRegex(a.toLowerCase()) + "($|[^a-z0-9+#])", "i").test(text));
  }

  function cleanJobText(raw) {
    if (!raw) return "";
    let text = String(raw);
    const start = text.match(/(?:About the job|Job description|Role overview|About the role|Position overview|The role|Who we are looking for|Responsibilities)[\s\S]*/i);
    if (start) text = start[0];
    text = text.replace(/(?:Show more|Show less|Similar jobs|People also viewed|Report this job|Set alert for similar jobs|Sign in to apply)[\s\S]*/i, "");
    const lines = text.split("\n").map(l => l.trim()).filter(l => {
      if (!l) return false;
      if (/^(Clear text|Sign in|Join now|Apply|Easy Apply|Save job|Share|Image \d+|Follow|Dismiss|Loading\.\.\.)$/i.test(l)) return false;
      if (/^Posted \d+|^\d+ applicants?|^\d+ months? ago|^\d+ days? ago/i.test(l)) return false;
      return true;
    });
    return lines.join("\n").slice(0, 15000);
  }

  function extractJobKeywords(jobTxt) {
    const clean = cleanJobText(jobTxt);
    const low = " " + clean.toLowerCase() + " ";
    const found = KW.filter(k => hasTerm(low, k));
    const caps = {};
    (clean.match(/\b[A-Z][A-Za-z0-9+#.]{1,20}\b/g) || []).forEach(w => {
      if (!/^(The|And|You|We|Our|Your|This|With|For|In|To|Of|A|An|As|At|On|Is|Are|Be|Or|If|It|Will|Have|Has|Job|About|Who|What|Must|Should|Nice|Plus|Requirements|Responsibilities|Experience|Years|Team|Work|Join|Apply|Location|Remote|Hybrid|Office|Benefits|Company|Role|Position|Studio|Games?|Developer|Engineer|Programmer|Active|Israel|LinkedIn|Sign|Clear|Report|Save|Share|Follow|Full|Part|Time|Mid|Senior|Junior|Salary|Overview)$/.test(w)) {
        caps[w] = (caps[w] || 0) + 1;
      }
    });
    const extra = Object.entries(caps).filter(([w, n]) => n >= 2 && !found.some(f => f.toLowerCase() === w.toLowerCase())).map(([w]) => w).slice(0, 10);
    return Array.from(new Set(found.concat(extra)));
  }

  // --- CVEditor Application State ---
  const state = {
    currentUser: null,       // { id, email, name, role: 'admin'|'friend' }
    allUsers: [],            // List of registered accounts
    vault: {},               // Keyed by user ID: { [cvId]: cvObject }
    activeCvId: "unity-ats", // ID of CV currently shown/edited
    activeOwnerId: "roee",   // Owner of the active CV
    zoom: 1.0,
    activeTab: "content",    // "content" | "design" | "vault"
    isCollabHost: false,
    collabRoomId: null,
    peer: null,
    connections: [],
    collaborators: {},       // { [peerId]: { name, color, activeField } }
    jobText: "",
    jobUrl: ""
  };

  // Pre-seed Roee's base CV data
  const ROEE_DEFAULT_CV = {
    label: "Unity · ATS (Main)",
    template: "ats",
    accent: "#1f5fa8",
    font: "Inter",
    density: "normal",
    photo: "/assets/uploads/1000211257-f1al.jpg",
    show_photo: true,
    show_icons: false,
    dir: "ltr",
    lang: "en",
    person: {
      name: "Roee Tal",
      title: "Game Developer — Unity",
      summary: "Game developer with 1.5 years of professional real-time 3D development at 3DVision and a 3-year game design and development program at Tiltan. Strong Unity and C# foundation: modular, data-driven systems, event-driven gameplay and UI.",
      email: "roeetal17@gmail.com",
      phone: "053-337-4350",
      location: "Israel",
      links: [
        { label: "roeetal.com", url: "https://www.roeetal.com/" },
        { label: "LinkedIn", url: "https://linkedin.com/in/roee-tal" },
        { label: "GitHub", url: "https://github.com/Deadchu-R" }
      ]
    },
    main: [
      {
        type: "experience",
        title: "Experience",
        items: [
          {
            role: "Unreal Developer",
            org: "3DVision",
            dates: "02/2025 – Present",
            location: "Tel Aviv",
            about: "Real-time interactive apps for real-estate companies, built in Unreal Engine",
            label: "",
            bullets: [
              "Develop and integrate interactive features based on client requirements across multiple projects",
              "Address and fix critical issues throughout the app lifecycle, ensuring stability under tight deadlines",
              "Manage and optimize assets for real-time performance across various target platforms"
            ]
          },
          {
            role: "3D Specialist",
            org: "3DVision",
            dates: "10/2023 – 02/2025",
            location: "Tel Aviv",
            about: "VR and real-time visualization applications",
            label: "",
            bullets: [
              "Developed interactive features for real-time visualization applications",
              "Created realistic 3D environments, materials, and lighting using 3ds Max and Corona",
              "Collaborated with developers and clients to bring concepts into production-ready scenes"
            ]
          }
        ]
      },
      {
        type: "projects",
        title: "Selected Projects",
        items: [
          {
            name: "Loot Defender",
            meta: "Unity · Solo Developer",
            dates: "2024",
            link: "https://www.roeetal.com/#p-loot-defender",
            link_label: "Playable Demo",
            bullets: [
              "Engineered a top-down tower defense game in Unity featuring wave-based enemy AI and pathfinding",
              "Architected modular upgrade systems utilizing ScriptableObjects for flexible balance iterations"
            ]
          },
          {
            name: "Neon Rush",
            meta: "Unity · Gameplay & Tools",
            dates: "2023",
            link: "https://www.roeetal.com/#p-neon-rush",
            link_label: "Video Demo",
            bullets: [
              "Implemented fast-paced physics-based vehicle controller and camera damping systems",
              "Built custom inspector tools and level-generation editors to speed up track creation"
            ]
          }
        ]
      },
      {
        type: "education",
        title: "Education",
        items: [
          {
            degree: "Game Design & Development (3-Year Program)",
            school: "Tiltan College of Design",
            dates: "2021 – 2024",
            location: "Haifa, Israel",
            about: "Comprehensive game development curriculum covering C#, game physics, 3D math and shaders",
            label: "Highlights",
            bullets: [
              "Graduated with honors; led team final project as primary gameplay programmer"
            ]
          }
        ]
      },
      {
        type: "skills",
        title: "Skills",
        items: [
          {
            label: "Engines & Languages",
            items: ["Unity", "Unreal Engine", "C#", "C++", "Blueprints", "HLSL", "Python"]
          },
          {
            label: "Game Dev & Tools",
            items: ["ScriptableObjects", "Addressables", "Git", "GitHub Actions", "3ds Max", "Blender", "Figma", "Jira"]
          }
        ]
      }
    ],
    side: [
      {
        type: "languages",
        title: "Languages",
        items: [
          { name: "Hebrew", level: "Native" },
          { name: "English", level: "Fluent" }
        ]
      }
    ]
  };

  // --- Auth & Storage Service ---
  const Storage = {
    init() {
      // Load all users
      try {
        const u = localStorage.getItem("cve_users");
        state.allUsers = u ? JSON.parse(u) : [];
      } catch (e) { state.allUsers = []; }

      // Check if Roee exists; if not, create master profile
      let roee = state.allUsers.find(x => x.email.toLowerCase() === DEFAULT_ADMIN_EMAIL.toLowerCase());
      if (!roee) {
        roee = { id: "roee", email: DEFAULT_ADMIN_EMAIL, name: "Roee Tal", role: "admin", pass: "roee123" };
        state.allUsers.unshift(roee);
        this.saveUsers();
      }

      // Load session
      try {
        const cur = sessionStorage.getItem("cve_cur_user") || localStorage.getItem("cve_cur_user");
        if (cur) {
          state.currentUser = JSON.parse(cur);
        } else {
          // Default to Roee admin session for easy first visit
          state.currentUser = roee;
        }
      } catch (e) {
        state.currentUser = roee;
      }

      // Load Vault
      try {
        const v = localStorage.getItem("cve_vault");
        state.vault = v ? JSON.parse(v) : {};
      } catch (e) { state.vault = {}; }

      // Make sure Roee has default CV
      if (!state.vault["roee"]) {
        state.vault["roee"] = {
          "unity-ats": JSON.parse(JSON.stringify(ROEE_DEFAULT_CV)),
          "unreal-novo": Object.assign(JSON.parse(JSON.stringify(ROEE_DEFAULT_CV)), {
            label: "Unreal · Novo (Two-Column)",
            template: "novo",
            accent: "#7c3aed"
          })
        };
        this.saveVault();
      }

      state.activeOwnerId = state.currentUser ? state.currentUser.id : "roee";
      const ownerCvs = state.vault[state.activeOwnerId] || {};
      const firstCvId = Object.keys(ownerCvs)[0];
      if (firstCvId) state.activeCvId = firstCvId;
    },

    saveUsers() {
      localStorage.setItem("cve_users", JSON.stringify(state.allUsers));
    },

    saveVault() {
      localStorage.setItem("cve_vault", JSON.stringify(state.vault));
      showSaveIndicator();
    },

    login(email, pass) {
      email = email.trim().toLowerCase();
      const u = state.allUsers.find(x => x.email.toLowerCase() === email);
      if (!u) throw new Error("No account found with this email. Please sign up.");
      if (u.pass && u.pass !== pass) throw new Error("Incorrect password.");
      state.currentUser = u;
      localStorage.setItem("cve_cur_user", JSON.stringify(u));
      state.activeOwnerId = u.id;
      const ownerCvs = state.vault[u.id] || {};
      state.activeCvId = Object.keys(ownerCvs)[0] || "my-cv";
      if (!ownerCvs[state.activeCvId]) {
        state.vault[u.id] = { [state.activeCvId]: window.RTCV ? window.RTCV.blank(u.name) : JSON.parse(JSON.stringify(ROEE_DEFAULT_CV)) };
        this.saveVault();
      }
      return u;
    },

    register(email, name, pass) {
      email = email.trim().toLowerCase();
      if (!email || !pass) throw new Error("Please enter email and password.");
      if (state.allUsers.some(x => x.email.toLowerCase() === email)) {
        throw new Error("An account with this email already exists.");
      }
      const isRoee = email === DEFAULT_ADMIN_EMAIL.toLowerCase();
      const id = "usr_" + Math.random().toString(36).substring(2, 9);
      const newUser = {
        id,
        email,
        name: name.trim() || email.split("@")[0],
        role: isRoee ? "admin" : "friend",
        pass
      };
      state.allUsers.push(newUser);
      this.saveUsers();

      // Create new private CV for this friend
      state.vault[id] = {
        "cv-1": Object.assign(window.RTCV ? window.RTCV.blank(newUser.name) : JSON.parse(JSON.stringify(ROEE_DEFAULT_CV)), {
          label: newUser.name + " - Standard CV",
          person: { name: newUser.name, email: newUser.email, title: "Professional", summary: "", phone: "", location: "", links: [] }
        })
      };
      this.saveVault();

      state.currentUser = newUser;
      localStorage.setItem("cve_cur_user", JSON.stringify(newUser));
      state.activeOwnerId = id;
      state.activeCvId = "cv-1";
      return newUser;
    },

    logout() {
      sessionStorage.removeItem("cve_cur_user");
      localStorage.removeItem("cve_cur_user");
      // Fallback to guest or Roee
      state.currentUser = null;
    }
  };

  function getCurrentCV() {
    const owner = state.vault[state.activeOwnerId] || {};
    if (!owner[state.activeCvId]) {
      // fallback
      const first = Object.keys(owner)[0];
      if (first) {
        state.activeCvId = first;
        return owner[first];
      }
      const blank = window.RTCV ? window.RTCV.blank(state.currentUser ? state.currentUser.name : "Your Name") : JSON.parse(JSON.stringify(ROEE_DEFAULT_CV));
      owner["cv-main"] = blank;
      state.vault[state.activeOwnerId] = owner;
      state.activeCvId = "cv-main";
      Storage.saveVault();
      return blank;
    }
    return owner[state.activeCvId];
  }

  function saveCurrentCV(cv) {
    if (!state.vault[state.activeOwnerId]) state.vault[state.activeOwnerId] = {};
    state.vault[state.activeOwnerId][state.activeCvId] = cv;
    Storage.saveVault();
    // Broadcast live update if collaborating
    broadcastCollabUpdate(cv);
  }

  function showSaveIndicator() {
    const el = $("#saveStatus");
    if (el) {
      el.innerHTML = "<span>✓ Saved locally</span>";
      el.style.opacity = "1";
    }
  }

  // --- Real-time Rendering & Live View ---
  function renderA4Sheet() {
    const cv = getCurrentCV();
    const stage = $("#cvSheet");
    if (!stage || !window.RTCV) return;

    // Normalizing CV
    const norm = window.RTCV.normalize(cv);

    // Render HTML
    stage.innerHTML = window.RTCV.render(norm, state.activeCvId, { edit: true });

    // Load font
    let fontLink = $("#cv-dynamic-font");
    if (!fontLink) {
      fontLink = document.createElement("link");
      fontLink.rel = "stylesheet";
      fontLink.id = "cv-dynamic-font";
      document.head.appendChild(fontLink);
    }
    fontLink.href = window.RTCV.fontHref(norm);

    // Apply inline editing listeners to data-e elements
    attachInlineEditors(stage);

    // Apply zoom
    applyZoom();

    // Update Topbar document selector & template buttons
    updateTopbarUI();

    // Re-check ATS score badge
    updateAtsBadge();
  }

  function attachInlineEditors(stage) {
    const editables = stage.querySelectorAll("[data-e]");
    editables.forEach(el => {
      el.setAttribute("contenteditable", "true");
      el.setAttribute("spellcheck", "false");

      el.addEventListener("input", () => {
        const path = el.getAttribute("data-e");
        if (!path) return;
        // strip out document prefix e.g. "cv:variants.id."
        const cleanPath = path.replace(/^[^:]+:variants\.[^.]+\./, "");
        const val = el.innerText.trim();

        const cv = getCurrentCV();
        setByPath(cv, cleanPath, val);
        saveCurrentCV(cv);

        // Update corresponding sidebar field without re-rendering entire sheet
        syncSidebarField(cleanPath, val);
        updateAtsBadge();
        broadcastPresence(cleanPath);
      });

      el.addEventListener("focus", () => {
        const path = el.getAttribute("data-e");
        if (path) {
          const cleanPath = path.replace(/^[^:]+:variants\.[^.]+\./, "");
          broadcastPresence(cleanPath);
        }
      });
    });
  }

  function applyZoom() {
    const container = $("#a4Container");
    if (!container) return;
    container.style.transform = `scale(${state.zoom})`;
    const val = $("#zoomVal");
    if (val) val.textContent = Math.round(state.zoom * 100) + "%";
  }

  function setFitZoom() {
    const viewport = $("#canvasViewport");
    const container = $("#a4Container");
    if (!viewport || !container) return;
    const availW = viewport.clientWidth - 48;
    const sheetW = 794; // 210mm in standard 96dpi pixels is ~794px
    const z = Math.min(1.2, Math.max(0.4, availW / sheetW));
    state.zoom = z;
    applyZoom();
  }

  // --- Sidebar Forms & Tabs ---
  function renderSidebar() {
    const tab = state.activeTab;
    const body = $("#sidebarContent");
    if (!body) return;

    if (tab === "content") {
      renderContentTab(body);
    } else if (tab === "design") {
      renderDesignTab(body);
    } else if (tab === "vault") {
      renderVaultTab(body);
    }
  }

  function renderContentTab(body) {
    const cv = getCurrentCV();
    const P = cv.person || {};

    let html = `
      <!-- Personal Details -->
      <div class="cve-section-card">
        <div class="cve-section-header" onclick="this.parentElement.classList.toggle('collapsed')">
          <span class="cve-section-title">👤 Personal Details</span>
        </div>
        <div class="cve-section-body">
          <div class="cve-row-2">
            <div class="cve-form-group">
              <label class="cve-label">Full Name</label>
              <input type="text" class="cve-input" data-bind="person.name" value="${esc(P.name || "")}" placeholder="Roee Tal">
            </div>
            <div class="cve-form-group">
              <label class="cve-label">Professional Title</label>
              <input type="text" class="cve-input" data-bind="person.title" value="${esc(P.title || "")}" placeholder="Game Developer">
            </div>
          </div>
          <div class="cve-row-2">
            <div class="cve-form-group">
              <label class="cve-label">Email</label>
              <input type="email" class="cve-input" data-bind="person.email" value="${esc(P.email || "")}" placeholder="name@domain.com">
            </div>
            <div class="cve-form-group">
              <label class="cve-label">Phone</label>
              <input type="tel" class="cve-input" data-bind="person.phone" value="${esc(P.phone || "")}" placeholder="050-1234567">
            </div>
          </div>
          <div class="cve-form-group">
            <label class="cve-label">Location / City</label>
            <input type="text" class="cve-input" data-bind="person.location" value="${esc(P.location || "")}" placeholder="Tel Aviv, Israel">
          </div>
          <div class="cve-form-group">
            <label class="cve-label">Summary / Bio</label>
            <textarea rows="3" class="cve-textarea" data-bind="person.summary" placeholder="2-3 sentences about your expertise, achievements and passions...">${esc(P.summary || "")}</textarea>
          </div>
        </div>
      </div>
    `;

    // Sections (Experience, Projects, Skills, etc.)
    const allSections = (cv.main || []).concat(cv.side || []);
    allSections.forEach((sec, sIdx) => {
      const isSide = sIdx >= (cv.main || []).length;
      const col = isSide ? "side" : "main";
      const colIdx = isSide ? sIdx - (cv.main || []).length : sIdx;
      const basePath = `${col}.${colIdx}`;

      html += `
        <div class="cve-section-card">
          <div class="cve-section-header">
            <span class="cve-section-title">📂 ${esc(sec.title || sec.type)}</span>
            <div class="cve-section-actions">
              <button type="button" class="cve-icon-btn-sm" onclick="window.CVE.addEntry('${basePath}')" title="Add Item">＋</button>
              <button type="button" class="cve-icon-btn-sm" onclick="window.CVE.removeSection('${basePath}')" title="Delete Section">✕</button>
            </div>
          </div>
          <div class="cve-section-body">
            <div class="cve-form-group">
              <label class="cve-label">Section Title</label>
              <input type="text" class="cve-input" data-bind="${basePath}.title" value="${esc(sec.title || "")}">
            </div>
      `;

      // Render Entries inside section
      (sec.items || []).forEach((item, iIdx) => {
        const itemPath = `${basePath}.items.${iIdx}`;
        html += `<div style="background:rgba(0,0,0,0.2);padding:10px;border-radius:6px;border:1px solid rgba(255,255,255,0.06);display:flex;flex-direction:column;gap:8px;">`;

        if (sec.type === "experience") {
          html += `
            <div class="cve-row-2">
              <input type="text" class="cve-input" data-bind="${itemPath}.role" value="${esc(item.role || "")}" placeholder="Job Title">
              <input type="text" class="cve-input" data-bind="${itemPath}.org" value="${esc(item.org || "")}" placeholder="Company">
            </div>
            <div class="cve-row-2">
              <input type="text" class="cve-input" data-bind="${itemPath}.dates" value="${esc(item.dates || "")}" placeholder="MM/YYYY – Present">
              <input type="text" class="cve-input" data-bind="${itemPath}.location" value="${esc(item.location || "")}" placeholder="City">
            </div>
            <input type="text" class="cve-input" data-bind="${itemPath}.about" value="${esc(item.about || "")}" placeholder="One line about the role...">
            <label class="cve-label">Bullet Points (Action verbs & metrics)</label>
            <div class="cve-bullet-list">
              ${(item.bullets || []).map((b, bIdx) => `
                <div class="cve-bullet-item">
                  <textarea rows="2" class="cve-bullet-input" data-bind="${itemPath}.bullets.${bIdx}" placeholder="Accomplished [X] by implementing [Y]...">${esc(b)}</textarea>
                  <button type="button" class="cve-bullet-del" onclick="window.CVE.removeBullet('${itemPath}', ${bIdx})">✕</button>
                </div>
              `).join("")}
              <button type="button" class="cve-btn" style="margin-top:4px;" onclick="window.CVE.addBullet('${itemPath}')">＋ Add Bullet</button>
            </div>
          `;
        } else if (sec.type === "projects") {
          html += `
            <div class="cve-row-2">
              <input type="text" class="cve-input" data-bind="${itemPath}.name" value="${esc(item.name || "")}" placeholder="Project Name">
              <input type="text" class="cve-input" data-bind="${itemPath}.meta" value="${esc(item.meta || "")}" placeholder="Engine · Role">
            </div>
            <div class="cve-row-2">
              <input type="text" class="cve-input" data-bind="${itemPath}.dates" value="${esc(item.dates || "")}" placeholder="Year">
              <input type="url" class="cve-input" data-bind="${itemPath}.link" value="${esc(item.link || "")}" placeholder="https://...">
            </div>
            <div class="cve-bullet-list">
              ${(item.bullets || []).map((b, bIdx) => `
                <div class="cve-bullet-item">
                  <textarea rows="2" class="cve-bullet-input" data-bind="${itemPath}.bullets.${bIdx}">${esc(b)}</textarea>
                  <button type="button" class="cve-bullet-del" onclick="window.CVE.removeBullet('${itemPath}', ${bIdx})">✕</button>
                </div>
              `).join("")}
              <button type="button" class="cve-btn" style="margin-top:4px;" onclick="window.CVE.addBullet('${itemPath}')">＋ Add Bullet</button>
            </div>
          `;
        } else if (sec.type === "skills" || sec.type === "tags") {
          html += `
            <input type="text" class="cve-input" data-bind="${itemPath}.label" value="${esc(item.label || "")}" placeholder="Category (e.g. Languages, Tools)">
            <label class="cve-label">Skills (separated by comma)</label>
            <input type="text" class="cve-input" value="${esc((item.items || []).join(", "))}" onchange="window.CVE.updateSkillChips('${itemPath}', this.value)" placeholder="Unity, C#, Shader Graph, Git">
          `;
        } else if (sec.type === "education") {
          html += `
            <div class="cve-row-2">
              <input type="text" class="cve-input" data-bind="${itemPath}.degree" value="${esc(item.degree || "")}" placeholder="Degree / Program">
              <input type="text" class="cve-input" data-bind="${itemPath}.school" value="${esc(item.school || "")}" placeholder="School / College">
            </div>
            <div class="cve-row-2">
              <input type="text" class="cve-input" data-bind="${itemPath}.dates" value="${esc(item.dates || "")}" placeholder="YYYY – YYYY">
              <input type="text" class="cve-input" data-bind="${itemPath}.location" value="${esc(item.location || "")}" placeholder="Location">
            </div>
          `;
        } else if (sec.type === "languages") {
          html += `
            <div class="cve-row-2">
              <input type="text" class="cve-input" data-bind="${itemPath}.name" value="${esc(item.name || "")}" placeholder="Language">
              <input type="text" class="cve-input" data-bind="${itemPath}.level" value="${esc(item.level || "")}" placeholder="Native / Fluent">
            </div>
          `;
        }

        html += `
            <button type="button" class="cve-btn" style="align-self:flex-start;font-size:11.5px;padding:3px 8px;margin-top:4px;" onclick="window.CVE.removeEntry('${basePath}', ${iIdx})">Remove Entry</button>
          </div>
        `;
      });

      html += `</div></div>`;
    });

    // Add Section button
    html += `
      <div style="display:flex;gap:8px;padding-top:8px;">
        <select id="newSecType" class="cve-select" style="flex:1;">
          <option value="experience">💼 Experience</option>
          <option value="projects">🎮 Projects</option>
          <option value="skills">⚡ Skills</option>
          <option value="education">🎓 Education</option>
          <option value="languages">🌐 Languages</option>
          <option value="list">🏆 Certifications / Awards</option>
          <option value="text">📝 Custom Text</option>
        </select>
        <button type="button" class="cve-btn pri" onclick="window.CVE.addSection(document.getElementById('newSecType').value)">＋ Add Section</button>
      </div>
    `;

    body.innerHTML = html;
    attachSidebarInputs(body);
  }

  function renderDesignTab(body) {
    const cv = getCurrentCV();
    const colors = ["#1f5fa8", "#2a8a8f", "#1f6feb", "#0b7a4b", "#b5452a", "#7c3aed", "#c2185b", "#334155", "#d4a017"];
    const fonts = ["Inter", "Rubik", "Assistant", "Open Sans", "Lato", "Source Serif 4"];

    body.innerHTML = `
      <div class="cve-section-card">
        <div class="cve-section-header">
          <span class="cve-section-title">🎨 Layout & Template</span>
        </div>
        <div class="cve-section-body">
          <div class="cve-form-group">
            <label class="cve-label">Template</label>
            <select class="cve-select" data-bind="template" onchange="window.CVE.setTemplate(this.value)">
              <option value="ats" ${cv.template === "ats" ? "selected" : ""}>ATS Pro (1-Column, Pure ATS Friendly)</option>
              <option value="novo" ${cv.template === "novo" ? "selected" : ""}>Novo (2-Column, Modern & Balanced)</option>
              <option value="studio" ${cv.template === "studio" ? "selected" : ""}>Studio (Colored Sidebar)</option>
            </select>
          </div>
          <div class="cve-form-group">
            <label class="cve-label">Accent Color</label>
            <div class="cve-color-palette">
              ${colors.map(c => `
                <div class="cve-color-swatch ${cv.accent === c ? "active" : ""}" style="background:${c};" onclick="window.CVE.setAccent('${c}')"></div>
              `).join("")}
            </div>
            <input type="color" style="margin-top:8px;height:32px;width:100%;background:none;border:none;cursor:pointer;" value="${cv.accent || "#1f5fa8"}" onchange="window.CVE.setAccent(this.value)">
          </div>
          <div class="cve-form-group">
            <label class="cve-label">Typography / Font</label>
            <select class="cve-select" data-bind="font" onchange="window.CVE.setFont(this.value)">
              ${fonts.map(f => `<option value="${f}" ${cv.font === f ? "selected" : ""}>${f}</option>`).join("")}
            </select>
          </div>
          <div class="cve-form-group">
            <label class="cve-label">Density / Spacing</label>
            <select class="cve-select" data-bind="density" onchange="window.CVE.setDensity(this.value)">
              <option value="compact" ${cv.density === "compact" ? "selected" : ""}>Compact (Fit More on 1 Page)</option>
              <option value="normal" ${cv.density === "normal" ? "selected" : ""}>Normal</option>
              <option value="roomy" ${cv.density === "roomy" ? "selected" : ""}>Roomy (Generous Breathing Room)</option>
            </select>
          </div>
          <div class="cve-form-group">
            <label class="cve-label">Text Direction (Language)</label>
            <select class="cve-select" data-bind="dir" onchange="window.CVE.setDirection(this.value)">
              <option value="ltr" ${cv.dir === "ltr" ? "selected" : ""}>Left-to-Right (English / Latin)</option>
              <option value="rtl" ${cv.dir === "rtl" ? "selected" : ""}>Right-to-Left (עברית / Hebrew)</option>
            </select>
          </div>
          <div class="cve-form-group">
            <label class="cve-label">Profile Photo</label>
            <input type="text" class="cve-input" data-bind="photo" value="${esc(cv.photo || "")}" placeholder="Image URL / path">
            <div style="display:flex;align-items:center;gap:8px;margin-top:6px;">
              <input type="checkbox" id="showPhotoCb" ${cv.show_photo ? "checked" : ""} onchange="window.CVE.togglePhoto(this.checked)">
              <label for="showPhotoCb" style="font-size:13px;color:#fff;cursor:pointer;">Show Photo on CV</label>
            </div>
          </div>
        </div>
      </div>
    `;
    attachSidebarInputs(body);
  }

  function renderVaultTab(body) {
    const user = state.currentUser;
    const isRoee = user && user.role === "admin";
    const myCvs = state.vault[state.activeOwnerId] || {};

    let html = `
      <div class="cve-section-card">
        <div class="cve-section-header">
          <span class="cve-section-title">🔐 User Account & Vault</span>
        </div>
        <div class="cve-section-body">
          <p style="font-size:13px;color:#fff;">Logged in as: <b>${esc(user ? user.name : "Guest")}</b> (${esc(user ? user.email : "Local")})</p>
          <p style="font-size:12px;color:var(--cve-text-muted);">
            ${isRoee ? "🌟 Roee Admin Mode: Full access to all your and friends' CVs." : "🔒 Friend Account: Your CVs are private to you and Roee."}
          </p>
          <div style="display:flex;gap:8px;margin-top:4px;">
            <button type="button" class="cve-btn" onclick="window.CVE.openAuthModal()">Switch / Log In</button>
            <button type="button" class="cve-btn" onclick="window.CVE.exportVaultJson()">💾 Backup All (JSON)</button>
          </div>
        </div>
      </div>

      <!-- CV Variants List -->
      <div class="cve-section-card">
        <div class="cve-section-header">
          <span class="cve-section-title">📄 My Resumes (${Object.keys(myCvs).length})</span>
          <button type="button" class="cve-btn pri" style="padding:4px 10px;font-size:12px;" onclick="window.CVE.createNewCV()">＋ New CV</button>
        </div>
        <div class="cve-section-body">
          <div style="display:flex;flex-direction:column;gap:6px;">
            ${Object.entries(myCvs).map(([id, item]) => `
              <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;border-radius:6px;background:${state.activeCvId === id ? "rgba(37,99,235,0.2)" : "rgba(255,255,255,0.03)"};border:1px solid ${state.activeCvId === id ? "var(--cve-accent)" : "var(--cve-border)"};">
                <div>
                  <div style="font-weight:700;font-size:13px;color:#fff;">${esc(item.label || id)}</div>
                  <div style="font-size:11px;color:var(--cve-text-muted);text-transform:uppercase;">${esc(item.template)} · ${(item.main || []).length} sections</div>
                </div>
                <div style="display:flex;gap:4px;">
                  <button type="button" class="cve-btn" style="padding:3px 8px;font-size:11.5px;" onclick="window.CVE.switchCV('${id}')">${state.activeCvId === id ? "Active" : "Open"}</button>
                  <button type="button" class="cve-icon-btn-sm" onclick="window.CVE.duplicateCV('${id}')" title="Duplicate">❐</button>
                  ${Object.keys(myCvs).length > 1 ? `<button type="button" class="cve-icon-btn-sm" onclick="window.CVE.deleteCV('${id}')" title="Delete">✕</button>` : ""}
                </div>
              </div>
            `).join("")}
          </div>
        </div>
      </div>
    `;

    // If Roee is logged in, show Friends' Vaults
    if (isRoee) {
      const friends = state.allUsers.filter(u => u.id !== "roee");
      html += `
        <div class="cve-section-card" style="border-color:rgba(124,58,237,0.4);">
          <div class="cve-section-header" style="background:rgba(124,58,237,0.12);">
            <span class="cve-section-title" style="color:#c084fc;">👥 Friends' Resumes Vault (${friends.length})</span>
          </div>
          <div class="cve-section-body">
            <p style="font-size:12px;color:var(--cve-text-muted);">As admin, you can view, review, or edit resumes created by your friends:</p>
            <div style="display:flex;flex-direction:column;gap:6px;margin-top:6px;">
              ${friends.map(f => {
                const fCvs = state.vault[f.id] || {};
                const isSelected = state.activeOwnerId === f.id;
                return `
                  <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;border-radius:6px;background:${isSelected ? "rgba(124,58,237,0.25)" : "rgba(255,255,255,0.03)"};border:1px solid ${isSelected ? "#7c3aed" : "var(--cve-border)"};">
                    <div>
                      <div style="font-weight:700;font-size:13px;color:#fff;">${esc(f.name)}</div>
                      <div style="font-size:11px;color:var(--cve-text-muted);">${esc(f.email)} · ${Object.keys(fCvs).length} CV(s)</div>
                    </div>
                    <button type="button" class="cve-btn" style="padding:3px 10px;font-size:12px;" onclick="window.CVE.switchOwner('${f.id}')">
                      ${isSelected ? "Inspecting ✓" : "Inspect CVs"}
                    </button>
                  </div>
                `;
              }).join("")}
              ${friends.length === 0 ? `<p style="font-size:12px;color:var(--cve-text-muted);font-style:italic;">No friend accounts registered yet. Friends can sign up via the Account menu!</p>` : ""}
            </div>
            ${state.activeOwnerId !== "roee" ? `
              <button type="button" class="cve-btn pri" style="margin-top:8px;" onclick="window.CVE.switchOwner('roee')">← Return to Roee's CVs</button>
            ` : ""}
          </div>
        </div>
      `;
    }

    body.innerHTML = html;
  }

  function attachSidebarInputs(container) {
    const inputs = container.querySelectorAll("[data-bind]");
    inputs.forEach(input => {
      input.addEventListener("input", () => {
        const path = input.getAttribute("data-bind");
        const val = input.value;
        const cv = getCurrentCV();
        setByPath(cv, path, val);
        saveCurrentCV(cv);
        renderA4Sheet();
      });
    });
  }

  function syncSidebarField(path, val) {
    const el = document.querySelector(`[data-bind="${path}"]`);
    if (el && el.value !== val) {
      el.value = val;
    }
  }

  function updateTopbarUI() {
    const cv = getCurrentCV();
    const myCvs = state.vault[state.activeOwnerId] || {};

    // Select dropdown
    const sel = $("#docSelect");
    if (sel) {
      sel.innerHTML = Object.entries(myCvs).map(([id, item]) => `
        <option value="${id}" ${state.activeCvId === id ? "selected" : ""}>${esc(item.label || id)}</option>
      `).join("");
    }

    // Template pills
    $$(".cve-tpl-btn").forEach(btn => {
      btn.classList.toggle("active", btn.getAttribute("data-tpl") === cv.template);
    });

    // User button
    const userBtn = $("#userBtn");
    if (userBtn) {
      const u = state.currentUser;
      userBtn.innerHTML = `
        <span class="cve-user-avatar">${u ? u.name.charAt(0).toUpperCase() : "G"}</span>
        <span>${esc(u ? u.name : "Sign In")}</span>
      `;
    }
  }

  // --- ATS Scanner & Job Matcher Logic ---
  function computeAtsChecks(cv) {
    const txt = (window.RTCV ? window.RTCV.plainText(cv) : "").toLowerCase();
    const P = cv.person || {};
    const secs = (cv.main || []).concat(cv.side || []);
    const checks = [];

    const addCheck = (ok, title, desc, w = 1) => checks.push({ ok: !!ok, title, desc, w });

    addCheck(cv.template === "ats", "1-Column Layout (ATS Preferred)", "Single-column layouts guarantee accurate reading order across all ATS parsing engines.", 2);
    addCheck(P.email && P.phone, "Contact Info (Email & Phone)", "Every recruiter and ATS expects phone and email at the very top.", 2);
    addCheck((P.links || []).some(l => /linkedin/i.test(l.url)), "LinkedIn Profile Link", "Recruiters check your verified work history and recommendations on LinkedIn.", 1);
    addCheck((P.links || []).some(l => /github|portfolio|itch|\.com/i.test(l.url)), "Portfolio / GitHub Link", "Direct proof of work is critical for tech and game development roles.", 1);

    const stdTypes = ["experience", "education", "skills"];
    addCheck(stdTypes.every(t => secs.some(s => s.type === t)), "Standard Section Headings", "ATS filters map Experience, Education, and Skills directly to database fields.", 2);

    const expItems = secs.filter(s => s.type === "experience").flatMap(s => s.items || []);
    addCheck(expItems.length > 0 && expItems.every(it => String(it.dates || "").trim()), "Dates on Every Role", "Dates are parsed to calculate your total years of commercial experience.", 2);

    const bullets = secs.filter(s => ["experience", "projects"].includes(s.type)).flatMap(s => s.items || []).flatMap(it => it.bullets || []).map(String);
    const actionBullets = bullets.filter(b => {
      const firstWord = (b.trim().match(/^[A-Za-z]+/i) || [""])[0].toLowerCase();
      return VERBS[firstWord] || PAST2PRES[firstWord];
    });
    const verbRatio = bullets.length ? actionBullets.length / bullets.length : 1;
    addCheck(verbRatio >= 0.55, `Action Verbs at Start (${actionBullets.length}/${bullets.length})`, "Harvard career standard: start bullet points with strong action verbs (Built, Led, Optimized).", 2);

    const metricBullets = bullets.filter(b => /\d/.test(b));
    const metricRatio = bullets.length ? metricBullets.length / bullets.length : 1;
    addCheck(metricRatio >= 0.3, `Measurable Results & Numbers (${metricBullets.length}/${bullets.length})`, "Google X-Y-Z formula: Accomplished [X] as measured by [Y] by doing [Z].", 2);

    addCheck(!bullets.some(b => b.length > 210), "Concise Bullets (Under 210 chars)", "Short, punchy 1-2 line bullets have 2x higher retention than paragraphs.", 1);

    const wordCount = txt.split(/\s+/).filter(Boolean).length;
    addCheck(wordCount >= 250 && wordCount <= 750, `Ideal Word Count (${wordCount} words)`, "Aim for 350–650 words for a single-page technical résumé.", 1);

    addCheck(!/\b(i|me|my)\b/.test(txt.replace(/\n.*@.*\n/, "")), 'No First-Person Pronouns ("I" / "my")', "Professional résumés drop pronouns for an authoritative tone.", 1);

    return checks;
  }

  function updateAtsBadge() {
    const cv = getCurrentCV();
    const checks = computeAtsChecks(cv);
    const totalW = checks.reduce((a, b) => a + b.w, 0);
    const gotW = checks.reduce((a, b) => a + (b.ok ? b.w : 0), 0);
    const score = Math.round((gotW / totalW) * 100);

    const badge = $("#atsScoreBadge");
    if (badge) {
      badge.textContent = score + "%";
      badge.classList.toggle("good", score >= 80);
    }
  }

  async function fetchJobAdFromUrl(url) {
    url = url.trim();
    if (!/^https?:\/\//i.test(url)) url = "https://" + url;

    // Headless reader proxy (r.jina.ai)
    try {
      const res = await fetch("https://r.jina.ai/" + url, { headers: { "Accept": "text/plain" } });
      if (res.ok) {
        const text = await res.text();
        if (text.length > 200 && !/access denied|challenge-platform/i.test(text.slice(0, 500))) {
          return cleanJobText(text);
        }
      }
    } catch (e) {}

    // Fallback CORS proxy
    try {
      const proxy = "https://api.allorigins.win/raw?url=" + encodeURIComponent(url);
      const res = await fetch(proxy);
      if (res.ok) {
        const html = await res.text();
        const doc = new DOMParser().parseFromString(html, "text/html");
        doc.querySelectorAll("script,style,noscript,nav,header,footer").forEach(e => e.remove());
        const raw = (doc.body.innerText || doc.body.textContent || "").trim();
        if (raw.length > 200) return cleanJobText(raw);
      }
    } catch (e) {}

    throw new Error("Unable to auto-fetch due to site bot protection. Please copy and paste the job text directly below.");
  }

  function runAtsJobAnalysis() {
    const cv = getCurrentCV();
    const checks = computeAtsChecks(cv);
    const totalW = checks.reduce((a, b) => a + b.w, 0);
    const gotW = checks.reduce((a, b) => a + (b.ok ? b.w : 0), 0);
    const formatScore = Math.round((gotW / totalW) * 100);

    const jt = state.jobText.trim();
    const cvText = " " + (window.RTCV ? window.RTCV.plainText(cv) : "").toLowerCase() + " ";

    let kwScore = 100;
    let have = [];
    let miss = [];

    if (jt.length > 60) {
      const jobKws = extractJobKeywords(jt);
      have = jobKws.filter(k => hasTerm(cvText, k));
      miss = jobKws.filter(k => !hasTerm(cvText, k));
      kwScore = jobKws.length ? Math.round((have.length / jobKws.length) * 100) : 0;
    }

    const overallScore = jt.length > 60 ? Math.round(kwScore * 0.55 + formatScore * 0.45) : formatScore;

    // Update Score Rings
    const ringOverall = $("#ringOverall");
    const ringFormat = $("#ringFormat");
    const ringKeywords = $("#ringKeywords");

    if (ringOverall) {
      ringOverall.style.setProperty("--ring-pct", overallScore);
      ringOverall.style.setProperty("--ring-color", overallScore >= 80 ? "#10b981" : overallScore >= 60 ? "#f59e0b" : "#ef4444");
      ringOverall.querySelector(".cve-circular-progress-val").textContent = overallScore + "%";
    }
    if (ringFormat) {
      ringFormat.style.setProperty("--ring-pct", formatScore);
      ringFormat.style.setProperty("--ring-color", formatScore >= 80 ? "#10b981" : "#f59e0b");
      ringFormat.querySelector(".cve-circular-progress-val").textContent = formatScore + "%";
    }
    if (ringKeywords) {
      ringKeywords.style.setProperty("--ring-pct", kwScore);
      ringKeywords.style.setProperty("--ring-color", kwScore >= 75 ? "#10b981" : "#f59e0b");
      ringKeywords.querySelector(".cve-circular-progress-val").textContent = jt.length > 60 ? kwScore + "%" : "—";
    }

    // Render Keywords
    const kwContainer = $("#atsKwContainer");
    if (kwContainer) {
      if (jt.length > 60) {
        kwContainer.innerHTML = `
          <div class="cve-kw-section">
            <span class="cve-kw-title ok">✓ Matched Keywords in CV (${have.length})</span>
            <div class="cve-kws-wrap">
              ${have.map(k => `<span class="cve-kw-chip ok">${esc(k)}</span>`).join("")}
            </div>
          </div>
          <div class="cve-kw-section" style="margin-top:10px;">
            <span class="cve-kw-title miss">✕ Missing Keywords (${miss.length}) — Click to add to Skills:</span>
            <div class="cve-kws-wrap">
              ${miss.map(k => `
                <button type="button" class="cve-kw-chip miss" onclick="window.CVE.addMissingKeyword('${esc(k)}')">＋ ${esc(k)}</button>
              `).join("")}
            </div>
          </div>
        `;
      } else {
        kwContainer.innerHTML = `<p style="font-size:12.5px;color:var(--cve-text-muted);">Paste a job description or enter a link above to see keyword matching against the job's tech stack.</p>`;
      }
    }

    // Render Checklist
    const chkContainer = $("#atsChecklistContainer");
    if (chkContainer) {
      chkContainer.innerHTML = checks.map(c => `
        <div class="cve-check-item">
          <span class="cve-check-icon ${c.ok ? "ok" : "fail"}">${c.ok ? "✓" : "!"}</span>
          <div class="cve-check-text">
            <div class="cve-check-name">${esc(c.title)}</div>
            <div class="cve-check-desc">${esc(c.desc)}</div>
          </div>
        </div>
      `).join("");
    }
  }

  // --- Real-Time Collaboration (Figma-style PeerJS) ---
  function initCollab(roomId) {
    if (state.peer) return;

    // Load PeerJS dynamically
    const script = document.createElement("script");
    script.src = PEERJS_CDN;
    script.onload = () => {
      const myId = roomId ? null : "cve-" + Math.random().toString(36).substring(2, 9);
      state.peer = new window.Peer(myId, {
        debug: 1
      });

      state.peer.on("open", id => {
        state.collabRoomId = id;
        state.isCollabHost = !roomId;
        updateCollabModalUI();

        if (roomId) {
          // Join existing room
          connectToHost(roomId);
        }
      });

      // Handle incoming connections (host side)
      state.peer.on("connection", conn => {
        setupConnection(conn);
        // Send initial CV snapshot to new collaborator
        conn.on("open", () => {
          conn.send({
            type: "init_cv",
            cv: getCurrentCV(),
            hostName: state.currentUser ? state.currentUser.name : "Roee"
          });
        });
      });

      state.peer.on("error", err => {
        console.warn("PeerJS error:", err);
      });
    };
    document.head.appendChild(script);
  }

  function connectToHost(hostId) {
    if (!state.peer) return;
    const conn = state.peer.connect(hostId, { reliable: true });
    setupConnection(conn);
  }

  function setupConnection(conn) {
    state.connections.push(conn);

    conn.on("data", data => {
      if (!data) return;
      if (data.type === "init_cv" || data.type === "sync_cv") {
        // Apply remote CV changes
        if (data.cv) {
          const cv = getCurrentCV();
          Object.assign(cv, data.cv);
          Storage.saveVault();
          renderA4Sheet();
          renderSidebar();
        }
      } else if (data.type === "presence") {
        showCollaboratorPresence(conn.peer, data);
      }
    });

    conn.on("close", () => {
      state.connections = state.connections.filter(c => c !== conn);
      removeCollaboratorPresence(conn.peer);
    });

    updatePresenceCluster();
  }

  function broadcastCollabUpdate(cv) {
    state.connections.forEach(conn => {
      if (conn.open) {
        conn.send({ type: "sync_cv", cv, author: state.currentUser ? state.currentUser.name : "Roee" });
      }
    });
  }

  function broadcastPresence(fieldPath) {
    const user = state.currentUser || { name: "Roee" };
    state.connections.forEach(conn => {
      if (conn.open) {
        conn.send({
          type: "presence",
          name: user.name,
          field: fieldPath,
          color: "#a855f7"
        });
      }
    });
  }

  function showCollaboratorPresence(peerId, data) {
    state.collaborators[peerId] = data;
    updatePresenceCluster();
  }

  function removeCollaboratorPresence(peerId) {
    delete state.collaborators[peerId];
    updatePresenceCluster();
  }

  function updatePresenceCluster() {
    const cluster = $("#presenceCluster");
    if (!cluster) return;
    const count = Object.keys(state.collaborators).length;
    if (count > 0 || state.connections.length > 0) {
      cluster.innerHTML = `
        <div class="cve-presence-badge">
          <span class="cve-presence-pulse"></span>
          <span>${count + 1} live</span>
        </div>
      `;
    } else {
      cluster.innerHTML = "";
    }
  }

  function updateCollabModalUI() {
    const roomBox = $("#collabRoomLink");
    if (roomBox && state.collabRoomId) {
      const url = new URL(location.href);
      url.searchParams.set("room", state.collabRoomId);
      roomBox.textContent = url.href;
    }
  }

  // --- Public API for UI Event Handlers ---
  window.CVE = {
    init() {
      Storage.init();
      renderA4Sheet();
      renderSidebar();
      setFitZoom();

      // Check URL for room
      const params = new URLSearchParams(location.search);
      const room = params.get("room");
      if (room) {
        initCollab(room);
      }

      window.addEventListener("resize", () => {
        if (state.zoom === 1.0) setFitZoom();
      });
    },

    setTab(tab) {
      state.activeTab = tab;
      $$(".cve-sidebar-tab").forEach(t => t.classList.toggle("active", t.getAttribute("data-tab") === tab));
      renderSidebar();
    },

    setZoom(delta) {
      if (delta === "fit") {
        setFitZoom();
      } else {
        state.zoom = Math.max(0.3, Math.min(2.0, state.zoom + delta));
        applyZoom();
      }
    },

    setTemplate(tpl) {
      const cv = getCurrentCV();
      cv.template = tpl;
      saveCurrentCV(cv);
      renderA4Sheet();
      renderSidebar();
    },

    setAccent(color) {
      const cv = getCurrentCV();
      cv.accent = color;
      saveCurrentCV(cv);
      renderA4Sheet();
      renderSidebar();
    },

    setFont(font) {
      const cv = getCurrentCV();
      cv.font = font;
      saveCurrentCV(cv);
      renderA4Sheet();
      renderSidebar();
    },

    setDensity(density) {
      const cv = getCurrentCV();
      cv.density = density;
      saveCurrentCV(cv);
      renderA4Sheet();
    },

    setDirection(dir) {
      const cv = getCurrentCV();
      cv.dir = dir;
      saveCurrentCV(cv);
      renderA4Sheet();
    },

    togglePhoto(show) {
      const cv = getCurrentCV();
      cv.show_photo = show;
      saveCurrentCV(cv);
      renderA4Sheet();
    },

    switchCV(id) {
      state.activeCvId = id;
      renderA4Sheet();
      renderSidebar();
    },

    switchOwner(ownerId) {
      state.activeOwnerId = ownerId;
      const cvs = state.vault[ownerId] || {};
      state.activeCvId = Object.keys(cvs)[0] || "main";
      renderA4Sheet();
      renderSidebar();
    },

    createNewCV() {
      const name = prompt("Name this CV version:", "New Résumé");
      if (!name) return;
      const id = "cv_" + Math.random().toString(36).substring(2, 8);
      const blank = window.RTCV ? window.RTCV.blank(state.currentUser ? state.currentUser.name : "Your Name") : JSON.parse(JSON.stringify(ROEE_DEFAULT_CV));
      blank.label = name;
      if (!state.vault[state.activeOwnerId]) state.vault[state.activeOwnerId] = {};
      state.vault[state.activeOwnerId][id] = blank;
      Storage.saveVault();
      this.switchCV(id);
    },

    duplicateCV(id) {
      const src = state.vault[state.activeOwnerId][id];
      if (!src) return;
      const newId = "cv_" + Math.random().toString(36).substring(2, 8);
      const dup = JSON.parse(JSON.stringify(src));
      dup.label = (dup.label || "CV") + " (Copy)";
      state.vault[state.activeOwnerId][newId] = dup;
      Storage.saveVault();
      this.switchCV(newId);
    },

    deleteCV(id) {
      if (Object.keys(state.vault[state.activeOwnerId] || {}).length <= 1) {
        alert("You must keep at least one CV.");
        return;
      }
      if (!confirm("Are you sure you want to delete this CV?")) return;
      delete state.vault[state.activeOwnerId][id];
      Storage.saveVault();
      const next = Object.keys(state.vault[state.activeOwnerId])[0];
      this.switchCV(next);
    },

    addSection(type) {
      const cv = getCurrentCV();
      const newSec = window.RTCV ? window.RTCV.newSection(type) : { type, title: type, items: [] };
      if (!cv.main) cv.main = [];
      cv.main.push(newSec);
      saveCurrentCV(cv);
      renderA4Sheet();
      renderSidebar();
    },

    removeSection(path) {
      if (!confirm("Remove this entire section?")) return;
      const cv = getCurrentCV();
      const parts = path.split(".");
      const col = parts[0];
      const idx = parseInt(parts[1], 10);
      if (cv[col]) {
        cv[col].splice(idx, 1);
        saveCurrentCV(cv);
        renderA4Sheet();
        renderSidebar();
      }
    },

    addEntry(secPath) {
      const cv = getCurrentCV();
      const sec = getByPath(cv, secPath);
      if (!sec) return;
      if (!sec.items) sec.items = [];
      const tpl = window.RTCV && window.RTCV.SECTION_TYPES[sec.type] ? window.RTCV.SECTION_TYPES[sec.type].item : {};
      sec.items.unshift(JSON.parse(JSON.stringify(tpl)));
      saveCurrentCV(cv);
      renderA4Sheet();
      renderSidebar();
    },

    removeEntry(secPath, idx) {
      const cv = getCurrentCV();
      const sec = getByPath(cv, secPath);
      if (sec && sec.items) {
        sec.items.splice(idx, 1);
        saveCurrentCV(cv);
        renderA4Sheet();
        renderSidebar();
      }
    },

    addBullet(itemPath) {
      const cv = getCurrentCV();
      const item = getByPath(cv, itemPath);
      if (!item) return;
      if (!item.bullets) item.bullets = [];
      item.bullets.push("Accomplished [X] by implementing [Y], resulting in [Z].");
      saveCurrentCV(cv);
      renderA4Sheet();
      renderSidebar();
    },

    removeBullet(itemPath, idx) {
      const cv = getCurrentCV();
      const item = getByPath(cv, itemPath);
      if (item && item.bullets) {
        item.bullets.splice(idx, 1);
        saveCurrentCV(cv);
        renderA4Sheet();
        renderSidebar();
      }
    },

    updateSkillChips(itemPath, text) {
      const cv = getCurrentCV();
      const item = getByPath(cv, itemPath);
      if (!item) return;
      item.items = text.split(",").map(s => s.trim()).filter(Boolean);
      saveCurrentCV(cv);
      renderA4Sheet();
      renderSidebar();
    },

    addMissingKeyword(kw) {
      const cv = getCurrentCV();
      const allSecs = (cv.main || []).concat(cv.side || []);
      let skillSec = allSecs.find(s => s.type === "skills");
      if (!skillSec) {
        this.addSection("skills");
        skillSec = (cv.main || []).concat(cv.side || []).find(s => s.type === "skills");
      }
      if (skillSec && skillSec.items && skillSec.items[0]) {
        if (!skillSec.items[0].items) skillSec.items[0].items = [];
        if (!skillSec.items[0].items.includes(kw)) {
          skillSec.items[0].items.push(kw);
          saveCurrentCV(cv);
          renderA4Sheet();
          renderSidebar();
          runAtsJobAnalysis();
        }
      }
    },

    // --- Modals ---
    openAtsModal() {
      const m = $("#atsModal");
      if (m) {
        m.classList.add("open");
        runAtsJobAnalysis();
      }
    },

    async fetchJobFromUrlInput() {
      const urlInput = $("#jobUrlInput");
      const st = $("#jobFetchStatus");
      if (!urlInput || !urlInput.value.trim()) return;
      if (st) st.textContent = "Fetching job page...";
      try {
        const text = await fetchJobAdFromUrl(urlInput.value);
        state.jobText = text;
        const ta = $("#jobTextarea");
        if (ta) ta.value = text;
        if (st) st.textContent = "✓ Extracted job requirements!";
        runAtsJobAnalysis();
      } catch (e) {
        if (st) st.textContent = "⚠ " + e.message;
      }
    },

    onJobTextChange(val) {
      state.jobText = val;
      runAtsJobAnalysis();
    },

    openCollabModal() {
      const m = $("#collabModal");
      if (m) {
        m.classList.add("open");
        if (!state.peer) initCollab();
        else updateCollabModalUI();
      }
    },

    copyCollabLink() {
      const el = $("#collabRoomLink");
      if (!el) return;
      navigator.clipboard.writeText(el.textContent).then(() => {
        alert("Collaboration link copied to clipboard!");
      });
    },

    inviteViaEmail() {
      const el = $("#collabRoomLink");
      const link = el ? el.textContent : location.href;
      const user = state.currentUser ? state.currentUser.name : "Roee";
      const subject = encodeURIComponent(`${user} invited you to collaborate on a CV`);
      const body = encodeURIComponent(`Hey,\n\nI'm working on my CV on roeetal.com/CVEditor and would love your feedback and collaboration!\n\nJoin my live Figma-style session here:\n${link}\n\nSee you there!`);
      location.href = `mailto:?subject=${subject}&body=${body}`;
    },

    openEmailModal() {
      const m = $("#emailModal");
      if (m) {
        const cv = getCurrentCV();
        const plain = window.RTCV ? window.RTCV.plainText(cv) : "";
        const P = cv.person || {};
        $("#emailSubjectInput").value = `${P.name || "Roee Tal"} — Résumé / CV`;
        $("#emailBodyPreview").value = `Hi,\n\nPlease find attached the résumé of ${P.name || "Roee Tal"} (${P.title || "Game Developer"}).\n\nLive online version & portfolio: https://roeetal.com/CVEditor\n\n${plain}`;
        m.classList.add("open");
      }
    },

    sendEmailAction() {
      const to = $("#emailToInput").value.trim();
      const subject = encodeURIComponent($("#emailSubjectInput").value.trim());
      const body = encodeURIComponent($("#emailBodyPreview").value.trim());
      location.href = `mailto:${to}?subject=${subject}&body=${body}`;
      this.closeModal("emailModal");
    },

    shareViaApps() {
      const cv = getCurrentCV();
      const P = cv.person || {};
      const plain = window.RTCV ? window.RTCV.plainText(cv) : "";
      if (navigator.share) {
        navigator.share({
          title: `${P.name || "Roee Tal"} — Résumé`,
          text: `Check out my résumé (${P.title || "Game Developer"}):\n\n${plain}`,
          url: "https://roeetal.com/CVEditor"
        }).catch(() => {});
      } else {
        navigator.clipboard.writeText(plain).then(() => {
          alert("Full CV text copied to clipboard!");
        });
      }
    },

    openAuthModal() {
      const m = $("#authModal");
      if (m) m.classList.add("open");
    },

    loginSubmit() {
      const email = $("#loginEmail").value;
      const pass = $("#loginPass").value;
      const err = $("#authError");
      try {
        Storage.login(email, pass);
        if (err) err.textContent = "";
        this.closeModal("authModal");
        renderA4Sheet();
        renderSidebar();
      } catch (e) {
        if (err) err.textContent = e.message;
      }
    },

    registerSubmit() {
      const email = $("#regEmail").value;
      const name = $("#regName").value;
      const pass = $("#regPass").value;
      const err = $("#authError");
      try {
        Storage.register(email, name, pass);
        if (err) err.textContent = "";
        this.closeModal("authModal");
        renderA4Sheet();
        renderSidebar();
      } catch (e) {
        if (err) err.textContent = e.message;
      }
    },

    exportVaultJson() {
      const blob = new Blob([JSON.stringify(state.vault, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `cveditor-vault-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
    },

    printPdf() {
      window.print();
    },

    closeModal(modalId) {
      const m = document.getElementById(modalId);
      if (m) m.classList.remove("open");
    }
  };

  // Launch on load
  window.addEventListener("DOMContentLoaded", () => {
    window.CVE.init();
  });

})(window, document);
