export function Topbar(title="Nome do Dashboard"){
  return `
  <header class="topbar">
    <div class="container topbar-inner">
      <div class="brand" style="font-size:24px">${title}</div>
      <div class="search">
        <input id="q" placeholder="Buscar/Filtrar..." />
      </div>
      <div class="icon-row">
        <div class="icon">🔔</div>
        <div class="icon">🏭</div>
        <div class="icon">📈</div>
        <div class="icon">⚙️</div>
        <a class="icon" href="#/dashboard" title="Home">🏠</a>
      </div>
    </div>
  </header>`;
}
