export default function HomePage() {
  return (
    <main className="flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto">
      {/* Brand Motif: Overlapping Circles */}
      <div className="relative w-28 h-20 mb-8 flex items-center justify-center">
        {/* Circle 1: Violet */}
        <div className="absolute left-2 w-14 h-14 rounded-full bg-violet/80 blur-xs border border-violet/40" />
        {/* Circle 2: Coral */}
        <div className="absolute right-2 w-14 h-14 rounded-full bg-coral/80 blur-xs border border-coral/40" />
        {/* Mint Overlap indicator */}
        <div className="relative z-10 w-6 h-6 rounded-full bg-mint shadow-[0_0_16px_rgba(61,219,176,0.6)]" />
      </div>

      {/* Brand Wordmark & Headline */}
      <h1 className="font-heading text-4xl sm:text-5xl font-bold tracking-tight text-text mb-3">
        oddly
      </h1>

      <p className="font-heading text-lg font-medium text-violet mb-6 tracking-wide uppercase text-xs">
        coming soon
      </p>

      <p className="font-body text-text-muted text-base max-w-xs leading-relaxed mb-8">
        Someone out there is oddly like you. Five picks. One daily twin.
      </p>

      {/* Token Demonstration Chip */}
      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surface-2 border border-border text-xs font-medium text-mint">
        <span className="w-2 h-2 rounded-full bg-mint animate-pulse" />
        Design tokens loaded (Stage 0)
      </div>
    </main>
  );
}
