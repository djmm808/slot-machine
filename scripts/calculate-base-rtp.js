// Minimal fast TypeScript RTP calculator for base game only
// Accurate cluster/cascade logic from SlotMachine.tsx
// Regular symbols (low tier)
const symbols = [
    { id: 0, name: '☄️', value: 0.089 },
    { id: 1, name: '⭐', value: 0.128 },
    { id: 2, name: '🪐', value: 0.172 },
    { id: 3, name: '🌙', value: 0.220 },
    { id: 4, name: '🌞', value: 0.271 },
    { id: 5, name: '🌌', value: 0.325 },
];
const multiplierSymbols = [
    { id: 100, name: '2️⃣', value: 0, isMultiplier: true, multiplier: 2 },
    { id: 101, name: '5️⃣', value: 0, isMultiplier: true, multiplier: 5 },
    { id: 102, name: '🔟', value: 0, isMultiplier: true, multiplier: 10 },
];
const scatterSymbol = {
    id: 200,
    name: '💫',
    value: 0,
    isScatter: true,
};
// Constants from game
const NUM_REELS = 7;
const VISIBLE_SYMBOLS = 7;
const MAX_CASCADES = 100;
const MULTIPLIER_CHANCE = 0.0010;
const SCATTER_CHANCE = 0.0070;
const MAX_WIN_MULTIPLIER = 5000;
// Weighted multiplier selection
function getRandomMultiplier() {
    const rand = Math.random();
    if (rand < 0.60)
        return multiplierSymbols[0]; // 60% for 2x
    if (rand < 0.92)
        return multiplierSymbols[1]; // 32% for 5x
    return multiplierSymbols[2]; // 8% for 10x
}
// Generate random symbol (base game, no free spins)
function generateRandomSymbol(reelHasScatter) {
    const rand = Math.random();
    // Scatter chance, limit to 1 per reel
    if (rand < SCATTER_CHANCE && !reelHasScatter) {
        return scatterSymbol;
    }
    // Multiplier chance
    if (rand < SCATTER_CHANCE + MULTIPLIER_CHANCE) {
        return getRandomMultiplier();
    }
    return symbols[Math.floor(Math.random() * symbols.length)];
}
// Generate initial grid
function generateGrid() {
    const grid = [];
    for (let col = 0; col < NUM_REELS; col++) {
        grid[col] = [];
        let hasScatter = false;
        for (let row = 0; row < VISIBLE_SYMBOLS; row++) {
            const symbol = generateRandomSymbol(hasScatter);
            if (symbol.id === 200)
                hasScatter = true;
            grid[col][row] = symbol;
        }
    }
    return grid;
}
// Find clusters of 5+ matching symbols (multipliers as wilds)
function findClusters(grid) {
    const clusters = [];
    const visited = new Set();
    for (let col = 0; col < NUM_REELS; col++) {
        for (let row = 0; row < VISIBLE_SYMBOLS; row++) {
            const key = `${col},${row}`;
            if (visited.has(key))
                continue;
            const symbol = grid[col][row];
            if (symbol.isMultiplier || symbol.isScatter)
                continue; // Start from regular symbols only
            const cluster = [];
            const queue = [[col, row]];
            while (queue.length > 0) {
                const [c, r] = queue.shift();
                const currentKey = `${c},${r}`;
                if (visited.has(currentKey))
                    continue;
                if (c < 0 || c >= NUM_REELS || r < 0 || r >= VISIBLE_SYMBOLS)
                    continue;
                const currentSymbol = grid[c][r];
                // Match if same symbol OR if it's a multiplier (wild)
                if (currentSymbol.id !== symbol.id && !currentSymbol.isMultiplier)
                    continue;
                visited.add(currentKey);
                cluster.push([c, r]);
                // Check orthogonal adjacent cells
                queue.push([c + 1, r], [c - 1, r], [c, r + 1], [c, r - 1]);
            }
            if (cluster.length >= 5) {
                clusters.push({ symbol, positions: cluster });
            }
        }
    }
    return clusters;
}
// Calculate win from clusters with multipliers
function calculateClusterWin(clusters, grid, bet) {
    let totalWin = 0;
    clusters.forEach(cluster => {
        // Count only actual symbols (not multipliers) for base win
        const actualSymbolCount = cluster.positions.filter(([col, row]) => {
            const symbol = grid[col][row];
            return !symbol.isMultiplier;
        }).length;
        const baseWin = cluster.symbol.value * actualSymbolCount * bet;
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
    const maxWin = bet * MAX_WIN_MULTIPLIER;
    return Math.min(totalWin, maxWin);
}
// Cascade grid - remove cluster symbols and drop new ones
function cascadeGrid(grid, clusterPositions) {
    const newGrid = grid.map(col => [...col]);
    // Remove cluster symbols
    clusterPositions.forEach(([col, row]) => {
        newGrid[col][row] = null;
    });
    // Cascade symbols down
    for (let col = 0; col < NUM_REELS; col++) {
        let writeRow = VISIBLE_SYMBOLS - 1;
        for (let row = VISIBLE_SYMBOLS - 1; row >= 0; row--) {
            if (newGrid[col][row] !== null) {
                newGrid[col][writeRow] = newGrid[col][row];
                if (writeRow !== row) {
                    newGrid[col][row] = null;
                }
                writeRow--;
            }
        }
        // Check if this reel already has a scatter
        const reelHasScatter = newGrid[col].some((symbol) => symbol !== null && symbol.id === 200);
        // Fill empty spaces at top with new random symbols
        for (let row = 0; row <= writeRow; row++) {
            newGrid[col][row] = generateRandomSymbol(reelHasScatter);
        }
    }
    return newGrid;
}
// Simulate a single spin with cascades
function simulateSpin(bet) {
    let grid = generateGrid();
    let totalWin = 0;
    let cascadeCount = 0;
    while (cascadeCount < MAX_CASCADES) {
        const clusters = findClusters(grid);
        if (clusters.length === 0)
            break;
        const win = calculateClusterWin(clusters, grid, bet);
        // Cap win accumulation
        const maxTotalWin = bet * MAX_WIN_MULTIPLIER;
        if (totalWin + win > maxTotalWin) {
            totalWin = maxTotalWin;
            break;
        }
        totalWin += win;
        // Get all cluster positions
        const allPositions = clusters.flatMap(c => c.positions);
        // Cascade
        grid = cascadeGrid(grid, allPositions);
        cascadeCount++;
    }
    return totalWin;
}
// Main RTP calculation
function calculateRTP(numSpins = 1000000) {
    const bet = 1; // Use 1 as unit bet
    let totalWin = 0;
    let totalBet = 0;
    console.log(`Simulating ${numSpins.toLocaleString()} spins...`);
    for (let i = 0; i < numSpins; i++) {
        const win = simulateSpin(bet);
        totalWin += win;
        totalBet += bet;
        if ((i + 1) % 100000 === 0) {
            const currentRTP = (totalWin / totalBet) * 100;
            console.log(`Progress: ${((i + 1) / numSpins * 100).toFixed(1)}% - Current RTP: ${currentRTP.toFixed(4)}%`);
        }
    }
    const rtp = (totalWin / totalBet) * 100;
    console.log(`\n=== Base Game RTP Results ===`);
    console.log(`Total Spins: ${numSpins.toLocaleString()}`);
    console.log(`Total Bet: ${totalBet.toLocaleString()}`);
    console.log(`Total Win: ${totalWin.toFixed(2)}`);
    console.log(`Base Game RTP: ${rtp.toFixed(4)}%`);
}
// Run simulation
calculateRTP(1000000);
