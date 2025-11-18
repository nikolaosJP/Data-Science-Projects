from .http_client import HttpClient
from .html_parser import HtmlParser
from .url_formatter import UrlFormatter
from .data_processor import DataProcessor
from .file_manager import FileManager

class CostOfLivingScraper:
    """Main cost of living scraper orchestrator."""
    
    def __init__(self):
        self.http_client = HttpClient()
        self.data_processor = DataProcessor()
        self.file_manager = FileManager()
        self.missing_data = []
        print("Initialized CostOfLivingScraper.")
    
    def get_country_name_list(self):
        """Fetch list of available countries."""
        response = self.http_client.get("https://www.numbeo.com/cost-of-living/")
        if not response:
            return []
        
        countries = HtmlParser.get_countries(response.text)
        print(f"Fetched {len(countries)} countries.")
        return countries
    
    def parse_city_arguments(self, args, country_list):
        """Parse command line arguments into country-city dictionary."""
        country_city_dict = {}
        current_country = None
        
        for arg in args:
            arg_clean = arg.replace('-', ' ')
            if arg_clean in country_list:
                current_country = arg_clean
                country_city_dict[current_country] = []
            elif current_country:
                country_city_dict[current_country].append(arg_clean)
        
        return country_city_dict
    
    def _fetch_location_data(self, url, country, city="average"):
        """Fetch and process data for a single location."""
        response = self.http_client.get(url)
        if not response:
            return False
        
        parsed_data, entries_count = HtmlParser.parse_cost_data(response.text)
        if not parsed_data:
            return False
        
        self.data_processor.add_record(country, city, parsed_data, entries_count)
        return True
        
    def run(self, download_all=False, include_locations=None, letter_range=None):
        """Main entry point to run the scraper."""
        include_locations = include_locations or []
        
        # Get available countries and parse locations
        available_countries = self.get_country_name_list()
        country_city_dict = self.parse_city_arguments(include_locations, available_countries)
        
        # Generate filename based on range
        filename = self._generate_filename(letter_range)
        
        # Download data
        self.merge_data(country_city_dict, download_all, letter_range)
        self.save_data_to_parquet(filename)

    def _generate_filename(self, letter_range):
        """Auto-generate filename based on letter range."""
        if not letter_range:
            return "all_countries.parquet"
        
        range_clean = letter_range.upper().replace('-', '').replace(' ', '')
        if '-' in letter_range:
            start, end = letter_range.upper().split('-', 1)
            return f"batch_{start.strip()}{end.strip()}.parquet"
        else:
            return f"batch_{range_clean}.parquet"

    def merge_data(self, country_city_dict, download_all_countries=False, letter_range=None):
        """Collect data for specified countries and cities."""
        
        # Determine countries to process
        if download_all_countries:
            countries_to_process = set(self.get_country_name_list())
        else:
            countries_to_process = set(country_city_dict.keys()) if country_city_dict else set()
        
        # Add specific countries
        if country_city_dict:
            countries_to_process.update(country_city_dict.keys())
        
        # Apply range filter
        if letter_range:
            start, end = self._parse_range(letter_range)
            original_count = len(countries_to_process)
            countries_to_process = {c for c in countries_to_process if start <= c[0].upper() <= end}
            print(f"Range {letter_range}: {len(countries_to_process)}/{original_count} countries")
        
        if not countries_to_process:
            print("No countries match the criteria.")
            return []
        
        print(f"Processing {len(countries_to_process)} countries...\n")
        
        # Process countries alphabetically
        for i, country in enumerate(sorted(countries_to_process), 1):
            print(f"[{i}/{len(countries_to_process)}] {country}")
            
            country_clean = UrlFormatter.clean_name(country)
            country_url = UrlFormatter.country_url(country_clean)
            
            # Download country average
            success = self._fetch_location_data(country_url, country_clean)
            print(f"    {'✓' if success else '✗'} Average")
            
            # Download cities if specified
            if country_city_dict and country in country_city_dict:
                for city in sorted(country_city_dict[country]):
                    if self._fetch_city_data(city, country_clean):
                        print(f"    ✓ {city}")
                    else:
                        self.missing_data.append(f"{city}, {country_clean}")
                        print(f"    ✗ {city}")
        
        return self.data_processor.data

    def _parse_range(self, range_str):
        """Parse range string into start/end letters."""
        range_str = range_str.upper().strip()
        if '-' in range_str:
            start, end = range_str.split('-', 1)
            return start.strip(), end.strip()
        return range_str, range_str

    def _fetch_city_data(self, city, country):
        """Try to fetch city data using multiple URL formats."""
        # Try city-country format first
        city_url = UrlFormatter.city_url(city, country)
        if self._fetch_location_data(city_url, country, city):
            return True
        
        # Try city-only format as fallback
        city_only_url = UrlFormatter.city_only_url(city)
        return self._fetch_location_data(city_only_url, country, city)
    
    def save_data_to_parquet(self, filename='cost_of_living_data.parquet'):
        """Save collected data to Parquet file."""
        try:
            df = self.data_processor.to_dataframe()
            self.file_manager.save_parquet(df, filename)
            
            if self.missing_data:
                print(f"\nLocations with missing data: {', '.join(self.missing_data)}")
            
            print("\nData collection and saving completed successfully.")
        
        except Exception as e:
            print(f"Error saving data: {e}")
