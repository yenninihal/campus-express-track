import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Bus, MapPin, Shield } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getStudentByRollNumber } from "@/data/mockData";
import { useToast } from "@/hooks/use-toast";

const Login = () => {
  const [rollNumber, setRollNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

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
      {/* Background */}
      <div className="absolute inset-0 gradient-hero" />
      <div className="absolute inset-0 opacity-10" style={{
        backgroundImage: 'radial-gradient(circle at 25% 25%, hsl(215 90% 55%) 0%, transparent 50%), radial-gradient(circle at 75% 75%, hsl(28 95% 55%) 0%, transparent 50%)'
      }} />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md mx-4"
      >
        <div className="glass-card p-8 space-y-6">
          {/* Logo */}
          <div className="text-center space-y-3">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="w-16 h-16 gradient-primary rounded-2xl flex items-center justify-center mx-auto"
            >
              <Bus className="w-8 h-8 text-primary-foreground" />
            </motion.div>
            <h1 className="text-2xl font-bold font-display text-foreground">College Bus Tracker</h1>
            <p className="text-muted-foreground text-sm">Aditya Engineering College, Tekkali</p>
          </div>

          {/* Student Login */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Roll Number</label>
              <div className="relative">
                <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={rollNumber}
                  onChange={(e) => setRollNumber(e.target.value)}
                  placeholder="e.g. 25A51A0563"
                  className="pl-10 h-12 bg-muted/50 border-border"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading || !rollNumber.trim()}
              className="w-full h-12 gradient-primary text-primary-foreground font-semibold text-base hover:opacity-90 transition-opacity"
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
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-2 bg-card text-muted-foreground">or</span>
            </div>
          </div>

          <Button
            onClick={handleDriverLogin}
            variant="outline"
            className="w-full h-12 border-border text-foreground hover:bg-muted"
          >
            <Bus className="w-4 h-4 mr-2" />
            Driver Login
          </Button>

          {/* Sample roll numbers */}
          <div className="text-center space-y-1">
            <p className="text-xs text-muted-foreground">Demo roll numbers:</p>
            <div className="flex flex-wrap gap-1 justify-center">
              {["25A51A0563", "25A51A0566", "25A51A0568"].map((rn) => (
                <button
                  key={rn}
                  onClick={() => setRollNumber(rn)}
                  className="text-xs px-2 py-1 rounded-md bg-muted hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                >
                  {rn}
                </button>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
