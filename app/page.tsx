"use client"
import { useRouter } from "next/navigation"

export default function Home() {
  const router = useRouter()

  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", height: "100dvh", background: "#111",
      color: "white", fontFamily: "sans-serif", gap: 32, padding: "0 24px",
      userSelect: "none"
    }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 32, fontWeight: 700, marginBottom: 6 }}>Atomic Rush</div>
        <div style={{ fontSize: 14, color: "rgba(255,255,255,.4)" }}>Elegí tu juego</div>
      </div>

      <div style={{ width: "100%", maxWidth: 320, display: "flex", flexDirection: "column", gap: 12 }}>

        <button onPointerDown={() => router.push("/target-switch")} style={{
          width: "100%", height: 80, borderRadius: 16,
          background: "rgba(52,211,153,.12)", border: "0.5px solid rgba(52,211,153,.3)",
          color: "white", cursor: "pointer", display: "flex",
          alignItems: "center", padding: "0 20px", gap: 16, touchAction: "none"
        }}>
          <span style={{ fontSize: 36 }}>🎯</span>
          <div style={{ textAlign: "left" }}>
            <div style={{ fontSize: 17, fontWeight: 700 }}>Target Switch</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,.4)", marginTop: 2 }}>Tocá los verdes · Evitá los rojos · 15s</div>
          </div>
        </button>

        <button onPointerDown={() => router.push("/slice-rush")} style={{
          width: "100%", height: 80, borderRadius: 16,
          background: "rgba(251,191,36,.1)", border: "0.5px solid rgba(251,191,36,.3)",
          color: "white", cursor: "pointer", display: "flex",
          alignItems: "center", padding: "0 20px", gap: 16, touchAction: "none"
        }}>
          <span style={{ fontSize: 36 }}>🍎</span>
          <div style={{ textAlign: "left" }}>
            <div style={{ fontSize: 17, fontWeight: 700 }}>Slice Rush</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,.4)", marginTop: 2 }}>Cortá frutas con swipe · Evitá bombas · 18s</div>
          </div>
        </button>
      </div>

      <div style={{ fontSize: 11, color: "rgba(255,255,255,.2)" }}>
        Más juegos próximamente
      </div>
    </div>
  )
}
