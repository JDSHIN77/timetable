import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCEhB9Jx9sBzgoF_TBvp9dRdAK3TuMbvCw",
  authDomain: "gimhaehr21.firebaseapp.com",
  projectId: "gimhaehr21",
  storageBucket: "gimhaehr21.firebasestorage.app",
  messagingSenderId: "770539850742",
  appId: "1:770539850742:web:696f36c2a795748fb515d7"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

export default app;
