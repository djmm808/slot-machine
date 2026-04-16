#!/usr/bin/env python3
"""
Comprehensive RTP Calculation Script for Slot Machine
Calculates Global KPIs, Base Game Metrics, and Bonus Game Metrics
Uses provably fair random generation matching game implementation

This script is aligned 1:1 with SlotMachine.tsx game logic:
- Symbol values: ☄️ 0.228, ⭐ 0.326, 🪐 0.439, 🌙 0.558, 🌞 0.687, 🌌 0.825 (balanced for target RTP)
- Multiplier selection weights match (60% 2x, 32% 5x, 8% 10x)
- Cluster finding uses BFS with orthogonal adjacency (6+ symbols required)
- Win calculation: base win * multiplier (cluster + adjacent multipliers)
- Cascade logic: remove symbols, cascade down, fill from top
- Sticky multipliers during free spins (preserved in position)
- Scatter chance: 0.84% (adjusted for target RTP)
- Free spins multiplier chance: 0.15% (reduced to control max win frequency)
- Free spins: 3=7, 4=9, 5=11, 6=13, 7=16 scatters (adjusted for target RTP)
- First free spin uses initial grid with added multiplier (not regenerated)
- Bonus ends immediately when 5000x limit is reached
- Max win capped at 5000x bet
- Target RTP: 96% (70% base, 26% bonus) with 1-2 max wins per million
"""

import hashlib
import math
from collections import defaultdict, deque
from typing import List, Dict, Tuple, Set
import statistics
import numpy as np

# Game Configuration
NUM_REELS = 7
VISIBLE_SYMBOLS = 7
MAX_CASCADES = 100
BET_AMOUNT = 1000
MAX_WIN_MULTIPLIER = 5000

# Symbol probabilities (adjusted for target RTP)
MULTIPLIER_CHANCE = 0.00009  # 0.009% chance for multiplier in base game
MULTIPLIER_CHANCE_FREE_SPINS = 0.0022  # 0.15% chance for multiplier during free spins (reduced for balance)
SCATTER_CHANCE = 0.0084  # 0.84% chance for scatter (adjusted for target RTP)

# Symbol definitions
class Symbol:
    def __init__(self, id: int, name: str, value: float, is_multiplier: bool = False, 
                 multiplier: int = 0, is_scatter: bool = False):
        self.id = id
        self.name = name
        self.value = value
        self.is_multiplier = is_multiplier
        self.multiplier = multiplier
        self.is_scatter = is_scatter

# Regular symbols (matching game implementation)
symbols = [
    Symbol(1, '☄️', 0.228),
    Symbol(2, '⭐', 0.326),
    Symbol(3, '🪐', 0.439),
    Symbol(4, '🌙', 0.558),
    Symbol(5, '🌞', 0.687),
    Symbol(6, '🌌', 0.825),
]

# Multiplier symbols (matching game implementation)
multiplier_symbols = [
    Symbol(100, '2️⃣', 0, True, 2),
    Symbol(101, '5️⃣', 0, True, 5),
    Symbol(102, '🔟', 0, True, 10),
]

# Scatter symbol
scatter_symbol = Symbol(200, '💫', 0, False, 0, True)

def get_random_multiplier() -> Symbol:
    """Weighted multiplier selection (matching game implementation)"""
    rand = rng.seeded_random()
    if rand < 0.60:
        return multiplier_symbols[0]  # 60% chance for 2x
    elif rand < 0.92:
        return multiplier_symbols[1]  # 32% chance for 5x
    else:
        return multiplier_symbols[2]  # 8% chance for 10x

# Provably fair random number generator with vectorized batch generation
class ProvablyFairRNG:
    def __init__(self, client_seed: str):
        self.client_seed = client_seed
        self.nonce = 0
        self.index = 0
    
    def seeded_random(self) -> float:
        """Generate deterministic random number from client seed, nonce, and index"""
        data = f"{self.client_seed}{self.nonce}{self.index}".encode('utf-8')
        hash_bytes = hashlib.sha256(data).digest()
        # Convert first 4 bytes to a number between 0 and 1
        value = (hash_bytes[0] * 0x1000000 + hash_bytes[1] * 0x10000 + 
                hash_bytes[2] * 0x100 + hash_bytes[3]) / 0xffffffff
        self.index += 1
        return value
    
    def seeded_random_batch(self, size: int) -> np.ndarray:
        """Generate batch of random numbers using vectorized NumPy operations"""
        # Prepare all data strings at once
        data_strings = [f"{self.client_seed}{self.nonce}{self.index + i}".encode('utf-8') for i in range(size)]
        
        # Hash all at once using list comprehension (faster than loop)
        hash_bytes_list = [hashlib.sha256(data).digest() for data in data_strings]
        
        # Convert to NumPy array and vectorize the conversion
        hash_array = np.frombuffer(b''.join(hash_bytes_list), dtype=np.uint8)
        
        # Vectorized conversion to float values
        # Take first 4 bytes of each hash (32 bytes total, so 8 values per hash)
        # We only need the first 4 bytes for each hash
        first_bytes = hash_array.reshape(-1, 32)[:size, :4]
        
        # Convert to uint32 for computation to avoid overflow
        first_bytes_uint32 = first_bytes.astype(np.uint32)
        
        # Vectorized computation
        values = (first_bytes_uint32[:, 0] * 0x1000000 + 
                 first_bytes_uint32[:, 1] * 0x10000 + 
                 first_bytes_uint32[:, 2] * 0x100 + 
                 first_bytes_uint32[:, 3]) / 0xffffffff
        
        self.index += size
        return values.astype(np.float64)
    
    def increment_nonce(self):
        """Increment nonce for next spin"""
        self.nonce += 1
        self.index = 0

# Global RNG instance
rng = ProvablyFairRNG("test_seed_for_simulation")

def generate_random_symbol(free_spins_active: bool = False, reel_has_scatter: bool = False) -> Symbol:
    """Generate a random symbol based on probabilities"""
    rand = rng.seeded_random()
    current_multiplier_chance = MULTIPLIER_CHANCE_FREE_SPINS if free_spins_active else MULTIPLIER_CHANCE
    
    if rand < SCATTER_CHANCE and not reel_has_scatter:
        return scatter_symbol
    if rand < SCATTER_CHANCE + current_multiplier_chance:
        return get_random_multiplier()
    rand = rng.seeded_random()
    return symbols[int(rand * len(symbols))]

def generate_grid(free_spins_active: bool = False) -> List[List[Symbol]]:
    """Generate a 7x7 grid of symbols using batch random generation"""
    # Generate random numbers: up to 2 per symbol (type + selection) = 98 values
    total_symbols = NUM_REELS * VISIBLE_SYMBOLS
    random_values = rng.seeded_random_batch(total_symbols * 2)
    
    grid = []
    value_idx = 0
    current_multiplier_chance = MULTIPLIER_CHANCE_FREE_SPINS if free_spins_active else MULTIPLIER_CHANCE
    symbols_len = len(symbols)  # Pre-compute for speed
    
    for col in range(NUM_REELS):
        column = []
        reel_has_scatter = False
        for row in range(VISIBLE_SYMBOLS):
            rand = random_values[value_idx]
            value_idx += 1
            
            if rand < SCATTER_CHANCE and not reel_has_scatter:
                symbol = scatter_symbol
                reel_has_scatter = True
            elif rand < SCATTER_CHANCE + current_multiplier_chance:
                symbol = get_random_multiplier()
            else:
                # Use another random value for symbol selection
                symbol_rand = random_values[value_idx]
                value_idx += 1
                symbol = symbols[int(symbol_rand * symbols_len)]
            
            column.append(symbol)
        grid.append(column)
    return grid

def find_clusters(grid: List[List[Symbol]]) -> List[Dict]:
    """Find clusters of 6+ matching symbols using BFS (optimized with deque)"""
    clusters = []
    visited = set()
    num_reels_local = NUM_REELS  # Local var for speed
    visible_symbols_local = VISIBLE_SYMBOLS
    
    for col in range(num_reels_local):
        for row in range(visible_symbols_local):
            key = f"{col},{row}"
            if key in visited:
                continue
            
            symbol = grid[col][row]
            if symbol.is_multiplier or symbol.is_scatter:
                continue
            
            cluster_positions = []
            queue = deque([(col, row)])  # Use deque for O(1) popleft
            
            while queue:
                c, r = queue.popleft()  # O(1) instead of pop(0)
                current_key = f"{c},{r}"
                if current_key in visited:
                    continue
                if c < 0 or c >= num_reels_local or r < 0 or r >= visible_symbols_local:
                    continue
                
                current_symbol = grid[c][r]
                if current_symbol.id != symbol.id and not current_symbol.is_multiplier:
                    continue
                
                visited.add(current_key)
                cluster_positions.append((c, r))
                
                # Check orthogonal adjacent cells
                queue.extend([(c + 1, r), (c - 1, r), (c, r + 1), (c, r - 1)])
            
            if len(cluster_positions) >= 6:
                clusters.append({'symbol': symbol, 'positions': cluster_positions})
    
    return clusters

def calculate_cluster_win(clusters: List[Dict], grid: List[List[Symbol]], bet: int) -> float:
    """Calculate win from clusters with multipliers"""
    total_win = 0
    
    for cluster in clusters:
        # Count only actual symbols (not multipliers) for base win
        actual_symbol_count = sum(
            1 for col, row in cluster['positions'] 
            if not grid[col][row].is_multiplier
        )
        
        base_win = cluster['symbol'].value * actual_symbol_count * bet
        
        # Find multipliers: both in the cluster and adjacent to it
        total_multiplier = 1
        for col, row in cluster['positions']:
            symbol = grid[col][row]
            if symbol.is_multiplier and symbol.multiplier:
                total_multiplier *= symbol.multiplier
            
            # Check orthogonal adjacent cells for additional multipliers
            for c, r in [(col + 1, row), (col - 1, row), (col, row + 1), (col, row - 1)]:
                if 0 <= c < NUM_REELS and 0 <= r < VISIBLE_SYMBOLS:
                    adj_symbol = grid[c][r]
                    if (adj_symbol.is_multiplier and adj_symbol.multiplier and 
                        not any(pc == c and pr == r for pc, pr in cluster['positions'])):
                        total_multiplier *= adj_symbol.multiplier
        
        total_win += base_win * total_multiplier
    
    # Cap max win at 5,000x bet
    max_win = bet * MAX_WIN_MULTIPLIER
    return min(total_win, max_win)

def cascade_grid(grid: List[List[Symbol]], cluster_positions: List[Tuple[int, int]], 
                free_spins_active: bool) -> List[List[Symbol]]:
    """Remove cluster symbols and cascade new ones"""
    new_grid = [col[:] for col in grid]
    
    # Track multiplier positions to keep them sticky during free spins
    multiplier_positions = {}
    if free_spins_active:
        for col in range(NUM_REELS):
            for row in range(VISIBLE_SYMBOLS):
                if grid[col][row].is_multiplier:
                    multiplier_positions[f"{col}-{row}"] = grid[col][row]
    
    # Remove cluster symbols (but keep multipliers sticky during free spins)
    for col, row in cluster_positions:
        if not (free_spins_active and grid[col][row].is_multiplier):
            new_grid[col][row] = None
    
    # Cascade symbols down
    for col in range(NUM_REELS):
        write_row = VISIBLE_SYMBOLS - 1
        for row in range(VISIBLE_SYMBOLS - 1, -1, -1):
            position_key = f"{col}-{row}"
            if free_spins_active and position_key in multiplier_positions:
                continue
            if new_grid[col][row] is not None:
                new_grid[col][write_row] = new_grid[col][row]
                if write_row != row:
                    new_grid[col][row] = None
                write_row -= 1
        
        # Check if this reel already has a scatter
        reel_has_scatter = any(s and s.is_scatter for s in new_grid[col])
        
        # Fill empty spaces at top with new random symbols
        for row in range(write_row + 1):
            new_grid[col][row] = generate_random_symbol(free_spins_active, reel_has_scatter)
    
    # Restore multipliers to their exact original positions
    if free_spins_active:
        for position_key, symbol in multiplier_positions.items():
            col, row = map(int, position_key.split('-'))
            new_grid[col][row] = symbol
    
    return new_grid

def get_free_spins_from_scatters(count: int) -> int:
    """Determine free spins awarded based on scatter count (adjusted for target RTP)"""
    free_spins_map = {3: 7, 4: 9, 5: 11, 6: 13, 7: 16}
    return free_spins_map.get(count, 0)

def count_scatters(grid: List[List[Symbol]]) -> int:
    """Count total scatter symbols in grid"""
    return sum(1 for col in grid for symbol in col if symbol.is_scatter)

def run_single_spin(bet: int) -> Dict:
    """Run a single spin and return detailed metrics"""
    rng.increment_nonce()  # Increment nonce for each spin (provably fair)
    grid = generate_grid(False)
    cascade_win = 0
    cascade_count = 0
    limit_reached = False
    cluster_wins = []
    
    # Base game cascades
    while cascade_count < MAX_CASCADES and not limit_reached:
        clusters = find_clusters(grid)
        if not clusters:
            break
        
        win = calculate_cluster_win(clusters, grid, bet)
        cluster_wins.append(win)
        
        # Cap win accumulation
        max_total_win = bet * MAX_WIN_MULTIPLIER
        if cascade_win + win > max_total_win:
            cascade_win = max_total_win
            limit_reached = True
        else:
            cascade_win += win
        
        grid = cascade_grid(grid, [pos for cluster in clusters for pos in cluster['positions']], False)
        cascade_count += 1
    
    # Final win capping
    final_base_win = min(cascade_win, bet * MAX_WIN_MULTIPLIER)
    
    # Check for bonus trigger
    scatter_count = count_scatters(grid)
    bonus_triggered = scatter_count >= 3
    
    bonus_result = None
    if bonus_triggered:
        bonus_result = run_bonus_game(grid, scatter_count, bet)
    
    return {
        'base_win': final_base_win,
        'base_cascades': cascade_count,
        'base_cluster_wins': cluster_wins,
        'scatter_count': scatter_count,
        'bonus_triggered': bonus_triggered,
        'bonus_result': bonus_result,
        'limit_reached': limit_reached
    }

def run_bonus_game(initial_grid: List[List[Symbol]], scatter_count: int, bet: int) -> Dict:
    """Run the bonus game (free spins)"""
    fs_count = get_free_spins_from_scatters(scatter_count)
    free_spins_total_win = 0
    fs_grid = [col[:] for col in initial_grid]
    
    # Remove existing multipliers and add exactly 1
    for col in range(NUM_REELS):
        for row in range(VISIBLE_SYMBOLS):
            if fs_grid[col][row].is_multiplier:
                fs_grid[col][row] = symbols[int(rng.seeded_random() * len(symbols))]
    
    # Add exactly 1 random multiplier
    added = False
    while not added:
        rc = int(rng.seeded_random() * NUM_REELS)
        rr = int(rng.seeded_random() * VISIBLE_SYMBOLS)
        if not fs_grid[rc][rr].is_scatter:
            fs_grid[rc][rr] = get_random_multiplier()
            added = True
    
    # Track bonus metrics
    bonus_spin_wins = []
    retriggers = 0
    max_bonus_spin_win = 0
    bonus_ended_early = False
    
    # Free spins with sticky multipliers
    for fs in range(fs_count):
        # Skip grid regeneration for first spin - use initial grid with added multiplier
        if fs > 0:
            # Track multiplier positions to keep them sticky
            multiplier_positions = {}
            for c in range(NUM_REELS):
                for r in range(VISIBLE_SYMBOLS):
                    if fs_grid[c][r].is_multiplier:
                        multiplier_positions[f"{c}-{r}"] = fs_grid[c][r]
            
            # Generate new grid preserving sticky multipliers
            new_fs_grid = []
            for c in range(NUM_REELS):
                reel_has_scatter = any(s and s.is_scatter for s in fs_grid[c])
                column = []
                for r in range(VISIBLE_SYMBOLS):
                    key = f"{c}-{r}"
                    if key in multiplier_positions:
                        column.append(multiplier_positions[key])
                    else:
                        column.append(generate_random_symbol(True, reel_has_scatter))
                new_fs_grid.append(column)
            fs_grid = new_fs_grid
        
        # Cascades
        fs_cascade_win = 0
        fs_cascade_count = 0
        fs_limit_reached = False
        
        while fs_cascade_count < MAX_CASCADES and not fs_limit_reached:
            clusters = find_clusters(fs_grid)
            if not clusters:
                break
            
            win = calculate_cluster_win(clusters, fs_grid, bet)
            
            max_fs_win = bet * MAX_WIN_MULTIPLIER
            if fs_cascade_win + win > max_fs_win:
                fs_cascade_win = max_fs_win
                fs_limit_reached = True
            else:
                fs_cascade_win += win
            
            fs_grid = cascade_grid(fs_grid, [pos for cluster in clusters for pos in cluster['positions']], True)
            fs_cascade_count += 1
        
        # Cap individual spin win
        fs_final_spin_win = min(fs_cascade_win, bet * MAX_WIN_MULTIPLIER)
        bonus_spin_wins.append(fs_final_spin_win)
        max_bonus_spin_win = max(max_bonus_spin_win, fs_final_spin_win)
        
        # Add to total (capped at 5000x)
        free_spins_total_win = min(free_spins_total_win + fs_final_spin_win, bet * MAX_WIN_MULTIPLIER)
        
        # If limit reached, end free spins immediately (matching game logic)
        if fs_limit_reached:
            bonus_ended_early = True
            break
        
        # Check for retrigger
        fs_scatter_count = count_scatters(fs_grid)
        if fs_scatter_count >= 3:
            additional_fs = get_free_spins_from_scatters(fs_scatter_count)
            fs_count += additional_fs
            retriggers += 1
    
    return {
        'total_win': free_spins_total_win,
        'spins_played': len(bonus_spin_wins),  # Actual spins played (may be less if ended early)
        'spin_wins': bonus_spin_wins,
        'retriggers': retriggers,
        'max_spin_win': max_bonus_spin_win,
        'ended_early': bonus_ended_early
    }

def calculate_volatility(values: List[float]) -> float:
    """Calculate standard deviation (volatility)"""
    if len(values) < 2:
        return 0.0
    return statistics.stdev(values)

def calculate_percentile(values: List[float], percentile: float) -> float:
    """Calculate percentile value"""
    if not values:
        return 0.0
    sorted_values = sorted(values)
    index = int(len(sorted_values) * percentile / 100)
    return sorted_values[min(index, len(sorted_values) - 1)]

def run_simulation(num_spins: int = 100000):
    """Run comprehensive simulation with all metrics"""
    print(f"🎰 Running {num_spins:,} spin simulation...")
    print("=" * 80)
    
    # Initialize tracking variables
    total_bet = 0
    total_base_win = 0
    total_bonus_win = 0
    
    base_spin_wins = []
    bonus_total_wins = []
    all_spin_wins = []
    
    bonus_triggers = 0
    total_bonus_spins = 0
    total_retriggers = 0
    
    base_hits = 0
    dead_spins = 0
    
    scatter_distribution = defaultdict(int)
    win_size_distribution = defaultdict(int)
    bonus_win_distribution = defaultdict(int)
    
    max_win = 0
    max_base_win = 0
    max_bonus_win = 0
    five_k_hits = 0
    
    for i in range(num_spins):
        if (i + 1) % 10000 == 0:
            print(f"  Progress: {i + 1:,} / {num_spins:,} spins...")
        
        result = run_single_spin(BET_AMOUNT)
        total_bet += BET_AMOUNT
        
        base_win = result['base_win']
        total_base_win += base_win
        base_spin_wins.append(base_win)
        
        total_spin_win = base_win
        
        # Track base game metrics
        if base_win > 0:
            base_hits += 1
            win_size_x = base_win / BET_AMOUNT
            if win_size_x < 1:
                win_size_distribution['<1x'] += 1
            elif win_size_x < 5:
                win_size_distribution['1-5x'] += 1
            elif win_size_x < 10:
                win_size_distribution['5-10x'] += 1
            elif win_size_x < 50:
                win_size_distribution['10-50x'] += 1
            elif win_size_x < 100:
                win_size_distribution['50-100x'] += 1
            elif win_size_x < 500:
                win_size_distribution['100-500x'] += 1
            else:
                win_size_distribution['500x+'] += 1
        else:
            dead_spins += 1
        
        # Track scatter distribution
        scatter_distribution[result['scatter_count']] += 1
        
        # Track max wins
        if base_win > max_base_win:
            max_base_win = base_win
        if base_win >= BET_AMOUNT * MAX_WIN_MULTIPLIER:
            five_k_hits += 1
        
        # Bonus game
        if result['bonus_triggered']:
            bonus_triggers += 1
            bonus_result = result['bonus_result']
            
            bonus_win = bonus_result['total_win']
            total_bonus_win += bonus_win
            bonus_total_wins.append(bonus_win)
            total_bonus_spins += bonus_result['spins_played']
            total_retriggers += bonus_result['retriggers']
            
            total_spin_win += bonus_win
            
            # Track bonus win distribution
            bonus_win_x = bonus_win / BET_AMOUNT
            if bonus_win_x < 10:
                bonus_win_distribution['<10x'] += 1
            elif bonus_win_x < 50:
                bonus_win_distribution['10-50x'] += 1
            elif bonus_win_x < 100:
                bonus_win_distribution['50-100x'] += 1
            elif bonus_win_x < 500:
                bonus_win_distribution['100-500x'] += 1
            elif bonus_win_x < 1000:
                bonus_win_distribution['500-1000x'] += 1
            elif bonus_win_x < 5000:
                bonus_win_distribution['1000-5000x'] += 1
            else:
                bonus_win_distribution['5000x'] += 1
            
            if bonus_win > max_bonus_win:
                max_bonus_win = bonus_win
            if bonus_win >= BET_AMOUNT * MAX_WIN_MULTIPLIER:
                five_k_hits += 1
        
        all_spin_wins.append(total_spin_win)
        
        if total_spin_win > max_win:
            max_win = total_spin_win
    
    final_total_win = total_base_win + total_bonus_win
    
    # Calculate metrics
    print("\n" + "=" * 80)
    print("🎰 GLOBAL KPIS")
    print("=" * 80)
    
    # RTP
    overall_rtp = (final_total_win / total_bet) * 100
    base_rtp = (total_base_win / total_bet) * 100
    bonus_rtp = (total_bonus_win / total_bet) * 100
    
    print(f"RTP (Return to Player): {overall_rtp:.2f}%")
    print(f"  - Base Game RTP: {base_rtp:.2f}%")
    print(f"  - Bonus Game RTP: {bonus_rtp:.2f}%")
    
    # Hit Frequency
    hit_frequency = (base_hits / num_spins) * 100
    print(f"\nHit Frequency: {hit_frequency:.2f}%")
    print(f"  - 1 in {num_spins / base_hits:.1f} spins")
    
    # Volatility
    volatility = calculate_volatility(all_spin_wins)
    base_volatility = calculate_volatility(base_spin_wins)
    bonus_volatility = calculate_volatility(bonus_total_wins) if bonus_total_wins else 0
    
    print(f"\nVolatility (Std Dev): {volatility:,.2f}")
    print(f"  - Base Game Volatility: {base_volatility:,.2f}")
    print(f"  - Bonus Game Volatility: {bonus_volatility:,.2f}")
    
    # Max Win Potential
    print(f"\nMax Win Potential: {(max_win / BET_AMOUNT):.2f}x")
    print(f"  - Max Base Win: {(max_base_win / BET_AMOUNT):.2f}x")
    print(f"  - Max Bonus Win: {(max_bonus_win / BET_AMOUNT):.2f}x")
    print(f"  - 5,000x Hits: {five_k_hits} (1 in {num_spins / five_k_hits if five_k_hits > 0 else 0:.0f})")
    
    # Average Bet to Average Win Ratio
    avg_win = sum(all_spin_wins) / len(all_spin_wins)
    avg_bet_win_ratio = avg_win / BET_AMOUNT
    print(f"\nAverage Bet to Average Win Ratio: {avg_bet_win_ratio:.4f}")
    print(f"  - Average Win per Spin: {avg_win:,.2f}")
    
    print("\n" + "=" * 80)
    print("🔁 BASE GAME METRICS")
    print("=" * 80)
    
    # Base Hit Frequency
    base_hit_freq = (base_hits / num_spins) * 100
    print(f"Base Hit Frequency: {base_hit_freq:.2f}%")
    print(f"  - 1 in {num_spins / base_hits:.1f} spins")
    
    # Dead Spin Rate
    dead_spin_rate = (dead_spins / num_spins) * 100
    print(f"\nDead Spin Rate: {dead_spin_rate:.2f}%")
    
    # Win Size Distribution
    print(f"\nWin Size Distribution (Base Game):")
    for bucket in ['<1x', '1-5x', '5-10x', '10-50x', '50-100x', '100-500x', '500x+']:
        count = win_size_distribution.get(bucket, 0)
        pct = (count / base_hits * 100) if base_hits > 0 else 0
        print(f"  {bucket}: {count:,} ({pct:.2f}%)")
    
    # Feature Trigger Rate
    feature_trigger_rate = (bonus_triggers / num_spins) * 100
    print(f"\nFeature Trigger Rate: {feature_trigger_rate:.2f}%")
    print(f"  - 1 in {num_spins / bonus_triggers if bonus_triggers > 0 else 0:.1f} spins")
    
    # Scatter Distribution
    print(f"\nScatter Distribution:")
    for count in range(8):
        dist_count = scatter_distribution.get(count, 0)
        pct = (dist_count / num_spins * 100)
        print(f"  {count} scatters: {dist_count:,} ({pct:.2f}%)")
    
    # Base Game RTP Contribution
    print(f"\nBase Game RTP Contribution: {base_rtp:.2f}%")
    
    print("\n" + "=" * 80)
    print("🎁 BONUS GAME METRICS")
    print("=" * 80)
    
    # Bonus Entry Frequency
    bonus_entry_freq = (bonus_triggers / num_spins) * 100
    print(f"Bonus Entry Frequency: {bonus_entry_freq:.2f}%")
    print(f"  - 1 in {num_spins / bonus_triggers if bonus_triggers > 0 else 0:.1f} spins")
    
    # Bonus RTP Contribution
    print(f"\nBonus RTP Contribution: {bonus_rtp:.2f}%")
    
    # Average Bonus Win
    if bonus_total_wins:
        avg_bonus_win = sum(bonus_total_wins) / len(bonus_total_wins)
        median_bonus_win = statistics.median(bonus_total_wins)
        print(f"\nAverage Bonus Win: {avg_bonus_win / BET_AMOUNT:.2f}x")
        print(f"  - In currency: {avg_bonus_win:,.2f}")
        print(f"Median Bonus Win: {median_bonus_win / BET_AMOUNT:.2f}x")
        print(f"  - In currency: {median_bonus_win:,.2f}")
    
    # Bonus Win Distribution
    print(f"\nBonus Win Distribution:")
    for bucket in ['<10x', '10-50x', '50-100x', '100-500x', '500-1000x', '1000-5000x', '5000x']:
        count = bonus_win_distribution.get(bucket, 0)
        pct = (count / bonus_triggers * 100) if bonus_triggers > 0 else 0
        print(f"  {bucket}: {count:,} ({pct:.2f}%)")
    
    # Bonus Volatility
    print(f"\nBonus Volatility: {bonus_volatility:,.2f}")
    
    # Max Bonus Win
    print(f"\nMax Bonus Win: {(max_bonus_win / BET_AMOUNT):.2f}x")
    print(f"  - In currency: {max_bonus_win:,.2f}")
    
    # Retrigger Rate
    if bonus_triggers > 0:
        retrigger_rate = (total_retriggers / bonus_triggers) * 100
        print(f"\nRetrigger Rate: {retrigger_rate:.2f}%")
        print(f"  - Total Retriggers: {total_retriggers}")
        print(f"  - Avg Bonus Spins per Trigger: {total_bonus_spins / bonus_triggers:.2f}")
    
    print("\n" + "=" * 80)
    print("📊 SUMMARY")
    print("=" * 80)
    print(f"Total Spins Simulated: {num_spins:,}")
    print(f"Total Bet: {total_bet:,}")
    print(f"Total Win: {final_total_win:,}")
    print(f"Combined RTP: {overall_rtp:.2f}%")
    print(f"Bonus Triggers: {bonus_triggers}")
    print(f"Total Bonus Spins: {total_bonus_spins}")
    print("=" * 80)

if __name__ == "__main__":
    # Initialize provably fair RNG with test seed
    rng = ProvablyFairRNG("provably_fair_test_seed_42")
    
    # Run simulation with 100k spins for quick verification
    run_simulation(100000)
