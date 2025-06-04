"""
Parse city data from https://simplemaps.com/data/us-cities into a usable json format
"""

import argparse
import csv
import json


def main():
    parser = argparse.ArgumentParser(
        description="Extract city lat/lng mapping from CSV."
    )
    parser.add_argument("input_csv", help="Path to the CSV file")
    parser.add_argument(
        "-o",
        "--output",
        default="city_lat_long.json",
        help="Output JSON file path (default: city_lat_long.json)",
    )
    args = parser.parse_args()

    result = {}
    with open(args.input_csv, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            city_state = f"{row['city']}, {row['state_id']}"
            result[city_state] = {
                "latitude": float(row["lat"]),
                "longitude": float(row["lng"]),
            }

    with open(args.output, "w", encoding="utf-8") as fout:
        json.dump(result, fout)


if __name__ == "__main__":
    main()
