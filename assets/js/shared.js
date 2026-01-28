// assets/js/shared.js
// Utilitários e comportamentos globais do Regenera

/* ===============================
   Utils
================================ */
export function esc(s = "") {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/* ===============================
   Theme (dark / light)
================================ */
export function applyThemeInit() {
  const btnTheme  = document.getElementById("btnTheme");
  const themeIcon = document.getElementById("themeIcon");
  const themeText = document.getElementById("themeText");

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("regenera_theme", theme);

    const isLight = theme === "light";
    if (themeIcon) {
      themeIcon.className =
        "fa-solid " + (isLight ? "fa-sun" : "fa-moon") + " mr-2";
    }
    if (themeText) {
      themeText.textContent = isLight ? "Light" : "Dark";
    }
  }

  const saved = localStorage.getItem("regenera_theme");
  applyTheme(saved === "light" || saved === "dark" ? saved : "dark");

  btnTheme?.addEventListener("click", () => {
    const current =
      document.documentElement.getAttribute("data-theme") || "dark";
    applyTheme(current === "dark" ? "light" : "dark");
  });
}

/* ===============================
   Reveal on scroll
================================ */
export function initReveal() {
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) entry.target.classList.add("on");
      });
    },
    { threshold: 0.12 }
  );

  document.querySelectorAll(".reveal").forEach((el) => io.observe(el));
}

/* ===============================
   Locks / Permissions (UI only)
================================ */
export function setLocked(el, locked) {
  if (!el) return;

  if (locked) {
    if (!el.dataset.href && el.getAttribute("href")) {
      el.dataset.href = el.getAttribute("href");
    }
    el.removeAttribute("href");
    el.classList.add("locked");
    el.setAttribute("aria-disabled", "true");
    el.title = "Acesso restrito";
  } else {
    if (el.dataset.href) el.setAttribute("href", el.dataset.href);
    el.classList.remove("locked");
    el.removeAttribute("aria-disabled");
    el.removeAttribute("title");
  }
}

export function applyLocksToMenu({ isAdmin = false, isTech = false }) {
  document.querySelectorAll("[data-requires]").forEach((el) => {
    const req = el.getAttribute("data-requires");

    const locked =
      (req === "admin" && !isAdmin) ||
      (req === "tech" && !isTech);

    setLocked(el, locked);

    const lockIcon = el.querySelector("[data-lock]");
    if (lockIcon) {
      lockIcon.innerHTML = locked
        ? '<i class="fa-solid fa-lock"></i>'
        : '<i class="fa-solid fa-lock-open"></i>';
    }
  });
}
