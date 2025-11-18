import os

class FileManager:
    """Handles file operations."""
    
    def __init__(self, data_dir='data'):
        self.data_dir = os.path.join(os.getcwd(), data_dir)
        os.makedirs(self.data_dir, exist_ok=True)
    
    def save_parquet(self, df, filename='cost_of_living_data.parquet'):
        """Save DataFrame to Parquet file."""
        output_path = os.path.join(self.data_dir, filename)
        df.to_parquet(output_path, index=False)
        print(f"Data saved successfully to {output_path}")
        return output_path
