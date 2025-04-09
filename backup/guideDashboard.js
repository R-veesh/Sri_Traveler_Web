// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAqLxHtBeS8QfEJfZFuaD4wsC45I2xJFDc",
  authDomain: "sri-traveler.firebaseapp.com",
  projectId: "sri-traveler",
  storageBucket: "sri-traveler.firebasestorage.app",
  messagingSenderId: "996309776080",
  appId: "1:996309776080:web:21135debfdaca5e3c850d5",
  databaseURL:
    "https://sri-traveler-default-rtdb.asia-southeast1.firebasedatabase.app/",
};

// Initialize Firebase
try {
  firebase.initializeApp(firebaseConfig);
  console.log("Firebase initialized successfully");
} catch (e) {
  console.error("Firebase initialization error:", e.message);
  document.getElementById(
    "errorMessage"
  ).textContent = `Firebase initialization error: ${e.message}`;
  document.getElementById("errorMessage").classList.remove("hidden");
}

// Initialize Firebase services
const auth = firebase.auth();
const db = firebase.firestore();
const rtdb = firebase.database(); // Realtime Database

// DOM Elements
const logoutBtn = document.getElementById("logoutBtn");
const headerUserProfile = document.getElementById("headerUserProfile");
const sidebarNavLinks = document.querySelectorAll(".sidebar-nav a");
const dashboardSections = document.querySelectorAll(".dashboard-section");
const mobileAppLink = document.getElementById("mobileAppLink");
const addTripBtn = document.getElementById("addTripBtn");
const addNewTripBtn = document.getElementById("addNewTripBtn");
const addTripForm = document.getElementById("addTripForm");
const closeTripFormBtn = document.getElementById("closeTripFormBtn");
const tripForm = document.getElementById("tripForm");
const tripsContainer = document.getElementById("tripsContainer");
const editProfileBtn = document.getElementById("editProfileBtn");
const profileEditForm = document.getElementById("profileEditForm");
const editProfileForm = document.getElementById("editProfileForm");
const cancelEditBtn = document.getElementById("cancelEditBtn");
const changeProfileImageBtn = document.getElementById("changeProfileImageBtn");
const formTabs = document.querySelectorAll(".form-tab");
const formTabContents = document.querySelectorAll(".form-tab-content");
const prevTabBtn = document.getElementById("prevTabBtn");
const nextTabBtn = document.getElementById("nextTabBtn");
const tripStatusFilter = document.getElementById("tripStatusFilter");
const tripSortFilter = document.getElementById("tripSortFilter");
const tripSearchFilter = document.getElementById("tripSearchFilter");
const bookingStatusFilter = document.getElementById("bookingStatusFilter");
const bookingDateFilter = document.getElementById("bookingDateFilter");

// Check if user is logged in
auth.onAuthStateChanged((user) => {
  if (user) {
    // User is signed in
    console.log("User is signed in:", user.uid);
    loadUserProfile(user);
    loadUserTrips(user.uid);
    loadUserBookings(user.uid);
    setupRealtimeListeners(user.uid);
  } else {
    // User is signed out, redirect to login
    window.location.href = "login.html";
  }
});

// Load user profile
async function loadUserProfile(user) {
  try {
    // Update header user profile
    if (headerUserProfile) {
      const userNameElement = headerUserProfile.querySelector(".user-name");
      const userAvatarElement = headerUserProfile.querySelector(".user-avatar");

      if (userNameElement) {
        userNameElement.textContent = user.displayName || "Guide";
      }

      if (userAvatarElement && user.photoURL) {
        userAvatarElement.src = user.photoURL;
      }
    }

    // Get user data from Firestore
    const guideDoc = await db.collection("guides").doc(user.uid).get();

    if (guideDoc.exists) {
      const guideData = guideDoc.data();

      // Update profile section
      document.getElementById("profileName").textContent =
        guideData.fullName || "Guide";
      document.getElementById("locationText").textContent =
        guideData.location || "No location set";
      document.getElementById("emailText").textContent =
        guideData.email || user.email;
      document.getElementById("phoneText").textContent =
        guideData.phone || "No phone number set";

      if (guideData.bio) {
        document.getElementById("profileBio").textContent = guideData.bio;
      }

      if (guideData.profileImageUrl) {
        document.getElementById("profileImage").src = guideData.profileImageUrl;
      }

      // Update languages
      if (guideData.languages) {
        const languagesContainer = document.getElementById("profileLanguages");
        languagesContainer.innerHTML = "";

        const languages =
          typeof guideData.languages === "string"
            ? guideData.languages.split(",")
            : guideData.languages || [];

        languages.forEach((language) => {
          const tag = document.createElement("span");
          tag.className = "tag";
          tag.textContent = language.trim();
          languagesContainer.appendChild(tag);
        });
      }

      // Update specialties
      if (guideData.specialties) {
        const specialtiesContainer =
          document.getElementById("profileSpecialties");
        specialtiesContainer.innerHTML = "";

        const specialties =
          typeof guideData.specialties === "string"
            ? guideData.specialties.split(",")
            : guideData.specialties || [];

        specialties.forEach((specialty) => {
          const tag = document.createElement("span");
          tag.className = "tag";
          tag.textContent = specialty.trim();
          specialtiesContainer.appendChild(tag);
        });
      }

      // Populate edit form
      if (editProfileForm) {
        document.getElementById("editFullName").value =
          guideData.fullName || "";
        document.getElementById("editPhone").value = guideData.phone || "";
        document.getElementById("editLocation").value =
          guideData.location || "";
        document.getElementById("editBio").value = guideData.bio || "";
        document.getElementById("editLanguages").value =
          typeof guideData.languages === "string"
            ? guideData.languages
            : (guideData.languages || []).join(", ");
        document.getElementById("editSpecialties").value =
          typeof guideData.specialties === "string"
            ? guideData.specialties
            : (guideData.specialties || []).join(", ");
      }

      // Update stats in the dashboard
      updateDashboardStats(user.uid);
    }
  } catch (error) {
    console.error("Error loading user profile:", error);
    showNotification("Error loading profile", "error");
  }
}

// Update dashboard stats
async function updateDashboardStats(userId) {
  try {
    // Get counts from Firestore
    const tripsSnapshot = await db
      .collection("trips")
      .where("guideId", "==", userId)
      .get();
    const activeTripsCount = tripsSnapshot.docs.filter(
      (doc) => doc.data().status !== "archived"
    ).length;

    const bookingsSnapshot = await db
      .collection("bookings")
      .where("guideId", "==", userId)
      .get();
    const totalTravelers = new Set(
      bookingsSnapshot.docs.map((doc) => doc.data().travelerId)
    ).size;
    const upcomingBookings = bookingsSnapshot.docs.filter((doc) => {
      const bookingDate = doc.data().bookingDate?.toDate() || new Date();
      return bookingDate > new Date() && doc.data().status !== "cancelled";
    }).length;

    // Calculate revenue
    let totalRevenue = 0;
    bookingsSnapshot.docs.forEach((doc) => {
      const booking = doc.data();
      if (booking.status === "completed" || booking.status === "confirmed") {
        totalRevenue += Number.parseFloat(booking.totalAmount || 0);
      }
    });

    // Update stats in the UI
    const statElements = document.querySelectorAll(".stat-value");
    if (statElements.length >= 4) {
      statElements[0].textContent = totalTravelers;
      statElements[1].textContent = activeTripsCount;
      statElements[2].textContent = upcomingBookings;
      statElements[3].textContent = `₨ ${totalRevenue.toLocaleString()}`;
    }
  } catch (error) {
    console.error("Error updating dashboard stats:", error);
  }
}

// Load user trips
async function loadUserTrips(userId) {
  if (!tripsContainer) return;

  try {
    tripsContainer.innerHTML =
      '<div class="loading"><div class="spinner"></div></div>';

    // Get filter values
    const status = tripStatusFilter ? tripStatusFilter.value : "all";
    const sortBy = tripSortFilter ? tripSortFilter.value : "newest";
    const searchTerm = tripSearchFilter
      ? tripSearchFilter.value.toLowerCase()
      : "";

    // Create query
    let query = db.collection("trips").where("guideId", "==", userId);

    // Apply status filter
    if (status !== "all") {
      query = query.where("status", "==", status);
    }

    // Get trips
    const tripsSnapshot = await query.get();
    let trips = tripsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Apply search filter
    if (searchTerm) {
      trips = trips.filter(
        (trip) =>
          trip.tripName?.toLowerCase().includes(searchTerm) ||
          trip.tripPlace?.toLowerCase().includes(searchTerm) ||
          trip.tripDescription?.toLowerCase().includes(searchTerm)
      );
    }

    // Apply sort
    switch (sortBy) {
      case "newest":
        trips.sort(
          (a, b) => (b.createdAt?.toDate() || 0) - (a.createdAt?.toDate() || 0)
        );
        break;
      case "oldest":
        trips.sort(
          (a, b) => (a.createdAt?.toDate() || 0) - (b.createdAt?.toDate() || 0)
        );
        break;
      case "price-high":
        trips.sort(
          (a, b) =>
            Number.parseFloat(b.tripPrice || 0) -
            Number.parseFloat(a.tripPrice || 0)
        );
        break;
      case "price-low":
        trips.sort(
          (a, b) =>
            Number.parseFloat(a.tripPrice || 0) -
            Number.parseFloat(b.tripPrice || 0)
        );
        break;
      case "name":
        trips.sort((a, b) =>
          (a.tripName || "").localeCompare(b.tripName || "")
        );
        break;
    }

    tripsContainer.innerHTML = "";

    if (trips.length === 0) {
      tripsContainer.innerHTML = `
        <div class="no-trips">
          <p>You haven't created any trips yet.</p>
          <button id="createFirstTripBtn" class="btn primary"><i class="fas fa-plus"></i> Create Your First Trip</button>
        </div>
      `;

      document
        .getElementById("createFirstTripBtn")
        .addEventListener("click", () => {
          addTripForm.classList.remove("hidden");
        });

      return;
    }

    trips.forEach((trip) => {
      const tripCard = createTripCard(trip.id, trip);
      tripsContainer.appendChild(tripCard);
    });
  } catch (error) {
    console.error("Error loading trips:", error);
    tripsContainer.innerHTML = `<p class="error-message">Error loading trips: ${error.message}</p>`;
  }
}

// Create trip card
function createTripCard(tripId, trip) {
  const tripCard = document.createElement("div");
  tripCard.className = "trip-card";

  const imageSrc =
    trip.tripImagePath && trip.tripImagePath.startsWith("http")
      ? trip.tripImagePath
      : "https://placehold.co/400x200?text=Trip+Image";

  const statusClass =
    trip.status === "active"
      ? "confirmed"
      : trip.status === "draft"
      ? "pending"
      : "cancelled";

  tripCard.innerHTML = `
    <div class="trip-image">
      <img src="${imageSrc}" alt="${trip.tripName || "Trip"}" 
        onerror="this.src='https://placehold.co/400x200?text=Image+Not+Found'">
      <span class="status-badge ${statusClass}">${
    trip.status || "Active"
  }</span>
    </div>
    <div class="trip-content">
      <div class="trip-header">
        <h3 class="trip-name">${trip.tripName || "Unnamed Trip"}</h3>
        <p class="trip-place"><i class="fas fa-map-marker-alt"></i> ${
          trip.tripPlace || "Unknown Location"
        }</p>
      </div>
      <div class="trip-details">
        <span class="trip-code"><i class="fas fa-hashtag"></i> ${
          trip.tripCode || "N/A"
        }</span>
        <span class="trip-price"><i class="fas fa-tag"></i> ${
          trip.tripPrice || "Price not available"
        }</span>
      </div>
      <p class="trip-description">${
        trip.tripDescription || "No description available."
      }</p>
      <div class="trip-actions">
        <button class="btn secondary edit-trip-btn" data-trip-id="${tripId}"><i class="fas fa-edit"></i> Edit</button>
        <button class="btn secondary delete-trip-btn" data-trip-id="${tripId}"><i class="fas fa-trash-alt"></i> Delete</button>
      </div>
    </div>
  `;

  // Add event listeners for edit and delete buttons
  const editBtn = tripCard.querySelector(".edit-trip-btn");
  const deleteBtn = tripCard.querySelector(".delete-trip-btn");

  editBtn.addEventListener("click", () => {
    editTrip(tripId);
  });

  deleteBtn.addEventListener("click", () => {
    if (confirm("Are you sure you want to delete this trip?")) {
      deleteTrip(tripId);
    }
  });

  return tripCard;
}

// Edit trip
async function editTrip(tripId) {
  try {
    const tripDoc = await db.collection("trips").doc(tripId).get();
    if (!tripDoc.exists) {
      showNotification("Trip not found", "error");
      return;
    }

    const trip = tripDoc.data();

    // Reset form and show modal
    tripForm.reset();

    // Populate form fields
    document.getElementById("tripName").value = trip.tripName || "";
    document.getElementById("tripCode").value = trip.tripCode || "";
    document.getElementById("tripPlace").value = trip.tripPlace || "";
    document.getElementById("tripPrice").value = trip.tripPrice || "";
    document.getElementById("tripDuration").value = trip.tripDuration || "";
    document.getElementById("tripDescription").value =
      trip.tripDescription || "";

    // Additional fields if they exist
    if (document.getElementById("tripItinerary")) {
      document.getElementById("tripItinerary").value = trip.tripItinerary || "";
    }
    if (document.getElementById("tripInclusions")) {
      document.getElementById("tripInclusions").value =
        trip.tripInclusions || "";
    }
    if (document.getElementById("tripExclusions")) {
      document.getElementById("tripExclusions").value =
        trip.tripExclusions || "";
    }
    if (document.getElementById("tripDiscount")) {
      document.getElementById("tripDiscount").value = trip.tripDiscount || "0";
    }
    if (document.getElementById("tripGroupSize")) {
      document.getElementById("tripGroupSize").value =
        trip.tripGroupSize || "10";
    }
    if (document.getElementById("privateOption")) {
      document.getElementById("privateOption").checked =
        trip.privateOption || false;
    }
    if (document.getElementById("groupOption")) {
      document.getElementById("groupOption").checked =
        trip.groupOption !== false;
    }

    // Show image preview if available
    if (trip.tripImagePath && document.getElementById("mainImagePreview")) {
      const preview = document.getElementById("mainImagePreview");
      preview.innerHTML = `<img src="${trip.tripImagePath}" alt="Trip Image" style="max-width: 100%; max-height: 200px;">`;
    }

    // Store the trip ID in the form for update
    tripForm.dataset.tripId = tripId;

    // Show the first tab
    if (formTabs.length > 0) {
      formTabs[0].click();
    }

    // Show the form
    addTripForm.classList.remove("hidden");
  } catch (error) {
    console.error("Error editing trip:", error);
    showNotification("Error loading trip details", "error");
  }
}

// Delete trip
async function deleteTrip(tripId) {
  try {
    // First, check if there are any bookings for this trip
    const bookingsSnapshot = await db
      .collection("bookings")
      .where("tripId", "==", tripId)
      .limit(1)
      .get();

    if (!bookingsSnapshot.empty) {
      if (
        !confirm(
          "This trip has bookings. Deleting it will affect existing bookings. Are you sure you want to continue?"
        )
      ) {
        return;
      }
    }

    await db.collection("trips").doc(tripId).delete();

    // Also delete from Realtime Database if used
    await rtdb.ref(`trips/${tripId}`).remove();

    showNotification("Trip deleted successfully", "success");

    // Reload trips
    loadUserTrips(auth.currentUser.uid);
  } catch (error) {
    console.error("Error deleting trip:", error);
    showNotification(`Error deleting trip: ${error.message}`, "error");
  }
}

// Load user bookings
async function loadUserBookings(userId) {
  const bookingsTableBody = document.querySelector(".bookings-table tbody");
  if (!bookingsTableBody) return;

  try {
    // Get filter values if they exist
    const status = bookingStatusFilter ? bookingStatusFilter.value : "all";
    const dateRange = bookingDateFilter ? bookingDateFilter.value : "all";

    // Create query
    let query = db.collection("bookings").where("guideId", "==", userId);

    // Apply status filter
    if (status !== "all") {
      query = query.where("status", "==", status);
    }

    // Get bookings
    const bookingsSnapshot = await query.get();
    let bookings = bookingsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Apply date filter
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    if (dateRange !== "all") {
      bookings = bookings.filter((booking) => {
        const bookingDate = booking.bookingDate?.toDate() || new Date();

        switch (dateRange) {
          case "today":
            return (
              bookingDate >= today &&
              bookingDate < new Date(today.getTime() + 24 * 60 * 60 * 1000)
            );
          case "week":
            return bookingDate >= weekStart;
          case "month":
            return bookingDate >= monthStart;
          default:
            return true;
        }
      });
    }

    // Sort by date
    bookings.sort(
      (a, b) => (a.bookingDate?.toDate() || 0) - (b.bookingDate?.toDate() || 0)
    );

    // Clear table
    bookingsTableBody.innerHTML = "";

    // Add bookings to table
    if (bookings.length === 0) {
      bookingsTableBody.innerHTML = `
        <tr>
          <td colspan="8" class="text-center">No bookings found</td>
        </tr>
      `;
      return;
    }

    bookings.forEach((booking) => {
      const row = document.createElement("tr");

      const bookingDate = booking.bookingDate?.toDate();
      const formattedDate = bookingDate
        ? `${bookingDate.getFullYear()}-${String(
            bookingDate.getMonth() + 1
          ).padStart(2, "0")}-${String(bookingDate.getDate()).padStart(2, "0")}`
        : "N/A";

      const statusClass =
        booking.status === "confirmed"
          ? "confirmed"
          : booking.status === "pending"
          ? "pending"
          : booking.status === "completed"
          ? "completed"
          : "cancelled";

      row.innerHTML = `
        <td>#${
          booking.bookingId || booking.id.substring(0, 6).toUpperCase()
        }</td>
        <td>
          <div class="traveler-info">
            <img src="${
              booking.travelerImage || "https://placehold.co/30x30?text=User"
            }" alt="${booking.travelerName}" class="traveler-avatar">
            <span>${booking.travelerName || "Unknown Traveler"}</span>
          </div>
        </td>
        <td>${booking.tripName || "Unknown Trip"}</td>
        <td>${formattedDate}</td>
        <td>${booking.guestCount || 1}</td>
        <td>${
          booking.totalAmount
            ? `₨ ${Number.parseFloat(booking.totalAmount).toLocaleString()}`
            : "N/A"
        }</td>
        <td><span class="status-badge ${statusClass}">${
        booking.status || "Pending"
      }</span></td>
        <td>
          <div class="table-actions">
            <button class="icon-btn view-booking-btn" data-booking-id="${
              booking.id
            }" title="View Details">
              <i class="fas fa-eye"></i>
            </button>
            <button class="icon-btn message-traveler-btn" data-traveler-id="${
              booking.travelerId
            }" title="Message Traveler">
              <i class="fas fa-comment"></i>
            </button>
            <button class="icon-btn booking-options-btn" data-booking-id="${
              booking.id
            }" title="More Options">
              <i class="fas fa-ellipsis-v"></i>
            </button>
          </div>
        </td>
      `;

      bookingsTableBody.appendChild(row);
    });

    // Add event listeners to buttons
    document.querySelectorAll(".view-booking-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const bookingId = btn.dataset.bookingId;
        viewBookingDetails(bookingId);
      });
    });

    document.querySelectorAll(".message-traveler-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const travelerId = btn.dataset.travelerId;
        openTravelerChat(travelerId);
      });
    });

    document.querySelectorAll(".booking-options-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const bookingId = btn.dataset.bookingId;
        showBookingOptions(bookingId, btn);
      });
    });
  } catch (error) {
    console.error("Error loading bookings:", error);
    if (bookingsTableBody) {
      bookingsTableBody.innerHTML = `
        <tr>
          <td colspan="8" class="text-center error-message">Error loading bookings: ${error.message}</td>
        </tr>
      `;
    }
  }
}

// View booking details
function viewBookingDetails(bookingId) {
  // This would open a modal with booking details
  alert(`View booking details for: ${bookingId}`);
  // In a real implementation, you would fetch the booking details and show them in a modal
}

// Open traveler chat
function openTravelerChat(travelerId) {
  // This would open the chat with the traveler
  // For now, just navigate to the messages section and highlight the traveler
  const messagesSection = document.getElementById("messages");
  if (messagesSection) {
    document.querySelectorAll(".sidebar-nav a").forEach((link) => {
      if (link.getAttribute("data-section") === "messages") {
        link.click();
      }
    });

    // Highlight the traveler in the chat list if they exist
    document.querySelectorAll(".message-contact").forEach((contact) => {
      contact.classList.remove("active");
      if (contact.dataset.travelerId === travelerId) {
        contact.classList.add("active");
        contact.scrollIntoView({ behavior: "smooth" });
      }
    });
  }
}

// Show booking options
function showBookingOptions(bookingId, buttonElement) {
  // This would show a dropdown with options like confirm, cancel, etc.
  // For now, just show an alert
  alert(`Options for booking: ${bookingId}`);
  // In a real implementation, you would create a dropdown menu
}

// Setup realtime listeners
function setupRealtimeListeners(userId) {
  // Listen for new bookings
  db.collection("bookings")
    .where("guideId", "==", userId)
    .where("status", "==", "pending")
    .onSnapshot(
      (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === "added") {
            const booking = change.doc.data();
            showNotification(
              `New booking request from ${
                booking.travelerName || "a traveler"
              }`,
              "info"
            );
          }
        });
      },
      (error) => {
        console.error("Error setting up booking listener:", error);
      }
    );

  // Listen for new messages using Realtime Database
  rtdb.ref(`messages/${userId}/unread`).on(
    "value",
    (snapshot) => {
      const unreadCount = snapshot.val() || 0;

      // Update the notification badge
      const messageBadge = document.querySelector(".notification-badge");
      if (messageBadge) {
        messageBadge.textContent = unreadCount > 0 ? unreadCount : "";
        messageBadge.style.display = unreadCount > 0 ? "flex" : "none";
      }

      if (unreadCount > 0) {
        showNotification(`You have ${unreadCount} unread message(s)`, "info");
      }
    },
    (error) => {
      console.error("Error setting up message listener:", error);
    }
  );
}

// Navigation
sidebarNavLinks.forEach((link) => {
  link.addEventListener("click", (e) => {
    e.preventDefault();

    const targetSection = link.getAttribute("data-section");

    // Update active link
    sidebarNavLinks.forEach((navLink) => {
      navLink.parentElement.classList.remove("active");
    });
    link.parentElement.classList.add("active");

    // Show target section
    dashboardSections.forEach((section) => {
      section.classList.remove("active");
    });
    document.getElementById(targetSection).classList.add("active");

    // Load section-specific data
    if (targetSection === "trips" && auth.currentUser) {
      loadUserTrips(auth.currentUser.uid);
    } else if (targetSection === "bookings" && auth.currentUser) {
      loadUserBookings(auth.currentUser.uid);
    }
  });
});

// Mobile App Link
if (mobileAppLink) {
  mobileAppLink.addEventListener("click", (e) => {
    e.preventDefault();

    // Implement deep linking to mobile app
    // For now, just show an alert
    showNotification("Mobile app integration coming soon!", "info");
  });
}

// Add Trip Button
if (addTripBtn) {
  addTripBtn.addEventListener("click", () => {
    // Reset form and clear any previous trip ID
    tripForm.reset();
    delete tripForm.dataset.tripId;

    // Reset form tabs if they exist
    if (formTabs.length > 0) {
      formTabs[0].click();
    }

    // Clear image previews
    if (document.getElementById("mainImagePreview")) {
      document.getElementById("mainImagePreview").innerHTML = "";
    }
    if (document.getElementById("galleryPreview")) {
      document.getElementById("galleryPreview").innerHTML = "";
    }

    addTripForm.classList.remove("hidden");
  });
}

if (addNewTripBtn) {
  addNewTripBtn.addEventListener("click", () => {
    // Reset form and clear any previous trip ID
    tripForm.reset();
    delete tripForm.dataset.tripId;

    // Reset form tabs if they exist
    if (formTabs.length > 0) {
      formTabs[0].click();
    }

    // Clear image previews
    if (document.getElementById("mainImagePreview")) {
      document.getElementById("mainImagePreview").innerHTML = "";
    }
    if (document.getElementById("galleryPreview")) {
      document.getElementById("galleryPreview").innerHTML = "";
    }

    addTripForm.classList.remove("hidden");
  });
}

if (closeTripFormBtn) {
  closeTripFormBtn.addEventListener("click", () => {
    addTripForm.classList.add("hidden");
  });
}

// Form tabs
if (formTabs.length > 0) {
  formTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      // Update active tab
      formTabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");

      // Show corresponding content
      const tabId = tab.dataset.tab;
      formTabContents.forEach((content) => {
        content.classList.remove("active");
        if (content.id === tabId) {
          content.classList.add("active");
        }
      });

      // Update prev/next buttons
      const currentIndex = Array.from(formTabs).indexOf(tab);
      prevTabBtn.disabled = currentIndex === 0;
      nextTabBtn.disabled = currentIndex === formTabs.length - 1;
    });
  });

  // Prev/Next buttons
  if (prevTabBtn) {
    prevTabBtn.addEventListener("click", () => {
      const activeTab = document.querySelector(".form-tab.active");
      const currentIndex = Array.from(formTabs).indexOf(activeTab);

      if (currentIndex > 0) {
        formTabs[currentIndex - 1].click();
      }
    });
  }

  if (nextTabBtn) {
    nextTabBtn.addEventListener("click", () => {
      const activeTab = document.querySelector(".form-tab.active");
      const currentIndex = Array.from(formTabs).indexOf(activeTab);

      if (currentIndex < formTabs.length - 1) {
        formTabs[currentIndex + 1].click();
      }
    });
  }
}

// Image preview for trip form
if (document.getElementById("tripImage")) {
  document.getElementById("tripImage").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const preview = document.getElementById("mainImagePreview");
    if (!preview) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      preview.innerHTML = `<img src="${e.target.result}" alt="Trip Image" style="max-width: 100%; max-height: 200px;">`;
    };
    reader.readAsDataURL(file);
  });
}

if (document.getElementById("tripGallery")) {
  document.getElementById("tripGallery").addEventListener("change", (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const preview = document.getElementById("galleryPreview");
    if (!preview) return;

    preview.innerHTML = "";

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = document.createElement("img");
        img.src = e.target.result;
        img.alt = "Gallery Image";
        img.style.maxWidth = "100px";
        img.style.maxHeight = "100px";
        img.style.margin = "5px";
        preview.appendChild(img);
      };
      reader.readAsDataURL(file);
    });
  });
}

// Trip Form Submission
if (tripForm) {
  tripForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const tripName = document.getElementById("tripName").value;
    const tripCode = document.getElementById("tripCode").value;
    const tripPlace = document.getElementById("tripPlace").value;
    const tripPrice = document.getElementById("tripPrice").value;
    const tripDuration = document.getElementById("tripDuration").value;
    const tripDescription = document.getElementById("tripDescription").value;
    const tripImageInput = document.getElementById("tripImage");

    // Additional fields if they exist
    const tripItinerary = document.getElementById("tripItinerary")?.value || "";
    const tripInclusions =
      document.getElementById("tripInclusions")?.value || "";
    const tripExclusions =
      document.getElementById("tripExclusions")?.value || "";
    const tripDiscount = document.getElementById("tripDiscount")?.value || "0";
    const tripGroupSize =
      document.getElementById("tripGroupSize")?.value || "10";
    const privateOption =
      document.getElementById("privateOption")?.checked || false;
    const groupOption = document.getElementById("groupOption")?.checked || true;

    try {
      // Check if we're updating an existing trip
      const tripId = tripForm.dataset.tripId;

      // Upload trip image if provided
      let tripImageUrl = "";
      if (tripImageInput && tripImageInput.files.length > 0) {
        const file = tripImageInput.files[0];
        tripImageUrl = await uploadImageToCloudinary(file);
      } else if (tripId) {
        // If updating and no new image, keep the existing one
        const tripDoc = await db.collection("trips").doc(tripId).get();
        if (tripDoc.exists) {
          tripImageUrl = tripDoc.data().tripImagePath || "";
        }
      }

      // Prepare trip data
      const tripData = {
        tripName,
        tripCode,
        tripPlace,
        tripPrice,
        tripDuration,
        tripDescription,
        tripImagePath: tripImageUrl,
        tripItinerary,
        tripInclusions,
        tripExclusions,
        tripDiscount,
        tripGroupSize,
        privateOption,
        groupOption,
        guideId: auth.currentUser.uid,
        status: "active",
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      };

      if (!tripId) {
        // Create new trip
        tripData.createdAt = firebase.firestore.FieldValue.serverTimestamp();

        // Add to Firestore
        const docRef = await db.collection("trips").add(tripData);

        // Also add to Realtime Database for faster access
        await rtdb.ref(`trips/${docRef.id}`).set({
          ...tripData,
          id: docRef.id,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        showNotification("Trip added successfully!", "success");
      } else {
        // Update existing trip
        await db.collection("trips").doc(tripId).update(tripData);

        // Also update in Realtime Database
        await rtdb.ref(`trips/${tripId}`).update({
          ...tripData,
          updatedAt: Date.now(),
        });

        showNotification("Trip updated successfully!", "success");
      }

      // Reset form and hide modal
      tripForm.reset();
      addTripForm.classList.add("hidden");

      // Reload trips
      loadUserTrips(auth.currentUser.uid);
    } catch (error) {
      console.error("Error saving trip:", error);
      showNotification(`Error saving trip: ${error.message}`, "error");
    }
  });
}

// Function to upload image to Cloudinary
async function uploadImageToCloudinary(file) {
  const cloudinaryUrl = `https://api.cloudinary.com/v1_1/dtgie8eha/image/upload`;
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", "trip_image");

  try {
    const response = await fetch(cloudinaryUrl, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) throw new Error("Failed to upload image");

    const data = await response.json();
    return data.secure_url;
  } catch (error) {
    console.error("Cloudinary upload error:", error);
    throw new Error("Image upload failed: " + error.message);
  }
}

// Edit Profile
if (editProfileBtn) {
  editProfileBtn.addEventListener("click", () => {
    profileEditForm.classList.remove("hidden");
  });
}

// Filter change events
if (tripStatusFilter) {
  tripStatusFilter.addEventListener("change", () => {
    if (auth.currentUser) {
      loadUserTrips(auth.currentUser.uid);
    }
  });
}

if (tripSortFilter) {
  tripSortFilter.addEventListener("change", () => {
    if (auth.currentUser) {
      loadUserTrips(auth.currentUser.uid);
    }
  });
}

if (tripSearchFilter) {
  tripSearchFilter.addEventListener("input", () => {
    if (auth.currentUser) {
      // Debounce the search to avoid too many queries
      clearTimeout(tripSearchFilter.timer);
      tripSearchFilter.timer = setTimeout(() => {
        loadUserTrips(auth.currentUser.uid);
      }, 300);
    }
  });
}

if (bookingStatusFilter) {
  bookingStatusFilter.addEventListener("change", () => {
    if (auth.currentUser) {
      loadUserBookings(auth.currentUser.uid);
    }
  });
}

if (bookingDateFilter) {
  bookingDateFilter.addEventListener("change", () => {
    if (auth.currentUser) {
      loadUserBookings(auth.currentUser.uid);
    }
  });
}

// Show notification
function showNotification(message, type = "info") {
  // Create notification element
  const notification = document.createElement("div");
  notification.className = `notification ${type}`;

  // Add icon based on type
  let icon = "";
  switch (type) {
    case "success":
      icon = '<i class="fas fa-check-circle"></i>';
      break;
    case "error":
      icon = '<i class="fas fa-exclamation-circle"></i>';
      break;
    case "warning":
      icon = '<i class="fas fa-exclamation-triangle"></i>';
      break;
    default:
      icon = '<i class="fas fa-info-circle"></i>';
  }

  notification.innerHTML = `
    ${icon}
    <span>${message}</span>
    <button class="close-notification"><i class="fas fa-times"></i></button>
  `;

  // Add to document
  const notificationsContainer = document.querySelector(
    ".notifications-container"
  );
  if (!notificationsContainer) {
    // Create container if it doesn't exist
    const container = document.createElement("div");
    container.className = "notifications-container";
    document.body.appendChild(container);
    container.appendChild(notification);
  } else {
    notificationsContainer.appendChild(notification);
  }

  // Add close button event
  notification
    .querySelector(".close-notification")
    .addEventListener("click", () => {
      notification.remove();
    });

  // Auto remove after 5 seconds
  setTimeout(() => {
    notification.classList.add("fade-out");
    setTimeout(() => notification.remove(), 500);
  }, 5000);
}

// Logout
if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    auth
      .signOut()
      .then(() => {
        window.location.href = "login.html";
      })
      .catch((error) => {
        console.error("Logout error:", error);
        showNotification(`Logout failed: ${error.message}`, "error");
      });
  });
}

// Add notification styles if they don't exist
const notificationStyles = document.createElement("style");
notificationStyles.textContent = `
  .notifications-container {
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 1000;
    display: flex;
    flex-direction: column;
    gap: 10px;
    max-width: 350px;
  }
  
  .notification {
    background-color: white;
    border-radius: 8px;
    padding: 15px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    display: flex;
    align-items: center;
    gap: 10px;
    animation: slide-in 0.3s ease;
  }
  
  .notification.success {
    border-left: 4px solid #10b981;
  }
  
  .notification.success i {
    color: #10b981;
  }
  
  .notification.error {
    border-left: 4px solid #ef4444;
  }
  
  .notification.error i {
    color: #ef4444;
  }
  
  .notification.warning {
    border-left: 4px solid #f59e0b;
  }
  
  .notification.warning i {
    color: #f59e0b;
  }
  
  .notification.info {
    border-left: 4px solid #3b82f6;
  }
  
  .notification.info i {
    color: #3b82f6;
  }
  
  .notification span {
    flex: 1;
  }
  
  .close-notification {
    background: none;
    border: none;
    cursor: pointer;
    color: #666;
  }
  
  .notification.fade-out {
    opacity: 0;
    transform: translateX(30px);
    transition: opacity 0.5s, transform 0.5s;
  }
  
  @keyframes slide-in {
    from {
      opacity: 0;
      transform: translateX(30px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
`;
document.head.appendChild(notificationStyles);
