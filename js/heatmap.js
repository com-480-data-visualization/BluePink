let allCrimeData = [];

// Loads all crime data files (one per district) and flattens them into a global array.
// This data is used to color-code districts based on crime volume.
export function loadAllCrimeData(districtLayer) {
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
    colorDistrictsByCrime(districtLayer);
  });
}
// Fetches grouped crime data from a JSON file and applies coloring to districts.
// If the data is invalid or missing, falls back to demo data.
export function colorDistrictsByCrime(districtLayer) {
  fetch("data/website_data/GPS_grouped.json")
    .then(res => res.ok ? res.json() : useDemoData(districtLayer))
    .then(data => {
      const crimeCounts = {};
      data.forEach(item => {
        const code = item.District_Code?.toString();
        if (code && !isNaN(item.count)) {
          crimeCounts[code] = item.count;
        }
      });

      if (Object.keys(crimeCounts).length === 0) {
        useDemoData();
      } else {
        applyColorsToDistricts(crimeCounts);
      }
    })
    .catch(() => useDemoData(districtLayer));
}
// Generates and applies demo crime data to districts.
// Used as a fallback if real data is unavailable.
export function useDemoData(districtLayer) {
  if (!districtLayer || typeof districtLayer.eachLayer !== "function") {
    console.error("❌ useDemoData: districtLayer is not ready or invalid:", districtLayer);
    return;
  }

  const demoCrimeCounts = {};
  districtLayer.eachLayer(layer => {
    const code = layer.feature.properties.BoroCD;
    demoCrimeCounts[code] = Math.floor(Math.random() * 950) + 50;
  });

  applyColorsToDistricts(districtLayer, demoCrimeCounts);
}


// Applies color shading to each district based on its total crime count,
// using percentile thresholds (20%, 40%, etc.) for classification.
export function applyColorsToDistricts(districtLayer, crimeCounts) {
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
}