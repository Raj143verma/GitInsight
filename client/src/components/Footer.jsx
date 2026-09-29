import React from 'react';
import './Footer.scss';

export const Footer = () => {
  return (
    <footer className="footer">
      <div className="container footer__container">
        <div className="footer__info">
          <span className="footer__brand">GitInsight</span>
          <span className="footer__desc">
            GitHub Developer Growth, Activity Analytics & Career Intelligence
          </span>
        </div>
        <div className="footer__meta">
          <span className="footer__phase">Phase 1: Project Foundation</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
