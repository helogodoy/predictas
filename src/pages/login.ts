export function Login(){
  return `
  <div class="center">
    <div class="login-box">
      <div class="login-title brand">PREDICTAS</div>
      <form class="card login-form" onsubmit="return false">
        <label class="label" for="login">Login:</label>
        <input id="login" class="input" placeholder="Seu usuário ou e-mail" />

        <label class="label" for="senha">Senha:</label>
        <input id="senha" type="password" class="input" placeholder="••••••••" />

        <button id="btnLogin" class="btn">Entrar</button>
        <div><a class="link" href="#/forgot">esqueceu a senha?</a></div>
      </form>
    </div>
  </div>
  `;
}
