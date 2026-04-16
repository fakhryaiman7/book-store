import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

/**
 * SMART AI LIBRARIAN COMPONENT
 * Lightweight semantic-style search using intent mapping and scoring.
 */

// --- Translation & Intent Mapping ---
const INTENT_MAP = {
  // English Keywords -> Categories/Keywords
  "business": ["Business", "Success", "Money", "Startups", "Economy", "Management"],
  "money": ["Business", "Finance", "Economy"],
  "success": ["Business", "Self-help", "Motivation"],
  "romantic": ["Romance", "Love", "Passion", "Relationship"],
  "love": ["Romance", "Passion"],
  "mystery": ["Mystery", "Crime", "Detective", "Thriller", "Suspense"],
  "scary": ["Horror", "Thriller", "Suspense"],
  "kids": ["Children", "Kids", "Animation", "Story"],
  "children": ["Children", "Kids", "Education"],
  "sad": ["Drama", "Tragedy", "Emotional", "Classic"],
  "happy": ["Comedy", "Fun", "Lighthearted"],
  "fun": ["Comedy", "Entertainment", "Light", "Fun", "Happy"],
  "academic": ["Academic", "Education", "Study", "Science", "University", "Textbook", "Learning"],
  "science": ["Science", "Physics", "Biology", "Technology", "Research", "Scientific"],
  "health": ["Health", "Fitness", "Medicine", "Wellness", "Lifestyle", "Yoga", "Mindfulness"],
  "religious": ["Religious", "Spirituality", "Islam", "Faith", "Muslim", "Quran", "Theology"],
  "fantasy": ["Fantasy", "Magic", "Dragons", "Wizard", "Adventure", "Epic", "Quest"],
  "scifi": ["Sci-Fi", "Science Fiction", "Space", "Future", "Robot", "Alien", "Galaxy"],
  "history": ["History", "Historical", "Biography", "War", "Ancient", "Civilization", "Culture"],

  // Arabic Keywords -> Intent Keys
  "بزنس": "business",
  "اعمال": "business",
  "أعمال": "business",
  "ريادة": "business",
  "نجاح": "success",
  "مال": "money",
  "فلوس": "money",
  "رومانسي": "romantic",
  "رومانسية": "romantic",
  "حب": "love",
  "عشق": "love",
  "مشاعر": "love",
  "غموض": "mystery",
  "جريمة": "mystery",
  "تحقيق": "mystery",
  "بوليسي": "mystery",
  "رعب": "scary",
  "مخيف": "scary",
  "اطفال": "children",
  "أطفال": "children",
  "حكايات": "children",
  "قصص": "children",
  "حزين": "sad",
  "مبكي": "sad",
  "دراما": "sad",
  "تراجيدي": "sad",
  "ممتع": "fun",
  "ترفيه": "fun",
  "كوميدي": "fun",
  "خفيف": "fun",
  "اكاديمي": "academic",
  "أكاديمي": "academic",
  "تعليم": "academic",
  "دراسة": "academic",
  "جامعة": "academic",
  "مدرسة": "academic",
  "علوم": "science",
  "علم": "science",
  "تكنولوجيا": "science",
  "صحة": "health",
  "طبي": "health",
  "رياضة": "health",
  "غذاء": "health",
  "ديني": "religious",
  "اسلامي": "religious",
  "إسلامي": "religious",
  "روحاني": "religious",
  "دين": "religious",
  "ايمان": "religious",
  "خيال": "fantasy",
  "سحر": "fantasy",
  "اساطير": "fantasy",
  "فانتازيا": "fantasy",
  "تاريخ": "history",
  "تاريخي": "history",
  "سيرة": "history",
  "قديم": "history",
  "حضارة": "history",
};

const AILibrarian = ({ allBooks }) => {
  const { t, i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [messages, setMessages] = useState([]); // [{ type: 'user'|'ai', content, results }]
  const isRtl = i18n.language === "ar";
  
  const scrollRef = React.useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isSearching]);

  const normalize = (str) => {
    if (!str) return "";
    // Remove special characters but keep spaces for better multi-word matching
    let normalized = str.toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, " ").trim();
    // Normalize Arabic
    normalized = normalized.replace(/[أإآ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي");
    // Remove "al" prefix from Arabic words if they are long enough
    if (normalized.startsWith("ال") && normalized.length > 4) normalized = normalized.substring(2);
    return normalized.replace(/\s+/g, " "); // Collapse multiple spaces
  };

  const calculateScore = (book, userKeywords) => {
    if (!book) return 0;
    let score = 0;
    const title = normalize(book.title);
    const author = normalize(book.author);
    const category = normalize(book.category);
    const description = normalize(book.description);

    userKeywords.forEach((word) => {
      const nWord = normalize(word);
      if (!nWord || nWord.length < 2) return;

      // Direct matches (Highest weight)
      if (title.includes(nWord)) score += 15;
      if (category.includes(nWord)) score += 20;
      if (author.includes(nWord)) score += 10;
      if (description.includes(nWord)) score += 5;

      // Intent Mapping
      let intent = INTENT_MAP[nWord];
      if (intent) {
        const keywords = Array.isArray(intent) ? intent : (INTENT_MAP[intent] || []);
        keywords.forEach(kw => {
          const nkw = normalize(kw);
          if (title.includes(nkw)) score += 8;
          if (category.includes(nkw) || nkw.includes(category)) score += 12;
          if (description.includes(nkw)) score += 4;
        });
      }
    });

    // Bonus for recent books or specific flags if needed
    return score;
  };

  const handleSearch = (e) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;

    const userMsg = query;
    setMessages(prev => [...prev, { type: 'user', content: userMsg }]);
    setQuery("");
    setIsSearching(true);

    setTimeout(() => {
      const words = userMsg.split(/\s+/).map(normalize).filter(w => w.length > 1);
      const scored = allBooks.map(b => ({ ...b, aiScore: calculateScore(b, words) }))
        .filter(b => b.aiScore > 0)
        .sort((a, b) => b.aiScore - a.aiScore)
        .slice(0, 5);

      let content = t("no_results");
      if (allBooks.length === 0) {
        content = isRtl ? "يبدو أن قائمة الكتب فارغة حالياً. هل قمت باستيراد أي كتب؟ أو ربما تحتاج لتحديث الصفحة." : "It seems the book list is currently empty. Have you imported any books? Or maybe you need to refresh the page.";
      } else if (scored.length > 0) {
        content = t("ai_match_msg");
      }

      setMessages(prev => [...prev, { 
        type: 'ai', 
        content, 
        results: scored 
      }]);
      setIsSearching(false);
    }, 1200);
  };

  const samplePrompts = isRtl ? [
    "روايات غموض", "كتب بزنس", "تطوير الذات", "خيال علمي"
  ] : [
    "Mystery books", "Business books", "Self improvement", "Sci-Fi"
  ];

  const fmt = (v) => `${v || 0} ${t("currency") || 'EGP'}`;

  return (
    <>
      {/* ── Floating Launcher ── */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-[100] w-16 h-16 bg-primary rounded-full shadow-2xl flex items-center justify-center group hover:scale-110 active:scale-95 transition-all duration-300 overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-tr from-primary to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        {isOpen ? (
          <svg className="w-6 h-6 text-white relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
        ) : (
          <div className="relative z-10 flex flex-col items-center">
            <svg className="w-8 h-8 text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span className="text-[8px] font-black tracking-tighter text-white/80">AI</span>
          </div>
        )}
        <div className="absolute inset-0 rounded-full border-2 border-white/20 animate-ping opacity-20" />
      </button>

      {/* ── Assistant Panel ── */}
      {isOpen && (
        <div className={`fixed bottom-24 right-6 left-6 sm:left-auto sm:w-[400px] bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-2xl border border-gray-100 dark:border-gray-800 z-[100] overflow-hidden flex flex-col transition-all duration-500 animate-in slide-in-from-bottom-10 fade-in h-[600px] max-h-[80vh] ${isRtl ? 'font-arabic' : ''}`} style={{ direction: isRtl ? 'rtl' : 'ltr' }}>
          
          {/* Header */}
          <div className="bg-gradient-to-r from-gray-900 to-gray-800 dark:from-black dark:to-gray-950 p-6 flex justify-between items-center border-b border-white/5 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20 rotate-3">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              </div>
              <div>
                <h3 className="text-white font-black text-sm tracking-tight">{t("ai_assistant_title")}</h3>
                <p className="text-primary-light/60 text-[10px] uppercase font-bold tracking-widest leading-none mt-0.5">{t("ai_assistant_subtitle")}</p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white transition-colors p-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          {/* Chat Body */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-800 scroll-smooth">
            
            {/* Welcome Msg */}
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center py-10 text-center space-y-4">
                <div className="w-16 h-16 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center">
                   <div className="text-3xl animate-bounce">👋</div>
                </div>
                <div>
                  <h4 className="font-black text-gray-900 dark:text-white">{t("ai_assistant_help")}</h4>
                  <p className="text-xs text-gray-400 mt-1">{t("ai_assistant_subtitle")}</p>
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={`flex flex-col ${m.type === 'user' ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-bottom-2 transition-all`}>
                <div className={`max-w-[85%] rounded-[1.5rem] p-4 text-sm font-medium shadow-sm ${
                  m.type === 'user' 
                    ? "bg-primary text-white rounded-tr-none" 
                    : "bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-tl-none border border-gray-100 dark:border-gray-700/50"
                }`}>
                  {m.content}
                </div>
                
                {/* Book Results */}
                {m.results && m.results.length > 0 && (
                  <div className="w-full mt-4 space-y-3">
                    {m.results.map((book) => (
                      <div key={book.id || book._id} className="bg-white dark:bg-gray-800/80 rounded-2xl p-3 border border-gray-100 dark:border-gray-700 flex gap-4 hover:shadow-md transition-all group/res">
                        <img 
                          src={book.image || "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=100"} 
                          className="w-14 h-20 object-cover rounded-lg shadow-sm group-hover/res:scale-105 transition-transform" 
                        />
                        <div className="flex-1 flex flex-col justify-between">
                          <div>
                            <h5 className="text-[11px] font-black text-gray-900 dark:text-white line-clamp-1">{book.title}</h5>
                            <p className="text-[9px] text-gray-400 font-bold uppercase">{book.category}</p>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black text-primary">{fmt(book.rental_price || book.rentalPrice || 0)}</span>
                            <div className="flex gap-1.5">
                              <Link 
                                to={`/book/${book.id || book._id}`} 
                                className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 p-1.5 rounded-lg hover:bg-primary hover:text-white transition-all"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                              </Link>
                              <Link 
                                to={`/book/${book.id || book._id}`} 
                                className="bg-primary/10 text-primary p-1.5 rounded-lg hover:bg-primary hover:text-white transition-all"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                              </Link>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {isSearching && (
              <div className="flex items-start">
                <div className="bg-gray-50 dark:bg-gray-800 rounded-[1.5rem] rounded-tl-none p-4 shadow-sm border border-gray-100 dark:border-gray-700 flex gap-2">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" />
                  <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:0.2s]" />
                  <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:0.4s]" />
                </div>
              </div>
            )}
          </div>

          {/* Footer Input Area */}
          <div className="p-6 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800">
            {/* Suggestion Chips */}
            <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar">
              {samplePrompts.map((p, i) => (
                <button
                  key={i}
                  onClick={() => setQuery(p)}
                  className="bg-gray-50 dark:bg-gray-800/50 hover:bg-primary/5 text-[10px] font-black text-gray-400 hover:text-primary border border-gray-100 dark:border-gray-700 px-3 py-1.5 rounded-xl transition-all whitespace-nowrap active:scale-95"
                >
                  {p}
                </button>
              ))}
            </div>

            <form onSubmit={handleSearch} className="relative group/input">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("ai_assistant_placeholder")}
                className="w-full pl-6 pr-14 py-4 bg-gray-50 dark:bg-gray-800/50 border-2 border-transparent focus:border-primary/20 focus:bg-white dark:focus:bg-gray-800 rounded-2xl text-xs font-bold transition-all outline-none"
              />
              <button
                type="submit"
                disabled={isSearching || !query.trim()}
                className="absolute right-2 top-2 bottom-2 w-10 bg-primary hover:bg-primary-light disabled:opacity-30 text-white rounded-xl flex items-center justify-center transition-all active:scale-90"
              >
                <svg className={`w-4 h-4 ${isRtl ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default AILibrarian;
