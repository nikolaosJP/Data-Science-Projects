import pandas as pd
import numpy as np

class DataProcessor:
    """Handles data processing and column management."""
    
    def __init__(self):
        self.data = []
        self.master_columns = ["Country", "City", "Entries"]
        self.column_mapping = {}
    
    def add_record(self, country, city, parsed_data, entries_count):
        """Add a new record to the dataset."""
        record = {"Country": country, "City": city, "Entries": entries_count}
        column_counts = {}
        columns_order = ["Country", "City", "Entries"]
        
        for item in parsed_data:
            name = item['name']
            column_counts[name] = column_counts.get(name, 0) + 1
            occurrence = column_counts[name]
            
            # Generate unique column name
            key = (name, occurrence)
            if key in self.column_mapping:
                unique_name = self.column_mapping[key]
            else:
                unique_name = name if occurrence == 1 else f"{name}_{occurrence}"
                self.column_mapping[key] = unique_name
            
            # Add data
            record[unique_name] = item['price']
            record[f"{unique_name} Low Range"] = item['low']
            record[f"{unique_name} High Range"] = item['high']
            
            # Update column order
            for col in [unique_name, f"{unique_name} Low Range", f"{unique_name} High Range"]:
                if col not in columns_order:
                    columns_order.append(col)
        
        self._update_master_columns(columns_order)
        self.data.append(record)
    
    def _update_master_columns(self, new_columns):
        """Update master column list maintaining order."""
        master_i = new_i = 0
        
        while new_i < len(new_columns):
            new_col = new_columns[new_i]
            if master_i < len(self.master_columns) and self.master_columns[master_i] == new_col:
                master_i += 1
            elif new_col in self.master_columns:
                master_i = self.master_columns.index(new_col) + 1
            else:
                self.master_columns.insert(master_i, new_col)
                master_i += 1
            new_i += 1
    
    def to_dataframe(self):
        """Convert data to pandas DataFrame."""
        df = pd.DataFrame(self.data, columns=self.master_columns)
        
        # Convert numeric columns
        for col in df.columns:
            if col not in ['Country', 'City']:
                df[col] = pd.to_numeric(df[col], errors='coerce')
        
        # Ensure float64 for numeric columns
        numeric_cols = df.select_dtypes(include=[np.number]).columns
        df[numeric_cols] = df[numeric_cols].astype('float64')
        
        return df
