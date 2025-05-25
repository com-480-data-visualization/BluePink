
// Sets up the UI container for the crime type filter dropdown.
// This filter appears when a district is selected.
// filter_crimeType.js
export function setupCrimeFilterUI(onCrimeTypeClick) {
  const filterContainer = document.createElement("div");
  filterContainer.id = "crime-filter-container";
  filterContainer.style.display = "none";
  filterContainer.style.position = "absolute";
  filterContainer.style.top = "10px";
  filterContainer.style.right = "10px";
  filterContainer.style.zIndex = "1000";
  filterContainer.style.backgroundColor = "white";
  filterContainer.style.padding = "10px";
  filterContainer.style.borderRadius = "5px";
  filterContainer.style.boxShadow = "0 0 15px rgba(0,0,0,0.2)";
  filterContainer.style.maxWidth = "250px";

  filterContainer.innerHTML = `
    <div class="wrapper">
      <div class="content">
        <div class="search">
          <i class="fa-solid fa-search"></i>
          <input type="text" placeholder="Search">
        </div>
        <ul class="list-items" id="crime-type-options"></ul>
      </div>
    </div>
  `;

  document.body.appendChild(filterContainer);

  const dropdownBtn = document.querySelector(".select-btn");
  if (dropdownBtn) {
    dropdownBtn.addEventListener("click", () => {
      dropdownBtn.classList.toggle("open");
    });
  }

  // Bind click listener to be used later
  return onCrimeTypeClick;
}

export function populateCrimeTypeFilter(data, selectedCrimeTypes, onClickHandler) {
  const crimeTypeList = document.getElementById("crime-type-options");
  crimeTypeList.innerHTML = "";

  const allTypes = new Set(data.map((c) => c.crime_type));
  selectedCrimeTypes.clear();
  allTypes.forEach((t) => selectedCrimeTypes.add(t));

  const allLi = document.createElement("li");
  allLi.classList.add("item", "checked");
  allLi.dataset.value = "__all__";
  allLi.innerHTML = `
    <span class="checkbox"><i class="fa-solid fa-check check-icon"></i></span>
    <span class="item-text">All</span>
  `;
  allLi.addEventListener("click", () => onClickHandler(allLi));
  crimeTypeList.appendChild(allLi);

  Array.from(allTypes)
    .sort()
    .forEach((type) => {
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


// Handles "All" option click in the crime type filter.
// Ensures all crime types are selected if "All" is checked.
export function handleSelectAllClick(allLi) {
  const allItems = document.querySelectorAll(".list-items .item");
  const isAlreadyAll = allLi.classList.contains("checked");

  if (isAlreadyAll) {
    // Already selected — do nothing
    return;
  }

  // Uncheck all first (to reset)
  allItems.forEach((item) => item.classList.remove("checked"));

  // Check all items, including "All"
  allItems.forEach((item) => item.classList.add("checked"));

  updateSelectedCrimeTypes(currentDistrictCode, currentDistrictData, displayCrimesForDistrict);
}

// Handles individual crime type click events.
// Toggles selection and updates the filter state accordingly.
export function handleIndividualClick(clickedLi) {
  const allLi = document.querySelector(
    '.list-items .item[data-value="__all__"]'
  );
  const isAllSelected = allLi.classList.contains("checked");

  // Case 1: "All" is selected → switch to single selection
  if (isAllSelected) {
    // Uncheck all
    document.querySelectorAll(".list-items .item").forEach((item) => {
      item.classList.remove("checked");
    });

    // Check only the clicked one
    clickedLi.classList.add("checked");
  }
  // Case 2: "All" is not selected → toggle normally
  else {
    clickedLi.classList.toggle("checked");
  }

  // Always uncheck "All" if any individual is clicked
  if (allLi.classList.contains("checked")) {
    allLi.classList.remove("checked");
  }

  updateSelectedCrimeTypes(currentDistrictCode, currentDistrictData, displayCrimesForDistrict);
}

 // Updates the global `selectedCrimeTypes` set based on current UI state.
// Also refreshes the markers on the map to match selected filters.
export function updateSelectedCrimeTypes({
  selectedCrimeTypes,
  currentDistrictCode,
  currentDistrictData,
  displayCrimesForDistrict,
}) {
  selectedCrimeTypes.clear();

  const allItems = document.querySelectorAll(".list-items .item");
  const allLi = document.querySelector(
    '.list-items .item[data-value="__all__"]'
  );
  const checkedItems = document.querySelectorAll(".list-items .item.checked");

  if (allLi.classList.contains("checked")) {
    allItems.forEach((item) => {
      const value = item.dataset.value;
      if (value && value !== "__all__") {
        selectedCrimeTypes.add(value);
      }
    });
  } else {
    checkedItems.forEach((item) => {
      const value = item.dataset.value;
      if (value && value !== "__all__") {
        selectedCrimeTypes.add(value);
      }
    });
  }

  if (currentDistrictCode && currentDistrictData) {
    displayCrimesForDistrict(currentDistrictCode, currentDistrictData);
  }
}
