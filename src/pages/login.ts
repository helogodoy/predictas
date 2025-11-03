import api from "../services/api";

// ... resto do arquivo

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
          <div style="display:flex; align-items:center; gap:8px">
            <input id="senha" type="password" class="input" placeholder="••••••••" required />
            <button id="togglePwd" type="button" class="btn btn-outline" style="padding:10px 14px">👁</button>
          </div>
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

    const toggle = document.getElementById("togglePwd") as HTMLButtonElement | null;
    const senhaInput = document.getElementById("senha") as HTMLInputElement | null;

    toggle?.addEventListener("click", () => {
      if (!senhaInput) return;
      const isPwd = senhaInput.type === "password";
      senhaInput.type = isPwd ? "text" : "password";
      if (toggle) toggle.textContent = isPwd ? "🙈" : "👁";
    });

    form?.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (errorMsg) { errorMsg.style.display = "none"; }
      if (btnLogin) { btnLogin.disabled = true; }

      try {
        const email = (document.getElementById("login") as HTMLInputElement).value.trim();
        const password = (document.getElementById("senha") as HTMLInputElement).value;

        const { user } = await api.login(email, password);
        localStorage.setItem("predictas_user", JSON.stringify(user));
        localStorage.setItem("predictas_token", user.token);
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
