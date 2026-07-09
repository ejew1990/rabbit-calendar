import React, { useState } from 'react';
import { FamilyMember } from '../types';
import { Plus, Trash, Edit, UserPlus } from 'lucide-react';
import Modal from './Modal';
import { motion } from 'motion/react';

interface MemberSelectorProps {
  members: FamilyMember[];
  activeMemberId: string;
  onSelectMember: (id: string) => void;
  onAddMember: (member: Omit<FamilyMember, 'id'>) => void;
  onDeleteMember: (id: string) => void;
  onUpdateMember: (member: FamilyMember) => void;
}

const PRESET_AVATARS = [
  // 小朋友与学生
  '👦', '👧', '👶', '🧑‍🎓', '👩‍🎓', 
  // 成年人 (爸爸、妈妈等日常与职业形象，多为黑发/深色头发)
  '👨', '👩', '🧑', '👨‍💼', '👩‍💼', '👨‍🍳', '👩‍🍳', '👨‍💻', '👩‍💻', '👨‍🍼', '👩‍🍼',
  // 老年人 (爷爷、奶奶、外公、外婆)
  '👴', '👵', 
  // 常见可爱小动物
  '🐰', '🐱', '🐶', '🐹', '🐼', '🐨', '🦊', '🦁', '🐻', '🐯', '🐸', '🐤', '🐷', '🐧', '🦆'
];
const PRESET_COLORS = [
  { bg: '#A0D8EF', border: '#76BBD9', text: '#1E40AF', name: '清新蓝' },
  { bg: '#FFC1CC', border: '#FF91A4', text: '#9C1A3C', name: '元气粉' },
  { bg: '#FFEC8B', border: '#E6D478', text: '#78350F', name: '亮丽黄' },
  { bg: '#B2E7D5', border: '#8ACBB5', text: '#065F46', name: '温和绿' },
  { bg: '#D0B3E6', border: '#BA92D9', text: '#5B21B6', name: '梦幻紫' },
  { bg: '#FFC8A2', border: '#FF9E79', text: '#7C2D12', name: '奶油橘' }
];

export default function MemberSelector({
  members,
  activeMemberId,
  onSelectMember,
  onAddMember,
  onDeleteMember,
  onUpdateMember,
}: MemberSelectorProps) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('👧');
  const [selectedColorIndex, setSelectedColorIndex] = useState(4); // default purple

  // Editing state
  const [editingMember, setEditingMember] = useState<FamilyMember | null>(null);
  const [editMemberName, setEditMemberName] = useState('');
  const [editMemberRole, setEditMemberRole] = useState('');
  const [editSelectedAvatar, setEditSelectedAvatar] = useState('👧');
  const [editSelectedColorIndex, setEditSelectedColorIndex] = useState(4);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim()) return;

    const colorConfig = PRESET_COLORS[selectedColorIndex];
    onAddMember({
      name: newMemberName.trim(),
      role: newMemberRole.trim() || '家庭成员',
      color: colorConfig.bg,
      borderColor: colorConfig.border,
      textColor: colorConfig.text,
      avatar: selectedAvatar,
    });

    // Reset Form
    setNewMemberName('');
    setNewMemberRole('');
    setSelectedAvatar('👧');
    setIsAddModalOpen(false);
  };

  const startEditing = (member: FamilyMember) => {
    setEditingMember(member);
    setEditMemberName(member.name);
    setEditMemberRole(member.role);
    setEditSelectedAvatar(member.avatar);
    
    // Find matching color
    const colorIdx = PRESET_COLORS.findIndex(c => c.bg === member.color);
    setEditSelectedColorIndex(colorIdx !== -1 ? colorIdx : 0);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember || !editMemberName.trim()) return;

    const colorConfig = PRESET_COLORS[editSelectedColorIndex];
    onUpdateMember({
      ...editingMember,
      name: editMemberName.trim(),
      role: editMemberRole.trim() || '家庭成员',
      color: colorConfig.bg,
      borderColor: colorConfig.border,
      textColor: colorConfig.text,
      avatar: editSelectedAvatar,
    });

    setEditingMember(null);
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="text-xs font-bold text-[#A68F8F] uppercase tracking-wider block w-full mb-1 sm:w-auto sm:mb-0">
        当前发言人:
      </div>
      
      <div className="flex flex-wrap items-center gap-2">
        {members.map((member) => {
          const isActive = member.id === activeMemberId;
          return (
            <div key={member.id} className="relative group">
              <button
                onClick={() => onSelectMember(member.id)}
                style={{
                  backgroundColor: member.color,
                  borderColor: isActive ? '#FF91A4' : member.borderColor,
                }}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border-2 transition-all duration-300 shadow-xs cursor-pointer ${
                  isActive
                    ? 'scale-105 shadow-[0_0_8px_rgba(255,145,164,0.6)] font-bold'
                    : 'opacity-85 hover:opacity-100 hover:scale-102'
                }`}
              >
                <span className="text-lg">{member.avatar}</span>
                <span className="text-xs" style={{ color: member.textColor }}>
                  {member.name}
                  <span className="text-[9px] opacity-75 block text-left -mt-0.5 font-normal">
                    {member.role}
                  </span>
                </span>
              </button>

              {/* Edit Button - displayed on hover */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  startEditing(member);
                }}
                className="absolute -bottom-1 -right-1 bg-[#FF91A4] text-white hover:bg-[#E07080] rounded-full p-0.5 shadow-xs opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer border border-white z-10"
                title="编辑资料"
              >
                <Edit className="w-2.5 h-2.5" />
              </button>

              {/* Delete button - displayed on hover (allow deleting as long as there is more than 1 member, and not currently selected) */}
              {members.length > 1 && member.id !== activeMemberId && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`确定要移除 ${member.name} 吗？`)) {
                      onDeleteMember(member.id);
                    }
                  }}
                  className="absolute -top-1 -right-1 bg-red-400 text-white hover:bg-red-500 rounded-full p-0.5 shadow-xs opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer border border-white z-10"
                  title="删除成员"
                >
                  <Trash className="w-2.5 h-2.5" />
                </button>
              )}
            </div>
          );
        })}

        {/* Add Member Button */}
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="w-9 h-9 rounded-full border-2 border-dashed border-[#FFC1CC] hover:border-[#FF91A4] hover:bg-pink-50 flex items-center justify-center text-[#FF91A4] transition-all cursor-pointer"
          title="添新成员"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* Add Member Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="欢迎新成员加入 🏡"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-[#6B4F4F] mb-1">
              成员名字 *
            </label>
            <input
              type="text"
              required
              maxLength={8}
              value={newMemberName}
              onChange={(e) => setNewMemberName(e.target.value)}
              placeholder="例如：妹妹、小红"
              className="w-full px-4 py-2.5 bg-white rounded-2xl border-2 border-[#FFDAB9] focus:outline-hidden focus:border-[#FF91A4] text-stone-800 text-sm font-semibold"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-[#6B4F4F] mb-1">
              角色/备注
            </label>
            <input
              type="text"
              maxLength={10}
              value={newMemberRole}
              onChange={(e) => setNewMemberRole(e.target.value)}
              placeholder="例如：长公主、小可爱 (选填)"
              className="w-full px-4 py-2.5 bg-white rounded-2xl border-2 border-[#FFDAB9] focus:outline-hidden focus:border-[#FF91A4] text-stone-800 text-sm font-semibold"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-[#6B4F4F] mb-1.5">
              选择萌趣头像 🎭
            </label>
            <div className="grid grid-cols-7 gap-2">
              {PRESET_AVATARS.map((emoji) => (
                <button
                  type="button"
                  key={emoji}
                  onClick={() => setSelectedAvatar(emoji)}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl border-2 transition-all cursor-pointer ${
                    selectedAvatar === emoji
                      ? 'border-[#FF91A4] bg-pink-100 scale-110'
                      : 'border-transparent bg-white hover:bg-stone-50'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-[#6B4F4F] mb-1.5">
              专属配色 🎨
            </label>
            <div className="grid grid-cols-3 gap-2">
              {PRESET_COLORS.map((color, idx) => (
                <button
                  type="button"
                  key={idx}
                  onClick={() => setSelectedColorIndex(idx)}
                  style={{ backgroundColor: color.bg }}
                  className={`px-2 py-2 rounded-xl border-2 text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer transition-all ${
                    selectedColorIndex === idx
                      ? 'border-[#FF91A4] scale-102 shadow-xs'
                      : 'border-transparent opacity-80 hover:opacity-100'
                  }`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full border border-stone-400"
                    style={{ backgroundColor: color.border }}
                  />
                  <span style={{ color: color.text }}>{color.name}</span>
                </button>
              ))}
            </div>
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
              欢度入驻 🎉
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Member Modal */}
      <Modal
        isOpen={!!editingMember}
        onClose={() => setEditingMember(null)}
        title="编辑家庭成员资料 ✏️"
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-[#6B4F4F] mb-1">
              成员名字 *
            </label>
            <input
              type="text"
              required
              maxLength={8}
              value={editMemberName}
              onChange={(e) => setEditMemberName(e.target.value)}
              placeholder="例如：妹妹、小红"
              className="w-full px-4 py-2.5 bg-white rounded-2xl border-2 border-[#FFDAB9] focus:outline-hidden focus:border-[#FF91A4] text-stone-800 text-sm font-semibold"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-[#6B4F4F] mb-1">
              角色/备注
            </label>
            <input
              type="text"
              maxLength={10}
              value={editMemberRole}
              onChange={(e) => setEditMemberRole(e.target.value)}
              placeholder="例如：长公主、小可爱 (选填)"
              className="w-full px-4 py-2.5 bg-white rounded-2xl border-2 border-[#FFDAB9] focus:outline-hidden focus:border-[#FF91A4] text-stone-800 text-sm font-semibold"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-[#6B4F4F] mb-1.5">
              选择萌趣头像 🎭
            </label>
            <div className="grid grid-cols-7 gap-2">
              {PRESET_AVATARS.map((emoji) => (
                <button
                  type="button"
                  key={emoji}
                  onClick={() => setEditSelectedAvatar(emoji)}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl border-2 transition-all cursor-pointer ${
                    editSelectedAvatar === emoji
                      ? 'border-[#FF91A4] bg-pink-100 scale-110'
                      : 'border-transparent bg-white hover:bg-stone-50'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-[#6B4F4F] mb-1.5">
              专属配色 🎨
            </label>
            <div className="grid grid-cols-3 gap-2">
              {PRESET_COLORS.map((color, idx) => (
                <button
                  type="button"
                  key={idx}
                  onClick={() => setEditSelectedColorIndex(idx)}
                  style={{ backgroundColor: color.bg }}
                  className={`px-2 py-2 rounded-xl border-2 text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer transition-all ${
                    editSelectedColorIndex === idx
                      ? 'border-[#FF91A4] scale-102 shadow-xs'
                      : 'border-transparent opacity-80 hover:opacity-100'
                  }`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full border border-stone-400"
                    style={{ backgroundColor: color.border }}
                  />
                  <span style={{ color: color.text }}>{color.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setEditingMember(null)}
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
        </form>
      </Modal>
    </div>
  );
}
