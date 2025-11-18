# Energy Market Prediction Model

## Project Description

This project implements a machine learning-based forecasting system for energy market prices using XGBoost regression. The model predicts day-ahead energy prices to support trading decisions in electricity markets, with a focus on optimizing profit and loss (PNL) through intelligent price spread forecasting.

The system processes historical energy market data including generation forecasts, consumption patterns, spot prices, and imbalance prices to predict future market conditions. By leveraging advanced feature engineering techniques and hyperparameter optimization with Optuna, the model achieves accurate predictions for the next-day trading window.

**Key Features:**
- Comprehensive data preprocessing pipeline with STL-based imputation for handling missing values
- Advanced feature engineering including time-based features, moving averages, and lagged values
- XGBoost-based regression model optimized for trading PNL
- Backtesting framework for evaluating trading strategy performance
- Automated hyperparameter tuning with Optuna
- Support for both command-line execution and interactive Jupyter notebook analysis

**Use Case:** The model assumes predictions are made at 9:30am each day for the following trading window (00:00 to 23:59 of the next day), simulating real-world energy trading scenarios.

## Setup

1. Install the required dependencies (uv pip install -r requirements.txt).
2. Run the main.py file (python3 main.py --n_trials 30). Alternatively, you can examine the whole project via jupyter notebook (see /jupyter dir).
3. If you choose to run the main.py file, then the  results will be directed to the /output dir.

## Overview

This project consists of three major parts:
1. Data preparation & exploration
2. Feature engineering
3. Model building & evaluation

## Data Preparation & Exploration

- **Duplicates:** None found
- **Formatting Issues:** None found
- **Missing Data Checks:** Irregular intervals checked
- **Outlier Checks:** 
  - Box plot used for visualization
  - One outlier replaced in `hydro_forecast__mwh__neighbors` column
- **Data Distribution:** Most columns are not normally distributed
- **Missing Data Imputation:**
  - Models tested:
    1. Linear Interpolation
    2. K-Nearest Neighbors (KNN)
    3. Seasonal and Trend decomposition using LOESS (STL) with Linear Interpolation
  - STL method performed best, handling complexity and seasonality most effectively

## Feature Engineering

### Time-based Features
1. Season (winter, spring, summer, autumn)
2. Cyclical encoding for hour, weekday, and month
3. Binary weekend feature
4. Year feature

### Energy-related Features
1. Total forecasted generation for main and neighboring areas
2. Renewable energy share for main area
3. Price-related features (spot price differences, imbalance-spot price spreads)
4. Load-related features (consumption forecast vs. total forecasted generation differences)
5. Net commercial flow for main area

### Moving Averages
- Simple Moving Averages (SMA) and Exponential Moving Averages (EMA)
- 1-day and 7-day windows

### Lagged Values
- Created for important variables
- Lag periods: 24 hours, 48 hours, and 168 hours (1 week)

### Data Cleaning and Export
- Removed rows with null values
- Saved engineered dataset as a new Parquet file

## Model Building & Evaluation

### Feature Correlation Checks
- Performed, but XGBoost can handle correlated features well

### Data Preparation
- Split into train, validation, and test datasets

### Model Training and Prediction
- Used XGBoost algorithm

### Hyperparameter Tuning
- Utilized Optuna to minimize negative PNL

### Backtesting Strategy
1. Price Spread Calculation
2. Trading Quantity Determination
3. PNL Calculation

### Model Evaluation Metrics
- Mean Squared Error (MSE)
- Root Mean Squared Error (RMSE)
- Mean Absolute Error (MAE)
- Mean Absolute Percentage Error (MAPE)

### Results

The model was optimized across 30 trials using Optuna, with the best performing configuration achieving impressive results:

**Best Model Performance (Trial 8):**
- **Total PNL:** €1,384,880.61
- **Model Parameters:**
  - n_estimators: 498
  - learning_rate: 0.076
  - max_depth: 5
  - subsample: 0.94
  - colsample_bytree: 0.63

**Key Insights:**
- The optimization process explored various hyperparameter combinations, with PNL ranging from €973,797 to €1,384,880
- The model successfully captures both temporal patterns and price dynamics in the energy market
- Feature importance analysis reveals that lagged values and moving averages are among the most predictive features
- The cumulative PNL demonstrates consistent positive returns over the backtesting period

![Model Results](output/final_output.png)

*The visualization above shows: (1) Actual vs Predicted imbalance prices over time, (2) Prediction accuracy scatter plot, (3) Top 20 most important features, and (4) Cumulative PNL progression demonstrating the trading strategy's profitability.*

### Notes
- The model assumes that at 9:30am on each given day, we make predictions for the following trading window which spans from 00:00 until 23:59 of the following day.
