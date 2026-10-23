# 🏙️ Fundos (`backgrounds/`)

- **`rua-melhorada.webp`**: fundo atual do cenário (pixel art, 3072×2048). Original em `frontend/arte/rua-melhorada-original.png`.
- **`rua.png`**: rua do cenário antigo. Não é mais usada; fica guardada para referência.

Para usar um fundo novo:

1. Coloque a imagem nesta pasta (de preferência `.webp`, que fica bem menor que `.png`).
2. Troque o import em `components/game/GameScene.tsx`.
3. Meça na imagem nova as posições do semáforo, do botão de pedestre, da calçada e da rua e
   atualize `components/game/sceneLayout.ts`.
