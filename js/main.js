// Load special icon
import { specialCrimeIcons, iconLegendHTML } from "./menu_icones.js";

// Load the map ---------------------------------------------------------------
var map = L.map("map").setView([40.7128, -74.006], 11);

// Base map layers
const baseGray = L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>',
  subdomains: "abcd"
});
baseGray.addTo(map);

// Global state
let markerLayer = null;
let districtLayer = null;
let allCrimeData = [];
let selectedCrimeTypes = new Set();
let crimeTypesLoaded = false;
let currentDistrictCode = null;
let legendControl = null;

// Create a dynamic legend that will change content based on view
function createLegend(isDistrictView = true) {
  // Remove existing legend if it exists
  if (legendControl) {
    map.removeControl(legendControl);
  }
  
  legendControl = L.control({ position: 'bottomleft' });
  legendControl.onAdd = function(map) {
    const div = L.DomUtil.create('div', 'info legend');
    
    if (isDistrictView) {
      // Only show district crime levels when in heat map view
      div.innerHTML = `
        <div class="legend-container">
          <h4>NYC Crime Map</h4>
          <div class="district-legend">
            <h5>District Crime Levels</h5>
            <div class="legend-item"><div class="color-box" style="background:#cce5ff"></div> <span>Lowest 20%</span></div>
            <div class="legend-item"><div class="color-box" style="background:#99ccff"></div> <span>20-40%</span></div>
            <div class="legend-item"><div class="color-box" style="background:#ffff99"></div> <span>40-60%</span></div>
            <div class="legend-item"><div class="color-box" style="background:#ff9933"></div> <span>60-80%</span></div>
            <div class="legend-item"><div class="color-box" style="background:#ff4d4d"></div> <span>Highest 20%</span></div>
          </div>
        </div>
      `;
    } else {
      // Show full legend with crime markers when in district view
      div.innerHTML = `
        <div class="legend-container">
          <h4>NYC Crime Map</h4>
          <div class="legend-item">
            <div class="marker-icon" style="background-color: red; border-radius: 50%; width: 10px; height: 10px;"></div>
            <span>Standard Crime Marker</span>
          </div>
          <div class="crime-icons-legend">
            <h5>Special Crime Types</h5>
            <div id="special-crime-icons">
              ${Object.entries(specialCrimeIcons).map(([key, cfg]) => `
                <div class="legend-item">
                  <img src="${cfg.iconUrl}" alt="${key}" style="width: ${cfg.baseWidth}px; height: ${cfg.baseHeight}px;">
                  <span>${key}</span>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      `;
    }
    
    div.style.backgroundColor = 'white';
    div.style.padding = '10px';
    div.style.borderRadius = '5px';
    div.style.boxShadow = '0 0 15px rgba(0,0,0,0.2)';
    div.style.maxWidth = '250px';
    
    const colorBoxes = div.querySelectorAll('.color-box');
    colorBoxes.forEach(box => {
      box.style.width = '15px';
      box.style.height = '15px';
      box.style.display = 'inline-block';
      box.style.marginRight = '5px';
    });
    
    const legendItems = div.querySelectorAll('.legend-item');
    legendItems.forEach(item => {
      item.style.margin = '5px 0';
      item.style.display = 'flex';
      item.style.alignItems = 'center';
    });
    
    return div;
  };
  legendControl.addTo(map);
}

// Load district boundaries
fetch("https://services5.arcgis.com/GfwWNkhOj9bNBqoJ/arcgis/rest/services/NYC_Community_Districts/FeatureServer/0/query?where=1=1&outFields=*&outSR=4326&f=pgeojson")
  .then(res => res.json())
  .then(data => {
    districtLayer = L.geoJSON(data, {
      style: () => ({
        fillColor: "transparent",
        color: "black",
        weight: 1.5,
        opacity: 0.7
      }),
      onEachFeature: (feature, layer) => {
        const districtCode = parseInt(feature.properties.BoroCD);
        const districtName = feature.properties.BoroCD_name || `District ${districtCode}`;
        layer.bindPopup(`<b>${districtName}</b>`);
        layer.on("click", () => {
          currentDistrictCode = districtCode;
          map.fitBounds(layer.getBounds());
          
          districtLayer.setStyle({
            fillOpacity: 0
          });
          
          
          createLegend(false);
          
          loadDistrictCrimeData(districtCode);
        });
      }
    }).addTo(map);

    loadAllCrimeData();
    
    createLegend(true);
  });

function loadAllCrimeData() {
  const districtCodes = Array.from({length: 70}, (_, i) => i + 101).filter(code =>
    (code >= 101 && code <= 112) || (code >= 201 && code <= 212) ||
    (code >= 301 && code <= 318) || (code >= 401 && code <= 414) ||
    (code >= 501 && code <= 503)
  );

  const fetches = districtCodes.map(code =>
    fetch(`data/crimes_by_district/${code}.json`)
      .then(res => res.ok ? res.json() : [])
      .catch(() => [])
  );

  Promise.all(fetches).then(results => {
    allCrimeData = results.flat();
    populateCrimeTypeFilter(allCrimeData);
    
    colorDistrictsByCrime();
  });
}

function colorDistrictsByCrime() {
  fetch("data/website_data/GPS_grouped.json")
    .then(res => {
      if (!res.ok) {
        return useDemoData();
      }
      return res.json();
    })
    .then(crimeData => {
      const crimeCounts = {};
      
      for (const item of crimeData) {
        const districtCode = item.District_Code.toString();
        const count = item.count;
        
        if (districtCode && !isNaN(count)) {
          crimeCounts[districtCode] = count;
          const paddedCode = districtCode.padStart(3, '0');
          crimeCounts[paddedCode] = count;
        }
      }
      
    
      if (Object.keys(crimeCounts).length === 0 || Object.values(crimeCounts).every(v => v === 0)) {
        return useDemoData();
      }

      applyColorsToDistricts(crimeCounts);
    })
    .catch(() => {
      useDemoData();
    });
}

// Function to generate and use demo data
function useDemoData() {
  const demoCrimeCounts = {};
  
  districtLayer.eachLayer(layer => {
    const code = layer.feature.properties.BoroCD;

    demoCrimeCounts[code] = Math.floor(Math.random() * 950) + 50;
  });
  
  applyColorsToDistricts(demoCrimeCounts);
}

function applyColorsToDistricts(crimeCounts) {
  const allCounts = Object.values(crimeCounts).filter(count => count > 0).sort((a, b) => a - b);
  
  if (allCounts.length === 0) {
    return;
  }
  
  const p20 = allCounts[Math.floor(allCounts.length * 0.2)] || 1;
  const p40 = allCounts[Math.floor(allCounts.length * 0.4)] || 2;
  const p60 = allCounts[Math.floor(allCounts.length * 0.6)] || 3;
  const p80 = allCounts[Math.floor(allCounts.length * 0.8)] || 4;


  districtLayer.eachLayer(layer => {
  
    const code = layer.feature.properties.BoroCD;
    const codeString = code.toString();
    const codeTrimmed = codeString.replace(/^0+/, '');
    
    let count = crimeCounts[code] || 
                crimeCounts[codeString] || 
                crimeCounts[codeTrimmed] ||
                crimeCounts[code.toString().padStart(3, '0')] || 0;
    
    let fillColor;
    
    if (count <= p20) fillColor = "#cce5ff";
    else if (count <= p40) fillColor = "#99ccff";
    else if (count <= p60) fillColor = "#ffff99";
    else if (count <= p80) fillColor = "#ff9933";
    else fillColor = "#ff4d4d";

    layer.setStyle({
      fillColor,
      fillOpacity: 0.6,
      color: "black",
      weight: 1
    });

    const name = layer.feature.properties.BoroCD_name || `District ${code}`;
    layer.bindPopup(`<b>${name}</b><br>Crime Count: ${count}`);
  });
}

function generateJsonFile() {
  // This was used for debugging
  const jsonData = [];
  
  districtLayer.eachLayer(layer => {
    const code = layer.feature.properties.BoroCD;
    const randomCount = Math.floor(Math.random() * 950) + 50;
    jsonData.push({
      District_Code: parseFloat(code),
      count: randomCount
    });
  });
  

  const blob = new Blob([JSON.stringify(jsonData)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.setAttribute('hidden', '');
  a.setAttribute('href', url);
  a.setAttribute('download', 'district_crime_data.json');
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function populateCrimeTypeFilter(data) {
  if (crimeTypesLoaded) return;

  selectedCrimeTypes = new Set(data.map(c => c.crime_type));
  crimeTypesLoaded = true;
}

function loadDistrictCrimeData(code) {
  fetch(`data/crimes_by_district/${code}.json`)
    .then(res => {
      if (!res.ok) throw new Error(`No data for district ${code}`);
      return res.json();
    })
    .then(districtCrimes => {
      if (markerLayer) map.removeLayer(markerLayer);
      displayCrimesForDistrict(code, districtCrimes);
    })
    .catch(err => {
      console.error(`No data for district ${code}`);
    });
}

function displayCrimesForDistrict(code, data) {
  createMarkerView(data);
}

function createMarkerView(data) {
  if (markerLayer) map.removeLayer(markerLayer);
  const grouped = {};
  data.filter(c => selectedCrimeTypes.has(c.crime_type)).forEach(c => {
    const lat = parseFloat(c.Latitude);
    const lon = parseFloat(c.Longitude);
    const type = c.crime_type.toLowerCase();
    if (isNaN(lat) || isNaN(lon)) return;
    const key = `${lat.toFixed(5)},${lon.toFixed(5)}`;
    if (!grouped[key]) grouped[key] = { lat, lon, total: 0, types: {} };
    grouped[key].total++;
    grouped[key].types[type] = (grouped[key].types[type] || 0) + 1;
  });
  markerLayer = L.layerGroup(
    Object.values(grouped).flatMap(loc => {
      const markers = [];
      const hasNormal = Object.keys(loc.types).some(type =>
        !Object.values(specialCrimeIcons).some(cfg => cfg.match(type))
      );
      if (hasNormal) {
        markers.push(L.circleMarker([loc.lat, loc.lon], {
          radius: Math.min(Math.max(loc.total / 100, 3), 12),
          color: "red",
          fillOpacity: 0.5
        }).bindPopup(`Crimes: ${loc.total}`));
      }
      Object.entries(loc.types).forEach(([type, count]) => {
        for (const [key, cfg] of Object.entries(specialCrimeIcons)) {
          if (cfg.match(type)) {
            const useCount = Math.min(count, cfg.maxCount);
            const width = useCount * 0.8 * cfg.baseWidth;
            const height = useCount * 0.8 * cfg.baseHeight;
            const icon = L.icon({
              iconUrl: cfg.iconUrl,
              iconSize: [width, height],
              iconAnchor: [width / 2, height / 2],
              popupAnchor: [0, -10]
            });
            markers.push(L.marker([loc.lat, loc.lon], { icon })
              .bindPopup(`<b>${type.toUpperCase()}</b><br>Count: ${count}`));
          }
        }
      });
      return markers;
    })
  ).addTo(map);
}

map.on('contextmenu', function() {
  if (currentDistrictCode) {
    currentDistrictCode = null;
    map.setView([40.7128, -74.006], 11);
    if (markerLayer) map.removeLayer(markerLayer);
    
    createLegend(true);
    
    colorDistrictsByCrime();
  }
});

const style = document.createElement('style');
style.textContent = `
  .legend-container {
    font-family: Arial, sans-serif;
    font-size: 12px;
  }
  
  .legend-container h4 {
    margin: 0 0 10px 0;
    font-size: 14px;
  }
  
  .legend-container h5 {
    margin: 10px 0 5px 0;
    font-size: 12px;
  }
  
  .legend-item {
    margin: 5px 0;
    display: flex;
    align-items: center;
  }
  
  .color-box {
    width: 15px;
    height: 15px;
    display: inline-block;
    margin-right: 5px;
  }
  
  .crime-icons-legend img {
    margin-right: 5px;
  }
  
  .marker-icon {
    margin-right: 5px;
  }
`;
document.head.appendChild(style);

// Initialize map with heat map view by default
window.addEventListener('DOMContentLoaded', () => {
  
  colorDistrictsByCrime();
});