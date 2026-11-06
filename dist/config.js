// Configuração opcional do backend. Não contém segredos.
// Exemplo: window.GP_BACKEND = { provider: 'local', url: 'http://localhost:8787' };
(function () {
  try {
    const params = new URLSearchParams(window.location.search);
    const backend = params.get('backend');
    if (backend && !window.GP_BACKEND) {
      window.GP_BACKEND = { provider: 'local', url: backend };
    }
  } catch (error) {}
})();