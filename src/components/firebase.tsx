// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries
// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCmAld_x541uob-rnsJqkWRv_74HpX2dsU",
  authDomain: "casazero-a39ba.firebaseapp.com",
  databaseURL: "https://casazero-a39ba-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "casazero-a39ba",
  storageBucket: "casazero-a39ba.firebasestorage.app",
  messagingSenderId: "898881501223",
  appId: "1:898881501223:web:a00dabf851d21abc9fb602",
  measurementId: "G-4BHDS2S4KE"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
