import React, { useState, useEffect, useRef } from 'react';
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
import { playChime } from './utils/audio';

export default function App() {
  // Load initial states from LocalStorage or fall back to defaults
  const [members, setMembers] = useState<FamilyMember[]>(() => {
    const saved = localStorage.getItem('bunny_family_members');
    const parsed = saved ? JSON.parse(saved) : INITIAL_MEMBERS;
    // Auto-migrate "小明" to "咚咚" to handle cached data on old devices (like mobile phones)
    return parsed.map((m: FamilyMember) => {
      if (m.name === '小明') {
        return { ...m, name: '咚咚', role: m.role === '小明' ? '咚咚' : m.role };
      }
      return m;
    });
  });

  const [events, setEvents] = useState<CalendarEvent[]>(() => {
    const saved = localStorage.getItem('bunny_family_events');
    const parsed = saved ? JSON.parse(saved) : INITIAL_EVENTS;
    // Auto-migrate references in titles and descriptions from "小明" to "咚咚"
    return parsed.map((e: CalendarEvent) => ({
      ...e,
      title: e.title.replace(/小明/g, '咚咚'),
      description: e.description ? e.description.replace(/小明/g, '咚咚') : e.description,
    }));
  });

  const [todos, setTodos] = useState<TodoTask[]>(() => {
    const saved = localStorage.getItem('bunny_family_todos');
    const parsed = saved ? JSON.parse(saved) : INITIAL_TODOS;
    // Auto-migrate references in todo titles from "小明" to "咚咚"
    return parsed.map((t: TodoTask) => ({
      ...t,
      title: t.title.replace(/小明/g, '咚咚'),
    }));
  });

  const [alerts, setAlerts] = useState<AlertNotification[]>(() => {
    const saved = localStorage.getItem('bunny_family_alerts');
    const parsed = saved ? JSON.parse(saved) : INITIAL_ALERTS;
    // Auto-migrate references in alert titles and messages from "小明" to "咚咚"
    return parsed.map((a: AlertNotification) => ({
      ...a,
      title: a.title.replace(/小明/g, '咚咚'),
      message: a.message.replace(/小明/g, '咚咚'),
    }));
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
    const saved = localStorage.getItem('bunny_app_description');
    return saved !== null ? saved : '同步家庭日程，管理共同待办，随时拉响萌趣提醒 ✨';
  });
  const [isEditTitleModalOpen, setIsEditTitleModalOpen] = useState(false);

  // ==========================================
  // 🔑 家庭暗号安全锁配置
  // ==========================================
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

  // Notification Permission State
  const [notiPermission, setNotiPermission] = useState<string>(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'default';
  });

  const requestAndTestNotification = async () => {
    // Play the cute audio chime
    playChime();

    if (typeof window === 'undefined' || !('Notification' in window)) {
      triggerToast('🐰', '系统通知不支持', '您的浏览器不支持系统通知，但应用内仍然能通过声音和横幅提醒您！');
      return;
    }

    if (Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      setNotiPermission(permission);
      if (permission === 'granted') {
        new Notification('🐰 兔兔家庭日历', {
          body: '🎉 太棒啦！系统后台提醒已成功开启！离开网页也能收到通知噢。',
          icon: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23FF91A4"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>',
        });
        triggerToast('🔔', '后台提醒开启成功！', '现在即使手机熄屏或退到后台，时间一到也会发出通知栏提示！');
      } else {
        triggerToast('🔒', '您拒绝了通知权限', '如果需要系统通知弹窗，请在浏览器地址栏左侧重新允许通知。');
      }
    } else if (Notification.permission === 'granted') {
      new Notification('🐰 兔兔家庭日历 (测试)', {
        body: '🎵 叮咚！这是一个提醒测试弹窗。您已完美开启后台提醒服务！',
        icon: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23FF91A4"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>',
      });
      triggerToast('🎵', '测试通知已发出！', '听到了吗？系统通知栏也会同步弹出可爱的兔兔日程消息噢！');
    } else {
      triggerToast('🔒', '系统通知已被禁用', '您曾在浏览器中关闭了通知。请点击地址栏的锁扣标志重新允许通知，即可开启！');
    }
  };

  // Export & Deploy Modal State
  const [showExportModal, setShowExportModal] = useState(false);

  // Sync state tracking
  const [lastVersion, setLastVersion] = useState<number>(0);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle');
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(true);

  // Keep a reference to the latest state to avoid stale closure issues in async callbacks
  const stateRef = useRef({
    members,
    events,
    todos,
    alerts,
    activeMemberId,
    appTitle,
    appSubtitle,
    appDescription,
    passcode,
  });

  useEffect(() => {
    stateRef.current = {
      members,
      events,
      todos,
      alerts,
      activeMemberId,
      appTitle,
      appSubtitle,
      appDescription,
      passcode,
    };
  }, [members, events, todos, alerts, activeMemberId, appTitle, appSubtitle, appDescription, passcode]);

  // Load initial data from server on mount
  useEffect(() => {
    const initData = async () => {
      setSyncStatus('syncing');
      try {
        const res = await fetch('/api/sync');
        if (res.ok) {
          const data = await res.json();
          
          // CRITICAL BUG FIX: Prevent stateless server restarts or default DB from wiping user's newer local storage data!
          const localTimestampStr = localStorage.getItem('bunny_data_timestamp');
          const localTimestamp = localTimestampStr ? parseInt(localTimestampStr, 10) : 0;
          const serverTimestamp = data.timestamp || 0;

          // Check if local storage actually contains user-created items
          const hasLocalData = (events && events.length > 0) || (todos && todos.length > 0) || (alerts && alerts.length > 0);
          
          // Check if the server database has empty lists (e.g., from template reset)
          const serverIsEmpty = (!data.events || data.events.length === 0) && 
                                (!data.todos || data.todos.length === 0) && 
                                (!data.alerts || data.alerts.length === 0);

          if (localTimestamp > serverTimestamp || (hasLocalData && serverIsEmpty)) {
            console.log('Local storage has newer changes than server or server database is empty. Uploading local state to heal server data...');
            await fetch('/api/sync', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                members,
                events,
                todos,
                alerts,
                activeMemberId,
                appTitle,
                appSubtitle,
                appDescription,
                passcode,
                timestamp: Math.max(localTimestamp, Date.now()),
                clientLastVersion: serverTimestamp,
              }),
            });
            setSyncStatus('synced');
            setIsInitialLoading(false);
            return;
          }

          // Otherwise, update React states from server DB as normal
          if (data.members && data.members.length > 0) setMembers(data.members);
          if (data.events) setEvents(data.events);
          if (data.todos) setTodos(data.todos);
          if (data.alerts) setAlerts(data.alerts);
          if (data.activeMemberId) setActiveMemberId(data.activeMemberId);
          if (data.appTitle) setAppTitle(data.appTitle);
          if (data.appSubtitle) setAppSubtitle(data.appSubtitle);
          if (data.appDescription) setAppDescription(data.appDescription);
          if (data.passcode) setPasscode(data.passcode);
          setLastVersion(data.version || 0);
          setSyncStatus('synced');
        } else {
          setSyncStatus('error');
        }
      } catch (err) {
        console.error('Failed to pull from server:', err);
        setSyncStatus('error');
      } finally {
        setIsInitialLoading(false);
      }
    };
    initData();
  }, []);

  // Periodic polling for updates from other devices (every 3.5 seconds)
  useEffect(() => {
    let active = true;
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/sync/version');
        if (res.ok && active) {
          const { version } = await res.json();
          if (version > lastVersion) {
            setSyncStatus('syncing');
            const pullRes = await fetch('/api/sync');
            if (pullRes.ok && active) {
              const data = await pullRes.json();

              // Protection: If the server database is completely empty, restore it with local state
              const currentHasData = stateRef.current.events.length > 0 || stateRef.current.todos.length > 0 || stateRef.current.alerts.length > 0;
              const serverIsEmpty = (!data.events || data.events.length === 0) && 
                                    (!data.todos || data.todos.length === 0) && 
                                    (!data.alerts || data.alerts.length === 0);
              
              if (currentHasData && serverIsEmpty) {
                console.warn("Detected server restart/wipe with empty data. Rejecting sync and pushing local state to restore server.");
                await fetch('/api/sync', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    members: stateRef.current.members,
                    events: stateRef.current.events,
                    todos: stateRef.current.todos,
                    alerts: stateRef.current.alerts,
                    activeMemberId: stateRef.current.activeMemberId,
                    appTitle: stateRef.current.appTitle,
                    appSubtitle: stateRef.current.appSubtitle,
                    appDescription: stateRef.current.appDescription,
                    passcode: stateRef.current.passcode,
                    timestamp: Date.now(),
                    clientLastVersion: data.version,
                  }),
                });
                setLastVersion(Date.now());
                setSyncStatus('synced');
                return;
              }

              setMembers(data.members);
              setEvents(data.events);
              setTodos(data.todos);
              setAlerts(data.alerts);
              setActiveMemberId(data.activeMemberId);
              setAppTitle(data.appTitle);
              setAppSubtitle(data.appSubtitle);
              setAppDescription(data.appDescription);
              setPasscode(data.passcode);
              setLastVersion(data.version);
              setSyncStatus('synced');
              triggerToast('🔄', '数据已更新', '检测到其他设备上的修改，已实时同步。');
            } else {
              setSyncStatus('error');
            }
          }
        }
      } catch (e) {
        console.warn('Sync poll failed:', e);
      }
    }, 3500);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [lastVersion]);

  // Helper to determine if an event occurs on a given date (supporting daily/weekly/custom recurring)
  const isEventOnDate = (event: CalendarEvent, targetDateStr: string, d: Date): boolean => {
    if (targetDateStr < event.date) return false;

    if (!event.recurrence || event.recurrence === 'none') {
      if (event.endDate && event.endDate !== event.date) {
        return targetDateStr >= event.date && targetDateStr <= event.endDate;
      }
      return event.date === targetDateStr;
    }

    if (event.recurrence === 'daily') {
      return true;
    }

    if (event.recurrence === 'weekly') {
      const parts = event.date.split('-').map(Number);
      const startDay = new Date(parts[0], parts[1] - 1, parts[2]).getDay();
      return d.getDay() === startDay;
    }

    if (event.recurrence === 'custom_weekly' && event.recurrenceDays) {
      return event.recurrenceDays.includes(d.getDay());
    }

    return false;
  };

  // Background check for upcoming calendar events (1h, 30m, 15m, or at-time)
  useEffect(() => {
    if (isInitialLoading) return;

    const checkInterval = setInterval(() => {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const todayStr = `${year}-${month}-${day}`; // YYYY-MM-DD
      const currentHM = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0'); // HH:MM
      const nowMs = now.getTime();

      let updated = false;
      const nextEvents = events.map((event) => {
        // Only consider timed events (not all-day)
        if (event.isAllDay || !event.time || event.time === '全天' || !event.time.includes(':')) {
          return event;
        }

        // Determine configured reminder timing
        const timing = event.reminderTiming || (event.reminderSent === false ? 'at_time' : 'none');
        if (timing === 'none') return event;

        // Check if event happens today
        if (!isEventOnDate(event, todayStr, now)) return event;

        const [eh, em] = event.time.split(':').map(Number);
        if (isNaN(eh) || isNaN(em)) return event;

        const eventStartMs = new Date(now.getFullYear(), now.getMonth(), now.getDate(), eh, em, 0, 0).getTime();

        let offsetMs = 0;
        let timingLabel = '准时';
        let timingMsg = '现在已经到时间啦！';
        let timingTag = 'at_time';

        if (timing === '15m') {
          offsetMs = 15 * 60 * 1000;
          timingLabel = '提前15分钟';
          timingMsg = '还有 15 分钟就要开始啦！';
          timingTag = '15m';
        } else if (timing === '30m') {
          offsetMs = 30 * 60 * 1000;
          timingLabel = '提前30分钟';
          timingMsg = '还有 30 分钟就要开始啦！';
          timingTag = '30m';
        } else if (timing === '1h') {
          offsetMs = 60 * 60 * 1000;
          timingLabel = '提前1小时';
          timingMsg = '还有 1 个小时就要开始啦！';
          timingTag = '1h';
        }

        const targetTriggerMs = eventStartMs - offsetMs;
        const diff = nowMs - targetTriggerMs;

        // Fire if current time is within [0s, 90s] past target reminder trigger timestamp
        if (diff >= 0 && diff < 90 * 1000) {
          const sentKey = `bunny_reminded_${event.id}_${todayStr}_${timingTag}`;
          if (localStorage.getItem(sentKey) === 'true' || sessionStorage.getItem(sentKey) === 'true') {
            return event;
          }

          localStorage.setItem(sentKey, 'true');
          sessionStorage.setItem(sentKey, 'true');
          updated = true;

          // 1. Play synthesized pleasant bell melody
          playChime();

          // 2. Trigger custom in-app Toast
          const assocMember = members.find((m) => m.id === event.memberId);
          triggerToast(
            assocMember?.avatar || '⏰',
            `家庭日程提醒 (${timingLabel}) 🔔`,
            `【${event.title}】${timingMsg}（安排时间：${event.time}）`
          );

          // 3. System HTML5 Notification
          if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
            new Notification(`🐰 兔兔日历提醒：【${event.title}】`, {
              body: `⏰ ${timingMsg}（安排时间：${event.time}）\n${event.description || '全家人都要快快准备好哦 🥕'}`,
              tag: `${event.id}-${todayStr}-${timingTag}`,
            });
          }

          // 4. Log in shared family alerts stream
          const alertId = `alert-${Date.now()}`;
          const alert: AlertNotification = {
            id: alertId,
            time: currentHM,
            title: `⏰ 日程提醒 (${timingLabel})`,
            message: `日程【${event.title}】${timingMsg} 安排时间：${event.time}`,
            memberId: event.memberId === 'all' ? 'member-4' : event.memberId,
            type: 'event',
            timestamp: new Date().toISOString(),
          };

          setTimeout(() => {
            setAlerts((prev) => [alert, ...prev].slice(0, 50));
          }, 10);

          return { ...event, reminderSent: true };
        }

        return event;
      });

      if (updated) {
        setEvents(nextEvents);
      }
    }, 5000); // Check every 5 seconds for precision timing

    return () => clearInterval(checkInterval);
  }, [events, members, isInitialLoading]);

  // Debounced saver to Server & Local Storage
  useEffect(() => {
    if (isInitialLoading) return;

    const newTimestamp = Date.now();

    const handler = setTimeout(async () => {
      setSyncStatus('syncing');
      try {
        const response = await fetch('/api/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            members,
            events,
            todos,
            alerts,
            activeMemberId,
            appTitle,
            appSubtitle,
            appDescription,
            passcode,
            timestamp: newTimestamp,
            clientLastVersion: lastVersion,
          }),
        });
        if (response.ok) {
          const data = await response.json();
          setLastVersion(data.version);
          setSyncStatus('synced');
        } else {
          setSyncStatus('error');
        }
      } catch (err) {
        console.error('Failed to sync to server:', err);
        setSyncStatus('error');
      }
    }, 1200);

    localStorage.setItem('bunny_data_timestamp', newTimestamp.toString());
    localStorage.setItem('bunny_family_members', JSON.stringify(members));
    localStorage.setItem('bunny_family_events', JSON.stringify(events));
    localStorage.setItem('bunny_family_todos', JSON.stringify(todos));
    localStorage.setItem('bunny_family_alerts', JSON.stringify(alerts));
    localStorage.setItem('bunny_family_active_id', activeMemberId);
    localStorage.setItem('bunny_app_title', appTitle);
    localStorage.setItem('bunny_app_subtitle', appSubtitle);
    localStorage.setItem('bunny_app_description', appDescription);
    localStorage.setItem('bunny_family_passcode', passcode);

    if (events.length > 0 || todos.length > 0 || alerts.length > 0) {
      localStorage.setItem('bunny_family_data_backup', JSON.stringify({
        members,
        events,
        todos,
        alerts,
        activeMemberId,
        appTitle,
        appSubtitle,
        appDescription,
        passcode,
        timestamp: newTimestamp
      }));
    }

    return () => clearTimeout(handler);
  }, [members, events, todos, alerts, activeMemberId, appTitle, appSubtitle, appDescription, passcode, isInitialLoading]);

  // Trigger custom toast notification
  const triggerToast = (avatar: string, title: string, message: string) => {
    const id = Date.now().toString();
    setToast({ id, avatar, title, message });
    setTimeout(() => {
      setToast((prev) => (prev?.id === id ? null : prev));
    }, 4000);
  };

  // Member Handlers
  const handleAddMember = (newMember: Omit<FamilyMember, 'id'>) => {
    const id = `member-${Date.now()}`;
    const added: FamilyMember = { ...newMember, id };
    setMembers((prev) => [...prev, added]);
    
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
    if (activeMemberId === id) {
      setActiveMemberId(members[0]?.id || 'member-2');
    }

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

  // Calendar Event Handlers
  const handleAddEvent = (newEvent: Omit<CalendarEvent, 'id'>) => {
    const id = `event-${Date.now()}`;
    const added: CalendarEvent = { ...newEvent, id, reminderSent: false };
    setEvents((prev) => [...prev, added]);

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
    setEvents((prev) => prev.map((e) => (e.id === updated.id ? { ...updated, reminderSent: false } : e)));
    
    const sender = members.find((m) => m.id === activeMemberId);
    triggerToast(sender?.avatar || '🐰', '日程已修改 ✏️', `"${updated.title}" 的详情已被更新。`);
  };

  const handleDeleteEvent = (id: string) => {
    const event = events.find((e) => e.id === id);
    if (!event) return;

    setEvents((prev) => prev.filter((e) => e.id !== id));
    triggerToast('🗑️', '日程已取消', `"${event.title}" 已经从日历中移除。`);
  };

  // Todo Handlers
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

  // Alert Handlers
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
        
        {/* Urgent Recovery Alert Banner */}
        {typeof window !== "undefined" && localStorage.getItem("bunny_family_data_backup") && (events.length === 0 || todos.length === 0) && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-amber-50 border-4 border-amber-300 rounded-[2rem] p-5 sm:p-6 shadow-md flex flex-col sm:flex-row items-center justify-between gap-4 border-b-8 border-b-amber-400"
          >
            <div className="flex items-center gap-3.5 text-left">
              <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center text-2xl shrink-0 animate-bounce">
                🪄
              </div>
              <div className="flex-1">
                <h3 className="font-black text-amber-900 text-sm sm:base flex items-center gap-1.5">
                  发现可恢复的家庭数据备份！ ✨
                </h3>
                <p className="text-xs text-amber-700 font-semibold mt-1 leading-relaxed">
                  检测到您之前手动添加过日程/待办，但当前由于服务器重启已被重设。我们可以立即帮您一键还原！
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={async () => {
                try {
                  const savedBackup = localStorage.getItem("bunny_family_data_backup");
                  if (savedBackup) {
                    const backup = JSON.parse(savedBackup);
                    if (backup.members && backup.members.length > 0) setMembers(backup.members);
                    if (backup.events) setEvents(backup.events);
                    if (backup.todos) setTodos(backup.todos);
                    if (backup.alerts) setAlerts(backup.alerts);
                    if (backup.appTitle) setAppTitle(backup.appTitle);
                    if (backup.appSubtitle) setAppSubtitle(backup.appSubtitle);
                    if (backup.appDescription) setAppDescription(backup.appDescription);
                    if (backup.passcode) setPasscode(backup.passcode);
                    
                    setSyncStatus("syncing");
                    await fetch("/api/sync", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        members: backup.members,
                        events: backup.events,
                        todos: backup.todos,
                        alerts: backup.alerts,
                        activeMemberId: backup.activeMemberId || activeMemberId,
                        appTitle: backup.appTitle || appTitle,
                        appSubtitle: backup.appSubtitle || appSubtitle,
                        appDescription: backup.appDescription || appDescription,
                        passcode: backup.passcode || passcode,
                        timestamp: Date.now(),
                        clientLastVersion: 0,
                      }),
                    });
                    triggerToast("🎉", "数据完美还原！", "所有日程、待办与成员资料已安全找回并推送到服务器。");
                  }
                } catch (e) {
                  console.error("Failed to restore backup:", e);
                  triggerToast("❌", "还原失败", "解析备份数据时发生错误。");
                }
              }}
              className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white font-black text-xs sm:text-sm rounded-xl shadow-md transition-all cursor-pointer whitespace-nowrap active:scale-95 shrink-0"
            >
              🪄 立即一键恢复我的所有数据
            </button>
          </motion.div>
        )}

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
                
                {/* Realtime Sync Status Badge */}
                <span className={`inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full border transition-all ${
                  syncStatus === 'synced' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                  syncStatus === 'syncing' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                  syncStatus === 'error' ? 'bg-rose-50 text-rose-600 border-rose-200' :
                  'bg-stone-50 text-stone-500 border-stone-200'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    syncStatus === 'synced' ? 'bg-emerald-500' :
                    syncStatus === 'syncing' ? 'bg-amber-500 animate-pulse' :
                    syncStatus === 'error' ? 'bg-rose-500' :
                    'bg-stone-400'
                  }`} />
                  <span>
                    {syncStatus === 'synced' ? '多端已同步 🌍' :
                     syncStatus === 'syncing' ? '同步中...' :
                     syncStatus === 'error' ? '同步出错' : '已就绪'}
                  </span>
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
            {/* Notification Setup Button */}
            <button
              onClick={requestAndTestNotification}
              className={`flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black shadow-xs transition-all duration-200 cursor-pointer w-full md:w-auto border-2 ${
                notiPermission === 'granted'
                  ? 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100/60'
                  : notiPermission === 'denied'
                  ? 'bg-rose-50 text-rose-500 border-rose-200 hover:bg-rose-100/60'
                  : 'bg-amber-50 text-amber-600 border-[#FFDAB9] hover:bg-amber-100/50'
              }`}
              title="设置或测试家庭日程后台弹窗提醒"
            >
              <Bell className={`w-4 h-4 ${notiPermission === 'granted' ? 'text-emerald-500' : 'text-amber-500 animate-swing'}`} />
              <span>
                {notiPermission === 'granted'
                  ? '后台提醒已开启 (点击测试 🎵)'
                  : notiPermission === 'denied'
                  ? '提醒已被禁用 (点击测试 🎵)'
                  : '开启后台弹窗提醒 🔔'}
              </span>
            </button>
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

        {/* Workspace Body */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
          <aside className="lg:col-span-4 flex flex-col gap-6">
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
            <div className="h-[310px]">
              <RemindersList
                alerts={alerts}
                members={members}
                activeMemberId={activeMemberId}
                onSendAlert={handleSendAlert}
              />
            </div>
          </aside>

          <main className="lg:col-span-8 flex flex-col gap-6">
            <BunnyAssistant />
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
              <button
                onClick={() => setShowExportModal(false)}
                className="absolute top-6 right-6 p-2 rounded-full bg-[#FFF0F0] text-[#A68F8F] hover:text-[#FF91A4] hover:scale-105 transition-all duration-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

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

              <div className="bg-[#FFF9F2] rounded-2xl p-4 border border-[#FFDAB9]/50 mb-6 text-xs leading-relaxed font-semibold">
                <p className="text-[#FF91A4] font-black mb-1">📢 为什么需要独立部署？</p>
                因为 Google 的安全准则限制，AI Studio 默认的预览链接开启了 Googler 权限验证，外部家人打开会显示 <code className="bg-white px-1.5 py-0.5 rounded border border-[#FFDAB9] text-xs font-mono text-red-500 font-bold">403 Forbidden</code>。
                通过将项目部署到托管平台 <strong className="text-stone-800">Render</strong> 或 <strong className="text-stone-800">Vercel</strong>，全家在手机或国内网络上无需 VPN 就能秒开！
              </div>

              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-6 h-6 rounded-full bg-[#FF91A4] text-white flex items-center justify-center text-xs font-bold">1</span>
                  <h3 className="font-black text-sm">一键下载项目全部源代码</h3>
                </div>
                <div className="pl-8">
                  <p className="text-xs text-[#A68F8F] font-bold mb-3">
                    里面包含运行本应用所需的全部设置。
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
                  </div>
                </div>
              </div>

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
              placeholder="同步家庭日程，管理共同待办，随时拉响萌趣提醒 ✨"
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
