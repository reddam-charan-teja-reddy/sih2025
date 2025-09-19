// components/home/MapView.tsx
'use client';

import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default icon issue with Leaflet in React
const iconDefault = new L.Icon({
    iconUrl: '/marker-icon.png',
    iconRetinaUrl: '/marker-icon-2x.png',
    shadowUrl: '/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
});
L.Marker.prototype.options.icon = iconDefault;


export function MapView() {
  const [position, setPosition] = useState([17.6868, 83.2185]); // Default to Visakhapatnam
  const [loading, setLoading] = useState(true);
  
  // Dummy data for reports
  const reports = [
    { id: 1, position: [17.70, 83.23], title: "Coastal Road Flooding", status: "verified" },
    { id: 2, position: [17.69, 83.20], title: "High Waves near RK Beach", status: "unverified" },
  ];

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition([pos.coords.latitude, pos.coords.longitude]);
        setLoading(false);
      },
      () => {
        // Handle error or user denial
        console.error("Could not get user location.");
        setLoading(false);
      },
      { enableHighAccuracy: true }
    );
  }, []);

  if (loading) {
    return <div className="flex h-full w-full items-center justify-center bg-gray-200"><p>Fetching your location...</p></div>
  }

  return (
    <MapContainer center={position} zoom={13} scrollWheelZoom={true} className="h-full w-full z-0">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      
      {/* User's Location Marker */}
      <Marker position={position}>
        <Popup>You are here.</Popup>
      </Marker>

      {/* Report Markers */}
      {reports.map(report => (
         <Marker key={report.id} position={report.position}>
          <Popup>
            <b>{report.title}</b><br />
            Status: {report.status}
          </Popup>
        </Marker>
      ))}

    </MapContainer>
  );
}