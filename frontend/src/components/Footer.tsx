import React, { useEffect, useState } from 'react';
import Modal from './Modal';
import TermsContent from './TermsContent';
import PrivacyContent from './PrivacyContent';
import DonkeyLogo from './DonkeyLogo';

const Footer: React.FC = () => {
  const [termsOpen, setTermsOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);

  return (
    <>
      <footer className="relative mt-20 border-t border-metrik-turquoise/20">
        {/* Glass morphism background - METRIK DELTA style */}
        <div className="absolute inset-0 bg-gradient-to-b from-metrik-black/80 via-metrik-black/90 to-metrik-black backdrop-blur-xl" />
        
        {/* Glow effect top */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-metrik-turquoise/50 to-transparent" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            
            {/* Column 1: Brand & Description */}
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <DonkeyLogo 
                  size={40} 
                  className="text-metrik-turquoise" 
                />
                <span className="text-xl font-rajdhani font-black bg-gradient-to-r from-metrik-turquoise to-cyan-400 bg-clip-text text-transparent">
                  METRIK DELTA
                </span>
              </div>
              <p className="text-metrik-silver font-rajdhani text-sm leading-relaxed">
                Professional F1 telemetry analysis platform. Dive deep into race data with interactive 3D visualizations.
              </p>
            </div>

            {/* Column 2: Legal */}
            <div>
              <h3 className="text-white font-rajdhani font-bold text-lg mb-4 uppercase tracking-wide">Legal</h3>
              <ul className="space-y-3">
                <li>
                  <button 
                    onClick={() => setTermsOpen(true)}
                    className="text-metrik-silver hover:text-metrik-turquoise transition-colors font-rajdhani text-sm text-left group flex items-center gap-2"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-metrik-turquoise/50 group-hover:bg-metrik-turquoise transition-colors" />
                    Terms of Service
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => setPrivacyOpen(true)}
                    className="text-metrik-silver hover:text-metrik-turquoise transition-colors font-rajdhani text-sm text-left group flex items-center gap-2"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-metrik-turquoise/50 group-hover:bg-metrik-turquoise transition-colors" />
                    Privacy Policy
                  </button>
                </li>
              </ul>
            </div>

            {/* Column 3: Contact & Social */}
            <div>
              <h3 className="text-white font-rajdhani font-bold text-lg mb-4 uppercase tracking-wide">Connect</h3>
              <div className="space-y-4">
                <a 
                  href="mailto:contact@metrikdelta.com" 
                  className="flex items-center space-x-2 text-metrik-silver hover:text-metrik-turquoise transition-colors font-rajdhani text-sm group"
                >
                  <svg className="w-4 h-4 text-metrik-turquoise/50 group-hover:text-metrik-turquoise transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span>contact@metrikdelta.com</span>
                </a>

                {/* Social Media */}
                <div className="flex space-x-3 pt-2">
                  
                  {/* X (Twitter) */}
                  <a 
                    href="https://x.com/F1Metrik" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="w-10 h-10 rounded-lg backdrop-blur-xl bg-metrik-card/50 hover:bg-metrik-turquoise/20 border border-metrik-turquoise/20 hover:border-metrik-turquoise/50 flex items-center justify-center transition-all group hover:scale-110"
                    title="X (Twitter)"
                  >
                    <svg className="w-4 h-4 text-metrik-silver group-hover:text-metrik-turquoise transition-colors" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                  </a>

                  {/* TikTok */}
                  <a 
                    href="https://www.tiktok.com/@f1metrik" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="w-10 h-10 rounded-lg backdrop-blur-xl bg-metrik-card/50 hover:bg-metrik-turquoise/20 border border-metrik-turquoise/20 hover:border-metrik-turquoise/50 flex items-center justify-center transition-all group hover:scale-110"
                    title="TikTok"
                  >
                    <svg className="w-4 h-4 text-metrik-silver group-hover:text-metrik-turquoise transition-colors" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                    </svg>
                  </a>

                  {/* YouTube */}
                  <a 
                    href="https://www.youtube.com/@F1metrik" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="w-10 h-10 rounded-lg backdrop-blur-xl bg-metrik-card/50 hover:bg-metrik-turquoise/20 border border-metrik-turquoise/20 hover:border-metrik-turquoise/50 flex items-center justify-center transition-all group hover:scale-110"
                    title="YouTube"
                  >
                    <svg className="w-4 h-4 text-metrik-silver group-hover:text-metrik-turquoise transition-colors" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                    </svg>
                  </a>

                  {/* GitHub */}
                  <a 
                    href="https://github.com/metrikdelta" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="w-10 h-10 rounded-lg backdrop-blur-xl bg-metrik-card/50 hover:bg-metrik-turquoise/20 border border-metrik-turquoise/20 hover:border-metrik-turquoise/50 flex items-center justify-center transition-all group hover:scale-110"
                    title="GitHub"
                  >
                    <svg className="w-4 h-4 text-metrik-silver group-hover:text-metrik-turquoise transition-colors" fill="currentColor" viewBox="0 0 24 24">
                      <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                    </svg>
                  </a>
                </div>

                {/* Buy Me a Coffee - METRIK DELTA style */}
                <div className="pt-3">
                  <a 
                    href="https://buymeacoffee.com/metrikdelta" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-2.5 backdrop-blur-xl bg-metrik-card/50 hover:bg-metrik-turquoise/20 border border-metrik-turquoise/20 hover:border-metrik-turquoise/50 rounded-lg transition-all group hover:scale-105"
                  >
                    <svg className="w-5 h-5 text-metrik-silver group-hover:text-metrik-turquoise transition-colors" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20.216 6.415l-.132-.666c-.119-.598-.388-1.163-1.001-1.379-.197-.069-.42-.098-.57-.241-.152-.143-.196-.366-.231-.572-.065-.378-.125-.756-.192-1.133-.057-.325-.102-.69-.25-.987-.195-.4-.597-.634-.996-.788a5.723 5.723 0 00-.626-.194c-1-.263-2.05-.36-3.077-.416a25.834 25.834 0 00-3.7.062c-.915.083-1.88.184-2.75.5-.318.116-.646.256-.888.501-.297.302-.393.77-.177 1.146.154.267.415.456.692.58.36.162.737.284 1.123.366 1.075.238 2.189.331 3.287.37 1.218.05 2.437.01 3.65-.118.299-.033.598-.073.896-.119.352-.054.578-.513.474-.834-.124-.383-.457-.531-.834-.473-.466.074-.96.108-1.382.146-1.177.08-2.358.082-3.536.006a22.228 22.228 0 01-1.157-.107c-.086-.01-.18-.025-.258-.036-.243-.036-.484-.08-.724-.13-.111-.027-.111-.185 0-.212h.005c.277-.06.557-.108.838-.147h.002c.131-.009.263-.032.394-.048a25.076 25.076 0 013.426-.12c.674.019 1.347.067 2.017.144l.228.031c.267.04.533.088.798.145.392.085.895.113 1.07.542.055.137.08.288.111.431l.319 1.484a.237.237 0 01-.199.284h-.003c-.037.006-.075.01-.112.015a36.704 36.704 0 01-4.743.295 37.059 37.059 0 01-4.699-.304c-.14-.017-.293-.042-.417-.06-.326-.048-.649-.108-.973-.161-.393-.065-.768-.032-1.123.161-.29.16-.527.404-.675.701-.154.316-.199.66-.267 1-.069.34-.176.707-.135 1.056.087.753.613 1.365 1.37 1.502a39.69 39.69 0 0011.343.376.483.483 0 01.535.53l-.071.697-1.018 9.907c-.041.41-.047.832-.125 1.237-.122.637-.553 1.028-1.182 1.171-.577.131-1.165.2-1.756.205-.656.004-1.31-.025-1.966-.022-.699.004-1.556-.06-2.095-.58-.475-.458-.54-1.174-.605-1.793l-.731-7.013-.322-3.094c-.037-.351-.286-.695-.678-.678-.336.015-.718.3-.678.679l.228 2.185.949 9.112c.147 1.344 1.174 2.068 2.446 2.272.742.12 1.503.144 2.257.156.966.016 1.942.053 2.892-.122 1.408-.258 2.465-1.198 2.616-2.657.34-3.332.683-6.663 1.024-9.995l.215-2.087a.484.484 0 01.39-.426c.402-.078.787-.212 1.074-.518.455-.488.546-1.124.385-1.766zm-1.478.772c-.145.137-.363.201-.578.233-2.416.359-4.866.54-7.308.46-1.748-.06-3.477-.254-5.207-.498-.17-.024-.353-.055-.47-.18-.22-.236-.111-.71-.054-.995.052-.26.152-.609.463-.646.484-.057 1.046.148 1.526.22.577.088 1.156.159 1.737.212 2.48.226 5.002.19 7.472-.14.45-.06.899-.13 1.345-.21.399-.072.84-.206 1.08.206.166.281.188.657.162.974a.544.544 0 01-.169.364zm-6.159 3.9c-.862.37-1.84.788-3.109.788a5.884 5.884 0 01-1.569-.217l.877 9.004c.065.78.717 1.38 1.5 1.38 0 0 1.243.065 1.658.065.447 0 1.786-.065 1.786-.065.783 0 1.434-.6 1.499-1.38l.94-9.95a3.996 3.996 0 00-1.322-.238c-.826 0-1.491.284-2.26.613z"/>
                    </svg>
                    <span className="text-metrik-silver group-hover:text-metrik-turquoise transition-colors font-rajdhani font-bold text-sm">
                      Buy me a coffee
                    </span>
                  </a>
                </div>
              </div>
            </div>

          </div>

          {/* Bottom Bar */}
          <div className="pt-8 border-t border-metrik-turquoise/20">
            <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
              <p className="text-metrik-silver font-rajdhani text-sm text-center md:text-left">
                © 2025 <span className="text-metrik-turquoise font-bold">METRIK DELTA</span>. All rights reserved.
              </p>
              
              {/* Attribution */}
              <div className="flex flex-wrap justify-center md:justify-end items-center gap-2 text-xs text-metrik-silver font-rajdhani">
                <span>Powered by</span>
                <a 
                  href="https://github.com/theOehrly/Fast-F1" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-metrik-turquoise hover:text-cyan-400 transition-colors font-bold"
                >
                  FastF1
                </a>
                <span>•</span>
                <a 
                  href="http://ergast.com/mrd/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-metrik-turquoise hover:text-cyan-400 transition-colors font-bold"
                >
                  Ergast API
                </a>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <Modal 
        isOpen={termsOpen} 
        onClose={() => setTermsOpen(false)}
        title="Terms of Service"
      >
        <TermsContent />
      </Modal>

      <Modal 
        isOpen={privacyOpen} 
        onClose={() => setPrivacyOpen(false)}
        title="Privacy Policy"
      >
        <PrivacyContent />
      </Modal>
    </>
  );
};

export default Footer;