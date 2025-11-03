import api from "../services/api";

export function Login() {
  const html = `
  <div class="center">
    <div class="login-box">
      <div class="login-title brand">PREDICTAS</div>
      <form id="loginForm" class="card login-form">
        <div class="field">
          <label class="label" for="login">Login:</label>
          <input id="login" class="input" placeholder="E-mail da empresa" required />
        </div>

        <div class="field">
          <label class="label" for="senha">Senha:</label>
          <input id="senha" type="password" class="input" placeholder="••••••••" required />
        </div>

        <p id="errorMsg" style="color: var(--err); display: none; margin-top: 8px"></p>
        <button id="btnLogin" type="submit" class="btn btn-mokoto btn-primary">Entrar</button>
        <div><a class="link" href="#/forgot">Esqueceu a senha? Clique aqui!</a></div>
      </form>
    </div>
  </div>
  `;

  setTimeout(() => {
    const form = document.getElementById("loginForm") as HTMLFormElement | null;
    const errorMsg = document.getElementById("errorMsg") as HTMLParagraphElement | null;
    const btnLogin = document.getElementById("btnLogin") as HTMLButtonElement | null;

    form?.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (errorMsg) { errorMsg.style.display = "none"; }
      if (btnLogin) { btnLogin.disabled = true; }

      try {
        const email = (document.getElementById("login") as HTMLInputElement).value.trim();
        const password = (document.getElementById("senha") as HTMLInputElement).value;

        const { user } = await api.login(email, password);

        // Salva usuário e token
        localStorage.setItem("predictas_user", JSON.stringify(user));
        localStorage.setItem("predictas_token", user.token);

        // Vai para o dashboard
        window.location.hash = "#/dashboard";
      } catch (error: any) {
        if (errorMsg) {
          errorMsg.textContent = error.message || "Erro ao fazer login. Tente novamente.";
          errorMsg.style.display = "block";
        }
      } finally {
        if (btnLogin) { btnLogin.disabled = false; }
      }
    });
  }, 0);

  return html;
}
