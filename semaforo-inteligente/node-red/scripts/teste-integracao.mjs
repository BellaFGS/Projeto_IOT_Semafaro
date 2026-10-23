#!/usr/bin/env node
/**
 * Teste de integração do Node-RED: faz o papel do ESP32 (MQTT) e do dashboard
 * (WebSocket) e confere as regras do fluxo, o banco e a API HTTP.
 *
 *   1. Suba o Node-RED com um banco vazio:  SEMAFORO_DB=/tmp/teste.db npm start
 *   2. Em outro terminal:                    npm run test:integracao
 *
 * Variáveis: NODE_RED_URL (padrão http://localhost:1880), MQTT_URL (padrão mqtt://localhost:1883)
 * Não rode com o Wokwi ou o esp32-fake ligados: eles publicam nos mesmos tópicos.
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import mqtt from 'mqtt';

const HTTP = process.env.NODE_RED_URL ?? 'http://localhost:1880';
const WS = HTTP.replace(/^http/, 'ws') + '/ws/semaforo';
const MQTT_URL = process.env.MQTT_URL ?? 'mqtt://localhost:1883';
const BASE = 'fatec/semaforo/01';
const TEMPOS = { verde: 12, amarelo: 3, vermelho: 8, vermelhoPedestre: 10 };

const sleep = ms => new Promise(r => setTimeout(r, ms));
const api = async rota => {
  const res = await fetch(HTTP + rota);
  assert.equal(res.status, 200, `GET ${rota} respondeu ${res.status}`);
  return res.json();
};

// Espera até a condição ficar verdadeira (ou falha com a mensagem)
async function esperar(cond, msg, timeoutMs = 5000) {
  const fim = Date.now() + timeoutMs;
  while (Date.now() < fim) {
    const v = await cond();
    if (v) return v;
    await sleep(100);
  }
  assert.fail(msg);
}

let esp32;
let ws;
const doDashboard = []; // mensagens recebidas pelo WebSocket
const doEsp32 = [];     // comandos recebidos pelo "ESP32"

const publicar = (sub, obj, retain = false) =>
  new Promise(r => esp32.publish(`${BASE}/${sub}`, JSON.stringify(obj), { retain }, r));
const estado = light => publicar('estado', { light, remainingS: 5, durationS: 8, pedestrianRequest: false, tempos: TEMPOS });
const dashboard = cmd => ws.send(JSON.stringify(cmd));
const ultimaTelemetria = () => doDashboard.findLast(m => m.type === 'telemetry');
const passagensNoDashboard = () => doDashboard.filter(m => m.type === 'passagem');

before(async () => {
  await esperar(async () => {
    try { return (await fetch(HTTP + '/api/estatisticas')).ok; } catch { return false; }
  }, `Node-RED não respondeu em ${HTTP}`, 60000);

  esp32 = mqtt.connect(MQTT_URL, { clientId: 'esp32-teste-ci', reconnectPeriod: 0 });
  await new Promise((ok, erro) => { esp32.once('connect', ok); esp32.once('error', erro); });
  await new Promise(r => esp32.subscribe(`${BASE}/cmd/#`, r));
  esp32.on('message', (topic, buf) => doEsp32.push({ topic, payload: JSON.parse(buf.toString()) }));

  ws = new WebSocket(WS);
  await new Promise((ok, erro) => { ws.onopen = ok; ws.onerror = () => erro(new Error(`WebSocket ${WS} não abriu`)); });
  ws.onmessage = ev => doDashboard.push(JSON.parse(ev.data));
});

after(() => {
  ws?.close();
  esp32?.end(true);
});

test('banco começa vazio', async () => {
  const s = await api('/api/estatisticas');
  assert.equal(s.total, 0, 'use um SEMAFORO_DB novo para o teste');
});

test('passagem é recusada enquanto o ESP32 não publicou estado', async () => {
  dashboard({ type: 'passagem', placa: '1', sinal: 'GREEN' });
  await sleep(800);
  assert.equal((await api('/api/estatisticas')).total, 0);
});

test('estado do ESP32 chega ao dashboard como telemetria', async () => {
  await publicar('status', { online: true, wifiRssi: -60, uptimeS: 1 }, true);
  await estado('RED');
  const t = await esperar(() => ultimaTelemetria()?.light?.state === 'RED' && ultimaTelemetria(), 'telemetria com sinal RED não chegou');
  assert.equal(t.device.online, true);
  assert.deepEqual(t.times, TEMPOS);
});

test('passagem grava o sinal oficial do ESP32 e marca infração no vermelho', async () => {
  // O dashboard diz GREEN, mas o ESP32 está em RED: vale o ESP32
  dashboard({ type: 'passagem', placa: '1', sinal: 'GREEN' });
  const ev = await esperar(() => passagensNoDashboard().at(-1), 'dashboard não recebeu a passagem');
  assert.equal(ev.passage.plate, '1');
  assert.equal(ev.passage.light, 'RED');
  assert.equal(ev.passage.violation, true);

  const cmd = await esperar(() => doEsp32.find(m => m.topic.endsWith('/cmd/passagem')), 'ESP32 não recebeu cmd/passagem');
  assert.deepEqual(cmd.payload, { placa: '1', sinal: 'RED', infracao: true });
});

test('mesma placa em menos de 3 s é recusada', async () => {
  dashboard({ type: 'passagem', placa: '1', sinal: 'RED' });
  await sleep(800);
  assert.equal((await api('/api/estatisticas')).total, 1);
});

test('placa desconhecida é recusada', async () => {
  dashboard({ type: 'passagem', placa: 'XYZ', sinal: 'GREEN' });
  await sleep(800);
  assert.equal((await api('/api/estatisticas')).total, 1);
});

test('passagem no verde não é infração', async () => {
  await estado('GREEN');
  await sleep(300);
  dashboard({ type: 'passagem', placa: '2', sinal: 'GREEN' });
  const ev = await esperar(() => passagensNoDashboard().find(m => m.passage.plate === '2'), 'passagem do carro 2 não chegou');
  assert.equal(ev.passage.light, 'GREEN');
  assert.equal(ev.passage.violation, false);
});

test('HC-SR04 do Wokwi registra passagem com placa WOKWI', async () => {
  await publicar('sensor/veiculo', { distanceCm: 32.5 });
  await esperar(() => passagensNoDashboard().find(m => m.passage.plate === 'WOKWI'), 'passagem WOKWI não chegou');
});

test('botão de pedestre do dashboard vira comando MQTT para o ESP32', async () => {
  dashboard({ type: 'botao_virtual' });
  const cmd = await esperar(() => doEsp32.find(m => m.topic.endsWith('/cmd/botao_virtual')), 'ESP32 não recebeu cmd/botao_virtual');
  assert.deepEqual(cmd.payload, { pressed: true });
});

test('API HTTP devolve passagens, infrações, estatísticas e resumo', async () => {
  const s = await api('/api/estatisticas');
  assert.equal(s.total, 3);
  assert.equal(s.infracoes, 1);

  const passagens = await api('/api/passagens?limite=10');
  assert.deepEqual(passagens.map(p => p.placa).sort(), ['1', '2', 'WOKWI']);

  const infracoes = await api('/api/infracoes');
  assert.equal(infracoes.length, 1);
  assert.equal(infracoes[0].placa, '1');

  const resumo = await api('/api/resumo-por-placa');
  assert.deepEqual(resumo.map(r => r.placa), ['1', '2', 'WOKWI']);
});

test('ESP32 offline aparece na telemetria', async () => {
  await publicar('status', { online: false }, true);
  await esperar(() => ultimaTelemetria()?.device?.online === false, 'telemetria não indicou ESP32 offline');
});
