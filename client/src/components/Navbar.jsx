import React from 'react';
import { Link, NavLink } from 'react-router-dom';
import SystemStatusBadge from './SystemStatusBadge.jsx';
import './Navbar.scss';

export const Navbar = () => {
  return (
    <header className="navbar">
      <div className="container navbar__container">
        <Link to="/" className="navbar__brand">
          <span className="navbar__logo-icon">GI</span>
          <span className="navbar__logo-text">
            Git<strong>Insight</strong>
          </span>
          <span className="navbar__version-pill">v0.1.0-phase1</span>
        </Link>

        <nav className="navbar__nav">
          <NavLink
            to="/"
            className={({ isActive }) =>
              `navbar__link ${isActive ? 'navbar__link--active' : ''}`
            }
            end
          >
            Overview
          </NavLink>
        </nav>

        <div className="navbar__actions">
          <SystemStatusBadge />
        </div>
      </div>
    </header>
  );
};

export default Navbar;
