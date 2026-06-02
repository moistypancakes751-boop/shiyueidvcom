const root = document.documentElement;
const cards = [...document.querySelectorAll(".member-profile")];
const groups = [...document.querySelectorAll(".member-group")];
const animatedElements = [
  ...document.querySelectorAll(
    ".members-hero-copy, .member-showcase .section-heading, .showcase-description, .member-filters, .member-group-heading, .member-profile",
  ),
];
const filterForm = document.querySelector("[data-member-filters]");
const rankFilter = document.querySelector("[data-rank-filter]");
const characterFilter = document.querySelector("[data-character-filter]");
const filterCount = document.querySelector("[data-filter-count]");
const emptyMessage = document.querySelector("[data-member-empty]");

root.classList.add("enhanced");

const rankRules = [
  { value: 9, pattern: /巅七|顶级屠夫|双百星/ },
  { value: 8, pattern: /巅峰|高星|S舞女|历史高排名/ },
  { value: 7, pattern: /七阶|双七阶/ },
  { value: 6, pattern: /高阶/ },
];

const normalize = (value) => value.trim().toLowerCase().replace(/\s+/g, "");

const inferRank = (text) => {
  const rule = rankRules.find((item) => item.pattern.test(text));
  return rule ? rule.value : 0;
};

cards.forEach((card, index) => {
  const searchText = card.textContent || "";
  card.dataset.rankValue = String(inferRank(searchText));
  card.dataset.searchText = normalize(searchText);
  card.style.setProperty("--member-order", String(index % 8));
});

if ("IntersectionObserver" in window) {
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      });
    },
    {
      threshold: 0.14,
      rootMargin: "0px 0px -7% 0px",
    },
  );

  animatedElements.forEach((element, index) => {
    element.classList.add("member-reveal");
    element.style.setProperty("--reveal-delay", `${Math.min(index * 34, 360)}ms`);
    revealObserver.observe(element);
  });
} else {
  animatedElements.forEach((element) => element.classList.add("is-visible"));
}

const updateFilters = () => {
  if (!filterForm) return;

  const minRank = Number(rankFilter.value || 0);
  const character = normalize(characterFilter.value || "");
  let visibleCount = 0;

  cards.forEach((card) => {
    const rankMatch = Number(card.dataset.rankValue || 0) >= minRank;
    const characterMatch = !character || card.dataset.searchText.includes(character);
    const isVisible = rankMatch && characterMatch;

    card.hidden = !isVisible;
    card.classList.toggle("is-filtered-out", !isVisible);
    if (isVisible) {
      visibleCount += 1;
      card.style.setProperty("--member-order", String(visibleCount % 8));
    }
  });

  groups.forEach((group) => {
    const hasVisibleCard = [...group.querySelectorAll(".member-profile")].some((card) => !card.hidden);
    group.hidden = !hasVisibleCard;
  });

  if (emptyMessage) {
    emptyMessage.hidden = visibleCount > 0;
  }

  filterCount.textContent = visibleCount === cards.length ? `全部 ${cards.length} 位成员` : `符合条件 ${visibleCount} 位`;
};

filterForm?.addEventListener("input", updateFilters);
filterForm?.addEventListener("reset", () => {
  window.setTimeout(updateFilters, 0);
});

window.addEventListener(
  "pointermove",
  (event) => {
    root.style.setProperty("--pointer-x", (event.clientX / window.innerWidth - 0.5).toFixed(3));
    root.style.setProperty("--pointer-y", (event.clientY / window.innerHeight - 0.5).toFixed(3));
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

updateFilters();
