import api, { LoginResponse } from "../services/api";

export function Login() {
  const html = `
  <div class="center">
    <div class="login-box">
      <div class="login-title brand">PREDICTASsss</div>
      <form id="loginForm" class="card login-form">
        <div class="field">
          <label class="label" for="login">Login:</label>
          <input id="login" class="input" placeholder="E-mail da empresa" required />
        </div>

        <div class="field">
          <label class="label" for="senha">Senha:</label>
          <div style="display:flex; align-items:center; gap:8px">
            <input id="senha" type="password" class="input" placeholder="••••••••" required />
            <button id="togglePwd" type="button"
              class="btn btn-outline"
              aria-label="Mostrar senha"
              style="padding:8px; display:flex; align-items:center; justify-content:center; width:40px; height:40px">
              <img id="eyeIcon" src="./assets/eye.png" alt="Mostrar senha" width="20" height="20" />
            </button>
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
    const eyeIcon = document.getElementById("eyeIcon") as HTMLImageElement | null;
    const senhaInput = document.getElementById("senha") as HTMLInputElement | null;

    // Toggle mostrar/ocultar senha
    toggle?.addEventListener("click", () => {
      if (!senhaInput || !eyeIcon || !toggle) return;
      const isPwd = senhaInput.type === "password";
      senhaInput.type = isPwd ? "text" : "password";

      eyeIcon.src = isPwd ? "./assets/eyeclosed.png" : "./assets/eye.png";
      eyeIcon.alt = isPwd ? "Ocultar senha" : "Mostrar senha";
      toggle.setAttribute("aria-label", isPwd ? "Ocultar senha" : "Mostrar senha");
      toggle.setAttribute("aria-pressed", String(isPwd));
    });

    // Submit do login
    form?.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (errorMsg) errorMsg.style.display = "none";
      if (btnLogin) btnLogin.disabled = true;

      try {
        const emailInput = document.getElementById("login") as HTMLInputElement | null;
        const senhaInput2 = document.getElementById("senha") as HTMLInputElement | null;

        const email = emailInput?.value.trim() || "";
        const password = senhaInput2?.value || "";

        const resp: LoginResponse = await api.login(email, password);

        // Garante que o token e o usuário fiquem salvos
        localStorage.setItem("predictas_token", resp.token);
        localStorage.setItem(
          "predictas_user",
          JSON.stringify({ email: resp.email, nome: resp.nome })
        );

        window.location.hash = "#/dashboard";
      } catch (error: any) {
        if (errorMsg) {
          errorMsg.textContent =
            error?.message || "Erro ao fazer login. Tente novamente.";
          errorMsg.style.display = "block";
        }
      } finally {
        if (btnLogin) btnLogin.disabled = false;
      }
    });
  }, 0);

  return html;
}
