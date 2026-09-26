(function () {
  const api = window.JobTrackApi;
  if (!api.getToken()) {
    window.location.replace("/login.html");
    return;
  }

  const byId = id => document.getElementById(id);
  const dialog = byId("application-dialog");
  const form = byId("application-form");
  const body = byId("applications-body");
  let applications = [];
  let searchTimer;
  let messageTimer;

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[char]);
  }

  function decodeEmail(token) {
    try {
      const payload = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
      const claims = JSON.parse(decodeURIComponent(Array.from(atob(payload), char =>
        `%${char.charCodeAt(0).toString(16).padStart(2, "0")}`).join("")));
      return claims.email || claims["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"] || "";
    } catch { return ""; }
  }

  function notify(text, kind = "success") {
    const notice = byId("dashboard-message");
    clearTimeout(messageTimer);
    notice.textContent = text;
    notice.className = `notice notice-${kind}`;
    notice.hidden = false;
    messageTimer = setTimeout(() => { notice.hidden = true; }, 4200);
  }

  function setLoading(loading) {
    byId("loading-state").hidden = !loading;
    byId("empty-state").hidden = loading || applications.length > 0;
    byId("applications-body").closest(".table-wrap").hidden = loading || applications.length === 0;
  }

  function formatDate(value) {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(date);
  }

  function safeJobUrl(value) {
    try {
      const url = new URL(value, window.location.origin);
      return url.protocol === "http:" || url.protocol === "https:" ? url.href : null;
    } catch { return null; }
  }

  function renderApplications() {
    setLoading(false);
    byId("application-count").textContent = `${applications.length} ${applications.length === 1 ? "application" : "applications"}`;
    body.innerHTML = applications.map(application => {
      const statusClass = application.status.toLowerCase();
      const safeUrl = application.jobUrl ? safeJobUrl(application.jobUrl) : null;
      const link = safeUrl
        ? `<a class="job-link" href="${escapeHtml(safeUrl)}" target="_blank" rel="noopener noreferrer">View job <span aria-hidden="true">↗</span></a>`
        : '<span class="table-muted">—</span>';
      return `<tr>
        <td data-label="Company"><div class="company-cell"><span class="company-avatar">${escapeHtml((application.companyName || "?").trim().charAt(0).toUpperCase())}</span><strong>${escapeHtml(application.companyName)}</strong></div></td>
        <td data-label="Job title">${escapeHtml(application.jobTitle)}</td>
        <td data-label="Location" class="table-muted">${escapeHtml(application.location)}</td>
        <td data-label="Applied" class="table-muted">${escapeHtml(formatDate(application.appliedDate))}</td>
        <td data-label="Status"><span class="status-badge status-${escapeHtml(statusClass)}"><span class="status-dot"></span>${escapeHtml(application.status)}</span></td>
        <td data-label="Job link">${link}</td>
        <td data-label="Actions"><div class="row-actions"><button class="text-button" type="button" data-action="edit" data-id="${application.id}">Edit</button><button class="text-button delete-button" type="button" data-action="delete" data-id="${application.id}">Delete</button></div></td>
      </tr>`;
    }).join("");
    byId("empty-state").hidden = applications.length > 0;
    byId("applications-body").closest(".table-wrap").hidden = applications.length === 0;
  }

  async function loadApplications() {
    setLoading(true);
    const params = new URLSearchParams();
    const search = byId("search-input").value.trim();
    const status = byId("status-filter").value;
    if (search) params.set("search", search);
    if (status) params.set("status", status);
    try {
      const query = params.toString();
      applications = await api.request(`/api/applications${query ? `?${query}` : ""}`) || [];
      renderApplications();
    } catch (error) {
      setLoading(false);
      notify(error.message || "Could not load your applications.", "error");
    }
  }

  async function loadStats() {
    try {
      const stats = await api.request("/api/applications/stats");
      byId("stat-total").textContent = stats.total ?? 0;
      byId("stat-applied").textContent = stats.applied ?? 0;
      byId("stat-interview").textContent = stats.interview ?? 0;
      byId("stat-selected").textContent = stats.selected ?? 0;
      byId("stat-rejected").textContent = stats.rejected ?? 0;
    } catch (error) {
      if (api.getToken()) notify(error.message || "Could not load your statistics.", "error");
    }
  }

  function openNewApplication() {
    form.reset();
    form.elements.id.value = "";
    form.elements.appliedDate.value = new Date().toISOString().slice(0, 10);
    form.elements.status.value = "Applied";
    byId("dialog-title").textContent = "Add application";
    byId("dialog-eyebrow").textContent = "NEW OPPORTUNITY";
    byId("save-application").textContent = "Save application";
    byId("form-message").hidden = true;
    dialog.showModal();
    form.elements.companyName.focus();
  }

  function openEditApplication(application) {
    form.reset();
    form.elements.id.value = application.id;
    form.elements.companyName.value = application.companyName || "";
    form.elements.jobTitle.value = application.jobTitle || "";
    form.elements.location.value = application.location || "";
    form.elements.jobUrl.value = application.jobUrl || "";
    form.elements.appliedDate.value = (application.appliedDate || "").slice(0, 10);
    form.elements.status.value = application.status || "Applied";
    form.elements.notes.value = application.notes || "";
    byId("dialog-title").textContent = "Edit application";
    byId("dialog-eyebrow").textContent = "UPDATE DETAILS";
    byId("save-application").textContent = "Save changes";
    byId("form-message").hidden = true;
    dialog.showModal();
    form.elements.companyName.focus();
  }

  byId("user-email").textContent = decodeEmail(api.getToken());
  byId("logout-button").addEventListener("click", () => {
    api.clearToken();
    window.location.replace("/login.html");
  });
  byId("add-application-button").addEventListener("click", openNewApplication);
  byId("empty-add-button").addEventListener("click", openNewApplication);
  byId("close-dialog").addEventListener("click", () => dialog.close());
  byId("cancel-dialog").addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", event => { if (event.target === dialog) dialog.close(); });

  byId("search-input").addEventListener("input", () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(loadApplications, 280);
  });
  byId("status-filter").addEventListener("change", loadApplications);

  body.addEventListener("click", async event => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const application = applications.find(item => String(item.id) === button.dataset.id);
    if (!application) return;
    if (button.dataset.action === "edit") openEditApplication(application);
    if (button.dataset.action === "delete") {
      if (!window.confirm(`Delete the application for ${application.companyName}? This can’t be undone.`)) return;
      button.disabled = true;
      try {
        await api.request(`/api/applications/${application.id}`, { method: "DELETE" });
        notify("Application deleted.");
        await Promise.all([loadApplications(), loadStats()]);
      } catch (error) {
        button.disabled = false;
        notify(error.message || "Could not delete this application.", "error");
      }
    }
  });

  form.addEventListener("submit", async event => {
    event.preventDefault();
    byId("form-message").hidden = true;
    if (!form.reportValidity()) return;
    const fields = new FormData(form);
    const payload = {
      companyName: fields.get("companyName").trim(),
      jobTitle: fields.get("jobTitle").trim(),
      location: fields.get("location").trim(),
      jobUrl: fields.get("jobUrl").trim() || null,
      appliedDate: fields.get("appliedDate"),
      status: fields.get("status"),
      notes: fields.get("notes").trim() || null
    };
    const id = fields.get("id");
    const button = byId("save-application");
    button.disabled = true;
    button.textContent = id ? "Saving…" : "Adding…";
    try {
      await api.request(id ? `/api/applications/${id}` : "/api/applications", {
        method: id ? "PUT" : "POST", body: JSON.stringify(payload)
      });
      dialog.close();
      notify(id ? "Application updated." : "Application added.");
      await Promise.all([loadApplications(), loadStats()]);
    } catch (error) {
      const notice = byId("form-message");
      notice.textContent = error.message || "Could not save this application.";
      notice.className = "notice notice-error";
      notice.hidden = false;
    } finally {
      button.disabled = false;
      button.textContent = id ? "Save changes" : "Save application";
    }
  });

  Promise.all([loadApplications(), loadStats()]);
})();
