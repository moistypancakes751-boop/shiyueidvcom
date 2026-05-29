const coinSupabase =
  window.supabase && window.SY_SUPABASE_URL && window.SY_SUPABASE_ANON_KEY
    ? window.supabase.createClient(window.SY_SUPABASE_URL, window.SY_SUPABASE_ANON_KEY)
    : null;

const form = document.querySelector("[data-coin-form]");
const statusEl = document.querySelector("[data-coin-status]");
const rmbEl = document.querySelector("[data-rmb-amount]");
const modeButtons = document.querySelectorAll("[data-coin-mode]");
let coinMode = "recharge";

const discordProfile = (() => {
  try {
    return JSON.parse(localStorage.getItem("syDiscordProfile")) || null;
  } catch {
    return null;
  }
})();

if (discordProfile) {
  form.elements.discordId.value = discordProfile.id || "";
  form.elements.discordName.value = discordProfile.username || discordProfile.rawUsername || "";
}

const formatRmb = () => {
  const coins = Number(form.elements.coins.value || 0);
  rmbEl.textContent = `${(coins / 10).toFixed(2)} RMB`;
};

modeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    coinMode = button.dataset.coinMode;
    modeButtons.forEach((item) => item.classList.toggle("is-active", item === button));
    statusEl.textContent = coinMode === "recharge" ? "请按显示金额支付，付款后点击继续提交审核。" : "请选择提现收款方式，提交后等待管理处理。";
  });
});

form.elements.coins.addEventListener("input", formatRmb);
formatRmb();

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const coins = Number(form.elements.coins.value || 0);
  if (!Number.isFinite(coins) || coins <= 0) {
    statusEl.textContent = "请填写正确的誓约币数量。";
    return;
  }

  const payload = {
    source: "site",
    action: coinMode,
    discord_id: form.elements.discordId.value.trim(),
    discord_name: form.elements.discordName.value.trim(),
    coins: Math.round(coins),
    rmb_amount: Number((coins / 10).toFixed(2)),
    payment_method: form.elements.payment.value,
    status: "pending",
  };

  if (!payload.discord_id || !payload.discord_name) {
    statusEl.textContent = "请填写 Discord ID 和名字。";
    return;
  }

  statusEl.textContent = "正在提交审核...";
  try {
    if (!coinSupabase) throw new Error("Supabase 未配置");
    const { error } = await coinSupabase.from("coin_requests").insert(payload);
    if (error) throw error;
    statusEl.textContent = "申请已提交。请等待管理在 Discord 审核并处理誓约币。";
    form.reset();
    if (discordProfile) {
      form.elements.discordId.value = discordProfile.id || "";
      form.elements.discordName.value = discordProfile.username || discordProfile.rawUsername || "";
    }
    form.elements.coins.value = 100;
    formatRmb();
  } catch (error) {
    statusEl.textContent = "提交失败，请确认 Supabase SQL 已更新，或联系管理手动处理。";
  }
});
