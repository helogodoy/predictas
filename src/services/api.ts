// src/services/api.ts
// ===== Helpers HTTP =====
async function postJSON<T>(url: string, body: unknown, token?: string): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).error || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

async function getJSON<T>(url: string, token?: string): Promise<T> {
  const res = await fetch(url, { headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).error || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ===== Formatadores (pt-BR, America/Sao_Paulo) =====
const tz = "America/Sao_Paulo";
export function fmtTime(d: Date | string | number) {
  return new Intl.DateTimeFormat("pt-BR", { timeStyle: "medium", hour12: false, timeZone: tz }).format(new Date(d));
}
export function fmtTimeHM(d: Date | string | number) {
  return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: tz }).format(new Date(d));
}
export function fmtDateTime(d: Date | string | number) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", hour12: false, timeZone: tz }).format(new Date(d));
}

// ===== Tipos =====
export type LoginResponse = { token: string; nome: string; email: string };
export type User = { token: string; nome: string; email: string };

type StatusGeral = { dispositivos: number; sensores: number; leituras: number; alertas: number };

type AlertaApi = {
  id: number;
  leitura_id: number;
  sensor_id: number;
  tipo: "temperatura" | "vibracao" | "outro";
  nivel: "baixo" | "normal" | "alto" | "critico";
  mensagem: string;
  criado_em: string;
};

type AlertaUI = {
  id: number;
  motorId: number;
  tipo: string;
  valor: number;
  limite: number | string;
  severidade: "baixa" | "media" | "alta";
  status: string;
};

type SerieRow = { ts: string; valor: number };

// ===== API =====
const api = {
  // LOGIN
  async login(email: string, password: string): Promise<{ user: User }> {
    const data = await postJSON<LoginResponse>("/api/login", { email, senha: password });
    return { user: { token: data.token, nome: data.nome, email: data.email } };
  },

  // STATUS GERAL
  async status(): Promise<{ online: number; offline: number; alerta: number }> {
    const token = localStorage.getItem("predictas_token") || undefined;
    const d = await getJSON<StatusGeral>("/api/status-geral", token);
    return { online: Number(d.dispositivos ?? 0), offline: 0, alerta: Number(d.alertas ?? 0) };
  },

  // ALERTAS
  async ultimosAlertas(limit = 20): Promise<Array<{ motorId: number; ts: string; severidade: "baixa" | "media" | "alta" }>> {
    const token = localStorage.getItem("predictas_token") || undefined;
    const rows = await getJSON<AlertaApi[]>("/api/alertas?limit=" + limit, token);
    return rows.map((r) => {
      let sev: "baixa" | "media" | "alta" = "baixa";
      if (r.nivel === "critico") sev = "alta";
      else if (r.nivel === "alto") sev = "media";
      return { motorId: Number(r.sensor_id) || 0, ts: r.criado_em, severidade: sev };
    });
  },

  async alertas(limit = 50): Promise<AlertaUI[]> {
    const token = localStorage.getItem("predictas_token") || undefined;
    const rows = await getJSON<AlertaApi[]>("/api/alertas?limit=" + limit, token);

    return rows.map((r) => {
      let sev: "baixa" | "media" | "alta" = "baixa";
      if (r.nivel === "critico") sev = "alta";
      else if (r.nivel === "alto") sev = "media";

      let valor = 0;
      const m = r.mensagem?.match(/valor\s*=\s*([0-9]+(?:\.[0-9]+)?)/i);
      if (m) valor = Number(m[1]);

      let limite: number | string = "-";
      const mx = r.mensagem?.match(/max\s*=\s*([0-9]+(?:\.[0-9]+)?)/i);
      const mn = r.mensagem?.match(/min\s*=\s*([0-9]+(?:\.[0-9]+)?)/i);
      if (mx) limite = Number(mx[1]);
      else if (mn) limite = Number(mn[1]);

      return {
        id: r.id,
        motorId: Number(r.sensor_id) || 0,
        tipo: r.tipo,
        valor,
        limite,
        severidade: sev,
        status: r.nivel.toUpperCase()
      };
    });
  },

  // SÉRIES POR MÉTRICA (backend ignora sensorId)
  async temperaturaSerie(_sensorId: number, _range: "1h" | "7d" | "30d" | "24h" = "1h"): Promise<SerieRow[]> {
    const token = localStorage.getItem("predictas_token") || undefined;
    const rows = await getJSON<any[]>(`/api/leituras?metric=temperatura&limit=120`, token);
    return rows.map((r) => ({ ts: r.momento, valor: Number(r.valor) }));
  },

  async vibracaoSerie(_sensorId: number, _range: "1h" | "7d" | "30d" | "24h" = "1h"): Promise<SerieRow[]> {
    const token = localStorage.getItem("predictas_token") || undefined;
    const rows = await getJSON<any[]>(`/api/leituras?metric=vibracao&limit=120`, token);
    return rows.map((r) => ({ ts: r.momento, valor: Number(r.valor) }));
  },

  async leituras(_sensorId: number, tipo: "temperatura" | "vibracao"): Promise<SerieRow[]> {
    const token = localStorage.getItem("predictas_token") || undefined;
    const metric = tipo === "vibracao" ? "vibracao" : "temperatura";
    const rows = await getJSON<any[]>(`/api/leituras?metric=${metric}&limit=120`, token);
    return rows.map((r) => ({ ts: r.momento, valor: Number(r.valor) }));
  },

  // MOTORES — sem fallback de mock
  async motores() {
    const token = localStorage.getItem("predictas_token") || undefined;
    const rows = await getJSON<any[]>(`/api/motores`, token);
    return rows.map((d) => {
      let st = "ONLINE";
      if (String(d.status).toLowerCase() === "manutencao") st = "ALERTA";
      if (String(d.status).toLowerCase() === "inativo") st = "OFFLINE";
      return { id: d.id, nome: d.nome, localizacao: d.localizacao, status: st };
    });
  },

  

  async motor(id: number) {
    const ms = await this.motores().catch(() => []);
    return ms.find((m) => m.id === id) || { id, nome: `Motor ${id}`, localizacao: "--", status: "ONLINE" };
  },

  // Esqueci/Reset
  async forgot(email: string): Promise<void> { await postJSON("/api/forgot", { email }); },
  async reset(token: string, novaSenha: string): Promise<void> { await postJSON("/api/reset", { token, novaSenha }); }
};

// ===== Poll util =====
function poll<T>(fn: () => Promise<T> | T, intervalMs: number, onData: (data: T) => void) {
  let stop = false;
  async function tick() {
    if (stop) return;
    try { onData(await fn()); } catch {}
    finally { if (!stop) setTimeout(tick, intervalMs); }
  }
  tick();
  return () => { stop = true; };
}

export { api, poll };
export default api;
