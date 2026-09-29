import {Platform} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import {AppState,decodeState,today} from './model';
export async function exportBackup(state:AppState) {return exportText(JSON.stringify(state,null,2),`Fridgeful-backup-${today()}.json`);}
export async function exportText(content:string,name:string) {
  if(Platform.OS==='web') {
    const blob=new Blob([content],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);return;
  }
  const path=(FileSystem.cacheDirectory??'')+name;
  if(!FileSystem.cacheDirectory) throw new Error('Could not create a backup file on this device.');
  await FileSystem.writeAsStringAsync(path,content);
  if(!await Sharing.isAvailableAsync()) throw new Error('File sharing is unavailable on this device.');
  await Sharing.shareAsync(path,{mimeType:'application/json',UTI:'public.json',dialogTitle:'Save your Fridgeful backup'});
}
export async function importBackup():Promise<AppState|null> {
  const result=await DocumentPicker.getDocumentAsync({type:['application/json','text/plain'],copyToCacheDirectory:true});
  if(result.canceled) return null;
  const asset=result.assets[0];
  if((asset.size??0)>10*1024*1024) throw new Error('Choose a backup smaller than 10 MB.');
  const raw=Platform.OS==='web'?await (asset.file?asset.file.text():fetch(asset.uri).then(r=>r.text())):await FileSystem.readAsStringAsync(asset.uri);
  return decodeState(raw);
}
