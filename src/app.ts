// src/app.ts
import { Login } from "./pages/login";
import { Forgot } from "./pages/forgot";
import { Dashboard } from "./pages/dashboard";
import { MotorDetail } from "./pages/motor";
import { Profile } from "./pages/profile";
import { Alertas } from "./pages/alertas";
import { Leituras } from "./pages/leituras";
import { Motores } from "./pages/motores";
import { getLang } from "./i18n";

function mount(html: string) {
  (document.getElementById("root")!).innerHTML = html;
}

async function render() {
  void getLang();

  const hash = location.hash || "#/login";
  if (hash.startsWith("#/login")) return mount(Login());
  if (hash.startsWith("#/forgot")) return mount(Forgot());
  if (hash.startsWith("#/dashboard")) return mount(Dashboard());
  if (hash.startsWith("#/alertas")) return mount(await Alertas());
  if (hash.startsWith("#/leituras")) return mount(await Leituras());
  if (hash.startsWith("#/motores")) return mount(await Motores());
  if (hash.startsWith("#/motor/")) {
    const id = Number(hash.split("/").pop());
    return mount(MotorDetail(id || 1));
  }
  if (hash.startsWith("#/profile")) return mount(Profile());
  return mount(Dashboard());
}

window.addEventListener("hashchange", render);
document.addEventListener("i18n:change", render);

render();
