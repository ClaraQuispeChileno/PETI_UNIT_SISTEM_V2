(function() {
  'use strict';

  var supabaseClient = null;

  function init() {
    var usernameInput = document.getElementById('username');
    var passwordInput = document.getElementById('password');
    var loginForm = document.getElementById('loginForm');

    if (!usernameInput || !passwordInput || !loginForm) {
      console.error('[Login] No se encontraron los campos del formulario.');
      return;
    }

    console.log('[Login] Formulario listo');

    // Crear cliente Supabase
    try {
      if (typeof window.supabase !== 'undefined' && typeof window.supabase.createClient === 'function') {
        supabaseClient = window.supabase.createClient(window.CONFIG.SUPABASE_URL, window.CONFIG.SUPABASE_ANON_KEY);
        console.log('[Login] Supabase client creado');
      } else {
        console.error('[Login] window.supabase no disponible');
      }
    } catch (e) {
      console.error('[Login] Error al crear Supabase client:', e);
    }

    loginForm.addEventListener('submit', function(e) {
      e.preventDefault();
      console.log('[Login] Submit disparado');

      var username = usernameInput.value.trim();
      var password = passwordInput.value.trim();

      if (!username || !password) {
        console.warn('[Login] Campos vacíos');
        showToast('Complete todos los campos', 'error');
        return;
      }

      console.log('[Login] Usuario:', username);

      if (!supabaseClient) {
        console.error('[Login] Cliente Supabase no disponible');
        showToast('Error de conexión con el servidor', 'error');
        return;
      }

      var email = username + '@contaperu.pe';
      console.log('[Login] Email construido:', email);

      supabaseClient.auth.signInWithPassword({
        email: email,
        password: password
      }).then(function(result) {
        var authData = result.data;
        var authError = result.error;

        if (authError) {
          console.error('[Login] Error auth:', authError);
          showToast('Usuario o contraseña incorrectos', 'error');
          return;
        }

        console.log('[Login] Auth exitoso:', authData.user.email);

        return supabaseClient
          .from('usuarios')
          .select('rol')
          .eq('email', email)
          .maybeSingle()
          .then(function(userResult) {
            var userData = userResult.data;
            var userError = userResult.error;

            if (userError || !userData) {
              console.error('[Login] Error rol:', userError);
              showToast('Error al obtener el rol. Contacte al administrador.', 'error');
              return supabaseClient.auth.signOut();
            }

            var role = userData.rol;
            console.log('[Login] Rol:', role);

            localStorage.setItem('peti_session', JSON.stringify({
              username: username,
              role: role,
              access_token: authData.session ? authData.session.access_token : null,
              user_id: authData.user ? authData.user.id : null
            }));

            showToast('Bienvenido, ' + username, 'success');

            var redirectMap = {
              'administrador': 'html/Admin-Panel.html',
              'estratega': 'html/Estratega-Panel.html',
              'lider': 'html/LideresArea-Panel.html',
              'operativo': 'html/EquipoOperativo-Panel.html',
              'aprobador': 'html/Aprobador-Panel.html'
            };
            var redirectUrl = redirectMap[role];
            if (redirectUrl) {
              console.log('[Login] Redirigiendo a:', redirectUrl);
              window.location.href = redirectUrl;
            } else {
              console.warn('[Login] Rol no reconocido:', role);
              showToast('Rol no reconocido', 'error');
            }
          });
      }).catch(function(error) {
        console.error('[Login] Error general:', error);
        showToast('Error de conexión con el servidor', 'error');
      });
    });
  }

  function showToast(message, type) {
    type = type || 'info';
    var existing = document.querySelector('.peti-toast');
    if (existing) existing.remove();

    var toast = document.createElement('div');
    toast.className = 'peti-toast toast-' + type;
    var icon = type === 'success' ? 'fa-circle-check' : (type === 'error' ? 'fa-circle-exclamation' : 'fa-info-circle');
    toast.innerHTML = '<div class="toast-content"><i class="fas ' + icon + '"></i><span>' + message + '</span></div>';
    document.body.appendChild(toast);

    if (!document.getElementById('toast-styles')) {
      var style = document.createElement('style');
      style.id = 'toast-styles';
      style.textContent = '.peti-toast { position: fixed; bottom: 2rem; left: 50%; transform: translateX(-50%); background: #0f172a; backdrop-filter: blur(12px); border: 1px solid #334155; border-radius: 3rem; padding: 0.7rem 1.5rem; z-index: 2000; animation: slideUp 0.25s ease; box-shadow: 0 10px 20px -5px rgba(0,0,0,0.3); } .toast-content { display: flex; align-items: center; gap: 0.7rem; color: white; font-size: 0.85rem; font-weight: 500; } .toast-success i { color: #22c55e; } .toast-error i { color: #f97316; } .toast-info i { color: #3b82f6; } @keyframes slideUp { from { opacity: 0; transform: translateX(-50%) translateY(20px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }';
      document.head.appendChild(style);
    }

    setTimeout(function() { toast.remove(); }, 3500);
  }

  // Ejecutar inmediatamente (script está al final del body, DOM ya está disponible)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
