/**
 * Browser-compatible IPFS utilities for the DACV frontend
 * This uses the browser File API and Pinata for real IPFS operations
 */

// Pinata IPFS Configuration
const PINATA_JWT = process.env.REACT_APP_PINATA_JWT || '';
let PINATA_GATEWAY = process.env.REACT_APP_PINATA_GATEWAY || 'https://gateway.pinata.cloud/ipfs/';
if (!PINATA_GATEWAY.startsWith('http')) {
  PINATA_GATEWAY = `https://${PINATA_GATEWAY}`;
}
if (!PINATA_GATEWAY.endsWith('/')) {
  PINATA_GATEWAY = `${PINATA_GATEWAY}/`;
}
const IPFS_TEST_MODE = process.env.REACT_APP_IPFS_TEST_MODE === 'true';

const PINATA_UPLOAD_ENDPOINT = 'https://api.pinata.cloud/pinning/pinFileToIPFS';
const PINATA_JSON_ENDPOINT = 'https://api.pinata.cloud/pinning/pinJSONToIPFS';

export interface CredentialMetadata {
  name: string;
  description: string;
  credentialType: string;
  issuer: string;
  student: string;
  issueDate: string;
  expiryDate?: string;
  grade?: string;
  major?: string;
  university: string;
  country: string;
  fileCID?: string; // CID of the actual document file
  fileName?: string; // Original filename
  fileSize?: number; // File size in bytes
  fileType?: string; // MIME type
}

export interface IPFSUploadResult {
  fileCID: string;
  metadataCID: string;
}

/**
 * Check if IPFS is configured
 */
export function isIPFSConfigured(): boolean {
  if (IPFS_TEST_MODE) {
    return true;
  }
  return !!PINATA_JWT;
}

/**
 * Upload a file to IPFS using Pinata
 */
export async function uploadFileToIPFS(file: File): Promise<string> {
  if (IPFS_TEST_MODE) {
    console.log('🧪 IPFS Test Mode: Simulating file upload for:', file.name);
    const mockCID = `QmTest${Date.now()}${file.name.replace(/[^a-zA-Z0-9]/g, '')}`.substring(0, 46);
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        try {
          localStorage.setItem(`ipfs_mock_${mockCID}`, reader.result as string);
          console.log('🧪 Mock CID generated and saved to local storage:', mockCID);
          setTimeout(() => resolve(mockCID), 500);
        } catch (e) {
          console.warn('LocalStorage full, test mode file might not be viewable');
          setTimeout(() => resolve(mockCID), 500);
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  if (!PINATA_JWT) {
    throw new Error('Pinata JWT not configured. Please set REACT_APP_PINATA_JWT in your .env file.');
  }

  console.log('Uploading file to Pinata IPFS:', {
    name: file.name,
    size: file.size,
    type: file.type
  });

  try {
    const formData = new FormData();
    formData.append('file', file);
    
    // Optional: Add Pinata metadata
    const pinataMetadata = JSON.stringify({ name: file.name });
    formData.append('pinataMetadata', pinataMetadata);

    const response = await fetch(PINATA_UPLOAD_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PINATA_JWT}`,
      },
      body: formData,
    });

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch {
        errorData = { message: 'No error details available' };
      }
      throw new Error(`Upload failed: ${response.status} ${response.statusText} - ${errorData.message || 'Unknown error'}`);
    }

    const data = await response.json();
    console.log(`Pinata success response:`, data);
    
    return data.IpfsHash;
  } catch (error) {
    console.error('Error uploading file to IPFS:', error);
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('Network error: Please check your internet connection and try again.');
    }
    throw new Error(`Failed to upload file to IPFS: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Upload credential metadata to IPFS using Pinata JSON endpoint
 */
export async function uploadCredentialMetadata(metadata: CredentialMetadata): Promise<string> {
  if (IPFS_TEST_MODE) {
    // If test mode, just use the file mock approach
    const jsonBlob = new Blob([JSON.stringify(metadata, null, 2)], { type: 'application/json' });
    const metadataFile = new File([jsonBlob], 'credential-metadata.json', { type: 'application/json' });
    return await uploadFileToIPFS(metadataFile);
  }

  if (!PINATA_JWT) {
    throw new Error('Pinata JWT not configured.');
  }

  try {
    const data = {
      pinataOptions: { cidVersion: 1 },
      pinataMetadata: { name: `DACV_Metadata_${metadata.student.slice(0,6)}` },
      pinataContent: metadata
    };

    const response = await fetch(PINATA_JSON_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${PINATA_JWT}`
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.status}`);
    }

    const resData = await response.json();
    return resData.IpfsHash;
  } catch (error) {
    console.error('Error uploading metadata to IPFS:', error);
    throw new Error('Failed to upload metadata to IPFS');
  }
}

/**
 * Upload both credential file and metadata to IPFS
 */
export async function uploadCredential(
  credentialFile: File,
  metadata: CredentialMetadata
): Promise<IPFSUploadResult> {
  try {
    const fileCID = await uploadFileToIPFS(credentialFile);
    
    const metadataWithFileCID = {
      ...metadata,
      fileCID: fileCID,
      fileName: credentialFile.name,
      fileSize: credentialFile.size,
      fileType: credentialFile.type
    };
    
    const metadataCID = await uploadCredentialMetadata(metadataWithFileCID as CredentialMetadata);

    return { fileCID, metadataCID };
  } catch (error) {
    console.error('Error uploading credential:', error);
    throw new Error('Failed to upload credential to IPFS');
  }
}

/**
 * Retrieve content from IPFS
 */
export async function retrieveFromIPFS(cid: string): Promise<string> {
  if (IPFS_TEST_MODE) {
    console.log('🧪 IPFS Test Mode: Simulating file retrieval for CID:', cid);
    await new Promise(resolve => setTimeout(resolve, 500));
    return `Mock content for CID: ${cid}`;
  }
  
  try {
    const userGateway = PINATA_GATEWAY;
    
    // We use fallback gateways because Pinata's public gateway often blocks CORS (fetch) from localhost
    const gateways = [
      userGateway,
      'https://ipfs.io/ipfs/',
      'https://dweb.link/ipfs/',
      'https://cloudflare-ipfs.com/ipfs/'
    ];

    let lastError = null;
    
    for (const gateway of gateways) {
      try {
        const response = await fetch(`${gateway}${cid}`);
        if (response.ok) {
          return await response.text();
        }
      } catch (e) {
        lastError = e;
        console.warn(`Gateway ${gateway} failed for ${cid}, trying next...`);
      }
    }
    
    throw lastError || new Error('All IPFS gateways failed');
  } catch (error) {
    console.error('Error retrieving from IPFS:', error);
    throw new Error('Failed to retrieve from IPFS');
  }
}

/**
 * Retrieve JSON data from IPFS
 */
export async function retrieveJSONFromIPFS(cid: string): Promise<any> {
  if (IPFS_TEST_MODE) {
    console.log('🧪 IPFS Test Mode: Simulating JSON retrieval for CID:', cid);
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const dataUrl = localStorage.getItem(`ipfs_mock_${cid}`);
    if (dataUrl) {
      const base64 = dataUrl.split(',')[1];
      if (base64) {
        try {
          const text = atob(base64);
          return JSON.parse(text);
        } catch (e) {
          console.error("Failed to parse mock JSON from localStorage", e);
        }
      }
    }
    
    return {
      name: "Mock Credential",
      description: "Test credential for demonstration",
      credentialType: "degree",
      issuer: "0x0000000000000000000000000000000000000000",
      student: "0x0000000000000000000000000000000000000000",
      issueDate: new Date().toISOString(),
      university: "Test University",
      country: "Test Country",
      fileCID: `QmTestFile${Date.now()}Mock`,
      fileName: "mock-certificate.pdf",
      fileSize: 1024000,
      fileType: "application/pdf",
      cid: cid
    };
  }
  
  try {
    const text = await retrieveFromIPFS(cid);
    return JSON.parse(text);
  } catch (error) {
    console.error('Error retrieving JSON from IPFS:', error);
    throw new Error('Failed to retrieve JSON from IPFS');
  }
}

/**
 * Get IPFS gateway URL
 */
export function getIPFSUrl(cid: string): string {
  if (IPFS_TEST_MODE && cid.startsWith('QmTest')) {
    const dataUrl = localStorage.getItem(`ipfs_mock_${cid}`);
    if (dataUrl) return dataUrl;
  }
  return `${PINATA_GATEWAY}${cid}`;
}

export function getCredentialDownloadUrl(cid: string, filename?: string): string {
  const baseUrl = getIPFSUrl(cid);
  return filename ? `${baseUrl}?filename=${encodeURIComponent(filename)}` : baseUrl;
}

export function isValidCID(cid: string): boolean {
  const cidRegex = /^(Qm[1-9A-HJ-NP-Za-km-z]{44}|b[A-Za-z2-7]{58}|z[1-9A-HJ-NP-Za-km-z]{48})$/;
  return cidRegex.test(cid);
}

export function createCredentialMetadata(
  studentName: string,
  credentialType: string,
  issuerName: string,
  studentAddress: string,
  issuerAddress: string,
  additionalData: Partial<CredentialMetadata> = {}
): CredentialMetadata {
  const now = new Date().toISOString();
  
  return {
    name: `${credentialType.charAt(0).toUpperCase() + credentialType.slice(1)} - ${studentName}`,
    description: `Academic ${credentialType} issued by ${issuerName}`,
    credentialType,
    issuer: issuerAddress,
    student: studentAddress,
    issueDate: now,
    university: issuerName,
    country: 'Unknown',
    ...additionalData,
  };
}

export function getIPFSStatus(): {
  configured: boolean;
  message: string;
  endpoint: string;
  keyPreview: string;
} {
  if (IPFS_TEST_MODE) {
    return {
      configured: true,
      endpoint: 'Local Test Storage',
      keyPreview: 'Test Mode',
      message: 'IPFS is running in local browser storage mode'
    };
  }
  
  const configured = isIPFSConfigured();
  return {
    configured,
    endpoint: 'Pinata Cloud',
    keyPreview: PINATA_JWT ? `${PINATA_JWT.substring(0, 15)}...` : 'Not set',
    message: configured 
      ? 'IPFS is properly configured with Pinata'
      : 'IPFS not configured. Please set REACT_APP_PINATA_JWT in your environment.'
  };
}

export async function testIPFSConnection(): Promise<boolean> {
  if (IPFS_TEST_MODE) return true;
  if (!PINATA_JWT) return false;

  try {
    // Pinata has an auth test endpoint
    const response = await fetch('https://api.pinata.cloud/data/testAuthentication', {
      headers: {
        'Authorization': `Bearer ${PINATA_JWT}`
      }
    });
    return response.ok;
  } catch (error) {
    console.error('IPFS test failed:', error);
    return false;
  }
}