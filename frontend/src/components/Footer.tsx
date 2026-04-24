import React from 'react';
import { Link } from 'react-router-dom';

const Footer: React.FC = () => {
  return (
    <footer className="border-t border-zinc-900/50 py-12 bg-zinc-950/20 backdrop-blur-xl">
       <div className="container-responsive flex flex-col md:flex-row justify-between items-center gap-12">
         <div className="flex flex-col items-center md:items-start gap-4">
           <div className="flex items-center gap-2">
             <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-black font-black text-xl italic tracking-tighter shadow-2xl">V</div>
             <span className="text-sm font-black uppercase tracking-[0.3em] text-white">CredVerify</span>
           </div>
           <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest text-center md:text-left leading-relaxed">
             The Decentralized Authority <br /> for Academic Authenticity
           </p>
         </div>

         <div className="flex flex-wrap justify-center gap-x-12 gap-y-6">
           <Link to="/" className="text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-white transition-colors">Protocol</Link>
           <Link to="/university" className="text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-white transition-colors">Registrar</Link>
           <Link to="/student" className="text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-white transition-colors">Vault</Link>
           <Link to="/verify" className="text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-white transition-colors">Audit</Link>
         </div>

         <div className="flex flex-col items-center md:items-end gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-700">© 2026 Ethereum Network</span>
            <div className="flex items-center gap-2">
               <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
               <span className="text-[9px] font-black uppercase tracking-widest text-emerald-900/50">Mainnet Synchronization Active</span>
            </div>
         </div>
       </div>
    </footer>
  );
};

export default Footer;
