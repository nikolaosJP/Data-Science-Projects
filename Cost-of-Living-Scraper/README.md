# Cost of Living Scraper

A modular Python tool that scrapes cost‑of‑living data from Numbeo at both the **country** and **city** level and exports an analysis‑ready **Parquet** dataset. It implements conservative rate limiting with exponential backoff/jitter, robust HTML parsing, deterministic column ordering, and a simple CLI.

> **Please use responsibly** and respect Numbeo’s Terms of Use and **robots.txt**.

## Project Structure


```
├── main.py                   # entry point, defines CLI & orchestrates scraping
└── src/
    └── scraper/
        ├── __init__.py        # ensure package discovery
        ├── scraper.py         # core logic, loops over targets & coordinates modules
        ├── http_client.py     # handles requests, retries, backoff, rate limiting
        ├── html_parser.py     # extracts entries & tables from Numbeo HTML
        ├── url_formatter.py   # builds country/city URLs, normalizes names
        ├── data_processor.py  # shapes parsed data into DataFrame with stable schema
        └── file_manager.py    # saves results to Parquet under ./data/
```
If your layout differs, make sure `src/` is on `PYTHONPATH` (e.g., `export PYTHONPATH=$PWD/src`) or adjust imports accordingly.

## Installation
```bash
git clone <repo-url>
cd <repo>
uv pip install -r requirements.txt
```

## Usage

From the project root, you can run the following commands to download the dataset of X countries / cities:

```bash
# 1) All countries (country averages only)
python main.py --all

# 2) All countries whose names start with A–G; outputs filename → batch_AG.parquet
python main.py --all --range A-G

# 3) Specific country + city
python main.py --include United-States New-York

# 4) Mix: all countries + also a specific city
python main.py --all --include Japan Tokyo

# 5) Multiple (country, city) pairs
python main.py --include Canada Toronto Germany Berlin
```

**Arguments**

- `--all` (flag): download country averages for all available countries.
- `--include` (list): pairs of *Country City...* tokens. Use hyphens in multi‑word names (e.g., `United-States New-York`). Cities are associated with the most recent country token.
- `--range` (string): alphabetical filter: `"A-G"`, `"M"`, `"N-Z"`, etc. Also used to auto‑name the output file (see below).

**Output**

- A Parquet file is written to `./data/`:
  - No `--range` → `all_countries.parquet`
  - `"A-G"` → `batch_AG.parquet`
  - `"M"` → `batch_M.parquet`
- If any city pages fail to parse/fetch, their names are listed in the console after saving.

## How It Works

### 1) Discovery & argument parsing
- The scraper fetches the Numbeo landing page and extracts the list of countries.
- CLI arguments are parsed into a `{country: [cities…]}` mapping, preserving which cities belong to which countries.

### 2) URL generation
- For each country, the tool builds a country‑average URL.
- City data uses a **city–country** URL; on failure, a **city‑only** URL is tried as a fallback.

### 3) HTTP fetching (rate‑limit aware)
- Each request uses a configurable timeout.
- On HTTP 429, the client retries with **exponential backoff + jitter**.
- Every attempt is followed by a randomized sleep to reduce request burstiness.

### 4) HTML parsing
- The parser targets the `table.data_wide_table` element.
- It extracts an “entries” count from page text (works for both country and city pages).
- For each item row it normalizes **Price**, **Low**, and **High** values; unparseable numbers become `NaN`.

### 5) Data shaping & schema
- Records are built with a deterministic column order: `Country`, `City`, `Entries`, then triples of columns per item: `Item`, `Item Low Range`, `Item High Range`.
- If an item name appears multiple times, later occurrences are suffixed (`Item_2`, `Item_3`, …).
- All numeric columns are coerced to `float64` for consistent downstream analytics.

### 6) Persistence
- Data are converted to a pandas `DataFrame` with the master column order and written to a single Parquet file in `./data/`.


## Troubleshooting

- **Import errors**: ensure your package layout matches the tree above or add `src/` to `PYTHONPATH`.
- **Empty output / few rows**: the site may have throttled requests; re‑run later or reduce frequency.

