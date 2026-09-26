(function () {
  const TOKEN_KEY = "jobtrack.token";

  async function apiRequest(path, options = {}) {
    const headers = new Headers(options.headers || {});
    const token = localStorage.getItem(TOKEN_KEY);
    const requiresAuth = options.auth !== false;
    if (requiresAuth && token) headers.set("Authorization", `Bearer ${token}`);
    if (options.body && !(options.body instanceof FormData)) headers.set("Content-Type", "application/json");

    const response = await fetch(path, { ...options, headers });
    if (response.status === 401 && requiresAuth) {
      localStorage.removeItem(TOKEN_KEY);
      window.location.replace("/login.html");
      throw new Error("Your session has expired. Please sign in again.");
    }

    if (!response.ok) {
      let message = "Something went wrong. Please try again.";
      try {
        const problem = await response.json();
        message = problem.message || problem.title || (problem.errors && Object.values(problem.errors).flat().join(" ")) || message;
      } catch { /* Use the friendly fallback when the response has no JSON body. */ }
      throw new Error(message);
    }
    if (response.status === 204) return null;
    const contentType = response.headers.get("content-type") || "";
    return contentType.includes("application/json") ? response.json() : null;
  }

  window.JobTrackApi = {
    tokenKey: TOKEN_KEY,
    request: apiRequest,
    getToken: () => localStorage.getItem(TOKEN_KEY),
    saveToken: token => localStorage.setItem(TOKEN_KEY, token),
    clearToken: () => localStorage.removeItem(TOKEN_KEY)
  };
})();
