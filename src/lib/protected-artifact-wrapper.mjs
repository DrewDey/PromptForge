const MAX_DOWNLOAD_DATA_URL_LENGTH = 7_000_000
const MIN_DOWNLOAD_INTERVAL_MS = 750

const WRAPPER_CSP = [
  "default-src 'none'",
  "script-src 'unsafe-inline'",
  "style-src 'unsafe-inline'",
  "frame-src 'none'",
  "child-src 'none'",
  "connect-src 'none'",
  "webrtc 'block'",
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

function artifactNetworkLockdownSource() {
  return `
(() => {
  const blockedContextTags = /^(?:iframe|frame|frameset|object|embed|applet|portal|fencedframe)$/i;
  const blockedContextMarkup = /<(?:iframe|frame|frameset|object|embed|applet|portal|fencedframe)\\b/i;
  const securityError = () => new DOMException(
    'Nested browsing contexts and network access are disabled in this artifact.',
    'SecurityError',
  );
  const blockedRtc = function PathForgeBlockedWebRTC() {
    throw securityError();
  };
  for (const name of [
    'RTCPeerConnection',
    'webkitRTCPeerConnection',
    'mozRTCPeerConnection',
    'RTCIceTransport',
    'RTCIceGatherer',
  ]) {
    try {
      Object.defineProperty(globalThis, name, {
        configurable: false,
        enumerable: false,
        writable: false,
        value: blockedRtc,
      });
    } catch {
      try { globalThis[name] = blockedRtc; } catch {}
    }
  }

  const lockMethod = (prototype, name, build) => {
    if (!prototype) return;
    const descriptor = Object.getOwnPropertyDescriptor(prototype, name);
    if (!descriptor || typeof descriptor.value !== 'function') return;
    try {
      Object.defineProperty(prototype, name, {
        ...descriptor,
        configurable: false,
        writable: false,
        value: build(descriptor.value),
      });
    } catch {}
  };
  const containsBlockedContext = (value) => {
    if (!(value instanceof Node)) return false;
    if (value.nodeType === Node.ELEMENT_NODE && blockedContextTags.test(value.localName || '')) return true;
    return typeof value.querySelector === 'function'
      && Boolean(value.querySelector('iframe,frame,frameset,object,embed,applet,portal,fencedframe'));
  };
  const assertSafeNodes = (values) => {
    if (values.some(containsBlockedContext)) throw securityError();
  };
  const assertSafeMarkup = (value) => {
    if (blockedContextMarkup.test(String(value))) throw securityError();
  };

  lockMethod(Document.prototype, 'createElement', (original) => function(name, options) {
    if (blockedContextTags.test(String(name))) throw securityError();
    return Reflect.apply(original, this, options === undefined ? [name] : [name, options]);
  });
  lockMethod(Document.prototype, 'createElementNS', (original) => function(namespace, name, options) {
    if (blockedContextTags.test(String(name).split(':').pop() || '')) throw securityError();
    return Reflect.apply(
      original,
      this,
      options === undefined ? [namespace, name] : [namespace, name, options],
    );
  });
  for (const [prototype, name] of [
    [Node.prototype, 'appendChild'],
    [Node.prototype, 'insertBefore'],
    [Node.prototype, 'replaceChild'],
    [Element.prototype, 'insertAdjacentElement'],
  ]) {
    lockMethod(prototype, name, (original) => function(...values) {
      assertSafeNodes(values);
      return Reflect.apply(original, this, values);
    });
  }
  for (const prototype of [
    Element.prototype,
    Document.prototype,
    globalThis.DocumentFragment?.prototype,
  ]) {
    for (const name of ['append', 'prepend', 'replaceChildren']) {
      lockMethod(prototype, name, (original) => function(...values) {
        assertSafeNodes(values);
        return Reflect.apply(original, this, values);
      });
    }
  }
  for (const name of ['before', 'after', 'replaceWith']) {
    lockMethod(Element.prototype, name, (original) => function(...values) {
      assertSafeNodes(values);
      return Reflect.apply(original, this, values);
    });
  }
  lockMethod(Element.prototype, 'insertAdjacentHTML', (original) => function(position, value) {
    assertSafeMarkup(value);
    return Reflect.apply(original, this, [position, value]);
  });
  lockMethod(Document.prototype, 'write', (original) => function(...values) {
    values.forEach(assertSafeMarkup);
    return Reflect.apply(original, this, values);
  });
  lockMethod(Document.prototype, 'writeln', (original) => function(...values) {
    values.forEach(assertSafeMarkup);
    return Reflect.apply(original, this, values);
  });
  lockMethod(Range.prototype, 'createContextualFragment', (original) => function(value) {
    assertSafeMarkup(value);
    return Reflect.apply(original, this, [value]);
  });
  for (const prototype of [Element.prototype, globalThis.ShadowRoot?.prototype]) {
    for (const name of ['setHTML', 'setHTMLUnsafe']) {
      lockMethod(prototype, name, (original) => function(value, ...options) {
        assertSafeMarkup(value);
        return Reflect.apply(original, this, [value, ...options]);
      });
    }
  }

  const lockMarkupSetter = (prototype, name) => {
    if (!prototype) return;
    const descriptor = Object.getOwnPropertyDescriptor(prototype, name);
    if (!descriptor || typeof descriptor.set !== 'function') return;
    try {
      Object.defineProperty(prototype, name, {
        ...descriptor,
        configurable: false,
        set(value) {
          assertSafeMarkup(value);
          return Reflect.apply(descriptor.set, this, [value]);
        },
      });
    } catch {}
  };
  for (const prototype of [Element.prototype, globalThis.ShadowRoot?.prototype]) {
    lockMarkupSetter(prototype, 'innerHTML');
  }
  lockMarkupSetter(Element.prototype, 'outerHTML');
  lockMarkupSetter(globalThis.HTMLIFrameElement?.prototype, 'srcdoc');
})();`
}

function hardenArtifactDocument(artifactDocument) {
  // Remove the contributor doctype and prepend our own so the lockdown script
  // is the first executable byte even if a malformed upload placed content
  // before its doctype. The opaque sandbox and CSP remain the primary boundary;
  // this frozen constructor guard covers browsers that do not yet implement
  // CSP's `webrtc 'block'` directive.
  const withoutContributorDoctype = artifactDocument.replace(/<!doctype\s+html[^>]*>/i, '')
  return `<!doctype html><script>${artifactNetworkLockdownSource()}</script>${withoutContributorDoctype}`
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

export function buildProtectedArtifactWrapperDocument(artifactDocument, options = {}) {
  const allowArtifactScripts = options.allowArtifactScripts !== false
  const allowArtifactInteraction = allowArtifactScripts || options.allowArtifactInteraction === true
  const preparedArtifactDocument = allowArtifactScripts
    ? hardenArtifactDocument(artifactDocument)
    : artifactDocument
  const serializedArtifact = scriptSafeJson(preparedArtifactDocument)
  const serializedCsp = scriptSafeJson(WRAPPER_CSP)
  const artifactSandbox = allowArtifactScripts ? 'allow-scripts allow-pointer-lock' : ''
  const executionMode = allowArtifactScripts ? 'interactive-trusted' : 'static-untrusted'
  const interactionMode = allowArtifactInteraction ? 'reader-enabled' : 'visual-only'
  const nonInteractiveFrameAttributes = allowArtifactInteraction ? '' : '\n    tabindex="-1"\n    inert'
  const nonInteractiveFrameStyle = allowArtifactInteraction ? '' : '\n    iframe { pointer-events: none; }'

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta http-equiv="Content-Security-Policy" content="${WRAPPER_CSP}">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    html, body, iframe { width: 100%; height: 100%; margin: 0; border: 0; }
    html, body { overflow: hidden; background: #fff; color-scheme: light; }
    iframe { display: block; background: #fff; }${nonInteractiveFrameStyle}
  </style>
</head>
<body>
  <iframe
    id="pathforge-artifact-document"
    title="Generated artifact document"
    sandbox="${artifactSandbox}"
    data-pathforge-execution-mode="${executionMode}"
    data-pathforge-interaction-mode="${interactionMode}"${nonInteractiveFrameAttributes}
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
