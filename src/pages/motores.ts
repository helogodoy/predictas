import { mock as api } from "../services/api";

export async function Motores(){
  const motores = await api.motores();
  return `
    <div class="card">
      <h3>Lista de Motores</h3>
      <div class="table-wrap">
        <table>
          <thead><tr><th>ID</th><th>Nome</th><th>Localização</th><th>Status</th></tr></thead>
          <tbody>
            ${motores.map(m=>`
              <tr>
                <td>${m.id}</td>
                <td>${m.nome}</td>
                <td>${m.localizacao||"-"}</td>
                <td><span class="badge ${m.status==="falha"?"err":m.status==="alerta"?"warn":"ok"}">${m.status||"ok"}</span></td>
              </tr>`).join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;
}
