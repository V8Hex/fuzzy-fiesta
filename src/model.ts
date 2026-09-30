export type Storage = 'fridge' | 'freezer' | 'pantry';
export type Category = 'poultry' | 'ground' | 'meat' | 'fish' | 'eggs' | 'leftovers' | 'milk' | 'yogurt' | 'cheese' | 'berries' | 'greens' | 'vegetables' | 'fruit' | 'bread' | 'dry' | 'other';
export type DateKind = 'best-before' | 'use-by' | 'sell-by' | 'expiration';
export interface FoodItem {
  id: string; name: string; category: Category; storage: Storage; quantity: number; unit: string;
  unitCost: number | null; boughtOn: string; openedOn: string | null;
  labelDate: string | null; dateKind: DateKind; notes: string; receiptId: string | null;
}
export interface Activity { id: string; item: FoodItem; quantity: number; action: 'used' | 'wasted'; at: string }
export interface Receipt { id: string; fingerprint: string; merchant: string; boughtOn: string; count: number }
export interface Settings { reminders: boolean; reminderHour: number; reminderDays: number; currency: 'USD' | 'EUR' | 'GBP'; onboarded: boolean }
export interface AppState { version: 1; items: FoodItem[]; activity: Activity[]; receipts: Receipt[]; settings: Settings }
export const EMPTY: AppState = { version: 1, items: [], activity: [], receipts: [], settings: { reminders: false, reminderHour: 9, reminderDays: 2, currency: 'USD', onboarded: false } };
export const STORAGE_NAMES: Record<Storage, string> = { fridge: 'Fridge', freezer: 'Freezer', pantry: 'Pantry' };
export const DATE_NAMES: Record<DateKind, string> = { 'best-before': 'Best before', 'use-by': 'Use by', 'sell-by': 'Sell by', expiration: 'Expiration' };
export const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
export function today(date = new Date()): string { return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`; }
export function validDate(s: unknown): s is string {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y,m,d] = s.split('-').map(Number); const date = new Date(Date.UTC(y,m-1,d));
  return y >= 1900 && y <= 2200 && date.getUTCFullYear()===y && date.getUTCMonth()===m-1 && date.getUTCDate()===d;
}
// Calendar-day arithmetic avoids daylight-saving and midnight timezone errors.
export function addDays(s: string, days: number): string { const [y,m,d]=s.split('-').map(Number); return new Date(Date.UTC(y,m-1,d+days)).toISOString().slice(0,10); }
export function daysBetween(from: string, to: string): number { return Math.round((Date.parse(to+'T12:00:00Z')-Date.parse(from+'T12:00:00Z'))/86400000); }
export function prettyDate(s: string | null): string { if(!s || !validDate(s)) return 'No date yet'; const [y,m,d]=s.split('-').map(Number); return new Date(y,m-1,d).toLocaleDateString(undefined,{month:'short',day:'numeric'}); }
export interface Guide { name: string; emoji: string; fridge: number | null; freezer: number | null; pantry: number | null; opened: number | null; evidence: 'official' | 'heuristic' | 'none'; note: string }
export const GUIDES: Record<Category, Guide> = {
  poultry: {name:'Raw poultry',emoji:'🍗',fridge:1,freezer:270,pantry:null,opened:null,evidence:'official',note:'Raw chicken or turkey pieces: 1–2 refrigerated days. Cooked poultry belongs in Leftovers. Freezer target is for quality.'},
  ground: {name:'Ground meat',emoji:'🥩',fridge:1,freezer:90,pantry:null,opened:null,evidence:'official',note:'Raw ground meat: 1–2 refrigerated days. Cooked meat belongs in Leftovers.'},
  meat: {name:'Raw meat cuts',emoji:'🥩',fridge:3,freezer:120,pantry:null,opened:null,evidence:'official',note:'Raw steaks, chops and roasts: 3–5 refrigerated days. Does not apply to deli meat or sausage.'},
  fish: {name:'Raw fin fish',emoji:'🐟',fridge:1,freezer:60,pantry:null,opened:null,evidence:'official',note:'Raw fin fish: 1–3 refrigerated days; uses the shorter quality freezer window. Does not cover shellfish.'},
  eggs: {name:'Shell eggs',emoji:'🥚',fridge:21,freezer:null,pantry:null,opened:null,evidence:'official',note:'Raw shell eggs: FDA recommends using within 3 weeks for best quality. Do not freeze eggs in their shells. Cooked eggs need a different date.'},
  leftovers: {name:'Cooked leftovers',emoji:'🍲',fridge:3,freezer:60,pantry:null,opened:null,evidence:'official',note:'Cooked meat, poultry, soups and stews: 3–4 refrigerated days. Use the cooking date as the purchase date.'},
  milk: {name:'Milk',emoji:'🥛',fridge:7,freezer:30,pantry:null,opened:5,evidence:'heuristic',note:'Planning estimate for refrigerated milk. Check the package; shelf-stable milk and specialty milks differ.'},
  yogurt: {name:'Yogurt',emoji:'🥣',fridge:7,freezer:30,pantry:null,opened:5,evidence:'heuristic',note:'Planning estimate; follow product storage and after-opening instructions.'},
  cheese: {name:'Cheese',emoji:'🧀',fridge:7,freezer:60,pantry:null,opened:5,evidence:'heuristic',note:'Short planning window because soft and hard cheeses vary. Enter the package date.'},
  berries: {name:'Berries',emoji:'🍓',fridge:3,freezer:90,pantry:null,opened:null,evidence:'heuristic',note:'Quality estimate for fresh berries; ripeness and condition vary.'},
  greens: {name:'Leafy greens',emoji:'🥬',fridge:3,freezer:60,pantry:null,opened:2,evidence:'heuristic',note:'Quality estimate for fresh greens. Follow instructions for ready-to-eat bags.'},
  vegetables: {name:'Vegetables',emoji:'🥦',fridge:5,freezer:90,pantry:null,opened:3,evidence:'heuristic',note:'Generic quality estimate; vegetables vary widely. Adjust with a package date.'},
  fruit: {name:'Fruit',emoji:'🍎',fridge:5,freezer:90,pantry:3,opened:2,evidence:'heuristic',note:'Generic quality estimate. Cut fruit should be refrigerated; use a specific date.'},
  bread: {name:'Bread',emoji:'🍞',fridge:5,freezer:60,pantry:3,opened:3,evidence:'heuristic',note:'Quality estimate, not a safety test. Packaging, ingredients and humidity affect shelf life.'},
  dry: {name:'Shelf-stable food',emoji:'🥫',fridge:null,freezer:null,pantry:null,opened:null,evidence:'none',note:'Enter the package date. Opened cans and prepared dry foods need product-specific guidance.'},
  other: {name:'Other / verify',emoji:'🛒',fridge:null,freezer:null,pantry:null,opened:null,evidence:'none',note:'No generic estimate. Identify the food and enter a package date or a personal planning target.'}
};
export function estimatedDate(item: FoodItem): string | null {
  if(!validDate(item.boughtOn)) return null;
  const guide=GUIDES[item.category]; const window=guide[item.storage];
  if(window===null) return null;
  const date=addDays(item.boughtOn,window);
  if(item.openedOn && validDate(item.openedOn) && guide.opened!==null && item.storage!=='freezer') return [date,addDays(item.openedOn,guide.opened)].sort()[0];
  return date;
}
export function targetDate(item: FoodItem): string | null {
  const estimate=estimatedDate(item);
  // A label date never silently extends a shorter storage/after-opening window.
  return [estimate,item.labelDate].filter((x): x is string=>validDate(x)).sort()[0] ?? null;
}
export function status(item: FoodItem, now=today(), window=2): {kind:'later'|'soon'|'past'|'unknown'; text:string; days:number|null} {
  const target=targetDate(item); if(!target) return {kind:'unknown',text:'Add a date',days:null};
  const d=daysBetween(now,target);
  if(d<0) return {kind:'past',text:`${Math.abs(d)}d past target`,days:d};
  if(d===0) return {kind:'soon',text:'Target today',days:0};
  if(d<=window) return {kind:'soon',text:`Use in ${d}d`,days:d};
  return {kind:'later',text:`${d} days left`,days:d};
}
export function makeItem(values: Partial<FoodItem> & {name: string}): FoodItem {
  return {id:uid(),category:'other',storage:'fridge',quantity:1,unit:'item',unitCost:null,boughtOn:today(),openedOn:null,labelDate:null,dateKind:'best-before',notes:'',receiptId:null,...values};
}
export function validateItem(i: FoodItem, now=today()): string | null {
  if(!i.name.trim() || i.name.length>120) return 'Enter an item name (up to 120 characters).';
  if(!Object.hasOwn(GUIDES,i.category) || !Object.hasOwn(STORAGE_NAMES,i.storage)) return 'Choose a category and storage location.';
  if(!Number.isFinite(i.quantity) || i.quantity<=0 || i.quantity>100000) return 'Quantity must be greater than zero.';
  if(i.unitCost!==null && (!Number.isFinite(i.unitCost) || i.unitCost<0)) return 'Price must be zero or a positive number.';
  if(!validDate(i.boughtOn) || i.boughtOn>now) return 'Purchase date must be today or earlier.';
  if(i.openedOn && (!validDate(i.openedOn) || i.openedOn<i.boughtOn || i.openedOn>now)) return 'Opening date must be between purchase date and today.';
  if(i.labelDate && !validDate(i.labelDate)) return 'Enter a valid package date.';
  if(!Object.hasOwn(DATE_NAMES,i.dateKind)) return 'Choose a package date type.';
  return null;
}
export type Action = {type:'add';items:FoodItem[];receipt?:Receipt} | {type:'update';item:FoodItem} | {type:'delete';id:string} | {type:'record';id:string;quantity:number;action:Activity['action']} | {type:'undo';id:string} | {type:'settings';settings:Partial<Settings>} | {type:'replace';state:AppState};
export function reducer(state: AppState, action: Action): AppState {
  switch(action.type) {
    case 'add': return {...state,items:[...state.items,...action.items],receipts:action.receipt?[...state.receipts,action.receipt]:state.receipts};
    case 'update': return {...state,items:state.items.map(i=>i.id===action.item.id?action.item:i)};
    case 'delete': return {...state,items:state.items.filter(i=>i.id!==action.id)};
    case 'record': {
      const item=state.items.find(i=>i.id===action.id);
      if(!item || !Number.isFinite(action.quantity) || action.quantity<=0 || action.quantity>item.quantity) return state;
      const remaining=+(item.quantity-action.quantity).toFixed(6);
      return {...state,items:remaining>0?state.items.map(i=>i.id===item.id?{...i,quantity:remaining}:i):state.items.filter(i=>i.id!==item.id),activity:[{id:uid(),item:{...item},quantity:action.quantity,action:action.action,at:new Date().toISOString()},...state.activity]};
    }
    case 'undo': {
      const record=state.activity.find(a=>a.id===action.id); if(!record) return state;
      const existing=state.items.find(i=>i.id===record.item.id);
      return {...state,items:existing?state.items.map(i=>i.id===existing.id?{...i,quantity:+(i.quantity+record.quantity).toFixed(6)}:i):[...state.items,{...record.item,quantity:record.quantity}],activity:state.activity.filter(a=>a.id!==record.id)};
    }
    case 'settings': return {...state,settings:{...state.settings,...action.settings}};
    case 'replace': return action.state;
  }
}
export function decodeState(raw: string): AppState {
  const s=JSON.parse(raw) as AppState;
  if(s.version!==1 || !Array.isArray(s.items) || !Array.isArray(s.activity) || !Array.isArray(s.receipts) || !s.settings || s.items.length>10000) throw new Error('This is not a supported Before It Goes backup.');
  const check=(i:FoodItem)=>!!i && typeof i.id==='string' && typeof i.name==='string' && typeof i.unit==='string' && typeof i.notes==='string' && Object.hasOwn(GUIDES,i.category) && Object.hasOwn(STORAGE_NAMES,i.storage) && Object.hasOwn(DATE_NAMES,i.dateKind) && Number.isFinite(i.quantity) && i.quantity>0 && validDate(i.boughtOn) && (i.openedOn===null || validDate(i.openedOn)) && (i.labelDate===null || validDate(i.labelDate)) && (i.unitCost===null || (Number.isFinite(i.unitCost) && i.unitCost>=0)) && (i.receiptId===null || typeof i.receiptId==='string');
  if(!s.items.every(check) || new Set(s.items.map(i=>i.id)).size!==s.items.length || !s.activity.every(a=>check(a.item) && typeof a.id==='string' && ['used','wasted'].includes(a.action) && Number.isFinite(a.quantity) && a.quantity>0 && Number.isFinite(Date.parse(a.at))) || !s.receipts.every(r=>typeof r.id==='string' && typeof r.fingerprint==='string' && typeof r.merchant==='string' && validDate(r.boughtOn) && Number.isInteger(r.count) && r.count>=0)) throw new Error('Backup contains invalid grocery data.');
  if(typeof s.settings.reminders!=='boolean' || typeof s.settings.onboarded!=='boolean' || !Number.isInteger(s.settings.reminderHour) || s.settings.reminderHour<0 || s.settings.reminderHour>23 || ![1,2,3,5,7].includes(s.settings.reminderDays) || !['USD','EUR','GBP'].includes(s.settings.currency)) throw new Error('Backup settings are invalid.');
  return s;
}
export function demoState(): AppState {
  const d=today();
  return {...EMPTY,settings:{...EMPTY.settings,onboarded:true},items:[
    makeItem({name:'Strawberries',category:'berries',quantity:1,unit:'box',unitCost:4.49,boughtOn:addDays(d,-2)}),
    makeItem({name:'Baby spinach',category:'greens',quantity:1,unit:'bag',unitCost:3.29,boughtOn:addDays(d,-2),labelDate:addDays(d,2)}),
    makeItem({name:'Whole milk',category:'milk',quantity:1,unit:'bottle',unitCost:4.19,boughtOn:addDays(d,-1),labelDate:addDays(d,6)}),
    makeItem({name:'Large eggs',category:'eggs',quantity:12,unit:'egg',unitCost:0.35,boughtOn:addDays(d,-3)}),
    makeItem({name:'Sourdough',category:'bread',storage:'pantry',quantity:1,unit:'loaf',unitCost:5.5,boughtOn:d}),
    makeItem({name:'Salmon fillets',category:'fish',storage:'freezer',quantity:2,unit:'fillet',unitCost:6,boughtOn:addDays(d,-5)})
  ]};
}
