import argparse
import os
import polars as pl
from src.DataPlotter import DataPlotter
from src.DataProcessor import DataProcessor
from src.FeatureEngineer import FeatureEngineer
from src.Predictor import Predictor

def parse_arguments():
    parser = argparse.ArgumentParser(description='Axpo coding challenge: capturing the price spread between day-ahead and balancing markets in area A')
    parser.add_argument('--n_trials', type=int, default=2,help='Number of iterations for XGBoost (default:2)')
    return parser.parse_args()

if __name__ == "__main__":
    # Reading arguments
    args = parse_arguments()
    args.current_dir = os.getcwd()
    args.output_filepath = args.current_dir + '/output'
    
    # Processing the data (identification of outliers and data imputation)
    print("======> Data processing")
    df = pl.read_parquet(args.current_dir + '/data/master_table.parquet')
    processor = DataProcessor(df, args)
    imputed_df, _ = processor.process_data()

    # Feature engineering
    print("======> Feature engineering")
    engineer = FeatureEngineer(args, imputed_df)
    processed_dataset = engineer.preprocessed_data
    
    # Predictor
    print("======> Model building")
    predict = Predictor(args, processed_dataset)
    predict.run_predictor()

    print("Finished. Thank you for your patience :)")
