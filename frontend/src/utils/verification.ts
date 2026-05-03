/**
 * Browser-compatible verification utilities for the DACV frontend
 */

export interface VerificationData {
  credentialId: string;
  contractAddress: string;
  chainId: number;
  verificationUrl?: string;
}

/**
 * Generate verification URL for a credential
 */
export function generateVerificationUrl(
  credentialId: string,
  contractAddress: string,
  chainId: number,
  baseUrl?: string
): string {
  const base = baseUrl || window.location.origin;
  const params = new URLSearchParams({
    id: credentialId,
  });
  
  return `${base}/verify?${params.toString()}`;
}

/**
 * Create verification data object for QR code
 */
export function createVerificationData(
  credentialId: string,
  contractAddress: string,
  chainId: number,
  baseUrl?: string
): VerificationData {
  return {
    credentialId,
    contractAddress,
    chainId,
    verificationUrl: generateVerificationUrl(credentialId, contractAddress, chainId, baseUrl),
  };
}

/**
 * Parse verification data from URL or QR code content
 */
export function parseVerificationData(urlOrData: string): VerificationData | null {
  try {
    // Try to parse as JSON first (direct QR code data)
    const jsonData = JSON.parse(urlOrData);
    if (jsonData.credentialId && jsonData.contractAddress && jsonData.chainId) {
      return jsonData as VerificationData;
    }
  } catch {
    // If not JSON, try to parse as URL
    try {
      const url = new URL(urlOrData);
      const params = url.searchParams;
      
      const credentialId = params.get('id');
      const contractAddress = params.get('contract');
      const chainId = params.get('chain');
      
      if (credentialId && contractAddress && chainId) {
        return {
          credentialId,
          contractAddress,
          chainId: parseInt(chainId, 10),
          verificationUrl: urlOrData,
        };
      }
    } catch {
      // URL parsing failed
    }
  }
  
  return null;
}

/**
 * Generate a short verification code (for manual entry)
 */
export function generateShortCode(credentialId: string): string {
  // Take first 12 characters of credential ID for a shorter code
  return credentialId.slice(0, 12).toUpperCase();
}

/**
 * Validate credential ID format
 */
export function isValidCredentialId(credentialId: string): boolean {
  // Check if it's a valid hex string (32 bytes = 64 hex chars + 0x prefix)
  const hexRegex = /^0x[a-fA-F0-9]{64}$/;
  return hexRegex.test(credentialId);
}

/**
 * Format credential ID for display
 */
export function formatCredentialId(credentialId: string): string {
  if (!credentialId) return '';
  
  if (credentialId.length > 10) {
    return `${credentialId.slice(0, 6)}...${credentialId.slice(-4)}`;
  }
  
  return credentialId;
}

/**
 * Format wallet address for display
 */
export function formatAddress(address: string): string {
  if (!address) return '';
  
  if (address.length > 10) {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }
  
  return address;
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
}

/**
 * Share verification URL using Web Share API or fallback to clipboard
 */
export async function shareVerificationUrl(
  verificationUrl: string,
  credentialType: string,
  issuerName: string
): Promise<boolean> {
  const title = `${credentialType} Verification`;
  const text = `Verify my academic credential from ${issuerName}`;
  
  // Try native sharing first
  if (navigator.share) {
    try {
      await navigator.share({
        title,
        text,
        url: verificationUrl,
      });
      return true;
    } catch (error) {
      // User cancelled or sharing failed, fall back to clipboard
    }
  }
  
  // Fallback to clipboard
  return await copyToClipboard(verificationUrl);
}

/**
 * Validate URL format
 */
export function isValidUrl(string: string): boolean {
  try {
    new URL(string);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get blockchain explorer URL for a transaction
 */
export function getExplorerUrl(
  chainId: number,
  txHash: string,
  type: 'tx' | 'address' = 'tx'
): string {
  const explorers: Record<number, string> = {};
  
  const baseUrl = explorers[chainId] || ''; // Localhost has no explorer
  return baseUrl ? `${baseUrl}/${type}/${txHash}` : '#';
}

/**
 * Format timestamp for display
 */
export function formatTimestamp(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format date for display
 */
export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Check if a timestamp is expired
 */
export function isExpired(expiryTimestamp: number): boolean {
  if (expiryTimestamp === 0) return false; // No expiry
  return Date.now() / 1000 > expiryTimestamp;
}

/**
 * Get relative time string (e.g., "2 days ago")
 */
export function getRelativeTime(timestamp: number): string {
  const now = Date.now() / 1000;
  const diff = now - timestamp;
  
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)} days ago`;
  
  return formatTimestamp(timestamp);
}