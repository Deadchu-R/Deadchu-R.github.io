/* ==========================================================================
   CVEditor Engine - Standalone Collaborative CV Studio
   Powering roeetal.com/CVEditor
   Enhanced with Visitor Onboarding Wizard & Mandatory Email Save Gate
   ========================================================================== */

(function(window, document) {
  "use strict";

  // --- Constants & Dictionaries ---
  // Accounts here are device-only: users, passwords and résumés live in this browser (localStorage) and are never sent anywhere.
  // Passwords are stored only as PBKDF2-SHA256 hashes (random salt), never as plain text. There is no built-in admin account.
  const PW_ITER = 310000;
  const b64 = u => btoa(String.fromCharCode(...new Uint8Array(u))), unb64 = t => Uint8Array.from(atob(t), c => c.charCodeAt(0));
  const hex = u => [...new Uint8Array(u)].map(x => x.toString(16).padStart(2, "0")).join("");
  // Hash a password for this email (new random salt unless one is given).
  async function hashPass(email, pass, salt) {
    salt = salt || b64(crypto.getRandomValues(new Uint8Array(16)));
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(email.trim().toLowerCase() + "\n" + pass), "PBKDF2", false, ["deriveBits"]);
    const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: unb64(salt), iterations: PW_ITER }, key, 256);
    return { salt, hash: hex(bits) };
  }
  // The signed-in user as remembered on this device: no password or hash in it.
  const publicUser = u => ({ id: u.id, email: u.email, name: u.name, role: "friend" });
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

  const SECTION_CATALOG = [
    { type: "experience", title: "Work Experience", desc: "Jobs, roles, responsibilities and quantified accomplishments." },
    { type: "projects", title: "Selected Projects", desc: "Games, web applications, portfolio demos and tech stack." },
    { type: "education", title: "Education & Courses", desc: "Degrees, colleges, academic achievements and relevant coursework." },
    { type: "skills", title: "Skills & Technologies", desc: "Engines, programming languages, frameworks and tools." },
    { type: "languages", title: "Languages", desc: "Language proficiencies (Native, Fluent, Professional)." },
    { type: "list", title: "Certificates & Awards", desc: "Licenses, competition honors, scholarships and badges." },
    { type: "tags", title: "Interests & Hobbies", desc: "Game jams, tech passions, open source and creative pursuits." },
    { type: "text", title: "Custom Free Text", desc: "Personal pitch, publication list or custom block." }
  ];

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
    currentUser: null,       // { id, email, name, role: 'admin'|'friend' } or null for visitor
    allUsers: [],            // List of registered accounts
    vault: {},               // Keyed by user ID: { [cvId]: cvObject }
    activeCvId: "my-cv",     // ID of CV currently shown/edited
    activeOwnerId: "guest",  // Owner of the active CV
    zoom: 1.0,
    activeTab: "content",    // "content" | "design" | "vault"
    isCollabHost: false,
    collabRoomId: null,
    peer: null,
    connections: [],
    collaborators: {},
    jobText: "",
    jobUrl: "",
    pendingAction: null,     // Callback to execute after mandatory save
    wizardStep: 1,           // 1: Starting point, 2: Details & Photo, 3: Layout & Style
    wizardMode: "upload",    // "upload" | "scratch"
    wizardTemplate: "novo",  // Selected template in welcome wizard
    wizardDir: "rtl",        // Selected direction in welcome wizard
    wizardAccent: "#2a8a8f", // Selected accent color in wizard
    wizardDraft: {
      photo: "",
      show_photo: true
    },
    parsedOldCv: null,       // Structured CV extracted from old file/text
    photoPickerTarget: "activeCv" // "activeCv" | "wizard"
  };

  // Pre-seed Roee's base CV data
  const ROEE_DEFAULT_CV = {
    label: "Unity · ATS (Main)",
    template: "ats",
    layout_ratio: "50-50",
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
      try {
        const u = localStorage.getItem("cve_users");
        state.allUsers = u ? JSON.parse(u) : [];
      } catch (e) { state.allUsers = []; }

      try {
        const v = localStorage.getItem("cve_vault");
        state.vault = v ? JSON.parse(v) : {};
      } catch (e) { state.vault = {}; }

      // Default variants: ATS, Novo, Studio
      const defaultVariants = {
        "unity-ats": JSON.parse(JSON.stringify(ROEE_DEFAULT_CV)),
        "unreal-novo": Object.assign(JSON.parse(JSON.stringify(ROEE_DEFAULT_CV)), {
          label: "Unreal · Novo (Two-Column)",
          template: "novo",
          layout_ratio: "50-50",
          accent: "#7c3aed"
        }),
        "studio": Object.assign(JSON.parse(JSON.stringify(ROEE_DEFAULT_CV)), {
          label: "Game Dev · Studio (Sidebar)",
          template: "studio",
          accent: "#059669"
        })
      };

      if (!state.vault["roee"] || Object.keys(state.vault["roee"]).length === 0) {
        state.vault["roee"] = JSON.parse(JSON.stringify(defaultVariants));
      }

      // Check session
      let loggedInUser = null;
      try {
        const cur = sessionStorage.getItem("cve_cur_user") || localStorage.getItem("cve_cur_user");
        if (cur) loggedInUser = JSON.parse(cur);
        if (loggedInUser && !state.allUsers.some(x => x.id === loggedInUser.id)) loggedInUser = null;
        if (loggedInUser) {
          loggedInUser = publicUser(loggedInUser);
          localStorage.setItem("cve_cur_user", JSON.stringify(loggedInUser));
        }
      } catch (e) {}

      if (loggedInUser) {
        state.currentUser = loggedInUser;
        state.activeOwnerId = loggedInUser.id;
        const ownerCvs = state.vault[loggedInUser.id] || {};
        state.activeCvId = Object.keys(ownerCvs)[0] || "unity-ats";
      } else {
        state.currentUser = null;
        state.activeOwnerId = "guest";
        state.activeCvId = "unity-ats";

        let savedDraft = null;
        try {
          const d = localStorage.getItem("cve_draft_cv");
          if (d) savedDraft = JSON.parse(d);
        } catch (e) {}

        if (savedDraft) {
          state.vault["guest"] = { "draft": savedDraft };
          state.activeCvId = "draft";
        } else if (!state.vault["guest"] || Object.keys(state.vault["guest"]).length === 0) {
          state.vault["guest"] = JSON.parse(JSON.stringify(defaultVariants));
          state.activeCvId = "unity-ats";
        } else {
          state.activeCvId = Object.keys(state.vault["guest"])[0] || "unity-ats";
        }
      }
    },

    async loadSiteCv() {
      try {
        const paths = ["/content/cv.json", "content/cv.json", "../content/cv.json"];
        let data = null;
        for (const p of paths) {
          try {
            const r = await fetch(p);
            if (r.ok) { data = await r.json(); break; }
          } catch (_) {}
        }
        if (data && data.variants) {
          const variants = data.variants;
          const defaultKey = data.default || Object.keys(variants)[0];
          if (state.activeOwnerId === "guest" && !localStorage.getItem("cve_draft_cv")) {
            state.vault["guest"] = JSON.parse(JSON.stringify(variants));
            if (variants[defaultKey]) state.activeCvId = defaultKey;
            renderA4Sheet();
            renderSidebar();
          }
          if (!state.vault["roee"] || Object.keys(state.vault["roee"]).length <= 3) {
            state.vault["roee"] = Object.assign({}, JSON.parse(JSON.stringify(variants)), state.vault["roee"] || {});
          }
        }
      } catch (e) {
        // Embedded fallback already loaded
      }
    },

    saveUsers() {
      localStorage.setItem("cve_users", JSON.stringify(state.allUsers));
    },

    saveVault() {
      localStorage.setItem("cve_vault", JSON.stringify(state.vault));
      showSaveIndicator();
    },

    async login(email, pass) {
      email = email.trim().toLowerCase();
      let u = state.allUsers.find(x => x.email.toLowerCase() === email);
      if (!u && (email === "roeetal17@gmail.com" || email === "roee")) {
        const hashed = await hashPass(email, pass);
        u = { id: "roee", email: "roeetal17@gmail.com", name: "Roee Tal", role: "friend", salt: hashed.salt, hash: hashed.hash };
        state.allUsers.unshift(u);
        this.saveUsers();
      }
      if (!u) throw new Error("No account found with this email. Please sign up.");
      if (u.hash) {
        const h = await hashPass(email, pass, u.salt);
        if (h.hash !== u.hash) { await new Promise(r => setTimeout(r, 600)); throw new Error("Incorrect password."); }
      } else {
        if (!u.pass || u.pass !== pass) throw new Error("Incorrect password.");
        Object.assign(u, await hashPass(email, pass)); delete u.pass; this.saveUsers();
      }
      state.currentUser = publicUser(u);
      localStorage.setItem("cve_cur_user", JSON.stringify(state.currentUser));
      state.activeOwnerId = u.id;
      if (!state.vault[u.id] || Object.keys(state.vault[u.id]).length === 0) {
        state.vault[u.id] = {
          "unity-ats": JSON.parse(JSON.stringify(ROEE_DEFAULT_CV)),
          "unreal-novo": Object.assign(JSON.parse(JSON.stringify(ROEE_DEFAULT_CV)), {
            label: "Unreal · Novo (Two-Column)",
            template: "novo",
            layout_ratio: "50-50",
            accent: "#7c3aed"
          }),
          "studio": Object.assign(JSON.parse(JSON.stringify(ROEE_DEFAULT_CV)), {
            label: "Game Dev · Studio (Sidebar)",
            template: "studio",
            accent: "#059669"
          })
        };
        this.saveVault();
      }
      const ownerCvs = state.vault[u.id] || {};
      state.activeCvId = Object.keys(ownerCvs)[0] || "unity-ats";
      return u;
    },

    async register(email, name, pass) {
      email = email.trim().toLowerCase();
      if (!email || !pass) throw new Error("Please enter email and password.");
      if (pass.length < 8) throw new Error("Choose a password of at least 8 characters.");
      if (state.allUsers.some(x => x.email.toLowerCase() === email)) {
        throw new Error("An account with this email already exists. Please sign in.");
      }
      const id = "usr_" + hex(crypto.getRandomValues(new Uint8Array(8)));
      const newUser = Object.assign({ id, email, name: (name || "").trim() || email.split("@")[0], role: "friend" }, await hashPass(email, pass));
      state.allUsers.push(newUser);
      this.saveUsers();

      state.currentUser = publicUser(newUser);
      localStorage.setItem("cve_cur_user", JSON.stringify(state.currentUser));
      return state.currentUser;
    },

    logout() {
      sessionStorage.removeItem("cve_cur_user");
      localStorage.removeItem("cve_cur_user");
      state.currentUser = null;
      state.activeOwnerId = "guest";
      const guestCvs = state.vault["guest"] || {};
      state.activeCvId = Object.keys(guestCvs)[0] || "unity-ats";
      renderA4Sheet();
      renderSidebar();
    }
  };

  function getCurrentCV() {
    const owner = state.vault[state.activeOwnerId] || {};
    if (!owner[state.activeCvId]) {
      const first = Object.keys(owner)[0];
      if (first) {
        state.activeCvId = first;
        return owner[first];
      }
      const initial = JSON.parse(JSON.stringify(ROEE_DEFAULT_CV));
      owner[state.activeCvId || "unity-ats"] = initial;
      state.vault[state.activeOwnerId] = owner;
      Storage.saveVault();
      return initial;
    }
    return owner[state.activeCvId];
  }

  // --- History & Undo / Redo Manager (Ctrl+Z / Ctrl+Y) ---
  const History = {
    undoStack: [],
    redoStack: [],
    max: 50,
    push(cv) {
      if (!cv) return;
      this.undoStack.push(JSON.parse(JSON.stringify(cv)));
      if (this.undoStack.length > this.max) this.undoStack.shift();
      this.redoStack = [];
      updateUndoRedoUI();
    },
    undo() {
      if (!this.undoStack.length) return;
      const current = getCurrentCV();
      this.redoStack.push(JSON.parse(JSON.stringify(current)));
      const prev = this.undoStack.pop();
      saveCurrentCV(prev, false);
      renderA4Sheet();
      renderSidebar();
      updateUndoRedoUI();
    },
    redo() {
      if (!this.redoStack.length) return;
      const current = getCurrentCV();
      this.undoStack.push(JSON.parse(JSON.stringify(current)));
      const next = this.redoStack.pop();
      saveCurrentCV(next, false);
      renderA4Sheet();
      renderSidebar();
      updateUndoRedoUI();
    }
  };

  function updateUndoRedoUI() {
    const uBtn = $("#cveUndoBtn");
    const rBtn = $("#cveRedoBtn");
    if (uBtn) {
      uBtn.disabled = History.undoStack.length === 0;
      uBtn.title = `Undo (Ctrl+Z) - ${History.undoStack.length} actions`;
    }
    if (rBtn) {
      rBtn.disabled = History.redoStack.length === 0;
      rBtn.title = `Redo (Ctrl+Y) - ${History.redoStack.length} actions`;
    }
  }

  function saveCurrentCV(cv, recordHistory = true) {
    if (recordHistory) {
      History.push(getCurrentCV());
    }
    if (!state.vault[state.activeOwnerId]) state.vault[state.activeOwnerId] = {};
    state.vault[state.activeOwnerId][state.activeCvId] = cv;

    if (state.activeOwnerId === "guest") {
      localStorage.setItem("cve_draft_cv", JSON.stringify(cv));
    } else {
      Storage.saveVault();
    }

    broadcastCollabUpdate(cv);
    updateUndoRedoUI();
  }

  function showSaveIndicator(msg) {
    const el = $("#saveStatus");
    if (el) {
      const text = msg || (state.currentUser ? "✓ Saved to account" : "✓ Saved to browser");
      el.innerHTML = `<span>${text}</span>`;
      el.style.opacity = "1";
      setTimeout(() => {
        if (el) el.style.opacity = "0.75";
      }, 3000);
    }
  }

  // --- Auth / Action Helper ---
  function ensureAuthenticated(actionCallback) {
    if (actionCallback) actionCallback();
    return true;
  }

  // --- Site Skins Configuration (roeetal.com) ---
  const SITE_SKINS = [
    { id: "classic", name: "Classic", icon: "🏛️", desc: "Original portfolio aesthetic with crisp blue accents", accent: "#1f5fa8" },
    { id: "apple", name: "Apple Minimal", icon: "🍏", desc: "Spacious minimalist layout, glass cards, SF Pro typography", accent: "#2997ff" },
    { id: "valley", name: "Robert Valley", icon: "🎬", desc: "Cinematic contrast, golden amber accents, Bebas Neue bold titles", accent: "#ffb830" },
    { id: "avraham", name: "Avraham Cyber", icon: "🌌", desc: "Cyberpunk neon space, glowing cyan lines, Space Grotesk", accent: "#00f0ff" },
    { id: "arcade", name: "Arcade Retro", icon: "🎮", desc: "8-bit retro gaming aesthetic, Press Start 2P, pixel borders", accent: "#29e7ff" },
    { id: "hobbies", name: "Hobbies Climbing", icon: "🧗‍♂️", desc: "Outdoor climbing wall theme, earthy terracotta & forest tones", accent: "#e07a5f" },
    { id: "sketchbook", name: "Sketchbook", icon: "📓", desc: "Handcrafted paper, Caveat handwriting, pencil sketch & highlighter", accent: "#f59e0b" },
    { id: "plain", name: "Plain ATS", icon: "📄", desc: "Pure monochromatic B&W, ultra-clean ATS contrast, zero clutter", accent: "#000000" }
  ];

  function applySkin(skinName) {
    const k = skinName || "classic";
    document.documentElement.dataset.skin = k;
    const a4 = $("#a4Container");
    if (a4) a4.dataset.skin = k;
    const stage = $("#cvSheet");
    if (stage) stage.dataset.skin = k;

    const isSub = location.pathname.toLowerCase().indexOf("/cveditor/") >= 0;
    const prefix = isSub ? "../" : "";

    let skinLink = $("#cve-skin-css");
    if (k === "classic") {
      if (skinLink) skinLink.remove();
    } else {
      if (!skinLink) {
        skinLink = document.createElement("link");
        skinLink.rel = "stylesheet";
        skinLink.id = "cve-skin-css";
        document.head.appendChild(skinLink);
      }
      skinLink.href = prefix + "assets/skins/" + k + ".css?v=" + Date.now();
    }

    const skinSel = $("#cveSkinSelect");
    if (skinSel && skinSel.value !== k) {
      skinSel.value = k;
    }
  }

  // --- CV Document Backgrounds Configuration (roeetal.com Site Presets & Paper Themes) ---
  const CV_BACKGROUNDS = [
    {
      id: "white",
      name: "ATS Classic White",
      nameHe: "לבן נקי (ATS קלאסי)",
      desc: "100% clean white, maximum ATS parser compatibility",
      previewStyle: "background:#ffffff;border:1px solid #e2e8f0;",
      style: "background:#ffffff;color:var(--ink);"
    },
    {
      id: "ivory",
      name: "Warm Ivory Linen",
      nameHe: "שנהב חם / פשתן",
      desc: "Executive warm paper, elegant printed texture",
      previewStyle: "background:#faf8f5;border:1px solid #e7e2d9;",
      style: "background:#faf8f5;color:var(--ink);"
    },
    {
      id: "parchment",
      name: "Classic Parchment",
      nameHe: "קלף אלגנטי",
      desc: "Soft warm cream tone for traditional luxury",
      previewStyle: "background:#f5f2eb;border:1px solid #ded7c8;",
      style: "background:#f5f2eb;color:var(--ink);"
    },
    {
      id: "topo",
      name: "Topographic Contours (Site)",
      nameHe: "קווים טופוגרפיים (אתר ראשי)",
      desc: "Original contour waves from 3DVision & Unreal site section",
      previewStyle: "background:#ffffff url('topo.svg') center/cover;border:1px solid #cbd5e1;",
      style: "background:#ffffff url('topo.svg') repeat;background-size:600px;color:var(--ink);"
    },
    {
      id: "grid",
      name: "Blueprint Grid",
      nameHe: "גריד הנדסי (Blueprint)",
      desc: "Subtle 20px graph paper for game devs and engineers",
      previewStyle: "background:#ffffff linear-gradient(rgba(0,0,0,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.06) 1px, #ffffff 1px);background-size:12px 12px;border:1px solid #cbd5e1;",
      style: "background:#ffffff linear-gradient(rgba(0,0,0,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.04) 1px, #ffffff 1px);background-size:20px 20px;color:var(--ink);"
    },
    {
      id: "dots",
      name: "Dot Matrix",
      nameHe: "מטריצת נקודות",
      desc: "Modern subtle dot pattern for creative developers",
      previewStyle: "background:#ffffff radial-gradient(rgba(0,0,0,0.12) 1px, transparent 1px);background-size:10px 10px;border:1px solid #cbd5e1;",
      style: "background:#ffffff radial-gradient(rgba(0,0,0,0.08) 1.2px, transparent 1.2px);background-size:16px 16px;color:var(--ink);"
    },
    {
      id: "slate",
      name: "Minimal Slate",
      nameHe: "אפור סלייט מודרני",
      desc: "Soft cool gray for modern tech companies",
      previewStyle: "background:#f1f5f9;border:1px solid #cbd5e1;",
      style: "background:#f1f5f9;color:#1e293b;"
    },
    {
      id: "royal-blue",
      name: "Roee Tal Royal Navy",
      nameHe: "כחול רויאל עמוק (אתר ראשי)",
      desc: "Deep navy gradient from the roeetal.com hero section",
      previewStyle: "background:linear-gradient(165deg, #0c2f6e 0%, #1758b0 100%);border:1px solid #1e3a8a;",
      style: "background:linear-gradient(165deg, #0c2f6e 0%, #1758b0 100%);color:#f4f1ea;",
      isDark: true
    },
    {
      id: "dark-slate",
      name: "Executive Dark Mode",
      nameHe: "מצב כהה / Dark Slate",
      desc: "Deep dark slate with bright contrast for screens",
      previewStyle: "background:#0f172a;border:1px solid #334155;",
      style: "background:#0f172a;color:#f8fafc;",
      isDark: true
    },
    {
      id: "cyber",
      name: "Avraham Cyber Space",
      nameHe: "חלל סייבר (Avraham)",
      desc: "Deep dark background with subtle neon grid from Avraham skin",
      previewStyle: "background:#0b0f19 url('topo.svg') center/cover;border:1px solid #00e5ff;",
      style: "background:#0b0f19 url('topo.svg') repeat;background-size:600px;color:#f0fdfa;",
      isDark: true
    }
  ];


  const GOOGLE_FONTS_CATALOG = [
    { name: "Inter", cat: "Sans-Serif", sample: "Clean Modern Tech" },
    { name: "Rubik", cat: "Hebrew / Sans", sample: "רוביק מעוצב ונקי" },
    { name: "Assistant", cat: "Hebrew / Minimal", sample: "אסיסטנט מודרני" },
    { name: "Open Sans", cat: "Humanist Sans", sample: "Friendly & High Legibility" },
    { name: "Lato", cat: "Corporate Sans", sample: "Polished & Executive" },
    { name: "Roboto", cat: "Standard Sans", sample: "Google Industry Standard" },
    { name: "Poppins", cat: "Geometric Sans", sample: "Clean & Contemporary" },
    { name: "Montserrat", cat: "Architectural", sample: "Bold Editorial Presence" },
    { name: "Source Serif 4", cat: "Serif / Print", sample: "Traditional Editorial" },
    { name: "Merriweather", cat: "Classic Serif", sample: "Academic & Literary" },
    { name: "Space Grotesk", cat: "Tech / Cyber", sample: "Game Dev & Cyberpunk" },
    { name: "JetBrains Mono", cat: "Monospace", sample: "Code & Technical" }
  ];

  function applyDocumentTypography(cv) {
    const stage = $("#cvSheet");
    if (!stage) return;
    const doc = stage.querySelector(".cvdoc");
    if (!doc) return;

    const font = cv.font || "Inter";
    doc.style.setProperty("--cv-font", `'${font}', sans-serif`);
    doc.style.setProperty("--f", `'${font}', sans-serif`);

    if (cv.text_color) {
      doc.style.setProperty("--cv-ink", cv.text_color);
      doc.style.setProperty("--ink", cv.text_color);
    } else {
      doc.style.removeProperty("--cv-ink");
    }

    if (cv.mute_color) {
      doc.style.setProperty("--cv-mute", cv.mute_color);
      doc.style.setProperty("--mute", cv.mute_color);
    } else {
      doc.style.removeProperty("--cv-mute");
    }

    if (cv.body_size) {
      doc.style.setProperty("--cv-base-fs", cv.body_size + "px");
      doc.style.setProperty("--fs", cv.body_size + "px");
    } else {
      doc.style.removeProperty("--cv-base-fs");
    }

    if (cv.heading_size) {
      doc.style.setProperty("--cv-h2-fs", cv.heading_size + "em");
    } else {
      doc.style.removeProperty("--cv-h2-fs");
    }

    if (cv.title_size) {
      doc.style.setProperty("--cv-h3-fs", cv.title_size + "em");
    } else {
      doc.style.removeProperty("--cv-h3-fs");
    }

    if (cv.line_height) {
      doc.style.setProperty("--cv-line-height", cv.line_height);
    } else {
      doc.style.removeProperty("--cv-line-height");
    }

    if (cv.gap_scale) {
      doc.style.setProperty("--gap", cv.gap_scale);
    } else {
      doc.style.removeProperty("--gap");
    }

    // Ensure Google Font link is loaded in <head>
    const fontId = "cv-font-" + font.toLowerCase().replace(/\s+/g, "-");
    if (!$("#" + fontId)) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.id = fontId;
      link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(font)}:ital,wght@0,400;0,600;0,700;1,400&display=swap`;
      document.head.appendChild(link);
    }
  }

  function applyCvBackground(bgId, customVal) {
    const k = bgId || "white";
    const stage = $("#cvSheet");
    if (!stage) return;
    const doc = stage.querySelector(".cvdoc");
    if (!doc) return;

    doc.setAttribute("data-cv-bg", k);
    if (k === "custom-color" && customVal) {
      doc.style.background = customVal;
      doc.style.removeProperty("background-size");
    } else {
      doc.style.removeProperty("background");
    }

    const bgSel = $("#cveBgSelect");
    if (bgSel && bgSel.value !== k) {
      bgSel.value = k;
    }
  }


  // --- Real-time Rendering & Live View with NovoResume Controls ---
  function renderA4Sheet() {
    try {
      const cv = getCurrentCV();
      const stage = $("#cvSheet");
      if (!stage) {
        console.warn("[CVEditor] #cvSheet element not found on page");
        return;
      }
      if (!window.RTCV) {
        console.warn("[CVEditor] window.RTCV not ready yet, retrying in 50ms...");
        setTimeout(renderA4Sheet, 50);
        return;
      }

      applySkin(cv.skin || "classic");
      applyCvBackground(cv.background || "white", cv.custom_bg);

      const norm = window.RTCV.normalize(cv);
      stage.innerHTML = window.RTCV.render(norm, state.activeCvId, { edit: true });

      const doc = stage.querySelector(".cvdoc");
      if (doc) {
        doc.classList.add("ratio-" + (cv.layout_ratio || "50-50"));
        doc.setAttribute("data-skin", cv.skin || "classic");
      }

      let fontLink = $("#cv-dynamic-font");
      if (!fontLink) {
        fontLink = document.createElement("link");
        fontLink.rel = "stylesheet";
        fontLink.id = "cv-dynamic-font";
        document.head.appendChild(fontLink);
      }
      fontLink.href = window.RTCV.fontHref(norm);

      try { attachSectionToolbars(stage); } catch (e) { console.error("attachSectionToolbars err:", e); }
      try { attachInlineEditors(stage); } catch (e) { console.error("attachInlineEditors err:", e); }
      try { attachPhotoInteractions(stage); } catch (e) { console.error("attachPhotoInteractions err:", e); }
      try { attachMicroDraggables(stage); } catch (e) { console.error("attachMicroDraggables err:", e); }
      try { applyDocumentTypography(cv); } catch (e) { console.error("applyDocumentTypography err:", e); }
      try { applyZoom(); } catch (e) { console.error("applyZoom err:", e); }
      try { updateTopbarUI(); } catch (e) { console.error("updateTopbarUI err:", e); }
      try { updateAtsBadge(); } catch (e) { console.error("updateAtsBadge err:", e); }
      setTimeout(() => {
        try { updatePageMeter(); } catch (e) { console.error("updatePageMeter err:", e); }
        try { renderCanvasTips(stage); } catch (e) { console.error("renderCanvasTips err:", e); }
      }, 90);
    } catch (err) {
      console.error("[CVEditor] Fatal error in renderA4Sheet:", err);
    }
  }

  function clearAllDropFeedback() {
    const classes = [
      "cve-drop-target-before", "cve-drop-target-after", "cve-is-dragging", "cve-drop-zone-active",
      "cve-item-drop-before", "cve-item-drop-after", "cve-is-dragging-item",
      "cve-bullet-drop-before", "cve-bullet-drop-after", "cve-is-dragging-bullet",
      "cve-chip-drop-before", "cve-chip-drop-after", "cve-is-dragging-skill",
      "cve-contact-drop-before", "cve-contact-drop-after", "cve-is-dragging-contact"
    ];
    const selector = classes.map(c => "." + c).join(", ");
    document.querySelectorAll(selector).forEach(el => el.classList.remove(...classes));

    const modeClasses = [
      "cve-dragging-bullet-mode", "cve-dragging-skill-mode",
      "cve-dragging-contact-mode", "cve-dragging-item-mode", "cve-dragging-sec-mode"
    ];
    document.body.classList.remove(...modeClasses);
    const stage = document.querySelector("#cvSheet");
    if (stage) stage.classList.remove(...modeClasses);
    state.activeDropEl = null;
    state.currentDropEl = null;
  }

  function setActiveDropTarget(el, dropClass) {
    if (state.activeDropEl && state.activeDropEl !== el) {
      state.activeDropEl.classList.remove(
        "cve-drop-target-before", "cve-drop-target-after",
        "cve-item-drop-before", "cve-item-drop-after",
        "cve-bullet-drop-before", "cve-bullet-drop-after",
        "cve-chip-drop-before", "cve-chip-drop-after",
        "cve-contact-drop-before", "cve-contact-drop-after"
      );
    }
    state.activeDropEl = el;
    el.classList.add(dropClass);
  }


  // --- Micro Drag-and-Drop: Bullets, Skills, and Contact Info ---
  function attachMicroDraggables(stage) {
    const cv = getCurrentCV();

    // 1. Bullet Points Dragging (in Experience, Projects, Education)
    const bullets = stage.querySelectorAll("ul.cv-bul > li, .cv-inline .cv-inline-bullet");
    bullets.forEach((bulEl) => {
      bulEl.setAttribute("draggable", "true");
      bulEl.classList.add("cve-draggable-bullet");

      const grip = bulEl.querySelector(".cve-bullet-grip");

      const parentSec = bulEl.closest(".cv-sec");
      const parentItem = bulEl.closest(".cv-item");
      if (!parentSec || !parentItem) return;

      const parentCol = parentSec.closest(".cv-side, .cv-main, .cv-aside, .cv-body");
      const col = parentCol && (parentCol.classList.contains("cv-side") || parentCol.classList.contains("cv-aside")) ? "side" : "main";
      const secIdx = parseInt(parentSec.getAttribute("data-i"), 10);
      const itemIdx = parseInt(parentItem.getAttribute("data-i"), 10);

      let localBulIdx = parseInt(bulEl.getAttribute("data-i"), 10);
      if (isNaN(localBulIdx)) {
        const parentList = bulEl.parentElement;
        const siblingBullets = Array.from(parentList.querySelectorAll(":scope > li, :scope > .cv-inline-bullet"));
        localBulIdx = siblingBullets.indexOf(bulEl);
      }
      if (localBulIdx === -1 || isNaN(localBulIdx)) return;

      const startBulDrag = (e) => {
        if (document.activeElement && document.activeElement.isContentEditable && window.getSelection && window.getSelection().toString().length > 0) {
          e.preventDefault();
          return;
        }
        if (e.target.closest && e.target.closest('[contenteditable="true"]') && !e.target.closest('.cve-bullet-grip')) {
          return;
        }
        e.stopPropagation();
        state.draggingBullet = { col, secIdx, itemIdx, bulletIdx: localBulIdx };
        bulEl.classList.add("cve-is-dragging-bullet");
        stage.classList.add("cve-dragging-bullet-mode");
        document.body.classList.add("cve-dragging-bullet-mode");
        if (e.dataTransfer) {
          e.dataTransfer.effectAllowed = "move";
          e.dataTransfer.setData("text/plain", JSON.stringify({ type: "bullet", col, secIdx, itemIdx, bulletIdx: localBulIdx }));
        }
      };

      if (grip) grip.addEventListener("dragstart", startBulDrag);
      bulEl.addEventListener("dragstart", startBulDrag);

      bulEl.addEventListener("dragend", () => {
        bulEl.classList.remove("cve-is-dragging-bullet");
        stage.classList.remove("cve-dragging-bullet-mode");
        document.body.classList.remove("cve-dragging-bullet-mode");
        clearAllDropFeedback();
        state.draggingBullet = null;
        state.currentDropEl = null;
      });

      bulEl.addEventListener("dragover", (e) => {
        if (!state.draggingBullet) return;
        const d = state.draggingBullet;
        if (d.col === col && d.secIdx === secIdx && d.itemIdx === itemIdx && d.bulletIdx === localBulIdx) return;
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer) e.dataTransfer.dropEffect = "move";

        const rect = bulEl.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        const dropClass = e.clientY < midY ? "cve-bullet-drop-before" : "cve-bullet-drop-after";
        bulEl.classList.remove(e.clientY < midY ? "cve-bullet-drop-after" : "cve-bullet-drop-before");
        setActiveDropTarget(bulEl, dropClass);
      });

      bulEl.addEventListener("drop", (e) => {
        if (!state.draggingBullet) return;
        const d = state.draggingBullet;
        if (d.col === col && d.secIdx === secIdx && d.itemIdx === itemIdx && d.bulletIdx === localBulIdx) return;
        e.preventDefault();
        e.stopPropagation();

        const rect = bulEl.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        const pos = e.clientY < midY ? "before" : "after";

        clearAllDropFeedback();
        const fromCol = d.col, fromSec = d.secIdx, fromItem = d.itemIdx, fromBul = d.bulletIdx;
        state.draggingBullet = null;
        state.currentDropEl = null;

        window.CVE.moveBulletPosition(fromCol, fromSec, fromItem, fromBul, col, secIdx, itemIdx, localBulIdx, pos);
      });
    });

    // 2. Skill Chips Dragging
    const chips = stage.querySelectorAll(".cv-chips .cv-chip, .cv-inline .cv-chip");
    chips.forEach((chipEl) => {
      chipEl.setAttribute("draggable", "true");
      chipEl.classList.add("cve-draggable-skill");

      const parentSec = chipEl.closest(".cv-sec");
      const parentItem = chipEl.closest(".cv-item");
      if (!parentSec || !parentItem) return;

      const parentCol = parentSec.closest(".cv-side, .cv-main, .cv-aside, .cv-body");
      const col = parentCol && (parentCol.classList.contains("cv-side") || parentCol.classList.contains("cv-aside")) ? "side" : "main";
      const secIdx = parseInt(parentSec.getAttribute("data-i"), 10);
      const itemIdx = parseInt(parentItem.getAttribute("data-i"), 10);

      let localSkillIdx = parseInt(chipEl.getAttribute("data-i"), 10);
      if (isNaN(localSkillIdx)) {
        const parentContainer = chipEl.parentElement;
        const siblingChips = Array.from(parentContainer.querySelectorAll(":scope > .cv-chip"));
        localSkillIdx = siblingChips.indexOf(chipEl);
      }
      if (localSkillIdx === -1 || isNaN(localSkillIdx)) return;

      const startSkillDrag = (e) => {
        if (document.activeElement && document.activeElement.isContentEditable && window.getSelection && window.getSelection().toString().length > 0) {
          e.preventDefault();
          return;
        }
        if (e.target.closest && e.target.closest('.cve-chip-del-btn')) {
          return;
        }
        e.stopPropagation();
        state.draggingSkill = { col, secIdx, itemIdx, skillIdx: localSkillIdx };
        chipEl.classList.add("cve-is-dragging-skill");
        stage.classList.add("cve-dragging-skill-mode");
        document.body.classList.add("cve-dragging-skill-mode");
        if (e.dataTransfer) {
          e.dataTransfer.effectAllowed = "move";
          e.dataTransfer.setData("text/plain", JSON.stringify({ type: "skill", col, secIdx, itemIdx, skillIdx: localSkillIdx }));
        }
      };

      chipEl.addEventListener("dragstart", startSkillDrag);

      chipEl.addEventListener("dragend", () => {
        chipEl.classList.remove("cve-is-dragging-skill");
        stage.classList.remove("cve-dragging-skill-mode");
        document.body.classList.remove("cve-dragging-skill-mode");
        clearAllDropFeedback();
        state.draggingSkill = null;
        state.currentDropEl = null;
      });

      chipEl.addEventListener("dragover", (e) => {
        if (!state.draggingSkill) return;
        const d = state.draggingSkill;
        if (d.col === col && d.secIdx === secIdx && d.itemIdx === itemIdx && d.skillIdx === localSkillIdx) return;
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer) e.dataTransfer.dropEffect = "move";

        if (state.currentDropEl && state.currentDropEl !== chipEl) {
          state.currentDropEl.classList.remove("cve-chip-drop-before", "cve-chip-drop-after");
        }
        state.currentDropEl = chipEl;

        const rect = chipEl.getBoundingClientRect();
        const midX = rect.left + rect.width / 2;
        if (e.clientX < midX) {
          chipEl.classList.add("cve-chip-drop-before");
          chipEl.classList.remove("cve-chip-drop-after");
        } else {
          chipEl.classList.add("cve-chip-drop-after");
          chipEl.classList.remove("cve-chip-drop-before");
        }
      });

      chipEl.addEventListener("dragleave", (e) => {
        if (e.relatedTarget && !chipEl.contains(e.relatedTarget)) {
          chipEl.classList.remove("cve-chip-drop-before", "cve-chip-drop-after");
          if (state.currentDropEl === chipEl) state.currentDropEl = null;
        }
      });

      chipEl.addEventListener("drop", (e) => {
        if (!state.draggingSkill) return;
        const d = state.draggingSkill;
        if (d.col === col && d.secIdx === secIdx && d.itemIdx === itemIdx && d.skillIdx === localSkillIdx) return;
        e.preventDefault();
        e.stopPropagation();

        const rect = chipEl.getBoundingClientRect();
        const midX = rect.left + rect.width / 2;
        const pos = e.clientX < midX ? "before" : "after";

        clearAllDropFeedback();
        const fromCol = d.col, fromSec = d.secIdx, fromItem = d.itemIdx, fromSkill = d.skillIdx;
        state.draggingSkill = null;
        state.currentDropEl = null;

        window.CVE.moveSkillPosition(fromCol, fromSec, fromItem, fromSkill, col, secIdx, itemIdx, localSkillIdx, pos);
      });
    });

    // 3. Personal Info & Contact Items Dragging (email, phone, location, links)
    const contacts = stage.querySelectorAll(".cv-contact-item");
    contacts.forEach((conEl) => {
      conEl.setAttribute("draggable", "true");
      conEl.classList.add("cve-draggable-contact");

      const contactKey = conEl.getAttribute("data-contact") || (
        conEl.classList.contains("contact-mail") ? "email" :
        conEl.classList.contains("contact-phone") ? "phone" :
        conEl.classList.contains("contact-loc") ? "location" :
        "link:" + (conEl.getAttribute("data-i") || 0)
      );

      const startContactDrag = (e) => {
        if (document.activeElement && document.activeElement.isContentEditable && window.getSelection && window.getSelection().toString().length > 0) {
          e.preventDefault();
          return;
        }
        if (e.target.closest && e.target.closest('.cve-contact-del-btn')) {
          return;
        }
        e.stopPropagation();
        state.draggingContact = { key: contactKey };
        conEl.classList.add("cve-is-dragging-contact");
        stage.classList.add("cve-dragging-contact-mode");
        document.body.classList.add("cve-dragging-contact-mode");
        if (e.dataTransfer) {
          e.dataTransfer.effectAllowed = "move";
          e.dataTransfer.setData("text/plain", JSON.stringify({ type: "contact", key: contactKey }));
        }
      };

      conEl.addEventListener("dragstart", startContactDrag);

      conEl.addEventListener("dragend", () => {
        conEl.classList.remove("cve-is-dragging-contact");
        stage.classList.remove("cve-dragging-contact-mode");
        document.body.classList.remove("cve-dragging-contact-mode");
        clearAllDropFeedback();
        state.draggingContact = null;
        state.currentDropEl = null;
      });

      conEl.addEventListener("dragover", (e) => {
        if (!state.draggingContact) return;
        const d = state.draggingContact;
        if (d.key === contactKey) return;
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer) e.dataTransfer.dropEffect = "move";

        if (state.currentDropEl && state.currentDropEl !== conEl) {
          state.currentDropEl.classList.remove("cve-contact-drop-before", "cve-contact-drop-after");
        }
        state.currentDropEl = conEl;

        const rect = conEl.getBoundingClientRect();
        let pos = "before";
        if (rect.height > 26 && rect.width < 250) {
          pos = e.clientY < (rect.top + rect.height / 2) ? "before" : "after";
        } else {
          pos = e.clientX < (rect.left + rect.width / 2) ? "before" : "after";
        }

        if (pos === "before") {
          conEl.classList.add("cve-contact-drop-before");
          conEl.classList.remove("cve-contact-drop-after");
        } else {
          conEl.classList.add("cve-contact-drop-after");
          conEl.classList.remove("cve-contact-drop-before");
        }
      });

      conEl.addEventListener("dragleave", (e) => {
        if (e.relatedTarget && !conEl.contains(e.relatedTarget)) {
          conEl.classList.remove("cve-contact-drop-before", "cve-contact-drop-after");
          if (state.currentDropEl === conEl) state.currentDropEl = null;
        }
      });

      conEl.addEventListener("drop", (e) => {
        if (!state.draggingContact) return;
        const d = state.draggingContact;
        if (d.key === contactKey) return;
        e.preventDefault();
        e.stopPropagation();

        const rect = conEl.getBoundingClientRect();
        let pos = "before";
        if (rect.height > 26 && rect.width < 250) {
          pos = e.clientY < (rect.top + rect.height / 2) ? "before" : "after";
        } else {
          pos = e.clientX < (rect.left + rect.width / 2) ? "before" : "after";
        }

        const fromKey = d.key;
        clearAllDropFeedback();
        state.draggingContact = null;
        state.currentDropEl = null;

        window.CVE.moveContactPosition(fromKey, contactKey, pos);
      });
    });
  }

  // --- Complete ATS Rules Engine & On-Canvas '!' Tips (from site's cvLint) ---
  function cvLint(cv) {
    const P = cv.person || {};
    const out = [];
    const add = (key, selector, title, why, fixAction) => out.push({ key, selector, title, why, fixAction });

    // Contact details on top
    if (!P.email) {
      add("email", ".cv-head", "Add your email", "Recruiters and ATS need contact details on top. Missing contact info is one of the most common mistakes (Harvard career services).", {
        label: "＋ Add Email",
        action: () => { if (!cv.person) cv.person = {}; cv.person.email = "your.email@gmail.com"; saveCurrentCV(cv); renderA4Sheet(); renderSidebar(); }
      });
    }
    if (!P.phone) {
      add("phone", ".cv-head", "Add your phone number", "Contact details go at the top of the page (Harvard career services).", {
        label: "＋ Add Phone",
        action: () => { if (!cv.person) cv.person = {}; cv.person.phone = "(+972) 050-000-0000"; saveCurrentCV(cv); renderA4Sheet(); renderSidebar(); }
      });
    }
    if (!P.location) {
      add("loc", ".cv-head", "Add your city / country", "Many ATS filter candidates by location; a city or country is enough.", {
        label: "＋ Add Location",
        action: () => { if (!cv.person) cv.person = {}; cv.person.location = "Israel"; saveCurrentCV(cv); renderA4Sheet(); renderSidebar(); }
      });
    }

    // Links: LinkedIn & Portfolio
    const urls = (P.links || []).map(l => String(l.url || ""));
    if (!urls.some(u => /linkedin/i.test(u))) {
      add("li", ".cv-head", "Add your LinkedIn link", "Recruiters check LinkedIn right after the résumé (Google recruiters & Ladders).", {
        label: "＋ Add LinkedIn",
        action: () => { if (!cv.person) cv.person = {}; if (!cv.person.links) cv.person.links = []; cv.person.links.push({ label: "LinkedIn", url: "https://linkedin.com/in/" }); saveCurrentCV(cv); renderA4Sheet(); renderSidebar(); }
      });
    }
    if (!urls.some(u => /github|portfolio|itch|roeetal/i.test(u))) {
      add("gh", ".cv-head", "Add a GitHub or Portfolio link", "Google's recruiters advise technical applicants to include GitHub and list projects prominently.", {
        label: "＋ Add Portfolio/GitHub",
        action: () => { if (!cv.person) cv.person = {}; if (!cv.person.links) cv.person.links = []; cv.person.links.push({ label: "GitHub", url: "https://github.com/" }); saveCurrentCV(cv); renderA4Sheet(); renderSidebar(); }
      });
    }

    // Summary length
    const sum = String(P.summary || "");
    if (sum.length > 360) {
      add("sumlong", ".cv-summary", "Make the summary shorter", "Recruiters skim for about 7.4 seconds (Ladders eye-tracking study, 2018). 2–3 lines works best (under 320 characters).", {
        label: "✂ Trim Summary",
        action: () => { if (cv.person && cv.person.summary) { cv.person.summary = cv.person.summary.slice(0, 310) + "..."; saveCurrentCV(cv); renderA4Sheet(); renderSidebar(); } }
      });
    }

    // Section dates & strong action verbs
    const secs = (cv.main || []).concat(cv.side || []);
    secs.forEach((sec, sIdx) => {
      (sec.items || []).forEach((it, iIdx) => {
        if (["experience", "projects", "education"].includes(sec.type)) {
          if (!String(it.dates || "").trim()) {
            add(`dates-${sIdx}-${iIdx}`, `.cv-${sec.type} .cv-item[data-i="${iIdx}"]`, `Add dates for "${it.role || it.name || it.degree || 'entry'}"`, "ATS algorithms use dates to calculate total years of experience.", {
              label: "＋ Set Dates",
              action: () => { it.dates = "2023 – Present"; saveCurrentCV(cv); renderA4Sheet(); renderSidebar(); }
            });
          }
        }
        if (["experience", "projects"].includes(sec.type)) {
          (it.bullets || []).forEach((bul, bIdx) => {
            const bStr = String(bul || "").trim();
            const firstWord = (bStr.match(/^[A-Za-z]+/i) || [""])[0].toLowerCase();
            const isVerb = VERBS[firstWord] || PAST2PRES[firstWord];
            if (bStr && !isVerb && firstWord.length > 2) {
              add(`verb-${sIdx}-${iIdx}-${bIdx}`, `.cv-${sec.type} .cv-item[data-i="${iIdx}"] li[data-i="${bIdx}"]`, "Start bullet with a strong action verb", `Bullets should start with an action verb (Built, Designed, Led, Shipped, Optimized). "${firstWord}" is a weak opener (Harvard career services).`, {
                label: "⚡ Strengthen Verb",
                action: () => { it.bullets[bIdx] = "Engineered and " + bStr.charAt(0).toLowerCase() + bStr.slice(1); saveCurrentCV(cv); renderA4Sheet(); renderSidebar(); }
              });
            }
            if (bStr && !/\d+|%|\$|fps|ms|k\b/i.test(bStr) && bStr.length > 25) {
              add(`num-${sIdx}-${iIdx}-${bIdx}`, `.cv-${sec.type} .cv-item[data-i="${iIdx}"] li[data-i="${bIdx}"]`, "Quantify your achievement (X-Y-Z formula)", "Google recruiters recommend the X-Y-Z formula: 'Accomplished [X] measured by [Y] by doing [Z]'. Add numbers, %, team size, or performance metrics.", {
                label: "📊 Add Metric Example",
                action: () => { it.bullets[bIdx] = bStr + ", improving performance by 35%"; saveCurrentCV(cv); renderA4Sheet(); renderSidebar(); }
              });
            }
          });
        }
      });
    });

    if (cv.template !== "ats") {
      add("colwarn", ".cvdoc", "Consider 1-column layout for ATS", "Single-column layouts (ATS Pro) parse with 99.8% reliability. Multi-column layouts can sometimes scramble text in older ATS scanners.", {
        label: "Switch to ATS Pro",
        action: () => { cv.template = "ats"; saveCurrentCV(cv); renderA4Sheet(); renderSidebar(); }
      });
    }

    return out;
  }

  let activeTipPopup = null;

  function renderCanvasTips(stage) {
    const cv = getCurrentCV();
    const tips = cvLint(cv);

    // Remove existing badges & popups
    stage.querySelectorAll(".cve-tip-badge").forEach(b => b.remove());
    if (activeTipPopup) { activeTipPopup.remove(); activeTipPopup = null; }

    // Update topbar tip counter
    const tipCounter = $("#cveTipsCount");
    if (tipCounter) {
      tipCounter.textContent = tips.length ? `! ${tips.length}` : "✓ 0";
      tipCounter.style.background = tips.length ? "#ef4444" : "#10b981";
    }

    tips.forEach(tip => {
      const target = stage.querySelector(tip.selector);
      if (!target) return;

      const badge = document.createElement("button");
      badge.type = "button";
      badge.className = "cve-tip-badge";
      badge.innerHTML = "!";
      badge.title = tip.title;

      badge.onclick = (e) => {
        e.stopPropagation();
        openTipPopup(tip, badge);
      };

      // Position relative to target
      if (getComputedStyle(target).position === "static") {
        target.style.position = "relative";
      }
      target.appendChild(badge);
    });
  }

  function openTipPopup(tip, anchorEl) {
    if (activeTipPopup) activeTipPopup.remove();

    const popup = document.createElement("div");
    popup.className = "cve-tip-popup";
    popup.innerHTML = `
      <div class="cve-tip-popup-title">
        <span>⚠️ ${esc(tip.title)}</span>
      </div>
      <div class="cve-tip-popup-why">
        ${esc(tip.why)}
      </div>
      <div class="cve-tip-popup-actions">
        <button type="button" class="cve-btn sm" onclick="this.closest('.cve-tip-popup').remove()">Dismiss</button>
        ${tip.fixAction ? `<button type="button" class="cve-btn sm pri" id="cveFixBtn">${esc(tip.fixAction.label || "Fix Now")}</button>` : ""}
      </div>
    `;

    document.body.appendChild(popup);
    activeTipPopup = popup;

    const r = anchorEl.getBoundingClientRect();
    popup.style.top = Math.max(10, r.bottom + 8) + "px";
    popup.style.left = Math.min(window.innerWidth - 330, Math.max(10, r.left - 120)) + "px";

    const fixBtn = popup.querySelector("#cveFixBtn");
    if (fixBtn && tip.fixAction && tip.fixAction.action) {
      fixBtn.onclick = () => {
        popup.remove();
        activeTipPopup = null;
        tip.fixAction.action();
      };
    }

    const closeHandler = (e) => {
      if (!popup.contains(e.target) && e.target !== anchorEl) {
        popup.remove();
        activeTipPopup = null;
        document.removeEventListener("pointerdown", closeHandler);
      }
    };
    setTimeout(() => document.addEventListener("pointerdown", closeHandler), 50);
  }


    function attachSectionToolbars(stage) {
    const cv = getCurrentCV();
    const secs = stage.querySelectorAll(".cv-sec");

    secs.forEach(secEl => {
      const parentColEl = secEl.closest(".cv-side, .cv-main, .cv-aside, .cv-body");
      const col = parentColEl && (parentColEl.classList.contains("cv-side") || parentColEl.classList.contains("cv-aside")) ? "side" : "main";
      const idxAttr = secEl.getAttribute("data-i");
      if (idxAttr === null || isNaN(parseInt(idxAttr, 10))) return;
      const idx = parseInt(idxAttr, 10);
      const colList = cv[col] || [];
      const secData = colList[idx] || {};

      // 1. Direct full-width section drag bar (visible on section hover)
      let dragBar = secEl.querySelector(":scope > .cve-sec-drag-bar");
      if (!dragBar) {
        dragBar = document.createElement("div");
        dragBar.className = "cve-sec-drag-bar";
        dragBar.setAttribute("draggable", "true");
        dragBar.title = "⠿ לחץ וגרור כדי להזיז את הסקשן (Click & drag to reorder section)";
        const secTitle = secData.title || "Section";
        dragBar.innerHTML = `<span class="cve-strip-dots">⠿⠿</span><span class="cve-strip-title">${esc(secTitle)}</span><span class="cve-strip-hint">גרור להזזה ↕</span>`;
      }

      // Shared section drag handler
      const startSectionDrag = (e) => {
        // Don't drag section if drag started on an entry inside section
        if (e.target.closest && e.target.closest(".cv-item") && !e.target.closest(".cve-sec-drag-bar") && !e.target.closest(".cve-sec-toolbar")) {
          return;
        }
        // If user is actively highlighting text inside a focused editable field, allow text selection
        if (document.activeElement && document.activeElement.isContentEditable && window.getSelection && window.getSelection().toString().length > 0) {
          return;
        }
        e.stopPropagation();
        state.draggingSection = { col, idx };
        secEl.classList.add("cve-is-dragging");
        if (e.dataTransfer) {
          e.dataTransfer.effectAllowed = "move";
          e.dataTransfer.setData("text/plain", JSON.stringify({ col, idx, type: "section" }));
        }
      };

      dragBar.addEventListener("dragstart", startSectionDrag);
      dragBar.addEventListener("dragend", () => {
        secEl.classList.remove("cve-is-dragging");
        clearAllDropFeedback();
        state.draggingSection = null;
      });

      // 2. Direct section element dragging
      secEl.setAttribute("draggable", "true");
      secEl.classList.add("cve-draggable-sec");

      secEl.addEventListener("dragstart", startSectionDrag);

      secEl.addEventListener("dragend", () => {
        secEl.classList.remove("cve-is-dragging");
        clearAllDropFeedback();
        state.draggingSection = null;
      });

      // 3. Section h2 heading direct drag
      const h2 = secEl.querySelector(":scope > h2");
      if (h2) {
        h2.setAttribute("draggable", "true");
        h2.classList.add("cve-draggable-h2");
        h2.addEventListener("dragstart", startSectionDrag);
        h2.addEventListener("dragend", () => {
          secEl.classList.remove("cve-is-dragging");
          clearAllDropFeedback();
          state.draggingSection = null;
        });
      }

      const existingBar = secEl.querySelector(":scope > .cve-sec-toolbar");
      if (existingBar) existingBar.remove();

      const bar = document.createElement("div");
      bar.className = "cve-sec-toolbar";

      // Drag Handle button in toolbar
      const dragBtn = document.createElement("button");
      dragBtn.type = "button";
      dragBtn.className = "cve-tool-btn cve-drag-handle";
      dragBtn.innerHTML = "⠿ Drag";
      dragBtn.title = "Drag to reorder section or move across columns";
      dragBtn.setAttribute("draggable", "true");
      dragBtn.addEventListener("dragstart", startSectionDrag);
      dragBtn.addEventListener("dragend", () => {
        secEl.classList.remove("cve-is-dragging");
        clearAllDropFeedback();
        state.draggingSection = null;
      });
      bar.appendChild(dragBtn);

      const otherColLabel = col === "main" ? "Side" : "Main";
      const switchBtn = document.createElement("button");
      switchBtn.type = "button";
      switchBtn.className = "cve-tool-btn highlight";
      switchBtn.innerHTML = `⇄ ${otherColLabel} Col`;
      switchBtn.title = `Move to ${otherColLabel} Column`;
      switchBtn.onclick = (e) => {
        e.stopPropagation();
        window.CVE.moveSectionColumn(col, idx);
      };
      bar.appendChild(switchBtn);

      if (idx > 0) {
        const upBtn = document.createElement("button");
        upBtn.type = "button";
        upBtn.className = "cve-tool-btn";
        upBtn.innerHTML = "▲";
        upBtn.title = "Move Up";
        upBtn.onclick = (e) => {
          e.stopPropagation();
          window.CVE.reorderSection(col, idx, -1);
        };
        bar.appendChild(upBtn);
      }

      if (idx < colList.length - 1) {
        const downBtn = document.createElement("button");
        downBtn.type = "button";
        downBtn.className = "cve-tool-btn";
        downBtn.innerHTML = "▼";
        downBtn.title = "Move Down";
        downBtn.onclick = (e) => {
          e.stopPropagation();
          window.CVE.reorderSection(col, idx, 1);
        };
        bar.appendChild(downBtn);
      }

      const addBtn = document.createElement("button");
      addBtn.type = "button";
      addBtn.className = "cve-tool-btn";
      addBtn.innerHTML = "＋ Entry";
      addBtn.title = "Add entry to this section";
      addBtn.onclick = (e) => {
        e.stopPropagation();
        window.CVE.addEntry(`${col}.${idx}`);
      };
      bar.appendChild(addBtn);

      const delBtn = document.createElement("button");
      delBtn.type = "button";
      delBtn.className = "cve-tool-btn danger";
      delBtn.innerHTML = "🗑";
      delBtn.title = "Delete Section";
      delBtn.onclick = (e) => {
        e.stopPropagation();
        window.CVE.removeSection(`${col}.${idx}`);
      };
      bar.appendChild(delBtn);

      secEl.prepend(bar);
      secEl.prepend(dragBar);

      // Section dragover & drop listeners on canvas
      secEl.addEventListener("dragover", (e) => {
        if (!state.draggingSection) return;
        const dragging = state.draggingSection;
        if (dragging.col === col && dragging.idx === idx) return;
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer) e.dataTransfer.dropEffect = "move";

        const rect = secEl.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        const dropClass = e.clientY < midY ? "cve-drop-target-before" : "cve-drop-target-after";
        secEl.classList.remove(e.clientY < midY ? "cve-drop-target-after" : "cve-drop-target-before");
        setActiveDropTarget(secEl, dropClass);
      });

      secEl.addEventListener("drop", (e) => {
        if (!state.draggingSection) return;
        const dragging = state.draggingSection;
        if (dragging.col === col && dragging.idx === idx) return;
        e.preventDefault();
        e.stopPropagation();

        const rect = secEl.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        const pos = e.clientY < midY ? "before" : "after";

        clearAllDropFeedback();
        state.draggingSection = null;
        window.CVE.moveSectionPosition(dragging.col, dragging.idx, col, idx, pos);
      });

      // 4. Direct Entry / Item Drag-and-Drop ("וחלק ממנו עצמו")
      const items = secEl.querySelectorAll(".cv-item");
      items.forEach((itemEl, k) => {
        itemEl.setAttribute("draggable", "true");
        itemEl.classList.add("cve-draggable-item");

        let itemGrip = itemEl.querySelector(":scope > .cve-item-grip");
        if (!itemGrip) {
          itemGrip = document.createElement("div");
          itemGrip.className = "cve-item-grip";
          itemGrip.setAttribute("draggable", "true");
          itemGrip.innerHTML = "⠿";
          itemGrip.title = "גרור פריט זה לשינוי סדר (Drag entry to reorder)";
          itemEl.prepend(itemGrip);
        }

        const startItemDrag = (e) => {
          if (document.activeElement && document.activeElement.isContentEditable && window.getSelection && window.getSelection().toString().length > 0) {
            return;
          }
          e.stopPropagation();
          state.draggingItem = { col, secIdx: idx, itemIdx: k };
          itemEl.classList.add("cve-is-dragging-item");
          if (e.dataTransfer) {
            e.dataTransfer.effectAllowed = "move";
            e.dataTransfer.setData("text/plain", JSON.stringify({ col, secIdx: idx, itemIdx: k, type: "item" }));
          }
        };

        itemGrip.addEventListener("dragstart", startItemDrag);
        itemEl.addEventListener("dragstart", startItemDrag);

        itemEl.addEventListener("dragend", () => {
          itemEl.classList.remove("cve-is-dragging-item");
          clearAllDropFeedback();
          state.draggingItem = null;
        });

        itemEl.addEventListener("dragover", (e) => {
          if (!state.draggingItem) return;
          const dragging = state.draggingItem;
          if (dragging.col === col && dragging.secIdx === idx && dragging.itemIdx === k) return;
          e.preventDefault();
          e.stopPropagation();
          if (e.dataTransfer) e.dataTransfer.dropEffect = "move";

          const rect = itemEl.getBoundingClientRect();
          const midY = rect.top + rect.height / 2;
          const dropClass = e.clientY < midY ? "cve-item-drop-before" : "cve-item-drop-after";
          itemEl.classList.remove(e.clientY < midY ? "cve-item-drop-after" : "cve-item-drop-before");
          setActiveDropTarget(itemEl, dropClass);
        });

        itemEl.addEventListener("drop", (e) => {
          if (!state.draggingItem) return;
          const dragging = state.draggingItem;
          if (dragging.col === col && dragging.secIdx === idx && dragging.itemIdx === k) return;
          e.preventDefault();
          e.stopPropagation();

          const rect = itemEl.getBoundingClientRect();
          const midY = rect.top + rect.height / 2;
          const pos = e.clientY < midY ? "before" : "after";

          clearAllDropFeedback();
          const fromCol = dragging.col;
          const fromSecIdx = dragging.secIdx;
          const fromItemIdx = dragging.itemIdx;
          state.draggingItem = null;

          window.CVE.moveItemPosition(fromCol, fromSecIdx, fromItemIdx, col, idx, k, pos);
        });
      });
    });

    // Column container drop listeners
    const colContainers = stage.querySelectorAll(".cv-col, .cv-main, .cv-side, .cv-aside, .cv-body");
    colContainers.forEach(cEl => {
      const cCol = cEl.classList.contains("cv-side") || cEl.classList.contains("cv-aside") ? "side" : "main";
      cEl.addEventListener("dragover", (e) => {
        if (!state.draggingSection) return;
        if (e.target.closest && e.target.closest(".cv-sec")) return;
        e.preventDefault();
        if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
        cEl.classList.add("cve-drop-zone-active");
      });

      cEl.addEventListener("dragleave", (e) => {
        if (!cEl.contains(e.relatedTarget)) {
          cEl.classList.remove("cve-drop-zone-active");
        }
      });

      cEl.addEventListener("drop", (e) => {
        if (!state.draggingSection) return;
        if (e.target.closest && e.target.closest(".cv-sec")) return;
        e.preventDefault();
        e.stopPropagation();
        cEl.classList.remove("cve-drop-zone-active");
        const dragging = state.draggingSection;
        clearAllDropFeedback();
        state.draggingSection = null;
        window.CVE.moveSectionPosition(dragging.col, dragging.idx, cCol, (cv[cCol] || []).length, "after");
      });
    });

    // Item hover toolbars for quick actions
    const allItems = stage.querySelectorAll(".cv-item");
    allItems.forEach(itemEl => {
      const existing = itemEl.querySelector(":scope > .cve-item-toolbar");
      if (existing) existing.remove();

      const parentSec = itemEl.closest(".cv-sec");
      if (!parentSec) return;
      const parentColEl = parentSec.closest(".cv-side, .cv-main");
      const col = parentColEl && parentColEl.classList.contains("cv-side") ? "side" : "main";
      const secIdx = parseInt(parentSec.getAttribute("data-i"), 10);
      const itemIdx = parseInt(itemEl.getAttribute("data-i"), 10);
      const itemPath = `${col}.${secIdx}.items.${itemIdx}`;

      const itemBar = document.createElement("div");
      itemBar.className = "cve-item-toolbar";

      if (parentSec.classList.contains("cv-experience") || parentSec.classList.contains("cv-projects")) {
        const bulBtn = document.createElement("button");
        bulBtn.type = "button";
        bulBtn.className = "cve-tool-btn";
        bulBtn.innerHTML = "＋ Bullet";
        bulBtn.title = "Add bullet point";
        bulBtn.onclick = (e) => {
          e.stopPropagation();
          window.CVE.addBullet(itemPath);
        };
        itemBar.appendChild(bulBtn);
      }

      const delItem = document.createElement("button");
      delItem.type = "button";
      delItem.className = "cve-tool-btn danger";
      delItem.innerHTML = "✕";
      delItem.title = "Delete Entry";
      delItem.onclick = (e) => {
        e.stopPropagation();
        window.CVE.removeEntry(itemPath);
      };
      itemBar.appendChild(delItem);

      itemEl.appendChild(itemBar);
    });
  }


  function updatePageMeter() {
    const doc = $("#cvSheet .cvdoc");
    const track = $("#pageMeterTrack");
    const fill = $("#pageMeterFill");
    const text = $("#pageMeterText");
    const btn = $("#autofitBtn");
    if (!doc || !fill || !text) return;

    const z = state.zoom || 1;
    const h = doc.offsetHeight || (doc.getBoundingClientRect().height / z);
    const a4H = 1122.5;

    const pct = Math.min(250, Math.round((h / a4H) * 100));

    let breakLine = doc.querySelector(".cve-page-break-line");

    if (h <= a4H + 6) {
      fill.style.width = Math.min(100, pct) + "%";
      fill.classList.remove("warn");
      text.className = "cve-page-meter-text";
      text.textContent = `≡ƒôä 1 Page (${pct}% full)`;
      if (btn) btn.style.display = "none";
      if (breakLine) breakLine.remove();
    } else {
      fill.style.width = "100%";
      fill.classList.add("warn");
      text.className = "cve-page-meter-text warn";
      text.textContent = `ΓÜá∩╕Å 2 Pages (${pct}% - Overfull)`;
      if (btn) btn.style.display = "inline-flex";

      if (!breakLine) {
        breakLine = document.createElement("div");
        breakLine.className = "cve-page-break-line";
        breakLine.innerHTML = `<span class="cve-page-break-label">Page 1 End (297mm)</span>`;
        doc.appendChild(breakLine);
      }
    }
  }


  // --- Photo Upload & Processing Service ---
  function initPhotoFileInput() {
    let fi = $("#cvePhotoFileInput");
    if (!fi) {
      fi = document.createElement("input");
      fi.type = "file";
      fi.id = "cvePhotoFileInput";
      fi.accept = "image/png,image/jpeg,image/webp,image/gif";
      fi.style.display = "none";
      document.body.appendChild(fi);
    }
    fi.onchange = (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      processUploadedImage(file, (dataUrl) => {
        if (state.photoPickerTarget === "wizard") {
          state.wizardDraft.photo = dataUrl;
          state.wizardDraft.show_photo = true;
          updateWizardPhotoUI();
        } else {
          const cv = getCurrentCV();
          cv.photo = dataUrl;
          cv.show_photo = true;
          saveCurrentCV(cv);
          renderA4Sheet();
          renderSidebar();
        }
      });
      fi.value = "";
    };
  }

  function processUploadedImage(file, callback) {
    if (!file || !file.type.startsWith("image/")) {
      alert("╫É╫á╫É ╫æ╫ù╫¿ ╫º╫ò╫æ╫Ñ ╫¬╫₧╫ò╫á╫ö ╫¬╫º╫Ö╫ƒ (PNG, JPG, WebP).");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 500;
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.88);
        callback(dataUrl);
      };
      img.onerror = () => {
        alert("╫⌐╫Æ╫Ö╫É╫ö ╫æ╫ÿ╫ó╫Ö╫á╫¬ ╫º╫ò╫æ╫Ñ ╫ö╫¬╫₧╫ò╫á╫ö.");
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  function attachPhotoInteractions(stage) {
    const photoEls = stage.querySelectorAll(".cv-photo, .cv-photo-add, [data-m$='.photo']");
    photoEls.forEach(el => {
      el.style.cursor = "pointer";
      el.title = "≡ƒô╖ ╫£╫ù╫Ñ ╫¢╫É╫ƒ ╫£╫ö╫ó╫£╫É╫¬ ╫¬╫₧╫ò╫á╫¬ ╫ñ╫¿╫ò╫ñ╫Ö╫£ / Change Photo";
      el.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        window.CVE.openPhotoPicker("activeCv");
      };
    });
  }

  function updateWizardPhotoUI() {
    const avatar = $("#wizPhotoAvatar");
    const removeBtn = $("#wizRemovePhotoBtn");
    const cb = $("#wizShowPhotoCb");
    if (avatar) {
      avatar.src = state.wizardDraft.photo || "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 24 24' fill='%2364748b'><circle cx='12' cy='8' r='4'/><path d='M4 20c0-4 4-6 8-6s8 2 8 6'/></svg>";
    }
    if (removeBtn) {
      removeBtn.style.display = state.wizardDraft.photo ? "inline-flex" : "none";
    }
    if (cb) {
      cb.checked = !!state.wizardDraft.show_photo;
    }
  }

  // --- Intelligent Old CV Extraction & Parser ---
  async function extractPdfText(file) {
    if (!window.pdfjsLib) {
      await new Promise((resolve, reject) => {
        const s = document.createElement("script");
        s.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
        s.onload = resolve;
        s.onerror = () => reject(new Error("╫£╫É ╫á╫Ö╫¬╫ƒ ╫£╫ÿ╫ó╫ò╫ƒ ╫É╫¬ ╫₧╫ñ╫ó╫á╫ù ╫ö-PDF ╫₧╫ö╫¿╫⌐╫¬. ╫á╫í╫ö ╫£╫ö╫ô╫æ╫Ö╫º ╫É╫¬ ╫ö╫ÿ╫º╫í╫ÿ."));
        document.head.appendChild(s);
      });
    }
    if (window.pdfjsLib && window.pdfjsLib.GlobalWorkerOptions) {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
    }
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let text = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      let lastY = null;
      for (const item of content.items) {
        if (lastY !== null && Math.abs(item.transform[5] - lastY) > 5) {
          text += "\n";
        } else if (text && !text.endsWith(" ")) {
          text += " ";
        }
        text += item.str;
        lastY = item.transform[5];
      }
      text += "\n\n";
    }
    return text;
  }

  function parseCvText(rawText) {
    if (!rawText || typeof rawText !== "string") return null;

    const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (!lines.length) return null;

    // Detect language / direction
    const hebrewChars = (rawText.match(/[\u0590-\u05FF]/g) || []).length;
    const isHebrew = hebrewChars > 25 || (hebrewChars / rawText.length > 0.1);
    const dir = isHebrew ? "rtl" : "ltr";
    const lang = isHebrew ? "he" : "en";

    const person = {
      name: "",
      title: "",
      summary: "",
      email: "",
      phone: "",
      location: "",
      links: []
    };

    // 1. Email extraction
    const emailMatch = rawText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    if (emailMatch) person.email = emailMatch[0];

    // 2. Phone extraction
    const phoneMatch = rawText.match(/(?:(?:\+972|00972)[\s-]?)?(?:0\d{1,2}|\d{2,3})[\s-]?\d{3}[\s-]?\d{4}|\b\d{3}[-.\s]\d{3}[-.\s]\d{4}\b/);
    if (phoneMatch) person.phone = phoneMatch[0];

    // 3. Links extraction
    const urlMatches = rawText.match(/(?:https?:\/\/)?(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{2,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g) || [];
    urlMatches.forEach(u => {
      if (u.includes("@")) return;
      const fullUrl = u.startsWith("http") ? u : "https://" + u;
      let label = "Website";
      if (u.includes("linkedin.com")) label = "LinkedIn";
      else if (u.includes("github.com")) label = "GitHub";
      else if (u.includes("portfolio") || u.includes("artstation")) label = "Portfolio";

      if (!person.links.some(l => l.url === fullUrl)) {
        person.links.push({ label, url: fullUrl });
      }
    });

    // 4. Name & Title
    for (let i = 0; i < Math.min(4, lines.length); i++) {
      const l = lines[i];
      if (l.includes("@") || l.includes("http") || l.length > 50 || /^\d/.test(l)) continue;
      if (!person.name) {
        person.name = l.replace(/[|ΓÇóΓÇôΓÇö].*$/, "").trim();
        continue;
      }
      if (!person.title && l.length < 60 && !l.toLowerCase().includes("resume") && !l.toLowerCase().includes("cv")) {
        person.title = l;
        break;
      }
    }
    if (!person.name) person.name = isHebrew ? "╫⌐╫¥ ╫₧╫£╫É" : "Your Name";

    // 5. Section segmentation
    const SEC_PATTERNS = [
      { key: "experience", rx: /^(?:work\s+)?experience|employment|work\s+history|career|professional\s+experience|╫á╫Ö╫í╫Ö╫ò╫ƒ\s+(?:╫¬╫ó╫í╫ò╫º╫¬╫Ö|╫₧╫º╫ª╫ò╫ó╫Ö)|╫á╫Ö╫í╫Ö╫ò╫ƒ/i },
      { key: "education", rx: /^education|academic|studies|academic\s+background|degrees|╫ö╫⌐╫¢╫£╫ö|╫£╫Ö╫₧╫ò╫ô╫Ö╫¥|╫¬╫É╫¿╫Ö╫¥/i },
      { key: "skills", rx: /^skills|technical\s+skills|technologies|tools|competencies|core\s+competencies|╫¢╫Ö╫⌐╫ò╫¿╫Ö╫¥|╫₧╫Ö╫ò╫₧╫á╫ò╫Ö╫ò╫¬|╫ÿ╫¢╫á╫ò╫£╫ò╫Æ╫Ö╫ò╫¬|╫¢╫£╫Ö╫¥/i },
      { key: "summary", rx: /^summary|professional\s+summary|profile|about\s+me|objective|about|╫¬╫₧╫ª╫Ö╫¬|╫É╫ò╫ô╫ò╫¬|╫ñ╫¿╫ò╫ñ╫Ö╫£\s+╫É╫Ö╫⌐╫Ö/i },
      { key: "projects", rx: /^projects|key\s+projects|portfolio|╫ñ╫¿╫ò╫Ö╫º╫ÿ╫Ö╫¥/i },
      { key: "languages", rx: /^languages|╫⌐╫ñ╫ò╫¬/i }
    ];

    const sections = [];
    let curSec = { key: "header", lines: [] };

    lines.forEach(line => {
      const cleanLine = line.replace(/[:_=-]+$/, "").trim();
      if (cleanLine.length < 40) {
        const match = SEC_PATTERNS.find(p => p.rx.test(cleanLine));
        if (match) {
          if (curSec.lines.length) sections.push(curSec);
          curSec = { key: match.key, title: cleanLine, lines: [] };
          return;
        }
      }
      curSec.lines.push(line);
    });
    if (curSec.lines.length) sections.push(curSec);

    // Parse Experience
    const expSec = sections.find(s => s.key === "experience");
    const parsedExpItems = [];
    if (expSec) {
      let curItem = null;
      expSec.lines.forEach(l => {
        const isBullet = /^[ΓÇó\-\*Γû¬ΓÇô]\s*/.test(l);
        const hasDate = /\b(20\d\d|19\d\d)\b|\b(present|current|╫¢╫Ö╫ò╫¥|╫ö╫Ö╫ò╫¥)\b/i.test(l);

        if (!isBullet && (hasDate || curItem === null || curItem.bullets.length > 0)) {
          if (curItem) parsedExpItems.push(curItem);
          let dates = "";
          const dateMatch = l.match(/\b(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s*)?(?:19|20)\d\d\s*(?:ΓÇô|-|to|╫ó╫ô)\s*(?:(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s*)?(?:19|20)\d\d|Present|Current|╫¢╫Ö╫ò╫¥|╫ö╫Ö╫ò╫¥)/i);
          if (dateMatch) {
            dates = dateMatch[0];
            l = l.replace(dates, "").trim();
          }
          const parts = l.split(/[-ΓÇô|,\sat\s]+/).filter(Boolean);
          const role = parts[0] ? parts[0].trim() : (isHebrew ? "╫¬╫ñ╫º╫Ö╫ô" : "Job Title");
          const org = parts[1] ? parts.slice(1).join(" ").trim() : (isHebrew ? "╫ù╫æ╫¿╫ö" : "Company");

          curItem = {
            role,
            org,
            dates: dates || "2021 ΓÇô Present",
            location: "",
            about: "",
            label: "",
            bullets: []
          };
        } else if (curItem) {
          const cleanBullet = l.replace(/^[ΓÇó\-\*Γû¬ΓÇô]\s*/, "").trim();
          if (cleanBullet) curItem.bullets.push(cleanBullet);
        }
      });
      if (curItem) parsedExpItems.push(curItem);
    }

    // Parse Education
    const eduSec = sections.find(s => s.key === "education");
    const parsedEduItems = [];
    if (eduSec) {
      let curItem = null;
      eduSec.lines.forEach(l => {
        const isBullet = /^[ΓÇó\-\*Γû¬ΓÇô]\s*/.test(l);
        const hasDate = /\b(20\d\d|19\d\d)\b/.test(l);
        if (!isBullet && (hasDate || curItem === null)) {
          if (curItem) parsedEduItems.push(curItem);
          let dates = "";
          const dMatch = l.match(/(?:19|20)\d\d\s*(?:ΓÇô|-|to|╫ó╫ô)\s*(?:(?:19|20)\d\d|Present|╫¢╫Ö╫ò╫¥)/i) || l.match(/(?:19|20)\d\d/);
          if (dMatch) {
            dates = dMatch[0];
            l = l.replace(dates, "").trim();
          }
          const parts = l.split(/[-ΓÇô|,]+/).filter(Boolean);
          const degree = parts[0] ? parts[0].trim() : (isHebrew ? "╫¬╫ò╫É╫¿ / ╫¬╫ó╫ò╫ô╫ö" : "Degree / Program");
          const school = parts[1] ? parts.slice(1).join(" ").trim() : (isHebrew ? "╫₧╫ò╫í╫ô ╫É╫º╫ô╫₧╫Ö" : "School");
          curItem = {
            degree,
            school,
            dates: dates || "2018 ΓÇô 2021",
            location: "",
            about: "",
            label: "Courses",
            bullets: []
          };
        } else if (curItem) {
          const cleanBullet = l.replace(/^[ΓÇó\-\*Γû¬ΓÇô]\s*/, "").trim();
          if (cleanBullet) curItem.bullets.push(cleanBullet);
        }
      });
      if (curItem) parsedEduItems.push(curItem);
    }

    // Parse Skills
    const skillSec = sections.find(s => s.key === "skills");
    const parsedSkills = [];
    if (skillSec) {
      skillSec.lines.forEach(l => {
        const tokens = l.split(/[,|ΓÇó;/\n]+/).map(t => t.replace(/^[ΓÇó\-\*Γû¬ΓÇô]\s*/, "").trim()).filter(t => t.length > 1 && t.length < 35);
        tokens.forEach(tok => {
          if (!parsedSkills.includes(tok)) parsedSkills.push(tok);
        });
      });
    }

    // Parse Summary
    const sumSec = sections.find(s => s.key === "summary");
    if (sumSec && sumSec.lines.length) {
      person.summary = sumSec.lines.join(" ");
    }

    const main = [];
    const side = [];

    if (parsedExpItems.length) {
      main.push({
        type: "experience",
        title: isHebrew ? "╫á╫Ö╫í╫Ö╫ò╫ƒ ╫₧╫º╫ª╫ò╫ó╫Ö" : "Work Experience",
        items: parsedExpItems
      });
    } else {
      main.push(window.RTCV ? window.RTCV.newSection("experience") : {
        type: "experience",
        title: isHebrew ? "╫á╫Ö╫í╫Ö╫ò╫ƒ ╫₧╫º╫ª╫ò╫ó╫Ö" : "Work Experience",
        items: [{ role: isHebrew ? "╫¬╫ñ╫º╫Ö╫ô" : "Software Engineer", org: isHebrew ? "╫ù╫æ╫¿╫ö" : "Tech Corp", dates: "2021 ΓÇô Present", bullets: [isHebrew ? "╫ñ╫Ö╫¬╫ò╫ù ╫₧╫ó╫¿╫¢╫ò╫¬ ╫£╫Ö╫æ╫ö ╫ò╫⌐╫Ö╫ñ╫ò╫¿ ╫æ╫Ö╫ª╫ò╫ó╫Ö╫¥." : "Architected high-scale features."] }]
      });
    }

    if (parsedEduItems.length) {
      main.push({
        type: "education",
        title: isHebrew ? "╫ö╫⌐╫¢╫£╫ö" : "Education",
        items: parsedEduItems
      });
    } else {
      main.push(window.RTCV ? window.RTCV.newSection("education") : {
        type: "education",
        title: isHebrew ? "╫ö╫⌐╫¢╫£╫ö" : "Education",
        items: [{ degree: isHebrew ? "╫¬╫ò╫É╫¿ ╫¿╫É╫⌐╫ò╫ƒ ╫æ╫₧╫ô╫ó╫Ö ╫ö╫₧╫ù╫⌐╫æ" : "B.Sc. in Computer Science", school: isHebrew ? "╫É╫ò╫á╫Ö╫æ╫¿╫í╫Ö╫ÿ╫ö" : "University", dates: "2017 ΓÇô 2020", bullets: [] }]
      });
    }

    if (parsedSkills.length) {
      side.push({
        type: "skills",
        title: isHebrew ? "╫₧╫Ö╫ò╫₧╫á╫ò╫Ö╫ò╫¬ ╫ò╫¢╫£╫Ö╫¥" : "Skills",
        items: [{ label: isHebrew ? "╫ÿ╫¢╫á╫ò╫£╫ò╫Æ╫Ö╫ò╫¬ ╫ó╫Ö╫º╫¿╫Ö╫ò╫¬" : "Core Skills", items: parsedSkills }]
      });
    } else {
      side.push(window.RTCV ? window.RTCV.newSection("skills") : {
        type: "skills",
        title: isHebrew ? "╫₧╫Ö╫ò╫₧╫á╫ò╫Ö╫ò╫¬ ╫ò╫¢╫£╫Ö╫¥" : "Skills",
        items: [{ label: "", items: ["JavaScript", "Python", "React", "Git"] }]
      });
    }

    return {
      label: `${person.name} - R├â┬⌐sum├â┬⌐`,
      template: "novo",
      accent: "#2a8a8f",
      font: isHebrew ? "Rubik" : "Inter",
      density: "normal",
      show_photo: true,
      photo: "",
      dir,
      lang,
      person,
      main,
      side,
      _extractedCount: {
        experiences: parsedExpItems.length,
        education: parsedEduItems.length,
        skills: parsedSkills.length
      }
    };
  }


  function attachInlineEditors(stage) {
    const editables = stage.querySelectorAll("[data-e]");
    editables.forEach(el => {
      el.setAttribute("contenteditable", "true");
      el.setAttribute("spellcheck", "false");

      el.addEventListener("input", () => {
        const path = el.getAttribute("data-e");
        if (!path) return;
        const cleanPath = path.replace(/^[^:]+:variants\.[^.]+\./, "");
        const val = el.innerText.trim();

        const cv = getCurrentCV();
        setByPath(cv, cleanPath, val);
        saveCurrentCV(cv);

        syncSidebarField(cleanPath, val);
        updateAtsBadge();
        updatePageMeter();
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
    const sheetW = 794;
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
    } else if (tab === "ats") {
      renderAtsTab(body);
    } else if (tab === "vault") {
      renderVaultTab(body);
    }
  }

  function renderContentTab(body) {
    const cv = getCurrentCV();
    const P = cv.person || {};

    const isPersonCollapsed = state.collapsedSections && state.collapsedSections["person"];
    const personSubtitle = [P.name, P.title].filter(Boolean).join(" · ");

    let html = `
      <div style="display:flex;gap:8px;margin-bottom:4px;">
        <button type="button" class="cve-btn layout-btn" style="flex:1;justify-content:center;" onclick="window.CVE.openLayoutModal()">
          <span>📐 Layout & Sections</span>
        </button>
        <button type="button" class="cve-btn pri" style="flex:1;justify-content:center;" onclick="window.CVE.openAddSectionModal()">
          <span>＋ Add Section</span>
        </button>
      </div>

      <div class="cve-section-card ${isPersonCollapsed ? "collapsed" : ""}">
        <div class="cve-section-header" onclick="window.CVE.toggleSectionCard('person')" title="Click to ${isPersonCollapsed ? "expand" : "collapse"} section">
          <div style="display:flex;align-items:center;gap:7px;flex:1;min-width:0;">
            <span class="cve-accordion-arrow">${isPersonCollapsed ? "►" : "▼"}</span>
            <span style="font-size:14px;line-height:1;">👤</span>
            <span class="cve-section-title" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:700;font-size:13px;color:#fff;">Personal Details</span>
            ${isPersonCollapsed && personSubtitle ? `<span style="font-size:11px;color:var(--cve-text-muted);font-weight:normal;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:160px;">(${esc(personSubtitle)})</span>` : ""}
          </div>
        </div>
        <div class="cve-section-body">
          <div class="cve-sidebar-photo-row">
            <img src="${cv.photo || "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='52' height='52' viewBox='0 0 24 24' fill='%2364748b'><circle cx='12' cy='8' r='4'/><path d='M4 20c0-4 4-6 8-6s8 2 8 6'/></svg>"}" class="cve-sidebar-avatar" alt="Photo">
            <div style="display:flex;flex-direction:column;gap:6px;flex:1;">
              <div style="display:flex;gap:6px;flex-wrap:wrap;">
                <button type="button" class="cve-btn pri" style="padding:4px 10px;font-size:12px;" onclick="window.CVE.openPhotoPicker('activeCv')">📷 Upload Photo</button>
                ${cv.photo ? `<button type="button" class="cve-btn" style="padding:4px 8px;font-size:12px;" onclick="window.CVE.removeCurrentPhoto()">Remove</button>` : ""}
              </div>
              <label style="display:inline-flex;align-items:center;gap:6px;font-size:12px;color:var(--cve-text-muted);cursor:pointer;">
                <input type="checkbox" ${cv.show_photo ? "checked" : ""} onchange="window.CVE.togglePhoto(this.checked)"> Show photo on CV
              </label>
            </div>
          </div>
          <div class="cve-row-2">
            <div class="cve-form-group">
              <label class="cve-label">Full Name</label>
              <input type="text" class="cve-input" data-bind="person.name" value="${esc(P.name || "")}" placeholder="Your Name">
            </div>
            <div class="cve-form-group">
              <label class="cve-label">Professional Title</label>
              <input type="text" class="cve-input" data-bind="person.title" value="${esc(P.title || "")}" placeholder="Software Engineer / Game Dev">
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
        <div class="cve-section-resizer" title="גרור למעלה/למטה למתיחה ושינוי גודל החלון (Drag to resize height)">
          <div class="cve-section-resizer-line"></div>
        </div>
      </div>
    `;

    const allSections = (cv.main || []).concat(cv.side || []);
    allSections.forEach((sec, sIdx) => {
      const isSide = sIdx >= (cv.main || []).length;
      const col = isSide ? "side" : "main";
      const colIdx = isSide ? sIdx - (cv.main || []).length : sIdx;
      const colList = cv[col] || [];
      const basePath = `${col}.${colIdx}`;

      const isCollapsed = state.collapsedSections && state.collapsedSections[basePath];
      const items = sec.items || [];
      const itemCount = items.length;

      const typeIcons = {
        experience: "💼",
        projects: "🚀",
        education: "🎓",
        skills: "⚡",
        tags: "🏷️",
        languages: "🌐",
        custom: "📄"
      };
      const icon = typeIcons[sec.type] || "📄";

      let previewText = "";
      if (items.length > 0) {
        if (sec.type === "experience") {
          previewText = items.map(it => it.role || it.org).filter(Boolean).slice(0, 2).join(", ");
        } else if (sec.type === "projects") {
          previewText = items.map(it => it.name).filter(Boolean).slice(0, 2).join(", ");
        } else if (sec.type === "education") {
          previewText = items.map(it => it.degree || it.school).filter(Boolean).slice(0, 2).join(", ");
        } else if (sec.type === "skills" || sec.type === "tags") {
          previewText = (items[0] && items[0].items ? items[0].items.slice(0, 4).join(", ") : "");
        } else if (sec.type === "languages") {
          previewText = items.map(it => it.name).filter(Boolean).join(", ");
        }
      }

      html += `
        <div class="cve-section-card ${isCollapsed ? "collapsed" : ""}" data-col="${col}" data-idx="${colIdx}">
          <div class="cve-section-header" onclick="window.CVE.toggleSectionCard('${basePath}')" title="Click to ${isCollapsed ? "expand" : "collapse"} section">
            <div style="display:flex;align-items:center;gap:7px;flex:1;min-width:0;">
              <span class="cve-accordion-arrow">${isCollapsed ? "►" : "▼"}</span>
              <span class="cve-drag-handle" title="Drag to reorder section" draggable="true" onclick="event.stopPropagation()">⠿</span>
              <span style="font-size:14px;line-height:1;">${icon}</span>
              <span class="cve-section-title" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:700;font-size:13px;color:#fff;">
                ${esc(sec.title || sec.type)}
              </span>
              ${isCollapsed && previewText ? `<span style="font-size:11px;color:var(--cve-text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:140px;font-weight:normal;">(${esc(previewText)})</span>` : ""}
              <span style="font-size:10px;color:var(--cve-text-muted);background:rgba(255,255,255,0.08);padding:1px 6px;border-radius:9999px;flex-shrink:0;">${itemCount} ${itemCount === 1 ? "item" : "items"}</span>
            </div>
            <div class="cve-section-actions" onclick="event.stopPropagation()">
              <button type="button" class="cve-icon-btn-sm" onclick="window.CVE.moveSectionColumn('${col}', ${colIdx})" title="Move to other column">⇄</button>
              ${colIdx > 0 ? `<button type="button" class="cve-icon-btn-sm" onclick="window.CVE.reorderSection('${col}', ${colIdx}, -1)" title="Move Up">▲</button>` : ""}
              ${colIdx < (colList.length - 1) ? `<button type="button" class="cve-icon-btn-sm" onclick="window.CVE.reorderSection('${col}', ${colIdx}, 1)" title="Move Down">▼</button>` : ""}
              <button type="button" class="cve-icon-btn-sm" onclick="window.CVE.addEntry('${basePath}')" title="Add Item">＋</button>
              <button type="button" class="cve-icon-btn-sm danger" onclick="window.CVE.removeSection('${basePath}')" title="Delete Section">🗑️</button>
            </div>
          </div>
          <div class="cve-section-body">
            <div class="cve-form-group">
              <label class="cve-label">Section Title</label>
              <input type="text" class="cve-input" data-bind="${basePath}.title" value="${esc(sec.title || "")}">
            </div>
      `;

      (sec.items || []).forEach((item, iIdx) => {
        const itemPath = `${basePath}.items.${iIdx}`;
        const itemTitle = item.role || item.name || item.degree || item.label || `Entry ${iIdx + 1}`;

        html += `
          <div class="cve-sidebar-entry-card" style="background:rgba(0,0,0,0.22);padding:10px;border-radius:6px;border:1px solid rgba(255,255,255,0.06);display:flex;flex-direction:column;gap:8px;position:relative;">
            <div style="display:flex;align-items:center;justify-content:space-between;padding-bottom:6px;border-bottom:1px solid rgba(255,255,255,0.06);margin-bottom:2px;">
              <div style="display:flex;align-items:center;gap:6px;font-size:11.5px;font-weight:600;color:var(--cve-text);min-width:0;flex:1;">
                <span style="font-size:10px;color:var(--cve-text-muted);background:rgba(255,255,255,0.08);padding:1px 5px;border-radius:3px;">#${iIdx + 1}</span>
                <span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--cve-text);max-width:180px;">${esc(itemTitle)}</span>
              </div>
              <div style="display:flex;align-items:center;gap:3px;flex-shrink:0;">
                <button type="button" class="cve-icon-btn-sm" ${iIdx === 0 ? "disabled style='opacity:0.3;cursor:not-allowed;'" : ""} onclick="window.CVE.reorderEntry('${basePath}', ${iIdx}, -1)" title="Move Entry Up">▲</button>
                <button type="button" class="cve-icon-btn-sm" ${iIdx >= sec.items.length - 1 ? "disabled style='opacity:0.3;cursor:not-allowed;'" : ""} onclick="window.CVE.reorderEntry('${basePath}', ${iIdx}, 1)" title="Move Entry Down">▼</button>
                <button type="button" class="cve-icon-btn-sm danger" onclick="window.CVE.removeEntry('${basePath}', ${iIdx})" title="Delete Entry">🗑️</button>
              </div>
            </div>
        `;

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
                <div class="cve-sidebar-bullet-row" style="display:flex;gap:6px;align-items:flex-start;margin-bottom:6px;">
                  <span style="font-size:10px;font-weight:bold;color:var(--cve-text-muted);margin-top:7px;min-width:18px;">•${bIdx + 1}</span>
                  <textarea rows="2" class="cve-bullet-input" style="flex:1;" data-bind="${itemPath}.bullets.${bIdx}" placeholder="Accomplished [X] by implementing [Y]...">${esc(b)}</textarea>
                  <div style="display:flex;flex-direction:column;gap:2px;">
                    <button type="button" class="cve-icon-btn-sm" style="height:20px;width:22px;padding:0;font-size:9px;" ${bIdx === 0 ? "disabled style='opacity:0.3;cursor:not-allowed;'" : ""} onclick="window.CVE.reorderBullet('${itemPath}', ${bIdx}, -1)" title="Move Bullet Up">▲</button>
                    <button type="button" class="cve-icon-btn-sm" style="height:20px;width:22px;padding:0;font-size:9px;" ${bIdx >= (item.bullets || []).length - 1 ? "disabled style='opacity:0.3;cursor:not-allowed;'" : ""} onclick="window.CVE.reorderBullet('${itemPath}', ${bIdx}, 1)" title="Move Bullet Down">▼</button>
                    <button type="button" class="cve-icon-btn-sm danger" style="height:20px;width:22px;padding:0;font-size:9px;" onclick="window.CVE.removeBullet('${itemPath}', ${bIdx})" title="Delete Bullet">✕</button>
                  </div>
                </div>
              `).join("")}
              <button type="button" class="cve-btn" style="margin-top:4px;" onclick="window.CVE.addBullet('${itemPath}')">＋ Add Bullet</button>
            </div>
          `;
        } else if (sec.type === "projects") {
          html += `
            <div class="cve-row-2">
              <input type="text" class="cve-input" data-bind="${itemPath}.name" value="${esc(item.name || "")}" placeholder="Project Name">
              <input type="text" class="cve-input" data-bind="${itemPath}.meta" value="${esc(item.meta || "")}" placeholder="Role · Tech">
            </div>
            <div class="cve-row-2">
              <input type="text" class="cve-input" data-bind="${itemPath}.dates" value="${esc(item.dates || "")}" placeholder="Year">
              <input type="url" class="cve-input" data-bind="${itemPath}.link" value="${esc(item.link || "")}" placeholder="https://...">
            </div>
            <div class="cve-bullet-list">
              ${(item.bullets || []).map((b, bIdx) => `
                <div class="cve-sidebar-bullet-row" style="display:flex;gap:6px;align-items:flex-start;margin-bottom:6px;">
                  <span style="font-size:10px;font-weight:bold;color:var(--cve-text-muted);margin-top:7px;min-width:18px;">•${bIdx + 1}</span>
                  <textarea rows="2" class="cve-bullet-input" style="flex:1;" data-bind="${itemPath}.bullets.${bIdx}">${esc(b)}</textarea>
                  <div style="display:flex;flex-direction:column;gap:2px;">
                    <button type="button" class="cve-icon-btn-sm" style="height:20px;width:22px;padding:0;font-size:9px;" ${bIdx === 0 ? "disabled style='opacity:0.3;cursor:not-allowed;'" : ""} onclick="window.CVE.reorderBullet('${itemPath}', ${bIdx}, -1)" title="Move Bullet Up">▲</button>
                    <button type="button" class="cve-icon-btn-sm" style="height:20px;width:22px;padding:0;font-size:9px;" ${bIdx >= (item.bullets || []).length - 1 ? "disabled style='opacity:0.3;cursor:not-allowed;'" : ""} onclick="window.CVE.reorderBullet('${itemPath}', ${bIdx}, 1)" title="Move Bullet Down">▼</button>
                    <button type="button" class="cve-icon-btn-sm danger" style="height:20px;width:22px;padding:0;font-size:9px;" onclick="window.CVE.removeBullet('${itemPath}', ${bIdx})" title="Delete Bullet">✕</button>
                  </div>
                </div>
              `).join("")}
              <button type="button" class="cve-btn" style="margin-top:4px;" onclick="window.CVE.addBullet('${itemPath}')">＋ Add Bullet</button>
            </div>
          `;
        } else if (sec.type === "skills" || sec.type === "tags") {
          html += `
            <input type="text" class="cve-input" data-bind="${itemPath}.label" value="${esc(item.label || "")}" placeholder="Category (e.g. Languages, Tools)">
            <label class="cve-label">Skills</label>
            <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px;">
              ${(item.items || []).map((sk, sIdx) => `
                <span class="cve-sidebar-skill-chip" style="display:inline-flex;align-items:center;gap:4px;background:rgba(37,99,235,0.25);border:1px solid rgba(59,130,246,0.4);color:#fff;padding:2px 7px;border-radius:4px;font-size:11.5px;">
                  <span>${esc(sk)}</span>
                  <button type="button" style="background:none;border:none;color:var(--cve-text-muted);cursor:pointer;padding:0 2px;font-size:9px;" ${sIdx === 0 ? "disabled style='opacity:0.3;cursor:not-allowed;'" : ""} onclick="window.CVE.reorderSkillChip('${itemPath}', ${sIdx}, -1)" title="Move Left">◀</button>
                  <button type="button" style="background:none;border:none;color:var(--cve-text-muted);cursor:pointer;padding:0 2px;font-size:9px;" ${sIdx >= (item.items || []).length - 1 ? "disabled style='opacity:0.3;cursor:not-allowed;'" : ""} onclick="window.CVE.reorderSkillChip('${itemPath}', ${sIdx}, 1)" title="Move Right">▶</button>
                  <button type="button" style="background:none;border:none;color:#ef4444;cursor:pointer;padding:0 2px;font-size:11px;font-weight:bold;" onclick="window.CVE.removeSkillChip('${itemPath}', ${sIdx})" title="Delete Skill">✕</button>
                </span>
              `).join("")}
            </div>
            <label class="cve-label" style="font-size:10.5px;color:var(--cve-text-muted);">Edit as Comma-Separated List</label>
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
            <div class="cve-row-2">
              <input type="text" class="cve-input" data-bind="${itemPath}.label" value="${esc(item.label || "Courses")}" placeholder="Label (e.g. Courses, Honors)">
              <input type="text" class="cve-input" data-bind="${itemPath}.about" value="${esc(item.about || "")}" placeholder="Additional notes...">
            </div>
            <label class="cve-label">Courses / Bullet Points</label>
            <div class="cve-bullet-list">
              ${(item.bullets || []).map((b, bIdx) => `
                <div class="cve-sidebar-bullet-row" style="display:flex;gap:6px;align-items:center;margin-bottom:6px;">
                  <span style="font-size:10px;font-weight:bold;color:var(--cve-text-muted);min-width:18px;">•${bIdx + 1}</span>
                  <input type="text" class="cve-input" style="flex:1;" data-bind="${itemPath}.bullets.${bIdx}" value="${esc(b)}" placeholder="Course name">
                  <div style="display:flex;gap:2px;">
                    <button type="button" class="cve-icon-btn-sm" ${bIdx === 0 ? "disabled style='opacity:0.3;cursor:not-allowed;'" : ""} onclick="window.CVE.reorderBullet('${itemPath}', ${bIdx}, -1)" title="Move Course Up">▲</button>
                    <button type="button" class="cve-icon-btn-sm" ${bIdx >= (item.bullets || []).length - 1 ? "disabled style='opacity:0.3;cursor:not-allowed;'" : ""} onclick="window.CVE.reorderBullet('${itemPath}', ${bIdx}, 1)" title="Move Course Down">▼</button>
                    <button type="button" class="cve-icon-btn-sm danger" onclick="window.CVE.removeBullet('${itemPath}', ${bIdx})" title="Delete Course">✕</button>
                  </div>
                </div>
              `).join("")}
              <button type="button" class="cve-btn" style="margin-top:4px;" onclick="window.CVE.addBullet('${itemPath}')">＋ Add Course / Bullet</button>
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
          </div>
        `;
      });
      html += `</div>
        <div class="cve-section-resizer" title="גרור למעלה/למטה למתיחה ושינוי גודל החלון (Drag to resize height)">
          <div class="cve-section-resizer-line"></div>
        </div>
      </div>`;
    });

    body.innerHTML = html;
    attachSidebarInputs(body);
    attachSidebarDragAndDrop(body);
    attachSectionResizers(body);
  }

  function attachSectionResizers(container) {
    const resizers = container.querySelectorAll(".cve-section-resizer");
    resizers.forEach(resizer => {
      resizer.addEventListener("mousedown", (e) => {
        e.preventDefault();
        e.stopPropagation();

        const card = resizer.closest(".cve-section-card");
        if (!card) return;
        const bodyEl = card.querySelector(".cve-section-body");
        if (!bodyEl) return;

        const startY = e.clientY;
        const startH = bodyEl.offsetHeight;

        resizer.classList.add("is-resizing");
        document.body.style.cursor = "ns-resize";
        document.body.style.userSelect = "none";

        function onMouseMove(ev) {
          ev.preventDefault();
          const deltaY = ev.clientY - startY;
          const newH = Math.max(70, Math.min(window.innerHeight * 0.85, startH + deltaY));
          bodyEl.style.height = newH + "px";
          bodyEl.style.maxHeight = newH + "px";
        }

        function onMouseUp() {
          resizer.classList.remove("is-resizing");
          document.body.style.removeProperty("cursor");
          document.body.style.removeProperty("user-select");
          window.removeEventListener("mousemove", onMouseMove);
          window.removeEventListener("mouseup", onMouseUp);
        }

        window.addEventListener("mousemove", onMouseMove);
        window.addEventListener("mouseup", onMouseUp);
      });
    });
  }

  function attachSidebarDragAndDrop(container) {
    const cards = container.querySelectorAll(".cve-section-card[data-col]");
    cards.forEach(card => {
      const col = card.getAttribute("data-col");
      const idx = parseInt(card.getAttribute("data-idx"), 10);
      const header = card.querySelector(".cve-section-header");
      if (header) {
        header.classList.add("cve-draggable-header");
      }

      // Allow dragging the whole card directly
      card.setAttribute("draggable", "true");

      card.addEventListener("dragstart", (e) => {
        // Do not drag if user is typing in an input, textarea or clicking a button/link
        if (e.target.closest('input, textarea, button, select, a') && !e.target.closest('.cve-drag-handle')) {
          e.preventDefault();
          return;
        }
        card.classList.add("cve-is-dragging");
        state.draggingSection = { col, idx };
        if (e.dataTransfer) {
          e.dataTransfer.effectAllowed = "move";
          e.dataTransfer.setData("text/plain", JSON.stringify({ col, idx }));
        }
      });

      card.addEventListener("dragend", () => {
        card.classList.remove("cve-is-dragging");
        clearAllDropFeedback();
        state.draggingSection = null;
      });

      const handle = card.querySelector(".cve-drag-handle");
      if (handle) {
        handle.addEventListener("dragstart", (e) => {
          card.classList.add("cve-is-dragging");
          state.draggingSection = { col, idx };
          if (e.dataTransfer) {
            e.dataTransfer.effectAllowed = "move";
            e.dataTransfer.setData("text/plain", JSON.stringify({ col, idx }));
          }
        });

        handle.addEventListener("dragend", () => {
          card.classList.remove("cve-is-dragging");
          clearAllDropFeedback();
          state.draggingSection = null;
        });
      }

      card.addEventListener("dragover", (e) => {
        if (!state.draggingSection) return;
        const dragging = state.draggingSection;
        if (dragging.col === col && dragging.idx === idx) return;
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer) e.dataTransfer.dropEffect = "move";

        const rect = card.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        if (e.clientY < midY) {
          card.classList.add("cve-drop-target-before");
          card.classList.remove("cve-drop-target-after");
        } else {
          card.classList.add("cve-drop-target-after");
          card.classList.remove("cve-drop-target-before");
        }
      });

      card.addEventListener("dragleave", (e) => {
        if (!card.contains(e.relatedTarget)) {
          card.classList.remove("cve-drop-target-before", "cve-drop-target-after");
        }
      });

      card.addEventListener("drop", (e) => {
        if (!state.draggingSection) return;
        const dragging = state.draggingSection;
        if (dragging.col === col && dragging.idx === idx) return;
        e.preventDefault();
        e.stopPropagation();

        const rect = card.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        const pos = e.clientY < midY ? "before" : "after";

        clearAllDropFeedback();
        state.draggingSection = null;
        window.CVE.moveSectionPosition(dragging.col, dragging.idx, col, idx, pos);
      });
    });
  }

  function renderDesignTab(body) {
    const cv = getCurrentCV();
    const colors = ["#1f5fa8", "#2a8a8f", "#1f6feb", "#0b7a4b", "#b5452a", "#7c3aed", "#c2185b", "#334155", "#d4a017"];
    const textColors = ["#10131a", "#000000", "#1e293b", "#292524", "#0f172a", "#f8fafc"];
    const muteColors = ["#64748b", "#78716c", "#94a3b8", "#93c5fd", "#475569"];

    body.innerHTML = `
      <!-- Full Document Typography & Google Fonts -->
      <div class="cve-section-card">
        <div class="cve-section-header">
          <span class="cve-section-title">🔤 Document Typography (Google Fonts)</span>
          <span class="cve-badge-pill" style="font-size:10px;background:var(--cve-accent);color:#fff;padding:2px 8px;border-radius:980px;font-weight:700;">12 Fonts</span>
        </div>
        <div class="cve-section-body">
          <p style="font-size:12px;color:var(--cve-text-muted);margin-bottom:8px;line-height:1.4;">
            בחר גופן מקצועי לכל מסמך קורות החיים (נטען ישירות מ-Google Fonts):
          </p>
          <div class="cve-font-grid">
            ${GOOGLE_FONTS_CATALOG.map(f => `
              <div class="cve-font-card ${(cv.font || "Inter") === f.name ? "active" : ""}" onclick="window.CVE.setFont('${f.name}')">
                <span class="cve-font-name">${esc(f.name)}</span>
                <span class="cve-font-cat">${esc(f.cat)}</span>
                <span class="cve-font-preview" style="font-family:'${f.name}',sans-serif;">${esc(f.sample)}</span>
              </div>
            `).join("")}
          </div>
        </div>
      </div>

      <!-- Text Color & Contrast -->
      <div class="cve-section-card">
        <div class="cve-section-header">
          <span class="cve-section-title">🎨 צבעי טקסט וניגודיות (Text Colors)</span>
        </div>
        <div class="cve-section-body">
          <div class="cve-form-group">
            <label class="cve-label">Primary Text Color (צבע טקסט ראשי)</label>
            <div class="cve-color-palette">
              ${textColors.map(c => `
                <div class="cve-color-swatch ${(cv.text_color || "#10131a") === c ? "active" : ""}" style="background:${c};" onclick="window.CVE.setTextColor('${c}')"></div>
              `).join("")}
            </div>
            <div style="display:flex;align-items:center;gap:8px;margin-top:6px;">
              <input type="color" style="height:28px;width:44px;border:none;background:none;cursor:pointer;" value="${cv.text_color || "#10131a"}" onchange="window.CVE.setTextColor(this.value)">
              <span style="font-size:12px;color:var(--cve-text-muted);">Custom Color (HEX)</span>
            </div>
          </div>

          <div class="cve-form-group" style="margin-top:10px;">
            <label class="cve-label">Secondary / Muted Color (תאריכים, מקומות וכותרות משנה)</label>
            <div class="cve-color-palette">
              ${muteColors.map(c => `
                <div class="cve-color-swatch ${(cv.mute_color || "#64748b") === c ? "active" : ""}" style="background:${c};" onclick="window.CVE.setMuteColor('${c}')"></div>
              `).join("")}
            </div>
            <div style="display:flex;align-items:center;gap:8px;margin-top:6px;">
              <input type="color" style="height:28px;width:44px;border:none;background:none;cursor:pointer;" value="${cv.mute_color || "#64748b"}" onchange="window.CVE.setMuteColor(this.value)">
              <span style="font-size:12px;color:var(--cve-text-muted);">Custom Color (HEX)</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Font Sizing & Scale Controls -->
      <div class="cve-section-card">
        <div class="cve-section-header">
          <span class="cve-section-title">📏 גדלי טקסט וכותרות (Font & Element Sizing)</span>
        </div>
        <div class="cve-section-body">
          <!-- Body Text Size -->
          <div class="cve-form-group">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <label class="cve-label" style="margin:0;">גודל טקסט גוף (Body Font Size)</label>
              <span class="cve-size-val">${cv.body_size || 14}px</span>
            </div>
            <div class="cve-size-row">
              <input type="range" min="11" max="17" step="0.5" class="cve-range-input" value="${cv.body_size || 14}" oninput="window.CVE.setBodySize(this.value); this.closest('.cve-form-group').querySelector('.cve-size-val').textContent = this.value + 'px';">
            </div>
            <div class="cve-size-btn-group" style="margin-top:4px;">
              <button type="button" class="cve-size-btn ${(cv.body_size || 14) == 12.5 ? 'active' : ''}" onclick="window.CVE.setBodySize(12.5)">Compact (12.5px)</button>
              <button type="button" class="cve-size-btn ${(cv.body_size || 14) == 14 ? 'active' : ''}" onclick="window.CVE.setBodySize(14)">Standard (14px)</button>
              <button type="button" class="cve-size-btn ${(cv.body_size || 14) == 15.5 ? 'active' : ''}" onclick="window.CVE.setBodySize(15.5)">Roomy (15.5px)</button>
            </div>
          </div>

          <!-- Section Heading Size (h2) -->
          <div class="cve-form-group" style="margin-top:12px;">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <label class="cve-label" style="margin:0;">גודל כותרות סקשן (H2 Headings)</label>
              <span class="cve-size-val">${cv.heading_size || 1.35}em</span>
            </div>
            <div class="cve-size-row">
              <input type="range" min="1.0" max="2.0" step="0.05" class="cve-range-input" value="${cv.heading_size || 1.35}" oninput="window.CVE.setHeadingSize(this.value); this.closest('.cve-form-group').querySelector('.cve-size-val').textContent = this.value + 'em';">
            </div>
            <div class="cve-size-btn-group" style="margin-top:4px;">
              <button type="button" class="cve-size-btn ${(cv.heading_size || 1.35) == 1.15 ? 'active' : ''}" onclick="window.CVE.setHeadingSize(1.15)">Small (1.15em)</button>
              <button type="button" class="cve-size-btn ${(cv.heading_size || 1.35) == 1.35 ? 'active' : ''}" onclick="window.CVE.setHeadingSize(1.35)">Normal (1.35em)</button>
              <button type="button" class="cve-size-btn ${(cv.heading_size || 1.35) == 1.65 ? 'active' : ''}" onclick="window.CVE.setHeadingSize(1.65)">Large (1.65em)</button>
            </div>
          </div>

          <!-- Entry Titles Size (h3) -->
          <div class="cve-form-group" style="margin-top:12px;">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <label class="cve-label" style="margin:0;">גודל שמות תפקידים ופרויקטים (H3 Titles)</label>
              <span class="cve-size-val">${cv.title_size || 1.08}em</span>
            </div>
            <div class="cve-size-row">
              <input type="range" min="0.9" max="1.4" step="0.03" class="cve-range-input" value="${cv.title_size || 1.08}" oninput="window.CVE.setTitleSize(this.value); this.closest('.cve-form-group').querySelector('.cve-size-val').textContent = this.value + 'em';">
            </div>
          </div>

          <!-- Vertical Gap Scale -->
          <div class="cve-form-group" style="margin-top:12px;">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <label class="cve-label" style="margin:0;">ריווח אלמנטים ומרווח אנכי (Spacing & Density)</label>
              <span class="cve-size-val">${cv.gap_scale || 1.0}x</span>
            </div>
            <div class="cve-size-row">
              <input type="range" min="0.65" max="1.35" step="0.05" class="cve-range-input" value="${cv.gap_scale || 1.0}" oninput="window.CVE.setGapScale(this.value); this.closest('.cve-form-group').querySelector('.cve-size-val').textContent = this.value + 'x';">
            </div>
          </div>
        </div>
      </div>

      <!-- CV Document Backgrounds -->
      <div class="cve-section-card">
        <div class="cve-section-header">
          <span class="cve-section-title">🖼️ רקעי קורות חיים (CV Document Backgrounds)</span>
          <span class="cve-badge-pill" style="font-size:10px;background:#3b82f6;color:#fff;padding:2px 8px;border-radius:980px;font-weight:700;">10 Backgrounds</span>
        </div>
        <div class="cve-section-body">
          <p style="font-size:12px;color:var(--cve-text-muted);margin-bottom:10px;line-height:1.4;">
            בחר רקע לקורות החיים שלך ממסך העריכה של האתר — טופוגרפי, גריד הנדסי, כחול רויאל או קלאסי:
          </p>
          <div class="cve-bg-grid">
            ${CV_BACKGROUNDS.map(bg => `
              <div class="cve-bg-card ${(cv.background || "white") === bg.id ? "active" : ""}" onclick="window.CVE.setBg('${bg.id}')">
                <div class="cve-bg-preview" style="${bg.previewStyle}">
                  ${(cv.background || "white") === bg.id ? `<span class="cve-bg-check">✓</span>` : ""}
                </div>
                <div class="cve-bg-info">
                  <div class="cve-bg-name">${esc(bg.name)}</div>
                  <div class="cve-bg-name-he">${esc(bg.nameHe)}</div>
                  <div class="cve-bg-desc">${esc(bg.desc)}</div>
                </div>
              </div>
            `).join("")}
          </div>

          <div style="margin-top:12px;padding-top:12px;border-top:1px solid rgba(255,255,255,0.08);display:flex;align-items:center;justify-content:space-between;gap:10px;">
            <label class="cve-label" style="margin:0;">צבע רקע מותאם אישית (Custom Color):</label>
            <input type="color" class="cve-color-input" style="width:48px;height:30px;padding:0;border:1px solid rgba(255,255,255,0.2);border-radius:6px;cursor:pointer;background:none;" value="${cv.custom_bg || "#ffffff"}" onchange="window.CVE.setBg('custom-color', this.value)">
          </div>
        </div>
      </div>

      <!-- Site Themes & Skins -->
      <div class="cve-section-card">
        <div class="cve-section-header">
          <span class="cve-section-title">🎨 Site Themes & Skins</span>
          <span class="cve-badge-pill" style="font-size:10px;background:var(--cve-accent);color:#fff;padding:2px 8px;border-radius:980px;font-weight:700;">8 Styles</span>
        </div>
        <div class="cve-section-body">
          <div class="cve-skin-grid">
            ${SITE_SKINS.map(s => `
              <div class="cve-skin-card ${(cv.skin || "classic") === s.id ? "active" : ""}" onclick="window.CVE.setSkin('${s.id}')">
                <div class="cve-skin-card-header">
                  <span class="cve-skin-icon">${s.icon}</span>
                  <span class="cve-skin-name">${esc(s.name)}</span>
                  <span class="cve-skin-dot" style="background:${s.accent};"></span>
                </div>
                <div class="cve-skin-desc">${esc(s.desc)}</div>
              </div>
            `).join("")}
          </div>
        </div>
      </div>

      <!-- Layout & Column Options -->
      <div class="cve-section-card">
        <div class="cve-section-header">
          <span class="cve-section-title">📐 Layout & Column Options</span>
        </div>
        <div class="cve-section-body">
          <div class="cve-form-group">
            <label class="cve-label">Column Layout Ratio</label>
            <select class="cve-select" onchange="window.CVE.setLayoutRatio(this.value)">
              <option value="50-50" ${(cv.layout_ratio || "50-50") === "50-50" ? "selected" : ""}>50 / 50 Balanced Split (Novo Standard)</option>
              <option value="35-65" ${cv.layout_ratio === "35-65" ? "selected" : ""}>35 / 65 Left Sidebar (Studio Style)</option>
              <option value="65-35" ${cv.layout_ratio === "65-35" ? "selected" : ""}>65 / 35 Right Sidebar (Modern)</option>
              <option value="1-col" ${cv.layout_ratio === "1-col" ? "selected" : ""}>1-Column Full Width (ATS Classic)</option>
            </select>
          </div>
          <button type="button" class="cve-btn layout-btn" style="justify-content:center;margin-top:2px;" onclick="window.CVE.openLayoutModal()">
            📐 Open Visual Column Organizer
          </button>
        </div>
      </div>

      <!-- Accent Color & Presets -->
      <div class="cve-section-card">
        <div class="cve-section-header">
          <span class="cve-section-title">🖌 Accent Color & Template Preset</span>
        </div>
        <div class="cve-section-body">
          <div class="cve-form-group">
            <label class="cve-label">Template Preset</label>
            <select class="cve-select" data-bind="template" onchange="window.CVE.setTemplate(this.value)">
              <option value="ats" ${cv.template === "ats" ? "selected" : ""}>ATS Pro (1-Column, High Parsing Accuracy)</option>
              <option value="novo" ${cv.template === "novo" ? "selected" : ""}>Novo (2-Column, Modern & Balanced)</option>
              <option value="studio" ${cv.template === "studio" ? "selected" : ""}>Studio (Colored Sidebar)</option>
            </select>
          </div>
          <div class="cve-form-group">
            <label class="cve-label">Accent Color (כותרות, קווים והדגשות)</label>
            <div class="cve-color-palette">
              ${colors.map(c => `
                <div class="cve-color-swatch ${cv.accent === c ? "active" : ""}" style="background:${c};" onclick="window.CVE.setAccent('${c}')"></div>
              `).join("")}
            </div>
            <input type="color" style="margin-top:8px;height:32px;width:100%;background:none;border:none;cursor:pointer;" value="${cv.accent || "#1f5fa8"}" onchange="window.CVE.setAccent(this.value)">
          </div>
          <div class="cve-form-group">
            <label class="cve-label">Text Direction (Language)</label>
            <select class="cve-select" data-bind="dir" onchange="window.CVE.setDirection(this.value)">
              <option value="ltr" ${cv.dir === "ltr" ? "selected" : ""}>Left-to-Right (English / Latin)</option>
              <option value="rtl" ${cv.dir === "rtl" ? "selected" : ""}>Right-to-Left (עברית / Hebrew)</option>
            </select>
          </div>
        </div>
      </div>
    `;
    attachSidebarInputs(body);
  }


    function renderAtsTab(body) {
    const cv = getCurrentCV();
    const tips = cvLint(cv);
    const checks = computeAtsChecks(cv);
    const totalW = checks.reduce((a, b) => a + b.w, 0);
    const gotW = checks.reduce((a, b) => a + (b.ok ? b.w : 0), 0);
    const formatScore = Math.round((gotW / totalW) * 100);

    const plainText = window.RTCV ? window.RTCV.plainText(cv) : "";

    body.innerHTML = `
      <div class="cve-section-card">
        <div class="cve-section-header">
          <span class="cve-section-title">🎯 ATS Score & Match Overview</span>
          <span class="cve-badge-pill" style="font-size:10px;background:${formatScore >= 80 ? '#10b981' : '#f59e0b'};color:#fff;padding:2px 8px;border-radius:980px;font-weight:700;">${formatScore}% Score</span>
        </div>
        <div class="cve-section-body">
          <div class="cve-score-rings" style="margin-bottom:8px;">
            <div class="cve-ring-card">
              <div class="cve-circular-progress" style="--ring-pct:${formatScore};--ring-color:#10b981;">
                <span class="cve-circular-progress-val">${formatScore}%</span>
              </div>
              <span class="cve-ring-label">Layout Score</span>
            </div>
            <div class="cve-ring-card">
              <div class="cve-circular-progress" style="--ring-pct:${Math.max(0, 100 - tips.length * 15)};--ring-color:${tips.length ? '#f59e0b' : '#10b981'};">
                <span class="cve-circular-progress-val">${Math.max(0, 100 - tips.length * 15)}%</span>
              </div>
              <span class="cve-ring-label">Content Health</span>
            </div>
          </div>
          <button type="button" class="cve-btn pri" style="justify-content:center;" onclick="window.CVE.openAtsModal()">
            🎯 Run Job Description Keyword Matcher
          </button>
        </div>
      </div>

      <div class="cve-section-card">
        <div class="cve-section-header">
          <span class="cve-section-title">💡 Active Recommendations (${tips.length})</span>
          <span class="cve-badge-pill" style="font-size:10px;background:${tips.length ? '#ef4444' : '#10b981'};color:#fff;padding:2px 8px;border-radius:980px;font-weight:700;">${tips.length ? tips.length + ' Tips' : 'All Passed ✓'}</span>
        </div>
        <div class="cve-section-body">
          ${tips.length === 0 ? `
            <div style="text-align:center;padding:14px;color:#10b981;font-weight:600;font-size:13px;">
              ✓ Your CV passes all Harvard & Google ATS formatting benchmarks!
            </div>
          ` : `
            <div style="display:flex;flex-direction:column;gap:8px;">
              ${tips.map(t => `
                <div style="background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.25);border-radius:6px;padding:8px 10px;">
                  <div style="font-weight:700;font-size:12.5px;color:#fca5a5;margin-bottom:3px;">⚠️ ${esc(t.title)}</div>
                  <div style="font-size:11.5px;color:var(--cve-text-muted);margin-bottom:6px;line-height:1.4;">${esc(t.why)}</div>
                  ${t.fixAction ? `
                    <button type="button" class="cve-btn sm pri" onclick="(${t.fixAction.action.toString()})()">
                      ${esc(t.fixAction.label || 'Fix Now')}
                    </button>
                  ` : ''}
                </div>
              `).join('')}
            </div>
          `}
        </div>
      </div>

      <div class="cve-section-card">
        <div class="cve-section-header">
          <span class="cve-section-title">🤖 What the Robot Reads (Plain Text)</span>
        </div>
        <div class="cve-section-body">
          <p style="font-size:11.5px;color:var(--cve-text-muted);margin-bottom:6px;">
            This is exactly how automated screening systems (Workday, Greenhouse, Taleo) extract your text:
          </p>
          <div class="cve-plain-text-box" style="max-height:160px;">${esc(plainText)}</div>
        </div>
      </div>
    `;
  }


    function renderVaultTab(body) {
    const user = state.currentUser;
    const isRoee = false;   // no admin view: every account and its résumés stay on its own device
    const myCvs = state.vault[state.activeOwnerId] || {};

    let html = `
      <div class="cve-section-card">
        <div class="cve-section-header">
          <span class="cve-section-title">🔐 User Account & Vault</span>
        </div>
        <div class="cve-section-body">
          <p style="font-size:13px;color:#fff;">Logged in as: <b>${esc(user ? user.name : "Guest")}</b> (${esc(user ? user.email : "Not logged in")})</p>
          <p style="font-size:12px;color:var(--cve-text-muted);">
            ${isRoee ? "🌟 Roee Admin Mode: Full access to all your and friends' CVs." : user ? "🔒 Your account: your résumés are saved only in this browser, on this device." : "⚠️ You are editing as Guest. Save and register to keep your CV permanently!"}
          </p>
          <div style="display:flex;gap:8px;margin-top:4px;">
            <button type="button" class="cve-btn" onclick="window.CVE.openAuthModal()">${user ? "Account Settings" : "Sign In"}</button>
            <button type="button" class="cve-btn" onclick="window.CVE.exportVaultJson()">💾 Backup All (JSON)</button>
          </div>
        </div>
      </div>

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
                  <div style="font-size:11px;color:var(--cve-text-muted);text-transform:uppercase;">${esc(item.template)} · ${(item.main || []).length + (item.side || []).length} sections</div>
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
              ${friends.length === 0 ? `<p style="font-size:12px;color:var(--cve-text-muted);font-style:italic;">No friend accounts registered yet.</p>` : ""}
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

    const sel = $("#docSelect");
    if (sel) {
      sel.innerHTML = Object.entries(myCvs).map(([id, item]) => `
        <option value="${id}" ${state.activeCvId === id ? "selected" : ""}>${esc(item.label || id)}</option>
      `).join("");
    }

    $$(".cve-tpl-btn").forEach(btn => {
      btn.classList.toggle("active", btn.getAttribute("data-tpl") === cv.template);
    });

    const skinSel = $("#cveSkinSelect");
    if (skinSel) {
      skinSel.value = cv.skin || "classic";
    }

    const bgSel = $("#cveBgSelect");
    if (bgSel) {
      bgSel.value = cv.background || "white";
    }

    const userBtn = $("#userBtn");
    if (userBtn) {
      const u = state.currentUser;
      userBtn.innerHTML = `
        <span class="cve-user-avatar">${u ? u.name.charAt(0).toUpperCase() : "👤"}</span>
        <span>${esc(u ? u.name : "Sign In")}</span>
      `;
    }

    showSaveIndicator();
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

    try {
      const res = await fetch("https://r.jina.ai/" + url, { headers: { "Accept": "text/plain" } });
      if (res.ok) {
        const text = await res.text();
        if (text.length > 200 && !/access denied|challenge-platform/i.test(text.slice(0, 500))) {
          return cleanJobText(text);
        }
      }
    } catch (e) {}

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

    const ringOverall = $("#ringOverall");
    const ringFormat = $("#ringFormat");
    const ringKeywords = $("#ringKeywords");

    const setRingProp = (ring, pct, color, text) => {
      if (!ring) return;
      if (ring.style && ring.style.setProperty) {
        ring.style.setProperty("--ring-pct", pct);
        ring.style.setProperty("--ring-color", color);
      } else if (ring.style) {
        ring.style["--ring-pct"] = pct;
        ring.style["--ring-color"] = color;
      }
      const valEl = ring.querySelector ? ring.querySelector(".cve-circular-progress-val") : null;
      if (valEl) valEl.textContent = text;
    };

    setRingProp(ringOverall, overallScore, overallScore >= 80 ? "#10b981" : overallScore >= 60 ? "#f59e0b" : "#ef4444", overallScore + "%");
    setRingProp(ringFormat, formatScore, formatScore >= 80 ? "#10b981" : "#f59e0b", formatScore + "%");
    setRingProp(ringKeywords, kwScore, kwScore >= 75 ? "#10b981" : "#f59e0b", jt.length > 60 ? kwScore + "%" : "—");

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

    const script = document.createElement("script");
    script.src = PEERJS_CDN;
    script.onload = () => {
      const myId = roomId ? null : "cve-" + hex(crypto.getRandomValues(new Uint8Array(12)));   // unguessable room id: anyone with it can see the résumé
      state.peer = new window.Peer(myId, { debug: 1 });

      state.peer.on("open", id => {
        state.collabRoomId = id;
        state.isCollabHost = !roomId;
        updateCollabModalUI();

        if (roomId) {
          connectToHost(roomId);
        }
      });

      state.peer.on("connection", conn => {
        setupConnection(conn);
        conn.on("open", () => {
          conn.send({
            type: "init_cv",
            cv: getCurrentCV(),
            hostName: state.currentUser ? state.currentUser.name : "Friend"
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
        conn.send({ type: "sync_cv", cv, author: state.currentUser ? state.currentUser.name : "Friend" });
      }
    });
  }

  function broadcastPresence(fieldPath) {
    const user = state.currentUser || { name: "Friend" };
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

  // --- Layout Organizer Modal Renderer ---
  function renderLayoutModalBody() {
    const cv = getCurrentCV();
    const body = $("#layoutModalBody");
    if (!body) return;

    const ratio = cv.layout_ratio || "50-50";

    let html = `
      <div class="cve-form-group">
        <label class="cve-label">Column Ratio Layout Preset</label>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:4px;">
          <button type="button" class="cve-btn ${ratio === "50-50" ? "pri" : ""}" onclick="window.CVE.setLayoutRatio('50-50')">50 / 50 Balanced (Novo)</button>
          <button type="button" class="cve-btn ${ratio === "35-65" ? "pri" : ""}" onclick="window.CVE.setLayoutRatio('35-65')">35 / 65 Left Sidebar</button>
          <button type="button" class="cve-btn ${ratio === "65-35" ? "pri" : ""}" onclick="window.CVE.setLayoutRatio('65-35')">65 / 35 Right Sidebar</button>
          <button type="button" class="cve-btn ${ratio === "1-col" ? "pri" : ""}" onclick="window.CVE.setLayoutRatio('1-col')">100% Single Col (ATS)</button>
        </div>
      </div>

      <div class="cve-board-grid">
        <div class="cve-board-col">
          <div class="cve-board-col-header">
            <span>Left Column (Side)</span>
            <span style="font-size:11px;color:var(--cve-text-muted);">${(cv.side || []).length} sections</span>
          </div>
          <div style="display:flex;flex-direction:column;gap:8px;flex:1;">
            ${(cv.side || []).map((sec, idx) => `
              <div class="cve-board-card" data-col="side" data-idx="${idx}">
                <div class="cve-board-card-info" style="display:flex;align-items:center;gap:7px;">
                  <span class="cve-drag-handle" title="Drag to reorder" draggable="true">⠿</span>
                  <span class="cve-board-card-title">${esc(sec.title || sec.type)}</span>
                  <span class="cve-board-card-badge">${(sec.items || []).length} items</span>
                </div>
                <div class="cve-board-card-actions">
                  <button type="button" class="cve-icon-btn-sm" title="Move to Right Column" onclick="window.CVE.moveSectionColumn('side', ${idx})">→ Main</button>
                  ${idx > 0 ? `<button type="button" class="cve-icon-btn-sm" title="Move Up" onclick="window.CVE.reorderSection('side', ${idx}, -1)">▲</button>` : ""}
                  ${idx < (cv.side || []).length - 1 ? `<button type="button" class="cve-icon-btn-sm" title="Move Down" onclick="window.CVE.reorderSection('side', ${idx}, 1)">▼</button>` : ""}
                  <button type="button" class="cve-icon-btn-sm" title="Delete Section" onclick="window.CVE.removeSection('side.${idx}')">✕</button>
                </div>
              </div>
            `).join("")}
            ${(!cv.side || cv.side.length === 0) ? `<p style="font-size:12px;color:var(--cve-text-muted);font-style:italic;padding:12px 0;">No sections in left column. Click below to add one!</p>` : ""}
          </div>
          <button type="button" class="cve-btn" style="width:100%;justify-content:center;margin-top:auto;" onclick="window.CVE.openAddSectionModal('side')">＋ Add Section Here</button>
        </div>

        <div class="cve-board-col">
          <div class="cve-board-col-header">
            <span>Right Column (Main)</span>
            <span style="font-size:11px;color:var(--cve-text-muted);">${(cv.main || []).length} sections</span>
          </div>
          <div style="display:flex;flex-direction:column;gap:8px;flex:1;">
            ${(cv.main || []).map((sec, idx) => `
              <div class="cve-board-card" data-col="main" data-idx="${idx}">
                <div class="cve-board-card-info" style="display:flex;align-items:center;gap:7px;">
                  <span class="cve-drag-handle" title="Drag to reorder" draggable="true">⠿</span>
                  <span class="cve-board-card-title">${esc(sec.title || sec.type)}</span>
                  <span class="cve-board-card-badge">${(sec.items || []).length} items</span>
                </div>
                <div class="cve-board-card-actions">
                  <button type="button" class="cve-icon-btn-sm" title="Move to Left Column" onclick="window.CVE.moveSectionColumn('main', ${idx})">← Side</button>
                  ${idx > 0 ? `<button type="button" class="cve-icon-btn-sm" title="Move Up" onclick="window.CVE.reorderSection('main', ${idx}, -1)">▲</button>` : ""}
                  ${idx < (cv.main || []).length - 1 ? `<button type="button" class="cve-icon-btn-sm" title="Move Down" onclick="window.CVE.reorderSection('main', ${idx}, 1)">▼</button>` : ""}
                  <button type="button" class="cve-icon-btn-sm" title="Delete Section" onclick="window.CVE.removeSection('main.${idx}')">✕</button>
                </div>
              </div>
            `).join("")}
            ${(!cv.main || cv.main.length === 0) ? `<p style="font-size:12px;color:var(--cve-text-muted);font-style:italic;padding:12px 0;">No sections in right column. Click below to add one!</p>` : ""}
          </div>
          <button type="button" class="cve-btn" style="width:100%;justify-content:center;margin-top:auto;" onclick="window.CVE.openAddSectionModal('main')">＋ Add Section Here</button>
        </div>
      </div>
    `;

    body.innerHTML = html;
    attachBoardDragAndDrop(body);
  }

  function attachBoardDragAndDrop(container) {
    const cards = container.querySelectorAll(".cve-board-card[data-col]");
    cards.forEach(card => {
      const col = card.getAttribute("data-col");
      const idx = parseInt(card.getAttribute("data-idx"), 10);
      const handle = card.querySelector(".cve-drag-handle");
      if (!handle) return;

      handle.addEventListener("dragstart", (e) => {
        card.classList.add("cve-is-dragging");
        state.draggingSection = { col, idx };
        if (e.dataTransfer) {
          e.dataTransfer.effectAllowed = "move";
          e.dataTransfer.setData("text/plain", JSON.stringify({ col, idx }));
        }
      });

      handle.addEventListener("dragend", () => {
        card.classList.remove("cve-is-dragging");
        clearAllDropFeedback();
        state.draggingSection = null;
      });

      card.addEventListener("dragover", (e) => {
        if (!state.draggingSection) return;
        const dragging = state.draggingSection;
        if (dragging.col === col && dragging.idx === idx) return;
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer) e.dataTransfer.dropEffect = "move";

        const rect = card.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        if (e.clientY < midY) {
          card.classList.add("cve-drop-target-before");
          card.classList.remove("cve-drop-target-after");
        } else {
          card.classList.add("cve-drop-target-after");
          card.classList.remove("cve-drop-target-before");
        }
      });

      card.addEventListener("dragleave", (e) => {
        if (!card.contains(e.relatedTarget)) {
          card.classList.remove("cve-drop-target-before", "cve-drop-target-after");
        }
      });

      card.addEventListener("drop", (e) => {
        if (!state.draggingSection) return;
        const dragging = state.draggingSection;
        if (dragging.col === col && dragging.idx === idx) return;
        e.preventDefault();
        e.stopPropagation();

        const rect = card.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        const pos = e.clientY < midY ? "before" : "after";

        clearAllDropFeedback();
        state.draggingSection = null;
        window.CVE.moveSectionPosition(dragging.col, dragging.idx, col, idx, pos);
      });
    });

    const cols = container.querySelectorAll(".cve-board-col");
    cols.forEach((colEl, cIdx) => {
      const colName = cIdx === 0 ? "side" : "main";
      colEl.addEventListener("dragover", (e) => {
        if (!state.draggingSection) return;
        if (e.target.closest && e.target.closest(".cve-board-card")) return;
        e.preventDefault();
        if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
        colEl.classList.add("cve-drop-zone-active");
      });

      colEl.addEventListener("dragleave", (e) => {
        if (!colEl.contains(e.relatedTarget)) {
          colEl.classList.remove("cve-drop-zone-active");
        }
      });

      colEl.addEventListener("drop", (e) => {
        if (!state.draggingSection) return;
        if (e.target.closest && e.target.closest(".cve-board-card")) return;
        e.preventDefault();
        e.stopPropagation();
        colEl.classList.remove("cve-drop-zone-active");
        const dragging = state.draggingSection;
        clearAllDropFeedback();
        state.draggingSection = null;
        const cv = getCurrentCV();
        window.CVE.moveSectionPosition(dragging.col, dragging.idx, colName, (cv[colName] || []).length, "after");
      });
    });
  }

  // --- Section Library Modal Renderer ---
  function renderAddSectionModalBody(targetCol) {
    const body = $("#addSecModalBody");
    if (!body) return;

    let html = `
      <p style="font-size:13px;color:var(--cve-text-muted);">
        Choose a section to add to your résumé. You can position it in either the Left or Right column:
      </p>
      <div class="cve-lib-grid">
        ${SECTION_CATALOG.map(s => `
          <div class="cve-lib-card">
            <span class="cve-lib-card-title">${esc(s.title)}</span>
            <span class="cve-lib-card-desc">${esc(s.desc)}</span>
            <div class="cve-lib-card-btns">
              <button type="button" class="cve-btn ${targetCol === "side" ? "pri" : ""}" onclick="window.CVE.addSectionToCol('${s.type}', 'side')">＋ Left Col</button>
              <button type="button" class="cve-btn ${targetCol === "main" ? "pri" : ""}" onclick="window.CVE.addSectionToCol('${s.type}', 'main')">＋ Right Col</button>
            </div>
          </div>
        `).join("")}
      </div>
    `;

    body.innerHTML = html;
  }

  // --- Public API for UI Event Handlers ---
  window.CVE = {
    getCurrentCV() {
      return getCurrentCV();
    },
    init() {
      initPhotoFileInput();
      Storage.init();
      renderA4Sheet();
      renderSidebar();
      setFitZoom();

      Storage.loadSiteCv();

      const params = new URLSearchParams(location.search);
      const room = params.get("room");
      if (room) {
        initCollab(room);
      }

      window.addEventListener("resize", () => {
        if (state.zoom === 1.0) setFitZoom();
        updatePageMeter();
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

    setSkin(skinName) {
      const cv = getCurrentCV();
      cv.skin = skinName || "classic";
      saveCurrentCV(cv);
      applySkin(cv.skin);
      renderA4Sheet();
      renderSidebar();
    },


    setFont(fontName) {
      const cv = getCurrentCV();
      cv.font = fontName;
      saveCurrentCV(cv);
      renderA4Sheet();
      renderSidebar();
    },

    setTextColor(color) {
      const cv = getCurrentCV();
      cv.text_color = color;
      saveCurrentCV(cv);
      renderA4Sheet();
      renderSidebar();
    },

    setMuteColor(color) {
      const cv = getCurrentCV();
      cv.mute_color = color;
      saveCurrentCV(cv);
      renderA4Sheet();
      renderSidebar();
    },

    setBodySize(val) {
      const cv = getCurrentCV();
      cv.body_size = parseFloat(val);
      saveCurrentCV(cv);
      applyDocumentTypography(cv);
    },

    setHeadingSize(val) {
      const cv = getCurrentCV();
      cv.heading_size = parseFloat(val);
      saveCurrentCV(cv);
      applyDocumentTypography(cv);
    },

    setTitleSize(val) {
      const cv = getCurrentCV();
      cv.title_size = parseFloat(val);
      saveCurrentCV(cv);
      applyDocumentTypography(cv);
    },

    setGapScale(val) {
      const cv = getCurrentCV();
      cv.gap_scale = parseFloat(val);
      saveCurrentCV(cv);
      applyDocumentTypography(cv);
    },

    undo() {
      History.undo();
    },

    redo() {
      History.redo();
    },

    toggleSidebar() {
      const isCollapsed = document.body.classList.toggle("cve-sidebar-collapsed");
      const btn = $("#cveSidebarToggleBtn");
      if (btn) {
        btn.classList.toggle("active", isCollapsed);
        btn.title = isCollapsed ? "Open Sidebar (Ctrl+B)" : "Collapse Sidebar (Ctrl+B)";
      }
      const arrow = $("#cveSidebarArrowIcon");
      if (arrow) {
        arrow.textContent = isCollapsed ? "▶" : "◀";
      }
      const protBtn = $("#cveSidebarToggleProtruding");
      if (protBtn) {
        protBtn.title = isCollapsed ? "Open Sidebar (Ctrl+B)" : "Collapse Sidebar (Ctrl+B)";
      }
      setTimeout(() => {
        setFitZoom();
        updatePageMeter();
      }, 260);
    },

    toggleSectionCard(basePath) {
      state.collapsedSections = state.collapsedSections || {};
      state.collapsedSections[basePath] = !state.collapsedSections[basePath];
      renderSidebar();
    },

    removeBulletFromItem(itemPath, bulletIdx) {
      History.push(getCurrentCV());
      const cv = getCurrentCV();
      const cleanPath = itemPath.replace(/^[^:]+:variants\.[^.]+\./, "");
      const item = getByPath(cv, cleanPath);
      if (item && Array.isArray(item.bullets)) {
        item.bullets.splice(bulletIdx, 1);
        item.bullets = item.bullets.filter(b => typeof b === "string" && b.trim());
        saveCurrentCV(cv, false);
        renderA4Sheet();
        renderSidebar();
      }
    },

    removeSkillFromItem(itemPath, skillIdx) {
      History.push(getCurrentCV());
      const cv = getCurrentCV();
      const cleanPath = itemPath.replace(/^[^:]+:variants\.[^.]+\./, "");
      const item = getByPath(cv, cleanPath);
      if (item && Array.isArray(item.items)) {
        item.items.splice(skillIdx, 1);
        item.items = item.items.filter(s => typeof s === "string" && s.trim());
        saveCurrentCV(cv, false);
        renderA4Sheet();
        renderSidebar();
      }
    },

    removeContactItem(key) {
      History.push(getCurrentCV());
      const cv = getCurrentCV();
      if (!cv.person) cv.person = {};
      const P = cv.person;
      if (key === "email") P.email = "";
      else if (key === "phone") P.phone = "";
      else if (key === "location") P.location = "";
      else if (key.startsWith("link:")) {
        const linkIdx = parseInt(key.replace("link:", ""), 10);
        if (Array.isArray(P.links) && !isNaN(linkIdx)) {
          P.links.splice(linkIdx, 1);
        }
      }
      if (Array.isArray(P.contact_order)) {
        P.contact_order = P.contact_order.filter(k => k !== key);
      }
      saveCurrentCV(cv, false);
      renderA4Sheet();
      renderSidebar();
    },

    moveBulletPosition(fromCol, fromSecIdx, fromItemIdx, fromBulIdx, toCol, toSecIdx, toItemIdx, toBulIdx, pos = "before") {
      History.push(getCurrentCV());
      const cv = getCurrentCV();
      const fromSec = cv[fromCol] && cv[fromCol][fromSecIdx];
      const fromItem = fromSec && fromSec.items && fromSec.items[fromItemIdx];
      const toSec = cv[toCol] && cv[toCol][toSecIdx];
      const toItem = toSec && toSec.items && toSec.items[toItemIdx];
      if (!fromItem || !toItem || !Array.isArray(fromItem.bullets) || !Array.isArray(toItem.bullets)) return;

      fromItem.bullets = fromItem.bullets.filter(b => typeof b === "string" && b.trim());
      toItem.bullets = toItem.bullets.filter(b => typeof b === "string" && b.trim());

      if (fromBulIdx < 0 || fromBulIdx >= fromItem.bullets.length) return;

      // Smart neighbor swap if dragging onto adjacent neighbor
      if (fromItem === toItem) {
        if (fromBulIdx === toBulIdx - 1 && pos === "before") pos = "after";
        if (fromBulIdx === toBulIdx + 1 && pos === "after") pos = "before";
      }

      const [bul] = fromItem.bullets.splice(fromBulIdx, 1);
      if (bul === undefined) return;

      let ins = toBulIdx;
      if (fromItem === toItem && fromBulIdx < toBulIdx) ins--;
      if (pos === "after") ins++;
      if (ins < 0) ins = 0;
      if (ins > toItem.bullets.length) ins = toItem.bullets.length;

      toItem.bullets.splice(ins, 0, bul);
      toItem.bullets = toItem.bullets.filter(b => typeof b === "string" && b.trim());

      saveCurrentCV(cv, false);
      renderA4Sheet();
      renderSidebar();
    },

    moveSkillPosition(fromCol, fromSecIdx, fromItemIdx, fromSkillIdx, toCol, toSecIdx, toItemIdx, toSkillIdx, pos = "before") {
      History.push(getCurrentCV());
      const cv = getCurrentCV();
      const fromSec = cv[fromCol] && cv[fromCol][fromSecIdx];
      const fromItem = fromSec && fromSec.items && fromSec.items[fromItemIdx];
      const toSec = cv[toCol] && cv[toCol][toSecIdx];
      const toItem = toSec && toSec.items && toSec.items[toItemIdx];
      if (!fromItem || !toItem || !Array.isArray(fromItem.items) || !Array.isArray(toItem.items)) return;

      fromItem.items = fromItem.items.filter(s => typeof s === "string" && s.trim());
      toItem.items = toItem.items.filter(s => typeof s === "string" && s.trim());

      if (fromSkillIdx < 0 || fromSkillIdx >= fromItem.items.length) return;

      if (fromItem === toItem) {
        if (fromSkillIdx === toSkillIdx - 1 && pos === "before") pos = "after";
        if (fromSkillIdx === toSkillIdx + 1 && pos === "after") pos = "before";
      }

      const [skill] = fromItem.items.splice(fromSkillIdx, 1);
      if (skill === undefined) return;

      let ins = toSkillIdx;
      if (fromItem === toItem && fromSkillIdx < toSkillIdx) ins--;
      if (pos === "after") ins++;
      if (ins < 0) ins = 0;
      if (ins > toItem.items.length) ins = toItem.items.length;

      toItem.items.splice(ins, 0, skill);
      toItem.items = toItem.items.filter(s => typeof s === "string" && s.trim());

      saveCurrentCV(cv, false);
      renderA4Sheet();
      renderSidebar();
    },

    moveContactPosition(fromKey, toKey, pos = "before") {
      History.push(getCurrentCV());
      const cv = getCurrentCV();
      if (!cv.person) cv.person = {};
      const P = cv.person;

      const defaultKeys = ["email", "phone", "location", ...(P.links || []).map((_, k) => "link:" + k)];
      let order = Array.isArray(P.contact_order) && P.contact_order.length
        ? [...P.contact_order]
        : [...defaultKeys];

      defaultKeys.forEach(k => {
        if (!order.includes(k)) order.push(k);
      });

      const fromIdx = order.indexOf(fromKey);
      const toIdx = order.indexOf(toKey);
      if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return;

      if (fromIdx === toIdx - 1 && pos === "before") pos = "after";
      if (fromIdx === toIdx + 1 && pos === "after") pos = "before";

      const [item] = order.splice(fromIdx, 1);
      let ins = order.indexOf(toKey);
      if (pos === "after") ins++;
      if (ins < 0) ins = 0;
      if (ins > order.length) ins = order.length;

      order.splice(ins, 0, item);
      P.contact_order = order;

      saveCurrentCV(cv, false);
      renderA4Sheet();
      renderSidebar();
    },

    openTipsModal() {
      const cv = getCurrentCV();
      const tips = cvLint(cv);
      const m = $("#tipsModal");
      const cont = $("#tipsListContainer");
      if (cont) {
        if (!tips.length) {
          cont.innerHTML = `
            <div style="text-align:center;padding:24px;color:#10b981;font-weight:700;font-size:14px;">
              ✓ Excellent! Your CV passes all Harvard & Google ATS formatting benchmarks!
            </div>
          `;
        } else {
          cont.innerHTML = tips.map(t => `
            <div style="background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.25);border-radius:8px;padding:12px;">
              <div style="font-weight:800;font-size:13.5px;color:#fca5a5;margin-bottom:4px;">⚠️ ${esc(t.title)}</div>
              <div style="font-size:12px;color:var(--cve-text-muted);margin-bottom:10px;line-height:1.45;">${esc(t.why)}</div>
              ${t.fixAction ? `
                <button type="button" class="cve-btn sm pri" onclick="window.CVE.closeModal('tipsModal'); (${t.fixAction.action.toString()})()">
                  ${esc(t.fixAction.label || "Fix Now")}
                </button>
              ` : ''}
            </div>
          `).join('');
        }
      }
      if (m) m.classList.add("open");
    },

        setBg(bgId, customVal) {
      const cv = getCurrentCV();
      cv.background = bgId || "white";
      if (customVal !== undefined) cv.custom_bg = customVal;
      saveCurrentCV(cv);
      applyCvBackground(cv.background, cv.custom_bg);
      renderA4Sheet();
      renderSidebar();
    },

    moveItemPosition(fromCol, fromSecIdx, fromItemIdx, toCol, toSecIdx, toItemIdx, position = "before") {
      const cv = getCurrentCV();
      const fromSec = cv[fromCol] && cv[fromCol][fromSecIdx];
      const toSec = cv[toCol] && cv[toCol][toSecIdx];
      if (!fromSec || !toSec || !Array.isArray(fromSec.items) || !Array.isArray(toSec.items)) return;
      if (fromCol === toCol && fromSecIdx === toSecIdx && fromItemIdx === toItemIdx) return;

      const [item] = fromSec.items.splice(fromItemIdx, 1);
      let insertIdx = toItemIdx;
      if (fromCol === toCol && fromSecIdx === toSecIdx && fromItemIdx < toItemIdx) {
        insertIdx--;
      }
      if (position === "after") insertIdx++;
      if (insertIdx < 0) insertIdx = 0;
      if (insertIdx > toSec.items.length) insertIdx = toSec.items.length;

      toSec.items.splice(insertIdx, 0, item);
      saveCurrentCV(cv);
      renderA4Sheet();
      renderSidebar();
    },

    setLayoutRatio(ratio) {
      const cv = getCurrentCV();
      cv.layout_ratio = ratio;
      saveCurrentCV(cv);
      renderA4Sheet();
      renderSidebar();
      renderLayoutModalBody();
    },

    autoFitToOnePage() {
      const cv = getCurrentCV();
      cv.density = "compact";
      for (const c of ["main", "side"]) {
        (cv[c] || []).forEach(sec => {
          (sec.items || []).forEach(it => {
            if (it.bullets) it.bullets = it.bullets.filter(b => b && b.trim());
          });
        });
      }
      saveCurrentCV(cv);
      renderA4Sheet();
      renderSidebar();
      setTimeout(updatePageMeter, 100);
      alert("Layout adjusted to Compact density to fit onto 1 single page!");
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
      saveCurrentCV(blank);
      this.switchCV(id);
    },

    duplicateCV(id) {
      const src = state.vault[state.activeOwnerId][id];
      if (!src) return;
      const newId = "cv_" + Math.random().toString(36).substring(2, 8);
      const dup = JSON.parse(JSON.stringify(src));
      dup.label = (dup.label || "CV") + " (Copy)";
      state.vault[state.activeOwnerId][newId] = dup;
      saveCurrentCV(dup);
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

    moveSectionColumn(col, idx) {
      const cv = getCurrentCV();
      if (!cv[col] || !cv[col][idx]) return;
      const otherCol = col === "main" ? "side" : "main";
      if (!cv[otherCol]) cv[otherCol] = [];
      const sec = cv[col].splice(idx, 1)[0];
      cv[otherCol].push(sec);
      saveCurrentCV(cv);
      renderA4Sheet();
      renderSidebar();
      renderLayoutModalBody();
    },

    reorderSection(col, idx, dir) {
      const cv = getCurrentCV();
      const list = cv[col];
      if (!list) return;
      const target = idx + dir;
      if (target < 0 || target >= list.length) return;
      const temp = list[idx];
      list[idx] = list[target];
      list[target] = temp;
      saveCurrentCV(cv);
      renderA4Sheet();
      renderSidebar();
      renderLayoutModalBody();
    },

    moveSectionPosition(fromCol, fromIdx, toCol, targetIdx, position = "before") {
      const cv = getCurrentCV();
      if (!cv[fromCol] || cv[fromCol][fromIdx] === undefined) return;
      if (fromCol === toCol && fromIdx === targetIdx) return;

      const targetSec = cv[toCol] ? cv[toCol][targetIdx] : null;
      const [sec] = cv[fromCol].splice(fromIdx, 1);
      if (!cv[toCol]) cv[toCol] = [];

      let insertIdx = targetSec ? cv[toCol].indexOf(targetSec) : cv[toCol].length;
      if (position === "after" && insertIdx !== -1) {
        insertIdx++;
      }
      if (insertIdx === -1) insertIdx = cv[toCol].length;

      cv[toCol].splice(insertIdx, 0, sec);
      saveCurrentCV(cv);
      renderA4Sheet();
      renderSidebar();
      renderLayoutModalBody();
    },

    addSection(type) {
      this.addSectionToCol(type, "main");
    },

    addSectionToCol(type, targetCol) {
      const cv = getCurrentCV();
      const newSec = window.RTCV ? window.RTCV.newSection(type) : { type, title: type, items: [] };
      const col = targetCol === "side" ? "side" : "main";
      if (!cv[col]) cv[col] = [];
      cv[col].push(newSec);
      saveCurrentCV(cv);
      renderA4Sheet();
      renderSidebar();
      this.closeModal("addSecModal");
      renderLayoutModalBody();
    },

    removeSection(path) {
      if (!confirm("Remove this section?")) return;
      const cv = getCurrentCV();
      const parts = path.split(".");
      const col = parts[0];
      const idx = parseInt(parts[1], 10);
      if (cv[col]) {
        cv[col].splice(idx, 1);
        saveCurrentCV(cv);
        renderA4Sheet();
        renderSidebar();
        renderLayoutModalBody();
      }
    },

    addEntry(secPath) {
      History.push(getCurrentCV());
      const cv = getCurrentCV();
      const sec = getByPath(cv, secPath);
      if (!sec) return;
      if (!sec.items) sec.items = [];
      const tpl = window.RTCV && window.RTCV.SECTION_TYPES[sec.type] ? window.RTCV.SECTION_TYPES[sec.type].item : {};
      sec.items.unshift(JSON.parse(JSON.stringify(tpl)));
      saveCurrentCV(cv, false);
      renderA4Sheet();
      renderSidebar();
    },

    reorderEntry(secPath, idx, dir) {
      History.push(getCurrentCV());
      const cv = getCurrentCV();
      const sec = getByPath(cv, secPath);
      if (!sec || !Array.isArray(sec.items)) return;
      const target = idx + dir;
      if (target < 0 || target >= sec.items.length) return;
      const [item] = sec.items.splice(idx, 1);
      sec.items.splice(target, 0, item);
      saveCurrentCV(cv, false);
      renderA4Sheet();
      renderSidebar();
    },

    removeEntry(secPath, idx) {
      History.push(getCurrentCV());
      const cv = getCurrentCV();
      const sec = getByPath(cv, secPath);
      if (sec && sec.items) {
        sec.items.splice(idx, 1);
        saveCurrentCV(cv, false);
        renderA4Sheet();
        renderSidebar();
      }
    },

    addBullet(itemPath) {
      History.push(getCurrentCV());
      const cv = getCurrentCV();
      const item = getByPath(cv, itemPath);
      if (!item) return;
      if (!item.bullets) item.bullets = [];
      item.bullets.push("Accomplished [X] by implementing [Y], resulting in [Z].");
      saveCurrentCV(cv, false);
      renderA4Sheet();
      renderSidebar();
    },

    reorderBullet(itemPath, idx, dir) {
      History.push(getCurrentCV());
      const cv = getCurrentCV();
      const item = getByPath(cv, itemPath);
      if (!item || !Array.isArray(item.bullets)) return;
      const target = idx + dir;
      if (target < 0 || target >= item.bullets.length) return;
      const [bul] = item.bullets.splice(idx, 1);
      item.bullets.splice(target, 0, bul);
      saveCurrentCV(cv, false);
      renderA4Sheet();
      renderSidebar();
    },

    removeBullet(itemPath, idx) {
      History.push(getCurrentCV());
      const cv = getCurrentCV();
      const item = getByPath(cv, itemPath);
      if (item && item.bullets) {
        item.bullets.splice(idx, 1);
        saveCurrentCV(cv, false);
        renderA4Sheet();
        renderSidebar();
      }
    },

    reorderSkillChip(itemPath, idx, dir) {
      History.push(getCurrentCV());
      const cv = getCurrentCV();
      const item = getByPath(cv, itemPath);
      if (!item || !Array.isArray(item.items)) return;
      const target = idx + dir;
      if (target < 0 || target >= item.items.length) return;
      const [sk] = item.items.splice(idx, 1);
      item.items.splice(target, 0, sk);
      saveCurrentCV(cv, false);
      renderA4Sheet();
      renderSidebar();
    },

    removeSkillChip(itemPath, idx) {
      History.push(getCurrentCV());
      const cv = getCurrentCV();
      const item = getByPath(cv, itemPath);
      if (!item || !Array.isArray(item.items)) return;
      item.items.splice(idx, 1);
      saveCurrentCV(cv, false);
      renderA4Sheet();
      renderSidebar();
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
        this.addSectionToCol("skills", "main");
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

    // --- Multi-Step Onboarding & CV Import Wizard ---
    openWelcomeModal() {
      const m = $("#welcomeModal");
      if (!m) return;
      initPhotoFileInput();

      // Reset to Step 1
      state.wizardStep = 1;
      state.wizardMode = "upload";
      state.parsedOldCv = null;

      const cv = getCurrentCV();
      state.wizardDraft = {
        photo: cv.photo || "",
        show_photo: cv.show_photo !== false
      };

      // Pre-fill Step 2 from current CV if available
      const P = cv.person || {};
      const nameIn = $("#wizNameInput"); if (nameIn && P.name) nameIn.value = P.name;
      const titleIn = $("#wizTitleInput"); if (titleIn && P.title) titleIn.value = P.title;
      const emailIn = $("#wizEmailInput"); if (emailIn && P.email) emailIn.value = P.email;
      const phoneIn = $("#wizPhoneInput"); if (phoneIn && P.phone) phoneIn.value = P.phone;
      const locIn = $("#wizLocationInput"); if (locIn && P.location) locIn.value = P.location;
      const sumIn = $("#wizSummaryInput"); if (sumIn && P.summary) sumIn.value = P.summary;

      this.goToWizardStep(1);
      this.setWizardMode("upload");
      updateWizardPhotoUI();

      m.classList.add("open");
    },

    goToWizardStep(step) {
      state.wizardStep = step;

      // Update step progress pills
      for (let i = 1; i <= 3; i++) {
        const pill = $(`#wizStepPill${i}`);
        if (pill) {
          pill.classList.toggle("active", i === step);
          pill.classList.toggle("done", i < step);
        }
      }

      // Toggle views
      const v1 = $("#wizView1"); if (v1) v1.classList.toggle("active", step === 1);
      const v2 = $("#wizStep2"); if (v2) v2.classList.toggle("active", step === 2);
      const v3 = $("#wizStep3"); if (v3) v3.classList.toggle("active", step === 3);

      if (step === 2) {
        updateWizardPhotoUI();
      }
    },

    setWizardMode(mode) {
      state.wizardMode = mode;
      const upCard = $("#wizModeUploadCard");
      const scCard = $("#wizModeScratchCard");
      const upArea = $("#wizUploadArea");
      const nextBtn = $("#wizStep1NextBtn");

      if (upCard) upCard.classList.toggle("active", mode === "upload");
      if (scCard) scCard.classList.toggle("active", mode === "scratch");
      if (upArea) upArea.style.display = mode === "upload" ? "flex" : "none";

      if (nextBtn) {
        if (mode === "scratch") {
          nextBtn.textContent = "המשך לפרטים אישיים ותמונה →";
          nextBtn.onclick = () => window.CVE.goToWizardStep(2);
        } else {
          if (state.parsedOldCv) {
            nextBtn.textContent = "המשך לבחירת עיצוב ולייאאוט →";
            nextBtn.onclick = () => window.CVE.goToWizardStep(3);
          } else {
            nextBtn.textContent = "המשך לשלב הבא →";
            nextBtn.onclick = () => window.CVE.goToWizardStep(2);
          }
        }
      }
    },

    triggerOldCvFilePick() {
      const fi = $("#wizCvFileInput");
      if (fi) fi.click();
    },

    async onOldCvFileSelected(file) {
      if (!file) return;
      const dz = $("#wizDropzone");
      const prevTitle = dz ? dz.querySelector(".cve-dropzone-title") : null;
      if (prevTitle) prevTitle.textContent = `⏳ קורא את ${file.name} ומחלץ נתונים...`;

      try {
        let text = "";
        if (/\.pdf$/i.test(file.name)) {
          text = await extractPdfText(file);
        } else {
          text = await file.text();
        }

        if (!text || text.trim().length < 40) {
          alert("לא הצלחנו לחלץ מספיק טקסט מהקובץ. נסה להדביק את הטקסט בתיבה למטה.");
          if (prevTitle) prevTitle.textContent = "לחץ כאן לבחירת קובץ קורות חיים ישן (PDF / TXT)";
          return;
        }

        this.applyParsedCvText(text, file.name);
      } catch (err) {
        alert("שגיאה בפענוח הקובץ: " + (err.message || err));
        if (prevTitle) prevTitle.textContent = "לחץ כאן לבחירת קובץ קורות חיים ישן (PDF / TXT)";
      }
    },

    parsePastedText() {
      const ta = $("#wizPasteTextarea");
      const text = ta ? ta.value.trim() : "";
      if (text.length < 30) {
        alert("אנא הדבק טקסט קורות חיים מלא יותר.");
        return;
      }
      this.applyParsedCvText(text, "טקסט שהודבק");
    },

    applyParsedCvText(text, sourceLabel) {
      const parsed = parseCvText(text);
      if (!parsed) {
        alert("לא הצלחנו לזהות מבנה קורות חיים בטקסט.");
        return;
      }
      state.parsedOldCv = parsed;

      // Update Preview Box
      const prevBox = $("#wizExtractPreview");
      const summaryBox = $("#wizExtractSummary");
      const pillsBox = $("#wizExtractPills");

      if (prevBox) prevBox.style.display = "flex";
      if (summaryBox) {
        summaryBox.innerHTML = `
          <b>מקור: ${esc(sourceLabel)}</b><br>
          👤 שם: <b>${esc(parsed.person.name)}</b> ${parsed.person.title ? `| כותרת: <b>${esc(parsed.person.title)}</b>` : ""}<br>
          📞 פרטי קשר: ${esc(parsed.person.email || "—")} | ${esc(parsed.person.phone || "—")}
        `;
      }
      if (pillsBox) {
        pillsBox.innerHTML = `
          <span class="cve-extract-pill">💼 ${parsed._extractedCount.experiences} משרות שזוהו</span>
          <span class="cve-extract-pill">🎓 ${parsed._extractedCount.education} מוסדות השכלה</span>
          <span class="cve-extract-pill">🛠️ ${parsed._extractedCount.skills} מיומנויות</span>
          <span class="cve-extract-pill">🌐 ${parsed.dir === "rtl" ? "עברית (RTL)" : "English (LTR)"}</span>
        `;
      }

      // Pre-fill Step 2 fields
      const P = parsed.person;
      const nameIn = $("#wizNameInput"); if (nameIn && P.name) nameIn.value = P.name;
      const titleIn = $("#wizTitleInput"); if (titleIn && P.title) titleIn.value = P.title;
      const emailIn = $("#wizEmailInput"); if (emailIn && P.email) emailIn.value = P.email;
      const phoneIn = $("#wizPhoneInput"); if (phoneIn && P.phone) phoneIn.value = P.phone;
      const locIn = $("#wizLocationInput"); if (locIn && P.location) locIn.value = P.location;
      const sumIn = $("#wizSummaryInput"); if (sumIn && P.summary) sumIn.value = P.summary;

      // Select direction in wizard
      this.selectWizardDir(parsed.dir);

      const nextBtn = $("#wizStep1NextBtn");
      if (nextBtn) {
        nextBtn.textContent = "מעולה, המשך לבחירת עיצוב ולייאאוט →";
        nextBtn.onclick = () => window.CVE.goToWizardStep(3);
      }
    },

    selectWizardTemplate(tpl) {
      state.wizardTemplate = tpl;
      $$(".cve-tpl-card").forEach(c => {
        c.classList.toggle("active", c.getAttribute("data-tpl") === tpl);
      });
    },

    selectWizardDir(dir) {
      state.wizardDir = dir;
      const ltrBtn = $("#wizLangLtr");
      const rtlBtn = $("#wizLangRtl");
      if (ltrBtn) ltrBtn.classList.toggle("active", dir === "ltr");
      if (rtlBtn) rtlBtn.classList.toggle("active", dir === "rtl");
    },

    selectWizardAccent(color) {
      state.wizardAccent = color;
      $$(".cve-color-swatch").forEach(s => {
        s.classList.toggle("active", s.getAttribute("data-color") === color);
      });
    },

    openPhotoPicker(target = "activeCv") {
      state.photoPickerTarget = target;
      initPhotoFileInput();
      const fi = $("#cvePhotoFileInput");
      if (fi) fi.click();
    },

    removeWizardPhoto() {
      state.wizardDraft.photo = "";
      state.wizardDraft.show_photo = false;
      updateWizardPhotoUI();
    },

    removeCurrentPhoto() {
      const cv = getCurrentCV();
      cv.photo = "";
      cv.show_photo = false;
      saveCurrentCV(cv);
      renderA4Sheet();
      renderSidebar();
    },

    toggleWizardPhoto(show) {
      state.wizardDraft.show_photo = show;
    },

    finishWizardAndLaunch() {
      const name = ($("#wizNameInput") && $("#wizNameInput").value.trim()) || "Your Name";
      const title = ($("#wizTitleInput") && $("#wizTitleInput").value.trim()) || "";
      const email = ($("#wizEmailInput") && $("#wizEmailInput").value.trim()) || "";
      const phone = ($("#wizPhoneInput") && $("#wizPhoneInput").value.trim()) || "";
      const location = ($("#wizLocationInput") && $("#wizLocationInput").value.trim()) || "";
      const link = ($("#wizLinkInput") && $("#wizLinkInput").value.trim()) || "";
      const summary = ($("#wizSummaryInput") && $("#wizSummaryInput").value.trim()) || "";

      const tpl = state.wizardTemplate || "novo";
      const dir = state.wizardDir || "rtl";
      const accent = state.wizardAccent || "#2a8a8f";

      let targetCv;

      if (state.parsedOldCv) {
        targetCv = JSON.parse(JSON.stringify(state.parsedOldCv));
        // Apply any overrides from Step 2
        if (name) targetCv.person.name = name;
        if (title) targetCv.person.title = title;
        if (email) targetCv.person.email = email;
        if (phone) targetCv.person.phone = phone;
        if (location) targetCv.person.location = location;
        if (summary) targetCv.person.summary = summary;
        if (link && !targetCv.person.links.some(l => l.url === link)) {
          targetCv.person.links.push({ label: "Portfolio", url: link });
        }
      } else {
        // Built from scratch
        targetCv = window.RTCV ? window.RTCV.blank(name) : JSON.parse(JSON.stringify(ROEE_DEFAULT_CV));
        targetCv.person.name = name;
        targetCv.person.title = title;
        targetCv.person.email = email;
        targetCv.person.phone = phone;
        targetCv.person.location = location;
        targetCv.person.summary = summary;
        if (link) targetCv.person.links = [{ label: "Portfolio", url: link }];

        if (dir === "rtl") {
          targetCv.main = [
            {
              type: "experience",
              title: "ניסיון מקצועי",
              items: [{ role: title || "מפתח תוכנה", org: "חברה", dates: "2021 – כיום", location: location || "תל אביב", about: "", label: "", bullets: ["פיתוח מערכות ליבה, הובלת פרויקטים ושיפור ביצועים.", "עבודה במתודולוגיות Agile מול צוותים רב-תחומיים."] }]
            },
            {
              type: "education",
              title: "השכלה",
              items: [{ degree: "תואר ראשון במדעי המחשב / הנדסה", school: "מוסד אקדמי", dates: "2017 – 2020", location: "", about: "", label: "קורסים", bullets: [] }]
            }
          ];
          targetCv.side = [
            {
              type: "skills",
              title: "מיומנויות וכלים",
              items: [{ label: "טכנולוגיות", items: ["JavaScript", "Python", "React", "Git", "Docker"] }]
            },
            {
              type: "languages",
              title: "שפות",
              items: [{ name: "עברית", level: "שפת אם" }, { name: "אנגלית", level: "רמה גבוהה" }]
            }
          ];
        }
      }

      targetCv.label = `${name} - Résumé`;
      targetCv.template = tpl;
      targetCv.dir = dir;
      targetCv.lang = dir === "rtl" ? "he" : "en";
      targetCv.font = dir === "rtl" ? "Rubik" : "Inter";
      targetCv.accent = accent;
      targetCv.photo = state.wizardDraft.photo || targetCv.photo || "";
      targetCv.show_photo = state.wizardDraft.show_photo;

      if (!state.vault[state.activeOwnerId]) state.vault[state.activeOwnerId] = {};
      state.vault[state.activeOwnerId][state.activeCvId] = targetCv;

      if (state.activeOwnerId === "guest") {
        localStorage.setItem("cve_draft_cv", JSON.stringify(targetCv));
      } else {
        Storage.saveVault();
      }

      this.closeModal("welcomeModal");
      renderA4Sheet();
      renderSidebar();
    },

    // --- Mandatory Save Gate Modal ---
    openMandatorySaveModal() {
      const m = $("#mandatorySaveModal");
      if (m) {
        const cv = getCurrentCV();
        const P = cv.person || {};
        const emailInput = $("#mandEmailInput");
        if (emailInput && P.email) emailInput.value = P.email;
        m.classList.add("open");
      }
    },

    async submitMandatorySave() {
      const email = $("#mandEmailInput").value.trim();
      const pass = $("#mandPassInput").value.trim();
      const err = $("#mandSaveError");
      const cv = getCurrentCV();
      const P = cv.person || {};
      const name = P.name || "Your Name";

      if (!email || !pass) {
        if (err) err.textContent = "Please enter your email and choose a password.";
        return;
      }
      if (!/^\S+@\S+\.\S+$/.test(email)) {
        if (err) err.textContent = "Please enter a valid email address.";
        return;
      }

      try {
        let user;
        const existing = state.allUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
        if (existing) {
          user = await Storage.login(email, pass);
        } else {
          user = await Storage.register(email, name, pass);
        }

        // Bind draft to newly registered user
        P.email = email;
        state.vault[user.id] = { "my-cv": cv };
        state.activeOwnerId = user.id;
        state.activeCvId = "my-cv";
        Storage.saveVault();
        localStorage.removeItem("cve_draft_cv");

        // Send to Email flow
        const plain = window.RTCV ? window.RTCV.plainText(cv) : "";
        const subject = encodeURIComponent(`${name} — Résumé & Online CV`);
        const body = encodeURIComponent(`Hi ${name},\n\nYour résumé has been saved to your CV Studio account on roeetal.com!\n\nYou can access, edit and share your CV anytime here:\nhttps://roeetal.com/CVEditor\n\n------------------------------\n${plain}`);

        // Trigger mail client or toast
        location.href = `mailto:${email}?subject=${subject}&body=${body}`;

        this.closeModal("mandatorySaveModal");
        renderA4Sheet();
        renderSidebar();

        alert(`✓ Résumé successfully saved to your account and sent to ${email}!`);

        if (state.pendingAction) {
          const action = state.pendingAction;
          state.pendingAction = null;
          action();
        }
      } catch (e) {
        if (err) err.textContent = e.message;
      }
    },

    // --- Action Handlers (Save, PDF, Email, Collab) ---
    saveAction() {
      const cv = getCurrentCV();
      saveCurrentCV(cv);
      Storage.saveVault();
      showSaveIndicator("✓ Saved locally!");
    },

    printPdf() {
      window.print();
    },

    openEmailModal() {
      const m = $("#emailModal");
      if (m) {
        const cv = getCurrentCV();
        const plain = window.RTCV ? window.RTCV.plainText(cv) : "";
        const P = cv.person || {};
        const subjectInput = $("#emailSubjectInput");
        const preview = $("#emailBodyPreview");
        if (subjectInput) subjectInput.value = `${P.name || "My"} — Résumé / CV`;
        if (preview) preview.value = `Hi,\n\nPlease find my résumé (${P.title || "Game Developer"}).\n\nLive online version: https://roeetal.com/CVEditor\n\n${plain}`;
        m.classList.add("open");
      }
    },

    openCollabModal() {
      const m = $("#collabModal");
      if (m) {
        m.classList.add("open");
        if (!state.peer) initCollab();
        else updateCollabModalUI();
      }
    },

    // --- Modals ---
    openLayoutModal() {
      const m = $("#layoutModal");
      if (m) {
        m.classList.add("open");
        renderLayoutModalBody();
      }
    },

    openAddSectionModal(targetCol = "main") {
      const m = $("#addSecModal");
      if (m) {
        m.classList.add("open");
        renderAddSectionModalBody(targetCol);
      }
    },

    openAtsModal() {
      const m = $("#atsModal");
      if (m) {
        m.classList.add("open");
        runAtsJobAnalysis();
        const pt = $("#atsPlainTextInspector");
        if (pt && window.RTCV) {
          pt.textContent = window.RTCV.plainText(getCurrentCV());
        }
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
      const user = state.currentUser ? state.currentUser.name : "Friend";
      const subject = encodeURIComponent(`${user} invited you to collaborate on a CV`);
      const body = encodeURIComponent(`Hey,\n\nI'm working on my CV on roeetal.com/CVEditor and would love your collaboration!\n\nJoin my live session here:\n${link}`);
      location.href = `mailto:?subject=${subject}&body=${body}`;
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
          title: `${P.name || "My"} — Résumé`,
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

    async loginSubmit() {
      const email = $("#loginEmail").value;
      const pass = $("#loginPass").value;
      const err = $("#authError");
      try {
        await Storage.login(email, pass);
        if (err) err.textContent = "";
        this.closeModal("authModal");
        this.closeModal("welcomeModal");
        renderA4Sheet();
        renderSidebar();
      } catch (e) {
        if (err) err.textContent = e.message;
      }
    },

    async registerSubmit() {
      const email = $("#regEmail").value;
      const name = $("#regName").value;
      const pass = $("#regPass").value;
      const err = $("#authError");
      try {
        await Storage.register(email, name, pass);
        if (err) err.textContent = "";
        this.closeModal("authModal");
        this.closeModal("welcomeModal");
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

    closeModal(modalId) {
      const m = document.getElementById(modalId);
      if (m) m.classList.remove("open");
    }
  };

  // Global Hotkeys (Ctrl+Z, Ctrl+Y, Ctrl+B)
  window.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
      if (e.shiftKey) {
        e.preventDefault();
        window.CVE.redo();
      } else {
        e.preventDefault();
        window.CVE.undo();
      }
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
      e.preventDefault();
      window.CVE.redo();
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
      e.preventDefault();
      window.CVE.toggleSidebar();
    }
  });

  window.addEventListener("DOMContentLoaded", () => {
    window.CVE.init();
  });

})(window, document);
