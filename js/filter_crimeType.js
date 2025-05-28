// filter_crimeType.js
// This module provides the UI and logic for filtering crimes by type and year.

// Sets up the UI container for the crime type filter dropdown and year slider.
export function setupCrimeFilterUI() {
  // Remove any existing container
  const existing = document.getElementById("crime-filter-container");
  if (existing) existing.remove();

  // Create the main container
  const filterContainer = document.createElement("div");
  filterContainer.id = "crime-filter-container";
  Object.assign(filterContainer.style, {
    display: "none",           // hidden until a district is selected
    position: "absolute",
    // Position under the title panel on middle-left
    top: "35px",
    left: "50px",
    zIndex: "1000",
    backgroundColor: "white",
    padding: "10px",
    borderRadius: "5px",
    boxShadow: "0 0 15px rgba(0,0,0,0.2)",
    maxWidth: "250px",
  });

  // Insert the dropdown and slider markup
  filterContainer.innerHTML = `
    <!-- ▼ Dropdown for crime types ▼ -->
    <div class="wrapper">
      <div class="select-btn">
        Select Crime Types
        <i class="fa-solid fa-caret-down"></i>
      </div>
      <ul class="list-items" id="crime-type-options"></ul>
    </div>

    <!-- ▼ Year slider (hidden until data is loaded) ▼ -->
    <div id="year-slider-container" style="
        display: none;
        margin-top: 10px;
        padding: 10px;
        border: 1px solid #ccc;
        border-radius: 5px;
        background-color: #f9f9f9;
      ">
      <div style="margin-bottom: 10px;">
        <label for="year-slider" style="font-weight: bold;">
          Year: <span id="year-display">All Years</span>
        </label>
      </div>
      <input type="range" id="year-slider" style="width:100%; margin-bottom:10px;" />
      <div style="
          display: flex;
          justify-content: space-between;
          font-size: 12px;
          margin-bottom: 10px;
        ">
        <span id="min-year" style="font-weight: bold;"></span>
        <span id="max-year" style="font-weight: bold;"></span>
      </div>
      <button id="reset-year" style="
          margin-top: 5px;
          padding: 5px 10px;
          font-size: 12px;
          background: #007cba;
          color: white;
          border: none;
          border-radius: 3px;
          cursor: pointer;
        ">
        Show All Years
      </button>
    </div>
  `;

  // Add to document
  document.body.appendChild(filterContainer);
  console.log("Crime filter UI container created and added to body");

  // Hook up dropdown toggle behavior
  const dropdownBtn = filterContainer.querySelector('.select-btn');
  dropdownBtn.addEventListener('click', () => {
    dropdownBtn.classList.toggle('open');
    // CSS shows/hides the .list-items via .select-btn.open + .list-items
  });
}

// Populates the crime type checklist based on the current district's data
export function populateCrimeTypeFilter(data, selectedCrimeTypes, onClickHandler) {
  const crimeTypeList = document.getElementById("crime-type-options");
  crimeTypeList.innerHTML = "";

  // Gather all crime types
  const allTypes = new Set(data.map(c => c.crime_type));
  selectedCrimeTypes.clear();
  allTypes.forEach(t => selectedCrimeTypes.add(t));

  // "All" option
  const allLi = document.createElement("li");
  allLi.classList.add("item", "checked");
  allLi.dataset.value = "__all__";
  allLi.innerHTML = `
    <span class="checkbox"><i class="fa-solid fa-check check-icon"></i></span>
    <span class="item-text">All</span>
  `;
  allLi.addEventListener("click", () => onClickHandler(allLi));
  crimeTypeList.appendChild(allLi);

  // Individual types
  Array.from(allTypes).sort().forEach(type => {
    const li = document.createElement("li");
    li.classList.add("item", "checked");
    li.dataset.value = type;
    li.innerHTML = `
      <span class="checkbox"><i class="fa-solid fa-check check-icon"></i></span>
      <span class="item-text">${type}</span>
    `;
    li.addEventListener("click", () => onClickHandler(li));
    crimeTypeList.appendChild(li);
  });
}

// Sets up and handles the year slider based on the crime records' dates
export function populateYearSlider(data, onYearChange) {
  console.log("populateYearSlider called with data length:", data.length);

  const sliderContainer = document.getElementById("year-slider-container");
  const slider = document.getElementById("year-slider");
  const display = document.getElementById("year-display");
  const minYearDisplay = document.getElementById("min-year");
  const maxYearDisplay = document.getElementById("max-year");
  const resetButton = document.getElementById("reset-year");

  if (!sliderContainer || !slider || !display) {
    console.error("Year slider elements not found");
    return;
  }

  // Extract years
  const years = Array.from(
    new Set(
      data
        .map(c => parseInt(c.year_begin))
        .filter(y => !isNaN(y) && y > 1900 && y < 2030)
    )
  ).sort((a,b) => a - b);

  if (years.length === 0) {
    sliderContainer.style.display = "none";
    return;
  }

  const minYear = years[0];
  const maxYear = years[years.length - 1];

  slider.min = minYear;
  slider.max = maxYear;
  slider.value = maxYear;

  display.innerText = maxYear;
  minYearDisplay.innerText = minYear;
  maxYearDisplay.innerText = maxYear;

  // Show the slider
  sliderContainer.style.display = "block";

  // Replace slider to clear old listeners
  const newSlider = slider.cloneNode(true);
  slider.parentNode.replaceChild(newSlider, slider);

  // Replace reset button to clear old listeners
  if (resetButton) {
    const newReset = resetButton.cloneNode(true);
    resetButton.parentNode.replaceChild(newReset, resetButton);
    newReset.addEventListener("click", () => {
      display.innerText = "All Years";
      console.log("Reset to all years");
      onYearChange(null);
    });
  }

  // Slider input handler
  newSlider.addEventListener("input", () => {
    const year = parseInt(newSlider.value);
    display.innerText = year;
    console.log("Year slider changed to:", year);
    onYearChange(year);
  });

  // Initialize to show all
  onYearChange(null);
}

// Handles clicking "All" option
export function handleSelectAllClick(allLi) {
  const allItems = document.querySelectorAll(".list-items .item");
  allItems.forEach(item => item.classList.add("checked"));
}

// Handles individual crime type clicks
export function handleIndividualClick(clickedLi) {
  const allLi = document.querySelector('.list-items .item[data-value="__all__"]');
  if (allLi.classList.contains("checked")) {
    document.querySelectorAll(".list-items .item").forEach(item => {
      item.classList.remove("checked");
    });
    clickedLi.classList.add("checked");
  } else {
    clickedLi.classList.toggle("checked");
  }

  if (allLi.classList.contains("checked")) {
    allLi.classList.remove("checked");
  }
}
