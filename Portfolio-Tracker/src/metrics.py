"""
Portfolio metrics calculation utilities.
"""

import yfinance as yf
from datetime import datetime, timedelta
import polars as pl


def calculate_portfolio_metrics(transactions):
    """
    Calculate portfolio metrics over time from transaction history.

    Args:
        transactions (pl.DataFrame): DataFrame of transactions from load_transactions()

    Returns:
        pl.DataFrame: Daily portfolio history with columns including:
            - date: Date
            - contributed: Total capital contributed
            - invested_capital: Current cost basis of holdings
            - cash: Available cash
            - equity: Total portfolio value
            - holdings_value: Market value of holdings
            - unrealized_pnl: Unrealized profit/loss
            - realized_pnl: Realized profit/loss
            - total_investment_pnl: Total investment P&L
            - portfolio_pnl: Total portfolio P&L
            - return_pct: Total Portfolio Return (TWR) = (Equity/Contributed - 1) × 100
            - dividends: Cumulative dividends
            - {symbol}_shares: Shares held for each symbol
            - {symbol}_value: Market value for each symbol
    """
    # Get symbols and download prices
    all_symbols = transactions.filter(
        (pl.col('type') == 'Trade') & (pl.col('symbol').is_not_null())
    )['symbol'].unique().to_list()

    price_data = yf.download(all_symbols, start=transactions['date'].min(),
                             end=datetime.now().date(), progress=False, auto_adjust=True)
    if len(all_symbols) == 1:
        price_data = price_data[['Close']].rename(columns={'Close': all_symbols[0]})
    else:
        price_data = price_data['Close']

    # Get fixed FX rate (for reference only)
    first_fx = transactions.filter((pl.col('type') == 'FX') & (pl.col('symbol') == 'USD.JPY') & (pl.col('quantity') != 0))
    fixed_fx_rate = abs(first_fx[0, 'amount']) / abs(first_fx[0, 'quantity'])

    # Initialize
    contributed = jpy_cash = usd_cash = dividends = realized_pnl = 0.0
    current_fx_rate = fixed_fx_rate
    holdings = {}
    current_holdings_cost = {}
    daily_values = []

    # Generate dates and process
    current = transactions['date'].min()
    while current <= datetime.now().date():
        # Process day's transactions
        for row in transactions.filter(pl.col('date') == current).iter_rows(named=True):
            if row['type'] == 'Deposit':
                if row['currency'] == 'JPY':
                    jpy_cash += row['amount']
                    # Don't add to contributed yet - wait for actual FX conversion
                else:
                    usd_cash += row['amount']
                    contributed += row['amount']
            elif row['type'] == 'FX':
                # Add actual USD from FX conversions to contributed capital
                contributed += row['quantity']
                usd_cash += row['quantity']
                jpy_cash += row['amount']
                if row['quantity'] != 0:
                    current_fx_rate = abs(row['amount']) / abs(row['quantity'])
            elif row['type'] == 'Trade' and row['symbol']:
                sym, qty = row['symbol'], row['quantity']
                cost = abs(row['amount']) + abs(row['commission'])
                usd_cash += row['amount'] - row['commission']

                if qty > 0:  # Buy
                    current_holdings_cost[sym] = current_holdings_cost.get(sym, 0) + cost
                else:  # Sell
                    if sym in current_holdings_cost and holdings.get(sym, 0) > 0:
                        sold_cost = (current_holdings_cost[sym] / holdings[sym]) * abs(qty)
                        realized_pnl += (row['amount'] - row['commission']) - sold_cost
                        current_holdings_cost[sym] -= sold_cost

                holdings[sym] = holdings.get(sym, 0) + qty
                if holdings[sym] == 0:
                    holdings.pop(sym, None)
            elif row['type'] == 'Dividend':
                usd_cash += row['amount']
                dividends += row['amount']
            elif row['type'] in ['Tax', 'Fee']:
                usd_cash += row['amount']

        # Calculate holdings value per symbol and store holdings + values
        holdings_value = 0.0
        day_data = {'date': current}

        for sym in all_symbols:
            shares = holdings.get(sym, 0)
            sym_value = 0.0
            if shares > 0 and sym in price_data.columns:
                try:
                    prices = price_data.loc[:str(current), sym]
                    if len(prices) > 0:
                        sym_value = shares * prices.iloc[-1]
                        holdings_value += sym_value
                except (KeyError, IndexError):
                    pass
            day_data[f'{sym}_shares'] = shares
            day_data[f'{sym}_value'] = sym_value

        total_cash = (jpy_cash / current_fx_rate) + usd_cash
        invested_capital = sum(current_holdings_cost.values())
        unrealized_pnl = holdings_value - invested_capital
        equity = total_cash + holdings_value

        # Contributed capital includes USD from FX + current value of unconverted JPY
        total_contributed = contributed + (jpy_cash / current_fx_rate)

        day_data.update({
            'contributed': total_contributed, 'invested_capital': invested_capital,
            'cash': total_cash, 'equity': equity, 'holdings_value': holdings_value,
            'unrealized_pnl': unrealized_pnl, 'realized_pnl': realized_pnl,
            'total_investment_pnl': unrealized_pnl + realized_pnl,
            'portfolio_pnl': equity - total_contributed,
            'return_pct': ((equity / total_contributed - 1) * 100) if total_contributed > 0 else 0,
            'dividends': dividends
        })

        daily_values.append(day_data)
        current += timedelta(days=1)

    return pl.DataFrame(daily_values)
