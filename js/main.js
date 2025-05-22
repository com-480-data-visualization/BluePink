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
let economicsData = [];
let selectedCrimeTypes = new Set();
let crimeTypesLoaded = false;
let currentDistrictCode = null;
let legendControl = null;
let currentDistrictData = null;
let currentCrimeCounts = {};
let currentEconomicsData = {};
let currentMapMode = 'crime'; // 'crime' or 'economics'
let selectedEconomicMetric = 'individuals_below_FPL';
let selectedYear = 2005;

// Create toggle button for switching between maps
function createMapToggleButton() {
  const toggleContainer = document.createElement('div');
  toggleContainer.id = 'map-toggle-container';
  toggleContainer.style.position = 'absolute';
  toggleContainer.style.top = '10px';
  toggleContainer.style.right = '10px';
  toggleContainer.style.zIndex = '1000';
  toggleContainer.style.backgroundColor = 'white';
  toggleContainer.style.padding = '10px';
  toggleContainer.style.borderRadius = '5px';
  toggleContainer.style.boxShadow = '0 0 15px rgba(0,0,0,0.2)';
  
  toggleContainer.innerHTML = `
    <div class="map-controls">
      <h4 style="margin: 0 0 10px 0; font-size: 14px;">Map View</h4>
      <div class="toggle-buttons">
        <button id="crime-btn" class="toggle-btn active">Crime Data</button>
        <button id="economics-btn" class="toggle-btn">Economics Data</button>
      </div>
      <div id="economics-controls" style="display: none; margin-top: 10px;">
        <label style="font-size: 12px;">Metric:</label>
        <select id="metric-select" style="width: 100%; margin: 5px 0;">
          <option value="individuals_below_FPL">% Below Poverty Line</option>
          <option value="Employement_pop_ratio">Employment Rate</option>
        </select>
        <label style="font-size: 12px;">Year:</label>
        <select id="year-select" style="width: 100%; margin: 5px 0;">
          <!-- Years will be populated dynamically -->
        </select>
      </div>
    </div>
  `;
  
  document.body.appendChild(toggleContainer);
  
  // Add event listeners
  document.getElementById('crime-btn').addEventListener('click', () => switchToMode('crime'));
  document.getElementById('economics-btn').addEventListener('click', () => switchToMode('economics'));
  document.getElementById('metric-select').addEventListener('change', (e) => {
    selectedEconomicMetric = e.target.value;
    if (currentMapMode === 'economics') {
      colorDistrictsByEconomics();
    }
  });
  document.getElementById('year-select').addEventListener('change', (e) => {
    selectedYear = parseInt(e.target.value);
    if (currentMapMode === 'economics') {
      colorDistrictsByEconomics();
    }
  });
}

function switchToMode(mode) {
  currentMapMode = mode;
  
  // Update button states
  document.querySelectorAll('.toggle-btn').forEach(btn => btn.classList.remove('active'));
  document.getElementById(`${mode}-btn`).classList.add('active');
  
  // Show/hide controls
  document.getElementById('economics-controls').style.display = mode === 'economics' ? 'block' : 'none';
  document.getElementById('crime-filter-container').style.display = 'none';
  
  // Clear any district-specific views
  if (currentDistrictCode) {
    currentDistrictCode = null;
    map.setView([40.7128, -74.006], 11);
    if (markerLayer) map.removeLayer(markerLayer);
  }
  
  // Apply appropriate coloring
  if (mode === 'crime') {
    colorDistrictsByCrime();
  } else {
    colorDistrictsByEconomics();
  }
}

// Create a dynamic legend that will change content based on view
function createLegend(isDistrictView = true, mapMode = 'crime') {
  // Remove existing legend if it exists
  if (legendControl) {
    map.removeControl(legendControl);
  }
  
  legendControl = L.control({ position: 'bottomleft' });
  legendControl.onAdd = function(map) {
    const div = L.DomUtil.create('div', 'info legend');
    
    if (isDistrictView) {
      let legendHTML = `
        <div class="legend-container">
          <h4>NYC ${mapMode === 'crime' ? 'Crime' : 'Economics'} Map</h4>
          <div class="district-legend">
      `;
      
      if (mapMode === 'crime') {
        const allCounts = Object.values(currentCrimeCounts).filter(count => count > 0).sort((a, b) => a - b);
        legendHTML += `<h5>District Crime Levels</h5>`;
        
        if (allCounts.length > 0) {
          const p20Index = Math.floor(allCounts.length * 0.2);
          const p40Index = Math.floor(allCounts.length * 0.4);
          const p60Index = Math.floor(allCounts.length * 0.6);
          const p80Index = Math.floor(allCounts.length * 0.8);
          
          const minCount = Math.min(...allCounts);
          const p20Count = allCounts[p20Index] || minCount;
          const p40Count = allCounts[p40Index] || minCount;
          const p60Count = allCounts[p60Index] || minCount;
          const p80Count = allCounts[p80Index] || minCount;
          const maxCount = Math.max(...allCounts);
          
          legendHTML += `
              <div class="legend-item"><div class="color-box" style="background:#cce5ff"></div> <span>${minCount} - ${p20Count}</span></div>
              <div class="legend-item"><div class="color-box" style="background:#99ccff"></div> <span>${p20Count + 1} - ${p40Count}</span></div>
              <div class="legend-item"><div class="color-box" style="background:#ffff99"></div> <span>${p40Count + 1} - ${p60Count}</span></div>
              <div class="legend-item"><div class="color-box" style="background:#ff9933"></div> <span>${p60Count + 1} - ${p80Count}</span></div>
              <div class="legend-item"><div class="color-box" style="background:#ff4d4d"></div> <span>${p80Count + 1} - ${maxCount}</span></div>
          `;
        } else {
          legendHTML += `<div class="legend-item"><div class="color-box" style="background:#cce5ff"></div> <span>No data available</span></div>`;
        }
      } else {
        // Economics legend
        const metricName = selectedEconomicMetric === 'individuals_below_FPL' ? 'Poverty Rate' : 'Employment Rate';
        const allValues = Object.values(currentEconomicsData).filter(val => !isNaN(val)).sort((a, b) => a - b);
        legendHTML += `<h5>${metricName} (${selectedYear})</h5>`;
        
        if (allValues.length > 0) {
          const p20Index = Math.floor(allValues.length * 0.2);
          const p40Index = Math.floor(allValues.length * 0.4);
          const p60Index = Math.floor(allValues.length * 0.6);
          const p80Index = Math.floor(allValues.length * 0.8);
          
          const minVal = Math.min(...allValues);
          const p20Val = allValues[p20Index] || minVal;
          const p40Val = allValues[p40Index] || minVal;
          const p60Val = allValues[p60Index] || minVal;
          const p80Val = allValues[p80Index] || minVal;
          const maxVal = Math.max(...allValues);
          
          const formatValue = (val) => selectedEconomicMetric === 'individuals_below_FPL' ? 
            `${(val * 100).toFixed(1)}%` : `${(val * 100).toFixed(1)}%`;
          
          // For poverty rate, higher values are worse (red), for employment rate, higher values are better (green)
          const isReversed = selectedEconomicMetric === 'Employement_pop_ratio';
          
          legendHTML += `
              <div class="legend-item"><div class="color-box" style="background:${isReversed ? '#ff4d4d' : '#cce5ff'}"></div> <span>${formatValue(minVal)} - ${formatValue(p20Val)}</span></div>
              <div class="legend-item"><div class="color-box" style="background:${isReversed ? '#ff9933' : '#99ccff'}"></div> <span>${formatValue(p20Val)} - ${formatValue(p40Val)}</span></div>
              <div class="legend-item"><div class="color-box" style="background:#ffff99"></div> <span>${formatValue(p40Val)} - ${formatValue(p60Val)}</span></div>
              <div class="legend-item"><div class="color-box" style="background:${isReversed ? '#99ccff' : '#ff9933'}"></div> <span>${formatValue(p60Val)} - ${formatValue(p80Val)}</span></div>
              <div class="legend-item"><div class="color-box" style="background:${isReversed ? '#cce5ff' : '#ff4d4d'}"></div> <span>${formatValue(p80Val)} - ${formatValue(maxVal)}</span></div>
          `;
        } else {
          legendHTML += `<div class="legend-item"><div class="color-box" style="background:#cce5ff"></div> <span>No data available</span></div>`;
        }
      }
      
      legendHTML += `
          </div>
        </div>
      `;
      
      div.innerHTML = legendHTML;
    } else {
      // Show full legend with crime markers when in district view (only for crime mode)
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

// Add crime filter dropdown UI
function setupCrimeFilterUI() {
  const filterContainer = document.createElement('div');
  filterContainer.id = 'crime-filter-container';
  filterContainer.style.display = 'none';
  filterContainer.style.position = 'absolute';
  filterContainer.style.top = '80px';
  filterContainer.style.right = '10px';
  filterContainer.style.zIndex = '1000';
  filterContainer.style.backgroundColor = 'white';
  filterContainer.style.padding = '10px';
  filterContainer.style.borderRadius = '5px';
  filterContainer.style.boxShadow = '0 0 15px rgba(0,0,0,0.2)';
  filterContainer.style.maxWidth = '250px';
  
  filterContainer.innerHTML = `
    <div class="wrapper">
      <div class="content">
        <div class="search">
          <i class="fa-solid fa-search"></i>
          <input type="text" placeholder="Search">
        </div>
        <ul class="list-items" id="crime-type-options"></ul>
      </div>
    </div>
  `;
  
  document.body.appendChild(filterContainer);
  
  // Setup dropdown logic
  const dropdownBtn = document.querySelector(".select-btn");
  const crimeTypeList = document.getElementById("crime-type-options");
  
  // Toggle dropdown open/close
  if (dropdownBtn) {
    dropdownBtn.addEventListener("click", () => {
      dropdownBtn.classList.toggle("open");
    });
  }
}

// Load economics data
function loadEconomicsData() {
  // Replace this with your actual data file path
  fetch("data/eco_data/eco_data.json")
    .then(res => {
      if (!res.ok) {
        return generateDemoEconomicsData();
      }
      return res.json();
    })
    .then(data => {
      economicsData = data;
      populateYearSelector();
      if (currentMapMode === 'economics') {
        colorDistrictsByEconomics();
      }
    })
    .catch(() => {
      economicsData = generateDemoEconomicsData();
      populateYearSelector();
      if (currentMapMode === 'economics') {
        colorDistrictsByEconomics();
      }
    });
}

function generateDemoEconomicsData() {
  const districts = [
    "Astoria", "Jackson Heights", "Elmhurst", "Corona", "Flushing",
    "Manhattan", "Brooklyn", "Queens", "Bronx", "Staten Island"
  ];
  const years = [2005, 2010, 2015, 2020];
  const data = [];
  
  let districtCode = 401;
  
  districts.forEach(district => {
    years.forEach(year => {
      data.push({
        District: district,
        Year: year,
        individuals_below_FPL: Math.random() * 0.3 + 0.05, // 5% to 35%
        Employement_pop_ratio: Math.random() * 0.3 + 0.5, // 50% to 80%
        District_Code: districtCode
      });
    });
    districtCode++;
  });
  
  return data;
}

function populateYearSelector() {
  const yearSelect = document.getElementById('year-select');
  const years = [...new Set(economicsData.map(d => d.Year))].sort();
  
  yearSelect.innerHTML = '';
  years.forEach(year => {
    const option = document.createElement('option');
    option.value = year;
    option.textContent = year;
    if (year === selectedYear) option.selected = true;
    yearSelect.appendChild(option);
  });
}

function colorDistrictsByEconomics() {
  const yearData = economicsData.filter(d => d.Year === selectedYear);
  const economicsValues = {};
  
  yearData.forEach(item => {
    const districtCode = item.District_Code.toString();
    const value = item[selectedEconomicMetric];
    
    if (districtCode && !isNaN(value)) {
      economicsValues[districtCode] = value;
      const paddedCode = districtCode.padStart(3, '0');
      economicsValues[paddedCode] = value;
    }
  });
  
  currentEconomicsData = economicsValues;
  applyEconomicsColorsToDistricts(economicsValues);
}

function applyEconomicsColorsToDistricts(economicsValues) {
  const allValues = Object.values(economicsValues).filter(val => !isNaN(val)).sort((a, b) => a - b);
  
  if (allValues.length === 0) {
    return;
  }
  
  const p20 = allValues[Math.floor(allValues.length * 0.2)] || allValues[0];
  const p40 = allValues[Math.floor(allValues.length * 0.4)] || allValues[0];
  const p60 = allValues[Math.floor(allValues.length * 0.6)] || allValues[0];
  const p80 = allValues[Math.floor(allValues.length * 0.8)] || allValues[0];

  districtLayer.eachLayer(layer => {
    const code = layer.feature.properties.BoroCD;
    const codeString = code.toString();
    const codeTrimmed = codeString.replace(/^0+/, '');
    
    let value = economicsValues[code] || 
                economicsValues[codeString] || 
                economicsValues[codeTrimmed] ||
                economicsValues[code.toString().padStart(3, '0')];
    
    let fillColor = "#cccccc"; // Default gray for missing data
    
    if (value !== undefined && !isNaN(value)) {
      // For employment rate, higher is better (reverse the colors)
      const isReversed = selectedEconomicMetric === 'Employement_pop_ratio';
      
      if (value <= p20) fillColor = isReversed ? "#ff4d4d" : "#cce5ff";
      else if (value <= p40) fillColor = isReversed ? "#ff9933" : "#99ccff";
      else if (value <= p60) fillColor = "#ffff99";
      else if (value <= p80) fillColor = isReversed ? "#99ccff" : "#ff9933";
      else fillColor = isReversed ? "#cce5ff" : "#ff4d4d";
    }

    layer.setStyle({
      fillColor,
      fillOpacity: 0.6,
      color: "black",
      weight: 1
    });

    const name = layer.feature.properties.BoroCD_name || `District ${code}`;
    const metricName = selectedEconomicMetric === 'individuals_below_FPL' ? 'Poverty Rate' : 'Employment Rate';
    const displayValue = value !== undefined ? 
      `${(value * 100).toFixed(1)}%` : 'No data';
    
    layer.bindPopup(`<b>${name}</b><br>${metricName}: ${displayValue}<br>Year: ${selectedYear}`);
  });

  createLegend(true, 'economics');
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
          // Only allow district drilling down for crime mode
          if (currentMapMode === 'crime') {
            currentDistrictCode = districtCode;
            map.fitBounds(layer.getBounds());
            
            districtLayer.setStyle({
              fillOpacity: 0
            });
            
            createLegend(false, 'crime');
            
            // Show crime filter when district is clicked
            document.getElementById('crime-filter-container').style.display = 'block';
            
            loadDistrictCrimeData(districtCode);
          }
        });
      }
    }).addTo(map);

    loadAllCrimeData();
    loadEconomicsData();
    setupCrimeFilterUI();
    createMapToggleButton();
    createLegend(true, 'crime');
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
    if (currentMapMode === 'crime') {
      colorDistrictsByCrime();
    }
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

      currentCrimeCounts = crimeCounts;
      applyColorsToDistricts(crimeCounts);
    })
    .catch(() => {
      useDemoData();
    });
}

function useDemoData() {
  const demoCrimeCounts = {};
  
  districtLayer.eachLayer(layer => {
    const code = layer.feature.properties.BoroCD;
    demoCrimeCounts[code] = Math.floor(Math.random() * 950) + 50;
  });
  
  currentCrimeCounts = demoCrimeCounts;
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

  createLegend(true, 'crime');
}

function loadDistrictCrimeData(code) {
  fetch(`data/crimes_by_district/${code}.json`)
    .then(res => {
      if (!res.ok) throw new Error(`No data for district ${code}`);
      return res.json();
    })
    .then(districtCrimes => {
      currentDistrictData = districtCrimes;
      
      populateCrimeTypeFilter(districtCrimes);
      
      if (markerLayer) map.removeLayer(markerLayer);
      displayCrimesForDistrict(code, districtCrimes);
    })
    .catch(err => {
      console.error(`No data for district ${code}`);
    });
}

function populateCrimeTypeFilter(data) {
  const crimeTypeList = document.getElementById("crime-type-options");
  
  crimeTypeList.innerHTML = '';
  
  const allTypes = new Set(data.map(c => c.crime_type));
  
  selectedCrimeTypes = new Set(allTypes);
  
  const allLi = document.createElement("li");
  allLi.classList.add("item", "checked");
  allLi.dataset.value = "__all__";
  allLi.innerHTML = `
    <span class="checkbox"><i class="fa-solid fa-check check-icon"></i></span>
    <span class="item-text">All</span>
  `;
  allLi.addEventListener("click", () => handleSelectAllClick(allLi));
  crimeTypeList.appendChild(allLi);
  
  Array.from(allTypes)
    .sort()
    .forEach((type) => {
      const li = document.createElement("li");
      li.classList.add("item", "checked");
      li.dataset.value = type;
      li.innerHTML = `
        <span class="checkbox"><i class="fa-solid fa-check check-icon"></i></span>
        <span class="item-text">${type}</span>
      `;
      li.addEventListener("click", () => handleIndividualClick(li));
      crimeTypeList.appendChild(li);
    });
}

function handleSelectAllClick(allLi) {
  const allItems = document.querySelectorAll(".list-items .item");
  const isAlreadyAll = allLi.classList.contains("checked");

  if (isAlreadyAll) {
    return;
  }

  allItems.forEach((item) => item.classList.remove("checked"));
  allItems.forEach((item) => item.classList.add("checked"));

  updateSelectedCrimeTypes();
}

function handleIndividualClick(clickedLi) {
  const allLi = document.querySelector('.list-items .item[data-value="__all__"]');
  const isAllSelected = allLi.classList.contains("checked");

  if (isAllSelected) {
    document.querySelectorAll(".list-items .item").forEach((item) => {
      item.classList.remove("checked");
    });

    clickedLi.classList.add("checked");
  } else {
    clickedLi.classList.toggle("checked");
  }

  if (allLi.classList.contains("checked")) {
    allLi.classList.remove("checked");
  }

  updateSelectedCrimeTypes();
}

function updateSelectedCrimeTypes() {
  selectedCrimeTypes = new Set();

  const allItems = document.querySelectorAll(".list-items .item");
  const allLi = document.querySelector('.list-items .item[data-value="__all__"]');
  const checkedItems = document.querySelectorAll(".list-items .item.checked");

  if (allLi.classList.contains("checked")) {
    allItems.forEach((item) => {
      const value = item.dataset.value;
      if (value && value !== "__all__") {
        selectedCrimeTypes.add(value);
      }
    });
  } else {
    checkedItems.forEach((item) => {
      const value = item.dataset.value;
      if (value && value !== "__all__") {
        selectedCrimeTypes.add(value);
      }
    });
  }

  if (currentDistrictCode && currentDistrictData) {
    displayCrimesForDistrict(currentDistrictCode, currentDistrictData);
  }
}

function displayCrimesForDistrict(code, data) {
  createMarkerView(data);
}

function createMarkerView(data) {
  if (markerLayer) map.removeLayer(markerLayer);
  const grouped = {};
  data.filter(c => selectedCrimeTypes.has(c.crime_type)).forEach(c => {

    const lat = c.latitude;
    const lng = c.longitude;
  });
}