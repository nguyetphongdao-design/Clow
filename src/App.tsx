/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { 
  Sun, 
  Moon, 
  Wind,
  Flame,
  Droplets,
  Mountain,
  MessageSquare, 
  Sparkles, 
  Scroll, 
  Users, 
  Send,
  Zap,
  ArrowRight,
  LayoutGrid,
  Search,
  X,
  Info,
  Eye,
  ShieldAlert,
  Ghost,
  Heart,
  RefreshCw,
  Lock,
  LogOut,
  User as UserIcon,
  Loader2
} from 'lucide-react';
import { GameState, INITIAL_NARRATIVE, STORY_CHAPTERS } from './types';
import { generateNextTurn } from './services/geminiService';
import { auth, db, googleProvider } from './firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, User, signInWithPopup } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { GoogleGenAI } from '@google/genai';

const StarryBackground = React.memo(() => {
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const starCount = isMobile ? 80 : 200;

  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-gray-900 via-black to-black">
      {/* Static Stars */}
      <div className="absolute inset-0">
        {[...Array(starCount)].map((_, i) => {
          const size = Math.random() * 2 + 0.5;
          const isGlowing = Math.random() > 0.8;
          return (
            <div 
              key={i}
              className={`absolute rounded-full bg-white will-change-opacity ${isGlowing ? 'shadow-[0_0_15px_rgba(255,255,255,0.7)]' : ''}`}
              style={{
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
                width: `${size}px`,
                height: `${size}px`,
                opacity: Math.random() * 0.8 + 0.2,
                animation: `twinkle ${3 + Math.random() * 5}s ease-in-out infinite`
              }}
            />
          );
        })}
      </div>
      
      {/* Moving Stars / Nebula Effect */}
      <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]" />

      {/* Nebula atmosphere */}
      <div className="absolute top-1/4 -left-1/4 w-[800px] h-[800px] bg-sun/10 blur-[150px] rounded-full opacity-30" />
      <div className="absolute bottom-1/4 -right-1/4 w-[800px] h-[800px] bg-magic-purple/5 blur-[150px] rounded-full opacity-20" />

      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.1); }
        }
      `}</style>
    </div>
  );
});

const MessageItem = React.memo(({ msg, idx, yueStatus, onRetry }: { msg: any, idx: number, yueStatus: string, onRetry?: (originalIdx: number) => void }) => {
  if (msg.role === 'user') {
    return (
      <motion.div 
        key={`user-${idx}`}
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex justify-end pr-4 lg:pr-8"
      >
        <div 
          onClick={() => onRetry && onRetry(msg.originalIdx)}
          className="max-w-[80%] bg-sun/10 border border-sun/20 px-6 py-3 rounded-3xl rounded-tr-none shadow-xl backdrop-blur-sm relative group overflow-hidden cursor-pointer hover:bg-sun/20 transition-all"
        >
          <div className="absolute top-0 right-0 p-1 opacity-10 group-hover:opacity-40 transition-opacity">
             <Zap size={40} className="text-sun" />
          </div>
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
             <div className="bg-sun/30 p-1 rounded-full text-sun">
                <RefreshCw size={12} />
             </div>
          </div>
          <p className="text-[10px] text-sun font-black uppercase tracking-[0.3em] mb-2 opacity-60 font-display">Hành trình</p>
          <p className="text-sm lg:text-lg text-white/90 font-medium leading-relaxed font-sans italic">"{msg.parts[0].text}"</p>
        </div>
      </motion.div>
    );
  }

  let narrativeData: any = {};
  try {
    narrativeData = JSON.parse(msg.parts[0].text);
  } catch (e) {
    narrativeData = { narrative: msg.parts[0].text };
  }

  return (
    <div key={`model-${idx}`} className="space-y-6 relative">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        className={`prose prose-invert max-w-none markdown-body text-sm lg:text-base relative group font-sans leading-[1.7] tracking-wide text-gray-300/95 italic font-medium will-change-opacity ${
          yueStatus === 'Corrupted' ? 'selection:bg-red-500/50' : 'selection:bg-sun/50'
        }`}
      >
        <ReactMarkdown>{narrativeData.narrative || narrativeData.text || ''}</ReactMarkdown>
      </motion.div>
      <div className="flex justify-center py-4 opacity-20">
         <div className="w-32 h-px bg-gradient-to-r from-transparent via-sun to-transparent" />
      </div>
    </div>
  );
});

export default function App() {
  const [appState, setAppState] = useState<'loading' | 'starting' | 'main'>('loading');
  const [progress, setProgress] = useState(0);
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isAuthProcessing, setIsAuthProcessing] = useState(false);
  const [memory, setMemory] = useState<string>('');
  const isInitialized = useRef(false);

  const [gameState, setGameState] = useState<GameState>({
    narrative: INITIAL_NARRATIVE,
    affinity: { yue: 0, eriol: 0, touya: 0, sakura: 0, syaoran: 0, tomoyo: 0 },
    rumors: ["Cậu học sinh mới Zero có màu tóc giống hệt ngọn lửa, nghe nói cậu ta cực kỳ khó gần."],
    quests: {
      main: ["[The First Encounter] Tiếp cận Yukito khi cậu ấy đang ăn trưa để gieo rắc sự hiện diện của The Sun."],
      side: ["Tìm hiểu về môi trường học tập mới tại Tomoeda."]
    },
    cards: [
      { name: "The Windy", collected: true },
      { name: "The Wood", collected: true },
      { name: "The Fly", collected: true },
      { name: "The Shadow", collected: true },
      { name: "The Watery", collected: true },
      { name: "The Illusion", collected: true },
      { name: "The Flower", collected: true },
      { name: "The Sword", collected: true },
      { name: "The Thunder", collected: true },
      { name: "The Glow", collected: true },
      { name: "The Mirror", collected: true },
      { name: "The Time", collected: true },
      { name: "The Power", collected: true },
      { name: "The Rain", collected: true },
      { name: "The Jump", collected: true },
      { name: "The Silent", collected: true },
      { name: "The Song", collected: true },
      { name: "The Dash", collected: true },
      { name: "The Erase", collected: true },
      { name: "The Freeze", collected: true },
      { name: "The Maze", collected: true },
      { name: "The Move", collected: true },
      { name: "The Return", collected: true },
      { name: "The Sleep", collected: true },
      { name: "The Snow", collected: true },
      { name: "The Storm", collected: true },
      { name: "The Sweet", collected: true },
      { name: "The Through", collected: true },
      { name: "The Voice", collected: true },
      { name: "The Wave", collected: true },
      { name: "The Float", collected: true },
      { name: "The Little", collected: true },
      { name: "The Bubbles", collected: true },
      { name: "The Create", collected: true },
      { name: "The Mist", collected: true },
      { name: "The Arrow", collected: true },
      { name: "The Big", collected: true },
      { name: "The Change", collected: true },
      { name: "The Fight", collected: true },
      { name: "The Lock", collected: true },
      { name: "The Loop", collected: true },
      { name: "The Cloud", collected: true },
      { name: "The Shield", collected: true },
      { name: "The Dream", collected: false },
      { name: "The Sand", collected: false },
      { name: "The Light", collected: false },
      { name: "The Dark", collected: false },
      { name: "The Twin", collected: false },
      { name: "The Earthy", collected: false },
      { name: "The Firey", collected: false },
      { name: "The Shot", collected: false },
      { name: "The Libra", collected: false },
      { name: "The Hope", collected: false },
    ],
    choices: [
      "Bước qua chỗ Yukito và Touya, lạnh lùng cao ngạo không dễ tiếp cận.",
      "Ngồi một mình trên sân thượng, tỏa ra áp lực của 'The Sun' để ép 'The Dark' đang lẩn trốn phải lộ diện.",
      "Lặng lẽ quan sát nhóm nhân vật chính từ xa, thể hiện khí chất bí ẩn."
    ],
    yueStatus: 'Normal',
    zeroProfile: {
      mood: "Điềm tĩnh (Lạnh lùng)",
      health: ["Debuff: Linh hồn bị trọng thương"],
      power: "Mặt Trời thượng cổ",
      attribute: "Cực hạn Hỏa/Quang",
      age: "Thượng cổ"
    },
    affinityStatus: {
      yue: "Người lạ",
      eriol: "Người lạ",
      touya: "Người lạ",
      sakura: "Người lạ",
      syaoran: "Người lạ",
      tomoyo: "Người lạ"
    },
    currentChapter: 1,
    characterThoughts: [],
    affinityChanges: [],
    history: [
      { role: 'model', parts: [{ text: JSON.stringify({
        narrative: INITIAL_NARRATIVE,
        affinity: { yue: 0, eriol: 0, touya: 0, sakura: 0, syaoran: 0, tomoyo: 0 },
        rumors: ["Cậu học sinh mới Zero có màu tóc giống hệt ngọn lửa, nghe nói cậu ta cực kỳ khó gần."],
        quests: {
          main: ["Thu phục 'The Dark' bằng quyền năng mạnh mẽ."],
          side: ["Tìm hiểu về môi trường học tập mới tại Tomoeda."]
        },
        yueStatus: 'Normal',
        choices: [
          "Bước qua chỗ Yukito và Touya, lạnh lùng cao ngạo không dễ tiếp cận.",
          "Ngồi một mình trên sân thượng, tỏa ra áp lực của 'The Sun' để ép 'The Dark' đang lẩn trốn phải lộ diện.",
          "Lặng lẽ quan sát nhóm nhân vật chính từ xa, thể hiện khí chất bí ẩn."
        ]
      }) }] }
    ]
  });

  const [userInput, setUserInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showChoices, setShowChoices] = useState(true);
  const [notifications, setNotifications] = useState<{id: string, name: string, delta: number}[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (gameState.affinityChanges && gameState.affinityChanges.length > 0) {
      const newNotifs = gameState.affinityChanges.map(c => ({
        id: Math.random().toString(36).substr(2, 9),
        name: c.name,
        delta: c.delta
      }));
      setNotifications(prev => [...prev, ...newNotifs]);
      
      newNotifs.forEach(n => {
        setTimeout(() => {
          setNotifications(current => current.filter(item => item.id !== n.id));
        }, 5000);
      });
    }
  }, [gameState.affinityChanges]);

  const filteredHistory = React.useMemo(() => 
    gameState.history
      .map((m, originalIdx) => ({ ...m, originalIdx }))
      .filter(m => !m.isSystem),
  [gameState.history]);

  const handleRetryAt = (originalIdx: number) => {
    if (isTyping) return;
    
    // Safety check: Don't retry the very first system message
    if (originalIdx <= 0) return;

    const history = [...gameState.history];
    const userMsg = history[originalIdx];
    if (!userMsg || userMsg.role !== 'user') return;

    const previousModelMsg = history[originalIdx - 1];
    if (!previousModelMsg || previousModelMsg.role !== 'model') return;

    try {
      const text = previousModelMsg.parts[0].text;
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      const cleanedJson = jsonMatch ? jsonMatch[0] : text;
      const savedState = JSON.parse(cleanedJson);
      const historyBefore = history.slice(0, originalIdx);
      
      setGameState(prev => ({
        ...prev,
        ...savedState,
        history: historyBefore,
        // Reset choices to what was available at that point
        choices: savedState.choices || prev.choices
      }));
      
      // We don't automatically call handleAction(prompt) so the user can choose differently
    } catch (e) {
      console.error("Retry failed:", e);
    }
  };

  useEffect(() => {
    const scrollContainer = scrollRef.current;
    if (scrollContainer) {
      scrollContainer.scrollTo({
        top: scrollContainer.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [filteredHistory.length, gameState.characterThoughts, isTyping]);

  const [activeMiniApp, setActiveMiniApp] = useState<{ type: 'rumor' | 'quest' | 'profile' | 'thoughts' | 'cards' | 'chapters', content: string } | null>(null);

  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  useEffect(() => {
    if (isSaving) {
      setSaveStatus('saving');
    } else if (isInitialized.current && user) {
      setSaveStatus('saved');
      const timer = setTimeout(() => setSaveStatus('idle'), 2000);
      return () => clearTimeout(timer);
    }
  }, [isSaving, user]);

  // Authentication State Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
      
      if (currentUser) {
        // Load data from Firestore
        try {
          const docRef = doc(db, "users", currentUser.uid);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.gameState) {
              setGameState(data.gameState);
            }
            if (data.memory) {
              setMemory(data.memory || '');
            }
          }
          // Mark as initialized after loading data to enable auto-save
          isInitialized.current = true;
        } catch (error) {
          console.error("Error loading user data:", error);
          // Still initialize even on error to allow new saves
          isInitialized.current = true;
        }
      } else {
        isInitialized.current = false;
        // Optional: reset state on logout? The user requirement says "chỉ bắt người dùng đăng nhập 1 lần"
        // which usually implies persistence across sessions.
      }
    });

    return () => unsubscribe();
  }, []);

  // Save State to Firestore
  const saveToFirebase = async (newState: GameState, newMemory?: string) => {
    if (!user || !isInitialized.current) return;
    setIsSaving(true);
    try {
      await setDoc(doc(db, "users", user.uid), {
        gameState: newState,
        memory: newMemory !== undefined ? newMemory : memory,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (error) {
      console.error("Error saving user data:", error);
    } finally {
      setIsSaving(false);
    }
  };

  // Debounced Auto-save Effect
  useEffect(() => {
    if (!user || !isInitialized.current || isTyping) return;

    const timer = setTimeout(() => {
      saveToFirebase(gameState);
    }, 2000); // 2 second debounce for real-time-ish feel without hitting quotas

    return () => clearTimeout(timer);
  }, [gameState, memory, user]);

  // Summarize Memory every 5 messages
  const summarizeHistory = async (history: any[]) => {
    const userMessages = history.filter(h => h.role === 'user' && !h.isSystem);
    if (userMessages.length > 0 && userMessages.length % 5 === 0) {
      console.log("Summarizing history into memory...");
      try {
        const genAI = new GoogleGenAI({ apiKey: (process.env as any).GEMINI_API_KEY || '' });
        
        const historyText = history.map(h => `${h.role}: ${h.parts[0].text}`).join('\n');
        const prompt = `Bạn là hệ thống ghi nhớ của game. Hãy tóm tắt ngắn gọn các sự kiện quan trọng, mối quan hệ và cảm xúc của các nhân vật trong đoạn hội thoại sau thành một đoạn văn ngắn (dưới 100 từ). Hãy giữ context này để sử dụng cho các lần chat sau.\n\nLịch sử chat:\n${historyText}\n\nKý ức hiện tại: ${memory}`;
        
        const result = await genAI.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: [{ role: 'user', parts: [{ text: prompt }] }]
        });
        
        const newSummary = result.text || '';
        setMemory(newSummary);
        return newSummary;
      } catch (error) {
        console.error("Summarization failed:", error);
      }
    }
    return memory;
  };

  const moodPool = ["Điềm tĩnh", "Lười biếng", "Gắt gỏng (Tsundere)", "Hoài niệm", "Hơi cáu", "Thất vọng", "Bi quan", "Thờ ơ"];
  const healthPool = [
    "Khỏe mạnh (Tạm thời)", 
    "Debuff: Linh hồn bị trọng thương", 
    "Debuff: Ma lực cạn kiệt", 
    "Debuff: Xung đột ma lực",
    "Debuff: Kiệt sức (Cần ngủ)",
    "Debuff: Lười biếng"
  ];

  useEffect(() => {
    if (appState === 'loading') {
      const startTime = Date.now();
      const duration = 1200; // 1.2 seconds total loading

      const timer = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const rawProgress = (elapsed / duration) * 100;
        
        if (rawProgress >= 100) {
          setProgress(100);
          clearInterval(timer);
          setTimeout(() => setAppState('starting'), 500);
        } else {
          // Add a bit of "noise" for a more realistic feel
          const jitter = Math.sin(elapsed / 100) * 2;
          setProgress(Math.min(99, rawProgress + jitter));
        }
      }, 50);
      
      return () => clearInterval(timer);
    }
  }, [appState]);

  useEffect(() => {
    // Randomize mood and health on mount and every hour
    const randomizeState = () => {
      const newMood = moodPool[Math.floor(Math.random() * moodPool.length)];
      const newHealth = [healthPool[Math.floor(Math.random() * healthPool.length)]];
      setGameState(prev => ({
        ...prev,
        currentChapter: prev.currentChapter || 1,
        zeroProfile: {
          ...prev.zeroProfile,
          mood: newMood,
          health: newHealth
        }
      }));
    };

    randomizeState();
    const interval = setInterval(randomizeState, 3600000); // 1 hour
    return () => clearInterval(interval);
  }, []);

  const handleAction = async (input: string, isSystem: boolean = false) => {
    if (!input.trim() || isTyping) return;
    
    setIsTyping(true);
    setUserInput('');
    setIsSidebarOpen(false); // Close sidebar on mobile action

    // Immediate scroll to show the user's message
    setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }, 50);
    
    try {
      // Limit history to last 12-15 entries to maintain context
      const fullHistory = gameState.history.filter(h => h.role !== 'user' || !h.isSystem);
      const historyToKeep = 15;
      const trimmedHistory = fullHistory.length > historyToKeep 
        ? [fullHistory[0], ...fullHistory.slice(-historyToKeep)] 
        : fullHistory;

      // Add memory context to prompt if available
      const memoryPrompt = memory ? `\n[BỐI CẢNH/KÝ ỨC CŨ]: ${memory}\n` : '';
      const richInput = `${memoryPrompt}${input}`;

      const nextTurn = await generateNextTurn(
        richInput, 
        trimmedHistory, 
        gameState.zeroProfile,
        { 
          collected: gameState.cards?.filter(c => c.collected).length || 0, 
          total: gameState.cards?.length || 52 
        },
        gameState.usedQuests,
        gameState.currentChapter || 1
      );
      
      const newGameState = (prev: GameState): GameState => {
        // Merge newly captured cards
        const newlyCaptured: string[] = (nextTurn as any).capturedCards || [];
        const currentCards = prev.cards || [];
        const updatedCards = currentCards.map(card => 
          newlyCaptured.includes(card.name) ? { ...card, collected: true } : card
        );
        
        const newHistory = [...nextTurn.history];
        if (isSystem) {
          if (newHistory.length >= 2) {
            newHistory[newHistory.length - 2].isSystem = true;
            newHistory[newHistory.length - 1].isSystem = true;
          }
        }
        
        // If it was a refresh system action, add the old task to usedQuests
        let updatedUsedQuests = [...(prev.usedQuests || []), ...(nextTurn.usedQuests || [])];
        if (input.includes("LÀM MỚI NHIỆM VỤ NÀY")) {
          const match = input.match(/\] (.+)\. Hãy/);
          if (match && match[1]) {
            updatedUsedQuests.push(match[1]);
          }
        }

        return { 
          ...nextTurn, 
          narrative: isSystem ? prev.narrative : nextTurn.narrative,
          affinity: isSystem ? prev.affinity : nextTurn.affinity,
          affinityStatus: isSystem ? prev.affinityStatus : nextTurn.affinityStatus,
          affinityChanges: isSystem ? [] : nextTurn.affinityChanges,
          history: newHistory,
          cards: updatedCards,
          zeroProfile: prev.zeroProfile,
          usedQuests: Array.from(new Set(updatedUsedQuests)) // Deduplicate
        };
      };

      const finalState = newGameState(gameState);
      setGameState(finalState);
      
      // Summarize and Save
      const newMemory = await summarizeHistory(finalState.history);
      // Explict save for immediate feedback after AI interaction
      await saveToFirebase(finalState, newMemory);

    } catch (error) {
      console.error("Lỗi rồi bạn ơi:", error);
    } finally {
      setIsTyping(false);
    }
  };

  const getVietnameseError = (errorMessage: string) => {
    if (errorMessage.includes('auth/invalid-credential')) return "Email hoặc mật khẩu không chính xác.";
    if (errorMessage.includes('auth/user-not-found')) return "Người dùng không tồn tại.";
    if (errorMessage.includes('auth/wrong-password')) return "Mật khẩu không chính xác.";
    if (errorMessage.includes('auth/email-already-in-use')) return "Email đã được sử dụng.";
    if (errorMessage.includes('auth/weak-password')) return "Mật khẩu quá yếu (tối thiểu 6 ký tự).";
    if (errorMessage.includes('auth/invalid-email')) return "Email không hợp lệ.";
    if (errorMessage.includes('auth/operation-not-allowed')) return "Phương thức đăng nhập này chưa được kích hoạt trong Firebase Console.";
    if (errorMessage.includes('auth/popup-closed-by-user')) return "Cửa sổ đăng nhập đã bị đóng.";
    if (errorMessage.includes('auth/cancelled-popup-request')) return "Yêu cầu đăng nhập đã bị hủy.";
    return "Đã xảy ra lỗi: " + errorMessage;
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setIsAuthProcessing(true);
    try {
      if (isLoginMode) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      console.error("Auth error:", err);
      setAuthError(getVietnameseError(err.message));
    } finally {
      setIsAuthProcessing(false);
    }
  };

  const handleGoogleAuth = async () => {
    setAuthError(null);
    setIsAuthProcessing(true);
    try {
      googleProvider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.error("Google auth error:", err);
      setAuthError(getVietnameseError(err.message));
    } finally {
      setIsAuthProcessing(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      // Reset state on logout if needed, but user might want to keep playing locally
    } catch (err: any) {
      console.error("Sign out error:", err);
    }
  };

  const isEndgame = gameState.cards?.every(c => c.collected) || false;
  const ProfileText = isEndgame ? "Hình thái: Sư tử nhỏ / Lá bài The Sun" : "Hình thái: Zero (Học sinh cấp 3)";

  if (appState === 'loading' || authLoading) {
    return <LoadingScreen progress={progress} />;
  }

  if (appState === 'starting') {
    return (
      <StartScreen 
        onStart={() => setAppState('main')} 
        user={user}
        authError={authError}
        email={email}
        setEmail={setEmail}
        password={password}
        setPassword={setPassword}
        isLoginMode={isLoginMode}
        setIsLoginMode={setIsLoginMode}
        handleAuth={handleAuth}
        handleGoogleAuth={handleGoogleAuth}
        isSaving={isSaving || isAuthProcessing}
      />
    );
  }

  return (
    <div className="flex h-screen w-full transition-colors duration-1000 overflow-hidden font-sans bg-black">
      <StarryBackground />
      {/* Notifications Overlay */}
      <div className="fixed top-20 right-6 z-[60] pointer-events-none flex flex-col gap-2 items-end">
        <AnimatePresence>
          {notifications.map((notif) => (
            <motion.div
              key={notif.id}
              initial={{ opacity: 0, x: 50, scale: 0.8 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className={`px-4 py-2 rounded-full border text-xs font-bold shadow-lg backdrop-blur-md flex items-center gap-2 ${
                notif.delta >= 0 
                  ? 'bg-green-500/20 border-green-500/50 text-green-400' 
                  : 'bg-red-500/20 border-red-500/50 text-red-400'
              }`}
            >
              {notif.delta >= 0 ? <Sparkles size={14} /> : <Zap size={14} />}
              {notif.delta >= 0 ? `+${notif.delta}` : notif.delta} Hảo cảm ({notif.name})
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Dynamic Background */}
      <div className="fixed inset-0 pointer-events-none opacity-30 select-none overflow-hidden">
        <div className={`absolute top-[-10%] left-[-10%] w-[40%] h-[40%] blur-[120px] rounded-full animate-pulse transition-colors duration-1000 ${
          gameState.yueStatus === 'Corrupted' ? 'bg-red-900/40' : 'bg-sun/20'
        }`} />
        <div className={`absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] blur-[120px] rounded-full transition-colors duration-1000 ${
          gameState.yueStatus === 'Corrupted' ? 'bg-purple-900/40' : 'bg-magic-purple/20'
        }`} />
      </div>

      {/* Sidebar Mobile Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar - Stats & Info */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-72 glass-panel border-r shrink-0 flex flex-col transition-transform duration-300 lg:static lg:translate-x-0 lg:w-80
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-sun/10 flex items-center justify-center border border-sun/30 sun-glow backdrop-blur-md">
                <Sun className="w-5 h-5 text-sun" />
              </div>
              <div>
                <h1 className="font-display font-black text-[10px] leading-tight uppercase tracking-widest text-gradient">Cardcaptor Sakura</h1>
                <p className="text-[8px] text-sun/60 font-bold uppercase tracking-[0.1em] font-display mt-0.5">
                  {isEndgame ? "Sakura Card Era" : "New Story : Zero"}
                </p>
              </div>
            </div>
          <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-gray-400 hover:text-white">
            <Ghost size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
          {/* Yue Mode Indicator */}
          <section>
             <div className="flex items-center gap-2 mb-4 text-[9px] font-black uppercase tracking-[0.1em] text-gray-500 font-display">
              <Ghost size={12} />
              <span>Trạng thái của Yue</span>
            </div>
            <div className={`flex items-center gap-3 p-3 rounded-xl border transition-all duration-500 ${
              gameState.yueStatus === 'Corrupted' 
                ? 'bg-red-500/10 border-red-500/30 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.2)]' 
                : gameState.yueStatus === 'Observing'
                ? 'bg-blue-500/10 border-blue-500/30 text-blue-300'
                : 'bg-white/5 border-white/10 text-gray-400'
            }`}>
              <div className="shrink-0">
                {gameState.yueStatus === 'Corrupted' ? <ShieldAlert size={20} /> : <Eye size={20} />}
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold uppercase tracking-widest">
                  {gameState.yueStatus === 'Corrupted' ? 'Hắc hoá' : gameState.yueStatus === 'Observing' ? 'Đang Quan sát' : 'Bình thường'}
                </span>
                <span className="text-[10px] opacity-70">
                  {gameState.yueStatus === 'Corrupted' 
                    ? 'Sự chiếm hữu cực đoan.' 
                    : gameState.yueStatus === 'Observing' 
                    ? 'Yue đang lặng lẽ quan sát bạn.' 
                    : 'Yue đang im lặng.'}
                </span>
              </div>
            </div>
          </section>

          <section className="cursor-pointer group/affinity p-3 rounded-xl bg-white/5 border border-white/10 hover:border-sun/20 transition-all duration-300" onClick={() => setActiveMiniApp({ type: 'thoughts', content: '' })}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.1em] text-gray-500 group-hover/affinity:text-sun transition-colors font-display">
                <Heart size={12} className="group-hover/affinity:animate-pulse" />
                <span>Hảo cảm độ</span>
              </div>
              <div className="p-1 px-2 rounded-lg bg-sun/10 text-sun text-[8px] uppercase font-black font-display group-hover/affinity:bg-sun group-hover/affinity:text-deep-space transition-all shadow-sm">
                Tâm tư
              </div>
            </div>
            <div className="space-y-4">
              {Object.entries(gameState.affinity).map(([name, val]) => (
                <AffinityItem 
                  key={name}
                  label={name.charAt(0).toUpperCase() + name.slice(1)} 
                  emoji={name === 'yue' ? "🌙" : name === 'touya' ? "👔" : "✨"} 
                  value={val} 
                  status={gameState.affinityStatus?.[name.toLowerCase()]}
                  color={name === 'yue' ? "bg-blue-400" : name === 'eriol' ? "bg-purple-400" : "bg-sun"} 
                />
              ))}
            </div>
          </section>

          <section>
            <div className="flex items-center gap-2 mb-4 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 font-display">
              <LayoutGrid size={14} />
              <span>Dự ngôn giả</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <motion.button
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setActiveMiniApp({ type: 'chapters', content: '' })}
                className="flex flex-col items-center justify-center p-4 rounded-2xl bg-sun/10 border border-sun/30 gap-3 group transition-all hover:bg-sun/20 shadow-lg col-span-2 overflow-hidden relative"
              >
                <div className="absolute top-0 right-0 p-2 opacity-10">
                   <Scroll size={40} />
                </div>
                <div className="p-2.5 rounded-xl bg-sun/20 text-sun group-hover:scale-110 transition-transform relative z-10">
                  <Scroll size={20} />
                </div>
                <div className="flex flex-col items-center relative z-10">
                  <span className="text-[10px] font-black text-sun uppercase tracking-widest font-display">Hành trình cốt truyện</span>
                  <span className="text-[8px] text-sun/60 font-bold uppercase tracking-tighter mt-1">
                    {STORY_CHAPTERS[(gameState.currentChapter || 1) - 1]?.title}
                  </span>
                </div>
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setActiveMiniApp({ type: 'rumor', content: '' })}
                className="flex flex-col items-center justify-center p-4 rounded-2xl bg-white/5 border border-white/10 gap-3 group transition-all hover:bg-blue-500/10 hover:border-blue-500/30 shadow-lg"
              >
                <div className="p-2.5 rounded-xl bg-blue-500/20 text-blue-400 group-hover:scale-110 transition-transform">
                  <MessageSquare size={20} />
                </div>
                <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest font-display">Tin đồn</span>
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setActiveMiniApp({ type: 'quest', content: '' })}
                className="flex flex-col items-center justify-center p-4 rounded-2xl bg-white/5 border border-white/10 gap-3 group transition-all hover:bg-sun/10 hover:border-sun/30 shadow-lg"
              >
                <div className="p-2.5 rounded-xl bg-sun/20 text-sun group-hover:scale-110 transition-transform">
                   <Zap size={20} />
                </div>
                <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest font-display">Nhiệm vụ</span>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setActiveMiniApp({ type: 'cards', content: '' })}
                className="flex flex-col items-center justify-center p-4 rounded-2xl bg-white/5 border border-white/10 gap-3 group transition-all hover:bg-red-500/10 hover:border-red-500/30 shadow-lg"
              >
                <div className="p-2.5 rounded-xl bg-red-500/20 text-red-400 group-hover:scale-110 transition-transform">
                   <LayoutGrid size={20} />
                </div>
                <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest font-display">Bộ bài</span>
              </motion.button>
            </div>
          </section>

          {/* History / Memories */}
          <section>
            <div className="flex items-center gap-2 mb-4 text-[9px] font-black uppercase tracking-[0.1em] text-gray-500 font-display">
              <Scroll size={12} />
              <span>Hồi ức cốt truyện</span>
            </div>
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar font-display">
              {gameState.history.filter(h => h.role === 'user' && !h.isSystem).map((h, i) => (
                <div key={i} className="p-3 bg-white/5 rounded-xl border border-white/10 space-y-1">
                  <span className="text-[9px] font-black text-sun/70 uppercase tracking-widest">Hành động {i + 1}</span>
                  <p className="text-[10px] text-gray-400 line-clamp-2 leading-relaxed italic">"{h.parts[0].text}"</p>
                </div>
              ))}
              {gameState.history.filter(h => h.role === 'user' && !h.isSystem).length === 0 && (
                <p className="text-[10px] text-gray-600 italic">Chưa có hồi ức nào được ghi lại...</p>
              )}
            </div>
          </section>
        </div>
      </aside>

      {/* MiniApp Overlay */}
      <AnimatePresence>
        {activeMiniApp && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 lg:p-8 bg-deep-space/80 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-4xl h-[80vh] bg-neutral-900 border border-white/10 rounded-3xl overflow-hidden flex flex-col shadow-2xl relative"
            >
              <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/5">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl ${
                    activeMiniApp.type === 'rumor' ? 'bg-blue-500/20 text-blue-400' : 
                    activeMiniApp.type === 'thoughts' ? 'bg-red-500/20 text-red-400' :
                    activeMiniApp.type === 'cards' ? 'bg-purple-500/20 text-purple-400' :
                    'bg-sun/20 text-sun'
                  }`}>
                    {activeMiniApp.type === 'rumor' ? <MessageSquare size={20} /> : 
                     activeMiniApp.type === 'thoughts' ? <Heart size={20} /> : 
                     activeMiniApp.type === 'cards' ? <LayoutGrid size={20} /> :
                     <Zap size={20} />}
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-white uppercase tracking-widest">
                      {activeMiniApp.type === 'rumor' ? 'Bảng Tin Đồn' : 
                       activeMiniApp.type === 'thoughts' ? 'Suy nghĩ thầm kín' :
                       activeMiniApp.type === 'cards' ? 'Clow Cards Collection' :
                       'The Sun'}
                    </h2>
                  </div>
                </div>
                <button 
                  onClick={() => setActiveMiniApp(null)}
                  className="p-2 rounded-full hover:bg-white/10 text-gray-400 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                {activeMiniApp.type === 'chapters' ? (
                  <div className="max-w-4xl mx-auto space-y-8 pb-12">
                     <div className="text-center mb-10">
                        <h3 className="text-2xl font-black text-white uppercase tracking-widest font-display">Hành trình cốt truyện</h3>
                        <div className="w-24 h-1 bg-sun mx-auto mt-2 rounded-full opacity-50" />
                     </div>
                     <div className="grid grid-cols-1 gap-4">
                        {STORY_CHAPTERS.map((chapter) => {
                          const currentChapter = gameState.currentChapter || 1;
                          const isUnlocked = currentChapter >= chapter.id;
                          const isCurrent = currentChapter === chapter.id;

                          return (
                            <div 
                              key={chapter.id}
                              className={`p-6 rounded-2xl border transition-all duration-500 relative overflow-hidden group ${
                                isUnlocked 
                                  ? `bg-sun/5 border-sun/30 cursor-pointer hover:bg-sun/10 ${isCurrent ? 'ring-2 ring-sun/50 shadow-[0_0_20px_rgba(255,193,7,0.2)]' : ''}` 
                                  : 'bg-white/5 border-white/5 opacity-30 grayscale'
                              }`}
                            >
                               <div className="flex items-center justify-between gap-4 relative z-10">
                                  <div className="flex items-center gap-4">
                                     <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black transition-all ${
                                       isUnlocked 
                                         ? (isCurrent ? 'bg-sun text-black scale-110' : 'bg-sun/20 text-sun') 
                                         : 'bg-gray-800 text-gray-600'
                                     }`}>
                                        {chapter.id}
                                     </div>
                                     <div>
                                        <div className="flex items-center gap-2">
                                          <h4 className={`font-black text-sm uppercase tracking-wider transition-colors ${
                                            isCurrent ? 'text-sun' : isUnlocked ? 'text-white group-hover:text-sun' : 'text-gray-500'
                                          }`}>
                                            {chapter.title}
                                          </h4>
                                          {isCurrent && <span className="bg-sun/20 text-sun text-[8px] px-2 py-0.5 rounded-full font-black animate-pulse">ĐANG DIỄN RA</span>}
                                        </div>
                                        <p className="text-xs text-gray-400 mt-1 max-w-xl">{chapter.description}</p>
                                     </div>
                                  </div>
                                  {!isUnlocked && (
                                     <div className="shrink-0 flex items-center gap-2 text-gray-600">
                                        <Lock size={14} className="opacity-40" />
                                        <span className="text-[10px] font-bold uppercase tracking-tighter">Bị khóa</span>
                                     </div>
                                  )}
                               </div>
                               {isUnlocked && (
                                  <div className="absolute right-0 top-0 h-full w-32 bg-gradient-to-l from-sun/10 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />
                                )}
                            </div>
                          );
                        })}
                     </div>
                  </div>
                ) : activeMiniApp.type === 'profile' ? (
                  <div className="max-w-2xl mx-auto space-y-10 pb-12">
                    <div className="flex flex-col items-center">
                      <div className="w-32 h-32 rounded-full border-4 border-sun/50 flex items-center justify-center bg-sun/10 sun-glow mb-6 relative group overflow-hidden">
                        <Sun size={60} className="text-sun group-hover:scale-110 transition-transform" />
                        <div className="absolute inset-0 bg-sun/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                           <Sparkles size={30} className="text-deep-space" />
                        </div>
                      </div>
                      <h3 className="text-3xl font-bold text-white uppercase tracking-widest text-center">Zero</h3>
                      <p className="text-sun font-medium mt-2 italic text-sm">"{ProfileText}"</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-center">
                      {[
                        { label: 'Tuổi', value: gameState.zeroProfile.age, icon: <Scroll size={16} /> },
                        { label: 'Thuộc tính', value: gameState.zeroProfile.attribute, icon: <Sun size={16} /> },
                        { label: 'Sức mạnh', value: gameState.zeroProfile.power, icon: <Zap size={16} /> },
                        { label: 'Tâm trạng', value: gameState.zeroProfile.mood, icon: <Eye size={16} />, highlight: true },
                        { label: 'Sức khỏe (Debuffs)', value: gameState.zeroProfile.health, icon: <ShieldAlert size={16} />, highlight: true, isArray: true },
                      ].map((item, idx) => (
                        <div key={idx} className={`p-5 rounded-2xl border ${item.highlight ? 'bg-sun/10 border-sun/30' : 'bg-white/5 border-white/10'} space-y-2`}>
                          <div className="flex items-center gap-2 text-[9px] font-black text-gray-500 uppercase tracking-widest font-display">
                            {item.icon}
                            {item.label}
                          </div>
                          {item.isArray ? (
                            <div className="flex flex-wrap gap-2 mt-1">
                              {(item.value as string[]).map((v, i) => (
                                <span key={i} className="px-2 py-0.5 rounded-lg bg-red-500/20 text-red-400 text-[11px] font-bold border border-red-500/30">
                                  {v.startsWith('Debuff:') ? v : `Debuff: ${v}`}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <div className={`text-sm md:text-base font-medium ${item.highlight ? 'text-sun' : 'text-gray-200'}`}>
                              {item.value}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="p-6 rounded-2xl bg-blue-500/5 border border-blue-500/20 relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-4 opacity-10">
                        <Moon size={100} />
                      </div>
                      <p className="text-sm text-gray-300 italic leading-relaxed relative z-10 text-center">
                        "Kẻ này mang một hơi ấm quen thuộc nhưng cũng xa lạ đến lạ lùng. Có vẻ như việc thức tỉnh sau ngàn năm phong ấn đã khiến tính cách của ngài ấy trở nên... xù xì hơn, giống như một con mèo bị đánh thức giữa giấc trưa."
                      </p>
                    </div>
                  </div>
                ) : activeMiniApp.type === 'thoughts' ? (
                  <div className="max-w-4xl mx-auto space-y-8 pb-12">
                      <div className="text-center space-y-2 mb-8">
                        <h3 className="text-2xl font-bold text-white uppercase tracking-widest">Hồi Ức Tâm Linh</h3>
                        <p className="text-xs text-blue-400 uppercase tracking-widest font-semibold flex items-center justify-center gap-2">
                           Những suy nghĩ chưa từng được thốt ra
                           <button 
                            onClick={() => handleAction("[SYSTEM: KHÁM PHÁ TÂM TƯ] Cập nhật suy nghĩ mới của các nhân vật. Chỉ cập nhật JSON.", true)}
                            className="p-1 px-2 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 transition-all font-bold text-[10px]"
                           >
                             <RefreshCw size={10} className="inline mr-1" /> Khám phá
                           </button>
                        </p>
                      </div>
                     
                     <div className="space-y-4">
                       {gameState.characterThoughts && gameState.characterThoughts.length > 0 ? (
                         gameState.characterThoughts.map((thought, i) => (
                           <motion.div
                             key={i}
                             initial={{ opacity: 0, x: -20 }}
                             animate={{ opacity: 1, x: 0 }}
                             transition={{ delay: i * 0.1 }}
                             className="p-6 rounded-2xl bg-white/5 border border-white/10 flex gap-6 items-start"
                           >
                             <div className="w-12 h-12 rounded-full bg-blue-500/20 border border-blue-500/40 flex items-center justify-center shrink-0">
                               <span className="text-xl">🌙</span>
                             </div>
                             <div>
                               <h4 className="text-blue-400 font-bold uppercase tracking-widest text-xs mb-2">{thought.name}</h4>
                               <p className="text-gray-300 italic text-sm leading-relaxed">"{thought.thought}"</p>
                             </div>
                           </motion.div>
                         ))
                       ) : (
                         <div className="text-center py-20 text-gray-500 italic">
                           <Info className="mx-auto mb-4 opacity-20" size={40} />
                           Chưa có tâm tư nào được ghi lại trong thời điểm này...
                         </div>
                       )}
                     </div>
                  </div>
                ) : activeMiniApp.type === 'rumor' ? (
                  <div className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {gameState.rumors.map((rumor, i) => (
                        <motion.div
                          key={i}
                          whileHover={{ scale: 1.02 }}
                          className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-blue-500/30 transition-all cursor-pointer group"
                          onClick={() => {
                            handleAction(`[SYSTEM: ĐIỀU TRA TIN ĐỒN] ${rumor}. Chỉ cập nhật JSON (narrative giữ nguyên hoặc để trống).`, true);
                            setActiveMiniApp(null);
                          }}
                        >
                          <div className="flex items-center gap-2 mb-3 text-blue-400">
                             <Search size={14} />
                             <span className="text-[10px] font-bold uppercase">Phân tích tần số...</span>
                          </div>
                          <p className="text-sm text-gray-300 italic group-hover:text-white transition-colors">"{rumor}"</p>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                ) : activeMiniApp.type === 'quest' ? (
                  <div className="space-y-10">
                    <div>
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2">
                           <div className="w-1.5 h-6 bg-sun rounded-full" />
                           <h3 className="text-lg font-bold text-white uppercase tracking-widest">Nhiệm vụ chính</h3>
                        </div>
                        <button 
                          onClick={() => handleAction("[SYSTEM: LÀM MỚI NHIỆM VỤ CHÍNH] Hãy tạo nhiệm vụ mới không trùng lặp. Chỉ cập nhật JSON.", true)}
                          className="p-1.5 rounded-full hover:bg-white/5 text-gray-500 hover:text-sun transition-all"
                          title="Làm mới"
                        >
                          <RefreshCw size={14} />
                        </button>
                      </div>
                      <div className="space-y-4">
                        {gameState.quests.main.map((quest, i) => (
                           <QuestItem key={i} text={quest} index={i} type="main" onAction={handleAction} onClose={() => setActiveMiniApp(null)} />
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2">
                           <div className="w-1.5 h-6 bg-blue-500 rounded-full" />
                           <h3 className="text-lg font-bold text-white uppercase tracking-widest">Nhiệm vụ phụ</h3>
                        </div>
                        <button 
                          onClick={() => handleAction("[SYSTEM: LÀM MỚI NHIỆM VỤ PHỤ] Hãy tạo nhiệm vụ mới không trùng lặp. Chỉ cập nhật JSON.", true)}
                          className="p-1.5 rounded-full hover:bg-white/5 text-gray-500 hover:text-blue-400 transition-all"
                          title="Làm mới"
                        >
                          <RefreshCw size={14} />
                        </button>
                      </div>
                      <div className="space-y-4">
                        {gameState.quests.side.map((quest, i) => (
                           <QuestItem key={i} text={quest} index={i} type="side" onAction={handleAction} onClose={() => setActiveMiniApp(null)} />
                        ))}
                      </div>
                    </div>
                  </div>
                ) : activeMiniApp.type === 'cards' ? (
                  <div className="max-w-4xl mx-auto pb-12">
                     <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 lg:gap-4">
                        {(gameState.cards || []).map((card, i) => {
                          const isSpecial = ["The Light", "The Dark", "The Firey", "The Watery", "The Windy", "The Earthy"].includes(card.name);
                          
                          return (
                            <motion.div
                              key={i}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: i * 0.05 }}
                              className={`relative p-5 rounded-2xl border flex flex-col items-center justify-center gap-3 transition-all duration-300 group overflow-hidden ${
                                card.collected 
                                  ? 'bg-sun/5 border-sun/20 shadow-lg' 
                                  : 'bg-white/5 border-white/5 opacity-10 grayscale'
                              }`}
                            >
                               <div className={`p-4 rounded-xl border transition-all duration-500 group-hover:scale-110 flex items-center justify-center ${
                                 card.collected 
                                   ? 'bg-sun/10 border-sun/30 text-sun shadow-[0_0_15px_rgba(255,179,71,0.2)]' 
                                   : 'bg-gray-500/10 border-white/5 text-gray-700'
                               }`}>
                                 {isSpecial ? <Sparkles size={24} /> : <Zap size={24} />}
                               </div>
                               <span className={`text-[9px] font-black uppercase tracking-[0.2em] text-center font-display ${card.collected ? 'text-sun/90' : 'text-gray-600'}`}>
                                 {card.name.replace('The ', '')}
                               </span>
                               {card.collected && (
                                 <div className="absolute top-2 right-2 flex gap-1">
                                    <Sparkles size={6} className="text-sun opacity-40 animate-pulse" />
                                 </div>
                               )}
                               <div className="absolute inset-0 bg-sun/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                            </motion.div>
                          );
                        })}
                     </div>
                  </div>
                ) : (
                  <div className="text-center py-20 text-gray-500 italic">
                    <Info className="mx-auto mb-4 opacity-20" size={40} />
                    Chọn một ứng dụng để xem thông tin...
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-white/5 bg-white/5 flex justify-center">
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Narrative Area */}
      <main className="flex-1 flex flex-col relative z-10 overflow-hidden">
        <header className="h-16 border-b border-white/10 flex items-center justify-between px-4 lg:px-8 bg-black/20 backdrop-blur-sm shrink-0">
          <div className="flex items-center gap-3 min-w-0 overflow-hidden">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg bg-white/5 border border-white/10 text-sun shrink-0"
            >
              <Users size={20} />
            </button>
            <div 
              onClick={() => setActiveMiniApp({ type: 'chapters', content: '' })}
              className="flex items-center gap-2 lg:gap-3 min-w-0 cursor-pointer group/chapter"
            >
              <Scroll size={16} className="shrink-0 text-sun lg:w-5 lg:h-5 group-hover/chapter:scale-110 transition-transform" />
              <span className="truncate font-display font-black uppercase tracking-widest text-[9px] lg:text-xs text-white group-hover/chapter:text-sun transition-colors">
                Chương {gameState.currentChapter || 1}: {STORY_CHAPTERS[(gameState.currentChapter || 1) - 1]?.title}
              </span>
            </div>
          </div>
          <div className="flex gap-2 shrink-0 ml-2">
            {user && (
              <div className="hidden sm:flex items-center gap-2 mr-2">
                <div className="flex flex-col items-end">
                   <span className="text-[8px] font-black text-sun/60 uppercase tracking-widest leading-none">Hành giả</span>
                   <span className="text-[10px] text-white/50 truncate max-w-[100px] font-medium">{user.email?.split('@')[0]}</span>
                </div>
                <button 
                  onClick={handleSignOut}
                  className="p-1.5 rounded-full hover:bg-red-500/10 text-gray-500 hover:text-red-400 transition-all border border-transparent hover:border-red-500/20"
                  title="Đăng xuất"
                >
                  <LogOut size={14} />
                </button>
              </div>
            )}
            <button 
              onClick={() => {
                if (isTyping) return;
                const history = [...gameState.history];
                let lastModelIdx = -1;
                for (let i = history.length - 1; i >= 0; i--) {
                  if (history[i].role === 'model') {
                    lastModelIdx = i;
                    break;
                  }
                }
                
                if (lastModelIdx !== -1) {
                  const historyBefore = history.slice(0, lastModelIdx);
                  const lastUserMsg = historyBefore[historyBefore.length - 1];
                  if (lastUserMsg && lastUserMsg.role === 'user') {
                    const lastPrompt = lastUserMsg.parts[0].text;
                    const cleanHistory = historyBefore.slice(0, -1);
                    setGameState(prev => ({ ...prev, history: cleanHistory }));
                    handleAction(lastPrompt);
                  }
                }
              }}
              disabled={isTyping || !gameState.history.some(h => h.role === 'model')}
              className="flex items-center gap-1.5 px-3 py-1 bg-blue-500/10 border border-blue-500/30 rounded-full text-[10px] lg:text-xs text-blue-400 hover:bg-blue-500/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed group"
              title="Thử lại lượt cuối"
            >
              <RefreshCw size={12} className={`transition-transform duration-500 ${isTyping ? 'animate-spin' : 'group-hover:rotate-180'}`} />
              <span className="hidden sm:inline">Thử lại</span>
            </button>
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setActiveMiniApp({ type: 'profile', content: '' })}
              className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/10 text-[10px] lg:text-xs text-sun whitespace-nowrap hover:bg-sun/10 hover:border-sun/30 transition-all cursor-pointer"
            >
              <Sparkles size={12} />
              <span>Zero</span>
            </motion.button>
          </div>
        </header>

        <div 
          ref={scrollRef}
          className={`flex-1 overflow-y-auto custom-scrollbar p-6 lg:p-12 space-y-12 lg:space-y-16 transition-all duration-1000 ${
            gameState.yueStatus === 'Corrupted' ? 'shadow-[inset_0_0_100px_rgba(220,38,38,0.15)] bg-red-950/5' : ''
          }`}
        >
          {filteredHistory.map((msg, idx) => (
            <MessageItem key={idx} msg={msg} idx={idx} yueStatus={gameState.yueStatus} onRetry={handleRetryAt} />
          ))}

          {isTyping && (
            <div className="flex gap-2 items-center text-sun/60 italic text-[10px] lg:text-xs animate-pulse">
              <Sparkles className="animate-spin-slow" size={14} />
              <span>{userInput.includes("LÀM MỚI") ? "Đang đồng bộ ma trận nhiệm vụ..." : "Đang nạp dữ liệu ma pháp..."}</span>
            </div>
          )}
        </div>

        {/* Input & Choices Area */}
        <footer className="border-t border-white/10 bg-black/40 backdrop-blur-md shrink-0">
          <div className="px-4 lg:px-8 py-2 border-b border-white/5 flex justify-between items-center">
             <button 
              onClick={() => setShowChoices(!showChoices)}
              className="text-xs text-gray-500 hover:text-sun flex items-center gap-1.5 py-1 px-2 hover:bg-white/5 rounded-lg transition-colors"
             >
               {showChoices ? "Thu nhỏ" : "Mở rộng"}
               <motion.div animate={{ rotate: showChoices ? 180 : 0 }}>
                 <Zap size={10} />
               </motion.div>
             </button>
             <div className="text-[10px] text-gray-600 font-mono flex items-center gap-1.5 min-h-[16px]">
               {saveStatus === 'saving' && (
                 <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-1.5 text-sun/40 italic">
                   <Loader2 size={10} className="animate-spin" />
                   Syncing...
                 </motion.span>
               )}
               {saveStatus === 'saved' && (
                 <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-1.5 text-green-500/40">
                   <Zap size={10} />
                   Synced
                 </motion.span>
               )}
               {saveStatus === 'error' && (
                 <span className="text-red-500/40 flex items-center gap-1.5">
                   <ShieldAlert size={10} />
                   Sync Error
                 </span>
               )}
             </div>
          </div>

          <AnimatePresence>
            {showChoices && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="p-4 lg:p-8 pt-4 pb-0 grid grid-cols-1 md:grid-cols-3 gap-2 lg:gap-3 max-h-[220px] md:max-h-none overflow-y-auto">
                  {gameState.choices.map((choice, i) => (
                    <motion.button
                      key={i}
                      whileHover={{ scale: 1.02, backgroundColor: 'rgba(255, 179, 71, 0.1)' }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleAction(choice)}
                      disabled={isTyping}
                      className="text-left p-3 lg:p-4 rounded-xl border border-white/10 text-[10px] lg:text-xs leading-relaxed text-gray-300 hover:text-sun hover:border-sun/40 transition-all duration-300 flex flex-col gap-1 min-h-[60px]"
                    >
                      <span className="text-[8px] lg:text-[10px] text-sun/60 font-bold uppercase tracking-wider">Lựa chọn {i + 1}</span>
                      <span className="line-clamp-2 md:line-clamp-none">{choice}</span>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Text Input */}
          <div className="p-4 lg:p-8 lg:pt-4 group flex flex-col gap-3">
            <div className="relative">
              <input 
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAction(userInput)}
                placeholder="Nhập hành động của bạn..."
                disabled={isTyping}
                className="w-full h-11 lg:h-12 pl-4 pr-14 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-sun/50 focus:ring-1 focus:ring-sun/20 transition-all text-base lg:text-sm disabled:opacity-50"
              />
              <button 
                onClick={() => handleAction(userInput)}
                disabled={isTyping || !userInput.trim()}
                className="absolute right-1.5 top-1 w-9 h-9 mt-0.5 rounded-lg bg-sun text-deep-space flex items-center justify-center hover:scale-105 active:scale-95 transition-transform disabled:opacity-50"
              >
                <Send size={16} fill="currentColor" />
              </button>
            </div>
            <div className="hidden lg:flex items-center gap-1.5 text-[9px] text-gray-600 uppercase tracking-widest font-bold ml-1">
               <Info size={10} />
               <span>Chọn một phương án trên hoặc tự viết lời thoại</span>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}

function QuestItem({ text, index, type, onAction, onClose }: { text: string, index: number, type: 'main' | 'side', onAction: (s: string, isSystem?: boolean) => void, onClose: () => void }) {
  return (
    <motion.div
      whileHover={{ scale: 1.02, backgroundColor: 'rgba(255, 179, 71, 0.08)' }}
      className={`p-5 rounded-2xl border flex items-center justify-between group transition-all duration-300 ${
        type === 'main' 
          ? 'border-sun/20 bg-sun/5 shadow-[0_0_20px_rgba(255,179,71,0.05)]' 
          : 'border-blue-500/20 bg-blue-500/5 shadow-[0_0_20px_rgba(59,130,246,0.05)]'
      }`}
    >
      <div 
        className="flex items-start gap-4 flex-1 cursor-pointer"
        onClick={() => {
          onAction(`[Thực hiện Nhiệm vụ] ${text}`);
          onClose();
        }}
      >
        <div className={`mt-1 p-2 rounded-xl group-hover:scale-110 transition-transform shadow-lg ${
          type === 'main' ? 'bg-sun/20 text-sun' : 'bg-blue-500/20 text-blue-400'
        }`}>
           <Sparkles size={16} />
        </div>
        <div className="space-y-1">
          <span className={`text-[10px] font-black uppercase tracking-[0.2em] font-display ${
            type === 'main' ? 'text-sun/70' : 'text-blue-500/70'
          }`}>
             {type === 'main' ? 'Cốt truyện chính' : 'Hành trình phụ'}
          </span>
          <p className="text-sm font-semibold text-white/90 leading-relaxed font-sans">{text}</p>
        </div>
      </div>
      <div className="flex items-center gap-3 pl-4 border-l border-white/5">
        <button 
          onClick={() => onAction(`[SYSTEM: LÀM MỚI NHIỆM VỤ NÀY] ${text}. Hãy thay thế bằng nhiệm vụ khác tương đương, không lặp lại. Chỉ cập nhật JSON.`, true)}
          className="p-2.5 rounded-xl hover:bg-white/10 text-gray-500 hover:text-white transition-all hover:rotate-180 duration-500"
          title="Đổi nhiệm vụ"
        >
          <RefreshCw size={14} />
        </button>
        <button 
          onClick={() => {
            onAction(`[Thực hiện Nhiệm vụ] ${text}`);
            onClose();
          }}
          className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] border transition-all font-display ${
            type === 'main' 
              ? 'bg-sun/10 text-sun border-sun/20 group-hover:bg-sun group-hover:text-deep-space group-hover:shadow-[0_0_20px_rgba(255,179,71,0.4)]' 
              : 'bg-blue-500/10 text-blue-400 border-blue-500/20 group-hover:bg-blue-500 group-hover:text-deep-space group-hover:shadow-[0_0_20px_rgba(59,130,246,0.4)]'
          }`}
        >
          Bắt đầu
        </button>
      </div>
    </motion.div>
  );
}

function AffinityItem({ label, emoji, value, color, status }: { label: string, emoji: string, value: number, color: string, status?: string }) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-end">
        <span className="text-sm font-bold flex items-center gap-2 text-white/90">
          <span className="text-lg">{emoji}</span> {label}
        </span>
        <div className="flex items-center gap-3">
           {status && (
             <span className="text-[10px] text-sun/70 uppercase tracking-widest font-black italic">{status}</span>
           )}
           <span className={`text-[11px] font-black px-2.5 py-0.5 rounded-lg font-mono ${
             value >= 100 
               ? 'bg-sun text-deep-space animate-pulse shadow-[0_0_15px_rgba(255,179,71,0.4)]' 
               : value >= 0 
               ? 'bg-white/10 text-white' 
               : 'bg-red-500/20 text-red-400'
           }`}>
             {value >= 100 ? 'MAX' : `${value}/100`}
           </span>
        </div>
      </div>
      <div className={`h-2 w-full bg-white/5 rounded-full overflow-hidden border p-[1px] ${value >= 100 ? 'border-sun/30' : 'border-white/5'}`}>
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${Math.max(0, Math.min(100, value))}%` }} 
          className={`h-full rounded-full ${color} shadow-[0_0_10px_rgba(0,0,0,0.3)] transition-all duration-1000 ${value >= 100 ? 'bg-sun' : ''}`}
        />
      </div>
    </div>
  );
}

function LoadingScreen({ progress }: { progress: number }) {
  return (
    <div className="fixed inset-0 bg-deep-space flex flex-col items-center justify-center p-6 z-[100] overflow-hidden">
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <motion.div 
          animate={{ scale: [1, 1.05, 1], opacity: [0.03, 0.08, 0.03] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          className="w-[280px] h-[280px] bg-sun/20 rounded-full blur-[60px]"
        />
      </div>

      <div className="max-w-[240px] w-full space-y-8 text-center relative z-10">
        <motion.div
           initial={{ opacity: 0 }}
           animate={{ opacity: 1 }}
           className="space-y-3"
        >
          <div className="w-14 h-14 mx-auto bg-sun/5 rounded-xl flex items-center justify-center border border-sun/20 sun-glow backdrop-blur-xl mb-4 relative">
            <motion.div
               animate={{ rotate: 360 }}
               transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
               className="absolute inset-[-4px] border border-dashed border-sun/10 rounded-xl"
            />
            <Sun className="w-6 h-6 text-sun/80" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-black uppercase tracking-[0.4em] font-display text-gradient">Sakura</h2>
            <p className="text-sun/30 text-[7px] font-bold uppercase tracking-[0.5em] font-display">Resonance Alpha</p>
          </div>
        </motion.div>

        <div className="space-y-4">
          <div className="relative h-[2px] w-full bg-white/5 rounded-full overflow-hidden">
            <motion.div 
              className="absolute left-0 top-0 h-full bg-sun shadow-[0_0_10px_rgba(255,179,71,0.5)]"
              animate={{ width: `${progress}%` }}
              transition={{ width: { type: 'spring', damping: 30 } }}
            />
          </div>
          <div className="flex justify-between items-center px-0.5">
            <span className="text-[8px] font-black text-gray-600 uppercase tracking-[0.2em] font-display">Initializing...</span>
            <span className="text-[9px] font-black text-sun/60 font-mono italic">{Math.round(progress)}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function StartScreen({ 
  onStart, 
  user, 
  authError, 
  email, 
  setEmail, 
  password, 
  setPassword, 
  isLoginMode, 
  setIsLoginMode, 
  handleAuth,
  handleGoogleAuth,
  isSaving
}: { 
  onStart: () => void, 
  user: User | null, 
  authError: string | null,
  email: string,
  setEmail: (s: string) => void,
  password: string,
  setPassword: (s: string) => void,
  isLoginMode: boolean,
  setIsLoginMode: (b: boolean) => void,
  handleAuth: (e: React.FormEvent) => void,
  handleGoogleAuth: () => void,
  isSaving: boolean
}) {
  return (
    <div className="fixed inset-0 bg-deep-space flex flex-col items-center justify-center p-6 z-[100] overflow-hidden">
      <StarryBackground />
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[300px] h-[300px] bg-sun/5 blur-[100px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[300px] h-[300px] bg-magic-purple/5 blur-[100px] rounded-full" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_40%,rgba(0,0,0,0.9)_100%)]" />
      </div>

      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
        className="relative z-10 text-center max-w-sm w-full space-y-8"
      >
        <div className="space-y-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 100, damping: 30 }}
            className="relative w-20 h-20 mx-auto"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 border border-sun/10 rounded-full"
            />
            <div className="absolute inset-[14px] bg-gradient-to-b from-sun/10 to-transparent rounded-full border border-sun/20 flex items-center justify-center backdrop-blur-md">
               <Sun className="w-8 h-8 text-sun/80" />
            </div>
          </motion.div>

          <div className="space-y-2">
            <motion.h1 
              initial={{ y: 5, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-2xl md:text-3xl font-black text-white uppercase leading-none font-display tracking-[0.2em] text-gradient"
            >
               Sakura
               <span className="text-[8px] md:text-[10px] tracking-[0.5em] font-black uppercase text-sun/50 block mt-2 font-display">Resonance</span>
            </motion.h1>
            <div className="h-[1px] w-10 bg-gradient-to-r from-transparent via-sun/30 to-transparent mx-auto mt-2" />
          </div>
        </div>

        {!user ? (
          <motion.div 
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="bg-white/5 border border-white/10 p-6 rounded-3xl backdrop-blur-lg space-y-4"
          >
            <div className="flex justify-between items-center mb-2 px-1">
               <span className="text-[10px] font-black text-sun/60 uppercase tracking-widest">{isLoginMode ? 'Đăng nhập' : 'Đăng ký'}</span>
               <button 
                 onClick={() => setIsLoginMode(!isLoginMode)}
                 className="text-[9px] text-gray-500 hover:text-white transition-colors uppercase font-bold"
               >
                 {isLoginMode ? 'Cần tài khoản?' : 'Đã có tài khoản?'}
               </button>
            </div>
            
            <form onSubmit={handleAuth} className="space-y-3">
              <div className="relative">
                <UserIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email của bạn"
                  className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-xs text-white focus:outline-none focus:border-sun/40 transition-all"
                  required
                />
              </div>
              <div className="relative">
                <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mật khẩu"
                  className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-xs text-white focus:outline-none focus:border-sun/40 transition-all"
                  required
                />
              </div>
              
              {authError && (
                <p className="text-[9px] text-red-400 font-medium px-1 leading-tight">{authError}</p>
              )}
              
              <button
                type="submit"
                disabled={isSaving}
                className="w-full py-3 bg-sun text-deep-space font-black uppercase tracking-[0.2em] text-[10px] rounded-xl hover:scale-[1.02] transition-transform active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSaving && <Loader2 size={14} className="animate-spin" />}
                {isLoginMode ? 'Đăng nhập' : 'Đăng ký'}
              </button>
            </form>
            
            <button
              onClick={handleGoogleAuth}
              disabled={isSaving}
              className="w-full py-3 bg-white border border-white/20 text-deep-space font-black uppercase tracking-[0.1em] text-[9px] rounded-xl hover:bg-gray-100 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSaving ? (
                <Loader2 size={16} className="animate-spin text-deep-space" />
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
              )}
              TIẾP TỤC VỚI GOOGLE
            </button>
            
            <div className="flex items-center gap-2 py-1 opacity-20">
               <div className="h-px flex-1 bg-white" />
               <span className="text-[8px] font-bold text-white">OR</span>
               <div className="h-px flex-1 bg-white" />
            </div>
            
            <button
              onClick={onStart}
              className="w-full py-2.5 border border-white/10 text-white/60 font-black uppercase tracking-[0.2em] text-[9px] rounded-xl hover:bg-white/5 transition-all"
            >
              CHƠI KHÔNG LƯU
            </button>
          </motion.div>
        ) : (
          <motion.div
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="flex flex-col items-center space-y-6"
          >
            <div className="p-4 bg-white/5 border border-white/10 rounded-2xl flex items-center gap-3 w-full backdrop-blur-md">
               <div className="w-10 h-10 rounded-full bg-sun/10 flex items-center justify-center border border-sun/20">
                  <UserIcon className="text-sun" size={20} />
               </div>
               <div className="text-left flex-1 min-w-0">
                  <p className="text-[8px] font-black text-sun/60 uppercase tracking-widest leading-none">Chào mừng trở lại</p>
                  <p className="text-xs text-white font-medium truncate">{user.email}</p>
               </div>
            </div>
          
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onStart}
              className="group relative px-12 py-4 bg-sun text-deep-space font-black uppercase tracking-[0.4em] text-[10px] md:text-xs rounded-full overflow-hidden transition-all shadow-xl font-display flex items-center gap-2"
            >
              {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} fill="currentColor" />}
              TIẾP TỤC HÀNH TRÌNH
            </motion.button>
            
            <button 
              onClick={() => signOut(auth)}
              className="text-[9px] text-gray-500 hover:text-red-400 transition-colors uppercase font-bold tracking-widest"
            >
              Đăng xuất
            </button>
          </motion.div>
        )}

        <div className="pt-4 flex justify-center gap-6 border-t border-white/5 opacity-10 font-display">
           <div className="text-center">
             <div className="text-[7px] font-bold text-gray-500 uppercase tracking-widest">v3.1.0</div>
           </div>
           <div className="text-center">
             <div className="text-[7px] font-bold text-gray-500 uppercase tracking-widest">SƯ TỬ NHỎ</div>
           </div>
           <div className="text-center">
             <div className="text-[7px] font-bold text-gray-500 uppercase tracking-widest">SYNC READY</div>
           </div>
        </div>
      </motion.div>
    </div>
  );
}
