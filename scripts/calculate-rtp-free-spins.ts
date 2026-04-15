// RTP Calculation Script for Free Spin Bonus Game
// This script simulates the free spin bonus game with enhanced multiplier logic

interface GameSymbol {
  id: number;
  name: string;
  value: number;
  isMultiplier?: boolean;
  multiplier?: number;
  isScatter?: boolean;
}

const symbols: GameSymbol[] = [
  { id: 1, name: '☄️', value: 0.106 },
  { id: 2, name: '⭐', value: 0.16 },
  { id: 3, name: '🪐', value: 0.213 },
  { id: 4, name: '🌙', value: 0.266 },
  { id: 5, name: '🌞', value: 0.32 },
  { id: 6, name: '🌌', value: 0.426 },
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
const MULTIPLIER_CHANCE = 0.0015;
const MULTIPLIER_CHANCE_FREE_SPINS = 0.002; // 0.2% during free spins
const SCATTER_CHANCE = 0.006;
const BET_AMOUNT = 1000;
const MAX_CASCADES = 100;

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
      if (symbol.isMultiplier || symbol.isScatter) continue; // Start clustering only from regular symbols
      const cluster: [number, number][] = [];
      const queue: [number, number][] = [[col, row]];

      while (queue.length > 0) {
        const [c, r] = queue.shift()!;
        const currentKey = `${c},${r}`;
        if (visited.has(currentKey)) continue;
        if (c < 0 || c >= NUM_REELS || r < 0 || r >= VISIBLE_SYMBOLS) continue;

        const currentSymbol = grid[c][r];
        // Match if same symbol OR if it's a multiplier (wild)
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
    // Count only actual symbols (not multipliers) for base win
    const actualSymbolCount = cluster.positions.filter(([col, row]) => {
      const symbol = grid[col][row];
      return !symbol.isMultiplier;
    }).length;

    const baseWin = cluster.symbol.value * actualSymbolCount * BET_AMOUNT;

    // Find multipliers: both in the cluster and adjacent to it
    let totalMultiplier = 1;
    cluster.positions.forEach(([col, row]) => {
      const symbol = grid[col][row];
      // Apply multiplier if this position is a multiplier in the cluster
      if (symbol.isMultiplier && symbol.multiplier) {
        totalMultiplier *= symbol.multiplier;
      }

      // Check orthogonal adjacent cells for additional multipliers
      const adjacentPositions = [
        [col + 1, row], [col - 1, row], [col, row + 1], [col, row - 1]
      ];

      adjacentPositions.forEach(([c, r]) => {
        if (c >= 0 && c < NUM_REELS && r >= 0 && r < VISIBLE_SYMBOLS) {
          const adjSymbol = grid[c][r];
          // Only apply adjacent multipliers that are not already in the cluster
          if (adjSymbol.isMultiplier && adjSymbol.multiplier && !cluster.positions.some(([pc, pr]) => pc === c && pr === r)) {
            totalMultiplier *= adjSymbol.multiplier;
          }
        }
      });
    });

    totalWin += baseWin * totalMultiplier;
  });

  const maxWin = BET_AMOUNT * 5000;
  return Math.min(totalWin, maxWin);
}

function cascadeGrid(grid: GameSymbol[][], clusterPositions: [number, number][], freeSpinsActive: boolean = false): GameSymbol[][] {
  const newGrid = grid.map(col => [...col]);
  
  // Remove cluster symbols (but keep multipliers sticky during free spins)
  clusterPositions.forEach(([col, row]) => {
    const symbol = grid[col][row];
    // Don't remove multipliers during free spins (sticky multipliers)
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

function simulateSpin(freeSpinsActive: boolean = false): { win: number; scatterCount: number } {
  let grid = generateGrid(freeSpinsActive);
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
      grid = cascadeGrid(grid, allPositions, freeSpinsActive);
      cascadeCount++;

      processCascades();
    }
  };

  processCascades();

  const scatterCount = countScatters(grid);
  return { win: totalWin, scatterCount };
}

function simulateFreeSpinBonus(initialScatterCount: number): number {
  const initialFreeSpins = getFreeSpinsFromScatters(initialScatterCount);
  let remainingFreeSpins = initialFreeSpins;
  let totalWin = 0;
  let spinCount = 0;

  while (remainingFreeSpins > 0 && spinCount < 1000) { // Safety limit
    const result = simulateSpin(true); // true = free spins active
    totalWin += result.win;

    // Check for retrigger (3+ scatters during free spins = +5)
    if (result.scatterCount >= 3) {
      remainingFreeSpins += 5;
    }

    remainingFreeSpins--;
    spinCount++;
  }

  return totalWin;
}

function runFreeSpinsRTPSimulation(numSimulations: number): void {
  console.log('=== FREE SPIN BONUS GAME RTP SIMULATION ===');
  console.log(`Simulating ${numSimulations.toLocaleString()} free spin bonus games`);
  console.log(`Multiplier chance during free spins: ${(MULTIPLIER_CHANCE_FREE_SPINS * 100).toFixed(1)}%`);
  console.log(`Retrigger: 3+ scatters = +5 free spins`);
  console.log('');

  let totalWin = 0;
  let totalFreeSpinsAwarded = 0;
  const scatterDistribution: { [key: number]: number } = {};
  const winDistribution: { [key: string]: number } = {};

  for (let i = 0; i < numSimulations; i++) {
    // Simulate initial trigger with random scatter count (4-7)
    const initialScatterCount = Math.floor(Math.random() * 4) + 4;
    scatterDistribution[initialScatterCount] = (scatterDistribution[initialScatterCount] || 0) + 1;
    
    const freeSpinsAwarded = getFreeSpinsFromScatters(initialScatterCount);
    totalFreeSpinsAwarded += freeSpinsAwarded;
    
    const bonusWin = simulateFreeSpinBonus(initialScatterCount);
    totalWin += bonusWin;

    const winBracket = Math.floor(bonusWin / BET_AMOUNT);
    const bracketKey = winBracket === 0 ? '1x' : `${winBracket}x`;
    winDistribution[bracketKey] = (winDistribution[bracketKey] || 0) + 1;

    if ((i + 1) % 10000 === 0) {
      const avgWinPerBonus = totalWin / (i + 1);
      console.log(`Progress: ${((i + 1) / numSimulations * 100).toFixed(1)}% | Avg Bonus Win: ${avgWinPerBonus.toFixed(2)}`);
    }
  }

  const avgBonusWin = totalWin / numSimulations;
  const avgFreeSpins = totalFreeSpinsAwarded / numSimulations;
  const avgWinPerFreeSpin = avgBonusWin / avgFreeSpins;

  console.log('\n=== FREE SPIN BONUS GAME RESULTS ===');
  console.log(`Total Simulations: ${numSimulations.toLocaleString()}`);
  console.log(`Average Free Spins Awarded: ${avgFreeSpins.toFixed(2)}`);
  console.log(`Average Bonus Win: ${avgBonusWin.toFixed(2)}`);
  console.log(`Average Win Per Free Spin: ${avgWinPerFreeSpin.toFixed(2)}`);
  console.log(`RTP Contribution Per Free Spin: ${(avgWinPerFreeSpin / BET_AMOUNT * 100).toFixed(2)}%`);

  console.log('\n=== INITIAL SCATTER DISTRIBUTION ===');
  [4, 5, 6, 7].forEach(count => {
    const freq = scatterDistribution[count] || 0;
    const percentage = (freq / numSimulations * 100).toFixed(2);
    console.log(`${count} Scatters (${getFreeSpinsFromScatters(count)} free spins): ${freq.toLocaleString()} (${percentage}%)`);
  });

  console.log('\n=== BONUS WIN DISTRIBUTION (multipliers of bet) ===');
  const sortedBrackets = Object.keys(winDistribution).sort((a, b) => {
    const aNum = parseInt(a.replace('x', ''));
    const bNum = parseInt(b.replace('x', ''));
    return aNum - bNum;
  });
  
  sortedBrackets.forEach(bracket => {
    const count = winDistribution[bracket];
    const percentage = (count / numSimulations * 100).toFixed(2);
    console.log(`${bracket}: ${count.toLocaleString()} (${percentage}%)`);
  });

  console.log('\n=== MULTIPLIER IMPACT ANALYSIS ===');
  console.log(`Base multiplier chance: ${(MULTIPLIER_CHANCE * 100).toFixed(2)}%`);
  console.log(`Free spins multiplier chance: ${(MULTIPLIER_CHANCE_FREE_SPINS * 100).toFixed(1)}%`);
  console.log(`Multiplier increase: ${(MULTIPLIER_CHANCE_FREE_SPINS / MULTIPLIER_CHANCE).toFixed(1)}x`);
}

// Run simulation with 100,000 free spin bonus games
runFreeSpinsRTPSimulation(100000);
