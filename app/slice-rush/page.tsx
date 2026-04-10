"use client"
import { useState, useRef, useEffect, useCallback } from "react"

const DURATION = 18000
const OBJECTS = ["🍎","🍊","🍋","🍇","🍉","🍓","🫐"]

let nextId = 1
function makeObj(elapsed) {
  const isBomb = elapsed > 4000 && Math.random() < 0.22
  const fromLeft = Math.random() > 0.5
  const x = fromLeft ? -8 : 108
  const y = 20 + Math.random() * 55
  const speed = (120 + Math.random() * 80) * (fromLeft ? 1 : -1)
  const vy = -80 - Math.random() * 60
  return {
    id: nextId++,
    x, y,
    vx: speed,
    vy,
    isBomb,
    emoji: isBomb ? "💣" : OBJECTS[Math.floor(Math.random() * OBJECTS.length)],
    size: 52 + Math.random() * 20,
    sliced: false,
    born: performance.now(),
  }
}

export default function SliceRush() {
  const [phase, setPhase] = useState("idle")
  const [score, setScore] = useState(0)
  const [combo, setCombo] = useState(1)
  const [objects, setObjects] = useState([])
  const [timeLeft, setTimeLeft] = useState(DURATION)
  const [slashTrail, setSlashTrail] = useState([])
  const [explosions, setExplosions] = useState([])

  const scoreRef    = useRef(0)
  const comboRef    = useRef(1)
  const comboTimer  = useRef(null)
  const startRef    = useRef(0)
  const rafRef      = useRef(null)
  const lastSpawn   = useRef(0)
  const spawnInt    = useRef(1100)
  const pointerDown = useRef(false)
  const trailRef    = useRef([])
  const expIdRef    = useRef(0)
  const objectsRef  = useRef([])

  // Keep objectsRef in sync
  useEffect(() => { objectsRef.current = objects }, [objects])

  const addExplosion = useCallback((x, y, isBomb) => {
    const id = expIdRef.current++
    setExplosions(prev => [...prev, { id, x, y, isBomb }])
    setTimeout(() => setExplosions(prev => prev.filter(e => e.id !== id)), 600)
  }, [])

  const endGame = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    setPhase("result")
  }, [])

  const loop = useCallback((ts) => {
    if (!startRef.current) { startRef.current = ts; lastSpawn.current = ts }
    const elapsed = ts - startRef.current
    const remaining = DURATION - elapsed
    if (remaining <= 0) { endGame(); return }

    setTimeLeft(Math.max(0, remaining))

    // Adjust spawn rate
    spawnInt.current = elapsed < 6000 ? 1100 : elapsed < 12000 ? 750 : 500

    const now = performance.now()
    const dt = 1/60

    setObjects(prev => {
      let updated = prev
        .map(o => {
          if (o.sliced) return o
          const gravity = 160
          return {
            ...o,
            x: o.x + o.vx * dt,
            y: o.y + o.vy * dt + 0.5 * gravity * dt * dt,
            vy: o.vy + gravity * dt,
          }
        })
        .filter(o => o.sliced ? (now - o.born < 800) : (o.x > -20 && o.x < 120 && o.y < 115))

      // Spawn
      if (ts - lastSpawn.current > spawnInt.current) {
        lastSpawn.current = ts
        updated = [...updated, makeObj(elapsed)]
      }
      return updated
    })

    rafRef.current = requestAnimationFrame(loop)
  }, [endGame])

  const startGame = useCallback(() => {
    nextId = 1
    scoreRef.current = 0
    comboRef.current = 1
    startRef.current = 0
    lastSpawn.current = 0
    setScore(0)
    setCombo(1)
    setTimeLeft(DURATION)
    setObjects([])
    setSlashTrail([])
    setExplosions([])
    setPhase("playing")
    rafRef.current = requestAnimationFrame(loop)
  }, [loop])

  // Swipe detection
  const checkSlice = useCallback((x, y) => {
    setObjects(prev => {
      let hit = false
      const updated = prev.map(o => {
        if (o.sliced) return o
        const cx = o.x / 100 * window.innerWidth
        const cy = o.y / 100 * (window.innerHeight - 48)
        const dist = Math.hypot(cx - x, cy - y)
        if (dist < o.size * 0.65) {
          hit = true
          addExplosion(o.x, o.y, o.isBomb)
          if (o.isBomb) {
            setTimeout(() => endGame(), 100)
            return { ...o, sliced: true }
          }
          const pts = 10 * comboRef.current
          scoreRef.current += pts
          setScore(scoreRef.current)
          // Combo
          clearTimeout(comboTimer.current)
          comboRef.current = Math.min(comboRef.current + 1, 5)
          setCombo(comboRef.current)
          comboTimer.current = setTimeout(() => { comboRef.current = 1; setCombo(1) }, 1200)
          return { ...o, sliced: true }
        }
        return o
      })
      return updated
    })
  }, [addExplosion, endGame])

  const onPointerMove = useCallback((e) => {
    if (!pointerDown.current || phase !== "playing") return
    const x = e.clientX
    const y = e.clientY
    trailRef.current = [...trailRef.current.slice(-8), { x, y, t: Date.now() }]
    setSlashTrail([...trailRef.current])
    checkSlice(x, y)
  }, [phase, checkSlice])

  const onPointerDown = useCallback((e) => {
    pointerDown.current = true
    trailRef.current = [{ x: e.clientX, y: e.clientY, t: Date.now() }]
    setSlashTrail(trailRef.current)
  }, [])

  const onPointerUp = useCallback(() => {
    pointerDown.current = false
    trailRef.current = []
    setSlashTrail([])
  }, [])

  // Fade trail
  useEffect(() => {
    if (slashTrail.length === 0) return
    const t = setTimeout(() => setSlashTrail([]), 120)
    return () => clearTimeout(t)
  }, [slashTrail])

  useEffect(() => () => cancelAnimationFrame(rafRef.current), [])

  const secs = Math.ceil(timeLeft / 1000)
  const urgent = timeLeft < 5000 && phase === "playing"

  if (phase === "idle") return (
    <div style={S.screen}>
      <div style={S.title}>Slice Rush</div>
      <p style={S.sub}>Arrastrá el dedo para cortar frutas</p>
      <div style={{ fontSize: 52, letterSpacing: 8 }}>🍎🍊🍋</div>
      <div style={{ display: "flex", gap: 20 }}>
        <div style={S.rule}><span style={{ fontSize: 22 }}>🍎</span><span style={{ color: "#34d399", fontWeight: 700 }}>+10</span></div>
        <div style={S.rule}><span style={{ fontSize: 22 }}>💣</span><span style={{ color: "#ef4444", fontWeight: 700 }}>FIN</span></div>
        <div style={S.rule}><span style={{ fontSize: 16, color: "rgba(255,255,255,.5)" }}>combo</span><span style={{ color: "#f59e0b", fontWeight: 700 }}>×2×3×5</span></div>
      </div>
      <button onPointerDown={startGame} style={S.btn}>Jugar · 18 segundos</button>
    </div>
  )

  if (phase === "playing") return (
    <div
      style={{ ...S.screen, justifyContent: "flex-start", padding: 0, overflow: "hidden", position: "relative", cursor: "crosshair" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
    >
      {/* HUD */}
      <div style={S.hud}>
        <div style={{ flex: 1, height: 4, background: "rgba(255,255,255,.1)", borderRadius: 2, overflow: "hidden" }}>
          <div style={{ height: "100%", background: urgent ? "#ef4444" : "rgba(255,255,255,.6)", width: (timeLeft / DURATION * 100) + "%", transition: "none" }} />
        </div>
        <span style={{ fontFamily: "monospace", fontSize: 20, fontWeight: 700, color: urgent ? "#ef4444" : "white", minWidth: 24 }}>{secs}</span>
        {combo > 1 && <span style={{ fontSize: 14, fontWeight: 700, color: "#f59e0b", minWidth: 32 }}>×{combo}</span>}
        <span style={{ fontSize: 20, fontWeight: 700, color: "white", minWidth: 52, textAlign: "right" }}>{score}</span>
      </div>

      {/* Game area */}
      <div style={{ position: "relative", flex: 1, width: "100%", touchAction: "none" }}>

        {/* Slash trail */}
        {slashTrail.length > 1 && (
          <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 30 }}>
            <polyline
              points={slashTrail.map(p => `${p.x},${p.y - 48}`).join(" ")}
              fill="none"
              stroke="rgba(255,255,255,0.85)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}

        {/* Objects */}
        {objects.map(o => (
          <div key={o.id} style={{
            position: "absolute",
            left: o.x + "%",
            top: o.y + "%",
            fontSize: o.size,
            transform: `translate(-50%, -50%) ${o.sliced ? "scale(1.4)" : "scale(1)"}`,
            opacity: o.sliced ? 0 : 1,
            transition: o.sliced ? "transform .15s, opacity .2s" : "none",
            pointerEvents: "none",
            userSelect: "none",
            zIndex: 10,
            lineHeight: 1,
          }}>
            {o.emoji}
          </div>
        ))}

        {/* Explosions */}
        {explosions.map(e => (
          <div key={e.id} style={{
            position: "absolute",
            left: e.x + "%",
            top: e.y + "%",
            transform: "translate(-50%, -50%)",
            fontSize: e.isBomb ? 52 : 36,
            pointerEvents: "none",
            zIndex: 20,
            animation: "explode .6s ease-out forwards",
          }}>
            {e.isBomb ? "💥" : "✨"}
          </div>
        ))}
      </div>

      <style>{`
        @keyframes explode {
          0%   { opacity:1; transform:translate(-50%,-50%) scale(.5); }
          50%  { opacity:1; transform:translate(-50%,-50%) scale(1.6); }
          100% { opacity:0; transform:translate(-50%,-50%) scale(2); }
        }
      `}</style>
    </div>
  )

  if (phase === "result") {
    const grade = score >= 150 ? "NINJA" : score >= 80 ? "SHARP" : score >= 40 ? "DECENT" : "BEGINNER"
    const gradeColor = score >= 150 ? "#34d399" : score >= 80 ? "#38bdf8" : score >= 40 ? "#f59e0b" : "#ef4444"
    return (
      <div style={S.screen}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,.4)", textTransform: "uppercase", letterSpacing: 3, marginBottom: 8 }}>resultado</div>
          <div style={{ fontSize: 30, fontWeight: 700, color: gradeColor, letterSpacing: 4 }}>{grade}</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 80, fontWeight: 700, color: "white", lineHeight: 1 }}>{score}</div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,.3)", textTransform: "uppercase", letterSpacing: 2, marginTop: 4 }}>puntos</div>
        </div>
        <div style={{ width: "100%", maxWidth: 320, display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={S.card}><span style={{ color: "rgba(255,255,255,.5)", fontSize: 13 }}>Rango</span><span style={{ color: gradeColor, fontWeight: 700 }}>{grade}</span></div>
        </div>
        <button onPointerDown={startGame} style={S.btn}>Jugar de nuevo</button>
      </div>
    )
  }
}

const S = {
  screen: { display: "flex", flexDirection: "column" as const, alignItems: "center", justifyContent: "center", height: "100dvh", background: "#111", color: "white", fontFamily: "sans-serif", gap: 24, padding: "0 24px", userSelect: "none" as const, touchAction: "none" as const },
  title:  { fontSize: 34, fontWeight: 700, letterSpacing: -1 },
  sub:    { fontSize: 14, color: "rgba(255,255,255,.4)", marginTop: -16 },
  hud:    { width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "14px 16px 8px", flexShrink: 0 },
  btn:    { width: "100%", maxWidth: 320, height: 56, borderRadius: 16, background: "#34d399", color: "#052e16", fontSize: 17, fontWeight: 700, border: "none", cursor: "pointer", touchAction: "none" as const },
  card:   { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", borderRadius: 12, background: "rgba(255,255,255,.06)" },
  rule:   { display: "flex", flexDirection: "column" as const, alignItems: "center", gap: 4, fontSize: 12 },
}
