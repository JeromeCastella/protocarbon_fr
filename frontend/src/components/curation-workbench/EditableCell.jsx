import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../../context/LanguageContext';

const EditableCell = ({ value, onSave, isDark, placeholder = '', className = '', type = 'text', cellId = '', onNavigate }) => {
  const { t } = useLanguage();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value || '');
  const ref = useRef(null);
  const committedRef = useRef(false);
  const lastSavedRef = useRef(null);

  useEffect(() => {
    if (!editing) setDraft(value || '');
  }, [value, editing]);

  useEffect(() => {
    lastSavedRef.current = null;
  }, [value]);

  useEffect(() => {
    if (editing && ref.current) {
      ref.current.focus();
      ref.current.select();
      committedRef.current = false;
    }
  }, [editing]);

  const commit = (navigateDir) => {
    if (committedRef.current) return;
    committedRef.current = true;
    const currentDraft = draft;
    setEditing(false);
    if (currentDraft !== (value || '')) {
      const saveValue = type === 'number' ? Number(currentDraft) : currentDraft;
      lastSavedRef.current = String(saveValue);
      onSave(saveValue);
    }
    if (navigateDir && onNavigate) onNavigate(cellId, navigateDir);
  };

  const displayValue = lastSavedRef.current !== null ? lastSavedRef.current : value;

  if (!editing) {
    return (
      <div
        onClick={() => setEditing(true)}
        data-cell-id={cellId}
        title={t('curation.cell.clickToEdit')}
        className={`cursor-text min-h-[24px] ${!displayValue ? `italic ${isDark ? 'text-slate-600' : 'text-gray-300'}` : ''} ${className}`}
      >
        {displayValue || placeholder}
      </div>
    );
  }

  return (
    <input
      ref={ref}
      type={type}
      value={draft}
      data-cell-id={cellId}
      onChange={e => setDraft(e.target.value)}
      onBlur={() => commit(null)}
      onKeyDown={e => {
        if (e.key === 'Tab') {
          e.preventDefault();
          commit(e.shiftKey ? 'prev' : 'next');
        } else if (e.key === 'Enter' && e.shiftKey) {
          e.preventDefault();
          commit('mark-reviewed');
        } else if (e.key === 'Enter') {
          commit('down');
        } else if (e.key === 'Escape') {
          setDraft(value || '');
          committedRef.current = true;
          setEditing(false);
        }
      }}
      className={`w-full bg-transparent border-b-2 border-blue-500 outline-none text-xs py-0.5 ${isDark ? 'text-white' : 'text-gray-900'}`}
    />
  );
};

export default EditableCell;
