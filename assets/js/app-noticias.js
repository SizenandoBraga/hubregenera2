// assets/js/app-noticias.js
import { applyThemeInit, initReveal, esc } from "./shared.js";

applyThemeInit();
initReveal();

// Spotlight leve
const bg = document.getElementById("bg");
let raf = null;
window.addEventListener("mousemove", (e) => {
  if (!bg || raf) return;
  raf = requestAnimationFrame(() => {
    const x = (e.clientX / window.innerWidth) * 100;
    const y = (e.clientY / window.innerHeight) * 100;
    bg.style.setProperty("--x", x + "%");
    bg.style.setProperty("--y", y + "%");
    raf = null;
  });
}, { passive: true });

// Firebase
const fb = window.initFirebaseCompat?.();
const auth = fb?.auth;
const db   = fb?.db;

// Topbar auth UI (simples)
const btnLogin  = document.getElementById("btnLogin");
const btnLogout = document.getElementById("btnLogout");

btnLogout?.addEventListener("click", async () => {
  try { await auth.signOut(); window.location.href = "noticias.html"; }
  catch(e){ console.error(e); alert("Erro ao sair."); }
});

auth?.onAuthStateChanged((u) => {
  if (!u) {
    btnLogin?.classList.remove("hidden");
    btnLogout?.classList.add("hidden");
    return;
  }
  btnLogin?.classList.add("hidden");
  btnLogout?.classList.remove("hidden");
});

/* ===============================
   UI refs
================================ */
const elList = document.getElementById("list");
const elEmpty = document.getElementById("empty");
const elSkel = document.getElementById("skeleton");
const elCount = document.getElementById("count");

const elQ = document.getElementById("q");
const elTerr = document.getElementById("territorio");
const elTipo = document.getElementById("tipo");

const btnClear = document.getElementById("btnClear");
const btnReload = document.getElementById("btnReload");

const btnPrev = document.getElementById("btnPrev");
const btnNext = document.getElementById("btnNext");
const elPage = document.getElementById("page");

/* ===============================
   State
================================ */
const COL = "noticias";
const PAGE_SIZE = 8;

let allDocs = [];          // cache client-side (para busca)
let filtered = [];
let page = 1;
let territOptionsLoaded = false;

/* ===============================
   Helpers
================================ */
function fmtDate(ts){
  try {
    const d = ts?.toDate ? ts.toDate() : (ts ? new Date(ts) : null);
    if (!d || isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("pt-BR", { year:"numeric", month:"short", day:"2-digit" });
  } catch { return "—"; }
}

function pill(text, tone="muted"){
  const map = {
    noticia: "bg-cyan-400/10 border-cyan-300/20 text-cyan-100",
    aviso: "bg-amber-300/10 border-amber-200/20 text-amber-100",
    comunicado: "bg-emerald-400/10 border-emerald-300/20 text-emerald-100",
    muted: "bg-white/10 border-white/10 text-zinc-200/80"
  };
  const cls = map[tone] || map.muted;
  return `<span class="text-[11px] px-2 py-1 rounded-xl border ${cls}">${esc(text)}</span>`;
}

function showSkeleton(show){
  elSkel?.classList.toggle("hidden", !show);
}

function setEmpty(show){
  elEmpty?.classList.toggle("hidden", !show);
  if (show) elEmpty?.classList.add("on");
}

function setCount(n){
  if (!elCount) return;
  elCount.textContent = n === 1 ? "1 item" : `${n} itens`;
}

function clampText(str="", max=160){
  const s = String(str || "");
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}

function renderCard(item){
  const tipo = item.tipo || "noticia";
  const territorio = item.territorio || "Geral";
  const title = item.titulo || "Sem título";
  const body = item.conteudo || item.resumo || "";
  const href = item.link || ""; // opcional

  const cover = item.capaUrl || ""; // opcional

  return `
  <article class="rounded-[2rem] glass-strong border shadow-soft overflow-hidden reveal"
           style="border-color: var(--glassBorder);">
    <div class="p-5">
      <div class="flex items-center justify-between gap-2">
        <div class="flex flex-wrap gap-1">
          ${pill(tipo.toUpperCase(), tipo)}
          ${pill(territorio, "muted")}
        </div>
        <div class="text-xs" style="color: var(--muted);">
          <i class="fa-regular fa-clock mr-1"></i>${fmtDate(item.publishedAt || item.createdAt)}
        </div>
      </div>

      <h3 class="mt-3 text-lg md:text-xl font-black leading-tight">${esc(title)}</h3>

      ${cover ? `
        <div class="mt-3 rounded-[1.5rem] overflow-hidden border"
             style="border-color: var(--glassBorder);">
          <img src="${esc(cover)}" alt="Capa da notícia" loading="lazy" class="w-full h-44 object-cover" />
        </div>
      ` : ""}

      <p class="mt-3 text-sm leading-relaxed" style="color: var(--muted);">
        ${esc(clampText(body, 220))}
      </p>

      <div class="mt-4 flex items-center justify-between gap-2">
        ${href ? `
          <a href="${esc(href)}" target="_blank" rel="noopener"
             class="px-4 py-2 rounded-2xl glass border hover:opacity-95 transition"
             style="border-color: var(--glassBorder);">
            Ler mais <i class="fa-solid fa-arrow-up-right-from-square ml-2"></i>
          </a>
        ` : `
          <button class="px-4 py-2 rounded-2xl glass border hover:opacity-95 transition"
                  style="border-color: var(--glassBorder);"
                  data-open="${esc(item.id)}">
            Abrir <i class="fa-solid fa-chevron-right ml-2"></i>
          </button>
        `}

        ${item.destacado ? pill("Destaque", "comunicado") : ""}
      </div>

      <div class="mt-4 hidden" id="full-${esc(item.id)}">
        <div class="mt-3 rounded-[1.5rem] glass border p-4"
             style="border-color: var(--glassBorder); color: var(--muted);">
          <p class="text-sm whitespace-pre-wrap">${esc(body || "—")}</p>
        </div>
      </div>
    </div>
  </article>`;
}

function wireOpenButtons(){
  document.querySelectorAll("[data-open]").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-open");
      const el = document.getElementById(`full-${id}`);
      if (!el) return;
      const isHidden = el.classList.contains("hidden");
      el.classList.toggle("hidden", !isHidden);
      btn.innerHTML = isHidden
        ? 'Fechar <i class="fa-solid fa-chevron-up ml-2"></i>'
        : 'Abrir <i class="fa-solid fa-chevron-right ml-2"></i>';
    });
  });
}

/* ===============================
   Filtering + pagination
================================ */
function applyFilters(){
  const q = (elQ?.value || "").trim().toLowerCase();
  const terr = elTerr?.value || "all";
  const tipo = elTipo?.value || "all";

  filtered = allDocs.filter((d) => {
    if (d.status && d.status !== "publicado") return false;

    if (terr !== "all" && String(d.territorio || "Geral") !== terr) return false;
    if (tipo !== "all" && String(d.tipo || "noticia") !== tipo) return false;

    if (q) {
      const hay = `${d.titulo || ""} ${d.resumo || ""} ${d.conteudo || ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  page = 1;
  render();
}

function pageSlice(){
  const start = (page - 1) * PAGE_SIZE;
  return filtered.slice(start, start + PAGE_SIZE);
}

function render(){
  elList.innerHTML = "";

  setCount(filtered.length);

  const slice = pageSlice();
  setEmpty(filtered.length === 0);

  // pagination
  const maxPage = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  elPage.textContent = String(page);
  btnPrev.disabled = page <= 1;
  btnNext.disabled = page >= maxPage;

  slice.forEach((item) => {
    elList.insertAdjacentHTML("beforeend", renderCard(item));
  });

  // ativar reveal em cards recém renderizados
  document.querySelectorAll(".reveal").forEach((el) => el.classList.add("on"));
  wireOpenButtons();
}

/* ===============================
   Load data
================================ */
async function loadTerritorioOptionsFromDocs(docs){
  if (territOptionsLoaded) return;

  const set = new Set();
  docs.forEach(d => set.add(String(d.territorio || "Geral")));
  const arr = Array.from(set).sort((a,b) => a.localeCompare(b));

  // limpar e recriar (mantém "Todos")
  const keepFirst = elTerr.querySelector('option[value="all"]');
  elTerr.innerHTML = "";
  elTerr.appendChild(keepFirst);
  arr.forEach(t => {
    const opt = document.createElement("option");
    opt.value = t;
    opt.textContent = t;
    elTerr.appendChild(opt);
  });

  territOptionsLoaded = true;
}

async function loadNoticias(){
  if (!db) {
    showSkeleton(false);
    setEmpty(true);
    elCount.textContent = "Firebase não inicializou.";
    return;
  }

  showSkeleton(true);
  setEmpty(false);

  try {
    // Leve e rápido: pega somente as mais recentes (ajuste para crescer)
    // Use publishedAt para ordenar; fallback createdAt
    const snap = await db.collection(COL)
      .orderBy("publishedAt", "desc")
      .limit(60)
      .get();

    allDocs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    await loadTerritorioOptionsFromDocs(allDocs);

    // default filters
    filtered = allDocs.filter(d => !d.status || d.status === "publicado");
    page = 1;

    render();
  } catch (e) {
    console.error(e);
    elList.innerHTML = "";
    setEmpty(true);
    elCount.textContent = "Erro ao carregar notícias.";
  } finally {
    showSkeleton(false);
  }
}

/* ===============================
   Events
================================ */
btnClear?.addEventListener("click", () => {
  elQ.value = "";
  elTerr.value = "all";
  elTipo.value = "all";
  applyFilters();
});

btnReload?.addEventListener("click", async () => {
  territOptionsLoaded = false;
  await loadNoticias();
  applyFilters();
});

elQ?.addEventListener("input", () => applyFilters());
elTerr?.addEventListener("change", () => applyFilters());
elTipo?.addEventListener("change", () => applyFilters());

btnPrev?.addEventListener("click", () => { page = Math.max(1, page - 1); render(); });
btnNext?.addEventListener("click", () => {
  const maxPage = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  page = Math.min(maxPage, page + 1);
  render();
});

// start
loadNoticias();
