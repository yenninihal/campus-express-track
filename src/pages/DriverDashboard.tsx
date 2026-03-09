import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Bus, Play, Pause, Square, MapPin, Navigation, Clock, ArrowLeft, AlertTriangle, Bell, Settings, Sun, Moon, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import BusMap from "@/components/BusMap";
import { routes, COLLEGE_LOCATION, type Route } from "@/data/mockData";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/components/ThemeProvider";
import { supabase } from "@/integrations/supabase/client";

interface BusRecord {
  id: number;
  bus_no: number;
  reg_no: string;
  route_name: string;
  driver_name: string;
  staff_incharge: string;
  incharge_contact: string;
}

type TripStatus = "idle" | "active" | "paused";

interface MissedStudent {
  id: string;
  student_name: string;
  roll_number: string;
  stop_name: string;
  created_at: string;
}

const DriverDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { theme, toggleTheme } = useTheme();
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
  const [tripStatus, setTripStatus] = useState<TripStatus>("idle");
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [speed, setSpeed] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [missedStudents, setMissedStudents] = useState<MissedStudent[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [busRecords, setBusRecords] = useState<BusRecord[]>([]);
  const [selectedBus, setSelectedBus] = useState<BusRecord | null>(null);
  const [busSearch, setBusSearch] = useState("");

  // Broadcast location to Supabase - throttled
  useEffect(() => {
    if (tripStatus !== "active" || !selectedRoute) return;
    if (!navigator.geolocation) return;

    let isMounted = true;

    const sendLocation = async () => {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          if (!isMounted) return;
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          const spd = Math.round((pos.coords.speed || 0) * 3.6);
          setLocation(loc);
          setSpeed(spd);

          await supabase.from("driver_locations").upsert({
            route_id: selectedRoute.id,
            lat: loc.lat,
            lng: loc.lng,
            speed: spd,
            status: "en-route",
            updated_at: new Date().toISOString(),
          }, { onConflict: "route_id" });
        },
        () => {
          if (!isMounted) return;
          // Fallback to first stop location
          const loc = { lat: selectedRoute.stops[0].lat, lng: selectedRoute.stops[0].lng };
          setLocation(loc);
          setSpeed(0);
          supabase.from("driver_locations").upsert({
            route_id: selectedRoute.id,
            lat: loc.lat,
            lng: loc.lng,
            speed: 0,
            status: "en-route",
            updated_at: new Date().toISOString(),
          }, { onConflict: "route_id" });
        },
        { enableHighAccuracy: true, maximumAge: 3000, timeout: 5000 }
      );
    };

    // Initial + every 5 seconds
    sendLocation();
    const interval = setInterval(sendLocation, 5000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [tripStatus, selectedRoute]);

  useEffect(() => {
    if (tripStatus !== "active") return;
    const interval = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(interval);
  }, [tripStatus]);

  // Listen for missed bus notifications in real-time
  useEffect(() => {
    if (!selectedRoute) return;

    const fetchMissed = async () => {
      const { data } = await supabase
        .from("bus_missed")
        .select("*")
        .eq("route_id", selectedRoute.id)
        .eq("acknowledged", false)
        .order("created_at", { ascending: false });
      if (data) setMissedStudents(data as MissedStudent[]);
    };
    fetchMissed();

    const channel = supabase
      .channel(`missed-${selectedRoute.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "bus_missed", filter: `route_id=eq.${selectedRoute.id}` },
        (payload) => {
          const newStudent = payload.new as MissedStudent;
          setMissedStudents((prev) => [newStudent, ...prev]);
          toast({
            title: "🚨 Student Missed Bus!",
            description: `${newStudent.student_name} missed the bus at ${newStudent.stop_name}`,
          });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selectedRoute, toast]);

  const handleAcknowledge = async (id: string) => {
    await supabase.from("bus_missed").update({ acknowledged: true }).eq("id", id);
    setMissedStudents((prev) => prev.filter((s) => s.id !== id));
  };

  const handleStart = async () => {
    if (!selectedRoute) {
      toast({ title: "Select a route first", variant: "destructive" });
      return;
    }
    // Delete existing record so students get a fresh INSERT event (triggers beep)
    await supabase.from("driver_locations").delete().eq("route_id", selectedRoute.id);
    
    // Insert new record with "started" status - this triggers student notifications
    const initialLoc = selectedRoute.stops[0];
    await supabase.from("driver_locations").insert({
      route_id: selectedRoute.id,
      lat: initialLoc.lat,
      lng: initialLoc.lng,
      speed: 0,
      status: "started",
      updated_at: new Date().toISOString(),
    });
    
    setTripStatus("active");
    setElapsed(0);
    toast({ title: "Trip Started", description: `Route: ${selectedRoute.name}` });
  };

  const handleEndTrip = async () => {
    if (selectedRoute) {
      await supabase.from("driver_locations").delete().eq("route_id", selectedRoute.id);
    }
    setTripStatus("idle");
    setLocation(null);
    setSpeed(0);
    setElapsed(0);
    toast({ title: "Trip Ended" });
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
            <Button onClick={() => setShowSettings(!showSettings)} variant="ghost" size="sm" className="text-secondary-foreground/80 hover:text-secondary-foreground hover:bg-secondary-foreground/10 p-1">
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>
        {showSettings && (
          <div className="container mx-auto px-4 pb-3">
            <div className="bg-card/20 backdrop-blur rounded-lg p-3">
              <button
                onClick={toggleTheme}
                className="flex items-center gap-3 w-full text-secondary-foreground text-sm hover:bg-secondary-foreground/10 rounded-lg p-2 transition-colors"
              >
                {theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                <span>Set Mode: {theme === "light" ? "Dark" : "Bright"}</span>
              </button>
            </div>
          </div>
        )}
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6 max-w-2xl">
        {/* Missed Student Notifications */}
        {missedStudents.length > 0 && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
            <h3 className="font-display font-semibold text-destructive text-sm flex items-center gap-2">
              <Bell className="w-4 h-4" />
              Missed Bus Alerts ({missedStudents.length})
            </h3>
            {missedStudents.map((s) => (
              <div key={s.id} className="glass-card p-3 border-destructive/30 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-destructive" />
                    {s.student_name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Stop: {s.stop_name} • Roll: {s.roll_number}
                  </p>
                </div>
                <Button
                  onClick={() => handleAcknowledge(s.id)}
                  size="sm"
                  variant="outline"
                  className="text-xs border-accent text-accent hover:bg-accent/10"
                >
                  Acknowledge
                </Button>
              </div>
            ))}
          </motion.div>
        )}

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
                <Button onClick={handleEndTrip} variant="outline" className="flex-1 h-14 border-destructive text-destructive hover:bg-destructive/10">
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
                <Button onClick={handleEndTrip} variant="outline" className="flex-1 h-14 border-destructive text-destructive hover:bg-destructive/10">
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
