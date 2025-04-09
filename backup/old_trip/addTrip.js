// Import Firebase (if using modules) - Adjust the path as needed
// import firebase from 'firebase/app';
// import 'firebase/firestore';

// If using CDN, firebase is already a global variable.  No import needed.
// If not using CDN, uncomment the import statements above and adjust the path.

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

// Initialize Firestore
const db = firebase.firestore();
console.log("Firestore initialized");

// DOM Elements
const addTripBtn = document.getElementById("addTripBtn");
const addTripForm = document.getElementById("addTripForm");
const tripForm = document.getElementById("tripForm");
const cancelBtn = document.getElementById("cancelBtn");
const tripsContainer = document.getElementById("tripsContainer");
const loadingIndicator = document.getElementById("loadingIndicator");
const errorMessage = document.getElementById("errorMessage");

addTripBtn.addEventListener("click", () => {
  addTripForm.classList.remove("hidden"); 
  // ove("hidden");
});

cancelBtn.addEventListener("click", () => {
  addTripForm.classList.add("hidden");
  tripForm.reset();
});


document.getElementById("tripForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  await saveTrip();
});

async function saveTrip() {
  const fileInput = document.getElementById("tripImagePath");
  const file = fileInput.files[0]; 

  if (!file) {
    alert("Please select an image to upload.");
    return;
  }

  try {
    // Upload image to Cloudinary
    const imageUrl = await uploadImageToCloudinary(file);

    // Save trip details to Firebase Firestore
    save_Trip(imageUrl);
  } catch (error) {
    console.error("Image upload failed:", error);
    alert("Image upload failed. Please try again.");
  }
}

// Function to upload image to Cloudinary
async function uploadImageToCloudinary(file) {
  const cloudinaryUrl = `https://api.cloudinary.com/v1_1/dtgie8eha/image/upload`; 
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", "trip_image"); 

  const response = await fetch(cloudinaryUrl, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) throw new Error("Failed to upload image");

  const data = await response.json();
  return data.secure_url; 
}

// Function to save trip details in Firestore
function save_Trip(imageUrl) {
  const tripName = document.getElementById("tripName").value.trim();
  const tripCode = document.getElementById("tripCode").value.trim();
  const tripPlace = document.getElementById("tripPlace").value.trim();
  const tripPrice = document.getElementById("tripPrice").value.trim();
  const tripDescription = document.getElementById("tripDescription").value.trim();

  if (!tripName || !tripCode || !tripPlace || !tripPrice || !tripDescription) {
    alert("Please fill in all fields before submitting.");
    return;
  }

  const newTrip = {
    tripName,
    tripCode,
    tripPlace,
    tripPrice,
    tripImagePath: imageUrl,
    tripDescription,
    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
  };

  console.log("Saving trip:", newTrip);

  // Add to Firestore
  db.collection("trips")
    .add(newTrip)
    .then((docRef) => {
      console.log("Trip added successfully with ID:", docRef.id);
      tripForm.reset();
      addTripForm.classList.add("hidden"); 
      loadTrips(); 
    })
    .catch((error) => {
      console.error("Error adding trip:", error);
      alert("Error adding trip: " + error.message);
    });
}


// Load trips from Firestore
function loadTrips() {
  console.log("Loading trips...");
  loadingIndicator.classList.remove("hidden");
  errorMessage.classList.add("hidden");
  tripsContainer.innerHTML = "";

  // Set a timeout to prevent infinite loading
  const loadingTimeout = setTimeout(() => {
    console.log("Loading timeout triggered");
    loadingIndicator.classList.add("hidden");
    errorMessage.textContent =
      "Loading timed out. Please check your connection and refresh.";
    errorMessage.classList.remove("hidden");
  }, 10000);

  db.collection("trips")
    .get()
    .then((querySnapshot) => {
      clearTimeout(loadingTimeout);
      console.log("Query completed, documents:", querySnapshot.size);
      loadingIndicator.classList.add("hidden");

      if (querySnapshot.size > 0) {
        // Convert to array of trips
        const trips = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        console.log("Trips data:", trips);
        displayTrips(trips);
      } else {
        console.log("No trips found, adding default trip");
        // If no trips exist, add the Negombo trip

        db.collection("trips")
          .add(negomboTrip)
          .then(() => {
            console.log("Initial trip added");
            // Reload trips after adding the initial one
            loadTrips();
          })
          .catch((error) => {
            console.error("Error adding initial trip: ", error);
            errorMessage.textContent = `Error adding initial trip: ${error.message}`;
            errorMessage.classList.remove("hidden");
          });
      }
    })
    .catch((error) => {
      clearTimeout(loadingTimeout);
      console.error("Error loading trips: ", error);
      loadingIndicator.classList.add("hidden");
      errorMessage.textContent = `Error loading trips: ${error.message}`;
      errorMessage.classList.remove("hidden");
    });
}

// Display trips in the UI
function displayTrips(trips) {
  console.log("Displaying trips:", trips.length);
  tripsContainer.innerHTML = "";

  if (trips.length === 0) {
    tripsContainer.innerHTML = '<p class="no-trips">No trips found.</p>';
    return;
  }

  trips.forEach((trip) => {
    const tripCard = document.createElement("div");
    tripCard.className = "trip-card";

    // Use placeholder if image path doesn't start with http
    const imageSrc =
      trip.tripImagePath && trip.tripImagePath.startsWith("http")
        ? trip.tripImagePath
        : "https://placehold.co/400x200?text=Trip+Image";

    tripCard.innerHTML = `
            <div class="trip-image">
                <img src="${imageSrc}" alt="${
      trip.tripName || "Trip"
    }" onerror="this.src='https://placehold.co/400x200?text=Image+Not+Found'">
            </div>
            <div class="trip-content">
                <div class="trip-header">
                    <h3 class="trip-name">${
                      trip.tripName || "Unnamed Trip"
                    }</h3>
                    <p class="trip-place">${
                      trip.tripPlace || "Unknown Location"
                    }</p>
                </div>
                <div class="trip-details">
                    <span class="trip-code">Code: ${
                      trip.tripCode || "N/A"
                    }</span>
                    <span class="trip-price">${
                      trip.tripPrice || "Price not available"
                    }</span>
                </div>
                <p class="trip-description">${
                  trip.tripDescription || "No description available."
                }</p>
            </div>
        `;

    tripsContainer.appendChild(tripCard);
  });
}

// Initialize the app
document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM loaded, initializing app");
  loadTrips();
});
