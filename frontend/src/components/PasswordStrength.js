import React, { useMemo } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { Check, X } from 'lucide-react';

const PasswordStrength = ({ password }) => {
  const { isDark } = useTheme();
  const { language } = useLanguage();

  const requirements = useMemo(() => [
    {
      label: language === 'fr' ? 'Au moins 8 caractères' : 'Mindestens 8 Zeichen',
      met: password.length >= 8
    },
    {
      label: language === 'fr' ? 'Une lettre majuscule' : 'Ein Großbuchstabe',
      met: /[A-Z]/.test(password)
    },
    {
      label: language === 'fr' ? 'Une lettre minuscule' : 'Ein Kleinbuchstabe',
      met: /[a-z]/.test(password)
    },
    {
      label: language === 'fr' ? 'Un chiffre' : 'Eine Zahl',
      met: /\d/.test(password)
    },
    {
      label: language === 'fr' ? 'Un caractère spécial (!@#$%...)' : 'Ein Sonderzeichen (!@#$%...)',
      met: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    }
  ], [password, language]);

  const metCount = requirements.filter(r => r.met).length;
  
  const strength = useMemo(() => {
    if (password.length === 0) return { level: 0, label: '', color: '' };
    if (metCount <= 2) return { 
      level: 1, 
      label: language === 'fr' ? 'Faible' : 'Schwach',
      color: 'bg-red-500'
    };
    if (metCount <= 3) return { 
      level: 2, 
      label: language === 'fr' ? 'Moyen' : 'Mittel',
      color: 'bg-orange-500'
    };
    if (metCount <= 4) return { 
      level: 3, 
      label: language === 'fr' ? 'Bon' : 'Gut',
      color: 'bg-yellow-500'
    };
    return { 
      level: 4, 
      label: language === 'fr' ? 'Excellent' : 'Ausgezeichnet',
      color: 'bg-green-500'
    };
  }, [metCount, password.length, language]);

  if (password.length === 0) return null;

  return (
    <div className="mt-2 space-y-3">
      {/* Strength bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span className={isDark ? 'text-slate-400' : 'text-gray-500'}>
            {language === 'fr' ? 'Force du mot de passe' : 'Passwortstärke'}
          </span>
          <span className={`font-medium ${
            strength.level === 1 ? 'text-red-500' :
            strength.level === 2 ? 'text-orange-500' :
            strength.level === 3 ? 'text-yellow-500' :
            'text-green-500'
          }`}>
            {strength.label}
          </span>
        </div>
        <div className={`h-2 rounded-full ${isDark ? 'bg-slate-700' : 'bg-gray-200'} overflow-hidden`}>
          <div 
            className={`h-full transition-all duration-300 ${strength.color}`}
            style={{ width: `${(strength.level / 4) * 100}%` }}
          />
        </div>
      </div>

      {/* Requirements checklist */}
      <div className="grid grid-cols-1 gap-1">
        {requirements.map((req, idx) => (
          <div 
            key={idx}
            className={`flex items-center gap-2 text-xs ${
              req.met 
                ? 'text-green-500' 
                : isDark ? 'text-slate-500' : 'text-gray-400'
            }`}
          >
            {req.met ? (
              <Check className="w-3 h-3" />
            ) : (
              <X className="w-3 h-3" />
            )}
            <span>{req.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PasswordStrength;
