// Load special icon
import {
  specialCrimeIcons
} from "./crimes_icones.js";

import { createLegendControl } from "./legend.js";

import {
  loadAllCrimeData,
  colorDistrictsByCrime
} from "./heatmap.js";

import {
  setupCrimeFilterUI,
  populateCrimeTypeFilter,
} from "./filter_crimeType.js";

import { setupDistrictInfoPanel, showDistrictInfoPanel } from "./eco_info.js";

import { setupMapControls, getCurrentMapType } from "./map_control.js";
import { colorDistrictsByEconomics } from "./economic_choropleth.js";

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
        const districtName =
          feature.properties.BoroCD_name || `District ${districtCode}`;

        layer.on("click", () => {
          console.log("Clicked district", feature.properties);

          currentDistrictCode = districtCode;
          map.fitBounds(layer.getBounds());

          districtLayer.setStyle({
            fillOpacity: 0,
          });

          createLegend(false);

          document.getElementById("crime-filter-container").style.display =
            "block";
          showDistrictInfoPanel(districtCode);
          loadDistrictCrimeData(districtCode);
        });
      },
    }).addTo(map);

    loadAllCrimeData(districtLayer);
    setupCrimeFilterUI();
    //createLegend(true);

    setupMapControls(map, districtLayer);

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
      populateCrimeTypeFilter(districtCrimes, selectedCrimeTypes, handleCrimeFilterClick);

      if (markerLayer) map.removeLayer(markerLayer);
      displayCrimesForDistrict(code, districtCrimes);
    })
    .catch((err) => {
      console.error(`No data for district ${code}`);
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
      // If "All" was selected before, clear and select only clicked
      document.querySelectorAll(".list-items .item").forEach((item) => {
        item.classList.remove("checked");
      });
      clickedLi.classList.add("checked");
    } else {
      clickedLi.classList.toggle("checked");

      // If any individual item is toggled, uncheck "All"
      if (allLi.classList.contains("checked")) {
        allLi.classList.remove("checked");
      }
    }
  }

  // Update selectedCrimeTypes set
  selectedCrimeTypes.clear();
  document.querySelectorAll(".list-items .item.checked").forEach((item) => {
    const val = item.dataset.value;
    if (val && val !== "__all__") selectedCrimeTypes.add(val);
  });

  // Re-render markers
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

    document.getElementById("crime-filter-container").style.display = "none";

    createLegend(true);

    // Re-apply the appropriate choropleth coloring based on current map type
    const mapType = getCurrentMapType();
    if (mapType === 'economic') {
      colorDistrictsByEconomics(districtLayer);
    } else {
      colorDistrictsByCrime(districtLayer);
    }
  }
});


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
