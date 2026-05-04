import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Zap, Globe, Lock, GraduationCap, UserCircle, Search, ArrowRight } from 'lucide-react';

const Home: React.FC = () => {

  const features = [
    {
      title: 'Tamper-Proof',
      description: 'Immutable records stored on the Ethereum blockchain ensure zero forgery.',
      icon: <ShieldCheck className="w-6 h-6" />,
    },
    {
      title: 'Instant Scan',
      description: 'Verify credentials in milliseconds with our direct ledger protocol.',
      icon: <Zap className="w-6 h-6" />,
    },
    {
      title: 'Global Access',
      description: 'Universal standard for academic records accessible worldwide.',
      icon: <Globe className="w-6 h-6" />,
    },
    {
      title: 'Private Sync',
      description: 'Encrypted hashes maintain confidentiality and complete data safety.',
      icon: <Lock className="w-6 h-6" />,
    },
  ];

  const userTypes = [
    {
      title: 'Institutions',
      description: 'Authorized portal to issue secure academic certificates.',
      link: '/university',
      icon: <GraduationCap className="w-10 h-10" />,
    },
    {
      title: 'Students',
      description: 'A sovereign vault for your digital credentials.',
      link: '/student',
      icon: <UserCircle className="w-10 h-10" />,
    },
    {
      title: 'Verification',
      description: 'Public audit terminal for instant record validation.',
      link: '/verify',
      icon: <Search className="w-10 h-10" />,
    },
  ];

  return (
    <div className="space-y-32 pb-32">
      {/* Hero */}
      <section className="flex flex-col lg:flex-row items-center gap-16 py-12">
        <div className="flex-1 space-y-10">
          <div className="space-y-6">
            <h1 className="text-6xl lg:text-8xl font-bold tracking-tight leading-[0.9]">
              Decentralized <br />
              <span className="text-muted-foreground text-4xl lg:text-6xl font-medium tracking-normal">Academic Records.</span>
            </h1>
            <p className="max-w-xl text-xl text-muted-foreground leading-relaxed">
              CredVerify provides a sovereign infrastructure for educational achievements. 
              Trustless, permanent, and instantly verifiable.
            </p>
          </div>
          
          <div className="flex flex-wrap gap-4">
            <Link to="/verify" className="matte-button-primary h-14 px-10 text-lg rounded-full">
              Audit a Record
            </Link>
            <Link to="/university" className="matte-button-secondary h-14 px-10 text-lg rounded-full bg-zinc-900 border-zinc-800 hover:bg-zinc-800">
              Registrar Portal
            </Link>
          </div>
        </div>

        <div className="flex-1 w-full max-w-xl">
          <div className="aspect-square rounded-3xl bg-zinc-950 border border-zinc-800 flex items-center justify-center relative overflow-hidden group">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.05),transparent)] opacity-0 group-hover:opacity-100 transition-opacity" />
              <img 
                src="/logo.png" 
                alt="DACV Logo" 
                className="w-full h-full object-contain p-8 group-hover:scale-105 transition-transform duration-500" 
              />
           </div>
        </div>
      </section>

      {/* Grid of Users */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {userTypes.map((type, i) => (
          <Link 
            key={i} 
            to={type.link} 
            className="matte-card p-10 space-y-12 hover:border-white/20 transition-all group"
          >
            <div className="text-muted-foreground group-hover:text-foreground transition-colors">{type.icon}</div>
            <div className="space-y-3">
              <h3 className="text-2xl font-bold">{type.title}</h3>
              <p className="text-muted-foreground">{type.description}</p>
            </div>
            <div className="flex items-center text-sm font-bold tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity">
              ENTER MODULE <ArrowRight className="ml-2 w-4 h-4" />
            </div>
          </Link>
        ))}
      </section>

      {/* Features Detail */}
      <section className="py-20 border-y border-zinc-900">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {features.map((feature, i) => (
            <div key={i} className="space-y-6">
              <div className="w-12 h-12 rounded-xl bg-zinc-900 flex items-center justify-center border border-zinc-800">
                {feature.icon}
              </div>
              <div className="space-y-2">
                <h4 className="text-lg font-bold">{feature.title}</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Bottom */}
      <section className="bg-white text-black p-16 lg:p-24 rounded-[3rem] text-center space-y-10 overflow-hidden relative">
         <div className="absolute top-0 right-0 w-64 h-64 bg-black/5 rounded-full blur-3xl" />
         <h2 className="text-4xl lg:text-6xl font-bold tracking-tighter max-w-3xl mx-auto">
            Ready to integrate with the global credential layer?
         </h2>
         <div className="flex justify-center gap-6">
           <Link to="/university" className="bg-black text-white px-10 py-5 rounded-full font-bold hover:scale-105 transition-transform">
             Get started
           </Link>
         </div>
      </section>
    </div>
  );
};

export default Home;