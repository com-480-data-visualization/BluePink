// load the map ---------------------------------------------------------------
var map = L.map("map").setView([40.7128, -74.006], 11);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "© OpenStreetMap contributors",
}).addTo(map);

//L.marker([40.7128, -74.006]).addTo(map).bindPopup("New York City").openPopup();

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

// display Crime *************************************************************
let allCrimes = [];

// load the CSV file ---------------------------------------------------------------
function parseCSV(text) {
  const rows = text.trim().split("\n");
  const headers = rows[0].split(",");

  return rows.slice(1).map((row) => {
    const values = row.split(",");
    const entry = {};
    headers.forEach((header, i) => {
      entry[header.trim()] = values[i].trim();
    });
    return entry;
  });
}

const fileId = "1ABC2DEFgHIJKlmnOPQRstuVWxyz";
const url_GPS_csv = `https://drive.google.com/uc?export=download&id=${fileId}`;
fetch(url_GPS_csv)
  .then((response) => {
    if (!response.ok) throw new Error("Network response was not ok");
    return response.text();
  })
  .then((csvText) => {
    allCrimes = parseCSV(csvText);

    // THEN load districts
    return fetch(nycDistricts);
  })
  .then((response) => response.json())
  .then((data) => {
    // Now allCrimes is guaranteed to be ready
    L.geoJSON(data, {
      style: districtStyle,
      onEachFeature: function (feature, layer) {
        const districtCode = parseInt(feature.properties.BoroCD);
        layer.bindPopup(`<b>${feature.properties.name || districtCode}</b>`);

        layer.on("click", function () {
          map.fitBounds(layer.getBounds());

          if (window.crimeLayer) {
            map.removeLayer(window.crimeLayer);
          }

          const districtCrimes = allCrimes.filter(
            (c) => parseInt(c.District_Code) === districtCode
          );

          console.log("Matching crimes:", districtCrimes);

          const markers = districtCrimes.map((c) => {
            return L.circleMarker(
              [parseFloat(c.Latitude), parseFloat(c.Longitude)],
              {
                radius: c.count / 100,
                color: "red",
                fillOpacity: 0.6,
              }
            ).bindPopup(`Crimes: ${c.count}`);
          });

          window.crimeLayer = L.layerGroup(markers).addTo(map);
        });
      },
    }).addTo(map);
  })
  .catch((error) => console.error("Error loading data:", error));
