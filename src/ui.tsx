import React,{createContext,useCallback,useContext,useId,useLayoutEffect,useMemo,useState} from 'react';
import {View,Text,Pressable,StyleSheet,TextInput,Modal,ScrollView,KeyboardAvoidingView,Platform,ViewStyle,TextInputProps} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Ionicons} from '@expo/vector-icons';
export const C={bg:'#FAFAF3',paper:'#FFFFFF',ink:'#183F31',muted:'#728078',line:'#E7EADF',lime:'#DAEEAB',green:'#214B38',pale:'#EDF2E6',amber:'#FFF0D5',amberInk:'#8C5B16',red:'#FCE5DF',redInk:'#A14532'};
export type IconName=React.ComponentProps<typeof Ionicons>['name'];
export function Icon({name,size=22,color=C.ink}:{name:IconName;size?:number;color?:string}) {return <Ionicons name={name} size={size} color={color}/>;}
export function T({children,style,numberOfLines,...props}:React.ComponentProps<typeof Text>) {
  const flat=StyleSheet.flatten([{fontFamily:'Manrope_500Medium',color:C.ink,fontSize:14},style]);
  if(Platform.OS==='web')flat.fontFamily+=', FoodEmoji, sans-serif';
  return <Text {...props} numberOfLines={numberOfLines} style={flat}>{children}</Text>;
}
export function Button({label,onPress,icon,secondary=false,danger=false,disabled=false,style}:{label:string;onPress:()=>void;icon?:IconName;secondary?:boolean;danger?:boolean;disabled?:boolean;style?:ViewStyle}) {return <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={onPress} style={({pressed})=>[s.button,{backgroundColor:danger?C.red:secondary?C.pale:C.green,opacity:disabled?0.45:pressed?0.8:1},style]}>{icon&&<Icon name={icon} size={19} color={secondary||danger?C.ink:'#fff'}/>}<T style={[s.buttonText,{color:danger?C.redInk:secondary?C.ink:'#fff'}]}>{label}</T></Pressable>;}
export function IconButton({name,label,onPress}:{name:IconName;label:string;onPress:()=>void}) {return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} hitSlop={8} style={({pressed})=>[s.iconButton,{opacity:pressed?0.6:1}]}><Icon name={name}/></Pressable>;}
export function Field({label,hint,...props}:TextInputProps & {label:string;hint?:string}) {return <View style={{gap:7}}><T style={s.label}>{label}</T><TextInput accessibilityLabel={label} placeholderTextColor="#A1AAA0" {...props} style={[s.input,props.multiline&&{height:150,textAlignVertical:'top'},props.style]}/>{hint&&<T style={s.hint}>{hint}</T>}</View>;}
export function Chips<TValue extends string|number>({values,value,onChange}:{values:{label:string;value:TValue}[];value:TValue;onChange:(v:TValue)=>void}) {return <View style={s.chips}>{values.map(v=><Pressable key={String(v.value)} accessibilityRole="button" accessibilityLabel={v.label} accessibilityState={{selected:v.value===value}} onPress={()=>onChange(v.value)} style={[s.chip,v.value===value&&s.chipActive]}><T style={[s.chipText,v.value===value&&{color:'#fff'}]}>{v.label}</T></Pressable>)}</View>;}
type SheetContent={title:string;onClose:()=>void;children:React.ReactNode;priority:number};
const SheetContext=createContext<{register:(id:string,content:SheetContent)=>void;remove:(id:string)=>void}|null>(null);
// One native modal hosts stacked flows so iOS never presents sibling modals concurrently.
export function SheetProvider({children}:{children:React.ReactNode}) {
  const [entries,setEntries]=useState<Map<string,SheetContent>>(()=>new Map());
  const register=useCallback((id:string,content:SheetContent)=>setEntries(old=>{const next=new Map(old);next.set(id,content);return next;}),[]);
  const remove=useCallback((id:string)=>setEntries(old=>{if(!old.has(id))return old;const next=new Map(old);next.delete(id);return next;}),[]);
  const context=useMemo(()=>({register,remove}),[register,remove]);
  const active=[...entries.entries()].sort((a,b)=>a[1].priority-b[1].priority).at(-1);
  return <SheetContext.Provider value={context}>{children}<Modal visible={!!active} animationType="slide" presentationStyle="pageSheet" onRequestClose={active?.[1].onClose}>{active&&<SafeAreaView style={{flex:1,backgroundColor:C.bg}}><KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':undefined}><View style={s.sheetHeader}><T style={[s.h2,{flex:1}]}>{active[1].title}</T><IconButton name="close" label="Close" onPress={active[1].onClose}/></View><ScrollView key={active[0]} keyboardShouldPersistTaps="handled" contentContainerStyle={{padding:24,gap:20,paddingBottom:40}}>{active[1].children}</ScrollView></KeyboardAvoidingView></SafeAreaView>}</Modal></SheetContext.Provider>;
}
export function Sheet({title,visible,onClose,children,priority=10}:{title:string;visible:boolean;onClose:()=>void;children:React.ReactNode;priority?:number}) {
  const id=useId();const context=useContext(SheetContext);
  if(!context)throw new Error('SheetProvider is required.');
  useLayoutEffect(()=>{if(visible)context.register(id,{title,onClose,children,priority});else context.remove(id);return()=>context.remove(id);},[context,id,visible,title,onClose,children,priority]);
  return null;
}
export function Section({title,detail,action}:{title:string;detail?:string;action?:React.ReactNode}) {return <View style={s.section}><View style={{flex:1}}><T style={s.h2}>{title}</T>{detail&&<T style={[s.hint,{marginTop:4}]}>{detail}</T>}</View>{action}</View>;}
export function EmptyCard({icon='leaf-outline',title,body,children}:{icon?:IconName;title:string;body:string;children?:React.ReactNode}) {return <View style={s.empty}><View style={s.emptyIcon}><Icon name={icon} size={34}/></View><T style={s.h2}>{title}</T><T style={{textAlign:'center',color:C.muted,lineHeight:23,maxWidth:280}}>{body}</T>{children}</View>;}
export const s=StyleSheet.create({
  page:{padding:24,gap:24,paddingBottom:30},row:{flexDirection:'row',alignItems:'center',gap:12},between:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:12},
  h1:{fontFamily:'Manrope_800ExtraBold',fontSize:34,letterSpacing:-1.4,lineHeight:42},h2:{fontFamily:'Manrope_800ExtraBold',fontSize:20,letterSpacing:-0.6},h3:{fontFamily:'Manrope_700Bold',fontSize:16,letterSpacing:-0.3},
  eyebrow:{fontFamily:'Manrope_700Bold',fontSize:10,letterSpacing:2,color:C.muted,textTransform:'uppercase'},hint:{fontSize:12,lineHeight:18,color:C.muted},
  button:{minHeight:52,borderRadius:17,paddingHorizontal:18,paddingVertical:14,flexDirection:'row',gap:9,alignItems:'center',justifyContent:'center'},buttonText:{fontFamily:'Manrope_700Bold',fontSize:14},
  iconButton:{width:44,height:44,borderRadius:22,backgroundColor:C.pale,alignItems:'center',justifyContent:'center'},label:{fontFamily:'Manrope_700Bold',fontSize:12},input:{minHeight:52,backgroundColor:'#fff',borderWidth:1,borderColor:C.line,borderRadius:14,paddingHorizontal:15,paddingVertical:14,fontFamily:'Manrope_500Medium',fontSize:14,color:C.ink},
  chips:{flexDirection:'row',flexWrap:'wrap',gap:8},chip:{borderRadius:13,paddingHorizontal:13,paddingVertical:10,backgroundColor:C.pale},chipActive:{backgroundColor:C.green},chipText:{fontSize:12,fontFamily:'Manrope_700Bold'},
  sheetHeader:{padding:20,borderBottomWidth:1,borderColor:C.line,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},card:{backgroundColor:C.paper,borderRadius:22,padding:20,borderWidth:1,borderColor:C.line},
  section:{flexDirection:'row',alignItems:'center',gap:10},empty:{alignItems:'center',gap:14,backgroundColor:'#fff',borderWidth:1,borderColor:C.line,borderRadius:26,padding:28},emptyIcon:{width:75,height:75,borderRadius:28,backgroundColor:C.lime,alignItems:'center',justifyContent:'center'},
  notice:{padding:16,backgroundColor:C.pale,borderRadius:16,gap:6},link:{fontFamily:'Manrope_700Bold',fontSize:12,color:C.green},error:{color:C.redInk,fontSize:13,lineHeight:20},
});
