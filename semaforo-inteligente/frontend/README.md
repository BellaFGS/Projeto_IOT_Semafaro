# 🚦 Front-End - Dashboard IoT Gamificado (Semáforo Inteligente)

Dashboard interativo desenvolvido para o projeto de IoT **Semáforo Inteligente** (FATEC Sorocaba). Apresenta as métricas de trânsito em uma interface visual 2D gamificada, onde um personagem em pixel art percorre a calçada enquanto o semáforo e a cancela operam com base nas leituras dos sensores.

---

## 🎯 Funcionalidades

- **Monitoramento em Tempo Real (Baseado no `README.md` do projeto):**
  - 🚦 **Estado do Semáforo:** Visualização luminosa com contagem regressiva (Vermelho, Amarelo e Verde).
  - 🚗 **Fluxo de Veículos:** Detecção de veículos na faixa e contador acumulado de tráfego.
  - 📡 **Sensor Ultrassônico (HC-SR04):** Leitura de distância em centímetros.
  - ⚙️ **Atuador Servo Motor (Cancela):** Indicação angular de cancela aberta (90°) ou fechada (0°).
  - 🔘 **Botão de Pedestre:** Solicitação de travessia com priorização do fechamento do sinal.
  - ⚠️ **Painel de Alertas:** Notificações operacionais do tráfego.
- **Interatividade & Mini Jogo 2D:**
  - Personagem em pixel art animado em 10 frames de caminhada.
  - Controles de movimento horizontal: teclas `←` `→` ou `A` / `D` (com espelhamento de direção estilo Godot).
  - Botões no painel superior para simular aproximação de veículo, clique no botão de pedestre e alternância de sinal (ideal para testes e apresentação prática da disciplina).

---

## 🛠️ Tecnologias Utilizadas

- **React 19**
- **TypeScript**
- **Vite**
- **CSS3 / Flexbox / Grid**

---

## 🚀 Como Executar

### Pré-requisitos

- Node.js (versão 18 ou superior)
- npm

### 1. Entrar na pasta do front-end e instalar as dependências
```bash
cd semaforo-inteligente/frontend
npm install
```

### 2. Iniciar em modo de desenvolvimento
```bash
npm run dev
```
Acesse no navegador: `http://localhost:5173`

### 3. Compilar para produção
```bash
npm run build
```

---

## 📁 Estrutura de Arquivos

```
frontend/
├── index.html                   ← Entrada principal HTML da aplicação
├── package.json                 ← Dependências e scripts do projeto
├── vite.config.ts               ← Configuração do Vite
├── src/
│   ├── assets/game/
│   │   ├── character/           ← Sprites de animação do personagem (player1 a player10)
│   │   └── cenario/             ← Sprites do cenário (rua.png, prédios, fundo, etc.)
│   ├── components/
│   │   ├── dashboard/
│   │   │   └── IoTMetricsHUD.tsx ← Painel de métricas do semáforo e alertas IoT
│   │   └── game/
│   │       ├── GameScene.tsx     ← Cenário 2D (asfalto, faixa zebrada, personagem)
│   │       ├── TrafficLight.tsx  ← Componente do semáforo com iluminação e cronômetro
│   │       └── ServoBarrier.tsx  ← Cancela motorizada (servo motor)
│   ├── hooks/
│   │   └── useCharacterControl.ts ← Hook de movimentação e animação de frames
│   ├── types/
│   │   └── traffic.ts            ← Contrato de dados IoT do semáforo
│   ├── pages/
│   │   └── HomePage.tsx          ← Página principal em tela cheia
│   ├── App.tsx                   ← Componente raiz
│   └── main.tsx                  ← Ponto de entrada React
└── README.md
```

---

## 🔌 Integração com o Ecossistema IoT (ESP32 / MQTT / Node-RED)

Os dados exibidos pelo dashboard seguem o modelo definido em `src/types/traffic.ts`.
Para conectar com os dados reais gerados pelo ESP32/Wokwi via Node-RED:
1. No Node-RED, disponibilize uma saída via WebSocket (ex: `ws://localhost:1880/traffic`) ou endpoint HTTP.
2. Atualize o estado no componente `GameScene.tsx` a partir do fluxo de mensagens recebido do broker MQTT.
