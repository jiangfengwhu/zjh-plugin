export type IngredientAmount = { amount: number; unit: string };
export type Meal = { id: string; name: string; description: string; price: number; minutes: number; taste: '清淡' | '香辣' | '家常'; vegetarian: boolean; ingredients: string[]; amounts?: IngredientAmount[]; steps: string[] };
export type Preferences = { taste: string; budget: number; minutes: number; vegetarian: boolean; people: number; excluded: string[] };
const AMOUNTS: Record<string, IngredientAmount> = {
  '番茄': { amount: 1, unit: '个' }, '鸡蛋': { amount: 1, unit: '个' }, '面条': { amount: 100, unit: '克' }, '熟米饭': { amount: 200, unit: '克' }, '香菇': { amount: 100, unit: '克' }, '青菜': { amount: 150, unit: '克' }, '豆腐': { amount: 200, unit: '克' }, '素豆瓣酱': { amount: 10, unit: '克' }, '胡萝卜': { amount: 50, unit: '克' }, '黄瓜': { amount: 0.5, unit: '根' }, '芝麻酱': { amount: 15, unit: '克' }, '土豆': { amount: 1, unit: '个' }, '辣椒': { amount: 1, unit: '个' }, '去骨鸡腿': { amount: 1, unit: '个' }, '西兰花': { amount: 100, unit: '克' }, '鲜虾': { amount: 100, unit: '克' }, '牛肉片': { amount: 120, unit: '克' }, '意面': { amount: 100, unit: '克' }, '洋葱': { amount: 0.25, unit: '个' }, '鸡胸肉': { amount: 150, unit: '克' }, '青椒': { amount: 1, unit: '个' }, '白菜': { amount: 150, unit: '克' }, '吐司': { amount: 2, unit: '片' }, '生菜': { amount: 30, unit: '克' }, '菌菇': { amount: 150, unit: '克' }, '辣椒油': { amount: 5, unit: '毫升' }, '鱼': { amount: 200, unit: '克' }, '姜': { amount: 5, unit: '克' }, '时令蔬菜': { amount: 150, unit: '克' },
};
const meal = (id: string, name: string, description: string, price: number, minutes: number, taste: Meal['taste'], vegetarian: boolean, ingredients: string[], steps: string[]): Meal => ({ id, name, description, price, minutes, taste, vegetarian, ingredients, amounts: ingredients.map(name => ({ ...AMOUNTS[name] })), steps });
export const MEALS: Meal[] = [
  meal('tomato-noodles', '番茄鸡蛋面', '热乎乎的一碗，给今天一个温柔的收尾。', 12, 15, '家常', true, ['番茄', '鸡蛋', '面条'], ['番茄切块，鸡蛋打散。', '先炒鸡蛋，再炒番茄出汁。', '加水煮开，下面煮熟，按口味调味。']),
  meal('mushroom-rice', '香菇青菜盖饭', '鲜香不用复杂，一盘菜配一碗饭就够了。', 13, 20, '清淡', true, ['香菇', '青菜', '熟米饭'], ['青菜洗净，香菇切片。', '炒香菇后加入青菜炒熟。', '少量盐和生抽调味，盖在热米饭上。']),
  meal('chili-tofu', '麻婆豆腐盖饭', '软嫩豆腐配热米饭，快乐就是这么直接。', 15, 20, '香辣', true, ['豆腐', '素豆瓣酱', '熟米饭'], ['豆腐切块，焯水后沥干。', '炒香素豆瓣酱，加水和豆腐煮入味。', '少量水淀粉勾芡，配热米饭。']),
  meal('egg-rice', '黄金蛋炒饭', '把昨天的米饭，变成今天的小确幸。', 10, 10, '家常', true, ['熟米饭', '鸡蛋', '胡萝卜'], ['鸡蛋打散，胡萝卜切小丁。', '炒熟鸡蛋和胡萝卜，加入米饭。', '炒散炒热，少量盐调味。']),
  meal('cucumber-noodles', '黄瓜芝麻拌面', '清爽、简单，适合不想开大火的晚上。', 10, 10, '清淡', true, ['面条', '黄瓜', '芝麻酱'], ['面条煮熟沥干，黄瓜切丝。', '芝麻酱用温水调开，加少量生抽。', '与面条、黄瓜丝拌匀。']),
  meal('potato-rice', '酸辣土豆丝盖饭', '酸香脆爽，普通食材也能让人期待。', 12, 15, '香辣', true, ['土豆', '辣椒', '熟米饭'], ['土豆切细丝，冲洗并沥干。', '炒香辣椒，下土豆丝炒熟。', '加醋和盐翻匀，配热米饭。']),
  meal('chicken-rice', '照烧鸡腿饭', '甜咸酱汁裹着鸡腿，像给自己发了个奖励。', 25, 30, '家常', false, ['去骨鸡腿', '西兰花', '熟米饭'], ['鸡腿擦干，西兰花焯熟。', '鸡腿煎至两面上色，加入生抽、少量糖和水。', '焖至鸡肉完全熟透，收汁切块，配饭和蔬菜。']),
  meal('shrimp-porridge', '鲜虾蔬菜粥', '慢一点吃，热粥会把疲惫轻轻接住。', 28, 30, '清淡', false, ['熟米饭', '鲜虾', '青菜'], ['鲜虾去壳去虾线，青菜切碎。', '米饭加水煮成粥。', '放入鲜虾和青菜煮熟，少量盐调味。']),
  meal('beef-noodles', '黑椒牛肉意面', '像在小餐馆吃晚饭，厨房就是自己的主场。', 35, 30, '家常', false, ['牛肉片', '意面', '洋葱'], ['意面按包装时间煮熟。', '洋葱炒香，加入牛肉片炒熟。', '拌入意面，加黑胡椒和生抽翻匀。']),
  meal('spicy-chicken', '辣炒鸡丁饭', '香辣开胃，今天就吃点有精神的。', 25, 20, '香辣', false, ['鸡胸肉', '青椒', '熟米饭'], ['鸡胸肉切丁，用生抽和淀粉拌匀。', '鸡丁炒至完全熟透，加入青椒和辣椒。', '调味炒匀，配热米饭。']),
  meal('tofu-soup', '白菜豆腐汤配饭', '简简单单的一汤一饭，也是一顿认真吃的晚餐。', 12, 15, '清淡', true, ['白菜', '豆腐', '熟米饭'], ['白菜洗净切段，豆腐切块。', '锅中加水，放白菜和豆腐煮熟。', '少量盐和香油调味，搭配热米饭。']),
  meal('egg-sandwich', '煎蛋蔬菜三明治', '十分钟的小晚餐，留更多时间给自己。', 15, 10, '清淡', true, ['吐司', '鸡蛋', '生菜'], ['生菜洗净沥干，鸡蛋煎熟。', '吐司轻轻烤热。', '夹入鸡蛋和生菜，加喜欢的酱汁。']),
  meal('tomato-potato', '番茄土豆炖菜', '酸甜软糯，拿来拌饭正合适。', 15, 30, '家常', true, ['番茄', '土豆', '熟米饭'], ['土豆切小块，番茄切块。', '炒番茄出汁，加入土豆和水。', '炖至土豆软熟，调味后配饭。']),
  meal('spicy-noodles', '香辣菌菇拌面', '菌菇鲜、辣油香，一口就能打起精神。', 15, 15, '香辣', true, ['面条', '菌菇', '辣椒油'], ['菌菇洗净切片，面条煮熟。', '菌菇炒至熟透，加入少量生抽。', '面条拌入菌菇和辣椒油。']),
  meal('steamed-fish', '清蒸鱼配时蔬', '给自己一顿稍微讲究一点的晚餐。', 45, 30, '清淡', false, ['鱼', '姜', '时令蔬菜', '熟米饭'], ['鱼处理干净，放上姜片。', '蒸至鱼肉完全熟透，蔬菜另行焯熟。', '淋少量蒸鱼豉油，配蔬菜和热米饭。']),
  meal('spicy-beef', '香辣牛肉盖饭', '有肉有菜有热饭，今晚不将就。', 35, 20, '香辣', false, ['牛肉片', '青椒', '熟米饭'], ['牛肉片用生抽和淀粉拌匀。', '炒香辣椒，加入牛肉片炒熟。', '加入青椒翻炒调味，盖在热米饭上。']),
];
const ALIASES: Record<string, string[]> = { 海鲜: ['鱼', '虾', '蟹', '贝', '蚝'], 牛肉: ['牛肉'], 鸡肉: ['鸡腿', '鸡胸', '鸡肉'], 菌菇: ['菌菇', '香菇', '蘑菇'], 辣椒: ['辣椒', '豆瓣酱'], 芝麻: ['芝麻', '麻酱'] };
export function parseExcluded(text: string): string[] { return [...new Set(text.split(/[，,、;；\n]+/).map(x => x.trim().slice(0, 30)).filter(Boolean))].slice(0, 12); }
export function matches(m: Meal, p: Preferences): boolean {
  const text = [m.name, ...m.ingredients, ...m.steps].join(' ').toLowerCase();
  return (p.taste === '随意' || m.taste === p.taste) && m.price <= p.budget && m.minutes <= p.minutes && (!p.vegetarian || m.vegetarian) && !p.excluded.some(term => (ALIASES[term] || [term]).some(word => text.includes(word.toLowerCase())));
}
export function candidates(p: Preferences): Meal[] { return MEALS.filter(m => matches(m, p)); }
export function choose(p: Preferences, previousId?: string, recentIds: string[] = []): Meal | undefined {
  const all = candidates(p); const other = all.filter(m => m.id !== previousId); const pool = other.length ? other : all;
  const fresh = pool.filter(m => !recentIds.includes(m.id));
  if (fresh.length) return fresh[Math.floor(Math.random() * fresh.length)];
  // When every candidate has been eaten, rotate back to the least recent one.
  return [...pool].sort((a, b) => recentIds.indexOf(b.id) - recentIds.indexOf(a.id))[0];
}
export function ingredientText(m: Meal, people: number): string {
  return m.ingredients.map((name, i) => { const quantity = m.amounts?.[i]; return quantity ? name + ' ' + Math.round(quantity.amount * people * 100) / 100 + quantity.unit : name; }).join('  ·  ');
}
export function parseMeal(value: unknown): Meal | undefined {
  if (!value || typeof value !== 'object') return;
  const m = value as Meal;
  const text = (v: unknown, max: number) => typeof v === 'string' && v.trim().length > 0 && v.length <= max;
  const list = (v: unknown, max: number) => Array.isArray(v) && v.length > 0 && v.length <= max && v.every(x => text(x, 180));
  if (!text(m.id, 80) || !text(m.name, 30) || !text(m.description, 160) || !Number.isFinite(m.price) || m.price < 0 || m.price > 1000 || !Number.isFinite(m.minutes) || m.minutes < 1 || m.minutes > 240 || !['清淡', '香辣', '家常'].includes(m.taste) || typeof m.vegetarian !== 'boolean' || !list(m.ingredients, 8) || !list(m.steps, 6)) return;
  if (m.amounts !== undefined && (!Array.isArray(m.amounts) || m.amounts.length !== m.ingredients.length || m.amounts.some(q => !q || !Number.isFinite(q.amount) || q.amount <= 0 || q.amount > 2000 || !text(q.unit, 8)))) return;
  const amounts = m.amounts || MEALS.find(item => item.id === m.id)?.amounts;
  return { ...(amounts ? { amounts: amounts.map(q => ({ amount: q.amount, unit: q.unit })) } : {}), id: m.id, name: m.name, description: m.description, price: m.price, minutes: m.minutes, taste: m.taste, vegetarian: m.vegetarian, ingredients: [...m.ingredients], steps: [...m.steps] };
}
