// src/components/sidebar.ts
export function Sidebar(active: string = "dashboard") {
  const items = [
    { id: "dashboard", label: "Dashboard", href: "#/dashboard", icon: "🏠" },
    { id: "leituras",  label: "Leituras",  href: "#/leituras",  icon: "📊" },
    { id: "alertas",   label: "Alertas",   href: "#/alertas",   icon: "⚠️" },
    { id: "motores",   label: "Motores",   href: "#/motores",   icon: "🧰" },
    { id: "perfil",    label: "Perfil",    href: "#/profile",   icon: "👤" },
  ];

  // se quiser restringir um item admin:
  // const userStr = localStorage.getItem("predictas_user") || "";
  // if (userStr.includes("Predictas")) items.push({ id:"admin", label:"Administração", href:"#/admin", icon:"⚙️" });

  return `
    <nav id="sidebar" class="sidebar" aria-hidden="true">
      <div class="sidebar-head">
        <div class="logo">PREDICTAS</div>
        <button id="btnCloseSidebar" class="btn-icon" aria-label="Fechar menu" title="Fechar menu">✕</button>
      </div>
      <ul class="sidebar-list">
        ${items.map(it => `
          <li class="${it.id === active ? "active" : ""}">
            <a class="sidebar-link" data-close-sidebar="1" href="${it.href}">
              <span class="icon">${it.icon}</span>
              <span>${it.label}</span>
            </a>
          </li>
        `).join("")}
      </ul>
      <div class="sidebar-footer">v1.0</div>
    </nav>
    <div id="sidebarOverlay" class="sidebar-overlay" tabindex="-1" aria-hidden="true"></div>
  `;
}
