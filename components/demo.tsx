import { DottedSurface } from "@/components/ui/dotted-surface";
import { cn } from '@/lib/utils';
import { Sparkles } from "lucide-react";

export default function DemoOne() {
	return (
		<div className="relative min-h-screen w-full bg-background overflow-hidden flex flex-col items-center justify-center">
			{/* Dotted Surface Background Effect */}
			<DottedSurface className="size-full absolute inset-0" />

			{/* Demo Content */}
			<div className="relative z-10 flex flex-col items-center justify-center space-y-6 text-center select-none max-w-xl mx-auto p-6 md:p-12 backdrop-blur-sm bg-background/30 rounded-2xl border border-border/50 shadow-2xl">
				<div
					aria-hidden="true"
					className={cn(
						'pointer-events-none absolute -top-10 left-1/2 size-full -translate-x-1/2 rounded-full',
						'bg-[radial-gradient(ellipse_at_center,--theme(--color-foreground/.1),transparent_50%)]',
						'blur-[30px]',
					)}
				/>
				
				<div className="flex items-center justify-center size-16 rounded-full bg-primary/10 text-primary mb-4 p-4">
					<Sparkles className="size-full" />
				</div>
				
				<h1 className="font-mono text-4xl font-semibold text-foreground">
					Dotted Surface
				</h1>
				
				<p className="text-muted-foreground text-lg">
					Experience a beautiful 3D wave dotted surface created with ThreeJS, designed to enhance modern hero sections.
				</p>

				<div className="mt-8 relative h-48 w-full rounded-lg overflow-hidden border border-border shadow-inner">
					<img 
						src="https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=800&auto=format&fit=crop" 
						alt="Cyberpunk technology surface" 
						className="object-cover size-full"
					/>
				</div>
			</div>
		</div>
	);
}
