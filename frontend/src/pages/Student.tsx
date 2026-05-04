import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { useWeb3 } from '../contexts/Web3Context';
import { config } from '../config';
import QRCode from 'qrcode.react';
import { 
  UserCircle, 
  Share2, 
  Eye, 
  ShieldCheck, 
  FileText,
  ExternalLink,
  Database,
  X,
  AlertCircle
} from 'lucide-react';

// Import real IPFS and verification utilities
import {
  retrieveJSONFromIPFS,
  getIPFSUrl,
} from '../utils/ipfs';
import { generateVerificationUrl } from '../utils/verification';

interface Credential {
  id: string;
  issuer: string;
  issuerName: string;
  type: string;
  issueDate: string;
  expiryDate: string;
  ipfsHash: string;
  verificationUrl: string;
  fileCID?: string;
  fileType?: string;
  metadata?: any;
}

const Student: React.FC = () => {
  const { account, contract, isConnected } = useWeb3();
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [loading, setLoading] = useState(true);
  const [showQRCode, setShowQRCode] = useState<string | null>(null);
  const [viewingDocument, setViewingDocument] = useState<string | null>(null);
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);
  const [documentType, setDocumentType] = useState<string | null>(null);

  const loadCredentials = useCallback(async () => {
    if (!contract || !account) return;
    
    setLoading(true);
    try {
      const credentialIds = await contract.getStudentCredentials(account);
      const creds: Credential[] = [];
      
      for (const id of credentialIds) {
        try {
          const result = await contract.verifyCredential(id);
          const credStruct = await contract.credentials(id);
          
          // Skip revoked (deleted) credentials
          if (result.isRevoked) continue;
          
          let issuerName = 'Authorized Entity';
          try {
            const issuer = await contract.issuers(result.issuer);
            issuerName = issuer.name || 'Authorized Entity';
          } catch {}

          let fileCID = '';
          let fileType = '';
          let metadata = null;
          if (credStruct.ipfsHash) {
            try {
              metadata = await retrieveJSONFromIPFS(credStruct.ipfsHash);
              fileCID = metadata.fileCID || '';
              fileType = metadata.fileType || '';
            } catch (e) {
              console.log('Metadata sync failed for', id);
            }
          }
          
          creds.push({
            id,
            issuer: result.issuer,
            issuerName,
            type: result.credentialType,
            issueDate: new Date(Number(result.issueDate) * 1000).toLocaleDateString(),
            expiryDate: result.expiryDate > 0 
              ? new Date(Number(result.expiryDate) * 1000).toLocaleDateString()
              : 'Permanent',
            ipfsHash: credStruct.ipfsHash,
            verificationUrl: generateVerificationUrl(id, await contract.getAddress(), config.chainId),
            fileCID,
            fileType,
            metadata,
          });
        } catch (error) {
          console.error('Error fetching credential info:', error);
        }
      }
      
      setCredentials(creds);
    } catch (error) {
      console.error('Error loading credentials:', error);
    } finally {
      setLoading(false);
    }
  }, [contract, account]);

  useEffect(() => {
    if (isConnected) loadCredentials();
  }, [isConnected, loadCredentials]);

  const view = async (c: Credential) => {
    if (!c.fileCID && !c.ipfsHash) return;
    try {
      setViewingDocument(c.id);
      let fileCID = c.fileCID;
      let fileType = c.fileType || c.metadata?.fileType || null;
      let targetCID = fileCID;
      
      if (!fileCID && c.ipfsHash) {
        const metadata = await retrieveJSONFromIPFS(c.ipfsHash);
        fileCID = metadata?.fileCID || '';
        fileType = metadata?.fileType || null;
        targetCID = fileCID || c.ipfsHash; // Fallback to showing metadata JSON
      }

      if (targetCID) {
        setDocumentUrl(getIPFSUrl(targetCID));
        setDocumentType(fileType || 'application/json');
      } else {
        toast.error('No source document linked');
        setViewingDocument(null);
      }
    } catch (error) {
      toast.error('Failed to load document data');
      setViewingDocument(null);
    }
  };

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <UserCircle className="w-16 h-16 text-zinc-800" />
        <h1 className="text-4xl font-bold tracking-tighter">Personal Vault</h1>
        <p className="text-muted-foreground">Authorize your identity wallet to access your records.</p>
      </div>
    );
  }

  return (
    <div className="space-y-12 pb-32">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-bold tracking-tighter">My Credentials</h1>
          <p className="text-muted-foreground text-sm font-medium">Sovereign identity storage on Ethereum.</p>
        </div>
        
        <div className="flex items-center gap-3 px-4 py-2 bg-black border border-zinc-900 rounded-2xl shadow-2xl">
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="text-xs font-bold text-zinc-400 font-mono italic">{account?.slice(0, 12)}...</span>
        </div>
      </header>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
           {[1,2,3].map(i => <div key={i} className="matte-card h-64 border-zinc-900/50 bg-zinc-950" />)}
        </div>
      ) : credentials.length === 0 ? (
        <div className="matte-card p-32 text-center flex flex-col items-center gap-6">
          <Database className="w-16 h-16 text-zinc-900" />
          <div className="space-y-2">
            <h3 className="text-xl font-bold">No Records Broadcasted</h3>
            <p className="text-zinc-600 text-sm max-w-xs mx-auto">Once an institution issues your certificate, it will appear here permanently.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {credentials.map((c) => (
            <div key={c.id} className="matte-card p-1 group relative overflow-hidden transition-all hover:scale-[1.02]">
               <div className="p-8 space-y-8 bg-zinc-950 rounded-[inherit] h-full flex flex-col">
                  <div className="flex items-start justify-between">
                     <div className="space-y-1">
                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Category</span>
                        <h3 className="text-xl font-bold capitalize">{c.type}</h3>
                     </div>
                     <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-emerald-500">
                        <ShieldCheck className="w-5 h-5" />
                     </div>
                  </div>

                  <div className="space-y-4 flex-1">
                     <div className="space-y-1">
                        <span className="text-[9px] font-black uppercase tracking-widest text-zinc-600">ISSUING ENTITY</span>
                        <p className="text-sm font-bold truncate">{c.issuerName}</p>
                     </div>
                     <div className="flex gap-8">
                       <div className="space-y-1">
                          <span className="text-[9px] font-black uppercase tracking-widest text-zinc-600">DATE</span>
                          <p className="text-xs font-bold">{c.issueDate}</p>
                       </div>
                       <div className="space-y-1">
                          <span className="text-[9px] font-black uppercase tracking-widest text-zinc-600">EXPIRY</span>
                          <p className="text-xs font-bold text-zinc-400">{c.expiryDate}</p>
                       </div>
                     </div>
                  </div>

                  <div className="pt-6 border-t border-zinc-900 flex items-center gap-2">
                    <button onClick={() => view(c)} className="matte-button-secondary flex-1 h-10 gap-2 border-zinc-900 bg-zinc-900 hover:bg-zinc-800" title="Source Verification">
                      <Eye className="w-3.5 h-3.5" />
                      View
                    </button>
                    <button onClick={() => setShowQRCode(c.id)} className="w-10 h-10 flex items-center justify-center rounded-xl bg-zinc-900 border border-zinc-800 hover:text-white transition-colors">
                      <Share2 className="w-4 h-4" />
                    </button>
                  </div>
               </div>
            </div>
          ))}
        </div>
      )}

      {showQRCode && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-center justify-center p-6">
          <div className="matte-card max-w-sm w-full p-10 space-y-8 animate-in zoom-in duration-300">
             <div className="text-center space-y-2">
               <h3 className="text-xl font-bold text-white">Share Your Achievement</h3>
               <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest">Public Verification Link</p>
             </div>
             <div className="bg-white p-6 rounded-2xl flex justify-center shadow-2xl">
               <QRCode value={credentials.find(c => c.id === showQRCode)?.id || ''} size={180} renderAs="svg" />
             </div>
             <div className="flex flex-col gap-3">
               <button onClick={() => {
                 navigator.clipboard.writeText(credentials.find(c => c.id === showQRCode)?.id || '');
                 toast.success('Hash Copied');
               }} className="matte-button-primary rounded-xl h-12">Copy Hash</button>
               <button onClick={() => setShowQRCode(null)} className="matte-button-secondary rounded-xl h-12">Dismiss</button>
             </div>
          </div>
        </div>
      )}

      {viewingDocument && documentUrl && (
        <div className="fixed inset-0 bg-black/95 z-[300] flex flex-col p-4 md:p-10 animate-in fade-in duration-300">
          <div className="flex justify-between items-center mb-6 max-w-7xl mx-auto w-full">
            <div className="flex items-center gap-3">
              <FileText className="w-6 h-6 text-white" />
              <div>
                <h3 className="font-bold text-white">Record Authentication</h3>
                <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest">Verified by decentralized protocol</p>
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
              <button onClick={() => { setViewingDocument(null); setDocumentUrl(null); }} className="w-12 h-12 flex items-center justify-center rounded-full hover:bg-zinc-900 transition-colors text-white">
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>
          <div className="flex-1 rounded-2xl overflow-hidden border border-zinc-900 bg-zinc-950 relative max-w-7xl mx-auto w-full flex items-center justify-center">
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
    </div>
  );
};

export default Student;