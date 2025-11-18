# DataProcessor

# Import libraries
import polars as pl
from datetime import timedelta
import pandas as pd
from statsmodels.tsa.seasonal import STL
import matplotlib.pyplot as plt
from multiprocessing import Pool
from functools import partial

# Import custom library
from src.DataPlotter import DataPlotter

class DataProcessor:
    def __init__(self, df, args):
        self.df = df
        self.args = args

    def replace_hydro_outlier(self):
        next_highest = self.df.filter(pl.col('hydro_forecast__mwh__neighbors') < 50_000).select(pl.col('hydro_forecast__mwh__neighbors').max()).item()
        self.df = self.df.with_columns(
            pl.when(pl.col('hydro_forecast__mwh__neighbors') >= 50_000)
            .then(next_highest)
            .otherwise(pl.col('hydro_forecast__mwh__neighbors'))
            .alias('hydro_forecast__mwh__neighbors')
        )

    def find_irr_intervals(self):
        start_datetime = self.df['datetime'].min()
        end_datetime = self.df['datetime'].max()
        total_hours = int((end_datetime - start_datetime).total_seconds() // 3600)
        full_datetime_range = pl.Series(
            "datetime", 
            [start_datetime + timedelta(hours=i) for i in range(total_hours + 1)] 
        )
        full_range_df = pl.DataFrame({
            "datetime": full_datetime_range
        }).with_columns(pl.col("datetime").cast(pl.Datetime("ns"))) 
        irregular_intervals = []
        previous_time = self.df['datetime'][0]
        for i in range(1, self.df.shape[0]):
            current_time = self.df['datetime'][i]
            delta = (current_time - previous_time).total_seconds() / 3600  
            if delta != 1: 
                missing_hours = delta - 1 
                irregular_intervals.append((i-1, i, previous_time, current_time, missing_hours))
                #print(f"Irregular interval from index {i-1} to {i}: {previous_time} to {current_time}, gap: {missing_hours} hours")
            previous_time = current_time
        new_df = full_range_df.join(self.df, on="datetime", how="left")
        missing_rows = new_df.filter(pl.col("nuclear_forecast__mwh").is_null())
        #print(f"Total missing rows: {missing_rows.shape[0]}")
        self.df = new_df.to_pandas().set_index('datetime').copy()

    @staticmethod
    def impute_data_with_stl(df, col):
        data = df.copy()
        imputed_indices = data[data[col].isnull()].index
        stl = STL(data[col].interpolate(),
                  seasonal=25,
                  period=24,
                  trend=169,
                  low_pass=169,
                  seasonal_deg=1,
                  trend_deg=1,
                  low_pass_deg=1,
                  robust=True)
        res = stl.fit()
        seasonal_component = res.seasonal
        df_deseasonalised = data[col] - seasonal_component
        df_deseasonalised_imputed = df_deseasonalised.interpolate(method="linear")
        df_imputed = df_deseasonalised_imputed + seasonal_component
        data.loc[imputed_indices, col] = df_imputed[imputed_indices]
        return col, data[col], imputed_indices

    def generate_stl_pred_parallel(self, columns, n_workers=7):
        with Pool(n_workers) as pool:
            results = pool.map(partial(self.impute_data_with_stl, self.df), columns)
        imputed_df = self.df.copy()
        imputed_indices = {}
        for col, imputed_series, indices in results:
            imputed_df[col] = imputed_series
            imputed_indices[col] = indices
        return imputed_df, imputed_indices

    def process_data(self):
        self.plotter = DataPlotter(self.args)
        self.replace_hydro_outlier()
        self.find_irr_intervals()
        
        columns_to_process = self.df.columns
        imputed_df, imputed_indices = self.generate_stl_pred_parallel(columns_to_process)
       
        self.plotter.plot_outliers(self.df)
        self.plotter.plot_imputed_data(imputed_df, imputed_indices, ['consumption_forecast__mwh'])

        return imputed_df, imputed_indices
