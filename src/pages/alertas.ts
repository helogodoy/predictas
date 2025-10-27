import { mock as api } from "../services/api";

export async function Alertas(){
  const alertas = await api.alertas();
  return `
    <div class="card">
      <h3>Alertas</h3>
      <div class="table-wrap">
        <table>
          <thead><tr><th>ID</th><th>Motor</th><th>Tipo</th><th>Valor</th><th>Limite</th><th>Severidade</th><th>Status</th></tr></thead>
          <tbody>
            ${alertas.map(a=>`
              <tr>
              <br>
                <td>${a.id}</td>
                <td>${a.motorId}</td>
                <td>${a.tipo}</td>
                <td>${a.valor.toFixed(1)}</td>
                <td>${a.limite}</td>
                <td><span class="badge ${a.severidade==="alta"?"err":a.severidade==="media"?"warn":"ok"}">${a.severidade}</span></td>
                <td>${a.status}</td>
              </tr>`).join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;
}
