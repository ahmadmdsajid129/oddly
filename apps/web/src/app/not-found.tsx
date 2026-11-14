import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { BrandMark } from "@/components/icons";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-cream text-ink flex flex-col items-center justify-center p-6 text-center select-none">
      <div className="w-full max-w-md p-8 rounded-l bg-paper border-[2.5px] border-ink shadow-card space-y-6">
        <div className="w-16 h-16 rounded-pill bg-cream border-[2.5px] border-ink shadow-sticker mx-auto flex items-center justify-center">
          <BrandMark size={36} />
        </div>

        <div className="space-y-2">
          <div className="font-display text-display-xl font-extrabold text-ink leading-none">
            404
          </div>
          <h1 className="font-display text-display-m font-extrabold text-ink">
            Page not found
          </h1>
          <p className="font-body text-body-s text-muted max-w-xs mx-auto">
            The link you followed might have drifted, or this drop belongs to another day.
          </p>
        </div>

        <div className="pt-2">
          <Link href="/">
            <Button variant="primary" size="lg" className="w-full">
              Play Today&apos;s Drop
            </Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
