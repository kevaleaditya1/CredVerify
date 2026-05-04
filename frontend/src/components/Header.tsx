import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useWeb3 } from '../contexts/Web3Context';
import { Menu, X, LogOut, Shield } from 'lucide-react';
import { config } from '../config';
import { cn } from '../lib/utils';

const Header: React.FC = () => {
  const { account, isConnected, connectWallet, disconnectWallet, chainId, switchNetwork, isOwner } = useWeb3();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const isWrongNetwork = chainId && chainId !== config.chainId;

  const navItems = [
    { path: '/university', label: 'University' },
    { path: '/student', label: 'Student' },
    { path: '/verify', label: 'Verify' },
  ];

  if (isOwner) {
    navItems.push({ path: '/admin', label: 'Admin' });
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-zinc-800 bg-black/95 backdrop-blur supports-[backdrop-filter]:bg-black/60">
      <div className="container-responsive flex h-16 items-center justify-between">
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center space-x-2 group">
            <Shield className="w-6 h-6 text-white group-hover:scale-110 transition-transform" />
            <span className="font-bold text-lg tracking-tighter">CredVerify</span>
          </Link>

          <nav className="hidden md:flex items-center space-x-6">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "text-sm font-medium transition-colors hover:text-white",
                  location.pathname === item.path ? "text-white" : "text-zinc-400"
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          {isConnected ? (
            <div className="flex items-center gap-4">
              {isWrongNetwork && (
                <button
                  onClick={switchNetwork}
                  className="hidden md:flex h-9 px-4 items-center bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-md text-xs font-bold hover:bg-amber-500/20 transition-all"
                >
                  SWITCH TO LOCALHOST
                </button>
              )}
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-md">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="text-xs font-mono text-zinc-300">{formatAddress(account!)}</span>
              </div>
              <button
                onClick={disconnectWallet}
                className="text-zinc-500 hover:text-white transition-colors"
                title="Disconnect"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={connectWallet}
              className="matte-button-primary h-9 px-4 text-xs font-bold rounded-md"
            >
              Connect Wallet
            </button>
          )}

          <button
            className="md:hidden text-zinc-400"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-b border-zinc-800 bg-black animate-in slide-in-from-top-4 duration-200">
          <nav className="flex flex-col p-6 space-y-4">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsMobileMenuOpen(false)}
                className={cn(
                  "text-lg font-bold",
                  location.pathname === item.path ? "text-white" : "text-zinc-500"
                )}
              >
                {item.label}
              </Link>
            ))}
            {!isConnected && (
              <button
                onClick={() => { connectWallet(); setIsMobileMenuOpen(false); }}
                className="matte-button-primary w-full mt-4"
              >
                Connect Wallet
              </button>
            )}
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;