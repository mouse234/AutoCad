import React from 'react';
import './AuthModal.css';

const AuthModal = ({ onGuest }) => {
  return (
    <div className="auth-backdrop">
      <div className="auth-modal">
        <div className="brand">
          <div className="logo">🛠️</div>
          <div className="title">CAD Chatbot</div>
        </div>
        <p className="subtitle">Welcome — design parts with natural language. Powered by Advanced AI. Continue as a guest to try the studio.</p>

        <div className="auth-actions">
          <button className="primary" onClick={onGuest}>Continue as Guest</button>
          <button className="secondary" onClick={onGuest}>Sign in (skip)</button>
        </div>

        <div className="footnote">By continuing you accept this demo's terms. Authentication is not enforced in this preview.</div>
      </div>
    </div>
  );
};

export default AuthModal;
