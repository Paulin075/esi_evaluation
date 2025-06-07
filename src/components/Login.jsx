// src/components/Login.jsx
import React from 'react';
import './../CSS/Login.css'; // Ajustez le chemin selon votre structure

function Login() {
  const handleSubmit = (e) => {
    e.preventDefault();
    // Votre logique de connexion ici
    localStorage.setItem('isAuthenticated', 'true');
    window.location.href = '/dashboard';
  };

  return (
    <div className="container">
      <div className="login-box">
        <div className="logo">🌐 <span>ESI</span></div>
        <h2>Connectez-vous</h2>
        <form id="login-form" onSubmit={handleSubmit}>
          {/* Copiez le contenu de votre formulaire ici */}
        </form>
      </div>
    </div>
  );
}

export default Login;