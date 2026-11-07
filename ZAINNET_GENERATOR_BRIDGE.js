/**
 * ZAIN.NET bridge v3 (Google AI Studio / Cloud Run / GitHub Pages)
 * Taruh sebagai JS frontend biasa. Parent hanya diizinkan dari domain ZAIN.NET.
 * Tidak membuktikan pembayaran atau keaslian berkas: gunakan server tepercaya
 * untuk sistem kuota berbayar produksi.
 */
(function () {
  'use strict';
  if (window.ZAINNET_reportDocumentReady) return;
  const PARENTS = new Set([
    'https://karyazainnet.net',
    'https://www.karyazainnet.net'
  ]);
  let active = null;
  let sent = false;
  let pendingFileName = null;
  const VALID_EXT = /\.(docx|doc|pdf|zip|xlsx|xls|png|jpg|jpeg|md|txt)$/i;
  const asName = (v) => typeof v === 'string' && v.trim().length <= 179 &&
    v.trim().length > 3 && VALID_EXT.test(v.trim()) ? v.trim() : null;

  function deliver(name) {
    if (!active || sent || window.parent === window) return false;
    const payload = {
      source: 'zainnet-generator',
      type: 'ZAINNET_DOCUMENT_READY',
      version: 3,
      status: 'success',
      toolId: active.toolId,
      sessionId: active.sessionId,
      token: active.token,
      fileName: name
    };
    window.parent.postMessage(payload, active.origin);
    sent = true;
    return true;
  }

  window.addEventListener('message', function (event) {
    if (event.source !== window.parent || !PARENTS.has(event.origin)) return;
    const d = event.data;
    if (!d || d.source !== 'zainnet-parent' || d.type !== 'ZAINNET_BRIDGE_INIT' || d.version !== 3) return;
    if (!/^[a-zA-Z0-9._-]{12,160}$/.test(d.token || '')) return;
    if (!/^[a-zA-Z0-9._-]{5,180}$/.test(d.sessionId || '')) return;
    if (!/^[a-zA-Z0-9_-]{2,70}$/.test(d.toolId || '')) return;
    if (!active || active.token !== d.token) {
      active = { origin: event.origin, token: d.token, sessionId: d.sessionId, toolId: d.toolId };
      sent = false;
    }
    window.parent.postMessage({ source: 'zainnet-generator', type: 'ZAINNET_BRIDGE_ACK', version: 3, toolId: active.toolId }, event.origin);
    if (pendingFileName) {
      const name = pendingFileName;
      pendingFileName = null;
      deliver(name);
    }
  });

  // Call AFTER a real output Blob/ArrayBuffer/ZIP was generated successfully.
  // Jangan panggil di onClick Generate, timer, preview, atau error handler.
  window.ZAINNET_reportDocumentReady = function (fileName) {
    const name = asName(fileName);
    if (!name) throw new Error('Nama berkas final harus valid (docx/pdf/zip dan format berkas didukung).');
    if (sent) return true; // deduplikasi satu sesi
    if (!active) {
      if (window.parent === window) return false; // mode mandiri tidak dicatat
      pendingFileName = name;
      return false; // tunggu handshake parent
    }
    return deliver(name);
  };
  window.ZAINNET_isDocumentReported = function () { return sent; };

  if (window.parent !== window) {
    for (const origin of PARENTS) {
      window.parent.postMessage({ source: 'zainnet-generator', type: 'ZAINNET_BRIDGE_READY', version: 3 }, origin);
    }
  }
})();
