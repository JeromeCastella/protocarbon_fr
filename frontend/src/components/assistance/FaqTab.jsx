import React from 'react';
import { Search, ChevronDown, ChevronUp, X, Mail } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const FaqTab = ({ isDark, t, language, faqSearch, setFaqSearch, filteredFaqCategories, expandedCategories, toggleCategory, expandedQuestions, toggleQuestion }) => {
  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="relative">
        <Search className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${isDark ? 'text-slate-400' : 'text-gray-400'}`} />
        <input
          type="text" value={faqSearch} onChange={(e) => setFaqSearch(e.target.value)}
          placeholder={t('assistance.faqSearch')} data-testid="faq-search"
          className={`w-full pl-12 pr-4 py-3 rounded-xl border transition-all focus:ring-2 focus:ring-blue-500 ${
            isDark ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'
          }`}
        />
        {faqSearch && (
          <button onClick={() => setFaqSearch('')}
            className={`absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-full ${isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-100'}`}>
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* FAQ Categories */}
      <div className="space-y-4">
        {filteredFaqCategories.map((category) => {
          const Icon = category.icon;
          const isExpanded = expandedCategories[category.id];
          const title = language === 'fr' ? category.title_fr : category.title_de;

          return (
            <motion.div key={category.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className={`rounded-2xl overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-white shadow-sm border border-gray-100'}`}>
              <button onClick={() => toggleCategory(category.id)} data-testid={`faq-category-${category.id}`}
                className={`w-full p-5 flex items-center justify-between transition-colors ${isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-50'}`}>
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl bg-${category.color}-500/20`}>
                    <Icon className={`w-6 h-6 text-${category.color}-500`} />
                  </div>
                  <div className="text-left">
                    <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{title}</h3>
                    <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{category.questions.length} {t('assistance.questions')}</p>
                  </div>
                </div>
                {isExpanded ? <ChevronUp className={`w-5 h-5 ${isDark ? 'text-slate-400' : 'text-gray-400'}`} /> : <ChevronDown className={`w-5 h-5 ${isDark ? 'text-slate-400' : 'text-gray-400'}`} />}
              </button>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
                    className={`border-t ${isDark ? 'border-slate-700' : 'border-gray-100'}`}>
                    {category.questions.map((q, idx) => {
                      const isQuestionExpanded = expandedQuestions[q.id];
                      const question = language === 'fr' ? q.question_fr : q.question_de;
                      const answer = language === 'fr' ? q.answer_fr : q.answer_de;

                      return (
                        <div key={q.id} className={`${idx > 0 ? `border-t ${isDark ? 'border-slate-700' : 'border-gray-100'}` : ''}`}>
                          <button onClick={() => toggleQuestion(q.id)} data-testid={`faq-question-${q.id}`}
                            className={`w-full p-4 pl-6 flex items-center justify-between text-left transition-colors ${isDark ? 'hover:bg-slate-700/50' : 'hover:bg-gray-50'}`}>
                            <span className={`font-medium pr-4 ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>{question}</span>
                            {isQuestionExpanded ? <ChevronUp className={`w-4 h-4 flex-shrink-0 ${isDark ? 'text-slate-400' : 'text-gray-400'}`} /> : <ChevronDown className={`w-4 h-4 flex-shrink-0 ${isDark ? 'text-slate-400' : 'text-gray-400'}`} />}
                          </button>
                          <AnimatePresence>
                            {isQuestionExpanded && (
                              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.15 }}
                                className={`px-6 pb-4 ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
                                <div className={`p-4 rounded-xl ${isDark ? 'bg-slate-700/50' : 'bg-gray-50'}`}>{answer}</div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {/* No results */}
      {filteredFaqCategories.length === 0 && faqSearch && (
        <div className={`text-center py-12 rounded-2xl ${isDark ? 'bg-slate-800' : 'bg-white shadow-sm border border-gray-100'}`}>
          <Search className={`w-12 h-12 mx-auto mb-4 ${isDark ? 'text-slate-600' : 'text-gray-300'}`} />
          <p className={isDark ? 'text-slate-400' : 'text-gray-500'}>{t('assistance.noFaqResults')}</p>
        </div>
      )}

      {/* Contact Support */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className={`p-6 rounded-2xl ${isDark ? 'bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20' : 'bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-100'}`}>
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-blue-500/20"><Mail className="w-6 h-6 text-blue-500" /></div>
          <div className="flex-1">
            <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{t('assistance.contactTitle')}</h3>
            <p className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>{t('assistance.contactSubtitle')}</p>
          </div>
          <a href="mailto:support@protocarbon.ch" data-testid="contact-support-btn"
            className="flex items-center gap-2 px-5 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors font-medium">
            <Mail className="w-5 h-5" />{t('assistance.contactBtn')}
          </a>
        </div>
      </motion.div>
    </div>
  );
};

export default FaqTab;
