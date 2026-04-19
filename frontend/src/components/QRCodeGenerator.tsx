import React from 'react';
import QRCode from 'qrcode.react';

interface QRCodeGeneratorProps {
  value: string;
  size?: number;
  level?: 'L' | 'M' | 'Q' | 'H';
  includeMargin?: boolean;
  title?: string;
  description?: string;
  onCopy?: () => void;
  onShare?: () => void;
}

const QRCodeGenerator: React.FC<QRCodeGeneratorProps> = ({
  value,
  size = 200,
  level = 'M',
  includeMargin = true,
  title = 'QR Code',
  description,
  onCopy,
  onShare,
}) => {
  const copyToClipboard = () => {
    navigator.clipboard.writeText(value);
    onCopy?.();
  };

  const shareContent = () => {
    if (navigator.share) {
      navigator.share({
        title,
        text: description || 'Scan this QR code',
        url: value,
      });
    } else {
      copyToClipboard();
    }
    onShare?.();
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <QRCode
          value={value}
          size={size}
          level={level}
          includeMargin={includeMargin}
        />
      </div>
      
      {title && (
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      )}
      
      {description && (
        <p className="text-sm text-gray-600 text-center max-w-xs">{description}</p>
      )}
      
      <div className="flex space-x-2">
        <button
          onClick={copyToClipboard}
          className="btn-secondary text-sm"
        >
          Copy Link
        </button>
        <button
          onClick={shareContent}
          className="btn-primary text-sm"
        >
          Share
        </button>
      </div>
    </div>
  );
};

export default QRCodeGenerator;