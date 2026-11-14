"use client";

import React, { useEffect, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { m, AnimatePresence } from "framer-motion";
import { Button } from "./Button";
import { modalVariants, sheetVariants } from "@/lib/motion";

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  showCloseButton?: boolean;
}

export function ResponsiveDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  showCloseButton = true,
}: DialogProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <DialogPrimitive.Portal forceMount>
            {/* Backdrop Overlay - Section 7: Backdrop ink at 40% (only translucent color allowed) */}
            <DialogPrimitive.Overlay asChild>
              <m.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.24 }}
                className="fixed inset-0 z-40 bg-ink/40"
              />
            </DialogPrimitive.Overlay>

            {/* Content Container */}
            <DialogPrimitive.Content asChild>
              {isMobile ? (
                // Mobile Bottom Sheet - Section 7: paper, radius-l top corners only (20px), outline (2.5px solid ink), grab handle 40 x 5 ink, slides up 240ms ease-out
                <m.div
                  variants={sheetVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="fixed bottom-0 left-0 right-0 z-50 max-h-[90vh] overflow-y-auto rounded-t-l bg-paper p-6 border-t-[2.5px] border-x-[2.5px] border-ink shadow-sticker focus:outline-none"
                >
                  {/* Grab Handle - 40 x 5 ink */}
                  <div
                    onClick={() => onOpenChange(false)}
                    className="w-full flex justify-center pb-4 cursor-pointer"
                  >
                    <div className="w-10 h-[5px] rounded-pill bg-ink" />
                  </div>

                  <div className="flex items-center justify-between mb-4">
                    {title && (
                      <DialogPrimitive.Title className="font-display text-display-m font-bold text-ink">
                        {title}
                      </DialogPrimitive.Title>
                    )}
                    {showCloseButton && (
                      <Button variant="close" onClick={() => onOpenChange(false)} className="ml-auto" />
                    )}
                  </div>

                  {description && (
                    <DialogPrimitive.Description className="text-body-s font-body text-muted mb-4">
                      {description}
                    </DialogPrimitive.Description>
                  )}

                  {children}
                </m.div>
              ) : (
                // Desktop Centered Modal - Section 7: paper, radius-l, outline, shadow-sticker
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                  <m.div
                    variants={modalVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="w-full max-w-md rounded-l bg-paper p-6 border-[2.5px] border-ink shadow-sticker focus:outline-none"
                  >
                    <div className="flex items-center justify-between mb-4">
                      {title && (
                        <DialogPrimitive.Title className="font-display text-display-m font-bold text-ink">
                          {title}
                        </DialogPrimitive.Title>
                      )}
                      {showCloseButton && (
                        <Button variant="close" onClick={() => onOpenChange(false)} className="ml-auto" />
                      )}
                    </div>

                    {description && (
                      <DialogPrimitive.Description className="text-body-s font-body text-muted mb-4">
                        {description}
                      </DialogPrimitive.Description>
                    )}

                    {children}
                  </m.div>
                </div>
              )}
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        )}
      </AnimatePresence>
    </DialogPrimitive.Root>
  );
}
