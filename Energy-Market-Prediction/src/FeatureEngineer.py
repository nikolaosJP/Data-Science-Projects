import polars as pl
import numpy as np

class FeatureEngineer:
    def __init__(self, args, imputed_df):
        self._imputed_data = pl.from_pandas(imputed_df.reset_index())
        self._preprocessed_data = None
        self._preprocess()

    def _engineer_features(self):
        return self._imputed_data.with_columns([
            # Time features
            pl.when(pl.col('datetime').dt.month().is_in([12, 1, 2])).then(0)
              .when(pl.col('datetime').dt.month().is_in([3, 4, 5])).then(1)
              .when(pl.col('datetime').dt.month().is_in([6, 7, 8])).then(2)
              .when(pl.col('datetime').dt.month().is_in([9, 10, 11])).then(3)
              .otherwise(-1)
              .alias('season'), 
            (pl.col('datetime').dt.hour() * (2 * np.pi / 24)).sin().alias('hour_sin'),
            (pl.col('datetime').dt.hour() * (2 * np.pi / 24)).cos().alias('hour_cos'),
            (pl.col('datetime').dt.weekday() * (2 * np.pi / 7)).sin().alias('weekday_sin'),
            (pl.col('datetime').dt.weekday() * (2 * np.pi / 7)).cos().alias('weekday_cos'),
            pl.col('datetime').dt.weekday().is_in([6, 7]).cast(pl.Int8).alias('weekend'),
            (pl.col('datetime').dt.month() * (2 * np.pi / 12)).sin().alias('month_sin'),
            (pl.col('datetime').dt.month() * (2 * np.pi / 12)).cos().alias('month_cos'),
            pl.col('datetime').dt.year().alias('year')
        ]).with_columns([    
            (pl.col('season') * (2 * np.pi / 4)).sin().alias('season_sin'),
            (pl.col('season') * (2 * np.pi / 4)).cos().alias('season_cos'),
            (pl.col('hydro_forecast__mwh') + pl.col('nuclear_forecast__mwh') + pl.col('solar_forecast__mwh') +
             pl.col('thermal_chp_forecast__mwh') + pl.col('wind_forecast__mwh')).alias('total_forecasted_gen__areaA'),
            (pl.col('hydro_forecast__mwh__neighbors') + pl.col('solar_forecast__mwh__neighbors') +
             pl.col('wind_forecast__mwh__neighbors')).alias('total_forecasted_gen__neighbors')
        ]).drop('season').with_columns([
            ((pl.col('wind_forecast__mwh') + pl.col('solar_forecast__mwh') + pl.col('hydro_forecast__mwh')) / pl.col('total_forecasted_gen__areaA')).alias('renewable_share__areaA'),
            (pl.col('spot_price_forecast__eur_per_mwh') - pl.col('spot_price_realized__eur_per_mwh')).alias('spot_price_diff_areaA'),
            (pl.col('spot_price_forecast__eur_per_mwh__areaB') - pl.col('spot_price_realized__eur_per_mwh')).alias('spot_price_diff_areaB'),
            (pl.col('spot_price_forecast__eur_per_mwh__areaC') - pl.col('spot_price_realized__eur_per_mwh')).alias('spot_price_diff_areaC'),
            (pl.col('imbalance_price__eur_per_mwh') - pl.col('spot_price_realized__eur_per_mwh')).alias('spread_BM_S_area_A'),
            (pl.col('imbalance_price__eur_per_mwh') - pl.col('spot_price_forecast__eur_per_mwh__areaB')).alias('spread_BM_S_area_B'),
            (pl.col('imbalance_price__eur_per_mwh') - pl.col('spot_price_forecast__eur_per_mwh__areaC')).alias('spread_BM_S_area_C'),
            (pl.col('consumption_forecast__mwh') - pl.col('total_forecasted_gen__areaA')).alias('con_gen_diff__areaA'),
            (pl.col('consumption_forecast__mwh__neighbors') - pl.col('total_forecasted_gen__neighbors')).alias('con_gen_diff__neighbors'),
            (pl.col('spot_commercial_flow_forecast__mw__to_areaB') + pl.col('spot_commercial_flow_forecast__mw__to_areaC')).alias('net_commercial_flow_areaA'),
        ])

    def _add_moving_averages(self, df, columns, window_sizes):
        for col in columns:
            for label, window in window_sizes.items():
                if "SMA" in label:
                    df = df.with_columns(
                        pl.col(col).rolling_mean(window_size=window).alias(f"{col}_{label}")
                    )
                elif "EMA" in label:
                    df = df.with_columns(
                        pl.col(col).ewm_mean(span=window).alias(f"{col}_{label}")
                    )
        return df

    def _add_lagged_values(self, df, columns, lag_periods):
        for col in columns:
            for lag in lag_periods:
                df = df.with_columns(
                    pl.col(col).shift(lag).alias(f"{col}_lag_{lag}")
                )
        return df

    def _preprocess(self):
        df = self._engineer_features()

        SMA_EMA_columns = [
            'spot_price_realized__eur_per_mwh', 
            'spot_price_forecast__eur_per_mwh__areaB',
            'spot_price_forecast__eur_per_mwh__areaC', 
            'imbalance_price__eur_per_mwh',
            'spread_BM_S_area_A', 
            'spread_BM_S_area_B', 
            'spread_BM_S_area_C',
            'consumption_forecast__mwh', 
            'total_forecasted_gen__areaA'
        ]
        SMA_EMA_window_sizes = {
            "SMA_1d": 24,
            "SMA_7d": 24 * 7,
            "EMA_1d": 24,
            "EMA_7d": 24 * 7
        }
        lag_columns = [
            'spot_price_realized__eur_per_mwh', 
            'spot_price_forecast__eur_per_mwh__areaB',
            'spot_price_forecast__eur_per_mwh__areaC', 
            'imbalance_price__eur_per_mwh',
            'spread_BM_S_area_A', 
            'spread_BM_S_area_B', 
            'spread_BM_S_area_C',
            'consumption_forecast__mwh', 
            'total_forecasted_gen__areaA'
        ]
        lag_periods = [24, 24*2, 24*7]

        df = self._add_moving_averages(df, SMA_EMA_columns, SMA_EMA_window_sizes)
        df = self._add_lagged_values(df, lag_columns, lag_periods)
        self._preprocessed_data = df.drop_nulls()

    @property
    def preprocessed_data(self):
        return self._preprocessed_data
