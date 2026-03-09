import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import aitamLogo from "@/assets/aitam-logo.png";
import { Bus, Clock, MapPin, Navigation, LogOut, Wifi, Route as RouteIcon, Maximize2, Minimize2, AlertTriangle, Settings, Sun, Moon, Info, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import BusMap from "@/components/BusMap";
import { useTheme } from "@/components/ThemeProvider";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Student,
  getRouteById,
  getBusByRoute,
  calculateETA,
  calculateDistance,
  type Route,
  type Bus as BusType,
} from "@/data/mockData";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface BusInfo {
  bus_no: number;
  reg_no: string;
  route_name: string;
  driver_name: string;
  staff_incharge: string;
  incharge_contact: string;
}

const StudentDashboard = () => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();
  const [student, setStudent] = useState<Student | null>(null);
  const [route, setRoute] = useState<Route | undefined>();
  const [bus, setBus] = useState<BusType | undefined>();
  const [eta, setEta] = useState(0);
  const [distance, setDistance] = useState(0);
  const [nextStopName, setNextStopName] = useState("");
  const [mapFullscreen, setMapFullscreen] = useState(false);
  const [showMissedDialog, setShowMissedDialog] = useState(false);
  const [missedSending, setMissedSending] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAboutBus, setShowAboutBus] = useState(false);
  const [routeBuses, setRouteBuses] = useState<BusInfo[]>([]);
  const [selectedBusInfo, setSelectedBusInfo] = useState<BusInfo | null>(null);

  useEffect(() => {
    const fetchRouteBuses = async () => {
      if (!route) return;
      const routeKeyword = route.name.split(" ")[0];
      const { data } = await supabase
        .from("buses")
        .select("*")
        .ilike("route_name", `%${routeKeyword}%`)
        .order("bus_no", { ascending: true });

      if (data && data.length > 0) {
        setRouteBuses(data);
        setSelectedBusInfo(data[0]);
      }
    };
    fetchRouteBuses();
  }, [route]);

  useEffect(() => {
    const stored = localStorage.getItem("student");
    if (!stored) {
      navigate("/");
      return;
    }
    const s: Student = JSON.parse(stored);
    setStudent(s);
    const r = getRouteById(s.route);
    setRoute(r);
    const b = getBusByRoute(s.route);
    setBus(b);

    if (b && r && r.stops.length > 0) {
      let minDist = Infinity;
      let nearestStop = r.stops[0];
      r.stops.forEach((stop) => {
        const d = calculateDistance(b.currentLat, b.currentLng, stop.lat, stop.lng);
        if (d < minDist) {
          minDist = d;
          nearestStop = stop;
        }
      });
      setNextStopName(nearestStop.name);
      setEta(calculateETA(b, nearestStop.lat, nearestStop.lng));
      setDistance(parseFloat(minDist.toFixed(1)));
    }
  }, [navigate]);

  const playBeep = () => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContext();
      const playTone = (freq: number, startTime: number, duration: number) => {
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        oscillator.frequency.value = freq;
        oscillator.type = "square";
        gainNode.gain.setValueAtTime(0.5, startTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
        oscillator.start(startTime);
        oscillator.stop(startTime + duration);
      };
      playTone(880, ctx.currentTime, 0.3);
      playTone(660, ctx.currentTime + 0.35, 0.3);
      playTone(880, ctx.currentTime + 0.7, 0.4);
    } catch (e) {
      console.log("Audio not supported");
    }
  };

  useEffect(() => {
    if (!route) return;

    let isActive = true;
    let lastSync: string | null = null;

    const fetchLocation = async () => {
      const { data } = await supabase
        .from("driver_locations")
        .select("*")
        .eq("route_id", route.id)
        .maybeSingle();

      if (data) {
        updateBusFromDriverData(data);
        lastSync = data.updated_at;
      }
    };
    fetchLocation();

    const pollInterval = setInterval(async () => {
      if (!isActive) return;
      const { data } = await supabase
        .from("driver_locations")
        .select("*")
        .eq("route_id", route.id)
        .maybeSingle();

      if (data && data.updated_at !== lastSync) {
        updateBusFromDriverData(data);
        lastSync = data.updated_at;
      }
    }, 3000);

    const channel = supabase
      .channel(`driver-${route.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "driver_locations", filter: `route_id=eq.${route.id}` },
        (payload) => {
          playBeep();
          toast({
            title: "🚌 Bus Started!",
            description: "Your bus has started its trip. Track it on the map!",
          });
          if (payload.new && typeof payload.new === "object" && "lat" in payload.new) {
            updateBusFromDriverData(payload.new as any);
            lastSync = (payload.new as any).updated_at;
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "driver_locations", filter: `route_id=eq.${route.id}` },
        (payload) => {
          if (payload.new && typeof payload.new === "object" && "lat" in payload.new) {
            updateBusFromDriverData(payload.new as any);
            lastSync = (payload.new as any).updated_at;
          }
        }
      )
      .subscribe();

    return () => {
      isActive = false;
      clearInterval(pollInterval);
      supabase.removeChannel(channel);
    };
  }, [route, toast]);

  const updateBusFromDriverData = (loc: { lat: number; lng: number; speed: number; status: string }) => {
    setBus((prev) => {
      if (!prev) return prev;
      return { ...prev, currentLat: loc.lat, currentLng: loc.lng, speed: loc.speed || 0, status: (loc.status as any) || "en-route" };
    });

    if (route && route.stops.length > 0) {
      let minDist = Infinity;
      let nearestStop = route.stops[0];
      route.stops.forEach((stop) => {
        const d = calculateDistance(loc.lat, loc.lng, stop.lat, stop.lng);
        if (d < minDist) {
          minDist = d;
          nearestStop = stop;
        }
      });
      setNextStopName(nearestStop.name);
      const roadDist = parseFloat((minDist * 1.3).toFixed(1));
      setDistance(roadDist);
      setEta(Math.max(1, Math.round(roadDist / ((loc.speed || 30) / 60))));
    }
  };

  const handleBusMissed = async () => {
    if (!student || !route) return;
    setMissedSending(true);
    const stopName = student.residence;
    const { error } = await supabase.from("bus_missed").insert({
      student_name: student.name,
      roll_number: student.rollNumber,
      route_id: route.id,
      stop_name: stopName,
    });
    if (error) {
      toast({ title: "Error", description: "Failed to send notification", variant: "destructive" });
    } else {
      toast({ title: "Notification Sent", description: "The next bus driver has been notified. You can take the next bus." });
    }
    setMissedSending(false);
    setShowMissedDialog(false);
  };

  const handleLogout = () => {
    localStorage.removeItem("student");
    navigate("/");
  };

  if (!student) return null;

  const cardAnim = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
  };

  const nextBus = routeBuses.length > 1 ? routeBuses[1] : null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="gradient-primary sticky top-0 z-50 shadow-lg shadow-primary/10">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute -inset-1 bg-primary-foreground/20 rounded-lg blur-sm" />
              <img src={aitamLogo} alt="AITAM Logo" className="w-9 h-9 object-contain rounded-lg bg-primary-foreground/20 p-0.5 relative z-10" />
            </div>
            <div>
              <h1 className="font-display font-bold text-primary-foreground text-sm">AITAM Bus Tracker</h1>
              <p className="text-primary-foreground/70 text-xs">{student.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button onClick={() => setShowSettings(!showSettings)} variant="ghost" size="sm" className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10">
              <Settings className="w-4 h-4" />
            </Button>
            <Button onClick={handleLogout} variant="ghost" size="sm" className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
        {showSettings && (
          <div className="container mx-auto px-4 pb-3">
            <div className="bg-card/20 backdrop-blur rounded-lg p-3">
              <button
                onClick={toggleTheme}
                className="flex items-center gap-3 w-full text-primary-foreground text-sm hover:bg-primary-foreground/10 rounded-lg p-2 transition-colors"
              >
                {theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                <span>Set Mode: {theme === "light" ? "Dark" : "Bright"}</span>
              </button>
            </div>
          </div>
        )}
      </header>

      <main className="container mx-auto px-4 py-6 space-y-5 max-w-2xl">
        {/* Status Cards */}
        <div className="grid grid-cols-2 gap-3">
          <motion.div {...cardAnim} transition={{ delay: 0.1 }} whileHover={{ scale: 1.02 }} className="glass-card p-4 space-y-1 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-16 h-16 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="flex items-center gap-2 text-muted-foreground text-xs">
              <RouteIcon className="w-3.5 h-3.5" />
              <span>Your Route</span>
            </div>
            <p className="font-display font-bold text-foreground">{route?.name || "N/A"}</p>
            <p className="text-xs text-muted-foreground">From {route?.startingPoint}</p>
          </motion.div>

          <motion.div {...cardAnim} transition={{ delay: 0.15 }} whileHover={{ scale: 1.02 }} className="glass-card p-4 space-y-1 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-16 h-16 bg-secondary/5 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="flex items-center gap-2 text-muted-foreground text-xs">
              <Clock className="w-3.5 h-3.5" />
              <span>Next Bus</span>
            </div>
            <p className="font-display font-bold text-foreground text-2xl">{eta}<span className="text-sm font-sans font-normal text-muted-foreground ml-1">min</span></p>
            <p className="text-xs text-muted-foreground truncate" title={nextStopName}>📍 {nextStopName || "Calculating..."}</p>
          </motion.div>

          <motion.div {...cardAnim} transition={{ delay: 0.2 }} whileHover={{ scale: 1.02 }} className="glass-card p-4 space-y-1 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-16 h-16 bg-accent/5 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="flex items-center gap-2 text-muted-foreground text-xs">
              <Navigation className="w-3.5 h-3.5" />
              <span>Road Distance</span>
            </div>
            <p className="font-display font-bold text-foreground text-2xl">{distance}<span className="text-sm font-sans font-normal text-muted-foreground ml-1">km</span></p>
          </motion.div>

          <motion.div {...cardAnim} transition={{ delay: 0.25 }} whileHover={{ scale: 1.02 }} className="glass-card p-4 space-y-1 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-16 h-16 bg-accent/5 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="flex items-center gap-2 text-muted-foreground text-xs">
              <Wifi className="w-3.5 h-3.5" />
              <span>Driver</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-accent" />
              </span>
              <p className="font-semibold text-foreground text-sm">Online</p>
            </div>
            <p className="text-xs text-muted-foreground">{selectedBusInfo?.driver_name || bus?.driverName}</p>
          </motion.div>
        </div>

        {/* About Bus Button */}
        <motion.div {...cardAnim} transition={{ delay: 0.27 }} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}>
          <Button
            onClick={() => setShowAboutBus(true)}
            className="w-full h-14 bg-accent hover:bg-accent/90 text-accent-foreground font-bold text-base shadow-lg shadow-accent/20 transition-all rounded-2xl"
          >
            <Info className="w-5 h-5 mr-2" />
            About Bus
          </Button>
        </motion.div>

        {/* About Bus Dialog */}
        <Dialog open={showAboutBus} onOpenChange={setShowAboutBus}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-accent">
                <Bus className="w-5 h-5" />
                Bus Information — {route?.name}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {selectedBusInfo && (
                <div className="rounded-2xl border-2 border-accent bg-accent/5 p-4 space-y-2">
                  <h4 className="font-bold text-accent text-sm flex items-center gap-2">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-accent" />
                    </span>
                    Current Bus (Bus No. {selectedBusInfo.bus_no})
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs">Registration No</p>
                      <p className="font-semibold text-foreground">{selectedBusInfo.reg_no}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Route</p>
                      <p className="font-semibold text-foreground">{selectedBusInfo.route_name}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Driver Name</p>
                      <p className="font-semibold text-foreground">{selectedBusInfo.driver_name}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Staff Incharge</p>
                      <p className="font-semibold text-foreground">{selectedBusInfo.staff_incharge || "—"}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-muted-foreground text-xs">Incharge Contact</p>
                      <a href={`tel:${selectedBusInfo.incharge_contact}`} className="font-semibold text-accent flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5" />
                        {selectedBusInfo.incharge_contact || "—"}
                      </a>
                    </div>
                  </div>
                </div>
              )}

              {nextBus && (
                <div className="rounded-2xl border border-border bg-muted/50 p-4 space-y-2">
                  <h4 className="font-bold text-muted-foreground text-sm flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5" />
                    Next Bus on Route (Bus No. {nextBus.bus_no})
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs">Registration No</p>
                      <p className="font-semibold text-foreground">{nextBus.reg_no}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Route</p>
                      <p className="font-semibold text-foreground">{nextBus.route_name}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Driver Name</p>
                      <p className="font-semibold text-foreground">{nextBus.driver_name}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Staff Incharge</p>
                      <p className="font-semibold text-foreground">{nextBus.staff_incharge || "—"}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-muted-foreground text-xs">Incharge Contact</p>
                      <a href={`tel:${nextBus.incharge_contact}`} className="font-semibold text-accent flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5" />
                        {nextBus.incharge_contact || "—"}
                      </a>
                    </div>
                  </div>
                </div>
              )}

              {routeBuses.length > 2 && (
                <p className="text-xs text-muted-foreground text-center">
                  +{routeBuses.length - 2} more bus(es) on this route
                </p>
              )}

              {routeBuses.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No bus information available for this route.</p>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Bus Missed Button */}
        <motion.div {...cardAnim} transition={{ delay: 0.28 }} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}>
          <Button
            onClick={() => setShowMissedDialog(true)}
            variant="outline"
            className="w-full h-14 border-2 border-destructive text-destructive hover:bg-destructive/10 font-bold rounded-2xl transition-all"
          >
            <AlertTriangle className="w-4 h-4 mr-2" />
            I Missed the Bus
          </Button>
        </motion.div>

        {/* Missed Bus Dialog */}
        <Dialog open={showMissedDialog} onOpenChange={setShowMissedDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-destructive" />
                Bus Missed Notification
              </DialogTitle>
              <DialogDescription>
                This will notify the next bus driver on your route that you missed the bus at <strong>{student.residence}</strong>. The driver can pick you up on the next trip.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setShowMissedDialog(false)}>Cancel</Button>
              <Button onClick={handleBusMissed} disabled={missedSending} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                {missedSending ? "Sending..." : "Notify Driver"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Map Fullscreen */}
        {mapFullscreen && (
          <div className="fixed inset-0 z-[100] bg-background flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" />
                <h2 className="font-display font-semibold text-foreground text-sm">Live Bus Location</h2>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground font-medium">ETA: {eta} min</span>
                <Button onClick={() => setMapFullscreen(false)} variant="ghost" size="sm" className="p-1.5">
                  <Minimize2 className="w-5 h-5" />
                </Button>
              </div>
            </div>
            <BusMap route={route} bus={bus} className="flex-1" />
          </div>
        )}

        {/* Map Card */}
        <motion.div {...cardAnim} transition={{ delay: 0.3 }}>
          <div className="glass-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" />
                <h2 className="font-display font-semibold text-foreground text-sm">Live Bus Location</h2>
              </div>
              <Button onClick={() => setMapFullscreen(true)} variant="ghost" size="sm" className="p-1.5 text-muted-foreground hover:text-primary">
                <Maximize2 className="w-4 h-4" />
              </Button>
            </div>
            <BusMap route={route} bus={bus} className="h-[400px]" />
          </div>
        </motion.div>

        {/* Route Stops */}
        {route && (
          <motion.div {...cardAnim} transition={{ delay: 0.35 }}>
            <div className="glass-card p-5 space-y-3">
              <h3 className="font-display font-semibold text-foreground text-sm flex items-center gap-2">
                <RouteIcon className="w-4 h-4 text-primary" />
                Route Stops
              </h3>
              <div className="space-y-0">
                {route.stops.map((stop, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + i * 0.05 }}
                    className="flex items-start gap-3 relative"
                  >
                    <div className="flex flex-col items-center">
                      <div className="w-3.5 h-3.5 rounded-full bg-secondary border-2 border-card z-10 shadow-sm shadow-secondary/30" />
                      {i < route.stops.length - 1 && <div className="w-0.5 h-8 bg-gradient-to-b from-secondary/40 to-border" />}
                      {i === route.stops.length - 1 && <div className="w-0.5 h-8 bg-gradient-to-b from-secondary/40 to-primary/40" />}
                    </div>
                    <p className="text-sm text-foreground pb-5">{stop.name}</p>
                  </motion.div>
                ))}
                <div className="flex items-start gap-3">
                  <div className="w-3.5 h-3.5 rounded-full bg-primary border-2 border-card shadow-sm shadow-primary/30" />
                  <p className="text-sm font-semibold text-primary">AITAM College</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
};

export default StudentDashboard;
