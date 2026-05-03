import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useWeb3 } from '../contexts/Web3Context';
import { 
  ShieldCheck, 
  ShieldAlert, 
  Search, 
  Clock, 
  Calendar, 
  User, 
  Award, 
  Building2, 
  ExternalLink,
  ChevronRight,
  Database,
  FileText,
  Lock,
  X,
  AlertCircle
} from 'lucide-react';
import { cn } from '../lib/utils';
import { retrieveJSONFromIPFS, getIPFSUrl } from '../utils/ipfs';
import { isValidCredentialId } from '../utils/verification';

interface VerificationDetails {
  credentialId: string;
  student: string;
  issuer: string;
  issuerName: string;
  credentialType: string;
  issueDate: string;
  expiryDate: string;
  isValid: boolean;
  isRevoked: boolean;
  ipfsHash: string;
  metadata?: any;
}

const Verify: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { contract } = useWeb3();
  const [loading, setLoading] = useState(false);
  const [details, setDetails] = useState<VerificationDetails | null>(null);
  const [manualId, setManualId] = useState('');
  const [viewingDocument, setViewingDocument] = useState(false);
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);
  const [documentType, setDocumentType] = useState<string | null>(null);

  const verify = useCallback(async (id: string) => {
    if (!id) return;
    
    // Clean up the ID in case the user copied extra spaces or the 'HASH: ' prefix
    let cleanId = id.replace(/^(HASH:\s*)/i, '').trim();
    
    // Auto-prepend 0x if they missed it and it's exactly 64 hex characters
    if (cleanId.length === 64 && /^[a-fA-F0-9]{64}$/.test(cleanId)) {
      cleanId = '0x' + cleanId;
    }
    
    // Update the input field with the cleaned ID
    if (cleanId !== id) {
      setManualId(cleanId);
    }
    
    if (!isValidCredentialId(cleanId)) {
      toast.error(`Invalid credential ID length (${cleanId.length}). Must be a 66-character hex string (0x...).`);
      return;
    }

    if (!contract) {
      toast.error('Please connect your wallet to verify credentials.');
      return;
    }

    setLoading(true);
    setDetails(null);
    try {
      const result = await contract.verifyCredential(cleanId);
      const credStruct = await contract.credentials(cleanId);
      let issuerName = 'Authorized Registrar';
      try {
        const issuer = await contract.issuers(result.issuer);
        issuerName = issuer.name || 'Authorized Registrar';
      } catch {}

      let metadata = null;
      if (credStruct.ipfsHash) {
        try {
          metadata = await retrieveJSONFromIPFS(credStruct.ipfsHash);
        } catch (e) {
          console.log('Metadata load failed');
        }
      }

      setDetails({
        credentialId: id,
        student: result.student,
        issuer: result.issuer,
        issuerName,
        credentialType: result.credentialType,
        issueDate: new Date(Number(result.issueDate) * 1000).toLocaleDateString(),
        expiryDate: result.expiryDate > 0 
          ? new Date(Number(result.expiryDate) * 1000).toLocaleDateString()
          : 'Permanent',
        isValid: result.isValid,
        isRevoked: result.isRevoked,
        ipfsHash: credStruct.ipfsHash,
        metadata
      });
      
      if (result.isValid && !result.isRevoked) toast.success('Integrity Verified');
      else toast.error('Check Status Flagged');
    } catch (error: any) {
      toast.error('Record not found on-chain');
    } finally {
      setLoading(false);
    }
  }, [contract]);

  useEffect(() => {
    const id = searchParams.get('id');
    if (id) {
       setManualId(id);
       verify(id);
    }
  }, [searchParams, verify]);

  const viewSource = async () => {
    let targetCID = details?.metadata?.fileCID;
    let targetType = details?.metadata?.fileType;

    if (!targetCID && details?.ipfsHash) {
      targetCID = details.ipfsHash;
      targetType = 'application/json';
    }

    if (!targetCID) {
      toast.error(`Error: ipfsHash is '${details?.ipfsHash}' and fileCID is '${details?.metadata?.fileCID}'`);
      return;
    }

    setDocumentUrl(getIPFSUrl(targetCID));
    setDocumentType(targetType || 'application/json');
    setViewingDocument(true);
  };

  return (
    <div className="space-y-16 pb-32">
      <header className="text-center space-y-4 max-w-2xl mx-auto">
        <h1 className="text-5xl font-bold tracking-tighter">Audit Terminal</h1>
        <p className="text-muted-foreground text-lg italic tracking-tight">Authenticate any academic record instantly using the Ethereum decentralized ledger.</p>
      </header>

      {/* Audit Input */}
      <section className="max-w-3xl mx-auto">
        <div className="matte-card p-1">
           <div className="bg-zinc-950 p-2 rounded-[inherit] flex flex-col md:flex-row gap-2">
             <div className="relative flex-1 group">
               <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-700 group-focus-within:text-white transition-colors" />
               <input
                 type="text"
                 value={manualId}
                 onChange={(e) => setManualId(e.target.value)}
                 className="w-full bg-zinc-900 border-none h-14 pl-12 pr-4 rounded-xl text-sm focus:ring-1 focus:ring-zinc-700 focus:bg-black transition-all"
                 placeholder="Enter Unique Signature (0x...)"
               />
             </div>
             <button
               onClick={() => verify(manualId)}
               disabled={loading || !manualId}
               className="matte-button-primary h-14 px-10 rounded-xl font-black uppercase tracking-widest"
             >
               {loading ? "SEARCHING..." : "AUDIT RECORD"}
             </button>
           </div>
        </div>
      </section>

      {/* Results */}
      {details && (
        <section className="animate-in fade-in slide-in-from-top-12 duration-700">
           <div className={cn(
             "matte-card p-12 lg:p-20 relative overflow-hidden",
             details.isValid && !details.isRevoked ? "border-emerald-900/30" : "border-rose-900/30"
           )}>
             {/* Background Decoration */}
             <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(circle_at_100%_0%,rgba(255,255,255,0.02),transparent)]" />
             
             <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-16 items-start">
                {/* Result Indicator */}
                <div className="lg:col-span-4 flex flex-col items-center justify-center space-y-8 text-center bg-zinc-900/50 p-12 rounded-[3rem] border border-zinc-800">
                   {details.isValid && !details.isRevoked ? (
                     <div className="w-32 h-32 bg-emerald-950 border border-emerald-900/50 rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(16,185,129,0.1)]">
                        <ShieldCheck className="w-14 h-14 text-emerald-500" />
                     </div>
                   ) : (
                     <div className="w-32 h-32 bg-rose-950 border border-rose-900/50 rounded-full flex items-center justify-center">
                        <ShieldAlert className="w-14 h-14 text-rose-500" />
                     </div>
                   )}
                   <div className="space-y-2">
                     <h2 className="text-4xl font-bold uppercase italic tracking-tighter">
                       {details.isValid && !details.isRevoked ? "Authentic" : "Invalid"}
                     </h2>
                     <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">Live Ledger Verification</p>
                   </div>
                </div>

                {/* Detail Grid */}
                <div className="lg:col-span-8 flex flex-col gap-12">
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-16 gap-y-10">
                      <div className="space-y-2">
                        <span className="text-[9px] font-black uppercase tracking-widest text-zinc-600">Category</span>
                        <p className="text-xl font-bold capitalize">{details.credentialType}</p>
                      </div>
                      <div className="space-y-2">
                        <span className="text-[9px] font-black uppercase tracking-widest text-zinc-600">Registrar Hub</span>
                        <p className="text-xl font-bold">{details.issuerName}</p>
                      </div>
                      <div className="space-y-2">
                        <span className="text-[9px] font-black uppercase tracking-widest text-zinc-600">Issuance Date</span>
                        <p className="text-base font-bold">{details.issueDate}</p>
                      </div>
                      <div className="space-y-2">
                        <span className="text-[9px] font-black uppercase tracking-widest text-zinc-600">Validity Cap</span>
                        <p className="text-base font-bold">{details.expiryDate}</p>
                      </div>
                   </div>

                   <div className="space-y-6 pt-10 border-t border-zinc-900">
                      <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-4">
                        <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Public Recipient Address</span>
                        <p className="text-xs font-mono text-zinc-400 break-all select-all">{details.student}</p>
                      </div>
                      <div className="flex flex-wrap gap-4">
                        <button onClick={viewSource} className="matte-button-primary h-12 px-8 rounded-xl text-xs gap-2">
                          <FileText className="w-4 h-4" />
                          SOURCE DOCUMENT
                        </button>
                        <Link to="/" className="matte-button-secondary h-12 px-8 rounded-xl text-xs bg-zinc-900 border-zinc-800 hover:bg-zinc-800 flex items-center justify-center">
                          RETURN PORTAL
                        </Link>
                      </div>
                   </div>
                </div>
             </div>
           </div>
        </section>
      )}

      {/* Source View Modal */}
      {viewingDocument && documentUrl && (
        <div className="fixed inset-0 bg-black/95 z-[500] flex flex-col p-4 md:p-10 animate-in fade-in duration-300">
          <div className="flex justify-between items-center mb-6 max-w-7xl mx-auto w-full">
            <div className="flex items-center gap-3">
              <Lock className="w-6 h-6 text-zinc-500" />
              <div>
                <h3 className="font-bold">Encrypted Data Source</h3>
                <p className="text-[10px] text-zinc-600 uppercase font-black tracking-widest">Verified by IPFS Protocol</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <a 
                href={documentUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors text-sm font-bold"
              >
                <ExternalLink className="w-4 h-4" />
                Open Source
              </a>
              <button onClick={() => setViewingDocument(false)} className="w-12 h-12 flex items-center justify-center rounded-full hover:bg-zinc-900 transition-colors text-white">
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>
          <div className="flex-1 rounded-[2rem] overflow-hidden border border-zinc-800 bg-zinc-950 relative max-w-7xl mx-auto w-full flex items-center justify-center">
            {documentUrl.includes('mock') || documentUrl.includes('QmTest') ? (
              <div className="text-center space-y-4 max-w-md px-6">
                <AlertCircle className="w-16 h-16 text-zinc-700 mx-auto" />
                <h3 className="text-xl font-bold text-white">Test Mode Document</h3>
                <p className="text-zinc-500 text-sm">
                  This credential was issued in IPFS Test Mode. It uses a mock identifier ({documentUrl.split('/').pop()}) instead of a real uploaded file, so there is no document to display.
                </p>
              </div>
            ) : documentType?.startsWith('image/') ? (
              <img src={documentUrl} alt="Source Document" className="w-full h-full object-contain" />
            ) : (
              <object data={documentUrl} type={documentType || "application/pdf"} className="w-full h-full bg-white">
                <div className="w-full h-full flex flex-col items-center justify-center space-y-4 bg-zinc-950 p-6">
                  <FileText className="w-16 h-16 text-zinc-700" />
                  <h3 className="text-xl font-bold text-white">Preview Blocked</h3>
                  <p className="text-zinc-500 text-sm text-center max-w-sm">
                    Your browser security settings prevent embedding decentralized documents directly.
                  </p>
                  <a href={documentUrl} target="_blank" rel="noopener noreferrer" className="matte-button-primary px-8 h-12 rounded-xl mt-4">
                    Open in New Tab
                  </a>
                </div>
              </object>
            )}
          </div>
        </div>
      )}

      {/* Footer Visuals */}
      {!details && (
        <footer className="grid grid-cols-1 md:grid-cols-3 gap-8 opacity-20 transition-all">
          <div className="flex flex-col items-center gap-4 text-center">
             <Database className="w-10 h-10" />
             <p className="text-xs font-bold uppercase tracking-widest leading-relaxed">Immutable State <br /> Consensus</p>
          </div>
          <div className="flex flex-col items-center gap-4 text-center">
             <ShieldCheck className="w-10 h-10" />
             <p className="text-xs font-bold uppercase tracking-widest leading-relaxed">Cryptographic <br /> Authenticity</p>
          </div>
          <div className="flex flex-col items-center gap-4 text-center">
             <ExternalLink className="w-10 h-10" />
             <p className="text-xs font-bold uppercase tracking-widest leading-relaxed">Global <br /> Synchronization</p>
          </div>
        </footer>
      )}
    </div>
  );
};

export default Verify;