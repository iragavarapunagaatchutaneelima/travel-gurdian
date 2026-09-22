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
    if (s >= 80) return { label: "LOW RISK", color: "#16A34A", stroke: "#22C55E", bg: "#DCFCE7", border: "#86EFAC" };
    if (s >= 60) return { label: "MEDIUM RISK", color: "#D97706", stroke: "#F59E0B", bg: "#FEF3C7", border: "#FDE68A" };
    return { label: "HIGH RISK", color: "#DC2626", stroke: "#EF4444", bg: "#FEE2E2", border: "#FECACA" };
  };

  const level = getSafetyLevel(score);

  return (
    <div className="flex flex-col items-center justify-center select-none" style={{ fontFamily: "'Poppins',sans-serif" }}>
      <div className="relative" style={{ width: size, height: size }}>
        {/* Background Arc */}
        <svg className="w-full h-full -rotate-90">
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="transparent"
            stroke="#E2E8F0"
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
          <span style={{ fontSize: "36px", fontWeight: 900, color: "#0F172A", lineHeight: 1 }}>{animatedScore}</span>
          <span style={{ fontSize: "10px", fontWeight: 700, color: "#64748B", letterSpacing: "0.08em", marginTop: "2px" }}>SAFETY INDEX</span>
        </div>
      </div>

      <div
        className="mt-4 rounded-full px-4 py-1.5 text-xs shadow-sm font-bold"
        style={{
          color: level.color,
          backgroundColor: level.bg,
          border: `1px solid ${level.border}`,
          letterSpacing: "0.06em",
        }}
      >
        {level.label}
      </div>
    </div>
  );
}
