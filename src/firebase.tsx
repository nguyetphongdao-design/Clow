import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBRXM2ZXQpJ3I79B2CEHlhKfofoz27ds_E",
  authDomain: "clowcard-32ad7.firebaseapp.com",
  projectId: "clowcard-32ad7",
  storageBucket: "clowcard-32ad7.firebasestorage.app",
  messagingSenderId: "29644632680",
  appId: "1:29644632680:web:4a65cf8cfe254d814181dd"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Xuất các công cụ này ra để dùng ở file khác
export const auth = getAuth(app);
export const db = getFirestore(app);
export const provider = new GoogleAuthProvider();