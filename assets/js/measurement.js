const BASE_URL = "http://localhost:8080";
const TOKEN_KEY = "qm_access_token";
const USER_KEY = "qm_user";

const measurementConfig = {
  length: {
    measurementType: "LengthUnit",
    units: [
      { label: "Feet", value: "FEET" },
      { label: "Inches", value: "INCHES" },
      { label: "Yards", value: "YARDS" },
      { label: "Centimeters", value: "CENTIMETERS" }
    ]
  },
  weight: {
    measurementType: "WeightUnit",
    units: [
      { label: "Kilogram", value: "KILOGRAM" },
      { label: "Gram", value: "GRAM" },
      { label: "Pound", value: "POUND" }
    ]
  },
  temperature: {
    measurementType: "TemperatureUnit",
    units: [
      { label: "Celsius", value: "CELSIUS" },
      { label: "Fahrenheit", value: "FAHRENHEIT" },
      { label: "Kelvin", value: "KELVIN" }
    ]
  },
  volume: {
    measurementType: "VolumeUnit",
    units: [
      { label: "Litre", value: "LITRE" },
      { label: "Millilitre", value: "MILLILITRE" },
      { label: "Gallon", value: "GALLON" }
    ]
  }
};

const typeButtons = document.querySelectorAll(".type-card");
const actionButtons = document.querySelectorAll(".action-button");
const layouts = document.querySelectorAll(".calculator-layout");
const form = document.getElementById("calculatorForm");
const resultPanel = document.getElementById("resultPanel");
const resultValue = document.getElementById("resultValue");
const resultUnit = document.getElementById("resultUnit");
const statusText = document.getElementById("statusText");
const logoutButton = document.getElementById("logoutButton");

let selectedType = "length";
let selectedAction = "comparison";

const unitSelectIds = [
  "comparisonFromUnit",
  "comparisonToUnit",
  "conversionFromUnit",
  "conversionToUnit",
  "arithmeticUnit1",
  "arithmeticUnit2",
  "arithmeticResultUnit",
  "resultUnit"
];

function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function populateUnits(type) {
  const units = measurementConfig[type].units;

  unitSelectIds.forEach((id) => {
    const select = document.getElementById(id);
    select.innerHTML = units.map((unit) => `<option value="${unit.value}">${unit.label}</option>`).join("");
  });

  document.getElementById("comparisonFromUnit").value = units[0].value;
  document.getElementById("comparisonToUnit").value = (units[1] || units[0]).value;
  document.getElementById("conversionFromUnit").value = units[0].value;
  document.getElementById("conversionToUnit").value = (units[1] || units[0]).value;
  document.getElementById("arithmeticUnit1").value = units[0].value;
  document.getElementById("arithmeticUnit2").value = (units[1] || units[0]).value;
  document.getElementById("arithmeticResultUnit").value = units[0].value;
  resultUnit.value = units[0].value;
}

function setType(type) {
  selectedType = type;
  typeButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.type === type);
  });
  populateUnits(type);
  hideResult();
  statusText.textContent = "";
}

function setAction(action) {
  selectedAction = action;
  actionButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.action === action);
  });
  layouts.forEach((layout) => {
    layout.classList.toggle("active", layout.dataset.layout === action);
  });
  hideResult();
  statusText.textContent = "";
}

function hideResult() {
  resultPanel.classList.add("hidden");
  resultValue.textContent = "";
}

function getMeasurementType() {
  return measurementConfig[selectedType].measurementType;
}

function buildQuantityDTO(value, unit) {
  return {
    value: Number(value),
    unit,
    measurementType: getMeasurementType()
  };
}

function getRequestConfig() {
  if (selectedAction === "comparison") {
    return {
      endpoint: `${BASE_URL}/api/v1/quantities/compare`,
      payload: {
        thisQuantityDTO: buildQuantityDTO(
          document.getElementById("comparisonFromValue").value,
          document.getElementById("comparisonFromUnit").value
        ),
        thatQuantityDTO: buildQuantityDTO(
          document.getElementById("comparisonToValue").value,
          document.getElementById("comparisonToUnit").value
        )
      }
    };
  }

  if (selectedAction === "conversion") {
    return {
      endpoint: `${BASE_URL}/api/v1/quantities/convert`,
      payload: {
        thisQuantityDTO: buildQuantityDTO(
          document.getElementById("conversionValue").value,
          document.getElementById("conversionFromUnit").value
        ),
        thatQuantityDTO: buildQuantityDTO(
          0,
          document.getElementById("conversionToUnit").value
        )
      }
    };
  }

  const operatorEndpointMap = {
    "+": "add",
    "-": "subtract",
    "/": "divide"
  };
  const operator = document.getElementById("arithmeticOperator").value;

  return {
    endpoint: `${BASE_URL}/api/v1/quantities/${operatorEndpointMap[operator]}`,
    payload: {
      thisQuantityDTO: buildQuantityDTO(
        document.getElementById("arithmeticValue1").value,
        document.getElementById("arithmeticUnit1").value
      ),
      thatQuantityDTO: buildQuantityDTO(
        document.getElementById("arithmeticValue2").value,
        document.getElementById("arithmeticUnit2").value
      )
    }
  };
}

function getUnitLabel(unitValue) {
  return measurementConfig[selectedType].units.find((unit) => unit.value === unitValue)?.label || unitValue;
}

function showBackendResult(data) {
  if (data.operation === "compare") {
    resultValue.textContent = data.resultString === "true" ? "Equal" : "Not Equal";
    resultUnit.innerHTML = `<option value="">Comparison</option>`;
    resultPanel.classList.remove("hidden");
    statusText.textContent = "Comparison completed from backend response.";
    return;
  }

  if (data.error) {
    hideResult();
    statusText.textContent = data.errorMessage || "Backend reported an error.";
    return;
  }

  if (data.resultValue === undefined || data.resultValue === null) {
    hideResult();
    statusText.textContent = data.errorMessage || "Backend response did not include a result.";
    return;
  }

  resultValue.textContent = data.resultValue;
  if (data.resultUnit) {
    resultUnit.innerHTML = `<option value="${data.resultUnit}">${getUnitLabel(data.resultUnit)}</option>`;
  } else {
    resultUnit.innerHTML = `<option value="">Result</option>`;
  }
  resultPanel.classList.remove("hidden");
  statusText.textContent = "Calculation completed from backend response.";
}

async function ensureAuthenticated() {
  const token = getToken();
  if (!token) {
    window.location.href = "../auth/index.html";
    return false;
  }

  try {
    const response = await fetch(`${BASE_URL}/auth/status`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!response.ok) {
      clearAuth();
      window.location.href = "../auth/index.html";
      return false;
    }

    const data = await response.json();
    if (!data.authenticated) {
      clearAuth();
      window.location.href = "../auth/index.html";
      return false;
    }
  } catch {
    clearAuth();
    window.location.href = "../auth/index.html";
    return false;
  }

  return true;
}

typeButtons.forEach((button) => {
  button.addEventListener("click", () => setType(button.dataset.type));
});

actionButtons.forEach((button) => {
  button.addEventListener("click", () => setAction(button.dataset.action));
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  hideResult();
  const { endpoint, payload } = getRequestConfig();
  const token = getToken();

  if (!token) {
    statusText.textContent = "Please login first.";
    window.location.href = "../auth/index.html";
    return;
  }

  statusText.textContent = "Calculating...";

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    if (response.status === 401) {
      clearAuth();
      throw new Error("Your session expired. Please login again.");
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.message || data.errorMessage || `Request failed with status ${response.status}`);
    }

    showBackendResult(data);
  } catch (error) {
    hideResult();
    statusText.textContent = error.message || "Unable to fetch calculation from backend.";
    if (statusText.textContent.includes("Please login")) {
      window.location.href = "../auth/index.html";
    }
  }
});

logoutButton.addEventListener("click", () => {
  clearAuth();
  window.location.href = "../auth/index.html";
});

setType(selectedType);
setAction(selectedAction);
ensureAuthenticated();
