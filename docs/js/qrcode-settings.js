(function () {
  'use strict';

  var BOX_ID = 'qrcodeSettingsBox';

  function buildBox() {
    var box = document.createElement('div');
    box.id = BOX_ID;
    box.style.cssText = 'margin:16px 0;padding:16px;border:1px solid rgba(255,255,255,.12);border-radius:16px;text-align:center';

    var title = document.createElement('div');
    title.textContent = "QR code de l'application";
    title.style.cssText = 'font-weight:800;margin-bottom:6px';

    var hint = document.createElement('div');
    hint.textContent = "Scannez pour ouvrir l'application sur un autre appareil.";
    hint.style.cssText = 'font-size:13px;opacity:.7;margin-bottom:12px';

    var canvas = document.createElement('div');
    canvas.style.cssText = 'display:inline-block;padding:10px;background:#fff;border-radius:12px';

    var url = document.createElement('div');
    url.textContent = location.href.split('#')[0];
    url.style.cssText = 'font-size:12px;opacity:.6;margin-top:10px;word-break:break-all';

    box.appendChild(title);
    box.appendChild(hint);
    box.appendChild(canvas);
    box.appendChild(url);

    if (window.QRCode) {
      new QRCode(canvas, {
        text: location.href.split('#')[0],
        width: 180,
        height: 180,
        correctLevel: QRCode.CorrectLevel.M
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