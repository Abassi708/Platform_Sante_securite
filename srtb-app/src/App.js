import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import RoleSelection from './components/RoleSelection';
import AdminLogin from './components/AdminLogin';
import AdminDashboard from './components/AdminDashboard';
import TechnicienLogin from './components/TechnicienLogin';
import TechnicienDashboard from './components/TechnicienDashboard';
import SocialLogin from './components/SocialLogin';
import SocialDashboard from './components/SocialDashboard';
import AgentLogin from './components/AgentLogin';
import AgentDashboard from './components/AgentDashboard';
import HistoriqueConnexions from './components/HistoriqueConnexions';

function App() {
  return (
    <Router>
      <Routes>
        {/* ========== PAGE D'ACCUEIL ========== */}
        <Route path="/" element={<RoleSelection />} />
        
        {/* ========== ROUTES ADMIN ========== */}
        <Route path="/admin" element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/historique" element={<HistoriqueConnexions />} />
        
        {/* ========== ROUTES TECHNICIEN ========== */}
        <Route path="/technicien" element={<TechnicienLogin />} />
        <Route path="/technicien/dashboard" element={<TechnicienDashboard />} />
        <Route path="/technicien/historique" element={<HistoriqueConnexions />} />
        
        {/* ========== ROUTES SOCIAL ========== */}
        <Route path="/social" element={<SocialLogin />} />
        <Route path="/social/dashboard" element={<SocialDashboard />} />
        <Route path="/social/historique" element={<HistoriqueConnexions />} />
        
        {/* ========== ROUTES AGENT ========== */}
        <Route path="/agent" element={<AgentLogin />} />
        <Route path="/agent/dashboard" element={<AgentDashboard />} />
        
        {/* ========== REDIRECTION PAR DÉFAUT ========== */}
        <Route path="*" element={<RoleSelection />} />
      </Routes>
    </Router>
  );
}

export default App;