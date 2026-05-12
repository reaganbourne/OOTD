"use client";

import { useEffect, useState } from "react";

const PHRASES = [
  "main character energy",
  "outfit of the day, every day",
  "your closet called, it wants credit",
  "dressed and dangerous",
  "slay first, think later",
  "fashion is a mood",
  "closet goals unlocked",
  "you ate and left no crumbs",
  "serve looks, not excuses",
  "the fit? immaculate",
];

export function VibeCheckLabel() {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex((i) => (i + 1) % PHRASES.length);
        setVisible(true);
      }, 300);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  return (
    <p
      className="mt-1 text-sm font-medium text-ink transition-opacity duration-300"
      style={{ opacity: visible ? 1 : 0 }}
    >
      {PHRASES[index]}
    </p>
  );
}
