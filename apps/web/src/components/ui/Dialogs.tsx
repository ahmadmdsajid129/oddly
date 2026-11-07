"use client";

import React, { useEffect, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { motion, AnimatePresence, useDragControls } from "framer-motion";
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
  const dragControls = useDragControls();

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
            {/* Backdrop Overlay */}
            <DialogPrimitive.Overlay asChild>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 z-40 bg-midnight/60 backdrop-blur-sm"
              />
            </DialogPrimitive.Overlay>

            {/* Content Container */}
            <DialogPrimitive.Content asChild>
              {isMobile ? (
                // Mobile Bottom Sheet
                <motion.div
                  variants={sheetVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  drag="y"
                  dragControls={dragControls}
                  dragListener={false}
                  dragConstraints={{ top: 0 }}
                  dragElastic={0.2}
                  onDragEnd={(_, info) => {
                    if (info.offset.y > 100 || info.velocity.y > 300) {
                      onOpenChange(false);
                    }
                  }}
                  className="fixed bottom-0 left-0 right-0 z-50 max-h-[90vh] overflow-y-auto rounded-t-[32px] bg-surface p-6 shadow-2xl border-t border-border focus:outline-none"
                >
                  {/* Drag Handle Bar */}
                  <div
                    onPointerDown={(e) => dragControls.start(e)}
                    className="w-full flex justify-center pb-4 cursor-grab active:cursor-grabbing touch-none"
                  >
                    <div className="w-10 h-1 rounded-full bg-border" />
                  </div>

                  <div className="flex items-center justify-between mb-4">
                    {title && (
                      <DialogPrimitive.Title className="font-heading text-xl font-bold text-text">
                        {title}
                      </DialogPrimitive.Title>
                    )}
                    {showCloseButton && (
                      <Button variant="close" onClick={() => onOpenChange(false)} className="ml-auto" />
                    )}
                  </div>

                  {description && (
                    <DialogPrimitive.Description className="text-sm font-body text-text-muted mb-4">
                      {description}
                    </DialogPrimitive.Description>
                  )}

                  {children}
                </motion.div>
              ) : (
                // Desktop Centered Modal
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                  <motion.div
                    variants={modalVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="w-full max-w-md rounded-3xl bg-surface p-6 shadow-2xl border border-border focus:outline-none"
                  >
                    <div className="flex items-center justify-between mb-4">
                      {title && (
                        <DialogPrimitive.Title className="font-heading text-xl font-bold text-text">
                          {title}
                        </DialogPrimitive.Title>
                      )}
                      {showCloseButton && (
                        <Button variant="close" onClick={() => onOpenChange(false)} className="ml-auto" />
                      )}
                    </div>

                    {description && (
                      <DialogPrimitive.Description className="text-sm font-body text-text-muted mb-4">
                        {description}
                      </DialogPrimitive.Description>
                    )}

                    {children}
                  </motion.div>
                </div>
              )}
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        )}
      </AnimatePresence>
    </DialogPrimitive.Root>
  );
}
