import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Bus, Play, Pause, Square, MapPin, Navigation, Clock, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import BusMap from "@/components/BusMap";
import { routes, COLLEGE_LOCATION, type Route } from "@/data/mockData";
import { useToast } from "@/hooks/use-toast";

type TripStatus = "idle" | "active" | "paused";

const DriverDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
  const [tripStatus, setTripStatus] = useState<TripStatus>("idle");
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [speed, setSpeed] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  const updateLocation = useCallback(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setSpeed(Math.round((pos.coords.speed || 0) * 3.6));
      },
      () => {
        // Fallback for demo
        if (selectedRoute) {
          setLocation({
            lat: selectedRoute.stops[0].lat + (Math.random() * 0.01),
            lng: selectedRoute.stops[0].lng + (Math.random() * 0.01),
          });
          setSpeed(30 + Math.floor(Math.random() * 20));
        }
      }
    );
  }, [selectedRoute]);

  useEffect(() => {
    if (tripStatus !== "active") return;
    updateLocation();
    const interval = setInterval(updateLocation, 5000);
    return () => clearInterval(interval);
  }, [tripStatus, updateLocation]);

  useEffect(() => {
    if (tripStatus !== "active") return;
    const interval = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(interval);
  }, [tripStatus]);

  const handleStart = () => {
    if (!selectedRoute) {
      toast({ title: "Select a route first", variant: "destructive" });
      return;
    }
    setTripStatus("active");
    setElapsed(0);
    toast({ title: "Trip Started", description: `Route: ${selectedRoute.name}` });
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  const driverBus = selectedRoute && location
    ? { id: "MY-BUS", routeId: selectedRoute.id, driverName: "You", currentLat: location.lat, currentLng: location.lng, speed, status: "en-route" as const, lastUpdated: new Date().toISOString() }
    : undefined;

  return (
    <div className="min-h-screen bg-background">
      <header className="gradient-accent sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button onClick={() => navigate("/")} variant="ghost" size="sm" className="text-secondary-foreground/80 hover:text-secondary-foreground hover:bg-secondary-foreground/10 p-1">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="font-display font-bold text-secondary-foreground text-sm">Driver Panel</h1>
              <p className="text-secondary-foreground/70 text-xs">
                {tripStatus === "active" ? "Trip Active" : tripStatus === "paused" ? "Paused" : "Ready"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {tripStatus === "active" && (
              <span className="text-secondary-foreground font-mono text-sm font-bold">{formatTime(elapsed)}</span>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6 max-w-2xl">
        {/* Route Selection */}
        {tripStatus === "idle" && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4 space-y-3">
            <h2 className="font-display font-semibold text-foreground text-sm flex items-center gap-2">
              <MapPin className="w-4 h-4 text-secondary" />
              Select Route
            </h2>
            <div className="grid grid-cols-2 gap-2">
              {routes.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setSelectedRoute(r)}
                  className={`p-3 rounded-lg text-left text-sm transition-all border ${
                    selectedRoute?.id === r.id
                      ? "border-primary bg-primary/10 text-primary font-semibold"
                      : "border-border bg-card text-foreground hover:border-primary/30"
                  }`}
                >
                  <p className="font-medium">{r.name}</p>
                  <p className="text-xs text-muted-foreground">{r.startingPoint}</p>
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Controls */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-4">
          <div className="flex gap-3">
            {tripStatus === "idle" && (
              <Button onClick={handleStart} className="flex-1 h-14 gradient-primary text-primary-foreground font-semibold text-base hover:opacity-90">
                <Play className="w-5 h-5 mr-2" />
                Start Trip
              </Button>
            )}
            {tripStatus === "active" && (
              <>
                <Button onClick={() => setTripStatus("paused")} variant="outline" className="flex-1 h-14 border-warning text-warning hover:bg-warning/10">
                  <Pause className="w-5 h-5 mr-2" />
                  Pause
                </Button>
                <Button onClick={() => { setTripStatus("idle"); toast({ title: "Trip Ended" }); }} variant="outline" className="flex-1 h-14 border-destructive text-destructive hover:bg-destructive/10">
                  <Square className="w-5 h-5 mr-2" />
                  End Trip
                </Button>
              </>
            )}
            {tripStatus === "paused" && (
              <>
                <Button onClick={() => setTripStatus("active")} className="flex-1 h-14 gradient-primary text-primary-foreground font-semibold hover:opacity-90">
                  <Play className="w-5 h-5 mr-2" />
                  Resume
                </Button>
                <Button onClick={() => { setTripStatus("idle"); toast({ title: "Trip Ended" }); }} variant="outline" className="flex-1 h-14 border-destructive text-destructive hover:bg-destructive/10">
                  <Square className="w-5 h-5 mr-2" />
                  End
                </Button>
              </>
            )}
          </div>
        </motion.div>

        {/* Stats */}
        {tripStatus !== "idle" && (
          <div className="grid grid-cols-3 gap-3">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="glass-card p-4 text-center">
              <Navigation className="w-4 h-4 text-primary mx-auto mb-1" />
              <p className="font-display font-bold text-foreground text-lg">{speed}</p>
              <p className="text-xs text-muted-foreground">km/h</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.05 }} className="glass-card p-4 text-center">
              <Clock className="w-4 h-4 text-secondary mx-auto mb-1" />
              <p className="font-display font-bold text-foreground text-lg">{formatTime(elapsed)}</p>
              <p className="text-xs text-muted-foreground">elapsed</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }} className="glass-card p-4 text-center">
              <Bus className="w-4 h-4 text-accent mx-auto mb-1" />
              <p className="font-display font-bold text-foreground text-lg">{selectedRoute?.stops.length || 0}</p>
              <p className="text-xs text-muted-foreground">stops</p>
            </motion.div>
          </div>
        )}

        {/* Map */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <div className="glass-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center gap-2">
              <MapPin className="w-4 h-4 text-secondary" />
              <h2 className="font-display font-semibold text-foreground text-sm">Route Map</h2>
            </div>
            <BusMap route={selectedRoute || undefined} bus={driverBus} className="h-[350px]" />
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default DriverDashboard;
