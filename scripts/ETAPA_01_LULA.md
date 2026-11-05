# Etapa 1 — Piloto da voz do Lula

Feito nesta etapa: roteiro revisável, player de áudio gravado, legendas com tempos reais, importação local de MP3 e VTT/JSON, e seleção automática de gravação aprovada pelo museu via manifesto. O MP3 do ElevenLabs ainda não foi gerado. Não foi usada uma conta nem consumido crédito do serviço nesta sessão.

## Caminho simples

1. Abra o piloto `dist/lula-piloto.html` pelo servidor do projeto (ou pelo link no museu).
2. Copie o roteiro e gere no ElevenLabs com uma voz de narrador em português. Não clone a voz do presidente.
3. Baixe o MP3 e selecione no piloto. Se tiver legendas com tempos reais, selecione VTT ou JSON com `cues: [{start: 0, end: 3.5, text: "trecho"}]`.
4. Avalie voz, pronúncia e ritmo. Os arquivos ficam no navegador; recarregar descarta o teste. Envie o arquivo aprovado para incorporá-lo ao acervo hospedado.

Sem tempos reais, o player reproduz o áudio e mantém o roteiro para leitura, sem fingir sincronização. Não há movimento de boca nesta fase.

## API opcional para quem executa o projeto localmente

Documentação oficial: https://elevenlabs.io/docs/api-reference/text-to-speech/convert-with-timestamps/

O script `prepare-lula-audio.py` recebe uma resposta ElevenLabs já gerada:

```
python scripts/prepare-lula-audio.py --response resposta.json
```

Ou gera o áudio usando `--generate`, após configurar `ELEVENLABS_API_KEY` e `ELEVENLABS_VOICE_ID` como variáveis de ambiente locais. Esta chamada pode consumir créditos; confira plano e voz antes de executar. O script NÃO foi executado contra o serviço nesta entrega. Não coloque a chave no JavaScript, no Git ou em arquivos públicos.

O resultado inclui `assets/audio/lula.mp3`, `lula.cues.json` e atualização de `manifest.json`. Revise e publique a nova versão. A API retorna o alinhamento de caracteres; as legendas são agrupadas a partir desses tempos, sem tempos inventados.

## Próximas fases

- Receber o modelo 3D licenciado de Lula selecionado no Sketchfab e avaliar geometria e texturas.
- Ajustar o busto, pedestal e iluminação na sala.
- Testar voz e visita em dispositivo com WebGL e depois em headset.
- Repetir o padrão aprovado para Bolsonaro, Temer, Dilma e demais presidentes.


## Atualização de 03/11/2026 — narração Lula
MP3 real gerado no ElevenLabs com a voz brasileira Paulo (Eleven v4), integrado ao museu e ao piloto. Dramatização educativa, sem imitação da voz do presidente. Sem tempos de legenda exportados: o roteiro é mostrado por completo. Malha facial fiel e sincronização labial continuam pendentes.


## Lote de narrações — 03/11/2026
19 gravações ElevenLabs integradas. Voz: Paulo — Natural Brazilian Voice (Eleven v4), dramatização educativa. Restam 17 roteiros no arquivo scripts/narracoes-pendentes.json. As demais fichas mantêm síntese de voz do navegador. Saldo observado: 413 créditos, insuficiente para o próximo roteiro completo; nenhum plano contratado. Sem marcações temporais exportadas.
