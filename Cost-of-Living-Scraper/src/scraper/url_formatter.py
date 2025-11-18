class UrlFormatter:
    """Handles URL formatting for countries and cities."""
    
    BASE_URL = "https://www.numbeo.com/cost-of-living/"
    
    @staticmethod
    def format_country_name(name):
        """Format country name for URL."""
        return name.replace(" ", "+").replace("-", "+").replace("(", "%28").replace(")", "%29")
    
    @staticmethod
    def format_city_name(name):
        """Format city name for URL."""
        return name.replace(" ", "-").replace("--", "-").replace("(", "").replace(")", "")
    
    @staticmethod
    def clean_name(name):
        """Clean encoded characters in location names."""
        return name.replace("%28", "(").replace("%29", ")").replace("+", " ")
    
    @classmethod
    def country_url(cls, country):
        """Generate country-level cost of living URL."""
        formatted = cls.format_country_name(country)
        return f"{cls.BASE_URL}country_result.jsp?country={formatted}&displayCurrency=USD"
    
    @classmethod
    def city_url(cls, city, country):
        """Generate city-level cost of living URL."""
        city_formatted = cls.format_city_name(city)
        country_formatted = cls.format_country_name(country)
        return f"{cls.BASE_URL}in/{city_formatted}-{country_formatted}?displayCurrency=USD"
    
    @classmethod
    def city_only_url(cls, city):
        """Generate city-only URL as fallback."""
        city_formatted = cls.format_city_name(city)
        return f"{cls.BASE_URL}in/{city_formatted}?displayCurrency=USD"
