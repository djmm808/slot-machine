// Combined RTP Calculation Script for Slot Machine
// Calculates base game RTP, bonus game RTP, hit frequency, and feature trigger rates

interface GameSymbol {
  id: number;
  name: string;
  value: number;
  isMultiplier?: boolean;
  multiplier?: number;
  isScatter?: boolean;
}

const symbols: GameSymbol[] = [
  { id: 1, name: '☄️', value: 0.081 },
  { id: 2, name: '⭐', value: 0.1215 },
  { id: 3, name: '🪐', value: 0.1625 },
  { id: 4, name: '🌙', value: 0.203 },
  { id: 5, name: '🌞', value: 0.243 },
  { id: 6, name: '🌌', value: 0.324 },
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
const MULTIPLIER_CHANCE = 0.003;
const MULTIPLIER_CHANCE_FREE_SPINS = 0.01;
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

  const maxWin = BET_AMOUNT * 5000;
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

function simulateBaseSpin(): { win: number; scatterCount: number; triggered: boolean } {
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
  const triggered = scatterCount >= 4;

  return { win: totalWin, scatterCount, triggered };
}

function simulateFreeSpinBonus(initialScatterCount: number): { win: number; spinsPlayed: number } {
  const initialFreeSpins = getFreeSpinsFromScatters(initialScatterCount);
  let remainingFreeSpins = initialFreeSpins;
  let totalWin = 0;
  let spinCount = 0;

  while (remainingFreeSpins > 0 && spinCount < 1000) {
    let grid = generateGrid(true);
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
        grid = cascadeGrid(grid, allPositions, true);
        cascadeCount++;

        processCascades();
      }
    };

    processCascades();

    const scatterCount = countScatters(grid);
    if (scatterCount >= 3) {
      remainingFreeSpins += 5;
    }

    remainingFreeSpins--;
    spinCount++;
  }

  return { win: totalWin, spinsPlayed: spinCount };
}

function runCombinedRTPSimulation(numSpins: number): void {
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║           COMBINED RTP SIMULATION - BASE + BONUS                ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝');
  console.log(`Total Spins: ${numSpins.toLocaleString()}`);
  console.log(`Bet Amount: ${BET_AMOUNT}`);
  console.log(`Multiplier Chance (Base): ${(MULTIPLIER_CHANCE * 100).toFixed(2)}%`);
  console.log(`Multiplier Chance (Free Spins): ${(MULTIPLIER_CHANCE_FREE_SPINS * 100).toFixed(2)}%`);
  console.log(`Scatter Chance: ${(SCATTER_CHANCE * 100).toFixed(2)}%`);
  console.log('');

  let totalBet = 0;
  let totalBaseWin = 0;
  let totalBonusWin = 0;
  let totalWin = 0;
  let winCount = 0;
  let zeroWinCount = 0;
  let triggerCount = 0;
  let maxWin = 0;
  let totalFreeSpinsAwarded = 0;
  let totalFreeSpinsPlayed = 0;
  let baseGameMaxWin = 0;
  let bonusGameMaxWin = 0;
  let baseGameHitsMaxWin = 0;
  let bonusGameHitsMaxWin = 0;
  
  // Volatility tracking
  const baseGameWins: number[] = [];
  const bonusGameWins: number[] = [];
  
  const scatterDistribution: { [key: number]: number } = {};
  const winDistribution: { [key: string]: number } = {};
  const cascadeDistribution: { [key: number]: number } = {};

  const startTime = Date.now();

  for (let i = 0; i < numSpins; i++) {
    const baseResult = simulateBaseSpin();
    totalBet += BET_AMOUNT;
    totalBaseWin += baseResult.win;

    // Track base game max win and volatility
    if (baseResult.win > baseGameMaxWin) baseGameMaxWin = baseResult.win;
    if (baseResult.win >= BET_AMOUNT * 5000) baseGameHitsMaxWin++;
    baseGameWins.push(baseResult.win);

    if (baseResult.win > 0) {
      winCount++;
      if (baseResult.win > maxWin) maxWin = baseResult.win;
      
      const winBracket = Math.floor(baseResult.win / BET_AMOUNT);
      const bracketKey = winBracket === 0 ? '1x' : `${winBracket}x`;
      winDistribution[bracketKey] = (winDistribution[bracketKey] || 0) + 1;
    } else {
      zeroWinCount++;
    }

    scatterDistribution[baseResult.scatterCount] = (scatterDistribution[baseResult.scatterCount] || 0) + 1;

    if (baseResult.triggered) {
      triggerCount++;
      const bonusResult = simulateFreeSpinBonus(baseResult.scatterCount);
      totalBonusWin += bonusResult.win;
      totalFreeSpinsAwarded += getFreeSpinsFromScatters(baseResult.scatterCount);
      totalFreeSpinsPlayed += bonusResult.spinsPlayed;
      
      // Track bonus game max win and volatility
      if (bonusResult.win > bonusGameMaxWin) bonusGameMaxWin = bonusResult.win;
      if (bonusResult.win >= BET_AMOUNT * 5000) bonusGameHitsMaxWin++;
      bonusGameWins.push(bonusResult.win);
      
      const totalSpinWin = baseResult.win + bonusResult.win;
      totalWin += totalSpinWin;
      
      if (totalSpinWin > maxWin) maxWin = totalSpinWin;
      
      const winBracket = Math.floor(totalSpinWin / BET_AMOUNT);
      const bracketKey = winBracket === 0 ? '1x' : `${winBracket}x`;
      winDistribution[bracketKey] = (winDistribution[bracketKey] || 0) + 1;
    } else {
      totalWin += baseResult.win;
    }

    if ((i + 1) % 100000 === 0) {
      const progress = ((i + 1) / numSpins * 100).toFixed(1);
      const currentRtp = (totalWin / totalBet * 100).toFixed(2);
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      const eta = ((Date.now() - startTime) / (i + 1) * (numSpins - i - 1) / 1000).toFixed(1);
      console.log(`Progress: ${progress}% | Current RTP: ${currentRtp}% | Elapsed: ${elapsed}s | ETA: ${eta}s | Base Max: ${(baseGameMaxWin/BET_AMOUNT).toFixed(1)}x | Bonus Max: ${(bonusGameMaxWin/BET_AMOUNT).toFixed(1)}x`);
    }
  }

  const elapsedSeconds = ((Date.now() - startTime) / 1000).toFixed(2);
  const baseRtp = (totalBaseWin / totalBet * 100);
  const bonusRtpContribution = (totalBonusWin / totalBet * 100);
  const combinedRtp = (totalWin / totalBet * 100);
  const hitFrequency = (winCount / numSpins * 100);
  const triggerRate = (triggerCount / numSpins * 100);
  const zeroWinRate = (zeroWinCount / numSpins * 100);
  const avgWin = winCount > 0 ? totalWin / winCount : 0;
  const avgBonusWin = triggerCount > 0 ? totalBonusWin / triggerCount : 0;
  const avgFreeSpins = triggerCount > 0 ? totalFreeSpinsAwarded / triggerCount : 0;

  // Calculate volatility (coefficient of variation)
  const calculateVolatility = (wins: number[]): { cv: number; classification: string } => {
    if (wins.length === 0) return { cv: 0, classification: 'N/A' };
    const mean = wins.reduce((sum, w) => sum + w, 0) / wins.length;
    if (mean === 0) return { cv: 0, classification: 'N/A' };
    const variance = wins.reduce((sum, w) => sum + Math.pow(w - mean, 2), 0) / wins.length;
    const stdDev = Math.sqrt(variance);
    const cv = (stdDev / mean) * 100;
    
    let classification = 'Low';
    if (cv > 50) classification = 'Medium';
    if (cv > 100) classification = 'High';
    if (cv > 200) classification = 'Very High';
    
    return { cv, classification };
  };

  const baseVolatility = calculateVolatility(baseGameWins);
  const bonusVolatility = calculateVolatility(bonusGameWins);
  
  // Calculate base game RTP (excluding bonus contribution)
  const baseGameOnlyRtp = (totalBaseWin / totalBet * 100);
  // Calculate bonus game RTP (bonus wins / free spin bets)
  const bonusGameOnlyRtp = totalFreeSpinsPlayed > 0 ? (totalBonusWin / (totalFreeSpinsPlayed * BET_AMOUNT) * 100) : 0;

  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║                      SIMULATION RESULTS                           ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝');
  console.log(`Total Spins: ${numSpins.toLocaleString()}`);
  console.log(`Total Bet: ${totalBet.toLocaleString()}`);
  console.log(`Total Win: ${totalWin.toLocaleString()}`);
  console.log(`Simulation Time: ${elapsedSeconds}s`);
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║                         RTP BREAKDOWN                            ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝');
  console.log(`Base Game RTP: ${baseGameOnlyRtp.toFixed(2)}% (Target: 96%)`);
  console.log(`Bonus Game RTP: ${bonusGameOnlyRtp.toFixed(2)}% (Target: 96%)`);
  console.log(`Combined RTP: ${combinedRtp.toFixed(2)}% (Target: 96%)`);
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║                    STATISTICS & RATES                            ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝');
  console.log(`Hit Frequency: ${hitFrequency.toFixed(2)}%`);
  console.log(`Zero Win Rate: ${zeroWinRate.toFixed(2)}%`);
  console.log(`Free Spin Trigger Rate: ${triggerRate.toFixed(4)}% (1 in ${(1/triggerRate).toFixed(1)})`);
  console.log(`Average Win (when winning): ${avgWin.toFixed(2)}`);
  console.log(`Average Bonus Win: ${avgBonusWin.toFixed(2)}`);
  console.log(`Average Free Spins per Trigger: ${avgFreeSpins.toFixed(2)}`);
  console.log(`Total Free Spins Played: ${totalFreeSpinsPlayed.toLocaleString()}`);
  console.log(`Max Win: ${maxWin.toFixed(2)} (${(maxWin/BET_AMOUNT).toFixed(1)}x)`);
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║                    VOLATILITY ANALYSIS                           ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝');
  console.log(`Base Game Volatility: ${baseVolatility.cv.toFixed(2)}% (${baseVolatility.classification})`);
  console.log(`Bonus Game Volatility: ${bonusVolatility.cv.toFixed(2)}% (${bonusVolatility.classification})`);
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║                    SCATTER DISTRIBUTION                          ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝');
  [0, 1, 2, 3, 4, 5, 6, 7].forEach(count => {
    const freq = scatterDistribution[count] || 0;
    const percentage = (freq / numSpins * 100).toFixed(3);
    const label = count >= 4 ? ` (${getFreeSpinsFromScatters(count)} free spins)` : '';
    console.log(`${count} Scatters: ${freq.toLocaleString()} (${percentage}%)${label}`);
  });
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║                    WIN DISTRIBUTION (x bet)                      ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝');
  const sortedBrackets = Object.keys(winDistribution).sort((a, b) => {
    const aNum = parseInt(a.replace('x', ''));
    const bNum = parseInt(b.replace('x', ''));
    return aNum - bNum;
  });
  
  sortedBrackets.slice(0, 20).forEach(bracket => {
    const count = winDistribution[bracket];
    const percentage = (count / numSpins * 100).toFixed(3);
    console.log(`${bracket}: ${count.toLocaleString()} (${percentage}%)`);
  });
  
  if (sortedBrackets.length > 20) {
    console.log(`... and ${sortedBrackets.length - 20} more brackets`);
  }
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║                    MAX WIN ACHIEVEMENT (5,000x)                   ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝');
  console.log(`Base Game Max: ${(baseGameMaxWin / BET_AMOUNT).toFixed(2)}x (${baseGameMaxWin.toLocaleString()})`);
  console.log(`Base Game Hit 5,000x: ${baseGameHitsMaxWin} times (${(baseGameHitsMaxWin / numSpins * 100).toFixed(6)}%)`);
  console.log(`Bonus Game Max: ${(bonusGameMaxWin / BET_AMOUNT).toFixed(2)}x (${bonusGameMaxWin.toLocaleString()})`);
  console.log(`Bonus Game Hit 5,000x: ${bonusGameHitsMaxWin} times (${(bonusGameHitsMaxWin / triggerCount * 100).toFixed(6)}% of bonuses)`);
  console.log('');
  
  const overallAchievable = baseGameHitsMaxWin > 0 || bonusGameHitsMaxWin > 0;
  const overallMaxWin = Math.max(baseGameMaxWin, bonusGameMaxWin);
  const percentageOfMax = (overallMaxWin / (BET_AMOUNT * 5000) * 100).toFixed(2);
  
  console.log(`Overall Max Win: ${(overallMaxWin / BET_AMOUNT).toFixed(2)}x (${overallMaxWin.toLocaleString()})`);
  console.log(`5,000x Achievable: ${overallAchievable ? 'YES ✓' : 'NO ✗'}`);
  
  if (!overallAchievable) {
    console.log(`Highest Win Achieved: ${percentageOfMax}% of 5,000x target`);
    console.log('');
    console.log('RECOMMENDATION:');
    if (overallMaxWin < BET_AMOUNT * 5000) {
      console.log('- Max win cap may be too high for current math');
      console.log('- Consider reducing to 3,000x or increasing symbol values');
      console.log('- Or increase multiplier frequency/values');
    } else {
      console.log('- Max win is achievable but extremely rare');
      console.log('- Current settings are appropriate for a high-volatility game');
    }
  }
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║                    TARGET RTP ANALYSIS                           ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝');
  const targetRtp = 96;
  const difference = combinedRtp - targetRtp;
  
  if (Math.abs(difference) < 0.5) {
    console.log(`✓ RTP is within acceptable range of ${targetRtp}%`);
    console.log(`  Difference: ${difference > 0 ? '+' : ''}${difference.toFixed(2)}%`);
    console.log(`  Status: OPTIMAL`);
  } else if (difference > 0) {
    console.log(`⚠ RTP is too HIGH (${combinedRtp.toFixed(2)}% vs target ${targetRtp}%)`);
    console.log(`  Difference: +${difference.toFixed(2)}%`);
    console.log(`  Status: NEEDS ADJUSTMENT`);
    console.log('');
    console.log('  Suggested adjustments:');
    console.log('  - Reduce symbol values by ~' + (difference / 2).toFixed(2) + '%');
    console.log('  - Or increase cluster size requirement to 6');
  } else {
    console.log(`⚠ RTP is too LOW (${combinedRtp.toFixed(2)}% vs target ${targetRtp}%)`);
    console.log(`  Difference: ${difference.toFixed(2)}%`);
    console.log(`  Status: NEEDS ADJUSTMENT`);
    console.log('');
    console.log('  Suggested adjustments:');
    console.log('  - Increase symbol values by ~' + (Math.abs(difference) / 2).toFixed(2) + '%');
    console.log('  - Or reduce cluster size requirement to 4');
  }
  console.log('╔══════════════════════════════════════════════════════════════════╗');
}

// Run simulation with 2 million spins for accurate RTP calculation
runCombinedRTPSimulation(2000000);
