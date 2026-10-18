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

- 📡 **Sensor ultrassônico HC-SR04** na faixa de pedestres: identifica cada carro que passa;
- 🔘 **Botão de pedestre** para pedir a travessia (encurta o tempo de espera).

## ⚙️ Atuadores e saídas

Os principais atuadores são:

- 🔴 LED vermelho;
- 🟡 LED amarelo;
- 🟢 LED verde;
- 🔊 Buzzer: apita a cada carro registrado (3 vezes quando o carro passou no vermelho).

Os LEDs representam o semáforo, com tempo fixo para cada cor (verde 12 s, amarelo 3 s, vermelho 8 s ou 10 s com pedestre).

## 📊 Dashboard

O sistema contará com um dashboard para acompanhar informações relacionadas ao trânsito e ao funcionamento dos semáforos, como:

- 🚦 Estado atual do semáforo e o tempo de cada LED;
- 🚗 Carros que passaram pelo sensor e em qual sinal;
- 🚨 Infrações: carros que passaram no vermelho (simulação de multa);
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

- **SQLite** - banco de dados das passagens: cada carro (placa) e o sinal em que passou;
- **React + Vite** - dashboard gamificado em pixel art.

## 🧭 Arquitetura

Dois sistemas independentes, ligados pelo Node-RED:

```
1. SEMÁFORO (Wokwi → dashboard)
   ESP32 (LEDs, botão) ──MQTT :1883──► Node-RED ──WebSocket──► dashboard (luzes, tempo, alertas)

2. CARROS (dashboard → banco, caminho inverso)
   carros do dashboard ──"passagem"──► Node-RED ──► SQLite (placa + sinal oficial do ESP32)
                                          ├──► dashboard: apito e "MULTA!" se foi no vermelho
                                          └──► ESP32: buzzer e registro no Monitor Serial
```

Os carros andam no dashboard e obedecem à cor que o ESP32 publica; de tempos em tempos um deles fura
o vermelho. Cada carro que cruza o sensor vira uma linha no banco com a placa (1, 2 ou 3) e o sinal
naquele instante. O pedestre da calçada é só ambientação; a única interação é clicar no botão de
pedestre do poste, que vai ao ESP32 como o botão físico.

## 📁 Estrutura

```
semaforo-inteligente/
├── semaforo.code-workspace   ← abra este arquivo no VS Code (pastas + tarefas prontas)
├── wokwi/                    ← ESP32: diagram.json, firmware PlatformIO, wokwi.toml
├── node-red/                 ← broker MQTT, fluxos (flows.json), API e ESP32 de teste
├── database/                 ← schema.sql do SQLite: tabela passagens (o .db é gerado pelo Node-RED)
└── frontend/                 ← dashboard React
docs/                         ← roteiro da atividade e artes originais (docs/arte)
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
6. Abra http://localhost:5173. Os carros começam a passar sozinhos; clique no botão do poste para o pedestre.
7. Para ver o banco: abra `semaforo-inteligente/database/semaforo.db` no **DB Browser for SQLite** (somente leitura).

Sem o Wokwi: rode a tarefa **ESP32 de teste** (tecla `p` aperta o botão, `c` simula o HC-SR04).
Sem back-end nenhum: http://localhost:5173/?fonte=simulacao simula ESP32 e Node-RED no navegador.

Detalhes de cada parte: [wokwi](semaforo-inteligente/wokwi/README.md) ·
[node-red](semaforo-inteligente/node-red/README.md) ·
[database](semaforo-inteligente/database/README.md) ·
[frontend](semaforo-inteligente/frontend/README.md).
