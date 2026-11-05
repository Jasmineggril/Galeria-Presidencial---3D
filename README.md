# Galeria Presidencial — Museu da República

Protótipo educativo em A-Frame 1.7.0 e JavaScript. Versão 0.6.0, 02/11/2026.
UnDF · Projeto Aplicado V — Gestão e Produção · 2026.2
Professora Cíntia da Costa Souza.
Equipe: Jasmine de Sá Araujo, Francisco Daniel Bento dos Santos e Estevão Souza Araújo.

## Executar

Não abra o HTML diretamente com file://. Na pasta do projeto execute:

```sh
python -m http.server 8000 --directory dist
```

Abra http://localhost:8000. Ou use iniciar_windows.bat/iniciar.sh, conforme suas instruções. Não há dependências para instalar para visitar o aplicativo. Node.js é necessário somente para executar os testes (`npm test` ou `npm run check`).

## O que há nesta versão

- 36 registros únicos da sequência de presidentes individuais, incluindo interinos; mandatos repetidos ficam na mesma ficha. Não contamos substituições ocasionais em viagens, membros de juntas ou eleitos não empossados como presidentes individuais adicionais.
- Seis salas: República da Espada, República Oligárquica, Era Vargas e transição, República de 1946, Ditadura militar e Nova República.
- 36 modelos GLB locais, 36 prévias derivadas da geometria original e fichas com fonte. Os modelos são estudos estilizados provisórios, sem semelhança facial garantida.
- 36 retratos históricos de fontes públicas com licenças individuais, autoria e origem. Há comparação da fotografia real com o estudo 3D na ficha.
- Narrações em primeira pessoa com síntese de voz do navegador, legendas por trecho, pausa, continuação, reinício e parada. Apenas uma fala ativa. Áudio depende das vozes e do serviço do navegador; alguns dispositivos podem precisar de internet. Não há clonagem de voz ou sincronização labial.
- 18 questões distribuídas em quizzes de três perguntas por sala e revisão geral com seis questões.
- Busca, filtro por período, linha do tempo, área de transições, fontes e equipe. Vargas e Mazzilli aparecem como referências nos filtros de salas relacionadas, sem duplicar seus registros ou esculturas.
- Acesso alternativo em texto quando WebGL estiver indisponível.
- Somente a exposição da sala ativa é criada; modelos e materiais da sala anterior são liberados na troca.

## Controles

Computador: arraste para olhar; WASD/setas para mover; selecione bustos, retratos, placas e círculos no chão; Q/E giram a peça selecionada. Botões nos pedestais também giram a peça. No celular, use toque e setas para percorrer pontos fixos. Em WebXR, use controles com raio ou seleção por olhar. Há troca de sala e saída dentro do ambiente. Headset requer HTTPS ou ambiente local compatível.

## Arquivos

- `dist/index.html`, `museum.css`, `museum.js`: interface e navegação ampliadas.
- `dist/catalog.js`: 36 biografias, roteiros, fontes, salas, casos especiais e quizzes. Corte histórico: 02/11/2026. Sem projeções de acontecimentos posteriores.
- `dist/narrator.js`: controle de uma única narração sintética.
- `dist/scene.js`: cena A-Frame, navegação, troca de sala e painéis XR.
- `dist/busts.js` e `catalog-busts.js`: geometria procedural e perfis dos estudos.
- `dist/assets/busts/`: 36 GLB e inventário.
- `dist/assets/studies/`: prévias renderizadas da geometria, não capturas de funcionamento da sala.
- `dist/assets/credits.json`: autoria, links e licenças dos cinco retratos.
- `dist/vendor/`: A-Frame e licença MIT.
- `dist/roteiros_narracao.md`: roteiros completos exportados para revisão.
- `tests/`: regras do quiz, catálogo, modelos e estado da narração.

`content.js` e `app.js` anteriores ficam preservados como referência da versão inicial de cinco peças; o HTML atual usa `museum.js` e `catalog.js`. Os testes antigos continuam como regressão e os novos cobrem o catálogo ampliado.

## Validação e pendências

16 testes JavaScript e 2 testes do parser de alinhamento aprovados: integridade dos modelos, catálogo, quiz, limites e estado do narrador. Navegador: abertura do acervo, troca de salas, busca, ficha e acionamento da narração conferidos. Registrar detalhes da rodada no CHECKLIST_TESTES.md.

Este ambiente de verificação não disponibilizou WebGL, portanto não foi possível observar a renderização das seis salas nem validar os controles 3D visualmente. Não houve teste em headset ou aparelho celular físico. O serviço de voz do navegador remoto retornou erro após a tentativa de reprodução; o aviso de falha e o roteiro permaneceram disponíveis. Reprodução audível, pausa real e qualidade das vozes precisam de teste no dispositivo do visitante. Não considerar esses itens aprovados apenas pela existência do código.

Pendências: revisão acadêmica final dos roteiros; substituir estudos por esculturas com maior fidelidade; testar gráfica, conforto, legibilidade e FPS em equipamentos de referência. Não há gravações de áudio locais, animação labial, backend, cadastro ou ranking online.

## Créditos

Esculturas e ilustração vetorial originais, produzidas por código. Não são digitalizações nem retratos oficiais. As 36 fotografias têm licença individual de domínio público, CC BY ou CC BY-SA conforme assets/credits.json; preservar atribuição, condições de compartilhamento e referências. A-Frame/Three.js: licenças distribuídas com a biblioteca. Fontes históricas individuais e complementares no catálogo.

## Dados públicos

Veja dist/DADOS_PUBLICOS.md e dist/public-data.js para origem dos dados e das imagens. As fotografias são referências públicas; os modelos permanecem estudos provisórios.

## Piloto do Lula e ElevenLabs

Abra lula-piloto.html pelo link na entrada do museu. O piloto permite selecionar áudio local e legendas VTT/JSON e testar reprodução, pausa, continuação e reinício. O arquivo fica no navegador e não é publicado. O MP3 ElevenLabs ainda NÃO foi gerado. A etapa atual não executou uma chamada paga à API.

O roteiro está em dist/Lula_Roteiro_ElevenLabs.txt e em scripts/lula-narration.json. Instruções em scripts/ETAPA_01_LULA.md. O gerador prepare-lula-audio.py roda somente localmente; recebe credenciais do ambiente e não as coloca no navegador. A aplicação usa gravações finais cadastradas em assets/audio/manifest.json e mantém síntese do navegador onde não há gravação. Sem tempos reais, não apresenta legendas como sincronizadas.

O teste de navegador utilizou WAV silencioso de QA e VTT técnico; não é a voz do projeto nem um áudio gerado pelo ElevenLabs. O busto detalhado do Lula ainda depende de obter o arquivo 3D licenciado selecionado no Sketchfab.


## Atualização de 03/11/2026 — narração Lula
MP3 real gerado no ElevenLabs com a voz brasileira Paulo (Eleven v4), integrado ao museu e ao piloto. Dramatização educativa, sem imitação da voz do presidente. Sem tempos de legenda exportados: o roteiro é mostrado por completo. Malha facial fiel e sincronização labial continuam pendentes.


## Lote de narrações — 03/11/2026
19 gravações ElevenLabs integradas. Voz: Paulo — Natural Brazilian Voice (Eleven v4), dramatização educativa. Restam 17 roteiros no arquivo scripts/narracoes-pendentes.json. As demais fichas mantêm síntese de voz do navegador. Saldo observado: 413 créditos, insuficiente para o próximo roteiro completo; nenhum plano contratado. Sem marcações temporais exportadas.


Download em duas partes: extraia Galeria_Presidencial_Prototipo.zip e Galeria_Presidencial_Audios.zip na mesma pasta. O segundo pacote contém dist/assets/audio/*.mp3. Essa separação mantém cada arquivo de download menor.


## Personagem animado do Lula — 03/11/2026
Personagem estilizado no piloto e na ficha de Lula: piscar, movimento de cabeça e abertura de boca guiada pela amplitude do áudio usando Web Audio. Three.js via A-Frame local para versão 3D; SVG animado como alternativa sem WebGL. Não é reconstrução facial nem sincronização de fonemas. Navegador de validação sem WebGL: alternativa ilustrada e áudio testados; renderização 3D requer conferência em dispositivo compatível.
