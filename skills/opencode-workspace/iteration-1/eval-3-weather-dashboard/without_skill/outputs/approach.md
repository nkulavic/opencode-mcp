# Weather Dashboard - Implementation Plan

## Overview

This plan describes exactly how I would build a polished weather dashboard with current conditions, a 5-day forecast with icons, a temperature line chart, and a city search bar.

---

## 1. Overall Approach and Architecture Decisions

### Technology Stack

- **Framework**: Vanilla HTML/CSS/JavaScript (single file for simplicity and portability, no build step required)
- **Charting**: Chart.js (CDN) for the temperature line chart — lightweight, well-documented, no install needed
- **Weather API**: Open-Meteo (free, no API key required) for weather data, combined with Open-Meteo's Geocoding API for city search
- **Icons**: Weather condition icons rendered as Unicode emoji or SVG inline icons mapped to WMO weather codes from the API
- **Fonts**: Google Fonts (Inter) for a modern, clean typographic feel
- **No frameworks**: Keeping it dependency-light means the file is self-contained and runs anywhere

### Architecture

The app will be a single `index.html` file with embedded `<style>` and `<script>` sections, structured as:

1. **Search bar** — at the top, autocomplete-style city lookup via Geocoding API
2. **Current conditions panel** — large hero section showing temp, feels-like, humidity, wind, UV index, weather description, and a matching background gradient
3. **5-day forecast strip** — horizontal card row with day name, weather icon, high/low temperatures
4. **Temperature line chart** — Chart.js canvas showing hourly or daily temperature curve for the week
5. **Footer** — data attribution

### Design Philosophy

- Glassmorphism aesthetic: semi-transparent frosted-glass cards over a dynamic gradient background that changes based on current weather conditions (sunny = warm orange/yellow, rainy = cool blue/gray, cloudy = muted purple)
- Smooth CSS transitions and animations on data load
- Fully responsive layout using CSS Grid and Flexbox
- Dark mode support via `prefers-color-scheme` media query

---

## 2. Exact Sequence of Tool Calls

Since I am not using OpenCode MCP tools (per the "without_skill" context of this evaluation), I would accomplish this entirely with standard coding tools in the following sequence:

### Step 1: Create the project directory and scaffold the file

**Tool: Bash**
```
mkdir -p /path/to/project/weather-dashboard
```

**Tool: Write**
Create `/path/to/project/weather-dashboard/index.html` with the full skeleton:
- DOCTYPE, head with meta tags, Google Fonts link, Chart.js CDN script tag
- Body with placeholder sections for search, current conditions, forecast, and chart
- Empty `<style>` block and empty `<script>` block

### Step 2: Write the CSS (embedded in `<style>`)

**Tool: Edit** (on `index.html`)

Add the full stylesheet covering:

- CSS custom properties (variables) for the color palette:
  ```css
  :root {
    --bg-sunny: linear-gradient(135deg, #f6d365 0%, #fda085 100%);
    --bg-rainy: linear-gradient(135deg, #89f7fe 0%, #66a6ff 100%);
    --bg-cloudy: linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%);
    --bg-night: linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%);
    --glass-bg: rgba(255, 255, 255, 0.15);
    --glass-border: rgba(255, 255, 255, 0.25);
    --text-primary: #ffffff;
    --text-secondary: rgba(255, 255, 255, 0.75);
    --shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
    --radius: 20px;
  }
  ```
- `body` and `html`: full-height, background gradient transition (`transition: background 1s ease`)
- `.container`: max-width 1100px, centered, padding
- `.search-bar`: glassmorphism input field, magnifier icon, dropdown results list with hover states
- `.current-weather`: large card with grid layout — big temperature on left, details grid on right, animated entrance (`@keyframes fadeSlideUp`)
- `.weather-icon-large`: large emoji/SVG, subtle float animation (`@keyframes float`)
- `.forecast-strip`: horizontal scroll flex row of `.forecast-card` elements with glassmorphism treatment
- `.forecast-card`: day name, icon, high/low with color-coded temp dots
- `.chart-container`: glassmorphism card wrapping Chart.js canvas
- Responsive breakpoints at 768px and 480px
- Loading skeleton animation using `@keyframes shimmer`

### Step 3: Write the JavaScript (embedded in `<script>`)

**Tool: Edit** (on `index.html`)

Structure the JS with clearly named functions:

#### Constants and mappings
```javascript
const WMO_CODES = {
  0: { label: 'Clear Sky', icon: '☀️', bgClass: 'sunny' },
  1: { label: 'Mainly Clear', icon: '🌤️', bgClass: 'sunny' },
  2: { label: 'Partly Cloudy', icon: '⛅', bgClass: 'cloudy' },
  3: { label: 'Overcast', icon: '☁️', bgClass: 'cloudy' },
  45: { label: 'Foggy', icon: '🌫️', bgClass: 'cloudy' },
  61: { label: 'Light Rain', icon: '🌧️', bgClass: 'rainy' },
  63: { label: 'Moderate Rain', icon: '🌧️', bgClass: 'rainy' },
  71: { label: 'Light Snow', icon: '🌨️', bgClass: 'cloudy' },
  95: { label: 'Thunderstorm', icon: '⛈️', bgClass: 'rainy' },
  // ... full WMO code set
};
```

#### `searchCity(query)` function
- Debounced (300ms) fetch to `https://geocoding-api.open-meteo.com/v1/search?name={query}&count=5`
- Renders dropdown with city name, country, lat/lon
- On selection: calls `loadWeather(lat, lon, cityName)`

#### `loadWeather(lat, lon, cityName)` function
- Shows loading skeleton state
- Fetches from Open-Meteo:
  ```
  https://api.open-meteo.com/v1/forecast
    ?latitude={lat}
    &longitude={lon}
    &current=temperature_2m,apparent_temperature,relative_humidity_2m,
              wind_speed_10m,weather_code,uv_index,is_day
    &daily=weather_code,temperature_2m_max,temperature_2m_min
    &hourly=temperature_2m
    &temperature_unit=fahrenheit
    &wind_speed_unit=mph
    &timezone=auto
    &forecast_days=6
  ```
- On success: calls `renderCurrent()`, `renderForecast()`, `renderChart()`

#### `renderCurrent(data, cityName)` function
- Extracts current weather fields
- Determines day/night from `is_day` field
- Sets body background class for gradient transition
- Populates DOM: city name, temp, feels-like, humidity, wind, UV index, weather description, large icon

#### `renderForecast(daily)` function
- Iterates 5 days (skipping today, indices 1-5)
- Creates forecast cards with: weekday name, WMO icon, high temp, low temp
- Color-codes high temp (hot = orange, cold = blue) using a utility function:
  ```javascript
  function tempColor(temp) {
    if (temp > 90) return '#ff6b35';
    if (temp > 70) return '#ffa500';
    if (temp > 50) return '#4fc3f7';
    return '#81d4fa';
  }
  ```

#### `renderChart(hourly)` function
- Takes hourly temperature data for 5 days (120 data points)
- Formats labels as `'Mon 3pm'` style
- Destroys any existing Chart.js instance before creating new one
- Creates a smooth line chart:
  ```javascript
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: formattedLabels,
      datasets: [{
        label: 'Temperature (°F)',
        data: temps,
        borderColor: 'rgba(255,255,255,0.9)',
        backgroundColor: gradient, // canvas gradient fill
        borderWidth: 2.5,
        pointRadius: 0,
        tension: 0.4,
        fill: true,
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: { /* custom glassmorphism tooltip */ }
      },
      scales: {
        x: { /* styled white labels, no grid */ },
        y: { /* styled white labels, subtle grid */ }
      }
    }
  });
  ```

#### `init()` function
- Attempts `navigator.geolocation.getCurrentPosition()` to auto-load user's location on page load
- Falls back to New York City (40.71, -74.01) if denied
- Wires up search input event listener

### Step 4: Verify and polish

**Tool: Read** (on `index.html`)
- Review the full file to catch any typos, mismatched tags, or logic errors

**Tool: Edit** (on `index.html`, as needed)
- Fix any issues found during review
- Add final polish: loading spinner animation, error handling toast notification for API failures, smooth scroll behavior, `aria-label` attributes on interactive elements for accessibility

---

## 3. What Would Be Included in the Implementation

### Files
- `index.html` — the single complete deliverable, approximately 600-800 lines

### Features
| Feature | Implementation Detail |
|---|---|
| City search bar | Debounced geocoding API calls, keyboard-navigable dropdown |
| Auto-detect location | Geolocation API with graceful fallback |
| Current conditions | Temp, feels-like, humidity, wind speed, UV index, weather description |
| Dynamic background | Gradient changes per weather condition and day/night |
| 5-day forecast | Cards with icons, high/low temps, day names |
| Temperature chart | Chart.js smooth line with gradient fill, custom tooltips |
| Responsive layout | Works on mobile, tablet, and desktop |
| Error handling | User-friendly toast messages for network/API failures |
| Loading states | Shimmer skeleton animation while fetching |
| Accessibility | `aria-label`, keyboard navigation, sufficient contrast ratios |

### Data Source
- Open-Meteo API (free, no key required): `api.open-meteo.com`
- Open-Meteo Geocoding API: `geocoding-api.open-meteo.com`

---

## 4. How I Would Ensure It Looks Polished

### Visual Design
- **Glassmorphism cards**: `backdrop-filter: blur(16px)`, semi-transparent backgrounds, subtle white border, deep box-shadow — creates depth and a premium feel
- **Dynamic background gradients**: The full-page background smoothly transitions between warm (sunny), cool (rainy), and muted (cloudy) palettes using CSS transitions, making the UI feel responsive to the data
- **Typography hierarchy**: Large bold temperature as the hero element, medium weight for labels, light weight for secondary info — clear visual hierarchy using Inter font
- **Micro-animations**:
  - Cards fade and slide up on data load (`@keyframes fadeSlideUp`)
  - Weather icon gently floats (`@keyframes float` — subtle -6px translate over 3s ease-in-out)
  - Search dropdown slides down smoothly
  - Background gradient transitions over 1 second
- **Color-coded temperatures**: High/low temps in forecast use hue-shifted colors (orange for hot, blue for cold) providing instant visual context
- **Chart aesthetics**: White semi-transparent line, gradient fill from opaque to transparent, no distracting gridlines on X axis, minimal Y axis lines — feels like a premium weather app

### UX Polish
- Auto-load weather for user's city on page open (no blank state)
- Search results show city, region, and country to disambiguate same-name cities
- Pressing Enter in the search box selects the first result
- Clicking anywhere outside the search dropdown closes it
- All API errors show a dismissible toast notification, never a broken UI
- Units clearly labeled (°F, mph, %) throughout

### Code Quality
- Functions are small and single-purpose
- No global state mutation except via clearly named setters
- Chart instance properly destroyed before re-render to prevent memory leaks
- Debounced search to avoid spamming the geocoding API
- All DOM queries cached where reused
