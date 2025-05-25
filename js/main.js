// Load special icon
import { specialCrimeIcons, iconLegendHTML } from "./menu_icones.js";
import {
  loadAllCrimeData,
  colorDistrictsByCrime,
  useDemoData,
  applyColorsToDistricts,
} from "./heatmap.js";

import { setupDistrictInfoPanel, showDistrictInfoPanel } from "./eco_info.js";

// Load the map ---------------------------------------------------------------
var map = L.map("map").setView([40.7128, -74.006], 11);

// Base map layers
const baseGray = L.tileLayer(
  "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
  {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>',
    subdomains: "abcd",
  }
);
baseGray.addTo(map);

// Global state
let markerLayer = null;
let districtLayer = null;
let selectedCrimeTypes = new Set();
let currentDistrictCode = null;
let legendControl = null;
let currentDistrictData = null;

// Creates and displays a dynamic legend on the map.
// The legend adapts based on whether the map is in district view or heatmap view.
function createLegend(isDistrictView = true) {
  // Remove existing legend if it exists
  if (legendControl) {
    map.removeControl(legendControl);
  }

  legendControl = L.control({ position: "bottomleft" });
  legendControl.onAdd = function (map) {
    const div = L.DomUtil.create("div", "info legend");

    if (isDistrictView) {
      // Only show district crime levels when in heat map view !
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
              ${Object.entries(specialCrimeIcons)
                .map(
                  ([key, cfg]) => `
                <div class="legend-item">
                  <img src="${cfg.iconUrl}" alt="${key}" style="width: ${cfg.baseWidth}px; height: ${cfg.baseHeight}px;">
                  <span>${key}</span>
                </div>
              `
                )
                .join("")}
            </div>
          </div>
        </div>
      `;
    }

    div.style.backgroundColor = "white";
    div.style.padding = "10px";
    div.style.borderRadius = "5px";
    div.style.boxShadow = "0 0 15px rgba(0,0,0,0.2)";
    div.style.maxWidth = "250px";

    const colorBoxes = div.querySelectorAll(".color-box");
    colorBoxes.forEach((box) => {
      box.style.width = "15px";
      box.style.height = "15px";
      box.style.display = "inline-block";
      box.style.marginRight = "5px";
    });

    const legendItems = div.querySelectorAll(".legend-item");
    legendItems.forEach((item) => {
      item.style.margin = "5px 0";
      item.style.display = "flex";
      item.style.alignItems = "center";
    });

    return div;
  };
  legendControl.addTo(map);
}

// Sets up the UI container for the crime type filter dropdown.
// This filter appears when a district is selected.
function setupCrimeFilterUI() {
  const filterContainer = document.createElement("div");
  filterContainer.id = "crime-filter-container";
  filterContainer.style.display = "none";
  filterContainer.style.position = "absolute";
  filterContainer.style.top = "10px";
  filterContainer.style.right = "10px";
  filterContainer.style.zIndex = "1000";
  filterContainer.style.backgroundColor = "white";
  filterContainer.style.padding = "10px";
  filterContainer.style.borderRadius = "5px";
  filterContainer.style.boxShadow = "0 0 15px rgba(0,0,0,0.2)";
  filterContainer.style.maxWidth = "250px";

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
  dropdownBtn.addEventListener("click", () => {
    dropdownBtn.classList.toggle("open");
  });
}

// Loads district boundary data from ArcGIS and initializes the map.
// Adds event listeners to each district for interactivity.
fetch(
  "https://services5.arcgis.com/GfwWNkhOj9bNBqoJ/arcgis/rest/services/NYC_Community_Districts/FeatureServer/0/query?where=1=1&outFields=*&outSR=4326&f=pgeojson"
)
  .then((res) => res.json())
  .then((data) => {
    districtLayer = L.geoJSON(data, {
      style: () => ({
        fillColor: "transparent",
        color: "black",
        weight: 1.5,
        opacity: 0.7,
      }),
      onEachFeature: (feature, layer) => {
  // Disable popups completely
  layer.bindPopup = () => layer;

  const districtCode = parseInt(feature.properties.BoroCD);
  const districtName = feature.properties.BoroCD_name || `District ${districtCode}`;

  layer.on("click", () => {
    console.log("Clicked district", feature.properties);

    currentDistrictCode = districtCode;
    map.fitBounds(layer.getBounds());

    districtLayer.setStyle({
      fillOpacity: 0
    });

    createLegend(false);

    document.getElementById('crime-filter-container').style.display = 'block';
    showDistrictInfoPanel(districtCode);
    loadDistrictCrimeData(districtCode);
  });
},
    }).addTo(map);

    loadAllCrimeData(districtLayer);
    setupCrimeFilterUI();
    createLegend(true);
  });

// Loads individual district crime data based on the selected district code.
// Also sets up crime type filters and displays corresponding markers.
function loadDistrictCrimeData(code) {
  fetch(`data/crimes_by_district/${code}.json`)
    .then((res) => {
      if (!res.ok) throw new Error(`No data for district ${code}`);
      return res.json();
    })
    .then((districtCrimes) => {
      currentDistrictData = districtCrimes;

      // Populate crime types filter when district data is loaded
      populateCrimeTypeFilter(districtCrimes);

      if (markerLayer) map.removeLayer(markerLayer);
      displayCrimesForDistrict(code, districtCrimes);
    })
    .catch((err) => {
      console.error(`No data for district ${code}`);
    });
}

// Populates the dropdown UI with unique crime types from the district data.
// Initializes each type as "selected" by default.
function populateCrimeTypeFilter(data) {
  const crimeTypeList = document.getElementById("crime-type-options");

  // Clear existing options
  crimeTypeList.innerHTML = "";

  // Get unique crime types
  const allTypes = new Set(data.map((c) => c.crime_type));

  // Initially select all crime types
  selectedCrimeTypes = new Set(allTypes);

  // Add "All" option at the top
  const allLi = document.createElement("li");
  allLi.classList.add("item", "checked");
  allLi.dataset.value = "__all__";
  allLi.innerHTML = `
    <span class="checkbox"><i class="fa-solid fa-check check-icon"></i></span>
    <span class="item-text">All</span>
  `;
  allLi.addEventListener("click", () => handleSelectAllClick(allLi));
  crimeTypeList.appendChild(allLi);

  // Add individual crime types
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

// Handles "All" option click in the crime type filter.
// Ensures all crime types are selected if "All" is checked.
function handleSelectAllClick(allLi) {
  const allItems = document.querySelectorAll(".list-items .item");
  const isAlreadyAll = allLi.classList.contains("checked");

  if (isAlreadyAll) {
    // Already selected — do nothing
    return;
  }

  // Uncheck all first (to reset)
  allItems.forEach((item) => item.classList.remove("checked"));

  // Check all items, including "All"
  allItems.forEach((item) => item.classList.add("checked"));

  updateSelectedCrimeTypes();
}

// Handles individual crime type click events.
// Toggles selection and updates the filter state accordingly.
function handleIndividualClick(clickedLi) {
  const allLi = document.querySelector(
    '.list-items .item[data-value="__all__"]'
  );
  const isAllSelected = allLi.classList.contains("checked");

  // Case 1: "All" is selected → switch to single selection
  if (isAllSelected) {
    // Uncheck all
    document.querySelectorAll(".list-items .item").forEach((item) => {
      item.classList.remove("checked");
    });

    // Check only the clicked one
    clickedLi.classList.add("checked");
  }
  // Case 2: "All" is not selected → toggle normally
  else {
    clickedLi.classList.toggle("checked");
  }

  // Always uncheck "All" if any individual is clicked
  if (allLi.classList.contains("checked")) {
    allLi.classList.remove("checked");
  }

  updateSelectedCrimeTypes();
}

// Updates the global `selectedCrimeTypes` set based on current UI state.
// Also refreshes the markers on the map to match selected filters.
function updateSelectedCrimeTypes() {
  selectedCrimeTypes = new Set();

  const allItems = document.querySelectorAll(".list-items .item");
  const allLi = document.querySelector(
    '.list-items .item[data-value="__all__"]'
  );
  const checkedItems = document.querySelectorAll(".list-items .item.checked");

  if (allLi.classList.contains("checked")) {
    // "All" is selected → add all types except "All"
    allItems.forEach((item) => {
      const value = item.dataset.value;
      if (value && value !== "__all__") {
        selectedCrimeTypes.add(value);
      }
    });
  } else {
    // Only specific items selected
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

// Triggers marker view generation based on selected district and filters.
// Delegates to `createMarkerView`.
function displayCrimesForDistrict(code, data) {
  createMarkerView(data);
}

// Creates and adds Leaflet markers to the map based on crime data.
// Supports clustering and special icons for different crime types.
function createMarkerView(data) {
  if (markerLayer) map.removeLayer(markerLayer);
  const grouped = {};
  data
    .filter((c) => selectedCrimeTypes.has(c.crime_type))
    .forEach((c) => {
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
    Object.values(grouped).flatMap((loc) => {
      const markers = [];
      const hasNormal = Object.keys(loc.types).some(
        (type) =>
          !Object.values(specialCrimeIcons).some((cfg) => cfg.match(type))
      );
      if (hasNormal) {
        markers.push(
          L.circleMarker([loc.lat, loc.lon], {
            radius: Math.min(Math.max(loc.total / 100, 3), 12),
            color: "red",
            fillOpacity: 0.5,
          })
        );
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
            });
            markers.push(L.marker([loc.lat, loc.lon], { icon }));
          }
        }
      });
      return markers;
    })
  ).addTo(map);
}

// Resets the map when the user right-clicks (context menu).
// Clears selected district and returns to overview view.
map.on("contextmenu", function () {
  if (currentDistrictCode) {
    currentDistrictCode = null;
    map.setView([40.7128, -74.006], 11);
    if (markerLayer) map.removeLayer(markerLayer);

    // Hide crime filter when returning to overview
    document.getElementById("crime-filter-container").style.display = "none";

    createLegend(true);

    colorDistrictsByCrime(districtLayer);
  }
});

const style = document.createElement("style");
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
  
  /* Crime Filter Dropdown Styles */
  .wrapper {
    width: 100%;
    background: #fff;
    border-radius: 5px;
    box-shadow: 0 5px 10px rgba(0,0,0,0.1);
  }
  
  .wrapper .select-btn {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 15px;
    border-radius: 5px;
    cursor: pointer;
    background: #fff;
    border: 1px solid #ddd;
  }
  
  .wrapper .select-btn.open {
    border-radius: 5px 5px 0 0;
  }
  
  .wrapper .content {
    display: none;
    border-top: 1px solid #ddd;
  }
  
  .select-btn.open + .content {
    display: block;
  }
  
  .wrapper .search {
    padding: 10px;
    border-bottom: 1px solid #ddd;
  }
  
  .wrapper .search input {
    width: 100%;
    border: none;
    outline: none;
    padding: 5px;
    font-size: 12px;
  }
  
  .wrapper .list-items {
    max-height: 250px;
    overflow-y: auto;
    padding: 5px 10px;
    margin: 0;
  }
  
  .wrapper .list-items li {
    display: flex;
    align-items: center;
    padding: 8px 0;
    cursor: pointer;
    transition: all 0.2s;
    list-style: none;
  }
  
  .wrapper .list-items li:hover {
    background: #f5f5f5;
  }
  
  .wrapper .list-items li .checkbox {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 16px;
    width: 16px;
    border-radius: 3px;
    margin-right: 8px;
    border: 1.5px solid #c0c0c0;
    transition: all 0.2s;
  }
  
  .wrapper .list-items li.checked .checkbox {
    background: #4070f4;
    border-color: #4070f4;
  }
  
  .wrapper .list-items li .check-icon {
    color: #fff;
    font-size: 11px;
    transform: scale(0);
    transition: all 0.2s;
  }
  
  .wrapper .list-items li.checked .check-icon {
    transform: scale(1);
  }
`;
document.head.appendChild(style);

// Initialize map with choropleth map view by default
window.addEventListener("DOMContentLoaded", () => {
  // Add Font Awesome
  const fontAwesome = document.createElement("link");
  fontAwesome.rel = "stylesheet";
  fontAwesome.href =
    "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.1.1/css/all.min.css";
  document.head.appendChild(fontAwesome);
  setupDistrictInfoPanel();
});
