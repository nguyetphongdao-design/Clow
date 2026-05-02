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
  Ghost
} from 'lucide-react';
import { GameState, INITIAL_NARRATIVE } from './types';
import { generateNextTurn } from './services/geminiService';

export default function App() {
  const [gameState, setGameState] = useState<GameState>({
    narrative: INITIAL_NARRATIVE,
    affinity: { yue: 2, eriol: 15, touya: 5 },
    rumors: ["Cậu học sinh mới Zero có màu tóc giống hệt ngọn lửa, nghe nói cậu ta cực kỳ khó gần."],
    quests: ["[The First Encounter] Tiếp cận Yukito khi cậu ấy đang ăn trưa để gieo rắc sự hiện diện của The Sun."],
    choices: [
      "Bước đến chỗ Yukito và Touya, trực tiếp nhìn thẳng vào mắt Yukito và mỉm cười đầy ẩn ý.",
      "Ngồi một mình ở góc sân trường, tỏa ra áp lực của 'The Sun' để ép các thẻ bài đang lẩn trốn phải lộ diện.",
      "Lặng lẽ quan sát Touya từ xa, thể hiện sự đố kỵ."
    ],
    yueStatus: 'Normal',
    zeroProfile: {
      mood: "Điềm tĩnh (Lạnh lùng)",
      health: ["Debuff: Linh hồn bị trọng thương"],
      power: "Thượng cổ Mặt Trời (Bản nguyên)",
      attribute: "Hỏa / Quang",
      age: "Thượng cổ (Vô định)"
    },
    affinityStatus: {
      yue: "Người lạ",
      eriol: "Người quen",
      touya: "Người lạ"
    },
    history: [
      { role: 'model', parts: [{ text: JSON.stringify({
        narrative: INITIAL_NARRATIVE,
        affinity: { yue: 2, eriol: 15, touya: 5 },
        rumors: ["Cậu học sinh mới Zero có màu tóc giống hệt ngọn lửa, nghe nói cậu ta cực kỳ khó gần."],
        quests: ["[The First Encounter] Tiếp cận Yukito khi cậu ấy đang ăn trưa để gieo rắc sự hiện diện của The Sun."],
        yueStatus: 'Normal',
        choices: [
          "Bước đến chỗ Yukito và Touya, trực tiếp nhìn thẳng vào mắt Yukito và mỉm cười đầy ẩn ý.",
          "Ngồi một mình ở góc sân trường, tỏa ra áp lực của 'The Sun' để ép các thẻ bài đang lẩn trốn phải lộ diện.",
          "Lặng lẽ quan sát Touya từ xa, thể hiện sự đố kỵ."
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

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [gameState.narrative, gameState.characterThoughts]);

  const [activeMiniApp, setActiveMiniApp] = useState<{ type: 'rumor' | 'quest' | 'profile', content: string } | null>(null);

  const moodPool = ["Điềm tĩnh", "Lười biếng", "Gắt gỏng (Tsundere)", "Hoài niệm", "Bí ẩn", "Hơi cáu"];
  const healthPool = [
    "Khỏe mạnh (Tạm thời)", 
    "Debuff: Linh hồn bị trọng thương", 
    "Debuff: Ma lực cạn kiệt", 
    "Debuff: Xung đột hắc ám",
    "Debuff: Kiệt sức (Cần ngủ)"
  ];

  useEffect(() => {
    // Randomize mood and health on mount and every hour (simulated with 1 min for demo or check every turn)
    const randomizeState = () => {
      const newMood = moodPool[Math.floor(Math.random() * moodPool.length)];
      const newHealth = [healthPool[Math.floor(Math.random() * healthPool.length)]];
      setGameState(prev => ({
        ...prev,
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

  const handleAction = async (input: string) => {
    if (!input.trim() || isTyping) return;
    
    setIsTyping(true);
    setUserInput('');
    setIsSidebarOpen(false); // Close sidebar on mobile action
    
    try {
      const nextTurn = await generateNextTurn(input, gameState.history, gameState.zeroProfile);
      setGameState(prev => ({ ...nextTurn, zeroProfile: prev.zeroProfile }));
    } catch (error) {
      console.error("Game Engine Error:", error);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className={`flex h-screen w-full transition-colors duration-1000 overflow-hidden font-sans ${
      gameState.yueStatus === 'Corrupted' ? 'bg-black' : 'bg-deep-space'
    }`}>
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
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-sun/20 flex items-center justify-center border border-sun/50 sun-glow">
              <Sun className="w-5 h-5 text-sun" />
            </div>
            <div>
              <h1 className="font-bold text-sm leading-none whitespace-nowrap uppercase">Mặt Trời & Mặt Trăng</h1>
              <p className="text-[9px] text-gray-400 uppercase tracking-[0.2em] mt-1">Công cụ Nhập vai</p>
            </div>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-gray-400 hover:text-white">
            <Ghost size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
          {/* Yue Mode Indicator */}
          <section>
             <div className="flex items-center gap-2 mb-4 text-xs font-semibold uppercase tracking-wider text-gray-400">
              <Ghost size={14} />
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
                    ? 'Yue đang lặng lẽ theo dõi bạn.' 
                    : 'Trăng lặng im.'}
                </span>
              </div>
            </div>
          </section>

          {/* Affinity Bars */}
          <section>
            <div className="flex items-center gap-2 mb-4 text-xs font-semibold uppercase tracking-wider text-gray-400">
              <Users size={14} />
              <span>Mức độ Thân thiết</span>
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

          {/* Inner Thoughts */}
          {gameState.characterThoughts && gameState.characterThoughts.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-4 text-xs font-semibold uppercase tracking-wider text-gray-400">
                <Sparkles size={14} />
                <span>Tâm tư Nhân vật</span>
              </div>
              <div className="space-y-3">
                {gameState.characterThoughts.map((t, i) => (
                  <div key={i} className="p-3 bg-white/5 rounded-xl border border-white/10 space-y-1">
                    <span className="text-[10px] font-bold text-sun uppercase">{t.name}</span>
                    <p className="text-xs italic text-gray-400">"{t.thought}"</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Apps Section */}
          <section>
            <div className="flex items-center gap-2 mb-4 text-xs font-semibold uppercase tracking-wider text-gray-400">
              <LayoutGrid size={14} />
              <span>Ứng dụng Dự ngôn</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <motion.button
                whileHover={{ scale: 1.05, backgroundColor: 'rgba(59, 130, 246, 0.1)' }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setActiveMiniApp({ type: 'rumor', content: '' })}
                className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white/5 border border-white/10 gap-2 group transition-all"
              >
                <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400 group-hover:bg-blue-500/40 transition-colors">
                  <MessageSquare size={20} />
                </div>
                <span className="text-[10px] font-bold text-gray-300">Tin đồn</span>
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.05, backgroundColor: 'rgba(251, 191, 36, 0.1)' }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setActiveMiniApp({ type: 'quest', content: '' })}
                className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white/5 border border-white/10 gap-2 group transition-all"
              >
                <div className="p-2 rounded-xl bg-sun/20 text-sun group-hover:bg-sun/40 transition-colors">
                   <Zap size={20} />
                </div>
                <span className="text-[10px] font-bold text-gray-300">Nhiệm vụ</span>
              </motion.button>
            </div>
          </section>

          {/* History / Memories */}
          <section>
            <div className="flex items-center gap-2 mb-4 text-xs font-semibold uppercase tracking-wider text-gray-400">
              <Scroll size={14} />
              <span>Hồi ức cốt truyện</span>
            </div>
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              {gameState.history.filter(h => h.role === 'user').map((h, i) => (
                <div key={i} className="p-3 bg-white/5 rounded-xl border border-white/10 space-y-1">
                  <span className="text-[10px] font-bold text-blue-400 uppercase">Hành động {i + 1}</span>
                  <p className="text-xs text-gray-400 line-clamp-2">"{h.parts[0].text}"</p>
                </div>
              ))}
              {gameState.history.filter(h => h.role === 'user').length === 0 && (
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
                  <div className={`p-2 rounded-xl ${activeMiniApp.type === 'rumor' ? 'bg-blue-500/20 text-blue-400' : 'bg-sun/20 text-sun'}`}>
                    {activeMiniApp.type === 'rumor' ? <MessageSquare size={20} /> : <Zap size={20} />}
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-white uppercase tracking-widest">
                      {activeMiniApp.type === 'rumor' ? 'Bảng Tin Đồn Linh Hồn' : 'Hệ Thống Nhiệm Vụ Thượng Cổ'}
                    </h2>
                    <p className="text-[10px] text-gray-500 italic">Mã hóa bởi Zero - Bản nguyên Mặt Trời</p>
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
                {activeMiniApp.type === 'profile' ? (
                  <div className="max-w-2xl mx-auto space-y-10 pb-12">
                    <div className="flex flex-col items-center">
                      <div className="w-48 h-64 rounded-xl border-2 border-sun/50 relative overflow-hidden group shadow-[0_0_30px_rgba(255,179,71,0.2)] bg-black mb-6">
                        {/* Placeholder for Card Image with descriptive text if generation failed */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent z-10" />
                        <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center z-20 space-y-4">
                           <Sun size={60} className="text-sun/20 absolute top-10" />
                           <div className="mt-auto pb-4">
                             <h4 className="text-sun font-bold uppercase tracking-[0.3em] text-xl">The Sun</h4>
                             <p className="text-[10px] text-gray-400 uppercase mt-1 tracking-widest italic leading-relaxed">
                               Tóc đỏ rực • Cánh trắng • Kiếm ánh sáng<br />
                               Vị vua bị lãng quên
                             </p>
                           </div>
                        </div>
                        <div className="absolute top-2 left-2 right-2 border border-sun/30 rounded h-[95%] pointer-events-none" />
                      </div>
                      <h3 className="text-3xl font-bold text-white uppercase tracking-widest text-center">Zero</h3>
                      <p className="text-sun font-medium mt-2 italic text-sm">"Nguyên hình Sư Tử Vàng - Bản nguyên của sự sáng tạo"</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {[
                        { label: 'Tuổi', value: gameState.zeroProfile.age, icon: <Scroll size={16} /> },
                        { label: 'Thuộc tính', value: gameState.zeroProfile.attribute, icon: <Sun size={16} /> },
                        { label: 'Sức mạnh', value: gameState.zeroProfile.power, icon: <Zap size={16} /> },
                        { label: 'Tâm trạng', value: gameState.zeroProfile.mood, icon: <Eye size={16} />, highlight: true },
                        { label: 'Sức khỏe (Debuffs)', value: gameState.zeroProfile.health, icon: <ShieldAlert size={16} />, highlight: true, isArray: true },
                      ].map((item, idx) => (
                        <div key={idx} className={`p-5 rounded-2xl border ${item.highlight ? 'bg-sun/10 border-sun/30' : 'bg-white/5 border-white/10'} space-y-2`}>
                          <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
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
                ) : activeMiniApp.type === 'rumor' ? (
                  <div className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {gameState.rumors.map((rumor, i) => (
                        <motion.div
                          key={i}
                          whileHover={{ scale: 1.02 }}
                          className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-blue-500/30 transition-all cursor-pointer group"
                          onClick={() => {
                            handleAction(`[Điều tra Tin đồn] ${rumor}`);
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
                ) : (
                  <div className="space-y-6">
                    {gameState.quests.map((quest, i) => (
                      <motion.div
                        key={i}
                        whileHover={{ scale: 1.01, backgroundColor: 'rgba(255, 179, 71, 0.05)' }}
                        className="p-6 rounded-2xl border border-sun/20 bg-sun/5 flex items-center justify-between group cursor-pointer"
                        onClick={() => {
                          handleAction(`[Thực hiện Nhiệm vụ] ${quest}`);
                          setActiveMiniApp(null);
                        }}
                      >
                        <div className="flex items-start gap-4">
                          <div className="mt-1 p-2 bg-sun/20 rounded-lg text-sun group-hover:scale-110 transition-transform">
                             <Sparkles size={18} />
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-sun/60 uppercase">Nhiệm vụ {i + 1}</span>
                            <p className="text-lg font-medium text-gray-200 mt-1">{quest}</p>
                          </div>
                        </div>
                        <div className="px-4 py-2 bg-sun/10 rounded-xl text-sun text-xs font-bold uppercase tracking-widest border border-sun/20 group-hover:bg-sun group-hover:text-deep-space transition-all">
                          Thực thi
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-white/5 bg-white/5 flex justify-center">
                <p className="text-[10px] text-gray-600 uppercase tracking-widest">Dữ liệu được trích xuất từ ký ức của Clow Reed</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Narrative Area */}
      <main className="flex-1 flex flex-col relative z-10 overflow-hidden">
        <header className="h-16 border-b border-white/10 flex items-center justify-between px-4 lg:px-8 bg-black/20 backdrop-blur-sm shrink-0">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg bg-white/5 border border-white/10 text-sun"
            >
              <Users size={20} />
            </button>
            <div className="flex items-center gap-2 text-xs lg:text-sm text-gray-400 truncate max-w-[150px] md:max-w-none">
              <Scroll size={16} className="shrink-0" />
              <span className="truncate">Chương 1: Học sinh chuyển trường</span>
            </div>
          </div>
          <div className="flex gap-2">
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
              title="Thử lại lượt cuối (Dệt hướng khác)"
            >
              <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
              <span className="hidden sm:inline">Dệt lại</span>
            </button>
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setActiveMiniApp({ type: 'profile', content: '' })}
              className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/10 text-[10px] lg:text-xs text-sun whitespace-nowrap hover:bg-sun/10 hover:border-sun/30 transition-all cursor-pointer"
            >
              <Sparkles size={12} />
              <span>Zero (Mặt Trời)</span>
            </motion.button>
          </div>
        </header>

        <div 
          ref={scrollRef}
          className={`flex-1 overflow-y-auto custom-scrollbar p-6 lg:p-12 space-y-12 lg:space-y-16 transition-all duration-1000 ${
            gameState.yueStatus === 'Corrupted' ? 'shadow-[inset_0_0_100px_rgba(220,38,38,0.15)] bg-red-950/5' : ''
          }`}
        >
          {gameState.history.map((msg, idx) => {
            if (msg.role === 'user') {
              return (
                <motion.div 
                  key={`user-${idx}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex justify-start"
                >
                  <div className="max-w-[85%] bg-sun/10 border border-sun/20 px-4 py-2 rounded-2xl rounded-tl-none">
                    <p className="text-xs text-sun font-bold uppercase tracking-widest mb-1 opacity-60">Bạn</p>
                    <p className="text-sm lg:text-base text-gray-200">{msg.parts[0].text}</p>
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
              <div key={`model-${idx}`} className="space-y-4">
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                   <p className="text-xs text-sun font-bold uppercase tracking-[0.2em] opacity-80 flex items-center gap-2">
                     <Sparkles size={14} className="text-sun" />
                     Bản nguyên: Zero
                   </p>
                </div>
                <motion.div 
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                  className={`prose prose-invert max-w-none markdown-body text-sm lg:text-base relative group ${
                    gameState.yueStatus === 'Corrupted' ? 'selection:bg-red-500/50' : 'selection:bg-sun/50'
                  }`}
                >
                  <ReactMarkdown>{narrativeData.narrative || narrativeData.text || ''}</ReactMarkdown>
                </motion.div>
                
                {narrativeData.characterThoughts?.length > 0 && (
                   <div className="flex flex-wrap gap-3">
                      {narrativeData.characterThoughts.map((t: any, ti: number) => (
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          key={ti} 
                          className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 flex flex-col"
                        >
                          <span className="text-[9px] font-bold text-sun/70 uppercase">{t.name}</span>
                          <span className="text-[11px] italic text-gray-400">"{t.thought}"</span>
                        </motion.div>
                      ))}
                   </div>
                )}
              </div>
            );
          })}

          {isTyping && (
            <div className="flex gap-2 items-center text-sun/60 italic text-xs lg:text-sm animate-pulse">
              <Sparkles className="animate-spin-slow" size={16} />
              <span>Đang dệt nên sợi dây định mệnh...</span>
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
               {showChoices ? "Thu gọn Lựa chọn" : "Mở rộng Lựa chọn"}
               <motion.div animate={{ rotate: showChoices ? 180 : 0 }}>
                 <Zap size={10} />
               </motion.div>
             </button>
             <div className="text-[10px] text-gray-600 font-mono"></div>
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
                className="w-full h-11 lg:h-12 pl-4 pr-14 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-sun/50 focus:ring-1 focus:ring-sun/20 transition-all text-xs lg:text-sm disabled:opacity-50"
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

function AffinityItem({ label, emoji, value, color, status }: { label: string, emoji: string, value: number, color: string, status?: string }) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-end">
        <span className="text-sm font-medium flex items-center gap-1.5 leading-none">
          <span className="text-base">{emoji}</span> {label}
        </span>
        <div className="flex items-center gap-2">
           {status && (
             <span className="text-[9px] text-gray-500 uppercase tracking-tighter font-semibold">{status}</span>
           )}
           <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
             value >= 100 
               ? 'bg-sun text-deep-space animate-pulse shadow-[0_0_10px_rgba(255,179,71,0.5)]' 
               : value >= 0 
               ? 'bg-sun/20 text-sun' 
               : 'bg-red-500/20 text-red-400'
           }`}>
             {value >= 100 ? 'MAX' : `${value}/100`}
           </span>
        </div>
      </div>
      <div className={`h-1.5 w-full bg-white/5 rounded-full overflow-hidden border ${value >= 100 ? 'border-sun/50' : 'border-white/5'}`}>
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${Math.max(0, Math.min(100, value))}%` }} 
          className={`h-full ${color} shadow-[0_0_8px_rgba(0,0,0,0.5)] ${value >= 100 ? 'bg-sun' : ''}`}
        />
      </div>
    </div>
  );
}
