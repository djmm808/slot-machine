// Detailed RTP Calculation Script for Slot Machine
// Splits Base Game and Bonus Game performance

interface GameSymbol {
  id: number;
  name: string;
  value: number;
  isMultiplier?: boolean;
  multiplier?: number;
  isScatter?: boolean;
}

const symbols: GameSymbol[] = [
  { id: 1, name: '☄️', value: 0.240 },
  { id: 2, name: '⭐', value: 0.341 },
  { id: 3, name: '🪐', value: 0.462 },
  { id: 4, name: '🌙', value: 0.583 },
  { id: 5, name: '🌞', value: 0.722 },
  { id: 6, name: '🌌', value: 0.864 },
];

const multiplierSymbols: GameSymbol[] = [
  { id: 100, name: '2️⃣', value: 0, isMultiplier: true, multiplier: 2 },
  { id: 101, name: '5️⃣', value: 0, isMultiplier: true, multiplier: 5 },
  { id: 102, name: '🔟', value: 0, isMultiplier: true, multiplier: 10 },
];

// Weighted multiplier selection (more 2x, fewer 10x)
function getRandomMultiplier(): GameSymbol {
  const rand = Math.random();
  if (rand < 0.60) return multiplierSymbols[0]; // 60% chance for 2x
  if (rand < 0.92) return multiplierSymbols[1]; // 32% chance for 5x
  return multiplierSymbols[2]; // 8% chance for 10x
}

const scatterSymbol: GameSymbol = {
  id: 200,
  name: '💫',
  value: 0,
  isScatter: true,
};

const NUM_REELS = 7;
const VISIBLE_SYMBOLS = 7;
const MULTIPLIER_CHANCE = 0.00015;
const MULTIPLIER_CHANCE_FREE_SPINS = 0.0085;
const SCATTER_CHANCE = 0.0115;
const BET_AMOUNT = 1000;
const MAX_CASCADES = 100;

function generateRandomSymbol(freeSpinsActive: boolean = false, reelHasScatter: boolean = false): GameSymbol {
  const rand = Math.random();
  const currentMultiplierChance = freeSpinsActive ? MULTIPLIER_CHANCE_FREE_SPINS : MULTIPLIER_CHANCE;
  if (rand < SCATTER_CHANCE && !reelHasScatter) return scatterSymbol;
  if (rand < SCATTER_CHANCE + currentMultiplierChance) {
    return getRandomMultiplier();
  }
  return symbols[Math.floor(Math.random() * symbols.length)];
}

function generateGrid(freeSpinsActive: boolean = false): GameSymbol[][] {
  const grid: GameSymbol[][] = [];
  for (let col = 0; col < NUM_REELS; col++) {
    grid[col] = [];
    let reelHasScatter = false;
    for (let row = 0; row < VISIBLE_SYMBOLS; row++) {
      const symbol = generateRandomSymbol(freeSpinsActive, reelHasScatter);
      grid[col][row] = symbol;
      if (symbol.isScatter) reelHasScatter = true;
    }
  }
  return grid;
}

function findClusters(grid: GameSymbol[][]): { symbol: GameSymbol; positions: [number, number][] }[] {
  const clusters: { symbol: GameSymbol; positions: [number, number][] }[] = [];
  const visited = new Set<string>();
  for (let col = 0; col < NUM_REELS; col++) {
    for (let row = 0; row < VISIBLE_SYMBOLS; row++) {
      const key = `${col},${row}`;
      if (visited.has(key)) continue;
      const symbol = grid[col][row];
      if (symbol.isMultiplier || symbol.isScatter) continue;
      const cluster: [number, number][] = [];
      const queue: [number, number][] = [[col, row]];
      while (queue.length > 0) {
        const [c, r] = queue.shift()!;
        const currentKey = `${c},${r}`;
        if (visited.has(currentKey)) continue;
        if (c < 0 || c >= NUM_REELS || r < 0 || r >= VISIBLE_SYMBOLS) continue;
        const currentSymbol = grid[c][r];
        if (currentSymbol.id !== symbol.id && !currentSymbol.isMultiplier) continue;
        visited.add(currentKey);
        cluster.push([c, r]);
        queue.push([c + 1, r], [c - 1, r], [c, r + 1], [c, r - 1]);
      }
      if (cluster.length >= 6) clusters.push({ symbol, positions: cluster });
    }
  }
  return clusters;
}

function calculateClusterWin(clusters: { symbol: GameSymbol; positions: [number, number][] }[], grid: GameSymbol[][]): number {
  let totalWin = 0;
  clusters.forEach(cluster => {
    const actualSymbolCount = cluster.positions.filter(([col, row]) => !grid[col][row].isMultiplier).length;
    const baseWin = cluster.symbol.value * actualSymbolCount * BET_AMOUNT;
    let totalMultiplier = 1;
    cluster.positions.forEach(([col, row]) => {
      const symbol = grid[col][row];
      if (symbol.isMultiplier && symbol.multiplier) totalMultiplier *= symbol.multiplier;
      [[col + 1, row], [col - 1, row], [col, row + 1], [col, row - 1]].forEach(([c, r]) => {
        if (c >= 0 && c < NUM_REELS && r >= 0 && r < VISIBLE_SYMBOLS) {
          const adj = grid[c][r];
          if (adj.isMultiplier && adj.multiplier && !cluster.positions.some(([pc, pr]) => pc === c && pr === r)) {
            totalMultiplier *= adj.multiplier;
          }
        }
      });
    });
    totalWin += baseWin * totalMultiplier;
  });
  return totalWin;
}

function cascadeGrid(grid: GameSymbol[][], clusterPositions: [number, number][], freeSpinsActive: boolean): GameSymbol[][] {
  const newGrid = grid.map(col => [...col]);
  clusterPositions.forEach(([col, row]) => {
    if (!(freeSpinsActive && grid[col][row].isMultiplier)) newGrid[col][row] = null as any;
  });
  for (let col = 0; col < NUM_REELS; col++) {
    let writeRow = VISIBLE_SYMBOLS - 1;
    for (let row = VISIBLE_SYMBOLS - 1; row >= 0; row--) {
      if (freeSpinsActive && grid[col][row].isMultiplier) continue;
      if (newGrid[col][row] !== null) {
        newGrid[col][writeRow] = newGrid[col][row];
        if (writeRow !== row) newGrid[col][row] = null as any;
        writeRow--;
      }
    }
    const reelHasScatter = newGrid[col].some(s => s && s.isScatter);
    for (let row = 0; row <= writeRow; row++) {
      if (freeSpinsActive && grid[col][row]?.isMultiplier) continue;
      newGrid[col][row] = generateRandomSymbol(freeSpinsActive, reelHasScatter);
    }
  }
  return newGrid;
}

function getFreeSpinsFromScatters(count: number): number {
  switch (count) {
    case 4: return 10;
    case 5: return 12;
    case 6: return 15;
    case 7: return 30;
    default: return 0;
  }
}

async function runSimulation(spins: number) {
  let totalBet = 0;
  let totalBaseWin = 0;
  let totalBonusWin = 0;
  let bonusTriggers = 0;
  let maxWin = 0;
  let maxBaseWin = 0;
  let maxBonusWin = 0;
  let fiveKHits = 0;

  for (let i = 0; i < spins; i++) {
    totalBet += BET_AMOUNT;
    let grid = generateGrid(false);
    let baseSWin = 0;
    let cascadeCount = 0;

    while (cascadeCount < MAX_CASCADES) {
      const clusters = findClusters(grid);
      if (clusters.length === 0) break;
      const win = calculateClusterWin(clusters, grid);
      baseSWin += win;
      grid = cascadeGrid(grid, clusters.flatMap(c => c.positions), false);
      cascadeCount++;
    }
    totalBaseWin += baseSWin;
    if (baseSWin > maxBaseWin) maxBaseWin = baseSWin;

    let scatterCount = 0;
    grid.forEach(col => col.forEach(s => { if (s.isScatter) scatterCount++; }));
    
    if (scatterCount >= 4) {
      bonusTriggers++;
      let fsCount = getFreeSpinsFromScatters(scatterCount);
      let bSWin = 0;
      let fsGrid = grid.map(col => [...col]);
      for (let c = 0; c < NUM_REELS; c++) {
        for (let r = 0; r < VISIBLE_SYMBOLS; r++) {
          if (fsGrid[c][r].isMultiplier) fsGrid[c][r] = symbols[Math.floor(Math.random() * symbols.length)];
        }
      }
      let added = false;
      while (!added) {
        const rC = Math.floor(Math.random() * NUM_REELS);
        const rR = Math.floor(Math.random() * VISIBLE_SYMBOLS);
        if (!fsGrid[rC][rR].isScatter) {
          fsGrid[rC][rR] = getRandomMultiplier();
          added = true;
        }
      }

      for (let fs = 0; fs < fsCount; fs++) {
        const newFsGrid = fsGrid.map((col, colIdx) => {
          const nextCol = [...col];
          const hasS = nextCol.some(s => s && s.isScatter);
          for (let r = 0; r < VISIBLE_SYMBOLS; r++) {
            if (!nextCol[r].isMultiplier) nextCol[r] = generateRandomSymbol(true, hasS);
          }
          return nextCol;
        });
        fsGrid = newFsGrid;
        let fsCas = 0;
        while (fsCas < MAX_CASCADES) {
          const cls = findClusters(fsGrid);
          if (cls.length === 0) break;
          const win = calculateClusterWin(cls, fsGrid);
          bSWin += win;
          fsGrid = cascadeGrid(fsGrid, cls.flatMap(c => c.positions), true);
          fsCas++;
        }
        let fsS = 0;
        fsGrid.forEach(col => col.forEach(s => { if (s.isScatter) fsS++; }));
        if (fsS >= 4) fsCount += getFreeSpinsFromScatters(fsS);
      }
      
      const finalBWin = Math.min(bSWin, BET_AMOUNT * 5000);
      totalBonusWin += finalBWin;
      if (finalBWin > maxBonusWin) maxBonusWin = finalBWin;
      if (finalBWin > maxWin) maxWin = finalBWin;
      if (finalBWin >= BET_AMOUNT * 5000) fiveKHits++;
    }
  }

  const finalTotalWin = totalBaseWin + totalBonusWin;
  console.log(`--- FINAL CALIBRATED RESULTS (${spins} spins) ---`);
  console.log(`Total Bet: ${totalBet}`);
  console.log(`Base Game Win: ${totalBaseWin} | Base RTP: ${((totalBaseWin / totalBet) * 100).toFixed(2)}%`);
  console.log(`Bonus Game Win: ${totalBonusWin} | Bonus RTP: ${((totalBonusWin / totalBet) * 100).toFixed(2)}%`);
  console.log(`Combined RTP: ${((finalTotalWin / totalBet) * 100).toFixed(2)}%`);
  console.log(`Bonus Triggers: ${bonusTriggers} (1 in ${Math.round(spins / bonusTriggers)})`);
  console.log(`Max Base Win: ${(maxBaseWin / BET_AMOUNT).toFixed(2)}x`);
  console.log(`Max Bonus Win: ${(maxBonusWin / BET_AMOUNT).toFixed(2)}x`);
  console.log(`Max Win: ${(maxWin / BET_AMOUNT).toFixed(2)}x`);
  console.log(`5,000x Hits: ${fiveKHits}`);
}

runSimulation(500000);
