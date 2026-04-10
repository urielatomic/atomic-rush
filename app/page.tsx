"use client"
import { useState, useRef, useEffect, useCallback } from "react"

const DURATION = 15000

const PHASES = [
  { until: 5000,  spawnMs: 900,  lifeMs: 1800, maxCircles: 3 },
  { until: 10000, spawnMs: 650,  lifeMs: 1300, maxCircles: 5 },
  { until: 15000, spawnMs: 450,  lifeMs: 950,  maxCircles: 7 },
]

function getPhase(elapsed) {
  return PHASES.find(p => elapsed < p.until) || PHASES[PHASES.length - 1]
}

let nextId = 1
function makeCircle(elapsed) {
  const isGreen = Math.random() > 0.4
  const phase = getPhase(elapsed)
  const size = 64 + Math.random() * 32
  return {
    id: nextId++,
    x: 8 + Math.random() * 74,
    y: 15 + Math.random() * 65,
    green: isGreen,
    size,
    born: performance.now(),
    lifeMs: phase.lifeMs,
    tapped: false,
    missed: false,
    fadeOut: false,
  }
}

export default function TargetSwitch() {
  const [phase, setPhase] = useState("idle")
  const [score, setScore] = useState(0)
  const [circles, setCircles] = useState([])
  const [timeLeft, setTimeLeft] = useState(DURATION)
  const [feedback, setFeedback] = useState([])

  const scoreRef = useRef(0)
  const startRef = useRef(0)
  const rafRef = useRef(null)
  const lastSpawnRef = useRef(0)
  const feedIdRef = useRef(0)

  const addFeedback = useCallback((text, color, x, y) => {
    const id = feedIdRef.current++
    setFeedback(prev => [...prev, { id, text, color, x, y }])
    setTimeout(() => setFeedback(prev => prev.filter(f => f.id !== id)), 700)
  }, [])

  const endGame = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    setPhase("result")
  }, [])

  const loop = useCallback((ts) => {
    if (!startRef.current) {
      startRef.current = ts
      lastSpawnRef.current = ts
    }
    const elapsed = ts - startRef.current
    const remaining = DURATION - elapsed

    if (remaining <= 0) { endGame(); return }

    setTimeLeft(Math.max(0, remaining))

    const now = performance.now()
    const phase = getPhase(elapsed)

    setCircles(prev => {
      let updated = prev.map(c => {
        if (c.tapped || c.missed || c.fadeOut) return c
        const age = now - c.born
        if (age >= c.lifeMs) {
          if (c.green) {
            scoreRef.current = Math.max(0, scoreRef.current - 5)
            setScore(scoreRef.current)
            addFeedback("-5", "#f87171", c.x, c.y)
          }
          return { ...c, missed: true, fadeOut: true }
        }
        return c
      })

      updated = updated.filter(c => {
        if (!c.fadeOut) return true
        const fadeAge = now - c.born - c.lifeMs
        return fadeAge < 400
      })

      const timeSinceSpawn = ts - lastSpawnRef.current
      if (timeSinceSpawn >= phase.spawnMs && updated.filter(c => !c.fadeOut && !c.missed).length < phase.maxCircles) {
        lastSpawnRef.current = ts
        updated = [...updated, makeCircle(elapsed)]
      }

      return updated
    })

    rafRef.current = requestAnimationFrame(loop)
  }, [endGame, addFeedback])

  const startGame = useCallback(() => {
    nextId = 1
    scoreRef.current = 0
    startRef.current = 0
    lastSpawnRef.current = 0
    setScore(0)
    setTimeLeft(DURATION)
    setCircles([])
    setFeedback([])
    setPhase("playing")
    rafRef.current = requestAnimationFrame(loop)
  }, [loop])

  const tapCircle = useCallback((e, circle) => {
    e.stopPropagation()
    if (circle.tapped || circle.missed || circle.fadeOut) return
    if (circle.green) {
      scoreRef.current += 10
      addFeedback("+10", "#34d399", circle.x, circle.y)
      if (navigator.vibrate) navigator.vibrate([10, 10, 10])
    } else {
      scoreRef.current = Math.max(0, scoreRef.current - 15)
      addFeedback("-15", "#f87171", circle.x, circle.y)
      if (navigator.vibrate) navigator.vibrate([60])
    }
    setScore(scoreRef.current)
    setCircles(prev => prev.map(c =>
      c.id === circle.id ? { ...c, tapped: true, fadeOut: true } : c
    ))
  }, [addFeedback])

  useEffect(() => () => cancelAnimationFrame(rafRef.current), [])

  const secs = Math.ceil(timeLeft / 1000)
  const urgent = timeLeft < 5000 && phase === "playing"

  if (phase === "idle") return (
    <div style={S.screen}>
      <div style={S.title}>Target Switch</div>
      <p style={S.sub}>Tocá los verdes · Evitá los rojos</p>
      <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
          <div style={{ ...S.demoCircle, background: "#34d399" }} />
          <span style={{ fontSize: 11, color: "#34d399", fontWeight: 600 }}>+10</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
          <div style={{ ...S.demoCircle, background: "#ef4444" }} />
          <span style={{ fontSize: 11, color: "#ef4444", fontWeight: 600 }}>-15</span>
        </div>
      </div>
      <div style={{ fontSize: 12, color: "rgba(255,255,255,.25)", textAlign: "center", lineHeight: 1.7 }}>
        No tocar verde: -5 pts<br />Ignorar rojo: sin penalidad
      </div>
      <button onPointerDown={startGame} style={S.btn}>Jugar · 15 segundos</button>
    </div>
  )

  if (phase === "playing") return (
    <div style={{ ...S.screen, justifyContent: "flex-start", padding: 0, overflow: "hidden", position: "relative" }}>
      <div style={{ ...S.hud, position: "relative", zIndex: 10 }}>
        <div style={{ flex: 1, height: 4, background: "rgba(255,255,255,.1)", borderRadius: 2, overflow: "hidden" }}>
          <div style={{ height: "100%", background: urgent ? "#ef4444" : "rgba(255,255,255,.6)", width: (timeLeft / DURATION * 100) + "%", transition: "none" }} />
        </div>
        <span style={{ fontFamily: "monospace", fontSize: 22, fontWeight: 700, color: urgent ? "#ef4444" : "white", minWidth: 26, textAlign: "right" }}>{secs}</span>
        <span style={{ fontSize: 20, fontWeight: 700, color: "white", minWidth: 48, textAlign: "right" }}>{score}</span>
      </div>
      <div style={{ position: "relative", flex: 1, width: "100%", touchAction: "none" }}>
        {feedback.map(f => (
          <div key={f.id} style={{ position: "absolute", left: f.x + "%", top: f.y + "%", transform: "translate(-50%, -50%)", color: f.color, fontSize: 18, fontWeight: 700, pointerEvents: "none", animation: "floatUp .7s ease-out forwards", zIndex: 20 }}>{f.text}</div>
        ))}
        {circles.filter(c => !c.missed || (performance.now() - c.born - c.lifeMs < 400)).map(c => {
          const age = performance.now() - c.born
          const lifeRatio = Math.min(1, age / c.lifeMs)
          const isFading = c.tapped || c.missed
          const opacity = isFading ? Math.max(0, 1 - (performance.now() - c.born - (c.tapped ? 0 : c.lifeMs)) / 400) : 1
          const scale = isFading ? 0.5 : 1
          return (
            <div key={c.id} onPointerDown={(e) => tapCircle(e, c)} style={{ position: "absolute", left: c.x + "%", top: c.y + "%", width: c.size, height: c.size, transform: `translate(-50%, -50%) scale(${scale})`, borderRadius: "50%", background: c.green ? "#34d399" : "#ef4444", opacity, transition: isFading ? "transform .2s, opacity .3s" : "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: c.green ? "0 0 20px rgba(52,211,153,.4)" : "0 0 20px rgba(239,68,68,.4)", zIndex: 5 }}>
              <svg style={{ position: "absolute", inset: -3, width: c.size + 6, height: c.size + 6 }} viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="46" fill="none" stroke="rgba(255,255,255,.3)" strokeWidth="4" />
                <circle cx="50" cy="50" r="46" fill="none" stroke="rgba(255,255,255,.8)" strokeWidth="4" strokeDasharray={`${289 * (1 - lifeRatio)} 289`} strokeLinecap="round" transform="rotate(-90 50 50)" />
              </svg>
              <span style={{ fontSize: c.size * 0.3, fontWeight: 700, color: "white", pointerEvents: "none" }}>{c.green ? "✓" : "✕"}</span>
            </div>
          )
        })}
      </div>
      <style>{`@keyframes floatUp { 0% { opacity:1; transform:translate(-50%,-50%) scale(1.2); } 100% { opacity:0; transform:translate(-50%,calc(-50% - 40px)) scale(1); } }`}</style>
    </div>
  )

  if (phase === "result") {
    const grade = score >= 80 ? "MASTER" : score >= 50 ? "SHARP" : score >= 25 ? "DECENT" : "SLOW"
    const gradeColor = score >= 80 ? "#34d399" : score >= 50 ? "#38bdf8" : score >= 25 ? "#f59e0b" : "#ef4444"
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
          <div style={S.card}><span style={{ color: "rgba(255,255,255,.5)", fontSize: 13 }}>Nivel de reacción</span><span style={{ color: gradeColor, fontWeight: 700 }}>{grade}</span></div>
        </div>
        <button onPointerDown={startGame} style={S.btn}>Jugar de nuevo</button>
      </div>
    )
  }
}

const S = {
  screen: { display: "flex", flexDirection: "column" as const, alignItems: "center", justifyContent: "center", height: "100dvh", background: "#111", color: "white", fontFamily: "sans-serif", gap: 28, padding: "0 24px", userSelect: "none" as const, touchAction: "none" as const },
  title: { fontSize: 34, fontWeight: 700, letterSpacing: -1 },
  sub: { fontSize: 14, color: "rgba(255,255,255,.4)", marginTop: -16 },
  hud: { width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "16px 16px 8px" },
  btn: { width: "100%", maxWidth: 320, height: 56, borderRadius: 16, background: "#34d399", color: "#052e16", fontSize: 17, fontWeight: 700, border: "none", cursor: "pointer", touchAction: "none" as const },
  card: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", borderRadius: 12, background: "rgba(255,255,255,.06)" },
  demoCircle: { width: 56, height: 56, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" },
}
