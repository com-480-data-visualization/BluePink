// Special icons for specific crime types
export const specialCrimeIcons = {
  murder: {
    match: (type) => type.includes("murder"),
    name: "Murder",
    iconUrl: "images/skull.png",
    baseWidth: 16,
    baseHeight: 10,
    maxCount: 5,
    legend_scale: 2,
  },
  rape: {
    match: (type) => type.includes("rape"),
    name: "Rape",
    iconUrl: "images/black_triangle.png",
    baseWidth: 10,
    baseHeight: 10,
    maxCount: 5,
    legend_scale: 1,
  },
  fire: {
    match: (type) => type.includes("intentional property fire"),
    name: "Intentional property fire",
    iconUrl: "images/fire.png",
    baseWidth: 12,
    baseHeight: 10,
    maxCount: 7,
    legend_scale: 3,
  },
  kidnapping: {
    match: (type) => type.includes("kidnapping"),
    name: "Kidnapping",
    iconUrl: "images/black_cross.png",
    baseWidth: 10,
    baseHeight: 10,
    maxCount: 5,
    legend_scale: 1.5,
  },
};

export const iconLegendHTML = `
<b>Legend:</b>
<div style="margin-top: 0.5rem;">
    ${Object.entries(specialCrimeIcons)
      .map(([key, config]) => {
        const width = config.baseWidth * config.legend_scale;
        const height = config.baseHeight * config.legend_scale;
        const label =
          config.name.charAt(0).toUpperCase() + config.name.slice(1);

        return `
        <div style="display: flex; align-items: center; height: 18px; margin-bottom: 1px;">
            <div style="width: 30px; height: 100%; display: flex; align-items: center; justify-content: center;">
            <img src="${config.iconUrl}" width="${width}" height="${height}" />
            </div>
            <span style="margin-left: 8px;">${label}</span>
        </div>
        `;
      })
      .join("")}
</div>
`;

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