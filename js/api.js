export class ApiClient {
  constructor(baseUrl = "") {
    this.baseUrl = (baseUrl || "").replace(/\/+$/, "");
    this.token = sessionStorage.getItem("manim_web_session") || "";
  }

  setBaseUrl(value) {
    this.baseUrl = (value || "").replace(/\/+$/, "");
  }

  setToken(value) {
    this.token = value || "";
    if (this.token) sessionStorage.setItem("manim_web_session", this.token);
    else sessionStorage.removeItem("manim_web_session");
  }

  get paired() { return Boolean(this.token); }

  headers(extra = {}) {
    return {
      "ngrok-skip-browser-warning":"true",
      ...(this.token ? {Authorization:`Bearer ${this.token}`} : {}),
      ...extra
    };
  }

  async json(path, options = {}) {
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: this.headers(options.headers || {})
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.ok === false) {
      throw new Error(data.error || `HTTP ${res.status}`);
    }
    return data;
  }

  health() { return this.json("/api/v1/health"); }

  async pair(code) {
    const data = await this.json("/api/v1/pair", {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({code})
    });
    this.setToken(data.session_token);
    return data;
  }

  projects() { return this.json("/api/v1/projects"); }
  project(id) { return this.json(`/api/v1/projects/${encodeURIComponent(id)}`); }
  review(id) { return this.json(`/api/v1/projects/${encodeURIComponent(id)}/review`); }
  performance(id) { return this.json(`/api/v1/projects/${encodeURIComponent(id)}/performance`); }
  solverPrompt(id) { return this.json(`/api/v1/projects/${encodeURIComponent(id)}/solver-prompt`); }

  async upload(file) {
    const res = await fetch(`${this.baseUrl}/api/v1/upload`, {
      method:"POST",
      headers:this.headers({
        "Content-Type":"application/octet-stream",
        "X-Filename":encodeURIComponent(file.name)
      }),
      body:file
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.ok === false) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  }

  action(id, action) {
    return this.json(`/api/v1/projects/${encodeURIComponent(id)}/action`, {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({action})
    });
  }

  reviewDecision(id, file, decision) {
    return this.json(`/api/v1/projects/${encodeURIComponent(id)}/review`, {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({file,decision})
    });
  }

  command(id) { return this.json(`/api/v1/commands/${encodeURIComponent(id)}`); }

  mediaTicket(projectId, kind="final", file="") {
    const q = new URLSearchParams({project_id:projectId,kind,file});
    return this.json(`/api/v1/media-ticket?${q}`);
  }

  mediaUrl(mediaPath) {
    return `${this.baseUrl}${mediaPath}`;
  }
}
