import React, { useState, useEffect, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import toast from 'react-hot-toast';
import { useWeb3 } from '../contexts/Web3Context';
import { config } from '../config';
import QRCode from 'qrcode.react';
import { 
  Upload, 
  FileText, 
  Trash2, 
  Share2, 
  Eye, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  ExternalLink,
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
  fileType?: string;
}

interface DocumentTypeConfig {
  label: string;
  fields: Array<{
    name: string;
    label: string;
    placeholder: string;
  }>;
}

const DOCUMENT_TYPES: Record<string, DocumentTypeConfig> = {
  degree: {
    label: 'Degree Certificate',
    fields: [
      { name: 'rollNumber', label: 'Roll Number', placeholder: 'e.g., BIT001' },
      { name: 'major', label: 'Major/Specialization', placeholder: 'e.g., Computer Science' },
      { name: 'gpa', label: 'GPA/Grade', placeholder: 'e.g., 3.8 or A+' },
    ],
  },
  transcript: {
    label: 'Transcripts/Mark Sheets',
    fields: [
      { name: 'rollNumber', label: 'Roll Number', placeholder: 'e.g., BIT001' },
      { name: 'semester', label: 'Semester', placeholder: 'e.g., 4th Semester' },
      { name: 'gpa', label: 'GPA/CGPA', placeholder: 'e.g., 3.8' },
    ],
  },
  provisional: {
    label: 'Provisional Degree',
    fields: [
      { name: 'rollNumber', label: 'Roll Number', placeholder: 'e.g., BIT001' },
      { name: 'yearOfStudy', label: 'Year of Study', placeholder: 'e.g., Final Year' },
      { name: 'status', label: 'Status', placeholder: 'e.g., Pending/Approved' },
    ],
  },
  bonafide: {
    label: 'Bonafide Certificate',
    fields: [
      { name: 'rollNumber', label: 'Roll Number', placeholder: 'e.g., BIT001' },
      { name: 'year', label: 'Academic Year', placeholder: 'e.g., 2024-2025' },
      { name: 'department', label: 'Department', placeholder: 'e.g., Computer Science' },
    ],
  },
  migration: {
    label: 'Migration Certificate',
    fields: [
      { name: 'rollNumber', label: 'Roll Number', placeholder: 'e.g., BIT001' },
      { name: 'year', label: 'Year of Graduation', placeholder: 'e.g., 2024' },
      { name: 'destination', label: 'Destination University', placeholder: 'e.g., Stanford University' },
    ],
  },
};

const University: React.FC = () => {
  const { account, contract, isConnected, isOwner } = useWeb3();
  const [isAuthorizedIssuer, setIsAuthorizedIssuer] = useState(false);
  const [accessCheckComplete, setAccessCheckComplete] = useState(false);
  const [issuerInfo, setIssuerInfo] = useState<any>(null);
  const [issuingCredential, setIssuingCredential] = useState(false);
  const [issuedCredentials, setIssuedCredentials] = useState<IssuedCredential[]>([]);
  const [showQRCode, setShowQRCode] = useState<string | null>(null);
  const [ipfsStatus, setIpfsStatus] = useState<{ configured: boolean; message: string }>({ configured: false, message: '' });
  
  const [formData, setFormData] = useState({
    studentAddress: '',
    studentName: '',
    credentialType: 'degree',
    fields: {} as Record<string, string>,
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [viewingDocument, setViewingDocument] = useState<string | null>(null);
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);
  const [documentType, setDocumentType] = useState<string | null>(null);

  const loadIssuedCredentials = useCallback(async () => {
    if (!contract || !account) return;
    
    try {
      const credentialIds = await contract.getIssuerCredentials(account);
      const credentials: IssuedCredential[] = [];
      
      for (const id of credentialIds) {
        try {
          const result = await contract.verifyCredential(id);
          const credStruct = await contract.credentials(id);
          
          // Skip revoked (deleted) credentials
          if (result.isRevoked) continue;

          let fileCID = '';
          let metadataCID = credStruct.ipfsHash || '';
          let fileType = '';
          
          try {
            if (metadataCID) {
              const metadata = await retrieveJSONFromIPFS(metadataCID);
              fileCID = metadata.fileCID || '';
              fileType = metadata.fileType || '';
            }
          } catch (error) {
            console.log('Could not retrieve metadata for credential:', id);
          }
          
          credentials.push({
            id,
            student: result.student,
            type: result.credentialType,
            issueDate: new Date(Number(result.issueDate) * 1000).toLocaleDateString(),
            ipfsHash: credStruct.ipfsHash || '',
            verificationUrl: generateVerificationUrl(id, await contract.getAddress(), config.chainId),
            fileCID,
            metadataCID,
            fileType,
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
      setAccessCheckComplete(false);

      if (isOwner) {
        setIsAuthorizedIssuer(true);
        if (contract && account) {
          try {
            const issuer = await contract.issuers(account);
            setIssuerInfo(issuer);
            loadIssuedCredentials();
          } catch (error) {
            console.error('Error loading owner issuer info:', error);
          }
        }
        setAccessCheckComplete(true);
        return;
      }

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
          setIsAuthorizedIssuer(false);
        }
      }

      setAccessCheckComplete(true);
    };

    const ipfsConfig = getIPFSStatus();
    setIpfsStatus(ipfsConfig);
    checkIssuerStatus();
  }, [contract, account, isOwner, loadIssuedCredentials]);

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
    
    if (name === 'credentialType') {
      // Reset fields when document type changes
      setFormData(prev => ({
        ...prev,
        credentialType: value,
        fields: {}
      }));
    } else if (['studentAddress', 'studentName'].includes(name)) {
      // Handle standard fields
      setFormData(prev => ({ ...prev, [name]: value }));
    } else {
      // Handle dynamic document type fields
      setFormData(prev => ({
        ...prev,
        fields: { ...prev.fields, [name]: value }
      }));
    }
  };

  const issue = async () => {
    if (!contract || !account || !selectedFile) {
      toast.error('Missing required fields');
      return;
    }

    if (!formData.studentAddress || !formData.studentName || Object.keys(formData.fields).length === 0) {
      toast.error('Please fill in all required fields');
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
          ...formData.fields,
          country: issuerInfo?.country || 'Node',
        }
      );

      toast.loading('Synchronizing with IPFS...', { id: 'ipfs' });
      const { metadataCID } = await uploadCredential(selectedFile, metadata);
      toast.success('IPFS Synchronization Complete', { id: 'ipfs' });
      
      toast.loading('Broadcasting to Ledger...', { id: 'eth' });
      
      const tx = await contract.issueCredential(
        formData.studentAddress,
        metadataCID,
        formData.credentialType,
        0
      );
      
      await tx.wait();
      toast.success('Record Permanently Issued', { id: 'eth' });
      
      setFormData({
        studentAddress: '',
        studentName: '',
        credentialType: 'degree',
        fields: {},
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
      let fileType = credential.fileType || null;
      let targetCID = fileCID;
      
      if (!fileCID && credential.metadataCID) {
        const metadata = await retrieveJSONFromIPFS(credential.metadataCID);
        fileCID = metadata?.fileCID || '';
        fileType = metadata?.fileType || null;
        targetCID = fileCID || credential.metadataCID; // Fallback to showing metadata JSON if no file exists
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
        <Database className="w-16 h-16 text-zinc-800" />
        <h1 className="text-4xl font-bold tracking-tighter">Registrar Access</h1>
        <p className="text-muted-foreground">Authenticate your administrative wallet to continue.</p>
      </div>
    );
  }

  if (!accessCheckComplete) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6 text-center">
        <Database className="w-16 h-16 text-zinc-800 animate-pulse" />
        <h1 className="text-4xl font-bold tracking-tighter">Verifying Access</h1>
        <p className="text-muted-foreground max-w-md">
          Checking whether this wallet is the contract owner or an authorized registrar.
        </p>
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

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground pl-1">Document Type</label>
                <select name="credentialType" value={formData.credentialType} onChange={handleInputChange} className="matte-input bg-zinc-900 border-zinc-800 w-full">
                  {Object.entries(DOCUMENT_TYPES).map(([key, config]) => (
                    <option key={key} value={key}>{config.label}</option>
                  ))}
                </select>
              </div>

              {/* Dynamic fields based on document type */}
              {DOCUMENT_TYPES[formData.credentialType]?.fields.map((fieldConfig) => (
                <div key={fieldConfig.name} className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground pl-1">{fieldConfig.label}</label>
                  <input
                    type="text"
                    name={fieldConfig.name}
                    value={formData.fields[fieldConfig.name] || ''}
                    onChange={handleInputChange}
                    className="matte-input"
                    placeholder={fieldConfig.placeholder}
                  />
                </div>
              ))}

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
               <QRCode value={issuedCredentials.find(c => c.id === showQRCode)?.id || ''} size={180} renderAs="svg" />
             </div>
             <div className="flex flex-col gap-3">
               <button onClick={() => {
                 navigator.clipboard.writeText(issuedCredentials.find(c => c.id === showQRCode)?.id || '');
                 toast.success('Hash Copied');
               }} className="matte-button-primary rounded-xl h-12">Copy Hash</button>
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
              <button onClick={() => { setViewingDocument(null); setDocumentUrl(null); }} className="w-12 h-12 flex items-center justify-center rounded-full hover:bg-zinc-900 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>
          <div className="flex-1 rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-950 relative flex items-center justify-center">
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

export default University;