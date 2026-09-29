import { AppState, addDays, daysBetween, targetDate, today } from './model';
export function reminderPlan(state:AppState,now=new Date()): {date:Date;title:string;body:string}[] {
  if(!state.settings.reminders) return [];
  const result=[];
  for(let offset=0;offset<30;offset++) {
    const day=addDays(today(now),offset); const [y,m,d]=day.split('-').map(Number);
    const date=new Date(y,m-1,d,state.settings.reminderHour,0,0);
    if(date<=now) continue;
    const relevant=state.items.filter(item=>{const target=targetDate(item);if(!target) return false;const delta=daysBetween(day,target);return delta<=state.settings.reminderDays && delta>=-7;});
    if(!relevant.length) continue;
    const past=relevant.some(item=>targetDate(item)!<day);
    result.push({date,title:past?'Check your fridge dates':'A little fridge check-in',body:`${relevant.slice(0,3).map(i=>i.name).join(', ')}${relevant.length>3?` + ${relevant.length-3} more`:''}. ${past?'Some items are past their planning target. Review storage guidance.':'Your planning targets are coming up. Take a look.'}`});
  }
  return result;
}
