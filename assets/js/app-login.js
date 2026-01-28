// assets/js/app-login.js
import { applyThemeInit, initReveal, esc } from "./shared.js";

applyThemeInit();
initReveal();

// respeitar next (redirect pós-login)
const params = new URLSearchParams(window.location.search);
const nextUrl = params.get("next") || "index.html";

/* ===============================
   Spotlight leve
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
   Firebase
================================ */
const fb = window.initFirebaseCompat?.();
const auth = fb?.auth;
const db   = fb?.db;

/* ===============================
   UI refs
================================ */
const tabLogin  = document.getElementById("tabLogin");
const tabSignup = document.getElementById("tabSignup");
const tabReset  = document.getElementById("tabReset");

const form = document.getElementById("formAuth");

const rowName = document.getElementById("rowName");
const rowPassword = document.getElementById("rowPassword");
const rowPassword2 = document.getElementById("rowPassword2");

const nameEl = document.getElementById("name");
const emailEl = document.getElementById("email");
const passEl = document.getElementById("password");
const pass2El = document.getElementById("password2");

const btnTogglePass = document.getElementById("btnTogglePass");
const btnSubmit = document.getElementById("btnSubmit");
const btnText = document.getElementById("btnText");
const btnSpinner = document.getElementById("btnSpinner");
const hint = document.getElementById("hint");

const alertBox = document.getElementById("alert");

let mode = "login"; // login | signup | reset

/* ===============================
   Helpers
================================ */
function setTabActive() {
  const base = "px-3 py-2 rounded-2xl glass border font-semibold hover:opacity-95 transition";
  const active = "ring-1 ring-white/20";

  [tabLogin, tabSignup, tabReset].forEach((b) => {
    if (!b) return;
    b.className = base;
    b.style.borderColor = "var(--glassBorder)";
  });

  const map = { login: tabLogin, signup: tabSignup, reset: tabReset };
  const btn = map[mode];
  if (btn) btn.className = `${base} ${active}`;
}

function setMode(next) {
  mode = next;
  setTabActive();
  hideAlert();

  const isLogin = mode === "login";
  const isSignup = mode === "signup";
  const isReset = mode === "reset";

  rowName?.classList.toggle("hidden", !isSignup);
  rowPassword?.classList.toggle("hidden", isReset);
  rowPassword2?.classList.toggle("hidden", !isSignup);

  if (passEl) passEl.required = !isReset;
  if (pass2El) pass2El.required = isSignup;

  if (btnText) btnText.textContent = isLogin ? "Entrar" : isSignup ? "Criar conta" : "Enviar e-mail";
  if (hint) {
    hint.textContent =
      isLogin ? "Entre para acessar conteúdos e serviços."
      : isSignup ? "Crie sua conta para começar."
      : "Você receberá um link para redefinir sua senha.";
  }

  if (passEl) passEl.autocomplete = isSignup ? "new-password" : "current-password";
}

function showAlert(type, message) {
  if (!alertBox) return;
  alertBox.classList.remove("hidden");
  const isOk = type === "ok";
  alertBox.className =
    `mt-4 rounded-2xl border px-4 py-3 text-sm ${
      isOk ? "bg-emerald-400/10 text-emerald-100" : "bg-amber-300/10 text-amber-100"
    }`;
  alertBox.style.borderColor = "var(--glassBorder)";
  alertBox.innerHTML = `<b>${isOk ? "Pronto:" : "Atenção:"}</b> ${esc(message)}`;
}

function hideAlert() {
  if (!alertBox) return;
  alertBox.classList.add("hidden");
  alertBox.textContent = "";
}

function setLoading(isLoading) {
  if (!btnSubmit || !btnSpinner || !btnText) return;
  btnSubmit.disabled = isLoading;
  btnSpinner.classList.toggle("hidden", !isLoading);
  btnText.classList.toggle("opacity-70", isLoading);
}

function friendlyAuthError(code) {
  const map = {
    "auth/invalid-email": "E-mail inválido.",
    "auth/user-not-found": "Usuário não encontrado.",
    "auth/wrong-password": "Senha incorreta.",
    "auth/too-many-requests": "Muitas tentativas. Aguarde e tente novamente.",
    "auth/email-already-in-use": "Este e-mail já está em uso.",
    "auth/weak-password": "Senha fraca. Use pelo menos 6 caracteres.",
    "auth/network-request-failed": "Falha de rede. Verifique sua conexão.",
    "auth/missing-password": "Informe uma senha."
  };
  return map[code] || "Erro ao autenticar. Verifique seus dados e tente novamente.";
}

/* ===============================
   Events
================================ */
btnTogglePass?.addEventListener("click", () => {
  if (!passEl) return;
  const isPass = passEl.type === "password";
  passEl.type = isPass ? "text" : "password";
  btnTogglePass.setAttribute("aria-label", isPass ? "Ocultar senha" : "Mostrar senha");
  const icon = btnTogglePass.querySelector("i");
  if (icon) icon.className = "fa-solid " + (isPass ? "fa-eye-slash" : "fa-eye");
});

tabLogin?.addEventListener("click", () => setMode("login"));
tabSignup?.addEventListener("click", () => setMode("signup"));
tabReset?.addEventListener("click", () => setMode("reset"));

setMode("login");

// se já estiver logado, volta pro next
auth?.onAuthStateChanged((u) => {
  if (u) window.location.href = nextUrl;
});

/* ===============================
   Submit
================================ */
form?.addEventListener("submit", async (e) => {
  e.preventDefault();
  hideAlert();

  if (!auth) {
    showAlert("err", "Firebase não inicializou. Confira os scripts e o firebase-config.js.");
    return;
  }

  const email = (emailEl?.value || "").trim();
  const password = passEl?.value || "";
  const password2 = pass2El?.value || "";
  const displayName = (nameEl?.value || "").trim();

  if (!email) return showAlert("err", "Informe seu e-mail.");

  if (mode === "signup") {
    if (!password || password.length < 6) return showAlert("err", "Use uma senha com pelo menos 6 caracteres.");
    if (password !== password2) return showAlert("err", "As senhas não conferem.");
  }

  try {
    setLoading(true);

    if (mode === "login") {
      await auth.signInWithEmailAndPassword(email, password);
      window.location.href = nextUrl;
      return;
    }

    if (mode === "reset") {
      await auth.sendPasswordResetEmail(email);
      showAlert("ok", "E-mail enviado! Verifique sua caixa de entrada (e spam).");
      return;
    }

    // signup
    const cred = await auth.createUserWithEmailAndPassword(email, password);

    if (displayName) {
      await cred.user.updateProfile({ displayName });
    }

    // cria perfil mínimo (não é o Kanban)
    try {
      await db?.collection("users")?.doc(cred.user.uid)?.set({
        uid: cred.user.uid,
        email,
        nome: displayName || "",
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    } catch (e2) {
      console.warn("Falha ao criar users/{uid}:", e2);
    }

    window.location.href = nextUrl;
  } catch (err) {
    console.error(err);
    showAlert("err", friendlyAuthError(err?.code));
  } finally {
    setLoading(false);
  }
});
