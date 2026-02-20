import { useEffect, useState, useRef } from 'react';
import { doc, getDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import { 
  Phone, Share2, Heart, VolumeX, Hand, PersonStanding, 
  Moon, BriefcaseMedical, AlertTriangle, X, CheckCircle, Shield 
} from 'lucide-react';

/**
 * Recognition Live - Official Emergency Module
 * מבוסס על העיצוב המקצועי שסיפקת.
 */

interface PatientData {
  fullName?: string;
  firstName?: string;
  lastName?: string;
  emergencyPhone?: string;
  idNumber?: string;
  city?: string;
  photoURL?: string;
  notes?: string;
}

export default function Emergency({ tagId }: { tagId: string }) {
  const [patient, setPatient] = useState<PatientData | null>(null);
  const [reportSubmitted, setReportSubmitted] = useState(false);
  const [showReportForm, setShowReportForm] = useState(false);
  const [reportData, setReportData] = useState({ outcome: 'calmed_down', notes: '' });
  
  const startTimeRef = useRef(Date.now());

  const getFirstName = (name: string): string => {
    if (!name) return "המטופל";
    return name.trim().split(' ')[0];
  };

  useEffect(() => {
    const fetchPatient = async () => {
      if (!tagId) return;
      const docSnap = await getDoc(doc(db, "users", tagId));
      if (docSnap.exists()) setPatient(docSnap.data() as PatientData);
    };
    fetchPatient();
  }, [tagId]);

  // יציאה מאובטחת לאחר 15 שניות
  useEffect(() => {
    if (reportSubmitted) {
      const timer = setTimeout(() => {
        window.location.replace('https://www.google.com');
      }, 15000);
      return () => clearTimeout(timer);
    }
  }, [reportSubmitted]);

  const submitReport = async () => {
    try {
      await addDoc(collection(db, 'system_logs'), {
        action: 'EVENT_RESOLVED', 
        details: tagId,
        outcome: reportData.outcome,
        notes: reportData.notes,
        timestamp: serverTimestamp(),
        user: 'Scanner'
      });
      setReportSubmitted(true);
    } catch (e) {
      console.error("Error submitting report", e);
    }
  };

  if (!patient) return <div className="flex h-screen items-center justify-center font-sans">טוען נתונים...</div>;

  const firstName = getFirstName(patient.fullName || patient.firstName || "");

  // --- מסך תודה מעוצב (באותה שפה עיצובית) ---
  if (reportSubmitted) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6 text-center" dir="rtl">
        <div className="bg-white p-10 rounded-[2rem] shadow-xl border border-slate-100 max-w-md w-full animate-in zoom-in">
          <CheckCircle size={80} className="text-green-500 mx-auto mb-6 animate-bounce" />
          <h2 className="text-3xl font-black text-slate-900 mb-4">תודה רבה!</h2>
          <p className="text-lg text-slate-600 mb-8">
            <span className="font-bold text-slate-900">{firstName}</span> מודה לך מקרב לב על העזרה. האירוע נסגר בבטחה.
          </p>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div className="bg-green-500 h-full animate-progress origin-right"></div>
          </div>
          <p className="text-xs text-slate-400 mt-4">מנקה נתונים ויוצא בעוד 15 שניות...</p>
        </div>
        <style>{`@keyframes progress { 0% { transform: scaleX(0); } 100% { transform: scaleX(1); } } .animate-progress { animation: progress 15s linear forwards; }`}</style>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans text-slate-900 pb-10" dir="ltr">
      {/* Header */}
      <header className="bg-white p-4 flex justify-between items-center border-b border-slate-200 sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <Shield className="text-blue-600" size={24} />
          <span className="font-black text-lg tracking-tighter">RECO <span className="text-blue-600 uppercase">Emergency</span></span>
        </div>
        <div className="flex items-center gap-2">
          <span className="bg-red-100 text-red-600 text-[10px] font-black px-2 py-1 rounded-full animate-pulse">
            ● ACTIVE EMERGENCY MODE
          </span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 md:p-8">
        <h1 className="text-3xl font-black mb-1">Emergency Profile: {patient.fullName}</h1>
        <p className="text-slate-400 text-xs mb-8 flex items-center gap-1">
          🕒 Last scan: {new Date().toLocaleDateString()} (Location: {patient.city || 'Israel'})
        </p>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          
          {/* Left Side: Image & What Helps */}
          <div className="md:col-span-5 space-y-6">
            <div className="relative rounded-[2rem] overflow-hidden shadow-2xl aspect-square bg-slate-200">
              {patient.photoURL ? (
                <img src={patient.photoURL} alt="Patient" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold">IMAGE</div>
              )}
              <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent text-white">
                <h2 className="text-2xl font-black">{patient.fullName}</h2>
                <p className="text-xs opacity-80 uppercase font-bold tracking-widest">PTSD Bracelet Carrier</p>
              </div>
            </div>

            <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100">
              <h3 className="font-black text-lg flex items-center gap-2 mb-4 text-blue-600">
                <Heart size={20} fill="currentColor" /> What helps me
              </h3>
              <div className="space-y-3">
                {[
                  { icon: VolumeX, t: "Talk to me softly", d: "Keep your voice low and calm." },
                  { icon: Hand, t: "Please don't touch me", d: "Physical contact can trigger a reaction." },
                  { icon: PersonStanding, t: "Give me 5 feet of space", d: "Keep distance unless immediate danger." },
                  { icon: Moon, t: "Move to a quiet area", d: "Avoid bright lights or loud noises." }
                ].map((item, i) => (
                  <div key={i} className="flex gap-4 p-4 bg-slate-50 rounded-2xl items-center">
                    <item.icon className="text-blue-500 shrink-0" size={20} />
                    <div>
                      <h4 className="font-bold text-sm">{item.t}</h4>
                      <p className="text-[11px] text-slate-500">{item.d}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Side: Actions & Protocol */}
          <div className="md:col-span-7 space-y-4">
            
            {/* Action Buttons */}
            <a href={`tel:${patient.emergencyPhone}`} className="block bg-blue-600 hover:bg-blue-700 transition-colors rounded-[1.5rem] p-6 text-white shadow-xl shadow-blue-500/20">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <p className="text-[10px] font-black opacity-70 tracking-widest uppercase">Emergency Contact</p>
                  <h2 className="text-2xl font-black">Call Contact</h2>
                </div>
                <div className="bg-white/20 p-3 rounded-full"><Phone size={24} /></div>
              </div>
              <div className="text-center font-black text-xs bg-white/10 py-2 rounded-xl">TAP TO CALL NOW</div>
            </a>

            <button className="w-full bg-cyan-500 rounded-[1.5rem] p-6 text-white shadow-xl shadow-cyan-500/20 flex justify-between items-center">
               <div>
                  <p className="text-[10px] font-black opacity-70 tracking-widest uppercase">Live Tracking</p>
                  <h2 className="text-xl font-black">Share Location</h2>
               </div>
               <div className="bg-white/20 p-3 rounded-full animate-pulse"><Share2 size={24} /></div>
            </button>

            {/* Protocol Section */}
            <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100 mt-6">
              <h3 className="font-black text-lg flex items-center gap-2 mb-6">
                <BriefcaseMedical className="text-blue-600" size={20} /> How to help (Responder Protocol)
              </h3>
              <div className="space-y-8">
                {[
                  { n: "1", t: "Stay with me", d: "Remain present and visible. Do not leave me alone." },
                  { n: "2", t: "Call and share location", d: "Inform contact that I'm having a PTSD episode." },
                  { n: "3", t: "Check for medical ID", d: "Check my phone Health App for allergy info." }
                ].map((step, i) => (
                  <div key={i} className="flex gap-6 items-start">
                    <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-black shrink-0">{step.n}</div>
                    <div>
                      <h4 className="font-bold text-slate-900">{step.t}</h4>
                      <p className="text-sm text-slate-500 leading-relaxed">{step.d}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Critical Alert */}
              <div className="mt-10 bg-red-50 p-5 rounded-2xl border border-red-100 flex gap-4">
                <AlertTriangle className="text-red-500 shrink-0" size={24} />
                <div>
                  <h4 className="text-red-700 font-black text-sm uppercase">Critical Medical Info</h4>
                  <p className="text-sm text-slate-800 font-medium mt-1">{patient.notes || 'No critical info provided.'}</p>
                </div>
              </div>
            </div>

            <button onClick={() => setShowReportForm(true)} className="w-full py-4 text-slate-400 text-xs font-bold hover:text-slate-900 underline">
              ✅ Mark event as resolved / End event
            </button>
          </div>
        </div>
      </main>

      {/* Footer Quote */}
      <footer className="mt-12 p-8 border-t border-slate-200 text-center bg-white">
        <p className="text-lg font-bold text-slate-800 italic mb-4" dir="rtl">
          "פוסט טראומה היא תווית שלא מבקשים, אבל הכרה היא תווית שכולנו ראויים לה."
        </p>
        <div className="flex justify-center gap-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
           <span>Privacy Policy</span>
           <span>Terms of Service</span>
           <span>© 2026 Recognition Live Systems</span>
        </div>
      </footer>

      {/* Report Form Overlay */}
      {showReportForm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4" dir="rtl">
          <div className="bg-white rounded-[2.5rem] p-10 w-full max-w-md shadow-2xl relative animate-in slide-in-from-bottom">
            <button onClick={() => setShowReportForm(false)} className="absolute top-6 left-6 text-slate-400 hover:text-slate-900"><X size={24} /></button>
            <h3 className="text-slate-900 font-black text-2xl text-center mb-6">סיום אירוע</h3>
            <label className="font-bold block mb-2 text-slate-700 text-sm">כיצד הסתיים האירוע?</label>
            <select 
              value={reportData.outcome} 
              onChange={(e) => setReportData({...reportData, outcome: e.target.value})}
              className="w-full p-4 rounded-2xl border-2 border-slate-100 mb-6 text-lg bg-slate-50 outline-none focus:border-blue-500"
            >
              <option value="calmed_down">✅ הרגעה במקום</option>
              <option value="family_arrived">👨‍👩‍👧‍👦 הגעת בן משפחה</option>
              <option value="ambulance">🚑 פינוי באמבולנס</option>
              <option value="police">🚓 גורמי ביטחון</option>
              <option value="refused_help">❌ סירב לקבל עזרה</option>
            </select>
            <button onClick={submitReport} className="w-full py-5 bg-green-500 hover:bg-green-600 text-white rounded-[2rem] font-black text-xl shadow-lg transition-transform active:scale-95">שלח וסיים אירוע</button>
          </div>
        </div>
      )}
    </div>
  );
}