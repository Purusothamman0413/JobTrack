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
    const toast = document.createElement("div");
    toast.className = `toast${kind === "error" ? " toast-error" : ""}`;
    toast.textContent = text;
    byId("toast-region").append(toast);
    setTimeout(() => toast.remove(), 4200);
  }

  function setLoading(loading) {
    byId("loading-state").hidden = !loading;
    if (loading) {
      byId("empty-state").hidden = true;
      body.hidden = true;
    }
  }

  function hasActiveFilters() {
    return Boolean(byId("search-input").value.trim() || byId("status-filter").value);
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

  function sortApplications(items) {
    const sorted = [...items];
    const mode = byId("sort-order").value;
    const dateValue = application => new Date(application.appliedDate || 0).getTime() || 0;
    if (mode === "oldest") sorted.sort((a, b) => dateValue(a) - dateValue(b));
    else if (mode === "company") sorted.sort((a, b) => (a.companyName || "").localeCompare(b.companyName || "", undefined, { sensitivity: "base" }));
    else if (mode === "priority") {
      const rank = { High: 0, Medium: 1, Low: 2 };
      sorted.sort((a, b) => (rank[a.priority] ?? 3) - (rank[b.priority] ?? 3) || dateValue(b) - dateValue(a));
    } else sorted.sort((a, b) => dateValue(b) - dateValue(a));
    return sorted;
  }

  function detailChip(label, value) {
    if (value === null || value === undefined || value === "") return "";
    return `<span class="detail-chip"><span>${label}</span><strong>${escapeHtml(value)}</strong></span>`;
  }

  function formatSalary(value) {
    if (value === null || value === undefined || value === "" || !Number.isFinite(Number(value))) return "";
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(value));
  }

  function formatRate(value) {
    const rate = Number(value);
    return Number.isFinite(rate) ? `${new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(rate)}%` : "—";
  }

  function filteredApplications() {
    const search = byId("search-input").value.trim();
    const status = byId("status-filter").value;
    return applications.filter(application => {
      const matchesSearch = !search || (application.companyName || "").includes(search) || (application.jobTitle || "").includes(search);
      return matchesSearch && (!status || application.status === status);
    });
  }

  function renderStatusDistribution(stats) {
    const total = Number(stats.total);
    if (!Number.isFinite(total) || total <= 0) {
      byId("status-distribution").hidden = true;
      byId("status-empty").hidden = false;
      return;
    }

    byId("status-distribution").hidden = false;
    byId("status-empty").hidden = true;
    for (const status of ["applied", "interview", "selected", "rejected"]) {
      const count = Number(stats[status] ?? 0);
      const percentage = Number.isFinite(count) ? Math.max(0, Math.min(100, count / total * 100)) : 0;
      byId(`status-count-${status}`).textContent = Number.isFinite(count) ? count : "—";
      byId(`status-pct-${status}`).textContent = formatRate(percentage);
      byId(`status-bar-${status}`).style.width = `${percentage}%`;
      byId(`status-bar-${status}`).parentElement.setAttribute("aria-valuenow", String(Math.round(percentage)));
    }
  }

  function renderRecentApplications() {
    byId("recent-loading").hidden = true;
    const recent = [...applications]
      .sort((a, b) => new Date(b.appliedDate || 0).getTime() - new Date(a.appliedDate || 0).getTime())
      .slice(0, 5);
    byId("recent-empty").hidden = recent.length > 0;
    byId("recent-applications").innerHTML = recent.map(application => {
      const status = application.status || "Applied";
      const statusClass = String(status).toLowerCase();
      const priority = application.priority || "";
      return `<article class="recent-item">
        <div><h3 class="recent-company">${escapeHtml(application.companyName || "Company not specified")}</h3><p class="recent-role">${escapeHtml(application.jobTitle || "Job title not specified")}</p><div class="recent-meta"><span>${escapeHtml(formatDate(application.appliedDate))}</span>${priority ? `<span class="priority-badge priority-${escapeHtml(priority.toLowerCase())}">${escapeHtml(priority)}</span>` : ""}</div></div>
        <span class="status-badge status-${escapeHtml(statusClass)}"><span class="status-dot" aria-hidden="true"></span>${escapeHtml(status)}</span>
      </article>`;
    }).join("");
  }

  function renderApplications() {
    const visibleApplications = filteredApplications();
    byId("loading-state").hidden = true;
    byId("application-count").textContent = `${visibleApplications.length} ${visibleApplications.length === 1 ? "application" : "applications"}`;
    const filteredEmpty = visibleApplications.length === 0 && hasActiveFilters();
    byId("empty-title").textContent = filteredEmpty ? "No matching applications" : "No job applications yet";
    byId("empty-description").textContent = filteredEmpty
      ? "Try changing your search or status filter."
      : "Add your first application to keep your job search organized.";
    byId("empty-add-button").hidden = filteredEmpty;
    byId("empty-state").hidden = visibleApplications.length > 0;
    body.hidden = visibleApplications.length === 0;
    body.innerHTML = sortApplications(visibleApplications).map(application => {
      const status = application.status || "Applied";
      const statusClass = String(status).toLowerCase();
      const priority = application.priority || "";
      const safeUrl = application.jobUrl ? safeJobUrl(application.jobUrl) : null;
      const salary = formatSalary(application.salary);
      const jobLink = safeUrl
        ? `<a class="job-link" href="${escapeHtml(safeUrl)}" target="_blank" rel="noopener noreferrer">View job <span aria-hidden="true">↗</span></a>`
        : '<span class="job-link-muted">No job link</span>';
      const priorityBadge = priority
        ? `<span class="priority-badge priority-${escapeHtml(priority.toLowerCase())}">${escapeHtml(priority)} priority</span>`
        : "";
      return `<article class="application-card">
        <div class="application-main">
          <div class="application-heading"><span class="company-avatar" aria-hidden="true">${escapeHtml((application.companyName || "?").trim().charAt(0).toUpperCase())}</span><div><h3 class="application-company">${escapeHtml(application.companyName || "Company not specified")}</h3><p class="application-role">${escapeHtml(application.jobTitle || "Job title not specified")}</p></div></div>
          <p class="application-location">${escapeHtml(application.location || "Location not specified")}</p>
          <div class="application-details">
            ${detailChip("Applied", formatDate(application.appliedDate))}
            ${detailChip("Job type", application.jobType)}
            ${detailChip("Work mode", application.workMode)}
            ${detailChip("Salary / CTC", salary)}
            ${detailChip("Source", application.applicationSource)}
          </div>
        </div>
        <div class="application-aside">
          <div class="application-badges"><span class="status-badge status-${escapeHtml(statusClass)}"><span class="status-dot" aria-hidden="true"></span>${escapeHtml(status)}</span>${priorityBadge}</div>
          <div class="application-actions">${jobLink}<button class="text-button" type="button" data-action="edit" data-id="${escapeHtml(application.id)}">Edit</button><button class="text-button delete-button" type="button" data-action="delete" data-id="${escapeHtml(application.id)}">Delete</button></div>
        </div>
      </article>`;
    }).join("");
  }

  async function loadApplications() {
    setLoading(true);
    try {
      applications = await api.request("/api/applications") || [];
      renderRecentApplications();
      renderApplications();
    } catch (error) {
      setLoading(false);
      body.hidden = true;
      byId("empty-state").hidden = false;
      byId("empty-title").textContent = "Unable to load applications";
      byId("empty-description").textContent = "Please try again in a moment.";
      byId("empty-add-button").hidden = true;
      byId("recent-loading").hidden = true;
      byId("recent-empty").textContent = "Unable to load recent applications.";
      byId("recent-empty").hidden = false;
      notify(error.message || "Something went wrong. Please try again.", "error");
    }
  }

  async function loadStats() {
    const keys = ["total", "applied", "interview", "selected", "rejected", "interview-rate", "selection-rate", "this-month"];
    byId("stats-grid").setAttribute("aria-busy", "true");
    byId("stats-loading").hidden = false;
    byId("stats-error").hidden = true;
    try {
      const stats = await api.request("/api/applications/stats");
      for (const key of ["total", "applied", "interview", "selected", "rejected"]) {
        const value = Number(stats[key]);
        byId(`stat-${key}`).textContent = Number.isFinite(value) ? value : "—";
      }
      byId("stat-interview-rate").textContent = formatRate(stats.interviewRate);
      byId("stat-selection-rate").textContent = formatRate(stats.selectionRate);
      const thisMonth = Number(stats.thisMonth);
      byId("stat-this-month").textContent = Number.isFinite(thisMonth) ? thisMonth : "—";
      renderStatusDistribution(stats);
    } catch (error) {
      for (const key of keys) byId(`stat-${key}`).textContent = "—";
      byId("status-distribution").hidden = true;
      byId("status-empty").hidden = true;
      byId("stats-error").hidden = false;
    } finally {
      byId("stats-loading").hidden = true;
      byId("stats-grid").setAttribute("aria-busy", "false");
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
    form.elements.jobType.value = application.jobType || "";
    form.elements.workMode.value = application.workMode || "";
    form.elements.salary.value = application.salary ?? "";
    form.elements.applicationSource.value = application.applicationSource || "";
    form.elements.priority.value = application.priority || "";
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
  byId("recent-add-button").addEventListener("click", openNewApplication);
  byId("close-dialog").addEventListener("click", () => dialog.close());
  byId("cancel-dialog").addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", event => { if (event.target === dialog) dialog.close(); });

  byId("search-input").addEventListener("input", () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(renderApplications, 180);
  });
  byId("status-filter").addEventListener("change", renderApplications);
  byId("sort-order").addEventListener("change", renderApplications);

  body.addEventListener("click", async event => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const application = applications.find(item => String(item.id) === button.dataset.id);
    if (!application) return;
    if (button.dataset.action === "edit") openEditApplication(application);
    if (button.dataset.action === "delete") {
      if (!window.confirm("Are you sure you want to delete this application?")) return;
      button.disabled = true;
      try {
        await api.request(`/api/applications/${application.id}`, { method: "DELETE" });
        notify("Application deleted successfully");
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
      notes: fields.get("notes").trim() || null,
      jobType: fields.get("jobType") || null,
      workMode: fields.get("workMode") || null,
      salary: fields.get("salary") === "" ? null : Number(fields.get("salary")),
      applicationSource: fields.get("applicationSource") || null,
      priority: fields.get("priority") || null
    };
    const id = fields.get("id");
    const button = byId("save-application");
    button.disabled = true;
    button.textContent = "Saving…";
    try {
      await api.request(id ? `/api/applications/${id}` : "/api/applications", {
        method: id ? "PUT" : "POST", body: JSON.stringify(payload)
      });
      dialog.close();
      notify(id ? "Application updated successfully" : "Application added successfully");
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
