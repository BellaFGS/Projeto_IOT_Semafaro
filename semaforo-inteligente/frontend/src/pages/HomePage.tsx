/**
 * HOME PAGE
 * 
 * Página principal da aplicação.
 * 
 * Responsabilidade:
 * - Renderizar o jogo em tela cheia
 * - Integração com back-end será feita posteriormente (porta aberta)
 */

import { GameScene } from '../components/game/GameScene';

export function HomePage() {
  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', margin: 0, padding: 0, overflow: 'hidden' }}>
      <GameScene />
    </div>
  );
}
