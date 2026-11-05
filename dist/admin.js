import {backendConfig,isGuestMode,loadSession} from './account.js';

const status = document.getElementById('admin-status');
const content = document.getElementById('admin-content');

function render() {
  const cfg = backendConfig();
  const session = loadSession();
  if (isGuestMode()) {
    status.textContent = 'Backend não configurado. A administração real está indisponível; esta página é apenas documentação do fluxo.';
    content.innerHTML = '<p>Configure um provedor (por exemplo, Supabase) e políticas de acesso no servidor. Nenhuma credencial deve ser colocada no frontend.</p>';
    return;
  }
  if (!session?.accessToken) {
    status.textContent = 'Autenticação necessária. Entre com uma conta autorizada no museu para acessar esta área.';
    content.innerHTML = '<p>Use a página principal para entrar. A verificação de privilégio administrativo ocorre no backend.</p>';
    return;
  }
  status.textContent = 'Sessão detectada. A listagem e edição do acervo exigem endpoint protegido e papel administrativo validado no servidor.';
  content.innerHTML = '<p>Operações previstas: cadastrar, consultar, editar, revisar, pré-visualizar, publicar e arquivar presidentes; validar IDs, datas, referências e tamanhos; registrar responsável e data.</p>';
}

render();
