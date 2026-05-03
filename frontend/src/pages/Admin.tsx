import React, { useState } from 'react';
import { useWeb3 } from '../contexts/Web3Context';
import { ShieldAlert, PlusCircle, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { config } from '../config';

const Admin: React.FC = () => {
  const { contract, account, isConnected, isOwner } = useWeb3();
  const [issuerAddress, setIssuerAddress] = useState('');
  const [issuerName, setIssuerName] = useState('');
  const [issuerCountry, setIssuerCountry] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleAddIssuer = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!contract || !isConnected) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (!issuerAddress || !issuerName || !issuerCountry) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      setIsLoading(true);
      const loadingToast = toast.loading('Waiting for confirmation...');

      const tx = await contract.addIssuer(issuerAddress, issuerName, issuerCountry);
      toast.loading('Transaction submitted, waiting for confirmation...', { id: loadingToast });
      
      await tx.wait();
      
      toast.success('Issuer added successfully!', { id: loadingToast });
      setIssuerAddress('');
      setIssuerName('');
      setIssuerCountry('');
    } catch (error: any) {
      console.error('Error adding issuer:', error);
      toast.error(error.reason || error.message || 'Failed to add issuer');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in duration-500">
        <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mb-6">
          <ShieldAlert className="w-8 h-8 text-zinc-500" />
        </div>
        <h2 className="text-2xl font-bold mb-4">Connect Wallet</h2>
        <p className="text-zinc-400 max-w-md">
          Please connect your wallet to access the Admin dashboard.
        </p>
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in duration-500">
        <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mb-6">
          <ShieldAlert className="w-8 h-8 text-zinc-500" />
        </div>
        <h2 className="text-2xl font-bold mb-4">Switch to Localhost</h2>
        <p className="text-zinc-400 max-w-md">
          This dashboard is only available when MetaMask is connected to chain {config.chainId}. Your wallet is connected, but the contract is not attached on the current network.
        </p>
      </div>
    );
  }

  if (isOwner === null) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in duration-500">
        <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mb-6">
          <ShieldAlert className="w-8 h-8 text-zinc-500" />
        </div>
        <h2 className="text-2xl font-bold mb-4">Verifying Ownership</h2>
        <p className="text-zinc-400 max-w-md">
          Checking the contract owner against your connected wallet.
        </p>
      </div>
    );
  }

  if (isOwner === false) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in duration-500">
        <div className="w-16 h-16 bg-red-900/20 rounded-full flex items-center justify-center mb-6">
          <AlertCircle className="w-8 h-8 text-red-500" />
        </div>
        <h2 className="text-2xl font-bold mb-4 text-red-500">Access Denied</h2>
        <p className="text-zinc-400 max-w-md">
          Only the contract owner can access this page. Your address ({account?.slice(0, 6)}...{account?.slice(-4)}) is not authorized.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 rounded-full text-xs font-bold tracking-wide mb-6">
          <ShieldAlert className="w-3.5 h-3.5" />
          ADMIN DASHBOARD
        </div>
        <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4">
          Add New <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">Issuer</span>
        </h1>
        <p className="text-zinc-400 text-lg">
          Authorize a new university or institution to issue verified credentials on the blockchain.
        </p>
      </div>

      <div className="matte-card p-8 md:p-10">
        <form onSubmit={handleAddIssuer} className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-zinc-300 mb-2">
              Issuer Wallet Address
            </label>
            <input
              type="text"
              value={issuerAddress}
              onChange={(e) => setIssuerAddress(e.target.value)}
              placeholder="0x..."
              className="w-full bg-black/50 border border-zinc-800 rounded-lg px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all font-mono text-sm"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-zinc-300 mb-2">
                Institution Name
              </label>
              <input
                type="text"
                value={issuerName}
                onChange={(e) => setIssuerName(e.target.value)}
                placeholder="e.g. Stanford University"
                className="w-full bg-black/50 border border-zinc-800 rounded-lg px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-zinc-300 mb-2">
                Country
              </label>
              <input
                type="text"
                value={issuerCountry}
                onChange={(e) => setIssuerCountry(e.target.value)}
                placeholder="e.g. USA"
                className="w-full bg-black/50 border border-zinc-800 rounded-lg px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
              />
            </div>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={isLoading || !isOwner}
              className="w-full h-12 bg-white text-black font-bold rounded-lg hover:bg-zinc-200 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
              ) : (
                <>
                  <PlusCircle className="w-5 h-5" />
                  Authorize Issuer
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Admin;
