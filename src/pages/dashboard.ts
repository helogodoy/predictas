import "chart.js/auto";
import { Topbar } from "../components/topbar";
import { Sidebar } from "../components/sidebar";
import api, { poll } from "../services/api";
import { t } from "../i18n";

const OFFLINE_MS = 120_000; // 2min sem batimento => OFFLINE
const ALERT_ACK_KEY = "predictas_ack_offline"; // localStorage

type MotorRow = {
  id: number;
  nome: string;
  localizacao?: string;
  last_ts?: string | null;   // último batimento (ISO)
  status?: "OK" | "ATENCAO" | "ALERTA"; // opcional vindo da API
};

type Alerta = {
  id: number;
  motor_id?: number | null;
  tipo: string;          // e.g., "TEMP", "UMID", "VIB", "OFFLINE"
  severidade: "INFO" | "WARN" | "CRIT";
  mensagem: string;
  criado_em: string;     // ISO
  encerrado_em?: string | null;
};

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

function $(id: string) { return document.getElementById(id)!; }

function loadAck(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(ALERT_ACK_KEY) || "{}"); } catch { return {}; }
}
function saveAck(map: Record<string, string>) {
  localStorage.setItem(ALERT_ACK_KEY, JSON.stringify(map));
}
function isRecent(ts?: string | null) {
  if (!ts) return false;
  const age = Date.now() - new Date(ts).getTime();
  return age <= OFFLINE_MS;
}

export function Dashboard() {
  let stop: () => void = () => {};
  wireSidebar();

  // Header institucional
  let company = "Predictas";
  try {
    const raw = localStorage.getItem("predictas_user");
    if (raw) {
      const u = JSON.parse(raw);
      company = (u.company || u.nome || u.email || company).toString();
    }
  } catch {}

  // View
  const main = `
    ${Sidebar("dashboard")}
    ${Topbar(t("dashboard") ?? "Dashboard", company)}
    <div id="statusBar" style="
      width:100%; padding:6px 0;
      background:rgba(50,200,100,.25);
      text-align:center; font-weight:700; font-size:15px; letter-spacing:.5px;
      transition:all .3s ease;
    ">SISTEMA NORMAL</div>

    <div class="main-content">
      <div class="container">
        <div class="grid" style="grid-template-columns:0.9fr 2.1fr; gap:16px; margin-bottom:18px">
          <!-- STATUS GERAL -->
          <div class="card">
            <div style="font-weight:800">${t("status_geral") ?? "Status geral"}</div>
            <div class="grid" style="grid-template-columns:repeat(3,1fr); gap:8px; margin-top:18px">
              <div style="text-align:center">
                <div class="kpi-value" id="k-online">--</div>
                <div class="kpi-sub" style="color:#5CFF8A; font-weight:700">${t("online") ?? "Online"}</div>
              </div>
              <div style="text-align:center">
                <div class="kpi-value" id="k-offline">—</div>
                <div class="kpi-sub" style="opacity:.8">${t("offline") ?? "Offline"}</div>
              </div>
              <div style="text-align:center">
                <div class="kpi-value" id="k-alerta">0</div>
                <div class="kpi-sub" style="color:#ffdd57; font-weight:700">${t("alerta") ?? "Alertas"}</div>
              </div>
            </div>

            <!-- Banner de alerta operacional (offline) -->
            <div id="offlineBanner" class="card" style="margin-top:12px; display:none; background:#2b1d1f">
              <div style="display:flex; align-items:center; justify-content:space-between; gap:12px">
                <div>
                  <div style="font-weight:800; color:#ffd1d6">Sensores offline detectados</div>
                  <div id="offlineDesc" style="opacity:.85; font-size:13px"></div>
                </div>
                <button id="btnAckOffline" class="btn btn-outline" style="white-space:nowrap">OK</button>
              </div>
            </div>
          </div>

          <!-- MOTORES (visão parque) -->
          <div class="card">
            <div style="display:flex; align-items:center; justify-content:space-between">
              <div style="font-weight:800">${t("motores") ?? "Motores"}</div>
              <a class="link" href="#/motores">${t("ver_todos") ?? "Ver todos"}</a>
            </div>
            <div class="table-wrap">
              <table style="width:100%; text-align:center; border-collapse:collapse;">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>${t("motores") ?? "Motor"}</th>
                    <th>Local</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody id="tb-motores">
                  <tr><td colspan="5">${t("carregando") ?? "Carregando"}...</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Os painéis/gráficos grandes (mantidos conforme páginas específicas) -->
        <div class="grid" style="grid-template-columns:repeat(3, 1fr); gap:16px" id="chartsArea">
          <div class="card"><div style="font-weight:800">Temperatura</div><canvas id="chartTemp"></canvas></div>
          <div class="card"><div style="font-weight:800">Umidade</div><canvas id="chartUmi"></canvas></div>
          <div class="card"><div style="font-weight:800">Vibração</div><canvas id="chartVib"></canvas></div>
        </div>
      </div>
    </div>
  `;

  setTimeout(() => {
    // --- Referências DOM
    const kOnline = $("k-online");
    const kOffline = $("k-offline");
    const kAlerta = $("k-alerta");
    const tbMotores = $("tb-motores");
    const offlineBanner = $("offlineBanner");
    const offlineDesc = $("offlineDesc");
    const btnAckOffline = $("btnAckOffline");
    const statusBar = $("statusBar");

    let blinkTimer: number | undefined;
    function setCriticalBlink(on: boolean) {
      if (blinkTimer) { clearInterval(blinkTimer); blinkTimer = undefined; }
      if (!on) {
        (statusBar as HTMLElement).style.opacity = "1";
        (statusBar as HTMLElement).style.background = "rgba(50,200,100,.25)";
        statusBar.textContent = "SISTEMA NORMAL";
        return;
      }
      let vis = true;
      (statusBar as HTMLElement).style.background = "rgba(210,60,60,.35)";
      statusBar.textContent = "ATENÇÃO: Anomalia detectada";
      blinkTimer = window.setInterval(() => {
        vis = !vis;
        (statusBar as HTMLElement).style.opacity = vis ? "1" : "0.45";
      }, 700);
    }

    // --- Loop de atualização
    const doLoad = async () => {
      try {
        // 1) Motores
        const motores: MotorRow[] = await api.motores();
        const now = Date.now();
        const ack = loadAck();

        // 2) Alertas server (se disponível)
        let alertas: Alerta[] = [];
        try {
          const rawAlertas = await api.alertas();
          alertas = rawAlertas.map(a => ({
            id: a.id,
            motor_id: a.motorId || null,
            tipo: a.tipo,
            severidade: a.severidade === "alta" ? "CRIT" : a.severidade === "media" ? "WARN" : "INFO",
            mensagem: `${a.tipo}: valor ${a.valor}, limite ${a.limite}`,
            criado_em: a.criado_em,
            encerrado_em: null
          }));
        } catch { /* opcional */ }

        // 3) Derivar ONLINE/OFFLINE localmente (robusto contra falsos "online")
        const states = motores.map(m => ({
          id: m.id,
          online: isRecent(m.last_ts),
          last_ts: m.last_ts || null,
          nome: m.nome,
          localizacao: m.localizacao || "-"
        }));

        const onlineCount = states.filter(s => s.online).length;
        const offlineList = states.filter(s => !s.online);
        const offlineCount = offlineList.length;

        // 4) Injetar alertas sintéticos de OFFLINE (não persistentes) + somar total
        const syntheticOffline: Alerta[] = offlineList.map(s => ({
          id: -1000 - s.id, // id negativo para diferenciar
          motor_id: s.id,
          tipo: "OFFLINE",
          severidade: "WARN",
          mensagem: `Sensor do motor ${s.nome} offline desde ${s.last_ts ? new Date(s.last_ts).toLocaleString("pt-BR") : "desconhecido"}`,
          criado_em: new Date().toISOString(),
          encerrado_em: null
        }));
        const totalAlertas = (alertas?.filter(a => !a.encerrado_em).length || 0) + syntheticOffline.length;

        // 5) Atualizar KPIs
        kOnline.textContent = String(onlineCount);
        kOffline.textContent = String(offlineCount);
        kAlerta.textContent = String(totalAlertas);

        // 6) Banner OFFLINE com ACK local
        if (offlineCount > 0) {
          const nomes = offlineList.map(o => `#${o.id} ${o.nome}`).join(", ");
          offlineDesc.textContent = `Dispositivo(s) sem batimento: ${nomes}. Confirme "OK" se a parada for intencional.`;
          (offlineBanner as HTMLElement).style.display = "block";
          btnAckOffline.onclick = () => {
            const stamp = new Date().toISOString().slice(0,10); // por dia
            offlineList.forEach(o => { ack[`m${o.id}`] = stamp; });
            saveAck(ack);
            (offlineBanner as HTMLElement).style.display = "none";
          };
        } else {
          (offlineBanner as HTMLElement).style.display = "none";
        }

        // 7) Sinalização de criticidade (se houver alertas não-encerrados)
        setCriticalBlink(totalAlertas > 0);

        // 8) Tabela resumida de motores
        const html = states.slice(0, 8).map(s => {
          const st = s.online ? "ONLINE" : "OFFLINE";
          const cls = s.online ? "ok" : "err";
          return `<tr>
            <td>${s.id}</td>
            <td>${s.nome}</td>
            <td>${s.localizacao}</td>
            <td><span class="badge ${cls}">${st}</span></td>
            <td><a class="link" href="#/motor/${s.id}">${t("abrir") ?? "Abrir"}</a></td>
          </tr>`;
        }).join("") || `<tr><td colspan="5">Nenhum dispositivo</td></tr>`;
        tbMotores.innerHTML = html;

      } catch (e) {
        tbMotores.innerHTML = `<tr><td colspan="5">${t("erro_carregar") ?? "Erro ao carregar"}</td></tr>`;
        console.warn("[Dashboard] Falha ao carregar:", e);
      }
    };

    doLoad();
    stop = poll(doLoad, 5000, () => {});
  }, 0);

  return main;
}
