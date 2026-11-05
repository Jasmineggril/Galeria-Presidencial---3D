/** One active synthetic educational narration. No voice cloning or server requests. */
export class Narrator {
 constructor({engine=globalThis.speechSynthesis,Utterance=globalThis.SpeechSynthesisUtterance,onChange=()=>{}}={}){Object.assign(this,{engine,Utterance,onChange});this.state='idle';this.index=0;this.parts=[];this.token=0;}
 get available(){return !!this.engine&&!!this.Utterance;}
 snapshot(){return {state:this.state,index:this.index,parts:[...this.parts],caption:this.parts[this.index]||'',available:this.available};}
 emit(){this.onChange(this.snapshot());}
 load(text){this.stop();this.parts=text.match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map(s=>s.trim()).filter(Boolean)||[];this.index=0;this.emit();}
 play(){if(!this.available){this.state='unavailable';this.emit();return false;}if(this.state==='paused'){this.engine.resume();this.state='playing';this.emit();return true;}if(this.state==='playing')return true;if(this.index>=this.parts.length)this.index=0;this.state='playing';this.speak();return true;}
 speak(){if(this.index>=this.parts.length){this.state='ended';this.emit();return;}const token=++this.token;const u=new this.Utterance(this.parts[this.index]);u.lang='pt-BR';u.rate=.94;const voices=this.engine.getVoices?.()||[];u.voice=voices.find(v=>v.lang.toLowerCase()==='pt-br')||voices.find(v=>v.lang.toLowerCase().startsWith('pt'))||null;u.onend=()=>{if(token!==this.token)return;this.index++;this.speak();};u.onerror=e=>{if(token!==this.token||e.error==='canceled'||e.error==='interrupted')return;this.state='error';this.emit();};this.emit();this.engine.speak(u);}
 pause(){if(this.state!=='playing')return;this.engine.pause();this.state='paused';this.emit();}
 restart(){this.stop();this.index=0;return this.play();}
 stop(){this.token++;this.engine?.cancel();this.state='idle';this.emit();}
}
