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
  // Gmail compose toolbar selectors are notorious for changing. We check a few.
  // .btC = bottom table row, .gU.Up = Send button cell, .aqL = formatting toolbar
  const toolbars = document.querySelectorAll('.btC .aqL, .gU.Up, tr.btC');
  toolbars.forEach(toolbar => {
    if (!toolbar.parentNode.querySelector('.betterr-container')) {
      injectUI(toolbar);
    }
  });
}

function injectUI(toolbar) {
  const container = document.createElement('div');
  container.className = 'betterr-container';

  const select = document.createElement('select');
  select.className = 'betterr-select';
  select.innerHTML = `
    <option value="student">Student</option>
    <option value="professional">Professional</option>
    <option value="teacher">Teacher</option>
    <option value="ceo">CEO</option>
  `;

  const btn = document.createElement('button');
  btn.className = 'betterr-btn';
  btn.innerHTML = '✨ betterr';

  const errorSpan = document.createElement('span');
  errorSpan.className = 'betterr-error';

  const actionsContainer = document.createElement('div');
  actionsContainer.className = 'betterr-actions';
  actionsContainer.style.display = 'none';

  const acceptBtn = document.createElement('button');
  acceptBtn.className = 'betterr-action-btn accept';
  acceptBtn.innerText = 'Accept';

  const restoreBtn = document.createElement('button');
  restoreBtn.className = 'betterr-action-btn restore';
  restoreBtn.innerText = 'Restore';

  actionsContainer.appendChild(acceptBtn);
  actionsContainer.appendChild(restoreBtn);

  container.appendChild(select);
  container.appendChild(btn);
  container.appendChild(errorSpan);
  container.appendChild(actionsContainer);
  
  // Append near the target
  if (toolbar.classList.contains('Up') || toolbar.classList.contains('gU')) {
    toolbar.appendChild(container); // Append to Send button cell
  } else if (toolbar.classList.contains('btC')) {
    const td = document.createElement('td');
    td.appendChild(container);
    toolbar.appendChild(td);
  } else {
    toolbar.parentNode.insertBefore(container, toolbar.nextSibling);
  }

  // We won't return early here anymore. We resolve editable on click.
  btn.addEventListener('click', async () => {
    let composeWindow = toolbar.closest('div[role="dialog"]') || toolbar.closest('.nH.Hd') || toolbar.closest('table.iN') || document;
    
    // Gmail changes selectors frequently. We try multiple robust ones.
    const editable = composeWindow.querySelector('div[contenteditable="true"][role="textbox"]') || 
                     composeWindow.querySelector('div[aria-label="Message Body"]') ||
                     composeWindow.querySelector('.Am.Al.editable') ||
                     document.querySelector('div[role="textbox"][contenteditable="true"]');
                     
    if (!editable) {
      errorSpan.innerText = 'Error: Cannot find email body. Click inside the text box first.';
      setTimeout(() => { errorSpan.innerText = ''; }, 4000);
      return;
    }

    const text = editable.innerText;
    if (!text || text.trim().length === 0) {
      errorSpan.innerText = 'Please type a draft first so betterr has something to rewrite.';
      setTimeout(() => { errorSpan.innerText = ''; }, 4000);
      return;
    }

    btn.disabled = true;
    btn.innerHTML = '⌛ refining...';
    errorSpan.innerText = '';
    
    composeState.set(editable, { originalHtml: editable.innerHTML });

    chrome.runtime.sendMessage({
      action: 'HUMANIZE_TEXT',
      text: text,
      persona: select.value
    }, (response) => {
      btn.disabled = false;
      btn.innerHTML = '✨ betterr';

      if (chrome.runtime.lastError) {
        errorSpan.innerText = 'Connection error. Please refresh the Gmail tab.';
        setTimeout(() => { errorSpan.innerText = ''; }, 5000);
        return;
      }

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
        
        editable.focus();
        document.execCommand('selectAll', false, null);
        document.execCommand('insertHTML', false, diffHtml);
        
        select.style.display = 'none';
        btn.style.display = 'none';
        actionsContainer.style.display = 'flex';
      }
    });
  });

  acceptBtn.addEventListener('click', () => {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = editable.innerHTML;
    const spans = tempDiv.querySelectorAll('.betterr-changed');
    spans.forEach(span => {
      const textNode = document.createTextNode(span.textContent);
      span.parentNode.replaceChild(textNode, span);
    });
    
    editable.focus();
    document.execCommand('selectAll', false, null);
    document.execCommand('insertHTML', false, tempDiv.innerHTML);
    
    resetUI();
  });

  restoreBtn.addEventListener('click', () => {
    const state = composeState.get(editable);
    if (state && state.originalHtml) {
      editable.focus();
      document.execCommand('selectAll', false, null);
      document.execCommand('insertHTML', false, state.originalHtml);
    }
    resetUI();
  });

  function resetUI() {
    actionsContainer.style.display = 'none';
    select.style.display = 'block';
    btn.style.display = 'flex';
  }
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
  
  // Replace newlines with space for the diff algorithm to work cleanly
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
      html += `<span class="betterr-changed">${safeText}</span> `;
    } else {
      html += `${safeText} `;
    }
  });
  
  return html.trim();
}

initObserver();
