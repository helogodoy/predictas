import { api } from "../services/api";

export function Login(){
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

  // Aguarda o DOM estar pronto
  setTimeout(() => {
    const form = document.getElementById("loginForm") as HTMLFormElement;
    const errorMsg = document.getElementById("errorMsg")!;
    const btnLogin = document.getElementById("btnLogin") as HTMLButtonElement;

    form?.addEventListener("submit", async (e) => {
      e.preventDefault();
      errorMsg.style.display = "none";
      btnLogin.disabled = true;

      try {
        const email = (document.getElementById("login") as HTMLInputElement).value;
        const password = (document.getElementById("senha") as HTMLInputElement).value;
        
        const { user } = await api.login(email, password);
        
        // Salva usuário no localStorage
        localStorage.setItem("user", JSON.stringify(user));
        
        // Redireciona para o dashboard
        window.location.hash = "#/dashboard";
      } catch (error: any) {
        errorMsg.textContent = error.message || "Erro ao fazer login. Tente novamente.";
        errorMsg.style.display = "block";
      } finally {
        btnLogin.disabled = false;
      }
    });
  }, 0);

  return html;
}

