"""Prueba de punta a punta en MODO ENSAYO: 1 pantalla + 3 celulares + 25 bots.

Uso (con el servidor local corriendo en el puerto 8080):
    pip install playwright && playwright install chromium
    python3 tests/e2e_demo.py [carpeta_capturas]
"""
import re
import sys
import time
from pathlib import Path

from playwright.sync_api import sync_playwright

BASE = "http://localhost:8080"
OUT = Path(sys.argv[1] if len(sys.argv) > 1 else "capturas")
CONTENT = (Path(__file__).parent.parent / "js" / "content.js").read_text(encoding="utf-8")
# texto de la ficha → rama oficial (primer elemento de branches)
ANSWERS = dict(re.findall(r'text: "([^"]+)", branches: \["(\w+)"', CONTENT))
BRANCH_NAMES = dict(re.findall(r'id: "(\w+)", name: "([^"]+)"', CONTENT))
TOTAL = len(ANSWERS)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    errors: list[str] = []
    with sync_playwright() as pw:
        browser = pw.chromium.launch(channel="chrome")
        ctx = browser.new_context()

        screen = ctx.new_page()
        screen.set_viewport_size({"width": 1920, "height": 1080})
        watch_errors(screen, "pantalla", errors)
        screen.goto(f"{BASE}/pantalla.html?demo&clave=consejo2026")
        screen.evaluate("localStorage.clear()")
        screen.reload()
        screen.wait_for_selector("#qr svg")

        phones = []
        for name in ["Laura", "Nicolás", "Anyela"]:
            phone = ctx.new_page()
            phone.set_viewport_size({"width": 390, "height": 844})
            watch_errors(phone, name, errors)
            phone.goto(f"{BASE}/index.html?demo")
            phone.fill("#nameInput", name)
            phone.click("#joinForm button")
            phone.wait_for_selector("#vLobby:not([hidden])")
            phones.append((name, phone))

        expect_text(screen, "#lobbyCount", "3")
        phones[0][1].screenshot(path=OUT / "celular_1_espera.png")

        for _ in range(5):
            screen.click("#hBots")
        expect_text(screen, "#lobbyCount", "28")
        screen.screenshot(path=OUT / "pantalla_1_lobby.png")

        screen.click("#hStart")
        for _, phone in phones:
            phone.wait_for_selector("#vPlay:not([hidden])", timeout=10_000)

        # Laura se equivoca a propósito una vez para ver la pista.
        laura = phones[0][1]
        wrong_click(laura)
        laura.wait_for_selector("#hint:not([hidden])")
        laura.screenshot(path=OUT / "celular_2_pista.png")

        # Anyela pasa su ficha y luego cierra el celular con otra en la mano.
        anyela = phones[2][1]
        passed_text = anyela.text_content("#tileText")
        anyela.click("#passBtn")
        anyela.wait_for_function("t => document.querySelector('#tileText').textContent !== t", arg=passed_text, timeout=10_000)
        held_before_close = anyela.text_content("#tileText")
        anyela.close(run_before_unload=True)
        phones.pop()
        time.sleep(0.5)
        assert tile_is_free(screen, held_before_close), "la ficha del celular cerrado no se liberó"

        mid_shot = False
        deadline = time.time() + 150
        while time.time() < deadline and not screen.is_visible("#end"):
            for _, phone in phones:
                if phone.is_visible("#vPlay") and not phone.is_visible(".p-flash"):
                    right_click(phone)
            placed = int(screen.text_content("#progressPill").split("/")[0])
            if not mid_shot and placed >= TOTAL // 2:
                screen.screenshot(path=OUT / "pantalla_2_jugando.png")
                for name, phone in phones:
                    if phone.is_visible("#vWait"):
                        phone.screenshot(path=OUT / f"celular_3_ayuda_{name}.png")
                mid_shot = True
            time.sleep(0.4)

        screen.wait_for_selector("#end:not([hidden])", timeout=5_000)
        title = screen.text_content(".s-end-card h2")
        assert title == "¡Mapa completo!", title
        time.sleep(1.2)
        screen.screenshot(path=OUT / "pantalla_3_final.png")
        laura.wait_for_selector("#vDone:not([hidden])")
        laura.screenshot(path=OUT / "celular_4_final.png")
        screen.click("text=Ver el mapa")
        screen.screenshot(path=OUT / "pantalla_4_mapa_completo.png")

        # Reinicio: doble pulsación de R vuelve todos a la sala de espera.
        screen.keyboard.press("r")
        screen.keyboard.press("r")
        laura.wait_for_selector("#vLobby:not([hidden])")
        expect_text(screen, "#progressPill", f"0 / {TOTAL}")
        browser.close()

    if errors:
        raise SystemExit("Errores en consola:\n" + "\n".join(errors))
    print(f"OK: mapa completo con 28 jugadores ({TOTAL} fichas). Capturas en {OUT}/")


def watch_errors(page, label, errors):
    page.on("pageerror", lambda e: errors.append(f"[{label}] {e}"))
    page.on("console", lambda m: m.type == "error" and "fonts.g" not in m.text and "ERR_" not in m.text
            and errors.append(f"[{label}] {m.text}"))


def expect_text(page, selector, text, timeout=8.0):
    end = time.time() + timeout
    while time.time() < end:
        if (page.text_content(selector) or "").strip() == text:
            return
        time.sleep(0.1)
    raise AssertionError(f"{selector} = {page.text_content(selector)!r}, se esperaba {text!r}")


def branch_button(phone, branch_id):
    return phone.locator(f'.branch-btn[data-branch="{branch_id}"]')


def right_click(phone):
    text = phone.text_content("#tileText")
    if text in ANSWERS and branch_button(phone, ANSWERS[text]).is_enabled():
        branch_button(phone, ANSWERS[text]).click()


def wrong_click(phone):
    text = phone.text_content("#tileText")
    wrong = next(b for b in BRANCH_NAMES if b != ANSWERS[text] and not (text == "Rendición de cuentas" and b == "pri"))
    branch_button(phone, wrong).click()


def tile_is_free(screen, text):
    return screen.evaluate(
        """t => { const db = JSON.parse(localStorage.getItem('mapa-demo-db') || '{}');
                  const tiles = db.mapa?.tiles || {};
                  return !Object.values(tiles).some(r => r.owner && r.ownerName === 'Anyela' && !r.branch); }""",
        text,
    )


if __name__ == "__main__":
    main()
