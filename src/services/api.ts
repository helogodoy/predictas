const BASE = "/api"; // troque para http://localhost:3000/api se seu back estiver externo

export type Motor = { id:number; nome:string; localizacao?:string; status?:"ONLINE"|"OFFLINE"|"ALERTA" };
export type Leitura = { sensorId:number; ts:string; valor:number };
export type Alerta = { id:number; motorId:number; tipo:"temperatura"|"vibracao"; valor:number; limite:number; ts:string; severidade:"baixa"|"media"|"alta"; status:"aberto"|"fechado" };

async function j<T>(path:string, init?:RequestInit):Promise<T>{
  const res = await fetch(BASE+path, { headers:{ "Content-Type":"application/json" }, ...init });
  if(!res.ok) throw new Error((await res.json().catch(()=>({}))).error || res.statusText);
  return res.json();
}

export const api = {
  // Resumos p/ dashboard
  status: () => j<{online:number; offline:number; alerta:number}>("/status-geral"),
  ultimosAlertas: () => j<Alerta[]>("/alertas?limit=5"),
  temperaturaSerie: (motorId:number, janela:"1h"|"7d"|"30d"="1h") => j<Leitura[]>(`/leituras?motorId=${motorId}&tipo=temperatura&janela=${janela}`),
  vibracaoSerie: (motorId:number, janela:"1h"|"7d"|"30d"="1h") => j<Leitura[]>(`/leituras?motorId=${motorId}&tipo=vibracao&janela=${janela}`),

  // Listas e detalhes
  motores: () => j<Motor[]>("/motores"),
  motor: (id:number) => j<Motor>(`/motores/${id}`),
};

/* Polling simples para “tempo real”.
   Troque por SSE (EventSource) quando tiver /api/stream. */
export function poll<T>(fn:()=>Promise<T>, ms:number, onData:(v:T)=>void){
  let stopped=false;
  const loop=async()=>{
    while(!stopped){
      try{ onData(await fn()); }catch(e){ /* ignore */ }
      await new Promise(r=>setTimeout(r, ms));
    }
  };
  loop();
  return ()=>{ stopped=true; };
}
