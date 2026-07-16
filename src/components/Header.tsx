import React from 'react';

export default function Header() {
  return (
    <header className="glass-header">
      <div className="logo">
        <i className="fa-solid fa-prescription-bottle-medical logo-icon"></i>
        <h1>iCare <span>Pharmacy</span></h1>
      </div>
      <div className="badge-custom">
        <span className="pulse-dot"></span>
        CSDL Dược QĐ 522 & QĐ 228
      </div>
    </header>
  );
}
