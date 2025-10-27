import { Topbar } from "../components/topbar";

export function Profile(){
  return `
    ${Topbar("Nome do Dashboard")}
    <div class="container">
      <div class="card">
        <div style="display:grid; grid-template-columns:100px 1fr; gap:16px; align-items:center">
          <div style="width:100px;height:100px;border-radius:999px;background:#eee"></div>
          <div>
            <div style="font-size:22px; font-weight:800">Giovanna Luz</div>
            <div style="opacity:.8">Admin | Empresa Y</div>
          </div>
        </div>

        <div class="card" style="margin-top:16px">
          <div style="font-weight:800">Notificações</div>
          <div style="margin-top:8px; display:flex; align-items:center; gap:12px">
            <span>Ativar</span>
            <input type="checkbox" checked />
          </div>
        </div>

        <div class="card" style="margin-top:16px">
          <div style="font-weight:800">Idioma</div>
          <select class="input" style="max-width:240px; margin-top:8px">
            <option>Português</option>
            <option>Inglês</option>
          </select>
        </div>
      </div>
    </div>
  `;
}
