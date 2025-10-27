// Centralize endpoints aqui. Em dev, pode apontar para http://localhost:3000
const BASE = "/api";

export type Motor = { id:number; nome:string; localizacao?:string; status?:"ok"|"alerta"|"falha" };
export type Alerta = { id:number; motorId:number; tipo:"temperatura"|"vibracao"; valor:number; limite:number; ts:string; severidade:"baixa"|"media"|"alta"; status:"aberto"|"fechado" };
export type Leitura = { sensorId:number; ts:string; valor:number };

async function j<T>(path:string, init?:RequestInit):Promise<T>{
  const res = await fetch(BASE+path, { headers:{ "Content-Type":"application/json" }, ...init });
  if(!res.ok) throw new Error((await res.json().catch(()=>({}))).error || res.statusText);
  return res.json();
}

export const api = {
  motores: () => j<Motor[]>("/motores"),
  alertas: (status?:string) => j<Alerta[]>(`/alertas${status?`?status=${status}`:""}`),
  leituras: (motorId:number,tipo:"temperatura"|"vibracao",de?:string,ate?:string,limit=200)=>{
    const params = new URLSearchParams({ motorId:String(motorId), tipo, limit:String(limit) });
    if(de) params.set("de",de); if(ate) params.set("ate",ate);
    return j<Leitura[]>(`/leituras?${params.toString()}`);
  }
};

// MOCK opcional enquanto o back não está pronto:
export const mock = {
  async motores():Promise<Motor[]>{ return [
    {id:1,nome:"Motor Linha 1",localizacao:"Setor A",status:"ok"},
    {id:2,nome:"Motor Linha 2",localizacao:"Setor B",status:"alerta"},
    {id:3,nome:"Exaustor",localizacao:"Galpão",status:"falha"},
  ];},
  async alertas():Promise<Alerta[]>{ return [
    {id:101,motorId:2,tipo:"temperatura",valor:92.4,limite:85,ts:new Date().toISOString(),severidade:"alta",status:"aberto"},
    {id:102,motorId:1,tipo:"vibracao",valor:6.2,limite:5,ts:new Date().toISOString(),severidade:"media",status:"aberto"},
  ];},
  async leituras(_:number,tipo:"temperatura"|"vibracao"){ 
    const now=Date.now(); const arr:Leitura[]=[];
    for(let i=29;i>=0;i--){ arr.push({ sensorId:999, ts:new Date(now-i*60000).toISOString(), valor: tipo==="temperatura"? 65+Math.random()*10 : 3+Math.random()*2}); }
    return arr;
  }
};
