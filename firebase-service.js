import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

let currentUser = null;
let unsubscribeFirestore = null;
let isApplyingRemoteUpdate = false;
let cloudReady = false;
let authResolved = false;
let isFirstAuthEvent = true;
let saveTimer = null;

function snapshotState(state) {
  return JSON.parse(
    JSON.stringify({
      projects: state.projects || [],
      tasks: state.tasks || [],
      events: state.events || [],
      classes: state.classes || [],
    }),
  );
}

async function persistState(state) {
  if (!currentUser || !cloudReady || isApplyingRemoteUpdate) return;
  try {
    setSyncStatus("syncing");
    const userRef = doc(db, "users", currentUser.uid);
    await setDoc(
      userRef,
      {
        ...state,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
    setSyncStatus("online");
  } catch (err) {
    console.error("Error guardando en Firestore:", err);
    setSyncStatus("error");
  }
}

function notifyAuthReady() {
  if (authResolved) return;
  authResolved = true;
  window.dispatchEvent(new Event("campusflow-auth-ready"));
}

window.FirebaseSync = {
  getUser: () => currentUser,
  hasResolvedAuth: () => authResolved,
  isCloudReady: () => cloudReady,

  loginWithGoogle: async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      return { success: true, user: result.user };
    } catch (error) {
      return { success: false, error: translateFirebaseError(error.code) };
    }
  },

  loginWithEmail: async (email, password) => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      return { success: true, user: result.user };
    } catch (error) {
      return { success: false, error: translateFirebaseError(error.code) };
    }
  },

  registerWithEmail: async (email, password) => {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      return { success: true, user: result.user };
    } catch (error) {
      return { success: false, error: translateFirebaseError(error.code) };
    }
  },

  logout: async () => {
    try {
      if (unsubscribeFirestore) {
        unsubscribeFirestore();
        unsubscribeFirestore = null;
      }
      cloudReady = false;
      clearTimeout(saveTimer);
      await signOut(auth);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  saveToCloud: (state) => {
    if (!currentUser || !cloudReady || isApplyingRemoteUpdate) return;
    const copy = snapshotState(state);
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      persistState(copy);
    }, 700);
  },
};

onAuthStateChanged(auth, async (user) => {
  currentUser = user;
  cloudReady = false;
  updateAuthUI(user);
  notifyAuthReady();

  if (unsubscribeFirestore) {
    unsubscribeFirestore();
    unsubscribeFirestore = null;
  }
  clearTimeout(saveTimer);

  if (!user) {
    setSyncStatus("offline");
    if (!isFirstAuthEvent && window.onUserLoggedOut) {
      window.onUserLoggedOut();
    }
    isFirstAuthEvent = false;
    return;
  }

  isFirstAuthEvent = false;
  setSyncStatus("syncing");
  const userRef = doc(db, "users", user.uid);

  try {
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      applyCloudDataToApp(snap.data());
    } else if (window.getCurrentAppState) {
      const localData = snapshotState(window.getCurrentAppState());
      await setDoc(userRef, {
        projects: localData.projects || [],
        tasks: localData.tasks || [],
        events: localData.events || [],
        classes: localData.classes || [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    cloudReady = true;
    setSyncStatus("online");
  } catch (err) {
    console.error("Error al cargar datos desde Firestore:", err);
    setSyncStatus("error");
    cloudReady = true; // <-- IMPORTANTE: Permitir continuar aunque falle la nube para no bloquear la UI
  }

  unsubscribeFirestore = onSnapshot(
    userRef,
    (docSnap) => {
      if (docSnap.exists() && !docSnap.metadata.hasPendingWrites) {
        applyCloudDataToApp(docSnap.data());
      }
    },
    (err) => {
      console.error("Error en sincronización en tiempo real:", err);
      setSyncStatus("error");
    },
  );
});

function applyCloudDataToApp(data) {
  if (!data) return;
  isApplyingRemoteUpdate = true;
  if (window.loadExternalDataIntoApp) {
    window.loadExternalDataIntoApp({
      projects: data.projects || [],
      tasks: data.tasks || [],
      events: data.events || [],
      classes: data.classes || [],
    });
  }
  isApplyingRemoteUpdate = false;
}

function updateAuthUI(user) {
  const loggedOutView = document.getElementById("authLoggedOutView");
  const loggedInView = document.getElementById("authLoggedInView");
  const userAvatar = document.getElementById("userAvatar");
  const userName = document.getElementById("userName");
  const userEmail = document.getElementById("userEmail");

  if (!loggedOutView || !loggedInView) return;

  if (user) {
    loggedOutView.style.display = "none";
    loggedInView.style.display = "flex";

    const displayName = user.displayName || user.email.split("@")[0];
    userName.textContent = displayName;
    userEmail.textContent = user.email;

    if (user.photoURL) {
      userAvatar.innerHTML = `<img src="${user.photoURL}" alt="${displayName}" class="avatar-img" referrerpolicy="no-referrer">`;
    } else {
      userAvatar.textContent = displayName.charAt(0).toUpperCase();
    }
  } else {
    loggedOutView.style.display = "flex";
    loggedInView.style.display = "none";
  }
}

function setSyncStatus(status) {
  const syncDots = document.querySelectorAll(".sync-dot");
  const syncTexts = document.querySelectorAll(".cloud-sync-status span:last-child");

  syncDots.forEach((dot) => {
    dot.className = "sync-dot " + status;
  });

  let message = "Almacenamiento Local";
  if (status === "online") message = "Sincronizado en la nube";
  if (status === "syncing") message = "Guardando en la nube...";
  if (status === "error") message = "Error de conexión en la nube";

  syncTexts.forEach((el) => {
    el.textContent = message;
  });
}

function translateFirebaseError(code) {
  switch (code) {
    case "auth/invalid-email":
      return "El formato del correo electrónico no es válido.";
    case "auth/user-disabled":
      return "Esta cuenta ha sido inhabilitada.";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Correo o contraseña incorrectos.";
    case "auth/email-already-in-use":
      return "Ya existe una cuenta con este correo electrónico.";
    case "auth/weak-password":
      return "La contraseña debe tener al menos 6 caracteres.";
    case "auth/popup-closed-by-user":
      return "Has cerrado la ventana de inicio de sesión de Google.";
    case "auth/unauthorized-domain":
      return "Este dominio no está autorizado en Firebase Console. Agrégalo en Authentication > Settings > Authorized domains.";
    case "auth/operation-not-allowed":
      return "Este método de inicio de sesión no está habilitado en Firebase Console.";
    case "permission-denied":
      return "Firestore ha denegado el acceso. Revisa las reglas de seguridad.";
    default:
      return "Error de autenticación. Inténtalo de nuevo.";
  }
}
