import React,{useCallback,useEffect,useRef,useState} from 'react';
import {Animated,View} from 'react-native';
import {app,Page,Card,Label,Hint,Input,Button,Row,load,store,share,useEntry} from './ui';
export default function App(){
 const [text,setText]=useState(()=>load('options','散步\n看电影\n运动\n在家休息')); const [result,setResult]=useState(''); const [busy,setBusy]=useState(false);const timer=useRef<ReturnType<typeof setTimeout>|null>(null);const scale=useRef(new Animated.Value(1)).current;
 useEffect(()=>()=>{if(timer.current)clearTimeout(timer.current);scale.stopAnimation();},[scale]);
 useEntry(useCallback(p=>{if(typeof p?.options==='string'&&p.options.length<=500){setText(p.options);setResult(typeof p.result==='string'?p.result.slice(0,60):'');}},[]));
 const options=Array.from(new Set(text.split(/[\n、]/).map(x=>x.trim()).filter(Boolean))).slice(0,20);
 function pick(){if(busy)return;if(options.length<2){app.toast.show('至少写两个选项');return;}setBusy(true);setResult('让我想想…');Animated.sequence([Animated.timing(scale,{toValue:0.94,duration:120,useNativeDriver:true}),Animated.timing(scale,{toValue:1,duration:180,useNativeDriver:true})]).start();timer.current=setTimeout(()=>{const candidates=options.filter(x=>x!==result);setResult(candidates[Math.floor(Math.random()*candidates.length)]);setBusy(false);store('options',text);app.haptics.trigger('selection');},320);}
 return <Page title="帮你选" subtitle="把纠结交给随机，把时间留给行动。"><Animated.View style={{transform:[{scale}]}}><Card><Hint>这次就选</Hint><Label large>{result||'今天做点什么？'}</Label><Button label={busy?'正在选择…':'帮我决定'} onPress={pick} disabled={busy}/>{result&&!busy&&<Button secondary label="把这次决定分享出去" onPress={()=>share('帮我选好了：'+result,{options:text,result})}/>}</Card></Animated.View><Input multiline value={text} onChangeText={setText} placeholder="每行一个选项，最多 20 个"/><Row>{['周末安排','午休干啥','今晚娱乐'].map((x,i)=><View key={x}><Button secondary label={x} onPress={()=>{setText(['爬山\n逛展\n野餐\n在家休息','散步\n午睡\n读书\n听音乐','电影\n游戏\n做饭\n运动'][i]);setResult('');}}/></View>)}</Row><Hint>仅用于轻松的小决定，各选项等概率。</Hint></Page>;
}

