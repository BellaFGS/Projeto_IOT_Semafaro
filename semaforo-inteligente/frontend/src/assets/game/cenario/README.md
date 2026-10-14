# 🏙️ Sprites do Cenário (`cenario/`)

Esta pasta é o local oficial e organizado para armazenar todas as imagens `.png` que compõem o cenário do jogo 2D.

---

### 📂 Arquivos Atuais:
- **`rua.png`**: Textura do asfalto com faixa zebrada para travessia de pedestres.

---

### 📥 Como adicionar novos sprites ao cenário:

1. **Cole o arquivo `.png` nesta pasta**:
   ```
   frontend/src/assets/game/cenario/
   ```

2. **Sugestões de nomes para novos elementos**:
   - `fundo.png` ou `ceu.png` (céu / parallax)
   - `predios.png` ou `cidade.png` (silhueta urbana de fundo)
   - `calcada.png` (faixa do meio-fio)
   - `poste.png` (postes de iluminação pública)
   - `arvore.png` ou `vegetacao.png`
   - `carro.png` ou `onibus.png` (veículos na pista)

3. **Como usar no código (`GameScene.tsx`)**:
   Você pode importar diretamente:
   ```tsx
   import ruaImg from '../../assets/game/cenario/rua.png';
   import seuNovoSprite from '../../assets/game/cenario/seu_sprite.png';
   ```
   Ou através do arquivo indexador central (`index.ts`):
   ```tsx
   import { ruaImg } from '../../assets/game/cenario';
   ```

> **Dica Pixel Art**: Sempre adicione a classe `className="pixel-art"` na tag `<img>` para garantir que a imagem não fique embaçada ao ser redimensionada.
