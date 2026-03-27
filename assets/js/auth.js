const BASE_URL = "http://localhost:8080";
const TOKEN_KEY = "qm_access_token";
const USER_KEY = "qm_user";

const loginTab = document.getElementById("loginTab");
const signupTab = document.getElementById("signupTab");
const loginPanel = document.getElementById("loginPanel");
const signupPanel = document.getElementById("signupPanel");
const eyeToggles = document.querySelectorAll(".eye-toggle");
const googleButtons = document.querySelectorAll(".google-button");
const loginStatus = document.getElementById("loginStatus");
const signupStatus = document.getElementById("signupStatus");

function saveAuth(authResponse) {
  localStorage.setItem(TOKEN_KEY, authResponse.accessToken);
  localStorage.setItem(USER_KEY, JSON.stringify(authResponse.user || {}));
}

function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

async function handleOAuthRedirect() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");

  if (!token) {
    return false;
  }

  localStorage.setItem(TOKEN_KEY, token);

  try {
    const response = await fetch(`${BASE_URL}/auth/user`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!response.ok) {
      clearAuth();
      return false;
    }

    const user = await response.json();
    localStorage.setItem(USER_KEY, JSON.stringify(user || {}));
    window.history.replaceState({}, document.title, window.location.pathname);
    window.location.href = "../measurement/index.html";
    return true;
  } catch {
    clearAuth();
    return false;
  }
}

function setActiveTab(mode) {
  const showSignup = mode === "signup";

  signupTab.classList.toggle("active", showSignup);
  loginTab.classList.toggle("active", !showSignup);
  signupTab.setAttribute("aria-selected", String(showSignup));
  loginTab.setAttribute("aria-selected", String(!showSignup));
  signupPanel.classList.toggle("hidden", !showSignup);
  loginPanel.classList.toggle("hidden", showSignup);
  loginStatus.textContent = "";
  signupStatus.textContent = "";
}

function getErrorMessage(field) {
  if (field.validity.valueMissing) return "Please fill out this field.";
  if (field.validity.typeMismatch) return "Please enter a valid email address.";
  if (field.validity.patternMismatch) {
    if (field.id === "signupName") return "Full name should contain only letters and spaces.";
    if (field.id === "signupPassword") return "Password must be 6-100 characters and include at least one letter and one number.";
    if (field.id === "signupMobile") return "Mobile number must be exactly 10 digits.";
  }
  if (field.validity.tooShort) return `Please enter at least ${field.minLength} characters.`;
  if (field.validity.tooLong) return `Please keep this under ${field.maxLength} characters.`;
  return "Please enter a valid value.";
}

function validateForm(form, statusNode) {
  const fields = form.querySelectorAll(".field-input");
  statusNode.textContent = "";

  for (const field of fields) {
    field.classList.remove("invalid");

    if (!field.checkValidity()) {
      field.classList.add("invalid");
      statusNode.textContent = getErrorMessage(field);
      field.reportValidity();
      field.focus();
      return false;
    }
  }

  return true;
}

async function submitAuthForm(form, statusNode) {
  const isLogin = form.id === "loginPanel";
  const endpoint = isLogin ? `${BASE_URL}/auth/login` : `${BASE_URL}/auth/register`;
  const payload = isLogin
    ? {
        email: document.getElementById("loginEmail").value.trim(),
        password: document.getElementById("loginPassword").value
      }
    : {
        name: document.getElementById("signupName").value.trim(),
        email: document.getElementById("signupEmail").value.trim(),
        password: document.getElementById("signupPassword").value
      };

  statusNode.textContent = isLogin ? "Logging in..." : "Creating your account...";

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || data.error || `${isLogin ? "Login" : "Signup"} failed.`);
  }

  if (!data.accessToken) {
    throw new Error("Authentication token was not returned by the backend.");
  }

  saveAuth(data);
  window.location.href = "../measurement/index.html";
}

async function checkExistingAuth() {
  const token = getToken();
  if (!token) {
    return;
  }

  try {
    const response = await fetch(`${BASE_URL}/auth/status`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!response.ok) {
      clearAuth();
      return;
    }

    const data = await response.json();
    if (data.authenticated) {
      window.location.href = "../measurement/index.html";
    }
  } catch {
    clearAuth();
  }
}

loginTab.addEventListener("click", () => setActiveTab("login"));
signupTab.addEventListener("click", () => setActiveTab("signup"));

eyeToggles.forEach((button) => {
  button.addEventListener("click", () => {
    const field = document.getElementById(button.dataset.target);
    const isPassword = field.type === "password";
    field.type = isPassword ? "text" : "password";
    button.setAttribute("aria-label", isPassword ? "Hide password" : "Show password");
  });
});

document.querySelectorAll(".field-input").forEach((field) => {
  field.addEventListener("input", () => {
    field.classList.remove("invalid");
    if (field.form.id === "loginPanel") {
      loginStatus.textContent = "";
    } else {
      signupStatus.textContent = "";
    }
  });
});

document.querySelectorAll("form").forEach((form) => {
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const statusNode = form.id === "loginPanel" ? loginStatus : signupStatus;

    if (!validateForm(form, statusNode)) {
      return;
    }

    try {
      await submitAuthForm(form, statusNode);
    } catch (error) {
      statusNode.textContent = error.message || "Something went wrong.";
    }
  });
});

googleButtons.forEach((button) => {
  button.addEventListener("click", () => {
    window.location.href = `${BASE_URL}/oauth2/authorization/google`;
  });
});

setActiveTab("signup");

(async () => {
  const handledOAuth = await handleOAuthRedirect();
  if (!handledOAuth) {
    checkExistingAuth();
  }
})();
