import React from 'react';
import { CheckCircle2, Flag, CircleDot } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

const StatusBadge = ({ status, isDark, onCycle }) => {
  const { t } = useLanguage();
  const configs = {
    reviewed: { icon: CheckCircle2, label: t('curation.status.reviewed'), cls: 'text-green-500 bg-green-500/10' },
    flagged: { icon: Flag, label: t('curation.status.flagged'), cls: 'text-amber-500 bg-amber-500/10' },
    untreated: { icon: CircleDot, label: t('curation.status.toTreat'), cls: isDark ? 'text-slate-500 bg-slate-700' : 'text-gray-400 bg-gray-100' },
  };
  const s = status || 'untreated';
  const c = configs[s] || configs.untreated;
  const Icon = c.icon;
  const next = s === 'untreated' ? 'reviewed' : s === 'reviewed' ? 'flagged' : 'untreated';

  return (
    <button onClick={() => onCycle(next)} title={`${t('curation.status.switchTo')}: ${configs[next].label}`}
      className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium transition-all ${c.cls} hover:opacity-80`}>
      <Icon className="w-3 h-3" />{c.label}
    </button>
  );
};

export default StatusBadge;
