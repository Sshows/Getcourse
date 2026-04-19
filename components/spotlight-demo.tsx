import { GlowCard } from "@/components/ui/spotlight-card";
import { Compass, BookOpen, ShieldCheck } from "lucide-react";

export function SpotlightDemo() {
  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col md:flex-row items-center justify-center gap-10 p-10 font-sans custom-cursor text-white overflow-hidden">
      
      {/* Blue Spot Card */}
      <GlowCard glowColor="blue" size="lg" className="justify-between items-center text-center">
        <div className="flex flex-col items-center mt-6">
          <div className="bg-blue-500/20 p-4 rounded-full mb-4 ring-1 ring-blue-500/50">
            <Compass className="w-8 h-8 text-blue-400" />
          </div>
          <h3 className="text-xl font-bold tracking-tight text-white mb-2">Explore Next</h3>
          <p className="text-sm text-neutral-400 max-w-[200px]">
            Discover new horizons with advanced Next.js routing and caching.
          </p>
        </div>
        <div className="relative w-full h-32 mt-4 rounded-lg overflow-hidden border border-white/10">
          <img 
            src="https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=600&auto=format&fit=crop" 
            alt="Futuristic processor core" 
            className="w-full h-full object-cover transition-transform hover:scale-105 duration-500"
          />
        </div>
      </GlowCard>

      {/* Purple Spot Card */}
      <GlowCard glowColor="purple" size="lg" className="justify-between items-center text-center">
        <div className="flex flex-col items-center mt-6">
          <div className="bg-purple-500/20 p-4 rounded-full mb-4 ring-1 ring-purple-500/50">
            <BookOpen className="w-8 h-8 text-purple-400" />
          </div>
          <h3 className="text-xl font-bold tracking-tight text-white mb-2">Learn Modules</h3>
          <p className="text-sm text-neutral-400 max-w-[200px]">
            Structure your application cleanly with our scalable architecture.
          </p>
        </div>
        <div className="relative w-full h-32 mt-4 rounded-lg overflow-hidden border border-white/10">
          <img 
            src="https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?q=80&w=600&auto=format&fit=crop" 
            alt="Abstract purple neural network" 
            className="w-full h-full object-cover transition-transform hover:scale-105 duration-500"
          />
        </div>
      </GlowCard>

      {/* Green Spot Card */}
      <GlowCard glowColor="green" size="lg" className="justify-between items-center text-center">
        <div className="flex flex-col items-center mt-6">
          <div className="bg-green-500/20 p-4 rounded-full mb-4 ring-1 ring-green-500/50">
            <ShieldCheck className="w-8 h-8 text-green-400" />
          </div>
          <h3 className="text-xl font-bold tracking-tight text-white mb-2">Secure Core</h3>
          <p className="text-sm text-neutral-400 max-w-[200px]">
            Implement best practices right from the start for complete safety.
          </p>
        </div>
        <div className="relative w-full h-32 mt-4 rounded-lg overflow-hidden border border-white/10">
          <img 
            src="https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?q=80&w=600&auto=format&fit=crop" 
            alt="Green glowing matrix code" 
            className="w-full h-full object-cover transition-transform hover:scale-105 duration-500"
          />
        </div>
      </GlowCard>

    </div>
  );
}
