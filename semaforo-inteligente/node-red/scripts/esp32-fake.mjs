#!/usr/bin/env node
/**
 * ESP32 de mentira: publica no broker local exatamente o que o firmware do Wokwi
 * publica (mesmos tópicos e JSON). Serve para testar Node-RED + banco + dashboard
 * sem abrir o Wokwi.
 *
 *   npm run esp32-fake            → teclas: [c] passa um carro, [p] botão de pedestre, [q] sai
 *   npm run esp32-fake -- --auto  → carros e pedestres aleatórios
 *
 * Variáveis: MQTT_URL (padrão mqtt://localhost:1883)
 */
import mqtt from 'mqtt';

const BASE = 'fatec/semaforo/01';
const T = {
  ultrasonic: `${BASE}/sensor/ultrassonico`,
  button: `${BASE}/sensor/botao`,
  state: `${BASE}/estado`,
  status: `${BASE}/status`,
  greenCmd: `${BASE}/cmd/tempo_verde`,
};
const AUTO = process.argv.includes('--auto');
const url = process.env.MQTT_URL ?? 'mqtt://localhost:1883';

let light = 'GREEN';
let greenDurationS = 12;
let durationS = 12;
let remainingS = 12;
let pedestrianRequest = false;
let carUntil = 0;            // até quando há um carro parado na faixa
const startedAt = Date.now();

const client = mqtt.connect(url, {
  clientId: 'esp32-fake',
  will: { topic: T.status, payload: '{"online":false}', retain: true, qos: 0 },
});
const pub = (topic, obj, retain = false) => client.publish(topic, JSON.stringify(obj), { retain });
const log = (...a) => console.log(new Date().toLocaleTimeString('pt-BR'), ...a);

function nextLight() {
  if (light === 'GREEN') { light = 'YELLOW'; durationS = 3; }
  else if (light === 'YELLOW') { light = 'RED'; durationS = pedestrianRequest ? 10 : 8; pedestrianRequest = false; }
  else { light = 'GREEN'; durationS = greenDurationS; }
  remainingS = durationS;
  log(`[SINAL] ${light} por ${durationS}s`);
}

function pressButton() {
  if (pedestrianRequest || light === 'RED') return log('[BOTAO] ignorado (já pedido ou vermelho)');
  pedestrianRequest = true;
  if (light === 'GREEN' && remainingS > 3) remainingS = 3;
  pub(T.button, { pressed: true });
  pub(T.state, { light, remainingS, durationS, pedestrianRequest });
  log('[BOTAO] pedestre pediu travessia');
}

function passCar(seconds = 3) {
  carUntil = Date.now() + seconds * 1000;
  log(`[SENSOR] carro na faixa por ${seconds}s`);
}

client.on('connect', () => {
  log(`[MQTT] conectado em ${url}`);
  client.subscribe(T.greenCmd);
  pub(T.status, { online: true, wifiRssi: -58, uptimeS: 0 }, true);
});
client.on('error', err => log('[MQTT] erro:', err.message));
client.on('message', (topic, buf) => {
  if (topic !== T.greenCmd) return;
  const s = JSON.parse(buf.toString()).durationS;
  if (s >= 5 && s <= 60) { greenDurationS = s; log(`[CMD] tempo de verde = ${s}s`); }
});

// HC-SR04 a cada 500 ms
setInterval(() => {
  const near = Date.now() < carUntil;
  const cm = near ? 24 + Math.random() * 4 : 315 + Math.random() * 10;
  pub(T.ultrasonic, { distanceCm: Math.round(cm * 10) / 10 });
}, 500);

// Relógio do semáforo a cada 1 s
setInterval(() => {
  if (--remainingS <= 0) nextLight();
  pub(T.state, { light, remainingS, durationS, pedestrianRequest });
}, 1000);

// Status a cada 10 s
setInterval(() => {
  pub(T.status, { online: true, wifiRssi: -55 - Math.round(Math.random() * 15), uptimeS: Math.floor((Date.now() - startedAt) / 1000) }, true);
}, 10000);

if (AUTO) {
  log('Modo automático: carros e pedestres aleatórios.');
  setInterval(() => {
    if (Date.now() > carUntil + 1500 && Math.random() < 0.35) passCar(2 + Math.round(Math.random() * 3));
    if (light === 'GREEN' && Math.random() < 0.05) pressButton();
  }, 2000);
} else if (process.stdin.isTTY) {
  log('Teclas: [c] passa um carro · [p] botão de pedestre · [q] sair');
  process.stdin.setRawMode(true);
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', key => {
    if (key === 'c') passCar();
    else if (key === 'p') pressButton();
    else if (key === 'q' || key === '\u0003') {
      pub(T.status, { online: false }, true);
      client.end(false, () => process.exit(0));
    }
  });
}
