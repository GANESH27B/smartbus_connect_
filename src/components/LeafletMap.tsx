
'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { cn } from '@/lib/utils';
import type { Bus, Stop } from '@/lib/types';

// Fix for default marker icons in Leaflet with Next.js
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

// Custom Icons
const createDivIcon = (className: string, color: string, iconHtml: string) => {
  return L.divIcon({
    className: 'custom-div-icon',
    html: `<div class="${className}" style="background-color: ${color}; width: 100%; height: 100%; display: flex; items-center; justify-center; border: 2px solid white; border-radius: 50%; box-shadow: 0 0 10px rgba(0,0,0,0.5);">${iconHtml}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
};

const busIcon = (isDelayed: boolean) => createDivIcon(
  'rounded-full',
  isDelayed ? '#f43f5e' : '#8b5cf6',
  '<svg viewBox="0 0 24 24" fill="white" style="width: 18px; height: 18px;"><path d="M12,2L4.5,20.29L5.21,21L12,18L18.79,21L19.5,20.29L12,2Z"/></svg>'
);

const stopIcon = (color: string) => createDivIcon(
  'rounded-full',
  color,
  '<div style="width: 10px; height: 10px; background: white; border-radius: 50%;"></div>'
);

const userIcon = createDivIcon(
  'rounded-full',
  '#3b82f6',
  '<div style="width: 14px; height: 14px; background: white; border-radius: 50%;"></div>'
);

const searchResultIcon = createDivIcon(
  'marker-pin',
  '#f43f5e',
  '<svg viewBox="0 0 24 24" fill="white" style="width: 20px; height: 20px;"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>'
);

// Map Updater Component
function MapUpdater({ center, zoom }: { center: { lat: number, lng: number }, zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([center.lat, center.lng], zoom);
  }, [center, zoom, map]);
  return null;
}

interface LeafletMapProps {
  center: { lat: number, lng: number };
  zoom: number;
  userLocation?: { lat: number, lng: number } | null;
  isSatellite?: boolean;
  buses?: Bus[];
  stops?: Stop[];
  pulseSize?: number;
  onMarkerClick?: (marker: any) => void;
  searchMarker?: { lat: number, lng: number, name?: string } | null;
}

export default function LeafletMap({
  center,
  zoom,
  userLocation,
  isSatellite = false,
  buses = [],
  stops = [],
  pulseSize = 1,
  onMarkerClick,
  searchMarker
}: LeafletMapProps) {
  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={zoom}
      style={{ height: '100%', width: '100%', background: '#1a1c24' }}
      zoomControl={false}
    >
      <TileLayer
        url={isSatellite 
          ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}' 
          : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'}
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
      />

      <MapUpdater center={center} zoom={zoom} />

      {/* User Location */}
      {userLocation && (
        <>
          <Circle
            center={[userLocation.lat, userLocation.lng]}
            radius={30 * pulseSize}
            pathOptions={{ fillColor: '#3b82f6', fillOpacity: 0.2, color: '#3b82f6', weight: 1 }}
          />
          <Marker 
            position={[userLocation.lat, userLocation.lng]} 
            icon={userIcon}
          >
            <Popup>Your Location</Popup>
          </Marker>
        </>
      )}

      {/* Search Marker */}
      {searchMarker && (
        <Marker 
          position={[searchMarker.lat, searchMarker.lng]} 
          icon={searchResultIcon}
          eventHandlers={{ click: () => onMarkerClick?.(searchMarker) }}
        >
          {searchMarker.name && <Popup>{searchMarker.name}</Popup>}
        </Marker>
      )}

      {/* Buses */}
      {buses.map(bus => (
        <Marker
          key={bus.id}
          position={[bus.lat, bus.lng]}
          icon={busIcon(bus.status === 'delayed')}
          eventHandlers={{ click: () => onMarkerClick?.(bus) }}
        >
          <Popup>
            <div className="p-2">
              <h3 className="font-bold">Bus #{bus.number}</h3>
              <p className="text-sm">Status: {bus.status}</p>
              <p className="text-xs">Driver: {bus.driver}</p>
            </div>
          </Popup>
        </Marker>
      ))}

      {/* Stops */}
      {stops.map(stop => (
          <Marker
            key={stop.id}
            position={[stop.lat, stop.lng]}
            icon={stopIcon(stop.cityType === 2 ? '#f59e0b' : stop.cityType === 3 ? '#10b981' : '#f43f5e')}
            eventHandlers={{ click: () => onMarkerClick?.(stop) }}
          >
            <Popup>
              <div className="p-2">
                <h3 className="font-bold">{stop.name}</h3>
                <p className="text-sm">Stop ID: {stop.id}</p>
              </div>
            </Popup>
          </Marker>
        ))}
    </MapContainer>
  );
}
