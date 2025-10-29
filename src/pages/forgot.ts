export function Forgot(){
  return `
  <div class="center" style="background:#fff; min-height:100vh">
    <div class="container" style="text-align:center">
      <h1 class="brand" style="color:#8a0042; font-size:48px; margin-bottom:32px">ESQUECEU A SENHA?</h1>
      
      <div class="card" style="max-width:820px; margin-inline:auto">
        <div class="field" style="margin-top:8px">
          <label class="label" for="email">E-mail:</label>
          <input id="email" class="input" placeholder="seu@email.com" />
        </div>

        <div style="display:flex; gap:12px; justify-content:center; flex-wrap:wrap; margin-top:20px">
          <a class="btn btn-mokoto btn-outline" href="#/login">Voltar</a>
          <button class="btn btn-mokoto btn-primary">Entrar</button>
        </div>
              <p style="margin-top:28px">Se o e-mail estiver cadastrado, enviaremos um link para redefinir sua senha.</p>

      </div>

    </div>
  </div>`;
}
