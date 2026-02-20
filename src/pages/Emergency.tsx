import { useEffect, useState, useRef } from 'react';
import { doc, getDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import { Shield, CheckCircle, Phone, X, Share2, Heart, VolumeX, Hand, PersonStanding, Moon, BriefcaseMedical, AlertTriangle } from 'lucide-react';

/**
 * Recognition Live - Official Emergency Module
 * Update: Added branding quote to footer.
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
  const [showReportForm, setShowReportForm] = useState(false);
  const [reportData, setReportData] = useState({ outcome: 'calmed_down', notes: '' });
  const [reportSubmitted, setReportSubmitted] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{lat: number, lng: number} | null>(null);
  
  const startTimeRef = useRef(Date.now());

  const getFirstName = (name: string): string => {
    if (!name) return "המטופל";
    return name.trim().split(' ')[0];
  };

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setCurrentLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        });
      }, (err) => console.log("Location access denied"));
    }
  }, []);

  useEffect(() => {
    const fetchPatient = async () => {
      if (!tagId) return;
      const docSnap = await getDoc(doc(db, "users", tagId));
      if (docSnap.exists()) setPatient(docSnap.data() as PatientData);
    };
    fetchPatient();

    const checkTimeElapsed = () => {
        if (reportSubmitted) return;
        const now = Date.now();
        if (now - startTimeRef.current >= 3600000) setShowReportForm(true);
    };

    const interval = setInterval(checkTimeElapsed, 60000);
    const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') checkTimeElapsed();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
        clearInterval(interval);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [tagId, reportSubmitted]);

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
        location: currentLocation,
        user: 'Scanner'
      });
      setReportSubmitted(true);
    } catch (e) {
      console.error("Error submitting report", e);
    }
  };

  if (!patient) return <div className="min-h-screen flex items-center justify-center font-sans bg-slate-50">טוען נתונים...</div>;

  const firstName = getFirstName(patient.fullName || patient.firstName || "");
  const fullName = patient.fullName || `${patient.firstName} ${patient.lastName}`;

  if (reportSubmitted) {
    return (
      <div className="min-h-screen bg-slate-50 font-sans flex flex-col" dir="ltr">
        <header className="bg-white p-4 flex justify-between items-center border-b border-slate-200">
          <div className="flex items-center gap-2">
            <span className="font-black text-blue-600 text-xl tracking-tighter">RECO <span className="text-slate-900">EMERGENCY</span></span>
          </div>
        </header>

        <main className="flex-grow flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-8 shadow-lg border border-slate-100 max-w-md w-full text-center animate-in zoom-in duration-500">
            <div className="mb-6 relative flex justify-center">
               <div className="bg-green-50 p-4 rounded-full z-10 relative">
                 <CheckCircle size={80} className="text-green-500 animate-bounce" />
               </div>
               <div className="absolute inset-0 bg-green-500/20 rounded-full animate-ping scale-110"></div>
            </div>

            <h2 className="text-3xl font-black text-slate-900 mb-4">Report Submitted</h2>
            <p className="text-lg text-slate-600 leading-relaxed mb-8">
               <span className="font-bold text-slate-900">{firstName}</span> thanks you for your help. The event has been securely closed.
            </p>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
               <div className="flex items-center justify-center gap-2 text-slate-500 text-sm mb-3">
                  <Shield size={16} />
                  <span>Securely clearing data & exiting...</span>
               </div>
               <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div className="bg-green-500 h-full animate-progress origin-left"></div>
               </div>
            </div>
          </div>
        </main>
        
        <footer className="p-6 text-center border-t border-slate-200 bg-white">
          <p className="text-sm font-medium text-slate-600 mb-2 italic" dir="rtl">
            "פוסט טראומטי היא תווית שלא מבקשים, אבל הכרה היא תווית שכולנו ראויים לה."
          </p>
          <p className="text-[10px] text-slate-400">© {new Date().getFullYear()} Recognition Live Systems</p>
        </footer>

        <style>{`
          @keyframes progress { 0% { transform: scaleX(0); } 100% { transform: scaleX(1); } }
          .animate-progress { animation: progress 15s linear forwards; }
        `}</style>
      </div>
    );
  }

  const helpsMeData = [
    { icon: VolumeX, title: "Talk to me softly", desc: "Keep your voice low and calm, even if I seem distressed." },
    { icon: Hand, title: "Please don't touch me", desc: "Physical contact can trigger a stronger reaction. Keep distance." },
    { icon: PersonStanding, title: "Give me 5 feet of space", desc: "Provide personal space unless immediate safety is at risk." },
    { icon: Moon, title: "Move to a quiet area", desc: "Avoid bright lights or loud sirens if possible." },
  ];

  return (
    <div className="min-h-screen bg-slate-50 font-sans" dir="ltr">
      <header className="bg-white p-4 flex justify-between items-center border-b border-slate-200">
        <div className="flex items-center gap-2">
          <span className="font-black text-blue-600 text-xl tracking-tighter">RECO <span className="text-slate-900">EMERGENCY</span></span>
          <span className="bg-red-100 text-red-600 text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
            <span className="w-2 h-2 bg-red-600 rounded-full animate-pulse"></span> ACTIVE EMERGENCY MODE
          </span>
        </div>
        <button onClick={() => setShowReportForm(true)} className="text-slate-400 hover:text-slate-600">
          <X size={24} />
        </button>
      </header>

      <main className="max-w-6xl mx-auto p-4 md:p-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-3">
          <h1 className="text-3xl font-bold text-slate-900">Emergency Profile: {fullName}</h1>
          <p className="text-slate-500 text-sm flex items-center gap-1">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span> Last scan: Just now (Location: {patient.city || 'Unknown'})
          </p>
        </div>

        <div className="md:col-span-1 space-y-6">
          <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100">
            <div className="h-64 bg-slate-200">
              {patient.photoURL ? (
                <img src={patient.photoURL} alt={fullName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-400"><span className="text-6xl">👤</span></div>
              )}
            </div>
            <div className="p-4 bg-slate-900 text-white">
              <h2 className="text-xl font-bold">{fullName}</h2>
              <p className="text-sm opacity-80">PTSD Bracelet Carrier</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2 mb-4">
              <Heart className="text-blue-500" size={20} /> What helps me
            </h3>
            <div className="space-y-3">
              {helpsMeData.map((item, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
                  <item.icon className="text-blue-500 shrink-0" size={20} />
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">{item.title}</h4>
                    <p className="text-xs text-slate-500">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="md:col-span-2 space-y-6">
          <a href={`tel:${patient.emergencyPhone}`} className="block bg-blue-600 rounded-2xl p-6 text-white shadow-md hover:bg-blue-700 transition-colors relative overflow-hidden group">
            <div className="relative z-10 flex justify-between items-center">
              <div>
                <p className="text-sm opacity-80 mb-1">EMERGENCY CONTACT</p>
                <h2 className="text-2xl font-bold">Emergency Contact</h2>
                <p className="text-lg">{patient.emergencyPhone || 'Not provided'}</p>
              </div>
              <div className="bg-white/20 p-3 rounded-full">
                <Phone size={24} />
              </div>
            </div>
            <div className="mt-4 text-center font-bold text-sm tracking-wider bg-blue-700/50 py-2 rounded-xl">
              TAP TO CALL NOW
            </div>
          </a>

          <div className="bg-cyan-500 rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
            <div className="flex justify-between items-center relative z-10">
              <div>
                <p className="text-sm opacity-80 mb-1">LIVE TRACKING</p>
                <h2 className="text-xl font-bold">SHARE REAL-TIME LOCATION</h2>
                <p className="text-sm">Updates every 30 seconds</p>
              </div>
              <div className="bg-white/20 p-3 rounded-full animate-pulse">
                <Share2 size={24} />
              </div>
            </div>
            <div className="mt-4 text-center font-bold text-sm tracking-wider bg-cyan-600/50 py-2 rounded-xl">
              LOCATION BROADCAST ACTIVE
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2 mb-4">
              <BriefcaseMedical className="text-blue-500" size={20} /> How to help (Responder Protocol)
            </h3>
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold shrink-0">1</div>
                <div>
                  <h4 className="font-bold text-slate-900">Stay with me</h4>
                  <p className="text-sm text-slate-500">Remain present and visible. Do not leave me alone until help arrives or my contact is reached.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold shrink-0">2</div>
                <div>
                  <h4 className="font-bold text-slate-900">Call and share location</h4>
                  <p className="text-sm text-slate-500">Inform contact that I'm having a PTSD episode. My location is being shared automatically.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold shrink-0">3</div>
                <div>
                  <h4 className="font-bold text-slate-900">Check for medical ID</h4>
                  <p className="text-sm text-slate-500">If I am unresponsive, check for a Medical ID on my smartphone (Health App) for allergy information.</p>
                </div>
              </div>
            </div>

            <div className="mt-6 bg-red-50 p-4 rounded-xl border border-red-100 flex gap-3">
              <AlertTriangle className="text-red-500 shrink-0" size={24} />
              <div>
                <h4 className="font-bold text-red-700">CRITICAL MEDICAL INFO</h4>
                <p className="text-sm text-slate-700 mt-1 font-medium">{patient.notes || 'No critical medical notes provided.'}</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="p-8 text-center border-t border-slate-200 bg-white">
        <p className="text-base font-semibold text-slate-700 mb-3 italic" dir="rtl">
          "פוסט טראומה היא תווית שלא מבקשים, אבל הכרה היא תווית שכולנו ראויים לה."
        </p>
        <p className="text-xs text-slate-400">Scanned via Recognition Live NFC Bracelet | © {new Date().getFullYear()} Recognition Live Systems</p>
      </footer>

      {showReportForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" dir="rtl">
            <div className="bg-white rounded-[25px] p-8 w-full max-w-md shadow-2xl border-2 border-blue-600 relative animate-in slide-in-from-bottom">
            <button onClick={() => setShowReportForm(false)} className="absolute top-4 left-4 text-slate-400 hover:text-slate-900"><X size={24} /></button>
            <h3 className="text-slate-900 font-bold text-center text-xl mb-6 tracking-tight">📝 סיכום וסיום אירוע</h3>
            
            <label className="font-bold block mb-2 text-slate-700">כיצד הסתיים האירוע?</label>
            <select 
                value={reportData.outcome} 
                onChange={(e) => setReportData({...reportData, outcome: e.target.value})}
                className="w-full p-3 rounded-xl border border-slate-200 mb-4 text-lg bg-white outline-none focus:ring-2 focus:ring-blue-500"
            >
                <option value="calmed_down">✅ הרגעה במקום</option>
                <option value="family_arrived">👨‍👩‍👧‍👦 הגעת בן משפחה</option>
                <option value="ambulance">🚑 פינוי באמבולנס</option>
                <option value="police">🚓 גורמי ביטחון</option>
                <option value="refused_help">❌ סירב לקבל עזרה</option>
            </select>

            <textarea 
                rows={4}
                value={reportData.notes}
                onChange={(e) => setReportData({...reportData, notes: e.target.value})}
                className="w-full p-3 rounded-xl border border-slate-200 mb-6 text-base"
                placeholder="הערות נוספות..."
            />

            <button onClick={submitReport} className="w-full py-4 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold text-lg shadow-lg">שלח וסיים</button>
            </div>
        </div>
      )}
    </div>
  );
}