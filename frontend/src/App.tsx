import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Web3Provider } from './contexts/Web3Context';
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './pages/Home';
import University from './pages/University';
import Student from './pages/Student';
import Employer from './pages/Employer';
import Verify from './pages/Verify';
import Admin from './pages/Admin';

function App() {
  return (
    <Web3Provider>
      <div className="min-h-screen bg-black text-foreground relative selection:bg-zinc-800">
        {/* Sub-surface gradients for premium depth */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-zinc-900/40 blur-[120px] rounded-full" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-zinc-900/30 blur-[150px] rounded-full" />
          {/* Subtle Grain Overlay */}
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] mix-blend-overlay" />
        </div>

        <div className="relative z-10 flex flex-col min-h-screen">
          <Header />
          <main className="flex-1 container-responsive py-20 md:py-32">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/university" element={<University />} />
              <Route path="/student" element={<Student />} />
              <Route path="/employer" element={<Employer />} />
              <Route path="/verify" element={<Verify />} />
              <Route path="/admin" element={<Admin />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </div>
    </Web3Provider>
  );
}

export default App;