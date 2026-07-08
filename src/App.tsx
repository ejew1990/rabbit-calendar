import { useState, useEffect } from 'react';
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
import { Heart, Bell, Calendar as CalendarIcon, Sparkles } from 'lucide-react';
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

  // Toast Notification State
  const [toast, setToast] = useState<{ id: string; avatar: string; message: string; title: string } | null>(null);

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
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-[#6B4F4F] tracking-tight flex items-center gap-1.5">
                <span>兔兔家庭日历</span>
                <span className="text-xs bg-[#FFDAB9]/50 text-[#FF91A4] font-bold px-2 py-0.5 rounded-full">
                  共享小窝 🐰
                </span>
              </h1>
              <p className="text-xs sm:text-sm text-[#A68F8F] font-semibold">
                同步蜜糖家庭日程，管理共同待办，随时拉响萌趣提醒 ✨
              </p>
            </div>
          </div>

          {/* Member selector block */}
          <div className="w-full md:w-auto flex flex-col md:flex-row md:items-center gap-4 border-t md:border-t-0 border-stone-100 pt-4 md:pt-0">
            <MemberSelector
              members={members}
              activeMemberId={activeMemberId}
              onSelectMember={setActiveMemberId}
              onAddMember={handleAddMember}
              onDeleteMember={handleDeleteMember}
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
        <footer className="text-center py-4 border-t border-[#FFDAB9]/40 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-[#A68F8F] font-bold">
          <div className="flex items-center gap-1.5">
            <Heart className="w-3.5 h-3.5 text-[#FF91A4] fill-[#FF91A4]" />
            <span>兔兔家园日历守护中：一家人就是要整整齐齐 ❤️</span>
          </div>
          <div>
            <span>当前发言人头像: {activeSpokesperson?.avatar} {activeSpokesperson?.name} ({activeSpokesperson?.role})</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
