import argparse
from src.scraper.scraper import CostOfLivingScraper

def parse_arguments():
    parser = argparse.ArgumentParser(
        description="Download cost-of-living data for countries and cities.",
        epilog="Examples:\n"
               "  python main.py --all                                   # All countries only\n"
               "  python main.py --all --range A-G                       # Countries A-G → batch_AG.parquet\n"
               "  python main.py --include United-States New-York        # Only US + NYC\n"
               "  python main.py --all --include Japan Tokyo             # All countries + Tokyo\n"
               "  python main.py --include Canada Toronto Germany Berlin # Specific countries + cities",
        formatter_class=argparse.RawDescriptionHelpFormatter
    )
    
    parser.add_argument(
        "--all", 
        action="store_true",
        help="Download data for all available countries"
    )
    parser.add_argument(
        "--include", 
        nargs='+',
        default=[],
        help="Specific countries and cities to include (use hyphens for multi-word names)"
    )
    parser.add_argument(
        "--range", 
        help="Alphabetical range (e.g., 'A-G', 'M', 'N-Z')"
    )
    
    return parser.parse_args()

if __name__ == "__main__":
    args = parse_arguments()

    if not args.all and not args.include:
        print("Error: Must specify either --all or --include")
        exit(1)

    scraper = CostOfLivingScraper()
    scraper.run(
        download_all=args.all,
        include_locations=args.include,
        letter_range=args.range
    )
