import React,{useState} from 'react';
import {View,Pressable,Platform} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import {Category,FoodItem,Storage,DateKind,GUIDES,DATE_NAMES,STORAGE_NAMES,estimatedDate,targetDate,prettyDate,today,validateItem} from './model';
import {C,T,s,Sheet,Field,Chips,Button,Icon} from './ui';
export function DateField({label,value,onChange,optional=false}:{label:string;value:string;onChange:(v:string)=>void;optional?:boolean}) {
  const [show,setShow]=useState(false);const date=/^\d{4}-\d{2}-\d{2}$/.test(value)?new Date(value+'T12:00:00'):new Date();
  return <View style={{gap:8}}>{Platform.OS==='web'?<Field label={label} value={value} onChangeText={onChange} placeholder={optional?'Optional · YYYY-MM-DD':'YYYY-MM-DD'} maxLength={10}/>:<><T style={s.label}>{label}</T><Pressable accessibilityRole="button" accessibilityLabel={label} onPress={()=>setShow(!show)} style={[s.input,s.between]}><T>{value?prettyDate(value)+', '+value.slice(0,4):'Optional — tap to select'}</T><Icon name="calendar-outline" size={18}/></Pressable>{show&&<DateTimePicker value={date} mode="date" display={Platform.OS==='ios'?'spinner':'default'} onChange={(_,d)=>{if(Platform.OS==='android')setShow(false);if(d)onChange(today(d));}}/>}{show&&Platform.OS==='ios'&&<Button label="Done" secondary onPress={()=>setShow(false)}/>}</>}{optional&&value&&<Pressable onPress={()=>onChange('')} accessibilityRole="button"><T style={s.link}>Remove date</T></Pressable>}</View>;
}
export function ItemEditor({item,onSave,onClose}:{item:FoodItem|null;onSave:(item:FoodItem)=>void;onClose:()=>void}) {
  if(!item) return null;
  return <Editor key={item.id} item={item} onSave={onSave} onClose={onClose}/>;
}
function Editor({item,onSave,onClose}:{item:FoodItem;onSave:(item:FoodItem)=>void;onClose:()=>void}) {
  const [draft,setDraft]=useState(item);const [quantity,setQuantity]=useState(String(item.quantity));const [price,setPrice]=useState(item.unitCost===null?'':(item.unitCost*item.quantity).toFixed(2));const [error,setError]=useState('');
  const patch=(values:Partial<FoodItem>)=>setDraft(d=>({...d,...values}));
  function save() {
    const q=Number(quantity); const total=price.trim()===''?null:Number(price);
    const next={...draft,name:draft.name.trim(),unit:draft.unit.trim()||'item',quantity:q,unitCost:total===null?null:total/q};
    const issue=validateItem(next);if(issue){setError(issue);return;}
    onSave(next);onClose();
  }
  return <Sheet title="Grocery details" visible priority={20} onClose={onClose}>
    <Field label="Item name" value={draft.name} onChangeText={name=>patch({name})} maxLength={120} placeholder="e.g. Strawberries"/>
    <View style={{gap:10}}><T style={s.label}>Food type</T><Chips values={(Object.keys(GUIDES) as Category[]).map(c=>({label:`${GUIDES[c].emoji} ${GUIDES[c].name}`,value:c}))} value={draft.category} onChange={category=>patch({category})}/></View>
    <View style={{gap:10}}><T style={s.label}>Keep it in</T><Chips values={(Object.keys(STORAGE_NAMES) as Storage[]).map(k=>({label:STORAGE_NAMES[k],value:k}))} value={draft.storage} onChange={storage=>patch({storage})}/><T style={s.hint}>Changing storage keeps the original purchase clock. Freeze promptly; moving food does not restore its freshness.</T></View>
    <View style={{flexDirection:'row',gap:12}}><View style={{flex:1}}><Field label="Quantity" value={quantity} onChangeText={setQuantity} keyboardType="decimal-pad"/></View><View style={{flex:1}}><Field label="Unit" value={draft.unit} onChangeText={unit=>patch({unit})} placeholder="pack, lb, egg" maxLength={20}/></View></View>
    <Field label="Total price for this quantity" value={price} onChangeText={setPrice} placeholder="Optional" keyboardType="decimal-pad" hint="Used to estimate the value of food you eat or waste."/>
    <DateField label={draft.category==='leftovers'?'Cooked on':'Purchased on'} value={draft.boughtOn} onChange={boughtOn=>patch({boughtOn})}/>
    <DateField label="Opened on" optional value={draft.openedOn??''} onChange={openedOn=>patch({openedOn:openedOn||null})}/>
    <View style={{gap:10}}><T style={s.label}>Package date type</T><Chips values={(Object.keys(DATE_NAMES) as DateKind[]).map(k=>({label:DATE_NAMES[k],value:k}))} value={draft.dateKind} onChange={dateKind=>patch({dateKind})}/></View>
    <DateField label="Date printed on the package" optional value={draft.labelDate??''} onChange={labelDate=>patch({labelDate:labelDate||null})}/>
    <View style={s.notice}><T style={s.h3}>Planning target · {prettyDate(targetDate(draft))}</T><T style={s.hint}>Storage estimate: {prettyDate(estimatedDate(draft))}. The earlier of your package date and storage estimate drives reminders.</T><T style={s.hint}>{GUIDES[draft.category].note}</T>{GUIDES[draft.category].evidence==='heuristic'&&<T style={s.hint}>This category uses a rough planning estimate.</T>}{draft.storage==='pantry'&&GUIDES[draft.category].pantry===null&&<T style={[s.hint,{color:C.redInk}]}>No pantry estimate for this category. Perishable food usually needs refrigeration; follow its storage instructions.</T>}<T style={s.hint}>Targets cannot confirm food is safe to eat. Storage, handling and the specific product matter.</T></View>
    <Field label="Notes" value={draft.notes} onChangeText={notes=>patch({notes})} placeholder="Brand, storage instructions, meal idea…" maxLength={600}/>
    {!!error&&<T accessibilityRole="alert" style={s.error}>{error}</T>}
    <Button label="Save grocery" icon="checkmark" onPress={save}/>
  </Sheet>;
}
