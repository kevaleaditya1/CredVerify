import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useWeb3 } from '../contexts/Web3Context';

import { config } from '../config';

const Header: React.FC = () => {
  const { account, isConnected, connectWallet, disconnectWallet, chainId, switchNetwork } = useWeb3();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const isWrongNetwork = chainId && chainId !== config.chainId;

  const navItems = [
    { path: '/', label: 'Home', icon: '🏠' },
    { path: '/university', label: 'University', icon: '🎓' },
    { path: '/student', label: 'Student', icon: '👨‍🎓' },
    { path: '/verify', label: 'Verify', icon: '🔍' },
  ];

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      <header className="bg-white shadow-lg border-b relative z-50 sticky top-0">
        <div className="container mx-auto px-3 sm:px-4 lg:px-6">
          <div className="flex justify-between items-center h-14 sm:h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-2" onClick={closeMobileMenu}>
              <div className="w-7 h-7 sm:w-8 sm:h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xs sm:text-sm">D</span>
              </div>
              <span className="text-lg sm:text-xl font-bold text-gray-900">DACV</span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex space-x-6 xl:space-x-8">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`text-sm font-medium transition-colors hover:text-primary-600 px-2 py-1 rounded-md ${
                    location.pathname === item.path
                      ? 'text-primary-600 bg-primary-50'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <span className="hidden xl:inline">{item.icon} </span>
                  {item.label}
                </Link>
              ))}
            </nav>

            {/* Mobile menu button */}
            <button
              onClick={toggleMobileMenu}
              className="lg:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 active:bg-gray-200 transition-colors"
              aria-label="Toggle mobile menu"
              aria-expanded={isMobileMenuOpen}
            >
              <div className="w-5 h-5 sm:w-6 sm:h-6 flex flex-col justify-center items-center">
                <span className={`bg-current block transition-all duration-300 ease-out h-0.5 w-5 sm:w-6 rounded-sm ${
                  isMobileMenuOpen ? 'rotate-45 translate-y-1' : '-translate-y-0.5'
                }`}></span>
                <span className={`bg-current block transition-all duration-300 ease-out h-0.5 w-5 sm:w-6 rounded-sm my-0.5 ${
                  isMobileMenuOpen ? 'opacity-0' : 'opacity-100'
                }`}></span>
                <span className={`bg-current block transition-all duration-300 ease-out h-0.5 w-5 sm:w-6 rounded-sm ${
                  isMobileMenuOpen ? '-rotate-45 -translate-y-1' : 'translate-y-0.5'
                }`}></span>
              </div>
            </button>

            {/* Desktop Wallet Connection */}
            <div className="hidden lg:flex items-center space-x-3 xl:space-x-4">
              {isWrongNetwork && (
                <button
                  onClick={switchNetwork}
                  className="btn bg-warning-500 text-white hover:bg-warning-600 text-xs xl:text-sm px-3 py-2"
                >
                  <span className="hidden xl:inline">⚠️ </span>Switch Network
                </button>
              )}
              
              {isConnected ? (
                <div className="flex items-center space-x-2 xl:space-x-3">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-success-500 rounded-full"></div>
                    <span className="text-xs xl:text-sm text-gray-600 font-mono">
                      {formatAddress(account!)}
                    </span>
                  </div>
                  <button
                    onClick={disconnectWallet}
                    className="btn-secondary text-xs xl:text-sm px-3 py-2"
                  >
                    Disconnect
                  </button>
                </div>
              ) : (
                <button
                  onClick={connectWallet}
                  className="btn-primary text-xs xl:text-sm px-3 py-2"
                >
                  <span className="hidden xl:inline">🔗 </span>Connect
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden backdrop-blur-sm"
          onClick={closeMobileMenu}
          aria-hidden="true"
        ></div>
      )}

      {/* Mobile Menu */}
      <div className={`fixed top-14 sm:top-16 left-0 right-0 bg-white shadow-xl z-50 lg:hidden transform transition-all duration-300 ease-in-out border-t ${
        isMobileMenuOpen ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'
      }`}>
        <div className="max-h-screen overflow-y-auto">
          <div className="px-4 py-4 space-y-4">
            {/* Mobile Navigation */}
            <nav className="space-y-1">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-3">
                Navigation
              </div>
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={closeMobileMenu}
                  className={`flex items-center space-x-4 p-4 rounded-xl transition-all duration-200 active:scale-95 ${
                    location.pathname === item.path
                      ? 'bg-primary-100 text-primary-700 border-l-4 border-primary-600 shadow-sm'
                      : 'text-gray-700 hover:bg-gray-50 active:bg-gray-100'
                  }`}
                >
                  <span className="text-2xl">{item.icon}</span>
                  <div className="flex-1">
                    <span className="font-semibold text-base">{item.label}</span>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {item.path === '/' ? 'Main dashboard' : 
                       item.path === '/university' ? 'Issue credentials' :
                       item.path === '/student' ? 'View credentials' :
                       'Verify credentials'}
                    </div>
                  </div>
                  {location.pathname === item.path && (
                    <div className="w-2 h-2 bg-primary-600 rounded-full"></div>
                  )}
                </Link>
              ))}
            </nav>

            {/* Mobile Wallet Section */}
            <div className="border-t pt-4 space-y-4">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-3">
                Wallet
              </div>
              
              {isWrongNetwork && (
                <button
                  onClick={() => {
                    switchNetwork();
                    closeMobileMenu();
                  }}
                  className="w-full flex items-center justify-center space-x-2 p-4 bg-warning-500 text-white rounded-xl font-semibold active:scale-95 transition-transform"
                >
                  <span>⚠️</span>
                  <span>Switch Network</span>
                </button>
              )}
              
              {isConnected ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 bg-success-50 rounded-xl border border-success-200">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 bg-success-500 rounded-full animate-pulse"></div>
                      <div>
                        <span className="text-sm font-semibold text-success-800">Connected</span>
                        <div className="text-xs text-success-600">
                          {Object.values(config.networks).find(n => n.chainId === config.chainId)?.name || 'Correct Network'}
                        </div>
                      </div>
                    </div>
                    <span className="text-sm text-success-700 font-mono bg-success-100 px-2 py-1 rounded">
                      {formatAddress(account!)}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      disconnectWallet();
                      closeMobileMenu();
                    }}
                    className="w-full flex items-center justify-center space-x-2 p-4 bg-gray-100 text-gray-700 rounded-xl font-semibold active:scale-95 transition-transform hover:bg-gray-200"
                  >
                    <span>🔌</span>
                    <span>Disconnect Wallet</span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    connectWallet();
                    closeMobileMenu();
                  }}
                  className="w-full flex items-center justify-center space-x-2 p-4 bg-primary-600 text-white rounded-xl font-semibold active:scale-95 transition-transform hover:bg-primary-700"
                >
                  <span>🔗</span>
                  <span>Connect Wallet</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Header;