// src/services/firebase.ts
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// הגדרות החיבור לפיירבייס
const firebaseConfig = {
  apiKey: "AIzaSyARLYiBAULEaOAObakGerEGsIHSo8M6t9o",
  authDomain: "recognition-live.firebaseapp.com",
  projectId: "recognition-live",
  storageBucket: "recognition-live.firebasestorage.app",
  messagingSenderId: "721239181692",
  appId: "1:721239181692:web:9572e23343a592876dbcf9"
};

// אתחול האפליקציה ושירותים
const app = initializeApp(firebaseConfig);

// אנחנו מייצאים (export) את המשתנים האלו כדי שנוכל להשתמש בהם בקבצים אחרים
export const db = getFirestore(app);
export const storage = getStorage(app);