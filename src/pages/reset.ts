import api from "../services/api";

function getQueryToken(): string {
  // URL no formato: #/reset?token=abc
  const h = window.location.hash || "";
  const q = h.split("?")[1] || "";
  const params = new URLSearchParams(q);
  return params.get("token") || "";
}

export function Reset(){
  const token = getQueryToken();
  const html = `
  <div class="center" style="background:#fff; min-height:100vh">
    <div class="container" style="text-align:center">
      <h1 class="brand" style="color:#8a0042; font-size:48px; margin-bottom:32px">REDEFINIR SENHA</h1>
      <div class="card" style="max-width:820px; margin-inline:auto">
        <p>Token: <code>${token ? token.slice(0,8)+"..." : "(não informado)"}</code></p>
        <div class="field" style="margin-top:8px">
          <label class="label" for="nova">Nova senha:</label>
          <input id="nova" type="password" class="input" placeholder="••••••••" />
        </div>
        <div style="display:flex; gap:12px; justify-content:center; flex-wrap:wrap; margin-top:20px">
          <a class="btn btn-mokoto btn-outline" href="#/login">Voltar</a>
          <button id="btnReset" class="btn btn-mokoto btn-primary" ${!token ? "disabled":""}>Redefinir</button>
        </div>
        <p id="msg" style="margin-top:18px; color:#333"></p>
      </div>
    </div>
  </div>`;

  setTimeout(()=>{
    const btn = document.getElementById("btnReset") as HTMLButtonElement | null;
    const msg = document.getElementById("msg") as HTMLParagraphElement | null;
    btn?.addEventListener("click", async ()=>{
      const nova = (document.getElementById("nova") as HTMLInputElement).value;
      btn.disabled = true;
      try{
        await api.reset(token, nova);
        if (msg) msg.textContent = "Senha redefinida! Você já pode fazer login.";
      }catch(e:any){
        if (msg) msg.textContent = e?.message || "Não foi possível redefinir a senha.";
      }finally{
        btn.disabled = false;
      }
    });
  },0);

  return html;
}
