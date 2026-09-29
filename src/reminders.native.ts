import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { AppState } from './model';
import { reminderPlan } from './reminderPlan';
export const remindersAvailable=Constants.executionEnvironment!=='storeClient';
const channel='fridgeful-food';
if(remindersAvailable) Notifications.setNotificationHandler({handleNotification:async()=>({shouldShowBanner:true,shouldShowList:true,shouldPlaySound:true,shouldSetBadge:false})});
async function createChannel() { if(Platform.OS==='android') await Notifications.setNotificationChannelAsync(channel,{name:'Food reminders',importance:Notifications.AndroidImportance.DEFAULT,sound:'default'}); }
export async function requestReminders(): Promise<boolean> {
  if(!remindersAvailable) return false;
  await createChannel();
  let permission=await Notifications.getPermissionsAsync();
  if(!permission.granted) permission=await Notifications.requestPermissionsAsync();
  return permission.granted || permission.ios?.status===Notifications.IosAuthorizationStatus.PROVISIONAL;
}
let generation=0;
let queue:Promise<void>=Promise.resolve();
export function scheduleReminders(state:AppState): Promise<void> {
  if(!remindersAvailable) return Promise.resolve();
  const current=++generation;
  const run=async()=>{
    if(current!==generation) return;
    const pending=await Notifications.getAllScheduledNotificationsAsync();
    for(const notification of pending) if(notification.content.data?.kind==='food-plan') await Notifications.cancelScheduledNotificationAsync(notification.identifier);
    if(!state.settings.reminders) return;
    const permission=await Notifications.getPermissionsAsync();
    if(!permission.granted && permission.ios?.status!==Notifications.IosAuthorizationStatus.PROVISIONAL) throw new Error('Reminders need notification permission. Enable it in your phone settings.');
    await createChannel();
    for(const plan of reminderPlan(state)) {
      if(current!==generation) return;
      await Notifications.scheduleNotificationAsync({content:{title:plan.title,body:plan.body,sound:'default',data:{screen:'fridge',kind:'food-plan'}},trigger:{type:Notifications.SchedulableTriggerInputTypes.DATE,date:plan.date,channelId:Platform.OS==='android'?channel:undefined}});
    }
  };
  const task=queue.catch(()=>{}).then(run);queue=task;return task;
}
export async function testReminder() {
  if(!await requestReminders()) throw new Error('Enable notifications in your phone settings first.');
  await Notifications.scheduleNotificationAsync({content:{title:'Your fridge says hello 🌱',body:'Food reminders are ready. You’re all set.',sound:'default'},trigger:{type:Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,seconds:5,channelId:Platform.OS==='android'?channel:undefined}});
}
