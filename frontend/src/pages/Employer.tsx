import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { useWeb3 } from '../contexts/Web3Context';
import { Search, ScanLine, History, ShieldCheck, ShieldAlert, CheckCircle2, XCircle, Clock, ExternalLink } from 'lucide-react';
import { cn } from '../lib/utils';

// Import real verification utilities
import {
  parseVerificationData,
  isValidCredentialId,
} from '../utils/verification';

interface VerificationResult {
  credentialId: string;
  isValid: boolean;
  issuer: string;
  issuerName: string;
  student: string;
  credentialType: string;
  issueDate: string;
  expiryDate: string;
  isRevoked: boolean;
  verificationTime: string;
}

const Employer: React.FC = () => {
  const { contract, isConnected } = useWeb3();
  const [verificationInput, setVerificationInput] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [history, setHistory] = useState<VerificationResult[]>([]);
  const [currentResult, setCurrentResult] = useState<VerificationResult | null>(null);

  const verify = async (id: string) => {
    if (!contract) return null;
    try {
      const result = await contract.verifyCredential(id);
      let issuerName = 'Unknown Entity';
      try {
        const issuer = await contract.issuers(result.issuer);
        issuerName = issuer.name || 'Unknown Entity';
      } catch {}

      return {
        credentialId: id,
        isValid: result.isValid,
        issuer: result.issuer,
        issuerName,
        student: result.student,
        credentialType: result.credentialType,
        issueDate: new Date(Number(result.issueDate) * 1000).toLocaleDateString(),
        expiryDate: result.expiryDate > 0 
          ? new Date(Number(result.expiryDate) * 1000).toLocaleDateString()
          : 'Indefinite',
        isRevoked: result.isRevoked,
        verificationTime: new Date().toLocaleTimeString(),
      };
    } catch (error: any) {
      toast.error('Record mismatch or missing');
      return null;
    }
  };

  const handleVerify = async () => {
    if (!verificationInput.trim()) return;
    setVerifying(true);
    try {
      let id = '';
      const parsed = parseVerificationData(verificationInput.trim());
      if (parsed) {
        id = parsed.credentialId;
      } else if (isValidCredentialId(verificationInput.trim())) {
        id = verificationInput.trim();
      } else {
        toast.error('Incompatible Signature Format');
        setVerifying(false);
        return;
      }

      const result = await verify(id);
      if (result) {
        setCurrentResult(result);
        setHistory(prev => [result, ...prev.slice(0, 5)]);
        if (result.isValid && !result.isRevoked) toast.success('Cryptographic match found');
      }
    } finally {
      setVerifying(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <ScanLine className="w-16 h-16 text-zinc-800" />
        <h1 className="text-4xl font-bold tracking-tighter">Audit Terminal</h1>
        <p className="text-muted-foreground">Standardized portal for academic verification.</p>
      </div>
    );
  }

  return (
    <div className="space-y-12 pb-32">
      <header className="text-center space-y-4 max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold tracking-tighter">Verification Protocol</h1>
        <p className="text-muted-foreground">Enter a unique credential hash to verify its authenticity on the Ethereum ledger.</p>
      </header>

      {/* Input section */}
      <section className="bg-zinc-950 border border-zinc-900 rounded-[2rem] p-12 space-y-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(circle_at_100%_0%,rgba(255,255,255,0.03),transparent)]" />
        <div className="relative space-y-4">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-600 transition-colors group-focus-within:text-white" />
            <input
              type="text"
              value={verificationInput}
              onChange={(e) => setVerificationInput(e.target.value)}
              placeholder="Broadcasting Search... (0x...)"
              className="matte-input h-16 pl-12 pr-6 rounded-2xl bg-zinc-900 border-zinc-800 focus:bg-black transition-all text-base"
              onKeyPress={(e) => e.key === 'Enter' && handleVerify()}
            />
          </div>
          <button
            onClick={handleVerify}
            disabled={verifying || !verificationInput.trim()}
            className="matte-button-primary w-full h-16 rounded-2xl text-sm font-black uppercase tracking-[0.2em]"
          >
            {verifying ? "Initializing Cryptography..." : "Run Global Audit"}
          </button>
        </div>
      </section>

      {/* Result Display */}
      {currentResult && (
        <section className="animate-in fade-in slide-in-from-top-8 duration-500">
           <div className={cn(
             "matte-card p-12 overflow-hidden relative",
             currentResult.isValid && !currentResult.isRevoked ? "border-emerald-900/50" : "border-rose-900/50"
           )}>
              <div className="flex flex-col md:flex-row gap-12 items-start justify-between">
                <div className="space-y-8 flex-1">
                  <div className="flex items-center gap-4">
                    {currentResult.isValid && !currentResult.isRevoked ? (
                      <div className="w-16 h-16 bg-emerald-950 text-emerald-400 rounded-2xl flex items-center justify-center shadow-2xl">
                        <ShieldCheck className="w-8 h-8" />
                      </div>
                    ) : (
                      <div className="w-16 h-16 bg-rose-950 text-rose-400 rounded-2xl flex items-center justify-center shadow-2xl">
                        <ShieldAlert className="w-8 h-8" />
                      </div>
                    )}
                    <div>
                      <h2 className="text-3xl font-bold tracking-tighter uppercase italic opacity-90">
                        {currentResult.isValid && !currentResult.isRevoked ? "Match Found" : "Invalid Signature"}
                      </h2>
                      <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Blockchain Status Check</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-x-12 gap-y-6">
                    <div className="space-y-1">
                      <span className="text-[9px] font-black uppercase tracking-widest text-zinc-600">Category</span>
                      <p className="font-bold text-lg capitalize">{currentResult.credentialType}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[9px] font-black uppercase tracking-widest text-zinc-600">Registrar</span>
                      <p className="font-bold text-lg">{currentResult.issuerName}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[9px] font-black uppercase tracking-widest text-zinc-600">Issue Date</span>
                      <p className="font-bold">{currentResult.issueDate}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[9px] font-black uppercase tracking-widest text-zinc-600">Audit Time</span>
                      <p className="font-bold">{currentResult.verificationTime}</p>
                    </div>
                  </div>
                </div>

                <div className="w-full md:w-80 space-y-6 p-8 bg-zinc-900 border border-zinc-800 rounded-3xl">
                   <div className="space-y-2">
                     <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Unique ID</span>
                     <div className="bg-black p-4 rounded-xl border border-zinc-800 font-mono text-[10px] break-all text-zinc-400 select-all">
                       {currentResult.credentialId}
                     </div>
                   </div>
                   <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-600 uppercase tracking-widest">
                      <Clock className="w-3 h-3" />
                      Immutable History Sync
                   </div>
                </div>
              </div>
           </div>
        </section>
      )}

      {/* History */}
      {history.length > 0 && (
        <section className="space-y-6">
           <h3 className="text-xl font-bold tracking-tighter px-2">Audit History</h3>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {history.map((h, i) => (
                <div key={i} className="matte-card p-6 flex flex-col justify-between gap-6 hover:border-zinc-700 transition-all cursor-pointer" onClick={() => setCurrentResult(h)}>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                       <h4 className="font-bold capitalize">{h.credentialType}</h4>
                       <p className="text-[10px] text-zinc-500 font-medium">{h.issuerName}</p>
                    </div>
                    {h.isValid ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <XCircle className="w-4 h-4 text-rose-500" />}
                  </div>
                  <div className="flex items-center justify-between">
                     <span className="text-[10px] font-mono text-zinc-600 uppercase">{h.verificationTime}</span>
                     <ExternalLink className="w-3 h-3 text-zinc-800" />
                  </div>
                </div>
              ))}
           </div>
        </section>
      )}
    </div>
  );
};

export default Employer;