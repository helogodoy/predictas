import api from "../services/api";

export function Forgot(){
  const html = `
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
          <button id="btnForgot" class="btn btn-mokoto btn-primary">Enviar link</button>
        </div>
        <p id="msg" style="margin-top:18px; color:#333"></p>
      </div>
    </div>
  </div>`;

  setTimeout(() => {
    const btn = document.getElementById("btnForgot") as HTMLButtonElement | null;
    const msg = document.getElementById("msg") as HTMLParagraphElement | null;
    btn?.addEventListener("click", async () => {
      const email = (document.getElementById("email") as HTMLInputElement).value.trim();
      btn.disabled = true;
      try{
        await api.forgot(email);
        if (msg) msg.textContent = "Se o e-mail estiver cadastrado, enviaremos um link para redefinir sua senha.";
      }catch(e:any){
        if (msg) msg.textContent = e?.message || "Não foi possível enviar o link.";
      }finally{
        btn.disabled = false;
      }
    });
  },0);

  return html;
}
