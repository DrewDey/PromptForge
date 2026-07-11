const MAX_DOWNLOAD_DATA_URL_LENGTH = 7_000_000
const MIN_DOWNLOAD_INTERVAL_MS = 750

const WRAPPER_CSP = [
  "default-src 'none'",
  "script-src 'unsafe-inline'",
  "style-src 'unsafe-inline'",
  "frame-src 'none'",
  "child-src 'none'",
  "connect-src 'none'",
  "img-src 'none'",
  "media-src 'none'",
  "font-src 'none'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join('; ')

function scriptSafeJson(value) {
  return (JSON.stringify(value) ?? 'null')
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')
}

export function artifactDownloadBridgeSource() {
  return `
(() => {
  const maxDataUrlLength = ${MAX_DOWNLOAD_DATA_URL_LENGTH};
  const objectUrls = new Map();
  const createObjectURL = URL.createObjectURL?.bind(URL);
  const revokeObjectURL = URL.revokeObjectURL?.bind(URL);

  if (createObjectURL) {
    URL.createObjectURL = (value) => {
      const url = createObjectURL(value);
      if (value instanceof Blob) objectUrls.set(url, value);
      return url;
    };
  }
  if (revokeObjectURL) {
    URL.revokeObjectURL = (url) => {
      revokeObjectURL(url);
      // Keep the Blob reference through the current task. Download helpers
      // commonly revoke immediately after a synthetic anchor click.
      setTimeout(() => objectUrls.delete(String(url)), 0);
    };
  }

  const sendDownload = (filename, dataUrl) => {
    if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) return;
    if (dataUrl.length > maxDataUrlLength) return;
    window.parent.postMessage({
      type: 'pathforge-artifact-download',
      filename: String(filename || 'artifact-download').slice(0, 180),
      dataUrl,
    }, '*');
  };

  window.addEventListener('click', (event) => {
    const target = event.target instanceof Element
      ? event.target.closest('a[download]')
      : null;
    if (!target) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    const filename = target.getAttribute('download') || 'artifact-download';
    const href = target.href;

    if (href.startsWith('data:')) {
      sendDownload(filename, href);
      return;
    }

    if (!href.startsWith('blob:')) return;
    const blob = objectUrls.get(href);
    if (!blob || blob.size > maxDataUrlLength) return;
    const reader = new FileReader();
    reader.addEventListener('load', () => sendDownload(filename, reader.result), { once: true });
    reader.readAsDataURL(blob);
  }, true);
})();`
}

export function buildProtectedArtifactWrapperDocument(artifactDocument) {
  const serializedArtifact = scriptSafeJson(artifactDocument)
  const serializedCsp = scriptSafeJson(WRAPPER_CSP)

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta http-equiv="Content-Security-Policy" content="${WRAPPER_CSP}">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    html, body, iframe { width: 100%; height: 100%; margin: 0; border: 0; }
    html, body { overflow: hidden; background: #111827; }
    iframe { display: block; background: #111827; }
  </style>
</head>
<body>
  <iframe
    id="pathforge-artifact-document"
    title="Generated artifact document"
    sandbox="allow-scripts allow-pointer-lock"
    allow="clipboard-write"
    referrerpolicy="no-referrer"
  ></iframe>
  <script>
  (() => {
    const requiredCsp = ${serializedCsp};
    const artifactDocument = ${serializedArtifact};
    const frame = document.getElementById('pathforge-artifact-document');
    const forwardedTypes = new Set([
      'pathforge-artifact-size',
      'pathforge-artifact-storage',
      'pathforge-artifact-download',
    ]);
    let lastDownloadAt = -Infinity;

    window.addEventListener('message', (event) => {
      if (event.source !== frame.contentWindow) return;
      const data = event.data;
      if (!data || typeof data !== 'object' || !forwardedTypes.has(data.type)) return;

      if (data.type === 'pathforge-artifact-download') {
        const now = performance.now();
        if (!navigator.userActivation?.isActive) return;
        if (now - lastDownloadAt < ${MIN_DOWNLOAD_INTERVAL_MS}) return;
        if (
          typeof data.filename !== 'string' ||
          typeof data.dataUrl !== 'string' ||
          !data.dataUrl.startsWith('data:') ||
          data.dataUrl.length > ${MAX_DOWNLOAD_DATA_URL_LENGTH}
        ) return;
        lastDownloadAt = now;
      }

      frame.dataset.lastForwardedType = data.type;
      window.parent.postMessage(data, '*');
    });

    frame.dataset.requiredCsp = requiredCsp;
    frame.addEventListener('load', () => {
      frame.dataset.pathforgeLoaded = 'true';
    }, { once: true });
    frame.srcdoc = artifactDocument;
  })();
  </script>
</body>
</html>`
}

export const PROTECTED_ARTIFACT_DOWNLOAD_DATA_URL_LIMIT = MAX_DOWNLOAD_DATA_URL_LENGTH
