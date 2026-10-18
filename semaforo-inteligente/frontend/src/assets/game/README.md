# 🎨 Assets do cenário

| Pasta | Conteúdo | Usado em |
|---|---|---|
| `backgrounds/` | `rua-melhorada.webp`: fundo pixel art (3072×2048). `rua.png`: rua antiga, sem uso | `components/game/GameScene.tsx` |
| `traffic-light/on/` | `red.png`, `yellow.png`, `green.png`: luz **acesa** | `components/game/BackgroundTrafficLight.tsx` |
| `traffic-light/off/` | `red.png`, `yellow.png`, `green.png`: luz **apagada** (96×96, fundo transparente) | `components/game/BackgroundTrafficLight.tsx` |
| `character/` | `player1.png` … `player10.png`: quadros da caminhada do personagem | `components/game/GameScene.tsx` |
| `vehicles/`, `objects/`, `effects/`, `scenes/` | Reservadas para novos sprites | — |

O carro é desenhado em código (SVG pixel art em `components/game/Car.tsx`), não usa imagem.

## Artes originais

Os arquivos em alta resolução gerados para o projeto ficam em `docs/arte/` na raiz do repositório.
Aqui entram só as versões otimizadas para o navegador:

| Original (`docs/arte/`) | Versão usada | Como foi gerada |
|---|---|---|
| `rua-melhorada-original.png` (8 MB) | `backgrounds/rua-melhorada.webp` (0,9 MB) | WebP qualidade 90, mesmo tamanho |
| `semaforo-*-off-original.png` (~420 KB) | `traffic-light/off/*.png` (~6 KB) | margem transparente cortada e reduzida para 96×96 |

## Trocar o fundo

As posições de tudo que fica por cima da imagem (lâmpadas, botão de pedestre, HC-SR04, calçada,
rua) estão em `components/game/sceneLayout.ts`, medidas em pixels da imagem de 3072×2048.
Se o fundo mudar, meça de novo e ajuste esses números.
