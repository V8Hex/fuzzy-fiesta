import React,{useEffect,useReducer,useRef,useState} from 'react';
import {ActivityIndicator,AppState as NativeAppState,Image,Linking,Platform,Pressable,ScrollView,StyleSheet,Switch,TextInput,View} from 'react-native';
import {SafeAreaProvider,SafeAreaView} from 'react-native-safe-area-context';
import {StatusBar} from 'expo-status-bar';
import {useFonts,Manrope_500Medium,Manrope_600SemiBold,Manrope_700Bold,Manrope_800ExtraBold} from '@expo-google-fonts/manrope';
import {emojiFonts} from './src/fontAssets';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import {AppState,Activity,Category,EMPTY,FoodItem,GUIDES,STORAGE_NAMES,Storage,DATE_NAMES,decodeState,demoState,estimatedDate,makeItem,prettyDate,reducer,status,targetDate,today,uid,validDate,validateItem} from './src/model';
import {parseReceipt,ParsedReceipt,sampleReceipt} from './src/receipt';
import {canScan,recognizeReceipt} from './src/ocr';
import {remindersAvailable,requestReminders,scheduleReminders,testReminder} from './src/reminders';
import {exportBackup,exportText,importBackup} from './src/backup';
import {DateField,ItemEditor} from './src/ItemEditor';
import {Button,C,Chips,EmptyCard,Field,Icon,IconButton,IconName,Section,Sheet,SheetProvider,T,s} from './src/ui';

type Tab='fridge'|'scan'|'impact'|'settings';
const KEY='fridgeful-state-v1';
const tabItems:{id:Tab;label:string;icon:IconName}[]=[{id:'fridge',label:'My fridge',icon:'grid-outline'},{id:'scan',label:'Add food',icon:'scan-outline'},{id:'impact',label:'My impact',icon:'leaf-outline'},{id:'settings',label:'Settings',icon:'options-outline'}];
type Confirm={title:string;body:string;label:string;action:()=>void};

export default function App() {
  const [fontsLoaded,fontError]=useFonts({Manrope_500Medium,Manrope_600SemiBold,Manrope_700Bold,Manrope_800ExtraBold,...emojiFonts});
  return <SafeAreaProvider><StatusBar style="dark"/><SheetProvider>{fontsLoaded||fontError?<BeforeItGoes/>:<View style={[styles.loading,{backgroundColor:C.bg}]}><ActivityIndicator color={C.green}/></View>}</SheetProvider></SafeAreaProvider>;
}

function BeforeItGoes() {
  const [state,dispatch]=useReducer(reducer,EMPTY);
  const [ready,setReady]=useState(false),[recovery,setRecovery]=useState<string|null>(null),[tab,setTab]=useState<Tab>('fridge');
  const [store,setStore]=useState<Storage|'all'>('all'),[filterSoon,setFilterSoon]=useState(false),[query,setQuery]=useState('');
  const [editor,setEditor]=useState<FoodItem|null>(null),[editorMode,setEditorMode]=useState<'new'|'edit'|'receipt'>('new');
  const [detailId,setDetailId]=useState<string|null>(null),[confirm,setConfirm]=useState<Confirm|null>(null),[toast,setToast]=useState('');
  const [scanText,setScanText]=useState(''),[photo,setPhoto]=useState<string|null>(null),[busy,setBusy]=useState(false),[scanError,setScanError]=useState('');
  const [parsed,setParsed]=useState<ParsedReceipt|null>(null),[selected,setSelected]=useState<string[]>([]),[receiptDate,setReceiptDate]=useState(today()),[receiptMerchant,setReceiptMerchant]=useState('');
  const [saveError,setSaveError]=useState(''),[reminderError,setReminderError]=useState(''),[tick,setTick]=useState(0),[info,setInfo]=useState(false);
  const [loadError,setLoadError]=useState(''),[loadAttempt,setLoadAttempt]=useState(0);
  const persistQueue=useRef<Promise<void>>(Promise.resolve());
  const stateRef=useRef(state);stateRef.current=state;
  const now=today();
  const money=(n:number)=>new Intl.NumberFormat(undefined,{style:'currency',currency:state.settings.currency}).format(n);
  const usedValue=state.activity.filter(a=>a.action==='used').reduce((sum,a)=>sum+(a.item.unitCost??0)*a.quantity,0);
  const wastedValue=state.activity.filter(a=>a.action==='wasted').reduce((sum,a)=>sum+(a.item.unitCost??0)*a.quantity,0);
  const usedCount=state.activity.filter(a=>a.action==='used').length;
  const soon=state.items.filter(i=>['soon','past'].includes(status(i,now,state.settings.reminderDays).kind));
  const detail=state.items.find(i=>i.id===detailId)??null;
  const visible=state.items.filter(i=>(store==='all'||i.storage===store)&&(!filterSoon||['soon','past'].includes(status(i,now,state.settings.reminderDays).kind))&&(`${i.name} ${GUIDES[i.category].name}`.toLowerCase().includes(query.toLowerCase()))).sort((a,b)=>(targetDate(a)??'9999').localeCompare(targetDate(b)??'9999'));

  useEffect(()=>{let active=true;(async()=>{setLoadError('');setReady(false);try{const raw=await AsyncStorage.getItem(KEY);if(!active)return;if(raw){try{dispatch({type:'replace',state:decodeState(raw)});}catch{setRecovery(raw);}}}catch{if(active)setLoadError('Your saved data could not be read. Retry before adding groceries.');}finally{if(active)setReady(true);}})();return()=>{active=false;};},[loadAttempt]);
  useEffect(()=>{if(!ready || recovery!==null || loadError)return;const raw=JSON.stringify(state);persistQueue.current=persistQueue.current.catch(()=>{}).then(async()=>{try{await AsyncStorage.setItem(KEY,raw);setSaveError('');}catch{setSaveError('Could not save your changes. Export a backup before closing the app.');}});},[state,ready,recovery,loadError]);
  useEffect(()=>{if(!ready||recovery!==null||loadError)return;scheduleReminders(state).then(()=>setReminderError('')).catch(error=>setReminderError(error.message));},[state,ready,recovery,tick,loadError]);
  useEffect(()=>{const subscription=NativeAppState.addEventListener('change',next=>{if(next==='active')setTick(t=>t+1);});const timer=setInterval(()=>setTick(t=>t+1),60000);return()=>{subscription.remove();clearInterval(timer);};},[]);
  useEffect(()=>{if(!toast)return;const timer=setTimeout(()=>setToast(''),3500);return()=>clearTimeout(timer);},[toast]);
  function notify(message:string) {setToast(message);if(Platform.OS!=='web')Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(()=>{});}
  function edit(item:FoodItem,mode:'new'|'edit'|'receipt') {setEditorMode(mode);setEditor(item);}
  function saveItem(item:FoodItem) {
    if(editorMode==='receipt'){setParsed(p=>p?{...p,items:p.items.map(i=>i.id===item.id?item:i)}:p);notify('Receipt item updated');return;}
    dispatch(editorMode==='edit'?{type:'update',item}:{type:'add',items:[item]});dispatch({type:'settings',settings:{onboarded:true}});notify(editorMode==='edit'?'Grocery updated':'Added to your kitchen');
  }
  function record(item:FoodItem,quantity:number,action:Activity['action']) {
    if(action==='wasted'){setConfirm({title:'Record food waste?',body:`Mark ${quantity} ${item.unit} of ${item.name} as wasted? You can undo this in My impact.`,label:'Record waste',action:()=>{dispatch({type:'record',id:item.id,quantity,action});setDetailId(null);notify('Recorded. Every check-in helps.');}});return;}
    dispatch({type:'record',id:item.id,quantity,action});if(quantity>=item.quantity)setDetailId(null);notify('Nice — food put to good use 🌱');
  }
  async function pickReceipt(source:'camera'|'library') {
    setScanError('');
    if(!canScan){setScanError('Photo scanning works in the installed iOS and Android app. You can paste receipt text in this preview.');return;}
    try {
      if(source==='camera'){const permission=await ImagePicker.requestCameraPermissionsAsync();if(!permission.granted){setScanError('Allow camera access in your phone settings, or choose a receipt photo.');return;}}
      const result=await (source==='camera'?ImagePicker.launchCameraAsync({quality:1,allowsEditing:false,mediaTypes:['images']}):ImagePicker.launchImageLibraryAsync({quality:1,allowsEditing:false,mediaTypes:['images']}));
      if(result.canceled)return;
      setPhoto(result.assets[0].uri);setBusy(true);
      const text=await recognizeReceipt(result.assets[0].uri);setScanText(text);
      if(!text.trim())setScanError('No text found. Try a sharp, well-lit photo with the receipt flat.');else notify('Receipt read. Review the text, then find groceries.');
    } catch(error) {setScanError(error instanceof Error?error.message:'Could not read this receipt. Try again or paste its text.');}finally{setBusy(false);}
  }
  function reviewReceipt() {
    setScanError('');if(!scanText.trim()){setScanError('Scan a photo or paste receipt text first.');return;}
    const result=parseReceipt(scanText);
    if(state.receipts.some(r=>r.fingerprint===result.fingerprint)){setScanError('This receipt has already been imported. Check your fridge for its groceries.');return;}
    if(!result.items.length){setScanError('No priced groceries found. Edit the text so each item has its name and price on one line, or add food manually.');return;}
    setParsed(result);setSelected(result.items.map(i=>i.id));setReceiptDate(result.boughtOn);setReceiptMerchant(result.merchant);
  }
  function addReceipt() {
    if(!parsed || !selected.length)return;
    if(!validDate(receiptDate)||receiptDate>today()){notify('Choose a purchase date that is today or earlier.');return;}
    if(stateRef.current.receipts.some(r=>r.fingerprint===parsed.fingerprint)){setParsed(null);setScanError('This receipt has already been imported.');return;}
    const receiptId=uid();const items=parsed.items.filter(i=>selected.includes(i.id)).map(i=>({...i,boughtOn:receiptDate,receiptId}));
    const invalid=items.map(i=>validateItem(i)).find(Boolean);if(invalid){notify(invalid);return;}
    dispatch({type:'add',items,receipt:{id:receiptId,fingerprint:parsed.fingerprint,merchant:receiptMerchant.trim()||'Supermarket',boughtOn:receiptDate,count:items.length}});dispatch({type:'settings',settings:{onboarded:true}});
    setParsed(null);setScanText('');setPhoto(null);setTab('fridge');setStore('all');setFilterSoon(false);notify(`${items.length} groceries added to your kitchen`);
  }
  async function toggleReminders(enabled:boolean) {
    if(!enabled){dispatch({type:'settings',settings:{reminders:false}});return;}
    try{if(!await requestReminders()){setReminderError(remindersAvailable?'Allow notifications in your phone settings to turn on reminders.':'Reminders are available in the installed Before It Goes app.');return;}dispatch({type:'settings',settings:{reminders:true}});notify('Reminders are on');}catch(error){setReminderError(error instanceof Error?error.message:'Could not enable reminders.');}
  }
  async function backup() {try{await exportBackup(state);notify('Backup is ready to save');}catch(error){notify(error instanceof Error?error.message:'Could not export your backup.');}}
  async function restore() {try{const next=await importBackup();if(!next)return;setConfirm({title:'Restore this backup?',body:`Replace your current kitchen with ${next.items.length} groceries and ${next.activity.length} activity records? Export your current data first if you want to keep it.`,label:'Restore backup',action:()=>{dispatch({type:'replace',state:next});setDetailId(null);notify('Your kitchen is restored');}});}catch(error){notify(error instanceof Error?error.message:'Could not read this backup.');}}

  if(!ready)return <View style={[styles.loading,{backgroundColor:C.bg}]}><ActivityIndicator color={C.green}/><T>Opening your kitchen…</T></View>;
  if(loadError)return <SafeAreaView style={{flex:1,backgroundColor:C.bg}}><View style={s.page}><T style={s.h1}>Your kitchen needs a moment.</T><T style={s.error}>{loadError}</T><Button label="Try again" onPress={()=>setLoadAttempt(n=>n+1)}/></View></SafeAreaView>;
  if(recovery!==null)return <SafeAreaView style={{flex:1,backgroundColor:C.bg}}><View style={s.page}><T style={s.h1}>Let’s recover your kitchen.</T><T>Saved data could not be read. You can export the original data before starting fresh.</T><Button label="Export original data" onPress={()=>exportText(recovery,'Before-It-Goes-recovery.json').catch(e=>notify(e.message))}/><Button label="Start fresh" secondary onPress={()=>setConfirm({title:'Reset unreadable data?',body:'Export the original data first if you want to preserve it.',label:'Reset',action:()=>{dispatch({type:'replace',state:EMPTY});setRecovery(null);}})}/></View>{confirm&&<ConfirmSheet confirm={confirm} onClose={()=>setConfirm(null)}/>}</SafeAreaView>;
  return <SafeAreaView edges={['top','left','right']} style={styles.safe}>
    <View style={styles.app}>
      <View style={styles.header}><View style={s.row}><View style={styles.brandIcon}><Icon name="leaf" size={22} color={C.lime}/></View><T style={styles.brand}>Before It Goes<T style={{color:'#8BA869',fontSize:25}}> .</T></T></View><IconButton name="information-outline" label="About planning dates" onPress={()=>setInfo(true)}/></View>
      {!!saveError&&<View style={styles.errorBanner}><T style={s.error}>{saveError}</T><Pressable onPress={backup}><T style={s.link}>Export backup</T></Pressable></View>}
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.page} showsVerticalScrollIndicator={false}>
        {tab==='fridge'&&<>
          <View style={{gap:8}}><T style={s.eyebrow}>{new Date().toLocaleDateString(undefined,{month:'long',day:'numeric'})} · YOUR KITCHEN</T><View style={s.between}><T style={s.h1}>Good food.{'\n'}Great timing.</T><View style={styles.itemCount}><View style={styles.dot}/><T style={{fontSize:11,fontFamily:'Manrope_700Bold'}}>{state.items.length} foods</T></View></View><T style={{color:C.muted,lineHeight:22}}>A little less waste, a lot more good.</T></View>
          <View style={styles.hero}>
            <View style={{gap:16,flex:1,zIndex:1}}><T style={[s.eyebrow,{color:'#B7CBB9',letterSpacing:1.6}]}>FIRST IN LINE</T><View><T style={styles.heroNumber}>{soon.length.toString().padStart(2,'0')}</T><T style={{color:'#DAE9D6',fontSize:13,maxWidth:150}}>foods to check first</T></View><Pressable accessibilityRole="button" onPress={()=>{setFilterSoon(true);setStore('all');setQuery('');}} style={styles.heroButton}><T style={{fontFamily:'Manrope_700Bold',fontSize:11}}>View foods</T><Icon name="arrow-forward" size={16}/></Pressable></View>
            <View style={styles.heroArt}><View style={styles.artRing}/><View style={[styles.foodBubble,{top:10,right:16,transform:[{rotate:'12deg'}]}]}><T style={{fontSize:44}}>🥬</T></View><View style={[styles.foodBubble,{bottom:9,right:34,backgroundColor:'#DFECB6',transform:[{rotate:'-12deg'}]}]}><T style={{fontSize:44}}>🍓</T></View><View style={styles.spark}><Icon name="sparkles" size={18} color={C.lime}/></View></View>
          </View>
          <View style={styles.impactStrip}><View style={styles.miniLeaf}><Icon name="leaf-outline" size={18}/></View><View style={{flex:1}}><T style={{fontSize:12,fontFamily:'Manrope_700Bold'}}>{usedCount?`${money(usedValue)} of food put to good use`:'Every grocery deserves a good ending.'}</T><T style={[s.hint,{fontSize:10}]}>Small habits. A happier kitchen.</T></View><Pressable onPress={()=>setTab('impact')} accessibilityRole="button" accessibilityLabel="See my impact"><Icon name="arrow-forward" size={19}/></Pressable></View>
          <Section title="Your kitchen" detail={filterSoon?'Planning targets coming up or passed':'Sorted by the next planning target'} action={<IconButton name="add" label="Add food manually" onPress={()=>edit(makeItem({name:''}),'new')}/>}/>
          <View style={styles.storageTabs}>{(['all','fridge','freezer','pantry'] as const).map(v=><Pressable key={v} accessibilityRole="button" accessibilityLabel={v==='all'?'All food':STORAGE_NAMES[v]} accessibilityState={{selected:store===v}} onPress={()=>setStore(v)} style={[styles.storageTab,store===v&&styles.storageTabSelected]}><T style={[styles.storageTabText,store===v&&{color:'#fff'}]}>{v==='all'?'All food':STORAGE_NAMES[v]}</T></Pressable>)}</View>
          {state.items.length>0&&<View style={{gap:10}}><View style={styles.search}><Icon name="search-outline" size={19} color={C.muted}/><TextInput accessibilityLabel="Search food" placeholder="Find something in your kitchen" placeholderTextColor="#99A396" value={query} onChangeText={setQuery} style={styles.searchInput}/>{!!query&&<Pressable onPress={()=>setQuery('')} accessibilityLabel="Clear search"><Icon name="close-circle" size={18} color={C.muted}/></Pressable>}</View><View style={s.row}><Pressable accessibilityRole="button" accessibilityState={{selected:filterSoon}} onPress={()=>setFilterSoon(!filterSoon)} style={[styles.smallPill,filterSoon&&{backgroundColor:C.amber}]}><Icon name="time-outline" size={14}/><T style={{fontSize:11,fontFamily:'Manrope_700Bold'}}>Use soon {filterSoon?'✓':''}</T></Pressable><T style={s.hint}>{visible.length} groceries</T></View></View>}
          <View style={{gap:10}}>{visible.map(i=><FoodRow key={i.id} item={i} now={now} days={state.settings.reminderDays} onPress={()=>setDetailId(i.id)}/>)}</View>
          {!visible.length&&(state.items.length?<EmptyCard icon="search-outline" title="Nothing here yet" body="Try another storage location or clear your filters."><Button label="Show all food" secondary onPress={()=>{setFilterSoon(false);setStore('all');setQuery('');}}/></EmptyCard>:<EmptyCard title="A fresh start" body="Turn your next grocery trip into a kitchen you can keep track of."><Button label="Add your first receipt" icon="scan-outline" onPress={()=>setTab('scan')} style={{alignSelf:'stretch'}}/><Pressable accessibilityRole="button" onPress={()=>{dispatch({type:'replace',state:demoState()});notify('Demo groceries loaded — clear them in Settings');}}><T style={[s.link,{padding:8}]}>Try a demo fridge ↗</T></Pressable></EmptyCard>)}
          <View style={styles.footerTip}><Icon name="information-circle-outline" size={16} color={C.muted}/><T style={[s.hint,{flex:1,fontSize:10}]}>Dates are planning targets. Your fridge can’t tell if food is safe.</T></View>
        </>}
        {tab==='scan'&&<>
          <View style={{gap:8}}><T style={s.eyebrow}>A QUICK CHECK-IN</T><T style={s.h1}>Groceries in.{'\n'}Guesswork out.</T><T style={{color:C.muted,lineHeight:23}}>Give your receipt a new purpose.</T></View>
          <View style={styles.scanCard}>
            <View style={styles.receiptArt}><View style={styles.receiptPaper}><Icon name="leaf-outline" size={27}/><View style={styles.receiptLine}/><View style={[styles.receiptLine,{width:48}]}/><View style={styles.receiptDotted}/><View style={s.between}><View style={[styles.receiptLine,{width:35}]}/><View style={[styles.receiptLine,{width:22}]}/></View><View style={s.between}><View style={[styles.receiptLine,{width:42}]}/><View style={[styles.receiptLine,{width:18}]}/></View></View><View style={styles.scanBadge}><Icon name="scan" size={23} color="#fff"/></View></View>
            <T style={s.h2}>One receipt. A fuller fridge.</T><T style={{color:C.muted,lineHeight:22,textAlign:'center',maxWidth:270}}>Snap a clear photo, then review the foods we find before adding them.</T>
            <Button label={busy?'Reading your receipt…':'Scan a receipt'} icon="camera-outline" disabled={busy} onPress={()=>pickReceipt('camera')} style={{alignSelf:'stretch'}}/>
            <Button label="Choose a photo" icon="image-outline" secondary disabled={busy} onPress={()=>pickReceipt('library')} style={{alignSelf:'stretch'}}/>
            <View style={[s.row,{gap:6}]}><Icon name="shield-checkmark-outline" size={13} color={C.muted}/><T style={[s.hint,{fontSize:10}]}>Private, on-device text recognition</T></View>
          </View>
          {photo&&<View style={s.card}><Image source={{uri:photo}} style={{height:180,borderRadius:12}} resizeMode="contain"/><T style={[s.hint,{marginTop:10}]}>Receipt photo is used for scanning and isn’t saved in your inventory.</T></View>}
          {!canScan&&<View style={s.notice}><T style={s.h3}>You’re in the preview</T><T style={s.hint}>Camera recognition and phone reminders work in the installed app. Try the sample receipt or paste text below.</T></View>}
          <Section title="Receipt text" action={<Pressable accessibilityRole="button" onPress={()=>{setScanText(sampleReceipt());setScanError('');}}><T style={s.link}>Try a sample</T></Pressable>}/>
          <Field label="Paste or correct receipt text" value={scanText} onChangeText={setScanText} multiline placeholder={'GREEN MARKET\nMILK 4.19\nSTRAWBERRIES 4.49'} hint="Keep each product name and its price together. Review abbreviations, dates and non-food items."/>
          {!!scanError&&<T style={s.error} accessibilityRole="alert">{scanError}</T>}
          <Button label="Find groceries" icon="arrow-forward" disabled={busy||!scanText.trim()} onPress={reviewReceipt}/>
          <View style={styles.orRow}><View style={styles.orLine}/><T style={s.hint}>or keep it simple</T><View style={styles.orLine}/></View>
          <Button label="Add food manually" secondary icon="add-outline" onPress={()=>edit(makeItem({name:''}),'new')}/>
          {state.receipts.length>0&&<><Section title="Recent grocery trips"/>{[...state.receipts].reverse().slice(0,5).map(r=><View style={[s.card,s.between]} key={r.id}><View style={s.row}><Icon name="receipt-outline"/><View><T style={s.h3}>{r.merchant}</T><T style={s.hint}>{prettyDate(r.boughtOn)} · {r.count} foods added</T></View></View><Icon name="checkmark-circle" color="#78915F"/></View>)}</>}
        </>}
        {tab==='impact'&&<>
          <View style={{gap:8}}><T style={s.eyebrow}>LITTLE WINS ADD UP</T><T style={s.h1}>Good for you.{'\n'}Good for the planet.</T><T style={{color:C.muted,lineHeight:23}}>Make the most of what you bring home.</T></View>
          <View style={styles.impactHero}><View style={styles.bigLeaf}><Icon name="leaf-outline" size={40}/></View><T style={[s.eyebrow,{color:'#4C6751'}]}>FOOD VALUE USED</T><T style={[s.h1,{fontSize:48,lineHeight:60}]}>{money(usedValue)}</T><T style={{color:'#4C6751',textAlign:'center',lineHeight:22}}>Worth of groceries you marked as eaten.{'\n'}That’s food doing what it came for.</T></View>
          <View style={{flexDirection:'row',gap:12}}><View style={[s.card,{flex:1,gap:7}]}><Icon name="checkmark-circle-outline" color="#6B8B4C"/><T style={s.h2}>{usedCount}</T><T style={s.hint}>food-use check-ins</T></View><View style={[s.card,{flex:1,gap:7}]}><Icon name="trash-outline" color={C.amberInk}/><T style={s.h2}>{money(wastedValue)}</T><T style={s.hint}>recorded food waste</T></View></View>
          <View style={s.notice}><T style={s.hint}>Based on prices you entered. Unpriced groceries contribute zero to these totals. This tracks food value, rather than proving how much money the app saved.</T></View>
          <Section title="Your food story" detail="Undo a check-in whenever you need to"/>
          {state.activity.length?state.activity.map(a=><View key={a.id} style={[s.card,{padding:16}]}><View style={s.row}><View style={[styles.foodIcon,{width:42,height:42}]}><T style={{fontSize:25}}>{GUIDES[a.item.category].emoji}</T></View><View style={{flex:1,gap:3}}><T style={s.h3} numberOfLines={1}>{a.item.name}</T><T style={s.hint}>{a.action==='used'?'Used':'Wasted'} · {a.quantity} {a.item.unit} · {prettyDate(today(new Date(a.at)))}</T></View><Pressable accessibilityRole="button" accessibilityLabel={`Undo ${a.item.name} check-in`} onPress={()=>{dispatch({type:'undo',id:a.id});notify('Check-in undone');}} style={{padding:8}}><T style={s.link}>Undo</T></Pressable></View></View>):<EmptyCard icon="heart-outline" title="Your next little win" body="Open a grocery in your fridge and mark it as eaten. Your progress will grow here."/>}
        </>}
        {tab==='settings'&&<>
          <View style={{gap:8}}><T style={s.eyebrow}>JUST THE WAY YOU LIKE IT</T><T style={s.h1}>Your kitchen,{'\n'}your rhythm.</T></View>
          <Section title="Gentle reminders"/>
          <View style={[s.card,{gap:18}]}><View style={s.between}><View style={{flex:1}}><T style={s.h3}>Food check-ins</T><T style={s.hint}>A daily heads-up for upcoming targets</T></View><Switch accessibilityLabel="Food reminders" value={state.settings.reminders} onValueChange={toggleReminders} trackColor={{false:'#D5DBD0',true:'#92B775'}} thumbColor="#fff"/></View><View style={{height:1,backgroundColor:C.line}}/><T style={s.label}>Remind me before the target</T><Chips value={state.settings.reminderDays} values={[1,2,3,5,7].map(v=>({value:v,label:`${v} day${v===1?'':'s'}`}))} onChange={reminderDays=>dispatch({type:'settings',settings:{reminderDays}})}/><T style={s.label}>Daily check-in time</T><Chips value={state.settings.reminderHour} values={[8,9,12,17,19].map(v=>({value:v,label:v<12?`${v} AM`:v===12?'12 PM':`${v-12} PM`}))} onChange={reminderHour=>dispatch({type:'settings',settings:{reminderHour}})}/><T style={s.hint}>We schedule up to 30 days ahead and refresh when you open the app. Notification delivery depends on your phone’s settings.</T>{!remindersAvailable&&<T style={s.hint}>Phone reminders need the installed app.</T>}{!!reminderError&&<T style={s.error}>{reminderError}</T>}<Button label="Send a test reminder" secondary icon="notifications-outline" onPress={()=>testReminder().then(()=>notify('A test reminder will arrive in 5 seconds')).catch(e=>setReminderError(e.message))}/></View>
          <Section title="Prices & currency"/><View style={[s.card,{gap:14}]}><Chips value={state.settings.currency} values={[{label:'USD $',value:'USD' as const},{label:'EUR €',value:'EUR' as const},{label:'GBP £',value:'GBP' as const}]} onChange={currency=>dispatch({type:'settings',settings:{currency}})}/><T style={s.hint}>Currency changes how prices are displayed; it does not convert amounts. Use receipts in one currency.</T></View>
          <Section title="Your data stays yours"/><View style={[s.card,{gap:14}]}><View style={s.row}><Icon name="shield-checkmark-outline"/><T style={{flex:1,lineHeight:22}}>No account. No receipt uploads. Your kitchen is saved on this device.</T></View><Button label="Export a backup" icon="download-outline" secondary onPress={backup}/><Button label="Restore a backup" icon="cloud-upload-outline" secondary onPress={restore}/><T style={s.hint}>Backups can be moved between iOS and Android. Uninstalling or clearing app storage removes local data.</T></View>
          <Section title="Planning dates explained"/><View style={[s.card,{gap:12}]}><T style={{lineHeight:23}}>Package dates and storage estimates stay visible side by side. The earlier date becomes your reminder target.</T><T style={s.hint}>Food stored in the freezer gets a quality target. A date cannot detect spoilage, unsafe handling, power outages or recalls.</T><Button label="Read the food guidance" secondary onPress={()=>setInfo(true)}/></View>
          <Button label="Clear my kitchen" danger icon="trash-outline" onPress={()=>setConfirm({title:'Clear your kitchen?',body:'This removes all groceries, grocery trips and food-use history. Export a backup first if you want to keep them.',label:'Clear all data',action:()=>{dispatch({type:'replace',state:{...EMPTY,settings:{...state.settings}}});setQuery('');setFilterSoon(false);setDetailId(null);notify('Ready for a fresh start');}})}/>
          <T style={[s.hint,{textAlign:'center'}]}>Before It Goes · Version 1.0.0{'\n'}Less waste. A fuller life.</T>
        </>}
      </ScrollView>
      <SafeAreaView edges={['bottom']} style={styles.navSafe}><View style={styles.nav}>{tabItems.map(t=><Pressable key={t.id} accessibilityRole="tab" accessibilityState={{selected:tab===t.id}} accessibilityLabel={t.label} onPress={()=>setTab(t.id)} style={styles.navItem}><View style={[styles.navIcon,tab===t.id&&{backgroundColor:C.lime}]}><Icon name={t.icon} size={21} color={tab===t.id?C.ink:'#8F9A8B'}/></View><T style={[styles.navLabel,tab===t.id&&{color:C.ink}]}>{t.label}</T></Pressable>)}</View></SafeAreaView>
      {!!toast&&<View pointerEvents="none" style={styles.toast}><T style={{color:'#fff',fontSize:12,textAlign:'center'}} accessibilityRole="alert">{toast}</T></View>}
    </View>
    <Sheet visible={!!parsed} title="Review your groceries" onClose={()=>setParsed(null)}>
      <View style={s.notice}><T style={s.h3}>A quick check before they go in</T><T style={s.hint}>OCR and category guesses can be wrong. Check each item’s type, quantity, price, storage and package date. Uncheck non-food items.</T></View>
      <Field label="Supermarket" value={receiptMerchant} onChangeText={setReceiptMerchant} maxLength={80}/><DateField label="Purchase date for this receipt" value={receiptDate} onChange={setReceiptDate}/>
      <T style={s.hint}>{parsed?.items.length??0} priced products found. Totals and common non-food lines were skipped.</T>
      {parsed?.items.map(item=><View key={item.id} style={[s.card,{padding:14,gap:10}]}><View style={s.row}><Pressable accessibilityRole="checkbox" accessibilityLabel={`Include ${item.name}`} accessibilityState={{checked:selected.includes(item.id)}} onPress={()=>setSelected(v=>v.includes(item.id)?v.filter(id=>id!==item.id):[...v,item.id])}><Icon name={selected.includes(item.id)?'checkbox':'square-outline'} color={selected.includes(item.id)?C.green:C.muted} size={25}/></Pressable><T style={{fontSize:27}}>{GUIDES[item.category].emoji}</T><View style={{flex:1}}><T style={s.h3}>{item.name}</T><T style={s.hint}>{item.quantity} {item.unit} · {item.unitCost!==null?money(item.unitCost*item.quantity):'No price'} · {STORAGE_NAMES[item.storage]}</T></View><Pressable accessibilityRole="button" accessibilityLabel={`Edit ${item.name}`} onPress={()=>edit({...item,boughtOn:receiptDate},'receipt')} style={{padding:8}}><Icon name="create-outline" size={19}/></Pressable></View><T style={[s.hint,{color:item.category==='other'?C.amberInk:C.muted}]}>{GUIDES[item.category].name} · {item.category==='other'?'Verify type and add a date':`Estimate: ${prettyDate(estimatedDate({...item,boughtOn:validDate(receiptDate)?receiptDate:item.boughtOn}))}`}</T></View>)}
      <Button label={`Add ${selected.length} groceries`} icon="checkmark" disabled={!selected.length} onPress={addReceipt}/>
    </Sheet>
    <Sheet visible={!!detail} title="A closer look" onClose={()=>setDetailId(null)}>{detail&&<>
      <View style={{alignItems:'center',gap:14}}><View style={styles.detailEmoji}><T style={{fontSize:58}}>{GUIDES[detail.category].emoji}</T></View><T style={[s.h1,{fontSize:28,lineHeight:36,textAlign:'center'}]}>{detail.name}</T><T style={s.hint}>{detail.quantity} {detail.unit} · {STORAGE_NAMES[detail.storage]} · {detail.unitCost===null?'No price':money(detail.unitCost*detail.quantity)}</T><StatusPill item={detail} now={now} days={state.settings.reminderDays}/></View>
      <View style={[s.card,{gap:16}]}><DataRow label="Planning target" value={prettyDate(targetDate(detail))}/><DataRow label="Storage estimate" value={prettyDate(estimatedDate(detail))}/><DataRow label={DATE_NAMES[detail.dateKind]+' on package'} value={prettyDate(detail.labelDate)}/><DataRow label={detail.category==='leftovers'?'Cooked on':'Purchased on'} value={prettyDate(detail.boughtOn)}/>{detail.openedOn&&<DataRow label="Opened on" value={prettyDate(detail.openedOn)}/>}</View>
      <View style={s.notice}><T style={s.hint}>{GUIDES[detail.category].note}</T><T style={s.hint}>{GUIDES[detail.category].evidence==='heuristic'?'This is a rough planning estimate. ':''}Keep refrigerated foods at 40°F / 4°C or below; freezers at 0°F / −18°C. These dates cannot confirm safety.</T></View>
      {!!detail.notes&&<T style={{lineHeight:23}}>{detail.notes}</T>}
      {detail.quantity>1&&<Button label={`Ate / used 1 ${detail.unit}`} icon="checkmark-circle-outline" onPress={()=>record(detail,1,'used')}/>}
      <Button label={detail.quantity>1?'Ate / used all of it':'Ate / used it'} icon="restaurant-outline" onPress={()=>record(detail,detail.quantity,'used')}/>
      <Button label="Edit details or package date" secondary icon="create-outline" onPress={()=>{setDetailId(null);edit(detail,'edit');}}/>
      <View style={{flexDirection:'row',gap:10}}>{detail.quantity>1&&<Button label="Wasted 1" danger onPress={()=>record(detail,1,'wasted')} style={{flex:1}}/>}<Button label={detail.quantity>1?'Wasted all':'Wasted it'} danger onPress={()=>record(detail,detail.quantity,'wasted')} style={{flex:1}}/></View>
      <Pressable accessibilityRole="button" onPress={()=>{setDetailId(null);setConfirm({title:'Remove this grocery?',body:'This removes it from tracking without counting it as used or wasted.',label:'Remove grocery',action:()=>dispatch({type:'delete',id:detail.id})});}}><T style={[s.hint,{textAlign:'center',padding:8}]}>Remove from tracking</T></Pressable>
    </>}</Sheet>
    <ItemEditor item={editor} onSave={saveItem} onClose={()=>setEditor(null)}/>
    {confirm&&<ConfirmSheet confirm={confirm} onClose={()=>setConfirm(null)}/>} 
    <Sheet title="Food dates, thoughtfully" visible={info} priority={40} onClose={()=>setInfo(false)}>
      <View style={styles.bigLeaf}><Icon name="leaf-outline" size={40}/></View><T style={s.h2}>Less guesswork. Still use care.</T><T style={{lineHeight:24}}>Before It Goes helps you plan what to use next. It cannot know when food actually spoils or certify that food is safe to eat.</T>
      <View style={s.notice}><T style={s.h3}>Two dates, one planning target</T><T style={s.hint}>Your package date is stored exactly as entered. A category estimate uses purchase and opening dates. Reminders use the earlier of the two, so a later package date won’t override a shorter storage window.</T></View>
      <T style={{lineHeight:24}}>For raw poultry, ground meat, raw meat cuts, fin fish and cooked leftovers, the app uses the short end of published refrigerated guidance. Eggs use the FDA’s 3-week quality recommendation. Produce, dairy and bread estimates are rough planning defaults, clearly marked in item details.</T>
      <T style={{lineHeight:24}}>Freezer estimates concern quality, not a safety deadline. Storage clocks stay tied to purchase dates when you change a location. Always follow product-specific handling, thawing and after-opening instructions.</T>
      <T style={{lineHeight:24}}>Many U.S. food dates describe quality rather than safety. A sell-by date helps stores manage inventory. Date meanings can differ by country and product; follow the label. Infant formula needs its actual labeled use-by date and receives no generic estimate.</T>
      <T style={{lineHeight:24}}>Keep the fridge at 40°F / 4°C or below and the freezer at 0°F / −18°C. Unsafe storage can make food unsafe before any target date.</T>
      <Button label="FoodSafety.gov storage chart" secondary icon="open-outline" onPress={()=>Linking.openURL('https://www.foodsafety.gov/food-safety-charts/cold-food-storage-charts')}/><Button label="FDA egg storage guidance" secondary icon="open-outline" onPress={()=>Linking.openURL('https://www.fda.gov/food/buy-store-serve-safe-food/what-you-need-know-about-egg-safety')}/><Button label="USDA food product dating" secondary icon="open-outline" onPress={()=>Linking.openURL('https://www.fsis.usda.gov/food-safety/safe-food-handling-and-preparation/food-safety-basics/food-product-dating')}/>
    </Sheet>
  </SafeAreaView>;
}

function ConfirmSheet({confirm,onClose}:{confirm:Confirm;onClose:()=>void}) {return <Sheet title={confirm.title} visible priority={30} onClose={onClose}><T style={{lineHeight:24}}>{confirm.body}</T><Button label={confirm.label} danger onPress={()=>{onClose();confirm.action();}}/><Button label="Cancel" secondary onPress={onClose}/></Sheet>;}
function DataRow({label,value}:{label:string;value:string}) {return <View style={s.between}><T style={[s.hint,{flex:1}]}>{label}</T><T style={{fontFamily:'Manrope_700Bold',fontSize:13}}>{value}</T></View>;}
function StatusPill({item,now,days}:{item:FoodItem;now:string;days:number}) {
  const st=status(item,now,days);const color=st.kind==='past'?C.red:st.kind==='soon'?C.amber:st.kind==='unknown'?C.pale:'#EEF5DF';const text=st.kind==='past'?C.redInk:st.kind==='soon'?C.amberInk:C.green;
  return <View style={[styles.statusPill,{backgroundColor:color}]}><View style={{width:4,height:4,borderRadius:2,backgroundColor:text}}/><T style={{fontSize:10,fontFamily:'Manrope_700Bold',color:text}}>{st.text}</T></View>;
}
function FoodRow({item,now,days,onPress}:{item:FoodItem;now:string;days:number;onPress:()=>void}) {
  const target=targetDate(item);const packageControls=target&&item.labelDate===target;
  return <Pressable accessibilityRole="button" accessibilityLabel={`Open ${item.name}`} onPress={onPress} style={({pressed})=>[styles.foodRow,{opacity:pressed?0.7:1}]}><View style={[styles.foodIcon,{backgroundColor:item.category==='berries'?'#FBE9E1':item.category==='milk'?'#EBF0F4':C.pale}]}><T style={{fontSize:29}}>{GUIDES[item.category].emoji}</T></View><View style={{flex:1,gap:5}}><T style={s.h3} numberOfLines={1}>{item.name}</T><T style={[s.hint,{fontSize:10}]} numberOfLines={1}>{item.quantity} {item.unit} · {STORAGE_NAMES[item.storage]} · {packageControls?'Package':target?'Estimate':'Date needed'}{target?' '+prettyDate(target):''}</T></View><View style={{alignItems:'flex-end',gap:6}}><StatusPill item={item} now={now} days={days}/><Icon name="chevron-forward" size={13} color="#9AA68F"/></View></Pressable>;
}

const styles=StyleSheet.create({
  safe:{flex:1,backgroundColor:C.bg},app:{flex:1,width:'100%',maxWidth:520,alignSelf:'center',backgroundColor:C.bg},loading:{flex:1,alignItems:'center',justifyContent:'center',gap:16},
  header:{paddingHorizontal:24,paddingTop:12,paddingBottom:18,flexDirection:'row',justifyContent:'space-between',alignItems:'center'},brandIcon:{width:35,height:35,borderRadius:13,backgroundColor:C.green,alignItems:'center',justifyContent:'center'},brand:{fontFamily:'Manrope_800ExtraBold',fontSize:20,letterSpacing:-0.8},
  itemCount:{backgroundColor:C.pale,flexDirection:'row',alignItems:'center',paddingHorizontal:10,paddingVertical:8,borderRadius:12,gap:6},dot:{width:5,height:5,borderRadius:3,backgroundColor:'#85A85A'},
  hero:{backgroundColor:C.green,borderRadius:27,padding:24,minHeight:210,flexDirection:'row',overflow:'hidden'},heroNumber:{fontFamily:'Manrope_800ExtraBold',fontSize:64,lineHeight:72,color:C.lime,letterSpacing:-4},heroButton:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8,backgroundColor:C.lime,alignSelf:'flex-start',borderRadius:12,paddingHorizontal:12,paddingVertical:12},heroArt:{width:115,height:176,alignSelf:'center',marginRight:-6},artRing:{width:180,height:180,borderRadius:90,borderWidth:1,borderColor:'#456752',position:'absolute',left:7,top:4},foodBubble:{position:'absolute',width:82,height:82,borderRadius:28,alignItems:'center',justifyContent:'center',backgroundColor:'#EAF1D7'},spark:{position:'absolute',left:0,top:87},
  impactStrip:{backgroundColor:'#EEF2E5',padding:15,borderRadius:18,flexDirection:'row',alignItems:'center',gap:10,marginTop:-8},miniLeaf:{width:32,height:32,borderRadius:12,alignItems:'center',justifyContent:'center',backgroundColor:'#DCEAC8'},
  storageTabs:{flexDirection:'row',padding:5,borderRadius:17,backgroundColor:C.pale,marginTop:-8},storageTab:{flex:1,paddingVertical:11,alignItems:'center',borderRadius:12},storageTabSelected:{backgroundColor:C.green},storageTabText:{fontFamily:'Manrope_700Bold',fontSize:11,color:'#728269'},
  search:{flexDirection:'row',alignItems:'center',gap:10,paddingHorizontal:14,minHeight:48,borderRadius:14,borderWidth:1,borderColor:C.line,backgroundColor:'#fff'},searchInput:{flex:1,fontFamily:'Manrope_500Medium',fontSize:12,color:C.ink,paddingVertical:12},smallPill:{backgroundColor:C.pale,borderRadius:12,flexDirection:'row',gap:6,paddingHorizontal:11,paddingVertical:8,alignItems:'center'},
  foodRow:{flexDirection:'row',alignItems:'center',gap:12,padding:14,borderRadius:20,backgroundColor:'#fff',borderWidth:1,borderColor:C.line},foodIcon:{width:52,height:56,borderRadius:17,alignItems:'center',justifyContent:'center',backgroundColor:C.pale},statusPill:{paddingHorizontal:8,paddingVertical:6,borderRadius:9,flexDirection:'row',alignItems:'center',gap:4},footerTip:{flexDirection:'row',gap:8,alignItems:'center'},
  scanCard:{alignItems:'center',backgroundColor:'#EEF3E5',borderWidth:1,borderColor:'#E4EBD8',borderRadius:27,padding:24,gap:14},receiptArt:{height:170,width:160,alignItems:'center',justifyContent:'center'},receiptPaper:{width:110,height:147,padding:17,borderRadius:10,backgroundColor:'#fff',transform:[{rotate:'-7deg'}],gap:9,alignItems:'center',borderWidth:1,borderColor:'#DEE5D1'},receiptLine:{height:4,width:65,borderRadius:2,backgroundColor:'#DCE5D2'},receiptDotted:{height:1,width:68,borderTopWidth:1,borderStyle:'dashed',borderColor:'#CAD7BF'},scanBadge:{position:'absolute',right:3,bottom:8,width:48,height:48,borderRadius:18,backgroundColor:C.green,alignItems:'center',justifyContent:'center',transform:[{rotate:'8deg'}]},orRow:{flexDirection:'row',alignItems:'center',gap:14},orLine:{flex:1,height:1,backgroundColor:C.line},
  impactHero:{backgroundColor:C.lime,borderRadius:27,alignItems:'center',padding:30,gap:12},bigLeaf:{backgroundColor:'#E8F2CF',width:84,height:84,borderRadius:30,alignItems:'center',justifyContent:'center'},detailEmoji:{width:115,height:115,borderRadius:38,alignItems:'center',justifyContent:'center',backgroundColor:C.pale},
  navSafe:{borderTopWidth:1,borderColor:C.line,backgroundColor:C.bg},nav:{flexDirection:'row',paddingTop:10,paddingBottom:12,paddingHorizontal:14,gap:4},navItem:{flex:1,alignItems:'center',gap:5},navIcon:{borderRadius:13,width:46,height:32,alignItems:'center',justifyContent:'center'},navLabel:{fontFamily:'Manrope_700Bold',fontSize:9,color:'#96A18F'},toast:{position:'absolute',bottom:104,left:22,right:22,backgroundColor:C.green,borderRadius:17,padding:15,shadowColor:'#000',shadowOpacity:0.13,shadowRadius:12,elevation:4},errorBanner:{padding:16,backgroundColor:C.red,gap:6},
});
