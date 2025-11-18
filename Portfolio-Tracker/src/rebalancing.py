"""
Portfolio rebalancing utilities.
"""

import polars as pl


def calculate_rebalancing(positions, target_allocation, investment_amount=None):
    """
    Calculate optimal rebalancing trades for a new investment.

    Args:
        positions (pl.DataFrame): Current positions from load_positions()
        target_allocation (dict): Target allocation percentages by symbol, e.g., {'VTI': 72, 'SPY': 6, 'VXUS': 22}
        investment_amount (float): Amount of new capital to invest

    Returns:
        None (prints rebalancing recommendations)

    Raises:
        AssertionError: If investment_amount is None or negative
    """
    assert investment_amount is not None and investment_amount >= 0, "Pass a non-negative investment_amount."

    # Current values & prices
    current_holdings = positions['market_value'].sum() if positions.height > 0 else 0.0
    price = {r['symbol']: float(r['current_price']) for r in positions.iter_rows(named=True)} if positions.height else {}
    total_value = current_holdings + float(investment_amount)

    # Current per symbol
    cur = {}
    for s in target_allocation:
        df = positions.filter(pl.col('symbol') == s)
        cur[s] = float(df['market_value'][0]) if df.height else 0.0

    # Gaps at post-investment total; only buy underweights with known prices
    gaps = {s: total_value * (target_allocation[s]/100.0) - cur[s] for s in target_allocation}
    pos = {s: g for s, g in gaps.items() if g > 0 and s in price and price[s] > 0}

    # Proportional dollars -> base whole shares (cap by target gap)
    total_pos = sum(pos.values())
    alloc = {s: (investment_amount * (pos[s]/total_pos)) if total_pos > 0 else 0.0 for s in pos}
    cap   = {s: int(pos[s] // price[s]) for s in pos}
    shares = {s: min(int(alloc[s] // price[s]), cap[s]) for s in pos}

    # Greedy top-up: add one share at a time, most expensive first, without exceeding budget or cap
    spent = sum(shares[s]*price[s] for s in shares)
    cash  = investment_amount - spent
    order = sorted(pos, key=lambda s: price[s], reverse=True)
    while True:
        progressed = False
        for s in order:
            if shares[s] < cap[s] and cash >= price[s]:
                shares[s] += 1
                cash -= price[s]
                progressed = True
        if not progressed:
            break

    # Output (compact, original style)
    print("\n" + "=" * 85)
    print(f"NEW INVESTMENT (Total Value: ${total_value:,.2f})")
    print(f"Current: ${current_holdings:,.2f} | New Money: ${investment_amount:,.2f}")
    print("=" * 85)
    print(f"{'Symbol':<8} {'Target%':<9} {'Current%':<10} {'Gap$':<13} {'Price':<10} {'Buy Shares':<12}")
    print("-" * 85)

    total_cost = sum(shares.get(s,0)*price.get(s,0) for s in target_allocation)
    for s in sorted(target_allocation):
        tgt_pct = target_allocation[s]
        cur_pct = (cur[s]/total_value*100.0) if total_value>0 else 0.0
        gap     = gaps[s]
        pstr    = f"${price[s]:,.2f}" if s in price else "???"
        bstr    = str(shares[s]) if s in shares and shares[s]>0 else "-"
        print(f"{s:<8} {tgt_pct:<9.1f}% {cur_pct:<10.1f}% ${gap:<12,.2f} {pstr:<10} {bstr:<12}")

    print("-" * 85)
    print(f"Planned spend: ${total_cost:,.2f} (Target: ${investment_amount:,.2f})")
    print(f"Unspent cash: ${investment_amount - total_cost:,.2f}")
    print("=" * 85)
