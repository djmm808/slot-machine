import random
import math
from collections import deque, defaultdict

# =========================
# CONFIG (MATCH YOUR GAME)
# =========================

VISIBLE_SYMBOLS = 7
NUM_REELS = 7
MAX_CASCADES = 100

MULTIPLIER_CHANCE = 0.0005
MULTIPLIER_CHANCE_FREE = 0.0008
SCATTER_CHANCE = 0.0070

BET = 1.0
MAX_WIN_MULTIPLIER = 2500

SIM_SPINS = 50000  # minimum 50k spins for accurate RTP

# =========================
# SYMBOL DEFINITIONS
# =========================

BASE_SYMBOLS = [
    ("☄️", 0.122),
    ("⭐", 0.174),
    ("🪐", 0.235),
    ("🌙", 0.296),
    ("🌞", 0.357),
    ("🌌", 0.415),
]

MULTIPLIERS = [
    (2, 0.45),
    (5, 0.35),
    (10, 0.15),
    (20, 0.04),
    (50, 0.01),
]

SCATTER = "SCATTER"

# =========================
# RNG HELPERS
# =========================

def get_multiplier():
    r = random.random()
    cumulative = 0
    for m, p in MULTIPLIERS:
        cumulative += p
        if r < cumulative:
            return ("MULT", m)
    return ("MULT", 2)

def random_symbol(free=False, has_scatter=False):
    r = random.random()
    m_chance = MULTIPLIER_CHANCE_FREE if free else MULTIPLIER_CHANCE

    if r < SCATTER_CHANCE and not has_scatter:
        return (SCATTER, 0)

    if r < SCATTER_CHANCE + m_chance:
        return get_multiplier()

    name, val = random.choice(BASE_SYMBOLS)
    return (name, val)

# =========================
# GRID GENERATION
# =========================

def generate_grid(free=False):
    grid = []
    for col in range(NUM_REELS):
        reel = []
        has_scatter = False
        for row in range(VISIBLE_SYMBOLS):
            sym = random_symbol(free, has_scatter)
            if sym[0] == SCATTER:
                has_scatter = True
            reel.append(sym)
        grid.append(reel)
    return grid

# =========================
# CLUSTER FIND (BFS)
# =========================

def find_clusters(grid):
    visited = set()
    clusters = []

    for c in range(NUM_REELS):
        for r in range(VISIBLE_SYMBOLS):
            if (c, r) in visited:
                continue

            sym, val = grid[c][r]
            if sym in (SCATTER, "MULT"):
                continue

            queue = deque([(c, r)])
            cluster = []

            while queue:
                x, y = queue.popleft()
                if (x, y) in visited:
                    continue

                if not (0 <= x < NUM_REELS and 0 <= y < VISIBLE_SYMBOLS):
                    continue

                s, _ = grid[x][y]
                if s != sym and s != "MULT":
                    continue

                visited.add((x, y))
                cluster.append((x, y))

                for dx, dy in [(1,0),(-1,0),(0,1),(0,-1)]:
                    queue.append((x+dx, y+dy))

            if len(cluster) >= 5:
                clusters.append((sym, cluster))

    return clusters

# =========================
# WIN CALCULATION
# =========================

def calculate_win(clusters, grid):
    total = 0
    multiplier_contribution = 0

    for sym, positions in clusters:
        base_value = next(v for s, v in BASE_SYMBOLS if s == sym)

        actual_count = sum(
            1 for c, r in positions if grid[c][r][0] != "MULT"
        )

        base_win = base_value * actual_count * BET

        multiplier = 1

        for c, r in positions:
            s, v = grid[c][r]

            if s == "MULT":
                multiplier *= v

            for dx, dy in [(1,0),(-1,0),(0,1),(0,-1)]:
                x, y = c+dx, r+dy
                if 0 <= x < NUM_REELS and 0 <= y < VISIBLE_SYMBOLS:
                    if (x, y) not in positions:
                        s2, v2 = grid[x][y]
                        if s2 == "MULT":
                            multiplier *= v2

        total += base_win * multiplier
        if multiplier > 1:
            multiplier_contribution += base_win * (multiplier - 1)

    return min(total, BET * MAX_WIN_MULTIPLIER), multiplier_contribution

# =========================
# CASCADE
# =========================

def cascade(grid, remove_positions, free=False):
    new_grid = [col[:] for col in grid]

    for c, r in remove_positions:
        if free and new_grid[c][r][0] == "MULT":
            continue
        new_grid[c][r] = None

    for c in range(NUM_REELS):
        col = new_grid[c]
        col = [x for x in col if x is not None]

        while len(col) < VISIBLE_SYMBOLS:
            col.insert(0, random_symbol(free))

        new_grid[c] = col

    return new_grid

# =========================
# SCATTERS
# =========================

def count_scatters(grid):
    return sum(1 for col in grid for s,_ in col if s == SCATTER)

def free_spins_award(count):
    if count == 3:
        return 10
    if count == 4:
        return 12
    return 0

# =========================
# SINGLE SPIN ENGINE
# =========================

def play_spin(free=False, sticky_multipliers=None):
    grid = generate_grid(free)

    if free and sticky_multipliers:
        for (c, r, val) in sticky_multipliers:
            grid[c][r] = ("MULT", val)

    total_win = 0
    total_multiplier_contribution = 0
    sticky = sticky_multipliers[:] if sticky_multipliers else []
    cascade_count = 0

    for _ in range(MAX_CASCADES):
        clusters = find_clusters(grid)
        if not clusters:
            break

        win, mult_contrib = calculate_win(clusters, grid)
        total_win += win
        total_multiplier_contribution += mult_contrib

        remove = [pos for _, cluster in clusters for pos in cluster]
        grid = cascade(grid, remove, free)

        cascade_count += 1

        if free:
            # rebuild sticky multipliers
            sticky = [
                (c, r, grid[c][r][1])
                for c in range(NUM_REELS)
                for r in range(VISIBLE_SYMBOLS)
                if grid[c][r][0] == "MULT"
            ]

        if total_win >= BET * MAX_WIN_MULTIPLIER:
            return BET * MAX_WIN_MULTIPLIER, 0, sticky, cascade_count, total_multiplier_contribution

    scatters = count_scatters(grid)
    fs = free_spins_award(scatters)

    return total_win, fs, sticky, cascade_count, total_multiplier_contribution

# =========================
# SIMULATION LOOP
# =========================

def simulate():
    base_wager = 0
    base_win = 0

    bonus_win = 0

    # Metrics tracking
    spin_outcomes = []  # For volatility: win per spin
    winning_spins = 0   # For hit frequency
    bonus_triggers = 0   # For bonus frequency
    base_wins_list = [] # For average/median base wins
    bonus_wins_list = [] # For average/median bonus wins
    cascade_depths = []  # For cascade depth distribution
    multiplier_contributions = [] # For multiplier impact
    
    # Max win distribution buckets
    win_buckets = {
        '>0x': 0,
        '>10x': 0,
        '>50x': 0,
        '>100x': 0,
        '>250x': 0,
        '>500x': 0,
        '>2500x': 0,
    }

    # Bonus session tracking
    bonus_session_lengths = []
    bonus_retriggers = 0

    for i in range(SIM_SPINS):
        win, fs, _, cascade_count, mult_contrib = play_spin(False)

        base_wager += BET
        base_win += win

        # Track volatility (win per spin)
        spin_outcomes.append(win)

        # Track hit frequency
        if win > 0:
            winning_spins += 1
            base_wins_list.append(win)

        # Track cascade depth
        if cascade_count > 0:
            cascade_depths.append(cascade_count)

        # Track multiplier impact
        if mult_contrib > 0:
            multiplier_contributions.append(mult_contrib)

        # Track max win distribution
        win_mult = win / BET
        if win_mult > 0:
            win_buckets['>0x'] += 1
        if win_mult > 10:
            win_buckets['>10x'] += 1
        if win_mult > 50:
            win_buckets['>50x'] += 1
        if win_mult > 100:
            win_buckets['>100x'] += 1
        if win_mult > 250:
            win_buckets['>250x'] += 1
        if win_mult > 500:
            win_buckets['>500x'] += 1
        if win_mult >= 2500:
            win_buckets['>2500x'] += 1

        if fs > 0:
            bonus_triggers += 1
            sticky = []

            spins_left = fs
            session_length = 0

            while spins_left > 0:
                w, retrigger, sticky, bonus_cascade, bonus_mult = play_spin(True, sticky)

                bonus_win += w
                bonus_wins_list.append(w)
                session_length += 1

                if bonus_cascade > 0:
                    cascade_depths.append(bonus_cascade)

                if bonus_mult > 0:
                    multiplier_contributions.append(bonus_mult)

                if retrigger > 0:
                    bonus_retriggers += 1

                spins_left += retrigger - 1

            bonus_session_lengths.append(session_length)

    # Calculate volatility (variance and std dev)
    import statistics
    mean_win = statistics.mean(spin_outcomes)
    variance = statistics.variance(spin_outcomes) if len(spin_outcomes) > 1 else 0
    std_dev = statistics.stdev(spin_outcomes) if len(spin_outcomes) > 1 else 0

    # Calculate hit frequency
    hit_frequency = (winning_spins / SIM_SPINS) * 100

    # Calculate bonus frequency
    bonus_frequency = (bonus_triggers / SIM_SPINS) * 100

    # Calculate bonus contribution to RTP
    bonus_contribution = (bonus_win / base_wager) * 100

    # Calculate average and median wins
    avg_base_win = statistics.mean(base_wins_list) if base_wins_list else 0
    median_base_win = statistics.median(base_wins_list) if base_wins_list else 0
    avg_bonus_win = statistics.mean(bonus_wins_list) if bonus_wins_list else 0
    median_bonus_win = statistics.median(bonus_wins_list) if bonus_wins_list else 0

    # Calculate feature EV (Expected Value of Bonus Entry)
    feature_ev = bonus_contribution / (bonus_frequency / 100) if bonus_frequency > 0 else 0

    # Calculate cascade depth statistics
    avg_cascade_depth = statistics.mean(cascade_depths) if cascade_depths else 0
    max_cascade_depth = max(cascade_depths) if cascade_depths else 0

    # Calculate multiplier impact
    multiplier_impact = statistics.mean(multiplier_contributions) if multiplier_contributions else 0

    # Calculate bonus session statistics
    avg_bonus_length = statistics.mean(bonus_session_lengths) if bonus_session_lengths else 0
    retrigger_rate = (bonus_retriggers / bonus_triggers) if bonus_triggers > 0 else 0

    print("===== COMPREHENSIVE RTP ANALYSIS =====")
    print("\n----- RTP BREAKDOWN -----")
    print(f"Base RTP:           {base_win / base_wager * 100:.2f}%")
    print(f"Bonus RTP:          {bonus_win / base_wager * 100:.2f}%")
    print(f"Bonus Contribution:{bonus_contribution:.2f}%")
    print(f"Total RTP:          {(base_win + bonus_win) / base_wager * 100:.2f}%")

    print("\n----- VOLATILITY -----")
    print(f"Mean Win per Spin:  {mean_win:.4f}")
    print(f"Variance:           {variance:.4f}")
    print(f"Standard Deviation: {std_dev:.4f}")
    print(f"Volatility Index:   {std_dev / mean_win if mean_win > 0 else 0:.2f}")

    print("\n----- HIT FREQUENCY -----")
    print(f"Win Rate:           {hit_frequency:.2f}%")
    print(f"Winning Spins:      {winning_spins:,} / {SIM_SPINS:,}")

    print("\n----- BONUS FREQUENCY -----")
    print(f"Trigger Rate:       {bonus_frequency:.4f}%")
    print(f"1 in X Spins:       {1 / (bonus_frequency / 100) if bonus_frequency > 0 else 0:.1f}")
    print(f"Total Triggers:     {bonus_triggers:,}")

    print("\n----- WIN SIZE STATISTICS -----")
    print(f"Avg Base Win:       {avg_base_win:.4f}x")
    print(f"Median Base Win:    {median_base_win:.4f}x")
    print(f"Avg Bonus Win:      {avg_bonus_win:.4f}x")
    print(f"Median Bonus Win:   {median_bonus_win:.4f}x")

    print("\n----- FEATURE EXPECTED VALUE -----")
    print(f"Feature EV:         {feature_ev:.2f}%")
    print(f"Expected Return per Trigger: {feature_ev / 100:.4f}x")

    print("\n----- BONUS SESSION STATS -----")
    print(f"Avg Session Length: {avg_bonus_length:.2f} spins")
    print(f"Retrigger Rate:     {retrigger_rate:.2f} per trigger")

    print("\n----- CASCADE DEPTH STATISTICS -----")
    print(f"Avg Cascades per Win: {avg_cascade_depth:.2f}")
    print(f"Max Cascades Observed: {max_cascade_depth}")

    print("\n----- MULTIPLIER IMPACT -----")
    total_mult_contrib = sum(multiplier_contributions)
    total_win_all = base_win + bonus_win
    multiplier_rtp_percent = (total_mult_contrib / base_wager * 100) if base_wager > 0 else 0
    print(f"Total Multiplier Contribution: {total_mult_contrib:.2f}")
    print(f"Multiplier RTP Contribution: {multiplier_rtp_percent:.2f}%")
    print(f"Avg Multiplier per Cascade: {multiplier_impact:.4f}")

    print("\n----- MAX WIN DISTRIBUTION -----")
    print(f">0x:    {win_buckets['>0x']:>6,} ({win_buckets['>0x']/SIM_SPINS*100:.2f}%)")
    print(f">10x:       {win_buckets['>10x']:>6,} ({win_buckets['>10x']/SIM_SPINS*100:.2f}%)")
    print(f">50x:        {win_buckets['>50x']:>6,} ({win_buckets['>50x']/SIM_SPINS*100:.2f}%)")
    print(f">100x:       {win_buckets['>100x']:>6,} ({win_buckets['>100x']/SIM_SPINS*100:.2f}%)")
    print(f">250x:       {win_buckets['>250x']:>6,} ({win_buckets['>250x']/SIM_SPINS*100:.2f}%)")
    print(f">500x:       {win_buckets['>500x']:>6,} ({win_buckets['>500x']/SIM_SPINS*100:.2f}%)")
    print(f">2500x:      {win_buckets['>2500x']:>6,} ({win_buckets['>2500x']/SIM_SPINS*100:.2f}%)")

# =========================
# RUN
# =========================

if __name__ == "__main__":
    simulate()