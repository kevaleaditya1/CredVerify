import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { useWeb3 } from '../contexts/Web3Context';
import QRCode from 'qrcode.react';

// Import real verification utilities
import {
  generateVerificationUrl,
  formatCredentialId,
  shareVerificationUrl,
  copyToClipboard
} from '../utils/verification';
// IPFS utilities available if needed
// import { getIPFSUrl } from '../utils/ipfs';

interface StudentCredential {
  id: string;
  issuer: string;
  issuerName: string;
  credentialType: string;
  issueDate: string;
  expiryDate: string;
  isValid: boolean;
  isRevoked: boolean;
  ipfsHash: string;
  verificationUrl: string;
}

const Student: React.FC = () => {
  const { account, contract, isConnected } = useWeb3();
  const [credentials, setCredentials] = useState<StudentCredential[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCredential, setSelectedCredential] = useState<StudentCredential | null>(null);
  const [showQRCode, setShowQRCode] = useState<string | null>(null);

  const loadStudentCredentials = useCallback(async () => {
    if (!contract || !account) return;
    
    setLoading(true);
    try {
      const credentialIds = await contract.getStudentCredentials(account);
      const loadedCredentials: StudentCredential[] = [];
      
      for (const id of credentialIds) {
        try {
          const result = await contract.verifyCredential(id);
          
          // Get issuer information
          let issuerName = 'Unknown University';
          try {
            const issuer = await contract.issuers(result.issuer);
            issuerName = issuer.name || 'Unknown University';
          } catch {
            // Issuer might not be registered anymore
          }
          
          const credential: StudentCredential = {
            id,
            issuer: result.issuer,
            issuerName,
            credentialType: result.credentialType,
            issueDate: new Date(Number(result.issueDate) * 1000).toLocaleDateString(),
            expiryDate: result.expiryDate > 0 
              ? new Date(Number(result.expiryDate) * 1000).toLocaleDateString()
              : 'No expiry',
            isValid: result.isValid,
            isRevoked: result.isRevoked,
            ipfsHash: '', // We don't expose IPFS hash in verification result
            verificationUrl: generateVerificationUrl(id, await contract.getAddress(), 17000),
          };
          
          loadedCredentials.push(credential);
        } catch (error) {
          console.error('Error loading credential:', error);
        }
      }
      
      setCredentials(loadedCredentials);
    } catch (error) {
      console.error('Error loading student credentials:', error);
      toast.error('Failed to load credentials');
    } finally {
      setLoading(false);
    }
  }, [contract, account]);

  useEffect(() => {
    if (isConnected && contract && account) {
      loadStudentCredentials();
    }
  }, [isConnected, contract, account, loadStudentCredentials]);

  const shareCredential = async (credential: StudentCredential) => {
    const success = await shareVerificationUrl(
      credential.verificationUrl,
      credential.credentialType,
      credential.issuerName
    );
    if (!success) {
      // Fallback already handled by shareVerificationUrl
      toast.success('Verification link copied to clipboard!');
    }
  };

  const getStatusBadge = (credential: StudentCredential) => {
    if (credential.isRevoked) {
      return <span className="px-2 py-1 bg-danger-100 text-danger-800 text-xs rounded">Revoked</span>;
    } else if (!credential.isValid) {
      return <span className="px-2 py-1 bg-warning-100 text-warning-800 text-xs rounded">Invalid</span>;
    } else {
      return <span className="px-2 py-1 bg-success-100 text-success-800 text-xs rounded">Valid</span>;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'degree':
        return '🎓';
      case 'diploma':
        return '📜';
      case 'transcript':
        return '📋';
      case 'certificate':
        return '🏆';
      default:
        return '📄';
    }
  };

  if (!isConnected) {
    return (
      <div className="text-center py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Student Dashboard</h1>
        <p className="text-gray-600">Please connect your wallet to view your credentials.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Student Dashboard</h1>
        <p className="text-gray-600">View and share your verified academic credentials</p>
      </div>

      {/* Account Info */}
      <div className="card">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Account Information</h2>
        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm text-gray-500">Wallet Address</span>
            <p className="font-mono text-sm bg-gray-50 p-2 rounded">{account}</p>
          </div>
          <div className="text-right">
            <span className="text-sm text-gray-500">Total Credentials</span>
            <p className="text-2xl font-bold text-primary-600">{credentials.length}</p>
          </div>
        </div>
      </div>

      {/* Credentials Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card text-center">
          <div className="text-3xl mb-2">✅</div>
          <div className="text-2xl font-bold text-success-600">
            {credentials.filter(c => c.isValid && !c.isRevoked).length}
          </div>
          <div className="text-sm text-gray-600">Valid Credentials</div>
        </div>
        <div className="card text-center">
          <div className="text-3xl mb-2">⚠️</div>
          <div className="text-2xl font-bold text-warning-600">
            {credentials.filter(c => !c.isValid && !c.isRevoked).length}
          </div>
          <div className="text-sm text-gray-600">Expired/Invalid</div>
        </div>
        <div className="card text-center">
          <div className="text-3xl mb-2">❌</div>
          <div className="text-2xl font-bold text-danger-600">
            {credentials.filter(c => c.isRevoked).length}
          </div>
          <div className="text-sm text-gray-600">Revoked</div>
        </div>
      </div>

      {/* Credentials List */}
      <div className="card">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900">My Credentials</h2>
          <button
            onClick={loadStudentCredentials}
            disabled={loading}
            className="btn-secondary"
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
        
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">Loading your credentials...</p>
          </div>
        ) : credentials.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📚</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Credentials Yet</h3>
            <p className="text-gray-600 mb-6">
              You don't have any credentials issued to your wallet address yet.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md mx-auto">
              <p className="text-blue-800 text-sm">
                💡 Ask your university to issue credentials to your wallet address: 
                <br />
                <code className="bg-blue-100 px-1 rounded text-xs">{account}</code>
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {credentials.map((credential) => (
              <div
                key={credential.id}
                className="border rounded-lg p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                    <div className="text-4xl">{getTypeIcon(credential.credentialType)}</div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900 capitalize">
                          {credential.credentialType}
                        </h3>
                        {getStatusBadge(credential)}
                      </div>
                      <p className="text-gray-600 mb-1">
                        <span className="font-medium">Issued by:</span> {credential.issuerName}
                      </p>
                      <p className="text-sm text-gray-500 mb-1">
                        <span className="font-medium">Issue Date:</span> {credential.issueDate}
                      </p>
                      <p className="text-sm text-gray-500 mb-1">
                        <span className="font-medium">Expiry:</span> {credential.expiryDate}
                      </p>
                      <p className="text-xs text-gray-400 font-mono break-all">
                        ID: {formatCredentialId(credential.id)}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col space-y-2 ml-4">
                    <button
                      onClick={() => setSelectedCredential(credential)}
                      className="btn-primary text-sm"
                    >
                      View Details
                    </button>
                    <button
                      onClick={() => setShowQRCode(credential.id)}
                      className="btn-secondary text-sm"
                    >
                      QR Code
                    </button>
                    <button
                      onClick={() => shareCredential(credential)}
                      className="btn-secondary text-sm"
                    >
                      Share
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Credential Details Modal */}
      {selectedCredential && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-semibold text-gray-900">Credential Details</h3>
                <button
                  onClick={() => setSelectedCredential(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="text-center">
                  <div className="text-6xl mb-2">{getTypeIcon(selectedCredential.credentialType)}</div>
                  <h4 className="text-lg font-semibold capitalize">{selectedCredential.credentialType}</h4>
                  {getStatusBadge(selectedCredential)}
                </div>
                
                <div className="border-t pt-4 space-y-3">
                  <div>
                    <span className="text-sm font-medium text-gray-700">Issuing Institution:</span>
                    <p className="text-gray-900">{selectedCredential.issuerName}</p>
                  </div>
                  
                  <div>
                    <span className="text-sm font-medium text-gray-700">Issue Date:</span>
                    <p className="text-gray-900">{selectedCredential.issueDate}</p>
                  </div>
                  
                  <div>
                    <span className="text-sm font-medium text-gray-700">Expiry Date:</span>
                    <p className="text-gray-900">{selectedCredential.expiryDate}</p>
                  </div>
                  
                  <div>
                    <span className="text-sm font-medium text-gray-700">Issuer Address:</span>
                    <p className="text-xs font-mono bg-gray-50 p-2 rounded break-all">
                      {selectedCredential.issuer}
                    </p>
                  </div>
                  
                  <div>
                    <span className="text-sm font-medium text-gray-700">Credential ID:</span>
                    <p className="text-xs font-mono bg-gray-50 p-2 rounded break-all">
                      {selectedCredential.id}
                    </p>
                  </div>
                  
                  <div>
                    <span className="text-sm font-medium text-gray-700">Verification URL:</span>
                    <p className="text-xs text-blue-600 bg-blue-50 p-2 rounded break-all">
                      {selectedCredential.verificationUrl}
                    </p>
                  </div>
                </div>
                
                <div className="border-t pt-4 flex space-x-2">
                  <button
                    onClick={() => copyToClipboard(selectedCredential.verificationUrl)}
                    className="btn-primary flex-1 text-sm"
                  >
                    Copy Verification Link
                  </button>
                  <button
                    onClick={() => shareCredential(selectedCredential)}
                    className="btn-secondary flex-1 text-sm"
                  >
                    Share
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {showQRCode && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-lg max-w-sm w-full">
            <h3 className="text-lg font-semibold mb-4 text-center">Verification QR Code</h3>
            <div className="flex justify-center mb-4">
              <QRCode
                value={credentials.find(c => c.id === showQRCode)?.verificationUrl || ''}
                size={200}
                level="M"
                includeMargin
              />
            </div>
            <p className="text-sm text-gray-600 text-center mb-4">
              Scan this QR code to verify the credential
            </p>
            <div className="flex space-x-2">
              <button
                onClick={() => copyToClipboard(credentials.find(c => c.id === showQRCode)?.verificationUrl || '')}
                className="btn-secondary flex-1 text-sm"
              >
                Copy Link
              </button>
              <button
                onClick={() => setShowQRCode(null)}
                className="btn-primary flex-1 text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Student;