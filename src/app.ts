import { renderSidebar } from "./components/sidebar";
import { Dashboard } from "./pages/dashboard";
import { Motores } from "./pages/motores";
import { Leituras } from "./pages/leituras";
import { Alertas } from "./pages/alertas";

type Page = () => Promise<string>;

const routes:Record<string, Page> = {
  "": Dashboard,
  "#/dashboard": Dashboard,
  "#/motores": Motores,
  "#/leituras": Leituras,
  "#/alertas": Alertas,
};

async function render(){
  const hash = location.hash || "#/dashboard";
  (document.getElementById("sidebar")!).innerHTML = renderSidebar(hash.replace("#/",""));
  const page = routes[hash] || Dashboard;
  (document.getElementById("app")!).innerHTML = await page();
}

window.addEventListener("hashchange", render);
render();
