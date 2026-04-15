// RTP Calculation Script for Slot Machine
// This script simulates millions of spins to calculate the Return to Player (RTP)

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
const SCATTER_CHANCE = 0.006;
const BET_AMOUNT = 1000;
const MAX_CASCADES = 100;

function generateRandomSymbol(): GameSymbol {
  const rand = Math.random();
  if (rand < SCATTER_CHANCE) {
    return scatterSymbol;
  }
  if (rand < SCATTER_CHANCE + MULTIPLIER_CHANCE) {
    return multiplierSymbols[Math.floor(Math.random() * multiplierSymbols.length)];
  }
  return symbols[Math.floor(Math.random() * symbols.length)];
}

function generateGrid(): GameSymbol[][] {
  const grid: GameSymbol[][] = [];
  for (let col = 0; col < NUM_REELS; col++) {
    grid[col] = [];
    for (let row = 0; row < VISIBLE_SYMBOLS; row++) {
      grid[col][row] = generateRandomSymbol();
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

  // Cap max win at 5,000x bet
  const maxWin = BET_AMOUNT * 5000;
  return Math.min(totalWin, maxWin);
}

function cascadeGrid(grid: GameSymbol[][], clusterPositions: [number, number][]): GameSymbol[][] {
  const newGrid = grid.map(col => [...col]);
  
  clusterPositions.forEach(([col, row]) => {
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
      newGrid[col][row] = generateRandomSymbol();
    }
  }

  return newGrid;
}

function simulateSpin(): number {
  let grid = generateGrid();
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
      grid = cascadeGrid(grid, allPositions);
      cascadeCount++;

      processCascades();
    }
  };

  processCascades();

  // Count scatters and calculate free spins value
  let scatterCount = 0;
  for (let col = 0; col < NUM_REELS; col++) {
    for (let row = 0; row < VISIBLE_SYMBOLS; row++) {
      if (grid[col][row].isScatter) {
        scatterCount++;
      }
    }
  }

  // Award free spins based on scatter count
  let freeSpinsAwarded = 0;
  switch (scatterCount) {
    case 4: freeSpinsAwarded = 10; break;
    case 5: freeSpinsAwarded = 12; break;
    case 6: freeSpinsAwarded = 15; break;
    case 7: freeSpinsAwarded = 30; break;
  }

  // Estimate free spins value (average win per spin * number of free spins)
  // Using 0.96 * BET as estimated average win per free spin
  if (freeSpinsAwarded > 0) {
    totalWin += freeSpinsAwarded * 0.96 * BET_AMOUNT;
  }

  return totalWin;
}

function runSimulation(numSpins: number): void {
  console.log(`Running RTP simulation with ${numSpins.toLocaleString()} spins...`);
  console.log(`Bet amount: ${BET_AMOUNT}`);
  console.log(`Multiplier chance: ${(MULTIPLIER_CHANCE * 100).toFixed(1)}%`);
  console.log('');

  let totalBet = 0;
  let totalWin = 0;
  let winCount = 0;
  let zeroWinCount = 0;
  let maxWin = 0;
  const winDistribution: { [key: string]: number } = {};

  for (let i = 0; i < numSpins; i++) {
    const win = simulateSpin();
    totalBet += BET_AMOUNT;
    totalWin += win;

    if (win > 0) {
      winCount++;
      if (win > maxWin) maxWin = win;
      
      const winBracket = Math.floor(win / BET_AMOUNT);
      const bracketKey = winBracket === 0 ? '1x' : `${winBracket}x`;
      winDistribution[bracketKey] = (winDistribution[bracketKey] || 0) + 1;
    } else {
      zeroWinCount++;
    }

    if ((i + 1) % 100000 === 0) {
      const currentRtp = (totalWin / totalBet) * 100;
      console.log(`Progress: ${((i + 1) / numSpins * 100).toFixed(1)}% | Current RTP: ${currentRtp.toFixed(2)}%`);
    }
  }

  const rtp = (totalWin / totalBet) * 100;
  const hitFrequency = (winCount / numSpins) * 100;
  const avgWin = winCount > 0 ? totalWin / winCount : 0;

  console.log('\n=== RTP SIMULATION RESULTS ===');
  console.log(`Total Spins: ${numSpins.toLocaleString()}`);
  console.log(`Total Bet: ${totalBet.toLocaleString()}`);
  console.log(`Total Win: ${totalWin.toLocaleString()}`);
  console.log(`RTP: ${rtp.toFixed(2)}%`);
  console.log(`Hit Frequency: ${hitFrequency.toFixed(2)}%`);
  console.log(`Average Win (when winning): ${avgWin.toFixed(2)}`);
  console.log(`Max Win: ${maxWin.toFixed(2)}`);
  console.log(`Zero Win Spins: ${zeroWinCount.toLocaleString()} (${(zeroWinCount / numSpins * 100).toFixed(2)}%)`);
  
  console.log('\n=== WIN DISTRIBUTION (multipliers of bet) ===');
  const sortedBrackets = Object.keys(winDistribution).sort((a, b) => {
    const aNum = parseInt(a.replace('x', ''));
    const bNum = parseInt(b.replace('x', ''));
    return aNum - bNum;
  });
  
  sortedBrackets.forEach(bracket => {
    const count = winDistribution[bracket];
    const percentage = (count / numSpins * 100).toFixed(2);
    console.log(`${bracket}: ${count.toLocaleString()} (${percentage}%)`);
  });

  console.log('\n=== RTP TARGET ===');
  const targetRtp = 96;
  const difference = rtp - targetRtp;
  if (Math.abs(difference) < 0.5) {
    console.log(`✓ RTP is within acceptable range of ${targetRtp}% (difference: ${difference > 0 ? '+' : ''}${difference.toFixed(2)}%)`);
  } else if (difference > 0) {
    console.log(`⚠ RTP is too HIGH (${rtp.toFixed(2)}% vs target ${targetRtp}%, difference: +${difference.toFixed(2)}%)`);
    console.log('  Suggested adjustments: Reduce symbol values or cluster size requirement');
  } else {
    console.log(`⚠ RTP is too LOW (${rtp.toFixed(2)}% vs target ${targetRtp}%, difference: ${difference.toFixed(2)}%)`);
    console.log('  Suggested adjustments: Increase symbol values or reduce cluster size requirement');
  }
}

// Run simulation with 1 million spins for accurate RTP calculation
runSimulation(1000000);
