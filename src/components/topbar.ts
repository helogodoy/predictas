// src/components/topbar.ts
export function Topbar(title: string, companyName?: string) {
  const comp = companyName || getCompanyNameFromLocalStorage() || "Predictas";
  return `
    <header class="topbar">
      <div class="topbar-inner">
        <button id="btnMenu" class="btn-icon" aria-label="Abrir menu" title="Abrir menu">☰</button>
        <div class="tb-title">
          <div class="tb-title-main">${escapeHtml(title || "Dashboard")}</div>
          <div class="tb-title-sub">${escapeHtml(comp)}</div>
        </div>
        <div class="tb-spacer"></div>
      </div>
    </header>
  `;
}

function getCompanyNameFromLocalStorage(): string | null {
  try {
    const raw = localStorage.getItem("predictas_user");
    if (!raw) return null;
    const user = JSON.parse(raw);
    // se no futuro você incluir company/empresa no user, prioriza:
    return (user.company || user.nome || user.email || "").toString();
  } catch {
    return null;
  }
}

function escapeHtml(s: string) {
  return (s || "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" } as any)[c]
  );
}
