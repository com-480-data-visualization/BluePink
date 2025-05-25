export function showDistrictInfoPanel(districtCode) {
  fetch(`data/data_by_district/${districtCode}.json`)
    .then((res) => {
      if (!res.ok)
        throw new Error(`Info not found for district ${districtCode}`);
      return res.json();
    })
    .then((data) => {
      const info = data[0];
      const total = info.total_crimes;
      const panel = document.getElementById("district-info-panel");
      const content = document.getElementById("district-info-content");

      content.innerHTML = `
        <h3>${info.District || "District " + info.District_Code}</h3>
        <p><strong>Total Crimes (2006-2023):</strong> ${
          info.total_crimes != null
            ? info.total_crimes.toLocaleString()
            : "Information not available"
        }</p>

        <h4>Main Crimes</h4>
        <div class="main-crimes-bar-chart">
          ${Object.entries(info.main_crimes)
            .map(([crime, count]) => {
              const width = (count / total) * 100;
              return `
                <div class="crime-bar-row">
                  <div class="crime-label">${crime}</div>
                  <div class="crime-bar">
                    <div class="crime-fill" style="width:${width}%"></div>
                  </div>
                  <div class="crime-count">${count.toLocaleString()}</div>
                </div>
              `;
            })
            .join("")}
        </div>
        <h4>Socio-economic info:</h4>
        <p><strong>Inhabitants below FPL*:</strong> ${
          info.individuals_below_FPL_median != null
            ? (info.individuals_below_FPL_median * 100).toFixed(1) +
              "%<span style='font-size: 80%;'>**</span>"
            : "<span style='font-size: 80%;'>Information not available</span>"
        }</p>

<p><strong>Employment Ratio:</strong> ${
        info.Employement_pop_ratio_mean != null
          ? (info.Employement_pop_ratio_mean * 100).toFixed(1) +
            "%<span style='font-size: 80%;'>**</span>"
          : "<span style='font-size: 80%;'>Information not available</span>"
      }</p>


        <p class="footnote">*FPL: Federal Poverty Level</p>
        <p class="footnote">**Median over 2006–2022</p>
      `;

      panel.style.display = "block";
    })
    .catch((err) => {
      console.error(err);
    });
}

export function setupDistrictInfoPanel() {
  const panel = document.createElement("div");
  panel.id = "district-info-panel";
  panel.style.position = "absolute";
  panel.style.top = "50%";
  panel.style.right = "10px";
  panel.style.width = "320px";
  panel.style.transform = "translateY(-50%)";
  panel.style.maxHeight = "90vh";
  panel.style.overflowY = "auto";
  panel.style.padding = "15px";
  panel.style.backgroundColor = "#fff";
  panel.style.border = "1px solid #ccc";
  panel.style.borderRadius = "8px";
  panel.style.boxShadow = "0 0 10px rgba(0,0,0,0.2)";
  panel.style.zIndex = "1001";
  panel.style.display = "none";

  // Back arrow
  const backArrow = document.createElement("div");
  backArrow.innerHTML = `
    <i class="fa-solid fa-arrow-left" style="cursor:pointer; font-size: 18px; margin-bottom: 10px;"></i>
  `;
  backArrow.onclick = () => location.reload();
  panel.appendChild(backArrow);

  // Content container
  const content = document.createElement("div");
  content.id = "district-info-content";
  panel.appendChild(content);

  document.body.appendChild(panel);
}
