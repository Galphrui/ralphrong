const RA_LOCAL_API_BASE =
  location.hostname === "localhost" || location.hostname === "127.0.0.1" ? location.origin : "";
const RA_IS_LOCAL_ADMIN = Boolean(RA_LOCAL_API_BASE);
const RA_API_BASE = (window.BLOG_ADMIN_API_BASE || RA_LOCAL_API_BASE || "").replace(/\/$/, "");
const RA_SESSION_TOKEN_KEY = "RaBlogAdminSessionToken";

const RaLoginEls = {
  user: document.querySelector("#RaLoginUserInput"),
  password: document.querySelector("#RaLoginPasswordInput"),
  registerPassword: document.querySelector("#RaRegisterPasswordInput"),
  registerPasswordField: document.querySelector("#RaRegisterPasswordField"),
  resetCode: document.querySelector("#RaResetCodeInput"),
  resetCodeField: document.querySelector("#RaResetCodeField"),
  login: document.querySelector("#RaLoginButton"),
  register: document.querySelector("#RaRegisterButton"),
  showReset: document.querySelector("#RaShowResetButton"),
  resetPassword: document.querySelector("#RaResetPasswordButton"),
  status: document.querySelector("#RaLoginStatus"),
};

initRaLogin();

async function initRaLogin() {
  RaLoginEls.register.hidden = !RA_IS_LOCAL_ADMIN;
  if (!RA_API_BASE) {
    setLoginStatus("外网后台 API 尚未配置。请在 admin-config.js 写入 Worker 地址。");
  }

  const session = await getSession().catch(() => null);
  if (session?.user) {
    goAdmin();
  }
}

async function login() {
  try {
    const username = RaLoginEls.user.value.trim();
    const password = RaLoginEls.password.value;
    if (!username || !password) throw new Error("请填写账号和密码。");

    const result = await raApi("/api/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
    saveSessionToken(result.sessionToken);
    setLoginStatus(`登录成功：${result.user}`);
    goAdmin();
  } catch (error) {
    if (shouldAutoResetAfterLoginFailure(error)) {
      setLoginStatus("检测到旧密码哈希需要迁移，正在使用重置指令更新密码...");
      await resetPassword({ autoLogin: true });
      return;
    }
    if (isLegacyHashError(error)) {
      showResetPassword();
    }
    setLoginStatus(`登录失败：${error.message}`);
  }
}

async function register() {
  try {
    if (!RA_IS_LOCAL_ADMIN) throw new Error("账号注册只能在本地后台进行。");

    const username = RaLoginEls.user.value.trim();
    const password = RaLoginEls.password.value;
    const confirmPassword = RaLoginEls.registerPassword.value;
    if (!username || !password) throw new Error("请填写账号和密码。");
    if (password !== confirmPassword) throw new Error("两次输入的密码不一致。");

    const result = await raApi("/api/register", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
    saveSessionToken(result.sessionToken);
    setLoginStatus(`注册成功：${result.user}`);
    goAdmin();
  } catch (error) {
    setLoginStatus(`注册失败：${error.message}`);
  }
}

function showResetPassword() {
  RaLoginEls.resetCodeField.hidden = false;
  RaLoginEls.resetPassword.hidden = false;
  RaLoginEls.register.hidden = true;
  setLoginStatus("请输入账号、新密码、确认密码和重置指令。");
}

async function resetPassword(options = {}) {
  try {
    const username = RaLoginEls.user.value.trim();
    const password = RaLoginEls.password.value;
    const confirmPassword = RaLoginEls.registerPassword.value;
    const resetCode = RaLoginEls.resetCode.value;
    if (!username || !password || !confirmPassword || !resetCode) {
      throw new Error("请填写账号、新密码、确认密码和重置指令。");
    }
    if (password !== confirmPassword) throw new Error("两次输入的新密码不一致。");

    const result = await raApi("/api/password-reset", {
      method: "POST",
      body: JSON.stringify({ username, password, resetCode }),
    });
    RaLoginEls.resetCode.value = "";
    saveSessionToken(result.sessionToken);
    if (options.autoLogin && result.sessionToken) {
      setLoginStatus(`密码已迁移并登录：${result.user}`);
      goAdmin();
      return;
    }
    setLoginStatus(`密码已重置：${result.user}。${result.sessionToken ? "正在进入后台。" : "请使用新密码登录。"}`);
    if (result.sessionToken) goAdmin();
  } catch (error) {
    setLoginStatus(`重置失败：${error.message}`);
  }
}

async function getSession() {
  return raApi("/api/session");
}

async function raApi(path, options = {}) {
  if (!RA_API_BASE) throw new Error("后台 API 未配置。");
  let response;
  try {
    response = await fetch(`${RA_API_BASE}${path}`, {
      method: options.method || "GET",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(),
        ...(options.headers || {}),
      },
      body: options.body,
    });
  } catch (error) {
    throw new Error(`无法连接后台 API：${RA_API_BASE}`);
  }

  const result = await response.json().catch(() => ({}));
  if (!response.ok || result.ok === false) {
    throw new Error(result.error || `后台服务请求失败：${response.status}`);
  }
  return result;
}

function authHeaders() {
  const token = localStorage.getItem(RA_SESSION_TOKEN_KEY);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function saveSessionToken(token) {
  if (token) localStorage.setItem(RA_SESSION_TOKEN_KEY, token);
}

function shouldAutoResetAfterLoginFailure(error) {
  return (
    isLegacyHashError(error) &&
    !RaLoginEls.resetCodeField.hidden &&
    RaLoginEls.resetCode.value &&
    RaLoginEls.registerPassword.value
  );
}

function isLegacyHashError(error) {
  return String(error?.message || "").includes("密码哈希");
}

function goAdmin() {
  const next = new URLSearchParams(location.search).get("next") || "admin.html";
  location.href = next;
}

function setLoginStatus(message) {
  RaLoginEls.status.textContent = message;
}

RaLoginEls.login.addEventListener("click", login);
RaLoginEls.register.addEventListener("click", register);
RaLoginEls.showReset.addEventListener("click", showResetPassword);
RaLoginEls.resetPassword.addEventListener("click", resetPassword);
RaLoginEls.password.addEventListener("keydown", (event) => {
  if (event.key === "Enter") login();
});
