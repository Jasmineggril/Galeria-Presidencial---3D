# Checklist de validação do grupo

Preencha **data, versão, navegador e dispositivo** antes dos testes. Nenhum item abaixo deve ser considerado aprovado apenas porque está listado.

## Bustos 3D

- [ ] Os cinco bustos e os pedestais aparecem na sala.
- [ ] Os bustos são identificados como estilizados e provisórios.
- [ ] Selecionar a escultura abre a ficha correta.
- [ ] Botões Girar do pedestal funcionam nos dois sentidos.
- [ ] Q e E giram apenas a peça selecionada.
- [ ] A ficha oferece Observar na sala e reposiciona corretamente.
- [ ] Comparar as esculturas com os retratos históricos, sem tratar a estilização como reprodução fiel.
- [ ] Testar a rotação e a seleção também em headset.

## Computador

- [ ] Sala inicia; não há erros bloqueantes no console.
- [ ] Retratos corretos nos cinco painéis e na coleção em texto.
- [ ] Botão Entrar libera a visita e apresenta os comandos.
- [ ] Mouse orienta a câmera; WASD/setas deslocam sem sair da sala.
- [ ] Cada nome do percurso leva ao painel correspondente.
- [ ] Os cinco painéis abrem, fecham e têm fonte acessível.
- [ ] Próximo e Anterior percorrem as cinco fichas.
- [ ] Leitura de painéis atualiza o indicador até 5 de 5.
- [ ] Voltar à entrada mantém o progresso.
- [ ] Três perguntas exibem feedback correto e não aceitam duas respostas.
- [ ] Próxima fica bloqueada antes de responder.
- [ ] Testar pontuações 0, 1, 2 e 3; Refazer limpa respostas e pontuação.
- [ ] Fechar e reabrir o quiz reinicia a revisão.
- [ ] Fechar diálogos devolve os controles; Esc fecha o diálogo.
- [ ] Fontes, créditos e equipe abrem e fecham.
- [ ] Recarga da página apaga o progresso, como informado ao visitante.

## Celular e acesso alternativo

- [ ] Textos, botões e imagens cabem na tela.
- [ ] Botões do percurso podem ser rolados horizontalmente.
- [ ] Seleção de painéis funciona pela coleção e pelos botões.
- [ ] Quiz completo funciona sem depender de teclado.
- [ ] A versão em texto continua disponível sem WebGL.

## Headset WebXR em HTTPS

- [ ] Botão de RV informa corretamente suporte ou indisponibilidade.
- [ ] Sessão inicia e termina corretamente no headset de referência.
- [ ] Escala da sala e altura da câmera são confortáveis.
- [ ] Raios dos controles selecionam retratos, botões e círculos no chão.
- [ ] Cursor por olhar confirma com permanência e não conflita com o controle.
- [ ] Troca entre pontos fixos mantém posição dentro da sala.
- [ ] Fichas XR surgem na frente do visitante e são legíveis.
- [ ] Navegação entre fichas e fechamento funcionam em RV.
- [ ] Quiz XR abre, aceita respostas e permite concluir, refazer e voltar.
- [ ] O visitante consegue sair pelo botão da parede de entrada.
- [ ] Registrar FPS, travamentos, desconforto e limitações encontradas.

## Revisão acadêmica

- [ ] Conferir os cinco textos com as fontes indicadas.
- [ ] Revisar a cronologia e a identificação dos regimes políticos.
- [ ] Conferir nomes completos da equipe e identificação da disciplina.
- [ ] Preservar autoria, licença e link dos retratos.
- [ ] Convidar três colegas e registrar conclusão das tarefas sem auxílio.
- [ ] Atualizar Trello e documentos com o que foi feito e o que permanece pendente.

Formato de bug: **ID, versão, passos, esperado, observado, gravidade, responsável, evidência e resultado do reteste**.

## Rodada 02/11/2026 — versão 0.4.0

Automatizado: 11 testes aprovados; 36 GLBs válidos e com geometria finita, 36 perfis distintos e prévias locais; seis salas e 36 registros únicos; perguntas e referências válidas; cancelamento de fala anterior, eventos obsoletos, pausa, continuação, reinício e ausência de API de voz.

Navegador Chrome remoto: acervo com36registros; seleção da Nova República; busca por Juscelino; abertura de sua ficha e roteiro; botão Ouvir levou ao estado de reprodução sintética; parada do áudio; abertura do quiz da sala6. A busca também pesquisa o texto da biografia, portanto pode retornar alguém que mencione o termo, além de quem o tenha no nome.

Limites: WebGL indisponível no ambiente; acesso alternativo exibido corretamente. Não validados: renderização e interação gráfica nas salas, desempenho/FPS, headset, aparelhos móveis físicos e qualidade audível da síntese. Registrar novos resultados após testes nos equipamentos do grupo.

Continuação da rodada: quiz da sala6 concluído com3/3 e reinício observado; estado de busca sem resultados conferido. Ao acionar Ouvir, a interface iniciou reprodução e depois recebeu erro do serviço de voz deste navegador remoto, exibindo o aviso de falha e preservando o roteiro. A reprodução audível e a pausa real não estão aprovadas nesta rodada; o estado de pausa/continuação foi verificado somente nos testes automatizados com engine simulado.

## Rodada 02/11/2026 — versão 0.5.0 com fontes públicas

36 fotografias JPG480x600 incorporadas e identidades conferidas visualmente em prancha. Autoria, licença, origem, modificações e hash SHA-256 registrados. Licenças individuais:29domínio público,3CCBY2.0,3CCBY3.0BR e1CCBY-SA2.0. Novo teste verifica catálogo, arquivos, créditos, permissões declaradas e integridade por hash.

35 endereços de biografia responderam HTTP200 na consulta automatizada; o endereço de Bolsonaro retornou503, mas seu conteúdo e endereço oficial foram recuperados na busca pública. A verificação de disponibilidade de links não representa validação de cada afirmação histórica.

No navegador foram conferidos o crédito do retrato de Dilma e a comparação com o estudo3D provisório. Fotografias são carregadas sob demanda. A renderização da sala 3D e WebXR continuam sem validação neste ambiente semWebGL.

## Etapa 01 do Lula — versão 0.6.0

16 testes JavaScript aprovados, incluindo reprodução gravada, pausa, continuação, reinício, troca de fonte, descarte de eventos antigos e tempos de legenda. Dois testes Python do alinhamento ElevenLabs aprovados com dados de teste, sem chamadas ao serviço.

No navegador, aberto piloto pelo museu; importado WAV silencioso técnico e VTT com intervalo real de12segundos. O arquivo ficou pronto, a legenda foi aceita, o player iniciou carregamento e o controle Pausar levou a Reprodução pausada. Não foi avaliada a voz real do ElevenLabs: MP3 ainda depende do acesso da usuária ao serviço. Nenhum áudio de teste foi incluído no acervo publicado.

Pendente: gerar ou receber MP3 definitivo, revisar pronúncia e ritmo, importar tempos reais, obter malha fiel do Lula e testar áudio/3D em equipamento de referência.
