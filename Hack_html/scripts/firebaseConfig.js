// js/firebaseConfig.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.5.0/firebase-app.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/11.5.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyD5rFAiero8rbuxxqgNj9H68Cw8EPPMoJ8",
  authDomain: "project1---flexicoach.firebaseapp.com",
  databaseURL: "https://project1---flexicoach-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "project1---flexicoach",
  storageBucket: "project1---flexicoach.firebasestorage.app",
  messagingSenderId: "914467553944",
  appId: "1:914467553944:web:3e8e698d21408ab9d346ed",
  measurementId: "G-BQJCVHH5N5"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

export { database };
