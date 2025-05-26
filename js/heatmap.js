let allCrimeData = [];
let currentPercentiles = null;

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
    .then(res => {
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      return res.json();
    })
    .then(data => {
      console.log("Loaded GPS_grouped.json data:", data);
      
      // Build crime counts object from GPS_grouped.json data
      const crimeCounts = {};
      data.forEach(item => {
        // Handle both integer and float district codes
        const code = Math.floor(item.District_Code);
        if (code && !isNaN(item.count) && item.count >= 0) {
          // Store with different key formats to match against district properties
          crimeCounts[code.toString()] = item.count;
          crimeCounts[code] = item.count;
        }
      });

      console.log("Processed crime counts:", crimeCounts);

      if (Object.keys(crimeCounts).length === 0) {
        console.warn("No valid crime data found, using demo data");
        useDemoData(districtLayer);
      } else {
        applyColorsToDistricts(districtLayer, crimeCounts);
      }
    })
    .catch(error => {
      console.error("Error loading GPS_grouped.json:", error);
      useDemoData(districtLayer);
    });
}

// Generates and applies demo crime data to districts.
// Used as a fallback if real data is unavailable.
export function useDemoData(districtLayer) {
  if (!districtLayer || typeof districtLayer.eachLayer !== "function") {
    console.error("❌ useDemoData: districtLayer is not ready or invalid:", districtLayer);
    return;
  }

  console.log("Using demo data");
  const demoCrimeCounts = {};
  districtLayer.eachLayer(layer => {
    const code = layer.feature.properties.BoroCD;
    demoCrimeCounts[code] = Math.floor(Math.random() * 950) + 50;
  });

  applyColorsToDistricts(districtLayer, demoCrimeCounts);
}

// Export function to get current percentiles for legend
export function getCurrentPercentiles() {
  return currentPercentiles;
}

// Function to calculate crime count ranges from the GPS_grouped.json data
export function calculateCrimeRanges() {
  return fetch("data/website_data/GPS_grouped.json")
    .then(res => {
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      return res.json();
    })
    .then(data => {
      // Extract all crime counts and sort them
      const allCounts = data
        .map(item => item.count)
        .filter(count => !isNaN(count) && count >= 0)
        .sort((a, b) => a - b);

      if (allCounts.length === 0) {
        return null;
      }

      // Calculate percentile thresholds
      const minCount = allCounts[0];
      const maxCount = allCounts[allCounts.length - 1];
      const p20 = allCounts[Math.floor(allCounts.length * 0.2)] || minCount;
      const p40 = allCounts[Math.floor(allCounts.length * 0.4)] || minCount;
      const p60 = allCounts[Math.floor(allCounts.length * 0.6)] || minCount;
      const p80 = allCounts[Math.floor(allCounts.length * 0.8)] || minCount;

      // Create ranges with actual crime counts
      const ranges = [
        { 
          min: minCount, 
          max: p20, 
          color: "#cce5ff", 
          label: `${minCount.toLocaleString()} - ${p20.toLocaleString()}` 
        },
        { 
          min: p20 + 1, 
          max: p40, 
          color: "#99ccff", 
          label: `${(p20 + 1).toLocaleString()} - ${p40.toLocaleString()}` 
        },
        { 
          min: p40 + 1, 
          max: p60, 
          color: "#ffff99", 
          label: `${(p40 + 1).toLocaleString()} - ${p60.toLocaleString()}` 
        },
        { 
          min: p60 + 1, 
          max: p80, 
          color: "#ff9933", 
          label: `${(p60 + 1).toLocaleString()} - ${p80.toLocaleString()}` 
        },
        { 
          min: p80 + 1, 
          max: maxCount, 
          color: "#ff4d4d", 
          label: `${(p80 + 1).toLocaleString()} - ${maxCount.toLocaleString()}` 
        }
      ];

      return {
        min: minCount,
        max: maxCount,
        p20, p40, p60, p80,
        ranges: ranges
      };
    })
    .catch(error => {
      console.error("Error calculating crime ranges:", error);
      return null;
    });
}
// using percentile thresholds (20%, 40%, etc.) for classification.
export function applyColorsToDistricts(districtLayer, crimeCounts) {
  if (!districtLayer || typeof districtLayer.eachLayer !== "function") {
    console.error("❌ applyColorsToDistricts: districtLayer is not ready or invalid:", districtLayer);
    return;
  }

  // Get all crime counts for percentile calculation
  const allCounts = Object.values(crimeCounts).filter(count => count > 0).sort((a, b) => a - b);
  
  if (allCounts.length === 0) {
    console.warn("No crime counts available for coloring");
    return;
  }
  
  // Calculate percentile thresholds
  const minCount = allCounts[0];
  const maxCount = allCounts[allCounts.length - 1];
  const p20 = allCounts[Math.floor(allCounts.length * 0.2)] || 1;
  const p40 = allCounts[Math.floor(allCounts.length * 0.4)] || 2;
  const p60 = allCounts[Math.floor(allCounts.length * 0.6)] || 3;
  const p80 = allCounts[Math.floor(allCounts.length * 0.8)] || 4;

  // Store percentiles for legend access
  currentPercentiles = {
    min: minCount,
    p20: p20,
    p40: p40,
    p60: p60,
    p80: p80,
    max: maxCount,
    ranges: [
      { min: minCount, max: p20, color: "#cce5ff", label: `${minCount.toLocaleString()} - ${p20.toLocaleString()}` },
      { min: p20 + 1, max: p40, color: "#99ccff", label: `${(p20 + 1).toLocaleString()} - ${p40.toLocaleString()}` },
      { min: p40 + 1, max: p60, color: "#ffff99", label: `${(p40 + 1).toLocaleString()} - ${p60.toLocaleString()}` },
      { min: p60 + 1, max: p80, color: "#ff9933", label: `${(p60 + 1).toLocaleString()} - ${p80.toLocaleString()}` },
      { min: p80 + 1, max: maxCount, color: "#ff4d4d", label: `${(p80 + 1).toLocaleString()} - ${maxCount.toLocaleString()}` }
    ]
  };

  console.log("Percentile thresholds:", { p20, p40, p60, p80 });
  console.log("Legend ranges:", currentPercentiles.ranges);

  // Apply colors to each district
  districtLayer.eachLayer(layer => {
    const properties = layer.feature.properties;
    const code = properties.BoroCD;
    
    // Try different formats to match the district code
    let count = crimeCounts[code] || 
                crimeCounts[code.toString()] || 
                0;
    
    // Determine fill color based on crime count
    let fillColor;
    if (count === 0) {
      fillColor = "#f0f0f0"; // Gray for no data
    } else if (count <= p20) {
      fillColor = "#cce5ff"; // Light blue
    } else if (count <= p40) {
      fillColor = "#99ccff"; // Medium blue
    } else if (count <= p60) {
      fillColor = "#ffff99"; // Yellow
    } else if (count <= p80) {
      fillColor = "#ff9933"; // Orange
    } else {
      fillColor = "#ff4d4d"; // Red
    }

    // Apply the style
    layer.setStyle({
      fillColor: fillColor,
      fillOpacity: 0.6,
      color: "black",
      weight: 1.5,
      opacity: 0.7
    });

    // Create popup with district information
    const name = properties.BoroCD_name || `District ${code}`;
    layer.bindPopup(`<b>${name}</b><br>District Code: ${code}<br>Crime Count: ${count.toLocaleString()}`);
    
    console.log(`District ${code} (${name}): ${count} crimes -> ${fillColor}`);
  });

  console.log("Choropleth coloring complete");
}