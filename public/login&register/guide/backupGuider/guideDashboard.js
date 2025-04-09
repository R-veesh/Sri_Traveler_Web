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
  document.getElementById(
    "errorMessage"
  ).textContent = `Firebase initialization error: ${e.message}`;
  document.getElementById("errorMessage").classList.remove("hidden");
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
const loadingIndicator = document.querySelector(".loading-indicator");

// Check if user is logged in
auth.onAuthStateChanged((user) => {
  if (user) {
    // User is signed in
    console.log("User is signed in:", user.uid);
    loadUserProfile(user);
    fetchTrips();
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
    // Show loading indicator
    if (loadingIndicator) {
      loadingIndicator.classList.remove("hidden");
    }

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
        alert(`Edit functionality for trip: ${tripId}`);
        // Implement edit functionality here
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
  } finally {
    // Hide loading indicator
    if (loadingIndicator) {
      loadingIndicator.classList.add("hidden");
    }
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

//-------------------------------------------------------------------------------

//this function is booked for future use
// document.addEventListener("DOMContentLoaded", function () {
//   const statusFilter = document.getElementById("bookingStatusFilter");

//   if (statusFilter) {
//     statusFilter.addEventListener("change", function () {
//       const status = this.value;
//       loadBookings(status);  // Call loadBookings with the selected status filter
//     });
//   }

//   // Initially load all bookings
//   loadBookings("all");
// });

//createBookingCard
// function createBookingCard(booking) {
//   // Create the booking card HTML structure
//   const card = document.createElement("div");
//   card.classList.add("booking-card");

//   const tripRef = db.collection("trips").doc(booking.tripId); // Use the trip ID to get trip details
//   tripRef.get().then((tripDoc) => {
//     const trip = tripDoc.data();
//     const guideRef = db.collection("guides").doc(trip.guideId); // Fetch guide info based on guideId
//     guideRef.get().then((guideDoc) => {
//       const guide = guideDoc.data();

//       // Add booking details to the card
//       card.innerHTML = `
//         <div class="booking-header">
//           <h3>${trip.tripName}</h3>
//           <p><strong>Guide:</strong> ${guide.fullName}</p>
//           <p><strong>Status:</strong> <span class="booking-status">${booking.status}</span></p>
//           <p><strong>Start Date:</strong> ${new Date(booking.startDate).toLocaleDateString()}</p>
//           <p><strong>End Date:</strong> ${new Date(booking.endDate).toLocaleDateString()}</p>
//         </div>
//         <div class="booking-footer">
//           <p><strong>Duration:</strong> ${trip.tripDuration} days</p>
//           <p><strong>User:</strong> ${booking.userId}</p>
//         </div>
//       `;
//     });
//   });

//   return card;
// }

// Function to create booking card
function loadBookings(statusFilter = "all") {
  const bookingsContainer = document.getElementById("bookingsContainer");
  bookingsContainer.innerHTML = ""; // Clear existing bookings
  const loadingIndicator = document.getElementById("loadingIndicator");
  loadingIndicator.classList.remove("hidden");

  // Fetch the bookings from Firestore
  db.collection("bookings")
    .get()
    .then((querySnapshot) => {
      loadingIndicator.classList.add("hidden");

      querySnapshot.forEach((doc) => {
        const booking = doc.data();
        const bookingStatus = booking.status.toLowerCase();

        // Filter bookings based on the selected status
        if (statusFilter === "all" || bookingStatus === statusFilter) {
          const bookingCard = createBookingCard(booking);
          bookingsContainer.appendChild(bookingCard);
        }
      });
    })
    .catch((error) => {
      console.error("Error fetching bookings: ", error);
      const errorMessage = document.getElementById("errorMessage");
      errorMessage.classList.remove("hidden");
      errorMessage.textContent = "Failed to load bookings. Please try again later.";
    });
}
//------------------------------------------------------------------------------

// Function to fetch bookings from Firestore
// function fetchBookings() {
//   const bookingsContainer = document.getElementById('bookingsContainer');
//   const loadingIndicator = document.getElementById('loadingIndicator');
//   const errorMessage = document.getElementById('errorMessage');
//   const upcomingBookingsCount= document.getElementById('UpcomingBookingsCount');
  
//   loadingIndicator.classList.remove('hidden');
//   errorMessage.classList.add('hidden');
//   let upcomingCount = 0;
  


//   db.collection('bookings').get()
//     .then(snapshot => {
//       loadingIndicator.classList.add('hidden');
      
//       if (snapshot.empty) {
//         errorMessage.textContent = "No bookings found.";
//         errorMessage.classList.remove('hidden');
//         if (upcomingBookingsCount) {
//           upcomingBookingsCount.textContent = "0";
//         }
//         return;
//       }
      
//       const now = new Date();
//       snapshot.forEach(doc => {
//         const bookingId = doc.id;
//         const bookingData = doc.data();
        
//         //trip data
//         const findTrip = db.collection('trips').doc(bookingData.tripId);
//         findTrip.get().then(tripDoc => {
//           const tripData = tripDoc.data();
//           bookingData.tripName = tripData.tripName || "Unknown Trip";
//           bookingData.tripPlace = tripData.tripPlace || "Unknown Place";
//           bookingData.tripDuration = tripData.tripDuration || "N/A";
//           bookingData.tripPrice = tripData.tripPrice || "N/A";
//           bookingData.tripImagePath = tripData.tripImagePath || "https://placehold.co/400x200?text=Trip+Image";
//           bookingData.tripDescription = tripData.tripDescription || "No description available.";
//         });
//         //user data
//         const findGuide = db.collection('users').doc(bookingData.userId);
//         findGuide.get().then(guideDoc => {
//           const guideData = guideDoc.data();
//           bookingData.userName = guideData.fullName || "Unknown User";
//           bookingData.userEmail = guideData.email || "No email available";
//           bookingData.userPhone = guideData.phone || "No phone number available";
//         });
        
//         // Create booking card
//         const bookingCard = createBookingCard(bookingData,bookingId);
//         bookingsContainer.appendChild(bookingCard);
        
//         // Check if the booking is upcoming
//         if (bookingData.startDate && bookingData.startDate.seconds) {
//           const startDate = new Date(bookingData.startDate.seconds * 1000);
//           if (startDate > now) {
//             upcomingCount++;
//           }
//         }
//       });

//       // Update upcoming bookings count
//       if (upcomingBookingsCount) {
//         upcomingBookingsCount.textContent = upcomingCount.toString();
//       }
//     })
//     .catch(error => {
//       loadingIndicator.classList.add('hidden');
//       errorMessage.textContent = `Error loading bookings: ${error.message}`;
//       errorMessage.classList.remove('hidden');

      
//     if(UpcomingBookingsCount) {
//       UpcomingBookingsCount.textContent = "0";
//     }
//     });
    
// }
function fetchBookings() {
  const bookingsContainer = document.getElementById('bookingsContainer');
  const loadingIndicator = document.getElementById('loadingIndicator');
  const errorMessage = document.getElementById('errorMessage');
  const upcomingBookingsCount = document.getElementById('UpcomingBookingsCount');

  loadingIndicator.classList.remove('hidden');
  errorMessage.classList.add('hidden');
  let upcomingCount = 0;

  db.collection('bookings').get()
    .then(snapshot => {
      loadingIndicator.classList.add('hidden');

      if (snapshot.empty) {
        errorMessage.textContent = "No bookings found.";
        errorMessage.classList.remove('hidden');
        if (upcomingBookingsCount) {
          upcomingBookingsCount.textContent = "0";
        }
        return;
      }

      const now = new Date();
      const promises = [];

      snapshot.forEach(doc => {
        const bookingId = doc.id;
        const bookingData = doc.data();

        const tripPromise = db.collection('trips').doc(bookingData.tripId).get();
        const userPromise = db.collection('users').doc(bookingData.userId).get();

        const combinedPromise = Promise.all([tripPromise, userPromise]).then(([tripDoc, guideDoc]) => {
          const tripData = tripDoc.exists ? tripDoc.data() : {};
          const guideData = guideDoc.exists ? guideDoc.data() : {};

          bookingData.tripName = tripData.tripName || "Unknown Trip";
          bookingData.tripPlace = tripData.tripPlace || "Unknown Place";
          bookingData.tripDuration = tripData.tripDuration || "N/A";
          bookingData.tripPrice = tripData.tripPrice || "N/A";
          bookingData.tripImagePath = tripData.tripImagePath || "https://placehold.co/400x200?text=Trip+Image";
          bookingData.tripDescription = tripData.tripDescription || "No description available.";

          bookingData.userName = guideData.fullName || "Unknown User";
          bookingData.userEmail = guideData.email || "No email available";
          bookingData.userPhone = guideData.phone || "No phone number available";

          // Count upcoming
          if (bookingData.startDate && bookingData.startDate.seconds) {
            const startDate = new Date(bookingData.startDate.seconds * 1000);
            if (startDate > now) {
              upcomingCount++;
            }
          }

          const bookingCard = createBookingCard(bookingData, bookingId);
          bookingsContainer.appendChild(bookingCard);
        });

        promises.push(combinedPromise);
      });

      // Wait for all async operations
      return Promise.all(promises).then(() => {
        if (upcomingBookingsCount) {
          upcomingBookingsCount.textContent = upcomingCount.toString();
        }
      });
    })
    .catch(error => {
      loadingIndicator.classList.add('hidden');
      errorMessage.textContent = `Error loading bookings: ${error.message}`;
      errorMessage.classList.remove('hidden');

      if (upcomingBookingsCount) {
        upcomingBookingsCount.textContent = "0";
      }
    });
}



// Function to create a booking card
function createBookingCard(bookingData,bookingId) {
  const card = document.createElement('div');
  card.classList.add('booking-card');

  // Booking Info
  const bookingInfo = document.createElement('div');
  bookingInfo.classList.add('booking-info');
  bookingInfo.innerHTML = `
    <h3>Booking ID: ${bookingId}</h3>
    <p>User: ${bookingData.userName}</p>
    <p>Place: ${bookingData.tripName}</p>
    <p>Start Date: ${new Date(bookingData.startDate.seconds * 1000).toLocaleDateString()}</p>
    <p>End Date: ${new Date(bookingData.endDate.seconds * 1000).toLocaleDateString()}</p>
    <p>Status: <span class="status">${bookingData.status}</span></p>
    <p>Trip: ${bookingData.tripName}</p>
  `;

  // Add to card
  card.appendChild(bookingInfo);
  
  return card;
}

// Call the fetchBookings function when the page loads
document.addEventListener('DOMContentLoaded', fetchBookings);

// Filter bookings by status
document.addEventListener("DOMContentLoaded", function () {
  const statusFilter = document.getElementById("bookingStatusFilter");

  if (statusFilter) {
    statusFilter.addEventListener("change", function () {
      const status = this.value;
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