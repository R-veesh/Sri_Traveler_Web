// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAqLxHtBeS8QfEJfZFuaD4wsC45I2xJFDc",
  authDomain: "sri-traveler.firebaseapp.com",
  projectId: "sri-traveler",
  storageBucket: "sri-traveler.firebasestorage.app",
  messagingSenderId: "996309776080",
  appId: "1:996309776080:web:21135debfdaca5e3c850d5",
};

// Initialize Firebase
try {
  firebase.initializeApp(firebaseConfig);
  console.log("Firebase initialized successfully");
} catch (e) {
  console.error("Firebase initialization error:", e.message);
  showError(`Firebase initialization error: ${e.message}`);
}

// Initialize Firebase services
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

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
const tripsList = document.getElementById("tripsList");
const editProfileBtn = document.getElementById("editProfileBtn");
const profileEditForm = document.getElementById("profileEditForm");
const editProfileForm = document.getElementById("editProfileForm");
const cancelEditBtn = document.getElementById("cancelEditBtn");
const changeProfileImageBtn = document.getElementById("changeProfileImageBtn");
const activeTripsCount = document.getElementById("activeTripsCount");
const upcomingBookingsCount = document.getElementById("upcomingBookingsCount");
const totalTravelersCount = document.getElementById("totalTravelersCount");
const totalRevenue = document.getElementById("totalRevenue");
const recentActivityList = document.getElementById("recentActivityList");
const notificationBtn = document.getElementById("notificationBtn");
const notificationBadge = document.getElementById("notificationBadge");
const notificationDropdown = document.getElementById("notificationDropdown");
const notificationList = document.getElementById("notificationList");
const markAllReadBtn = document.getElementById("markAllReadBtn");
const bookingsContainer = document.getElementById("bookingsContainer");
const bookingDetailsModal = document.getElementById("bookingDetailsModal");
const closeBookingDetailsBtn = document.getElementById("closeBookingDetailsBtn");
const bookingDetailsContent = document.getElementById("bookingDetailsContent");
const conversationList = document.getElementById("conversationList");
const messagesHeader = document.getElementById("messagesHeader");
const messagesBody = document.getElementById("messagesBody");
const messagesInput = document.getElementById("messagesInput");
const messageText = document.getElementById("messageText");
const sendMessageBtn = document.getElementById("sendMessageBtn");
const changePasswordBtn = document.getElementById("changePasswordBtn");
const changePasswordModal = document.getElementById("changePasswordModal");
const closePasswordModalBtn = document.getElementById("closePasswordModalBtn");
const changePasswordForm = document.getElementById("changePasswordForm");
const emailNotificationsToggle = document.getElementById("emailNotificationsToggle");
const profileVisibilityToggle = document.getElementById("profileVisibilityToggle");
const languagePreference = document.getElementById("languagePreference");
const currencyPreference = document.getElementById("currencyPreference");

// Global variables
let currentUser = null;
let currentConversation = null;
let unreadNotifications = 0;
let messagesListener = null;

// Check if user is logged in
auth.onAuthStateChanged((user) => {
  if (user) {
    // User is signed in
    console.log("User is signed in:", user.uid);
    currentUser = user;
    loadUserProfile(user);
    fetchTrips();
    fetchBookings();
    fetchDashboardStats();
    fetchRecentActivity();
    fetchNotifications();
    fetchConversations();
    loadUserSettings();
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
      document.getElementById("profileName").textContent = guideData.fullName || "Guide";
      document.getElementById("locationText").textContent = guideData.location || "No location set";
      document.getElementById("emailText").textContent = guideData.email || user.email;
      document.getElementById("phoneText").textContent = guideData.phone || "No phone number set";

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
          typeof guideData.languages === "string" ? guideData.languages.split(",") : guideData.languages || [];

        languages.forEach((language) => {
          const tag = document.createElement("span");
          tag.className = "tag";
          tag.textContent = language.trim();
          languagesContainer.appendChild(tag);
        });
      }

      // Update specialties
      if (guideData.specialties) {
        const specialtiesContainer = document.getElementById("profileSpecialties");
        specialtiesContainer.innerHTML = "";

        const specialties =
          typeof guideData.specialties === "string" ? guideData.specialties.split(",") : guideData.specialties || [];

        specialties.forEach((specialty) => {
          const tag = document.createElement("span");
          tag.className = "tag";
          tag.textContent = specialty.trim();
          specialtiesContainer.appendChild(tag);
        });
      }

      // Populate edit form
      if (editProfileForm) {
        document.getElementById("editFullName").value = guideData.fullName || "";
        document.getElementById("editPhone").value = guideData.phone || "";
        document.getElementById("editLocation").value = guideData.location || "";
        document.getElementById("editBio").value = guideData.bio || "";
        document.getElementById("editLanguages").value =
          typeof guideData.languages === "string" ? guideData.languages : (guideData.languages || []).join(", ");
        document.getElementById("editSpecialties").value =
          typeof guideData.specialties === "string" ? guideData.specialties : (guideData.specialties || []).join(", ");
      }
    }
  } catch (error) {
    console.error("Error loading user profile:", error);
    showError("Error loading user profile: " + error.message);
  }
}

// Fetch and display trips
async function fetchTrips() {
  if (!tripsList) return;

  try {
    const user = auth.currentUser;
    if (!user) {
      console.log("User not logged in");
      return;
    }

    const guideId = user.uid;
    
    // Clear existing trips
    tripsList.innerHTML = "";
    
    // Add loading indicator
    const loadingElement = document.createElement("div");
    loadingElement.className = "loading-indicator";
    loadingElement.innerHTML = '<div class="spinner"></div><p>Loading trips...</p>';
    tripsList.appendChild(loadingElement);

    // Get trips from Firestore
    const querySnapshot = await db
      .collection("trips")
      .where("guideId", "==", guideId)
      .get();

    // Remove loading indicator
    tripsList.removeChild(loadingElement);

    if (querySnapshot.empty) {
      tripsList.innerHTML = `
        <div class="no-trips">
          <p>You haven't created any trips yet.</p>
          <button id="createFirstTripBtn" class="btn primary">Create Your First Trip</button>
        </div>
      `;

      document.getElementById("createFirstTripBtn").addEventListener("click", () => {
        addTripForm.classList.remove("hidden");
      });

      // Update active trips count
      if (activeTripsCount) {
        activeTripsCount.textContent = "0";
      }
      
      return;
    }

    // Update active trips count
    if (activeTripsCount) {
      activeTripsCount.textContent = querySnapshot.size.toString();
    }

    // Display trips
    querySnapshot.forEach((doc) => {
      const trip = doc.data();
      const tripId = doc.id;
      
      const tripCard = document.createElement("div");
      tripCard.className = "trip-card";
      
      const imageSrc = trip.tripImagePath || "https://placehold.co/400x200?text=Trip+Image";
      
      tripCard.innerHTML = `
        <img src="${imageSrc}" alt="${trip.tripName || 'Trip'}" class="trip-image" 
          onerror="this.src='https://placehold.co/400x200?text=Image+Not+Found'">
        <div class="trip-details">
          <h3>${trip.tripName || "Unnamed Trip"}</h3>
          <p><strong>Place:</strong> ${trip.tripPlace || "Unknown Location"}</p>
          <p><strong>Duration:</strong> ${trip.tripDuration || "N/A"} days</p>
          <p><strong>Price:</strong> ${trip.tripPrice || "Price not available"}</p>
          <p><strong>Description:</strong> ${trip.tripDescription || "No description available."}</p>
          <button class="edit-trip-btn" data-id="${tripId}">Edit</button>
          <button class="delete-trip-btn" data-id="${tripId}">Delete</button>
        </div>
      `;
      
      tripsList.appendChild(tripCard);
    });
    
    // Add event listeners for edit & delete buttons
    document.querySelectorAll(".edit-trip-btn").forEach((button) => {
      button.addEventListener("click", function() {
        const tripId = this.getAttribute("data-id");
        editTrip(tripId);
      });
    });
    
    document.querySelectorAll(".delete-trip-btn").forEach((button) => {
      button.addEventListener("click", function() {
        const tripId = this.getAttribute("data-id");
        deleteTrip(tripId);
      });
    });
    
  } catch (error) {
    console.error("Error fetching trips:", error);
    showError("Error fetching trips: " + error.message);
    
    if (tripsList) {
      tripsList.innerHTML = `<p class="error-message">Error loading trips: ${error.message}</p>`;
    }
  }
}

// Edit trip
async function editTrip(tripId) {
  try {
    const tripDoc = await db.collection("trips").doc(tripId).get();
    if (!tripDoc.exists) {
      showError("Trip not found");
      return;
    }
    
    const tripData = tripDoc.data();
    
    // Populate form with trip data
    document.getElementById("tripName").value = tripData.tripName || "";
    document.getElementById("tripCode").value = tripData.tripCode || "";
    document.getElementById("tripPlace").value = tripData.tripPlace || "";
    document.getElementById("tripPrice").value = tripData.tripPrice || "";
    document.getElementById("tripDuration").value = tripData.tripDuration || "";
    document.getElementById("tripDescription").value = tripData.tripDescription || "";
    
    // Show form
    addTripForm.classList.remove("hidden");
    
    // Update form submission to handle edit
    tripForm.onsubmit = async (e) => {
      e.preventDefault();
      
      const updatedTripData = {
        tripName: document.getElementById("tripName").value,
        tripCode: document.getElementById("tripCode").value,
        tripPlace: document.getElementById("tripPlace").value,
        tripPrice: document.getElementById("tripPrice").value,
        tripDuration: document.getElementById("tripDuration").value,
        tripDescription: document.getElementById("tripDescription").value,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      };
      
      // Upload new image if provided
      const tripImageInput = document.getElementById("tripImage");
      if (tripImageInput && tripImageInput.files.length > 0) {
      const file = tripImageInput.files[0];
      updatedTripData.tripImagePath = await uploadImageToCloudinary(file);
      }

      // Update trip in Firestone
      await db.collection("trips").doc(tripId).update(updatedTripData);
      
      // Reset form and hide modal
      tripForm.reset();
      addTripForm.classList.add("hidden");
      
      // Reset form submission handler
      tripForm.onsubmit = null;
      
      // Reload trips
      fetchTrips();
      
      alert("Trip updated successfully!");
    };
    
  } catch (error) {
    console.error("Error editing trip:", error);
    showError("Error editing trip: " + error.message);
  }
}

// Delete trip
async function deleteTrip(tripId) {
  if (confirm("Are you sure you want to delete this trip?")) {
    try {
      await db.collection("trips").doc(tripId).delete();
      alert("Trip deleted successfully");

      // Reload trips
      fetchTrips();
    } catch (error) {
      console.error("Error deleting trip:", error);
      showError("Error deleting trip: " + error.message);
    }
  }
}

// Fetch bookings
async function fetchBookings() {
  if (!bookingsContainer) return;
  
  try {
    const bookingLoadingIndicator = document.getElementById("bookingLoadingIndicator");
    const bookingErrorMessage = document.getElementById("bookingErrorMessage");
    
    if (bookingErrorMessage) {
      bookingErrorMessage.classList.add("hidden");
    }
    
    if (bookingLoadingIndicator) {
      bookingLoadingIndicator.classList.remove("hidden");
    }
    
    const user = auth.currentUser;
    if (!user) {
      console.log("User not logged in");
      return;
    }
    
    // Clear existing bookings
    bookingsContainer.innerHTML = "";
    
    // Get guide's trips
    const tripsSnapshot = await db.collection("trips").where("guideId", "==", user.uid).get();
    const tripIds = tripsSnapshot.docs.map(doc => doc.id);
    
    if (tripIds.length === 0) {
      bookingsContainer.innerHTML = `
        <div class="no-trips">
          <p>You don't have any trips yet, so there are no bookings to display.</p>
          <button data-section="trips" class="btn primary">Create a Trip</button>
        </div>
      `;
      
      if (bookingLoadingIndicator) {
        bookingLoadingIndicator.classList.add("hidden");
      }
      
      document.querySelector(".no-trips .btn").addEventListener("click", () => {
        // Navigate to trips section
        sidebarNavLinks.forEach((navLink) => {
          if (navLink.getAttribute("data-section") === "trips") {
            navLink.click();
          }
        });
      });
      
      return;
    }
    
    // Get bookings for guide's trips
    let bookingsQuery = db.collection("bookings").where("tripId", "in", tripIds);
    const bookingsSnapshot = await bookingsQuery.get();
    
    if (bookingLoadingIndicator) {
      bookingLoadingIndicator.classList.add("hidden");
    }
    
    if (bookingsSnapshot.empty) {
      bookingsContainer.innerHTML = `
        <div class="no-trips">
          <p>No bookings found for your trips.</p>
        </div>
      `;
      return;
    }
    
    // Count upcoming bookings
    let upcoming = 0;
    const now = new Date();
    
    // Process bookings
    const bookingsPromises = bookingsSnapshot.docs.map(async (doc) => {
      const booking = doc.data();
      const bookingId = doc.id;
      const guideId = booking.guideId;
      
      // Get trip details
      const tripDoc = await db.collection("trips").doc(booking.tripId).get();
      const trip = tripDoc.exists ? tripDoc.data() : { tripName: "Unknown Trip" };
      
      // Get user details
      const userDoc = await db.collection("users").doc(booking.userId).get();
      const userData = userDoc.exists ? userDoc.data() : { fullName: "Unknown User" };
      
      // Check if booking is upcoming
      if (booking.startDate && booking.startDate.seconds) {
        const startDate = new Date(booking.startDate.seconds * 1000);
        if (startDate > now) {
          upcoming++;
        }
      }
      
      // Create booking card
      const bookingCard = document.createElement("div");
      bookingCard.className = "booking-card";
      bookingCard.setAttribute("data-id", bookingId);
      
      // Format dates
      const startDate = booking.startDate ? new Date(booking.startDate.seconds * 1000).toLocaleDateString() : "N/A";
      const endDate = booking.endDate ? new Date(booking.endDate.seconds * 1000).toLocaleDateString() : "N/A";
      
      // Set status class
      const statusClass = booking.status ? booking.status.toLowerCase() : "";
      
      bookingCard.innerHTML = `
        <div class="booking-info">
          <h3>${trip.tripName}</h3>
          <p><strong>Traveler:</strong> ${userData.fullName}</p>
          <p><strong>Dates:</strong> ${startDate} to ${endDate}</p>
          <p><strong>Status:</strong> <span class="status ${statusClass}">${booking.status || "Pending"}</span></p>
          <p><strong>Guests:</strong> ${booking.guests || "1"}</p>
        </div>
      `;
      
      // Add click event to show booking details
      bookingCard.addEventListener("click", () => {
        showBookingDetails(bookingId, booking, guideId, trip, userData);
      });
      
      return bookingCard;
    });
    
    // Wait for all booking cards to be created
    const bookingCards = await Promise.all(bookingsPromises);
    
    // Add booking cards to container
    bookingCards.forEach(card => {
      bookingsContainer.appendChild(card);
    });
    
    // Update upcoming bookings count
    if (upcomingBookingsCount) {
      upcomingBookingsCount.textContent = upcoming.toString();
    }
    
  } catch (error) {
    console.error("Error fetching bookings:", error);
    
    const bookingErrorMessage = document.getElementById("bookingErrorMessage");
    if (bookingErrorMessage) {
      bookingErrorMessage.textContent = "Error loading bookings: " + error.message;
      bookingErrorMessage.classList.remove("hidden");
    }
    
    const bookingLoadingIndicator = document.getElementById("bookingLoadingIndicator");
    if (bookingLoadingIndicator) {
      bookingLoadingIndicator.classList.add("hidden");
    }
  }
}

// Show booking details
function showBookingDetails(bookingId, booking, guideId, trip, user) {
  if (!bookingDetailsModal || !bookingDetailsContent) return;
  
  // Format dates
  const startDate = booking.startDate ? new Date(booking.startDate.seconds * 1000).toLocaleDateString() : "N/A";
  const endDate = booking.endDate ? new Date(booking.endDate.seconds * 1000).toLocaleDateString() : "N/A";
  const bookingDate = booking.createdAt ? new Date(booking.createdAt.seconds * 1000).toLocaleDateString() : "N/A";
  
  // Create booking details HTML
  bookingDetailsContent.innerHTML = `
    <div class="booking-details">
      <div class="booking-details-section">
        <h3>Trip Information</h3>
        <p><strong>Trip Name:</strong> ${trip.tripName}</p>
        <p><strong>Location:</strong> ${trip.tripPlace || "N/A"}</p>
        <p><strong>Duration:</strong> ${trip.tripDuration || "N/A"} days</p>
        <p><strong>Price:</strong> ${trip.tripPrice || "N/A"}</p>
      </div>
      
      <div class="booking-details-section">
        <h3>Booking Information</h3>
        <img src="${user.profileImageUrl || 'https://placehold.co/100x100?text=No+Image'}" alt="Traveler Image" class="traveler-image">
        <p><strong>Booking ID:</strong> ${bookingId}</p>
        <p><strong>Start Date:</strong> ${startDate}</p>
        <p><strong>End Date:</strong> ${endDate}</p>
        <p><strong>Guests:</strong> ${booking.guests || "1"}</p>
        <p><strong>Status:</strong> <span class="status ${booking.status.toLowerCase()}">${booking.status}</span></p>
        <p><strong>Booking Date:</strong> ${bookingDate}</p>
        <p><strong>Special Requests:</strong> ${booking.specialRequests || "None"}</p>
      </div>
      
      <div class="booking-details-section">
        <h3>Traveler Information</h3>
        <p><strong>Name:</strong> ${user.fullName}</p>
        <p><strong>Email:</strong> ${user.email || "N/A"}</p>
        <p><strong>Phone:</strong> ${user.phone || "N/A"}</p>
      </div>
      
      // Contact Traveler btn
      <div class="booking-actions">
        <button id="updateStatusBtn" class="btn primary">Update Status</button>
        <button id="contactTravelerBtn" class="btn secondary">Contact Traveler</button>
      </div>
      
      //updateStatusBtn
      <div id="statusUpdateForm" class="status-update-form hidden">
        <h3>Update Booking Status</h3>
        <div class="form-group">
          <label for="bookingStatus">Status</label>
          <select id="bookingStatus">
            <option value="Pending" ${booking.status === "Pending" ? "selected" : ""}>Pending</option>
            <option value="Confirmed" ${booking.status === "Confirmed" ? "selected" : ""}>Confirmed</option>
            <option value="Completed" ${booking.status === "Completed" ? "selected" : ""}>Completed</option>
            <option value="Cancelled" ${booking.status === "Cancelled" ? "selected" : ""}>Cancelled</option>
          </select>
        </div>
        <div class="form-actions">
          <button id="saveStatusBtn" class="btn primary">Save</button>
          <button id="cancelStatusBtn" class="btn secondary">Cancel</button>
        </div>
      </div>
    </div>
  `;
  
  // Show modal
  bookingDetailsModal.classList.remove("hidden");
  
  // Add event listeners
  document.getElementById("updateStatusBtn").addEventListener("click", () => {
    document.getElementById("statusUpdateForm").classList.remove("hidden");
  });
  
  document.getElementById("cancelStatusBtn").addEventListener("click", () => {
    document.getElementById("statusUpdateForm").classList.add("hidden");
  });
  
  document.getElementById("saveStatusBtn").addEventListener("click", async () => {
    const newStatus = document.getElementById("bookingStatus").value;
    
    try {
      await db.collection("bookings").doc(bookingId).update({
        status: newStatus,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      
      // Update status in modal
      const statusSpan = bookingDetailsContent.querySelector(".status");
      statusSpan.textContent = newStatus;
      statusSpan.className = `status ${newStatus.toLowerCase()}`;
      
      // Hide status update form
      document.getElementById("statusUpdateForm").classList.add("hidden");
      
      // Reload bookings
      fetchBookings();
      
      // Add notification for user
      await db.collection("notifications").add({
        userId: booking.userId,
        title: "Booking Status Updated",
        message: `Your booking for ${trip.tripName} has been updated to ${newStatus}`,
        type: "booking",
        read: false,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      
      alert("Booking status updated successfully");
    } catch (error) {
      console.error("Error updating booking status:", error);
      showError("Error updating booking status: " + error.message);
    }
  });
  
  // Contact traveler button
  document.getElementById("contactTravelerBtn").addEventListener("click", () => {
    // Close booking details modal
    bookingDetailsModal.classList.add("hidden");
    
    // Navigate to messages section
    sidebarNavLinks.forEach((navLink) => {
      if (navLink.getAttribute("data-section") === "messages") {
        navLink.click();
      }
    });
    
    // Start conversation with user
    startConversation(guideId, booking.userId);
  });
}

// Close booking details modal
if (closeBookingDetailsBtn) {
  closeBookingDetailsBtn.addEventListener("click", () => {
    bookingDetailsModal.classList.add("hidden");
  });
}

// Fetch dashboard stats
async function fetchDashboardStats() {
  try {
    const user = auth.currentUser;
    if (!user) return;
    
    // Get guide's trips
    const tripsSnapshot = await db.collection("trips").where("guideId", "==", user.uid).get();
    const tripIds = tripsSnapshot.docs.map(doc => doc.id);
    
    // Get bookings for guide's trips
    let totalTravelers = 0;
    let totalRev = 0;
    
    if (tripIds.length > 0) {
      const bookingsSnapshot = await db.collection("bookings").where("tripId", "in", tripIds).get();
      
      // Count unique travelers
      const travelerIds = new Set();
      
      bookingsSnapshot.forEach(doc => {
        const booking = doc.data();
        travelerIds.add(booking.userId);
        
        // Calculate revenue
        const trip = tripsSnapshot.docs.find(tripDoc => tripDoc.id === booking.tripId);
        if (trip) {
          const tripData = trip.data();
          const price = parseFloat(tripData.tripPrice.replace(/[^0-9.-]+/g, "")) || 0;
          const guests = booking.guests || 1;
          totalRev += price * guests;
        }
      });
      
      totalTravelers = travelerIds.size;
    }
    
    // Update stats
    if (totalTravelersCount) {
      totalTravelersCount.textContent = totalTravelers.toString();
    }
    
    if (totalRevenue) {
      totalRevenue.textContent = `₨ ${totalRev.toLocaleString()}`;
    }
    
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
  }
}

// Fetch recent activity
async function fetchRecentActivity() {
  if (!recentActivityList) return;
  
  try {
    // Show loading indicator
    recentActivityList.innerHTML = `
      <div class="loading-indicator">
        <div class="spinner"></div>
        <p>Loading activities...</p>
      </div>
    `;
    
    const user = auth.currentUser;
    if (!user) return;
    
    // Get guide's trips
    const tripsSnapshot = await db.collection("trips").where("guideId", "==", user.uid).get();
    const tripIds = tripsSnapshot.docs.map(doc => doc.id);
    
    // Combine different types of activities
    const activities = [];
    
    // Add bookings as activities
    if (tripIds.length > 0) {
      const bookingsSnapshot = await db.collection("bookings")
        .where("tripId", "in", tripIds)
        .orderBy("createdAt", "desc")
        .limit(5)
        .get();
      
      for (const doc of bookingsSnapshot.docs) {
        const booking = doc.data();
        
        // Get user info
        const userDoc = await db.collection("users").doc(booking.userId).get();
        const userData = userDoc.exists ? userDoc.data() : { fullName: "Unknown User" };
        
        // Get trip info
        const tripDoc = tripsSnapshot.docs.find(trip => trip.id === booking.tripId);
        const tripData = tripDoc ? tripDoc.data() : { tripName: "Unknown Trip" };
        
        activities.push({
          type: "booking",
          title: "New Booking",
          message: `${userData.fullName} booked ${tripData.tripName}`,
          time: booking.createdAt,
          icon: "📅"
        });
      }
    }
    
    // Add messages as activities
    const messagesSnapshot = await db.collection("messages")
      .where("recipientId", "==", user.uid)
      .orderBy("timestamp", "desc")
      .limit(5)
      .get();
    
    for (const doc of messagesSnapshot.docs) {
      const message = doc.data();
      
      // Get sender info
      const senderDoc = await db.collection("users").doc(message.senderId).get();
      const senderData = senderDoc.exists ? senderDoc.data() : { fullName: "Unknown User" };
      
      activities.push({
        type: "message",
        title: "New Message",
        message: `${senderData.fullName} sent you a message`,
        time: message.timestamp,
        icon: "💬"
      });
    }
    
    // Add reviews as activities
    const reviewsSnapshot = await db.collection("reviews")
      .where("guideId", "==", user.uid)
      .orderBy("createdAt", "desc")
      .limit(5)
      .get();
    
    for (const doc of reviewsSnapshot.docs) {
      const review = doc.data();
      
      // Get reviewer info
      const reviewerDoc = await db.collection("users").doc(review.userId).get();
      const reviewerData = reviewerDoc.exists ? reviewerDoc.data() : { fullName: "Unknown User" };
      
      activities.push({
        type: "review",
        title: "New Review",
        message: `You received a ${review.rating}-star review from ${reviewerData.fullName}`,
        time: review.createdAt,
        icon: "⭐"
      });
    }
    
    // Sort activities by time
    activities.sort((a, b) => {
      return b.time.seconds - a.time.seconds;
    });
    
    // Display activities
    if (activities.length === 0) {
      recentActivityList.innerHTML = `<p>No recent activity to display.</p>`;
      return;
    }
    
    recentActivityList.innerHTML = "";
    
    // Take only the 5 most recent activities
    const recentActivities = activities.slice(0, 5);
    
    recentActivities.forEach(activity => {
      const activityTime = new Date(activity.time.seconds * 1000);
      const timeAgo = getTimeAgo(activityTime);
      
      const activityItem = document.createElement("div");
      activityItem.className = "activity-item";
      activityItem.innerHTML = `
        <div class="activity-icon">${activity.icon}</div>
        <div class="activity-details">
          <h4>${activity.title}</h4>
          <p>${activity.message}</p>
          <span class="activity-time">${timeAgo}</span>
        </div>
      `;
      
      recentActivityList.appendChild(activityItem);
    });
    
  } catch (error) {
    console.error("Error fetching recent activity:", error);
    recentActivityList.innerHTML = `<p>Error loading recent activity.</p>`;
  }
}

// Get time ago string
function getTimeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000);
  
  let interval = Math.floor(seconds / 31536000);
  if (interval > 1) return interval + " years ago";
  if (interval === 1) return "1 year ago";
  
  interval = Math.floor(seconds / 2592000);
  if (interval > 1) return interval + " months ago";
  if (interval === 1) return "1 month ago";
  
  interval = Math.floor(seconds / 86400);
  if (interval > 1) return interval + " days ago";
  if (interval === 1) return "1 day ago";
  
  interval = Math.floor(seconds / 3600);
  if (interval > 1) return interval + " hours ago";
  if (interval === 1) return "1 hour ago";
  
  interval = Math.floor(seconds / 60);
  if (interval > 1) return interval + " minutes ago";
  if (interval === 1) return "1 minute ago";
  
  return "Just now";
}

// Fetch notifications
async function fetchNotifications() {
  if (!notificationList || !notificationBadge) return;
  
  try {
    const user = auth.currentUser;
    if (!user) return;
    
    // Listen for notifications in real-time
    db.collection("notifications")
      .where("userId", "==", user.uid)
      .orderBy("createdAt", "desc")
      .limit(10)
      .onSnapshot(snapshot => {
        // Count unread notifications
        unreadNotifications = 0;
        
        // Clear notification list
        notificationList.innerHTML = "";
        
        if (snapshot.empty) {
          notificationList.innerHTML = `<div class="notification-empty">No notifications</div>`;
          notificationBadge.textContent = "0";
          return;
        }
        
        snapshot.forEach(doc => {
          const notification = doc.data();
          const notificationId = doc.id;
          
          // Count unread
          if (!notification.read) {
            unreadNotifications++;
          }
          
          // Create notification item
          const notificationItem = document.createElement("div");
          notificationItem.className = `notification-item ${notification.read ? "" : "unread"}`;
          
          // Get notification icon based on type
          let icon = "🔔";
          if (notification.type === "booking") icon = "📅";
          if (notification.type === "message") icon = "💬";
          if (notification.type === "review") icon = "⭐";
          
          // Format time
          const notificationTime = new Date(notification.createdAt.seconds * 1000);
          const timeAgo = getTimeAgo(notificationTime);
          
          notificationItem.innerHTML = `
            <div class="notification-icon">${icon}</div>
            <div class="notification-content">
              <div class="notification-title">${notification.title}</div>
              <div class="notification-message">${notification.message}</div>
              <div class="notification-time">${timeAgo}</div>
            </div>
          `;
          
          // Mark as read when clicked
          notificationItem.addEventListener("click", async () => {
            try {
              await db.collection("notifications").doc(notificationId).update({
                read: true
              });
              
              notificationItem.classList.remove("unread");
            } catch (error) {
              console.error("Error marking notification as read:", error);
            }
          });
          
          notificationList.appendChild(notificationItem);
        });
        
        // Update badge
        notificationBadge.textContent = unreadNotifications.toString();
      });
    
  } catch (error) {
    console.error("Error fetching notifications:", error);
  }
}

// Toggle notification dropdown
if (notificationBtn) {
  notificationBtn.addEventListener("click", () => {
    notificationDropdown.classList.toggle("hidden");
  });
  
  // Close dropdown when clicking outside
  document.addEventListener("click", (e) => {
    if (!notificationBtn.contains(e.target) && !notificationDropdown.contains(e.target)) {
      notificationDropdown.classList.add("hidden");
    }
  });
}

// Mark all notifications as read
if (markAllReadBtn) {
  markAllReadBtn.addEventListener("click", async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      
      const batch = db.batch();
      
      // Get unread notifications
      const unreadSnapshot = await db.collection("notifications")
        .where("userId", "==", user.uid)
        .where("read", "==", false)
        .get();
      
      unreadSnapshot.forEach(doc => {
        batch.update(doc.ref, { read: true });
      });
      
      await batch.commit();
      
      // Update UI
      document.querySelectorAll(".notification-item.unread").forEach(item => {
        item.classList.remove("unread");
      });
      
      notificationBadge.textContent = "0";
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      showError("Error marking notifications as read: " + error.message);
    }
  });
}

// // Fetch conversations
// async function fetchConversations() {
//   if (!conversationList) return;
  
//   try {
//     // Show loading indicator
//     conversationList.innerHTML = `
//       <div class="loading-indicator">
//         <div class="spinner"></div>
//         <p>Loading conversations...</p>
//       </div>
//     `;
    
//     const user = booking.guideId;
//     if (!user) return;
    
//     // Get conversations where user is a participant
//     const conversationsSnapshot = await db.collection("conversations")
//       .where("participants", "array-contains", user.uid)
//       .orderBy("lastMessageTime", "desc")
//       .get();
    
//     // Clear loading indicator
//     conversationList.innerHTML = "";
    
//     if (conversationsSnapshot.empty) {
//       conversationList.innerHTML = `<div class="no-conversations">No conversations yet</div>`;
//       return;
//     }
    
//     // Process conversations
//     const conversationsPromises = conversationsSnapshot.docs.map(async (doc) => {
//       const conversation = doc.data();
//       const conversationId = doc.id;
      
//       // Get the other participant
//       const otherParticipantId = conversation.participants.find(id => id !== user.uid);
      
//       // Get user info
//       const userDoc = await db.collection("users").doc(otherParticipantId).get();
//       const userData = userDoc.exists ? userDoc.data() : { fullName: "Unknown User" };
      
//       // Create conversation item
//       const conversationItem = document.createElement("div");
//       conversationItem.className = "conversation-item";
//       conversationItem.setAttribute("data-id", conversationId);
//       conversationItem.setAttribute("data-user-id", otherParticipantId);
//       conversationItem.setAttribute("data-user-name", userData.fullName);
      
//       // Format time
//       const lastMessageTime = conversation.lastMessageTime ? new Date(conversation.lastMessageTime.seconds * 1000) : new Date();
//       const timeAgo = getTimeAgo(lastMessageTime);
      
//       // Check for unread messages
//       const unreadCount = conversation.unreadCount && conversation.unreadCount[user.uid] ? conversation.unreadCount[user.uid] : 0;
      
//       conversationItem.innerHTML = `
//         <img src="${userData.profileImageUrl || "https://placehold.co/40x40?text=User"}" alt="${userData.fullName}" class="conversation-avatar">
//         <div class="conversation-info">
//           <div class="conversation-name">${userData.fullName}</div>
//           <div class="conversation-preview">${conversation.lastMessage || "No messages yet"}</div>
//         </div>
//         <div class="conversation-meta">
//           <div class="conversation-time">${timeAgo}</div>
//           ${unreadCount > 0 ? `<div class="conversation-badge">${unreadCount}</div>` : ""}
//         </div>
//       `;
      
//       // Add click event to load messages
//       conversationItem.addEventListener("click", () => {
//         // Remove active class from all conversations
//         document.querySelectorAll(".conversation-item").forEach(item => {
//           item.classList.remove("active");
//         });
        
//         // Add active class to clicked conversation
//         conversationItem.classList.add("active");
        
//         // Load messages
//         loadMessages(conversationId, otherParticipantId, userData.fullName);
//       });
      
//       return conversationItem;
//     });
    
//     // Wait for all conversation items to be created
//     const conversationItems = await Promise.all(conversationsPromises);
    
//     // Add conversation items to container
//     conversationItems.forEach(item => {
//       conversationList.appendChild(item);
//     });
    
//   } catch (error) {
//     console.error("Error fetching conversations:", error);
//     conversationList.innerHTML = `<div class="error-message">Error loading conversations</div>`;
//   }
// }

// // Load messages for a conversation
// async function loadMessages(conversationId, userId, userName) {
//   if (!messagesBody || !messagesHeader || !messagesInput) return;
  
//   try {
//     // Update header
//     messagesHeader.innerHTML = `
//       <div class="contact-info">
//         <img src="https://placehold.co/40x40?text=User" alt="${userName}" class="contact-avatar">
//         <div class="contact-details">
//           <h3 class="contact-name">${userName}</h3>
//           <p class="contact-status">Online</p>
//         </div>
//       </div>
//     `;
    
//     // Show messages input
//     messagesInput.classList.remove("hidden");
    
//     // Show loading indicator
//     messagesBody.innerHTML = `
//       <div class="loading-indicator">
//         <div class="spinner"></div>
//         <p>Loading messages...</p>
//       </div>
//     `;
    
//     // Set current conversation
//     currentConversation = {
//       id: conversationId,
//       userId: userId,
//       userName: userName
//     };
    
//     // Mark conversation as read
//     await db.collection("conversations").doc(conversationId).update({
//       [`unreadCount.${auth.currentUser.uid}`]: 0
//     });
    
//     // Remove unread badge from conversation item
//     const conversationItem = document.querySelector(`.conversation-item[data-id="${conversationId}"]`);
//     if (conversationItem) {
//       const badge = conversationItem.querySelector(".conversation-badge");
//       if (badge) {
//         badge.remove();
//       }
//     }
    
//     // Clear any existing listener
//     if (messagesListener) {
//       messagesListener();
//     }
    
//     // Listen for messages in real-time
//     messagesListener = db.collection("messages")
//       .where("conversationId", "==", conversationId)
//       .orderBy("timestamp", "asc")
//       .onSnapshot(snapshot => {
//         // Clear messages
//         messagesBody.innerHTML = "";
        
//         if (snapshot.empty) {
//           messagesBody.innerHTML = `<div class="no-messages">No messages yet</div>`;
//           return;
//         }
        
//         snapshot.forEach(doc => {
//           const message = doc.data();
          
//           // Create message element
//           const messageElement = document.createElement("div");
//           messageElement.className = `message ${message.senderId === auth.currentUser.uid ? "message-sent" : "message-received"}`;
          
//           // Format time
//           const messageTime = new Date(message.timestamp.seconds * 1000);
//           const timeString = messageTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          
//           messageElement.innerHTML = `
//             <div class="message-content">${message.text}</div>
//             <div class="message-time">${timeString}</div>
//           `;
          
//           messagesBody.appendChild(messageElement);
//         });
        
//         // Scroll to bottom
//         messagesBody.scrollTop = messagesBody.scrollHeight;
//       });
    
//   } catch (error) {
//     console.error("Error loading messages:", error);
//     messagesBody.innerHTML = `<div class="error-message">Error loading messages</div>`;
//   }
// }

// // Start a new conversation
// async function startConversation(guideId,userId) {
//   try {
//     const currentUser = auth.currentUser;
//     if (!currentUser)
//       {
//         console.error("No authenticated user found");
//       return;
//       }
//     // Check if conversation already exists
//     const conversationsSnapshot = await db.collection("conversations")
//       .where("participants", "array-contains", guideId)
//       .get();
    
//     let conversationId = null;
    
//     // Find conversation with the user
//     conversationsSnapshot.forEach(doc => {
//       const conversation = doc.data();
//       if (conversation.participants.includes(userId)) {
//         conversationId = doc.id;
//       }
//     });
    
//     // Create new conversation if it doesn't exist
//     if (!conversationId) {
//       const newConversationRef = await db.collection("conversations").add({
//         participants: [guideId, userId],
//         createdAt: firebase.firestore.FieldValue.serverTimestamp(),
//         lastMessageTime: firebase.firestore.FieldValue.serverTimestamp(),
//         lastMessage: "",
//         unreadCount: {
//           [guideId]: 0,
//           [userId]: 0
//         }
//       });
      
//       conversationId = newConversationRef.id;
//     }
    
//     // Reload conversations
//     await fetchConversations();
    
//     // Select the conversation
//     setTimeout(() => {
//       const conversationItem = document.querySelector(`.conversation-item[data-user-id="${userId}"]`);
//       if (conversationItem) {
//         conversationItem.click();
//       }
//     }, 500);
//     return conversationId;
//   } catch (error) {
//     console.error("Error starting conversation:", error);
//     showError("Error starting conversation: " + error.message);
//   }
// }

// // Send message
// if (sendMessageBtn) {
//   sendMessageBtn.addEventListener("click", sendMessage);
// }

// if (messageText) {
//   messageText.addEventListener("keydown", (e) => {
//     if (e.key === "Enter" && !e.shiftKey) {
//       e.preventDefault();
//       sendMessage();
//     }
//   });
// }

// async function sendMessage() {
//   try {
//     if (!currentConversation) {
//       showError("No active conversation");
//       return;
//     }
    
//     const text = messageText.value.trim();
//     if (!text) return;
    
//     const user = auth.currentUser;
//     if (!user) return;
    
//     // Clear input
//     messageText.value = "";
    
//     // Add message to Firestore
//     await db.collection("messages").add({
//       conversationId: currentConversation.id,
//       senderId: user.uid,
//       recipientId: currentConversation.userId,
//       text: text,
//       timestamp: firebase.firestore.FieldValue.serverTimestamp()
//     });
    
//     // Update conversation
//     await db.collection("conversations").doc(currentConversation.id).update({
//       lastMessage: text,
//       lastMessageTime: firebase.firestore.FieldValue.serverTimestamp(),
//       [`unreadCount.${currentConversation.userId}`]: firebase.firestore.FieldValue.increment(1)
//     });
    
//     // Add notification for recipient
//     await db.collection("notifications").add({
//       userId: currentConversation.userId,
//       title: "New Message",
//       message: `${user.displayName || "Guide"} sent you a message`,
//       type: "message",
//       read: false,
//       createdAt: firebase.firestore.FieldValue.serverTimestamp()
//     });
    
//   } catch (error) {
//     console.error("Error sending message:", error);
//     showError("Error sending message: " + error.message);
//   }
// }


//v2.0
//Fetch conversations
async function fetchConversations() {
  if (!conversationList){
    console.error("Conversation list element not found");
    return;
  }
  
  try {
    // Show loading indicator
    conversationList.innerHTML = `
      <div class="loading-indicator">
        <div class="spinner"></div>
        <p>Loading conversations...</p>
      </div>
    `;
    
    const user = auth.currentUser;  
    if (!user) return;
    console.log("Fetching conversations for user:", user.uid);

    // Get conversations where user is a participant
    const conversationsSnapshot = await db.collection("conversations")
    .where("participants", "array-contains", user.uid)
    .orderBy("lastMessageTime", "desc")
    .get()
    .catch(error => {
      console.error("Query error:", error);
      throw error;
    });
    console.log("Conversations fetched:", conversationsSnapshot.size);
    // Clear loading indicator
    conversationList.innerHTML = "";
    
    if (conversationsSnapshot.empty) {
      console.log("No conversations found");
      conversationList.innerHTML = `<div class="no-conversations">No conversations yet</div>`;
      return;
    }
    
    // Process conversations
    const conversationsPromises = conversationsSnapshot.docs.map(async (doc) => {
      const conversation = doc.data();
      const conversationId = doc.id;
      
      console.log("Processing conversation:", conversationId);
      
      
      // Get the other participant
      const otherParticipantId = conversation.participants.find(id => id !== user.uid);
      if (!otherParticipantId) {
        console.error("Other participant not found in conversation:", conversationId);
        return null;
      }
      
      console.log("Other participant:", otherParticipantId);
      // Get user info
      const userDoc = await db.collection("users").doc(otherParticipantId).get();
      const userData = userDoc.exists ? userDoc.data() : { fullName: "Unknown User" };
      
      // Create conversation item
      const conversationItem = document.createElement("div");
      conversationItem.className = "conversation-item";
      conversationItem.setAttribute("data-id", conversationId);
      conversationItem.setAttribute("data-user-id", otherParticipantId);
      conversationItem.setAttribute("data-user-name", userData.fullName);
      
      // Format time
      const lastMessageTime = conversation.lastMessageTime ? new Date(conversation.lastMessageTime.seconds * 1000) : new Date();
      const timeAgo = getTimeAgo(lastMessageTime);
      
      // Check for unread messages
      const unreadCount = conversation.unreadCount && conversation.unreadCount[user.uid] ? conversation.unreadCount[user.uid] : 0;
      
      conversationItem.innerHTML = `
        <img src="${userData.profileImageUrl || "https://placehold.co/40x40?text=User"}" alt="${userData.fullName}" class="conversation-avatar">
        <div class="conversation-info">
          <div class="conversation-name">${userData.fullName}</div>
          <div class="conversation-preview">${conversation.lastMessage || "No messages yet"}</div>
        </div>
        <div class="conversation-meta">
          <div class="conversation-time">${timeAgo}</div>
          ${unreadCount > 0 ? `<div class="conversation-badge">${unreadCount}</div>` : ""}
        </div>
      `;
      
      // Add click event to load messages
      conversationItem.addEventListener("click", () => {
        // Remove active class from all conversations
        document.querySelectorAll(".conversation-item").forEach(item => {
          item.classList.remove("active");
        });
        
        // Add active class to clicked conversation
        conversationItem.classList.add("active");
        
        // Load messages
        loadMessages(conversationId, otherParticipantId, userData.fullName);
      });
      
      return conversationItem;
    });
    
    // Wait for all conversation items to be created
    const conversationItems = await Promise.all(conversationsPromises);
    
    // Add conversation items to container
    conversationItems.forEach(item => {
      conversationList.appendChild(item);
    });
    
  } catch (error) {
    console.error("Error fetching conversations:", error);
    console.error("Error details:", error.message, error.code);
    conversationList.innerHTML = `<div class="error-message">Error loading conversations: ${error.message}</div>`;
  }
}

// Load messages for a conversation
async function loadMessages(conversationId, userId, userName) {
  if (!messagesBody || !messagesHeader || !messagesInput) return;
  
  try {
    // Update header
    messagesHeader.innerHTML = `
      <div class="contact-info">
        <img src="https://placehold.co/40x40?text=User" alt="${userName}" class="contact-avatar">
        <div class="contact-details">
          <h3 class="contact-name">${userName}</h3>
          <p class="contact-status">Online</p>
        </div>
      </div>
    `;
    
    // Show messages input
    messagesInput.classList.remove("hidden");
    
    // Show loading indicator
    messagesBody.innerHTML = `
      <div class="loading-indicator">
        <div class="spinner"></div>
        <p>Loading messages...</p>
      </div>
    `;
    

    // Set current conversation
    currentConversation = {
      id: conversationId,
      userId: userId,
      userName: userName
    };
    
    // Mark conversation as read
    await db.collection("conversations").doc(conversationId).update({
      [`unreadCount.${auth.currentUser.uid}`]: 0
    });
    
    // Remove unread badge from conversation item
    const conversationItem = document.querySelector(`.conversation-item[data-id="${conversationId}"]`);
    if (conversationItem) {
      const badge = conversationItem.querySelector(".conversation-badge");
      if (badge) {
        badge.remove();
      }
    }
    
    // Clear any existing listener
    if (messagesListener) {
      messagesListener();
    }
    
    // Listen for messages in real-time
    messagesListener = db.collection("messages")
    .where("conversationId", "==", conversationId)
    .orderBy("timestamp", "asc")
    .onSnapshot(snapshot => {
      // Clear loading
      messagesBody.innerHTML = "";

      if (snapshot.empty) {
        messagesBody.innerHTML = `<div class="no-messages">No messages yet</div>`;
        console.log("No messages in this conversation.");
        return;
      }

      snapshot.forEach(doc => {
        const message = doc.data();

        if (!message.text || !message.timestamp) {
          console.warn("Invalid message format:", message);
          return;
        }

        const messageElement = document.createElement("div");
        messageElement.className = `message ${message.senderId === auth.currentUser.uid ? "message-sent" : "message-received"}`;

        const messageTime = new Date(message.timestamp.seconds * 1000);
        const timeString = messageTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        messageElement.innerHTML = `
          <div class="message-content">${message.text}</div>
          <div class="message-time">${timeString}</div>
        `;

        messagesBody.appendChild(messageElement);
      });

      messagesBody.scrollTop = messagesBody.scrollHeight;
    }, error => {
      console.error("Error listening for messages:", error);
      messagesBody.innerHTML = `<div class="error-message">Failed to load messages: ${error.message}</div>`;
    });
  } catch (error) {
    console.error("Error loading messages:", error);
    messagesBody.innerHTML = `<div class="error-message">Error loading messages</div>`;
  }
}

// Start a new conversation
async function startConversation(guideId, userId) {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.error("No authenticated user found");
      return;
    }
    
    // Check if conversation already exists
    const conversationsSnapshot = await db.collection("conversations")
      .where("participants", "array-contains", currentUser.uid)  // FIXED: Using currentUser.uid for query
      .get();
    
    let conversationId = null;
    
    // Find conversation with the user
    conversationsSnapshot.forEach(doc => {
      const conversation = doc.data();
      if (conversation.participants.includes(userId)) {
        conversationId = doc.id;
      }
    });
    
    // Create new conversation if it doesn't exist
    if (!conversationId) {
      const newConversationRef = await db.collection("conversations").add({
        participants: [currentUser.uid, userId],  // FIXED: Using currentUser.uid instead of guideId
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        lastMessageTime: firebase.firestore.FieldValue.serverTimestamp(),
        lastMessage: "",
        unreadCount: {
          [currentUser.uid]: 0,  // FIXED: Using currentUser.uid 
          [userId]: 0
        }
      });
      
      conversationId = newConversationRef.id;
    }
    
    // Reload conversations
    await fetchConversations();
    
    // Select the conversation
    setTimeout(() => {
      const conversationItem = document.querySelector(`.conversation-item[data-user-id="${userId}"]`);
      if (conversationItem) {
        conversationItem.click();
      }
    }, 500);
    return conversationId;
  } catch (error) {
    console.error("Error starting conversation:", error);
    showError("Error starting conversation: " + error.message);
  }
}

// Send message
if (sendMessageBtn) {
  sendMessageBtn.addEventListener("click", sendMessage);
}

if (messageText) {
  messageText.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
}

async function sendMessage() {
  try {
    if (!currentConversation) {
      showError("No active conversation");
      return;
    }

    const text = messageText.value.trim();
    if (!text) return;

    const user = auth.currentUser;
    if (!user) return;

    // Clear input
    messageText.value = "";

    // Add message to Firestore
    const messageRef = await db.collection("messages").add({
      conversationId: currentConversation.id,
      senderId: user.uid,
      recipientId: currentConversation.userId,
      text: text,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });

    console.log("Message sent:", messageRef.id);

    // Update conversation
    await db.collection("conversations").doc(currentConversation.id).update({
      lastMessage: text,
      lastMessageTime: firebase.firestore.FieldValue.serverTimestamp(),
      [`unreadCount.${currentConversation.userId}`]: firebase.firestore.FieldValue.increment(1)
    });

    console.log("Conversation updated with lastMessage and unreadCount");

    // Add notification for recipient
    await db.collection("notifications").add({
      userId: currentConversation.userId,
      title: "New Message",
      message: `${user.displayName || "Guide"} sent you a message`,
      type: "message",
      read: false,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    console.log("Notification added for recipient");

    // Optional fallback: reload messages manually in case snapshot doesn't trigger
    setTimeout(() => {
      loadMessages(currentConversation.id, currentConversation.userId, currentConversation.userName);
    }, 1000);

  } catch (error) {
    console.error("Error sending message:", error);
    showError("Error sending message: " + error.message);
  }
}

// User settings
// Load user settings
async function loadUserSettings() {
  try {
    const user = auth.currentUser;
    if (!user) return;
    
    // Get user settings
    const settingsDoc = await db.collection("guideSettings").doc(user.uid).get();
    
    if (settingsDoc.exists) {
      const settings = settingsDoc.data();
      
      // Update toggles
      if (emailNotificationsToggle) {
        emailNotificationsToggle.checked = settings.emailNotifications !== false;
      }
      
      if (profileVisibilityToggle) {
        profileVisibilityToggle.checked = settings.profileVisibility !== false;
      }
      
      // Update preferences
      if (languagePreference) {
        languagePreference.value = settings.language || "en";
      }
      
      if (currencyPreference) {
        currencyPreference.value = settings.currency || "LKR";
      }
    } else {
      // Create default settings
      await db.collection("guideSettings").doc(user.uid).set({
        emailNotifications: true,
        profileVisibility: true,
        language: "en",
        currency: "LKR",
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    }
    
    // Add event listeners for settings changes
    if (emailNotificationsToggle) {
      emailNotificationsToggle.addEventListener("change", updateSettings);
    }
    
    if (profileVisibilityToggle) {
      profileVisibilityToggle.addEventListener("change", updateSettings);
    }
    
    if (languagePreference) {
      languagePreference.addEventListener("change", updateSettings);
    }
    
    if (currencyPreference) {
      currencyPreference.addEventListener("change", updateSettings);
    }
    
  } catch (error) {
    console.error("Error loading settings:", error);
  }
}

// Initialize settings
// Update settings
async function updateSettings() {
  try {
    const user = auth.currentUser;
    if (!user) return;
    
    const settings = {
      emailNotifications: emailNotificationsToggle ? emailNotificationsToggle.checked : true,
      profileVisibility: profileVisibilityToggle ? profileVisibilityToggle.checked : true,
      language: languagePreference ? languagePreference.value : "en",
      currency: currencyPreference ? currencyPreference.value : "LKR",
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    await db.collection("guideSettings").doc(user.uid).update(settings);
    
  } catch (error) {
    console.error("Error updating settings:", error);
    showError("Error updating settings: " + error.message);
  }
}

// Change password
if (changePasswordBtn) {
  changePasswordBtn.addEventListener("click", () => {
    changePasswordModal.classList.remove("hidden");
  });
}

if (closePasswordModalBtn) {
  closePasswordModalBtn.addEventListener("click", () => {
    changePasswordModal.classList.add("hidden");
  });
}

if (changePasswordForm) {
  changePasswordForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const currentPassword = document.getElementById("currentPassword").value;
    const newPassword = document.getElementById("newPassword").value;
    const confirmPassword = document.getElementById("confirmPassword").value;
    
    if (newPassword !== confirmPassword) {
      showError("New passwords do not match");
      return;
    }
    
    try {
      const user = auth.currentUser;
      if (!user) return;
      
      // Get credentials
      const credential = firebase.auth.EmailAuthProvider.credential(
        user.email,
        currentPassword
      );
      
      // Reauthenticate
      await user.reauthenticateWithCredential(credential);
      
      // Update password
      await user.updatePassword(newPassword);
      
      // Reset form and hide modal
      changePasswordForm.reset();
      changePasswordModal.classList.add("hidden");
      
      alert("Password updated successfully");
    } catch (error) {
      console.error("Error updating password:", error);
      showError("Error updating password: " + error.message);
    }
  });
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
  });
});

// Quick action buttons for navigation
document.querySelectorAll(".action-buttons .btn[data-section]").forEach((button) => {
  button.addEventListener("click", () => {
    const targetSection = button.getAttribute("data-section");
    
    // Update active link in sidebar
    sidebarNavLinks.forEach((navLink) => {
      if (navLink.getAttribute("data-section") === targetSection) {
        navLink.parentElement.classList.add("active");
      } else {
        navLink.parentElement.classList.remove("active");
      }
    });
    
    // Show target section
    dashboardSections.forEach((section) => {
      section.classList.remove("active");
    });
    document.getElementById(targetSection).classList.add("active");
  });
});

// Mobile App Link
if (mobileAppLink) {
  mobileAppLink.addEventListener("click", (e) => {
    e.preventDefault();

    // Implement deep linking to mobile app
    // For now, just show an alert
    alert("Mobile app integration coming soon!");
  });
}

// Add Trip Button
if (addTripBtn) {
  addTripBtn.addEventListener("click", () => {
    addTripForm.classList.remove("hidden");
  });
}

if (addNewTripBtn) {
  addNewTripBtn.addEventListener("click", () => {
    addTripForm.classList.remove("hidden");
  });
}

if (closeTripFormBtn) {
  closeTripFormBtn.addEventListener("click", () => {
    addTripForm.classList.add("hidden");
    tripForm.reset();
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

    try {
      // Upload trip image if provided
      let tripImageUrl = "";
      if (tripImageInput && tripImageInput.files.length > 0) {
        const file = tripImageInput.files[0];
        tripImageUrl = await uploadImageToCloudinary(file);
      }

      // Create trip in Firestore
      await db.collection("trips").add({
        tripName,
        tripCode,
        tripPlace,
        tripPrice,
        tripDuration,
        tripDescription,
        tripImagePath: tripImageUrl || "https://placehold.co/400x200?text=Trip+Image",
        guideId: auth.currentUser.uid,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });

      // Reset form and hide modal
      tripForm.reset();
      addTripForm.classList.add("hidden");

      // Reload trips
      fetchTrips();

      alert("Trip added successfully!");
    } catch (error) {
      console.error("Error adding trip:", error);
      showError("Error adding trip: " + error.message);
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
    console.error("Error uploading image:", error);
    throw error;
  }
}

// Edit Profile
if (editProfileBtn) {
  editProfileBtn.addEventListener("click", () => {
    profileEditForm.classList.remove("hidden");
  });
}

if (cancelEditBtn) {
  cancelEditBtn.addEventListener("click", () => {
    profileEditForm.classList.add("hidden");
  });
}

// Edit Profile Form Submission
if (editProfileForm) {
  editProfileForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const fullName = document.getElementById("editFullName").value;
    const phone = document.getElementById("editPhone").value;
    const location = document.getElementById("editLocation").value;
    const bio = document.getElementById("editBio").value;
    const languages = document.getElementById("editLanguages").value;
    const specialties = document.getElementById("editSpecialties").value;

    try {
      // Update user profile in Firestore
      await db.collection("guides").doc(auth.currentUser.uid).update({
        fullName,
        phone,
        location,
        bio,
        languages,
        specialties,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      });

      // Update user display name
      await auth.currentUser.updateProfile({
        displayName: fullName,
      });

      // Hide form
      profileEditForm.classList.add("hidden");

      // Reload user profile
      loadUserProfile(auth.currentUser);

      alert("Profile updated successfully!");
    } catch (error) {
      console.error("Error updating profile:", error);
      showError("Error updating profile: " + error.message);
    }
  });
}

// Change Profile Image
if (changeProfileImageBtn) {
  changeProfileImageBtn.addEventListener("click", () => {
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "image/*";

    fileInput.addEventListener("change", async (e) => {
      if (e.target.files.length > 0) {
        const file = e.target.files[0];

        try {
          // Upload image to Cloudinary
          const profileImageUrl = await uploadImageToCloudinary(file);

          // Update user profile in Firestore
          await db.collection("guides").doc(auth.currentUser.uid).update({
            profileImageUrl,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
          });

          // Update auth profile (Firebase Authentication)
          await auth.currentUser.updateProfile({
            photoURL: profileImageUrl,
          });

          // Update UI
          document.getElementById("profileImage").src = profileImageUrl;
          headerUserProfile.querySelector(".user-avatar").src = profileImageUrl;

          alert("Profile image updated successfully!");
        } catch (error) {
          console.error("Error updating profile image:", error);
          showError("Error updating profile image: " + error.message);
        }
      }
    });

    fileInput.click();
  });
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
        showError("Logout failed: " + error.message);
      });
  });
}

// Helper function to show error messages
function showError(message) {
  const errorElement = document.getElementById("errorMessage");
  if (errorElement) {
    errorElement.textContent = message;
    errorElement.classList.remove("hidden");
    
    // Hide after 5 seconds
    setTimeout(() => {
      errorElement.classList.add("hidden");
    }, 5000);
  }
}

// Filter bookings by status
document.addEventListener("DOMContentLoaded", function () {
  const statusFilter = document.getElementById("bookingStatusFilter");

  if (statusFilter) {
    statusFilter.addEventListener("change", function () {
      const status = this.value.toLowerCase();
      const bookingCards = document.querySelectorAll(".booking-card");

      bookingCards.forEach((card) => {
        const cardStatus = card
          .querySelector(".status")
          .textContent.toLowerCase();

        if (status === "all" || cardStatus === status) {
          card.style.display = "block";
        } else {
          card.style.display = "none";
        }
      });
    });
  }
});