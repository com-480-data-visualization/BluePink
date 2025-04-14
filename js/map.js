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
              const locationCounts = {};

              // Group and count crimes by location
              districtCrimes.forEach((c) => {
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

              // Create markers with radius based on count
              const markers = Object.values(locationCounts).map((c) => {
                return L.circleMarker([c.lat, c.lon], {
                  radius: c.count / 100, // radius based on count
                  color: "red",
                  fillOpacity: 0.6,
                }).bindPopup(`Crimes at this location: ${c.count}`);
              });

              // Add the layer to the map
              window.crimeLayer = L.layerGroup(markers).addTo(map);
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
