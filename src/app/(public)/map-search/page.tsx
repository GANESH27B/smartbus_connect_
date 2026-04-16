
'use client';

import {
  Search, Mic, MicOff, Navigation, Layers, MapPin,
  X, ExternalLink, Navigation2,
  ChevronRight, Compass, ArrowUpRight, Bus, RefreshCw,
  ChevronDown, ChevronUp, Home, ArrowLeft
} from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useGoogleMaps } from '@/context/GoogleMapsContext';
import { GoogleMap, Marker, Circle, InfoWindow } from '@react-google-maps/api';
import { Button } from '@/components/ui/button';

// ─── Map style ────────────────────────────────────────────────────────────
const darkMapStyles: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#1a1c24' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#94a3b8' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1a1c24' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#20232d' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#64748b' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#1e293b' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2a2d3a' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#212a37' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#9ca3af' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#374151' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#1f2937' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0f172a' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#334155' }] },
];

const defaultCenter = { lat: 20.5937, lng: 78.9629 };

// ─── Types ─────────────────────────────────────────────────────────────────
interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  type: string;
  class: string;
}

interface SelectedPlace {
  name: string;
  display_name: string;
  lat: number;
  lng: number;
  type: string;
  placeClass: string;
}

// ─── Helpers ───────────────────────────────────────────────────────────────
function getTypeMeta(type: string, placeClass: string) {
  const t = (type + ' ' + placeClass).toLowerCase();
  if (t.includes('station') || t.includes('bus') || t.includes('railway') || t.includes('transit') || t.includes('stop'))
    return { label: 'Transit', color: 'text-emerald-400', bg: 'bg-emerald-500/15', dot: '#10b981' };
  if (t.includes('restaurant') || t.includes('food') || t.includes('cafe') || t.includes('fast_food'))
    return { label: 'Food', color: 'text-amber-400', bg: 'bg-amber-500/15', dot: '#f59e0b' };
  if (t.includes('hospital') || t.includes('clinic') || t.includes('health') || t.includes('pharmacy'))
    return { label: 'Health', color: 'text-rose-400', bg: 'bg-rose-500/15', dot: '#f43f5e' };
  if (t.includes('school') || t.includes('college') || t.includes('university') || t.includes('education'))
    return { label: 'Education', color: 'text-blue-400', bg: 'bg-blue-500/15', dot: '#3b82f6' };
  if (t.includes('mall') || t.includes('shop') || t.includes('store') || t.includes('market'))
    return { label: 'Shopping', color: 'text-pink-400', bg: 'bg-pink-500/15', dot: '#ec4899' };
  if (t.includes('park') || t.includes('garden') || t.includes('forest'))
    return { label: 'Park', color: 'text-teal-400', bg: 'bg-teal-500/15', dot: '#14b8a6' };
  if (t.includes('hotel') || t.includes('lodging') || t.includes('motel'))
    return { label: 'Hotel', color: 'text-indigo-400', bg: 'bg-indigo-500/15', dot: '#6366f1' };
  if (t.includes('place') || t.includes('city') || t.includes('town') || t.includes('village') || t.includes('suburb'))
    return { label: 'Area', color: 'text-violet-400', bg: 'bg-violet-500/15', dot: '#8b5cf6' };
  if (t.includes('road') || t.includes('street') || t.includes('highway') || t.includes('avenue'))
    return { label: 'Road', color: 'text-sky-400', bg: 'bg-sky-500/15', dot: '#0ea5e9' };
  return { label: 'Place', color: 'text-white/50', bg: 'bg-white/8', dot: '#94a3b8' };
}

function getShortName(result: NominatimResult) {
  const parts = result.display_name.split(', ');
  return { main: parts[0] || result.display_name, secondary: parts.slice(1, 4).join(', ') };
}

function HighlightText({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <span className="text-white/70">{text}</span>;
  const idx = text.toLowerCase().indexOf(query.trim().toLowerCase());
  if (idx === -1) return <span className="text-white/70">{text}</span>;
  return (
    <span className="text-white/70">
      {text.slice(0, idx)}
      <span className="text-white font-extrabold">{text.slice(idx, idx + query.trim().length)}</span>
      {text.slice(idx + query.trim().length)}
    </span>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────
export default function MapSearchPage() {
  const { isLoaded } = useGoogleMaps();
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [isSatellite, setIsSatellite] = useState(false);
  const [userLocation, setUserLocation] = useState<google.maps.LatLngLiteral | null>(null);
  const [pulseSize, setPulseSize] = useState(1);

  // Search
  const [query, setQuery] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [hasSpeechSupport, setHasSpeechSupport] = useState(false);
  const [suggestions, setSuggestions] = useState<NominatimResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);

  // Selected place
  const [selectedPlace, setSelectedPlace] = useState<SelectedPlace | null>(null);
  const [searchMarker, setSearchMarker] = useState<google.maps.LatLngLiteral | null>(null);
  const [showPanel, setShowPanel] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // ─── Pulse ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const id = setInterval(() => setPulseSize(s => (s >= 2 ? 1 : s + 0.05)), 80);
    return () => clearInterval(id);
  }, []);

  // ─── Geolocation ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!navigator.geolocation) return;
    const id = navigator.geolocation.watchPosition(
      p => setUserLocation({ lat: p.coords.latitude, lng: p.coords.longitude }),
      null, { enableHighAccuracy: true }
    );
    return () => navigator.geolocation.clearWatch(id);
  }, []);

  // ─── Speech ────────────────────────────────────────────────────────────
  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    setHasSpeechSupport(true);
    const rec = new SR();
    rec.continuous = false;
    rec.lang = 'en-US';
    rec.onresult = (e: any) => {
      const text: string = e.results[0][0].transcript;
      setQuery(text);
      fetchNominatim(text);
    };
    rec.onend = () => setIsListening(false);
    (window as any)._sr = rec;
  }, []);

  // ─── Click outside ─────────────────────────────────────────────────────
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node))
        setShowSuggestions(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  // ─── Nominatim search ─────────────────────────────────────────────────
  const fetchNominatim = useCallback(async (value: string) => {
    if (!value.trim()) { setSuggestions([]); setShowSuggestions(false); return; }
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setIsLoadingSuggestions(true);
    try {
      const params = new URLSearchParams({
        q: value, format: 'json', addressdetails: '1',
        extratags: '1', namedetails: '1', limit: '15', dedupe: '1', 'accept-language': 'en',
      });
      const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
        signal: abortRef.current.signal, headers: { 'Accept-Language': 'en' },
      });
      if (!res.ok) throw new Error('Nominatim error');
      const data: NominatimResult[] = await res.json();
      const seen = new Set<string>();
      const deduped = data.filter(r => {
        const key = r.display_name.split(', ').slice(0, 2).join(',').toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key); return true;
      });
      setSuggestions(deduped);
      setShowSuggestions(deduped.length > 0);
    } catch (err: any) {
      if (err.name !== 'AbortError') { setSuggestions([]); setShowSuggestions(false); }
    } finally { setIsLoadingSuggestions(false); }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    clearTimeout(debounceRef.current);
    if (!value.trim()) { setSuggestions([]); setShowSuggestions(false); return; }
    debounceRef.current = setTimeout(() => fetchNominatim(value), 350);
  };

  const selectSuggestion = useCallback((result: NominatimResult) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    const { main } = getShortName(result);
    setQuery(main);
    setSuggestions([]); setShowSuggestions(false);
    setSearchMarker({ lat, lng });
    setSelectedPlace({ name: main, display_name: result.display_name, lat, lng, type: result.type, placeClass: result.class });
    setShowPanel(true);
    if (map) {
      map.panTo({ lat, lng });
      map.setZoom(16);
    }
  }, [map]);

  const handleSearch = () => {
    if (suggestions.length > 0) selectSuggestion(suggestions[0]);
    else fetchNominatim(query);
  };

  const clearSearch = () => {
    setQuery(''); setSuggestions([]); setShowSuggestions(false);
    setSearchMarker(null); setSelectedPlace(null); setShowPanel(false);
    inputRef.current?.focus();
  };

  const onMapLoad = useCallback((m: google.maps.Map) => setMap(m), []);

  const openGoogleMapsBusStops = useCallback(() => {
    const fallback = userLocation || defaultCenter;
    const center = map?.getCenter();
    const lat = center?.lat() ?? fallback.lat;
    const lng = center?.lng() ?? fallback.lng;
    const zoom = map?.getZoom() ?? 15;
    const url = `https://www.google.com/maps/search/bus+stop/@${lat},${lng},${zoom}z`;
    window.location.href = url;
  }, [map, userLocation]);

  const mapOptions: google.maps.MapOptions = {
    disableDefaultUI: true,
    mapTypeId: isSatellite ? 'hybrid' : 'roadmap',
    styles: isSatellite ? [] : darkMapStyles,
    backgroundColor: '#1a1c24',
    gestureHandling: 'greedy',
    zoomControl: false, mapTypeControl: false, streetViewControl: false, fullscreenControl: false,
  };

  return (
    <div className="h-[calc(100vh-4rem)] w-full relative overflow-hidden bg-[#1a1c24]">
      {isLoaded ? (
        <GoogleMap
          mapContainerStyle={{ width: '100%', height: '100%' }}
          center={userLocation || defaultCenter}
          zoom={userLocation ? 14 : 5}
          options={mapOptions}
          onLoad={onMapLoad}
        >
          {searchMarker && (
            <>
              <Circle center={searchMarker} radius={200}
                options={{ fillColor: '#8b5cf6', fillOpacity: 0.1, strokeColor: '#8b5cf6', strokeOpacity: 0.4, strokeWeight: 1.5, clickable: false }} />
              <Marker position={searchMarker} title={selectedPlace?.name} zIndex={200}
                onClick={() => setShowPanel(true)}
                icon={{
                  path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
                  fillColor: '#8b5cf6', fillOpacity: 1, strokeColor: '#fff', strokeWeight: 2.5, scale: 2.8,
                  anchor: { x: 12, y: 22 } as any
                }} />
            </>
          )}

          {userLocation && (
            <>
              <Circle center={userLocation} radius={30 * pulseSize}
                options={{ fillColor: '#3b82f6', fillOpacity: 0.12, strokeColor: '#3b82f6', strokeOpacity: 0.6, strokeWeight: 1, clickable: false }} />
              <Marker position={userLocation} zIndex={150}
                icon={{ path: 0, scale: 12, fillColor: '#3b82f6', fillOpacity: 1, strokeColor: '#fff', strokeWeight: 3 }} />
            </>
          )}
        </GoogleMap>
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
          <Compass className="w-12 h-12 text-violet-500 animate-spin" />
          <p className="text-white/50 text-xs font-bold uppercase tracking-widest">Initialising Maps…</p>
        </div>
      )}

      {/* Panels and controls same as before */}
      <div className="absolute top-5 left-5 z-40">
        <Link href="/">
           <div className="flex items-center gap-2 bg-[#1d1f2e]/90 backdrop-blur-xl border border-white/10 text-white px-3 sm:px-4 py-3 rounded-2xl shadow-2xl hover:bg-[#252839] transition-all group cursor-pointer">
            <ArrowLeft className="w-5 h-5 text-violet-400 group-hover:-translate-x-1 transition-transform" />
            <span className="hidden sm:inline text-sm font-bold tracking-wide pr-1">Back home</span>
          </div>
        </Link>
      </div>

      <div ref={containerRef} className="absolute top-5 left-1/2 -translate-x-1/2 z-30 w-[calc(100%-2rem)] max-w-2xl">
        <div className="relative flex items-center bg-[#1d1f2e]/97 backdrop-blur-2xl rounded-[2rem] shadow-2xl px-2 py-2 gap-2 border border-white/5">
          <div className="flex-shrink-0 bg-violet-600/20 p-2.5 rounded-xl ml-1">
            {isLoadingSuggestions
              ? <div className="w-5 h-5 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
              : <Search className="w-5 h-5 text-violet-400" />}
          </div>
          <input
            ref={inputRef}
            type="text"
            placeholder="Search using OpenStreetMap…"
            value={query}
            onChange={handleInputChange}
            className="flex-1 bg-transparent outline-none text-white placeholder:text-white/28 text-sm font-semibold py-2 px-1 min-w-0"
          />
        </div>

        <AnimatePresence>
          {showSuggestions && suggestions.length > 0 && (
            <motion.div className="mt-2 overflow-hidden rounded-[1.6rem] bg-[#1d1f2e]/98 backdrop-blur-2xl border border-white/8 shadow-2xl">
              <ul className="py-2 max-h-[420px] overflow-y-auto">
                {suggestions.map((result) => {
                  const { main, secondary } = getShortName(result);
                  return (
                    <li key={result.place_id}>
                      <button
                        onMouseDown={e => { e.preventDefault(); selectSuggestion(result); }}
                        className="w-full flex items-center gap-3.5 px-4 py-3.5 hover:bg-white/5 text-left transition-colors">
                        <MapPin className="w-4 h-4 text-violet-400 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold truncate text-white"><HighlightText text={main} query={query} /></p>
                          <p className="text-[11px] text-white/30 truncate">{secondary}</p>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="absolute top-5 right-5 z-20 flex flex-col gap-3">
        <button onClick={() => setIsSatellite(v => !v)} className="w-12 h-12 rounded-2xl flex items-center justify-center bg-[#1d1f2e]/90 border border-white/10 text-white/60 hover:text-white">
          <Layers className="w-5 h-5" />
        </button>
      </div>

      <AnimatePresence>
        {showPanel && selectedPlace && (
          <motion.div className="absolute bottom-6 left-5 z-30 w-[320px] rounded-[2rem] bg-[#1d1f2e]/97 backdrop-blur-2xl border border-white/8 p-5 text-white">
            <h3 className="text-xl font-black mb-2">{selectedPlace.name}</h3>
            <p className="text-sm text-white/55 mb-4">{selectedPlace.display_name}</p>
            <Button className="w-full bg-violet-600 hover:bg-violet-500 rounded-xl" onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${selectedPlace.lat},${selectedPlace.lng}`, '_blank')}>
              Get Directions
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}