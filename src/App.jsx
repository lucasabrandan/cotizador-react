// src/App.jsx
import React, { useEffect, useState } from "react";
import { NavLink, Routes, Route } from "react-router-dom";

import QuoteView from "./views/QuoteView.jsx";
import QuotesView from "./views/QuotesView.jsx";
import RepairQuoteView from "./views/RepairQuoteView.jsx";
import RepairQuotesView from "./views/RepairQuotesView.jsx";
import ProductsAdmin from "./views/ProductsAdmin.jsx";

export default function App() {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const toggleDrawer = () => setDrawerOpen((v) => !v);
  const closeDrawer = () => setDrawerOpen(false);

  // Evita el scroll del body cuando el drawer móvil está abierto
  useEffect(() => {
    document.body.classList.toggle("no-scroll", drawerOpen);
    return () => document.body.classList.remove("no-scroll");
  }, [drawerOpen]);

  // Detectar si es vista mobile
  const isMobile = window.matchMedia("(max-width: 768px)").matches;

  return (
    <>
      {/* Barra superior (solo mobile, visible con @media en CSS) */}
      <header className="topbar">
        <button className="menu-toggle" onClick={toggleDrawer} aria-label="Abrir menú">
          ☰
        </button>
        <strong>Cotizador</strong>
      </header>

      {/* Fondo semi-transparente al abrir menú (mobile) */}
      {drawerOpen && <div className="overlay" onClick={closeDrawer} />}

      <div className="app">
        {/* Sidebar */}
        <aside className={`sidebar ${drawerOpen ? "open" : ""}`}>
          <div
            className="brand"
            onClick={() => {
              if (isMobile) toggleDrawer(); // solo en mobile
            }}
            style={{ cursor: isMobile ? "pointer" : "default" }}
          >
            <img
              src="/logo.png"
              alt="Logo"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
              style={{
                maxWidth: "100%",
                height: "auto",
                borderRadius: 8,
                marginBottom: 8,
              }}
            />
            <span style={{ fontWeight: 700, color: "#fff" }}>Cotizador</span>
          </div>

          <nav onClick={closeDrawer}>
            <div className="nav-section">Ventas</div>
            <NavLink to="/" end className={({ isActive }) => (isActive ? "active" : "")}>
              Nueva cotización
            </NavLink>
            <NavLink to="/quotes" className={({ isActive }) => (isActive ? "active" : "")}>
              Presupuestos
            </NavLink>

            <div className="nav-section" style={{ marginTop: 12 }}>
              Reparaciones
            </div>
            <NavLink to="/repairs/new" className={({ isActive }) => (isActive ? "active" : "")}>
              Nueva reparación
            </NavLink>
            <NavLink to="/repairs" className={({ isActive }) => (isActive ? "active" : "")}>
              Reparaciones
            </NavLink>

            <div className="nav-section" style={{ marginTop: 12 }}>
              Configuración
            </div>
            <NavLink to="/products" className={({ isActive }) => (isActive ? "active" : "")}>
              Productos
            </NavLink>
          </nav>
        </aside>

        {/* Contenido principal */}
        <main className="content">
          <Routes>
            {/* Ventas */}
            <Route path="/" element={<QuoteView />} />
            <Route path="/quotes" element={<QuotesView />} />

            {/* Reparaciones */}
            <Route path="/repairs/new" element={<RepairQuoteView />} />
            <Route path="/repairs" element={<RepairQuotesView />} />

            {/* Catálogo */}
            <Route path="/products" element={<ProductsAdmin />} />

            {/* 404 */}
            <Route path="*" element={<div>404</div>} />
          </Routes>
        </main>
      </div>
    </>
  );
}
