'use client';

import { useEffect, useRef, useState } from 'react';

// Define Google Maps types inline to avoid dependency on @types/google.maps
interface GoogleMapOptions {
  center: { lat: number; lng: number };
  zoom: number;
  styles?: Array<{
    featureType?: string;
    elementType?: string;
    stylers?: Array<{ visibility?: string }>;
  }>;
}

interface GoogleMap {
  addListener: (event: string, handler: (e: { latLng?: { lat: () => number; lng: () => number } }) => void) => void;
}

interface GoogleMarker {
  addListener: (event: string, handler: () => void) => void;
}

interface GoogleMarkerOptions {
  position: { lat: number; lng: number };
  map: GoogleMap;
  title?: string;
}

// Extend Window interface for Google Maps
declare global {
  interface Window {
    google?: {
      maps: {
        Map: new (element: HTMLElement, options: GoogleMapOptions) => GoogleMap;
        Marker: new (options: GoogleMarkerOptions) => GoogleMarker;
      };
    };
  }
}

interface MapProps {
  center?: { lat: number; lng: number };
  zoom?: number;
  markers?: Array<{
    id: string;
    position: { lat: number; lng: number };
    title?: string;
    onClick?: () => void;
  }>;
  onLocationSelect?: (location: { lat: number; lng: number }) => void;
  className?: string;
}

export function Map({
  center = { lat: 49.6116, lng: 6.1319 }, // Luxembourg by default
  zoom = 12,
  markers = [],
  onLocationSelect,
  className = '',
}: MapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    // Check if google maps is loaded
    if (typeof window !== 'undefined' && window.google) {
      initMap();
    } else {
      setError('Google Maps non chargé. Veuillez configurer GOOGLE_MAPS_API_KEY.');
    }
  }, [center, zoom, markers]);

  const initMap = () => {
    if (!mapRef.current || !window.google) return;

    const map = new window.google.maps.Map(mapRef.current, {
      center,
      zoom,
      styles: [
        {
          featureType: 'poi',
          elementType: 'labels',
          stylers: [{ visibility: 'off' }],
        },
      ],
    });

    // Add markers
    markers.forEach((marker) => {
      const mapMarker = new window.google!.maps.Marker({
        position: marker.position,
        map,
        title: marker.title,
      });

      if (marker.onClick) {
        mapMarker.addListener('click', marker.onClick);
      }
    });

    // Add click listener for location selection
    if (onLocationSelect) {
      map.addListener('click', (event) => {
        if (event.latLng) {
          const lat = event.latLng.lat();
          const lng = event.latLng.lng();
          onLocationSelect({ lat, lng });
        }
      });
    }
  };

  if (error) {
    return (
      <div className={`bg-muted rounded-lg flex items-center justify-center ${className}`}>
        <div className="text-center p-8">
          <div className="text-4xl mb-4">🗺️</div>
          <p className="text-sm text-muted-foreground">{error}</p>
          <p className="text-xs text-muted-foreground mt-2">
            Carte interactive disponible après configuration de l'API
          </p>
        </div>
      </div>
    );
  }

  return <div ref={mapRef} className={`rounded-lg ${className}`} />;
}
