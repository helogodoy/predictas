import { mock as api } from "../services/api";

export async function Dashboard(){
  const [motores, alertas, temp, vib] = await Promise.all([
    api.motores(),
    api.alertas(),
    api.leituras(1,"temperatura"),
    api.leituras(1,"vibracao"),
  ]);

  const kpiMotores = motores.length;
  const kpiAlertas = alertas.length;
  const kpiCriticos = alertas.filter(a=>a.severidade==="alta").length;

  const labels = temp.map(x=>new Date(x.ts).toLocaleTimeString().slice(0,5));
  const tempValues = temp.map(x=>x.valor);
  const vibValues  = vib.map(x=>x.valor);

  // HTML
  const html = `
    <div class="grid kpi">
      <div class="card"><h3>Total de Motores</h3><div class="kpi">${kpiMotores}</div></div>
      <div class="card"><h3>Alertas Abertos</h3><div class="kpi">${kpiAlertas}</div></div>
      <div class="card"><h3>Críticos</h3><div class="kpi" style="color:var(--err)">${kpiCriticos}</div></div>
      <div class="card"><h3>Disponibilidade</h3><div class="kpi" style="color:var(--ok)">98,7%</div></div>
    </div>

    <div class="grid" style="grid-template-columns: 2fr 1fr; margin-top:16px">
      <div class="card"><h3>Temperatura / Vibração (últimos 30 min)</h3><canvas id="chartTV"></canvas></div>
      <div class="card"><h3>Alertas Recentes</h3>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Motor</th><th>Tipo</th><th>Valor</th><th>Limite</th><th>Sev.</th></tr></thead>
            <tbody>
              ${alertas.map(a=>`
                <tr>
                  <td>#${a.motorId}</td>
                  <td>${a.tipo}</td>
                  <td>${a.valor.toFixed(1)}</td>
                  <td>${a.limite}</td>
                  <td><span class="badge ${a.severidade==="alta"?"err":a.severidade==="media"?"warn":"ok"}">${a.severidade}</span></td>
                </tr>`).join("")}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  // Após inserir no DOM, monta o gráfico
  setTimeout(()=> {
    const ctx = document.getElementById("chartTV") as HTMLCanvasElement;
    // @ts-ignore (Chart vem do CDN)
    new Chart(ctx, {
      type: "line",
      data: {
        labels,
        datasets: [
          { label:"Temperatura (°C)", data: tempValues },
          { label:"Vibração (mm/s)", data: vibValues }
        ]
      },
      options: { responsive:true, maintainAspectRatio:false }
    });
  }, 0);

  return html;
}
