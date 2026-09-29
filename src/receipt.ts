import {Category, FoodItem, Storage, makeItem, today, validDate} from './model';
const CATEGORIES: [Category, RegExp][] = [
  ['leftovers', /\b(cooked|rotisserie|ready meal|prepared|pizza|soup|stew)\b/i],
  ['ground', /\b(ground|grnd|mince|hamburger)\b/i],
  ['other', /\b(sausage|bacon|ham|deli|salami|shrimp|prawn|crab|lobster|clam|mussel|oyster|baby formula|infant formula)\b/i],
  ['poultry', /\b(chicken|chkn|chick|turkey|poultry)\b/i],
  ['fish', /\b(salmon|cod|tilapia|trout|fish|tuna|haddock)\b/i],
  ['meat', /\b(steak|beef|pork|lamb|veal|roast)\b/i],
  ['eggs', /\b(eggs?|egg dozen)\b/i],
  ['milk', /\b(milk|mlk)\b/i],
  ['yogurt', /\b(yogurt|yoghurt|ygrt)\b/i],
  ['cheese', /\b(cheese|chs|cheddar|mozzarella|brie)\b/i],
  ['berries', /\b(strawberries|strawberry|strawb|blueberries|blueberry|blueb|raspberries|raspberry|blackberries|berries)\b/i],
  ['greens', /\b(spinach|spnch|lettuce|kale|arugula|salad|greens)\b/i],
  ['bread', /\b(bread|sourdough|bagels?|loaf|rolls|buns|tortilla)\b/i],
  ['vegetables', /\b(broccoli|carrot|onion|potato|tomato|pepper|cucumber|zucchini|avocado|celery|asparagus|mushroom|veggies)\b/i],
  ['fruit', /\b(apple|banana|orange|pear|peach|mango|grape|lemon|lime|fruit|melon)\b/i],
  ['dry', /\b(rice|pasta|cereal|beans?|canned|oats|flour|sugar|coffee|tea|chips|crackers|sauce|oil|peanut butter)\b/i]
];
export function guessCategory(name: string): Category { if(/\b(canned|tinned)\b/i.test(name)) return 'dry'; return CATEGORIES.find(([,re])=>re.test(name))?.[0] ?? 'other'; }
export function defaultStorage(name: string, category: Category): Storage { if(/\b(frozen|frzn|fzn)\b/i.test(name)) return 'freezer'; if(['dry','bread','fruit'].includes(category)) return 'pantry'; return 'fridge'; }
const IGNORE=/\b(sub\s?total|total|tax|balance|change|cash|credit|debit|visa|mastercard|amex|payment|tender|savings|coupon|discount|reward|loyalty|member|cashier|register|transaction|terminal|auth|approval|thank|welcome|tel|phone|store|receipt|cashback|deposit|refund)\b/i;
const NONFOOD=/\b(detergent|soap|shampoo|tissues?|paper towels?|toilet|cleaner|bleach|battery|batteries|bag fee|shopping bags?|dishwashing|pet food|cat food|dog food)\b/i;
export interface ParsedReceipt {items:FoodItem[];merchant:string;boughtOn:string;fingerprint:string;skipped:number}
export function fingerprint(text: string): string {
  const cleaned=text.toLowerCase().replace(/\s+/g,' ').trim(); let h=2166136261;
  for(let i=0;i<cleaned.length;i++) h=Math.imul(h^cleaned.charCodeAt(i),16777619);
  return (h>>>0).toString(16);
}
export function parseReceipt(text:string, fallback=today()): ParsedReceipt {
  const lines=text.split(/\r?\n/).map(s=>s.replace(/\s+/g,' ').trim()).filter(Boolean);
  let boughtOn=fallback;
  for(const line of lines) {
    const iso=line.match(/\b(20\d{2}-\d{2}-\d{2})\b/); if(iso && validDate(iso[1]) && iso[1]<=fallback) {boughtOn=iso[1];break;}
    const us=line.match(/\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2}|20\d{2})\b/);
    if(us) {const candidate=`${us[3].length===2?'20'+us[3]:us[3]}-${us[1].padStart(2,'0')}-${us[2].padStart(2,'0')}`; if(validDate(candidate) && candidate<=fallback) {boughtOn=candidate;break;}}
  }
  const merchant=lines.find(s=>/[a-z]/i.test(s) && !IGNORE.test(s) && !/\d{1,2}[.,]\d{2}/.test(s))?.slice(0,80) ?? 'Supermarket';
  const items:FoodItem[]=[]; let skipped=0;
  for(let index=0;index<lines.length;index++) {
    let line=lines[index];
    const qtyLine=line.match(/^(\d+(?:\.\d+)?)\s*(lb|lbs|kg|oz)?\s*[@x]\s*\$?\d+[.,]\d{2}(?:\s+\$?\d+[.,]\d{2})?$/i);
    if(qtyLine && items.length) {const prior=items[items.length-1];const q=Number(qtyLine[1]); if(q>0 && q<10000) {const total=prior.unitCost;prior.quantity=q;prior.unit=qtyLine[2]?.toLowerCase() ?? 'item';prior.unitCost=total===null?null:total/q;} continue;}
    if(IGNORE.test(line) || NONFOOD.test(line) || /\b\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}\b/.test(line) || /\b20\d{2}-\d{2}-\d{2}\b/.test(line)) {skipped++;continue;}
    // Some OCR engines place the price directly underneath its product.
    if(!/\d+[.,]\d{2}\s*[A-Za-z*]?\s*$/.test(line) && /^[A-Za-z][A-Za-z0-9\s&'()/.-]+$/.test(line) && /^\$?\d+[.,]\d{2}\s*[A-Za-z*]?\s*$/.test(lines[index+1]??'')) line+=' '+lines[++index];
    const match=line.match(/^(.*?)\s+\$?(\d{1,6}[.,]\d{2})\s*[A-Za-z*]?\s*$/);
    if(!match || !/[A-Za-z]/.test(match[1])) {skipped++;continue;}
    let name=match[1].replace(/^\d{5,14}\s+/,'').trim(); let quantity=1,unit='item';
    const q=name.match(/^(\d+(?:\.\d+)?)\s*(?:x|@)\s+(.+)$/i); if(q) {quantity=Number(q[1]);name=q[2];}
    if(name.length<2 || quantity<=0 || quantity>100000) {skipped++;continue;}
    name=name.toLowerCase().replace(/\b\w/g,c=>c.toUpperCase());
    const category=guessCategory(name); const price=Number(match[2].replace(',','.'));
    items.push(makeItem({name,category,storage:defaultStorage(name,category),quantity,unit,unitCost:price/quantity,boughtOn}));
  }
  return {items,merchant,boughtOn,fingerprint:fingerprint(text),skipped};
}
export function sampleReceipt(): string {return `GREEN MARKET\n${today()} 10:34 AM\nSTRAWBERRIES 4.49\nBABY SPINACH 3.29\nWHOLE MILK 4.19\n2 x GREEK YOGURT 3.98\nLARGE EGGS 4.20\nSOURDOUGH BREAD 5.50\nPAPER TOWELS 6.99\nSUBTOTAL 32.64\nTAX 0.58\nTOTAL 33.22\nVISA 33.22\nTHANK YOU`;}
