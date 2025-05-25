import { specialCrimeIcons } from "./crimes_icones.js";

export function createLegendControl(isDistrictView = true) {
  const legendControl = L.control({ position: "bottomleft" });

  legendControl.onAdd = function () {
    const div = L.DomUtil.create("div", "info legend");

    div.innerHTML = isDistrictView
      ? `
      <div class="legend-container">
        <h4>NYC Crime Map</h4>
        <div class="district-legend">
          <h5>District Crime Levels</h5>
          <div class="legend-item"><div class="color-box" style="background:#cce5ff"></div> <span>Lowest 20%</span></div>
          <div class="legend-item"><div class="color-box" style="background:#99ccff"></div> <span>20-40%</span></div>
          <div class="legend-item"><div class="color-box" style="background:#ffff99"></div> <span>40-60%</span></div>
          <div class="legend-item"><div class="color-box" style="background:#ff9933"></div> <span>60-80%</span></div>
          <div class="legend-item"><div class="color-box" style="background:#ff4d4d"></div> <span>Highest 20%</span></div>
        </div>
      </div>`
      : `
      <div class="legend-container">
        <h4>NYC Crime Map</h4>
        <div class="legend-item">
          <div class="marker-icon" style="background-color: red; border-radius: 50%; width: 10px; height: 10px;"></div>
          <span>Standard Crime Marker</span>
        </div>
        <div class="crime-icons-legend">
          <h5>Special Crime Types</h5>
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

    div.querySelectorAll(".legend-item").forEach((item) => {
      item.style.margin = "3px 0";
      item.style.display = "flex";
      item.style.alignItems = "center";
    });

    return div;
  };

  return legendControl;
} 