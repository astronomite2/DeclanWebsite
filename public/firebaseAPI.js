// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-analytics.js";
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAjtEas2YKUfHIjGZ-5zYabsPnSSPflOSo",
  authDomain: "declanhub-f31ea.firebaseapp.com",
  projectId: "declanhub-f31ea",
  storageBucket: "declanhub-f31ea.appspot.com",
  messagingSenderId: "489191847305",
  appId: "1:489191847305:web:518a221218ea9b7eaa5d58",
  measurementId: "G-ZMF0HD318T"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);

// Get a reference to the "students" collection
const studentsCollection = collection(db, "students");

// Get all documents from the collection
let data;
getDocs(studentsCollection)
  .then((querySnapshot) => {
    querySnapshot.forEach((doc) => {
      data = doc.data();
      console.log(doc.id, " => ", data);
    });
  })
  .catch((error) => {
    console.log("Error getting documents: ", error);
  });

