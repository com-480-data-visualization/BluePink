import { specialCrimeIcons } from "./crimes_icones.js";
import { calculateCrimeRanges } from "./heatmap.js";
import { calculateEconomicRanges, getCurrentEconomicPercentiles, economicMetrics } from "./economic_choropleth.js";

export function createLegendControl(isDistrictView = true, mapType = 'crime') {
  const legendControl = L.control({ position: "bottomleft" });

  legendControl.onAdd = function () {
    const div = L.DomUtil.create("div", "info legend");

    if (isDistrictView) {
      if (mapType === 'crime') {
        // Crime legend
        div.innerHTML = `
        <div class="legend-container">
          <h4>NYC Crime Map</h4>
          <div class="district-legend">
            <h5>District Crime Levels</h5>
            <div class="legend-item">Loading crime data...</div>
          </div>
        </div>`;

        // Load the actual crime ranges
        calculateCrimeRanges().then(rangeData => {
          let districtLegendHTML = '<h5>District Crime Levels (Crime count)</h5>';
          
          if (rangeData && rangeData.ranges) {
            // Use actual crime count ranges
            rangeData.ranges.forEach(range => {
              districtLegendHTML += `<div class="legend-item"><div class="color-box" style="background:${range.color}"></div> <span>${range.label}</span></div>`;
            });
          } else {
            // Fallback to original percentile labels if data not available
            districtLegendHTML += `
              <div class="legend-item"><div class="color-box" style="background:#cce5ff"></div> <span>Lowest 20%</span></div>
              <div class="legend-item"><div class="color-box" style="background:#99ccff"></div> <span>20-40%</span></div>
              <div class="legend-item"><div class="color-box" style="background:#ffff99"></div> <span>40-60%</span></div>
              <div class="legend-item"><div class="color-box" style="background:#ff9933"></div> <span>60-80%</span></div>
              <div class="legend-item"><div class="color-box" style="background:#ff4d4d"></div> <span>Highest 20%</span></div>
            `;
          }

          // Update the legend content
          div.innerHTML = `
          <div class="legend-container">
            <h4>NYC Crime Map</h4>
            <div class="district-legend">
              ${districtLegendHTML}
            </div>
          </div>`;

          // Re-apply styles after updating content
          div.querySelectorAll(".legend-item").forEach((item) => {
            item.style.margin = "3px 0";
            item.style.display = "flex";
            item.style.alignItems = "center";
          });
        });

      } else if (mapType === 'economic') {
        // Economic legend
        const currentEconomicData = getCurrentEconomicPercentiles();
        
        if (currentEconomicData && currentEconomicData.ranges) {
          let economicLegendHTML = `<h5>${currentEconomicData.metricLabel}</h5>`;
          currentEconomicData.ranges.forEach(range => {
            economicLegendHTML += `<div class="legend-item"><div class="color-box" style="background:${range.color}"></div> <span>${range.label}</span></div>`;
          });
          
          div.innerHTML = `
          <div class="legend-container">
            <h4>NYC Economic Map</h4>
            <div class="district-legend">
              ${economicLegendHTML}
            </div>
          </div>`;
        } else {
          // Loading or fallback state
          div.innerHTML = `
          <div class="legend-container">
            <h4>NYC Economic Map</h4>
            <div class="district-legend">
              <h5>Economic Indicators</h5>
              <div class="legend-item">Loading economic data...</div>
            </div>
          </div>`;
        }
      }

    } else {
      div.innerHTML = `
      <div class="legend-container">
        <h4>NYC Crime Map</h4>
        <div class="legend-item">
          <div class="marker-icon" style="background-color: red; border-radius: 50%; width: 10px; height: 10px;"></div>
          <span>Standard Crime</span>
        </div>
        <div class="crime-icons-legend">
          <div id="special-crime-icons" class="icon-grid">
            ${Object.entries(specialCrimeIcons)
              .map(
                ([key, cfg]) => `
              <div class="legend-icon-item">
                <img src="${cfg.iconUrl}" alt="${key}" style="width: ${cfg.baseWidth * (cfg.legend_scale || 1)}px; height: ${cfg.baseHeight * (cfg.legend_scale || 1)}px;">
                <span>${key}</span>
              </div>
            `
              )
              .join("")}
          </div>
        </div>
      </div>`;
    }

    div.querySelectorAll(".legend-item").forEach((item) => {
      item.style.margin = "3px 0";
      item.style.display = "flex";
      item.style.alignItems = "center";
    });

    return div;
  };

  return legendControl;
}