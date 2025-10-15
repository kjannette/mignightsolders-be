// Firebase Admin SDK configuration for backend
const { initializeApp } = require("firebase/app");
const { getFirestore } = require("firebase/firestore");

// NOTE: Add these to your secrets.js file:
// FIREBASE_API_KEY, FIREBASE_AUTH_DOMAIN, FIREBASE_PROJECT_ID, 
// FIREBASE_STORAGE_BUCKET, FIREBASE_MESSAGING_SENDER_ID, FIREBASE_APP_ID

// For now, using environment variables or default config
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || "your-api-key",
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || "your-auth-domain",
  projectId: process.env.FIREBASE_PROJECT_ID || "your-project-id",
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "your-storage-bucket",
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "your-messaging-sender-id",
  appId: process.env.FIREBASE_APP_ID || "your-app-id",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig, "backend");
const db = getFirestore(app);

console.log("Firebase initialized for backend with project:", firebaseConfig.projectId);

module.exports = {
  db,
  app
};

