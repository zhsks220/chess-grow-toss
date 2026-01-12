# 디버그 패널 백업 코드

나중에 다시 사용할 때 복사해서 붙여넣으세요.

## 1. App.tsx에 추가할 State (다른 useState 근처에)

```tsx
const [showDebug, setShowDebug] = useState(false); // 디버그 패널
```

## 2. App.tsx에 추가할 JSX (return 안, 적절한 위치에)

```tsx
{/* 디버그 패널 */}
{showDebug && (
  <div className="debug-panel">
    <div className="debug-header">
      <span>🛠️ 디버그 패널</span>
      <button onClick={() => setShowDebug(false)}>✕</button>
    </div>
    <div className="debug-content">
      <div className="debug-section">
        <h4>💰 자원</h4>
        <button onClick={() => useGameStore.setState(s => ({ gold: s.gold + 10000 }))}>+10K 골드</button>
        <button onClick={() => useGameStore.setState(s => ({ gold: s.gold + 1000000 }))}>+1M 골드</button>
        <button onClick={() => useGameStore.setState(s => ({ gold: s.gold + 100000000 }))}>+100M 골드</button>
        <button onClick={() => useGameStore.setState(s => ({ ruby: s.ruby + 100 }))}>+100 루비</button>
      </div>
      <div className="debug-section">
        <h4>♟️ 체스말 (스탯 반영)</h4>
        {(['pawn', 'knight', 'bishop', 'rook', 'queen', 'king', 'imperial'] as ChessPieceRank[]).map(rank => (
          <button key={rank} onClick={() => {
            const state = useGameStore.getState();
            const newPiece = { ...CHESS_PIECES[rank], level: 0 };
            const stats = calculateStats(state.upgrades, newPiece, state.prestigeBonus);
            useGameStore.setState({ currentPiece: newPiece, ...stats });
          }}>{CHESS_PIECES[rank].emoji} {rank}</button>
        ))}
      </div>
      <div className="debug-section">
        <h4>🔧 도구 (이펙트 즉시 적용)</h4>
        <button onClick={() => {
          const state = useGameStore.getState();
          const newClickers = state.autoClickers.map(ac => ({ ...ac, count: ac.count + 10 }));
          const newAutoClicksPerSec = newClickers.reduce((sum, c) => sum + c.clicksPerSec * c.count, 0);
          useGameStore.setState({ autoClickers: newClickers, autoClicksPerSec: newAutoClicksPerSec });
        }}>전체 +10</button>
        {useGameStore.getState().autoClickers.map(ac => (
          <button key={ac.id} onClick={() => {
            const state = useGameStore.getState();
            const newClickers = state.autoClickers.map(c =>
              c.id === ac.id ? { ...c, count: c.count + 10 } : c
            );
            const newAutoClicksPerSec = newClickers.reduce((sum, c) => sum + c.clicksPerSec * c.count, 0);
            useGameStore.setState({ autoClickers: newClickers, autoClicksPerSec: newAutoClicksPerSec });
          }}>{ac.emoji} +10</button>
        ))}
      </div>
      <div className="debug-section">
        <h4>⚔️ 스탯</h4>
        <button onClick={() => useGameStore.setState(s => ({ attackPower: s.attackPower + 100 }))}>공격력 +100</button>
        <button onClick={() => useGameStore.setState(s => ({ attackPower: s.attackPower + 10000 }))}>공격력 +10K</button>
        <button onClick={() => useGameStore.setState(s => ({ critChance: Math.min(100, s.critChance + 10) }))}>크리티컬 +10%</button>
      </div>
      <div className="debug-section">
        <h4>🎯 게임 상태</h4>
        <button onClick={() => useGameStore.setState({ stonesUntilBoss: 1 })}>보스 소환</button>
        <button onClick={() => useGameStore.setState(s => ({ stonesDestroyed: s.stonesDestroyed + 100 }))}>파괴 +100</button>
        <button onClick={() => useGameStore.setState({ currentStone: { ...useGameStore.getState().currentStone, currentHp: 1 } })}>돌 HP=1</button>
      </div>
      <div className="debug-section">
        <h4>⬆️ 강화 레벨 (스탯 반영)</h4>
        <button onClick={() => {
          const state = useGameStore.getState();
          const newPiece = { ...state.currentPiece, level: Math.min(16, state.currentPiece.level + 1) };
          const stats = calculateStats(state.upgrades, newPiece, state.prestigeBonus);
          useGameStore.setState({ currentPiece: newPiece, ...stats });
        }}>레벨 +1</button>
        <button onClick={() => {
          const state = useGameStore.getState();
          const newPiece = { ...state.currentPiece, level: 16 };
          const stats = calculateStats(state.upgrades, newPiece, state.prestigeBonus);
          useGameStore.setState({ currentPiece: newPiece, ...stats });
        }}>레벨 MAX</button>
      </div>
    </div>
  </div>
)}

{/* 디버그 토글 버튼 (화면 왼쪽 하단) */}
<button
  className="debug-toggle-btn"
  onClick={() => setShowDebug(prev => !prev)}
>
  🛠️
</button>
```

## 3. App.css에 추가할 스타일

```css
/* ============ 디버그 패널 ============ */
.debug-toggle-btn {
  position: fixed;
  left: 10px;
  bottom: 80px;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.7);
  border: 2px solid #ffd700;
  font-size: 1.2rem;
  z-index: 9999;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.5;
  transition: opacity 0.2s;
}

.debug-toggle-btn:hover {
  opacity: 1;
}

.debug-panel {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 90%;
  max-width: 360px;
  max-height: 80vh;
  background: rgba(20, 20, 30, 0.98);
  border: 2px solid #ffd700;
  border-radius: 12px;
  z-index: 10000;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.debug-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 15px;
  background: linear-gradient(135deg, #4a3f00, #2a2500);
  border-bottom: 1px solid #ffd700;
}

.debug-header span {
  font-weight: bold;
  color: #ffd700;
  font-size: 1rem;
}

.debug-header button {
  background: rgba(255, 100, 100, 0.3);
  border: 1px solid #ff6666;
  color: #ff6666;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  cursor: pointer;
  font-size: 1rem;
}

.debug-content {
  padding: 10px;
  overflow-y: auto;
  flex: 1;
}

.debug-section {
  margin-bottom: 12px;
  padding: 8px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
}

.debug-section h4 {
  margin: 0 0 8px 0;
  color: #ffd700;
  font-size: 0.85rem;
  border-bottom: 1px solid rgba(255, 215, 0, 0.3);
  padding-bottom: 4px;
}

.debug-section button {
  padding: 6px 10px;
  margin: 3px;
  font-size: 0.75rem;
  background: rgba(100, 100, 255, 0.2);
  border: 1px solid rgba(100, 100, 255, 0.5);
  color: #aaddff;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s;
}

.debug-section button:hover {
  background: rgba(100, 100, 255, 0.4);
  border-color: #aaddff;
}

.debug-section button:active {
  transform: scale(0.95);
  background: rgba(100, 100, 255, 0.6);
}
```
