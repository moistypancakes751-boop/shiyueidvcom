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
  rmbEl.animate(
    [
      { transform: "translateY(-2px)", opacity: 0.7 },
      { transform: "translateY(0)", opacity: 1 },
    ],
    { duration: 180, easing: "ease-out" },
  );
};

const syncPayCards = () => {
  document.querySelectorAll(".pay-card").forEach((card) => {
    const input = card.querySelector("input");
    card.classList.toggle("is-selected", input.checked);
  });
};

modeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    coinMode = button.dataset.coinMode;
    modeButtons.forEach((item) => item.classList.toggle("is-active", item === button));
    statusEl.textContent = coinMode === "recharge" ? "请按显示金额支付，付款后点击继续提交审核。" : "请选择提现收款方式，提交后等待管理处理。";
  });
});

form.elements.coins.addEventListener("input", formatRmb);
form.elements.payment.forEach((item) => item.addEventListener("change", syncPayCards));
formatRmb();
syncPayCards();

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const submitButton = form.querySelector("button[type='submit']");

  const coins = Number(form.elements.coins.value || 0);
  if (!Number.isFinite(coins) || coins <= 0) {
    statusEl.textContent = "请填写正确的誓约币数量。";
    return;
  }

  const payload = {
    p_source: "site",
    p_action: coinMode,
    p_discord_id: form.elements.discordId.value.trim(),
    p_discord_name: form.elements.discordName.value.trim(),
    p_coins: Math.round(coins),
    p_payment_method: form.elements.payment.value,
  };

  if (!payload.p_discord_id || !payload.p_discord_name) {
    statusEl.textContent = "请填写 Discord ID 和名字。";
    return;
  }

  statusEl.textContent = "正在提交审核...";
  submitButton.disabled = true;
  try {
    if (!coinSupabase) throw new Error("Supabase 未配置");
    const { data, error } = await coinSupabase.rpc("create_coin_request", payload);
    if (error) throw error;
    const params = new URLSearchParams({
      id: data.order_code || data.id || "",
      action: data.action || coinMode,
      coins: String(data.coins || payload.p_coins),
      rmb: String(data.rmb_amount || (payload.p_coins / 10).toFixed(2)),
    });
    window.location.href = `./coin-thank-you.html?${params.toString()}`;
  } catch (error) {
    const message = error?.message || "";
    if (message.includes("ACTIVE_COIN_REQUEST")) {
      statusEl.textContent = `你已有一个待处理誓约币申请，请等待管理员处理后再提交。${message.split(":").pop() || ""}`;
    } else if (message.includes("COOLDOWN_10_MINUTES")) {
      statusEl.textContent = "你刚提交过申请，请等待 10 分钟后再提交新的申请。";
    } else {
      statusEl.textContent = "提交失败，请确认 Supabase SQL 已更新，或联系管理手动处理。";
    }
    submitButton.disabled = false;
  }
});
