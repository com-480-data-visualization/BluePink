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
                `❌ Could not load crime data for district ${districtCode}:`,
                err
              );
              alert(`No crime data available for district ${districtCode}.`);
            });
        });
      },
    }).addTo(map);
  })
  .catch((error) => console.error("Error loading district data:", error));

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

  const locationCounts = {};
  filteredCrimes.forEach((c) => {
    const key = `${c.Latitude},${c.Longitude}`;
    if (!locationCounts[key]) {
      locationCounts[key] = {
        lat: parseFloat(c.Latitude),
        lon: parseFloat(c.Longitude),
        count: 0,
      };
    }
    locationCounts[key].count += 1;
  });

  const markers = Object.values(locationCounts).map((c) => {
    return L.circleMarker([c.lat, c.lon], {
      radius: c.count / 100,
      color: "red",
      fillOpacity: 0.6,
    }).bindPopup(`Crimes at this location: ${c.count}`);
  });

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
function handleIndividualClick(clickedLi) {
  const allLi = document.querySelector(
    '.list-items .item[data-value="__all__"]'
  );
  const isAllSelected = allLi.classList.contains("checked");

  // Case 1: “All” is selected → switch to single selection
  if (isAllSelected) {
    // Uncheck all
    document.querySelectorAll(".list-items .item").forEach((item) => {
      item.classList.remove("checked");
    });

    // Check only the clicked one
    clickedLi.classList.add("checked");
  }
  // Case 2: “All” is not selected → toggle normally
  else {
    clickedLi.classList.toggle("checked");
  }

  // Always uncheck “All” if any individual is clicked
  if (allLi.classList.contains("checked")) {
    allLi.classList.remove("checked");
  }

  updateSelectedCrimeTypes();
}
