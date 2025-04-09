// Import Firebase modules
import firebase from "firebase/app"
import "firebase/auth"
import "firebase/firestore"

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAqLxHtBeS8QfEJfZFuaD4wsC45I2xJFDc",
  authDomain: "sri-traveler.firebaseapp.com",
  projectId: "sri-traveler",
  storageBucket: "sri-traveler.firebasestorage.app",
  messagingSenderId: "996309776080",
  appId: "1:996309776080:web:21135debfdaca5e3c850d5",
}

// Initialize Firebase if not already initialized
try {
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig)
    console.log("Firebase initialized successfully")
  }
} catch (e) {
  console.error("Firebase initialization error:", e.message)
}

// Initialize Firebase services
const auth = firebase.auth()
const db = firebase.firestore()

// DOM Elements
const notificationBell = document.querySelector(".notification-btn")
const notificationBadge = document.querySelector(".notification-badge")
const notificationsDropdown = document.getElementById("notificationsDropdown")
const notificationsList = document.getElementById("notificationsList")
const markAllReadBtn = document.getElementById("markAllReadBtn")

// Global variables
let unreadCount = 0
let notificationsListener = null

// Load notifications
function loadNotifications() {
  if (!auth.currentUser) return

  // Clear previous listener if exists
  if (notificationsListener) {
    notificationsListener()
  }

  // Set up real-time listener for notifications
  notificationsListener = db
    .collection("notifications")
    .where("userId", "==", auth.currentUser.uid)
    .orderBy("createdAt", "desc")
    .limit(10)
    .onSnapshot(
      (snapshot) => {
        if (snapshot.empty) {
          updateNotificationsList([])
          return
        }

        const notifications = []
        unreadCount = 0

        snapshot.forEach((doc) => {
          const notification = {
            id: doc.id,
            ...doc.data(),
          }

          if (!notification.read) {
            unreadCount++
          }

          notifications.push(notification)
        })

        updateNotificationsList(notifications)
        updateNotificationBadge()
      },
      (error) => {
        console.error("Error loading notifications:", error)
      },
    )
}

// Update notifications list in dropdown
function updateNotificationsList(notifications) {
  if (!notificationsList) return

  if (notifications.length === 0) {
    notificationsList.innerHTML = '<li class="no-notifications">No notifications</li>'
    return
  }

  notificationsList.innerHTML = ""

  notifications.forEach((notification) => {
    const li = document.createElement("li")
    li.className = `notification-item ${notification.read ? "read" : "unread"}`

    // Format date
    const date = notification.createdAt ? notification.createdAt.toDate() : new Date()
    const formattedDate = formatNotificationDate(date)

    // Set icon based on notification type
    let icon = "📌"
    switch (notification.type) {
      case "new_booking":
        icon = "🆕"
        break
      case "booking_update":
        icon = "🔄"
        break
      case "booking_confirmed":
        icon = "✅"
        break
      case "booking_cancelled":
        icon = "❌"
        break
      case "message":
        icon = "💬"
        break
    }

    li.innerHTML = `
      <div class="notification-icon">${icon}</div>
      <div class="notification-content">
        <div class="notification-header">
          <h4>${notification.title}</h4>
          <span class="notification-time">${formattedDate}</span>
        </div>
        <p>${notification.message}</p>
      </div>
      ${!notification.read ? `<button class="mark-read-btn" data-id="${notification.id}">Mark as read</button>` : ""}
    `

    notificationsList.appendChild(li)

    // Add event listener to mark as read button
    const markReadBtn = li.querySelector(".mark-read-btn")
    if (markReadBtn) {
      markReadBtn.addEventListener("click", (e) => {
        e.stopPropagation()
        markNotificationAsRead(notification.id)
      })
    }

    // Add event listener to notification item for navigation
    li.addEventListener("click", () => {
      handleNotificationClick(notification)
    })
  })
}

// Update notification badge count
function updateNotificationBadge() {
  if (!notificationBadge) return

  if (unreadCount > 0) {
    notificationBadge.textContent = unreadCount > 9 ? "9+" : unreadCount
    notificationBadge.classList.remove("hidden")
  } else {
    notificationBadge.classList.add("hidden")
  }
}

// Mark notification as read
async function markNotificationAsRead(notificationId) {
  try {
    await db.collection("notifications").doc(notificationId).update({
      read: true,
    })
    console.log("Notification marked as read")
  } catch (error) {
    console.error("Error marking notification as read:", error)
  }
}

// Mark all notifications as read
async function markAllNotificationsAsRead() {
  if (!auth.currentUser) return

  try {
    const batch = db.batch()

    const unreadNotificationsSnapshot = await db
      .collection("notifications")
      .where("userId", "==", auth.currentUser.uid)
      .where("read", "==", false)
      .get()

    unreadNotificationsSnapshot.forEach((doc) => {
      batch.update(doc.ref, { read: true })
    })

    await batch.commit()
    console.log("All notifications marked as read")
  } catch (error) {
    console.error("Error marking all notifications as read:", error)
  }
}

// Handle notification click
function handleNotificationClick(notification) {
  // Mark as read if not already read
  if (!notification.read) {
    markNotificationAsRead(notification.id)
  }

  // Navigate based on notification type
  switch (notification.type) {
    case "new_booking":
    case "booking_update":
    case "booking_confirmed":
    case "booking_cancelled":
      if (notification.bookingId) {
        // Navigate to booking details
        window.location.href = `booking-details.html?id=${notification.bookingId}`
      } else {
        // Navigate to bookings list
        window.location.href = "bookings.html"
      }
      break
    case "message":
      // Navigate to messages
      window.location.href = "messages.html"
      break
    default:
      // Close dropdown
      toggleNotificationsDropdown(false)
      break
  }
}

// Toggle notifications dropdown
function toggleNotificationsDropdown(show) {
  if (!notificationsDropdown) return

  if (show === undefined) {
    notificationsDropdown.classList.toggle("show")
  } else if (show) {
    notificationsDropdown.classList.add("show")
  } else {
    notificationsDropdown.classList.remove("show")
  }
}

// Format notification date
function formatNotificationDate(date) {
  const now = new Date()
  const diffMs = now - date
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)

  if (diffSec < 60) {
    return "Just now"
  } else if (diffMin < 60) {
    return `${diffMin} min ago`
  } else if (diffHour < 24) {
    return `${diffHour} hr ago`
  } else if (diffDay < 7) {
    return `${diffDay} day${diffDay > 1 ? "s" : ""} ago`
  } else {
    return date.toLocaleDateString()
  }
}

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  // Notification bell click event
  if (notificationBell) {
    notificationBell.addEventListener("click", (e) => {
      e.stopPropagation()
      toggleNotificationsDropdown()
    })
  }

  // Mark all as read button
  if (markAllReadBtn) {
    markAllReadBtn.addEventListener("click", (e) => {
      e.stopPropagation()
      markAllNotificationsAsRead()
    })
  }

  // Close dropdown when clicking outside
  document.addEventListener("click", (e) => {
    if (notificationsDropdown && notificationsDropdown.classList.contains("show")) {
      if (!notificationsDropdown.contains(e.target) && e.target !== notificationBell) {
        toggleNotificationsDropdown(false)
      }
    }
  })
})

// Auth state change listener
auth.onAuthStateChanged((user) => {
  if (user) {
    console.log("User is signed in, loading notifications")
    loadNotifications()
  } else {
    console.log("User is signed out, clearing notifications")
    if (notificationsListener) {
      notificationsListener()
      notificationsListener = null
    }

    if (notificationsList) {
      notificationsList.innerHTML = '<li class="no-notifications">Please log in to view notifications</li>'
    }

    if (notificationBadge) {
      notificationBadge.classList.add("hidden")
    }
  }
})

