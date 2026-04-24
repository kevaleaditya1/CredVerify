import React, { useState, useEffect, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import toast from 'react-hot-toast';
import { useWeb3 } from '../contexts/Web3Context';
import QRCode from 'qrcode.react';
import { 
  Upload, 
  FileText, 
  Award, 
  Trash2, 
  Share2, 
  Eye, 
  CheckCircle2, 
  Globe, 
  AlertCircle,
  Clock,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Building2,
  Database,
  X
} from 'lucide-react';
import { cn } from '../lib/utils';

// Import real IPFS and verification utilities
import {
  uploadCredential,
  createCredentialMetadata,
  isIPFSConfigured,
  getIPFSStatus,
  retrieveJSONFromIPFS,
  getIPFSUrl,
  type CredentialMetadata
} from '../utils/ipfs';
import { generateVerificationUrl } from '../utils/verification';

interface IssuedCredential {
  id: string;
  student: string;
  type: string;
  issueDate: string;
  ipfsHash: string;
  verificationUrl: string;
  fileCID?: string;
  metadataCID?: string;
}

const University: React.FC = () => {
  const { account, contract, isConnected } = useWeb3();
  const [isAuthorizedIssuer, setIsAuthorizedIssuer] = useState(false);
  const [issuerInfo, setIssuerInfo] = useState<any>(null);
  const [issuingCredential, setIssuingCredential] = useState(false);
  const [issuedCredentials, setIssuedCredentials] = useState<IssuedCredential[]>([]);
  const [showQRCode, setShowQRCode] = useState<string | null>(null);
  const [ipfsStatus, setIpfsStatus] = useState<{ configured: boolean; message: string }>({ configured: false, message: '' });
  
  const [formData, setFormData] = useState({
    studentAddress: '',
    studentName: '',
    credentialType: 'degree',
    major: '',
    grade: '',
    expiryDate: '',
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [viewingDocument, setViewingDocument] = useState<string | null>(null);
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);

  const loadIssuedCredentials = useCallback(async () => {
    if (!contract || !account) return;
    
    try {
      const credentialIds = await contract.getIssuerCredentials(account);
      const credentials: IssuedCredential[] = [];
      
      for (const id of credentialIds) {
        try {
          const result = await contract.verifyCredential(id);
          let fileCID = '';
          let metadataCID = result.ipfsHash || '';
          
          try {
            if (metadataCID) {
              const metadata = await retrieveJSONFromIPFS(metadataCID);
              fileCID = metadata.fileCID || '';
            }
          } catch (error) {
            console.log('Could not retrieve metadata for credential:', id);
          }
          
          credentials.push({
            id,
            student: result.student,
            type: result.credentialType,
            issueDate: new Date(Number(result.issueDate) * 1000).toLocaleDateString(),
            ipfsHash: result.ipfsHash || '',
            verificationUrl: generateVerificationUrl(id, await contract.getAddress(), 17000),
            fileCID,
            metadataCID,
          });
        } catch (error) {
          console.error('Error loading credential:', error);
        }
      }
      
      setIssuedCredentials(credentials);
    } catch (error) {
      console.error('Error loading issued credentials:', error);
    }
  }, [contract, account]);

  useEffect(() => {
    const checkIssuerStatus = async () => {
      if (contract && account) {
        try {
          const isAuthorized = await contract.authorizedIssuers(account);
          setIsAuthorizedIssuer(isAuthorized);
          
          if (isAuthorized) {
            const issuer = await contract.issuers(account);
            setIssuerInfo(issuer);
            loadIssuedCredentials();
          }
        } catch (error) {
          console.error('Error checking issuer status:', error);
        }
      }
    };

    const ipfsConfig = getIPFSStatus();
    setIpfsStatus(ipfsConfig);
    checkIssuerStatus();
  }, [contract, account, loadIssuedCredentials]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      if (file.type === 'application/pdf' || file.type.startsWith('image/')) {
        setSelectedFile(file);
        toast.success('Document attached');
      } else {
        toast.error('Invalid format. Use PDF or Images.');
      }
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.png', '.jpg', '.jpeg'],
    },
    maxFiles: 1,
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const issue = async () => {
    if (!contract || !account || !selectedFile) {
      toast.error('Missing required fields');
      return;
    }

    if (!isIPFSConfigured()) {
      toast.error('IPFS Protocol Error: Storage Key Missing');
      return;
    }

    setIssuingCredential(true);
    try {
      const metadata: CredentialMetadata = createCredentialMetadata(
        formData.studentName,
        formData.credentialType,
        issuerInfo?.name || 'Authorized Institution',
        formData.studentAddress,
        account,
        {
          major: formData.major,
          grade: formData.grade,
          expiryDate: formData.expiryDate || undefined,
          country: issuerInfo?.country || 'Node',
        }
      );

      toast.loading('Synchronizing with IPFS...', { id: 'ipfs' });
      const { metadataCID } = await uploadCredential(selectedFile, metadata);
      toast.success('IPFS Synchronization Complete', { id: 'ipfs' });
      
      toast.loading('Broadcasting to Ledger...', { id: 'eth' });
      const expiryTimestamp = formData.expiryDate 
        ? Math.floor(new Date(formData.expiryDate).getTime() / 1000)
        : 0;
      
      const tx = await contract.issueCredential(
        formData.studentAddress,
        metadataCID,
        formData.credentialType,
        expiryTimestamp
      );
      
      await tx.wait();
      toast.success('Record Permanently Issued', { id: 'eth' });
      
      setFormData({
        studentAddress: '',
        studentName: '',
        credentialType: 'degree',
        major: '',
        grade: '',
        expiryDate: '',
      });
      setSelectedFile(null);
      loadIssuedCredentials();
    } catch (error: any) {
      console.error('Issue error:', error);
      toast.error(error.message || 'Issuance failed');
    } finally {
      setIssuingCredential(false);
    }
  };

  const revoke = async (id: string) => {
    if (!contract) return;
    try {
      const tx = await contract.revokeCredential(id);
      await tx.wait();
      toast.success('Revocation Successful');
      loadIssuedCredentials();
    } catch (error: any) {
      toast.error(error.message || 'Revocation failed');
    }
  };

  const view = async (credential: IssuedCredential) => {
    if (!credential.fileCID && !credential.metadataCID) return;
    try {
      setViewingDocument(credential.id);
      let fileCID = credential.fileCID;
      if (!fileCID && credential.metadataCID) {
        const metadata = await retrieveJSONFromIPFS(credential.metadataCID);
        fileCID = metadata.fileCID;
      }
      if (fileCID) {
        setDocumentUrl(getIPFSUrl(fileCID));
      }
    } catch (error) {
      toast.error('Load failed');
      setViewingDocument(null);
    }
  };

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <Database className="w-16 h-16 text-zinc-800" />
        <h1 className="text-4xl font-bold tracking-tighter">Registrar Access</h1>
        <p className="text-muted-foreground">Authenticate your administrative wallet to continue.</p>
      </div>
    );
  }

  if (!isAuthorizedIssuer) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6 text-center max-w-xl mx-auto">
        <AlertCircle className="w-16 h-16 text-zinc-800" />
        <h1 className="text-4xl font-bold tracking-tighter">Unauthorized Node</h1>
        <p className="text-muted-foreground">
          This address is not registered in the system as an authorized registrar. 
          Contact network admins for credentials.
        </p>
        <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-lg font-mono text-xs w-full break-all">
          {account}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-12 pb-32">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-bold tracking-tighter">Institution Overview</h1>
          <div className="flex items-center text-muted-foreground text-sm font-medium">
            <Building2 className="w-4 h-4 mr-2" />
            {issuerInfo?.name} • Authorized Registrar
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <div className={cn(
            "flex items-center px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest border",
            ipfsStatus.configured ? "bg-zinc-900 border-zinc-800 text-zinc-200" : "bg-rose-950 border-rose-900 text-rose-400"
          )}>
            <div className={cn("w-1.5 h-1.5 rounded-full mr-2", ipfsStatus.configured ? "bg-emerald-500" : "bg-rose-500")} />
            IPFS: {ipfsStatus.configured ? "ONLINE" : "DISCONNECTED"}
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Form */}
        <section className="lg:col-span-5 space-y-8">
          <div className="matte-card p-8 space-y-8">
            <div className="space-y-2">
              <h2 className="text-xl font-bold">Issue Credential</h2>
              <p className="text-sm text-muted-foreground">Create a new permanent record on the ledger.</p>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground pl-1">Student Address</label>
                <input
                  type="text"
                  name="studentAddress"
                  value={formData.studentAddress}
                  onChange={handleInputChange}
                  className="matte-input"
                  placeholder="0x..."
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground pl-1">Recipient Name</label>
                <input
                  type="text"
                  name="studentName"
                  value={formData.studentName}
                  onChange={handleInputChange}
                  className="matte-input"
                  placeholder="Legal Name"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground pl-1">Category</label>
                  <select name="credentialType" value={formData.credentialType} onChange={handleInputChange} className="matte-input bg-zinc-900 border-zinc-800">
                    <option value="degree">Degree</option>
                    <option value="diploma">Diploma</option>
                    <option value="transcript">Transcript</option>
                    <option value="certificate">Professional</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground pl-1">Result</label>
                  <input type="text" name="grade" value={formData.grade} onChange={handleInputChange} className="matte-input" placeholder="GPA / Grade" />
                </div>
              </div>

              <div 
                {...getRootProps()} 
                className={cn(
                  "border-2 border-dashed rounded-xl p-10 text-center transition-all cursor-pointer",
                  isDragActive ? "border-white bg-zinc-900" : "border-zinc-800 hover:border-zinc-700"
                )}
              >
                <input {...getInputProps()} />
                {selectedFile ? (
                  <div className="flex flex-col items-center gap-3">
                    <CheckCircle2 className="w-8 h-8 text-white" />
                    <span className="text-sm font-medium">{selectedFile.name}</span>
                    <span className="text-[10px] text-muted-foreground uppercase">Ready for transmission</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3 text-muted-foreground">
                    <Upload className="w-8 h-8" />
                    <span className="text-sm font-medium">Attach Certificate</span>
                    <span className="text-[10px] uppercase">PDF / IMG (MAX 10MB)</span>
                  </div>
                )}
              </div>

              <button
                onClick={issue}
                disabled={issuingCredential || !selectedFile}
                className="matte-button-primary w-full h-12 text-sm font-black uppercase tracking-widest rounded-xl"
              >
                {issuingCredential ? (
                  <span className="flex items-center gap-2">
                    <Clock className="w-4 h-4 animate-spin" />
                    TRANSMITTING...
                  </span>
                ) : "Broadcast Record"}
              </button>
            </div>
          </div>
        </section>

        {/* List */}
        <section className="lg:col-span-7 space-y-6">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-xl font-bold">Ledger Records</h2>
            <span className="text-xs font-bold text-muted-foreground uppercase">{issuedCredentials.length} Entries</span>
          </div>

          <div className="space-y-3">
            {issuedCredentials.length === 0 ? (
              <div className="matte-card p-20 text-center flex flex-col items-center gap-4">
                <Database className="w-12 h-12 text-zinc-900" />
                <p className="text-sm text-zinc-500 font-medium tracking-tight">No active records detected in local cache.</p>
              </div>
            ) : (
              issuedCredentials.map((c) => (
                <div key={c.id} className="matte-card p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-6 hover:border-zinc-700 transition-all group">
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center gap-3">
                       <ShieldCheck className="w-4 h-4 text-zinc-400" />
                       <span className="text-[10px] font-black uppercase tracking-[0.2em]">{c.type}</span>
                       <span className="text-[10px] text-zinc-600">• {c.issueDate}</span>
                    </div>
                    <div>
                      <p className="text-sm font-bold truncate max-w-xs">{c.student}</p>
                      <p className="text-[10px] font-mono text-zinc-600 truncate mt-1">HASH: {c.id}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button onClick={() => view(c)} className="w-10 h-10 flex items-center justify-center rounded-lg border border-zinc-800 hover:bg-zinc-900 transition-colors" title="View Source">
                      <Eye className="w-4 h-4" />
                    </button>
                    <button onClick={() => setShowQRCode(c.id)} className="w-10 h-10 flex items-center justify-center rounded-lg border border-zinc-800 hover:bg-zinc-900 transition-colors" title="Share Gateway">
                      <Share2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => revoke(c.id)} className="w-10 h-10 flex items-center justify-center rounded-lg border border-zinc-800 hover:bg-rose-950/20 hover:border-rose-900/50 hover:text-rose-500 transition-all" title="Revoke Signature">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      {/* Share Modal */}
      {showQRCode && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-center justify-center p-6">
          <div className="matte-card max-w-sm w-full p-10 space-y-8 animate-in zoom-in duration-300">
             <div className="text-center space-y-2">
               <h3 className="text-xl font-bold">Verification Gateway</h3>
               <p className="text-xs text-muted-foreground uppercase font-black tracking-widest">Permanent Signature</p>
             </div>
             <div className="bg-white p-6 rounded-2xl flex justify-center shadow-2xl">
               <QRCode value={issuedCredentials.find(c => c.id === showQRCode)?.verificationUrl || ''} size={180} renderAs="svg" />
             </div>
             <div className="flex flex-col gap-3">
               <button onClick={() => {
                 navigator.clipboard.writeText(issuedCredentials.find(c => c.id === showQRCode)?.verificationUrl || '');
                 toast.success('Link Secured');
               }} className="matte-button-primary rounded-xl h-12">Copy Protocol Link</button>
               <button onClick={() => setShowQRCode(null)} className="matte-button-secondary rounded-xl h-12">Close</button>
             </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {viewingDocument && documentUrl && (
        <div className="fixed inset-0 bg-black/90 z-[300] flex flex-col p-4 md:p-10 animate-in fade-in duration-300">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <FileText className="w-6 h-6 text-white" />
              <div>
                <h3 className="font-bold">Encrypted Archive</h3>
                <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest">Source Authenticated by IPFS</p>
              </div>
            </div>
            <button onClick={() => { setViewingDocument(null); setDocumentUrl(null); }} className="w-12 h-12 flex items-center justify-center rounded-full hover:bg-zinc-900 transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="flex-1 rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-950 relative">
            <iframe src={documentUrl} className="w-full h-full border-none" title="Document Viewer" />
          </div>
        </div>
      )}
    </div>
  );
};

export default University;