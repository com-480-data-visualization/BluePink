// district_infos.js

export function showDistrictInfoPanel(districtCode) {
  fetch(`data/data_by_district/${districtCode}.json`)
    .then(res => {
      if (!res.ok) throw new Error(`Info not found for district ${districtCode}`);
      return res.json();
    })
    .then(data => {
      const info = data[0];  // assuming 1 object per file

      const panel = document.getElementById('district-info-panel');
      panel.innerHTML = `
        <h3>${info.District || "District " + info.District_Code}</h3>
        <p><strong>Total Crimes:</strong> ${info.total_crimes.toLocaleString()}</p>
        <h4>Main Crimes</h4>
        <ul>
          ${Object.entries(info.main_crimes).map(([crime, count]) => `
            <li>${crime}: ${count.toLocaleString()}</li>
          `).join('')}
        </ul>
        <h4>Socio-economic informations</h4>
        <p><strong>Inhabitants bellow FPL*:</strong> ${(info.individuals_below_FPL_median * 100).toFixed(1)}%</p>
        <p><strong>Employment Ratio:</strong> ${(info.Employement_pop_ratio_mean * 100).toFixed(1)}%</p>
        <p>*FPL: Federal Poverty Level. Median over 2006-2022</p>
      `;
    
      panel.style.display = 'block';
    })
    .catch(err => {
      console.error(err);
    });
}

export function setupDistrictInfoPanel() {
  const panel = document.createElement('div');
  panel.id = 'district-info-panel';
  panel.style.position = 'absolute';
  panel.style.top = '10px';
  panel.style.right = '10px';
  panel.style.width = '300px';
  panel.style.maxHeight = '90vh';
  panel.style.overflowY = 'auto';
  panel.style.padding = '15px';
  panel.style.backgroundColor = '#fff';
  panel.style.border = '1px solid #ccc';
  panel.style.borderRadius = '8px';
  panel.style.boxShadow = '0 0 10px rgba(0,0,0,0.2)';
  panel.style.zIndex = '1001';
  panel.style.display = 'none';

  document.body.appendChild(panel);
  console.log("✅ Panel created");
}
