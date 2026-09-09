import React, { useState } from 'react';
import { CalendarEvent, FamilyMember, ReminderTiming } from '../types';
import { ChevronLeft, ChevronRight, Plus, Trash2, Clock, Calendar, Check, MapPin, Bell, Volume2 } from 'lucide-react';
import Modal from './Modal';
import { playChime } from '../utils/audio';

interface CalendarViewProps {
  events: CalendarEvent[];
  members: FamilyMember[];
  activeMemberId: string;
  onAddEvent: (event: Omit<CalendarEvent, 'id'>) => void;
  onUpdateEvent: (event: CalendarEvent) => void;
  onDeleteEvent: (id: string) => void;
}

const CATEGORY_LABELS = {
  life: '生活日常 🏡',
  study: '学习成长 📚',
  work: '工作安排 💼',
  important: '重要日子 🔔',
  birthday: '生日聚会 🎂',
  other: '其他事务 🐰',
};

const CATEGORY_COLORS = {
  life: { bg: '#E8F7F2', border: '#8ACBB5', text: '#065F46' },
  study: { bg: '#FFFCEB', border: '#E6D478', text: '#78350F' },
  work: { bg: '#E8F4F8', border: '#76BBD9', text: '#1E40AF' },
  important: { bg: '#FFF0F0', border: '#FF91A4', text: '#9C1A3C' },
  birthday: { bg: '#FFF0F5', border: '#FF91A4', text: '#C026D3' },
  other: { bg: '#F3F4F6', border: '#9CA3AF', text: '#374151' },
};

export default function CalendarView({
  events,
  members,
  activeMemberId,
  onAddEvent,
  onUpdateEvent,
  onDeleteEvent,
}: CalendarViewProps) {
  // Get dynamic local dates so the calendar automatically adapts to real time
  const getTodayStr = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const date = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${date}`;
  };
  const TODAY_STR = getTodayStr();

  const getTodayChineseLabel = (dateStr: string) => {
    try {
      const parts = dateStr.split('-');
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      const weekDays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
      const weekDayStr = weekDays[d.getDay()];
      return `${parts[0]}年${parts[1]}月${parts[2]}日 ${weekDayStr}`;
    } catch (e) {
      return dateStr;
    }
  };

  const [currentYear, setCurrentYear] = useState(() => new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(() => new Date().getMonth()); // 0-indexed

  const [selectedDate, setSelectedDate] = useState<string>(TODAY_STR); // Selected tile
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form states for new event
  const [formTitle, setFormTitle] = useState('');
  const [formTime, setFormTime] = useState('10:00');
  const [formMemberId, setFormMemberId] = useState(activeMemberId);
  const [formCategory, setFormCategory] = useState<CalendarEvent['category']>('life');
  const [formDescription, setFormDescription] = useState('');
  const [formIsAllDay, setFormIsAllDay] = useState(false);
  const [formIsMultiDay, setFormIsMultiDay] = useState(false);
  const [formEndDate, setFormEndDate] = useState('');
  const [formLocation, setFormLocation] = useState('');
  const [showSmartPaste, setShowSmartPaste] = useState(false);
  const [smartPasteText, setSmartPasteText] = useState('');
  const [formRecurrence, setFormRecurrence] = useState<'none' | 'daily' | 'weekly' | 'custom_weekly'>('none');
  const [formRecurrenceDays, setFormRecurrenceDays] = useState<number[]>([]);
  const [formReminderTiming, setFormReminderTiming] = useState<ReminderTiming>('none');

  // Form state for editing
  const [editingEventId, setEditingEventId] = useState<string | null>(null);

  const REMINDER_OPTIONS: { value: ReminderTiming; label: string; desc: string }[] = [
    { value: 'none', label: '不提醒', desc: '无提醒' },
    { value: '15m', label: '提前 15 分钟', desc: '提前15分钟' },
    { value: '30m', label: '提前 30 分钟', desc: '提前半小时' },
    { value: '1h', label: '提前 1 个小时', desc: '提前1小时' },
    { value: 'at_time', label: '准时提醒', desc: '到点提醒' },
  ];

  const getReminderBadgeLabel = (timing?: ReminderTiming) => {
    if (!timing || timing === 'none') return null;
    if (timing === '15m') return '🔔 提前15分';
    if (timing === '30m') return '🔔 提前30分';
    if (timing === '1h') return '🔔 提前1小时';
    if (timing === 'at_time') return '🔔 准时提醒';
    return null;
  };

  // Helper to safely get the day of the week in local time (0 is Sunday, 1 is Monday ... 6 is Saturday)
  const getDayOfWeek = (dateStr: string) => {
    try {
      const parts = dateStr.split('-');
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      return d.getDay();
    } catch (e) {
      return 0;
    }
  };

  // Helper to get beautiful recurrence label for displays
  const getRecurrenceLabel = (event: CalendarEvent) => {
    if (!event.recurrence || event.recurrence === 'none') return null;
    if (event.recurrence === 'daily') return '🔁 每天重复';
    if (event.recurrence === 'weekly') {
      const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
      const dayName = days[getDayOfWeek(event.date)];
      return `🔁 每周 ${dayName}`;
    }
    if (event.recurrence === 'custom_weekly' && event.recurrenceDays) {
      const days = ['日', '一', '二', '三', '四', '五', '六'];
      const dayNames = event.recurrenceDays.map(d => days[d]).join('、');
      return `🔁 每周(${dayNames})重复`;
    }
    return null;
  };

  // Month navigation
  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  // Days in month logic
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay(); // 0 is Sunday, 1 is Monday

  // Align days: Monday is index 0. So if firstDayIndex is 0 (Sunday), it should turn into 6.
  const adjustedFirstDayIndex = firstDayIndex === 0 ? 6 : firstDayIndex - 1;

  // Previous month days to fill empty start grids
  const prevDaysInMonth = new Date(currentYear, currentMonth, 0).getDate();

  // Create grid cells
  const gridCells = [];

  // 1. Previous month trailing days
  for (let i = adjustedFirstDayIndex - 1; i >= 0; i--) {
    const day = prevDaysInMonth - i;
    const prevMonthIdx = currentMonth === 0 ? 11 : currentMonth - 1;
    const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    const dateStr = `${prevYear}-${String(prevMonthIdx + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    gridCells.push({
      day,
      dateStr,
      isCurrentMonth: false,
    });
  }

  // 2. Current month days
  for (let i = 1; i <= daysInMonth; i++) {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
    gridCells.push({
      day: i,
      dateStr,
      isCurrentMonth: true,
    });
  }

  const getEventsForDate = (dateStr: string) => {
    return events.filter((e) => {
      // Event cannot start after the target date
      if (dateStr < e.date) return false;

      // Handle recurrence
      if (e.recurrence && e.recurrence !== 'none') {
        // If there's an end date (the recurrence end limit), target date cannot be after it
        if (e.endDate && dateStr > e.endDate) return false;

        if (e.recurrence === 'daily') {
          return true;
        }

        if (e.recurrence === 'weekly') {
          return getDayOfWeek(e.date) === getDayOfWeek(dateStr);
        }

        if (e.recurrence === 'custom_weekly') {
          return e.recurrenceDays?.includes(getDayOfWeek(dateStr));
        }
      }

      // Handle multi-day span (non-recurring)
      if (e.endDate) {
        return dateStr >= e.date && dateStr <= e.endDate;
      }

      // Standard single date matching
      return e.date === dateStr;
    }).sort((a, b) => {
      if (a.isAllDay && !b.isAllDay) return -1;
      if (!a.isAllDay && b.isAllDay) return 1;
      return a.time.localeCompare(b.time);
    });
  };

  const handleTileClick = (dateStr: string) => {
    setSelectedDate(dateStr);
    setIsDetailModalOpen(true);
  };

  const handleSmartParse = () => {
    if (!smartPasteText.trim()) return;

    let title = '';
    const titleMatch = smartPasteText.match(/【([^】]+)】/) || smartPasteText.match(/「([^」]+)」/) || smartPasteText.match(/“([^”]+)”/);
    if (titleMatch) {
      title = titleMatch[1];
    }

    let address = '';
    const addressMatch = smartPasteText.match(/地址：?\s*([^\s,，。！!|（(；]+)/) || smartPasteText.match(/在\s*([^\s,，。！!|]+)\s*聚餐/);
    if (addressMatch) {
      address = addressMatch[1];
    }

    const urlMatch = smartPasteText.match(/(https?:\/\/[^\s]+)/);
    const link = urlMatch ? urlMatch[1] : '';

    if (title) {
      setFormTitle(`${title} 🍽️`);
    } else {
      const lines = smartPasteText.trim().split('\n');
      if (lines[0] && lines[0].length < 30) {
        setFormTitle(lines[0]);
      }
    }

    if (address) {
      setFormLocation(address);
    } else if (title) {
      setFormLocation(title);
    }

    let desc = '';
    if (link) {
      desc = `分享链接: ${link}`;
    } else {
      desc = smartPasteText.trim().substring(0, 100);
      if (smartPasteText.length > 100) desc += '...';
    }
    setFormDescription(desc);

    // Smart detection for reminder timing
    if (smartPasteText.includes('15分钟') || smartPasteText.includes('一刻钟')) {
      setFormReminderTiming('15m');
    } else if (smartPasteText.includes('半小时') || smartPasteText.includes('30分钟')) {
      setFormReminderTiming('30m');
    } else if (smartPasteText.includes('1小时') || smartPasteText.includes('一个小时') || smartPasteText.includes('60分钟')) {
      setFormReminderTiming('1h');
    }

    setSmartPasteText('');
    setShowSmartPaste(false);
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    const eventTime = formIsAllDay ? '全天' : formTime;
    const eventEndDate = formIsMultiDay ? formEndDate : undefined;
    const eventLocation = formLocation.trim() || undefined;

    if (editingEventId) {
      // Update
      onUpdateEvent({
        id: editingEventId,
        title: formTitle.trim(),
        date: selectedDate,
        time: eventTime,
        memberId: formMemberId,
        category: formCategory,
        description: formDescription.trim(),
        isAllDay: formIsAllDay,
        endDate: eventEndDate,
        location: eventLocation,
        recurrence: formRecurrence,
        recurrenceDays: formRecurrence === 'custom_weekly' ? formRecurrenceDays : undefined,
        reminderTiming: formReminderTiming,
      });
      setEditingEventId(null);
    } else {
      // Add
      onAddEvent({
        title: formTitle.trim(),
        date: selectedDate,
        time: eventTime,
        memberId: formMemberId,
        category: formCategory,
        description: formDescription.trim(),
        isAllDay: formIsAllDay,
        endDate: eventEndDate,
        location: eventLocation,
        recurrence: formRecurrence,
        recurrenceDays: formRecurrence === 'custom_weekly' ? formRecurrenceDays : undefined,
        reminderTiming: formReminderTiming,
      });
    }

    // Reset Form
    setFormTitle('');
    setFormTime('10:00');
    setFormDescription('');
    setFormIsAllDay(false);
    setFormIsMultiDay(false);
    setFormEndDate('');
    setFormLocation('');
    setShowSmartPaste(false);
    setSmartPasteText('');
    setFormRecurrence('none');
    setFormRecurrenceDays([]);
    setFormReminderTiming('none');
    setIsAddModalOpen(false);
  };

  const openAddModal = (dateStr: string) => {
    setSelectedDate(dateStr);
    setFormMemberId(activeMemberId);
    setEditingEventId(null);
    setFormTitle('');
    setFormTime('10:00');
    setFormDescription('');
    setFormCategory('life');
    setFormIsAllDay(false);
    setFormIsMultiDay(false);
    setFormEndDate(dateStr);
    setFormLocation('');
    setShowSmartPaste(false);
    setSmartPasteText('');
    setFormRecurrence('none');
    setFormRecurrenceDays([]);
    setFormReminderTiming('30m'); // default to 30 minutes before for convenience
    setIsAddModalOpen(true);
  };

  const startEditEvent = (event: CalendarEvent) => {
    setEditingEventId(event.id);
    setFormTitle(event.title);
    setFormTime(event.isAllDay ? '10:00' : event.time);
    setFormMemberId(event.memberId);
    setFormCategory(event.category);
    setFormDescription(event.description || '');
    setFormIsAllDay(!!event.isAllDay);
    setFormIsMultiDay(!!event.endDate && event.endDate !== event.date);
    setFormEndDate(event.endDate || event.date);
    setFormLocation(event.location || '');
    setShowSmartPaste(false);
    setSmartPasteText('');
    setFormRecurrence(event.recurrence || 'none');
    setFormRecurrenceDays(event.recurrenceDays || []);
    setFormReminderTiming(event.reminderTiming || 'none');
    setIsDetailModalOpen(false);
    setIsAddModalOpen(true);
  };

  // Get active selected date info
  const selectedDateEvents = getEventsForDate(selectedDate);
  const formattedSelectedDate = (() => {
    const d = new Date(selectedDate);
    if (isNaN(d.getTime())) return selectedDate;
    return d.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
  })();

  return (
    <div className="flex flex-col gap-4">
      {/* Calendar Header Card */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border-2 border-[#FFDAB9] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#FF91A4] rounded-2xl flex items-center justify-center text-white font-bold border-b-2 border-[#C05D6D]">
            📅
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#6B4F4F]">
              {currentYear}年 {currentMonth + 1}月
            </h2>
            <p className="text-xs text-[#A68F8F] font-medium">查看并同步全家日程 🐰</p>
          </div>
        </div>

        {/* Month Switchers */}
        <div className="flex items-center gap-2">
          <button
            onClick={prevMonth}
            className="w-9 h-9 bg-[#FFF9F2] hover:bg-[#FFDAB9] border border-[#FFDAB9] text-[#6B4F4F] rounded-xl flex items-center justify-center cursor-pointer transition-colors"
            title="上个月"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => {
              const now = new Date();
              setCurrentYear(now.getFullYear());
              setCurrentMonth(now.getMonth());
            }}
            className="px-3 py-1 bg-pink-50 hover:bg-pink-100 border border-[#FFC1CC] text-[#FF91A4] text-xs font-bold rounded-xl cursor-pointer"
          >
            回到今天 🐰
          </button>
          <button
            onClick={nextMonth}
            className="w-9 h-9 bg-[#FFF9F2] hover:bg-[#FFDAB9] border border-[#FFDAB9] text-[#6B4F4F] rounded-xl flex items-center justify-center cursor-pointer transition-colors"
            title="下个月"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 今日大事件 (Today's Big Events) */}
      <div className="bg-[#FFF9F2] rounded-3xl p-5 shadow-xs border-2 border-[#FFDAB9] flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🌟</span>
            <div>
              <h3 className="text-sm font-black text-[#6B4F4F] flex items-center gap-1.5">
                今日家庭日程 (大事件)
                <span className="bg-[#FF91A4] text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                  {getEventsForDate(TODAY_STR).length} 项安排
                </span>
              </h3>
              <p className="text-[10px] text-[#A68F8F] font-bold">
                {getTodayChineseLabel(TODAY_STR)} (手机竖屏看这里超方便哦！📱)
              </p>
            </div>
          </div>
          
          <button
            onClick={() => openAddModal(TODAY_STR)}
            className="text-xs bg-[#FF91A4] hover:bg-[#E07080] text-white px-3 py-1.5 rounded-xl font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>添加今天日程</span>
          </button>
        </div>

        {getEventsForDate(TODAY_STR).length === 0 ? (
          <div className="bg-white rounded-2xl p-4 text-center border border-[#FFDAB9]/40 py-6">
            <span className="text-2xl block mb-1">🐰💤</span>
            <p className="text-xs text-[#A68F8F] font-bold">
              今天全家没有特定安排，是温暖惬意的一天哦~
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {getEventsForDate(TODAY_STR).map((event) => {
              const member = members.find((m) => m.id === event.memberId);
              const catColor = CATEGORY_COLORS[event.category] || CATEGORY_COLORS.other;

              return (
                <div
                  key={event.id}
                  style={{ backgroundColor: catColor.bg, borderColor: catColor.border }}
                  className="p-3.5 rounded-2xl border-2 shadow-xs transition-all flex flex-col gap-2 group/today-item"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-base shrink-0">
                        {member ? member.avatar : '🏡'}
                      </span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-black px-1.5 py-0.5 rounded-lg text-white" style={{ backgroundColor: member ? member.borderColor : '#FF91A4' }}>
                          {member ? member.name : '全家'}
                        </span>
                        <span className="text-[10px] text-[#A68F8F] font-bold">
                          {CATEGORY_LABELS[event.category]}
                        </span>
                        {getRecurrenceLabel(event) && (
                          <span className="text-[10px] bg-amber-100 text-amber-700 font-black px-1.5 py-0.5 rounded-lg border border-amber-200">
                            {getRecurrenceLabel(event)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Quick actions for Today's Event */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => startEditEvent(event)}
                        className="p-1 rounded-md text-stone-500 hover:bg-stone-100 hover:text-[#6B4F4F]"
                        title="编辑日程"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`确定要删除此项日程 "${event.title}" 吗？`)) {
                            onDeleteEvent(event.id);
                          }
                        }}
                        className="p-1 rounded-md text-red-400 hover:bg-red-50 hover:text-red-600"
                        title="删除日程"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-black text-[#6B4F4F] flex items-center flex-wrap gap-1">
                      <Clock className="w-3 h-3 text-[#FF91A4] shrink-0" />
                      {event.isAllDay ? (
                        <span className="bg-rose-100 text-rose-600 px-1.5 py-0.5 rounded-md text-[9px] font-black shrink-0">
                          全天
                        </span>
                      ) : (
                        <span className="bg-white/80 px-1.5 py-0.5 rounded-md text-[10px] font-bold font-mono shrink-0">
                          {event.time}
                        </span>
                      )}
                      {event.endDate && event.endDate !== event.date ? (
                        <span className="bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded-md text-[9px] font-bold border border-amber-100 shrink-0">
                          🗓️ 跨期
                        </span>
                      ) : null}
                      {getReminderBadgeLabel(event.reminderTiming) && (
                        <span className="bg-rose-50 text-rose-600 border border-rose-200 text-[9px] font-black px-1.5 py-0.5 rounded-md shrink-0">
                          {getReminderBadgeLabel(event.reminderTiming)}
                        </span>
                      )}
                      <span className="font-bold text-stone-800 break-all">{event.title}</span>
                    </h4>

                    {event.location && (
                      <div className="text-[10px] text-stone-700 font-semibold mt-1.5 pl-4 flex flex-wrap items-center gap-1 bg-white/60 p-1.5 rounded-xl border border-stone-200/30">
                        <MapPin className="w-2.5 h-2.5 text-rose-500 shrink-0" />
                        <span className="truncate max-w-[150px]" title={event.location}>{event.location}</span>
                        <div className="flex gap-0.5 ml-auto">
                          <a
                            href={`https://map.baidu.com/search?query=${encodeURIComponent(event.location)}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[9px] px-1 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded"
                          >
                            百度
                          </a>
                          <a
                            href={`https://www.amap.com/search?query=${encodeURIComponent(event.location)}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[9px] px-1 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded"
                          >
                            高德
                          </a>
                        </div>
                      </div>
                    )}

                    {event.description && (
                      <p className="text-[10px] text-[#A68F8F] font-bold mt-1.5 pl-3 border-l-2 border-[#FFDAB9] break-all leading-relaxed">
                        {event.description}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Main Grid Card */}
      <div className="bg-white rounded-[2.5rem] p-6 shadow-sm border border-[#FFDAB9] flex-1 flex flex-col">
        {/* Days of Week Header */}
        <div className="grid grid-cols-7 gap-1.5 sm:gap-3 mb-3 text-center border-b pb-2 border-stone-100">
          {['周一', '周二', '周三', '周四', '周五', '周六', '周日'].map((day, idx) => (
            <div
              key={day}
              className={`text-xs font-bold uppercase tracking-wider ${
                idx >= 5 ? 'text-[#FF91A4]' : 'text-[#A68F8F]'
              }`}
            >
              {day}
            </div>
          ))}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 gap-1.5 sm:gap-3 grid-rows-6 flex-1 min-h-[350px]">
          {gridCells.map(({ day, dateStr, isCurrentMonth }, index) => {
            const dayEvents = getEventsForDate(dateStr);
            const isToday = dateStr === TODAY_STR;
            const isSelected = dateStr === selectedDate;

            return (
              <div
                key={`${dateStr}-${index}`}
                onClick={() => handleTileClick(dateStr)}
                className={`relative min-h-[60px] sm:min-h-[85px] rounded-2xl p-1.5 sm:p-2 border transition-all cursor-pointer flex flex-col justify-between overflow-hidden group ${
                  isCurrentMonth
                    ? isToday
                      ? 'bg-[#FFF0F0] border-[#FF91A4] border-2 shadow-sm'
                      : isSelected
                      ? 'bg-amber-50/50 border-[#FF91A4] shadow-xs'
                      : 'bg-[#FDFBF9] border-[#F5EDE3] hover:bg-[#FFF9F2] hover:scale-102'
                    : 'bg-stone-50/30 border-stone-100 opacity-35 text-stone-400'
                }`}
              >
                {/* Date Label */}
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs sm:text-sm font-bold ${
                      isToday
                        ? 'bg-[#FF91A4] text-white w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center shadow-xs'
                        : isCurrentMonth
                        ? 'text-[#6B4F4F]'
                        : 'text-stone-400'
                    }`}
                  >
                    {day}
                  </span>
                  
                  {isToday && (
                    <span className="text-[10px] bg-red-100 text-red-500 font-bold px-1 rounded-sm hidden sm:inline-block">
                      今天 🐰
                    </span>
                  )}
                </div>

                {/* Micro Event Chips */}
                <div className="mt-1 flex flex-col gap-1 overflow-y-auto max-h-[35px] sm:max-h-[55px] scrollbar-none flex-1">
                  {dayEvents.slice(0, 2).map((event) => {
                    const member = members.find((m) => m.id === event.memberId);
                    const catColor = CATEGORY_COLORS[event.category] || CATEGORY_COLORS.other;

                    return (
                      <div
                        key={event.id}
                        style={{
                          backgroundColor: catColor.bg,
                          color: catColor.text,
                          borderLeft: `2px solid ${member ? member.color : '#FF91A4'}`,
                        }}
                        className="text-[9px] sm:text-[10px] leading-tight px-1 py-0.5 rounded-md truncate font-medium flex items-center gap-0.5"
                        title={`${event.time} - ${event.title}`}
                      >
                        <span className="shrink-0">{member ? member.avatar : '🐰'}</span>
                        <span className="truncate">
                          {event.recurrence && event.recurrence !== 'none' ? '🔄' : ''}
                          {event.reminderTiming && event.reminderTiming !== 'none' ? '🔔' : ''}
                          {event.title}
                        </span>
                      </div>
                    );
                  })}
                  {dayEvents.length > 2 && (
                    <div className="text-[8px] sm:text-[9px] text-[#A68F8F] text-center font-bold">
                      +{dayEvents.length - 2}项日程
                    </div>
                  )}
                </div>

                {/* Bunny graphic for Today decoration */}
                {isToday && (
                  <div className="absolute -bottom-1 -right-1 opacity-20 pointer-events-none group-hover:scale-110 transition-transform">
                    <svg width="24" height="24" viewBox="0 0 100 100" fill="#FF91A4">
                      <path d="M50 20 C60 20, 70 30, 70 50 C70 70, 60 80, 50 80 C40 80, 30 70, 30 50 C30 30, 40 20, 50 20 Z" />
                      <path d="M42 30 Q30 0, 35 30 Z" />
                      <path d="M58 30 Q70 0, 65 30 Z" />
                    </svg>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Add Bar */}
      <div className="flex justify-center -mt-8 z-10">
        <button
          onClick={() => openAddModal(selectedDate || TODAY_STR)}
          className="bg-[#FF91A4] hover:bg-[#E07080] text-white px-8 py-3.5 rounded-full font-bold shadow-lg flex items-center gap-2 border-b-4 border-[#C05D6D] active:border-b-0 hover:scale-105 active:scale-95 transition-all cursor-pointer"
        >
          <Plus className="w-5 h-5 stroke-[3px]" />
          <span>添加家庭新日程 📝</span>
        </button>
      </div>

      {/* Date Details Modal */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title={`${formattedSelectedDate}`}
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#A68F8F]">
              本日共有 {selectedDateEvents.length} 项家庭安排
            </span>
            <button
              onClick={() => {
                setIsDetailModalOpen(false);
                openAddModal(selectedDate);
              }}
              className="text-xs text-[#FF91A4] font-bold hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              新增此日日程
            </button>
          </div>

          {selectedDateEvents.length === 0 ? (
            <div className="bg-stone-50 rounded-2xl p-6 text-center border-2 border-dashed border-[#F5EDE3]">
              <span className="text-3xl block mb-2">🐰💤</span>
              <p className="text-sm text-[#A68F8F]">
                今天空空如也，快去给家人安排一些萌趣活动吧！
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
              {selectedDateEvents.map((event) => {
                const member = members.find((m) => m.id === event.memberId);
                const catColor = CATEGORY_COLORS[event.category] || CATEGORY_COLORS.other;

                return (
                  <div
                    key={event.id}
                    style={{ backgroundColor: catColor.bg, borderColor: catColor.border }}
                    className="p-3.5 rounded-2xl border-2 shadow-xs transition-all flex flex-col gap-2 group/item"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">
                          {member ? member.avatar : '🐰'}
                        </span>
                        <div>
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: member ? member.borderColor : '#FF91A4' }}>
                            {member ? member.name : '全家'}
                          </span>
                          <span className="text-[11px] text-[#A68F8F] font-bold ml-2">
                            {CATEGORY_LABELS[event.category]}
                          </span>
                          {getRecurrenceLabel(event) && (
                            <span className="text-[10px] bg-amber-100 text-amber-700 font-black px-1.5 py-0.5 rounded-lg border border-amber-200 ml-2">
                              {getRecurrenceLabel(event)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Event actions */}
                      <div className="flex items-center gap-1.5 opacity-80 group-hover/item:opacity-100 transition-opacity">
                        <button
                          onClick={() => startEditEvent(event)}
                          className="p-1 rounded-md text-stone-500 hover:bg-stone-100 hover:text-[#6B4F4F]"
                          title="编辑日程"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`确定要删除此项日程 "${event.title}" 吗？`)) {
                              onDeleteEvent(event.id);
                              setTimeout(() => setIsDetailModalOpen(false), 50);
                            }
                          }}
                          className="p-1 rounded-md text-red-400 hover:bg-red-50 hover:text-red-600"
                          title="删除日程"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-[#6B4F4F] flex items-center flex-wrap gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-[#FF91A4] shrink-0" />
                        {event.isAllDay ? (
                          <span className="bg-rose-100 text-rose-600 px-2 py-0.5 rounded-lg text-[10px] font-black">
                            全天
                          </span>
                        ) : (
                          <span className="bg-white/80 px-2 py-0.5 rounded-lg text-xs font-bold font-mono">
                            {event.time}
                          </span>
                        )}
                        {event.endDate && event.endDate !== event.date ? (
                          <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded-lg text-[10px] font-bold border border-amber-100">
                            🗓️ {event.date.substring(5)} 至 {event.endDate.substring(5)}
                          </span>
                        ) : null}
                        {getReminderBadgeLabel(event.reminderTiming) && (
                          <span className="bg-rose-50 text-rose-600 border border-rose-200 text-[10px] font-black px-2 py-0.5 rounded-lg shrink-0">
                            {getReminderBadgeLabel(event.reminderTiming)}
                          </span>
                        )}
                        <span>{event.title}</span>
                      </h4>
                      {event.location && (
                        <div className="text-xs text-stone-700 font-semibold mt-1.5 pl-5 flex flex-wrap items-center gap-1.5 bg-white/50 p-1.5 rounded-xl border border-stone-200/40">
                          <MapPin className="w-3 h-3 text-rose-500 shrink-0" />
                          <span className="truncate max-w-[180px] text-[11px]" title={event.location}>{event.location}</span>
                          <span className="text-[10px] text-[#A68F8F]">| 🗺️ 搜索：</span>
                          <div className="flex gap-1">
                            <a
                              href={`https://map.baidu.com/search?query=${encodeURIComponent(event.location)}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[10px] px-1.5 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-md font-bold transition-colors"
                            >
                              百度
                            </a>
                            <a
                              href={`https://www.amap.com/search?query=${encodeURIComponent(event.location)}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[10px] px-1.5 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-md font-bold transition-colors"
                            >
                              高德
                            </a>
                            <a
                              href={`https://www.dianping.com/search/keyword/1/0_${encodeURIComponent(event.location)}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[10px] px-1.5 py-0.5 bg-orange-50 hover:bg-orange-100 text-orange-600 rounded-md font-bold transition-colors"
                            >
                              点评
                            </a>
                          </div>
                        </div>
                      )}
                      {event.description && (
                        <p className="text-xs text-[#A68F8F] font-medium mt-1.5 pl-5 border-l-2 border-[#FFDAB9]">
                          {event.description}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="pt-2 flex justify-end">
            <button
              onClick={() => setIsDetailModalOpen(false)}
              className="w-full sm:w-auto px-6 py-2.5 bg-stone-100 hover:bg-stone-200 text-[#6B4F4F] rounded-2xl text-sm font-bold transition-all cursor-pointer text-center"
            >
              关闭
            </button>
          </div>
        </div>
      </Modal>

      {/* Add / Edit Event Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title={editingEventId ? '修改日程安排 ✏️' : '添加家庭新日程 🎨'}
      >
        <form onSubmit={handleAddSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-[#6B4F4F] mb-1">
              日程标题 *
            </label>
            <input
              type="text"
              required
              maxLength={30}
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="例如：买胡萝卜、妈妈生日聚餐 🥕"
              className="w-full px-4 py-2.5 bg-white rounded-2xl border-2 border-[#FFDAB9] focus:outline-hidden focus:border-[#FF91A4] text-stone-800 text-sm font-medium"
            />
          </div>

          {/* Smart Clipboard Paste Module */}
          <div className="bg-[#FFF9F2] rounded-2xl border border-dashed border-[#FFDAB9] p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#6B4F4F] flex items-center gap-1">
                📋 大众点评/美团/地图分享 智能导入助手
              </span>
              <button
                type="button"
                onClick={() => setShowSmartPaste(!showSmartPaste)}
                className="text-[10px] font-black text-[#FF91A4] hover:underline cursor-pointer bg-white px-2 py-0.5 rounded-lg border border-[#FFDAB9]"
              >
                {showSmartPaste ? '收起面板 ⬆️' : '试试智能解析 ✨'}
              </button>
            </div>
            {showSmartPaste && (
              <div className="mt-2.5 space-y-2">
                <textarea
                  value={smartPasteText}
                  onChange={(e) => setSmartPasteText(e.target.value)}
                  placeholder="在此直接粘贴从大众点评、美团、百度地图、高德地图等App复制分享的文案、链接，一键提取标题、地址和备注哦！"
                  rows={2}
                  className="w-full p-2 bg-white rounded-xl border border-[#FFDAB9] focus:outline-hidden text-xs text-stone-800 font-semibold"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSmartPasteText('');
                      setShowSmartPaste(false);
                    }}
                    className="px-2 py-1 text-[10px] bg-stone-100 text-stone-500 rounded-lg font-bold"
                  >
                    取消
                  </button>
                  <button
                    type="button"
                    onClick={handleSmartParse}
                    className="px-3 py-1 text-[10px] bg-[#FF91A4] text-white rounded-lg font-bold hover:opacity-90 shadow-xs"
                  >
                    🚀 智能一键解析填入
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* All day / Multi-day checkboxes */}
          <div className="flex gap-4 p-3 bg-[#FFF9F2] rounded-2xl border border-[#FFDAB9]/50">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-[#6B4F4F]">
              <input
                type="checkbox"
                checked={formIsAllDay}
                onChange={(e) => setFormIsAllDay(e.target.checked)}
                className="rounded-md border-2 border-[#FFDAB9] text-[#FF91A4] focus:ring-[#FF91A4] w-4 h-4 cursor-pointer accent-[#FF91A4]"
              />
              <span className="flex items-center gap-0.5">🌅 全天事件</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-[#6B4F4F]">
              <input
                type="checkbox"
                checked={formIsMultiDay}
                onChange={(e) => {
                  setFormIsMultiDay(e.target.checked);
                  if (e.target.checked && !formEndDate) {
                    setFormEndDate(selectedDate);
                  }
                }}
                className="rounded-md border-2 border-[#FFDAB9] text-[#FF91A4] focus:ring-[#FF91A4] w-4 h-4 cursor-pointer accent-[#FF91A4]"
              />
              <span className="flex items-center gap-0.5">🗓️ 多天日程 (跨日期)</span>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className={formIsMultiDay ? "col-span-1" : "col-span-2 sm:col-span-1"}>
              <label className="block text-xs font-bold text-[#6B4F4F] mb-1">
                {formIsMultiDay ? '开始日期 📅' : '选择日期 📅'}
              </label>
              <input
                type="date"
                required
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  if (formIsMultiDay && (!formEndDate || formEndDate < e.target.value)) {
                    setFormEndDate(e.target.value);
                  }
                }}
                className="w-full px-4 py-2 bg-white rounded-2xl border-2 border-[#FFDAB9] focus:outline-hidden focus:border-[#FF91A4] text-stone-800 text-xs font-semibold"
              />
            </div>

            {formIsMultiDay && (
              <div>
                <label className="block text-xs font-bold text-[#6B4F4F] mb-1">
                  结束日期 🗓️
                </label>
                <input
                  type="date"
                  required
                  min={selectedDate}
                  value={formEndDate}
                  onChange={(e) => setFormEndDate(e.target.value)}
                  className="w-full px-4 py-2 bg-white rounded-2xl border-2 border-[#FFDAB9] focus:outline-hidden focus:border-[#FF91A4] text-stone-800 text-xs font-semibold"
                />
              </div>
            )}

            {!formIsAllDay && (
              <div className={formIsMultiDay ? "col-span-2" : "col-span-2 sm:col-span-1"}>
                <label className="block text-xs font-bold text-[#6B4F4F] mb-1">
                  具体时间 ⏰
                </label>
                <input
                  type="time"
                  required={!formIsAllDay}
                  value={formTime}
                  onChange={(e) => setFormTime(e.target.value)}
                  className="w-full px-4 py-2 bg-white rounded-2xl border-2 border-[#FFDAB9] focus:outline-hidden focus:border-[#FF91A4] text-stone-800 text-xs font-semibold"
                />
              </div>
            )}
          </div>

          {/* Recurrence Settings */}
          <div className="bg-[#FFF9F2] rounded-2xl border border-[#FFDAB9]/50 p-3.5 space-y-3">
            <div>
              <label className="block text-xs font-bold text-[#6B4F4F] mb-1.5 flex items-center gap-1">
                <span>🔁 重复设置</span>
                <span className="text-[10px] text-stone-400 font-normal">（点击设置周三/周五等特定天重复）</span>
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {(['none', 'daily', 'weekly', 'custom_weekly'] as const).map((r) => {
                  const labels = {
                    none: '不重复',
                    daily: '每天',
                    weekly: '每周',
                    custom_weekly: '自定义周',
                  };
                  return (
                    <button
                      type="button"
                      key={r}
                      onClick={() => {
                        setFormRecurrence(r);
                        if (r === 'custom_weekly' && formRecurrenceDays.length === 0) {
                          setFormRecurrenceDays([getDayOfWeek(selectedDate)]);
                        }
                      }}
                      className={`px-1 py-1.5 rounded-xl border text-[11px] font-bold text-center transition-all cursor-pointer ${
                        formRecurrence === r
                          ? 'bg-[#FF91A4] text-white border-[#FF91A4] scale-102 shadow-xs'
                          : 'bg-white text-[#6B4F4F] border-[#FFDAB9] hover:bg-stone-50'
                      }`}
                    >
                      {labels[r]}
                    </button>
                  );
                })}
              </div>
            </div>

            {formRecurrence === 'custom_weekly' && (
              <div className="pt-2 border-t border-[#FFDAB9]/30">
                <label className="block text-[10px] font-black text-[#6B4F4F] mb-1.5">
                  选择每周重复的星期：
                </label>
                <div className="flex gap-1.5 flex-wrap">
                  {['日', '一', '二', '三', '四', '五', '六'].map((dayName, idx) => {
                    const isSelected = formRecurrenceDays.includes(idx);
                    return (
                      <button
                        type="button"
                        key={idx}
                        onClick={() => {
                          if (isSelected) {
                            if (formRecurrenceDays.length > 1) {
                              setFormRecurrenceDays(formRecurrenceDays.filter((d) => d !== idx));
                            }
                          } else {
                            setFormRecurrenceDays([...formRecurrenceDays, idx].sort());
                          }
                        }}
                        className={`w-7 h-7 rounded-full border text-[11px] font-bold transition-all flex items-center justify-center cursor-pointer ${
                          isSelected
                            ? 'bg-[#FF91A4] text-white border-[#FF91A4] scale-105 font-black'
                            : 'bg-white text-[#6B4F4F] border-[#FFDAB9] hover:bg-stone-50'
                        }`}
                      >
                        {dayName}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* 🔔 提醒功能设置 (铃声与通知提醒) */}
          <div className="bg-[#FFF9F2] rounded-2xl border border-[#FFDAB9]/80 p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-[#6B4F4F] flex items-center gap-1.5">
                <Bell className="w-3.5 h-3.5 text-[#FF91A4] fill-[#FF91A4]" />
                <span>提醒功能（铃声与通知）</span>
                {formReminderTiming !== 'none' && (
                  <span className="text-[10px] bg-rose-100 text-rose-600 px-2 py-0.5 rounded-full font-black">
                    已开启
                  </span>
                )}
              </label>

              <button
                type="button"
                onClick={() => playChime()}
                className="text-[11px] font-bold text-[#FF91A4] hover:text-[#E07080] flex items-center gap-1 bg-white px-2.5 py-1 rounded-xl border border-[#FFDAB9] shadow-2xs hover:bg-rose-50 transition-all cursor-pointer active:scale-95"
                title="试听兔兔温馨提醒铃声"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>试听铃声 🎵</span>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
              {REMINDER_OPTIONS.map((opt) => {
                const isSelected = formReminderTiming === opt.value;
                return (
                  <button
                    type="button"
                    key={opt.value}
                    onClick={() => setFormReminderTiming(opt.value)}
                    className={`px-1.5 py-2 rounded-xl border text-[11px] font-bold transition-all text-center flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                      isSelected
                        ? 'bg-[#FF91A4] text-white border-[#FF91A4] scale-102 shadow-xs font-black'
                        : 'bg-white text-[#6B4F4F] border-[#FFDAB9] hover:bg-stone-50'
                    }`}
                  >
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>

            <p className="text-[10px] text-[#A68F8F] font-semibold pl-1">
              {formReminderTiming === 'none'
                ? '💡 当前未设置提醒（到达时间不发声）。'
                : '🔔 设定时间到达时，本机会自动播放兔兔甜美铃声并弹出系统通知提醒！'}
            </p>
          </div>

          <div>
            <label className="block text-sm font-bold text-[#6B4F4F] mb-1.5">
              参与的家庭成员
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setFormMemberId('all')}
                className={`px-3 py-2 rounded-xl border-2 text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                  formMemberId === 'all'
                    ? 'bg-[#FF91A4] text-white border-[#FF91A4] scale-102 shadow-xs'
                    : 'bg-white text-[#6B4F4F] border-[#FFDAB9] hover:bg-[#FFF9F2]'
                }`}
              >
                <span>🏡</span> 全家共同
              </button>

              {members.map((m) => (
                <button
                  type="button"
                  key={m.id}
                  onClick={() => setFormMemberId(m.id)}
                  style={{
                    backgroundColor: formMemberId === m.id ? m.color : '#FFFFFF',
                    borderColor: formMemberId === m.id ? m.borderColor : '#FFDAB9',
                  }}
                  className={`px-3 py-2 rounded-xl border-2 text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                    formMemberId === m.id
                      ? 'scale-102 shadow-xs'
                      : 'text-[#6B4F4F] hover:bg-stone-50'
                  }`}
                >
                  <span>{m.avatar}</span> {m.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-[#6B4F4F] mb-1.5">
              活动类型
            </label>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(CATEGORY_LABELS).map(([cat, label]) => {
                const col = CATEGORY_COLORS[cat as CalendarEvent['category']];
                const isSelected = formCategory === cat;
                return (
                  <button
                    type="button"
                    key={cat}
                    onClick={() => setFormCategory(cat as CalendarEvent['category'])}
                    style={{
                      backgroundColor: isSelected ? col.bg : '#FFFFFF',
                      borderColor: isSelected ? col.border : '#FFDAB9',
                      color: col.text,
                    }}
                    className={`px-2 py-1.5 rounded-xl border-2 text-[11px] font-bold transition-all text-center cursor-pointer ${
                      isSelected ? 'scale-102 shadow-xs border-2' : 'hover:bg-stone-50'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-[#6B4F4F] mb-1 flex items-center gap-1">
              <span>活动地点 📍</span>
              <span className="text-[10px] text-stone-400 font-normal">（选填，支持一键调用高德/百度/大众点评搜索）</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={formLocation}
                onChange={(e) => setFormLocation(e.target.value)}
                placeholder="例如：聚点串吧中关村店、奥森公园北门 🗺️"
                className="w-full pl-10 pr-4 py-2 bg-white rounded-2xl border-2 border-[#FFDAB9] focus:outline-hidden focus:border-[#FF91A4] text-stone-800 text-xs font-semibold"
              />
              <MapPin className="w-4 h-4 text-rose-400 absolute left-3.5 top-3 shrink-0" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-[#6B4F4F] mb-1">
              日程详细描述
            </label>
            <textarea
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder="给家人留个可爱的小便签吧（例如：记得带泳衣噢~）"
              rows={3}
              className="w-full px-4 py-2 bg-white rounded-2xl border-2 border-[#FFDAB9] focus:outline-hidden focus:border-[#FF91A4] text-stone-800 text-xs font-medium"
            />
          </div>

          <div className="pt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-[#6B4F4F] rounded-2xl text-sm font-bold transition-all cursor-pointer"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-[#FF91A4] hover:bg-[#E07080] text-white rounded-2xl text-sm font-bold shadow-xs border-b-2 border-[#C05D6D] hover:border-b-0 transition-all cursor-pointer"
            >
              {editingEventId ? '保存修改 ✨' : '立即发布 🎉'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
