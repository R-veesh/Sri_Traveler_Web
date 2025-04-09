// Import the Firebase SDKs
import { initializeApp } from "firebase/app"
import { getAuth, onAuthStateChanged } from "firebase/auth"
import {
  getFirestore,
  collection,
  getDocs,
  addDoc,
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
  query,
  where,
  orderBy,
} from "firebase/firestore"

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAqLxHtBeS8QfEJfZFuaD4wsC45I2xJFDc",
  authDomain: "sri-traveler.firebaseapp.com",
  projectId: "sri-traveler",
  storageBucket: "sri-traveler.firebasestorage.app",
  messagingSenderId: "996309776080",
  appId: "1:996309776080:web:21135debfdaca5e3c850d5",
}

// Initialize Firebase
let app
try {
  app = initializeApp(firebaseConfig)
  console.log("Firebase initialized successfully")
} catch (e) {
  console.error("Firebase initialization error:", e.message)
  document.getElementById("errorMessage").textContent = `Firebase initialization error: ${e.message}`
  document.getElementById("errorMessage").classList.remove("hidden")
}

// Initialize Firebase services
const auth = getAuth(app)
const db = getFirestore(app)

// DOM Elements
const bookingForm = document.getElementById("bookingForm")
const tripSelect = document.getElementById("tripSelect")
const startDateInput = document.getElementById("startDate")
const tripDurationInput = document.getElementById("tripDuration")
const bookingsContainer = document.getElementById("bookingsContainer")
const loadingIndicator = document.getElementById("loadingIndicator")
const errorMessage = document.getElementById("errorMessage")

// Load available trips for booking
async function loadAvailableTrips() {
  if (!tripSelect) return

  try {
    tripSelect.innerHTML = '<option value="">Select a trip</option>'

    const tripsSnapshot = await getDocs(collection(db, "trips"))

    if (tripsSnapshot.empty) {
      tripSelect.innerHTML += "<option disabled>No trips available</option>"
      return
    }

    tripsSnapshot.forEach((doc) => {
      const trip = doc.data()
      tripSelect.innerHTML += `<option value="${doc.id}">${trip.tripName} - ${trip.tripPlace}</option>`
    })
  } catch (error) {
    console.error("Error loading trips:", error)
    showError(`Error loading trips: ${error.message}`)
  }
}

// Create a new booking
async function createBooking(event) {
  if (event) event.preventDefault()

  if (!auth.currentUser) {
    showError("You must be logged in to make a booking")
    return
  }

  const tripId = tripSelect.value
  const startDate = new Date(startDateInput.value)
  const tripDuration = Number.parseInt(tripDurationInput.value)

  if (!tripId || isNaN(startDate.getTime()) || isNaN(tripDuration) || tripDuration < 1) {
    showError("Please fill in all fields correctly")
    return
  }

  try {
    showLoading()

    // Get trip details
    const tripDoc = await getDoc(doc(db, "trips", tripId))
    if (!tripDoc.exists()) {
      showError("Selected trip does not exist")
      hideLoading()
      return
    }

    const tripData = tripDoc.data()
    const guideId = tripData.guideId

    // Calculate end date
    const endDate = new Date(startDate)
    endDate.setDate(endDate.getDate() + tripDuration)

    // Create booking
    const bookingData = {
      tripId,
      tripName: tripData.tripName,
      tripPlace: tripData.tripPlace,
      userId: auth.currentUser.uid,
      userEmail: auth.currentUser.email,
      userName: auth.currentUser.displayName || auth.currentUser.email,
      guideId,
      startDate: startDate,
      endDate: endDate,
      tripDuration,
      status: "pending",
      createdAt: serverTimestamp(),
    }

    const bookingRef = await addDoc(collection(db, "bookings"), bookingData)

    // Create notification for guide
    await createNotification(guideId, {
      type: "new_booking",
      title: "New Booking Request",
      message: `New booking request for ${tripData.tripName}`,
      bookingId: bookingRef.id,
      createdAt: serverTimestamp(),
    })

    hideLoading()
    alert("Booking request submitted successfully!")

    // Reset form
    bookingForm.reset()

    // Reload bookings if on bookings page
    if (bookingsContainer) {
      loadUserBookings()
    }
  } catch (error) {
    console.error("Error creating booking:", error)
    showError(`Error creating booking: ${error.message}`)
    hideLoading()
  }
}

// Load user bookings
async function loadUserBookings() {
  if (!bookingsContainer) return

  if (!auth.currentUser) {
    bookingsContainer.innerHTML = '<p class="no-bookings">Please log in to view your bookings</p>'
    return
  }

  try {
    showLoading()

    const bookingsSnapshot = await getDocs(
      query(collection(db, "bookings"), where("userId", "==", auth.currentUser.uid), orderBy("createdAt", "desc")),
    )

    hideLoading()

    if (bookingsSnapshot.empty) {
      bookingsContainer.innerHTML = '<p class="no-bookings">You have no bookings yet</p>'
      return
    }

    bookingsContainer.innerHTML = ""

    bookingsSnapshot.forEach((doc) => {
      const booking = doc.data()
      const bookingCard = createBookingCard(doc.id, booking)
      bookingsContainer.appendChild(bookingCard)
    })
  } catch (error) {
    console.error("Error loading bookings:", error)
    showError(`Error loading bookings: ${error.message}`)
    hideLoading()
  }
}

// Load guide bookings
async function loadGuideBookings() {
  if (!bookingsContainer) return

  if (!auth.currentUser) {
    bookingsContainer.innerHTML = '<p class="no-bookings">Please log in to view bookings</p>'
    return
  }

  try {
    showLoading()

    const bookingsSnapshot = await getDocs(
      query(collection(db, "bookings"), where("guideId", "==", auth.currentUser.uid), orderBy("createdAt", "desc")),
    )

    hideLoading()

    if (bookingsSnapshot.empty) {
      bookingsContainer.innerHTML = '<p class="no-bookings">You have no booking requests</p>'
      return
    }

    bookingsContainer.innerHTML = ""

    bookingsSnapshot.forEach((doc) => {
      const booking = doc.data()
      const bookingCard = createGuideBookingCard(doc.id, booking)
      bookingsContainer.appendChild(bookingCard)
    })
  } catch (error) {
    console.error("Error loading guide bookings:", error)
    showError(`Error loading bookings: ${error.message}`)
    hideLoading()
  }
}

// Create booking card for traveler view
function createBookingCard(bookingId, booking) {
  const card = document.createElement("div")
  card.className = "booking-card"

  // Format dates
  const startDate = booking.startDate.toDate().toLocaleDateString()
  const endDate = booking.endDate.toDate().toLocaleDateString()

  // Set status class
  let statusClass = ""
  switch (booking.status) {
    case "confirmed":
      statusClass = "status-confirmed"
      break
    case "cancelled":
      statusClass = "status-cancelled"
      break
    case "completed":
      statusClass = "status-completed"
      break
    default:
      statusClass = "status-pending"
  }

  card.innerHTML = `
    <div class="booking-header">
      <h3>${booking.tripName}</h3>
      <span class="booking-status ${statusClass}">${booking.status}</span>
    </div>
    <div class="booking-details">
      <p><strong>Location:</strong> ${booking.tripPlace}</p>
      <p><strong>Dates:</strong> ${startDate} to ${endDate}</p>
      <p><strong>Duration:</strong> ${booking.tripDuration} days</p>
    </div>
    <div class="booking-actions">
      ${booking.status === "pending" ? `<button class="btn secondary cancel-booking-btn" data-id="${bookingId}">Cancel Request</button>` : ""}
      ${booking.status === "confirmed" ? `<button class="btn primary contact-guide-btn" data-id="${bookingId}">Contact Guide</button>` : ""}
    </div>
  `

  // Add event listeners
  setTimeout(() => {
    const cancelBtn = card.querySelector(".cancel-booking-btn")
    if (cancelBtn) {
      cancelBtn.addEventListener("click", () => cancelBooking(bookingId))
    }

    const contactBtn = card.querySelector(".contact-guide-btn")
    if (contactBtn) {
      contactBtn.addEventListener("click", () => contactGuide(booking.guideId))
    }
  }, 0)

  return card
}

// Create booking card for guide view
function createGuideBookingCard(bookingId, booking) {
  const card = document.createElement("div")
  card.className = "booking-card"

  // Format dates
  const startDate = booking.startDate.toDate().toLocaleDateString()
  const endDate = booking.endDate.toDate().toLocaleDateString()

  // Set status class
  let statusClass = ""
  switch (booking.status) {
    case "confirmed":
      statusClass = "status-confirmed"
      break
    case "cancelled":
      statusClass = "status-cancelled"
      break
    case "completed":
      statusClass = "status-completed"
      break
    default:
      statusClass = "status-pending"
  }

  card.innerHTML = `
    <div class="booking-header">
      <h3>${booking.tripName}</h3>
      <span class="booking-status ${statusClass}">${booking.status}</span>
    </div>
    <div class="booking-details">
      <p><strong>Traveler:</strong> ${booking.userName}</p>
      <p><strong>Location:</strong> ${booking.tripPlace}</p>
      <p><strong>Dates:</strong> ${startDate} to ${endDate}</p>
      <p><strong>Duration:</strong> ${booking.tripDuration} days</p>
    </div>
    <div class="booking-actions">
      ${
        booking.status === "pending"
          ? `
        <button class="btn primary confirm-booking-btn" data-id="${bookingId}">Confirm</button>
        <button class="btn secondary reject-booking-btn" data-id="${bookingId}">Reject</button>
      `
          : ""
      }
      ${
        booking.status === "confirmed"
          ? `
        <button class="btn primary contact-traveler-btn" data-id="${bookingId}">Contact Traveler</button>
        <button class="btn secondary complete-booking-btn" data-id="${bookingId}">Mark as Completed</button>
      `
          : ""
      }
    </div>
  `

  // Add event listeners
  setTimeout(() => {
    const confirmBtn = card.querySelector(".confirm-booking-btn")
    if (confirmBtn) {
      confirmBtn.addEventListener("click", () => updateBookingStatus(bookingId, "confirmed"))
    }

    const rejectBtn = card.querySelector(".reject-booking-btn")
    if (rejectBtn) {
      rejectBtn.addEventListener("click", () => updateBookingStatus(bookingId, "cancelled"))
    }

    const completeBtn = card.querySelector(".complete-booking-btn")
    if (completeBtn) {
      completeBtn.addEventListener("click", () => updateBookingStatus(bookingId, "completed"))
    }

    const contactBtn = card.querySelector(".contact-traveler-btn")
    if (contactBtn) {
      contactBtn.addEventListener("click", () => contactTraveler(booking.userId))
    }
  }, 0)

  return card
}

// Update booking status
async function updateBookingStatus(bookingId, newStatus) {
  if (!confirm(`Are you sure you want to ${newStatus} this booking?`)) {
    return
  }

  try {
    showLoading()

    // Get booking data
    const bookingDoc = await getDoc(doc(db, "bookings", bookingId))
    if (!bookingDoc.exists()) {
      showError("Booking not found")
      hideLoading()
      return
    }

    const bookingData = bookingDoc.data()

    // Update booking status
    await updateDoc(doc(db, "bookings", bookingId), {
      status: newStatus,
      updatedAt: serverTimestamp(),
    })

    // Create notification for traveler
    await createNotification(bookingData.userId, {
      type: "booking_update",
      title: `Booking ${newStatus.charAt(0).toUpperCase() + newStatus.slice(1)}`,
      message: `Your booking for ${bookingData.tripName} has been ${newStatus}`,
      bookingId: bookingId,
      createdAt: serverTimestamp(),
    })

    hideLoading()
    alert(`Booking ${newStatus} successfully!`)

    // Reload bookings
    loadGuideBookings()
  } catch (error) {
    console.error(`Error updating booking status to ${newStatus}:`, error)
    showError(`Error updating booking: ${error.message}`)
    hideLoading()
  }
}

// Cancel booking (for traveler)
async function cancelBooking(bookingId) {
  if (!confirm("Are you sure you want to cancel this booking request?")) {
    return
  }

  try {
    showLoading()

    // Get booking data
    const bookingDoc = await getDoc(doc(db, "bookings", bookingId))
    if (!bookingDoc.exists()) {
      showError("Booking not found")
      hideLoading()
      return
    }

    const bookingData = bookingDoc.data()

    // Update booking status
    await updateDoc(doc(db, "bookings", bookingId), {
      status: "cancelled",
      updatedAt: serverTimestamp(),
    })

    // Create notification for guide
    await createNotification(bookingData.guideId, {
      type: "booking_cancelled",
      title: "Booking Cancelled",
      message: `Booking for ${bookingData.tripName} has been cancelled by the traveler`,
      bookingId: bookingId,
      createdAt: serverTimestamp(),
    })

    hideLoading()
    alert("Booking cancelled successfully!")

    // Reload bookings
    loadUserBookings()
  } catch (error) {
    console.error("Error cancelling booking:", error)
    showError(`Error cancelling booking: ${error.message}`)
    hideLoading()
  }
}

// Contact functions (placeholder)
function contactGuide(guideId) {
  alert(`Contact functionality will be implemented soon. Guide ID: ${guideId}`)
}

function contactTraveler(travelerId) {
  alert(`Contact functionality will be implemented soon. Traveler ID: ${travelerId}`)
}

// Create notification
async function createNotification(userId, notificationData) {
  try {
    await addDoc(collection(db, "notifications"), {
      userId,
      ...notificationData,
      read: false,
    })
    console.log("Notification created successfully")
  } catch (error) {
    console.error("Error creating notification:", error)
  }
}

// Helper functions
function showLoading() {
  if (loadingIndicator) {
    loadingIndicator.classList.remove("hidden")
  }
}

function hideLoading() {
  if (loadingIndicator) {
    loadingIndicator.classList.add("hidden")
  }
}

function showError(message) {
  if (errorMessage) {
    errorMessage.textContent = message
    errorMessage.classList.remove("hidden")

    // Auto hide after 5 seconds
    setTimeout(() => {
      errorMessage.classList.add("hidden")
    }, 5000)
  } else {
    console.error(message)
  }
}

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  // Check if on booking form page
  if (bookingForm) {
    loadAvailableTrips()
    bookingForm.addEventListener("submit", createBooking)
  }

  // Check if on bookings page
  if (bookingsContainer) {
    const userType = document.body.dataset.userType
    if (userType === "guide") {
      loadGuideBookings()
    } else {
      loadUserBookings()
    }
  }
})

// Auth state change listener
onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log("User is signed in:", user.uid)

    // If on bookings page, load bookings
    if (bookingsContainer) {
      const userType = document.body.dataset.userType
      if (userType === "guide") {
        loadGuideBookings()
      } else {
        loadUserBookings()
      }
    }
  } else {
    console.log("User is signed out")

    // If on bookings page, show login message
    if (bookingsContainer) {
      bookingsContainer.innerHTML = '<p class="no-bookings">Please log in to view your bookings</p>'
    }
  }
})

