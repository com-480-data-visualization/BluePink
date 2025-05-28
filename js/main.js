// Load special icon
import {
  specialCrimeIcons
} from "./crimes_icones.js";

import { createLegendControl } from "./legend.js";

import {
  loadAllCrimeData,
  colorDistrictsByCrime
} from "./heatmap.js"; //choropleth crime map 

import {
  setupCrimeFilterUI,
  populateCrimeTypeFilter,
  populateYearSlider
} from "./filter_crimeType.js"; //year slider and crime type selection

import { setupDistrictInfoPanel, showDistrictInfoPanel } from "./eco_info.js";

import { setupMapControls, getCurrentMapType, updateLegend } from "./map_control.js"; //map changing logic
import { colorDistrictsByEconomics } from "./economic_choropleth.js"; // choroplet socioeco maps

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

// Global states
let markerLayer = null;
let districtLayer = null;
let selectedCrimeTypes = new Set();
let currentDistrictCode = null;
let selectedYear = null;
let legendControl = null;
let currentDistrictData = null;

function createLegend(isDistrictView = true) {
  if (legendControl) {
    map.removeControl(legendControl);
  }
  const mapType = getCurrentMapType(); // Get current map type
  legendControl = createLegendControl(isDistrictView, mapType);
  legendControl.addTo(map);
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

        layer.on("click", () => {
          currentDistrictCode = districtCode;
          map.fitBounds(layer.getBounds());
          const overlay = document.getElementById("map-overlay");
          if (overlay) overlay.style.display = "none";

          districtLayer.setStyle({
            fillOpacity: 0,
          });

          // Hide the map-type controls
          document.getElementById("map-controls").style.display = "none";

          // Swap in the marker-view legend
          updateLegend(map, false, getCurrentMapType());

          document.getElementById("crime-filter-container").style.display =
            "block";
          showDistrictInfoPanel(districtCode);
          loadDistrictCrimeData(districtCode);
        });
      },
    }).addTo(map);

    loadAllCrimeData(districtLayer);
    setupCrimeFilterUI();
    setupMapControls(map, districtLayer);

  });

// Loads individual district crime data based on the selected district code.
// Also sets up crime type filters, year slider, and displays corresponding markers.
function loadDistrictCrimeData(code) {

  
  fetch(`data/crimes_by_district/${code}.json`)
    .then((res) => {
      if (!res.ok) throw new Error(`No data for district ${code}`);
      return res.json();
    })
    .then((districtCrimes) => {
      currentDistrictData = districtCrimes;

      // Populate crime types filter
      populateCrimeTypeFilter(districtCrimes, selectedCrimeTypes, handleCrimeFilterClick);

      // Populate year slider 
      populateYearSlider(districtCrimes, (year) => {
        selectedYear = year;
        displayCrimesForDistrict(code, currentDistrictData);
      });

      // Initial display
      displayCrimesForDistrict(code, districtCrimes);
    })
    .catch((err) => {
      console.error(`Error loading data for district ${code}:`, err);
    });
}

function handleCrimeFilterClick(clickedLi) {
  const allLi = document.querySelector(
    '.list-items .item[data-value="__all__"]'
  );
  const isAll = clickedLi.dataset.value === "__all__";

  if (isAll) {
    const allItems = document.querySelectorAll(".list-items .item");

    // Uncheck all first
    allItems.forEach((item) => item.classList.remove("checked"));

    // Then check all items
    allItems.forEach((item) => item.classList.add("checked"));
  } else {
    const isAllSelected = allLi.classList.contains("checked");

    if (isAllSelected) {
      document.querySelectorAll(".list-items .item").forEach((item) => {
        item.classList.remove("checked");
      });
      clickedLi.classList.add("checked");
    } else {
      clickedLi.classList.toggle("checked");
      if (allLi.classList.contains("checked")) {
        allLi.classList.remove("checked");
      }
    }
  }

  selectedCrimeTypes.clear();
  document.querySelectorAll(".list-items .item.checked").forEach((item) => {
    const val = item.dataset.value;
    if (val && val !== "__all__") selectedCrimeTypes.add(val);
  });

  if (currentDistrictCode && currentDistrictData) {
    displayCrimesForDistrict(currentDistrictCode, currentDistrictData);
  }
}

function displayCrimesForDistrict(code, data) {
  createMarkerView(data);
}

function createMarkerView(data) {
  if (markerLayer) map.removeLayer(markerLayer);
  
  console.log(`Filtering data: selectedYear=${selectedYear}, selectedCrimeTypes=${Array.from(selectedCrimeTypes).join(', ')}`);
  
  const grouped = {};
  const filteredData = data.filter((c) => {
    // Checking crime type filter
    if (selectedCrimeTypes.size > 0 && !selectedCrimeTypes.has(c.crime_type)) {
      return false;
    }
    
    // Checking year filter
    if (selectedYear !== null) {
      const year = parseInt(c.year_begin);
      if (isNaN(year) || year !== selectedYear) {
        return false;
      }
    }
    
    return true;
  });


  filteredData.forEach((c) => {
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

// Resets the map when the user right-clicks (context menu). (not really used)
// Clears selected district and returns to overview view.
map.on("contextmenu", function () {
  if (currentDistrictCode) {
    currentDistrictCode = null;
    map.setView([40.7128, -74.006], 11);
    if (markerLayer) map.removeLayer(markerLayer);

    const overlay = document.getElementById("map-overlay");
    if (overlay) overlay.style.display = "block";

    document.getElementById("crime-filter-container").style.display = "none";
    const sliderContainer = document.getElementById("year-slider-container");
    if (sliderContainer) sliderContainer.style.display = "none";
    selectedYear = null;

    document.getElementById("map-controls").style.display = "block";

    const mapType = getCurrentMapType();
    if (mapType === 'economic') {
      colorDistrictsByEconomics(districtLayer);
    } else {
      colorDistrictsByCrime(districtLayer);
    }

    updateLegend(map, true, mapType);
  }
});

// Initialize map with choropleth map view by default
window.addEventListener("DOMContentLoaded", () => {
  const fontAwesome = document.createElement("link");
  fontAwesome.rel = "stylesheet";
  fontAwesome.href =
    "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.1.1/css/all.min.css";
  document.head.appendChild(fontAwesome);
  setupDistrictInfoPanel();
});
