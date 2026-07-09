import { useState } from 'react';
import { BUNNY_TIPS } from '../data/initialData';
import { Smile, Sparkles, HelpCircle } from 'lucide-react';

const BUNNY_QUOTES = [
  '哎呀！是谁在轻轻摇我的兔耳朵呀？🐇',
  '听说今天有买胡萝卜的计划，是真的吗？😋🥕',
  '咕噜咕噜……我的小肚子已经做好吃蔬菜的准备啦！🌿',
  '全家一起吃火锅最温暖了！多加一点生菜好不好 🍲',
  '一家人开开心心在一起，兔兔就是全世界最幸福的兔子！❤️',
  '小提示：今天的任务，大家都记得按时完成噢！加油加油 💪',
  '妈妈今天辛苦啦，兔兔送你一朵小红花 🌸',
  '爸爸闭上眼睛休息一下吧，做个兔兔放松操 🐰',
  '咚咚今天弹琴特别棒，兔兔给你鼓掌！👏👏',
];

const FORTUNES = [
  { fortune: '大吉 🌟', content: '宜吃胡萝卜、全家拥抱、早睡早起。忌赖床、挑食。' },
  { fortune: '超元气 ✨', content: '今天特别适合和家人分享一个好笑的故事噢！' },
  { fortune: '甜蜜日 🍯', content: '全家人今天默契值满分，非常适合一起做手工或游戏！' },
  { fortune: '顺心日 🍀', content: '做事情会非常顺利，快去把难啃的待办消灭掉吧！' },
  { fortune: '狂欢日 🎈', content: '宜喝奶茶、讲睡前故事、给兔兔铲屎。' }
];

export default function BunnyAssistant() {
  const [activeQuote, setActiveQuote] = useState('哈喽！我是你们的兔兔小管家，今天想吃什么胡萝卜呢？🥕');
  const [fortuneResult, setFortuneResult] = useState<{ fortune: string; content: string } | null>(null);
  const [bubbleKey, setBubbleKey] = useState(0);

  const handleBunnyClick = () => {
    const randomIndex = Math.floor(Math.random() * BUNNY_QUOTES.length);
    setActiveQuote(BUNNY_QUOTES[randomIndex]);
    setFortuneResult(null); // Clear fortune when clicking bunny for quote
    setBubbleKey((k) => k + 1);
  };

  const drawFortune = () => {
    const randomIndex = Math.floor(Math.random() * FORTUNES.length);
    setFortuneResult(FORTUNES[randomIndex]);
    setActiveQuote(''); // Clear standard quote
    setBubbleKey((k) => k + 1);
  };

  return (
    <div className="bg-white rounded-[2rem] p-6 shadow-sm border-2 border-[#FFDAB9] relative overflow-hidden flex flex-col md:flex-row items-center gap-4">
      
      {/* Bunny SVG Character (Interactive) */}
      <div 
        onClick={handleBunnyClick}
        className="relative cursor-pointer shrink-0 animate-bunny hover:scale-105 transition-all group"
        title="点我说话哦！"
      >
        <svg width="100" height="110" viewBox="0 0 100 110" className="drop-shadow-sm">
          {/* Ears */}
          {/* Left Ear */}
          <path 
            d="M38 42 Q20 0, 32 15 Q38 25, 38 42 Z" 
            fill="#FFC1CC" 
            className="animate-ear-twitch origin-bottom"
            style={{ animationDelay: '0.5s' }}
          />
          <path d="M35 38 Q25 10, 31 20 Q35 28, 35 38 Z" fill="#FFF0F0" className="animate-ear-twitch origin-bottom" />
          
          {/* Right Ear */}
          <path 
            d="M62 42 Q80 0, 68 15 Q62 25, 62 42 Z" 
            fill="#FFC1CC" 
            className="animate-ear-twitch origin-bottom"
            style={{ animationDelay: '1.5s' }}
          />
          <path d="M65 38 Q75 10, 69 20 Q65 28, 65 38 Z" fill="#FFF0F0" className="animate-ear-twitch origin-bottom" />

          {/* Head */}
          <ellipse cx="50" cy="58" rx="25" ry="22" fill="#FFFFFF" stroke="#FFDAB9" strokeWidth="2" />
          
          {/* Body / Collar */}
          <path d="M35 76 Q50 68, 65 76 L60 92 Q50 95, 40 92 Z" fill="#FF91A4" />
          <circle cx="50" cy="84" r="3" fill="#FFFFFF" />

          {/* Cheeks */}
          <circle cx="33" cy="62" r="4" fill="#FFC1CC" opacity="0.8" />
          <circle cx="67" cy="62" r="4" fill="#FFC1CC" opacity="0.8" />

          {/* Eyes */}
          <circle cx="40" cy="56" r="2.5" fill="#6B4F4F" />
          <circle cx="60" cy="56" r="2.5" fill="#6B4F4F" />
          <circle cx="41.5" cy="54.5" r="0.8" fill="#FFFFFF" />
          <circle cx="61.5" cy="54.5" r="0.8" fill="#FFFFFF" />

          {/* Nose & Mouth */}
          <polygon points="48,60 52,60 50,62" fill="#FF91A4" />
          <path d="M47 64 Q50 67, 53 64" stroke="#6B4F4F" strokeWidth="1.5" fill="none" />

          {/* Cute Little Paws */}
          <circle cx="42" cy="74" r="3" fill="#FFFFFF" stroke="#FFC1CC" strokeWidth="1" />
          <circle cx="58" cy="74" r="3" fill="#FFFFFF" stroke="#FFC1CC" strokeWidth="1" />
        </svg>

        {/* Floating Carrot Decoration */}
        <div className="absolute -top-1 -left-2 text-lg transform -rotate-12 select-none pointer-events-none group-hover:rotate-12 transition-transform">
          🥕
        </div>
      </div>

      {/* Speech Bubble */}
      <div className="flex-1 min-w-0">
        <div 
          key={bubbleKey}
          className="bg-[#FFF9F2] p-4 rounded-2xl border-2 border-[#FFDAB9] relative animate-fadeIn"
        >
          {/* Bubble Arrow */}
          <div className="absolute top-1/2 -left-2.5 md:block hidden -translate-y-1/2 w-3.5 h-3.5 bg-[#FFF9F2] border-l-2 border-b-2 border-[#FFDAB9] transform rotate-45" />
          <div className="absolute -top-2.5 left-1/2 md:hidden block -translate-x-1/2 w-3.5 h-3.5 bg-[#FFF9F2] border-l-2 border-t-2 border-[#FFDAB9] transform rotate-45" />

          {fortuneResult ? (
            <div>
              <div className="flex items-center gap-1 mb-1">
                <span className="text-[10px] bg-[#FF91A4] text-white px-1.5 py-0.5 rounded-md font-bold">
                  🔮 今日兔兔签
                </span>
                <span className="text-sm font-bold text-red-500">
                  {fortuneResult.fortune}
                </span>
              </div>
              <p className="text-xs text-[#6B4F4F] font-semibold">
                {fortuneResult.content}
              </p>
            </div>
          ) : (
            <div>
              <span className="text-[9px] text-[#FF91A4] font-bold block mb-0.5 uppercase tracking-wide">
                兔兔小管家
              </span>
              <p className="text-xs sm:text-sm text-[#6B4F4F] font-semibold leading-relaxed">
                {activeQuote}
              </p>
            </div>
          )}
        </div>

        {/* Mini Buttons */}
        <div className="flex items-center gap-2 mt-3">
          <button
            onClick={handleBunnyClick}
            className="text-[10px] sm:text-xs text-[#FF91A4] hover:text-white bg-pink-50 hover:bg-[#FF91A4] border border-[#FFC1CC] px-3 py-1 rounded-full font-bold transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
          >
            <Smile className="w-3 h-3" />
            <span>和兔兔对话</span>
          </button>
          <button
            onClick={drawFortune}
            className="text-[10px] sm:text-xs text-[#065F46] hover:text-white bg-emerald-50 hover:bg-emerald-600 border border-[#8ACBB5] px-3 py-1 rounded-full font-bold transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
          >
            <Sparkles className="w-3 h-3" />
            <span>🔮 摇一支家庭签</span>
          </button>
        </div>
      </div>
    </div>
  );
}
