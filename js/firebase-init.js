// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAr26Qo50TPP5RvNyGDB8pl0bjKdrVLT8I",
  authDomain: "first-part-share.firebaseapp.com",
  projectId: "first-part-share",
  storageBucket: "first-part-share.firebasestorage.app",
  messagingSenderId: "1043908630172",
  appId: "1:1043908630172:web:3591fc06f1e398ef21ff59"
};

// Initialize Firebase (check if already initialized)
let app;
try {
  app = firebase.app();
} catch (e) {
  app = firebase.initializeApp(firebaseConfig);
}

// Initialize services with error handling
const auth = firebase.auth();
const db = firebase.firestore();

// Configure Firestore settings
db.settings({
  cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED,
  ignoreUndefinedProperties: true
});

// Force network mode for real-time updates
db.useEmulator = false;

// Add connection state monitoring
db.enableNetwork().catch((err) => {
  console.error('Firestore network error:', err);
});

// Export for use in other files
window.db = db;
window.auth = auth;

console.log('Firebase initialized successfully'); 