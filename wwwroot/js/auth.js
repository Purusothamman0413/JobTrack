(function () {
  const api = window.JobTrackApi;
  const message = document.getElementById("auth-message");
  const loginForm = document.getElementById("login-form");
  const registerForm = document.getElementById("register-form");

  if (api.getToken()) {
    window.location.replace("/");
    return;
  }

  function showMessage(text, kind = "error") {
    message.textContent = text;
    message.className = `notice notice-${kind}`;
    message.hidden = false;
  }

  if (loginForm) {
    loginForm.addEventListener("submit", async event => {
      event.preventDefault();
      message.hidden = true;
      if (!loginForm.reportValidity()) return;
      const button = loginForm.querySelector("button[type=submit]");
      button.disabled = true;
      button.textContent = "Signing in…";
      const fields = new FormData(loginForm);
      try {
        const result = await api.request("/api/auth/login", {
          method: "POST", auth: false,
          body: JSON.stringify({ email: fields.get("email").trim(), password: fields.get("password") })
        });
        if (!result || !result.token) throw new Error("The server did not return a sign-in token.");
        api.saveToken(result.token);
        window.location.assign("/");
      } catch (error) {
        showMessage(error.message || "Unable to sign in. Check your details and try again.");
      } finally {
        button.disabled = false;
        button.innerHTML = 'Sign in <span aria-hidden="true">→</span>';
      }
    });
  }

  if (registerForm) {
    registerForm.addEventListener("submit", async event => {
      event.preventDefault();
      message.hidden = true;
      if (!registerForm.reportValidity()) return;
      const fields = new FormData(registerForm);
      if (fields.get("password") !== fields.get("confirmPassword")) {
        showMessage("Your passwords don’t match. Please try again.");
        registerForm.elements.confirmPassword.focus();
        return;
      }
      const button = registerForm.querySelector("button[type=submit]");
      button.disabled = true;
      button.textContent = "Creating account…";
      try {
        await api.request("/api/auth/register", {
          method: "POST", auth: false,
          body: JSON.stringify({
            fullName: fields.get("fullName").trim(),
            email: fields.get("email").trim(),
            password: fields.get("password")
          })
        });
        window.location.assign("/login.html?registered=1");
      } catch (error) {
        showMessage(error.message || "Unable to create your account. Please try again.");
      } finally {
        button.disabled = false;
        button.innerHTML = 'Create account <span aria-hidden="true">→</span>';
      }
    });
  }

  if (loginForm && new URLSearchParams(window.location.search).has("registered")) {
    showMessage("Your account is ready. Sign in to get started.", "success");
  }
})();
