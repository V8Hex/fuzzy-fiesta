import {AppState} from './model';
export const remindersAvailable = false;
export async function requestReminders(): Promise<boolean> {return false;}
export async function scheduleReminders(_state:AppState): Promise<void> {}
export async function testReminder(): Promise<void> {throw new Error('Reminders are available in the installed iOS or Android app.');}
