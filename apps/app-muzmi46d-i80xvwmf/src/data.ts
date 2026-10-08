export interface Clue {
  id: string;
  name: string; // The part of the item to click
  hint: string; // The text shown when clicked
  x: number; // Percentage X position (0-100)
  y: number; // Percentage Y position (0-100)
}

export interface AppraisalItem {
  id: string;
  name: string;
  description: string;
  emoji: string; // Used to represent the item visually
  clues: Clue[];
  isReal: boolean;
  originStory: string;
  estimatedValue: string;
}

export const ITEMS: AppraisalItem[] = [
  {
    id: "item1",
    name: "秦始皇用过的充电宝",
    description: "据说是在秦始皇陵挖掘出的高科技产物，通体乌黑，散发着神秘的电磁场...",
    emoji: "🔋",
    clues: [
      { id: "c1", name: "底部接口", hint: "竟然是 Type-C 接口！", x: 40, y: 80 },
      { id: "c2", name: "外壳铭文", hint: "上面刻着 'Made in Huaqiangbei'...", x: 20, y: 40 },
      { id: "c3", name: "电量指示灯", hint: "四个LED灯还亮着两个，看来两千年没跑电。", x: 70, y: 20 },
    ],
    isReal: false,
    originStory: "这根本就是现代人穿越过去掉落的，或者是盗墓贼不小心落下的9.9元包邮劣质充电宝！",
    estimatedValue: "￥9.9 (包邮)",
  },
  {
    id: "item2",
    name: "唐代青花瓷马克杯",
    description: "一件罕见的唐代青花瓷器，造型奇特，竟然带有一个把手，方便饮用热饮。",
    emoji: "☕",
    clues: [
      { id: "c1", name: "杯柄", hint: "把手设计非常符合现代人体工程学...", x: 80, y: 50 },
      { id: "c2", name: "底部落款", hint: "赫然写着：微波炉适用，洗碗机安全。", x: 50, y: 90 },
      { id: "c3", name: "杯身图案", hint: "画的好像是... Hello Kitty？", x: 30, y: 50 },
    ],
    isReal: false,
    originStory: "某个粗心大意的剧组留下的道具杯子，被小贩拿来忽悠人的。",
    estimatedValue: "￥15 (超市特价)",
  },
  {
    id: "item3",
    name: "透明材质金箍棒",
    description: "孙悟空用过的兵器，但这次是透明特别版，据说重量惊人，能大能小。",
    emoji: "🦯",
    clues: [
      { id: "c1", name: "两端金箍", hint: "金色的部分其实是涂上去的塑料漆，还在掉色。", x: 10, y: 10 },
      { id: "c2", name: "中间材质", hint: "这透明度，这手感，明明就是亚克力管！", x: 50, y: 50 },
      { id: "c3", name: "内部构造", hint: "里面好像还塞了LED灯条和纽扣电池...", x: 80, y: 80 },
    ],
    isReal: false,
    originStory: "漫展上某位Cosplayer遗失的发光道具，夜晚舞动效果极佳。",
    estimatedValue: "￥45 (含电池)",
  },
  {
    id: "item4",
    name: "外星人遗落的智能手表",
    description: "从天而降的神秘设备，据说能预测未来，连接宇宙网络。",
    emoji: "⌚",
    clues: [
      { id: "c1", name: "表带", hint: "普通的硅胶表带，沾满了地球的灰尘。", x: 20, y: 50 },
      { id: "c2", name: "屏幕显示", hint: "屏幕上显示：'请连接您的手机以同步步数'。", x: 50, y: 40 },
      { id: "c3", name: "背部传感器", hint: "心率传感器发出的绿光，和地摊货一模一样。", x: 60, y: 70 },
    ],
    isReal: false,
    originStory: "就是个普通的廉价智能手环，谁说是外星人掉的？大概是跑步的大爷掉的。",
    estimatedValue: "￥29.9 (拼团价)",
  }
];