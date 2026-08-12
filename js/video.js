export function updateVideo(project) {
  const title = document.getElementById("finalVideoTitle");
  const msg = document.getElementById("finalVideoMessage");
  const dl = document.getElementById("downloadDemoBtn");
  if (project?.status === "COMPLETE") {
    title.textContent = `${project.name} — Final Demo`;
    msg.textContent = "V1.5.0A mô phỏng Final. MP4 thật sẽ đến từ Engine API ở V1.5.0B.";
    dl.disabled = false;
  } else {
    title.textContent = "Chưa có Final";
    msg.textContent = "Hoàn tất Demo Pipeline để xem trạng thái Final.";
    dl.disabled = true;
  }
}
