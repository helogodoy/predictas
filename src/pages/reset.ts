import { Sidebar } from "../components/sidebar";
import { Topbar } from "../components/topbar";
import api from "../services/api";
import { t } from "../i18n";

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
  window.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
}

// === Mesmo esquema do dashboard.ts ===
function toBrasiliaTime(ts: string | number | Date): Date {
  const d = new Date(ts);
  return new Date(d.getTime() - 3 * 60 * 60 * 1000);
}

export function Reset() {
  const view = `
    ${Sidebar("perfil")}
    ${Topbar(t("page_reset_senha") ?? "Redefinir senha")}
    <div class="main-content">
      <div class="container">
        <div class="card" style="max-width:520px; margin:0 auto">
          <h2 style="margin:0 0 12px 0">${t("redefinir_senha") ?? "Redefinir senha"}</h2>
          <p style="opacity:.9">
            ${t("instr_reset_token") ?? "Insira o token recebido por e-mail e defina sua nova senha."}
          </p>

          <form id="frmReset" class="grid" style="grid-template-columns:1fr; gap:10px; margin-top:10px">
            <div class="field">
              <label class="label" for="token">Token</label>
              <input id="token" class="input" required placeholder="cole aqui o token" />
            </div>
            <div class="field">
              <label class="label" for="pwd">Nova senha</label>
              <input id="pwd" type="password" class="input" required placeholder="••••••••" />
            </div>
            <div class="field">
              <label class="label" for="pwd2">Confirmar nova senha</label>
              <input id="pwd2" type="password" class="input" required placeholder="••••••••" />
            </div>
            <button id="btnReset" class="btn">${t("enviar") ?? "Enviar"}</button>
          </form>

          <div id="msg" style="margin-top:10px; min-height:20px"></div>

          <div id="tokenInfo" style="display:none; margin-top:12px; font-size:13px; opacity:.85"></div>
        </div>
      </div>
    </div>`;

  setTimeout(() => {
    wireSidebar();
    const $ = (id: string) => document.getElementById(id)!;
    const frm = $("frmReset") as HTMLFormElement;
    const msg = $("msg");
    const tokenInfo = $("tokenInfo");

    frm.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      msg.textContent = t("processando") ?? "Processando...";
      try {
        const token = (document.getElementById("token") as HTMLInputElement).value.trim();
        const pwd   = (document.getElementById("pwd") as HTMLInputElement).value;
        const pwd2  = (document.getElementById("pwd2") as HTMLInputElement).value;

        if (pwd !== pwd2) {
          msg.textContent = t("senhas_diferentes") ?? "As senhas não coincidem.";
          return;
        }

        await api.reset(token, pwd);

        msg.textContent = (t("senha_atualizada") ?? "Senha atualizada com sucesso. Você já pode fazer login.");

        // Se algum dia a API passar metadados de expiração do token, mostramos no padrão:
        // (mantido como exemplo; hoje a API não retorna isso)
        tokenInfo.style.display = "none";
      } catch (e: any) {
        console.warn("Falha ao redefinir senha:", e);
        const txt = (e?.message ?? "").toString().toLowerCase();
        if (txt.includes("token")) {
          msg.textContent = t("token_invalido") ?? "Token inválido ou expirado.";
        } else {
          msg.textContent = t("erro_enviar") ?? "Não foi possível redefinir a senha. Tente novamente.";
        }
        tokenInfo.style.display = "none";
      }
    });
  }, 0);

  return view;
}
