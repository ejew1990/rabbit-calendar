import { FamilyMember, CalendarEvent, TodoTask, AlertNotification } from '../types';

export const INITIAL_MEMBERS: FamilyMember[] = [
  {
    id: 'member-1',
    name: '爸爸',
    role: '爸爸',
    color: '#A0D8EF', // cute blue
    textColor: '#1E40AF',
    borderColor: '#76BBD9',
    avatar: '👨‍💼',
  },
  {
    id: 'member-2',
    name: '妈妈',
    role: '妈妈',
    color: '#FFC1CC', // cute pink
    textColor: '#9C1A3C',
    borderColor: '#FF91A4',
    avatar: '👩‍💼', // professional attire
  },
  {
    id: 'member-3',
    name: '咚咚',
    role: '咚咚',
    color: '#FFEC8B', // cute yellow
    textColor: '#78350F',
    borderColor: '#E6D478',
    avatar: '👧', // cute little girl
  },
  {
    id: 'member-4',
    name: '兔兔小助手',
    role: '宠物/助手',
    color: '#B2E7D5', // cute mint green
    textColor: '#065F46',
    borderColor: '#8ACBB5',
    avatar: '🐰',
  },
];

export const INITIAL_EVENTS: CalendarEvent[] = [];

export const INITIAL_TODOS: TodoTask[] = [];

export const INITIAL_ALERTS: AlertNotification[] = [];

export const BUNNY_TIPS = [
  "今天也要多喝温水、元气满满噢！🥕",
  "待办事项里有胡萝卜！是不是给我的呀？😋",
  "把事情写在日历里，兔兔会帮你记得牢牢的！📅",
  "一家人整整齐齐，是最最温暖的事了！❤️",
  "今天天气真棒，全家一起出去散散步、呼吸新鲜空气吧！🌸",
  "小提示：要定期给我的小屋通风，多谢大家照顾啦~ 🐰",
  "咚咚的钢琴弹得越来越好听了！真是个聪明的孩子 🎵",
  "妈妈辛苦了！今天晚上别忘了多捏捏肩膀放松噢 💆‍♀️",
  "爸爸工作辛苦啦！休息时间闭上眼睛做个兔兔眼保健操吧 👀",
];
