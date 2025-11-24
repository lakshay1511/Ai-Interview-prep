// firebase/client.ts
import { initializeApp, getApp, getApps } from "firebase/app";
import { getAuth, signInAnonymously } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// ✅ Corrected storage bucket URL (.app → .appspot.com)
const firebaseConfig = {
  apiKey: "AIzaSyBXFxZ2pIvLjbxwkryOZ8ZfDnJbNknoV9M",
  authDomain: "prepshape-e47ce.firebaseapp.com",
  projectId: "prepshape-e47ce",
  storageBucket: "prepshape-e47ce.appspot.com",
  messagingSenderId: "552388968021",
  appId: "1:552388968021:web:a0237b26b7ad486572dedc",
  measurementId: "G-JVXS1S9HSV",
};

// ✅ Fix: use getApps().length instead of getApps.length
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// ✅ Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// ✅ Automatically sign in anonymously (important for Firestore/Storage rules)
signInAnonymously(auth).catch((error) => {
  console.error("Anonymous sign-in failed:", error);
});

export default app;
