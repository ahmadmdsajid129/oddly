import type { Transition, Variants } from "framer-motion";

export const springDefault: Transition = {
  type: "spring",
  stiffness: 380,
  damping: 28,
};

export const springBouncy: Transition = {
  type: "spring",
  stiffness: 450,
  damping: 20,
};

export const springGentle: Transition = {
  type: "spring",
  stiffness: 250,
  damping: 30,
};

export const transitionEase: Transition = {
  duration: 0.22,
  ease: [0.2, 0.8, 0.2, 1],
};

export const fadeInVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};

export const slideUpVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: springDefault },
  exit: { opacity: 0, y: 16, transition: transitionEase },
};

export const scalePopVariants: Variants = {
  hidden: { opacity: 0, scale: 0.85 },
  visible: { opacity: 1, scale: 1, transition: springBouncy },
  exit: { opacity: 0, scale: 0.95, transition: transitionEase },
};

export const sheetVariants: Variants = {
  hidden: { y: "100%" },
  visible: { y: 0, transition: springDefault },
  exit: { y: "100%", transition: { duration: 0.24, ease: [0.32, 0.72, 0, 1] } },
};

export const modalVariants: Variants = {
  hidden: { opacity: 0, scale: 0.94, y: 8 },
  visible: { opacity: 1, scale: 1, y: 0, transition: springDefault },
  exit: { opacity: 0, scale: 0.96, y: 4, transition: { duration: 0.16 } },
};
