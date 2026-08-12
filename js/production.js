export function updateDashboard(project) {
  const phase = document.getElementById("dashboardPhase");
  const progress = document.getElementById("dProgress");
  const eta = document.getElementById("dEta");
  const workers = document.getElementById("dWorkers");
  const cache = document.getElementById("dCache");
  const list = document.getElementById("productionList");

  if (!project) {
    phase.textContent="IDLE"; progress.textContent="0%"; eta.textContent="—";
    workers.textContent="0 / 2"; cache.textContent="0 HIT"; list.innerHTML="";
    return;
  }
  phase.textContent = project.status === "COMPLETE" ? "COMPLETE" : project.stage;
  progress.textContent = `${project.progress}%`;
  eta.textContent = project.status === "APPROVED" ? "02:30" :
                    project.status === "COMPLETE" ? "00:00" : "—";
  workers.textContent = project.status === "APPROVED" ? "2 / 2" : "0 / 2";
  cache.textContent = project.status === "COMPLETE" ? "2 HIT" : "0 HIT";
  list.innerHTML = project.questions.map((q,i)=>`
    <div class="production-row">
      <strong>Câu ${i+1}</strong>
      <span>${q.status}</span>
      <span>Render ${project.status==="COMPLETE"?"HIT":"—"}</span>
      <span>${project.status==="COMPLETE"?"00:01":"—"}</span>
    </div>`).join("");
}
