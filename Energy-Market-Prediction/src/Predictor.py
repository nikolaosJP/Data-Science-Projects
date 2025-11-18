# Import libraries
import polars as pl
import numpy as np
from sklearn.metrics import mean_squared_error
from xgboost import XGBRegressor
import optuna
import pandas as pd
import logging
import matplotlib.pyplot as plt

from src.DataPlotter import DataPlotter

class Predictor:
    def __init__(self, args, full_dataset):
        self.args = args
        self.full_dataset = full_dataset
        self.output_filepath = self.args.output_filepath
        optuna.logging.set_verbosity(optuna.logging.WARNING)

    def train_predict_model_with_params(self, train_data, val_data, params):
        """
        Train an XGBoost model with given hyperparameters to predict 'imbalance_price__eur_per_mwh' and make predictions on validation data.
        """
        train_df = train_data.to_pandas()
        val_df = val_data.to_pandas()
        required_columns = ['datetime', 'imbalance_price__eur_per_mwh']
        for col in required_columns:
            if col not in train_df.columns or col not in val_df.columns:
                raise ValueError(f"Column '{col}' not found in data.")
        # Use all columns except 'datetime' and 'imbalance_price__eur_per_mwh' as features
        feature_cols = [col for col in train_df.columns if col not in ['datetime', 'imbalance_price__eur_per_mwh']]
        target_col = 'imbalance_price__eur_per_mwh'
        X_train = train_df[feature_cols]
        y_train = train_df[target_col]
        X_val = val_df[feature_cols]
        y_val = val_df[target_col]
        if X_train.empty or X_val.empty:
            raise ValueError("Training or validation data is empty after filtering.")
        model = XGBRegressor(
            objective='reg:squarederror',
            n_estimators=int(params['n_estimators']),
            learning_rate=params['learning_rate'],
            max_depth=int(params['max_depth']),
            subsample=params['subsample'],
            colsample_bytree=params['colsample_bytree'],
            gamma=params['gamma'],
            reg_alpha=params['reg_alpha'],
            reg_lambda=params['reg_lambda'],
            random_state=42,
            n_jobs=-1
        )
        model.fit(X_train, y_train)
        val_predictions = model.predict(X_val)
        val_data = val_data.with_columns([
            pl.Series("predicted_balancing_price", val_predictions)
        ])
        return val_data, model, feature_cols

    def backtest_strategy(self, data, trading_quantity, params):
        sensitivity = params['sensitivity']
        data = data.with_columns([
            (pl.col("predicted_balancing_price") - pl.col("spot_price_forecast__eur_per_mwh")).alias("price_spread")
        ])
        def calculate_trading_quantity(x):
            if x >= 0:
                return trading_quantity * (1 - np.exp(-sensitivity * x))
            else:
                return -trading_quantity * (1 - np.exp(sensitivity * x))
        data = data.with_columns([
            pl.col("price_spread")
              .map_elements(calculate_trading_quantity, return_dtype=pl.Float64)
              .alias("trading_quantity")
        ])
        data = data.with_columns([
            (pl.col("trading_quantity") * 
             (pl.col("imbalance_price__eur_per_mwh") - pl.col("spot_price_realized__eur_per_mwh")))
            .alias("PNL")
        ])
        total_pnl = data["PNL"].sum()
        return data, total_pnl

    def evaluate_model_performance(self, model, test_data):
        """
        Evaluate the model's performance on test data.
        """
        test_df = test_data.to_pandas()
        # Use all columns except 'datetime' and 'imbalance_price__eur_per_mwh' as features
        feature_cols = [col for col in test_df.columns if col not in ['datetime', 'imbalance_price__eur_per_mwh']]
        target_col = 'imbalance_price__eur_per_mwh'
        X_test = test_df[feature_cols]
        y_test = test_df[target_col]
        test_predictions = model.predict(X_test)
        mse = mean_squared_error(y_test, test_predictions)
        rmse = np.sqrt(mse)
        mae = np.mean(np.abs(y_test - test_predictions))
        mape = np.mean(np.abs((y_test - test_predictions) / y_test)) * 100
        return {
            'MSE': mse,
            'RMSE': rmse,
            'MAE': mae,
            'MAPE': mape
        }, test_predictions
    
    def hyperparameter_optimization(self, data, train_start_date, val_start_date, test_start_date, test_end_date, max_trade, n_trials=40):
        # Split data into training, validation, and test sets
        train_data = data.filter(
            (pl.col("datetime") >= pl.datetime(*train_start_date)) & 
            (pl.col("datetime") < pl.datetime(*val_start_date))
        )
        val_data = data.filter(
            (pl.col("datetime") >= pl.datetime(*val_start_date)) & 
            (pl.col("datetime") < pl.datetime(*test_start_date))
        )
        test_data = data.filter(
            (pl.col("datetime") >= pl.datetime(*test_start_date)) & 
            (pl.col("datetime") <= pl.datetime(*test_end_date))
        )
        if len(train_data) == 0 or len(val_data) == 0 or len(test_data) == 0:
            raise ValueError("One of the data splits is empty. Please check your date ranges and data.")
        all_results = []
        def objective(trial):
            params = {
                'n_estimators': trial.suggest_int('n_estimators', 50, 500),
                'learning_rate': trial.suggest_float('learning_rate', 0.01, 0.3),
                'max_depth': trial.suggest_int('max_depth', 3, 10),
                'subsample': trial.suggest_float('subsample', 0.5, 1.0),
                'colsample_bytree': trial.suggest_float('colsample_bytree', 0.5, 1.0),
                'gamma': trial.suggest_float('gamma', 0, 5),
                'reg_alpha': trial.suggest_float('reg_alpha', 0, 5),
                'reg_lambda': trial.suggest_float('reg_lambda', 0, 5),
                'sensitivity': trial.suggest_float('sensitivity', 0.01, 1.0),
            }
            # Train the model and make predictions
            try:
                val_data_with_predictions, _, _ = self.train_predict_model_with_params(train_data, val_data, params)
            except ValueError as e:
                all_results.append({
                    'trial_number': trial.number,
                    'params': params,
                    'pnl': float('-inf'),
                    'status': 'Failed',
                    'exception': str(e)
                })
                return float('inf') 
            val_data_with_predictions = val_data_with_predictions.drop_nulls(subset=["predicted_balancing_price"])
            if len(val_data_with_predictions) == 0:
                all_results.append({
                    'trial_number': trial.number,
                    'params': params,
                    'pnl': float('-inf'),
                    'status': 'No valid predictions'
                })
                return float('inf')
            # Backtest strategy
            _, total_pnl = self.backtest_strategy(val_data_with_predictions, max_trade, params)
            iteration_result = {
                'trial_number': trial.number,
                'params': params.copy(),
                'pnl': total_pnl,
                'status': 'Success'
            }
            all_results.append(iteration_result)
            return -total_pnl
                
        study = optuna.create_study(direction='minimize')
        # Optimize the optuna study
        study.optimize(objective, n_trials=n_trials)
        # Get the best hyperparameters
        best_params = study.best_params
        best_pnl = -study.best_value 
        # Combine valid + train sets
        train_val_data = data.filter(
            (pl.col("datetime") >= pl.datetime(*train_start_date)) & 
            (pl.col("datetime") < pl.datetime(*test_start_date))
        )
        # Train final model on all training data using best hyperparameters
        final_val_data_with_predictions, final_model, feature_cols = self.train_predict_model_with_params(train_val_data, test_data, best_params)
        final_val_data_with_predictions = final_val_data_with_predictions.drop_nulls(subset=["predicted_balancing_price"])
        # Perform final backtest with optimized sensitivity
        final_backtest_results, total_pnl = self.backtest_strategy(final_val_data_with_predictions, max_trade, best_params)
        # Evaluate model performance on test data
        performance_metrics, _ = self.evaluate_model_performance(final_model, test_data)
        simplified_results = final_backtest_results.select([
            "datetime",
            "spot_price_forecast__eur_per_mwh",
            "imbalance_price__eur_per_mwh",
            "predicted_balancing_price",
            "price_spread",
            "trading_quantity",
            "PNL"
        ])
        return simplified_results, all_results, final_model, feature_cols

    def run_optimization(self, data, train_start_date, val_start_date, test_start_date, test_end_date, max_trade=10, n_trials=2):
        simplified_results, all_params, final_model, feature_cols = self.hyperparameter_optimization(
            data, train_start_date, val_start_date, test_start_date, test_end_date, max_trade, n_trials
        )
        all_params_df = pd.DataFrame(all_params)
        params_df = all_params_df['params'].apply(pd.Series)
        all_results_combined = pd.concat([all_params_df.drop('params', axis=1), params_df], axis=1)
        csv_string = all_results_combined.to_csv(index=False)

        # Compute feature importance
        feature_importances = final_model.feature_importances_
        feature_importance_df = pd.DataFrame({
            'feature': feature_cols,
            'importance': feature_importances
        })
        feature_importance_df = feature_importance_df.sort_values(by='importance', ascending=False)
        # Return the results along with feature importance data
        return simplified_results, csv_string, feature_importance_df


    def run_predictor(self):
        simplified_results, csv_string, feature_importance_df = self.run_optimization(
            self.full_dataset,
            train_start_date=(2023, 1, 1),
            val_start_date=(2023, 7, 1),
            test_start_date=(2024, 1, 1),
            test_end_date=(2024, 8, 30),
            max_trade=10,
            n_trials= self.args.n_trials
        )
        
        simplified_results.write_parquet(self.output_filepath + "/simplified_results.parquet") 
        with open(self.output_filepath + "/optimization_results.txt", "w") as f:
            f.write(csv_string)
        
        # Plotting
        self.plotter = DataPlotter(self.args)
        self.plotter.corr_plot(self.full_dataset)
        self.plotter.plot_combined_results(simplified_results, feature_importance_df)


