import React, { useState, useEffect, useRef, useImperativeHandle } from 'react';
import './SlotMachine.css';
import { SymbolAsset } from './Symbols';
import { SoundIcon, CloseIcon, InfoIcon } from './Icons';
import GameBarLeft from './GameBarLeft';
import GameBarMiddle from './GameBarMiddle';
import GameBarRight from './GameBarRight';
import FreeSpinsBar from './FreeSpinsBar';
import InfoModal from './InfoModal';

// Interface representing a symbol on the slot machine reel
interface Symbol {
  id: number;
  name: string;
  value: number;
  isMultiplier?: boolean;
  multiplier?: number;
  isScatter?: boolean;
}

// Array of available symbols with unique IDs, names (emojis), and values
// Low tier symbols (more common, lower value) - values are bet multipliers
const symbols: Symbol[] = [
  { id: 1, name: '☄️', value: 0.081 },
  { id: 2, name: '⭐', value: 0.1215 },
  { id: 3, name: '🪐', value: 0.1625 },
  { id: 4, name: '🌙', value: 0.203 },
  { id: 5, name: '🌞', value: 0.243 },
  { id: 6, name: '🌌', value: 0.324 },
];

// Multiplier symbols (rare, high impact)
const multiplierSymbols: Symbol[] = [
  { id: 100, name: '2️⃣', value: 0, isMultiplier: true, multiplier: 2 },
  { id: 101, name: '5️⃣', value: 0, isMultiplier: true, multiplier: 5 },
  { id: 102, name: '🔟', value: 0, isMultiplier: true, multiplier: 10 },
];

// Scatter symbol (triggers free spins)
const scatterSymbol: Symbol = {
  id: 200,
  name: '💫',
  value: 0,
  isScatter: true,
};

// All symbols including multipliers and scatter
const allSymbols = [...symbols, ...multiplierSymbols, scatterSymbol];

// Constants defining the appearance and behavior of the slot machine
const VISIBLE_SYMBOLS = 7; // Number of symbols visible on the reel
const NUM_REELS = 7; // Number of reels (columns)
const MAX_CASCADES = 100; // Maximum number of cascades to prevent infinite loops
const MULTIPLIER_CHANCE = 0.003; // 0.3% chance for multiplier
const MULTIPLIER_CHANCE_FREE_SPINS = 0.01; // 1.0% chance for multiplier during free spins
const SCATTER_CHANCE = 0.006; // 0.6% chance for scatter

// Main SlotMachine component
interface SlotMachineProps {
  onDemoScatter?: () => void;
  onFreeSpinsChange?: (active: boolean) => void;
}

export interface SlotMachineRef {
  triggerDemoScatter: () => void;
}

const SlotMachine = React.forwardRef<SlotMachineRef, SlotMachineProps>(({ onDemoScatter, onFreeSpinsChange }, ref) => {
  // Function to trigger demo scatter
  const handleDemoScatter = () => {
    // Random scatter count between 4 and 7
    const targetScatterCount = Math.floor(Math.random() * 4) + 4; // 4, 5, 6, or 7

    // Create a demo grid with scatter symbols (max 1 per reel)
    const demoGrid: Symbol[][] = [];
    let scatterCount = 0;
    const reelsWithScatter = new Set<number>();

    for (let col = 0; col < NUM_REELS; col++) {
      demoGrid[col] = [];
      for (let row = 0; row < VISIBLE_SYMBOLS; row++) {
        // Place scatter symbol in this reel if we still need more scatters and this reel doesn't have one yet
        if (scatterCount < targetScatterCount && !reelsWithScatter.has(col) && row === 3 && Math.random() < 0.6) {
          demoGrid[col][row] = scatterSymbol;
          scatterCount++;
          reelsWithScatter.add(col);
        } else {
          demoGrid[col][row] = generateRandomSymbol(false);
        }
      }
    }

    // Add at least 1 random multiplier to the demo grid
    let multiplierAdded = false;
    while (!multiplierAdded) {
      const randomCol = Math.floor(Math.random() * NUM_REELS);
      const randomRow = Math.floor(Math.random() * VISIBLE_SYMBOLS);
      // Don't replace scatter symbols
      if (!demoGrid[randomCol][randomRow].isScatter) {
        const randomMultiplier = multiplierSymbols[Math.floor(Math.random() * multiplierSymbols.length)];
        demoGrid[randomCol][randomRow] = randomMultiplier;
        multiplierAdded = true;
      }
    }

    setReels(demoGrid);

    // Award correct free spins based on scatter count
    const freeSpinsAwarded = getFreeSpinsFromScatters(scatterCount);
    if (freeSpinsAwarded > 0) {
      setScatterCountWon(scatterCount);
      setFreeSpinsWon(freeSpinsAwarded);
      setShowFreeSpinsOverlay(true);
    }
  };

  // Expose the function via ref
  useImperativeHandle(ref, () => ({
    triggerDemoScatter: handleDemoScatter
  }));

  // State variables
  const [spinning, setSpinning] = useState(false);
  const [balance, setBalance] = useState(100000);
  const [bet, setBet] = useState(10);
  const [result, setResult] = useState('');
  const [winAmount, setWinAmount] = useState(0);
  const [limitReached, setLimitReached] = useState(false);
  const [reels, setReels] = useState<Symbol[][]>([]);
  const [soundOn, setSoundOn] = useState(true);
  const [turboOn, setTurboOn] = useState(false);
  const [autoOn, setAutoOn] = useState(false);
  const [hamburgerOpen, setHamburgerOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [betMenuOpen, setBetMenuOpen] = useState(false);
  const [autoBetOpen, setAutoBetOpen] = useState(false);
  const [autoBetSpins, setAutoBetSpins] = useState<number | string>(10);
  const [autoBetActive, setAutoBetActive] = useState(false);
  const [tumbling, setTumbling] = useState(false);
  const [totalWin, setTotalWin] = useState(0);
  const [highlightedPositions, setHighlightedPositions] = useState<Set<string>>(new Set());
  const [explodingPositions, setExplodingPositions] = useState<Set<string>>(new Set());
  const [droppingPositions, setDroppingPositions] = useState<Set<string>>(new Set());
  const [clusterWins, setClusterWins] = useState<number[]>([]);
  const [currentTumbleWin, setCurrentTumbleWin] = useState(0);
  const [gridVersion, setGridVersion] = useState(0);
  const [slidingPositions, setSlidingPositions] = useState<Set<string>>(new Set());
  const [freeSpins, setFreeSpins] = useState(0);
  const [freeSpinsActive, setFreeSpinsActive] = useState(false);
  const [showFreeSpinsOverlay, setShowFreeSpinsOverlay] = useState(false);
  const [freeSpinsWon, setFreeSpinsWon] = useState(0);
  const [totalFreeSpinsAwarded, setTotalFreeSpinsAwarded] = useState(0);
  const [scatterCountWon, setScatterCountWon] = useState(0);
  const [autoSpinning, setAutoSpinning] = useState(false);
  const [showFreeSpinsCompleteOverlay, setShowFreeSpinsCompleteOverlay] = useState(false);
  const [freeSpinsTotalWin, setFreeSpinsTotalWin] = useState(0);
  const [bonusBuyOpen, setBonusBuyOpen] = useState(false);
  const [showRetriggerOverlay, setShowRetriggerOverlay] = useState(false);
  const [retriggerSpinsWon, setRetriggerSpinsWon] = useState(0);

  // Handle overlay dismiss and start autoplay
  const handleOverlayDismiss = () => {
    setShowFreeSpinsOverlay(false);
    if (freeSpinsWon > 0) {
      setFreeSpins(freeSpinsWon);
      setTotalFreeSpinsAwarded(freeSpinsWon);
      setFreeSpinsActive(true);
      setAutoSpinning(true);
      setFreeSpinsTotalWin(0); // Reset total win tracking
    }
  };

  // Handle free spins complete overlay dismiss
  const handleFreeSpinsCompleteDismiss = () => {
    setShowFreeSpinsCompleteOverlay(false);
  };

  // Handle retrigger overlay dismiss
  const handleRetriggerDismiss = () => {
    setShowRetriggerOverlay(false);
    setFreeSpins(prev => prev + retriggerSpinsWon);
    setTotalFreeSpinsAwarded(prev => prev + retriggerSpinsWon);
    setAutoSpinning(true);
  };

  // Auto-spin through free spins
  useEffect(() => {
    if (autoSpinning && freeSpinsActive && freeSpins > 0 && !spinning && !showRetriggerOverlay) {
      const timer = setTimeout(() => {
        spin();
      }, 1000); // 1 second delay between spins
      return () => clearTimeout(timer);
    }
  }, [autoSpinning, freeSpinsActive, freeSpins, spinning, showRetriggerOverlay]);

  // Stop auto-spinning when free spins reach 0 and show complete overlay
  useEffect(() => {
    if (autoSpinning && freeSpins === 0 && freeSpinsActive) {
      setAutoSpinning(false);
      setFreeSpinsActive(false);
      setShowFreeSpinsCompleteOverlay(true);
    }
  }, [autoSpinning, freeSpins, freeSpinsActive]);

  // Reset grid when free spins end to clear sticky multipliers
  useEffect(() => {
    if (wasFreeSpinsActive.current && !freeSpinsActive && reels.length > 0) {
      const resetGrid = Array(NUM_REELS).fill(null).map(() =>
        generateReelSymbols(VISIBLE_SYMBOLS, false)
      );
      setReels(resetGrid);
      // Persist free spins total in win amount display
      setWinAmount(freeSpinsTotalWin);
      // Reset free spins total for next feature
      setFreeSpinsTotalWin(0);
    }
    wasFreeSpinsActive.current = freeSpinsActive;
  }, [freeSpinsActive, reels, freeSpinsTotalWin]);

  // Notify parent when free spins state changes
  useEffect(() => {
    if (onFreeSpinsChange) {
      onFreeSpinsChange(freeSpinsActive);
    }
  }, [freeSpinsActive, onFreeSpinsChange]);

  // Auto-spin logic
  useEffect(() => {
    if (autoBetActive && !spinning && !freeSpinsActive && balance >= bet) {
      const timer = setTimeout(() => {
        if (typeof autoBetSpins === 'number' && autoBetSpins > 0) {
          spin();
        } else if (autoBetSpins === '∞') {
          spin();
        }
      }, turboOn ? 400 : 800);
      return () => clearTimeout(timer);
    }
  }, [autoBetActive, spinning, freeSpinsActive, balance, bet, autoBetSpins, turboOn]);

  // Refs for the reels to control their animations
  const reelRefs = useRef<(HTMLDivElement | null)[]>(Array(NUM_REELS).fill(null));
  const wasFreeSpinsActive = useRef(false);


  // useEffect hook to initialize the grid with random symbols when the component mounts
  useEffect(() => {
    const initialGrid = Array(NUM_REELS).fill(null).map(() => 
      generateReelSymbols(VISIBLE_SYMBOLS)
    );
    setReels(initialGrid);
  }, []);

  // Function to generate a single random symbol
  const generateRandomSymbol = (freeSpinsActive: boolean = false, reelHasScatter: boolean = false): Symbol => {
    const rand = Math.random();
    const currentMultiplierChance = freeSpinsActive ? MULTIPLIER_CHANCE_FREE_SPINS : MULTIPLIER_CHANCE;
    // 0.5% chance for scatter (1 in 200 symbols), but limit to 1 per reel
    if (rand < SCATTER_CHANCE && !reelHasScatter) {
      return scatterSymbol;
    }
    // Chance for multiplier (higher during free spins)
    if (rand < SCATTER_CHANCE + currentMultiplierChance) {
      return multiplierSymbols[Math.floor(Math.random() * multiplierSymbols.length)];
    }
    return symbols[Math.floor(Math.random() * symbols.length)];
  };

  // Function to generate an array of random symbols for a reel
  const generateReelSymbols = (length: number = 100, freeSpinsActive: boolean = false, reelHasScatter: boolean = false): Symbol[] => {
    let hasScatter = false;
    return Array(length).fill(null).map(() => {
      const symbol = generateRandomSymbol(freeSpinsActive, reelHasScatter || hasScatter);
      if (symbol.id === 200) hasScatter = true;
      return symbol;
    });
  };

  // Function to animate a reel spinning
  const animateReel = (reel: HTMLDivElement | null, duration: number): Promise<void> => {
    return new Promise((resolve) => {
      if (!reel) {
        resolve();
        return;
      }

      const SYMBOL_HEIGHT = 85;
      const REEL_LENGTH = 100;
      const startPosition = (REEL_LENGTH - VISIBLE_SYMBOLS) * SYMBOL_HEIGHT;
      const endPosition = 0;
      const startTime = performance.now();

      const animate = (currentTime: number) => {
        const elapsedTime = currentTime - startTime;
        const progress = Math.min(elapsedTime / duration, 1);

        // Easing function for smooth deceleration
        const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
        const easedProgress = easeOutCubic(progress);

        const currentPosition = startPosition - (startPosition - endPosition) * easedProgress;
        reel.style.transform = `translateY(-${currentPosition}px)`;

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          resolve();
        }
      };

      requestAnimationFrame(animate);
    });
  };

  // Function to find clusters of matching symbols (multipliers act as wilds)
  const findClusters = (grid: Symbol[][]): { symbol: Symbol; positions: [number, number][] }[] => {
    const clusters: { symbol: Symbol; positions: [number, number][] }[] = [];
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

          // Check only orthogonal adjacent cells (up, down, left, right)
          queue.push([c + 1, r], [c - 1, r], [c, r + 1], [c, r - 1]);
        }

        if (cluster.length >= 5) {
          clusters.push({ symbol, positions: cluster });
        }
      }
    }

    return clusters;
  };

  // Function to count scatter symbols and determine free spins
  const countScatters = (grid: Symbol[][]): number => {
    let scatterCount = 0;
    for (let col = 0; col < NUM_REELS; col++) {
      for (let row = 0; row < VISIBLE_SYMBOLS; row++) {
        if (grid[col][row].isScatter) {
          scatterCount++;
        }
      }
    }
    return scatterCount;
  };

  // Function to determine free spins based on scatter count
  const getFreeSpinsFromScatters = (scatterCount: number): number => {
    switch (scatterCount) {
      case 4: return 10;
      case 5: return 12;
      case 6: return 15;
      case 7: return 30;
      default: return 0;
    }
  };

  // Function to calculate win from clusters with multipliers
  const calculateClusterWin = (clusters: { symbol: Symbol; positions: [number, number][] }[], grid: Symbol[][]): number => {
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
    const maxWin = bet * 5000;
    return Math.min(totalWin, maxWin);
  };

  // Function to remove cluster symbols and cascade
  const cascadeGrid = (grid: Symbol[][], clusterPositions: [number, number][], freeSpinsActive: boolean = false): { grid: Symbol[][], newSymbolPositions: Set<string>, slidingPositions: Set<string> } => {
    const newGrid = grid.map(col => [...col]);
    const newSymbolPositions = new Set<string>();
    const slidingPositions = new Set<string>();

    // Track multiplier positions to keep them stationary during free spins
    const multiplierPositions = new Map<string, Symbol>();
    if (freeSpinsActive) {
      for (let col = 0; col < NUM_REELS; col++) {
        for (let row = 0; row < VISIBLE_SYMBOLS; row++) {
          if (grid[col][row].isMultiplier) {
            multiplierPositions.set(getPositionKey(col, row), grid[col][row]);
          }
        }
      }
    }

    // Remove cluster symbols (but keep multipliers sticky during free spins)
    clusterPositions.forEach(([col, row]) => {
      const symbol = grid[col][row];
      // Don't remove multipliers during free spins (sticky multipliers)
      if (freeSpinsActive && symbol.isMultiplier) {
        return;
      }
      newGrid[col][row] = null as any;
    });

    // Cascade symbols down (preserve existing symbols)
    for (let col = 0; col < NUM_REELS; col++) {
      let writeRow = VISIBLE_SYMBOLS - 1;
      for (let row = VISIBLE_SYMBOLS - 1; row >= 0; row--) {
        const positionKey = getPositionKey(col, row);
        // Skip multipliers during free spins - they stay in place
        if (freeSpinsActive && multiplierPositions.has(positionKey)) {
          continue;
        }
        if (newGrid[col][row] !== null) {
          newGrid[col][writeRow] = newGrid[col][row];
          if (writeRow !== row) {
            // Symbol moved down - track the new position as sliding
            slidingPositions.add(getPositionKey(col, writeRow));
            newGrid[col][row] = null as any;
          }
          writeRow--;
        }
      }

      // Check if this reel already has a scatter (limit to 1 per reel)
      const reelHasScatter = newGrid[col].some(symbol => symbol && symbol.id === 200);

      // Fill empty spaces at top with new random symbols only
      for (let row = 0; row <= writeRow; row++) {
        newGrid[col][row] = generateRandomSymbol(freeSpinsActive, reelHasScatter);
        // Track positions that received new symbols
        newSymbolPositions.add(getPositionKey(col, row));
      }
    }

    // Restore multipliers to their exact original positions
    if (freeSpinsActive) {
      multiplierPositions.forEach((symbol, positionKey) => {
        const [col, row] = positionKey.split('-').map(Number);
        newGrid[col][row] = symbol;
      });
    }

    return { grid: newGrid, newSymbolPositions, slidingPositions };
  };

  // Get position key for tracking
  const getPositionKey = (col: number, row: number) => `${col}-${row}`;

  // Function to handle the spin action
  const spin = async () => {
    // Prevent spin if balance is insufficient (unless in free spins) or the machine is already spinning
    if (!freeSpinsActive && balance < bet || spinning) {
      return;
    }

    // Set spinning state to true and deduct the bet from the balance (unless free spins)
    setSpinning(true);
    if (!freeSpinsActive) {
      setBalance(prevBalance => prevBalance - bet);
    }
    setWinAmount(0);
    setLimitReached(false);
    setTotalWin(0);
    setHighlightedPositions(new Set());
    setExplodingPositions(new Set());
    setDroppingPositions(new Set());
    setSlidingPositions(new Set());
    setClusterWins([]);
    setCurrentTumbleWin(0);

    try {
      // Set spinning animation state
      setSpinning(true);

      // Check which reels already have scatters (limit to 1 per reel)
      const reelsWithScatter = new Set<number>();
      // Track multiplier positions during free spins (sticky multipliers)
      const multiplierPositions = new Map<number, number[]>(); // col -> rows with multipliers

      if (reels.length > 0) {
        reels.forEach((reel, colIndex) => {
          if (reel.some(symbol => symbol.id === 200)) {
            reelsWithScatter.add(colIndex);
          }
          // Track multiplier positions during free spins
          if (freeSpinsActive) {
            const rows: number[] = [];
            reel.forEach((symbol, rowIndex) => {
              if (symbol.isMultiplier && rowIndex < VISIBLE_SYMBOLS) {
                rows.push(rowIndex);
              }
            });
            if (rows.length > 0) {
              multiplierPositions.set(colIndex, rows);
            }
          }
        });
      }

      // Generate new reels with longer symbol arrays for animation
      const newReels = Array(NUM_REELS).fill(null).map((_, colIndex) => {
        if (freeSpinsActive && multiplierPositions.has(colIndex)) {
          // Preserve multipliers during free spins - keep them static in visible positions
          const preservedRows = multiplierPositions.get(colIndex)!;
          const reel = generateReelSymbols(100, freeSpinsActive, reelsWithScatter.has(colIndex));
          // Only preserve multipliers in the visible positions (0-6), let animation array spin
          preservedRows.forEach(row => {
            if (row < VISIBLE_SYMBOLS) {
              reel[row] = reels[colIndex][row]; // Preserve multiplier at this visible position
            }
          });
          return reel;
        } else {
          return generateReelSymbols(100, freeSpinsActive, reelsWithScatter.has(colIndex));
        }
      });
      setReels(newReels);

      // Animate the reels one by one from left to right
      const baseDuration = turboOn ? 400 : 800;
      const stagger = turboOn ? 50 : 100;
      const spinPromises = reelRefs.current.map((reel, index) =>
        animateReel(reel, baseDuration + index * stagger)
      );

      // Wait for all reels to finish spinning
      await Promise.all(spinPromises);

      // Reset transforms and extract the final visible symbols from each reel
      reelRefs.current.forEach(reel => {
        if (reel) {
          reel.style.transform = 'translateY(0)';
        }
      });
      
      const finalGrid = newReels.map(reel => reel.slice(0, VISIBLE_SYMBOLS));
      setReels(finalGrid);

      // Check for scatters and award free spins
      const scatterCount = countScatters(finalGrid);
      const freeSpinsAwarded = getFreeSpinsFromScatters(scatterCount);
      let gridWithMultiplier: Symbol[][] | null = null;
      if (freeSpinsAwarded > 0) {
        if (freeSpinsActive && scatterCount >= 4) {
          // During free spins, 4+ scatters award retrigger
          setAutoSpinning(false);
          setRetriggerSpinsWon(freeSpinsAwarded);
          setShowRetriggerOverlay(true);
        } else {
          // Initial free spin award - guarantee at least 1 multiplier
          setFreeSpins(prev => prev + freeSpinsAwarded);
          setFreeSpinsActive(true);

          // Add at least 1 random multiplier to the grid
          gridWithMultiplier = finalGrid.map(col => [...col]);
          let multiplierAdded = false;
          while (!multiplierAdded) {
            const randomCol = Math.floor(Math.random() * NUM_REELS);
            const randomRow = Math.floor(Math.random() * VISIBLE_SYMBOLS);
            // Don't replace scatter symbols
            if (!gridWithMultiplier[randomCol][randomRow].isScatter) {
              const randomMultiplier = multiplierSymbols[Math.floor(Math.random() * multiplierSymbols.length)];
              gridWithMultiplier[randomCol][randomRow] = randomMultiplier;
              multiplierAdded = true;
            }
          }
          setReels(gridWithMultiplier);
        }
      }

      // Start cascading logic
      let currentGrid = (gridWithMultiplier || finalGrid).map(col => [...col]);
      let cascadeWin = 0;
      let cascadeCount = 0;

      const processCascades = async () => {
        // Prevent infinite cascades
        if (cascadeCount >= MAX_CASCADES) {
          setTumbling(false);
          return;
        }

        const clusters = findClusters(currentGrid);

        if (clusters.length > 0) {
          setTumbling(true);
          const win = calculateClusterWin(clusters, currentGrid);
          cascadeWin += win;
          setWinAmount(cascadeWin);
          setTotalWin(cascadeWin);

          // Get all cluster positions
          const allPositions = clusters.flatMap(c => c.positions);
          const positionKeys = new Set(allPositions.map(([col, row]) => getPositionKey(col, row)));

          // Step 1: Highlight winning clusters and show win amount
          setHighlightedPositions(positionKeys);
          setCurrentTumbleWin(win);
          setClusterWins(prev => [...prev, win]);
          await new Promise(resolve => setTimeout(resolve, turboOn ? 200 : 600));

          // Step 2: Explosion animation
          setHighlightedPositions(new Set());
          setExplodingPositions(positionKeys);
          await new Promise(resolve => setTimeout(resolve, turboOn ? 200 : 600));

          // Step 3: Remove symbols and cascade
          setExplodingPositions(new Set());
          const cascadeResult = cascadeGrid(currentGrid, allPositions, freeSpinsActive);
          currentGrid = cascadeResult.grid;

          // Only animate drop for positions that got new symbols (top filled positions)
          setDroppingPositions(cascadeResult.newSymbolPositions);
          // Animate slide for symbols that moved down
          setSlidingPositions(cascadeResult.slidingPositions);

          setReels(currentGrid.map(col => [...col]));
          setGridVersion(prev => prev + 1);

          // Wait for drop animation
          await new Promise(resolve => setTimeout(resolve, turboOn ? 400 : 1200));
          setDroppingPositions(new Set());
          setSlidingPositions(new Set());

          cascadeCount++;
          await processCascades();
        } else {
          setTumbling(false);
          setCurrentTumbleWin(0);
        }
      };

      await processCascades();

      // Update balance with total win (capped at 5,000x bet)
      const maxTotalWin = bet * 5000;
      const finalWin = Math.min(cascadeWin, maxTotalWin);
      if (finalWin > 0) {
        setBalance(prevBalance => prevBalance + finalWin);
        setWinAmount(finalWin);
        // Check if win was capped (limit reached)
        setLimitReached(cascadeWin > maxTotalWin);
        // Track total win during free spins
        if (freeSpinsActive) {
          setFreeSpinsTotalWin(prev => prev + finalWin);
        }
      } else {
        setLimitReached(false);
      }
      setCurrentTumbleWin(0);

      // Handle free spins decrement
      if (freeSpinsActive) {
        setFreeSpins(prev => {
          const newFreeSpins = prev - 1;
          if (newFreeSpins <= 0) {
            setFreeSpinsActive(false);
            return 0;
          }
          return newFreeSpins;
        });
      }
    } catch (error) {
      // Handle any errors during the spin
      console.error('Error:', error);
      setWinAmount(0);
      setLimitReached(false);
    } finally {
      // Reset spinning state
      setSpinning(false);

      // Decrement auto spin counter
      if (autoBetActive && typeof autoBetSpins === 'number') {
        setAutoBetSpins(prev => {
          if (typeof prev === 'number' && prev > 0) {
            const newSpins = prev - 1;
            if (newSpins <= 0) {
              setAutoBetActive(false);
              setAutoOn(false);
              return 0;
            }
            return newSpins;
          }
          return prev;
        });
      }
    }
  };


  return (
    <div className="slot-machine">
      {/* Free Spins Overlay */}
      {showFreeSpinsOverlay && (
        <div
          className="free-spins-overlay"
          onClick={handleOverlayDismiss}
        >
          <div className="free-spins-overlay-content">
            <div className="free-spins-overlay-title">{scatterCountWon} SCATTERS!</div>
            <div className="free-spins-overlay-amount">{freeSpinsWon} FREE SPINS</div>
            <div className="free-spins-overlay-subtitle">PRESS ANYWHERE TO CONTINUE</div>
          </div>
        </div>
      )}

      {/* Main Game Area */}
      <div className="game-area">
        {/* Game Board Wrapper */}
        <div className="game-board-wrapper">
          {/* Free Spins Display Bar */}
          {freeSpinsActive && freeSpins > 0 && (
            <FreeSpinsBar freeSpins={freeSpins} />
          )}

          {/* Game Board */}
          <div className="reels">
          {reels.map((reel, reelIndex) => (
            <div key={reelIndex} className="reel">
              <div className="reel-container" ref={el => reelRefs.current[reelIndex] = el}>
                {reel.map((symbol, symbolIndex) => {
                  const positionKey = getPositionKey(reelIndex, symbolIndex);
                  const isHighlighted = highlightedPositions.has(positionKey);
                  const isExploding = explodingPositions.has(positionKey);
                  const isDropping = droppingPositions.has(positionKey);
                  const isSliding = slidingPositions.has(positionKey);

                  // Skip rendering sticky multipliers in the reel during free spins - they render in overlay
                  const isStickyMultiplier = symbol.isMultiplier && freeSpinsActive;
                  if (isStickyMultiplier) {
                    return (
                      <div
                        key={`placeholder-${reelIndex}-${symbolIndex}`}
                        className="symbol-cell multiplier-placeholder"
                      />
                    );
                  }

                  const key = `${reelIndex}-${symbolIndex}-${symbol.id}-${gridVersion}`;

                  return (
                    <div
                      key={key}
                      className={`symbol-cell
                        ${symbol.isMultiplier ? 'multiplier' : ''}
                        ${symbol.isScatter ? 'scatter' : ''}
                        ${isHighlighted ? 'cluster-highlight' : ''}
                        ${isExploding ? 'cluster-explode' : ''}
                        ${isDropping ? 'cascade-drop' : ''}
                        ${isSliding ? 'cascade-slide' : ''}
                      `}
                    >
                      <SymbolAsset symbolId={symbol.id} />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Sticky Multiplier Overlay - renders separately to avoid reel animation */}
        {freeSpinsActive && (
          <div className="sticky-multiplier-overlay">
            {reels.map((reel, reelIndex) =>
              reel.map((symbol, symbolIndex) => {
                if (!symbol.isMultiplier || symbolIndex >= VISIBLE_SYMBOLS) return null;

                const positionKey = getPositionKey(reelIndex, symbolIndex);
                const isHighlighted = highlightedPositions.has(positionKey);
                const isExploding = explodingPositions.has(positionKey);

                return (
                  <div
                    key={`sticky-overlay-${reelIndex}-${symbolIndex}`}
                    className="sticky-multiplier-cell"
                    style={{
                      left: `${reelIndex * 114 + 6}px`,
                      top: `${symbolIndex * 85}px`,
                    }}
                  >
                    <div
                      className={`symbol-cell multiplier sticky-multiplier
                        ${isHighlighted ? 'cluster-highlight' : ''}
                        ${isExploding ? 'cluster-explode' : ''}
                      `}
                    >
                      <SymbolAsset symbolId={symbol.id} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Free Spins Complete Overlay */}
        {showFreeSpinsCompleteOverlay && (
          <div
            className="free-spins-complete-overlay"
            onClick={handleFreeSpinsCompleteDismiss}
          >
            <div className="free-spins-complete-content">
              <div className="free-spins-complete-title">FREE SPINS COMPLETE</div>
              <div className="free-spins-complete-win-label">{totalFreeSpinsAwarded} SPINS PLAYED</div>
              <div className="free-spins-complete-subtitle">TOTAL WIN</div>
              <div className="free-spins-complete-win-amount">${freeSpinsTotalWin.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              <div className="free-spins-complete-subtitle" style={{marginTop: '8px'}}>PRESS ANYWHERE TO CONTINUE</div>
            </div>
          </div>
        )}

        {/* Retrigger Overlay */}
        {showRetriggerOverlay && (
          <div
            className="free-spins-overlay"
            onClick={handleRetriggerDismiss}
          >
            <div className="free-spins-overlay-content">
              <div className="free-spins-overlay-title">RETRIGGER!</div>
              <div className="free-spins-overlay-amount">{retriggerSpinsWon} FREE SPINS</div>
              <div className="free-spins-overlay-subtitle">PRESS ANYWHERE TO CONTINUE</div>
            </div>
          </div>
        )}
        </div>

        {/* Game Bar - All controls at bottom */}
        <div className="game-bar">
          <GameBarLeft 
            onMenuClick={() => setHamburgerOpen(!hamburgerOpen)} 
            onBonusBuyClick={() => setBonusBuyOpen(true)}
          />
          <GameBarMiddle balance={balance} winAmount={winAmount} freeSpinsTotalWin={freeSpinsTotalWin} freeSpinsActive={freeSpinsActive} limitReached={limitReached} />
          <GameBarRight
            spinning={spinning}
            turboOn={turboOn}
            autoOn={autoOn}
            autoBetSpins={autoBetSpins}
            bet={bet}
            onSpin={spin}
            onToggleTurbo={() => setTurboOn(!turboOn)}
            onToggleAuto={() => {
              if (autoBetActive) {
                setAutoBetActive(false);
                setAutoOn(false);
              } else {
                setAutoBetOpen(true);
              }
            }}
            onBetChange={setBet}
            onBetMenuOpen={() => setBetMenuOpen(true)}
            disabled={spinning || balance < bet}
          />
        </div>
      </div>

      {/* Auto Spin Popup */}
      {autoBetOpen && (
        <div className="auto-spin-popup">
          <button className="auto-spin-popup-close" onClick={() => setAutoBetOpen(false)}>
            <CloseIcon />
          </button>
          <div className="bonus-buy-title">AUTO SPINS</div>
          <div className="bonus-buy-options">
            {[10, 20, 50, 100, '∞'].map((spins) => (
              <button
                key={spins}
                className={`bonus-buy-option ${autoBetSpins === spins ? 'active' : ''}`}
                onClick={() => {
                  setAutoBetSpins(spins as any);
                  setAutoBetActive(true);
                  setAutoOn(true);
                  setAutoBetOpen(false);
                }}
              >
                <div className="bonus-buy-option-name">{spins}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Hamburger Menu Modal */}
      {hamburgerOpen && (
        <div className="hamburger-popup">
          <div className="hamburger-menu-items">
            <button className="hamburger-close" onClick={() => setHamburgerOpen(false)}>
              <CloseIcon />
            </button>
            <button
              className="hamburger-menu-item"
              onClick={() => {
                setHamburgerOpen(false);
                setInfoOpen(true);
              }}
            >
              <InfoIcon />
              <span>Info</span>
            </button>
            <button
              className={`hamburger-menu-item ${soundOn ? 'active' : ''}`}
              onClick={() => setSoundOn(!soundOn)}
            >
              <SoundIcon on={soundOn} />
              <span>Sound</span>
            </button>
          </div>
        </div>
      )}

      {/* Bet Menu Modal */}
      {betMenuOpen && (
        <div className="bet-popup">
          <button className="bet-popup-close" onClick={() => setBetMenuOpen(false)}>
            <CloseIcon />
          </button>
          <div className="bet-options">
            {[0.1, 0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500, 1000].map((betOption) => (
              <button
                key={betOption}
                className={`bet-option ${bet === betOption ? 'active' : ''}`}
                onClick={() => {
                  setBet(betOption);
                  setBetMenuOpen(false);
                }}
              >
                ${betOption}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Bonus Buy Modal */}
      {bonusBuyOpen && (
        <div className="bonus-buy-popup">
          <button className="bonus-buy-popup-close" onClick={() => setBonusBuyOpen(false)}>
            <CloseIcon />
          </button>
          <div className="bonus-buy-title">BONUS BUY</div>
          <div className="bonus-buy-options">
            <button
              className="bonus-buy-option"
              disabled={balance < bet * 100}
              onClick={() => {
                setBalance(prev => prev - bet * 100);
                setFreeSpins(10);
                setTotalFreeSpinsAwarded(10);
                setFreeSpinsActive(true);
                setAutoSpinning(true);
                setFreeSpinsTotalWin(0);
                setBonusBuyOpen(false);
              }}
            >
              <div className="bonus-buy-option-name">10 FREE SPINS</div>
              <div className="bonus-buy-option-price">100x BET</div>
            </button>
            <button
              className="bonus-buy-option"
              disabled={balance < bet * 200}
              onClick={() => {
                setBalance(prev => prev - bet * 200);
                setFreeSpins(15);
                setTotalFreeSpinsAwarded(15);
                setFreeSpinsActive(true);
                setAutoSpinning(true);
                setFreeSpinsTotalWin(0);
                setBonusBuyOpen(false);
              }}
            >
              <div className="bonus-buy-option-name">15 FREE SPINS</div>
              <div className="bonus-buy-option-price">200x BET</div>
            </button>
          </div>
        </div>
      )}

      {/* Info Modal */}
      <InfoModal isOpen={infoOpen} onClose={() => setInfoOpen(false)} />
    </div>
  );
});

SlotMachine.displayName = 'SlotMachine';

export default SlotMachine;