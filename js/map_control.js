import { colorDistrictsByCrime } from "./heatmap.js";
import { loadEconomicData, colorDistrictsByEconomics, economicMetrics } from "./economic_choropleth.js";
import { createLegendControl } from "./legend.js";

let currentMapType = 'crime';
let currentEconomicMetric = 'individuals_below_FPL';

// Keep track of the one-and-only legend control
let legendControl = null;

export function setupMapControls(map, districtLayer) {
  // Create control container
  const mapControlContainer = document.createElement('div');
  mapControlContainer.id = 'map-controls';
  mapControlContainer.style.cssText = `
    position: absolute;
    top: 10px;
    right: 10px;
    background: white;
    padding: 10px;
    border-radius: 5px;
    box-shadow: 0 0 15px rgba(0,0,0,0.2);
    z-index: 1000;
    font-family: Arial, sans-serif;
    min-width: 200px;
  `;

  // Create map type toggle buttons
  const mapTypeContainer = document.createElement('div');
  mapTypeContainer.innerHTML = `
    <h4 style="margin: 0 0 10px 0; font-size: 14px;">Map Type</h4>
    <div id="map-type-buttons" style="display: flex; gap: 5px; margin-bottom: 15px;">
      <button id="crime-map-btn" class="map-type-btn active" data-type="crime">Crime</button>
      <button id="economic-map-btn" class="map-type-btn" data-type="economic">Economic</button>
    </div>
  `;

  // Create economic metric selector (initially hidden)
  const economicControlContainer = document.createElement('div');
  economicControlContainer.id = 'economic-controls';
  economicControlContainer.style.display = 'none';
  economicControlContainer.innerHTML = `
    <h4 style="margin: 0 0 10px 0; font-size: 14px;">Economic Metric</h4>
    <select id="economic-metric-selector" style="width: 100%; padding: 5px; border: 1px solid #ccc; border-radius: 3px;">
      ${Object.entries(economicMetrics).map(([key, label]) => 
        `<option value="${key}" ${key === currentEconomicMetric ? 'selected' : ''}>${label}</option>`
      ).join('')}
    </select>
  `;

  mapControlContainer.appendChild(mapTypeContainer);
  mapControlContainer.appendChild(economicControlContainer);
  
  // Add to map container
  document.getElementById('map').appendChild(mapControlContainer);

  // Add CSS for buttons
  const style = document.createElement('style');
  style.textContent = `
    .map-type-btn {
      padding: 8px 12px;
      border: 1px solid #ccc;
      background: white;
      cursor: pointer;
      border-radius: 3px;
      font-size: 12px;
      flex: 1;
    }
    .map-type-btn:hover {
      background: #f0f0f0;
    }
    .map-type-btn.active {
      background: #007cba;
      color: white;
      border-color: #007cba;
    }
  `;
  document.head.appendChild(style);

  // Event listeners
  document.getElementById('crime-map-btn').addEventListener('click', () => {
    switchMapType('crime', map, districtLayer);
  });

  document.getElementById('economic-map-btn').addEventListener('click', () => {
    // Only now load & draw economic data
    loadEconomicData(districtLayer);
    switchMapType('economic', map, districtLayer);
  });

  document.getElementById('economic-metric-selector').addEventListener('change', (e) => {
    currentEconomicMetric = e.target.value;
    if (currentMapType === 'economic') {
      colorDistrictsByEconomics(districtLayer, currentEconomicMetric);
      updateLegend(map, true, 'economic');
    }
  });

  // Initialize default view (crime)
  switchMapType(currentMapType, map, districtLayer);
}

function switchMapType(mapType, map, districtLayer) {
  currentMapType = mapType;
  
  // Update button states
  document.querySelectorAll('.map-type-btn').forEach(btn => btn.classList.remove('active'));
  document.getElementById(`${mapType}-map-btn`).classList.add('active');

  // Show/hide economic controls & apply styling
  const economicControls = document.getElementById('economic-controls');
  if (mapType === 'economic') {
    economicControls.style.display = 'block';
    colorDistrictsByEconomics(districtLayer, currentEconomicMetric);
  } else {
    economicControls.style.display = 'none';
    colorDistrictsByCrime(districtLayer);
  }

  // Update the legend (removes old, adds new)
  updateLegend(map, true, mapType);
}

function updateLegend(map, isDistrictView, mapType) {
  if (legendControl) {
    map.removeControl(legendControl);
    legendControl = null;
  }
  legendControl = createLegendControl(isDistrictView, mapType);
  legendControl.addTo(map);
}

export function getCurrentMapType() {
  return currentMapType;
}

export function getCurrentEconomicMetric() {
  return currentEconomicMetric;
}
