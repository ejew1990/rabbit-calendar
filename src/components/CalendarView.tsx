import React, { useState } from 'react';
import { CalendarEvent, FamilyMember } from '../types';
import { ChevronLeft, ChevronRight, Plus, Trash2, Clock, Calendar, Check } from 'lucide-react';
import Modal from './Modal';

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
  // Anchoring the default view around July 2026 (the current local year/month)
  const [currentYear, setCurrentYear] = useState(2026);
  const [currentMonth, setCurrentMonth] = useState(6); // 0-indexed, so 6 is July

  const [selectedDate, setSelectedDate] = useState<string>('2026-07-08'); // Selected tile
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form states for new event
  const [formTitle, setFormTitle] = useState('');
  const [formTime, setFormTime] = useState('10:00');
  const [formMemberId, setFormMemberId] = useState(activeMemberId);
  const [formCategory, setFormCategory] = useState<CalendarEvent['category']>('life');
  const [formDescription, setFormDescription] = useState('');

  // Form state for editing
  const [editingEventId, setEditingEventId] = useState<string | null>(null);

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

  // Today is 2026-07-08
  const TODAY_STR = '2026-07-08';

  const getEventsForDate = (dateStr: string) => {
    return events.filter((e) => e.date === dateStr).sort((a, b) => a.time.localeCompare(b.time));
  };

  const handleTileClick = (dateStr: string) => {
    setSelectedDate(dateStr);
    setIsDetailModalOpen(true);
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    if (editingEventId) {
      // Update
      onUpdateEvent({
        id: editingEventId,
        title: formTitle.trim(),
        date: selectedDate,
        time: formTime,
        memberId: formMemberId,
        category: formCategory,
        description: formDescription.trim(),
      });
      setEditingEventId(null);
    } else {
      // Add
      onAddEvent({
        title: formTitle.trim(),
        date: selectedDate,
        time: formTime,
        memberId: formMemberId,
        category: formCategory,
        description: formDescription.trim(),
      });
    }

    // Reset Form
    setFormTitle('');
    setFormTime('10:00');
    setFormDescription('');
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
    setIsAddModalOpen(true);
  };

  const startEditEvent = (event: CalendarEvent) => {
    setEditingEventId(event.id);
    setFormTitle(event.title);
    setFormTime(event.time);
    setFormMemberId(event.memberId);
    setFormCategory(event.category);
    setFormDescription(event.description || '');
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
              setCurrentYear(2026);
              setCurrentMonth(6); // Reset to July 2026
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
                        <span className="truncate">{event.title}</span>
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
                              // Simple reactive update for UI
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
                      <h4 className="text-sm font-bold text-[#6B4F4F] flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-[#FF91A4] shrink-0" />
                        <span className="bg-white/80 px-2 py-0.5 rounded-lg text-xs font-bold font-mono">
                          {event.time}
                        </span>
                        <span>{event.title}</span>
                      </h4>
                      {event.description && (
                        <p className="text-xs text-[#A68F8F] font-medium mt-1 pl-5 border-l-2 border-[#FFDAB9]">
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-bold text-[#6B4F4F] mb-1">
                选择日期
              </label>
              <input
                type="date"
                required
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-4 py-2 bg-white rounded-2xl border-2 border-[#FFDAB9] focus:outline-hidden focus:border-[#FF91A4] text-stone-800 text-xs font-semibold"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-[#6B4F4F] mb-1">
                具体时间
              </label>
              <input
                type="time"
                required
                value={formTime}
                onChange={(e) => setFormTime(e.target.value)}
                className="w-full px-4 py-2 bg-white rounded-2xl border-2 border-[#FFDAB9] focus:outline-hidden focus:border-[#FF91A4] text-stone-800 text-xs font-semibold"
              />
            </div>
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
