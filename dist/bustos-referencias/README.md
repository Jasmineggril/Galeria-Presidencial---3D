# Bustos — referências para o código

Contém seis imagens originais geradas por IA, `bustos.json` com 36 IDs e regiões em pixels, e um módulo JavaScript. Nenhuma imagem é uma fotografia histórica ou uma malha 3D. A semelhança facial não foi validada. Os recortes incluem cenário, moldura e pedestal: não são texturas prontas para aplicar à pele de uma cabeça 3D.

## Abrir a demonstração

Na pasta extraída, com Python instalado:

```sh
python -m http.server 8000
```

Abra http://localhost:8000. A galeria 2D não precisa de internet. O exemplo A-Frame carrega a biblioteca pela internet e requer suporte WebGL. Não abra os HTMLs diretamente por file://.

## Colocar no projeto existente

Copie esta pasta para `dist/bustos-referencias/` no museu. Preserve os nomes e a estrutura. O caminho do JSON é resolvido a partir do módulo, independentemente da página que o importa.

```html
<div id="referencia-lula"></div>
<script type="module">
import {showBustReference} from './bustos-referencias/bustos.js';
await showBustReference(document.querySelector('#referencia-lula'), 'lula');
</script>
```

## A-Frame já existente no projeto

Importe o módulo, registre o componente e aplique a uma entidade. O resultado é um PAINEL 2D em uma cena 3D. Não substitui uma malha GLB.

```js
import {registerBustReferenceComponent} from './bustos-referencias/bustos.js';
registerBustReferenceComponent(AFRAME);
document.querySelector('#referencia').setAttribute('busto-referencia', {
  presidente: 'lula', largura: 1.2
});
```

A entidade pode ser criada assim:

```html
<a-entity id="referencia" position="0 1.6 -2"></a-entity>
```

Para trocar o presidente, use IDs como `bolsonaro`, `dilma`, `temer`, `fhc`, `jk`, `vargas` ou `deodoro`. A lista completa está em `bustos.json`. `modelUrl` e `audioUrl` são nulos para não apontar para arquivos inexistentes. Preencha somente quando tiver os arquivos reais; este módulo não carrega esses campos.

## Formato do JSON

`atlases` contém o caminho e as dimensões de cada prancha. `presidents` contém `id`, `name`, `period`, `atlas` e `rect`. `rect` é `[x, y, largura, altura]` em pixels, origem no canto superior esquerdo. Esses valores permitem ao código selecionar o presidente dentro de uma prancha sem precisar interpretar texto ou reconhecer o rosto. Os recortes são aproximações da diagramação, e podem ser ajustados no JSON.

## Limites

Os 36 registros seguem o acervo individual do projeto. Vargas, Lula e outros retornos ao cargo aparecem uma vez. Juntas coletivas e eleitos não empossados não estão nestas seis pranchas. As pranchas são conceitos gerados, não evidências para pesquisa histórica. Para produzir um busto que gira e fala, use uma malha 3D licenciada e revisada, materiais e preparação facial para animação.
