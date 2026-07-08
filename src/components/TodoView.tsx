import React, { useState } from 'react';
import { TodoTask, FamilyMember } from '../types';
import { Plus, Trash2, Calendar, User, Check, Square, CheckSquare } from 'lucide-react';

interface TodoViewProps {
  todos: TodoTask[];
  members: FamilyMember[];
  activeMemberId: string;
  onAddTodo: (todo: Omit<TodoTask, 'id' | 'completed' | 'createdAt'>) => void;
  onToggleTodo: (id: string, completedBy: string) => void;
  onDeleteTodo: (id: string) => void;
}

export default function TodoView({
  todos,
  members,
  activeMemberId,
  onAddTodo,
  onToggleTodo,
  onDeleteTodo,
}: TodoViewProps) {
  const [newTitle, setNewTitle] = useState('');
  const [assignedTo, setAssignedTo] = useState<string>('all');
  const [dueDate, setDueDate] = useState<string>('');
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [memberFilter, setMemberFilter] = useState<string>('all');
  const [isExpanding, setIsExpanding] = useState(false);

  const activeMember = members.find((m) => m.id === activeMemberId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    onAddTodo({
      title: newTitle.trim(),
      createdBy: activeMemberId,
      assignedTo: assignedTo,
      dueDate: dueDate || undefined,
    });

    setNewTitle('');
    setDueDate('');
    setAssignedTo('all');
    setIsExpanding(false);
  };

  // Filter logic
  const filteredTodos = todos.filter((todo) => {
    // 1. Completion filter
    if (filter === 'active' && todo.completed) return false;
    if (filter === 'completed' && !todo.completed) return false;

    // 2. Member filter
    if (memberFilter !== 'all') {
      return todo.assignedTo === memberFilter || todo.createdBy === memberFilter;
    }
    return true;
  });

  return (
    <div className="bg-[#F9E8E0] rounded-[2.5rem] p-6 shadow-inner border border-white/50 relative overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-[#6B4F4F] flex items-center gap-2">
          <span className="w-2.5 h-2.5 bg-[#FF91A4] rounded-full animate-pulse" />
          共同待办事项
        </h2>
        
        {/* Filters */}
        <div className="flex items-center gap-1">
          <select
            value={memberFilter}
            onChange={(e) => setMemberFilter(e.target.value)}
            className="text-[10px] sm:text-xs bg-white/70 text-[#6B4F4F] font-bold py-1 px-2 rounded-xl focus:outline-hidden border border-[#F2D7CC] cursor-pointer"
          >
            <option value="all">🔍 所有人</option>
            <option value="all-assigned">🏡 全家分配</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.avatar} {m.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Sub Filters tab */}
      <div className="flex gap-1.5 mb-4 border-b border-[#F2D7CC] pb-3">
        {(['all', 'active', 'completed'] as const).map((type) => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            className={`px-3 py-1 text-xs rounded-full font-bold transition-all cursor-pointer ${
              filter === type
                ? 'bg-white text-[#FF91A4] shadow-xs'
                : 'text-[#A68F8F] hover:text-[#6B4F4F]'
            }`}
          >
            {type === 'all' && '全部'}
            {type === 'active' && '未完成'}
            {type === 'completed' && '已完成'}
          </button>
        ))}
      </div>

      {/* List container */}
      <div className="space-y-2.5 overflow-y-auto max-h-[300px] flex-1 pr-1">
        {filteredTodos.length === 0 ? (
          <div className="bg-white/40 rounded-2xl py-8 px-4 text-center border-2 border-dashed border-[#F2D7CC] text-[#A68F8F]">
            <span className="text-2xl block mb-1">🐰🥕</span>
            <p className="text-xs">
              无待办事项，快去给爸爸、妈妈或自己分派任务吧！
            </p>
          </div>
        ) : (
          filteredTodos.map((todo) => {
            const creator = members.find((m) => m.id === todo.createdBy);
            const assignee = members.find((m) => m.id === todo.assignedTo);
            const completedByMember = todo.completedBy ? members.find((m) => m.id === todo.completedBy) : null;

            return (
              <div
                key={todo.id}
                className={`bg-white/80 p-3 rounded-2xl flex items-start gap-3 border border-[#F2D7CC] group transition-all hover:bg-white ${
                  todo.completed ? 'opacity-70 bg-white/40' : ''
                }`}
              >
                {/* Custom Checkbox */}
                <button
                  onClick={() => onToggleTodo(todo.id, activeMemberId)}
                  className="mt-0.5 text-[#FF91A4] hover:text-[#E07080] transition-colors shrink-0 cursor-pointer"
                >
                  {todo.completed ? (
                    <CheckSquare className="w-5 h-5 fill-[#FFF0F0]" />
                  ) : (
                    <Square className="w-5 h-5 text-[#FFC1CC] hover:text-[#FF91A4]" />
                  )}
                </button>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-xs sm:text-sm text-[#6B4F4F] font-medium break-words leading-relaxed ${
                      todo.completed ? 'line-through text-[#A68F8F] font-normal' : ''
                    }`}
                  >
                    {todo.title}
                  </p>

                  {/* Metadata labels */}
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {/* Assignee label */}
                    <span
                      className="text-[9px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-0.5"
                      style={{
                        backgroundColor: assignee ? assignee.color : '#FFF0F0',
                        color: assignee ? assignee.textColor : '#6B4F4F',
                      }}
                    >
                      <User className="w-2.5 h-2.5" />
                      执行: {assignee ? assignee.name : '全家'}
                    </span>

                    {/* Due Date label */}
                    {todo.dueDate && (
                      <span className="text-[9px] bg-red-50 text-[#FF91A4] border border-[#FFE0E0] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                        <Calendar className="w-2.5 h-2.5" />
                        截至: {todo.dueDate.substring(5)}
                      </span>
                    )}

                    {/* Completion info */}
                    {todo.completed && completedByMember && (
                      <span className="text-[9px] bg-[#E8F7F2] text-[#065F46] font-bold px-1.5 py-0.5 rounded-md">
                        {completedByMember.name} 搞定啦 🎉
                      </span>
                    )}
                  </div>
                </div>

                {/* Action - Delete */}
                <button
                  onClick={() => onDeleteTodo(todo.id)}
                  className="text-[#A68F8F] hover:text-red-500 p-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shrink-0"
                  title="删除待办"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Add To-Do Input Card Form */}
      <form onSubmit={handleSubmit} className="mt-4 bg-white rounded-2xl p-2.5 border border-[#F2D7CC] shadow-xs">
        <div className="flex items-center gap-2">
          <input
            type="text"
            required
            maxLength={50}
            value={newTitle}
            onChange={(e) => {
              setNewTitle(e.target.value);
              setIsExpanding(true);
            }}
            onFocus={() => setIsExpanding(true)}
            placeholder={`给家庭添加新待办... (当前: ${activeMember ? activeMember.name : ''})`}
            className="flex-1 bg-transparent text-xs text-[#6B4F4F] placeholder-[#A68F8F] focus:outline-hidden font-medium py-1.5 px-2"
          />
          <button
            type="submit"
            className="bg-[#FF91A4] hover:bg-[#E07080] text-white p-2 rounded-xl transition-all shadow-xs border-b-2 border-[#C05D6D] active:border-b-0 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4 stroke-[3px]" />
          </button>
        </div>

        {/* Collapsible advanced selectors */}
        {isExpanding && (
          <div className="mt-2 pt-2 border-t border-dashed border-[#F2D7CC] flex flex-wrap gap-2 animate-fadeIn">
            {/* Assign member */}
            <div className="flex items-center gap-1 bg-stone-50 p-1 rounded-lg border border-[#F2D7CC]">
              <span className="text-[10px] font-bold text-[#6B4F4F] pl-1">分配给:</span>
              <select
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className="text-[10px] bg-transparent text-[#6B4F4F] focus:outline-hidden font-semibold border-none cursor-pointer"
              >
                <option value="all">🏡 全家共同</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.avatar} {m.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Set Due Date */}
            <div className="flex items-center gap-1 bg-stone-50 p-1 rounded-lg border border-[#F2D7CC]">
              <span className="text-[10px] font-bold text-[#6B4F4F] pl-1">截止日期:</span>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="text-[10px] bg-transparent text-[#6B4F4F] focus:outline-hidden font-semibold border-none"
              />
            </div>

            {/* Close advanced */}
            <button
              type="button"
              onClick={() => setIsExpanding(false)}
              className="text-[10px] text-[#A68F8F] hover:text-[#6B4F4F] font-bold ml-auto px-1"
            >
              收起面板
            </button>
          </div>
        )}
      </form>

      {/* Decorative Rabbit silhouette watermark */}
      <div className="absolute -bottom-6 -right-6 opacity-10 pointer-events-none">
        <svg width="120" height="120" viewBox="0 0 200 200" fill="#6B4F4F">
          <circle cx="100" cy="140" r="50" />
          <ellipse cx="80" cy="60" rx="15" ry="40" transform="rotate(-10, 80, 60)" />
          <ellipse cx="120" cy="60" rx="15" ry="40" transform="rotate(10, 120, 60)" />
        </svg>
      </div>
    </div>
  );
}
