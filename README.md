# OpenSunSafe

OpenSunSafe is a minimal browser-based UV safety tracker. Enter your location (latitude/longitude) and select your Fitzpatrick skin type to fetch and display current, historical, and forecast UV index data in an interactive circular timeline.

## Data Source
UV data is fetched from the CurrentUVIndex API:
```
https://currentuvindex.com/api/v1/uvi?latitude={lat}&longitude={lng}
```

## Features
- Interactive circle view showing UV index by hour  
- Estimated safe sun exposure time calculated based on skin type  

## Usage
1. From your project root, start a local HTTP server (e.g. `python3 -m http.server 8000`).
2. Open `http://localhost:8000/public_html/index.html` in your browser.
3. Go to **Settings**, enter your latitude, longitude, and skin type.
4. Switch back to **Home** to view live UV information.

Built with plain HTML, CSS, and JavaScript.
