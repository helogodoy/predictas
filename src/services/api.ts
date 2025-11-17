// src/services/api.ts

// ===== Config de base =====
// Prioridade: localStorage("predictas_api") > VITE_API_URL > heurística localhost
const BASE_URL =
  (typeof window !== "undefined" &&
    typeof localStorage !== "undefined" &&
    localStorage.getItem("predictas_api")) ||
  (import.meta as any)?.env?.VITE_API_URL ||
  (typeof window !== "undefined"
    ? window.location.origin.replace(":5173", ":3000")
    : "http://localhost:3000");

function abs(url: string) {
  return url.startsWith("http")
    ? url
    : `${BASE_URL.replace(/\/$/, "")}${url}`;
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
    try {
      err = await res.json();
    } catch {}
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
    try {
      err = await res.json();
    } catch {}
    throw new Error((err as any)?.error || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ===== Formatadores (pt-BR, America/Sao_Paulo) =====
const tz = "America/Sao_Paulo";
export function fmtTime(d: Date | string | number) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeStyle: "medium",
    hour12: false,
    timeZone: tz,
  }).format(new Date(d));
}
export function fmtTimeHM(d: Date | string | number) {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: tz,
  }).format(new Date(d));
}
export function fmtDateTime(d: Date | string | number) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    hour12: false,
    timeZone: tz,
  }).format(new Date(d));
}

// ===== Tipos =====
export type LoginResponse = { token: string; nome: string; email: string };
export type User = { token: string; nome: string; email: string };

export type StatusGeral = {
  dispositivos: number;
  sensores: number;
  leituras: number;
  alertas: number;
};

type AlertaApi = {
  id: number;
  leitura_id: number;
  sensor_id: number;
  tipo: "temperatura" | "vibracao" | "umidade" | "outro";
  nivel: "baixo" | "normal" | "alto" | "critico";
  mensagem: string;
  criado_em: string;
};

export type SerieRow = { ts: string; valor: number };

const api = {
  // AUTH
  async login(email: string, senha: string): Promise<LoginResponse> {
    const r = await postJSON<LoginResponse>("/api/login", { email, senha });

    // Guarda localmente quando estiver em ambiente de navegador
    if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
      localStorage.setItem("predictas_token", r.token);
      localStorage.setItem(
        "predictas_user",
        JSON.stringify({ email: r.email, nome: r.nome })
      );
    }

    return r;
  },

  // KPIs
  async statusGeral(): Promise<StatusGeral> {
    const token =
      (typeof localStorage !== "undefined" &&
        localStorage.getItem("predictas_token")) ||
      undefined;
    return getJSON<StatusGeral>("/api/status-geral", token);
  },

  // ALERTAS
  async alertas(limit = 20): Promise<
    {
      id: number;
      motorId: number;
      tipo: string;
      valor: number | string;
      limite: number | string;
      severidade: "baixa" | "media" | "alta";
      status: string;
      criado_em: string;
    }[]
  > {
    const token =
      (typeof localStorage !== "undefined" &&
        localStorage.getItem("predictas_token")) ||
      undefined;
    const rows = await getJSON<AlertaApi[]>(
      `/api/alertas?limit=${limit}`,
      token
    );
    return rows.map((r) => {
      // tenta extrair valor numérico da mensagem
      let valor: number | string = "-";
      const m = r.mensagem?.match(/([0-9]+(?:\.[0-9]+)?)/);
      if (m) valor = Number(m[1]);

      const tipo = r.tipo || "outro";
      const sev: "baixa" | "media" | "alta" =
        r.nivel === "critico"
          ? "alta"
          : r.nivel === "alto"
          ? "media"
          : "baixa";

      let limite: number | string = "-";
      const mx = r.mensagem?.match(/max\s*=\s*([0-9]+(?:\.[0-9]+)?)/i);
      const mn = r.mensagem?.match(/min\s*=\s*([0-9]+(?:\.[0-9]+)?)/i);
      if (mx) limite = Number(mx[1]);
      else if (mn) limite = Number(mn[1]);

      return {
        id: r.id,
        motorId: Number(r.sensor_id) || 0,
        tipo,
        valor,
        limite,
        severidade: sev,
        status: r.nivel.toUpperCase(),
        criado_em: r.criado_em,
      };
    });
  },

  // SÉRIES POR MÉTRICA — normalizando ordem do tempo ASC
  async temperaturaSerie(
    _sensorId: number,
    _range: "1h" | "7d" | "30d" | "24h" = "1h"
  ): Promise<SerieRow[]> {
    const token =
      (typeof localStorage !== "undefined" &&
        localStorage.getItem("predictas_token")) ||
      undefined;
    const rows = await getJSON<any[]>(
      `/api/leituras?metric=temperatura&limit=120`,
      token
    );
    return rows.reverse().map((r) => ({
      ts: r.momento,
      valor: Number(r.valor),
    }));
  },

  async umidadeSerie(
    _sensorId: number,
    _range: "1h" | "7d" | "30d" | "24h" = "1h"
  ): Promise<SerieRow[]> {
    const token =
      (typeof localStorage !== "undefined" &&
        localStorage.getItem("predictas_token")) ||
      undefined;
    const rows = await getJSON<any[]>(
      `/api/leituras?metric=umidade&limit=120`,
      token
    );
    return rows.reverse().map((r) => ({
      ts: r.momento,
      valor: Number(r.valor),
    }));
  },

  async vibracaoSerie(
    _sensorId: number,
    _range: "1h" | "7d" | "30d" | "24h" = "1h"
  ): Promise<SerieRow[]> {
    const token =
      (typeof localStorage !== "undefined" &&
        localStorage.getItem("predictas_token")) ||
      undefined;
    const rows = await getJSON<any[]>(
      `/api/leituras?metric=vibracao&limit=120`,
      token
    );
    return rows.reverse().map((r) => ({
      ts: r.momento,
      valor: Number(r.valor),
    }));
  },

  // LISTAS
  async motores(): Promise<any[]> {
    const token =
      (typeof localStorage !== "undefined" &&
        localStorage.getItem("predictas_token")) ||
      undefined;
    return getJSON<any[]>(`/api/motores`, token);
  },

  async motor(id: number): Promise<any> {
    const token =
      (typeof localStorage !== "undefined" &&
        localStorage.getItem("predictas_token")) ||
      undefined;
    return getJSON<any>(`/api/motores/${id}`, token);
  },
};

// ===== Poll util =====
function poll<T>(
  fn: () => Promise<T> | T,
  intervalMs: number,
  onData: (data: T) => void
) {
  let stop = false;
  async function tick() {
    if (stop) return;
    try {
      onData(await fn());
    } catch {}
    finally {
      if (!stop) setTimeout(tick, intervalMs);
    }
  }
  tick();
  return () => {
    stop = true;
  };
}

export { api, poll, BASE_URL };
export default api;
