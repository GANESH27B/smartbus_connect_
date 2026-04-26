
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, MapPin, Navigation, Map, AlertTriangle, Shield, CheckCircle2, ChevronRight, Bus, Compass, Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AddressAutocomplete, NominatimResult } from "@/components/ui/address-autocomplete";
import { useGoogleMaps } from "@/context/GoogleMapsContext";
import { GoogleMap, Marker } from "@react-google-maps/api";
import { cn } from "@/lib/utils";

type Destination = { lat: number; lng: number; name: string };

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function DestinationAlarmPage() {
  const { isLoaded } = useGoogleMaps();
  const [destination, setDestination] = useState<Destination | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [distanceRemaining, setDistanceRemaining] = useState<number | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number, lng: number } | null>(null);
  const [hasArrived, setHasArrived] = useState(false);
  const [isAlarmActive, setIsAlarmActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [mapCenter, setMapCenter] = useState<{ lat: number, lng: number }>({ lat: 34.0522, lng: -118.2437 });
  const watchIdRef = useRef<number | null>(null);
  const alarmIntervalRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const oscRef = useRef<OscillatorNode | null>(null);

  useEffect(() => {
    if (navigator.geolocation && !isTracking && !hasArrived) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setMapCenter({ lat: position.coords.latitude, lng: position.coords.longitude });
          setUserLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
        }
      );
    }
  }, [isTracking, hasArrived]);

  const stopAlarm = useCallback(() => {
    setIsAlarmActive(false);
    if (alarmIntervalRef.current !== null) {
      window.clearInterval(alarmIntervalRef.current);
      alarmIntervalRef.current = null;
    }
    // Clear the sound interval if it exists
    if ((alarmIntervalRef as any).current_sound) {
      window.clearInterval((alarmIntervalRef as any).current_sound);
      (alarmIntervalRef as any).current_sound = null;
    }
    if (oscRef.current) {
      try { oscRef.current.stop(); } catch (e) { }
      oscRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => { });
      audioCtxRef.current = null;
    }
  }, []);

  const startAlarm = useCallback(() => {
    setIsAlarmActive(true);
    // Vibration
    if (navigator.vibrate) navigator.vibrate([400, 200, 400, 200, 800]);
    if (alarmIntervalRef.current !== null) window.clearInterval(alarmIntervalRef.current);
    alarmIntervalRef.current = window.setInterval(() => {
      if (navigator.vibrate) navigator.vibrate([400, 200, 400, 200, 800]);
    }, 1800);

    // Sound alert using Web Audio API
    try {
      const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      audioCtxRef.current = ctx;

      const playChime = () => {
        const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
        notes.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.15);

          gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.15);
          gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + i * 0.15 + 0.05);
          gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.15 + 0.6);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(ctx.currentTime + i * 0.15);
          osc.stop(ctx.currentTime + i * 0.15 + 0.6);
        });
      };

      playChime();
      const soundInterval = setInterval(() => {
        // We only clear this interval in stopAlarm explicitly
        playChime();
      }, 2500); // 2.5 seconds loop for a calmer experience

      (alarmIntervalRef as any).current_sound = soundInterval;
    } catch (e) {
      console.error("Audio error", e);
    }
  }, [isAlarmActive]);

  useEffect(() => {
    if (isTracking && destination && navigator.geolocation && !hasArrived) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation({ lat: latitude, lng: longitude });
          const d = calculateDistance(latitude, longitude, destination.lat, destination.lng);
          setDistanceRemaining(d);

          if (d < 0.3 && !hasArrived) {
            setHasArrived(true);
            setIsTracking(false);
            startAlarm();
          }
        },
        null,
        { enableHighAccuracy: true }
      );
    }
    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, [isTracking, destination, hasArrived, startAlarm]);

  const handlePlaceSelect = (result: NominatimResult) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    setDestination({ lat, lng, name: result.display_name });
    setSearchQuery(result.display_name);
    setMapCenter({ lat, lng });
  };

  const startJourney = () => {
    if (destination) {
      stopAlarm();
      setIsTracking(true);
      setHasArrived(false);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const d = calculateDistance(pos.coords.latitude, pos.coords.longitude, destination.lat, destination.lng);
          setDistanceRemaining(d);
          setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        null,
        { enableHighAccuracy: true }
      );
    }
  };

  const cancelJourney = () => {
    setIsTracking(false);
    setHasArrived(false);
    stopAlarm();
    setDistanceRemaining(null);
  };

  const [isMapExpanded, setIsMapExpanded] = useState(false);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background flex flex-col items-center justify-center p-4">
      <div className={cn("w-full transition-all duration-300 ease-in-out z-10", isMapExpanded ? "max-w-4xl" : "max-w-lg")}>
        <AnimatePresence mode="wait">
          {!isTracking && !hasArrived && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-8">
              {!isMapExpanded && (
                <div className="text-center">
                  <h1 className="text-4xl font-black mb-2">Destination Alarm</h1>
                  <p className="text-muted-foreground">Select a destination using OpenStreetMap Search.</p>
                </div>
              )}

              <Card className="p-6 space-y-6 overflow-visible">
                <AddressAutocomplete
                  value={searchQuery}
                  onChange={setSearchQuery}
                  onSelect={handlePlaceSelect}
                  placeholder="Search for a stop…"
                />

                <div className={cn("w-full transition-all duration-300 rounded-2xl overflow-hidden border relative", isMapExpanded ? "h-[500px]" : "h-48")}>
                  {isLoaded ? (
                    <>
                      <GoogleMap
                        mapContainerStyle={{ width: '100%', height: '100%' }}
                        center={destination || mapCenter}
                        zoom={14}
                        options={{ disableDefaultUI: true, gestureHandling: 'greedy' }}
                        onClick={(e) => {
                          if (e.latLng) {
                            const lat = e.latLng.lat();
                            const lng = e.latLng.lng();
                            // Instant feedback
                            setDestination({ lat, lng, name: "Locating..." });
                            setSearchQuery("Locating stop...");

                            // Reverse geocode
                            fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=en`)
                              .then(res => res.json())
                              .then(data => {
                                const name = data.display_name.split(',')[0] || "Dropped Pin";
                                setDestination({ lat, lng, name: data.display_name });
                                setSearchQuery(name);
                              })
                              .catch(() => {
                                setDestination({ lat, lng, name: "Dropped Pin" });
                                setSearchQuery("Dropped Pin");
                              });
                          }
                        }}
                      >
                        {destination && <Marker position={destination} />}
                        {userLocation && <Marker position={userLocation} icon={{ path: 0, scale: 6, fillColor: '#3b82f6', fillOpacity: 1, strokeColor: '#fff', strokeWeight: 2 }} />}
                      </GoogleMap>
                      <Button
                        variant="secondary"
                        size="icon"
                        className="absolute bottom-4 right-4 h-10 w-10 rounded-xl shadow-lg bg-white/90 backdrop-blur hover:bg-white transition-all z-20"
                        onClick={() => setIsMapExpanded(!isMapExpanded)}
                        title={isMapExpanded ? "Minimize Map" : "Expand Map"}
                      >
                        {isMapExpanded ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
                      </Button>
                    </>
                  ) : (
                    <div className="flex items-center justify-center h-full bg-muted italic">Loading Google Maps API…</div>
                  )}
                </div>

                <Button className="w-full h-14 rounded-2xl bg-primary text-white font-black" disabled={!destination} onClick={startJourney}>
                  Start Journey Tracking
                </Button>
              </Card>
            </motion.div>
          )}

          {isTracking && (
            <div className="text-center py-20">
              <h2 className="text-2xl font-black mb-4">Tracking Journey</h2>
              <div className="text-6xl font-black text-primary">{distanceRemaining?.toFixed(1)} km</div>
              <p className="text-muted-foreground mt-4">Safe travels! We'll alert you soon.</p>
              <Button variant="destructive" className="mt-12 w-full h-14 rounded-2xl" onClick={cancelJourney}>Cancel Alarm</Button>
            </div>
          )}

          {hasArrived && (
            <div className="text-center py-20 space-y-8">
              <div className="bg-emerald-500 w-24 h-24 rounded-full flex items-center justify-center mx-auto text-white shadow-2xl">
                <Bell className="w-12 h-12" />
              </div>
              <h2 className="text-5xl font-black text-emerald-500 italic">Arrived!</h2>
              <Button className="w-full h-14 rounded-2xl bg-emerald-500 text-white" onClick={cancelJourney}>Stop Alarm</Button>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
