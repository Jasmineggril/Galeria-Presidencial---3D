#!/usr/bin/env python3
"""Generate locally through ElevenLabs, or import an already generated API response.
Never stores API keys. Not called by the website. Requires explicit --generate for a paid API call.
"""
import argparse,base64,json,os,sys,urllib.request,urllib.error
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def cues_from_alignment(a):
 chars=a.get('characters',[]);starts=a.get('character_start_times_seconds',[]);ends=a.get('character_end_times_seconds',[])
 if not chars or len(chars)!=len(starts) or len(chars)!=len(ends):raise ValueError('Resposta sem alinhamento completo. Não foram criadas legendas estimadas.')
 import math
 if any(not isinstance(x,(int,float)) or not math.isfinite(x) or x<0 for x in starts+ends):raise ValueError('Tempos inválidos.')
 cues=[];begin=0
 for i,c in enumerate(chars):
  if (c in '.!?' and i>begin) or i==len(chars)-1:
   text=''.join(chars[begin:i+1]).strip()
   if text:
    start=float(starts[begin]);end=float(ends[i])
    if end<=start or (cues and start<cues[-1]['end']):raise ValueError('Tempos de legenda incompatíveis.')
    cues.append({'start':start,'end':end,'text':text})
   begin=i+1
 return cues

def main():
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('--generate',action='store_true',help='Gera áudio e pode consumir créditos da sua conta ElevenLabs.');p.add_argument('--response',type=Path,help='Importa resposta JSON ElevenLabs já gerada, sem chamada à API.');a=p.parse_args()
 if bool(a.generate)==bool(a.response):p.error('Escolha --response arquivo.json OU --generate.')
 cfg=json.loads((ROOT/'scripts/lula-narration.json').read_text())
 if a.generate:
  key=os.environ.get('ELEVENLABS_API_KEY');voice=os.environ.get('ELEVENLABS_VOICE_ID')
  if not key or not voice:sys.exit('Defina ELEVENLABS_API_KEY e ELEVENLABS_VOICE_ID somente no ambiente local. Não cole sua chave em arquivos do site.')
  import re
  if not re.fullmatch(r'[A-Za-z0-9_-]+',voice):sys.exit('ID de voz inválido.')
  req=urllib.request.Request('https://api.elevenlabs.io/v1/text-to-speech/'+voice+'/with-timestamps?output_format=mp3_44100_128',data=json.dumps({'text':cfg['text'],'model_id':'eleven_multilingual_v2','voice_settings':{'stability':.5,'similarity_boost':.65}}).encode(),headers={'Content-Type':'application/json','xi-api-key':key},method='POST')
  try:
   with urllib.request.urlopen(req,timeout=120) as r:result=json.load(r)
  except urllib.error.HTTPError as e:sys.exit('ElevenLabs retornou HTTP '+str(e.code)+'. Confira acesso, voz e créditos; nenhuma chave foi gravada.')
 else:result=json.loads(a.response.read_text())
 cues=cues_from_alignment(result.get('normalized_alignment') or result.get('alignment') or {})
 audio=base64.b64decode(result['audio_base64'],validate=True)
 if len(audio)<100:raise ValueError('Arquivo de áudio vazio ou incompleto.')
 out=ROOT/'dist/assets/audio';out.mkdir(exist_ok=True);(out/'lula.mp3').write_bytes(audio);(out/'lula.cues.json').write_text(json.dumps({'cues':cues},ensure_ascii=False,indent=2))
 manifest=json.loads((out/'manifest.json').read_text());manifest.setdefault('recordings',{})['lula']={'src':'assets/audio/lula.mp3','cues':cues,'provider':'ElevenLabs','disclaimer':cfg['disclaimer']};manifest['note']='Áudio gerado ou importado localmente. Conferir voz e texto antes de publicar.';(out/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
 print('Áudio e legendas preparados. Revise no piloto e publique uma nova versão do museu após aprovar.')
if __name__=='__main__':
 try:main()
 except (ValueError,KeyError) as e:sys.exit('Não foi possível preparar o áudio: '+str(e))
