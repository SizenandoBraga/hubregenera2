// assets/js/app-index.js
import { applyThemeInit, initReveal, applyLocksToMenu, setLocked, esc } from "./shared.js";

/* ===============================
   Init UI básica
================================ */
applyThemeInit();
initReveal();

/* ===============================
   Spotlight (leve, com throttle)
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
   Auth buttons
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
  return `<span class="text-[11px] px-2 py-1 rounded-xl border ${map[tone] || map.user}">${esc(text)}</span>`;
}

async function getRole(uid){
  let isAdmin = false, isTech = false;

  try {
    const a = await db.collection(ADM_COL).doc(uid).get();
    isAdmin = a.exists && a.data()?.active === true;
  } catch {}

  try {
    const t = await db.collection(TECH_COL).doc(uid).get();
    isTech = t.exists && t.data()?.active === true;
  } catch {}

  return { isAdmin, isTech };
}

async function getUserCard(uid){
  try {
    const q = await db.collection(CARDS_COL).where("uid","==",uid).limit(1).get();
    if (!q.empty) return q.docs[0].data();
  } catch {}
  return null;
}

/* ===============================
   Coletas (admin x user)
================================ */
function setColetasLinks(isAdmin){
  const href = isAdmin ? "coletas.html" : "coletas-view.html";
  ["linkColetasHero","linkColetasNode","linkColetasCTA"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.setAttribute("href", href);
  });
}

/* ===============================
   User card
================================ */
async function showUserCard(user){
  const wrap = document.getElementById("userCardWrap");
  if (!wrap) return;

  const { isAdmin, isTech } = await getRole(user.uid);
  const card = await getUserCard(user.uid);

  setColetasLinks(isAdmin);

  const displayName = card?.nome || user.displayName || "Usuário";
  const email = user.email || card?.email || "—";
  const avatar =
    user.photoURL ||
    `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(displayName)}`;

  document.getElementById("ucName").textContent = displayName;
  document.getElementById("ucEmail").textContent = email;
  document.getElementById("ucAvatar").src = avatar;

  const badges = [];
  if (isAdmin) badges.push(badge("Admin", "admin"));
  if (isTech)  badges.push(badge("Técnico", "tech"));
  if (!isAdmin && !isTech) badges.push(badge("Usuário", "user"));
  if (card?.fase) badges.push(badge(`Fase: ${card.fase}`, "warn"));

  document.getElementById("ucBadges").innerHTML = badges.join("");

  const extra = [];
  if (!card) {
    extra.push("Seu card ainda não foi vinculado. Peça ao admin para associar seu UID.");
  } else {
    if (card.obs) extra.push(`<b>Obs:</b> ${esc(card.obs)}`);
    if (Array.isArray(card.trilhas) && card.trilhas.length) {
      extra.push(`<b>Trilhas:</b> ${card.trilhas.map(esc).join(", ")}`);
    }
  }
  document.getElementById("ucExtra").innerHTML = extra.join("<br>");

  // Botões do card
  const btnAdmin = document.getElementById("btnGoAdmin");
  const btnServ  = document.getElementById("btnGoServices");

  setLocked(btnAdmin, !isAdmin);
  setLocked(btnServ, !isTech);

  document.getElementById("lockAdmin").innerHTML =
    isAdmin ? '<i class="fa-solid fa-lock-open"></i>' : '<i class="fa-solid fa-lock"></i>';

  document.getElementById("lockServices").innerHTML =
    isTech ? '<i class="fa-solid fa-lock-open"></i>' : '<i class="fa-solid fa-lock"></i>';

  applyLocksToMenu({ isAdmin, isTech });

  wrap.classList.remove("hidden");
  wrap.classList.add("on");
}

/* ===============================
   Auth state listener
================================ */
auth?.onAuthStateChanged(async (user) => {
  if (!user) {
    btnLogin?.classList.remove("hidden");
    btnLogout?.classList.add("hidden");

    applyLocksToMenu({ isAdmin:false, isTech:false });
    setColetasLinks(false);

    document.getElementById("userCardWrap")?.classList.add("hidden");
    return;
  }

  btnLogin?.classList.add("hidden");
  btnLogout?.classList.remove("hidden");

  await showUserCard(user);
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
    node.style.transform =
      `translate(-50%,-50%) scale(1.07) translate(${dx * 6}px, ${dy * 6}px)`;
  });
  node.addEventListener("mouseleave", () => {
    node.style.transform = "translate(-50%,-50%)";
  });
});
