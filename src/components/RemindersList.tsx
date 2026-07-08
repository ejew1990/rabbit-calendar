import React, { useState } from 'react';
import { AlertNotification, FamilyMember } from '../types';
import { Bell, Send, Clock, Sparkles } from 'lucide-react';

interface RemindersListProps {
  alerts: AlertNotification[];
  members: FamilyMember[];
  activeMemberId: string;
  onSendAlert: (title: string, message: string, memberId: string) => void;
}

export default function RemindersList({
  alerts,
  members,
  activeMemberId,
  onSendAlert,
}: RemindersListProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [alertText, setAlertText] = useState('');
  const [selectedSenderId, setSelectedSenderId] = useState(activeMemberId);

  const activeMember = members.find((m) => m.id === activeMemberId);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!alertText.trim()) return;

    const sender = members.find((m) => m.id === selectedSenderId);
    const title = sender ? `来自 ${sender.name} 的消息 📢` : '家庭消息公告 📢';
    
    onSendAlert(title, alertText.trim(), selectedSenderId);
    setAlertText('');
    setIsFormOpen(false);
  };

  return (
    <div className="bg-[#E8F4F8] rounded-[2.5rem] p-6 shadow-inner border border-white/50 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-[#4F626B] flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#A0D8EF] opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#A0D8EF]" />
          </span>
          实时家庭提醒
        </h2>

        <button
          onClick={() => {
            setSelectedSenderId(activeMemberId);
            setIsFormOpen(!isFormOpen);
          }}
          className="text-xs bg-white hover:bg-[#A0D8EF]/20 text-[#4F626B] font-bold px-3 py-1 rounded-full transition-all cursor-pointer flex items-center gap-1 border border-[#B9E0EE]"
        >
          <Bell className="w-3.5 h-3.5 animate-bounce" />
          <span>发广播 📢</span>
        </button>
      </div>

      {/* Quick broadcast form */}
      {isFormOpen && (
        <form onSubmit={handleSend} className="mb-4 bg-white p-3 rounded-2xl border border-[#B9E0EE] shadow-xs space-y-2.5 animate-fadeIn">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-[#4F626B]">发言人：</span>
            <select
              value={selectedSenderId}
              onChange={(e) => setSelectedSenderId(e.target.value)}
              className="text-[10px] bg-stone-50 border border-stone-200 rounded-lg p-0.5 font-bold cursor-pointer"
            >
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.avatar} {m.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-1.5">
            <input
              type="text"
              required
              maxLength={40}
              value={alertText}
              onChange={(e) => setAlertText(e.target.value)}
              placeholder="例如：饭做好啦！快来洗手 🍲"
              className="flex-1 px-3 py-1.5 bg-[#FFF9F2] rounded-xl border border-[#B9E0EE] text-xs focus:outline-hidden text-stone-800"
            />
            <button
              type="submit"
              className="bg-[#A0D8EF] hover:bg-[#76BBD9] text-[#1E40AF] p-2 rounded-xl transition-all shadow-xs cursor-pointer flex items-center justify-center shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      )}

      {/* Reminder entries */}
      <div className="space-y-3 overflow-y-auto max-h-[190px] flex-1 pr-1">
        {alerts.length === 0 ? (
          <p className="text-xs text-center text-[#7A8D96] py-6 font-medium">
            最近没有新提醒哦 💤
          </p>
        ) : (
          alerts.map((alert) => {
            const sender = members.find((m) => m.id === alert.memberId);
            const avatar = sender ? sender.avatar : '🐰';
            const color = sender ? sender.color : '#FF91A4';

            return (
              <div
                key={alert.id}
                className="bg-white/75 p-3 rounded-2xl border border-[#DCEFF5] flex gap-2.5 items-start shadow-2xs hover:bg-white transition-all"
              >
                {/* Avatar with status indicator */}
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-base shrink-0 border border-white relative"
                  style={{ backgroundColor: color }}
                >
                  {avatar}
                  <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-[#FF91A4] rounded-full animate-pulse" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1.5">
                    <p className="text-[11px] font-bold text-[#4F626B] truncate">
                      {alert.title}
                    </p>
                    <span className="text-[9px] text-[#7A8D96] font-semibold whitespace-nowrap flex items-center gap-0.5">
                      <Clock className="w-2.5 h-2.5" />
                      {alert.time}
                    </span>
                  </div>
                  <p className="text-xs text-[#5C707A] font-medium break-words mt-0.5">
                    {alert.message}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Helpful quote footer */}
      <div className="mt-3 pt-2.5 border-t border-[#DCEFF5] flex items-center gap-1.5 text-[10px] text-[#7A8D96] font-bold">
        <Sparkles className="w-3.5 h-3.5 text-[#A0D8EF] shrink-0" />
        <span className="truncate">双向实时广播：点击按钮给家人发悄悄话吧！</span>
      </div>
    </div>
  );
}
