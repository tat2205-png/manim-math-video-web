import { ApiClient } from "./api.js";
import { initUpload } from "./upload.js";

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

const SETTINGS_KEY = "manim_math_web_v150_settings";
const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");

const api = new ApiClient(
  saved.apiBaseUrl
  || window.MANIM_WEB_CONFIG?.apiBaseUrl
  || ""
);

let projects = [];
let selectedId = "";
let pendingFiles = [];
let pollTimer = null;

const canonicalProgress = {
  CREATED:5,
  WAITING_SOLVER:10,
  SOLVER_WORKING:25,
  CODE_READY:40,
  QA_RUNNING:48,
  QA_PASS:55,
  PREVIEW_RUNNING:65,
  REVIEW_REQUIRED:75,
  REPAIR_REQUIRED:75,
  NEEDS_HUMAN:75,
  APPROVED:82,
  PRODUCTION_RUNNING:93,
  FINAL_READY:98,
  COMPLETE:100,
  FAILED:0,
  STOPPED:0
};

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  })[c]);
}

function toast(message) {
  const el = $("#toast");
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => el.classList.remove("show"), 2600);
}

function selected() {
  return projects.find(p => p.project_id === selectedId) || null;
}

function navigate(name) {
  $$(".tab").forEach(t => t.classList.toggle("active", t.dataset.nav === name));
  $$(".view").forEach(v => v.classList.toggle("active", v.id === `view-${name}`));
}

$$("[data-nav]").forEach(b => b.addEventListener("click", () => navigate(b.dataset.nav)));

function saveSettings() {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify({
    apiBaseUrl: api.baseUrl
  }));
}

function pairedUi() {
  const paired = api.paired;
  $("#sessionStatus").textContent = paired
    ? "Đã pair · session chỉ lưu trong tab/trình duyệt hiện tại."
    : "Chưa pair.";
  $("#engineStatus").className = paired ? "status-pill ok" : "status-pill offline";
  $("#engineStatus").innerHTML = paired
    ? "<span></span> Engine PAIRED"
    : "<span></span> Engine OFFLINE";
}

async function health() {
  if (!api.baseUrl) {
    toast("Hãy nhập API Base URL.");
    navigate("settings");
    return;
  }
  try {
    const data = await api.health();
    toast(`${data.service} · ${data.version} READY`);
  } catch (e) {
    toast(`Gateway: ${e.message}`);
  }
}

async function pair() {
  const url = $("#apiBaseInput").value.trim().replace(/\/+$/, "");
  const code = $("#pairCodeInput").value.trim();
  if (!url || !/^\d{6}$/.test(code)) {
    toast("Nhập Public Web API URL và Pairing Code 6 chữ số.");
    return;
  }
  api.setBaseUrl(url);
  saveSettings();

  try {
    const data = await api.pair(code);
    pairedUi();
    toast(`Pair thành công · session ${data.expires_hours} giờ`);
    await refreshProjects();
    navigate("projects");
    startPolling();
  } catch (e) {
    toast(`Pair thất bại: ${e.message}`);
  }
}

function disconnect() {
  api.setToken("");
  pairedUi();
  projects = [];
  selectedId = "";
  renderAll();
  toast("Đã ngắt session Web.");
}

async function refreshProjects() {
  if (!api.paired || !api.baseUrl) return;
  try {
    const data = await api.projects();
    projects = data.projects || [];
    if (selectedId && !projects.some(p => p.project_id === selectedId)) {
      selectedId = "";
    }
    if (!selectedId && projects.length) selectedId = projects[0].project_id;
    renderAll();
  } catch (e) {
    if (/Session invalid|401/i.test(e.message)) disconnect();
  }
}

function startPolling() {
  clearInterval(pollTimer);
  pollTimer = setInterval(refreshProjects, 2000);
}

function stateOf(p) {
  return String(p?.canonical_state || p?.status || "CREATED").toUpperCase();
}

function contextFor(p) {
  if (!api.paired) {
    return {
      title:"Kết nối Desktop Engine",
      message:"Vào Settings → nhập Public Web API URL → Pairing Code.",
      primary:"🔐 MỞ SETTINGS",
      key:"settings",
      enabled:true,
      secondary:""
    };
  }
  if (!p) {
    return {
      title:"Tạo video từ đề bài",
      message:"Chọn Word/PDF/ảnh rồi bấm Turbo.",
      primary:"🚀 TURBO — TẠO VIDEO",
      key:"upload",
      enabled:true,
      secondary:""
    };
  }

  const s = stateOf(p);
  const map = {
    WAITING_SOLVER:["Đang chờ Solver","Copy Solver Prompt hoặc mở Solver trên Desktop.","🧠 SOLVER PROMPT","solver"],
    SOLVER_WORKING:["Solver đang xử lý","Chờ Custom GPT submit code về Desktop Engine.","⏳ SOLVER ĐANG CHẠY","noop"],
    CODE_READY:["Code đã sẵn sàng","Desktop auto pipeline sẽ chạy QA.","✓ CODE READY","noop"],
    QA_RUNNING:["Quality Gate đang chạy","QA song song đang kiểm tra code.","⏳ QA","noop"],
    QA_PASS:["QA PASS","Desktop sẽ tạo Preview.","▶ CHỜ PREVIEW","noop"],
    PREVIEW_RUNNING:["Đang tạo Preview","Chờ Preview hoàn tất.","⏳ PREVIEW","noop"],
    REVIEW_REQUIRED:["Cần Human Review","Xem từng Preview rồi Approve hoặc Repair.","✓ MỞ REVIEW","review"],
    REPAIR_REQUIRED:["Automatic Repair","Mở Solver Repair từ Desktop/Custom GPT.","🛠 SOLVER REPAIR","solver"],
    NEEDS_HUMAN:["Cần can thiệp","Automatic Repair đã dừng ở NEEDS_HUMAN.","⚠ XEM PROJECT","questions"],
    APPROVED:["Đã duyệt","Sẵn sàng Parallel Full HD + Smart Merge.","⚡ XUẤT FULL HD","production"],
    PRODUCTION_RUNNING:["Đang Production","Full HD + Smart Merge đang chạy.","⏳ FULL HD","dashboard"],
    FINAL_READY:["Final gần hoàn tất","Nạp lại trạng thái Final.","↻ REFRESH","refresh"],
    COMPLETE:["Hoàn tất","Final MP4 đã sẵn sàng.","▶ XEM FINAL","final"],
    FAILED:["Pipeline lỗi","Automatic Repair sẽ xử lý hoặc chuyển NEEDS_HUMAN.","🛠 XEM TRẠNG THÁI","questions"],
    STOPPED:["Project đã dừng","Có thể tiếp tục Project từ Web.","↻ TIẾP TỤC","resume"]
  };
  const row = map[s] || ["Project","Theo dõi trạng thái Desktop Engine.","MỞ PROJECT","questions"];
  return {title:row[0],message:row[1],primary:row[2],key:row[3],enabled:row[3] !== "noop",secondary:""};
}

function progressInfo(p) {
  const s = stateOf(p);
  const value = canonicalProgress[s] ?? Number(p?.state_percent || 0);
  const done = [];
  if (value >= 5) done.push("input");
  if (value >= 40) done.push("solver","code");
  else if (value >= 10) done.push("solver");
  if (value >= 55) done.push("qa");
  if (value >= 75) done.push("preview");
  if (value >= 82) done.push("review");
  if (value >= 100) done.push("final");
  return {value,done,next:p?.state_next_action || "Tiếp tục"};
}

function renderMetrics() {
  const states = projects.map(stateOf);
  $("#mProjects").textContent = projects.length;
  $("#mSolver").textContent = states.filter(s => ["WAITING_SOLVER","SOLVER_WORKING"].includes(s)).length;
  $("#mQA").textContent = states.filter(s => ["CODE_READY","QA_RUNNING","QA_PASS"].includes(s)).length;
  $("#mPreview").textContent = states.filter(s => ["PREVIEW_RUNNING","REVIEW_REQUIRED"].includes(s)).length;
  $("#mApproved").textContent = states.filter(s => ["APPROVED","PRODUCTION_RUNNING"].includes(s)).length;
  $("#mFinal").textContent = states.filter(s => ["FINAL_READY","COMPLETE"].includes(s)).length;
}

function renderProjects() {
  const body = $("#projectTableBody");
  body.innerHTML = projects.map((p,i) => `
    <tr data-project-id="${escapeHtml(p.project_id)}" class="${p.project_id===selectedId?"selected":""}">
      <td>${i+1}</td>
      <td>${escapeHtml(p.name || p.project_id)}</td>
      <td>${escapeHtml(p.source_name || "")}</td>
      <td>${escapeHtml(p.mode || "")}</td>
      <td>${escapeHtml(stateOf(p))}</td>
      <td>${escapeHtml(p.current_stage || "")}</td>
      <td>${escapeHtml(p.updated_at || "")}</td>
    </tr>`).join("");

  $("#emptyProjects").classList.toggle("hidden", projects.length > 0);
  body.querySelectorAll("tr").forEach(tr => tr.onclick = async () => {
    selectedId = tr.dataset.projectId;
    renderAll();
    await loadSolverPrompt(false);
    if (stateOf(selected()) === "REVIEW_REQUIRED") await renderReview();
  });
}

function renderQuestions() {
  const root = $("#questionCards");
  const p = selected();
  if (!p) {
    root.innerHTML = '<div class="empty-state"><p>Chọn Project trước.</p></div>';
    return;
  }
  const qs = p.questions || [];
  root.innerHTML = qs.length ? qs.map((q,i) => `
    <article class="question-card">
      <h3>Câu ${q.question ?? i+1}</h3>
      <dl>
        <dt>File</dt><dd>${escapeHtml(q.file)}</dd>
        <dt>Status</dt><dd>${escapeHtml(q.status)}</dd>
        <dt>QA</dt><dd>${escapeHtml(q.qa)}</dd>
        <dt>Preview</dt><dd>${escapeHtml(q.preview)}</dd>
        <dt>Final</dt><dd>${q.final_ready ? "READY" : "—"}</dd>
      </dl>
    </article>`).join("") : '<div class="empty-state"><p>Chưa có câu đã sinh code.</p></div>';
}

function renderContext() {
  const p = selected();
  const c = contextFor(p);
  $("#contextTitle").textContent = c.title;
  $("#pipelineTitle").textContent = c.title;
  $("#contextMessage").textContent = c.message;
  $("#pipelineMessage").textContent = c.message;
  $("#contextPrimary").textContent = c.primary;
  $("#quickPrimary").textContent = c.primary;
  $("#contextPrimary").disabled = !c.enabled;
  $("#quickPrimary").disabled = !c.enabled;
  $("#contextEyebrow").textContent = p ? stateOf(p) : (api.paired ? "SẴN SÀNG" : "SECURE PAIRING");

  const pi = progressInfo(p);
  $("#progressBar").style.width = `${pi.value}%`;
  $("#progressText").textContent = `${pi.value}%`;
  $("#nextStep").textContent = `Bước tiếp theo: ${pi.next}`;
  $("#projectStateLine").textContent = p
    ? `${p.name || p.project_id} | ${stateOf(p)} | Stage: ${p.current_stage || "—"}`
    : "Chưa có Project đang chọn.";

  $$("#timeline span").forEach(el => {
    el.classList.toggle("done", pi.done.includes(el.dataset.step));
  });

  const s = stateOf(p);
  const stopEnabled = Boolean(p && !["COMPLETE","STOPPED"].includes(s));
  const resumeEnabled = Boolean(p && s === "STOPPED");
  ["#stopBtn","#sideStopBtn"].forEach(sel => $(sel).disabled = !stopEnabled);
  ["#resumeBtn","#sideResumeBtn"].forEach(sel => $(sel).disabled = !resumeEnabled);
  $("#controlStatus").textContent = p
    ? `${stateOf(p)} · ${p.state_reason || p.state_next_action || ""}`
    : "Không có Project đang chọn.";
  $("#loadFinalBtn").disabled = !(p && ["FINAL_READY","COMPLETE"].includes(s));
}

async function renderReview() {
  const root = $("#reviewQuestions");
  const p = selected();
  if (!p || !api.paired) {
    root.innerHTML = '<p class="muted">Chọn Project REVIEW_REQUIRED.</p>';
    return;
  }
  try {
    const data = await api.review(p.project_id);
    root.innerHTML = (data.rows || []).map((row,i) => `
      <div class="review-item">
        <strong>Câu ${row.question ?? i+1}</strong>
        <p class="muted">${escapeHtml(row.file)} · QA ${escapeHtml(row.qa)} · ${escapeHtml(row.preview)}</p>
        <p><b>${escapeHtml(row.decision)}</b></p>
        <div class="row">
          <button class="btn btn-soft" data-preview="${escapeHtml(row.file)}">Xem Preview</button>
          <button class="btn btn-success" data-decision="APPROVED" data-file="${escapeHtml(row.file)}">Approve</button>
          <button class="btn btn-soft" data-decision="REPAIR" data-file="${escapeHtml(row.file)}">Repair</button>
        </div>
      </div>`).join("");

    root.querySelectorAll("[data-preview]").forEach(btn => btn.onclick = () => loadPreview(btn.dataset.preview));
    root.querySelectorAll("[data-decision]").forEach(btn => btn.onclick = () => reviewDecision(btn.dataset.file, btn.dataset.decision));
  } catch (e) {
    root.innerHTML = `<p class="muted">${escapeHtml(e.message)}</p>`;
  }
}

async function renderDashboard() {
  const p = selected();
  if (!p) return;
  $("#dashboardPhase").textContent = stateOf(p);
  $("#dProgress").textContent = `${canonicalProgress[stateOf(p)] ?? p.state_percent ?? 0}%`;
  try {
    const data = await api.performance(p.project_id);
    const perf = data.performance || {};
    const prod = perf.production_cache || {};
    $("#dCache").textContent = `${prod.render_cache_hits || 0} HIT`;
    $("#dWorkers").textContent = "Resource-aware";
    $("#dEta").textContent = "Profiler";
    $("#productionList").innerHTML = (perf.stages || []).slice(0,8).map(r =>
      `<div class="production-row"><strong>${escapeHtml(r.stage)}</strong><span>${r.runs} run</span><span>${r.avg_s}s avg</span><span>${r.success_rate}%</span></div>`
    ).join("");
  } catch {
    $("#productionList").innerHTML = "";
  }
}

function renderAll() {
  renderMetrics();
  renderProjects();
  renderQuestions();
  renderContext();
  if (stateOf(selected()) === "REVIEW_REQUIRED") renderReview();
  renderDashboard();
}

async function waitCommand(commandId, timeoutMs=180000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const data = await api.command(commandId);
    const row = data.command || {};
    if (row.status === "COMPLETED") return row.result || {};
    if (row.status === "FAILED") throw new Error(row.error || "Desktop command failed");
    await new Promise(r => setTimeout(r, 700));
  }
  throw new Error("Desktop command timeout");
}

async function uploadTurbo() {
  if (!api.paired) { navigate("settings"); toast("Pair Desktop trước."); return; }
  if (!pendingFiles.length) { toast("Hãy chọn file đề."); return; }
  const file = pendingFiles[0];
  try {
    $("#fileHint").textContent = `Đang upload ${file.name}...`;
    const up = await api.upload(file);
    toast("Đã upload. Desktop đang tạo Project...");
    const result = await waitCommand(up.command_id);
    selectedId = result.project_id || "";
    $("#solverPromptBox").value = result.solver_prompt || "";
    pendingFiles = [];
    $("#fileHint").textContent = "Đã tạo Project.";
    $("#addQueueBtn").disabled = true;
    await refreshProjects();
    navigate("settings");
    toast("Project đã tạo · copy Solver Prompt.");
  } catch (e) {
    $("#fileHint").textContent = file.name;
    toast(`Upload/Turbo lỗi: ${e.message}`);
  }
}

async function projectAction(action) {
  const p = selected();
  if (!p) return;
  try {
    const cmd = await api.action(p.project_id, action);
    const result = await waitCommand(cmd.command_id);
    if (result.solver_prompt) $("#solverPromptBox").value = result.solver_prompt;
    toast(`${action} OK`);
    await refreshProjects();
  } catch (e) {
    toast(`${action}: ${e.message}`);
  }
}

async function reviewDecision(file, decision) {
  const p = selected();
  if (!p) return;
  try {
    const cmd = await api.reviewDecision(p.project_id, file, decision);
    await waitCommand(cmd.command_id);
    toast(`${file}: ${decision}`);
    await refreshProjects();
    await renderReview();
  } catch (e) {
    toast(`Review: ${e.message}`);
  }
}

async function loadPreview(file) {
  const p = selected();
  if (!p) return;
  try {
    const ticket = await api.mediaTicket(p.project_id, "preview", file);
    $("#previewPlayer").src = api.mediaUrl(ticket.media_path);
    $("#previewPlayerLabel").textContent = file;
    $("#previewPlayer").play().catch(() => {});
  } catch (e) {
    toast(`Preview: ${e.message}`);
  }
}

async function loadFinal() {
  const p = selected();
  if (!p) return;
  try {
    const ticket = await api.mediaTicket(p.project_id, "final", "");
    $("#finalPlayer").src = api.mediaUrl(ticket.media_path);
    $("#finalVideoTitle").textContent = `${p.name || p.project_id} — Final`;
    $("#finalVideoMessage").textContent = "Final MP4 từ Desktop Engine.";
    $("#finalPlayer").play().catch(() => {});
    navigate("video");
  } catch (e) {
    toast(`Final: ${e.message}`);
  }
}

async function loadSolverPrompt(showToast=true) {
  const p = selected();
  if (!p || !api.paired) return;
  try {
    const data = await api.solverPrompt(p.project_id);
    $("#solverPromptBox").value = data.prompt || "";
    if (showToast) toast(data.prompt ? "Đã nạp Solver Prompt." : "Task chưa có Prompt.");
  } catch (e) {
    if (showToast) toast(e.message);
  }
}

async function runContext() {
  const c = contextFor(selected());
  switch (c.key) {
    case "settings": navigate("settings"); break;
    case "upload": await uploadTurbo(); break;
    case "solver": await loadSolverPrompt(); navigate("settings"); break;
    case "review": navigate("review"); await renderReview(); break;
    case "production": await projectAction("PRODUCTION"); break;
    case "dashboard": navigate("dashboard"); await renderDashboard(); break;
    case "final": await loadFinal(); break;
    case "resume": await projectAction("RESUME"); break;
    case "questions": navigate("questions"); break;
    case "refresh": await refreshProjects(); break;
  }
}

$("#contextPrimary").onclick = runContext;
$("#quickPrimary").onclick = runContext;
$("#contextSecondary").classList.add("hidden");
$("#quickSecondary").classList.add("hidden");

["#stopBtn","#sideStopBtn"].forEach(sel => $(sel).onclick = () => projectAction("STOP"));
["#resumeBtn","#sideResumeBtn"].forEach(sel => $(sel).onclick = () => projectAction("RESUME"));

initUpload({onFiles(files) {
  pendingFiles = files;
  $("#fileHint").textContent = files.length ? files.map(f => f.name).join(", ") : "Chưa chọn file.";
  $("#addQueueBtn").disabled = !files.length;
}});
$("#addQueueBtn").onclick = uploadTurbo;

$("#refreshProjectsBtn").onclick = refreshProjects;
$("#advancedToggle").onclick = () => {
  $("#advancedPanel").classList.toggle("hidden");
};
$$("[data-demo-stage]").forEach(btn => btn.onclick = async () => {
  const stage = btn.dataset.demoStage;
  if (stage === "final") await projectAction("PRODUCTION");
  else toast("Desktop Auto Pipeline tự điều khiển QA/Preview; không cần chạy thủ công từ Web.");
});

$("#apiBaseInput").value = api.baseUrl;
$("#pairBtn").onclick = pair;
$("#disconnectBtn").onclick = disconnect;
$("#healthBtn").onclick = health;
$$('[data-action="health"]').forEach(btn => btn.onclick = health);
$("#copySolverPromptBtn").onclick = async () => {
  const text = $("#solverPromptBox").value;
  if (!text) { toast("Chưa có Solver Prompt."); return; }
  await navigator.clipboard.writeText(text);
  toast("Đã copy Solver Prompt.");
};
$("#openSolverBtn").onclick = () => projectAction("OPEN_SOLVER");
$("#loadFinalBtn").onclick = loadFinal;

$("#finalPlayer").addEventListener("error", () => {
  $("#finalVideoMessage").textContent = "Media ticket đã hết hạn hoặc Final chưa sẵn sàng. Bấm Nạp Final lại.";
});

pairedUi();
renderAll();
if (api.paired && api.baseUrl) {
  refreshProjects();
  startPolling();
} else {
  navigate("settings");
}
