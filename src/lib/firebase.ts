// Firebase initialization for IITH Power System
import { initializeApp } from "firebase/app";
import { getDatabase, ref, onValue, set, update } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyBmoodbrLxTP1QQWnylOOHg-0Aq2ySd6_c",
  authDomain: "iith-power-system.firebaseapp.com",
  databaseURL: "https://iith-power-system-default-rtdb.firebaseio.com",
  projectId: "iith-power-system",
  storageBucket: "iith-power-system.firebasestorage.app",
  messagingSenderId: "539268402656",
  appId: "1:539268402656:web:72e59c66d5d10dbe482f85",
  measurementId: "G-WPV2HCYNPP",
};

export const firebaseApp = initializeApp(firebaseConfig);
export const db = getDatabase(firebaseApp);

// Helpers used by LabContext
export const tablesRef = ref(db, "tables");
export const recordsRef = ref(db, "records");

export { ref, onValue, set, update };
