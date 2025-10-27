export function Forgot(){
  return `
  <div class="center">
    <div class="container" style="text-align:center">
      <h1 class="brand" style="color:#8a0042; font-size:48px; margin-bottom:32px">ESQUECEU A SENHA?</h1>
      <div class="card" style="max-width:820px; margin-inline:auto">
        <label class="label" for="email">E-mail:</label>
        <input id="email" class="input" placeholder="seu@email.com" />
        <div style="margin-top:16px"><button class="btn">Entrar</button></div>
      </div>
      <p style="margin-top:28px">Enviamos um link para redefinir a senha (se existir cadastro para o e-mail informado).</p>
    </div>
  </div>`;
}
