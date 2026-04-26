
'use client';

import {
  GoogleMap,
  Marker,
  InfoWindow,
  Circle,
} from '@react-google-maps/api';
import React, { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import type { Bus, Stop } from '@/lib/types';
import { useGoogleMaps } from '@/context/GoogleMapsContext';
import { Navigation2, Bus as BusIcon, MapPin, Wind, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LiveMapProps {
  buses: Bus[];
  stops?: Stop[];
  allRoutes?: any[];
  center?: google.maps.LatLngLiteral | null;
  zoom?: number;
  userLocation?: google.maps.LatLngLiteral | null;
  isSatellite?: boolean;
  onMapReady?: (map: google.maps.Map) => void;
  showRealTimeStops?: boolean;
}

const containerStyle = {
  width: '100%',
  height: '100%',
};

const premiumMapStyles = [
  { "elementType": "geometry", "stylers": [{ "color": "#1a1c24" }] },
  { "elementType": "labels.text.fill", "stylers": [{ "color": "#94a3b8" }] },
  { "elementType": "labels.text.stroke", "stylers": [{ "color": "#1a1c24" }] },
  { "featureType": "administrative", "elementType": "geometry", "stylers": [{ "visibility": "off" }] },
  { "featureType": "poi", "elementType": "geometry", "stylers": [{ "color": "#20232d" }] },
  { "featureType": "poi", "elementType": "labels.text.fill", "stylers": [{ "color": "#64748b" }] },
  { "featureType": "poi.park", "elementType": "geometry", "stylers": [{ "color": "#1e293b" }] },
  { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#2a2d3a" }] },
  { "featureType": "road", "elementType": "geometry.stroke", "stylers": [{ "color": "#212a37" }] },
  { "featureType": "road", "elementType": "labels.text.fill", "stylers": [{ "color": "#9ca3af" }] },
  { "featureType": "road.highway", "elementType": "geometry", "stylers": [{ "color": "#374151" }] },
  { "featureType": "road.highway", "elementType": "geometry.stroke", "stylers": [{ "color": "#1f2937" }] },
  { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#0f172a" }] },
  { "featureType": "water", "elementType": "labels.text.fill", "stylers": [{ "color": "#334155" }] }
];

const mapOptions = (isSatellite: boolean = false): google.maps.MapOptions => ({
  disableDefaultUI: true,
  zoomControl: false,
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: false,
  mapTypeId: isSatellite ? 'hybrid' : 'roadmap',
  styles: isSatellite ? [] : premiumMapStyles,
  backgroundColor: '#1a1c24',
  gestureHandling: 'greedy'
});

function LiveMap({
  buses,
  stops = [],
  allRoutes = [],
  center,
  zoom,
  userLocation,
  isSatellite = false,
  onMapReady,
  showRealTimeStops = false
}: LiveMapProps) {
  const { isLoaded } = useGoogleMaps();
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [activeMarker, setActiveMarker] = useState<Bus | Stop | null>(null);
  const [pulseSize, setPulseSize] = useState(1);

  useEffect(() => {
    const interval = setInterval(() => {
      setPulseSize(s => (s >= 2 ? 1 : s + 0.1));
    }, 100);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (map && center) {
      map.panTo(center);
      if (zoom) map.setZoom(zoom);
    } else if (map && buses.length > 0 && !center && !userLocation) {
      map.panTo({ lat: buses[0].lat, lng: buses[0].lng });
    } else if (map && userLocation && !center) {
      map.panTo(userLocation);
    }
  }, [map, center, zoom, buses, userLocation]);

  const handleMarkerClick = (marker: Bus | Stop) => {
    setActiveMarker(marker);
    if (map) map.panTo({ lat: marker.lat, lng: marker.lng });
  };

  const onLoad = useCallback(function callback(mapInstance: google.maps.Map) {
    setMap(mapInstance);
    if (onMapReady) onMapReady(mapInstance);
  }, [onMapReady]);

  const onUnmount = useCallback(function callback(map: google.maps.Map) {
    setMap(null);
  }, []);

  if (!isLoaded) return <div className="flex items-center justify-center h-full bg-[#1a1c24] font-bold text-white/50 animate-pulse uppercase tracking-[0.2em] text-xs">Initializing Satellite...</div>;

  return (
    <div className="relative h-full w-full">
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={center || userLocation || { lat: 34.0522, lng: -118.2437 }}
        zoom={zoom || 14}
        options={mapOptions(isSatellite)}
        onLoad={onLoad}
        onUnmount={onUnmount}
      >
        {buses.map((bus: Bus) => (
          <Marker
            key={bus.id}
            position={{ lat: bus.lat, lng: bus.lng }}
            onClick={() => handleMarkerClick(bus)}
            icon={{
              path: "M12,2L4.5,20.29L5.21,21L12,18L18.79,21L19.5,20.29L12,2Z",
              scale: isSatellite ? 1.4 : 1.1,
              fillColor: bus.status === 'delayed' ? '#f43f5e' : '#8b5cf6',
              fillOpacity: 1,
              strokeWeight: 2,
              strokeColor: '#FFFFFF',
              anchor: { x: 12, y: 12 } as any,
            }}
            zIndex={100}
            title={`Bus ${bus.number}`}
          />
        ))}

        {stops && stops.length > 0 && stops.map(stop => (
          <Marker
            key={stop.id}
            position={{ lat: stop.lat, lng: stop.lng }}
            onClick={() => handleMarkerClick(stop)}
            icon={{
              path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
              fillColor: stop.cityType === 2 ? '#f59e0b' : stop.cityType === 3 ? '#10b981' : '#f43f5e',
              fillOpacity: 1,
              strokeColor: '#FFFFFF',
              strokeWeight: 2,
              scale: isSatellite ? 2.5 : 2.0,
              anchor: { x: 12, y: 22 } as any,
            }}
            zIndex={10}
            title={stop.name}
          />
        ))}

        {userLocation && (
          <>
            <Circle
              center={userLocation}
              radius={30 * pulseSize}
              options={{
                fillColor: '#3b82f6',
                fillOpacity: 0.2,
                strokeColor: '#3b82f6',
                strokeOpacity: 0.8,
                strokeWeight: 1,
                clickable: false,
              }}
            />
            <Marker
              position={userLocation}
              title="Your Location"
              zIndex={150}
              icon={{
                path: 0,
                scale: 14,
                fillColor: '#3b82f6',
                fillOpacity: 1,
                strokeColor: '#FFFFFF',
                strokeWeight: 4,
              }}
            />
          </>
        )}

        {activeMarker && (
          <InfoWindow
            position={{ lat: activeMarker.lat, lng: activeMarker.lng }}
            onCloseClick={() => setActiveMarker(null)}
          >
            <div className="p-0 min-w-[240px] overflow-hidden rounded-2xl bg-white text-slate-900 border-none shadow-2xl">
              {'number' in activeMarker ? (
                <div className="flex flex-col">
                  <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 mb-1">Fleet Vehicle</p>
                      <h3 className="text-2xl font-black tracking-tighter italic">#{activeMarker.number}</h3>
                    </div>
                  </div>
                  <div className="p-4 space-y-4">
                    <p className="font-bold text-slate-700">Line {allRoutes.find((r: any) => (r._id === activeMarker.routeId || r.id === activeMarker.routeId))?.number || 'Active'}</p>
                    <Button className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl h-11">
                      Track Live Journey
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="p-4">
                  <h3 className="text-xl font-black italic tracking-tight leading-tight">{activeMarker.name}</h3>
                </div>
              )}
            </div>
          </InfoWindow>
        )}
      </GoogleMap>

      <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
        {userLocation && (
          <Button
            size="icon"
            variant="secondary"
            className="bg-white/90 backdrop-blur shadow-lg hover:bg-white text-slate-700 rounded-xl h-12 w-12 border-none"
            onClick={() => map?.panTo(userLocation)}
            title="My Location"
          >
            <Navigation2 className="w-6 h-6" />
          </Button>
        )}
      </div>

      <div className="absolute bottom-4 left-4 z-10 pointer-events-none">
        <div className="bg-slate-900/80 backdrop-blur-sm border border-white/10 rounded-2xl p-4 text-white w-64 shadow-2xl pointer-events-auto">
          <h3 className="text-sm font-black italic tracking-tight text-white mb-3 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-emerald-400" />
            Stop Types
          </h3>
          <div className="space-y-3">
            <div className="flex items-center group">
              <div className="w-3 h-3 rounded-full mr-3 shadow-[0_0_10px_rgba(244,63,94,0.6)] group-hover:scale-125 transition-transform" style={{ backgroundColor: '#f43f5e' }} />
              <span className="text-xs font-bold text-white/80 group-hover:text-white transition-colors">Primary Terminal (Tier 1)</span>
            </div>
            <div className="flex items-center group">
              <div className="w-3 h-3 rounded-full mr-3 shadow-[0_0_10px_rgba(245,158,11,0.6)] group-hover:scale-125 transition-transform" style={{ backgroundColor: '#f59e0b' }} />
              <span className="text-xs font-bold text-white/80 group-hover:text-white transition-colors">Major Junction (Tier 2)</span>
            </div>
            <div className="flex items-center group">
              <div className="w-3 h-3 rounded-full mr-3 shadow-[0_0_10px_rgba(16,185,129,0.6)] group-hover:scale-125 transition-transform" style={{ backgroundColor: '#10b981' }} />
              <span className="text-xs font-bold text-white/80 group-hover:text-white transition-colors">Suburban Hub (Tier 3)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default React.memo(LiveMap);
