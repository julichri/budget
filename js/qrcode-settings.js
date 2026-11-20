(function () {
  'use strict';

  var BOX_ID = 'qrcodeSettingsBox';

  function baseUrl() { return location.href.split('#')[0]; }

  // Lien de partage : adresse de l'app + configuration Supabase dans la partie #cfg (jamais envoyée au serveur)
  function shareUrl() {
    try {
      var st = JSON.parse(localStorage.getItem('budgetSettings') || '{}');
      var code = st.code;
      if (!code || code === 'FOYER_TEST') code = localStorage.getItem('foyerAvantTest') || st.code;
      if (!st.url || !st.key || !code || code === 'FOYER_TEST') return { url: baseUrl(), withConfig: false };
      var json = JSON.stringify({ u: st.url, k: st.key, c: code });
      var b64 = btoa(unescape(encodeURIComponent(json))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      return { url: baseUrl() + '#cfg=' + b64, withConfig: true };
    } catch (e) { return { url: baseUrl(), withConfig: false }; }
  }

  function buildBox() {
    var share = shareUrl();
    var box = document.createElement('div');
    box.id = BOX_ID;
    box.style.cssText = 'margin:16px 0;padding:16px;border:1px solid rgba(255,255,255,.12);border-radius:16px;text-align:center';

    var title = document.createElement('div');
    title.textContent = "QR code de l'application";
    title.style.cssText = 'font-weight:800;margin-bottom:6px';

    var hint = document.createElement('div');
    hint.textContent = share.withConfig
      ? "Scannez pour ouvrir l'application sur un autre appareil : l'URL Supabase, la clé publique et le code de foyer sont renseignés automatiquement. Ne partagez ce QR code qu'avec les personnes du foyer."
      : "Scannez pour ouvrir l'application sur un autre appareil. Connectez d'abord Supabase pour y inclure la configuration.";
    hint.style.cssText = 'font-size:13px;opacity:.7;margin-bottom:12px';

    var canvas = document.createElement('div');
    canvas.style.cssText = 'display:inline-block;padding:10px;background:#fff;border-radius:12px';

    var url = document.createElement('div');
    url.textContent = baseUrl();
    url.style.cssText = 'font-size:12px;opacity:.6;margin-top:10px;word-break:break-all';

    box.appendChild(title);
    box.appendChild(hint);
    box.appendChild(canvas);
    box.appendChild(url);

    if (window.QRCode) {
      new QRCode(canvas, {
        text: share.url,
        width: 260,
        height: 260,
        correctLevel: QRCode.CorrectLevel.L
      });
    } else {
      canvas.textContent = 'QR code indisponible (bibliothèque non chargée).';
    }
    return box;
  }

  function inject() {
    var view = document.getElementById('view');
    if (!view || document.getElementById(BOX_ID)) return;
    // Ne s'affiche que sur l'écran Réglages
    var isSettings = /r[ée]glages/i.test(view.textContent.slice(0, 200));
    if (!isSettings) return;
    view.appendChild(buildBox());
  }

  var view = document.getElementById('view');
  if (view) {
    new MutationObserver(inject).observe(view, { childList: true, subtree: false });
  }
  inject();
})();