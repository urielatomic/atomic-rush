export default function Page() {
  return (
    <main style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      height: "100vh",
      background: "#111",
      color: "white",
      fontFamily: "sans-serif"
    }}>
      <h1 style={{ fontSize: "2rem", marginBottom: "8px" }}>Atomic Rush</h1>
      <p style={{ color: "#888" }}>Cargando juego...</p>
    </main>
  )
}
