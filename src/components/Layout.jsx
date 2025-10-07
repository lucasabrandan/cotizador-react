// D:\Pruebas\Cotizador\src\components\Layout.jsx
import React from "react";
import { Link, NavLink, Outlet } from "react-router-dom";

export default function Layout() {
  return (
    <div className="app-container">
      <aside className="sidebar">
        <Link to="/" className="brand">
          <img src="/logo.png" alt="Logo" />
          <span>Cotizador</span>
        </Link>
        <nav>
          <NavLink to="/quote" className={({ isActive }) => isActive ? "active" : ""}>
            Nueva cotización
          </NavLink>
          <NavLink to="/quotes" className={({ isActive }) => isActive ? "active" : ""}>
            Presupuestos
          </NavLink>
        </nav>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
