// --- public/loyalty/firebase-loyalty-config.js ---
// Initializes Firebase for the customer loyalty portal.
// Uses environment variables with fallback to hardcoded values for backwards compatibility

const firebaseConfig = {
    apiKey: window.env?.VITE_FIREBASE_API_KEY || import.meta?.env?.VITE_FIREBASE_API_KEY || "AIzaSyA4hS3texgNpdQbjj8QIECY4n0Nl3SWwTo",
    authDomain: window.env?.VITE_FIREBASE_AUTH_DOMAIN || import.meta?.env?.VITE_FIREBASE_AUTH_DOMAIN || "friez-burgz.firebaseapp.com",
    projectId: window.env?.VITE_FIREBASE_PROJECT_ID || import.meta?.env?.VITE_FIREBASE_PROJECT_ID || "friez-burgz",
    storageBucket: window.env?.VITE_FIREBASE_STORAGE_BUCKET || import.meta?.env?.VITE_FIREBASE_STORAGE_BUCKET || "friez-burgz.firebasestorage.app",
    messagingSenderId: window.env?.VITE_FIREBASE_MESSAGING_SENDER_ID || import.meta?.env?.VITE_FIREBASE_MESSAGING_SENDER_ID || "369360939966",
    appId: window.env?.VITE_FIREBASE_APP_ID || import.meta?.env?.VITE_FIREBASE_APP_ID || "1:369360939966:web:760d870c8c0f2a8f6667ef",
    measurementId: window.env?.VITE_FIREBASE_MEASUREMENT_ID || import.meta?.env?.VITE_FIREBASE_MEASUREMENT_ID || "G-67WXCWCC2X"
};

// Initialize Firebase app if it hasn't been already
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// Get Firebase service instances
export const auth = firebase.auth();
export const db = firebase.firestore();
export const functions = firebase.functions(); // Export functions instance

