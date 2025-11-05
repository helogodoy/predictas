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
  window.addEventListener("keydown", (e)=>{ if(e.key === "Escape") close(); });
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
            </div>
            <div style="height:340px; margin-top:8px"><canvas id="chartMotor"></canvas></div>
          </div>

          <div class="card" style="margin-top:14px">
            <div style="font-weight:800; margin-bottom:8px">Histórico</div>
            <div class="table-wrap"><table>
              <thead><tr><th>Hora</th><th>Evento</th><th>Valor</th><th>Status</th></tr></thead>
              <tbody id="tb-hist">
                <tr><td>14:05:12</td><td>Vibração CRÍTICA</td><td>5.1 mm/s</td><td><span class="badge err">ABERTO</span></td></tr>
                <tr><td>14:10:02</td><td>Temperatura ALTA</td><td>92.0 °C</td><td><span class="badge ok">RESOLVIDO</span></td></tr>
              </tbody>
            </table></div>
          </div>
        </div>
      </div>
    </div>
  `;

  setTimeout(async () => {
    wireSidebar();

    const $ = (id: string) => document.getElementById(id)!;
    const m = await api.motor?.(motorId).catch(() => ({ nome: `Motor ${motorId}`, localizacao: "--" } as any)) || { nome:`Motor ${motorId}`, localizacao:"--" };
    $("#mtitle").textContent = `${(m as any).nome}`;
    $("#mloc").textContent = `Local: ${(m as any).localizacao || "-"} | Último Update: ${new Date().toLocaleTimeString()}`;

    // @ts-ignore
    const chart = new Chart(document.getElementById("chartMotor"), {
      type: "line",
      data: {
        labels: [],
        datasets: [
          { label: "Temperatura (°C)", data: [], tension: .3, borderWidth: 2 },
          { label: "Vibração (mm/s)",  data: [], tension: .3, borderWidth: 2 }
        ]
      },
      options: { responsive: true, maintainAspectRatio: false }
    });

    async function load(janela: "1h" | "7d" | "30d" = "1h") {
      const [t, v] = await Promise.all([
        api.temperaturaSerie(motorId, "1h"),
        api.vibracaoSerie(motorId, "1h")
      ]);
      const labels = t.map(x => new Date(x.ts).toLocaleTimeString().slice(0, 5));
      chart.data.labels = labels;
      chart.data.datasets[0].data = t.map(x => x.valor);
      chart.data.datasets[1].data = v.map(x => x.valor);
      chart.update();

      const curT = t.at(-1)?.valor ?? 0, curV = v.at(-1)?.valor ?? 0;
      ($("#k-temp") as HTMLElement).textContent = `${(curT as number)?.toFixed?.(1) ?? "--"} °C`;
      ($("#k-vib")  as HTMLElement).textContent = `${(curV as number)?.toFixed?.(1) ?? "--"} mm/s`;
      ($("#k-pico") as HTMLElement).textContent = `${Math.max(...t.map(x => x.valor), 0).toFixed(1)} °C`;
      $("#k-temp-sub").textContent = "Alto (Limite: 75°C)";
      $("#k-vib-sub").textContent  = "Alto (Limite: 4,5mm/s)";
    }

    await load("1h");
    stop = poll(() => load("1h"), 5000, () => {});

    ["t1", "t7", "t30"].forEach((id, i) => {
      document.getElementById(id)!.onclick = () => {
        ["t1", "t7", "t30"].forEach(x => document.getElementById(x)!.classList.remove("active"));
        document.getElementById(id)!.classList.add("active");
        const j = (i === 0 ? "1h" : i === 1 ? "7d" : "30d") as "1h" | "7d" | "30d";
        load(j);
      };
    });
  }, 0);

  return view;
}
