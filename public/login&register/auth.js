
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
const errorMessage = document.getElementById("errorMessage")
const loginForm = document.getElementById("loginForm")
const registerForm = document.getElementById("registerForm")
const forgotPasswordLink = document.getElementById("forgotPassword")

// Helper Functions
function showError(message) {
  if (errorMessage) {
    errorMessage.textContent = message
    errorMessage.classList.remove("hidden")
  } else {
    console.error(message)
  }
}

function hideError() {
  if (errorMessage) {
    errorMessage.classList.add("hidden")
  }
}

// Check if user is already logged in
// auth.onAuthStateChanged((user) => {
//   if (user) {
//     // User is signed in, redirect to dashboard
//     window.location.href = "guide/guiderDashboard.html"
//   }
// })

// Login Form Handler
if (loginForm) {
  loginForm.addEventListener("submit", (e) => {
    e.preventDefault()
    hideError()

    const email = document.getElementById("email").value
    const password = document.getElementById("password").value

    // Sign in with email and password
    auth
      .signInWithEmailAndPassword(email, password)
      .then((userCredential) => {
        // Redirect to dashboard
        window.location.href = "guide/guiderDashboard.html"
      })
      .catch((error) => {
        console.error("Login error:", error)
        showError(`Login failed: ${error.message}`)
      })
  })
}

// Register Form Handler
if (registerForm) {
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideError();

    const fullName = document.getElementById("fullName").value;
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirmPassword").value;
    const phone = document.getElementById("phone").value;
    const location = document.getElementById("location").value;
    const profileImageInput = document.getElementById("profileImage");

    // Validate passwords match
    if (password !== confirmPassword) {
      showError("Passwords do not match");
      return;
    }

    try {
      // Create user with email and password
      const userCredential = await auth.createUserWithEmailAndPassword(email, password);
      const user = userCredential.user;

      // Upload profile image to Cloudinary if provided
      let profileImageUrl = "";
      if (profileImageInput && profileImageInput.files.length > 0) {
        const file = profileImageInput.files[0];
        profileImageUrl = await uploadImageToCloudinary(file);
      }

      // Save user details to Firestore
      await db.collection("guides").doc(user.uid).set({
        fullName,
        email,
        phone,
        location,
        profileImageUrl, 
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        role: "guide",
      });

      // Update user profile in Firebase Auth
      await user.updateProfile({
        displayName: fullName,
        photoURL: profileImageUrl || null,
      });

      // Redirect to dashboard
      window.location.href = "guide/guiderDashboard.html";
    } catch (error) {
      console.error("Registration error:", error);
      showError(`Registration failed: ${error.message}`);
    }
  });
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

// Forgot Password Handler
if (forgotPasswordLink) {
  forgotPasswordLink.addEventListener("click", (e) => {
    e.preventDefault()

    const email = prompt("Please enter your email address:")

    if (email) {
      auth
        .sendPasswordResetEmail(email)
        .then(() => {
          alert("Password reset email sent. Please check your inbox.")
        })
        .catch((error) => {
          console.error("Password reset error:", error)
          alert(`Password reset failed: ${error.message}`)
        })
    }
  })
}

