import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

const DefaultIcon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

interface ScansMapProps {
  scans: any[];
}

export default function ScansMap({ scans }: ScansMapProps) {
  // לוגיקה חכמה: אם יש רק סריקה אחת, המפה תתמקד עליה. אחרת - על ישראל.
  const focusPoint = (scans.length === 1 && scans[0].lat && scans[0].lng)
    ? [scans[0].lat, scans[0].lng] as [number, number]
    : [31.4, 35.0] as [number, number];

  const zoomLevel = scans.length === 1 ? 16 : 8; // זום קרוב אם זה מיקום ספציפי

  return (
    <div style={{ height: '100%', width: '100%' }}>
      {/* ה-key גורם למפה להתרענן כשהמיקום משתנה */}
      <MapContainer key={focusPoint[0]} center={focusPoint} zoom={zoomLevel} scrollWheelZoom={true} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='© OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {scans.map((scan, index) => (
            scan.lat && scan.lng ? (
              <Marker key={index} position={[scan.lat, scan.lng]}>
                <Popup>
                  <strong>סריקה זוהתה!</strong><br />
                  מספר צמיד: {scan.bid}<br/>
                  {new Date(scan.time?.seconds * 1000).toLocaleString()}
                </Popup>
              </Marker>
            ) : null
        ))}
      </MapContainer>
    </div>
  );
}