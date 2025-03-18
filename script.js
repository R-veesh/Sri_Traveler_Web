// Import Firebase (if using modules) - uncomment if needed
// import firebase from 'firebase/app';
// import 'firebase/database';

// Or, if using CDN, ensure Firebase is loaded before this script

// Firebase configuration - replace with your own
const firebaseConfig = {
  apiKey: "AIzaSyAqLxHtBeS8QfEJfZFuaD4wsC45I2xJFDc",
  authDomain: "sri-traveler.firebaseapp.com",
  projectId: "sri-traveler",
  storageBucket: "sri-traveler.firebasestorage.app",
  messagingSenderId: "996309776080",
  appId: "1:996309776080:web:21135debfdaca5e3c850d5",
  databaseURL: "https://sri-traveler-default-rtdb.asia-southeast1.firebasedatabase.app",
}

// Initialize Firebase
try {
  firebase.initializeApp(firebaseConfig)
} catch (e) {
  console.error("Firebase initialization error:", e.message)
}
const database = firebase.database()

// DOM Elements
const addTripBtn = document.getElementById("addTripBtn")
const addTripForm = document.getElementById("addTripForm")
const tripForm = document.getElementById("tripForm")
const cancelBtn = document.getElementById("cancelBtn")
const tripsContainer = document.getElementById("tripsContainer")
const loadingIndicator = document.getElementById("loadingIndicator")

// Event Listeners
addTripBtn.addEventListener("click", () => {
  addTripForm.classList.remove("hidden")
})

cancelBtn.addEventListener("click", () => {
  addTripForm.classList.add("hidden")
  tripForm.reset()
})

tripForm.addEventListener("submit", (e) => {
  e.preventDefault()
  saveTrip()
})

// Functions
function saveTrip() {
  const newTrip = {
    tripName: document.getElementById("tripName").value,
    tripCode: document.getElementById("tripCode").value,
    tripPlace: document.getElementById("tripPlace").value,
    tripPrice: document.getElementById("tripPrice").value,
    tripImagePath: document.getElementById("tripImagePath").value,
    tripDescription: document.getElementById("tripDescription").value,
  }

  // Push to Firebase
  const tripsRef = database.ref("trips")
  tripsRef
    .push(newTrip)
    .then(() => {
      console.log("Trip added successfully")
      tripForm.reset()
      addTripForm.classList.add("hidden")
    })
    .catch((error) => {
      console.error("Error adding trip: ", error)
      alert("Error adding trip. Please try again.")
    })
}

// Load trips from Firebase
function loadTrips() {
  loadingIndicator.classList.remove("hidden")
  tripsContainer.innerHTML = ""

  const tripsRef = database.ref("trips")

  tripsRef.on(
    "value",
    (snapshot) => {
      loadingIndicator.classList.add("hidden")

      const data = snapshot.val()

      if (data) {
        // Convert object to array
        const tripsArray = Object.entries(data).map(([id, trip]) => ({
          id,
          ...trip,
        }))

        displayTrips(tripsArray)
      } else {
        // If no trips exist, add the Negombo trip
        const negomboTrip = {
          tripImagePath: "assets/nigambo.jpg",
          tripName: "Negombo",
          tripCode: "5003",
          tripPlace: "Negombo, Western Province",
          tripPrice: "2000LKR",
          tripDescription:
            "Negombo is a coastal city famous for its pristine beaches, Dutch canal network, and vibrant fishing community.",
        }

        tripsRef
          .push(negomboTrip)
          .then(() => {
            console.log("Initial trip added")
          })
          .catch((error) => {
            console.error("Error adding initial trip: ", error)
          })
      }
    },
    (error) => {
      loadingIndicator.classList.add("hidden")
      console.error("Error loading trips: ", error)
      tripsContainer.innerHTML = `<p class="error">Error loading trips. Please refresh the page.</p>`
    },
  )
}

// Display trips in the UI
function displayTrips(trips) {
  tripsContainer.innerHTML = ""

  trips.forEach((trip) => {
    const tripCard = document.createElement("div")
    tripCard.className = "trip-card"

    // Use placeholder if image path doesn't start with http
    const imageSrc = trip.tripImagePath.startsWith("http")
      ? trip.tripImagePath
      : "https://placehold.co/400x200?text=Trip+Image"

    tripCard.innerHTML = `
            <div class="trip-image">
                <img src="${imageSrc}" alt="${trip.tripName}" onerror="this.src='https://placehold.co/400x200?text=Image+Not+Found'">
            </div>
            <div class="trip-content">
                <div class="trip-header">
                    <h3 class="trip-name">${trip.tripName}</h3>
                    <p class="trip-place">${trip.tripPlace}</p>
                </div>
                <div class="trip-details">
                    <span class="trip-code">Code: ${trip.tripCode}</span>
                    <span class="trip-price">${trip.tripPrice}</span>
                </div>
                <p class="trip-description">${trip.tripDescription}</p>
            </div>
        `

    tripsContainer.appendChild(tripCard)
  })
}

// Initialize the app
document.addEventListener("DOMContentLoaded", () => {
  loadTrips()
})

