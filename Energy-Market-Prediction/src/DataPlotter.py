# DataPlotter

import matplotlib.pyplot as plt
import pandas as pd
import seaborn as sns
import matplotlib.dates as mdates

class DataPlotter:
    def __init__(self, args):
        self.output_filepath = args.output_filepath

    def plot_outliers(self, df, n_cols=3):
        columns_to_plot = df.columns[1:]
        n_rows = (len(columns_to_plot) - 1) // n_cols + 1
        fig, axes = plt.subplots(n_rows, n_cols, figsize=(5*n_cols, 4*n_rows), squeeze=False)
        axes = axes.flatten()
        for i, col in enumerate(columns_to_plot):
            ax = axes[i]
            ax.boxplot(df[col], tick_labels=[col])
            # ax.set_yscale('symlog')
            ax.set_title(f'{col}')
            ax.set_ylabel('Values')
            ax.grid(True, alpha=0.2)
        for j in range(i+1, len(axes)):
            fig.delaxes(axes[j])
        plt.tight_layout()
        plt.savefig(self.output_filepath + '/outliers.png', bbox_inches='tight')
        plt.close(fig)

    def plot_imputed_data(self, df, imputed_indices, columns, start_date='2024-06-13 23', end_date='2024-06-28'):
        num_cols = len(columns)
        fig, axes = plt.subplots(num_cols, 1, figsize=(12, 6 * num_cols), sharex=True)
        for i, col in enumerate(columns):
            ax = axes[i] if num_cols > 1 else axes
            ax.step(df.index, df[col], where='post', color='blue', label='Original data')
            imputed_data = df[col].copy()
            imputed_data[~df.index.isin(imputed_indices[col])] = None
            ax.step(df.index, imputed_data, where='post', color='red', label='Imputed data')
            ax.set_xlim(pd.to_datetime(start_date), pd.to_datetime(end_date))
            ax.legend()
            ax.set_title(col)
        plt.tight_layout()
        plt.savefig(self.output_filepath + '/imputed_data.png', bbox_inches='tight')
        plt.close(fig)

    def corr_plot(self, full_dataset):
        correlation_matrix_polars = full_dataset[:,1:].corr()
        correlation_matrix_pandas = correlation_matrix_polars.to_pandas()
        columns = full_dataset[:, 1:].columns
        plt.figure(figsize=(30, 24))
        sns.heatmap(correlation_matrix_pandas, annot=False, fmt=".2f", cmap='PiYG',
                    square=True, linewidths=.5, cbar_kws={"shrink": .8},
                    xticklabels=columns, yticklabels=columns)
        plt.title('Full Correlation Matrix with Labels', fontsize=24)
        plt.xticks(rotation=90)
        plt.yticks(rotation=0)
        plt.tight_layout()
        plt.savefig(self.output_filepath + '/corr_plot.png', bbox_inches='tight')
        plt.close()

    def plot_combined_results(self, simplified_results, feature_importance_df):
        df = simplified_results.to_pandas()
        fig = plt.figure(figsize=(16, 24))
        gs = fig.add_gridspec(4, 2)
        ax1 = fig.add_subplot(gs[0, :])
        ax2 = fig.add_subplot(gs[1, :])
        ax3 = fig.add_subplot(gs[2, :])
        ax4 = fig.add_subplot(gs[3, :])
        # Plot 1: Time series of actual vs predicted values
        ax1.plot(df['datetime'], df['imbalance_price__eur_per_mwh'], label='Actual', alpha=0.7)
        ax1.plot(df['datetime'], df['predicted_balancing_price'], label='Predicted', alpha=0.7)
        ax1.set_title('Actual vs Predicted Imbalance Price Over Time')
        ax1.set_xlabel('Date')
        ax1.set_ylabel('Price (EUR/MWh)')
        ax1.legend()
        ax1.grid(True)
        ax1.xaxis.set_major_formatter(mdates.DateFormatter('%Y-%m-%d'))
        ax1.xaxis.set_major_locator(mdates.MonthLocator())
        plt.setp(ax1.xaxis.get_majorticklabels(), rotation=45, ha='right')
        # Plot 2: Scatter plot of actual vs predicted values
        ax2.scatter(df['imbalance_price__eur_per_mwh'], df['predicted_balancing_price'], alpha=0.5)
        ax2.set_title('Actual vs Predicted Imbalance Price')
        ax2.set_xlabel('Actual Price (EUR/MWh)')
        ax2.set_ylabel('Predicted Price (EUR/MWh)')
        min_val = min(df['imbalance_price__eur_per_mwh'].min(), df['predicted_balancing_price'].min())
        max_val = max(df['imbalance_price__eur_per_mwh'].max(), df['predicted_balancing_price'].max())
        ax2.plot([min_val, max_val], [min_val, max_val], 'r--', label='Perfect Prediction')
        ax2.legend()
        ax2.grid(True)
        # Plot 3: Top 20 features
        top_n = 20
        top_features = feature_importance_df.head(top_n)
        y_pos = range(len(top_features['feature']))
        ax3.barh(y_pos, top_features['importance'])
        ax3.set_yticks(y_pos)
        ax3.set_yticklabels(top_features['feature'])
        ax3.set_xlabel('Feature Importance')
        ax3.set_title('Top 20 Features')
        ax3.invert_yaxis()
        ax3.tick_params(axis='y', labelsize=8)
        fig.canvas.draw()
        ax3.set_ylim(ax3.get_ylim()[0] - 0.5, ax3.get_ylim()[1] + 0.5)
        # Plot 4: Cumulative PNL
        ax4.step(df['datetime'], df['PNL'].cumsum(), where='post', color='green')
        ax4.set_title('Cumulative PNL Over Time')
        ax4.set_xlabel('Date')
        ax4.set_ylabel('Cumulative PNL')
        ax4.grid(True)
        ax4.xaxis.set_major_formatter(mdates.DateFormatter('%Y-%m-%d'))
        ax4.xaxis.set_major_locator(mdates.MonthLocator())
        plt.setp(ax4.xaxis.get_majorticklabels(), rotation=45, ha='right')
        plt.tight_layout(pad=1.0, h_pad=1.0)
        plt.savefig(self.output_filepath + '/final_output.png', bbox_inches='tight')
        plt.close(fig)
