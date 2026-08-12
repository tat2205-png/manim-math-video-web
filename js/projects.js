const KEY = "manim_math_web_v150a_projects";
const SETTINGS_KEY = "manim_math_web_v150a_settings";

export function loadProjects() {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); }
  catch { return []; }
}
export function saveProjects(rows) { localStorage.setItem(KEY, JSON.stringify(rows)); }
export function clearProjects() { localStorage.removeItem(KEY); }
export function loadSettings() {
  try {
    return Object.assign({ simpleMode:true, demoMode:true, apiBaseUrl:"" },
      JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}"));
  } catch {
    return { simpleMode:true, demoMode:true, apiBaseUrl:"" };
  }
}
export function saveSettings(settings) { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); }
export function nowText() {
  return new Intl.DateTimeFormat("vi-VN", { dateStyle:"short", timeStyle:"medium" }).format(new Date());
}
export function createProject(source = "demo.docx", name = "") {
  const id = `PRJ_WEB_${Date.now()}_${Math.floor(Math.random()*1000)}`;
  return {
    id,
    name: name || source.replace(/\.[^.]+$/, ""),
    source,
    mode:"document",
    status:"WAITING_SOLVER",
    stage:"SOLVER",
    progress:10,
    updated:nowText(),
    stopped:false,
    questions:[
      {file:"cau_01.py", status:"WAITING", qa:"—", preview:"—", final:"—"},
      {file:"cau_02.py", status:"WAITING", qa:"—", preview:"—", final:"—"},
      {file:"cau_03.py", status:"WAITING", qa:"—", preview:"—", final:"—"}
    ]
  };
}
export function setDemoStage(project, target) {
  const p = structuredClone(project);
  if (target === "qa") {
    p.status="CODE_READY"; p.stage="QA"; p.progress=40;
    p.questions.forEach(q=>{q.status="CODE_READY";q.qa="PENDING"});
  } else if (target === "preview") {
    p.status="CODE_READY"; p.stage="PREVIEW"; p.progress=55;
    p.questions.forEach(q=>{q.status="QA_PASS";q.qa="PASS";q.preview="PENDING"});
  } else if (target === "review") {
    p.status="REVIEW_REQUIRED"; p.stage="PREVIEW"; p.progress=75;
    p.questions.forEach(q=>{q.status="PREVIEW_OK";q.qa="PASS";q.preview="PREVIEW_OK"});
  } else if (target === "final") {
    p.status="APPROVED"; p.stage="APPROVAL"; p.progress=82;
    p.questions.forEach(q=>{q.status="APPROVED";q.qa="PASS";q.preview="PREVIEW_OK"});
  }
  p.updated=nowText();
  return p;
}
