import React, { useState, useEffect } from 'react';
import { FamilyMember, CalendarEvent, TodoTask, AlertNotification } from './types';
import {
  INITIAL_MEMBERS,
  INITIAL_EVENTS,
  INITIAL_TODOS,
  INITIAL_ALERTS,
} from './data/initialData';
import MemberSelector from './components/MemberSelector';
import CalendarView from './components/CalendarView';
import TodoView from './components/TodoView';
import RemindersList from './components/RemindersList';
import BunnyAssistant from './components/BunnyAssistant';
import Modal from './components/Modal';
import { Heart, Bell, Calendar as CalendarIcon, Sparkles, CloudLightning, Download, BookOpen, X, Globe, Edit } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  // Load initial states from LocalStorage or fall back to defaults
  const [members, setMembers] = useState<FamilyMember[]>(() => {
    const saved = localStorage.getItem('bunny_family_members');
    return saved ? JSON.parse(saved) : INITIAL_MEMBERS;
  });

  const [events, setEvents] = useState<CalendarEvent[]>(() => {
    const saved = localStorage.getItem('bunny_family_events');
    return saved ? JSON.parse(saved) : INITIAL_EVENTS;
  });

  const [todos, setTodos] = useState<TodoTask[]>(() => {
    const saved = localStorage.getItem('bunny_family_todos');
    return saved ? JSON.parse(saved) : INITIAL_TODOS;
  });

  const [alerts, setAlerts] = useState<AlertNotification[]>(() => {
    const saved = localStorage.getItem('bunny_family_alerts');
    return saved ? JSON.parse(saved) : INITIAL_ALERTS;
  });

  const [activeMemberId, setActiveMemberId] = useState<string>(() => {
    const saved = localStorage.getItem('bunny_family_active_id');
    return saved || 'member-2'; // Default spokesperson: 妈妈
  });

  // Editable App Info States
  const [appTitle, setAppTitle] = useState(() => {
    return localStorage.getItem('bunny_app_title') || '兔兔家庭日历';
  });
  const [appSubtitle, setAppSubtitle] = useState(() => {
    return localStorage.getItem('bunny_app_subtitle') || '共享小窝 🐰';
  });
  const [appDescription, setAppDescription] = useState(() => {
    return localStorage.getItem('bunny_app_description') || '同步蜜糖家庭日程，管理共同待办，随时拉响萌趣提醒 ✨';
  });
  const [isEditTitleModalOpen, setIsEditTitleModalOpen] = useState(false);

  // ==========================================
  // 🔑 家庭暗号安全锁配置 (可以直接在此修改默认暗号)
  // ==========================================
  // 💡 默认为 '1234'。首次访问的用户都必须输入这个暗号才能解锁。
  // 如果您想设置其他的专属暗号，只需把这里的 '1234' 改成您的暗号，然后推送到 GitHub 部署即可！
  // 如果设置为空字符串 ''，则代表不设暗号、完全公开。
  const GLOBAL_DEFAULT_PASSCODE = '咚咚7777';

  // Passcode Protection States
  const [passcode, setPasscode] = useState(() => {
    const saved = localStorage.getItem('bunny_family_passcode');
    return saved !== null ? saved : GLOBAL_DEFAULT_PASSCODE;
  });
  const [isUnlocked, setIsUnlocked] = useState(() => {
    const savedPasscode = localStorage.getItem('bunny_family_passcode');
    const currentPasscode = savedPasscode !== null ? savedPasscode : GLOBAL_DEFAULT_PASSCODE;
    if (!currentPasscode.trim()) return true; // Default unlocked if no passcode set
    return sessionStorage.getItem('bunny_family_unlocked') === 'true';
  });
  const [inputPasscode, setInputPasscode] = useState('');
  const [passcodeError, setPasscodeError] = useState(false);

  // Toast Notification State
  const [toast, setToast] = useState<{ id: string; avatar: string; message: string; title: string } | null>(null);

  // Export & Deploy Modal State
  const [showExportModal, setShowExportModal] = useState(false);

  // Sync state to LocalStorage whenever they change
  useEffect(() => {
    localStorage.setItem('bunny_family_members', JSON.stringify(members));
  }, [members]);

  useEffect(() => {
    localStorage.setItem('bunny_family_events', JSON.stringify(events));
  }, [events]);

  useEffect(() => {
    localStorage.setItem('bunny_family_todos', JSON.stringify(todos));
  }, [todos]);

  useEffect(() => {
    localStorage.setItem('bunny_family_alerts', JSON.stringify(alerts));
  }, [alerts]);

  useEffect(() => {
    localStorage.setItem('bunny_family_active_id', activeMemberId);
  }, [activeMemberId]);

  useEffect(() => {
    localStorage.setItem('bunny_app_title', appTitle);
  }, [appTitle]);

  useEffect(() => {
    localStorage.setItem('bunny_app_subtitle', appSubtitle);
  }, [appSubtitle]);

  useEffect(() => {
    localStorage.setItem('bunny_app_description', appDescription);
  }, [appDescription]);

  useEffect(() => {
    localStorage.setItem('bunny_family_passcode', passcode);
  }, [passcode]);

  // Trigger custom toast notification
  const triggerToast = (avatar: string, title: string, message: string) => {
    const id = Date.now().toString();
    setToast({ id, avatar, title, message });
    // Auto clear toast after 4 seconds
    setTimeout(() => {
      setToast((prev) => (prev?.id === id ? null : prev));
    }, 4000);
  };

  // 1. Member Handlers
  const handleAddMember = (newMember: Omit<FamilyMember, 'id'>) => {
    const id = `member-${Date.now()}`;
    const added: FamilyMember = { ...newMember, id };
    setMembers((prev) => [...prev, added]);
    
    // Log alert notification
    const alert: AlertNotification = {
      id: `alert-${Date.now()}`,
      time: '刚才',
      title: '家庭新成员入驻 🎉',
      message: `${added.name} 正式加入了兔兔家庭日历，欢迎！`,
      memberId: added.id,
      type: 'bunny',
      timestamp: new Date().toISOString(),
    };
    setAlerts((prev) => [alert, ...prev].slice(0, 50));
    triggerToast(added.avatar, '欢迎新成员！', `${added.name} 加入了共享日程~`);
  };

  const handleDeleteMember = (id: string) => {
    const memberToDelete = members.find((m) => m.id === id);
    if (!memberToDelete) return;

    setMembers((prev) => prev.filter((m) => m.id !== id));
    // If active member is deleted, fall back to first member
    if (activeMemberId === id) {
      setActiveMemberId(members[0]?.id || 'member-2');
    }

    // Clean up todos & events associated or re-assign them to all
    setTodos((prev) =>
      prev.map((t) => (t.assignedTo === id ? { ...t, assignedTo: 'all' } : t))
    );
    setEvents((prev) =>
      prev.map((e) => (e.memberId === id ? { ...e, memberId: 'all' } : e))
    );

    triggerToast('🐰', '家庭成员已移除', `${memberToDelete.name} 离开了共享大家庭。`);
  };

  const handleUpdateMember = (updated: FamilyMember) => {
    setMembers((prev) => prev.map((m) => m.id === updated.id ? updated : m));
    triggerToast(updated.avatar, '资料已更新 📝', `${updated.name} 的家庭成员卡片更新成功！`);
  };

  // 2. Calendar Event Handlers
  const handleAddEvent = (newEvent: Omit<CalendarEvent, 'id'>) => {
    const id = `event-${Date.now()}`;
    const added: CalendarEvent = { ...newEvent, id };
    setEvents((prev) => [...prev, added]);

    // Send Alert
    const sender = members.find((m) => m.id === activeMemberId);
    const alert: AlertNotification = {
      id: `alert-${Date.now()}`,
      time: '刚才',
      title: '添加了新安排 📅',
      message: `${sender?.name || '有人'} 预订了日程: "${added.title}" (${added.date} ${added.time})`,
      memberId: activeMemberId,
      type: 'event',
      timestamp: new Date().toISOString(),
    };
    setAlerts((prev) => [alert, ...prev].slice(0, 50));
    triggerToast(sender?.avatar || '🐰', '新日程发布！', `"${added.title}" 已经排上日程啦~`);
  };

  const handleUpdateEvent = (updated: CalendarEvent) => {
    setEvents((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
    
    const sender = members.find((m) => m.id === activeMemberId);
    triggerToast(sender?.avatar || '🐰', '日程已修改 ✏️', `"${updated.title}" 的详情已被更新。`);
  };

  const handleDeleteEvent = (id: string) => {
    const event = events.find((e) => e.id === id);
    if (!event) return;

    setEvents((prev) => prev.filter((e) => e.id !== id));
    triggerToast('🗑️', '日程已取消', `"${event.title}" 已经从日历中移除。`);
  };

  // 3. Todo Handlers
  const handleAddTodo = (newTodo: Omit<TodoTask, 'id' | 'completed' | 'createdAt'>) => {
    const id = `todo-${Date.now()}`;
    const added: TodoTask = {
      ...newTodo,
      id,
      completed: false,
      createdAt: new Date().toISOString().split('T')[0],
    };
    setTodos((prev) => [added, ...prev]);

    const sender = members.find((m) => m.id === activeMemberId);
    const assignee = members.find((m) => m.id === added.assignedTo);
    
    // Add Alert
    const alert: AlertNotification = {
      id: `alert-${Date.now()}`,
      time: '刚才',
      title: '布置了新待办 📌',
      message: `${sender?.name || '有人'} 给 ${assignee ? assignee.name : '全家'} 布置了任务: "${added.title}"`,
      memberId: activeMemberId,
      type: 'task',
      timestamp: new Date().toISOString(),
    };
    setAlerts((prev) => [alert, ...prev].slice(0, 50));
    triggerToast('📌', '收到新待办！', `给${assignee ? assignee.name : '大家'}分派了 "${added.title}"`);
  };

  const handleToggleTodo = (id: string, completedBy: string) => {
    const memberCompleting = members.find((m) => m.id === completedBy);
    
    setTodos((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          const nextCompleted = !t.completed;
          
          if (nextCompleted) {
            // Trigger completion alert
            const alert: AlertNotification = {
              id: `alert-${Date.now()}`,
              time: '刚才',
              title: '搞定了一项待办 🎉',
              message: `${memberCompleting?.name || '有人'} 完成了任务: "${t.title}"`,
              memberId: completedBy,
              type: 'task',
              timestamp: new Date().toISOString(),
            };
            setAlerts((prevAlerts) => [alert, ...prevAlerts].slice(0, 50));
            triggerToast(memberCompleting?.avatar || '🐰', '太棒啦！✨', `完成了待办 "${t.title}"`);
          }
          
          return {
            ...t,
            completed: nextCompleted,
            completedBy: nextCompleted ? completedBy : undefined,
          };
        }
        return t;
      })
    );
  };

  const handleDeleteTodo = (id: string) => {
    const todo = todos.find((t) => t.id === id);
    if (!todo) return;

    setTodos((prev) => prev.filter((t) => t.id !== id));
    triggerToast('🗑️', '任务已删除', `待办事项 "${todo.title}" 已移除。`);
  };

  // 4. Alert Handlers
  const handleSendAlert = (title: string, message: string, memberId: string) => {
    const sender = members.find((m) => m.id === memberId);
    const alert: AlertNotification = {
      id: `alert-${Date.now()}`,
      time: '刚才',
      title: title,
      message: message,
      memberId: memberId,
      type: 'reminder',
      timestamp: new Date().toISOString(),
    };
    setAlerts((prev) => [alert, ...prev].slice(0, 50));
    triggerToast(sender?.avatar || '🐰', '收到实时家庭消息 📢', message);
  };

  const activeSpokesperson = members.find((m) => m.id === activeMemberId) || members[0];

  const handleUnlockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputPasscode.trim() === passcode.trim()) {
      sessionStorage.setItem('bunny_family_unlocked', 'true');
      setIsUnlocked(true);
      setPasscodeError(false);
      setInputPasscode('');
      triggerToast('🔑', '对上暗号啦！', '欢迎回家~ 🏡');
    } else {
      setPasscodeError(true);
    }
  };

  if (passcode.trim() !== '' && !isUnlocked) {
    return (
      <div className="bg-[#FFF9F2] min-h-screen font-sans flex items-center justify-center p-4 text-[#6B4F4F]">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-white rounded-[2.5rem] p-6 sm:p-8 shadow-2xl border-4 border-[#FFDAB9] text-center relative"
        >
          {/* Bunny Decor */}
          <div className="w-20 h-20 bg-[#FFE4E6] rounded-full flex items-center justify-center text-4xl mx-auto mb-6 border-2 border-[#FFB3C1] relative">
            🐰
            <span className="absolute -top-1 -right-1 text-base">🔑</span>
          </div>

          <h1 className="text-2xl font-black tracking-tight mb-2">🥕 兔兔家园暗号确认</h1>
          <p className="text-xs text-[#A68F8F] font-bold mb-6">
            本页已被主人设为私密日历。请输入专属的家庭暗号进入小窝~
          </p>

          <form onSubmit={handleUnlockSubmit} className="space-y-4">
            <div className="relative">
              <input
                type="text"
                required
                value={inputPasscode}
                onChange={(e) => {
                  setInputPasscode(e.target.value);
                  setPasscodeError(false);
                }}
                placeholder="请输入家庭暗号 💬"
                className={`w-full px-5 py-3.5 bg-[#FFF9F2] rounded-2xl border-2 ${
                  passcodeError ? 'border-red-400 animate-bounce' : 'border-[#FFDAB9]'
                } focus:outline-hidden focus:border-[#FF91A4] text-center text-stone-800 text-base font-black tracking-wide`}
              />
              {passcodeError && (
                <p className="text-[11px] text-red-500 font-bold mt-1.5 flex items-center justify-center gap-1">
                  ❌ 暗号不对哦，再认真想一想呢？
                </p>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#FF91A4] to-[#FFC1CC] text-white font-black text-sm shadow-md hover:opacity-95 hover:scale-[1.02] active:scale-95 transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span>对暗号 🥕</span>
            </button>
          </form>

          {/* Quick tips */}
          <div className="mt-8 pt-4 border-t border-[#FFF0F0] text-[11px] text-[#A68F8F] font-semibold leading-relaxed">
            <p>💡 这是自定义的家庭保护屏障，不需要花费一分钱。</p>
            <p className="mt-1">
              如果你是管理员，可在原本的 AI Studio 预览窗口中，点击标题旁边的修改按钮，查看或修改你设置的暗号。
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="bg-[#FFF9F2] min-h-screen font-sans flex flex-col p-4 sm:p-6 lg:p-8 text-[#6B4F4F]">
      
      {/* Toast Notification Banner */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-6 right-6 z-[100] max-w-sm w-full bg-white rounded-2xl p-4 shadow-xl border-2 border-[#FFDAB9] flex items-start gap-3 pointer-events-auto"
          >
            <div className="w-10 h-10 bg-[#FFF0F0] rounded-xl flex items-center justify-center text-2xl border border-[#FFE0E0] shrink-0">
              {toast.avatar}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-bold text-[#FF91A4] flex items-center gap-1">
                <Bell className="w-3.5 h-3.5 animate-swing" />
                {toast.title}
              </h4>
              <p className="text-xs text-[#6B4F4F] font-semibold mt-0.5 break-words">
                {toast.message}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="w-full max-w-7xl mx-auto flex flex-col gap-6 flex-1">
        
        {/* Header Block */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white rounded-[2rem] p-5 sm:p-6 shadow-sm border-2 border-[#FFDAB9]">
          <div className="flex items-center gap-3.5">
            <div className="w-14 h-14 bg-[#FFC1CC] rounded-2xl flex items-center justify-center border-b-4 border-[#FF91A4] shrink-0">
              <svg viewBox="0 0 24 24" className="w-9 h-9 text-white" fill="currentColor">
                <path d="M12,2C10.89,2 10,2.89 10,4C10,4.55 10.22,5.05 10.59,5.42C9.11,6.13 8,7.37 7.3,8.9C5.3,8.4 3.2,9.3 2.3,11.3C1.4,13.3 2.3,15.7 4.3,16.6C4.8,16.8 5.4,16.9 6,16.9C6.4,16.9 6.8,16.8 7.2,16.7C7.6,18.6 8.9,20.2 10.8,21.1C12.7,22 15,21.8 16.7,20.6C18.4,21.8 20.7,22 22.6,21.1C24.5,20.2 25.8,18.6 26.2,16.7C26.6,16.8 27,16.9 27.4,16.9C28,16.9 28.6,16.8 29.1,16.6C31.1,15.7 32,13.3 31.1,11.3C30.2,9.3 28.1,8.4 26.1,8.9C25.4,7.37 24.29,6.13 22.81,5.42C23.18,5.05 23.4,4.55 23.4,4C23.4,2.89 22.51,2 21.4,2C20.6,2 19.9,2.5 19.6,3.2C18.6,2.5 17.4,2.1 16.1,2.1C15.1,2.1 14.1,2.3 13.2,2.8C12.9,2.3 12.5,2 12,2M12,4.5C12.3,4.5 12.5,4.7 12.5,5C12.5,5.3 12.3,5.5 12,5.5C11.7,5.5 11.5,5.3 11.5,5C11.5,4.7 11.7,4.5 12,4.5Z" />
              </svg>
            </div>
            <div className="flex-1">
              <h1 className="text-xl sm:text-2xl font-black text-[#6B4F4F] tracking-tight flex items-center flex-wrap gap-1.5 group">
                <span>{appTitle}</span>
                <span className="text-xs bg-[#FFDAB9]/50 text-[#FF91A4] font-bold px-2 py-0.5 rounded-full">
                  {appSubtitle}
                </span>
                <button
                  onClick={() => setIsEditTitleModalOpen(true)}
                  className="p-1 rounded-full text-[#A68F8F] hover:text-[#FF91A4] hover:bg-[#FFF0F0] transition-all opacity-40 group-hover:opacity-100 cursor-pointer ml-1"
                  title="修改日历名称/副标题/介绍"
                >
                  <Edit className="w-3.5 h-3.5" />
                </button>
              </h1>
              <p className="text-xs sm:text-sm text-[#A68F8F] font-semibold mt-0.5">
                {appDescription}
              </p>
            </div>
          </div>

          {/* Member selector block */}
          <div className="w-full md:w-auto flex flex-col md:flex-row md:items-center gap-4 border-t md:border-t-0 border-stone-100 pt-4 md:pt-0">
            <button
              onClick={() => setShowExportModal(true)}
              className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#FF91A4] to-[#FFC1CC] text-white font-bold text-xs shadow-sm hover:opacity-90 hover:scale-[1.02] active:scale-95 transition-all duration-200 cursor-pointer w-full md:w-auto"
            >
              <CloudLightning className="w-4.5 h-4.5 animate-pulse" />
              <span>外部部署与下载 🐰</span>
            </button>
            <MemberSelector
              members={members}
              activeMemberId={activeMemberId}
              onSelectMember={setActiveMemberId}
              onAddMember={handleAddMember}
              onDeleteMember={handleDeleteMember}
              onUpdateMember={handleUpdateMember}
            />
          </div>
        </header>

        {/* Workspace Body: Left Side (Todos/Reminders), Right Side (Calendar/Bunny) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
          
          {/* Left Sidebar Columns (col-span-4) */}
          <aside className="lg:col-span-4 flex flex-col gap-6">
            
            {/* 1. Shared To-Do Items Card */}
            <div className="flex-1">
              <TodoView
                todos={todos}
                members={members}
                activeMemberId={activeMemberId}
                onAddTodo={handleAddTodo}
                onToggleTodo={handleToggleTodo}
                onDeleteTodo={handleDeleteTodo}
              />
            </div>

            {/* 2. Alerts and Reminders list */}
            <div className="h-[310px]">
              <RemindersList
                alerts={alerts}
                members={members}
                activeMemberId={activeMemberId}
                onSendAlert={handleSendAlert}
              />
            </div>
          </aside>

          {/* Right Main Columns (col-span-8) */}
          <main className="lg:col-span-8 flex flex-col gap-6">
            
            {/* 1. Bunny Mascot Card */}
            <BunnyAssistant />

            {/* 2. Calendar View Card */}
            <div className="flex-1 flex flex-col justify-between">
              <CalendarView
                events={events}
                members={members}
                activeMemberId={activeMemberId}
                onAddEvent={handleAddEvent}
                onUpdateEvent={handleUpdateEvent}
                onDeleteEvent={handleDeleteEvent}
              />
            </div>
          </main>
        </div>

        {/* Footer */}
        <footer className="text-center py-4 border-t border-[#FFDAB9]/40 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#A68F8F] font-bold">
          <div className="flex flex-col sm:flex-row items-center gap-1.5 sm:gap-4">
            <div className="flex items-center gap-1.5">
              <Heart className="w-3.5 h-3.5 text-[#FF91A4] fill-[#FF91A4]" />
              <span>兔兔家园日历守护中：一家人就是要整整齐齐 ❤️</span>
            </div>
            <button
              onClick={() => setShowExportModal(true)}
              className="text-[#FF91A4] hover:text-[#FF6B8B] hover:underline cursor-pointer flex items-center gap-1 bg-[#FFF0F0] px-2.5 py-1 rounded-full border border-[#FFDAB9]/50 transition-all duration-200 mt-1 sm:mt-0"
            >
              <CloudLightning className="w-3 h-3 animate-pulse" />
              <span>部署给家人/国内直接打开 (极简1分钟指南)</span>
            </button>
          </div>
          <div>
            <span>当前发言人头像: {activeSpokesperson?.avatar} {activeSpokesperson?.name} ({activeSpokesperson?.role})</span>
          </div>
        </footer>
      </div>

      {/* Export & Deployment Modal */}
      <AnimatePresence>
        {showExportModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm pointer-events-auto overflow-y-auto"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="relative bg-white rounded-[2.5rem] border-4 border-[#FFDAB9] max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 shadow-2xl text-[#6B4F4F]"
            >
              {/* Close Button */}
              <button
                onClick={() => setShowExportModal(false)}
                className="absolute top-6 right-6 p-2 rounded-full bg-[#FFF0F0] text-[#A68F8F] hover:text-[#FF91A4] hover:scale-105 transition-all duration-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Title Header */}
              <div className="flex items-center gap-3 border-b-2 border-[#FFF0F0] pb-5 mb-6">
                <div className="w-12 h-12 bg-[#FFC1CC] rounded-2xl flex items-center justify-center border-b-4 border-[#FF91A4]">
                  <CloudLightning className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-black tracking-tight">🐰 外部部署与全家共享指南</h2>
                  <p className="text-xs text-[#A68F8F] font-bold mt-0.5">
                    把可爱的兔兔日历送给全家，在国内网络或手机上免受 403 阻挡秒开！
                  </p>
                </div>
              </div>

              {/* Why we need this block */}
              <div className="bg-[#FFF9F2] rounded-2xl p-4 border border-[#FFDAB9]/50 mb-6 text-xs leading-relaxed font-semibold">
                <p className="text-[#FF91A4] font-black mb-1">📢 为什么需要独立部署？</p>
                因为 Google 的安全准则限制，AI Studio 默认的预览链接（即你现在看到的链接）开启了 Googler 权限验证，外部家人打开会显示 <code className="bg-white px-1.5 py-0.5 rounded border border-[#FFDAB9] text-xs font-mono text-red-500 font-bold">403 Forbidden</code>。
                通过将项目导出并部署到免费托管平台 <strong className="text-stone-800">Vercel</strong>，你就能获得一个全新的、属于你们家的**公共地址**，在中国国内和手机浏览器里无需 VPN 就能完美加载，还可以添加到手机主屏幕上随时当作 App 使用！
              </div>

              {/* Step 1: Download code */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-6 h-6 rounded-full bg-[#FF91A4] text-white flex items-center justify-center text-xs font-bold">1</span>
                  <h3 className="font-black text-sm">一键下载项目全部源代码</h3>
                </div>
                <div className="pl-8">
                  <p className="text-xs text-[#A68F8F] font-bold mb-3">
                    我已经为你全自动打包了整个日历的代码包，里面包含运行本应用所需的全部设置。
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <a
                      href="/rabbit-calendar.zip"
                      download="rabbit-calendar.zip"
                      className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-[#FFE4E6] border-2 border-[#FFB3C1] hover:bg-[#FFC1CC]/40 text-[#FF5A79] hover:text-[#E03B5A] font-black text-xs transition-all duration-200 cursor-pointer shadow-sm"
                    >
                      <Download className="w-4 h-4" />
                      <span>📁 推荐：下载 ZIP 压缩包 (rabbit-calendar.zip)</span>
                    </a>
                    <a
                      href="/rabbit-calendar.tar.gz"
                      download="rabbit-calendar.tar.gz"
                      className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-[#FFF0F0] border-2 border-[#FFDAB9] hover:bg-[#FFC1CC]/20 text-[#FF91A4] hover:text-[#FF6B8B] font-black text-xs transition-all duration-200 cursor-pointer shadow-sm"
                    >
                      <Download className="w-4 h-4" />
                      <span>📦 备用：下载 TAR.GZ 压缩包 (rabbit-calendar.tar.gz)</span>
                    </a>
                  </div>
                  <div className="text-[10px] text-[#A68F8F] font-bold mt-2.5 space-y-1 bg-stone-50 p-3 rounded-xl border border-stone-100">
                    <p className="text-stone-700">💡 提示：Windows/Mac 系统都原生支持解压 <code className="bg-stone-200/60 px-1 py-0.5 rounded font-mono text-xs text-stone-800">.zip</code> 文件，推荐首选下载 ZIP 文件！</p>
                    <p className="text-amber-600 font-bold">⚠️ 重要提示（如果无法点击下载）：</p>
                    <p className="text-stone-500 font-normal">由于预览界面的安全限制，直接在左侧预览框中点击下载可能会被浏览器阻止。请点击预览框右上角的 <strong className="text-stone-700">“Open in New Tab” (在新标签页中打开)</strong> 图标，在独立的新标签页中点击下载，或直接在网址末尾加上 <code className="bg-stone-200/60 px-1.5 py-0.5 rounded font-mono text-xs text-stone-800">/rabbit-calendar.zip</code> 即可完美极速下载！</p>
                  </div>
                </div>
              </div>

              {/* Step 2: Upload to GitHub */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-6 h-6 rounded-full bg-[#FF91A4] text-white flex items-center justify-center text-xs font-bold">2</span>
                  <h3 className="font-black text-sm">将代码上传到 GitHub</h3>
                </div>
                <div className="pl-8 space-y-2 text-xs leading-relaxed font-semibold">
                  <p className="text-[#A68F8F] font-bold">
                    由于你具有 Google 身份，AI Studio 自带的 GitHub Sync 按钮被停用。别担心，手动上传只需 30 秒：
                  </p>
                  <ol className="list-decimal list-inside space-y-1.5 pl-2 bg-[#FFF9F2]/40 p-3 rounded-xl border border-[#FFDAB9]/20 text-stone-700">
                    <li>访问 <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="text-[#FF91A4] hover:underline font-bold inline-flex items-center gap-0.5">github.com <Globe className="w-3 h-3" /></a> 注册一个免费的个人账号（非 Google 账号均可）。</li>
                    <li>登录后点击右上角的 <strong className="text-[#FF91A4] font-black">+</strong> 按钮，选择 <strong className="font-bold">New repository</strong>。</li>
                    <li>在 <strong className="font-bold">Repository name</strong> 里输入 <code className="bg-white px-1.5 py-0.5 rounded border border-stone-200 font-mono text-xs">rabbit-calendar</code>，其它选项不用动，直接滑到最下方点击绿色的 <strong className="font-bold">Create repository</strong>。</li>
                    <li>在新页面中，找到一句话 <strong className="text-stone-800">"Get started by creating a new file or uploading an existing file"</strong>，点击其中的 <strong className="text-[#FF91A4] hover:underline font-bold cursor-pointer">uploading an existing file</strong>。</li>
                    <li>把你解压出来的文件夹里的所有内容（包括 <code className="font-mono">src</code>、<code className="font-mono">index.html</code>、<code className="font-mono">package.json</code> 等）全部拖拽到网页的灰色区域中。</li>
                    <li>等待上传进度条走完后，滑到最下面点击绿色的 <strong className="font-bold">Commit changes</strong> 按钮，代码上传就搞定啦！</li>
                  </ol>
                </div>
              </div>

              {/* Step 3: Connect to Vercel */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-6 h-6 rounded-full bg-[#FF91A4] text-white flex items-center justify-center text-xs font-bold">3</span>
                  <h3 className="font-black text-sm">一键在 Vercel 发布上线 (永久免费)</h3>
                </div>
                <div className="pl-8 space-y-2 text-xs leading-relaxed font-semibold">
                  <p className="text-[#A68F8F] font-bold">
                    最后，利用 Vercel 托管平台把 GitHub 上的代码变成一个全球任何地方都可以打开的真实网站：
                  </p>
                  <ol className="list-decimal list-inside space-y-1.5 pl-2 bg-[#FFF9F2]/40 p-3 rounded-xl border border-[#FFDAB9]/20 text-stone-700">
                    <li>访问 <a href="https://vercel.com" target="_blank" rel="noopener noreferrer" className="text-[#FF91A4] hover:underline font-bold inline-flex items-center gap-0.5">vercel.com <Globe className="w-3 h-3" /></a> 并注册一个免费账号，注册时请选择 <strong className="font-bold">"Continue with GitHub"</strong>（这样能免密连接）。</li>
                    <li>登录 Vercel 主控制台，点击右上角的黑底白字按钮 <strong className="font-bold">Add New</strong>{" → "}<strong className="font-bold">Project</strong>。</li>
                    <li>页面上会自动列出你刚才在 GitHub 新建的 <code className="bg-white px-1.5 py-0.5 rounded border border-stone-200 font-mono text-xs">rabbit-calendar</code> 仓库，点击它旁边的黑色 <strong className="font-bold text-[#FF91A4]">Import</strong> 按钮。</li>
                    <li>在配置页面的 Framework Preset 处确认是 <strong className="font-bold">Vite</strong>，其他内容**完全不需要修改**，直接点击底部的黑色 <strong className="font-bold text-white bg-stone-900 px-4 py-1.5 rounded-xl">Deploy</strong> 按钮！</li>
                    <li>大概等待 15 秒钟的自动构建，烟花在屏幕绽放！你就拥有了一个永久免费的、国内网络直接秒开的专属家庭日历网站链接啦！🎉</li>
                  </ol>
                </div>
              </div>

              {/* PWA / Screen Addition tip */}
              <div className="bg-[#FFF0F0] rounded-[1.5rem] p-4 border-2 border-dashed border-[#FFC1CC] text-xs font-bold leading-relaxed text-stone-700">
                <p className="text-[#FF91A4] font-black flex items-center gap-1 mb-1">
                  💡 贴心提示：如何在手机桌面上当成原生 APP 随时打开？
                </p>
                部署成功后，全家人在手机上用手机自带浏览器（如 iOS 的 Safari 或 Android 的 Chrome）打开你们专属的 Vercel 网址，点击浏览器的**分享菜单**（Safari 底部向上箭头的按钮），选择 <strong className="text-[#FF91A4] font-black">“添加到主屏幕” (Add to Home Screen)</strong> 即可！
                手机桌面就会出现可爱的兔兔图标 🐰，每次点击都可以像真正的 App 一样沉浸式全屏打开，非常方便快捷！
              </div>

              {/* Action Buttons footer */}
              <div className="flex justify-end mt-8 pt-4 border-t-2 border-[#FFF0F0]">
                <button
                  onClick={() => setShowExportModal(false)}
                  className="px-6 py-2.5 rounded-xl bg-[#6B4F4F] hover:bg-[#523B3B] text-white font-bold text-xs shadow-sm hover:scale-102 transition-all duration-200 cursor-pointer"
                >
                  我知道了，去试一下！ 🐇
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Title Modal */}
      <Modal
        isOpen={isEditTitleModalOpen}
        onClose={() => setIsEditTitleModalOpen(false)}
        title="修改日历基本信息"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setIsEditTitleModalOpen(false);
            if (passcode.trim() !== '') {
              sessionStorage.setItem('bunny_family_unlocked', 'true');
              setIsUnlocked(true);
            }
            triggerToast('✏️', '基本资料已修改', '日历的标题和标语已更新啦！');
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-sm font-bold text-[#6B4F4F] mb-1">
              日历主标题 *
            </label>
            <input
              type="text"
              required
              maxLength={20}
              value={appTitle}
              onChange={(e) => setAppTitle(e.target.value)}
              placeholder="例如：咚咚家庭日历"
              className="w-full px-4 py-2.5 bg-white rounded-2xl border-2 border-[#FFDAB9] focus:outline-hidden focus:border-[#FF91A4] text-stone-800 text-sm font-semibold"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-[#6B4F4F] mb-1">
              副标题 / 徽章 *
            </label>
            <input
              type="text"
              required
              maxLength={15}
              value={appSubtitle}
              onChange={(e) => setAppSubtitle(e.target.value)}
              placeholder="例如：咚咚的专属窝 🏠"
              className="w-full px-4 py-2.5 bg-white rounded-2xl border-2 border-[#FFDAB9] focus:outline-hidden focus:border-[#FF91A4] text-stone-800 text-sm font-semibold"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-[#6B4F4F] mb-1">
              温馨介绍 / 标语
            </label>
            <textarea
              maxLength={80}
              rows={3}
              value={appDescription}
              onChange={(e) => setAppDescription(e.target.value)}
              placeholder="同步蜜糖家庭日程，管理共同待办，随时拉响萌趣提醒 ✨"
              className="w-full px-4 py-2.5 bg-white rounded-2xl border-2 border-[#FFDAB9] focus:outline-hidden focus:border-[#FF91A4] text-stone-800 text-sm font-semibold resize-none"
            />
          </div>

          <div className="border-t border-[#FFDAB9]/40 pt-3">
            <label className="block text-sm font-bold text-[#6B4F4F] mb-1 flex justify-between items-center">
              <span className="flex items-center gap-1">🔑 设定家庭暗号 (安全锁)</span>
              <span className="text-[10px] text-[#A68F8F] font-normal">留空代表公开、不设密码</span>
            </label>
            <input
              type="text"
              maxLength={20}
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              placeholder="例如：1234 或 小兔子乖乖"
              className="w-full px-4 py-2.5 bg-white rounded-2xl border-2 border-[#FFDAB9] focus:outline-hidden focus:border-[#FF91A4] text-stone-800 text-sm font-semibold"
            />
            <p className="text-[10px] text-[#A68F8F] mt-1.5 leading-relaxed font-semibold">
              🔒 设定暗号后，他人必须输入正确的暗号方可访问该网页，可以完美隔绝未受邀访客！
            </p>
          </div>

          <div className="pt-2 flex justify-between items-center gap-3">
            {passcode.trim() !== '' && (
              <button
                type="button"
                onClick={() => {
                  sessionStorage.removeItem('bunny_family_unlocked');
                  setIsUnlocked(false);
                  setIsEditTitleModalOpen(false);
                  triggerToast('🔒', '已锁定页面', '日历已进入加密锁定状态。');
                }}
                className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-2xl text-xs font-bold transition-all cursor-pointer border border-rose-200"
              >
                🔒 立即锁定测试
              </button>
            )}
            <div className="flex gap-3 ml-auto">
              <button
                type="button"
                onClick={() => setIsEditTitleModalOpen(false)}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-[#6B4F4F] rounded-2xl text-sm font-bold transition-all cursor-pointer"
              >
                取消
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-[#FF91A4] hover:bg-[#E07080] text-white rounded-2xl text-sm font-bold shadow-xs border-b-2 border-[#C05D6D] hover:border-b-0 transition-all cursor-pointer"
              >
                保存修改 💾
              </button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
