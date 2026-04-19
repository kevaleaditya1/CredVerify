import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useWeb3 } from '../contexts/Web3Context';

// Import real verification utilities
import {
  isValidCredentialId
} from '../utils/verification';
// IPFS utilities available if needed
// import { getIPFSUrl } from '../utils/ipfs';

interface CredentialData {
  credentialId: string;
  isValid: boolean;
  issuer: string;
  issuerName: string;
  student: string;
  credentialType: string;
  issueDate: string;
  expiryDate: string;
  isRevoked: boolean;
  ipfsHash?: string;
  metadata?: any;
}

const Verify: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { contract } = useWeb3();
  const [credentialData, setCredentialData] = useState<CredentialData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const verifyCredential = useCallback(async (credentialId: string) => {
    if (!contract) {
      throw new Error('Contract not connected');
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

      const credentialData: CredentialData = {
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
      };

      setCredentialData(credentialData);
      setError(null);

    } catch (error: any) {
      console.error('Verification error:', error);
      
      if (error.message?.includes('Credential does not exist')) {
        setError('Credential not found. Please check the credential ID.');
      } else {
        setError('Verification failed. Please try again.');
      }
      setCredentialData(null);
    }
  }, [contract]);

  const verifyCredentialFromUrl = useCallback(async (
    credentialId: string,
    contractAddress: string | null,
    chainId: string | null
  ) => {
    if (!contract) {
      setError('Blockchain connection not available. Please connect your wallet.');
      return;
    }

    if (!isValidCredentialId(credentialId)) {
      setError('Invalid credential ID format');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await verifyCredential(credentialId);
    } catch (error) {
      console.error('Auto-verification error:', error);
      setError('Failed to verify credential automatically');
    } finally {
      setLoading(false);
    }
  }, [contract, verifyCredential]);

  useEffect(() => {
    const credentialId = searchParams.get('id');
    const contractAddress = searchParams.get('contract');
    const chainId = searchParams.get('chain');

    if (credentialId) {
      verifyCredentialFromUrl(credentialId, contractAddress, chainId);
    }
  }, [searchParams, contract, verifyCredentialFromUrl]);

  const getStatusColor = () => {
    if (!credentialData) return '';
    if (credentialData.isRevoked) return 'text-danger-600 bg-danger-50 border-danger-200';
    if (!credentialData.isValid) return 'text-warning-600 bg-warning-50 border-warning-200';
    return 'text-success-600 bg-success-50 border-success-200';
  };

  const getStatusIcon = () => {
    if (!credentialData) return '';
    if (credentialData.isRevoked) return '❌';
    if (!credentialData.isValid) return '⚠️';
    return '✅';
  };

  const getStatusText = () => {
    if (!credentialData) return '';
    if (credentialData.isRevoked) return 'REVOKED';
    if (!credentialData.isValid) return 'INVALID';
    return 'VERIFIED';
  };

  const getTypeIcon = (type: string) => {
    switch (type?.toLowerCase()) {
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

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Credential Verification</h1>
        <p className="text-gray-600">Verify the authenticity of academic credentials</p>
      </div>

      {loading && (
        <div className="card text-center py-12">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Verifying Credential</h2>
          <p className="text-gray-600">Please wait while we check the blockchain...</p>
        </div>
      )}

      {error && (
        <div className="card border-danger-200 bg-danger-50">
          <div className="text-center py-8">
            <div className="text-6xl mb-4">❌</div>
            <h2 className="text-xl font-semibold text-danger-900 mb-2">Verification Failed</h2>
            <p className="text-danger-700 mb-4">{error}</p>
            <div className="bg-danger-100 border border-danger-200 rounded-lg p-4 max-w-md mx-auto">
              <p className="text-danger-800 text-sm">
                <strong>Possible reasons:</strong>
                <br />• Invalid credential ID
                <br />• Credential does not exist
                <br />• Network connection issues
                <br />• Contract not deployed on this network
              </p>
            </div>
          </div>
        </div>
      )}

      {credentialData && (
        <div className="space-y-6">
          {/* Main Verification Result */}
          <div className={`card border-2 ${getStatusColor()}`}>
            <div className="text-center py-8">
              <div className="text-8xl mb-4">{getStatusIcon()}</div>
              <h2 className="text-3xl font-bold mb-2">{getStatusText()}</h2>
              <p className="text-lg opacity-75">
                This credential has been {credentialData.isValid && !credentialData.isRevoked ? 'verified' : 'flagged'} on the blockchain
              </p>
            </div>
          </div>

          {/* Credential Details */}
          <div className="card">
            <h3 className="text-xl font-semibold text-gray-900 mb-6">Credential Details</h3>
            
            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="text-center">
                  <div className="text-6xl mb-2">{getTypeIcon(credentialData.credentialType)}</div>
                  <h4 className="text-xl font-semibold capitalize text-gray-900">
                    {credentialData.credentialType}
                  </h4>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <span className="text-sm font-medium text-gray-500">Issuing Institution</span>
                    <p className="text-lg font-semibold text-gray-900">{credentialData.issuerName}</p>
                  </div>
                  
                  <div>
                    <span className="text-sm font-medium text-gray-500">Issue Date</span>
                    <p className="text-lg font-semibold text-gray-900">{credentialData.issueDate}</p>
                  </div>
                  
                  <div>
                    <span className="text-sm font-medium text-gray-500">Expiry Date</span>
                    <p className="text-lg font-semibold text-gray-900">{credentialData.expiryDate}</p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <span className="text-sm font-medium text-gray-500">Student Wallet Address</span>
                  <p className="font-mono text-sm bg-gray-50 p-3 rounded border break-all">
                    {credentialData.student}
                  </p>
                </div>
                
                <div>
                  <span className="text-sm font-medium text-gray-500">Issuer Wallet Address</span>
                  <p className="font-mono text-sm bg-gray-50 p-3 rounded border break-all">
                    {credentialData.issuer}
                  </p>
                </div>
                
                <div>
                  <span className="text-sm font-medium text-gray-500">Credential ID</span>
                  <p className="font-mono text-sm bg-gray-50 p-3 rounded border break-all">
                    {credentialData.credentialId}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Status Explanations */}
          {credentialData.isRevoked && (
            <div className="card border-danger-200 bg-danger-50">
              <div className="flex items-start space-x-3">
                <div className="text-2xl">⚠️</div>
                <div>
                  <h4 className="font-semibold text-danger-900 mb-1">Credential Revoked</h4>
                  <p className="text-danger-700 text-sm">
                    This credential has been revoked by the issuing institution and is no longer valid. 
                    This may be due to various reasons such as incorrect information, policy changes, or security concerns.
                  </p>
                </div>
              </div>
            </div>
          )}

          {!credentialData.isValid && !credentialData.isRevoked && (
            <div className="card border-warning-200 bg-warning-50">
              <div className="flex items-start space-x-3">
                <div className="text-2xl">⚠️</div>
                <div>
                  <h4 className="font-semibold text-warning-900 mb-1">Credential Invalid</h4>
                  <p className="text-warning-700 text-sm">
                    This credential is invalid. This may be due to expiration, the issuing institution 
                    no longer being authorized, or other verification requirements not being met.
                  </p>
                </div>
              </div>
            </div>
          )}

          {credentialData.isValid && !credentialData.isRevoked && (
            <div className="card border-success-200 bg-success-50">
              <div className="flex items-start space-x-3">
                <div className="text-2xl">✅</div>
                <div>
                  <h4 className="font-semibold text-success-900 mb-1">Credential Verified</h4>
                  <p className="text-success-700 text-sm">
                    This credential is authentic and has been successfully verified on the blockchain. 
                    The issuing institution is authorized and the credential has not been revoked.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Verification Steps */}
          <div className="card bg-gray-50">
            <h4 className="font-semibold text-gray-900 mb-4">How This Verification Works</h4>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 font-bold mx-auto mb-2">
                  1
                </div>
                <h5 className="font-medium text-gray-900 mb-1">Blockchain Check</h5>
                <p className="text-sm text-gray-600">Credential hash verified on Ethereum blockchain</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 font-bold mx-auto mb-2">
                  2
                </div>
                <h5 className="font-medium text-gray-900 mb-1">Issuer Validation</h5>
                <p className="text-sm text-gray-600">Issuing institution authorization confirmed</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 font-bold mx-auto mb-2">
                  3
                </div>
                <h5 className="font-medium text-gray-900 mb-1">Status Check</h5>
                <p className="text-sm text-gray-600">Revocation and expiry status verified</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {!loading && !error && !credentialData && (
        <div className="card text-center py-12">
          <div className="text-6xl mb-4">🔍</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Ready to Verify</h2>
          <p className="text-gray-600 mb-6">
            This page will automatically verify credentials when accessed through a verification link or QR code.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md mx-auto">
            <p className="text-blue-800 text-sm">
              💡 To verify a credential, use the verification link or QR code provided by the credential holder.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Verify;