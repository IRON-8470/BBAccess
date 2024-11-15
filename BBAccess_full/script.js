const loadButton = document.getElementById('load-button');
const spinner = document.querySelector('.spinner');
const buttonText = document.querySelector('.button-text');
const errorMessage = document.getElementById('error-message');

function showError(message) {
  errorMessage.textContent = message;
  errorMessage.classList.remove('fade-out');
  errorMessage.style.display = 'block';

  setTimeout(() => {
    errorMessage.classList.add('fade-out');
  }, 4000);

  setTimeout(() => {
    errorMessage.style.display = 'none';
    errorMessage.classList.remove('fade-out');
  }, 5000);
}

loadButton.addEventListener('click', () => {
  loadPage();
});

function loadPage(url = null) {
  loadButton.classList.add('active-button');
  buttonText.textContent = '読み込み中...';
  loadButton.disabled = true;

  if (!url) {
    url = document.getElementById('url-input').value;
  }

  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }

  const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;

  fetch(proxyUrl)
    .then(response => {
      if (!response.ok) {
        throw new Error('NetworkError');
      }
      return response.json();
    })
    .then(data => {
      const modifiedHtml = data.contents;
      const baseUrl = new URL(url);

      let finalHtml = modifiedHtml
        .replace(/<head>/i, `<head><base href="${baseUrl.href}">`)
        .replace(/src="([^"]+)"/g, (match, src) => {
          if (src.startsWith('//')) {
            return `src="${baseUrl.protocol}${src}"`;
          }
          if (src.startsWith('/') || src.startsWith('./') || src.startsWith('../')) {
            return `src="${new URL(src, baseUrl.href).href}"`;
          }
          return `src="${src}"`;
        })
        .replace(/href="([^"]+)"/g, (match, href) => {
          if (href.startsWith('//')) {
            return `href="${baseUrl.protocol}${href}"`;
          }
          if (href.startsWith('/') || href.startsWith('./') || href.startsWith('../')) {
            return `href="${new URL(href, baseUrl.href).href}"`;
          }
          return `href="${href}"`;
        });

      const iframe = document.getElementById('iframe-view');
      iframe.srcdoc = finalHtml;

      iframe.addEventListener('load', () => {
        const iframeDocument = iframe.contentWindow.document;
        iframeDocument.documentElement.style.height = '100%';
        iframeDocument.documentElement.style.margin = '0';
        iframeDocument.body.style.height = '100%';
        iframeDocument.body.style.margin = '0';
        setupIframeListener();
      });
    })
    .catch(error => {
      console.error(error);

      if (error.message === 'NetworkError') {
        showError('ネットワークエラーが発生しました。URLが正しいか確認してください。');
      } else if (error instanceof TypeError) {
        showError('URLの形式が正しくありません。URLを確認してください。');
      } else if (error instanceof SyntaxError) {
        showError('データの処理中にエラーが発生しました。別のページを試してください。');
      } else {
        showError('不明なエラーが発生しました。');
      }

      buttonText.textContent = '読み込み失敗';
    })
    .finally(() => {
      setTimeout(() => {
        loadButton.classList.remove('active-button');
        buttonText.textContent = '読み込む';
        loadButton.disabled = false;
      }, 2000);
    });
}

function setupIframeListener() {
  const iframe = document.getElementById('iframe-view');

  iframe.addEventListener('load', () => {
    const iframeDocument = iframe.contentDocument || iframe.contentWindow.document;

    const observer = new MutationObserver(() => {
      setupLinkListeners(iframeDocument);
    });

    observer.observe(iframeDocument, { childList: true, subtree: true });

    setupLinkListeners(iframeDocument);
  });
}

function setupLinkListeners(iframeDocument) {
  Array.from(iframeDocument.links).forEach(link => {
    link.removeEventListener('click', linkClickHandler);
    link.addEventListener('click', linkClickHandler);
  });
}

function linkClickHandler(event) {
  event.preventDefault();
  const url = event.currentTarget.href;
  document.getElementById('url-input').value = url;
  loadPage(url);
}

setupIframeListener();