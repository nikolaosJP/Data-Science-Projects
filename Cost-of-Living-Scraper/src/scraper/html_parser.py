import re
import numpy as np
from bs4 import BeautifulSoup

class HtmlParser:
    """Parses HTML content from Numbeo pages."""
    
    @staticmethod
    def get_countries(html_content):
        """Extract country list from main page."""
        soup = BeautifulSoup(html_content, "html.parser")
        countries = []
        
        for anchor in soup.find_all('a', href=True):
            if 'country_result' in anchor['href']:
                country = anchor["href"].split("=")[1].replace("+", " ")
                countries.append(country)
        
        return countries
    
    @staticmethod
    def parse_cost_data(html_content):
        """Parse cost of living data from HTML table."""
        soup = BeautifulSoup(html_content, "html.parser")
        table = soup.find("table", class_="data_wide_table")
        
        if not table:
            return None, None
        
        # Extract entries count
        entries_match = re.search(r'This\s+(?:country|city)\s+had\s+(\d+)\s+entries', 
                                soup.get_text(), re.IGNORECASE)
        entries_count = int(entries_match.group(1)) if entries_match else np.nan
        
        # Parse table data
        data = []
        for row in table.find_all("tr"):
            cols = row.find_all("td")
            if cols:
                name = cols[0].text.strip()
                price = HtmlParser._clean_price(cols[1].text.strip())
                range_data = cols[2].text.strip() if len(cols) > 2 else ""
                low, high = HtmlParser._parse_range(range_data)
                
                data.append({
                    'name': name,
                    'price': HtmlParser._safe_float(price),
                    'low': low,
                    'high': high
                })
        
        return data, entries_count
    
    @staticmethod
    def _clean_price(price_str):
        """Clean price string."""
        return price_str.replace('\xa0$', '').replace(',', '').strip()
    
    @staticmethod
    def _parse_range(range_str):
        """Parse range string into low and high values."""
        try:
            cleaned = range_str.replace('\xa0$', '').replace(',', '').strip()
            low, high = cleaned.split('-')
            return HtmlParser._safe_float(low), HtmlParser._safe_float(high)
        except (ValueError, AttributeError):
            return np.nan, np.nan
    
    @staticmethod
    def _safe_float(value):
        """Safely convert to float."""
        try:
            return float(value)
        except (ValueError, TypeError):
            return np.nan
