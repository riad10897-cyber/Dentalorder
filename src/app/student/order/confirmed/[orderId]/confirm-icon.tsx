"use client";

import { motion, MotionConfig } from "motion/react";

export function ConfirmIcon() {
  return (
    <MotionConfig reducedMotion="user">
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
        className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-accent/10 text-4xl"
      >
        🦷
      </motion.div>
    </MotionConfig>
  );
}
