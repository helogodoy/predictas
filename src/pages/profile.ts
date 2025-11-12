// pages/profile.ts
import { Sidebar } from "../components/sidebar";
import { Topbar } from "../components/topbar";
import { getLang, setLang, t } from "../i18n";

function wireSidebar() {
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("sidebarOverlay");
  const btnOpen = document.getElementById("btnMenu");
  const btnClose = document.getElementById("btnCloseSidebar");
  const open = () => { sidebar?.classList.add("open"); overlay?.classList.add("show"); };
  const close = () => { sidebar?.classList.remove("open"); overlay?.classList.remove("show"); };
  btnOpen?.addEventListener("click", open);
  btnClose?.addEventListener("click", close);
  overlay?.addEventListener("click", close);
  document.querySelectorAll('[data-close-sidebar="1"]').forEach(a => a.addEventListener("click", close));
  window.addEventListener("keydown", (e)=>{ if(e.key === "Escape") close(); });
}

export function Profile() {
  let company = "Empresa";
  let nome = "Usuário";
  try {
    const raw = localStorage.getItem("predictas_user");
    if (raw) {
      const u = JSON.parse(raw);
      nome = (u.nome || "Usuário").toString();
      company = (u.company || u.email || "Empresa").toString();
    }
  } catch {}

  const lang = getLang();

  const view = `
    ${Sidebar("perfil")}
    ${Topbar(t("page_perfil"), company)}
    <div class="main-content">
      <div class="container">
        <div class="card">
          <div style="display:flex; flex-direction:column; gap:8px; align-items:flex-start">
            <div style="font-size:22px; font-weight:800">${nome}</div>
            <div style="opacity:.8">Admin | ${company}</div>
          </div>

          <div class="card" style="margin-top:16px">
            <div style="font-weight:800">${t("idioma")}</div>
            <select id="langSelect" class="input" style="max-width:240px; margin-top:8px">
              <option value="pt" ${lang==="pt"?"selected":""}>${t("portugues")}</option>
              <option value="en" ${lang==="en"?"selected":""}>${t("ingles")}</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  `;

  setTimeout(() => {
    wireSidebar();
    const sel = document.getElementById("langSelect") as HTMLSelectElement | null;
    sel?.addEventListener("change", () => {
      const v = (sel.value || "pt") as "pt" | "en";
      setLang(v); // dispara i18n:change → app.ts re-renderiza
    });
  }, 0);

  return view;
}
