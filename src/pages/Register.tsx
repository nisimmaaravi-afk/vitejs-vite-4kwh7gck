// src/pages/Register.tsx
import React, { useState } from 'react';
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from '../services/firebase';

interface RegisterProps {
  braceletId: string;
}

export default function Register({ braceletId }: RegisterProps) {
  // --- STATE ---
  const [formData, setFormData] = useState<any>({ 
    name: '', personalId: '', patientPhone: '', emergencyPhone: '', story: '' 
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // --- לוגיקה: הרשמה והעלאת נתונים ---
  const handleRegister = async () => {
    if (!formData.name || !formData.personalId) return alert("חובה למלא שם ותעודת זהות");
    setIsUploading(true);
    
    try {
      let photoUrl = "";
      if (imageFile) {
        // העלאת תמונה ל-Storage
        const imgRef = ref(storage, `patients/${braceletId}_${Date.now()}`);
        await uploadBytes(imgRef, imageFile);
        photoUrl = await getDownloadURL(imgRef);
      }
      
      // שמירת נתונים ב-Firestore
      await addDoc(collection(db, "patients"), { 
        ...formData, 
        braceletId, 
        photoUrl, 
        timestamp: serverTimestamp() 
      });
      
      // רענון הדף כדי להיכנס למצב חירום
      window.location.reload();
    } catch (e) {
      console.error("Register error:", e);
      setIsUploading(false);
      alert("אירעה שגיאה בעת הרישום");
    }
  };

  // --- תצוגה ---
  return (
    <div style={{padding:'20px', direction:'rtl', textAlign:'center'}}>
      <h1 style={{color:'#1a73e8'}}>רישום re-co</h1>
      <div style={cardS}>
        <div onClick={() => document.getElementById('file-in')?.click()} style={{width:100, height:100, borderRadius:'50%', backgroundColor:'#eee', margin:'0 auto 20px', cursor:'pointer', overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center', border:'2px dashed #1a73e8'}}>
          {imagePreview ? <img src={imagePreview} style={{width:'100%', height:'100%', objectFit:'cover'}} alt="" /> : "📸 תמונה"}
        </div>
        
        <input id="file-in" type="file" hidden onChange={e => {
            if (e.target.files && e.target.files[0]) {
              setImageFile(e.target.files[0]);
              setImagePreview(URL.createObjectURL(e.target.files[0]));
            }
        }} />

        <input placeholder="שם מלא" style={inputS} onChange={e=>setFormData({...formData, name: e.target.value})} />
        <input placeholder="תעודת זהות" style={inputS} onChange={e=>setFormData({...formData, personalId: e.target.value})} />
        <input placeholder="טלפון שלך" style={inputS} onChange={e=>setFormData({...formData, patientPhone: e.target.value})} />
        <input placeholder="טלפון איש קשר לחירום" style={inputS} onChange={e=>setFormData({...formData, emergencyPhone: e.target.value})} />
        <textarea placeholder="רקע רפואי / הסיפור שלי" style={{...inputS, height:100}} onChange={e=>setFormData({...formData, story: e.target.value})} />
        
        <button onClick={handleRegister} disabled={isUploading} style={btnS}>
          {isUploading ? "מעלה נתונים..." : "הפעל צמיד"}
        </button>
      </div>
    </div>
  );
}

// --- סגנונות מקומיים ---
const cardS: React.CSSProperties = { backgroundColor:'#fff', padding:'25px', borderRadius:'20px', boxShadow:'0 10px 25px rgba(0,0,0,0.05)', maxWidth:'500px', margin:'0 auto' };
const inputS: React.CSSProperties = { display:'block', width:'100%', padding:'12px', margin:'10px 0', borderRadius:'10px', border:'1px solid #ccc', boxSizing:'border-box' };
const btnS: React.CSSProperties = { width:'100%', padding:'15px', backgroundColor:'#1a73e8', color:'#fff', border:'none', borderRadius:'10px', fontWeight:'bold', cursor:'pointer' };