#!/usr/bin/env node
/**
 * ESP32 de mentira: publica no broker local exatamente o que o firmware do Wokwi
 * publica (mesmos tópicos e JSON) e responde aos mesmos comandos. Serve para testar
 * Node-RED + banco + dashboard sem abrir o Wokwi. Não rode junto com o Wokwi.
 *
 *   npm run esp32-fake   → teclas: [p] botão de pedestre, [c] carro no HC-SR04, [q] sair
 *
 * Variáveis: MQTT_URL (padrão mqtt://localhost:1883)
 */
import mqtt from 'mqtt';

const BASE = 'fatec/semaforo/01';
const T = {
  state: `${BASE}/estado`,
  status: `${BASE}/status`,
  button: `${BASE}/sensor/botao`,
  vehicle: `${BASE}/sensor/veiculo`,
  buttonCmd: `${BASE}/cmd/botao_virtual`,
  passageCmd: `${BASE}/cmd/passagem`,
};
// Mesmos tempos do wokwi/include/config.h
const TEMPOS = { verde: 12, amarelo: 3, vermelho: 8, vermelhoPedestre: 10 };
const url = process.env.MQTT_URL ?? 'mqtt://localhost:1883';

let light = 'GREEN';
let durationS = TEMPOS.verde;
let remainingS = TEMPOS.verde;
let pedestrianRequest = false;
const startedAt = Date.now();

const client = mqtt.connect(url, {
  clientId: 'esp32-fake',
  will: { topic: T.status, payload: '{"online":false}', retain: true, qos: 0 },
});
const pub = (topic, obj, retain = false) => client.publish(topic, JSON.stringify(obj), { retain });
const log = (...a) => console.log(new Date().toLocaleTimeString('pt-BR'), ...a);
const pt = { GREEN: 'VERDE', YELLOW: 'AMARELO', RED: 'VERMELHO' };

const publishState = () => pub(T.state, { light, remainingS, durationS, pedestrianRequest, tempos: TEMPOS });

function nextLight() {
  if (light === 'GREEN') { light = 'YELLOW'; durationS = TEMPOS.amarelo; }
  else if (light === 'YELLOW') { light = 'RED'; durationS = pedestrianRequest ? TEMPOS.vermelhoPedestre : TEMPOS.vermelho; pedestrianRequest = false; }
  else { light = 'GREEN'; durationS = TEMPOS.verde; }
  remainingS = durationS;
  log(`[SINAL] ${light} por ${durationS}s`);
}

function requestPedestrian(origem) {
  if (pedestrianRequest || light === 'RED') return log(`[BOTAO] ${origem}: ignorado (já pedido ou vermelho)`);
  pedestrianRequest = true;
  if (light === 'GREEN' && remainingS > 3) remainingS = 3;
  pub(T.button, { pressed: true });
  publishState();
  log(`[BOTAO] ${origem}: pedestre pediu travessia`);
}

client.on('connect', () => {
  log(`[MQTT] conectado em ${url}`);
  client.subscribe([T.buttonCmd, T.passageCmd]);
  pub(T.status, { online: true, wifiRssi: -58, uptimeS: 0 }, true);
  publishState();
});
client.on('error', err => log('[MQTT] erro:', err.message));
client.on('message', (topic, buf) => {
  const p = JSON.parse(buf.toString());
  if (topic === T.buttonCmd) requestPedestrian('dashboard');
  else if (topic === T.passageCmd) {
    log(`[PASSAGEM] carro ${p.placa} passou no ${pt[p.sinal] ?? p.sinal}${p.infracao ? ' - INFRACAO (multa) BIP BIP BIP' : ' - BIP'}`);
  }
});

// Relógio do semáforo a cada 1 s
setInterval(() => {
  if (--remainingS <= 0) nextLight();
  publishState();
}, 1000);

// Status a cada 10 s
setInterval(() => {
  pub(T.status, { online: true, wifiRssi: -55 - Math.round(Math.random() * 15), uptimeS: Math.floor((Date.now() - startedAt) / 1000) }, true);
}, 10000);

if (process.stdin.isTTY) {
  log('Teclas: [p] botão de pedestre · [c] carro no HC-SR04 · [q] sair');
  process.stdin.setRawMode(true);
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', key => {
    if (key === 'p') requestPedestrian('botão físico');
    else if (key === 'c') { pub(T.vehicle, { distanceCm: 25 }); log('[SENSOR] carro detectado pelo HC-SR04'); }
    else if (key === 'q' || key === '\u0003') {
      pub(T.status, { online: false }, true);
      client.end(false, () => process.exit(0));
    }
  });
}
