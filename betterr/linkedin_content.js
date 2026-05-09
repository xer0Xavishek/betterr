let composeState = new WeakMap();

function initObserver() {
  const observer = new MutationObserver(debounce(handleMutations, 300));
  observer.observe(document.body, { childList: true, subtree: true });
}

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

function handleMutations(mutations) {
  // 1. Messaging Footer
  const msgFooters = document.querySelectorAll('.msg-form__left-actions, .msg-form__footer, .msg-form__right-actions');
  msgFooters.forEach(footer => {
    // Only inject if it's the actual actions container and doesn't have it yet
    if (footer.classList.contains('msg-form__left-actions') || footer.querySelector('.msg-form__send-button')) {
      if (!footer.parentNode.querySelector('.humanize-container')) {
        injectUI(footer, 'message');
      }
    }
  });

  // 2. Post/Share Box Footer
  const postFooters = document.querySelectorAll('.share-box-footer, .share-box-feed-entry__footer');
  postFooters.forEach(footer => {
    if (!footer.querySelector('.humanize-container')) {
      injectUI(footer, 'post');
    }
  });
}

function injectUI(footer, type) {
  const container = document.createElement('div');
  container.className = 'humanize-container humanize-linkedin';

  const select = document.createElement('select');
  select.className = 'humanize-select';
  select.innerHTML = `
    <option value="professional">Professional</option>
    <option value="student">Student</option>
    <option value="teacher">Teacher</option>
    <option value="ceo">CEO</option>
  `;

  const btn = document.createElement('button');
  btn.className = 'humanize-btn';
  btn.innerHTML = '✨ Humanize';

  const errorSpan = document.createElement('span');
  errorSpan.className = 'humanize-error';

  const actionsContainer = document.createElement('div');
  actionsContainer.className = 'humanize-actions';
  actionsContainer.style.display = 'none';

  const acceptBtn = document.createElement('button');
  acceptBtn.className = 'humanize-action-btn accept';
  acceptBtn.innerText = 'Accept';

  const restoreBtn = document.createElement('button');
  restoreBtn.className = 'humanize-action-btn restore';
  restoreBtn.innerText = 'Restore';

  actionsContainer.appendChild(acceptBtn);
  actionsContainer.appendChild(restoreBtn);

  container.appendChild(select);
  container.appendChild(btn);
  container.appendChild(errorSpan);
  container.appendChild(actionsContainer);
  
  // Determine where to append based on LinkedIn DOM structure
  if (type === 'message') {
    // Usually right before the send button or inside left actions
    footer.appendChild(container);
  } else {
    // In post share box, usually append to the footer
    footer.appendChild(container);
  }

  // Find the content editable for this specific compose window
  let composeWindow = footer.closest('.msg-form') || footer.closest('.share-creation-state');
  if (!composeWindow) composeWindow = footer.parentNode;
  
  const editable = composeWindow.querySelector('.msg-form__contenteditable, .ql-editor, div[contenteditable="true"][data-placeholder]');
  if (!editable) return;

  btn.addEventListener('click', async (e) => {
    e.preventDefault();
    const text = editable.innerText;
    if (!text || text.trim().length === 0) return;

    btn.disabled = true;
    btn.innerHTML = '⌛ Humanizing...';
    errorSpan.innerText = '';
    
    composeState.set(editable, { originalHtml: editable.innerHTML });

    chrome.runtime.sendMessage({
      action: 'HUMANIZE_TEXT',
      text: text,
      persona: select.value
    }, (response) => {
      btn.disabled = false;
      btn.innerHTML = '✨ Humanize';

      if (!response) {
        errorSpan.innerText = 'No response from background worker.';
        setTimeout(() => { errorSpan.innerText = ''; }, 5000);
        return;
      }

      if (response.error) {
        errorSpan.innerText = response.error;
        setTimeout(() => { errorSpan.innerText = ''; }, 5000);
      } else {
        const newText = response.text;
        const diffHtml = generateDiffHtml(text, newText);
        
        updateReactInput(editable, diffHtml);
        
        select.style.display = 'none';
        btn.style.display = 'none';
        actionsContainer.style.display = 'flex';
      }
    });
  });

  acceptBtn.addEventListener('click', (e) => {
    e.preventDefault();
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = editable.innerHTML;
    const spans = tempDiv.querySelectorAll('.humanize-changed');
    spans.forEach(span => {
      const textNode = document.createTextNode(span.textContent);
      span.parentNode.replaceChild(textNode, span);
    });
    
    updateReactInput(editable, tempDiv.innerHTML);
    resetUI();
  });

  restoreBtn.addEventListener('click', (e) => {
    e.preventDefault();
    const state = composeState.get(editable);
    if (state && state.originalHtml) {
      updateReactInput(editable, state.originalHtml);
    }
    resetUI();
  });

  function resetUI() {
    actionsContainer.style.display = 'none';
    select.style.display = 'block';
    btn.style.display = 'flex';
  }
}

function updateReactInput(element, htmlContent) {
  element.focus();
  document.execCommand('selectAll', false, null);
  document.execCommand('insertHTML', false, htmlContent);
  // Dispatch synthetic event for React/Quill to register the DOM change
  element.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
  element.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
}

function lcsDiff(oldWords, newWords) {
  const m = oldWords.length;
  const n = newWords.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldWords[i - 1] === newWords[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  let i = m, j = n;
  const result = [];
  while (i > 0 && j > 0) {
    if (oldWords[i - 1] === newWords[j - 1]) {
      result.unshift({ text: oldWords[i - 1], type: 'equal' });
      i--; j--;
    } else if (dp[i - 1][j] > dp[i][j - 1]) {
      i--;
    } else {
      result.unshift({ text: newWords[j - 1], type: 'added' });
      j--;
    }
  }
  while (j > 0) {
    result.unshift({ text: newWords[j - 1], type: 'added' });
    j--;
  }
  
  return result;
}

function generateDiffHtml(oldText, newText) {
  const oldW = oldText.split(/\\s+/).filter(w => w.trim() !== '');
  
  const normalizedNewText = newText.replace(/\\n/g, ' \n ');
  const newW = normalizedNewText.split(/\\s+/).filter(w => w.trim() !== '');
  
  const diff = lcsDiff(oldW, newW);
  
  let html = '';
  diff.forEach(part => {
    if (part.text === '\n') {
      html += '<br><br>';
      return;
    }
    const safeText = part.text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    if (part.type === 'added') {
      html += `<span class="humanize-changed">${safeText}</span> `;
    } else {
      html += `${safeText} `;
    }
  });
  
  // LinkedIn requires paragraph tags or simple text nodes in many editors
  // For safety, wrap in paragraph if needed, but span is usually fine.
  return `<p>${html.trim()}</p>`;
}

initObserver();
