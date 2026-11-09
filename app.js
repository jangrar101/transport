const portalPages = {
  admin: [["overview", "◫", "Overview"], ["fleet", "▣", "Fleet & trucks"], ["bookings", "↗", "Bookings"], ["drivers", "♙", "Drivers"], ["companies", "▤", "Companies"], ["locations", "⌖", "Truck locations"]],
  driver: [["overview", "◫", "My dashboard"], ["bookings", "↗", "My trips"], ["fleet", "▣", "My truck"], ["profile", "♙", "My profile"]],
  company: [["overview", "◫", "Dashboard"], ["bookings", "↗", "My bookings"], ["fleet", "▣", "Available trucks"], ["profile", "♙", "Company profile"]]
};
const portalCopy = {
  admin: { name: "Manoj Jangra", initials: "MJ", role: "Fleet administrator", title: "Good morning, Manoj", subtitle: "Here’s what’s happening across your transport operations today." },
  driver: { name: "Ravi Kumar", initials: "RK", role: "Driver · Truck HH-008", title: "Good morning, Ravi", subtitle: "Your truck is available in Delhi. Check your trips and vehicle details." },
  company: { name: "Sharma Foods", initials: "SF", role: "Company account", title: "Welcome, Sharma Foods", subtitle: "Book a truck, follow your loads and check delivery progress." }
};
const statusLabels = {
  available: "Available",
  "on-trip": "On trip",
  maintenance: "Maintenance",
  requested: "Requested",
  confirmed: "Confirmed",
  in_transit: "In transit",
  delivered: "Delivered",
  cancelled: "Cancelled"
};
const statusClasses = {
  requested: "available",
  confirmed: "available",
  in_transit: "on-trip",
  delivered: "available",
  cancelled: "maintenance"
};

let trucks = [];
let bookings = [];
let drivers = [];
let companies = [];
let activePortal = "admin";
let activeView = "overview";

async function apiRequest(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers
    }
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || `Request failed (${response.status}).`);
  }
  return payload;
}

function initials(name) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join("").toUpperCase();
}

function escapeHtml(value) {
  const entities = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  return String(value ?? "").replace(/[&<>"']/g, character => entities[character]);
}

function statusBadge(status) {
  const cssStatus = statusClasses[status] || status;
  return `<span class="status ${escapeHtml(cssStatus)}">${escapeHtml(statusLabels[status] || status)}</span>`;
}

function truckRow(truck) {
  const driverInitials = truck.driver === "Unassigned" ? "—" : initials(truck.driver);
  const search = `${truck.id} ${truck.plate} ${truck.driver} ${truck.location}`.toLowerCase();
  return `<tr data-search="${escapeHtml(search)}">
    <td><span class="truck-id">${escapeHtml(truck.id)}</span></td>
    <td><strong>${escapeHtml(truck.plate)}</strong></td>
    <td><span class="driver-cell"><span class="mini-avatar">${escapeHtml(driverInitials)}</span>${escapeHtml(truck.driver)}</span></td>
    <td>${escapeHtml(truck.location)}</td>
    <td>${escapeHtml(truck.capacity)} </td>
    <td>${statusBadge(truck.status)}</td>
  </tr>`;
}

function renderTrucks() {
  const rows = trucks.map(truckRow).join("");
  document.getElementById("truckRows").innerHTML = rows;
  document.getElementById("fleetRows").innerHTML = rows;
  document.getElementById("nearbyRows").innerHTML = trucks
    .filter(truck => truck.status === "available")
    .slice(0, 4)
    .map(truck => `<tr><td><strong>${escapeHtml(truck.id)}</strong></td><td>${escapeHtml(truck.location)}</td><td>${statusBadge(truck.status)}</td></tr>`)
    .join("");
}

function renderBookings() {
  document.getElementById("bookingRows").innerHTML = bookings.map(booking => {
    const assignedTo = booking.truck
      ? `${booking.truck} · ${booking.driver || "Unassigned"}`
      : "Assigning truck";
    const load = `${booking.loadType} · ${booking.weightTonnes} t`;
    const route = `${booking.pickup} → ${booking.dropoff}`;
    const search = `${booking.id} ${booking.company} ${route} ${load} ${assignedTo}`.toLowerCase();
    return `<tr data-search="${escapeHtml(search)}">
      <td><span class="truck-id">${escapeHtml(booking.id)}</span></td>
      <td><strong>${escapeHtml(booking.company)}</strong></td>
      <td>${escapeHtml(route)}</td>
      <td>${escapeHtml(load)}</td>
      <td>${escapeHtml(assignedTo)}</td>
      <td>${statusBadge(booking.status)}</td>
    </tr>`;
  }).join("");
}

function renderActivity() {
  const activityList = document.getElementById("activityList");
  if (!bookings.length) {
    activityList.innerHTML = '<div class="empty-note">No bookings yet.</div>';
    return;
  }
  activityList.innerHTML = bookings.slice(0, 4).map(booking => {
    const route = `${booking.pickup} → ${booking.dropoff}`;
    return `<div class="activity-row">
      <span class="activity-dot"></span>
      <div class="activity-copy">
        <strong>${escapeHtml(booking.id)} · ${escapeHtml(statusLabels[booking.status] || booking.status)}</strong>
        <span>${escapeHtml(booking.company)} · ${escapeHtml(route)}</span>
      </div>
      <span class="activity-time">Booking</span>
    </div>`;
  }).join("");
}

function renderPeople() {
  document.getElementById("driverCards").innerHTML = drivers.map(driver => {
    const truckDetails = driver.truck
      ? `${driver.truck} · ${driver.plate}`
      : "No truck assigned";
    const search = `${driver.name} ${driver.phone} ${truckDetails}`.toLowerCase();
    return `<article class="person-card" data-search="${escapeHtml(search)}">
      <div class="avatar">${escapeHtml(initials(driver.name))}</div>
      <div class="person-meta">
        <strong>${escapeHtml(driver.name)}</strong>
        <span>${escapeHtml(driver.phone)}</span>
        <span>${escapeHtml(truckDetails)}</span>
      </div>
      ${statusBadge(driver.status)}
    </article>`;
  }).join("");

  document.getElementById("companyCards").innerHTML = companies.map(company => {
    const bookingCount = Number(company.bookingCount);
    const bookingSummary = `${bookingCount} ${bookingCount === 1 ? "booking" : "bookings"}`;
    const search = `${company.name} ${company.city}`.toLowerCase();
    return `<article class="person-card" data-search="${escapeHtml(search)}">
      <div class="avatar">${escapeHtml(initials(company.name))}</div>
      <div class="person-meta">
        <strong>${escapeHtml(company.name)}</strong>
        <span>${escapeHtml(company.city)}</span>
        <span>${escapeHtml(bookingSummary)}</span>
      </div>
      ${statusBadge(company.status === "active" ? "available" : "maintenance")}
    </article>`;
  }).join("");
}

function renderCompanyOptions() {
  const select = document.getElementById("companyInput");
  select.innerHTML = '<option value="">Select a company</option>' + companies.map(company =>
    `<option value="${Number(company.id)}">${escapeHtml(company.name)}</option>`
  ).join("");
}

function renderDashboard(dashboard) {
  document.getElementById("fleetCount").textContent = String(dashboard.totalFleet);
  document.getElementById("availableCount").textContent = String(dashboard.availableTrucks);
  document.getElementById("bookingCount").textContent = String(dashboard.activeBookings);
  const activeLabel = document.querySelector("#view-bookings .panel-heading .status");
  activeLabel.textContent = `${dashboard.activeBookings} active`;
  const bookingsNav = document.querySelector('.nav-button[data-view="bookings"]');
  if (bookingsNav && activePortal === "admin") {
    let count = bookingsNav.querySelector(".nav-count");
    if (!count) {
      count = document.createElement("span");
      count.className = "nav-count";
      bookingsNav.append(count);
    }
    count.textContent = String(dashboard.activeBookings);
  }
}

function renderProfile() {
  const user = portalCopy[activePortal];
  document.getElementById("profileHeading").textContent = activePortal === "company" ? "Company profile" : "My profile";
  document.getElementById("profileAvatar").textContent = user.initials;
  document.getElementById("profileName").textContent = user.name;
  document.getElementById("profileRole").textContent = user.role;

  const driver = drivers.find(item => item.name === user.name);
  const company = companies.find(item => item.name === user.name);
  const assignedTruck = driver && trucks.find(truck => truck.id === driver.truck);
  const details = activePortal === "driver" && driver
    ? [
      ["Phone", driver.phone],
      ["Assigned truck", driver.truck || "Not assigned"],
      ["Plate number", assignedTruck ? assignedTruck.plate : "Not assigned"],
      ["Truck capacity", assignedTruck ? assignedTruck.capacity : "—"],
      ["Current location", assignedTruck ? assignedTruck.location : "—"],
      ["Availability", statusLabels[driver.status]]
    ]
    : activePortal === "company" && company
      ? [
        ["Contact person", company.contactName],
        ["Phone", company.phone],
        ["Email", company.email],
        ["Company location", company.city],
        ["Bookings", `${company.bookingCount} total`],
        ["Account status", company.status]
      ]
      : [
        ["Email", "arjun@haulhub.in"],
        ["Phone", "+91 98100 12345"],
        ["Role", "Fleet administrator"],
        ["Fleet size", `${trucks.length} trucks`],
        ["Office", "New Delhi, India"],
        ["Account status", "Active"]
      ];

  document.getElementById("profileDetails").innerHTML = details.map(([label, value]) =>
    `<div class="detail"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value || "—")}</strong></div>`
  ).join("");
}

function goTo(view) {
  activeView = view;
  document.querySelectorAll(".section-view").forEach(section => {
    section.classList.toggle("active", section.id === `view-${view}`);
  });
  document.querySelectorAll(".nav-button").forEach(button => {
    button.classList.toggle("active", button.dataset.view === view);
  });
  const activeNav = document.querySelector(`.nav-button[data-view="${view}"]`);
  document.getElementById("breadcrumb").textContent = activeNav ? activeNav.dataset.label : "Overview";
  document.getElementById("sidebar").classList.remove("open");
  applyFilters();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function setPortal(portal) {
  activePortal = portal;
  document.getElementById("fleetStatusFilter").value = portal === "company" ? "available" : "all";
  const user = portalCopy[portal];
  document.getElementById("navigation").innerHTML = portalPages[portal].map(([view, icon, label]) =>
    `<button type="button" class="nav-button${view === activeView ? " active" : ""}" data-view="${view}" data-label="${label}">
      <span class="nav-icon" aria-hidden="true">${icon}</span>${label}
    </button>`
  ).join("");

  document.getElementById("pageTitle").textContent = user.title;
  document.getElementById("pageSubtitle").textContent = user.subtitle;
  document.querySelector(".user-info").innerHTML = `<strong>${escapeHtml(user.name)}</strong><span>${escapeHtml(user.role)}</span>`;
  document.querySelector(".user-row .avatar").textContent = user.initials;
  document.getElementById("newBookingButton").textContent =
    portal === "driver" ? "View my trips" : portal === "company" ? "Book a truck" : "＋ New booking";
  document.getElementById("newBookingButton").onclick =
    () => portal === "driver" ? goTo("bookings") : openBooking();
  renderProfile();
  goTo("overview");
}

function applyFilters() {
  const searchInput = document.getElementById("searchInput");
  if (!searchInput) return;
  const term = searchInput.value.trim().toLowerCase();
  const statusFilter = activeView === "fleet"
    ? document.getElementById("fleetStatusFilter")
    : document.getElementById("statusFilter");
  const status = activeView === "fleet" && activePortal === "company"
    ? "available"
    : statusFilter.value;
  const selectors = activeView === "fleet"
    ? ["#fleetRows tr"]
    : activeView === "bookings"
      ? ["#bookingRows tr"]
      : activeView === "drivers"
        ? ["#driverCards .person-card"]
        : activeView === "companies"
          ? ["#companyCards .person-card"]
          : ["#truckRows tr"];

  document.querySelectorAll(selectors.join(",")).forEach(row => {
    const matchesText = !term || (row.dataset.search || "").includes(term);
    const badge = row.querySelector(".status");
    const matchesStatus = status === "all" || !badge || badge.classList.contains(status);
    row.hidden = !(matchesText && matchesStatus);
  });
}

function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(showToast.timeout);
  showToast.timeout = window.setTimeout(() => toast.classList.remove("show"), 3200);
}

function openBooking() {
  document.getElementById("bookingModal").classList.add("open");
  document.getElementById("companyInput").focus();
}

function closeBooking() {
  document.getElementById("bookingModal").classList.remove("open");
}

async function loadPortalData() {
  const [dashboard, truckData, bookingData, driverData, companyData] = await Promise.all([
    apiRequest("/api/dashboard"),
    apiRequest("/api/trucks"),
    apiRequest("/api/bookings"),
    apiRequest("/api/drivers"),
    apiRequest("/api/companies")
  ]);
  trucks = truckData;
  bookings = bookingData;
  drivers = driverData;
  companies = companyData;
  renderDashboard(dashboard);
  renderTrucks();
  renderBookings();
  renderActivity();
  renderPeople();
  renderCompanyOptions();
  renderProfile();
}

document.getElementById("navigation").addEventListener("click", event => {
  const button = event.target.closest("[data-view]");
  if (button) goTo(button.dataset.view);
});
document.querySelectorAll("[data-view]").forEach(button => {
  button.addEventListener("click", () => goTo(button.dataset.view));
});
document.getElementById("portalSelect").addEventListener("change", event => setPortal(event.target.value));
document.getElementById("searchInput").addEventListener("input", applyFilters);
document.getElementById("statusFilter").addEventListener("change", applyFilters);
document.getElementById("fleetStatusFilter").addEventListener("change", applyFilters);
document.getElementById("newBookingButton").addEventListener("click", openBooking);
document.getElementById("bookingButton").addEventListener("click", openBooking);
document.getElementById("closeModal").addEventListener("click", closeBooking);
document.getElementById("cancelModal").addEventListener("click", closeBooking);
document.getElementById("bookingModal").addEventListener("click", event => {
  if (event.target.id === "bookingModal") closeBooking();
});
document.getElementById("bookingForm").addEventListener("submit", async event => {
  event.preventDefault();
  const form = event.currentTarget;
  const submitButton = form.querySelector('button[type="submit"]');
  submitButton.disabled = true;

  try {
    const booking = await apiRequest("/api/bookings", {
      method: "POST",
      body: JSON.stringify({
        companyId: document.getElementById("companyInput").value,
        pickup: document.getElementById("pickupInput").value,
        dropoff: document.getElementById("dropInput").value,
        loadType: document.getElementById("loadInput").value,
        weightTonnes: document.getElementById("weightInput").value
      })
    });
    bookings.unshift(booking);
    renderBookings();
    renderActivity();
    form.reset();
    closeBooking();
    try {
      const dashboard = await apiRequest("/api/dashboard");
      renderDashboard(dashboard);
      showToast("Booking saved to the database");
    } catch (error) {
      showToast(`Booking saved, but dashboard refresh failed: ${error.message}`);
    }
  } catch (error) {
    showToast(error.message);
  } finally {
    submitButton.disabled = false;
  }
});
document.getElementById("menuButton").addEventListener("click", () => {
  document.getElementById("sidebar").classList.toggle("open");
});
document.getElementById("notificationButton").addEventListener("click", () => showToast("You’re all caught up"));
document.getElementById("supportButton").addEventListener("click", () => showToast("Support: hello@haulhub.in"));
document.getElementById("refreshButton").addEventListener("click", async () => {
  try {
    await loadPortalData();
    showToast("Fleet data refreshed");
  } catch (error) {
    showToast(error.message);
  }
});
["addTruckButton", "inviteDriverButton", "addCompanyButton"].forEach(id => {
  document.getElementById(id).addEventListener("click", () => showToast("This action is not connected yet."));
});

document.getElementById("welcomeLabel").textContent =
  new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" }).toUpperCase();
setPortal("admin");
loadPortalData().catch(error => {
  console.error("Could not load portal data:", error);
  showToast(`Could not load data: ${error.message}`);
});
