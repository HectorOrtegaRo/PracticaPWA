import { useEffect, useState } from "react";
import "./styles/app.css";

export default function AppShell() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const onLoad = () => setReady(true);
    if (document.readyState === "complete") setReady(true);
    else window.addEventListener("load", onLoad);
    return () => window.removeEventListener("load", onLoad);
  }, []);

  return (
    <div className="app">
      {/* Splash overlay */}
      {!ready && (
        <div className="splash">
          <img src="/icons/icon-192.png" alt="Logo" />
          <p>Iniciando…</p>
        </div>
      )}

      {/* Shell: header + contenido + footer */}
      <header className="app-header">
        <img className="brand" src="/icons/icon-192.png" alt="logo" />
        <h1>My PWA</h1>
      </header>

      <main className="app-main">
        <section className="home">
          <h2>Home</h2>
          <p>Bienvenido a tu PWA base. Este es el App Shell.</p>
          <button className="btn">Acción</button>
        </section>
      </main>

      <footer className="app-footer">
        <small>© {new Date().getFullYear()} My PWA</small>
      </footer>
    </div>
  );
}
