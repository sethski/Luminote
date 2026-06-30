import React from "react";
import { BookOpen } from "lucide-react";

export function AuthLoadingSplash() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        background: "#FAFAF8",
        gap: "16px",
        fontFamily: "'Outfit', sans-serif",
      }}
    >
      <div
        style={{
          width: "52px",
          height: "52px",
          borderRadius: "16px",
          background: "#0E1117",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <BookOpen size={22} color="white" />
      </div>
      <div style={{ display: "flex", gap: "6px" }}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: "#CBD5E1",
              animation: "auth-splash-dot 1.2s ease-in-out infinite",
              animationDelay: `${i * 0.2}s`,
            }}
          />
        ))}
      </div>
      <style>{`
        @keyframes auth-splash-dot {
          0%, 100% { transform: scale(.8); opacity: .4; }
          50%       { transform: scale(1.2); opacity: 1;   }
        }
      `}</style>
    </div>
  );
}
