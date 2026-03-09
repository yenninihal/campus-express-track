import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Bus, MapPin, Shield, User, Sparkles } from "lucide-react";
import aitamLogo from "@/assets/aitam-logo.png";
import aitamJubilee from "@/assets/aitam-silver-jubilee.png";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getStudentByRollNumber } from "@/data/mockData";
import { useToast } from "@/hooks/use-toast";

const FloatingParticles = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    {Array.from({ length: 12 }).map((_, i) => (
      <div
        key={i}
        className="floating-particle"
        style={{
          width: `${8 + Math.random() * 16}px`,
          height: `${8 + Math.random() * 16}px`,
          background: `hsl(${[215, 28, 160, 280, 330][i % 5]} ${70 + Math.random() * 20}% ${50 + Math.random() * 20}% / ${0.15 + Math.random() * 0.2})`,
          left: `${Math.random() * 100}%`,
          top: `${Math.random() * 100}%`,
          animationDelay: `${Math.random() * 10}s`,
          animationDuration: `${12 + Math.random() * 8}s`,
        }}
      />
    ))}
  </div>
);

const Login = () => {
  const [rollNumber, setRollNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const stored = localStorage.getItem("student");
    if (stored) {
      navigate("/dashboard", { replace: true });
    }
  }, [navigate]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    setTimeout(() => {
      const student = getStudentByRollNumber(rollNumber.trim());
      if (student) {
        localStorage.setItem("student", JSON.stringify(student));
        navigate("/dashboard");
      } else {
        toast({
          title: "Invalid Roll Number",
          description: "Please enter a valid roll number to continue.",
          variant: "destructive",
        });
      }
      setLoading(false);
    }, 800);
  };

  const handleDriverLogin = () => {
    navigate("/driver");
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Animated moving gradient background */}
      <div className="absolute inset-0 animate-gradient-shift" style={{
        background: 'linear-gradient(-45deg, hsl(215 90% 55%), hsl(280 85% 50%), hsl(28 95% 55%), hsl(160 80% 45%), hsl(330 85% 55%))',
        backgroundSize: '400% 400%',
      }} />
      <div className="absolute inset-0 bg-background/30 backdrop-blur-[2px]" />

      <FloatingParticles />

      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md mx-4"
      >
        <div className="glass-card p-8 space-y-6 relative overflow-hidden">
          {/* Subtle shimmer overlay */}
          <div className="absolute inset-0 shimmer rounded-2xl pointer-events-none" />

          {/* Logos */}
          <div className="text-center space-y-3 relative z-10">
            <motion.div
              initial={{ scale: 0, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 15 }}
              className="flex items-center justify-center gap-4"
            >
              <div className="relative">
                <div className="absolute -inset-2 bg-primary/20 rounded-full blur-lg animate-pulse" />
                <img src={aitamLogo} alt="AITAM College Logo" className="w-16 h-16 object-contain relative z-10" />
              </div>
              <img src={aitamJubilee} alt="AITAM Silver Jubilee" className="w-20 h-20 object-contain" />
            </motion.div>

            {/* Profile Avatar */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.35, type: "spring", stiffness: 250 }}
              className="flex justify-center"
            >
              <div className="w-16 h-16 rounded-full bg-foreground flex items-center justify-center shadow-lg relative">
                <div className="absolute -inset-1 bg-foreground/30 rounded-full blur-md" />
                <User className="w-8 h-8 text-background relative z-10" />
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }}>
              <h1 className="text-2xl font-bold font-display text-foreground flex items-center justify-center gap-2">
                <Sparkles className="w-5 h-5 text-secondary" />
                College Bus Tracker
              </h1>
              <p className="text-muted-foreground text-sm mt-1">AITAM College, Tekkali • Estd. 2001</p>
            </motion.div>
          </div>

          {/* Student Login */}
          <motion.form
            onSubmit={handleLogin}
            className="space-y-4 relative z-10"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Roll Number</label>
              <div className="relative group">
                <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input
                  value={rollNumber}
                  onChange={(e) => setRollNumber(e.target.value)}
                  placeholder="e.g. 25A51A0563"
                  className="pl-10 h-12 bg-muted/50 border-border focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading || !rollNumber.trim()}
              className="w-full h-12 gradient-primary text-primary-foreground font-semibold text-base hover:opacity-90 transition-all hover:shadow-lg hover:shadow-primary/25 active:scale-[0.98]"
            >
              {loading ? (
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full" />
              ) : (
                <>
                  <MapPin className="w-4 h-4 mr-2" />
                  Track My Bus
                </>
              )}
            </Button>
          </motion.form>

          <div className="relative z-10">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-2 bg-card text-muted-foreground">or</span>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="relative z-10"
          >
            <Button
              onClick={handleDriverLogin}
              variant="outline"
              className="w-full h-12 border-border text-foreground hover:bg-muted hover:shadow-md transition-all active:scale-[0.98]"
            >
              <Bus className="w-4 h-4 mr-2" />
              Driver Login
            </Button>
          </motion.div>

          {/* Sample roll numbers */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="text-center space-y-1 relative z-10"
          >
            <p className="text-xs text-muted-foreground">Demo roll numbers:</p>
            <div className="flex flex-wrap gap-1.5 justify-center">
              {["25A51A0563", "25A51A0566", "25A51A0568"].map((rn) => (
                <button
                  key={rn}
                  onClick={() => setRollNumber(rn)}
                  className="text-xs px-3 py-1.5 rounded-full bg-muted hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all cursor-pointer hover:shadow-sm active:scale-95 border border-transparent hover:border-primary/20"
                >
                  {rn}
                </button>
              ))}
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
