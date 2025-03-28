// load the map ---------------------------------------------------------------
var map = L.map("map").setView([40.7128, -74.006], 12);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "© OpenStreetMap contributors",
}).addTo(map);

L.marker([40.7128, -74.006]).addTo(map).bindPopup("New York City").openPopup();

// add greyscale layer
L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>',
  subdomains: "abcd",
}).addTo(map);

// display districts ---------------------------------------------------------------
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

fetch(nycDistricts)
  .then((response) => response.json())
  .then((data) => {
    L.geoJSON(data, {
      style: districtStyle,
      onEachFeature: function (feature, layer) {
        layer.bindPopup(
          `<b>${
            feature.properties.name ||
            feature.properties.BoroCD ||
            "Unknown District"
          }</b>`
        );
      },
    }).addTo(map);
  });

// display Crime ---------------------------------------------------------------
let allCrimes = [];

fetch("data/website_data_folder/GPS.csv")
  .then((response) => response.text())
  .then((text) => {
    const lines = text.trim().split("\n");

    // Split using tab character
    const headers = lines[0].split("\t");

    const allCrimes = lines.slice(1).map((line) => {
      const values = line.split("\t");

      const row = {};
      headers.forEach((header, i) => {
        row[header] = values[i];
      });

      return {
        district: parseInt(row.District_Code),
        lat: parseFloat(row.Latitude),
        lng: parseFloat(row.Longitude),
        count: parseInt(row.count),
      };
    });

    console.log(allCrimes); // Your structured dataset
    // Do whatever you want with allCrimes: map, chart, etc.
  })
  .catch((error) => {
    console.error("Error loading GPS.csv:", error);
  });

function showCrimesInDistrict(districtLayer) {
  // Clear previous markers
  crimeMarkers.forEach((marker) => map.removeLayer(marker));
  crimeMarkers = [];

  const districtPolygon = districtLayer.toGeoJSON();
  const districtCode = districtLayer.feature.properties.BoroCD;

  // Show only points from the matching district and inside polygon
  allCrimes.forEach((crime) => {
    // Optional: check if the point belongs to the clicked district
    if (parseInt(crime.district) !== districtCode) return;

    const point = turf.point([crime.lng, crime.lat]);

    if (turf.booleanPointInPolygon(point, districtPolygon)) {
      const marker = L.circleMarker([crime.lat, crime.lng], {
        radius: Math.sqrt(crime.count) + 2, // marker size based on count
        color: "red",
        fillColor: "orange",
        fillOpacity: 0.6,
      })
        .bindPopup(`Crimes: ${crime.count}`)
        .addTo(map);

      crimeMarkers.push(marker);
    }
  });
}

let crimeMarkers = [];

fetch(nycDistricts)
  .then((response) => response.json())
  .then((data) => {
    L.geoJSON(data, {
      style: districtStyle,
      onEachFeature: function (feature, layer) {
        layer.bindPopup(
          `<b>${feature.properties.BoroCD || "Unknown District"}</b>`
        );

        layer.on("click", function () {
          map.fitBounds(layer.getBounds());
          showCrimesInDistrict(layer);
        });
      },
    }).addTo(map);
  });
