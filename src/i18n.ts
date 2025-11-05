// src/i18n.ts
export type Lang = "pt" | "en";

const STORAGE_KEY = "predictas_lang";

let current: Lang = (() => {
  const saved = (localStorage.getItem(STORAGE_KEY) || "").toLowerCase();
  return (saved === "pt" || saved === "en") ? (saved as Lang) : "pt";
})();

type Dict = Record<string, string>;
type Bundle = Record<Lang, Dict>;

const dict: Bundle = {
  pt: {
    // Topbar / Sidebar
    app_name: "Predictas",
    search_placeholder: "Pesquisar...",
    nav_dashboard: "Dashboard",
    nav_motores: "Motores",
    nav_leituras: "Leituras",
    nav_alertas: "Alertas",
    nav_perfil: "Perfil",
    nav_sair: "Sair",

    // Páginas / rótulos
    page_dashboard: "Dashboard",
    page_motores: "Motores",
    page_leituras: "Leituras",
    page_alertas: "Alertas",
    page_perfil: "Perfil",
    status_geral: "Status Geral",
    temperatura_media: "Temperatura Média (°C) – Últimas 24h",
    vibracao_media: "Vibração Média (mm/s)",
    ultimos_alertas: "Últimos alertas",
    motores: "Motores",
    online: "ONLINE",
    offline: "OFFLINE",
    alerta: "ALERTA",
    sem_alertas: "Sem alertas",
    dispositivos: "Dispositivos",
    nenhum_dispositivo: "Nenhum dispositivo",
    abrir: "Abrir",
    historico_alertas: "Histórico de alertas",
    data_hora: "Data/Hora",
    criticidade: "Criticidade",
    leituras_sensor: "Leituras – Sensor 1 (Temperatura)",
    quando: "Quando",
    valor_c: "Valor (°C)",
    sem_leituras: "Sem leituras",
    idioma: "Idioma",
    portugues: "Português",
    ingles: "Inglês",
  },
  en: {
    // Topbar / Sidebar
    app_name: "Predictas",
    search_placeholder: "Search...",
    nav_dashboard: "Dashboard",
    nav_motores: "Assets",
    nav_leituras: "Readings",
    nav_alertas: "Alerts",
    nav_perfil: "Profile",
    nav_sair: "Sign out",

    // Pages / labels
    page_dashboard: "Dashboard",
    page_motores: "Assets",
    page_leituras: "Readings",
    page_alertas: "Alerts",
    page_perfil: "Profile",
    status_geral: "Overall Status",
    temperatura_media: "Average Temperature (°C) – Last 24h",
    vibracao_media: "Average Vibration (mm/s)",
    ultimos_alertas: "Latest alerts",
    motores: "Assets",
    online: "ONLINE",
    offline: "OFFLINE",
    alerta: "ALERT",
    sem_alertas: "No alerts",
    dispositivos: "Assets",
    nenhum_dispositivo: "No assets",
    abrir: "Open",
    historico_alertas: "Alerts history",
    data_hora: "Date/Time",
    criticidade: "Severity",
    leituras_sensor: "Readings – Sensor 1 (Temperature)",
    quando: "When",
    valor_c: "Value (°C)",
    sem_leituras: "No readings",
    idioma: "Language",
    portugues: "Portuguese",
    ingles: "English",
  },
};

// ------- API -------
export function getLang(): Lang {
  return current;
}

export function setLang(lang: Lang) {
  if (lang !== "pt" && lang !== "en") return;
  current = lang;
  localStorage.setItem(STORAGE_KEY, lang);
  // avisa o app para re-renderizar
  document.dispatchEvent(new CustomEvent("i18n:change", { detail: { lang } }));
}

export function t(key: string): string {
  return dict[current][key] ?? dict.en[key] ?? key;
}
