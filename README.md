# El mapa del Consejo · ISO/IEC 38500

Juego **cooperativo en tiempo real** para la socialización del Grupo 2 (Gestión de TIC, UFPS). Pensado para **20 a 30 participantes**.

**Cómo se juega:** en el proyector aparece el mapa mental de la ISO/IEC 38500 con 6 ramas vacías (¿Qué es?, Resultados, Modelo, Principios, Marco y Familia e IA). Cada persona entra por un QR, escribe su nombre y le llega **una ficha** (por ejemplo «Involucrar» o «ISO/IEC 38503»). Tiene que decidir en qué rama va:

- Si acierta, la ficha vuela al mapa del proyector y le llega otra.
- Si falla, recibe una pista y puede intentar de nuevo o **pasar la ficha** a otro compañero.
- Nadie tiene todas las fichas, así que el mapa (31 fichas) solo se completa si todos colaboran. El objetivo del grupo es completarlo antes de 4 minutos.

| Archivo | Para qué sirve |
|---|---|
| `index.html` | Lo que ven los celulares (adonde lleva el QR). |
| `pantalla.html` | Lo que se proyecta: QR, mapa en vivo y controles del anfitrión. |
| `js/config.js` | **El único archivo que deben editar** (paso 3). |
| `js/content.js` | Las fichas, las ramas y las pistas, tomadas del informe. |
| `database.rules.json` | Las reglas de seguridad que se pegan en Firebase (paso 2). |

**Tiempo estimado:** unos 40 minutos la primera vez, más el ensayo. Necesitan una cuenta de Google y una de GitHub.

---

## Paso 0 · Pruébenlo ya, sin Firebase (modo ensayo)

Así ven cómo funciona antes de configurar nada. El modo ensayo sincroniza pestañas del **mismo navegador** y no sirve para celulares.

1. Descompriman el zip y abran una terminal **dentro** de la carpeta `mapa-del-consejo`.
2. Inicien un servidor local:
   - Windows: `py -m http.server 8080`
   - Mac o Linux: `python3 -m http.server 8080`
   - O en VS Code: clic derecho en `index.html` → **Open with Live Server**.
3. En Chrome, abran la pantalla: `http://localhost:8080/pantalla.html?demo&clave=consejo2026`
4. En otra pestaña, abran un jugador: `http://localhost:8080/?demo`. Pueden abrir 2 o 3 pestañas: cada una es una persona distinta.
5. En la pantalla, pulsen **+5 bots de ensayo** unas cuantas veces y luego **Empezar (E)**.

> **Importante:** no abran los archivos con doble clic. Con la dirección `file://...` no funciona, porque el código necesita un servidor. Usen siempre `http://localhost:8080`.

---

## Paso 1 · Crear el proyecto en Firebase

1. Entren a **https://console.firebase.google.com** con su cuenta de Google.
2. Hagan clic en **Crear un proyecto** (en inglés, *Create a project* o *Get started by setting up a Firebase project*).
3. Nombre: `mapa-del-consejo`. Firebase le agrega un sufijo, y está bien. Acepten las condiciones y den **Continuar**.
4. Si les pregunta por **Gemini en Firebase** (asistente de IA), pueden desactivarlo: no se necesita.
5. Si les pregunta por **Google Analytics**, **desactívenlo**: no se necesita. Den **Crear proyecto**, esperen unos segundos y den **Continuar**.

## Paso 2 · Crear la Realtime Database (antes que la app web)

> Ojo: es **Realtime Database**, no *Firestore Database*. Son productos distintos.

1. En el menú de la izquierda busquen **Bases de datos y almacenamiento → Realtime Database** (en inglés, *Databases & Storage → Realtime Database*; en consolas antiguas está en *Compilación / Build*). Si no la encuentran, escriban "Realtime Database" en el buscador de arriba.
2. Clic en **Crear base de datos** (*Create Database*).
3. **Ubicación:** elijan **Estados Unidos (us-central1)**.
4. **Reglas:** elijan **Comenzar en modo de prueba** (*Start in test mode*) y den **Habilitar** o **Listo**.
5. Arriba de la tabla de datos aparece una dirección parecida a esta. **Cópienla en un bloc de notas**, porque es su `databaseURL`:
   `https://mapa-del-consejo-xxxxx-default-rtdb.firebaseio.com`
6. Vayan a la pestaña **Reglas** (*Rules*), borren todo lo que hay, peguen el contenido completo de `database.rules.json` y den **Publicar**.

**Qué hacen estas reglas:** permiten leer y escribir solo dentro del nodo `mapa`, validan los nombres y las fichas, y **se cierran solas el 1 de diciembre de 2026**. Así nadie puede usar su base de datos después de la presentación.

## Paso 3 · Registrar la app web y copiar la configuración

1. Arriba a la izquierda, junto a **Descripción general del proyecto**, hagan clic en el engranaje **⚙ → Configuración del proyecto**.
2. Bajen hasta **Tus apps** y hagan clic en el ícono **`</>`** (Web).
3. Apodo: `mapa-web`. **No** marquen *Firebase Hosting*. Den **Registrar app**.
4. Aparece un código con `const firebaseConfig = { ... }`. Copien **solo lo que está entre las llaves**.
5. Abran `js/config.js` con VS Code o el Bloc de notas y reemplacen los `"PEGAR_AQUI"`. Debe quedar así (con sus propios valores):

   ```js
   export const FIREBASE_CONFIG = {
     apiKey: "AIzaSyA...",
     authDomain: "mapa-del-consejo-xxxxx.firebaseapp.com",
     databaseURL: "https://mapa-del-consejo-xxxxx-default-rtdb.firebaseio.com",
     projectId: "mapa-del-consejo-xxxxx",
     storageBucket: "mapa-del-consejo-xxxxx.firebasestorage.app",
     messagingSenderId: "123456789",
     appId: "1:123456789:web:abc123",
   };
   ```

6. **Revisen que esté la línea `databaseURL`.** Es el error más común: si Firebase no la incluyó, agréguenla a mano con la dirección del paso 2.5.
7. Guarden el archivo. Si lo editan desde la consola de Firebase en otro momento, en *Configuración del proyecto → Tus apps* siempre pueden volver a ver ese código.

> ¿Es peligroso publicar la `apiKey`? No. En Firebase esos datos identifican el proyecto pero no dan permisos; lo que protege la base son las **reglas** del paso 2.6.

## Paso 4 · Probar en local con Firebase real

1. Con el servidor del paso 0 corriendo, abran `http://localhost:8080/pantalla.html?clave=consejo2026` (esta vez **sin** `?demo`). La etiqueta naranja "MODO ENSAYO" ya no debe aparecer.
2. Abran `http://localhost:8080/` en una **ventana de incógnito** o en otro navegador.
   - Fuera del modo ensayo, todas las pestañas normales del mismo navegador son la misma persona. Por eso hace falta incógnito u otro navegador.
3. Entren con un nombre: debe aparecer en la pantalla.
4. En la consola de Firebase, en **Realtime Database → Datos**, debe aparecer el nodo `mapa` con su jugador. ¡Ya está conectado!

## Paso 5 · Publicar con GitHub Pages (para que los celulares entren)

**Opción A · Desde la web de GitHub, sin comandos**

1. En **https://github.com/new** creen un repositorio:
   - Nombre: `mapa-del-consejo`.
   - **Public** (GitHub Pages gratis lo exige).
   - Sin README. Den **Create repository**.
2. En la página del repo vacío hagan clic en **uploading an existing file**.
3. Arrastren **el contenido** de la carpeta (`index.html`, `pantalla.html`, `README.md`, `database.rules.json`, `package.json` y las carpetas `css`, `js` y `tests`), **no la carpeta en sí**. Den **Commit changes**.
4. Comprueben que en la raíz del repo se vean `index.html` y las carpetas `css/` y `js/`. Si quedó todo dentro de una carpeta `mapa-del-consejo/`, borren el repo y repitan el paso 3.
5. Vayan a **Settings → Pages**. En *Build and deployment*, en **Source**, elijan **Deploy from a branch**. En *Branch* elijan **main** y la carpeta **/ (root)**, y den **Save**.
6. Esperen de 1 a 3 minutos y recarguen la página. Arriba aparecerá: *Your site is live at* `https://SU-USUARIO.github.io/mapa-del-consejo/`

**Opción B · Con git** (si ya lo usan):

```bash
git init && git add . && git commit -m "feat: juego cooperativo El mapa del Consejo"
git branch -M main
git remote add origin https://github.com/SU-USUARIO/mapa-del-consejo.git
git push -u origin main
```

Luego activen Pages como en el punto 5 de la opción A.

**Las dos direcciones que van a usar:**

- **Proyector:** `https://SU-USUARIO.github.io/mapa-del-consejo/pantalla.html?clave=consejo2026`
- **Celulares:** `https://SU-USUARIO.github.io/mapa-del-consejo/`. No hay que compartirla: el QR de la pantalla ya apunta ahí.

> Si cambian un archivo después, súbanlo otra vez (*Add file → Upload files*, que reemplaza el anterior). Esperen 1 o 2 minutos y recarguen con **Ctrl + F5**.

## Paso 6 · Ensayo general (háganlo esta noche)

- [ ] Abran la pantalla del proyector con la clave, desde la dirección de GitHub Pages.
- [ ] Entren con 4 o 5 celulares escaneando el QR: unos con **datos móviles** y otros con **wifi**.
- [ ] Pulsen **+5 bots de ensayo** 4 veces (20 bots más los celulares, unos 25 en total) y luego **Empezar (E)**.
- [ ] Jueguen. Bloqueen un celular a mitad de partida: su ficha debe liberarse sola. Si no se libera en un minuto, pulsen **Liberar fichas (L)**.
- [ ] Al terminar, revisen la tarjeta final y el botón **Ver el mapa**.
- [ ] **Quitar bots** y luego **Reiniciar (R R)**. No lleven bots a la clase, porque les quitarían fichas a sus compañeros.

## El día de la presentación (4 a 5 minutos)

1. **Antes de que entre el público:** abran la pantalla con la clave, pulsen **F** (pantalla completa) y **R R** (reiniciar). Comprueben que no haya bots.
2. **Minuto 0:** muestren el QR y den unos 60 segundos para que todos entren. Pueden ver el contador de conectados.
3. **Minuto 1:** pulsen **E**. Durante la partida, animen al salón: *"¡Nadie tiene todas las fichas, ayúdense en voz alta!"*.
4. **Al terminar:** pulsen **Ver el mapa** y repasen las fichas grises, que son las que faltaron.

| Tecla | Acción |
|---|---|
| **E** | Empezar la partida |
| **T** | Terminar la partida ya |
| **Q** | Mostrar u ocultar el QR (para quien llegue tarde) |
| **L** | Liberar las fichas de celulares desconectados |
| **R R** | Reiniciar (pulsar dos veces) |
| **H** | Mostrar u ocultar el panel del anfitrión |
| **M** / **F** | Sonido / pantalla completa |

## Si algo falla

| Síntoma | Solución |
|---|---|
| "Falta pegar la configuración de Firebase" | Revisen el paso 3 en `js/config.js`: no debe quedar ningún `PEGAR_AQUI`. |
| Se queda en "Conectando…" o no aparecen jugadores | Casi siempre es la `databaseURL` mal copiada o ausente (paso 3.6). Pulsen F12 → *Console* y lean el error en rojo. |
| Error `PERMISSION_DENIED` en la consola | Las reglas no se publicaron (paso 2.6) o ya pasó la fecha de vencimiento. |
| GitHub Pages muestra 404 | Esperen 2 minutos. Comprueben que `index.html` esté en la **raíz** del repo y no dentro de una subcarpeta. |
| El QR apunta a `localhost` | Abrieron la pantalla desde su computador local. Ábranla desde la dirección `github.io`. |
| Una ficha quedó "atascada" | Pulsen **L**. Libera las fichas de quienes se desconectaron. |
| El wifi de la universidad no deja entrar | Pidan que usen datos móviles. Firebase funciona por el puerto 443, como cualquier página web. |
| **Plan B** si nada funciona | Hagan el mapa en el tablero con post-its: impriman las fichas de `js/content.js` y repártanlas. La dinámica es la misma. |

**Límites del plan gratuito (Spark):** hasta **100 conexiones simultáneas**. Para 30 personas más la pantalla sobra.

## Cambiar el juego

- **Duración o clave del anfitrión:** `js/config.js` (`GAME_DURATION_SEC`, `HOST_KEY`).
- **Fichas, pistas o ramas:** `js/content.js`. Cada ficha tiene `branches`, y la primera es su rama oficial. Si una ficha es correcta en dos ramas, se ponen las dos, como «Rendición de cuentas».

## Para desarrolladores

Es un sitio estático con módulos ES y sin compilación. `js/backend.js` ofrece la misma interfaz para Firebase y para el modo ensayo. Las operaciones que pueden chocar entre jugadores (reclamar, colocar o pasar una ficha) usan **transacciones**, y las fichas en la mano se liberan con `onDisconnect` si el celular pierde la conexión.

- Pruebas de la lógica: `npm test` (Node 18 o superior).
- Prueba de punta a punta en modo ensayo (1 pantalla, 3 celulares y 25 bots): con el servidor en el puerto 8080, `python3 tests/e2e_demo.py`. Requiere Playwright.
- Librería incluida: [qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator) (MIT). El SDK de Firebase se carga desde el CDN oficial de Google (versión fija en `js/config.js`).
