"""
Portfolio visualization and reporting utilities.
"""

import matplotlib.pyplot as plt
import matplotlib.dates as mdates
import numpy as np
import polars as pl


def plot_portfolio_performance(portfolio_history, transactions):
    """
    Plot portfolio performance with value, P&L, and asset allocation charts.

    Args:
        portfolio_history (pl.DataFrame): DataFrame from calculate_portfolio_metrics()
        transactions (pl.DataFrame): DataFrame from load_transactions()
    """
    # Extract data
    dates = portfolio_history['date'].to_list()

    # Get asset symbols from column names - EXCLUDE 'holdings_value'
    all_symbols = [col.replace('_value', '') for col in portfolio_history.columns
                   if col.endswith('_value') and col != 'holdings_value']

    data = {k: portfolio_history[k].to_list() for k in
            ['equity', 'contributed', 'invested_capital', 'cash', 'return_pct', 'portfolio_pnl', 'dividends']}

    # Create figure
    fig, (ax1, ax2, ax3) = plt.subplots(3, 1, figsize=(14, 12), sharex=True,
                                         gridspec_kw={"height_ratios": [2, 1, 1.5]})
    fig.suptitle("Portfolio Performance (Real-Time Market Data)", fontsize=14, fontweight='bold')

    # Subplot 1: Portfolio value
    ax1.step(dates, data['equity'], 'b-', label='Total Value', linewidth=2, where='post')
    ax1.step(dates, data['contributed'], 'grey', linestyle='--', label='Contributed', linewidth=1.5, where='post')
    ax1.step(dates, data['invested_capital'], 'purple', linestyle='--', label='Invested Capital',
             linewidth=1.5, alpha=0.7, where='post')
    ax1.step(dates, data['cash'], ':', label='Cash', color='black', linewidth=1.5, alpha=0.7, where='post')

    eq, contrib = np.array(data['equity']), np.array(data['contributed'])
    ax1.fill_between(dates, contrib, eq, where=eq >= contrib, alpha=0.2, color='green', step='post')
    ax1.fill_between(dates, contrib, eq, where=eq < contrib, alpha=0.2, color='red', step='post')

    # Buy/sell markers
    for row in transactions.filter(pl.col('type') == 'Trade').iter_rows(named=True):
        if row['date'] in dates:
            idx = dates.index(row['date'])
            marker, color = ('^', 'green') if row['quantity'] > 0 else ('v', 'red')
            ax1.scatter(row['date'], data['equity'][idx], marker=marker, s=100, color=color,
                       edgecolors='dark'+color, linewidths=1.5, zorder=5, alpha=0.8)

    ax1.set_ylabel('Value (USD)', fontsize=11)
    ax1.grid(alpha=0.3, linestyle='--')

    # Secondary axis for return %
    ax1b = ax1.twinx()
    ax1b.step(dates, data['return_pct'], '--', color='green', label='Total Portfolio Return %', linewidth=2, alpha=0.7, where='post')
    ax1b.set_ylabel('Total Portfolio Return % (TWR)', fontsize=11, color='green')
    ax1b.tick_params(axis='y', labelcolor='green')

    # Legend with buy/sell markers
    lines1, labels1 = ax1.get_legend_handles_labels()
    lines1b, labels1b = ax1b.get_legend_handles_labels()
    markers = [plt.Line2D([0], [0], marker=m, color='w', markerfacecolor=c,
                          markeredgecolor='dark'+c, markersize=8, label=l)
               for m, c, l in [('^', 'green', 'Buy'), ('v', 'red', 'Sell')]]
    ax1.legend(lines1 + lines1b + markers, labels1 + labels1b + ['Buy', 'Sell'],
               loc='upper left', fontsize=9)

    # Subplot 2: P&L and Dividends
    ax2.step(dates, data['portfolio_pnl'], 'purple', label='Portfolio P&L', linewidth=2, where='post')
    ax2.axhline(0, color='black', linewidth=1, alpha=0.5)
    pnl = np.array(data['portfolio_pnl'])
    ax2.fill_between(dates, 0, pnl, where=pnl >= 0, alpha=0.3, color='green', step='post')
    ax2.fill_between(dates, 0, pnl, where=pnl < 0, alpha=0.3, color='red', step='post')
    ax2.set_ylabel('P&L (USD)', fontsize=11)
    ax2.grid(alpha=0.3, linestyle='--')

    ax2b = ax2.twinx()
    ax2b.step(dates, data['dividends'], ':', color='orange', label='Cumulative Dividends',
             linewidth=2, alpha=0.8, where='post')
    ax2b.set_ylabel('Cumulative Dividends (USD)', fontsize=11, color='orange')
    ax2b.tick_params(axis='y', labelcolor='orange')

    lines2, labels2 = ax2.get_legend_handles_labels()
    lines2b, labels2b = ax2b.get_legend_handles_labels()
    ax2.legend(lines2 + lines2b, labels2 + labels2b, loc='upper left', fontsize=9)

    # Subplot 3: Asset allocation
    asset_values_over_time = {sym: portfolio_history[f'{sym}_value'].to_list() for sym in all_symbols}
    cash_over_time = data['cash']

    final_values = {sym: asset_values_over_time[sym][-1] for sym in all_symbols}
    final_values['Cash'] = cash_over_time[-1]
    sorted_symbols = sorted(final_values.keys(), key=lambda s: final_values[s], reverse=True)

    stack_data = [np.array(cash_over_time if sym == 'Cash' else asset_values_over_time[sym])
                  for sym in sorted_symbols]

    ax3.stackplot(dates, *stack_data, labels=sorted_symbols,
                 colors=plt.cm.tab10(range(len(sorted_symbols))), alpha=0.8)
    ax3.set_ylabel('Value (USD)', fontsize=11)
    ax3.set_xlabel('Date', fontsize=11)
    ax3.grid(alpha=0.3, linestyle='--')
    ax3.legend(loc='upper left', fontsize=9, ncol=min(len(sorted_symbols), 4))

    ax3.xaxis.set_major_locator(mdates.MonthLocator(interval=2))
    ax3.xaxis.set_major_formatter(mdates.DateFormatter("%Y-%m"))
    plt.setp(ax3.get_xticklabels(), rotation=45, ha="right")

    plt.tight_layout()
    plt.show()


def print_portfolio_summary(transactions, positions, portfolio_history):
    """
    Print comprehensive portfolio summary with mathematical formulas for each metric.

    Args:
        transactions (pl.DataFrame): DataFrame from load_transactions()
        positions (pl.DataFrame): DataFrame from load_positions()
        portfolio_history (pl.DataFrame): DataFrame from calculate_portfolio_metrics()
    """
    def fmt_num(val, decimal=2, prefix='', na_str='N/A'):
        """Helper to format numeric values, handling None gracefully."""
        if val is None:
            return na_str
        return f"{prefix}{val:,.{decimal}f}"

    def fmt_pct(val, decimal=2, na_str='N/A'):
        """Helper to format percentage values, handling None gracefully."""
        if val is None:
            return na_str
        return f"{val:.{decimal}f}%"

    # Aggregate dividends, taxes, and commissions by symbol
    div_agg = transactions.filter(pl.col('type') == 'Dividend').group_by('symbol').agg(
        pl.col('amount').sum().alias('total_dividends'))
    tax_agg = transactions.filter(pl.col('type') == 'Tax').group_by('symbol').agg(
        pl.col('amount').sum().alias('withholding_tax'))
    comm_agg = transactions.filter(pl.col('type') == 'Trade').group_by('symbol').agg(
        pl.col('commission').sum().alias('commissions'))

    # Build enriched holdings summary
    summary = (positions
        .join(div_agg, on='symbol', how='left')
        .join(tax_agg, on='symbol', how='left')
        .join(comm_agg, on='symbol', how='left')
        .with_columns([
            pl.col('total_dividends').fill_null(0),
            pl.col('withholding_tax').fill_null(0),
            pl.col('commissions').fill_null(0),
            (pl.col('cost_basis') / pl.col('shares')).alias('avg_price'),
            ((pl.col('current_price') - pl.col('cost_basis') / pl.col('shares')) /
             (pl.col('cost_basis') / pl.col('shares')) * 100).alias('price_change_pct'),
            (pl.col('market_value') / pl.col('market_value').sum().over(pl.lit(1)) * 100).alias('portfolio_weight_pct'),
            (pl.col('total_dividends') + pl.col('withholding_tax')).alias('net_dividends'),
            ((pl.col('unrealized_pnl') + pl.col('total_dividends') + pl.col('withholding_tax')) /
             pl.col('cost_basis') * 100).alias('total_return_pct')
        ])
    )

    final = portfolio_history.row(-1, named=True)

    # Calculate costs
    total_commissions = summary['commissions'].sum()
    total_withholding_tax = abs(summary['withholding_tax'].sum())
    total_fees = abs(transactions.filter(pl.col('type') == 'Fee')['amount'].sum())
    total_costs = total_commissions + total_withholding_tax + total_fees

    # Calculate dividends
    gross_dividends = summary['total_dividends'].sum()
    net_dividends = summary['net_dividends'].sum()

    # Calculate time-weighted return (TWR)
    start_date = portfolio_history['date'].min()
    end_date = portfolio_history['date'].max()
    days_invested = (end_date - start_date).days
    years_invested = days_invested / 365.25

    total_return = (final['equity'] / final['contributed']) - 1
    annualized_twr = ((1 + total_return) ** (1 / years_invested) - 1) * 100 if years_invested > 0 else 0

    # Calculate cash weight and asset distribution (excluding cash)
    cash_weight = (final['cash'] / final['equity'] * 100) if final['equity'] else 0
    total_holdings_value = summary['market_value'].sum() or 0

    print("\n" + "=" * 120)
    print("INVESTMENT TIMELINE")
    print("=" * 120)
    print(f"Start Date:                              {start_date}")
    print(f"End Date:                                {end_date}")
    print(f"Days Invested:                           {days_invested} days ({years_invested:.2f} years)")
    print(f"First Deposit:                           {transactions.filter(pl.col('type') == 'Deposit')['date'].min()}")
    print(f"Number of Deposits:                      {transactions.filter(pl.col('type') == 'Deposit').height}")

    print("\n" + "=" * 120)
    print("ASSET ALLOCATION & PERFORMANCE")
    print("=" * 120)
    print(f"\n{'Symbol':<8} {'Shares':<10} {'Avg$':<10} {'Curr$':<10} {'Cost Basis':<13} {'Market Val':<13} "
          f"{'Port%':<9} {'Asset%':<9} {'Unrealized':<13} {'Divs':<10} {'Ret%':<8}")
    print("-" * 120)

    for row in summary.sort('portfolio_weight_pct', descending=True).iter_rows(named=True):
        asset_distribution = (row['market_value'] / total_holdings_value * 100) if row['market_value'] is not None and total_holdings_value else None
        print(f"{row['symbol']:<8} "
              f"{fmt_num(row['shares'], 2, ''):<10} "
              f"{fmt_num(row['avg_price'], 2, '$'):<10} "
              f"{fmt_num(row['current_price'], 2, '$'):<10} "
              f"{fmt_num(row['cost_basis'], 2, '$'):<13} "
              f"{fmt_num(row['market_value'], 2, '$'):<13} "
              f"{fmt_pct(row['portfolio_weight_pct'], 2):<9} "
              f"{fmt_pct(asset_distribution, 2):<9} "
              f"{fmt_num(row['unrealized_pnl'], 2, '$'):<13} "
              f"{fmt_num(row['net_dividends'], 2, '$'):<10} "
              f"{fmt_pct(row['total_return_pct'], 2):<8}")

    # Add cash row
    print(f"{'Cash':<8} {'-':<10} {'-':<10} {'-':<10} {'-':<13} ${final['cash']:<12,.2f} {cash_weight:<8.2f}% "
          f"{'-':<9} {'-':<13} {'-':<10} {'-':<8}")

    print("-" * 120)
    cost_basis_sum = summary['cost_basis'].sum() or 0
    total_asset_return = ((summary['unrealized_pnl'].sum() + net_dividends) / cost_basis_sum * 100) if cost_basis_sum else 0
    print(f"{'TOTAL':<8} {'':<10} {'':<10} {'':<10} ${summary['cost_basis'].sum():<12,.2f} "
          f"${final['equity']:<12,.2f} {100.00:<8.2f}% {100.00:<8.2f}% "
          f"${summary['unrealized_pnl'].sum():<12,.2f} ${net_dividends:<9,.2f} {total_asset_return:<7.2f}%")

    print(f"\nNote: 'Ret%' = (Unrealized P&L + Dividends) / Cost Basis × 100")
    print(f"      Returns on current holdings only, excluding realized gains from closed positions.")

    print("\n" + "=" * 120)
    print("PORTFOLIO CAPITAL STRUCTURE")
    print("=" * 120)

    # Calculate what JPY would be worth today vs what was actually received
    # Get JPY deposits and most recent FX rate from transactions
    jpy_deposits = transactions.filter((pl.col('type') == 'Deposit') & (pl.col('currency') == 'JPY'))
    total_jpy_deposited = jpy_deposits['amount'].sum()

    fx_txns = transactions.filter((pl.col('type') == 'FX') & (pl.col('quantity') != 0))
    if fx_txns.height > 0 and total_jpy_deposited > 0:
        last_fx = fx_txns.sort('date').tail(1).row(0, named=True)
        current_fx_rate = abs(last_fx['amount']) / abs(last_fx['quantity'])
        jpy_value_today = total_jpy_deposited / current_fx_rate
        fx_gain = final['contributed'] - jpy_value_today

        print(f"JPY Deposits Total:                      ¥{total_jpy_deposited:>12,.0f}")
        print(f"  Value if converted today (¥{current_fx_rate:.2f}): ${jpy_value_today:>12,.2f}")
        print(f"  Actual USD received:                   ${final['contributed']:>12,.2f}")
        if fx_gain > 0:
            print(f"  FX Timing Gain:                        ${fx_gain:>12,.2f}  = (Better conversion timing)")
        else:
            print(f"  FX Timing Loss:                        ${fx_gain:>12,.2f}  = (Worse conversion timing)")
    print(f"{'-' * 120}")
    print(f"Contributed Capital (C):                 ${final['contributed']:>12,.2f}  = Actual USD from deposits/conversions")
    print(f"Invested Capital (I):                    ${final['invested_capital']:>12,.2f}  = Σ(Cost Basis inc. buy commissions)")
    print(f"Cash (K):                                ${final['cash']:>12,.2f}  = C - I + R_cap + D_gross - T_div - T_fees")
    print(f"Holdings Market Value (H):               ${final['holdings_value']:>12,.2f}  = Σ(Shares × Current Price)")
    print(f"{'-' * 120}")
    print(f"Total Equity (E):                        ${final['equity']:>12,.2f}  = K + H")
    print(f"Portfolio P&L:                           ${final['portfolio_pnl']:>12,.2f}  = E - C")

    print("\n" + "=" * 120)
    print("REALIZED INCOME")
    print("=" * 120)
    print(f"Realized Capital Gains (R_cap):          ${final['realized_pnl']:>12,.2f}  = Σ[(Sale Price - Sell Commission) - Cost Basis]")
    print(f"Gross Dividends (D_gross):               ${gross_dividends:>12,.2f}  = Σ(Dividend Payments)")
    print(f"{'-' * 120}")
    print(f"Total Realized Income (before costs):   ${final['realized_pnl'] + gross_dividends:>12,.2f}  = R_cap + D_gross")

    print("\n" + "=" * 120)
    print("UNREALIZED GAINS (Open Positions)")
    print("=" * 120)
    print(f"Unrealized P&L (U):                      ${final['unrealized_pnl']:>12,.2f}  = H - I")

    print("\n" + "=" * 120)
    print("COSTS & TAXES")
    print("=" * 120)
    print(f"Trading Commissions:                     ${total_commissions:>12,.2f}  [Already included in Invested Capital & Realized Gains]")
    print(f"Dividend Withholding Tax (T_div):        ${total_withholding_tax:>12,.2f}  = Σ(Tax Withheld on Dividends)")
    print(f"Account Fees (T_fees):                   ${total_fees:>12,.2f}  = Σ(Other Account Fees)")
    print(f"{'-' * 120}")
    print(f"Costs to subtract (T_div + T_fees):      ${total_withholding_tax + total_fees:>12,.2f}  = T_div + T_fees")

    print("\n" + "=" * 120)
    print("TOTAL INVESTMENT PERFORMANCE")
    print("=" * 120)

    # Calculate correct net investment P&L
    net_investment_pnl = final['unrealized_pnl'] + final['realized_pnl'] + gross_dividends - total_withholding_tax - total_fees

    print(f"Unrealized Gains:                        ${final['unrealized_pnl']:>12,.2f}")
    print(f"Realized Gains (net of commissions):     ${final['realized_pnl']:>12,.2f}")
    print(f"Gross Dividends:                         ${gross_dividends:>12,.2f}")
    print(f"Less: Withholding Tax & Fees:            ${total_withholding_tax + total_fees:>12,.2f}")
    print(f"{'-' * 120}")
    print(f"Net Investment P&L:                      ${net_investment_pnl:>12,.2f}  = U + R_cap + D_gross - T_div - T_fees")
    print(f"{'-' * 120}")
    print(f"Total Portfolio Return (TWR):            {final['return_pct']:>11,.2f}%  = (E / C - 1) × 100")
    print(f"                                                       [Total return on all contributed capital]")
    print(f"Annualized TWR:                          {annualized_twr:>11,.2f}%  = [(1 + TWR)^(1/years) - 1] × 100")

    print("\n" + "=" * 120)
    print("SUMMARY")
    print("=" * 120)
    print(f"Total Capital Contributed:               ${final['contributed']:>12,.2f}  (Actual USD from deposits/FX)")
    if fx_txns.height > 0 and total_jpy_deposited > 0:
        if fx_gain > 0:
            print(f"  Note: Deposited ¥{total_jpy_deposited:,.0f}, gained ${fx_gain:,.2f} vs. converting today")
        else:
            print(f"  Note: Deposited ¥{total_jpy_deposited:,.0f}, lost ${abs(fx_gain):,.2f} vs. converting today")
    print(f"Current Portfolio Value:                 ${final['equity']:>12,.2f}")
    print(f"Net Investment Gain:                     ${net_investment_pnl:>12,.2f}  ({final['return_pct']:.2f}% return)")
    print(f"  - Realized (after commissions):        ${final['realized_pnl'] + gross_dividends - total_withholding_tax - total_fees:>12,.2f}")
    print(f"  - Unrealized (Paper Gains):            ${final['unrealized_pnl']:>12,.2f}")
    print(f"Total External Costs (taxes + fees):     ${total_withholding_tax + total_fees:>12,.2f}")
    print(f"Total Commissions (embedded in above):   ${total_commissions:>12,.2f}")
    print(f"Annualized Return:                       {annualized_twr:.2f}% per year over {years_invested:.2f} years")
    print(f"Current Allocation:                      {(final['holdings_value']/final['equity']*100):.1f}% equities, {cash_weight:.1f}% cash")
    print("=" * 120)
