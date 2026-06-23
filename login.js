const RA_LOCAL_API_BASE =
  location.hostname === "localhost" || location.hostname === "127.0.0.1" ? location.origin : "";
const RA_API_BASE = (window.BLOG_ADMIN_API_BASE || RA_LOCAL_API_BASE || "").replace(/\/$/, "");
const RA_IS_LOCAL_ADMIN = Boolean(RA_LOCAL_API_BASE);

const RaLoginEls = {
  user: document.querySelector("#RaLoginUserInput"),
  password: document.querySelector("#RaLoginPasswordInput"),
  registerPassword: document.querySelector("#RaRegisterPasswordInput"),
  registerPasswordField: document.querySelector("#RaRegisterPasswordField"),
  login: document.querySelector("#RaLoginButton"),
  register: document.querySelector("#RaRegisterButton"),
  status: document.querySelector("#RaLoginStatus"),
};

initRaLogin();

async function initRaLogin() {
  RaLoginEls.register.hidden = !RA_IS_LOCAL_ADMIN;
  RaLoginEls.registerPasswordField.hidden = !RA_IS_LOCAL_ADMIN;

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
    setLoginStatus(`登录成功：${result.user}`);
    goAdmin();
  } catch (error) {
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
    setLoginStatus(`注册成功：${result.user}`);
    goAdmin();
  } catch (error) {
    setLoginStatus(`注册失败：${error.message}`);
  }
}

async function getSession() {
  return raApi("/api/session");
}

async function raApi(path, options = {}) {
  if (!RA_API_BASE) throw new Error("后台 API 未配置。");
  const response = await fetch(`${RA_API_BASE}${path}`, {
    method: options.method || "GET",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    body: options.body,
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok || result.ok === false) {
    throw new Error(result.error || `后台服务请求失败：${response.status}`);
  }
  return result;
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
RaLoginEls.password.addEventListener("keydown", (event) => {
  if (event.key === "Enter") login();
});
