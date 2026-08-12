export function renderReview(project, onDecision) {
  const root = document.getElementById("reviewQuestions");
  root.innerHTML = "";
  if (!project) {
    root.innerHTML = '<p class="muted">Chọn Project trước.</p>'; return;
  }
  project.questions.forEach((q, i) => {
    const el = document.createElement("div");
    el.className = "review-item";
    el.innerHTML = `
      <strong>Câu ${i+1}</strong>
      <p class="muted">${q.file} · ${q.preview}</p>
      <div class="row">
        <button class="btn btn-success" data-review="approve">Approve</button>
        <button class="btn btn-soft" data-review="repair">Repair</button>
      </div>`;
    el.querySelector('[data-review="approve"]').onclick = () => onDecision(i, "APPROVED");
    el.querySelector('[data-review="repair"]').onclick = () => onDecision(i, "REPAIR");
    root.appendChild(el);
  });
}
