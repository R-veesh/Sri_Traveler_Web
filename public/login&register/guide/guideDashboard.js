
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
const auth = firebase.auth()
const db = firebase.firestore()
const storage = firebase.storage ? firebase.storage() : null

// DOM Elements
const logoutBtn = document.getElementById("logoutBtn")
const headerUserProfile = document.getElementById("headerUserProfile")
const sidebarNavLinks = document.querySelectorAll(".sidebar-nav a")
const dashboardSections = document.querySelectorAll(".dashboard-section")
const mobileAppLink = document.getElementById("mobileAppLink")
const addTripBtn = document.getElementById("addTripBtn")
const addNewTripBtn = document.getElementById("addNewTripBtn")
const addTripForm = document.getElementById("addTripForm")
const closeTripFormBtn = document.getElementById("closeTripFormBtn")
const tripForm = document.getElementById("tripForm")
const tripsContainer = document.getElementById("tripsContainer")
const editProfileBtn = document.getElementById("editProfileBtn")
const profileEditForm = document.getElementById("profileEditForm")
const editProfileForm = document.getElementById("editProfileForm")
const cancelEditBtn = document.getElementById("cancelEditBtn")
const changeProfileImageBtn = document.getElementById("changeProfileImageBtn")

// Check if user is logged in
auth.onAuthStateChanged((user) => {
  if (user) {
    // User is signed in
    console.log("User is signed in:", user.uid)
    loadUserProfile(user)
    loadUserTrips(user.uid)
  } else {
    // User is signed out, redirect to login
    window.location.href = "login.html"
  }
})

// Load user profile
async function loadUserProfile(user) {
  try {
    // Update header user profile
    if (headerUserProfile) {
      const userNameElement = headerUserProfile.querySelector(".user-name")
      const userAvatarElement = headerUserProfile.querySelector(".user-avatar")

      if (userNameElement) {
        userNameElement.textContent = user.displayName || "Guide"
      }

      if (userAvatarElement && user.photoURL) {
        userAvatarElement.src = user.photoURL
      }
    }

    // Get user data from Firestore
    const guideDoc = await db.collection("guides").doc(user.uid).get()

    if (guideDoc.exists) {
      const guideData = guideDoc.data()

      // Update profile section
      document.getElementById("profileName").textContent = guideData.fullName || "Guide"
      document.getElementById("locationText").textContent = guideData.location || "No location set"
      document.getElementById("emailText").textContent = guideData.email || user.email
      document.getElementById("phoneText").textContent = guideData.phone || "No phone number set"

      if (guideData.bio) {
        document.getElementById("profileBio").textContent = guideData.bio
      }

      if (guideData.profileImageUrl) {
        document.getElementById("profileImage").src = guideData.profileImageUrl
      }

      // Update languages
      if (guideData.languages) {
        const languagesContainer = document.getElementById("profileLanguages")
        languagesContainer.innerHTML = ""

        const languages =
          typeof guideData.languages === "string" ? guideData.languages.split(",") : guideData.languages || []

        languages.forEach((language) => {
          const tag = document.createElement("span")
          tag.className = "tag"
          tag.textContent = language.trim()
          languagesContainer.appendChild(tag)
        })
      }

      // Update specialties
      if (guideData.specialties) {
        const specialtiesContainer = document.getElementById("profileSpecialties")
        specialtiesContainer.innerHTML = ""

        const specialties =
          typeof guideData.specialties === "string" ? guideData.specialties.split(",") : guideData.specialties || []

        specialties.forEach((specialty) => {
          const tag = document.createElement("span")
          tag.className = "tag"
          tag.textContent = specialty.trim()
          specialtiesContainer.appendChild(tag)
        })
      }

      // Populate edit form
      if (editProfileForm) {
        document.getElementById("editFullName").value = guideData.fullName || ""
        document.getElementById("editPhone").value = guideData.phone || ""
        document.getElementById("editLocation").value = guideData.location || ""
        document.getElementById("editBio").value = guideData.bio || ""
        document.getElementById("editLanguages").value =
          typeof guideData.languages === "string" ? guideData.languages : (guideData.languages || []).join(", ")
        document.getElementById("editSpecialties").value =
          typeof guideData.specialties === "string" ? guideData.specialties : (guideData.specialties || []).join(", ")
      }
    }
  } catch (error) {
    console.error("Error loading user profile:", error)
  }
}

// Load user trips
async function loadUserTrips(userId) {
  if (!tripsContainer) return

  try {
    tripsContainer.innerHTML = '<div class="loading"><div class="spinner"></div></div>'

    const tripsSnapshot = await db.collection("trips").where("guideId", "==", userId).orderBy("createdAt", "desc").get()

    tripsContainer.innerHTML = ""

    if (tripsSnapshot.empty) {
      tripsContainer.innerHTML = `
        <div class="no-trips">
          <p>You haven't created any trips yet.</p>
          <button id="createFirstTripBtn" class="btn primary">Create Your First Trip</button>
        </div>
      `

      document.getElementById("createFirstTripBtn").addEventListener("click", () => {
        addTripForm.classList.remove("hidden")
      })

      return
    }

    tripsSnapshot.forEach((doc) => {
      const trip = doc.data()
      const tripCard = createTripCard(doc.id, trip)
      tripsContainer.appendChild(tripCard)
    })
  } catch (error) {
    console.error("Error loading trips:", error)
    tripsContainer.innerHTML = `<p class="error-message">Error loading trips: ${error.message}</p>`
  }
}

// Create trip card
function createTripCard(tripId, trip) {
  const tripCard = document.createElement("div")
  tripCard.className = "trip-card"

  const imageSrc =
    trip.tripImagePath && trip.tripImagePath.startsWith("http")
      ? trip.tripImagePath
      : "https://placehold.co/400x200?text=Trip+Image"

  tripCard.innerHTML = `
    <div class="trip-image">
      <img src="${imageSrc}" alt="${trip.tripName || "Trip"}" 
        onerror="this.src='https://placehold.co/400x200?text=Image+Not+Found'">
    </div>
    <div class="trip-content">
      <div class="trip-header">
        <h3 class="trip-name">${trip.tripName || "Unnamed Trip"}</h3>
        <p class="trip-place">${trip.tripPlace || "Unknown Location"}</p>
      </div>
      <div class="trip-details">
        <span class="trip-code">Code: ${trip.tripCode || "N/A"}</span>
        <span class="trip-price">${trip.tripPrice || "Price not available"}</span>
      </div>
      <p class="trip-description">${trip.tripDescription || "No description available."}</p>
      <div class="trip-actions">
        <button class="btn secondary edit-trip-btn" data-trip-id="${tripId}">Edit</button>
        <button class="btn secondary delete-trip-btn" data-trip-id="${tripId}">Delete</button>
      </div>
    </div>
  `

  // Add event listeners for edit and delete buttons
  const editBtn = tripCard.querySelector(".edit-trip-btn")
  const deleteBtn = tripCard.querySelector(".delete-trip-btn")

  editBtn.addEventListener("click", () => {
    // Implement edit trip functionality
    alert(`Edit trip: ${tripId}`)
  })

  deleteBtn.addEventListener("click", () => {
    if (confirm("Are you sure you want to delete this trip?")) {
      deleteTrip(tripId)
    }
  })

  return tripCard
}

// Delete trip
async function deleteTrip(tripId) {
  try {
    await db.collection("trips").doc(tripId).delete()
    alert("Trip deleted successfully")

    // Reload trips
    loadUserTrips(auth.currentUser.uid)
  } catch (error) {
    console.error("Error deleting trip:", error)
    alert(`Error deleting trip: ${error.message}`)
  }
}

// Navigation
sidebarNavLinks.forEach((link) => {
  link.addEventListener("click", (e) => {
    e.preventDefault()

    const targetSection = link.getAttribute("data-section")

    // Update active link
    sidebarNavLinks.forEach((navLink) => {
      navLink.parentElement.classList.remove("active")
    })
    link.parentElement.classList.add("active")

    // Show target section
    dashboardSections.forEach((section) => {
      section.classList.remove("active")
    })
    document.getElementById(targetSection).classList.add("active")
  })
})

// Mobile App Link
if (mobileAppLink) {
  mobileAppLink.addEventListener("click", (e) => {
    e.preventDefault()

    // Implement deep linking to mobile app
    // For now, just show an alert
    alert("Mobile app integration coming soon!")
  })
}

// Add Trip Button
if (addTripBtn) {
  addTripBtn.addEventListener("click", () => {
    addTripForm.classList.remove("hidden")
  })
}

if (addNewTripBtn) {
  addNewTripBtn.addEventListener("click", () => {
    addTripForm.classList.remove("hidden")
  })
}

if (closeTripFormBtn) {
  closeTripFormBtn.addEventListener("click", () => {
    addTripForm.classList.add("hidden")
    tripForm.reset()
  })
}

// Trip Form Submission
if (tripForm) {
  tripForm.addEventListener("submit", async (e) => {
    e.preventDefault()

    const tripName = document.getElementById("tripName").value
    const tripCode = document.getElementById("tripCode").value
    const tripPlace = document.getElementById("tripPlace").value
    const tripPrice = document.getElementById("tripPrice").value
    const tripDuration = document.getElementById("tripDuration").value
    const tripDescription = document.getElementById("tripDescription").value
    const tripImageInput = document.getElementById("tripImage")

    try {
      // Upload image if provided
      let tripImagePath = ""
      if (tripImageInput && tripImageInput.files.length > 0) {
        const file = tripImageInput.files[0]
        const storageRef = storage.ref()
        const fileRef = storageRef.child(`trip-images/${auth.currentUser.uid}/${Date.now()}_${file.name}`)

        await fileRef.put(file)
        tripImagePath = await fileRef.getDownloadURL()
      }

      // Create trip in Firestore
      await db.collection("trips").add({
        tripName,
        tripCode,
        tripPlace,
        tripPrice,
        tripDuration,
        tripDescription,
        tripImagePath,
        guideId: auth.currentUser.uid,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      })

      // Reset form and hide modal
      tripForm.reset()
      addTripForm.classList.add("hidden")

      // Reload trips
      loadUserTrips(auth.currentUser.uid)

      alert("Trip added successfully!")
    } catch (error) {
      console.error("Error adding trip:", error)
      alert(`Error adding trip: ${error.message}`)
    }
  })
}

// Edit Profile
if (editProfileBtn) {
  editProfileBtn.addEventListener("click", () => {
    profileEditForm.classList.remove("hidden")
  })
}

if (cancelEditBtn) {
  cancelEditBtn.addEventListener("click", () => {
    profileEditForm.classList.add("hidden")
  })
}

// Edit Profile Form Submission
if (editProfileForm) {
  editProfileForm.addEventListener("submit", async (e) => {
    e.preventDefault()

    const fullName = document.getElementById("editFullName").value
    const phone = document.getElementById("editPhone").value
    const location = document.getElementById("editLocation").value
    const bio = document.getElementById("editBio").value
    const languages = document.getElementById("editLanguages").value
    const specialties = document.getElementById("editSpecialties").value

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
      })

      // Update user display name
      await auth.currentUser.updateProfile({
        displayName: fullName,
      })

      // Hide form
      profileEditForm.classList.add("hidden")

      // Reload user profile
      loadUserProfile(auth.currentUser)

      alert("Profile updated successfully!")
    } catch (error) {
      console.error("Error updating profile:", error)
      alert(`Error updating profile: ${error.message}`)
    }
  })
}

// Change Profile Image
if (changeProfileImageBtn) {
  changeProfileImageBtn.addEventListener("click", () => {
    const fileInput = document.createElement("input")
    fileInput.type = "file"
    fileInput.accept = "image/*"

    fileInput.addEventListener("change", async (e) => {
      if (e.target.files.length > 0) {
        const file = e.target.files[0]

        try {
          // Upload image
          const storageRef = storage.ref()
          const fileRef = storageRef.child(`profile-images/${auth.currentUser.uid}/${Date.now()}_${file.name}`)

          await fileRef.put(file)
          const profileImageUrl = await fileRef.getDownloadURL()

          // Update user profile
          await db.collection("guides").doc(auth.currentUser.uid).update({
            profileImageUrl,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
          })

          // Update auth profile
          await auth.currentUser.updateProfile({
            photoURL: profileImageUrl,
          })

          // Update UI
          document.getElementById("profileImage").src = profileImageUrl
          headerUserProfile.querySelector(".user-avatar").src = profileImageUrl

          alert("Profile image updated successfully!")
        } catch (error) {
          console.error("Error updating profile image:", error)
          alert(`Error updating profile image: ${error.message}`)
        }
      }
    })

    fileInput.click()
  })
}

// Logout
if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    auth
      .signOut()
      .then(() => {
        window.location.href = "login.html"
      })
      .catch((error) => {
        console.error("Logout error:", error)
        alert(`Logout failed: ${error.message}`)
      })
  })
}

