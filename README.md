# 🚂 Railway Temperature Dashboard

## Overview
This React application visualizes temperature exceedance data from railway sensors. It processes and displays temperature readings collected from sensors on moving trains over a React-Leaflet map, helping identify potential maintenance issues along railway tracks. It features functionality for filtering and sorting the csv data. It also has added UI elements such as a dark mode toggle and an option to expand and collapse the map view.

## Features

- **Interactive Map** - Visualizes temperature data using React-Leaflet with OpenStreetMap 
- **Filtering** - Filter by date, temperature, and severity
- **Dark Mode** - Reduces eye strain
- **Responsive Design** - Optimized for desktop and tablet
- **Search** - Filter through records
- **Expandable Map** - Maximise the map to fill the screen for improved UX

## 🚀 Getting Started

1. Make sure you have Node.js installed (v14 or newer)
2. Clone this repo:
```bash
git clone https://github.com/mikasimoncelli/Railway-Temperature-Dashboard
cd Railway-Temperature-Dashboard
```

3. Install the dependencies:
```bash
npm install
```

4. Start the app in the development server
```bash
npm start
```

Head to `http://localhost:3000` and you should see the dashboard in action.

## About the Data

The dashboard works with temperature readings from railway sensors. Each reading includes:
- Timestamp
- Location (latitude/longitude)
- Track position in yards
- Temperature in Celsius
- Recording ID

The app automatically categorizes temperatures into three severity levels:
- 🔴 High (70°C+)
- 🟡 Medium (55-69°C)
- 🟢 Low (below 55°C)

## Tips

- Use the search bar to quickly filter by any field
- Click column headers to sort the data
- Toggle dark mode for better visibility at night
- Expand the map when you need a better geographical overview
- Use the temperature range slider to focus on specific thresholds

## Key Files

```
temperature-dashboard/
├── public/
│   └──  ta_exceedences.csv        # Source CSV data
└── src/
    ├──  App.js                    # Main application component
    └──  TemperatureDashboard.jsx  # Dashboard implementation
```

## 🛠️ Building for Production

This will create an optimized production build in the `build` folder:

```bash
npm run build
```

---

