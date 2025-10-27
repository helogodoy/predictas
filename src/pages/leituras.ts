import { mock as api } from "../services/api";

export async function Leituras(){
  const data = await api.leituras(1,"temperatura");
  return `
    <div class="card">
      <h3>Leituras – Motor #1 – Temperatura</h3>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Quando</th><th>Valor (°C)</th></tr></thead>
          <tbody>
            ${data.slice().reverse().map(l=>`
              <tr>
                <td>${new Date(l.ts).toLocaleString()}</td>
                <td>${l.valor.toFixed(1)}</td>
              </tr>`).join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;
}
