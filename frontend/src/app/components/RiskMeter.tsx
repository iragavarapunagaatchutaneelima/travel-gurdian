"use client";

import React, { useEffect, useState } from "react";

interface RiskMeterProps {
  score: number; // 0 to 100 (100 is extremely safe, 0 is extreme risk)
  size?: number;
}

export default function RiskMeter({ score, size = 180 }: RiskMeterProps) {
  const [animatedScore, setAnimatedScore] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedScore(score);
    }, 100);
    return () => clearTimeout(timer);
  }, [score]);

  // Circumference calculation for circular SVG
  const radius = size * 0.4;
  const strokeWidth = size * 0.08;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (animatedScore / 100) * circumference;

  // Determine safety class
  const getSafetyLevel = (s: number) => {
    if (s >= 80) return { label: "LOW RISK", color: "text-emerald-400", stroke: "#10b981", bg: "bg-emerald-950/20" };
    if (s >= 60) return { label: "MEDIUM RISK", color: "text-amber-400", stroke: "#fbbf24", bg: "bg-amber-950/20" };
    return { label: "HIGH RISK", color: "text-red-400", stroke: "#ef4444", bg: "bg-red-950/20" };
  };

  const level = getSafetyLevel(score);

  return (
    <div className="flex flex-col items-center justify-center select-none">
      <div className="relative" style={{ width: size, height: size }}>
        {/* Background Arc */}
        <svg className="w-full h-full -rotate-90">
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="transparent"
            stroke="#18181b"
            strokeWidth={strokeWidth}
          />
          {/* Progress Arc */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="transparent"
            stroke={level.stroke}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{
              transition: "stroke-dashoffset 1.2s cubic-bezier(0.22, 1, 0.36, 1), stroke 0.3s ease",
            }}
          />
        </svg>

        {/* Text Center */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-black tracking-tight text-white">{animatedScore}</span>
          <span className="text-[10px] font-bold text-zinc-500 tracking-wider">SAFETY INDEX</span>
        </div>
      </div>

      <div className={`mt-4 rounded-full px-4 py-1.5 text-xs font-black tracking-wider ${level.color} ${level.bg} border border-white/5 shadow-sm`}>
        {level.label}
      </div>
    </div>
  );
}
