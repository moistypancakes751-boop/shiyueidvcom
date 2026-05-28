const adminLogsKey = "syAdminLogs";
const chatLogsKey = "syChatLogs";

const loginPanel = document.querySelector("[data-admin-login]");
const dashboard = document.querySelector("[data-admin-dashboard]");
const form = document.querySelector("[data-admin-form]");
const error = document.querySelector("[data-admin-error]");
const actionTable = document.querySelector("[data-action-log]");
const chatTable = document.querySelector("[data-chat-log-admin]");
const actionEmpty = document.querySelector("[data-action-empty]");
const chatEmpty = document.querySelector("[data-chat-empty]");

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
  actionEmpty.hidden = actions.length > 0;
  chatEmpty.hidden = chats.length > 0;

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
      .join("");

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
      .join("");
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

document.querySelector("[data-refresh-admin]").addEventListener("click", render);

document.querySelector("[data-seed-admin]").addEventListener("click", () => {
  const sampleIp = "203.0.113.24";
  const now = new Date();
  localStorage.setItem(
    adminLogsKey,
    JSON.stringify([
      {
        at: now.toISOString(),
        action: "发送客服消息",
        user: "测试客户",
        ip: sampleIp,
        path: "/index.html",
        detail: { message: "今晚想约 IDV 七阶陪玩" },
      },
      {
        at: new Date(now.getTime() - 60000).toISOString(),
        action: "创建或更新账号",
        user: "测试客户",
        ip: sampleIp,
        path: "/index.html",
        detail: { name: "测试客户", contact: "wechat-test", service: "IDV 陪玩" },
      },
    ]),
  );
  localStorage.setItem(
    chatLogsKey,
    JSON.stringify([
      {
        at: now.toISOString(),
        speaker: "客户",
        message: "今晚想约 IDV 七阶陪玩，预算 80/h。",
        user: "测试客户",
        ip: sampleIp,
        path: "/index.html",
      },
      {
        at: new Date(now.getTime() + 500).toISOString(),
        speaker: "客服",
        message: "收到，请发游戏 ID、区服和可开始时间。",
        user: "测试客户",
        ip: sampleIp,
        path: "/index.html",
      },
    ]),
  );
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
