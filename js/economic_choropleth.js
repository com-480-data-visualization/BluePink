let economicData = [];
let currentEconomicMetric = 'individuals_below_FPL'; // Default metric
let currentEconomicPercentiles = null;

// Available economic metrics
export const economicMetrics = {
  'individuals_below_FPL': 'Individuals Below Federal Poverty Line',
  'Employement_pop_ratio': 'Employment Population Ratio'
};

// Load economic data from eco_data.json
export function loadEconomicData(districtLayer) {
  fetch("data/website_data/eco_data.json")
    .then(res => {
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      return res.json();
    })
    .then(data => {
      console.log("Loaded economic data:", data);
      economicData = data;
      colorDistrictsByEconomics(districtLayer, currentEconomicMetric);
    })
    .catch(error => {
      console.error("Error loading economic data:", error);
      useEconomicDemoData(districtLayer);
    });
}

// Apply economic coloring to districts
export function colorDistrictsByEconomics(districtLayer, metric = 'individuals_below_FPL') {
  if (!districtLayer || typeof districtLayer.eachLayer !== "function") {
    console.error("❌ colorDistrictsByEconomics: districtLayer is not ready");
    return;
  }

  currentEconomicMetric = metric;
  
  // Create a mapping of district codes to metric values
  const economicValues = {};
  economicData.forEach(item => {
    const code = item.District_Code;
    const value = item[metric];
    if (code && !isNaN(value) && value !== null && value !== undefined) {
      economicValues[code] = value;
      economicValues[code.toString()] = value;
    }
  });

  console.log(`Economic values for ${metric}:`, economicValues);

  if (Object.keys(economicValues).length === 0) {
    console.warn("No valid economic data found, using demo data");
    useEconomicDemoData(districtLayer);
    return;
  }

  applyEconomicColorsToDistricts(districtLayer, economicValues, metric);
}

// Apply colors based on economic data
function applyEconomicColorsToDistricts(districtLayer, economicValues, metric) {
  // Get all values for percentile calculation
  const allValues = Object.values(economicValues).filter(val => !isNaN(val) && val !== null).sort((a, b) => a - b);
  
  if (allValues.length === 0) {
    console.warn("No economic values available for coloring");
    return;
  }
  
  // Calculate percentile thresholds
  const minValue = allValues[0];
  const maxValue = allValues[allValues.length - 1];
  const p20 = allValues[Math.floor(allValues.length * 0.2)] || minValue;
  const p40 = allValues[Math.floor(allValues.length * 0.4)] || minValue;
  const p60 = allValues[Math.floor(allValues.length * 0.6)] || minValue;
  const p80 = allValues[Math.floor(allValues.length * 0.8)] || minValue;

  // Store percentiles for legend access
  currentEconomicPercentiles = {
    metric: metric,
    metricLabel: economicMetrics[metric] || metric,
    min: minValue,
    max: maxValue,
    p20, p40, p60, p80,
    ranges: createEconomicRanges(minValue, maxValue, p20, p40, p60, p80, metric)
  };

  console.log("Economic percentile thresholds:", { p20, p40, p60, p80 });

  // Apply colors to each district
  districtLayer.eachLayer(layer => {
    const properties = layer.feature.properties;
    const code = properties.BoroCD;
    
    // Try different formats to match the district code
    let value = economicValues[code] || economicValues[code.toString()] || null;
    
    // Determine fill color based on economic value
    let fillColor;
    if (value === null || isNaN(value)) {
      fillColor = "#f0f0f0"; // Gray for no data
    } else {
      // For poverty rate, higher values = worse (red), lower values = better (green)
      // For employment ratio, higher values = better (green), lower values = worse (red)
      if (metric === 'individuals_below_FPL') {
        // Poverty: lower is better
        if (value <= p20) fillColor = "#d4f1d4"; // Light green
        else if (value <= p40) fillColor = "#a8e6a8"; // Medium green  
        else if (value <= p60) fillColor = "#ffff99"; // Yellow
        else if (value <= p80) fillColor = "#ff9933"; // Orange
        else fillColor = "#ff4d4d"; // Red
      } else {
        // Employment: higher is better
        if (value <= p20) fillColor = "#ff4d4d"; // Red
        else if (value <= p40) fillColor = "#ff9933"; // Orange
        else if (value <= p60) fillColor = "#ffff99"; // Yellow
        else if (value <= p80) fillColor = "#a8e6a8"; // Medium green
        else fillColor = "#d4f1d4"; // Light green
      }
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
    const displayValue = value !== null ? 
      (metric === 'individuals_below_FPL' ? 
        `${(value * 100).toFixed(1)}%` : 
        `${(value * 100).toFixed(1)}%`) : 'No data';
    
    layer.bindPopup(`<b>${name}</b><br>District Code: ${code}<br>${economicMetrics[metric] || metric}: ${displayValue}`);
    
    console.log(`District ${code} (${name}): ${displayValue} -> ${fillColor}`);
  });

  console.log(`Economic choropleth coloring complete for ${metric}`);
}

// Create economic ranges for legend
function createEconomicRanges(min, max, p20, p40, p60, p80, metric) {
  const formatValue = (val) => {
    if (metric === 'individuals_below_FPL') {
      return `${(val * 100).toFixed(1)}%`;
    } else {
      return `${(val * 100).toFixed(1)}%`;
    }
  };

  if (metric === 'individuals_below_FPL') {
    // For poverty: lower is better (green), higher is worse (red)
    return [
      { min: min, max: p20, color: "#d4f1d4", label: `${formatValue(min)} - ${formatValue(p20)}` },
      { min: p20, max: p40, color: "#a8e6a8", label: `${formatValue(p20)} - ${formatValue(p40)}` },
      { min: p40, max: p60, color: "#ffff99", label: `${formatValue(p40)} - ${formatValue(p60)}` },
      { min: p60, max: p80, color: "#ff9933", label: `${formatValue(p60)} - ${formatValue(p80)}` },
      { min: p80, max: max, color: "#ff4d4d", label: `${formatValue(p80)} - ${formatValue(max)}` }
    ];
  } else {
    // For employment: higher is better (green), lower is worse (red)
    return [
      { min: min, max: p20, color: "#ff4d4d", label: `${formatValue(min)} - ${formatValue(p20)}` },
      { min: p20, max: p40, color: "#ff9933", label: `${formatValue(p20)} - ${formatValue(p40)}` },
      { min: p40, max: p60, color: "#ffff99", label: `${formatValue(p40)} - ${formatValue(p60)}` },
      { min: p60, max: p80, color: "#a8e6a8", label: `${formatValue(p60)} - ${formatValue(p80)}` },
      { min: p80, max: max, color: "#d4f1d4", label: `${formatValue(p80)} - ${formatValue(max)}` }
    ];
  }
}

// Calculate economic ranges for legend
export function calculateEconomicRanges(metric = 'individuals_below_FPL') {
  return fetch("data/website_data/eco_data.json")
    .then(res => {
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      return res.json();
    })
    .then(data => {
      // Extract values for the specific metric
      const allValues = data
        .map(item => item[metric])
        .filter(val => !isNaN(val) && val !== null && val !== undefined)
        .sort((a, b) => a - b);

      if (allValues.length === 0) {
        return null;
      }

      // Calculate percentile thresholds
      const minValue = allValues[0];
      const maxValue = allValues[allValues.length - 1];
      const p20 = allValues[Math.floor(allValues.length * 0.2)] || minValue;
      const p40 = allValues[Math.floor(allValues.length * 0.4)] || minValue;
      const p60 = allValues[Math.floor(allValues.length * 0.6)] || minValue;
      const p80 = allValues[Math.floor(allValues.length * 0.8)] || minValue;

      return {
        metric: metric,
        metricLabel: economicMetrics[metric] || metric,
        min: minValue,
        max: maxValue,
        p20, p40, p60, p80,
        ranges: createEconomicRanges(minValue, maxValue, p20, p40, p60, p80, metric)
      };
    })
    .catch(error => {
      console.error("Error calculating economic ranges:", error);
      return null;
    });
}

// Get current economic percentiles for legend
export function getCurrentEconomicPercentiles() {
  return currentEconomicPercentiles;
}

// Demo data fallback
function useEconomicDemoData(districtLayer) {
  if (!districtLayer || typeof districtLayer.eachLayer !== "function") {
    console.error("❌ useEconomicDemoData: districtLayer is not ready");
    return;
  }

  console.log("Using economic demo data");
  const demoEconomicValues = {};
  districtLayer.eachLayer(layer => {
    const code = layer.feature.properties.BoroCD;
    // Generate random economic data
    if (currentEconomicMetric === 'individuals_below_FPL') {
      demoEconomicValues[code] = Math.random() * 0.4; // 0-40% poverty rate
    } else {
      demoEconomicValues[code] = 0.3 + Math.random() * 0.5; // 30-80% employment rate
    }
  });

  applyEconomicColorsToDistricts(districtLayer, demoEconomicValues, currentEconomicMetric);
}