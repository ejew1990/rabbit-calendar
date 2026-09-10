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
import { exportEventToCalendar } from './utils/calendarExport';

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

  // Notification Permission State
  const [notiPermission, setNotiPermission] = useState<string>(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'default';
  });

  const [activeReminderAlert, setActiveReminderAlert] = useState<{
    event: CalendarEvent;
    timingLabel: string;
    timingMsg: string;
  } | null>(null);
  const [showPhoneHelpModal, setShowPhoneHelpModal] = useState(false);

  // Helper to send notification to the mobile phone's notification bar
  const sendSystemNotification = (title: string, body: string, tag?: string) => {
    try {
      if (typeof window === 'undefined' || !('Notification' in window)) return;
      if (Notification.permission !== 'granted') return;

      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then((reg) => {
          reg.showNotification(title, {
            body,
            icon: '/icon.svg',
            badge: '/icon.svg',
            tag: tag || 'bunny-calendar',
          });
        }).catch(() => {
          new Notification(title, { body, icon: '/icon.svg', tag });
        });
      } else {
        new Notification(title, { body, icon: '/icon.svg', tag });
      }
    } catch (e) {
      console.warn('Notification error:', e);
    }
  };

  const requestAndTestNotification = async () => {
    // Play the cute audio chime & vibrate
    playChime(0.7);
    setShowPhoneHelpModal(true);

    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        try {
          const permission = await Notification.requestPermission();
          setNotiPermission(permission);
          if (permission === 'granted') {
            sendSystemNotification('🐰 兔兔家庭日历', '🎉 太棒啦！手机通知栏提醒已成功开启！');
            triggerToast('🔔', '通知栏提醒已开启！', '时间一到就会推送到手机顶部通知栏。');
          }
        } catch (e) {
          console.warn('Failed to request notification permission:', e);
        }
      } else if (Notification.permission === 'granted') {
        sendSystemNotification('🐰 兔兔家庭日历 (测试)', '🎵 叮咚！这是一个手机通知栏测试消息。您的通知功能一切正常！');
      }
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

              // Protection: If the server database is completely empty (e.g. due to server restart/wipe),
              // but we have active data in our current state, do NOT let the empty database overwrite our data.
              // Instead, we should trigger a push to restore the server's database!
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

        // Fire if current time is within [0s, 2 hours] past target reminder trigger timestamp
        // so that if the user unlocks the phone or opens the app after the event time, it still alerts them!
        if (diff >= 0 && diff < 2 * 3600 * 1000) {
          const sentKey = `bunny_reminded_${event.id}_${todayStr}_${timingTag}`;
          if (localStorage.getItem(sentKey) === 'true' || sessionStorage.getItem(sentKey) === 'true') {
            return event;
          }

          localStorage.setItem(sentKey, 'true');
          sessionStorage.setItem(sentKey, 'true');
          updated = true;

          // 1. Play synthesized pleasant bell melody & vibrate
          playChime(0.7);

          // 2. Pop up high-priority in-app Reminder Alert Modal (unmissable)
          setActiveReminderAlert({
            event,
            timingLabel,
            timingMsg,
          });

          // 3. Trigger custom in-app Toast
          const assocMember = members.find((m) => m.id === event.memberId);
          triggerToast(
            assocMember?.avatar || '⏰',
            `家庭日程提醒 (${timingLabel}) 🔔`,
            `【${event.title}】${timingMsg}（安排时间：${event.time}）`
          );

          // 4. Send to mobile phone's notification bar (ServiceWorker / Notification)
          sendSystemNotification(
            `🐰 兔兔日历提醒：【${event.title}】`,
            `⏰ ${timingMsg}（安排时间：${event.time}）\n${event.description || '全家人都要快快准备好哦 🥕'}`,
            `${event.id}-${todayStr}-${timingTag}`
          );

          // 5. Log in shared family alerts stream
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

  // Combined debounce saver to Server (updates both local storage as a backup and the cloud server)
  useEffect(() => {
    if (isInitialLoading) return; // Prevent saving default/empty state over server database on mount

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
    }, 1200); // 1.2s debounce to aggregate quick changes

    // Also write to local storage as safety backup
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

    // Create a persistent history backup in local storage that is NEVER overwritten by empty arrays
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
    const added: CalendarEvent = { ...newEvent, id, reminderSent: false };
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
                <h3 className="font-black text-amber-900 text-sm sm:text-base flex items-center gap-1.5">
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

              {/* Step 3: Deploy Full-Stack Node Server */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-6 h-6 rounded-full bg-[#FF91A4] text-white flex items-center justify-center text-xs font-bold">3</span>
                  <h3 className="font-black text-sm">选择免费平台发布上线 (推荐 Render 以支持多端实时同步)</h3>
                </div>
                <div className="pl-8 space-y-2 text-xs leading-relaxed font-semibold">
                  <p className="text-[#A68F8F] font-bold">
                    因为我们升级了全新的 Node.js 后端服务来实现多设备实时同步，建议选择支持运行后端的平台：
                  </p>
                  
                  <div className="bg-emerald-50/50 p-3 rounded-xl border border-emerald-100 mb-2">
                    <p className="text-[#065F46] font-bold mb-1.5">🌟 推荐方案：发布至 Render (完全支持多端实时同步)：</p>
                    <ol className="list-decimal list-inside space-y-1.5 pl-1 text-stone-700">
                      <li>访问 <a href="https://render.com" target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:underline font-bold inline-flex items-center gap-0.5">render.com <Globe className="w-3 h-3" /></a> 并选择 GitHub 登录。</li>
                      <li>在 Dashboard 点击 <strong className="font-bold">New +</strong> 并选择 <strong className="font-bold">Web Service</strong>。</li>
                      <li>连接你的 GitHub 账号，导入你新建的 <code className="bg-white px-1.5 py-0.5 rounded border border-stone-200 font-mono text-xs">rabbit-calendar</code> 仓库。</li>
                      <li>在配置页中：
                        <ul className="list-disc list-inside pl-4 mt-1 space-y-0.5 text-stone-600">
                          <li>Build Command: <code className="bg-white px-1 py-0.5 rounded font-mono text-xs text-stone-800">npm run build</code></li>
                          <li>Start Command: <code className="bg-white px-1 py-0.5 rounded font-mono text-xs text-stone-800">npm run start</code></li>
                        </ul>
                      </li>
                      <li>点击最下方的 <strong className="font-bold text-white bg-stone-900 px-3 py-1 rounded-lg">Deploy Web Service</strong>。稍等 2 分钟构建完成后，你就能获得一个支持多设备、实时保存、完全同步的线上家庭日历啦！✨</li>
                    </ol>
                  </div>

                  <div className="bg-stone-50 p-3 rounded-xl border border-stone-200">
                    <p className="text-stone-700 font-bold mb-1.5">🎈 备用方案：发布至 Vercel (仅支持单机离线使用)：</p>
                    <ol className="list-decimal list-inside space-y-1 pl-1 text-stone-600">
                      <li>访问 <a href="https://vercel.com" target="_blank" rel="noopener noreferrer" className="text-[#FF91A4] hover:underline font-bold">vercel.com</a>，通过 GitHub 登录并导入仓库。</li>
                      <li>Framework Preset 确认为 <strong className="font-bold">Vite</strong>，直接点击 <strong className="font-bold">Deploy</strong> 部署。</li>
                      <li>注意：由于 Vercel 是无状态的静态平台，该方案仅限单机在浏览器 LocalStorage 中保存，无法在不同手机设备间实时同步日程。</li>
                    </ol>
                  </div>
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
            <p className="text-[10px] text-[#A68F8F] mt-1.5 leading-relaxed font-semibold">
              🔒 设定暗号后，他人必须输入正确的暗号方可访问该网页，可以完美隔绝未受邀访客！
            </p>
          </div>

          {/* Recovery backup block */}
          {typeof window !== 'undefined' && localStorage.getItem('bunny_family_data_backup') && (
            <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-3.5 space-y-2 mt-2">
              <div className="text-xs font-bold text-amber-800 flex items-center gap-1.5">
                <Sparkles className="w-4.5 h-4.5 text-amber-500 animate-pulse" />
                <span>发现本地自动备份！</span>
              </div>
              <p className="text-[10px] text-amber-700 font-semibold leading-relaxed">
                如果您输入的数据因网络或容器重启而清空，可一键将其还原并重新推送到服务器上哦。
              </p>
              <button
                type="button"
                onClick={async () => {
                  try {
                    const savedBackup = localStorage.getItem('bunny_family_data_backup');
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
                      
                      // Push to server immediately
                      setSyncStatus('syncing');
                      await fetch('/api/sync', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
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
                      
                      setIsEditTitleModalOpen(false);
                      triggerToast('🎉', '备份已成功还原！', '所有日程、待办与成员资料已重新推送到服务器。');
                    }
                  } catch (e) {
                    console.error('Failed to restore backup:', e);
                    triggerToast('❌', '还原失败', '解析备份数据时发生未知错误。');
                  }
                }}
                className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-white font-black text-xs rounded-xl shadow-xs transition-all cursor-pointer"
              >
                🪄 立即一键恢复我的所有数据
              </button>
            </div>
          )}

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

      {/* 🔔 High-Priority In-App Reminder Alert Modal (Unmissable) */}
      {activeReminderAlert && (
        <Modal
          isOpen={true}
          onClose={() => setActiveReminderAlert(null)}
          title="🔔 兔兔家庭日程时间到啦！"
        >
          <div className="flex flex-col items-center text-center gap-4 py-2">
            <div className="w-16 h-16 bg-rose-100 rounded-3xl flex items-center justify-center text-4xl animate-bounce shadow-inner border-2 border-rose-300">
              ⏰
            </div>
            <div>
              <div className="inline-block bg-rose-100 text-rose-600 text-xs font-black px-3 py-1 rounded-full mb-2">
                {activeReminderAlert.timingLabel} · {activeReminderAlert.timingMsg}
              </div>
              <h3 className="text-xl font-black text-[#6B4F4F]">
                【{activeReminderAlert.event.title}】
              </h3>
              <p className="text-sm text-[#FF91A4] font-bold mt-1">
                安排时间：{activeReminderAlert.event.date} {activeReminderAlert.event.time}
              </p>
              {activeReminderAlert.event.location && (
                <p className="text-xs text-stone-600 font-semibold mt-1 flex items-center justify-center gap-1">
                  📍 地点：{activeReminderAlert.event.location}
                </p>
              )}
              {activeReminderAlert.event.description && (
                <p className="text-xs text-stone-500 mt-2 bg-stone-50 p-3 rounded-xl border border-stone-200 text-left">
                  {activeReminderAlert.event.description}
                </p>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5 w-full mt-2">
              <button
                type="button"
                onClick={() => {
                  playChime(0.7);
                }}
                className="flex-1 py-2.5 px-3 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-xl font-bold text-xs border border-amber-200 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <span>🔊 再响一次铃声</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  exportEventToCalendar(activeReminderAlert.event);
                  playChime(0.5);
                }}
                className="flex-1 py-2.5 px-3 bg-rose-50 hover:bg-rose-100 text-[#FF91A4] rounded-xl font-bold text-xs border border-[#FFDAB9] flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <span>📱 存入手机系统日历</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setActiveReminderAlert(null)}
              className="w-full py-3 bg-[#FF91A4] hover:bg-[#E07080] text-white rounded-2xl font-black text-sm shadow-md transition-all cursor-pointer active:scale-95"
            >
              我知道啦 🥕
            </button>
          </div>
        </Modal>
      )}

      {/* 📱 Phone Reminder Diagnostic & Guide Modal */}
      {showPhoneHelpModal && (
        <Modal
          isOpen={true}
          onClose={() => setShowPhoneHelpModal(false)}
          title="📱 手机端提醒测试与声音排查"
        >
          <div className="space-y-4 text-left">
            <div className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-3.5 flex items-center gap-3">
              <span className="text-2xl shrink-0">🎵</span>
              <div>
                <p className="text-xs font-black text-emerald-800">
                  刚才听到清脆的兔兔叮咚声了吗？
                </p>
                <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">
                  如果听到了，说明手机 Web 音频引擎正常工作！
                </p>
              </div>
              <button
                type="button"
                onClick={() => playChime(0.7)}
                className="ml-auto px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold shrink-0 cursor-pointer shadow-xs"
              >
                再听一次
              </button>
            </div>

            <div className="space-y-2.5 text-xs text-[#6B4F4F]">
              <div className="bg-amber-50 p-3 rounded-xl border border-amber-200">
                <p className="font-black text-amber-900 mb-1">
                  1. 为什么 iPhone 没声音？ (99% 的原因)
                </p>
                <p className="text-amber-800 leading-relaxed font-semibold">
                  请检查 iPhone 手机左上侧的<strong>物理静音按键</strong>是否露出橙色/红标！在静音模式下，苹果系统会强制静音所有网页音频。拨回响铃模式并按音量加键即可听到。
                </p>
              </div>

              <div className="bg-rose-50 p-3 rounded-xl border border-rose-200">
                <p className="font-black text-rose-900 mb-1">
                  2. 为什么手机熄屏/锁屏后收不到提醒？
                </p>
                <p className="text-rose-800 leading-relaxed font-semibold">
                  苹果 iOS 和安卓系统为了省电和安全，在手机锁屏后约 15 秒会自动冻结浏览器后台脚本（任何网页都无法在后台私自唤醒屏幕）。
                </p>
              </div>

              <div className="bg-sky-50 p-3.5 rounded-xl border border-sky-200">
                <p className="font-black text-sky-900 mb-1 flex items-center gap-1">
                  <span>✨ 终极解决方案：一键同步到系统日历</span>
                </p>
                <p className="text-sky-800 leading-relaxed font-semibold mb-2">
                  每个日程卡片上都有一个 <span className="bg-white px-1.5 py-0.5 rounded border border-sky-300 font-bold">📱 存日历</span> 按钮，点一下就会调用 iPhone 自带日历或安卓系统日历，直接设置系统原生闹钟！即使锁屏、关掉网页，手机到点也会大声响铃！
                </p>
                <button
                  type="button"
                  onClick={() => {
                    sendSystemNotification('🐰 兔兔家庭日历 (通知栏测试)', '🎵 叮咚！这是一条发送到手机顶部通知栏的测试消息！');
                    triggerToast('📱', '已发送到通知栏！', '请划开手机顶部或锁屏查看通知卡片。');
                  }}
                  className="w-full mb-2 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-xs text-center"
                >
                  📱 点击发送一条测试消息到手机通知栏
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveReminderAlert({
                      event: {
                        id: 'demo-alert',
                        title: '🥕 演示测试日程：全家享用美味晚餐',
                        date: new Date().toISOString().split('T')[0],
                        time: '19:00',
                        category: 'dinner',
                        memberId: activeMemberId,
                        isAllDay: false,
                        reminderTiming: '15m',
                        location: '家里客厅',
                        description: '这是一个提醒弹窗的预览演示效果，非常醒目！',
                      },
                      timingLabel: '提前15分钟',
                      timingMsg: '演示提醒测试',
                    });
                    setShowPhoneHelpModal(false);
                    playChime(0.7);
                  }}
                  className="w-full py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-xs text-center"
                >
                  🔔 点击模拟一次真实的到点强提醒弹窗
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowPhoneHelpModal(false)}
              className="w-full py-2.5 bg-[#FF91A4] hover:bg-[#E07080] text-white rounded-xl text-xs font-black transition-all cursor-pointer"
            >
              我知道啦，关闭 🥕
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
