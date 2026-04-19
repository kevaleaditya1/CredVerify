import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { useWeb3 } from '../contexts/Web3Context';

// Import real verification utilities
import {
  parseVerificationData,
  isValidCredentialId,
  formatCredentialId
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
  const [verificationHistory, setVerificationHistory] = useState<VerificationResult[]>([]);
  const [currentResult, setCurrentResult] = useState<VerificationResult | null>(null);

  const verifyCredential = async (credentialId: string) => {
    if (!contract) {
      toast.error('Contract not connected');
      return null;
    }

    try {
      const result = await contract.verifyCredential(credentialId);
      
      // Get issuer information
      let issuerName = 'Unknown Institution';
      try {
        const issuer = await contract.issuers(result.issuer);
        issuerName = issuer.name || 'Unknown Institution';
      } catch {
        // Issuer might not be registered
      }

      return {
        credentialId,
        isValid: result.isValid,
        issuer: result.issuer,
        issuerName,
        student: result.student,
        credentialType: result.credentialType,
        issueDate: new Date(Number(result.issueDate) * 1000).toLocaleDateString(),
        expiryDate: result.expiryDate > 0 
          ? new Date(Number(result.expiryDate) * 1000).toLocaleDateString()
          : 'No expiry',
        isRevoked: result.isRevoked,
        verificationTime: new Date().toLocaleString(),
      };
    } catch (error: any) {
      console.error('Verification error:', error);
      
      if (error.message?.includes('Credential does not exist')) {
        toast.error('Credential not found');
      } else {
        toast.error('Verification failed');
      }
      return null;
    }
  };

  const handleVerification = async () => {
    if (!verificationInput.trim()) {
      toast.error('Please enter a credential ID or verification URL');
      return;
    }

    setVerifying(true);
    
    try {
      let credentialId = '';
      
      // Try to parse as verification URL first
      const parsedData = parseVerificationData(verificationInput.trim());
      if (parsedData) {
        credentialId = parsedData.credentialId;
      } else if (isValidCredentialId(verificationInput.trim())) {
        // Direct credential ID
        credentialId = verificationInput.trim();
      } else {
        toast.error('Invalid credential ID or verification URL format');
        setVerifying(false);
        return;
      }

      const result = await verifyCredential(credentialId);
      
      if (result) {
        setCurrentResult(result);
        setVerificationHistory(prev => [result, ...prev.slice(0, 9)]); // Keep last 10 results
        
        if (result.isValid && !result.isRevoked) {
          toast.success('Credential is valid and verified!');
        } else if (result.isRevoked) {
          toast.error('Credential has been revoked');
        } else {
          toast.error('Credential is invalid or expired');
        }
      }
      
    } catch (error) {
      console.error('Verification error:', error);
      toast.error('Verification failed');
    } finally {
      setVerifying(false);
    }
  };

  const handleQRScan = () => {
    // This would integrate with a QR scanner library
    toast.success('QR Scanner would open here. For now, paste the URL or credential ID.');
  };

  const getStatusColor = (result: VerificationResult) => {
    if (result.isRevoked) return 'text-danger-600 bg-danger-50 border-danger-200';
    if (!result.isValid) return 'text-warning-600 bg-warning-50 border-warning-200';
    return 'text-success-600 bg-success-50 border-success-200';
  };

  const getStatusIcon = (result: VerificationResult) => {
    if (result.isRevoked) return '❌';
    if (!result.isValid) return '⚠️';
    return '✅';
  };

  const getStatusText = (result: VerificationResult) => {
    if (result.isRevoked) return 'REVOKED';
    if (!result.isValid) return 'INVALID';
    return 'VALID';
  };

  if (!isConnected) {
    return (
      <div className="text-center py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Employer Dashboard</h1>
        <p className="text-gray-600">Please connect your wallet to verify credentials.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Verification Dashboard</h1>
        <p className="text-gray-600">Verify academic credentials instantly</p>
      </div>

      {/* Verification Input */}
      <div className="card">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Verify Credential</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Credential ID or Verification URL
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={verificationInput}
                onChange={(e) => setVerificationInput(e.target.value)}
                placeholder="Enter credential ID (0x...) or verification URL"
                className="input flex-1"
                onKeyPress={(e) => e.key === 'Enter' && handleVerification()}
              />
              <button
                onClick={handleQRScan}
                className="btn-secondary px-4"
                title="Scan QR Code"
              >
                📱
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              You can enter a credential ID, paste a verification URL, or scan a QR code
            </p>
          </div>
          
          <button
            onClick={handleVerification}
            disabled={verifying || !verificationInput.trim()}
            className="btn-primary w-full"
          >
            {verifying ? 'Verifying...' : 'Verify Credential'}
          </button>
        </div>
      </div>

      {/* Current Verification Result */}
      {currentResult && (
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Verification Result</h2>
          
          <div className={`border-2 rounded-lg p-6 ${getStatusColor(currentResult)}`}>
            <div className="text-center mb-6">
              <div className="text-6xl mb-2">{getStatusIcon(currentResult)}</div>
              <h3 className="text-2xl font-bold mb-1">{getStatusText(currentResult)}</h3>
              <p className="text-sm opacity-75">
                Verified on {currentResult.verificationTime}
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div>
                  <span className="text-sm font-medium opacity-75">Credential Type:</span>
                  <p className="font-semibold capitalize">{currentResult.credentialType}</p>
                </div>
                
                <div>
                  <span className="text-sm font-medium opacity-75">Issuing Institution:</span>
                  <p className="font-semibold">{currentResult.issuerName}</p>
                </div>
                
                <div>
                  <span className="text-sm font-medium opacity-75">Issue Date:</span>
                  <p className="font-semibold">{currentResult.issueDate}</p>
                </div>
                
                <div>
                  <span className="text-sm font-medium opacity-75">Expiry Date:</span>
                  <p className="font-semibold">{currentResult.expiryDate}</p>
                </div>
              </div>
              
              <div className="space-y-3">
                <div>
                  <span className="text-sm font-medium opacity-75">Student Address:</span>
                  <p className="font-mono text-sm bg-white bg-opacity-50 p-2 rounded break-all">
                    {currentResult.student}
                  </p>
                </div>
                
                <div>
                  <span className="text-sm font-medium opacity-75">Issuer Address:</span>
                  <p className="font-mono text-sm bg-white bg-opacity-50 p-2 rounded break-all">
                    {currentResult.issuer}
                  </p>
                </div>
                
                <div>
                  <span className="text-sm font-medium opacity-75">Credential ID:</span>
                  <p className="font-mono text-sm bg-white bg-opacity-50 p-2 rounded break-all">
                    {formatCredentialId(currentResult.credentialId)}
                  </p>
                </div>
              </div>
            </div>
            
            {currentResult.isRevoked && (
              <div className="mt-4 p-3 bg-white bg-opacity-50 rounded">
                <p className="text-sm font-medium">⚠️ This credential has been revoked by the issuing institution</p>
              </div>
            )}
            
            {!currentResult.isValid && !currentResult.isRevoked && (
              <div className="mt-4 p-3 bg-white bg-opacity-50 rounded">
                <p className="text-sm font-medium">⚠️ This credential is invalid or has expired</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Verification History */}
      {verificationHistory.length > 0 && (
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Verification History</h2>
          
          <div className="space-y-3">
            {verificationHistory.map((result, index) => (
              <div
                key={index}
                className="border rounded-lg p-4 hover:shadow-sm transition-shadow cursor-pointer"
                onClick={() => setCurrentResult(result)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="text-2xl">{getStatusIcon(result)}</div>
                    <div>
                      <p className="font-medium capitalize">{result.credentialType}</p>
                      <p className="text-sm text-gray-600">{result.issuerName}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`px-2 py-1 text-xs rounded font-medium ${
                      result.isRevoked 
                        ? 'bg-danger-100 text-danger-800'
                        : !result.isValid
                        ? 'bg-warning-100 text-warning-800'
                        : 'bg-success-100 text-success-800'
                    }`}>
                      {getStatusText(result)}
                    </span>
                    <p className="text-xs text-gray-500 mt-1">{result.verificationTime}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="card bg-blue-50 border-blue-200">
        <h2 className="text-lg font-semibold text-blue-900 mb-4">How to Verify Credentials</h2>
        <div className="space-y-3 text-sm text-blue-800">
          <div className="flex items-start space-x-2">
            <span className="font-bold">1.</span>
            <p>Ask the candidate for their credential verification link or QR code</p>
          </div>
          <div className="flex items-start space-x-2">
            <span className="font-bold">2.</span>
            <p>Paste the verification URL or credential ID in the input field above</p>
          </div>
          <div className="flex items-start space-x-2">
            <span className="font-bold">3.</span>
            <p>Click "Verify Credential" to check authenticity on the blockchain</p>
          </div>
          <div className="flex items-start space-x-2">
            <span className="font-bold">4.</span>
            <p>Review the verification result and credential details</p>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className="card text-center">
          <div className="text-4xl mb-3">⚡</div>
          <h3 className="font-semibold text-gray-900 mb-2">Instant Verification</h3>
          <p className="text-sm text-gray-600">Verify credentials in seconds using blockchain technology</p>
        </div>
        <div className="card text-center">
          <div className="text-4xl mb-3">🔒</div>
          <h3 className="font-semibold text-gray-900 mb-2">Tamper-Proof</h3>
          <p className="text-sm text-gray-600">Credentials cannot be forged or altered once issued</p>
        </div>
        <div className="card text-center">
          <div className="text-4xl mb-3">🌍</div>
          <h3 className="font-semibold text-gray-900 mb-2">Global Access</h3>
          <p className="text-sm text-gray-600">Verify credentials from institutions worldwide</p>
        </div>
      </div>
    </div>
  );
};

export default Employer;