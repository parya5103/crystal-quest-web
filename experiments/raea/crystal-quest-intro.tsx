// Experimental RAEA visual study for Crystal Quest: Gem Legends.
// This is a standalone intro/visual prototype. It does NOT replace the shipped
// Canvas 2D renderer, match-3 engine, save system, or PWA.
import { AbsoluteFill, Composition, interpolate, registerRoot, useCurrentFrame } from "raea";

const W = 1920;
const H = 1080;
const PALETTE = ["#67e8f9", "#a78bfa", "#f9a8d4", "#fbbf24", "#86efac", "#f8fafc"];

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function Gem({ index, frame }: { index: number; frame: number }) {
  const col = index % 8;
  const row = Math.floor(index / 8);
  const delay = row * 3 + col * 2;
  const reveal = clamp01((frame - 12 - delay) / 28);
  const pulse = 0.92 + Math.sin((frame + index * 7) * 0.075) * 0.08;
  const color = PALETTE[(row * 3 + col * 5) % PALETTE.length];
  const size = 58 + ((row + col) % 3) * 4;

  return (
    <div
      style={{
        width: 76,
        height: 76,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        opacity: reveal,
        transform: `scale(${(0.72 + reveal * 0.28) * pulse})`,
      }}
    >
      <div
        style={{
          width: size,
          height: size,
          borderRadius: 19,
          transform: "rotate(45deg)",
          background: `linear-gradient(145deg, #ffffff 0%, ${color} 28%, #172554 100%)`,
          border: `2px solid ${color}`,
          boxShadow: `0 0 24px ${color}88, inset 0 0 14px #ffffff88`,
        }}
      />
    </div>
  );
}

function CrystalQuestIntro() {
  const frame = useCurrentFrame();
  const titleIn = interpolate(frame, [8, 52], [0, 1], { extrapolateRight: "clamp" });
  const boardIn = interpolate(frame, [18, 76], [0, 1], { extrapolateRight: "clamp" });
  const subtitleIn = interpolate(frame, [72, 112], [0, 1], { extrapolateRight: "clamp" });
  const glow = 0.72 + Math.sin(frame * 0.045) * 0.12;

  return (
    <AbsoluteFill
      style={{
        width: W,
        height: H,
        overflow: "hidden",
        background: "radial-gradient(ellipse at 50% 42%, #20245a 0%, #10142f 42%, #070a1c 100%)",
        color: "#f8fafc",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div style={{ position: "absolute", inset: 0, opacity: 0.24, background: "radial-gradient(circle at 50% 50%, #8b5cf6 0, transparent 58%)" }} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 100, height: 2, background: "linear-gradient(90deg, transparent, #67e8f9, transparent)", opacity: glow }} />
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 100, height: 2, background: "linear-gradient(90deg, transparent, #a78bfa, transparent)", opacity: glow }} />

      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 92,
          textAlign: "center",
          opacity: titleIn,
          transform: `translateY(${(1 - titleIn) * 34}px)`,
        }}
      >
        <div style={{ fontSize: 22, letterSpacing: 12, color: "#a5f3fc", fontWeight: 700 }}>GOGO COMPANY PRESENTS</div>
        <div style={{ marginTop: 22, fontSize: 92, lineHeight: 1.04, fontWeight: 900, letterSpacing: 4, textShadow: "0 0 32px #8b5cf6aa" }}>
          CRYSTAL QUEST
        </div>
        <div style={{ marginTop: 12, fontSize: 28, letterSpacing: 8, color: "#fcd34d" }}>GEM LEGENDS</div>
      </div>

      <div
        style={{
          position: "absolute",
          left: "50%",
          top: 390,
          width: 720,
          height: 720,
          marginLeft: -360,
          marginTop: -30,
          padding: 20,
          display: "grid",
          gridTemplateColumns: "repeat(8, 1fr)",
          gridTemplateRows: "repeat(8, 1fr)",
          gap: 4,
          borderRadius: 34,
          border: "2px solid #a78bfa88",
          background: "linear-gradient(145deg, #171b42ee, #0b1029ee)",
          boxShadow: `0 0 80px #7c3aed55, inset 0 0 48px #67e8f922`,
          opacity: boardIn,
          transform: `translate(-50%, ${(1 - boardIn) * 55}px) scale(${0.94 + boardIn * 0.06})`,
        }}
      >
        {Array.from({ length: 64 }, (_, index) => <Gem key={index} index={index} frame={frame} />)}
      </div>

      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 90,
          textAlign: "center",
          opacity: subtitleIn,
          transform: `translateY(${(1 - subtitleIn) * 18}px)`,
        }}
      >
        <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: 2, color: "#e9d5ff" }}>Match. Discover. Restore the light.</div>
        <div style={{ marginTop: 14, fontSize: 18, letterSpacing: 5, color: "#a5b4fc" }}>A MAGICAL 2D MATCH-3 ADVENTURE</div>
      </div>
    </AbsoluteFill>
  );
}

registerRoot(() => (
  <Composition
    id="crystal-quest-intro"
    component={CrystalQuestIntro}
    width={W}
    height={H}
    fps={30}
    durationInFrames={300}
  />
));
