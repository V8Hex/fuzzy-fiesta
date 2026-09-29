import {test} from 'node:test';
import assert from 'node:assert/strict';
import {EMPTY,addDays,daysBetween,decodeState,estimatedDate,makeItem,reducer,status,targetDate,validDate,validateItem} from '../src/model';
import {parseReceipt,guessCategory} from '../src/receipt';
import {reminderPlan} from '../src/reminderPlan';

test('calendar arithmetic handles leap days and daylight-saving dates',()=>{
  assert.equal(addDays('2024-02-28',1),'2024-02-29');assert.equal(addDays('2025-03-08',2),'2025-03-10');assert.equal(daysBetween('2025-03-08','2025-03-10'),2);
  assert.equal(validDate('2025-02-29'),false);assert.equal(validDate('2026-04-31'),false);assert.equal(validDate('2024-02-29'),true);
});
test('a later package date cannot extend short raw poultry guidance',()=>{
  const item=makeItem({name:'Chicken',category:'poultry',boughtOn:'2026-09-01',labelDate:'2026-09-12'});
  assert.equal(estimatedDate(item),'2026-09-02');assert.equal(targetDate(item),'2026-09-02');
});
test('opening shortens a window, but never lengthens the original window',()=>{
  const item=makeItem({name:'Milk',category:'milk',boughtOn:'2026-09-01',openedOn:'2026-09-02'});
  assert.equal(estimatedDate(item),'2026-09-07');assert.equal(estimatedDate({...item,openedOn:'2026-09-07'}),'2026-09-08');
});
test('unknown categories and unsuitable storage get no invented date',()=>{
  assert.equal(targetDate(makeItem({name:'Unknown'})),null);
  assert.equal(estimatedDate(makeItem({name:'Eggs',category:'eggs',storage:'freezer'})),null);
  assert.equal(estimatedDate(makeItem({name:'Chicken',category:'poultry',storage:'pantry'})),null);
});
test('a past date is described as past a target, not as guaranteed spoilage',()=>{
  const item=makeItem({name:'Rice',category:'dry',labelDate:'2026-09-01'});
  assert.deepEqual(status(item,'2026-09-03'),{kind:'past',text:'2d past target',days:-2});
});
test('future and impossible opening dates are rejected',()=>{
  const item=makeItem({name:'Milk',category:'milk',boughtOn:'2026-09-01',openedOn:'2026-08-31'});
  assert.match(validateItem(item,'2026-09-02')??'',/Opening date/);
  assert.match(validateItem({...item,openedOn:null,boughtOn:'2026-09-03'},'2026-09-02')??'',/Purchase date/);
});
test('incomplete date input has no target and cannot crash editor previews',()=>{
  const item=makeItem({name:'Milk',category:'milk',boughtOn:'2026-',labelDate:'2026-'});
  assert.equal(estimatedDate(item),null);assert.equal(targetDate(item),null);
  assert.equal(estimatedDate({...item,boughtOn:'2026-09-01',openedOn:'2026-'}),'2026-09-08');
});
test('partial usage and undo preserve quantities and proportional cost',()=>{
  const item=makeItem({name:'Yogurt',quantity:4,unitCost:1.5});let state=reducer(EMPTY,{type:'add',items:[item]});
  state=reducer(state,{type:'record',id:item.id,quantity:1,action:'used'});assert.equal(state.items[0].quantity,3);assert.equal(state.activity[0].quantity*state.activity[0].item.unitCost!,1.5);
  state=reducer(state,{type:'record',id:item.id,quantity:3,action:'wasted'});assert.equal(state.items.length,0);
  state=reducer(state,{type:'undo',id:state.activity[0].id});assert.equal(state.items[0].quantity,3);assert.equal(state.items[0].unitCost,1.5);
  state=reducer(state,{type:'undo',id:state.activity[0].id});assert.equal(state.items[0].quantity,4);assert.equal(state.activity.length,0);
});
test('invalid quantities cannot corrupt inventory or activity',()=>{
  const item=makeItem({name:'Milk'});const state=reducer(EMPTY,{type:'add',items:[item]});
  for(const q of [-1,0,NaN,2])assert.equal(reducer(state,{type:'record',id:item.id,quantity:q,action:'used'}),state);
});
test('receipt parsing handles tax flags, quantities, price on next line, and exclusions',()=>{
  const receipt=parseReceipt('GREEN MARKET\n09/01/2026\nMILK 4.19 F\n2 x GREEK YOGURT 3.98\nSTRAWBERRIES\n4.49\nPAPER TOWELS 6.99\nSUBTOTAL 19.65\nTAX 0.42\nVISA 20.07','2026-09-29');
  assert.equal(receipt.merchant,'GREEN MARKET');assert.equal(receipt.boughtOn,'2026-09-01');assert.equal(receipt.items.length,3);assert.equal(receipt.items[1].quantity,2);assert.equal(receipt.items[1].unitCost,1.99);assert.equal(receipt.items[2].category,'berries');
});
test('weighted receipt lines and raw/cooked category distinctions remain reviewable',()=>{
  const receipt=parseReceipt('SHOP\nBANANA 2.00\n2 lb @ 1.00','2026-09-29');assert.equal(receipt.items[0].quantity,2);assert.equal(receipt.items[0].unit,'lb');assert.equal(receipt.items[0].unitCost,1);
  assert.equal(guessCategory('ROTISSERIE CHICKEN'),'leftovers');assert.equal(guessCategory('GROUND TURKEY'),'ground');assert.equal(guessCategory('CANNED TUNA'),'dry');assert.equal(guessCategory('BACON'),'other');assert.equal(guessCategory('INFANT FORMULA'),'other');
});
test('backup round-trips and rejects malformed or unsupported data',()=>{
  const state=reducer(EMPTY,{type:'add',items:[makeItem({name:'Eggs',category:'eggs'})]});assert.deepEqual(decodeState(JSON.stringify(state)),state);
  assert.throws(()=>decodeState(JSON.stringify({...state,version:2})));
  assert.throws(()=>decodeState(JSON.stringify({...state,items:[{...state.items[0],quantity:-1}]})));
  assert.throws(()=>decodeState(JSON.stringify({...state,settings:{...state.settings,reminderDays:99}})));
  assert.throws(()=>decodeState(JSON.stringify({...state,items:[{...state.items[0],category:'toString'}]})));
});
test('daily reminders group items, skip past notification times, and stop when disabled',()=>{
  const state={...EMPTY,settings:{...EMPTY.settings,reminders:true},items:[makeItem({name:'Milk',category:'dry',labelDate:'2026-09-03'}),makeItem({name:'Bread',category:'dry',labelDate:'2026-09-03'})]};
  const plans=reminderPlan(state,new Date(2026,8,1,10));assert.equal(plans[0].date.getDate(),2);assert.match(plans[0].body,/Milk, Bread/);assert.ok(plans.length<=30);
  assert.equal(reminderPlan({...state,settings:{...state.settings,reminders:false}}).length,0);
});
