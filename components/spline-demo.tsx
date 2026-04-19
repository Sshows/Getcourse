'use client'

import { SplineScene } from "@/components/ui/splite";
import { Card } from "@/components/ui/card"
import { Spotlight } from "@/components/ui/spotlight"
 
export function SplineSceneBasic() {
  return (
    <div className="w-full bg-black min-h-screen py-20 flex items-center justify-center p-4">
      <Card className="w-full max-w-6xl h-[500px] md:h-[600px] bg-black/[0.96] border border-white/10 relative overflow-hidden flex flex-col md:flex-row shadow-2xl rounded-2xl">
        <Spotlight
          className="-top-40 left-0 md:left-60 md:-top-20"
          fill="white"
        />
        
        <div className="flex flex-col md:flex-row h-full w-full">
          {/* Left content */}
          <div className="md:w-1/2 p-8 md:p-12 relative z-10 flex flex-col justify-center">
            <h1 className="text-4xl md:text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-neutral-50 to-neutral-500 tracking-tight leading-tight">
              Interactive 3D <br/> Web Experiences
            </h1>
            <p className="mt-6 text-neutral-400 max-w-lg text-lg leading-relaxed">
              Bring your UI to life with beautifully integrated 3D scenes. Create immersive experiences 
              that capture attention and instantly elevate your design to a premium level.
            </p>
          </div>

          {/* Right content */}
          <div className="md:w-1/2 h-full relative border-t md:border-t-0 md:border-l border-white/5 bg-black/50 overflow-hidden">
            <SplineScene 
              scene="https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode"
              className="w-full h-full scale-100 md:scale-125 origin-center cursor-move"
            />
          </div>
        </div>
      </Card>
    </div>
  )
}
