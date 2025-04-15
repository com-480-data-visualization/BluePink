// Load special icon
import { specialCrimeIcons, iconLegendHTML } from "./menu_icones.js";
// Load the map ---------------------------------------------------------------
var map = L.map("map").setView([40.7128, -74.006], 11);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "© OpenStreetMap contributors",
}).addTo(map);

// Add greyscale layer
L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>',
  subdomains: "abcd",
}).addTo(map);

// Display districts ---------------------------------------------------------------
var nycDistricts =
  "https://services5.arcgis.com/GfwWNkhOj9bNBqoJ/arcgis/rest/services/NYC_Community_Districts/FeatureServer/0/query?where=1=1&outFields=*&outSR=4326&f=pgeojson";

// Style for districts
function districtStyle(feature) {
  return {
    fillColor: "transparent",
    color: "black",
    weight: 2,
    opacity: 1,
  };
}

// Crime on map ---------------------------------------------------------------
// Store selected crime types from the filter dropdown
let selectedCrimeTypes = new Set();

// Setup dropdown logic
const dropdownBtn = document.querySelector(".select-btn");
const crimeFilterContainer = document.getElementById("crime-filter-container");
const crimeTypeList = document.getElementById("crime-type-options");

// Toggle dropdown open/close
dropdownBtn.addEventListener("click", () => {
  dropdownBtn.classList.toggle("open");
});

// Fetch and render districts
fetch(nycDistricts)
  .then((response) => response.json())
  .then((districtData) => {
    L.geoJSON(districtData, {
      style: districtStyle,
      onEachFeature: function (feature, layer) {
        const districtCode = parseInt(feature.properties.BoroCD);
        layer.bindPopup(`<b>${feature.properties.name || districtCode}</b>`);

        layer.on("click", function () {
          map.fitBounds(layer.getBounds());
          document.getElementById("map-description").innerHTML = iconLegendHTML;
          document.getElementById("main-title").style.display = "none";

          if (window.crimeLayer) {
            map.removeLayer(window.crimeLayer);
          }

          const crimeFile = `data/crimes_by_district/${districtCode}.json`;

          fetch(crimeFile)
            .then((res) => res.json())
            .then((districtCrimes) => {
              // Show filter container
              crimeFilterContainer.style.display = "block";
              window.lastDistrictCode = districtCode;
              window.lastDistrictData = districtCrimes;

              if (crimeTypeList.children.length === 0) {
                // Add "All" option at the top
                const allLi = document.createElement("li");
                allLi.classList.add("item", "checked");
                allLi.dataset.value = "__all__";
                allLi.innerHTML = `
                  <span class="checkbox"><i class="fa-solid fa-check check-icon"></i></span>
                  <span class="item-text">All</span>
                `;
                allLi.addEventListener("click", () =>
                  handleSelectAllClick(allLi)
                );
                crimeTypeList.appendChild(allLi);

                // Add real crime types
                const allTypes = new Set(
                  districtCrimes.map((c) => c.crime_type)
                );
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
                    li.addEventListener("click", () =>
                      handleIndividualClick(li)
                    );
                    crimeTypeList.appendChild(li);
                    selectedCrimeTypes.add(type);
                  });
              }

              // Display crimes
              displayCrimesForDistrict(districtCode, districtCrimes);
            })
            .catch((err) => {
              console.error(
                `Could not load crime data for district ${districtCode}:`,
                err
              );
              alert(`No crime data available for district ${districtCode}.`);
            });
        });
      },
    }).addTo(map);
  })
  .catch((error) => console.error("Error loading district data:", error));

//Functions to handle type selection---------------------------------------------
function handleSelectAllClick(allLi) {
  const allItems = document.querySelectorAll(".list-items .item");
  const isAlreadyAll = allLi.classList.contains("checked");

  if (isAlreadyAll) {
    // Already selected — do nothing
    return;
  }

  // Uncheck all first (to reset)
  allItems.forEach((item) => item.classList.remove("checked"));

  // Check all items, including “All”
  allItems.forEach((item) => item.classList.add("checked"));

  updateSelectedCrimeTypes();
}

// Update selectedCrimeTypes from UI
function updateSelectedCrimeTypes() {
  selectedCrimeTypes = new Set();

  const allItems = document.querySelectorAll(".list-items .item");
  const allLi = document.querySelector(
    '.list-items .item[data-value="__all__"]'
  );
  const checkedItems = document.querySelectorAll(".list-items .item.checked");

  if (allLi.classList.contains("checked")) {
    // “All” is selected → add all types except “All”
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

  if (window.lastDistrictCode && window.lastDistrictData) {
    displayCrimesForDistrict(window.lastDistrictCode, window.lastDistrictData);
  }
}

// Render markers based on filtered crime types
function displayCrimesForDistrict(districtCode, districtCrimes) {
  const filteredCrimes = districtCrimes.filter((c) =>
    selectedCrimeTypes.has(c.crime_type)
  );

  const locationData = {};

  // Step 1: Group by lat/lon and crime type
  filteredCrimes.forEach((c) => {
    const key = `${c.Latitude},${c.Longitude}`;
    const lat = parseFloat(c.Latitude);
    const lon = parseFloat(c.Longitude);
    const type = c.crime_type.toLowerCase();

    if (!locationData[key]) {
      locationData[key] = {
        lat,
        lon,
        total: 0,
        types: {},
      };
    }

    locationData[key].total += 1;

    if (!locationData[key].types[type]) {
      locationData[key].types[type] = 0;
    }

    locationData[key].types[type] += 1;
  });

  const markers = [];
  logSpecialCrimeStats(locationData);

  // Step 2: Create icons and circles for each location
  Object.values(locationData).forEach((loc) => {
    const { lat, lon, total, types } = loc;

    // Always show a circle marker for total count
    const hasNonSpecial = Object.keys(types).some(
      (type) =>
        !Object.values(specialCrimeIcons).some((config) => config.match(type))
    );

    if (hasNonSpecial) {
      const circle = L.circleMarker([lat, lon], {
        radius: Math.min(total / 100, 20),
        color: "red",
        fillOpacity: 0.5,
      }).bindPopup(`Crimes at this location: ${total}`);
      markers.push(circle);
    }

    // Add icons for each special type
    let iconIndex = 0;
    Object.entries(types).forEach(([type, count]) => {
      for (const [key, config] of Object.entries(specialCrimeIcons)) {
        if (config.match(type)) {
          const useCount = Math.min(count, config.maxCount);
          const width = useCount * 0.8 * config.baseWidth;
          const height = useCount * 0.8 * config.baseHeight;

          const icon = L.icon({
            iconUrl: config.iconUrl,
            iconSize: [width, height],
            iconAnchor: [width / 2, height / 2],
            popupAnchor: [0, -10],
          });

          markers.push(
            L.marker([lat, lon], { icon }).bindPopup(
              `<b>${type.toUpperCase()}</b><br>Count: ${count}`
            )
          );
        }
      }
    });
  });

  // Step 3: Show all markers
  if (window.crimeLayer) {
    map.removeLayer(window.crimeLayer);
  }
  window.crimeLayer = L.layerGroup(markers).addTo(map);
}

function handleIndividualClick(clickedLi) {
  const allLi = document.querySelector(
    '.list-items .item[data-value="__all__"]'
  );

  // Case: “All” is selected → switch to single selection
  if (allLi.classList.contains("checked")) {
    // Uncheck all items
    document.querySelectorAll(".list-items .item").forEach((item) => {
      item.classList.remove("checked");
    });

    // Only select the clicked one
    clickedLi.classList.add("checked");
  } else {
    // Normal toggle (multi-select behavior)
    clickedLi.classList.toggle("checked");
  }

  // Always ensure “All” is unselected if another item is toggled
  if (allLi.classList.contains("checked")) {
    allLi.classList.remove("checked");
  }

  updateSelectedCrimeTypes();
}

function logSpecialCrimeStats(locationData) {
  const counts = {};

  Object.values(locationData).forEach((loc) => {
    Object.entries(loc.types).forEach(([type, count]) => {
      for (const [key, config] of Object.entries(specialCrimeIcons)) {
        if (config.match(type)) {
          const label = config.name || key;
          counts[label] = (counts[label] || 0) + count;
        }
      }
    });
  });

  console.log("Special Crime Icons Count:");
  Object.entries(counts).forEach(([type, count]) => {
    console.log(`- ${type}: ${count}`);
  });
}
