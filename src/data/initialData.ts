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
    avatar: '👩‍🍳',
  },
  {
    id: 'member-3',
    name: '小明',
    role: '小明',
    color: '#FFEC8B', // cute yellow
    textColor: '#78350F',
    borderColor: '#E6D478',
    avatar: '👦',
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

// Current local time is 2026-07-08.
// We anchor our events in July 2026!
export const INITIAL_EVENTS: CalendarEvent[] = [
  {
    id: 'event-1',
    title: '全家大扫除 🧹',
    date: '2026-07-11',
    time: '09:30',
    memberId: 'all',
    category: 'life',
    description: '全家一起打扫卫生，清洗兔兔的城堡，晒被子！',
  },
  {
    id: 'event-2',
    title: '小明钢琴公开课 🎹',
    date: '2026-07-02',
    time: '14:00',
    memberId: 'member-3',
    category: 'study',
    description: '小明的钢琴汇报演出，全家一起去听。',
  },
  {
    id: 'event-3',
    title: '妈妈生日派对 🎂',
    date: '2026-07-09',
    time: '18:00',
    memberId: 'member-2',
    category: 'birthday',
    description: '悄悄订一个大草莓蛋糕，给妈妈一个大大的惊喜！',
  },
  {
    id: 'event-4',
    title: '全家聚餐吃火锅 🍲',
    date: '2026-07-08',
    time: '19:00',
    memberId: 'all',
    category: 'life',
    description: '今天晚上去吃兔兔主题蒸汽火锅，多点一点胡萝卜和青菜！',
  },
  {
    id: 'event-5',
    title: '爸爸出差上海 ✈️',
    date: '2026-07-13',
    time: '全天',
    memberId: 'member-1',
    category: 'work',
    description: '参加行业交流论坛，周五（17号）下午回。',
    isAllDay: true,
    endDate: '2026-07-17',
  },
  {
    id: 'event-6',
    title: '带小明去图书馆 📚',
    date: '2026-07-05',
    time: '10:00',
    memberId: 'all',
    category: 'study',
    description: '借一些科普书籍和英语绘本。',
  },
  {
    id: 'event-7',
    title: '给兔兔剪指甲 💅',
    date: '2026-07-18',
    time: '16:00',
    memberId: 'member-4',
    category: 'life',
    description: '带兔兔去宠物店修毛并修剪指甲。',
  }
];

export const INITIAL_TODOS: TodoTask[] = [
  {
    id: 'todo-1',
    title: '买胡萝卜、燕麦和新鲜牛奶 🥕🥛',
    completed: false,
    createdBy: 'member-2',
    assignedTo: 'member-1',
    dueDate: '2026-07-08',
    createdAt: '2026-07-07',
  },
  {
    id: 'todo-2',
    title: '给兔兔的饮水器换水并打扫小窝 🏠',
    completed: false,
    createdBy: 'member-3',
    assignedTo: 'all',
    dueDate: '2026-07-09',
    createdAt: '2026-07-08',
  },
  {
    id: 'todo-3',
    title: '预订周末的旋转餐厅 🍽️',
    completed: true,
    createdBy: 'member-1',
    assignedTo: 'member-2',
    completedBy: 'member-2',
    dueDate: '2026-07-05',
    createdAt: '2026-07-03',
  },
  {
    id: 'todo-4',
    title: '检查小明的暑期数学打卡 ✏️',
    completed: false,
    createdBy: 'member-2',
    assignedTo: 'member-1',
    dueDate: '2026-07-10',
    createdAt: '2026-07-08',
  },
  {
    id: 'todo-5',
    title: '购买去水上乐园的防晒霜和泳衣 🏖️',
    completed: false,
    createdBy: 'member-2',
    assignedTo: 'all',
    dueDate: '2026-07-12',
    createdAt: '2026-07-08',
  }
];

export const INITIAL_ALERTS: AlertNotification[] = [
  {
    id: 'alert-1',
    time: '下午 3:00',
    title: '提醒：接小明放学 🏫',
    message: '爸爸：别忘了去学校接小明放学，今天有钢琴公开课。',
    memberId: 'member-1',
    type: 'reminder',
    timestamp: '2026-07-08T15:00:00Z',
  },
  {
    id: 'alert-2',
    time: '上午 10:00',
    title: '提醒：全家大扫除 🧹',
    message: '妈妈：周末全家大扫除，记得把被子和枕头拿出去晒太阳 ☀️',
    memberId: 'member-2',
    type: 'reminder',
    timestamp: '2026-07-08T10:00:00Z',
  },
  {
    id: 'alert-3',
    time: '刚才',
    title: '兔兔温馨贴士 🐇',
    message: '兔兔小管家：多吃胡萝卜补充维生素！今天也要和家人开开心心噢~',
    memberId: 'member-4',
    type: 'bunny',
    timestamp: '2026-07-08T02:45:00Z',
  }
];

export const BUNNY_TIPS = [
  "今天也要多喝温水、元气满满噢！🥕",
  "待办事项里有胡萝卜！是不是给我的呀？😋",
  "把事情写在日历里，兔兔会帮你记得牢牢的！📅",
  "一家人整整齐齐，是最最温暖的事了！❤️",
  "今天天气真棒，全家一起出去散散步、呼吸新鲜空气吧！🌸",
  "小提示：要定期给我的小屋通风，多谢大家照顾啦~ 🐰",
  "小明的钢琴弹得越来越好听了！真是个聪明的孩子 🎵",
  "妈妈辛苦了！今天晚上别忘了多捏捏肩膀放松噢 💆‍♀️",
  "爸爸工作辛苦啦！休息时间闭上眼睛做个兔兔眼保健操吧 👀",
];
