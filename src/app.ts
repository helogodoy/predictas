import { Login } from "./pages/login";
import { Forgot } from "./pages/forgot";
import { Dashboard } from "./pages/dashboard";
import { MotorDetail } from "./pages/motor";
import { Profile } from "./pages/profile";
import { Alertas } from "./pages/alertas";
import { Leituras } from "./pages/leituras";
import { Motores } from "./pages/motores";
// 👇 importe o i18n para ouvir mudanças
import { getLang } from "./i18n";

function mount(html: string) { (document.getElementById("root")!).innerHTML = html; }

async function render() {
  // ler getLang() garante que bundlers não removam (e forçam refazer strings se algo depender do idioma)
  void getLang();

  const hash = location.hash || "#/login";
  if (hash.startsWith("#/login"))     return mount(Login());
  if (hash.startsWith("#/forgot"))    return mount(Forgot());
  if (hash.startsWith("#/dashboard")) return mount(Dashboard());
  if (hash.startsWith("#/alertas"))   return mount(await Alertas());
  if (hash.startsWith("#/leituras"))  return mount(await Leituras());
  if (hash.startsWith("#/motores"))   return mount(await Motores());
  if (hash.startsWith("#/motor/")) {
    const id = Number(hash.split("/").pop());
    return mount(MotorDetail(id || 1));
  }
  if (hash.startsWith("#/profile"))   return mount(Profile());
  return mount(Dashboard());
}

window.addEventListener("hashchange", render);
// 👇 Re-renderiza quando o idioma mudar
document.addEventListener("i18n:change", render);

render();
