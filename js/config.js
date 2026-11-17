// ============================================================
//  CONFIGURACIÓN — este es el ÚNICO archivo que deben editar.
//  Sigan el README, paso 3, para llenar FIREBASE_CONFIG.
// ============================================================

// Pegue aquí el objeto que Firebase le muestra al registrar la app web.
// Verifique que tenga la línea databaseURL (README, paso 3.5).
// Nota: estos datos NO son secretos; Firebase los diseñó para ir en páginas públicas.
export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyAuTt96EZFVfjilHC66vD5aIL7nolZVS10",
  authDomain: "mapa-del-consejo.firebaseapp.com",
  databaseURL: "https://mapa-del-consejo-default-rtdb.firebaseio.com",
  projectId: "mapa-del-consejo",
  storageBucket: "mapa-del-consejo.firebasestorage.app",
  messagingSenderId: "559834743783",
  appId: "1:559834743783:web:09118ad0fadcc640ba3342"
};

// Clave para que SOLO el computador del proyector vea los botones del anfitrión.
// Se usa así: pantalla.html?clave=consejo2026  (cámbienla si quieren).
export const HOST_KEY = "consejo2026";

// Duración de la partida en segundos (240 = 4 minutos).
export const GAME_DURATION_SEC = 240;

// Versión fija del SDK de Firebase que se carga desde el CDN oficial de Google.
export const FIREBASE_SDK_VERSION = "13.3.0";

// Nodo raíz dentro de la base de datos. No lo cambien salvo que también cambien las reglas.
export const DB_ROOT = "mapa";
