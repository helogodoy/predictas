export function renderSidebar(active:string){
  return `
    <div class="nav-brand">PREDICTAS</div>
    <nav class="nav">
      <a href="#/dashboard" class="${active==="dashboard"?"active":""}">Dashboard</a>
      <a href="#/motores" class="${active==="motores"?"active":""}">Motores</a>
      <a href="#/leituras" class="${active==="leituras"?"active":""}">Leituras</a>
      <a href="#/alertas" class="${active==="alertas"?"active":""}">Alertas</a>
    </nav>
  `;
}
