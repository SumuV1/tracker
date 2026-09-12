import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";

// Bez tego jeden wyjątek w renderze to biała strona bez słowa wyjaśnienia.
// Tu przynajmniej widać, co poszło nie tak, i da się odświeżyć bez szukania
// konsoli — na telefonie konsoli nie ma.
class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div style={{ minHeight: "100vh", background: "#0a0a0a", color: "#f1f1f1", fontFamily: "'Inter',sans-serif",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ maxWidth: 480, background: "#161616", border: "1px solid #6b2020", borderRadius: 14, padding: 20 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#f87171", marginBottom: 8 }}>Coś się wysypało w interfejsie</div>
          <div style={{ fontSize: 12, color: "#8a8a8a", lineHeight: 1.6, marginBottom: 12 }}>
            Dane są bezpieczne — to błąd wyświetlania, nie zapisu. Odśwież stronę; jeśli wraca, poniższy komunikat mówi gdzie.
          </div>
          <pre style={{ fontSize: 11, color: "#bbb", background: "#0a0a0a", borderRadius: 8, padding: 10, overflowX: "auto", whiteSpace: "pre-wrap", margin: "0 0 12px" }}>
            {String(this.state.error?.message || this.state.error)}
          </pre>
          <button onClick={() => location.reload()} style={{ background: "#2a2a2a", border: "1px solid #444", borderRadius: 8, color: "#fff", padding: "8px 16px", fontSize: 13, cursor: "pointer" }}>
            Odśwież
          </button>
        </div>
      </div>
    );
  }
}

createRoot(document.getElementById("root")).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
