// ============================================================
// Точка входа конвейера: грузит JSON-конфиг квартиры и стартует тур.
//
// Какую квартиру открыть, решает URL: ?apt=<id> (по умолчанию
// kings-court). Конфиг лежит в apartments/<id>.json, фотографии —
// в папке из meta.photoBase. Все углы в конфиге — в ГРАДУСАХ
// (удобно править руками), здесь переводятся в радианы.
// ============================================================

(async function () {
  const goBtn = document.getElementById('goBtn');
  const params = new URLSearchParams(location.search);
  const id = (params.get('apt') || 'kings-court').replace(/[^a-z0-9-]/gi, '');

  let cfg;
  try {
    const resp = await fetch('apartments/' + id + '.json');
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    cfg = await resp.json();
  } catch (err) {
    goBtn.textContent = 'Не удалось загрузить квартиру «' + id + '»';
    document.getElementById('overlayText').innerHTML =
      'Проверь, что файл <b>apartments/' + id + '.json</b> существует.<br>' +
      'При локальном запуске нужен веб-сервер: <code>python -m http.server</code><br>' +
      '(fetch не работает с file://).';
    return;
  }

  // градусы -> радианы
  const rad = (d) => d * Math.PI / 180;
  cfg.start.yaw = rad(cfg.start.yaw);
  for (const f of cfg.furniture) if (f.rot !== undefined) f.rot = rad(f.rot);
  for (const s of cfg.spawns) s.yaw = rad(s.yaw);
  for (const p of cfg.photoSpots || []) p.yaw = rad(p.yaw);

  window.APT = cfg;

  if (cfg.meta) {
    if (cfg.meta.title) {
      document.title = cfg.meta.title + ' · 3D-тур';
      document.querySelector('#overlay h1').textContent = cfg.meta.title;
    }
  }

  window.initApp();
})();
