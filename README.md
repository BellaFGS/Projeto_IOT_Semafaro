# 🚦 Semáforo Inteligente

Projeto desenvolvido como trabalho final da disciplina de **Programação Multiplataforma** da **Faculdade de Tecnologia de Sorocaba (FATEC Sorocaba)**.

## 📌 Sobre o projeto

O **Semáforo Inteligente** é uma solução de Internet das Coisas (IoT) voltada para **mobilidade urbana**, com o objetivo de monitorar o fluxo de veículos e ajustar o tempo dos semáforos de acordo com a movimentação do trânsito.

A proposta é utilizar os dados coletados pelos sensores para realizar um controle mais eficiente dos sinais, buscando reduzir congestionamentos, evitar paradas desnecessárias e otimizar o fluxo de veículos.

## 🎯 Objetivo

O projeto tem como objetivo:

- 🚗 Identificar o fluxo de veículos;
- 📊 Monitorar a movimentação do trânsito;
- 🚦 Ajustar o tempo dos semáforos de acordo com o fluxo identificado;
- ⏱️ Reduzir paradas e esperas desnecessárias;
- 🛣️ Otimizar o fluxo de trânsito;
- 📋 Melhorar a organização e a circulação dos veículos.

## 🔧 Sensores e entradas

O projeto utiliza sensores e entradas para identificar a movimentação dos veículos:

- 📡 **Sensor ultrassônico HC-SR04** para detectar e contar os veículos na faixa;
- 🔘 **Botão de pedestre** para pedir a travessia (encurta o tempo de espera).

## ⚙️ Atuadores e saídas

Os principais atuadores são:

- 🔴 LED vermelho;
- 🟡 LED amarelo;
- 🟢 LED verde.

Os LEDs representam o semáforo. O tempo de verde é ajustado automaticamente pelo Node-RED quando o fluxo de veículos fica intenso.

## 📊 Dashboard

O sistema contará com um dashboard para acompanhar informações relacionadas ao trânsito e ao funcionamento dos semáforos, como:

- 🚦 Estado atual dos semáforos;
- 🚗 Fluxo de veículos;
- ⏱️ Tempo dos sinais;
- 📈 Dados de movimentação;
- ⚠️ Situações que necessitem de atenção.

## 🏙️ Área de aplicação

**Mobilidade urbana**

A solução busca demonstrar como a IoT pode ser aplicada ao monitoramento e gerenciamento inteligente do trânsito.

## 🛠️ Tecnologias

As principais tecnologias previstas para o desenvolvimento são:

- **Node-RED** - criação do fluxo de dados e integração;
- **MQTT** - comunicação entre os dispositivos;
- **Wokwi** - simulação dos componentes IoT;
- **PlatformIO** - desenvolvimento e gerenciamento do firmware.

- **SQLite** - banco de dados com o histórico de carros, sinais, pedestres e alertas;
- **React + Vite** - dashboard gamificado em pixel art.

## 🧭 Arquitetura

```
 Wokwi (VS Code)                Node-RED (localhost:1880)                 Dashboard (localhost:5173)
┌──────────────────┐ MQTT :1883 ┌───────────────────────────────┐ WebSocket ┌───────────────────────┐
│ ESP32            │ ─────────► │ Aedes (broker MQTT)           │ ────────► │ semáforo, carros,     │
│  LEDs R/Y/G      │            │ Regras do semáforo            │           │ personagem, gráficos, │
│  botão pedestre  │ ◄───────── │  (contagem, modos, alertas)   │ HTTP /api │ histórico e alertas   │
│  HC-SR04         │ cmd/tempo  │ SQLite (database/semaforo.db) │ ────────► │                       │
└──────────────────┘            └───────────────────────────────┘           └───────────────────────┘
```

O Wokwi e o dashboard mostram a mesma coisa: no Wokwi estão a placa e os componentes; o dashboard
replica o estado em um cenário 2D. Quando o HC-SR04 detecta um carro (distância < 50 cm), um carro
entra no cenário e para na faixa; quando a distância volta a subir, ele segue viagem.

## 📁 Estrutura

```
semaforo-inteligente/
├── semaforo.code-workspace   ← abra este arquivo no VS Code (pastas + tarefas prontas)
├── wokwi/                    ← ESP32: diagram.json, firmware PlatformIO, wokwi.toml
├── node-red/                 ← broker MQTT, fluxo (flows.json), API e ESP32 de teste
├── database/                 ← schema.sql do SQLite (o .db é gerado pelo Node-RED)
└── frontend/                 ← dashboard React
docs/                         ← roteiro da atividade
```

## ▶️ Como rodar tudo

Pré-requisitos: Node.js 22.9+, VS Code com as extensões **Wokwi Simulator** e **PlatformIO IDE**.

1. Instale as dependências (uma vez), em `semaforo-inteligente/node-red` e em `semaforo-inteligente/frontend`:
   ```bash
   npm install
   ```
2. Abra `semaforo-inteligente/semaforo.code-workspace` no VS Code.
3. `Terminal → Run Task → Subir Node-RED + Frontend`.
4. `Terminal → Run Task → Firmware: compilar (PlatformIO)`.
5. Abra `wokwi/diagram.json` e rode **Wokwi: Start Simulator** (F1).
6. Abra http://localhost:5173. No Wokwi, mexa na distância do HC-SR04 e aperte o botão de pedestre.

Sem o Wokwi: rode a tarefa **ESP32 de teste** (tecla `c` passa um carro, `p` aperta o botão).
Sem back-end nenhum: http://localhost:5173/?fonte=simulacao usa o ESP32 fictício do navegador.

Detalhes de cada parte: [wokwi](semaforo-inteligente/wokwi/README.md) ·
[node-red](semaforo-inteligente/node-red/README.md) ·
[database](semaforo-inteligente/database/README.md) ·
[frontend](semaforo-inteligente/frontend/README.md).
