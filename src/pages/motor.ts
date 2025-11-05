// src/pages/motor.ts
import "chart.js/auto";
import { Sidebar } from "../components/sidebar";
import { Topbar } from "../components/topbar";
import api, { poll } from "../services/api";

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

export function MotorDetail(motorId: number) {
  let stop: () => void = () => {};

  let company = "Predictas";
  try {
    const raw = localStorage.getItem("predictas_user");
    if (raw) {
      const u = JSON.parse(raw);
      company = (u.company || u.nome || u.email || company).toString();
    }
  } catch {}

  const view = `
    ${Sidebar("motores")}
    ${Topbar(`Motor ${motorId}`, company)}
    <div class="main-content">
      <div class="container">
        <div class="card">
          <div class="critical-bar">CRÍTICO</div>
          <h2 id="mtitle" style="margin:0 0 6px 0">MTR ${motorId}</h2>
          <div id="mloc" style="opacity:.9; margin-bottom:12px">Local: -- | Último Update: --</div>

          <div class="kpi-cards">
            <div class="card">
              <div>Temperatura</div>
              <div id="k-temp" style="color:#ffb0b0; font-size:28px; font-weight:800">-- °C</div>
              <div id="k-temp-sub" style="opacity:.85">—</div>
            </div>
            <div class="card">
              <div>Pico (Temp) 24h</div>
              <div id="k-pico" style="font-size:32px; font-weight:800">-- °C</div>
              <div style="opacity:.85">—</div>
            </div>
            <div class="card">
              <div>Vibração (RMS)</div>
              <div id="k-vib" style="color:#b7e3ff; font-size:28px; font-weight:800">--</div>
              <div id="k-vib-sub" style="opacity:.85">—</div>
            </div>
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
            </div>
            <div style="height:340px; margin-top:8px"><canvas id="chartMotor"></canvas></div>
          </div>

          <div class="card" style="margin-top:14px">
            <div style="font-weight:800; margin-bottom:8px">Histórico</div>
            <div class="table-wrap">
              <table>
                <thead><tr><th>Hora</th><th>Evento</th><th>Valor</th><th>Status</th></tr></thead>
                <tbody id="tb-hist">
                  <tr><td>—</td><td>—</td><td>—</td><td><span class="badge ok">—</span></td></tr>
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </div>
  `;

  setTimeout(async () => {
    wireSidebar();

    const $ = (id: string) => document.getElementById(id)!;

    const m = await api.motor?.(motorId).catch(
      () => ({ nome: `Motor ${motorId}`, localizacao: "--" } as any)
    ) || { nome: `Motor ${motorId}`, localizacao: "--" };

    $("#mtitle").textContent = `${(m as any).nome}`;
    $("#mloc").textContent =
      `Local: ${(m as any).localizacao || "-"} | Último Update: ${
        new Intl.DateTimeFormat("pt-BR", { timeStyle: "medium", hour12: false, timeZone: "America/Sao_Paulo" }).format(new Date())
      }`;

    // @ts-ignore
    const chart = new Chart(document.getElementById("chartMotor"), {
      type: "line",
      data: {
        labels: [],
        datasets: [
          { label: "Temperatura (°C)", data: [], tension: .35, borderWidth: 2, fill: false },
          { label: "Vibração (mm/s)",  data: [], tension: .35, borderWidth: 2, fill: false }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { intersect: false, mode: "nearest" },
        plugins: { legend: { display: true }, decimation: { enabled: true } },
        elements: { point: { radius: 0 } },
        scales: {
          x: { grid: { display: false } },
          y: { beginAtZero: true, grid: { color: "rgba(255,255,255,.1)" } }
        }
      }
    });

    async function load(janela: "1h" | "7d" | "30d" = "1h") {
      const [t, v] = await Promise.all([
        api.temperaturaSerie(motorId, janela),
        api.vibracaoSerie(motorId, janela)
      ]);

      const labels = t.map(x =>
        new Intl.DateTimeFormat("pt-BR", {
          hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "America/Sao_Paulo"
        }).format(new Date(x.ts))
      );

      const tvals = t.map(x => Number(x.valor) || 0);
      const vvals = v.map(x => Number(x.valor) || 0);

      chart.data.labels = labels;
      chart.data.datasets[0].data = tvals;
      chart.data.datasets[1].data = vvals;

      (chart.options.scales!.y as any).suggestedMax =
        Math.max(
          Math.ceil((Math.max(...tvals, 0) + 5) / 5) * 5,
          Math.ceil((Math.max(...vvals, 0) + 1) / 1) * 1,
          10
        );

      chart.update();

      const lastT = t.length ? t[t.length - 1].valor : undefined;
      const lastV = v.length ? v[v.length - 1].valor : undefined;

      (document.getElementById("k-temp")!).textContent = `${(Number(lastT) || 0).toFixed(1)} °C`;
      (document.getElementById("k-vib")!).textContent  = `${(Number(lastV) || 0).toFixed(1)}`;
      (document.getElementById("k-pico")!).textContent = `${Math.max(...tvals, 0).toFixed(1)} °C`;

      document.getElementById("k-temp-sub")!.textContent = "Monitorando";
      document.getElementById("k-vib-sub")!.textContent  = "Monitorando";

      document.getElementById("mloc")!.textContent =
        `Local: ${(m as any).localizacao || "-"} | Último Update: ${
          new Intl.DateTimeFormat("pt-BR", { timeStyle: "medium", hour12: false, timeZone: "America/Sao_Paulo" }).format(new Date())
        }`;
    }

    await load("1h");
    stop = poll(() => load("1h"), 5000, () => {});
  }, 0);

  return view;
}
