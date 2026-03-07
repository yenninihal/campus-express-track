import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import aitamLogo from "@/assets/aitam-logo.png";
import { Bus, Clock, MapPin, Navigation, LogOut, Wifi, Route as RouteIcon, Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import BusMap from "@/components/BusMap";
import {
  Student,
  getRouteById,
  getBusByRoute,
  calculateETA,
  calculateDistance,
  type Route,
  type Bus as BusType,
} from "@/data/mockData";

const StudentDashboard = () => {
  const navigate = useNavigate();
  const [student, setStudent] = useState<Student | null>(null);
  const [route, setRoute] = useState<Route | undefined>();
  const [bus, setBus] = useState<BusType | undefined>();
  const [eta, setEta] = useState(0);
  const [distance, setDistance] = useState(0);
  const [nextStopName, setNextStopName] = useState("");
  const [mapFullscreen, setMapFullscreen] = useState(false);

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
      // Find nearest upcoming stop
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

  // Simulate bus movement
  useEffect(() => {
    if (!bus) return;
    const interval = setInterval(() => {
      setBus((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          currentLat: prev.currentLat + (Math.random() * 0.002 - 0.001),
          currentLng: prev.currentLng + (Math.random() * 0.002 - 0.001),
          speed: 25 + Math.floor(Math.random() * 25),
        };
      });
    }, 5000);
    return () => clearInterval(interval);
  }, [bus]);

  const handleLogout = () => {
    localStorage.removeItem("student");
    navigate("/");
  };

  if (!student) return null;

  const cardAnim = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="gradient-primary sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={aitamLogo} alt="AITAM Logo" className="w-9 h-9 object-contain rounded-lg bg-primary-foreground/20 p-0.5" />
            <div>
              <h1 className="font-display font-bold text-primary-foreground text-sm">AITAM Bus Tracker</h1>
              <p className="text-primary-foreground/70 text-xs">{student.name}</p>
            </div>
          </div>
          <Button onClick={handleLogout} variant="ghost" size="sm" className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10">
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6 max-w-2xl">
        {/* Status Cards */}
        <div className="grid grid-cols-2 gap-3">
          <motion.div {...cardAnim} transition={{ delay: 0.1 }} className="glass-card p-4 space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground text-xs">
              <RouteIcon className="w-3.5 h-3.5" />
              <span>Your Route</span>
            </div>
            <p className="font-display font-bold text-foreground">{route?.name || "N/A"}</p>
            <p className="text-xs text-muted-foreground">From {route?.startingPoint}</p>
          </motion.div>

          <motion.div {...cardAnim} transition={{ delay: 0.15 }} className="glass-card p-4 space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground text-xs">
              <Clock className="w-3.5 h-3.5" />
              <span>Next Bus</span>
            </div>
            <p className="font-display font-bold text-foreground text-2xl">{eta}<span className="text-sm font-sans font-normal text-muted-foreground ml-1">min</span></p>
            <p className="text-xs text-muted-foreground truncate" title={nextStopName}>📍 {nextStopName || "Calculating..."}</p>
          </motion.div>

          <motion.div {...cardAnim} transition={{ delay: 0.2 }} className="glass-card p-4 space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground text-xs">
              <Navigation className="w-3.5 h-3.5" />
              <span>Distance</span>
            </div>
            <p className="font-display font-bold text-foreground text-2xl">{distance}<span className="text-sm font-sans font-normal text-muted-foreground ml-1">km</span></p>
          </motion.div>

          <motion.div {...cardAnim} transition={{ delay: 0.25 }} className="glass-card p-4 space-y-1">
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
            <p className="text-xs text-muted-foreground">{bus?.driverName}</p>
          </motion.div>
        </div>

        {/* Map */}
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
            <div className="glass-card p-4 space-y-3">
              <h3 className="font-display font-semibold text-foreground text-sm flex items-center gap-2">
                <RouteIcon className="w-4 h-4 text-primary" />
                Route Stops
              </h3>
              <div className="space-y-0">
                {route.stops.map((stop, i) => (
                  <div key={i} className="flex items-start gap-3 relative">
                    <div className="flex flex-col items-center">
                      <div className="w-3 h-3 rounded-full bg-secondary border-2 border-card z-10" />
                      {i < route.stops.length - 1 && (
                        <div className="w-0.5 h-8 bg-border" />
                      )}
                      {i === route.stops.length - 1 && (
                        <div className="w-0.5 h-8 bg-border" />
                      )}
                    </div>
                    <p className="text-sm text-foreground pb-5">{stop.name}</p>
                  </div>
                ))}
                <div className="flex items-start gap-3">
                  <div className="w-3 h-3 rounded-full bg-primary border-2 border-card" />
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
