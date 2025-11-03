import api from "../services/api";

type AlertaRow = {
  id: number;
  motorId: number;
  tipo: string;
  valor: number;
  limite: number | string;
  severidade: "baixa" | "media" | "alta";
  status: string;
};

export async function Alertas() {
  const alertas: AlertaRow[] = await api.alertas();

  const rowsHtml = alertas
    .map((a) => {
      const badge =
        a.severidade === "alta" ? "err" : a.severidade === "media" ? "warn" : "ok";
      return `
        <tr>
          <td>${a.id}</td>
          <td>${a.motorId}</td>
          <td>${a.tipo}</td>
          <td>${a.valor.toFixed(1)}</td>
          <td>${a.limite}</td>
          <td><span class="badge ${badge}">${a.severidade}</span></td>
          <td>${a.status}</td>
        </tr>`;
    })
    .join("");

  return `
    <div class="card">
      <h3>Alertas</h3>
      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>ID</th><th>Motor</th><th>Tipo</th><th>Valor</th><th>Limite</th><th>Severidade</th><th>Status</th></tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>
    </div>
  `;
}
