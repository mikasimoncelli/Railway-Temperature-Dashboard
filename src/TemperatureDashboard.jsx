// TemperatureDashboard.jsx
import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-control-geocoder/dist/Control.Geocoder.css';
import 'leaflet-control-geocoder';

// Fix for default marker icons in Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Search Control Component
const SearchControl = () => {
  const map = useMap();

  useEffect(() => {
    // Initialize the geocoder and add it to the map
    const geocoder = L.Control.geocoder({
      defaultMarkGeocode: false,
      collapsed: true,
    })
      .on('markgeocode', function (e) {
        const bbox = e.geocode.bbox;
        const poly = L.polygon([
          bbox.getSouthEast(),
          bbox.getNorthEast(),
          bbox.getNorthWest(),
          bbox.getSouthWest(),
        ]);
        // Fit the map bounds to the geocoded area
        map.fitBounds(poly.getBounds());
      })
      .addTo(map);

    // Cleanup the geocoder on component unmount
    return () => {
      map.removeControl(geocoder);
    };
  }, [map]);

  return null;
};

const TemperatureDashboard = () => {
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [temperatureRange, setTemperatureRange] = useState([40, 80]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState('all');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [isMapExpanded, setIsMapExpanded] = useState(false);
  const [mapCenter, setMapCenter] = useState([51.505, -0.09]); // Default center
  const [mapBounds, setMapBounds] = useState(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const transition = 'all 0.3s ease';

  // Function to determine marker color based on severity
  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high':
        return '#ef4444';
      case 'medium':
        return '#f59e0b';
      case 'low':
        return '#22c55e';
      default:
        return '#666666';
    }
  };

  // Create custom marker icon based on severity
  const createCustomIcon = (severity) => {
    return L.divIcon({
      className: 'custom-div-icon',
      html: `<div style="
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background-color: ${getSeverityColor(severity)};
        border: 2px solid white;
        box-shadow: 0 0 4px rgba(0,0,0,0.3);
      "></div>`,
      iconSize: [12, 12],
      iconAnchor: [6, 6],
    });
  };

  // Function to handle sorting logic
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Function to sort data based on current sort configuration
  const getSortedData = (dataToSort) => {
    if (!sortConfig.key) return dataToSort;

    return [...dataToSort].sort((a, b) => {
      let aValue = a[sortConfig.key];
      let bValue = b[sortConfig.key];

      // Special handling for date and severity
      if (sortConfig.key === 'date') {
        aValue = new Date(a.UNIX_TIME * 1000).getTime();
        bValue = new Date(b.UNIX_TIME * 1000).getTime();
      }
      if (sortConfig.key === 'severity') {
        const severityOrder = { high: 3, medium: 2, low: 1 };
        aValue = severityOrder[a.severity];
        bValue = severityOrder[b.severity];
      }

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  };

  // Style for table headers
  const getHeaderStyle = (key) => ({
    cursor: 'pointer',
    userSelect: 'none',
    fontWeight: sortConfig.key === key ? 'bold' : 'normal',
    transition,
    fontSize: '14px',
    color: isDarkMode ? '#ffffff' : '#000000',
  });

  // Function to display sort arrows in headers
  const getSortArrow = (key) => {
    if (sortConfig.key === key) {
      return sortConfig.direction === 'asc' ? ' ↑' : ' ↓';
    }
    return '';
  };

  // Effect to load and parse CSV data on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await fetch('/ta_exceedences.csv');
        const text = await response.text();

        Papa.parse(text, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true,
          complete: (results) => {
            if (results.data && results.data.length > 0) {
              const parsedData = results.data.map((row) => ({
                ...row,
                date: new Date(row.UNIX_TIME * 1000).toLocaleString(),
                severity:
                  row.SCORE >= 70
                    ? 'high'
                    : row.SCORE >= 55
                    ? 'medium'
                    : 'low',
              }));

              setData(parsedData);
              setFilteredData(parsedData);

              // Calculate map bounds based on data points
              if (parsedData.length > 0) {
                const lats = parsedData.map((d) => d.LATITUDE);
                const lngs = parsedData.map((d) => d.LONGITUDE);
                const center = [
                  (Math.min(...lats) + Math.max(...lats)) / 2,
                  (Math.min(...lngs) + Math.max(...lngs)) / 2,
                ];
                setMapCenter(center);
                setMapBounds(
                  L.latLngBounds(
                    [Math.min(...lats), Math.min(...lngs)],
                    [Math.max(...lats), Math.max(...lngs)]
                  )
                );
              }
            }
          },
          error: (error) => {
            console.error('Parse error:', error);
          },
        });
      } catch (error) {
        console.error('Load error:', error);
      }
    };

    loadData();
  }, []);

  // Effect to filter data whenever dependencies change
  useEffect(() => {
    let filtered = data;

    // Filter by date range
    if (dateFrom) {
      const fromTime = new Date(dateFrom).getTime();
      filtered = filtered.filter((row) => new Date(row.date).getTime() >= fromTime);
    }

    if (dateTo) {
      const toTime = new Date(dateTo).getTime();
      filtered = filtered.filter((row) => new Date(row.date).getTime() <= toTime);
    }

    // Filter by severity
    if (selectedSeverity !== 'all') {
      filtered = filtered.filter((row) => row.severity === selectedSeverity);
    }

    // Filter by temperature range
    const minTemp = temperatureRange[0];
    const maxTemp = temperatureRange[1];
    filtered = filtered.filter(
      (row) =>
        (minTemp === '' || row.SCORE >= minTemp) &&
        (maxTemp === '' || row.SCORE <= maxTemp)
    );

    // Filter by search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (row) =>
          row.date.toLowerCase().includes(searchLower) ||
          row.SCORE.toString().includes(searchLower) ||
          row.POSITION_YARDS.toString().includes(searchLower) ||
          row.LATITUDE.toString().includes(searchLower) ||
          row.LONGITUDE.toString().includes(searchLower) ||
          row.RECORDING_ID.toString().includes(searchLower)
      );
    }

    setFilteredData(filtered);
  }, [
    data,
    temperatureRange,
    searchTerm,
    selectedSeverity,
    dateFrom,
    dateTo,
  ]);

  // Function to reset all filters and sorting
  const handleReset = () => {
    setTemperatureRange([40, 80]);
    setSearchTerm('');
    setSelectedSeverity('all');
    setDateFrom('');
    setDateTo('');
    setSortConfig({ key: null, direction: 'asc' });
  };

  return (
    <div
      style={{
        backgroundColor: isDarkMode ? '#1a1a1a' : '#f5f5f5',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        transition,
      }}
    >
      {/* Top Banner */}
      <div
        style={{
          backgroundColor: '#60348c',
          padding: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          color: '#ffffff',
        }}
      >
        <h2 style={{ margin: 0 }}>Railway Temperature Exceedance</h2>
        <div>
          {/* Button to expand or minimize the map */}
          <button
            onClick={() => setIsMapExpanded(!isMapExpanded)}
            style={{
              padding: '8px 12px',
              marginRight: '10px',
              borderRadius: '4px',
              border: 'none',
              backgroundColor: isDarkMode ? '#555555' : '#ffffff',
              color: isDarkMode ? '#ffffff' : '#000000',
              cursor: 'pointer',
              transition,
              fontSize: '14px',
            }}
          >
            {isMapExpanded ? 'Minimize Map' : 'Expand Map'}
          </button>
          {/* Button to toggle dark mode */}
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            style={{
              padding: '8px 12px',
              borderRadius: '4px',
              border: 'none',
              backgroundColor: isDarkMode ? '#555555' : '#ffffff',
              color: isDarkMode ? '#ffffff' : '#000000',
              cursor: 'pointer',
              transition,
              fontSize: '14px',
            }}
          >
            {isDarkMode ? '☀️ Light Mode' : '🌙 Dark Mode'}
          </button>
        </div>
      </div>

      {/* Content Container */}
      <div
        style={{
          flex: 1,
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
        }}
      >
        
        {/* Controls Box */}
        <div
          style={{
            backgroundColor: isDarkMode ? '#2d2d2d' : '#ffffff',
            padding: '20px',
            borderRadius: '8px',
            boxShadow: '0 0 10px rgba(0,0,0,0.1)',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
          }}
        >
        <h4 style={{ fontWeight: 'normal', marginBottom: '2px', marginTop: '2px', color: isDarkMode ? '#ffffff' : '#000000' }}>
        London South Eastern Mainline : <strong>Hungerford Bridge</strong> - <strong>Orpington</strong>
        </h4>
        
          {/* Map Section */}
          <div
            style={{
              height: isMapExpanded ? '600px' : '300px',
              borderRadius: '4px',
              overflow: 'hidden',
              position: 'relative',
              transition,
            }}
          >
            {mapBounds && (
              <MapContainer
                center={mapCenter}
                bounds={mapBounds}
                style={{ height: '100%', width: '100%' }}
                zoomControl={true}
              >
                {/* Tile layer changes based on dark mode */}
                <TileLayer
                  url={
                    isDarkMode
                      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
                      : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
                  }
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
                {/* Search Control for geocoding */}
                <SearchControl />
                {/* Render markers for each data point */}
                {filteredData.map((point, index) => (
                  <Marker
                    key={index}
                    position={[point.LATITUDE, point.LONGITUDE]}
                    icon={createCustomIcon(point.severity)}
                  >
                    <Popup>
                      <div>
                        <strong>Temperature:</strong> {point.SCORE}°C<br />
                        <strong>Position:</strong> {point.POSITION_YARDS} yards<br />
                        <strong>Recording:</strong> {point.RECORDING_ID}<br />
                        <strong>Date:</strong> {point.date}<br />
                        <strong>Severity:</strong> {point.severity.toUpperCase()}
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            )}

            {/* Map Legend */}
            <div
              style={{
                position: 'absolute',
                bottom: '30px',
                right: '10px',
                padding: '8px',
                backgroundColor: isDarkMode
                  ? 'rgba(0,0,0,0.7)'
                  : 'rgba(255,255,255,0.7)',
                borderRadius: '4px',
                fontSize: '12px',
                zIndex: 1000,
                color: isDarkMode ? '#ffffff' : '#000000',
              }}
            >
              <div style={{ marginBottom: '4px' }}>Severity:</div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <div
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: '#ef4444',
                    }}
                  ></div>
                  <span>High</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <div
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: '#f59e0b',
                    }}
                  ></div>
                  <span>Medium</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <div
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: '#22c55e',
                    }}
                  ></div>
                  <span>Low</span>
                </div>
              </div>
            </div>
          </div>

          {/* Filters Section */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr',
              gap: '20px',
            }}
          >
            {/* Severity Filter */}
            <div>
              <div style={{ marginBottom: '4px', fontSize: '14px', color: isDarkMode ? '#ffffff' : '#000000' }}>Severity:</div>
              <select
                value={selectedSeverity}
                onChange={(e) => setSelectedSeverity(e.target.value)}
                style={{
                  width: '150px',
                  padding: '6px',
                  border: `1px solid ${isDarkMode ? '#404040' : '#ddd'}`,
                  borderRadius: '4px',
                  fontSize: '14px',
                  backgroundColor: isDarkMode ? '#2d2d2d' : '#ffffff',
                  color: isDarkMode ? '#ffffff' : '#000000',
                  cursor: 'pointer',
                }}
              >
                <option value="all">All Severities</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            {/* Date and Temperature Filters */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '20px',
              }}
            >
              {/* Date From */}
              <div>
                <div style={{ marginBottom: '4px', fontSize: '14px', color: isDarkMode ? '#ffffff' : '#000000' }}>Date From:</div>
                <input
                  type="datetime-local"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '6px',
                    border: `1px solid ${isDarkMode ? '#404040' : '#ddd'}`,
                    borderRadius: '4px',
                    fontSize: '14px',
                    backgroundColor: isDarkMode ? '#2d2d2d' : '#ffffff',
                    color: isDarkMode ? '#ffffff' : '#000000',
                  }}
                />
              </div>

              {/* Date To */}
              <div>
                <div style={{ marginBottom: '4px', fontSize: '14px', color: isDarkMode ? '#ffffff' : '#000000' }}>Date To:</div>
                <input
                  type="datetime-local"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '6px',
                    border: `1px solid ${isDarkMode ? '#404040' : '#ddd'}`,
                    borderRadius: '4px',
                    fontSize: '14px',
                    backgroundColor: isDarkMode ? '#2d2d2d' : '#ffffff',
                    color: isDarkMode ? '#ffffff' : '#000000',
                  }}
                />
              </div>

              {/* Temperature Range and Reset Button */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ fontSize: '14px', color: isDarkMode ? '#ffffff' : '#000000', marginLeft: '10px' }}>Temperature Range:</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '10px' }}>
                  <input
                    type="number"
                    value={temperatureRange[0]}
                    onChange={(e) => {
                      const value = e.target.value;
                      setTemperatureRange([
                        value === '' ? '' : parseInt(value),
                        temperatureRange[1],
                      ]);
                    }}
                    style={{
                      width: '60px',
                      padding: '6px',
                      border: `1px solid ${isDarkMode ? '#404040' : '#ddd'}`,
                      borderRadius: '4px',
                      backgroundColor: isDarkMode ? '#2d2d2d' : '#ffffff',
                      color: isDarkMode ? '#ffffff' : '#000000',
                      fontSize: '14px',
                    }}
                  />
                  <span style={{ fontSize: '14px', color: isDarkMode ? '#ffffff' : '#000000' }}>to</span>
                  <input
                    type="number"
                    value={temperatureRange[1]}
                    onChange={(e) => {
                      const value = e.target.value;
                      setTemperatureRange([
                        temperatureRange[0],
                        value === '' ? '' : parseInt(value),
                      ]);
                    }}
                    style={{
                      width: '60px',
                      padding: '6px',
                      border: `1px solid ${isDarkMode ? '#404040' : '#ddd'}`,
                      borderRadius: '4px',
                      backgroundColor: isDarkMode ? '#2d2d2d' : '#ffffff',
                      color: isDarkMode ? '#ffffff' : '#000000',
                      fontSize: '14px',
                    }}
                  />
                  {/* Reset Filters Button */}
                  <button
                    onClick={handleReset}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '4px',
                      border: 'none',
                      backgroundColor: '#60348c',
                      color: '#ffffff',
                      cursor: 'pointer',
                      fontSize: '14px',
                      marginLeft: '10px',
                    }}
                  >
                    Reset Filters
                  </button>
                </div>
              </div>
            </div>

            {/* Search Input */}
            <div>
              <div style={{ marginBottom: '4px', fontSize: '14px', color: isDarkMode ? '#ffffff' : '#000000' }}>Search:</div>
              <input
                type="text"
                placeholder="Search records..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: `1px solid ${isDarkMode ? '#404040' : '#ddd'}`,
                  borderRadius: '4px',
                  fontSize: '14px',
                  backgroundColor: isDarkMode ? '#2d2d2d' : '#ffffff',
                  color: isDarkMode ? '#ffffff' : '#000000',
                }}
              />
            </div>

            {/* Scrollable Table Section */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                maxHeight: '70vh',
                borderTop: `1px solid ${isDarkMode ? '#404040' : '#ddd'}`,
                paddingTop: '10px',
              }}
            >
              
              {/* Table Headers */}
              <div
                style={{
                  marginBottom: '10px',
                  fontSize: '14px',
                  display: 'grid',
                  gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr 1fr',
                  gap: '10px',
                  fontWeight: 'bold',
                  color: isDarkMode ? '#ffffff' : '#000000',
                }}
              >
                {/* Each header is clickable for sorting */}
                <div onClick={() => handleSort('date')} style={getHeaderStyle('date')}>
                  Date/Time{getSortArrow('date')}
                </div>
                <div
                  onClick={() => handleSort('RECORDING_ID')}
                  style={getHeaderStyle('RECORDING_ID')}
                >
                  Recording{getSortArrow('RECORDING_ID')}
                </div>
                <div
                  onClick={() => handleSort('POSITION_YARDS')}
                  style={getHeaderStyle('POSITION_YARDS')}
                >
                  Position (yards){getSortArrow('POSITION_YARDS')}
                </div>
                <div
                  onClick={() => handleSort('LATITUDE')}
                  style={getHeaderStyle('LATITUDE')}
                >
                  Latitude{getSortArrow('LATITUDE')}
                </div>
                <div
                  onClick={() => handleSort('LONGITUDE')}
                  style={getHeaderStyle('LONGITUDE')}
                >
                  Longitude{getSortArrow('LONGITUDE')}
                </div>
                <div onClick={() => handleSort('SCORE')} style={getHeaderStyle('SCORE')}>
                  Temp (°C){getSortArrow('SCORE')}
                </div>
                <div
                  onClick={() => handleSort('severity')}
                  style={getHeaderStyle('severity')}
                >
                  Severity{getSortArrow('severity')}
                </div>
              </div>

              {/* Table Data */}
              {getSortedData(filteredData).length === 0 ? (
                <div style={{ textAlign: 'center', color: isDarkMode ? '#ffffff' : '#000000' }}>
                  No records found matching the current filters
                </div>
              ) : (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr 1fr',
                    gap: '10px',
                  }}
                >
                  {/* Iterate over sorted and filtered data to display rows */}
                  {getSortedData(filteredData).map((row, index) => (
                    <React.Fragment key={index}>
                      <div style={{ fontSize: '12px', color: isDarkMode ? '#ffffff' : '#000000' }}>{row.date}</div>
                      <div style={{ fontSize: '12px', color: isDarkMode ? '#ffffff' : '#000000' }}>{row.RECORDING_ID}</div>
                      <div style={{ fontSize: '12px', color: isDarkMode ? '#ffffff' : '#000000' }}>{row.POSITION_YARDS}</div>
                      <div style={{ fontSize: '12px', color: isDarkMode ? '#ffffff' : '#000000' }}>{row.LATITUDE.toFixed(6)}</div>
                      <div style={{ fontSize: '12px', color: isDarkMode ? '#ffffff' : '#000000' }}>{row.LONGITUDE.toFixed(6)}</div>
                      <div style={{ fontSize: '12px', color: isDarkMode ? '#ffffff' : '#000000' }}>{row.SCORE}°C</div>
                      <div>
                        {/* Display severity with colored background */}
                        <span
                          style={{
                            padding: '2px 6px',
                            borderRadius: '8px',
                            fontSize: '12px',
                            backgroundColor:
                              row.severity === 'high'
                                ? '#FEE2E2'
                                : row.severity === 'medium'
                                ? '#FEF3C7'
                                : '#DCFCE7',
                            color: '#000000', // Always black
                          }}
                        >
                          {row.severity.toUpperCase()}
                        </span>
                      </div>
                    </React.Fragment>
                  ))}
                </div>
              )}
            </div>
          </div>


        </div>
        
      </div>
                {/* Footer - Moved outside the Controls Box */}
                <div
            style={{
              backgroundColor: '#60348c',
              padding: '10px',
              textAlign: 'center',
              color: '#ffffff',
            }}
          >
            <p>&copy; Railway Temperature Exceedance.</p>
          </div>
    </div>
  );
};

export default TemperatureDashboard;
