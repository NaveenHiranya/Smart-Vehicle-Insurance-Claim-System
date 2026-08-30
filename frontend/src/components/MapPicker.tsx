import { useEffect, useState, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import { MapPin, Crosshair, Loader2 } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default Leaflet marker icons in Vite builds
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerRetina from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerRetina,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

interface MapPickerProps {
  latitude: number | null;
  longitude: number | null;
  onChange: (lat: number, lng: number) => void;
}

const DEFAULT_CENTER: [number, number] = [7.8731, 80.7718]; // Sri Lanka center

function LocationMarker({ position, onSelect }: { position: [number, number]; onSelect: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return <Marker position={position} />;
}

export function MapPicker({ latitude, longitude, onChange }: MapPickerProps) {
  const [position, setPosition] = useState<[number, number]>(
    latitude != null && longitude != null ? [latitude, longitude] : DEFAULT_CENTER
  );
  const [zoom, setZoom] = useState(latitude != null && longitude != null ? 14 : 8);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (latitude != null && longitude != null) {
      setPosition([latitude, longitude]);
      setZoom(14);
    }
  }, [latitude, longitude]);

  const handleSelect = useCallback((lat: number, lng: number) => {
    setPosition([lat, lng]);
    onChange(lat, lng);
  }, [onChange]);

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser.');
      return;
    }
    setLocating(true);
    setError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        handleSelect(lat, lng);
        setZoom(15);
        setLocating(false);
      },
      () => {
        setError('Could not get your location. Please allow location access or pick manually.');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <MapPin className="h-4 w-4 text-primary-600" />
          Pin the incident location
        </div>
        <button
          type="button"
          onClick={useCurrentLocation}
          disabled={locating}
          className="flex items-center gap-1.5 text-xs font-medium text-primary-600 hover:text-primary-700 disabled:opacity-50"
        >
          {locating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Crosshair className="h-3.5 w-3.5" />}
          {locating ? 'Locating...' : 'Use my location'}
        </button>
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="overflow-hidden rounded-xl border border-gray-200 shadow-sm">
        <MapContainer
          center={position}
          zoom={zoom}
          scrollWheelZoom
          className="h-64 w-full z-0"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <LocationMarker position={position} onSelect={handleSelect} />
        </MapContainer>
      </div>

      <div className="flex items-center gap-2 text-xs text-gray-500">
        <span className="font-medium text-gray-700">Selected:</span>
        {latitude != null && longitude != null ? (
          <span>{latitude.toFixed(5)}, {longitude.toFixed(5)}</span>
        ) : (
          <span>Click the map or use "Use my location"</span>
        )}
      </div>
    </div>
  );
}
