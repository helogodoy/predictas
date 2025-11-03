import { Topbar } from "../components/topbar";
import { api, poll } from "../services/api";

// helper para pegar elemento com tipo
function el(id: string): HTMLElement {
  const e = document.getElementById(id);
  if (!e) throw new Error(`Elemento #${id} não encontrado`);
  return e as HTMLElement;
}
function elCanvas(id: string): HTMLCanvasElement {
  return el(id) as HTMLCanvasElement;
}

export function MotorDetail(motorId: number) {
  let stop: () => void = () => {};

  const view = `
    ${Topbar("Nome do Dashboard")}
    <div class="container">
      <div class="card">
        <div class="critical-bar">CRÍTICO</div>
        <h2 id="mtitle" style="margin:0 0 6px 0">MTR ${motorId}</h2>
        <div id="mloc" style="opacity:.9; margin-bottom:12px">Local: -- | Último Update: --</div>

        <div class="kpi-cards">
          <div class="card"><div>Temperatura</div><div id="k-temp" style="color:#ffb0b0; font-size:28px; font-weight:800">-- °C</div><div id="k-temp-sub" style="opacity:.85">—</div></div>
          <div class="card"><div>Pico (Temp) 24h</div><div id="k-pico" style="font-size:28px; font-weight:800">-- °C</div><div style="opacity:.85">—</div></div>
          <div class="card"><div>Vibração (RMS)</div><div id="k-vib" style="color:#b7e3ff; font-size:28px; font-weight:800">-- mm/s</div><div id="k-vib-sub" style="opacity:.85">—</div></div>
        </div>

        <div style="display:grid; gap:14px; grid-template-columns:1fr 1fr; margin-top:14px">
          <div class="card"><div>Horas de operação</div><div style="font-size:36px; font-weight:800">12,465h</div></div>
          <div class="card"><div>Próxima manutenção</div><div style="font-size:36px; font-weight:800">13,000h</div></div>
        </div>

        <div class="card" style="margin-top:14px">
          <div class="tabs">
            <button class="tab active" id="t1">1h</button>
            <button class="tab" id="t7">7d</button>
            <button class="tab" id="t30">30d</button>
            <button class="tab" id="tp">Intervalo Personalizado</button>
          </div>
          <div style="height:340px; margin-top:8px"><canvas id="chartMotor"></canvas></div>
        </div>

        <div class="card" style="margin-top:14px">
          <div style="font-weight:800; margin-bottom:8px">Histórico</div>
          <div class="table-wrap"><table>
            <thead><tr><th>Hora</th><th>Evento</th><th>Valor</th><th>Status</th></tr></thead>
            <tbody id="tb-hist">
              <tr><td>14:05:12</td><td>Vibração CRÍTICA</td><td>5.1 mm/s</td><td><span class="badge err">ABERTO</span></td></tr>
              <tr><td>14:05:12</td><td>Vibração CRÍTICA</td><td>5.1 mm/s</td><td><span class="badge ok">RESOLVIDO</span></td></tr>
            </tbody>
          </table></div>
        </div>
      </div>
    </div>
  `;

  setTimeout(async () => {
    const m = await api
      .motor(motorId)
      .catch(() => ({ nome: `Motor ${motorId}`, localizacao: "--" } as any));
    el("mtitle").textContent = `${m.nome}`;
    el("mloc").textContent = `Local: ${m.localizacao || "-"} | Último Update: ${new Date().toLocaleTimeString()}`;

    // @ts-ignore – Chart é global do chart.js/auto
    const chart = new Chart(elCanvas("chartMotor"), {
      type: "line",
      data: {
        labels: [],
        datasets: [
          { label: "Temperatura (°C)", data: [], tension: 0.3, borderWidth: 2 },
          { label: "Vibração (mm/s)", data: [], tension: 0.3, borderWidth: 2 }
        ]
      },
      options: { responsive: true, maintainAspectRatio: false }
    });

    async function load(janela: "1h" | "7d" | "30d" = "1h") {
      const [t, v] = await Promise.all([
        api.temperaturaSerie(motorId, janela),
        api.vibracaoSerie(motorId, janela)
      ]);

      const labels = t.map((x) => new Date(x.ts).toLocaleTimeString().slice(0, 5));
      chart.data.labels = labels;
      chart.data.datasets[0].data = t.map((x) => x.valor);
      chart.data.datasets[1].data = v.map((x) => x.valor);
      chart.update();

      const curT = t.length ? t[t.length - 1].valor : 0;
      const curV = v.length ? v[v.length - 1].valor : 0;
      el("k-temp").textContent = `${curT.toFixed(1)} °C`;
      el("k-vib").textContent = `${curV.toFixed(1)} mm/s`;
      const pico = t.length ? Math.max(...t.map((x) => x.valor)) : 0;
      el("k-pico").textContent = `${pico.toFixed(1)} °C`;
      el("k-temp-sub").textContent = "Alto (Limite: 75°C)";
      el("k-vib-sub").textContent = "Alto (Limite: 4,5mm/s)";
    }

    await load("1h");
    stop = poll(() => load("1h"), 5000, () => {});

    ["t1", "t7", "t30"].forEach((id, i) => {
      const btn = document.getElementById(id);
      if (!btn) return;
      btn.onclick = () => {
        ["t1", "t7", "t30"].forEach((x) => document.getElementById(x)?.classList.remove("active"));
        btn.classList.add("active");
        const j = (i === 0 ? "1h" : i === 1 ? "7d" : "30d") as "1h" | "7d" | "30d";
        load(j);
      };
    });
  }, 0);

  return view;
}
