import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerRetina from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerRetina,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

interface MapDisplayProps {
  latitude: number;
  longitude: number;
  zoom?: number;
  className?: string;
}

function SetView({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [map, center, zoom]);
  return null;
}

export function MapDisplay({ latitude, longitude, zoom = 14, className = 'h-48 w-full' }: MapDisplayProps) {
  const center: [number, number] = [latitude, longitude];
  return (
    <div className={`overflow-hidden rounded-xl border border-gray-200 shadow-sm ${className}`}>
      <MapContainer center={center} zoom={zoom} scrollWheelZoom={false} className="h-full w-full z-0">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <SetView center={center} zoom={zoom} />
        <Marker position={center} />
      </MapContainer>
    </div>
  );
}
