import { db } from './firebase';
import { collection, addDoc } from 'firebase/firestore';

export const logAction = async (user: string, action: string, details: string) => {
  try {
    await addDoc(collection(db, 'system_logs'), {
      timestamp: new Date(),
      user: user,
      action: action,
      details: details,
      userAgent: navigator.userAgent
    });
    console.log(`LOG: [${user}] ${action}`);
  } catch (error) {
    console.error("Failed to write log:", error);
  }
};