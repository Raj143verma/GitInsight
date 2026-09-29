import React from 'react';
import { Link } from 'react-router-dom';
import './NotFoundPage.scss';

export const NotFoundPage = () => {
  return (
    <div className="not-found-page container">
      <div className="not-found-card">
        <span className="not-found-card__code">404</span>
        <h1 className="not-found-card__title">Page Not Found</h1>
        <p className="not-found-card__desc">
          The requested page could not be found or has not been implemented yet.
        </p>
        <Link to="/" className="btn btn--primary">
          Return to Overview
        </Link>
      </div>
    </div>
  );
};

export default NotFoundPage;
