# IBKR Portfolio Tracker

Portfolio analysis and tracking tool for Interactive Brokers account data with automated analytics, performance metrics, visualizations, and rebalancing recommendations.

## Project Structure

```
IBKR_portfolio_tracker/
├── data/                   # CSV data files from IBKR (gitignored)
├── src/                    # Core library modules
│   ├── data_loader.py      # Load and parse IBKR transactions and positions
│   ├── metrics.py          # Calculate portfolio performance metrics
│   ├── visualization.py    # Generate charts and summary reports
│   └── rebalancing.py      # Calculate rebalancing trades
└── jupyter/                # Analysis notebooks
    ├── portfolio_analysis.ipynb          # Main automated analysis notebook
    └── verify_calculations.ipynb         # Verification and testing notebook
```

## Installation

```bash
uv pip install polars yfinance matplotlib numpy
```

## Usage

### 1. Prepare Your Data

Export your IBKR account data as CSV and place files in the `data/` directory:
```
data/UXXXXXXXX_YYYYMMDD_YYYYMMDD.csv
```

You can have multiple CSV files covering different time periods (e.g., multiple years). The tool will process all CSV files in the `data/` directory.

### 2. Run Analysis

Open `jupyter/portfolio_analysis.ipynb` and run all cells to generate portfolio metrics, performance charts, and rebalancing recommendations.

## Key Metrics

- **ROIC**: `(Unrealized + Realized + Dividends) / Invested Capital × 100`
- **TWR**: `(Current Equity / Total Contributed) - 1`
- **Annualized TWR**: `[(1 + TWR)^(1/years) - 1] × 100`

## Disclaimer

For informational purposes only. Not financial advice.
