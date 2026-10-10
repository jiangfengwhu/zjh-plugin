import React,{useCallback,useState} from 'react';
import {View} from 'react-native';
import {app,Page,Card,Label,Hint,Input,Button,load,store,share,useEntry} from './ui';
type Note={id:string;text:string;at:number};
export default function App(){const [notes,setNotes]=useState<Note[]>(()=>{const v=load<unknown>('notes',[]);return Array.isArray(v)?v.filter(x=>typeof x?.id==='string'&&typeof x?.text==='string'&&Number.isFinite(x?.at)).slice(0,100):[];});const [text,setText]=useState(()=>load('draft',''));const [trash,setTrash]=useState<Note>();
 useEntry(useCallback(p=>{if(typeof p?.note==='string'){setText(p.note.slice(0,500));}},[]));
 function update(next:Note[]){setNotes(next);store('notes',next);}function edit(v:string){setText(v);store('draft',v);}
 function save(){if(!text.trim())return;update([{id:Date.now().toString(36),text:text.trim(),at:Date.now()},...notes].slice(0,100));edit('');app.haptics.trigger('selection');}
 const items=notes.map(n=><Card key={n.id}><Label>{n.text}</Label><Hint>{new Date(n.at).toLocaleDateString()}</Hint><View style={{flexDirection:'row',gap:12}}><View style={{flex:1}}><Button secondary label="分享这条" onPress={()=>share('给你一张便签',{note:n.text})}/></View><View style={{flex:1}}><Button secondary label="删除" onPress={()=>{setTrash(n);update(notes.filter(x=>x.id!==n.id));}}/></View></View></Card>);
 return <Page title="口袋便签" subtitle="突然想到的事，先记下来。" items={items}><Card><Input multiline value={text} onChangeText={edit} placeholder="灵感、待办，或一句想记住的话…"/><Button label="记下这条" disabled={!text.trim()} onPress={save}/><Hint>自动保留草稿 · 便签存于本机 · 最多 100 条</Hint></Card>{trash&&<Button secondary label="撤销刚才的删除" onPress={()=>{update([trash,...notes].slice(0,100));setTrash(undefined);}}/>}<Label>最近记录 · {notes.length}</Label>{notes.length===0&&<Hint>写下第一条，让脑子腾点空间。</Hint>}</Page>;
}
