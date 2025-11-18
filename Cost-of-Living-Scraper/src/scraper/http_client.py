import time
import random
import requests
from requests.exceptions import RequestException

class HttpClient:
    """Handles HTTP requests with retry logic and rate limiting."""
    
    def __init__(self, timeout=10, rate_limit=3):  # Increased from 1 to 3 seconds
        self.timeout = timeout
        self.rate_limit = rate_limit
    
    def get(self, url, retries=3, backoff=5):  # Increased backoff from 2 to 5 seconds
        """Make HTTP GET request with retry logic."""
        for attempt in range(retries):
            try:
                response = requests.get(url, timeout=self.timeout)
                response.raise_for_status()
                return response
                
            except requests.exceptions.HTTPError as e:
                if e.response.status_code == 429:  # Rate limited
                    wait_time = backoff * (2 ** attempt) + random.uniform(1, 3)  # Exponential backoff + jitter
                    print(f"Rate limited. Waiting {wait_time:.1f}s before retry {attempt + 1}/{retries}")
                    time.sleep(wait_time)
                else:
                    raise e
                    
            except RequestException as e:
                if attempt < retries - 1:
                    wait_time = backoff * (attempt + 1)
                    print(f"Retrying {url} in {wait_time}s... (Attempt {attempt + 2}/{retries})")
                    time.sleep(wait_time)
                else:
                    print(f"Failed to fetch {url} after {retries} attempts: {e}")
                    return None
            finally:
                # Add randomized delay to look more human-like
                delay = self.rate_limit + random.uniform(0, 2)
                time.sleep(delay)
        return None
