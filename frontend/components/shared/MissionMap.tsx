'use client';

// Mini-carte de localisation (Leaflet + tuiles CartoDB claires, monochrome, sans clé API).
// À charger via next/dynamic({ ssr: false }) — Leaflet ne supporte pas le SSR.
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Épingle noire custom (évite le bug d'icône par défaut de Leaflet dans les bundlers).
const pin = L.divIcon({
  className: '',
  html:
    '<div style="width:20px;height:20px;background:#0F0F0F;border:2px solid #fff;border-radius:999px 999px 999px 0;transform:rotate(-45deg);box-shadow:0 2px 6px rgba(0,0,0,.35)"></div>',
  iconSize: [20, 20],
  iconAnchor: [10, 20],
});

export function MissionMap({
  lat,
  lng,
  className = 'h-40 w-full overflow-hidden rounded-2xl border border-border',
}: {
  lat?: number | null;
  lng?: number | null;
  className?: string;
}) {
  if (lat == null || lng == null || (lat === 0 && lng === 0)) return null;
  return (
    <div className={className}>
      <MapContainer
        center={[lat, lng]}
        zoom={15}
        scrollWheelZoom={false}
        dragging={false}
        doubleClickZoom={false}
        zoomControl={false}
        attributionControl={false}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
        <Marker position={[lat, lng]} icon={pin} />
      </MapContainer>
    </div>
  );
}
