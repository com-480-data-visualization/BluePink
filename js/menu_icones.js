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
