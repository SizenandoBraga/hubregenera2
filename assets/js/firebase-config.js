// assets/js/firebase-config.js

const firebaseConfig = {
  apiKey: "AIzaSyDW_klsXP3xag-Sg_LJiN8PvIOX9q4V8z4",
  authDomain: "hub-regenera-2.firebaseapp.com",
  projectId: "hub-regenera-2",
  storageBucket: "hub-regenera-2.firebasestorage.app",
  messagingSenderId: "567018725607",
  appId: "1:567018725607:web:2f5e43e836c827d2428242"
};

window.initFirebaseCompat = function initFirebaseCompat() {
  if (!window.firebase) {
    console.warn("Firebase não carregou (scripts CDN).");
    return null;
  }
  if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
  return { auth: firebase.auth(), db: firebase.firestore() };
};
