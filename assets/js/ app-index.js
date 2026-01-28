// assets/js/app-index.js
import {
  applyThemeInit,
  initReveal,
  applyLocksToMenu,
  setLocked,
  esc
} from "./shared.js";

/* ===============================
   Init UI
================================ */
applyThemeInit();
initReveal();

/* ===============================
   Spotlight (leve)
================================ */
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

/* ===============================
   Firebase init (COMPAT)
================================ */
const fb = window.initFirebaseCompat?.();
const auth = fb?.auth;
const db   = fb?.db;

/* ===============================
   Auth UI
================================ */
const btnLogin  = document.getElementById("btnLogin");
const btnLogout = document.getElementById("btnLogout");

btnLogout?.addEventListener("click", async () => {
  try {
    await auth.signOut();
    window.location.href = "index.html";
  } catch (e) {
    console.error(e);
    alert("Erro ao sair.");
  }
});

/* ===============================
   Firestore collections
================================ */
const ADM_COL   = "admins";
const TECH_COL  = "tecnicos";
const CARDS_COL = "cards_usuarios";

/* ===============================
   Helpers
================================ */
function badge(text, tone = "user") {
  const map = {
    admin: "bg-emerald-400/10 border-emerald-300/20 text-emerald-100",
    tech:  "bg-cyan-400/10 border-cyan-300/20 text-cyan-100",
    user:  "bg-white/10 border-white/10 text-zinc-200/80",
    warn:  "bg-amber-300/10 border-amber-200/20 text-amber-100"
  };
  const cls = map[tone] || map.user;
  return `<span class="text-[11px] px-2 py-1 rounded-xl border ${cls}">${esc(text)}</span>`;
}

async function getRole(uid) {
  let isAdmin = false, isTech = false;

  try {
    const a = await db.collection(ADM_COL).doc(uid).get();
    isAdmin = a.exists && (a.data()?.active === true);
  } catch {}

  try {
    const t = await db.collection(TECH_COL).doc(uid).get();
    isTech = t.exists && (t.data()?.active === true);
  } catch {}

  return { isAdmin, isTech };
}

async function getUserCard(uid) {
  try {
    const q = await db.collection(CARDS_COL).where("uid","==",uid).limit(1).get();
    if (!q.empty) return { id: q.docs[0].id, data: q.docs[0].data() || {} };
  } catch {}
  return null;
}

/* ===============================
   Coletas (admin x user)
================================ */
function setColetasLinks(isAdmin) {
  const href = isAdmin ? "coletas.html" : "coletas-view.html";
  ["linkColetasHero","linkColetasNode","linkColetasCTA"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.setAttribute("href", href);
  });
}

/* ===============================
   User card + locks
================================ */
async function showUserCard(u) {
  const wrap = document.getElementById("userCardWrap");
  if (!wrap) return;

  const { isAdmin, isTech } = await getRole(u.uid);
  const card = await getUserCard(u.uid);

  // coletas link (admin/user)
  setColetasLinks(isAdmin);

  const displayName = (card?.data?.nome) || u.displayName || "Usuário";
  const email = u.email || (card?.data?.email) || "—";
  const photo = u.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(displayName)}`;

  const ucName = document.getElementById("ucName");
  const ucEmail = document.getElementById("ucEmail");
  const ucAvatar = document.getElementById("ucAvatar");
  if (ucName) ucName.textContent = displayName;
  if (ucEmail) ucEmail.textContent = email;
  if (ucAvatar) ucAvatar.src = photo;

  const badges = [];
  if (isAdmin) badges.push(badge("Admin", "admin"));
  if (isTech) badges.push(badge("Técnico", "tech"));
  if (!isAdmin && !isTech) badges.push(badge("Usuário", "user"));
  if (card?.data?.fase) badges.push(badge(`Fase: ${card.data.fase}`, "warn"));
  if (Array.isArray(card?.data?.trilhas) && card.data.trilhas.length) {
    badges.push(badge(`Trilhas: ${card.data.trilhas.length}`, "user"));
  }
  const ucBadges = document.getElementById("ucBadges");
  if (ucBadges) ucBadges.innerHTML = badges.join("");

  const extra = [];
  if (!card) {
    extra.push("Seu card ainda não foi vinculado. Peça ao admin para preencher seu UID no Kanban (cards_usuarios.uid).");
  } else {
    if (card.data.obs) extra.push(`<b>Obs:</b> ${esc(card.data.obs)}`);
    if (Array.isArray(card.data.trilhas) && card.data.trilhas.length) {
      extra.push(`<b>Trilhas:</b> ${card.data.trilhas.map(esc).join(", ")}`);
    }
  }
  const ucExtra = document.getElementById("ucExtra");
  if (ucExtra) ucExtra.innerHTML = extra.length ? extra.join("<br/>") : "";

  // locks nos botões do card
  const btnAdmin = document.getElementById("btnGoAdmin");
  const btnServ  = document.getElementById("btnGoServices");
  const lockAdmin = document.getElementById("lockAdmin");
  const lockServ  = document.getElementById("lockServices");

  const adminLocked = !isAdmin;
  const servLocked  = !isTech;

  setLocked(btnAdmin, adminLocked);
  setLocked(btnServ, servLocked);

  if (lockAdmin) lockAdmin.innerHTML = adminLocked ? '<i class="fa-solid fa-lock"></i>' : '<i class="fa-solid fa-lock-open"></i>';
  if (lockServ)  lockServ.innerHTML  = servLocked  ? '<i class="fa-solid fa-lock"></i>' : '<i class="fa-solid fa-lock-open"></i>';

  // aplica travas em tudo com data-requires
  applyLocksToMenu({ isAdmin, isTech });

  wrap.classList.remove("hidden");
  wrap.classList.add("on");
}

/* ===============================
   Auth state
================================ */
auth?.onAuthStateChanged(async (u) => {
  if (!u) {
    btnLogin?.classList.remove("hidden");
    btnLogout?.classList.add("hidden");

    applyLocksToMenu({ isAdmin: false, isTech: false });
    setColetasLinks(false);

    document.getElementById("userCardWrap")?.classList.add("hidden");
    return;
  }

  btnLogin?.classList.add("hidden");
  btnLogout?.classList.remove("hidden");

  await showUserCard(u);
});

/* ===============================
   Orbit UX
================================ */
const orbit = document.getElementById("orbitLayer");
if (orbit) {
  orbit.addEventListener("mouseenter", () => orbit.style.animationPlayState = "paused");
  orbit.addEventListener("mouseleave", () => orbit.style.animationPlayState = "running");
}

/* ===============================
   Magnet effect
================================ */
document.querySelectorAll(".circleWrap .node").forEach((node) => {
  node.addEventListener("mousemove", (e) => {
    const r = node.getBoundingClientRect();
    const dx = (e.clientX - (r.left + r.width / 2)) / r.width;
    const dy = (e.clientY - (r.top + r.height / 2)) / r.height;
    node.style.transform = `translate(-50%,-50%) scale(1.07) translate(${dx * 6}px, ${dy * 6}px)`;
  });
  node.addEventListener("mouseleave", () => {
    node.style.transform = "translate(-50%,-50%)";
  });
});
