import api from "../services/api";

type LeituraRow = { ts: string; valor: number };

export async function Leituras() {
  // compatível com seu layout: motor #1, tipo 'temperatura'
  const data: LeituraRow[] = await api.leituras(1, "temperatura");

  const rowsHtml = data
    .slice()
    .reverse()
    .map((l) => {
      return `
        <tr>
          <td>${new Date(l.ts).toLocaleString()}</td>
          <td>${l.valor.toFixed(1)}</td>
        </tr>`;
    })
    .join("");

  return `
    <div class="card">
      <h3>Leituras – Motor #1 – Temperatura</h3>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Quando</th><th>Valor (°C)</th></tr></thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>
    </div>
  `;
}
