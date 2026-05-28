const root = document.documentElement;

root.classList.add("enhanced");

const revealTargets = document.querySelectorAll(
  ".hero-content, .intro-item, .section-heading, .price-card, .idv-table, .contact-copy, .rules, .contact-button",
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
