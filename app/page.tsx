"use client"
import { useState, useRef, useEffect, useCallback } from "react"

const DURATION = 20000
const ZONES = [
  { from: 0,  to: 10, pts: 0, label: "MISS",    color: "#ef4444" },
  { from: 10, to: 25, pts: 1, label: "BAD",     color: "#f59e0b" },
  { from: 25, to: 40, pts: 2, label: "GOOD",    color: "#38bdf8" },
  { from: 40, to: 60, pts: 3, label: "PERFECT", color: "#34d399" },
  { from: 60, to: 75, pts: 2, label: "GOOD",    color: "#38bdf8" },
  { from: 75, to: 90, pts: 1, label: "BAD",     color: "#f59e0b" },
  { from: 90, to:100, pts: 0, label: "MISS",    color: "#ef4444" },
]

function getZone(pos) {
  return ZONES.find(z => pos >= z.from && pos < z.to) || ZONES[0]
}

export default function Game() {
  const [phase, setPhase] = useState("idle")
  const [score, setScore] = useState(0)
  const [timeLeft, setTimeLeft] = useState(DURATION)
  const [feedback, setFeedback] = useState(null)
  const [barPos, setBarPos] = useState(50)

  const posRef = useRef(50)
  const dirRef = useRef(1)
  const speedRef = useRef(35)
  const scoreRef = useRef(0)
  const startRef = useRef(0)
  const rafRef = useRef(null)
  const lastRef = useRef(0)
  const feedTimerRef = useRef(null)

  const stop = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    setPhase("result")
  }, [])

  const loop = useCallback((ts) => {
    if (!startRef.current) { startRef.current = ts; lastRef.current = ts }
    const elapsed = ts - startRef.current
    const remaining = DURATION - elapsed
    if (remaining <= 0) { stop(); return }

    const dt = (ts - lastRef.current) / 1000
    lastRef.current = ts

    const progress = elapsed / DURATION
    speedRef.current = 35 + (80 - 35) * progress

    let newPos = posRef.current + speedRef.current * dirRef.current * dt
    if (newPos >= 100) { newPos = 100; dirRef.current = -1 }
    if (newPos <= 0)   { newPos = 0;   dirRef.current = 1  }
    posRef.current = newPos

    setBarPos(newPos)
    setTimeLeft(Math.max(0, remaining))
    rafRef.current = requestAnimationFrame(loop)
  }, [stop])

  const startGame = useCallback(() => {
    posRef.current = 50
    dirRef.current = 1
    speedRef.current = 35
    scoreRef.current = 0
    startRef.current = 0
    lastRef.current = 0
    setScore(0)
    setTimeLeft(DURATION)
    setFeedback(null)
    setPhase("playing")
    rafRef.current = requestAnimationFrame(loop)
  }, [loop])

  const tap = useCallback(() => {
    if (phase !== "playing") return
    const zone = getZone(posRef.current)
    scoreRef.current += zone.pts
    setScore(scoreRef.current)
    dirRef.current = dirRef.current * -1
    clearTimeout(feedTimerRef.current)
    setFeedback(zone)
    feedTimerRef.current = setTimeout(() => setFeedback(null), 600)
    if (navigator.vibrate) {
      if (zone.label === "PERFECT") navigator.vibrate([10,10,10])
      else if (zone.pts > 0) navigator.vibrate(15)
      else navigator.vibrate(40)
    }
  }, [phase])

  useEffect(() => () => cancelAnimationFrame(rafRef.current), [])

  const secs = Math.ceil(timeLeft / 1000)
  const urgent = timeLeft < 5000 && phase === "playing"

  if (phase === "idle") return (
    <div onPointerDown={startGame} style={S.screen}>
      <div style={S.title}>Atomic Rush</div>
      <p style={S.sub}>Detené la barra en la zona verde</p>
      <div style={S.track}>
        {ZONES.map((z,i) => (
          <div key={i} style={{position:"absolute",top:0,bottom:0,left:z.from+"%",width:(z.to-z.from)+"%",background:z.color,opacity:.7}}/>
        ))}
        <div style={{...S.bar, transform:`translateX(calc(${50}% - 6px))`}}/>
      </div>
      <div style={S.cta}>Tocá para jugar · 20 segundos</div>
    </div>
  )

  if (phase === "playing") return (
    <div onPointerDown={tap} style={{...S.screen, justifyContent:"space-between", padding:"24px 20px"}} onTouchEnd={e=>e.preventDefault()}>
      <div style={S.hud}>
        <div style={{flex:1,height:6,background:"rgba(255,255,255,.1)",borderRadius:3,overflow:"hidden"}}>
          <div style={{height:"100%",background:urgent?"#ef4444":"rgba(255,255,255,.6)",width:(timeLeft/DURATION*100)+"%",transition:"none"}}/>
        </div>
        <span style={{...S.timer, color:urgent?"#ef4444":"white"}}>{secs}</span>
        <span style={S.pts}>{score}</span>
      </div>

      <div>
        <div style={{height:28,position:"relative",marginBottom:8}}>
          {feedback && (
            <div style={{position:"absolute",left:`clamp(10%,${posRef.current}%,90%)`,transform:"translateX(-50%)",background:feedback.color,color:"#111",padding:"2px 12px",borderRadius:20,fontSize:12,fontWeight:700,whiteSpace:"nowrap"}}>
              {feedback.label}{feedback.pts>0?` +${feedback.pts}`:""}
            </div>
          )}
        </div>
        <div style={S.track}>
          {ZONES.map((z,i)=>(
            <div key={i} style={{position:"absolute",top:0,bottom:0,left:z.from+"%",width:(z.to-z.from)+"%",background:z.color,opacity:.75}}/>
          ))}
          <div style={{...S.bar, transform:`translateX(calc(${barPos}% - 6px))`}}/>
        </div>
        <p style={{textAlign:"center",color:"rgba(255,255,255,.25)",fontSize:13,marginTop:12}}>Tocá en cualquier parte</p>
      </div>

      <div style={{textAlign:"center"}}>
        <div style={{fontSize:72,fontWeight:700,color:"white",lineHeight:1}}>{score}</div>
        <div style={{fontSize:11,color:"rgba(255,255,255,.3)",textTransform:"uppercase",letterSpacing:2,marginTop:6}}>puntos</div>
      </div>
    </div>
  )

  if (phase === "result") {
    const grade = score >= 25 ? "PERFECT" : score >= 12 ? "GOOD" : score >= 5 ? "BAD" : "MISS"
    const gradeColor = score >= 25 ? "#34d399" : score >= 12 ? "#38bdf8" : score >= 5 ? "#f59e0b" : "#ef4444"
    return (
      <div style={S.screen}>
        <div style={{textAlign:"center"}}>
          <div style={{fontSize:11,color:"rgba(255,255,255,.4)",textTransform:"uppercase",letterSpacing:3,marginBottom:8}}>resultado</div>
          <div style={{fontSize:32,fontWeight:700,color:gradeColor,letterSpacing:4}}>{grade}</div>
        </div>
        <div style={{textAlign:"center"}}>
          <div style={{fontSize:80,fontWeight:700,color:"white",lineHeight:1}}>{score}</div>
          <div style={{fontSize:12,color:"rgba(255,255,255,.3)",textTransform:"uppercase",letterSpacing:2,marginTop:4}}>puntos</div>
        </div>
        <div style={{width:"100%",maxWidth:320,display:"flex",flexDirection:"column",gap:8}}>
          <div style={S.card}><span style={{color:"rgba(255,255,255,.5)",fontSize:13}}>Taps totales</span><span style={{color:"white",fontWeight:700}}>{score}</span></div>
          <div style={S.card}><span style={{color:"rgba(255,255,255,.5)",fontSize:13}}>Mejor zona</span><span style={{color:gradeColor,fontWeight:700}}>{grade}</span></div>
        </div>
        <button onPointerDown={startGame} style={S.btn}>Jugar de nuevo</button>
      </div>
    )
  }
}

const S = {
  screen: { display:"flex",flexDirection:"column" as const,alignItems:"center",justifyContent:"center",height:"100dvh",background:"#111",color:"white",fontFamily:"sans-serif",gap:32,padding:"0 20px",userSelect:"none" as const,touchAction:"none" as const },
  title:  { fontSize:36,fontWeight:700,letterSpacing:-1 },
  sub:    { fontSize:14,color:"rgba(255,255,255,.4)",marginTop:-20 },
  track:  { position:"relative" as const,width:"100%",maxWidth:320,height:64,borderRadius:16,overflow:"hidden" },
  bar:    { position:"absolute" as const,top:4,bottom:4,left:0,width:12,borderRadius:9999,background:"white",boxShadow:"0 0 12px rgba(255,255,255,.8)",willChange:"transform" as const,transition:"none" as const },
  cta:    { fontSize:13,color:"rgba(255,255,255,.3)" },
  hud:    { width:"100%",display:"flex",alignItems:"center",gap:12 },
  timer:  { fontFamily:"monospace",fontSize:24,fontWeight:700,minWidth:28,textAlign:"right" as const },
  pts:    { color:"rgba(255,255,255,.4)",fontSize:14,fontFamily:"monospace",minWidth:32,textAlign:"right" as const },
  card:   { display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 14px",borderRadius:12,background:"rgba(255,255,255,.06)" },
  btn:    { width:"100%",maxWidth:320,height:56,borderRadius:16,background:"#34d399",color:"#052e16",fontSize:17,fontWeight:700,border:"none",cursor:"pointer" },
}
