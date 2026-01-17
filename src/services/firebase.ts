import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// הגדרות החיבור שלך (מהתמונה ששלחת)
const firebaseConfig = {
  apiKey: "AIzaSyARlYiBAULEaOAObakGerEGsIHSo8M6t9o",
  authDomain: "recognition-live.firebaseapp.com",
  projectId: "recognition-live",
  storageBucket: "recognition-live.firebasestorage.app",
  messagingSenderId: "721239181692",
  appId: "1:721239181692:web:9572e23343a592876dbcf9",
  measurementId: "G-5VWKMPD20K"
};

// אתחול האפליקציה והדאטה-בייס
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);