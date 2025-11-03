import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

const LanguageSelector: React.FC = () => {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const languages = [
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
  ];

  const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[1];

  const changeLanguage = (langCode: string) => {
    i18n.changeLanguage(langCode);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-metrik-card/50 border border-metrik-turquoise/30 hover:border-metrik-turquoise/60 transition-all duration-200"
      >
        <Globe className="w-4 h-4 text-metrik-turquoise" />
        <span className="text-sm font-rajdhani font-bold text-white">
          {currentLanguage.flag}
        </span>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute right-0 mt-2 w-48 backdrop-blur-xl bg-metrik-card/95 border border-metrik-turquoise/30 rounded-xl shadow-lg shadow-metrik-turquoise/20 z-50 overflow-hidden">
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => changeLanguage(lang.code)}
                className={`
                  w-full flex items-center gap-3 px-4 py-3 text-left transition-all duration-200
                  ${
                    i18n.language === lang.code
                      ? 'bg-metrik-turquoise/20 text-metrik-turquoise'
                      : 'text-metrik-silver hover:bg-metrik-turquoise/10 hover:text-metrik-turquoise'
                  }
                `}
              >
                <span className="text-xl">{lang.flag}</span>
                <span className="font-rajdhani font-bold">{lang.name}</span>
                {i18n.language === lang.code && (
                  <span className="ml-auto text-metrik-turquoise">✓</span>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default LanguageSelector;