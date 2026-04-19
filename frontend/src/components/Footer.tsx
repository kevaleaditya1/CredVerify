import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-white border-t mt-12">
      <div className="container mx-auto px-4 py-6 flex flex-col md:flex-row items-center justify-between text-sm text-gray-600">
        <div className="mb-3 md:mb-0">
          © {new Date().getFullYear()} DACV — Decentralized Academic Credential Verification
        </div>

        <div className="flex space-x-4">
          <a href="/" className="hover:text-primary-600">Home</a>
          <a href="/verify" className="hover:text-primary-600">Verify</a>
          <a href="/university" className="hover:text-primary-600">University</a>
          <a href="/student" className="hover:text-primary-600">Student</a>
        </div>
        <div>
          Built with ♥ by DACV Team
        </div>
      </div>
    </footer>
  );
};

export default Footer;
