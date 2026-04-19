/**
 * Browser-compatible IPFS utilities for the DACV frontend
 * This uses the browser File API and NFT.Storage for IPFS operations
 */

// IPFS Storage configuration - supports both NFT.Storage and Web3.Storage
const NFT_STORAGE_API_KEY = process.env.REACT_APP_NFT_STORAGE_KEY || '';
const WEB3_STORAGE_API_KEY = process.env.REACT_APP_WEB3_STORAGE_KEY || '';
const IPFS_TEST_MODE = process.env.REACT_APP_IPFS_TEST_MODE === 'true';
const NFT_STORAGE_ENDPOINT = 'https://api.nft.storage';
const WEB3_STORAGE_ENDPOINT = 'https://api.web3.storage';

// Determine which service to use
const USE_WEB3_STORAGE = !NFT_STORAGE_API_KEY && WEB3_STORAGE_API_KEY;
const STORAGE_ENDPOINT = USE_WEB3_STORAGE ? WEB3_STORAGE_ENDPOINT : NFT_STORAGE_ENDPOINT;
const STORAGE_API_KEY = USE_WEB3_STORAGE ? WEB3_STORAGE_API_KEY : NFT_STORAGE_API_KEY;

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
  // In test mode, always return true
  if (IPFS_TEST_MODE) {
    return true;
  }
  return !!(NFT_STORAGE_API_KEY || WEB3_STORAGE_API_KEY);
}

/**
 * Upload a file to IPFS using NFT.Storage or Web3.Storage
 */
export async function uploadFileToIPFS(file: File): Promise<string> {
  // Test mode - return mock CID
  if (IPFS_TEST_MODE) {
    console.log('🧪 IPFS Test Mode: Simulating file upload for:', file.name);
    // Generate a mock CID based on file name and timestamp
    const mockCID = `QmTest${Date.now()}${file.name.replace(/[^a-zA-Z0-9]/g, '')}`.substring(0, 46);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate upload delay
    console.log('🧪 Mock CID generated:', mockCID);
    return mockCID;
  }

  if (!STORAGE_API_KEY) {
    throw new Error(`${USE_WEB3_STORAGE ? 'Web3.Storage' : 'NFT.Storage'} API key not configured. Please set REACT_APP_${USE_WEB3_STORAGE ? 'WEB3' : 'NFT'}_STORAGE_KEY.`);
  }

  console.log('Uploading file to IPFS:', {
    name: file.name,
    size: file.size,
    type: file.type,
    service: USE_WEB3_STORAGE ? 'Web3.Storage' : 'NFT.Storage',
    endpoint: STORAGE_ENDPOINT,
    apiKeyConfigured: !!STORAGE_API_KEY
  });

  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${STORAGE_ENDPOINT}/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${STORAGE_API_KEY}`,
      },
      body: formData,
    });

    console.log(`${USE_WEB3_STORAGE ? 'Web3.Storage' : 'NFT.Storage'} response status:`, response.status);

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch {
        errorData = { message: 'No error details available' };
      }
      
      console.error(`${USE_WEB3_STORAGE ? 'Web3.Storage' : 'NFT.Storage'} error response:`, {
        status: response.status,
        statusText: response.statusText,
        errorData
      });
      
      throw new Error(`Upload failed: ${response.status} ${response.statusText} - ${errorData.message || 'Unknown error'}`);
    }

    const data = await response.json();
    console.log(`${USE_WEB3_STORAGE ? 'Web3.Storage' : 'NFT.Storage'} success response:`, data);
    
    return data.value.cid;
  } catch (error) {
    console.error('Error uploading file to IPFS:', error);
    
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('Network error: Please check your internet connection and try again.');
    }
    
    throw new Error(`Failed to upload file to IPFS: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Upload credential metadata to IPFS
 */
export async function uploadCredentialMetadata(metadata: CredentialMetadata): Promise<string> {
  try {
    // Create a JSON blob from metadata
    const jsonBlob = new Blob([JSON.stringify(metadata, null, 2)], {
      type: 'application/json',
    });
    
    // Create a File object from the blob
    const metadataFile = new File([jsonBlob], 'credential-metadata.json', {
      type: 'application/json',
    });
    
    return await uploadFileToIPFS(metadataFile);
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
    // First upload the file to get its CID
    const fileCID = await uploadFileToIPFS(credentialFile);
    
    // Add fileCID to metadata before uploading metadata
    const metadataWithFileCID = {
      ...metadata,
      fileCID: fileCID,
      fileName: credentialFile.name,
      fileSize: credentialFile.size,
      fileType: credentialFile.type
    };
    
    // Then upload the enhanced metadata
    const metadataCID = await uploadCredentialMetadata(metadataWithFileCID as CredentialMetadata);

    return {
      fileCID,
      metadataCID,
    };
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
    // Return mock content based on CID
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay
    return `Mock content for CID: ${cid}`;
  }
  
  try {
    const response = await fetch(`https://nftstorage.link/ipfs/${cid}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.text();
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
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay
    // Return mock credential metadata
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
  return `https://nftstorage.link/ipfs/${cid}`;
}

/**
 * Get downloadable URL for a credential file
 */
export function getCredentialDownloadUrl(cid: string, filename?: string): string {
  const baseUrl = getIPFSUrl(cid);
  return filename ? `${baseUrl}?filename=${encodeURIComponent(filename)}` : baseUrl;
}

/**
 * Validate IPFS CID format
 */
export function isValidCID(cid: string): boolean {
  // CIDv0 (Qm...) or CIDv1 patterns
  const cidRegex = /^(Qm[1-9A-HJ-NP-Za-km-z]{44}|b[A-Za-z2-7]{58}|z[1-9A-HJ-NP-Za-km-z]{48})$/;
  return cidRegex.test(cid);
}

/**
 * Create credential metadata object
 */
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

/**
 * Get IPFS configuration status
 */
export function getIPFSStatus(): {
  configured: boolean;
  message: string;
  endpoint: string;
  keyPreview: string;
} {
  if (IPFS_TEST_MODE) {
    return {
      configured: true,
      endpoint: 'Test Mode',
      keyPreview: 'Test Mode (No API Key Required)',
      message: 'IPFS is running in test mode - files will be mocked'
    };
  }
  
  const configured = isIPFSConfigured();
  return {
    configured,
    endpoint: STORAGE_ENDPOINT,
    keyPreview: STORAGE_API_KEY ? `${STORAGE_API_KEY.substring(0, 10)}...` : 'Not set',
    message: configured 
      ? `IPFS is properly configured with ${USE_WEB3_STORAGE ? 'Web3.Storage' : 'NFT.Storage'}`
      : `IPFS not configured. Please set REACT_APP_${USE_WEB3_STORAGE ? 'WEB3' : 'NFT'}_STORAGE_KEY in your environment.`
  };
}

/**
 * Test IPFS connection
 */
export async function testIPFSConnection(): Promise<boolean> {
  if (IPFS_TEST_MODE) {
    console.log('🧪 IPFS Test Mode: Connection test successful (mocked)');
    return true;
  }
  
  if (!STORAGE_API_KEY) {
    console.error(`${USE_WEB3_STORAGE ? 'Web3.Storage' : 'NFT.Storage'} API key not configured`);
    return false;
  }

  try {
    // Create a small test file
    const testData = new Blob(['DACV IPFS Test'], { type: 'text/plain' });
    const testFile = new File([testData], 'test.txt', { type: 'text/plain' });
    
    console.log('Testing IPFS connection...');
    const cid = await uploadFileToIPFS(testFile);
    console.log('IPFS test successful, CID:', cid);
    return true;
  } catch (error) {
    console.error('IPFS test failed:', error);
    return false;
  }
}