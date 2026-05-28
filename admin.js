const adminLogsKey = "syAdminLogs";
const chatLogsKey = "syChatLogs";

const loginPanel = document.querySelector("[data-admin-login]");
const dashboard = document.querySelector("[data-admin-dashboard]");
const form = document.querySelector("[data-admin-form]");
const error = document.querySelector("[data-admin-error]");
const actionTable = document.querySelector("[data-action-log]");
const chatTable = document.querySelector("[data-chat-log-admin]");

const readJson = (key) => {
  try {
    return JSON.parse(localStorage.getItem(key)) || [];
  } catch {
    return [];
  }
};

const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const formatTime = (value) => {
  if (!value) return "未知";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(value));
};

const render = () => {
  const actions = readJson(adminLogsKey);
  const chats = readJson(chatLogsKey);
  const users = new Set([...actions.map((log) => log.user), ...chats.map((log) => log.user)].filter(Boolean));

  document.querySelector("[data-stat-actions]").textContent = actions.length;
  document.querySelector("[data-stat-chat]").textContent = chats.length;
  document.querySelector("[data-stat-users]").textContent = users.size;

  actionTable.innerHTML =
    actions
      .map(
        (log) => `
          <tr>
            <td>${escapeHtml(formatTime(log.at))}</td>
            <td>${escapeHtml(log.user)}</td>
            <td>${escapeHtml(log.ip)}</td>
            <td>${escapeHtml(log.action)}</td>
            <td><code>${escapeHtml(JSON.stringify(log.detail || {}))}</code></td>
          </tr>
        `,
      )
      .join("") || `<tr><td colspan="5">暂无操作日志。</td></tr>`;

  chatTable.innerHTML =
    chats
      .map(
        (log) => `
          <tr>
            <td>${escapeHtml(formatTime(log.at))}</td>
            <td>${escapeHtml(log.user)}</td>
            <td>${escapeHtml(log.ip)}</td>
            <td>${escapeHtml(log.speaker)}</td>
            <td>${escapeHtml(log.message)}</td>
          </tr>
        `,
      )
      .join("") || `<tr><td colspan="5">暂无客服消息。</td></tr>`;
};

const openDashboard = () => {
  loginPanel.hidden = true;
  dashboard.hidden = false;
  render();
};

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const username = form.elements.username.value.trim();
  const password = form.elements.password.value;

  if (username === "shiyueadmin" && password === "shiyueidv") {
    sessionStorage.setItem("syAdminAuthed", "true");
    openDashboard();
    return;
  }

  error.hidden = false;
});

document.querySelector("[data-clear-admin]").addEventListener("click", () => {
  if (!confirm("确定清空本机保存的后台日志吗？")) return;
  localStorage.removeItem(adminLogsKey);
  localStorage.removeItem(chatLogsKey);
  render();
});

document.querySelector("[data-export-admin]").addEventListener("click", () => {
  const payload = {
    exportedAt: new Date().toISOString(),
    actions: readJson(adminLogsKey),
    chats: readJson(chatLogsKey),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `shiyue-admin-logs-${Date.now()}.json`;
  link.click();
  URL.revokeObjectURL(url);
});

if (sessionStorage.getItem("syAdminAuthed") === "true") {
  openDashboard();
}
