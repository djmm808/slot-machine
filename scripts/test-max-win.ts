// Max Win Achievement Test
// Simulates spins to verify if 10,000x max win is achievable in base game and bonus game

interface GameSymbol {
  id: number;
  name: string;
  value: number;
  isMultiplier?: boolean;
  multiplier?: number;
  isScatter?: boolean;
}

const symbols: GameSymbol[] = [
  { id: 1, name: '☄️', value: 0.11 },
  { id: 2, name: '⭐', value: 0.165 },
  { id: 3, name: '🪐', value: 0.22 },
  { id: 4, name: '🌙', value: 0.275 },
  { id: 5, name: '🌞', value: 0.33 },
  { id: 6, name: '🌌', value: 0.44 },
];

const multiplierSymbols: GameSymbol[] = [
  { id: 100, name: '2️⃣', value: 0, isMultiplier: true, multiplier: 2 },
  { id: 101, name: '5️⃣', value: 0, isMultiplier: true, multiplier: 5 },
  { id: 102, name: '🔟', value: 0, isMultiplier: true, multiplier: 10 },
];

const scatterSymbol: GameSymbol = {
  id: 200,
  name: '💫',
  value: 0,
  isScatter: true,
};

const allSymbols = [...symbols, ...multiplierSymbols, scatterSymbol];

const NUM_REELS = 7;
const VISIBLE_SYMBOLS = 7;
const MULTIPLIER_CHANCE = 0.001;
const MULTIPLIER_CHANCE_FREE_SPINS = 0.0011;
const SCATTER_CHANCE = 0.006;
const BET_AMOUNT = 1000;
const MAX_CASCADES = 100;
const MAX_WIN_TARGET = BET_AMOUNT * 10000; // 10,000x

function generateRandomSymbol(freeSpinsActive: boolean = false): GameSymbol {
  const rand = Math.random();
  const currentMultiplierChance = freeSpinsActive ? MULTIPLIER_CHANCE_FREE_SPINS : MULTIPLIER_CHANCE;
  
  if (rand < SCATTER_CHANCE) {
    return scatterSymbol;
  }
  if (rand < SCATTER_CHANCE + currentMultiplierChance) {
    return multiplierSymbols[Math.floor(Math.random() * multiplierSymbols.length)];
  }
  return symbols[Math.floor(Math.random() * symbols.length)];
}

function generateGrid(freeSpinsActive: boolean = false): GameSymbol[][] {
  const grid: GameSymbol[][] = [];
  for (let col = 0; col < NUM_REELS; col++) {
    grid[col] = [];
    for (let row = 0; row < VISIBLE_SYMBOLS; row++) {
      grid[col][row] = generateRandomSymbol(freeSpinsActive);
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

      if (cluster.length >= 5) {
        clusters.push({ symbol, positions: cluster });
      }
    }
  }

  return clusters;
}

function calculateClusterWin(clusters: { symbol: GameSymbol; positions: [number, number][] }[], grid: GameSymbol[][]): number {
  let totalWin = 0;

  clusters.forEach(cluster => {
    const actualSymbolCount = cluster.positions.filter(([col, row]) => {
      const symbol = grid[col][row];
      return !symbol.isMultiplier;
    }).length;

    const baseWin = cluster.symbol.value * actualSymbolCount * BET_AMOUNT;

    let totalMultiplier = 1;
    cluster.positions.forEach(([col, row]) => {
      const symbol = grid[col][row];
      if (symbol.isMultiplier && symbol.multiplier) {
        totalMultiplier *= symbol.multiplier;
      }

      const adjacentPositions = [
        [col + 1, row], [col - 1, row], [col, row + 1], [col, row - 1]
      ];

      adjacentPositions.forEach(([c, r]) => {
        if (c >= 0 && c < NUM_REELS && r >= 0 && r < VISIBLE_SYMBOLS) {
          const adjSymbol = grid[c][r];
          if (adjSymbol.isMultiplier && adjSymbol.multiplier && !cluster.positions.some(([pc, pr]) => pc === c && pr === r)) {
            totalMultiplier *= adjSymbol.multiplier;
          }
        }
      });
    });

    totalWin += baseWin * totalMultiplier;
  });

  const maxWin = BET_AMOUNT * 10000;
  return Math.min(totalWin, maxWin);
}

function cascadeGrid(grid: GameSymbol[][], clusterPositions: [number, number][], freeSpinsActive: boolean = false): GameSymbol[][] {
  const newGrid = grid.map(col => [...col]);
  
  clusterPositions.forEach(([col, row]) => {
    const symbol = grid[col][row];
    if (freeSpinsActive && symbol.isMultiplier) {
      return;
    }
    newGrid[col][row] = null as any;
  });

  for (let col = 0; col < NUM_REELS; col++) {
    let writeRow = VISIBLE_SYMBOLS - 1;
    for (let row = VISIBLE_SYMBOLS - 1; row >= 0; row--) {
      if (newGrid[col][row] !== null) {
        newGrid[col][writeRow] = newGrid[col][row];
        if (writeRow !== row) {
          newGrid[col][row] = null as any;
        }
        writeRow--;
      }
    }
    
    for (let row = 0; row <= writeRow; row++) {
      newGrid[col][row] = generateRandomSymbol(freeSpinsActive);
    }
  }

  return newGrid;
}

function countScatters(grid: GameSymbol[][]): number {
  let count = 0;
  for (let col = 0; col < NUM_REELS; col++) {
    for (let row = 0; row < VISIBLE_SYMBOLS; row++) {
      if (grid[col][row].isScatter) {
        count++;
      }
    }
  }
  return count;
}

function getFreeSpinsFromScatters(scatterCount: number): number {
  switch (scatterCount) {
    case 4: return 10;
    case 5: return 12;
    case 6: return 15;
    case 7: return 30;
    default: return 0;
  }
}

function simulateBaseSpin(): { win: number; scatterCount: number; hitMaxWin: boolean } {
  let grid = generateGrid(false);
  let totalWin = 0;
  let cascadeCount = 0;

  const processCascades = () => {
    if (cascadeCount >= MAX_CASCADES) {
      return;
    }

    const clusters = findClusters(grid);

    if (clusters.length > 0) {
      const win = calculateClusterWin(clusters, grid);
      totalWin += win;

      const allPositions = clusters.flatMap(c => c.positions);
      grid = cascadeGrid(grid, allPositions, false);
      cascadeCount++;

      processCascades();
    }
  };

  processCascades();

  const scatterCount = countScatters(grid);
  const hitMaxWin = totalWin >= MAX_WIN_TARGET;

  return { win: totalWin, scatterCount, hitMaxWin };
}

function simulateFreeSpinBonus(initialScatterCount: number): { totalWin: number; hitMaxWin: boolean; maxSingleSpinWin: number } {
  const initialFreeSpins = getFreeSpinsFromScatters(initialScatterCount);
  let remainingFreeSpins = initialFreeSpins;
  let totalWin = 0;
  let spinCount = 0;
  let maxSingleSpinWin = 0;

  while (remainingFreeSpins > 0 && spinCount < 1000) {
    let grid = generateGrid(true);
    let cascadeCount = 0;
    let spinWin = 0;

    const processCascades = () => {
      if (cascadeCount >= MAX_CASCADES) {
        return;
      }

      const clusters = findClusters(grid);

      if (clusters.length > 0) {
        const win = calculateClusterWin(clusters, grid);
        spinWin += win;

        const allPositions = clusters.flatMap(c => c.positions);
        grid = cascadeGrid(grid, allPositions, true);
        cascadeCount++;

        processCascades();
      }
    };

    processCascades();

    totalWin += spinWin;
    if (spinWin > maxSingleSpinWin) maxSingleSpinWin = spinWin;

    const scatterCount = countScatters(grid);
    if (scatterCount >= 3) {
      remainingFreeSpins += 5;
    }

    remainingFreeSpins--;
    spinCount++;
  }

  return { totalWin, hitMaxWin: totalWin >= MAX_WIN_TARGET, maxSingleSpinWin };
}

function runMaxWinTest(numSpins: number): void {
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║              MAX WIN ACHIEVEMENT TEST (10,000x)                  ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝');
  console.log(`Testing ${numSpins.toLocaleString()} spins...`);
  console.log(`Max Win Target: ${MAX_WIN_TARGET.toLocaleString()} (${MAX_WIN_TARGET / BET_AMOUNT}x)`);
  console.log('');

  let baseGameMaxWin = 0;
  let baseGameHitsMaxWin = 0;
  let baseGameWinsAbove5000x = 0;
  let baseGameWinsAbove1000x = 0;

  let bonusGameMaxWin = 0;
  let bonusGameHitsMaxWin = 0;
  let bonusGameWinsAbove5000x = 0;
  let bonusGameWinsAbove1000x = 0;
  let totalBonusGamesPlayed = 0;

  const startTime = Date.now();

  for (let i = 0; i < numSpins; i++) {
    // Test base game
    const baseResult = simulateBaseSpin();
    if (baseResult.win > baseGameMaxWin) baseGameMaxWin = baseResult.win;
    if (baseResult.hitMaxWin) baseGameHitsMaxWin++;
    if (baseResult.win >= BET_AMOUNT * 5000) baseGameWinsAbove5000x++;
    if (baseResult.win >= BET_AMOUNT * 1000) baseGameWinsAbove1000x++;

    // Test bonus game if triggered
    if (baseResult.scatterCount >= 4) {
      const bonusResult = simulateFreeSpinBonus(baseResult.scatterCount);
      totalBonusGamesPlayed++;
      
      if (bonusResult.totalWin > bonusGameMaxWin) bonusGameMaxWin = bonusResult.totalWin;
      if (bonusResult.hitMaxWin) bonusGameHitsMaxWin++;
      if (bonusResult.totalWin >= BET_AMOUNT * 5000) bonusGameWinsAbove5000x++;
      if (bonusResult.totalWin >= BET_AMOUNT * 1000) bonusGameWinsAbove1000x++;
    }

    if ((i + 1) % 100000 === 0) {
      const progress = ((i + 1) / numSpins * 100).toFixed(1);
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`Progress: ${progress}% | Elapsed: ${elapsed}s | Base Max: ${(baseGameMaxWin/BET_AMOUNT).toFixed(1)}x | Bonus Max: ${(bonusGameMaxWin/BET_AMOUNT).toFixed(1)}x`);
    }
  }

  const elapsedSeconds = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║                      BASE GAME RESULTS                          ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝');
  console.log(`Max Win Achieved: ${(baseGameMaxWin / BET_AMOUNT).toFixed(2)}x (${baseGameMaxWin.toLocaleString()})`);
  console.log(`Hit 10,000x: ${baseGameHitsMaxWin} times (${(baseGameHitsMaxWin / numSpins * 100).toFixed(6)}%)`);
  console.log(`Hit 5,000x+: ${baseGameWinsAbove5000x} times (${(baseGameWinsAbove5000x / numSpins * 100).toFixed(6)}%)`);
  console.log(`Hit 1,000x+: ${baseGameWinsAbove1000x} times (${(baseGameWinsAbove1000x / numSpins * 100).toFixed(4)}%)`);
  console.log(`10,000x Achievable: ${baseGameHitsMaxWin > 0 ? 'YES ✓' : 'NO ✗'}`);
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║                      BONUS GAME RESULTS                         ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝');
  console.log(`Bonus Games Played: ${totalBonusGamesPlayed}`);
  console.log(`Max Win Achieved: ${(bonusGameMaxWin / BET_AMOUNT).toFixed(2)}x (${bonusGameMaxWin.toLocaleString()})`);
  console.log(`Hit 10,000x: ${bonusGameHitsMaxWin} times (${(bonusGameHitsMaxWin / totalBonusGamesPlayed * 100).toFixed(6)}% of bonuses)`);
  console.log(`Hit 5,000x+: ${bonusGameWinsAbove5000x} times (${(bonusGameWinsAbove5000x / totalBonusGamesPlayed * 100).toFixed(6)}% of bonuses)`);
  console.log(`Hit 1,000x+: ${bonusGameWinsAbove1000x} times (${(bonusGameWinsAbove1000x / totalBonusGamesPlayed * 100).toFixed(4)}% of bonuses)`);
  console.log(`10,000x Achievable: ${bonusGameHitsMaxWin > 0 ? 'YES ✓' : 'NO ✗'}`);
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║                      OVERALL VERDICT                            ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝');
  
  const overallMaxWin = Math.max(baseGameMaxWin, bonusGameMaxWin);
  const overallAchievable = baseGameHitsMaxWin > 0 || bonusGameHitsMaxWin > 0;
  
  console.log(`Overall Max Win: ${(overallMaxWin / BET_AMOUNT).toFixed(2)}x (${overallMaxWin.toLocaleString()})`);
  console.log(`10,000x Achievable: ${overallAchievable ? 'YES ✓' : 'NO ✗'}`);
  
  if (!overallAchievable) {
    const percentageOfMax = (overallMaxWin / MAX_WIN_TARGET * 100).toFixed(2);
    console.log(`Highest Win Achieved: ${percentageOfMax}% of 10,000x target`);
    console.log('');
    console.log('RECOMMENDATION:');
    if (overallMaxWin < BET_AMOUNT * 5000) {
      console.log('- Max win cap may be too high for current math');
      console.log('- Consider reducing to 5,000x or increasing symbol values');
      console.log('- Or increase multiplier frequency/values');
    } else {
      console.log('- Max win is achievable but extremely rare');
      console.log('- Current settings are appropriate for a high-volatility game');
    }
  }
  
  console.log('');
  console.log(`Simulation Time: ${elapsedSeconds}s`);
  console.log('╔══════════════════════════════════════════════════════════════════╗');
}

// Run test with 5 million spins
runMaxWinTest(5000000);
