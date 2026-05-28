const root = document.documentElement;
const storageKey = "syClubAccount";
const discordStorageKey = "syDiscordProfile";
const adminLogsKey = "syAdminLogs";
const chatLogsKey = "syChatLogs";
const discordClientId = "1509661268334739456";
let memoryAccount = null;
let cachedVisitorIp = "未知";

root.classList.add("enhanced");

const revealTargets = document.querySelectorAll(
  ".hero-content, .intro-item, .section-heading, .price-card, .idv-table, .member-panel, .contact-copy, .rules, .contact-button",
);

revealTargets.forEach((element, index) => {
  element.classList.add("reveal");
  element.style.setProperty("--reveal-delay", `${Math.min(index * 55, 420)}ms`);
});

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    });
  },
  {
    threshold: 0.16,
    rootMargin: "0px 0px -8% 0px",
  },
);

revealTargets.forEach((element) => observer.observe(element));

window.addEventListener(
  "pointermove",
  (event) => {
    const x = (event.clientX / window.innerWidth - 0.5).toFixed(3);
    const y = (event.clientY / window.innerHeight - 0.5).toFixed(3);

    root.style.setProperty("--pointer-x", x);
    root.style.setProperty("--pointer-y", y);
  },
  { passive: true },
);

window.addEventListener(
  "scroll",
  () => {
    root.style.setProperty("--scroll-y", Math.min(window.scrollY / 900, 1).toFixed(3));
  },
  { passive: true },
);

const accountModal = document.querySelector("[data-account-modal]");
const accountForm = document.querySelector("[data-account-form]");
const accountName = document.querySelector("#account-name");
const accountStatus = document.querySelector("#account-status");
const rewardPoints = document.querySelector("#reward-points");
const rewardOrders = document.querySelector("#reward-orders");
const rewardTier = document.querySelector("#reward-tier");
const rewardProgress = document.querySelector("#reward-progress");
const rewardNext = document.querySelector("#reward-next");
const discordProfile = document.querySelector("#discord-profile");
const discordAvatar = document.querySelector("#discord-avatar");
const discordName = document.querySelector("#discord-name");
const discordId = document.querySelector("#discord-id");
const chatPanel = document.querySelector("[data-chat-panel]");
const chatLog = document.querySelector("[data-chat-log]");
const chatForm = document.querySelector("[data-chat-form]");

const safeJsonRead = (key, fallback) => {
  try {
    if (typeof localStorage === "undefined") return fallback;
    return JSON.parse(localStorage.getItem(key)) || fallback;
  } catch {
    return fallback;
  }
};

const safeJsonWrite = (key, value) => {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(key, JSON.stringify(value));
    }
  } catch {
    // Static preview mode can disable storage. The site still works without logs.
  }
};

const getVisitorLabel = () => {
  const account = loadAccount();
  const discord = loadDiscordProfile();

  if (discord?.username) return `${discord.username} (${discord.id})`;
  if (account.created && account.name) return account.name;
  return "游客";
};

const writeAdminLog = (action, detail = {}) => {
  const logs = safeJsonRead(adminLogsKey, []);
  logs.unshift({
    at: new Date().toISOString(),
    action,
    user: getVisitorLabel(),
    ip: cachedVisitorIp,
    path: window.location.pathname,
    userAgent: navigator.userAgent,
    detail,
  });
  safeJsonWrite(adminLogsKey, logs.slice(0, 300));
};

const writeChatLog = (speaker, message) => {
  const logs = safeJsonRead(chatLogsKey, []);
  logs.unshift({
    at: new Date().toISOString(),
    speaker,
    message,
    user: getVisitorLabel(),
    ip: cachedVisitorIp,
    path: window.location.pathname,
  });
  safeJsonWrite(chatLogsKey, logs.slice(0, 300));
};

const loadVisitorIp = async () => {
  try {
    const response = await fetch("https://api.ipify.org?format=json", { cache: "no-store" });
    const data = await response.json();
    cachedVisitorIp = data.ip || "未知";
  } catch {
    cachedVisitorIp = "未知";
  }
  writeAdminLog("访问网站", { title: document.title });
};

const defaultAccount = {
  name: "",
  contact: "",
  service: "IDV 陪玩",
  points: 0,
  orders: 0,
  created: false,
};

const loadAccount = () => {
  try {
    if (typeof localStorage === "undefined") return { ...defaultAccount, ...memoryAccount };
    return { ...defaultAccount, ...JSON.parse(localStorage.getItem(storageKey)) };
  } catch {
    return { ...defaultAccount };
  }
};

const saveAccount = (account) => {
  memoryAccount = account;
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(storageKey, JSON.stringify(account));
    }
  } catch {
    memoryAccount = account;
  }
};

const loadDiscordProfile = () => {
  try {
    if (typeof localStorage === "undefined") return null;
    return JSON.parse(localStorage.getItem(discordStorageKey));
  } catch {
    return null;
  }
};

const discordAvatarUrl = (profile) => {
  if (!profile?.avatar) return "https://cdn.discordapp.com/embed/avatars/0.png";
  return `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png?size=128`;
};

const openDiscordLogin = () => {
  const redirectUri = "https://shiyueidv.com/auth.html";
  const params = new URLSearchParams({
    client_id: discordClientId,
    redirect_uri: redirectUri,
    response_type: "token",
    scope: "identify",
    prompt: "consent",
  });

  writeAdminLog("点击 Discord 登录", { redirectUri });
  window.location.href = `https://discord.com/oauth2/authorize?${params.toString()}`;
};

const getTier = (points) => {
  if (points >= 2000) return { name: "钻石", next: "已解锁最高等级", progress: 100 };
  if (points >= 500) return { name: "黄金", next: `距离钻石会员还需 ${2000 - points} 积分。`, progress: ((points - 500) / 1500) * 100 };
  return { name: "白银", next: `距离黄金会员还需 ${500 - points} 积分。`, progress: (points / 500) * 100 };
};

const renderAccount = () => {
  const account = loadAccount();
  const discord = loadDiscordProfile();
  const tier = getTier(account.points);

  accountName.textContent = account.created ? `${account.name} 的会员档案` : "游客档案";
  accountStatus.textContent = account.created
    ? `常玩业务：${account.service}。客服将通过 ${account.contact} 联系你。`
    : "创建账号后可保存昵称、联系方式、累计奖励与客服记录。";
  rewardPoints.textContent = account.points;
  rewardOrders.textContent = account.orders;
  rewardTier.textContent = tier.name;
  rewardProgress.style.width = `${Math.min(tier.progress, 100)}%`;
  rewardNext.textContent = tier.next;

  if (discord) {
    discordProfile.hidden = false;
    discordAvatar.src = discordAvatarUrl(discord);
    discordAvatar.alt = `${discord.username} 的 Discord 头像`;
    discordName.textContent = discord.username || discord.rawUsername || "Discord 用户";
    discordId.textContent = `Discord ID: ${discord.id}`;
    if (!account.created && discord.username) {
      accountName.textContent = `${discord.username} 的会员档案`;
      accountStatus.textContent = "Discord 已连接。你还可以补充联系方式，方便客服确认订单。";
    }
  } else {
    discordProfile.hidden = true;
  }
};

const openAccountModal = () => {
  const account = loadAccount();
  accountModal.classList.add("is-open");
  accountModal.setAttribute("aria-hidden", "false");
  accountForm.elements.name.value = account.name;
  accountForm.elements.contact.value = account.contact;
  accountForm.elements.service.value = account.service;
  accountForm.elements.name.focus();
};

const closeAccountModal = () => {
  accountModal.classList.remove("is-open");
  accountModal.setAttribute("aria-hidden", "true");
};

document.addEventListener("click", (event) => {
  if (event.target.closest("[data-open-account]")) openAccountModal();
  if (event.target.closest("[data-close-account]")) closeAccountModal();
  if (event.target.closest("[data-add-order]")) {
    const account = loadAccount();
    const updated = {
      ...account,
      orders: account.orders + 1,
      points: account.points + 120,
    };

    saveAccount(updated);
    renderAccount();
    writeAdminLog("模拟完成一单", { pointsAdded: 120, totalPoints: updated.points, totalOrders: updated.orders });
  }
  if (event.target.closest("[data-reset-account]")) {
    memoryAccount = null;
    try {
      if (typeof localStorage !== "undefined") localStorage.removeItem(storageKey);
    } catch {
      memoryAccount = null;
    }
    renderAccount();
    writeAdminLog("重置本地账号");
  }
  if (event.target.closest("[data-open-chat]")) {
    openChat();
    writeAdminLog("打开客服窗口");
  }
  if (event.target.closest("[data-close-chat]")) {
    closeChat();
    writeAdminLog("关闭客服窗口");
  }
  if (event.target.closest("[data-discord-login]")) openDiscordLogin();
});

accountModal.addEventListener("click", (event) => {
  if (event.target === accountModal) closeAccountModal();
});

accountForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const existing = loadAccount();
  const account = {
    ...existing,
    name: accountForm.elements.name.value.trim(),
    contact: accountForm.elements.contact.value.trim(),
    service: accountForm.elements.service.value,
    points: existing.created ? existing.points : existing.points + 80,
    created: true,
  };

  saveAccount(account);
  renderAccount();
  closeAccountModal();
  writeAdminLog("创建或更新账号", { name: account.name, contact: account.contact, service: account.service });
});

const openChat = () => {
  chatPanel.classList.add("is-open");
  chatPanel.setAttribute("aria-hidden", "false");
  chatForm.elements.message.focus();
};

const closeChat = () => {
  chatPanel.classList.remove("is-open");
  chatPanel.setAttribute("aria-hidden", "true");
};

const addMessage = (text, type = "support") => {
  const message = document.createElement("p");
  message.className = `message ${type}`;
  message.textContent = text;
  chatLog.append(message);
  chatLog.scrollTop = chatLog.scrollHeight;
};

chatForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const input = chatForm.elements.message;
  const text = input.value.trim();

  if (!text) return;

  addMessage(text, "user");
  writeAdminLog("发送客服消息", { message: text });
  writeChatLog("客户", text);
  input.value = "";

  window.setTimeout(() => {
    const reply = "收到。请补充游戏 ID、区服、当前段位和想预约的时间，我们会按价格表给你确认最终报价。";
    addMessage(reply);
    writeChatLog("客服", reply);
  }, 520);
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeAccountModal();
    closeChat();
  }
});

renderAccount();
loadVisitorIp();
