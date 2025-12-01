// src/services/api.ts

// Detecta ambiente do front e calcula a BASE_URL da API
function resolveBaseURL() {
  if (typeof window === "undefined") return "";

  const { protocol, hostname, port } = window.location;

  const isLocalhost = hostname === "localhost" || hostname === "127.0.0.1";
  const onTomcat8080 = port === "8080";            // front no Tomcat
  const onExpress3000 = port === "3000";           // front servido pelo próprio Express

  // Cenário recomendado (um processo só): front+API no :3000 → usa rota relativa
  if (onExpress3000 || isLocalhost && port === "3000") {
    return ""; // rota relativa: /api/...
  }

  // Cenário atual: front no :8080 (Tomcat) consumindo API no :3000 (Node)
  if (onTomcat8080) {
    return `${protocol}//${hostname}:3000`;
  }

  // Fallback conservador: tenta API no :3000 da mesma máquina
  return `${protocol}//${hostname}:3000`;
}

const BASE_URL = resolveBaseURL();
console.log("[PREDICTAS] BASE_URL =", BASE_URL);

// Monta URL absoluta quando necessário
function abs(url: string) {
  return url.startsWith("http") ? url : `${BASE_URL.replace(/\/$/, "")}${url}`;
}

// ===== Helpers HTTP =====
async function getJSON<T>(url: string, token?: string) {
  const res = await fetch(abs(url), {
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: "include",
  });
  if (!res.ok) {
    let err: any;
    try { err = await res.json(); } catch {}
    throw new Error((err as any)?.error || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

async function postJSON<T>(url: string, body: any, token?: string) {
  const res = await fetch(abs(url), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
    credentials: "include",
  });
  if (!res.ok) {
    let err: any;
    try { err = await res.json(); } catch {}
    throw new Error((err as any)?.error || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ===== Formatadores =====
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
export type StatusGeral = { dispositivos: number; sensores: number; leituras: number; alertas: number; };
type AlertaApi = { id: number; leitura_id: number; sensor_id: number; tipo: "temperatura" | "vibracao" | "umidade" | "outro"; nivel: "baixo" | "normal" | "alto" | "critico"; mensagem: string; criado_em: string; };
export type SerieRow = { ts: string; valor: number };

// ===== API =====
const api = {
  async login(email: string, senha: string): Promise<LoginResponse> {
    const r = await postJSON<LoginResponse>("/api/login", { email, senha });
    if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
      localStorage.setItem("predictas_token", r.token);
      localStorage.setItem("predictas_user", JSON.stringify({ email: r.email, nome: r.nome }));
    }
    return r;
  },

  async statusGeral(): Promise<StatusGeral> {
    const token = (typeof localStorage !== "undefined" && localStorage.getItem("predictas_token")) || undefined;
    return getJSON<StatusGeral>("/api/status-geral", token);
  },

  async alertas(limit = 20) {
    const token = (typeof localStorage !== "undefined" && localStorage.getItem("predictas_token")) || undefined;
    const rows = await getJSON<AlertaApi[]>(`/api/alertas?limit=${limit}`, token);
    return rows.map((r) => {
      let valor: number | string = "-";
      const m = r.mensagem?.match(/([0-9]+(?:\.[0-9]+)?)/);
      if (m) valor = Number(m[1]);

      const tipo = r.tipo || "outro";
      const sev: "baixa" | "media" | "alta" = r.nivel === "critico" ? "alta" : r.nivel === "alto" ? "media" : "baixa";

      let limite: number | string = "-";
      const mx = r.mensagem?.match(/max\s*=\s*([0-9]+(?:\.[0-9]+)?)/i);
      const mn = r.mensagem?.match(/min\s*=\s*([0-9]+(?:\.[0-9]+)?)/i);
      if (mx) limite = Number(mx[1]);
      else if (mn) limite = Number(mn[1]);

      return { id: r.id, motorId: Number(r.sensor_id) || 0, tipo, valor, limite, severidade: sev, status: r.nivel.toUpperCase(), criado_em: r.criado_em };
    });
  },

  async temperaturaSerie() {
    const token = (typeof localStorage !== "undefined" && localStorage.getItem("predictas_token")) || undefined;
    const rows = await getJSON<any[]>(`/api/leituras?metric=temperatura&limit=120`, token);
    return rows.reverse().map((r) => ({ ts: r.momento, valor: Number(r.valor) }));
  },

  async umidadeSerie() {
    const token = (typeof localStorage !== "undefined" && localStorage.getItem("predictas_token")) || undefined;
    const rows = await getJSON<any[]>(`/api/leituras?metric=umidade&limit=120`, token);
    return rows.reverse().map((r) => ({ ts: r.momento, valor: Number(r.valor) }));
  },

  async vibracaoSerie() {
    const token = (typeof localStorage !== "undefined" && localStorage.getItem("predictas_token")) || undefined;
    const rows = await getJSON<any[]>(`/api/leituras?metric=vibracao&limit=120`, token);
    return rows.reverse().map((r) => ({ ts: r.momento, valor: Number(r.valor) }));
  },

  async motores(): Promise<any[]> {
    const token = (typeof localStorage !== "undefined" && localStorage.getItem("predictas_token")) || undefined;
    return getJSON<any[]>(`/api/motores`, token);
  },

  async motor(id: number): Promise<any> {
    const token = (typeof localStorage !== "undefined" && localStorage.getItem("predictas_token")) || undefined;
    return getJSON<any>(`/api/motores/${id}`, token);
  },
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

export { api, poll, BASE_URL };
export default api;
