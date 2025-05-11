("HN Summarizer content script loaded");

// State management
let sandboxIframe = null;
let iframeReady = false;
let activeButton = null;

// UI Components
function createSummarizeButton() {
  const button = document.createElement('button');
  button.textContent = '📝 Summarize';
  button.className = 'summarize-btn';
  button.style.marginLeft = '8px';
  button.style.fontSize = '0.8em';
  button.style.cursor = 'pointer';
  return button;
}

function createSummaryLevelSelector(button, link, level) {
  const selector = document.createElement('div');
  selector.style.position = 'absolute';
  selector.style.backgroundColor = '#f6f6ef';
  selector.style.border = '1px solid #ccc';
  selector.style.borderRadius = '4px';
  selector.style.padding = '8px';
  selector.style.zIndex = '1000';
  selector.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
  
  const options = [
    { level: 'brief', text: 'Brief Summary (~1 paragraph)' },
    { level: 'in-depth', text: 'In-depth Summary (~3-4 paragraphs)' }
  ];
  
  options.forEach(option => {
    const optionButton = createOptionButton(option, button, link, selector);
    selector.appendChild(optionButton);
  });
  
  positionSelector(selector, button);
  addClickOutsideHandler(selector, button);
  document.body.appendChild(selector);
}

function createOptionButton(option, button, link, selector) {
  const optionButton = document.createElement('button');
  optionButton.textContent = option.text;
  optionButton.style.display = 'block';
  optionButton.style.width = '100%';
  optionButton.style.marginBottom = '4px';
  optionButton.style.padding = '6px 12px';
  optionButton.style.border = 'none';
  optionButton.style.backgroundColor = '#fff';
  optionButton.style.cursor = 'pointer';
  optionButton.style.borderRadius = '4px';
  optionButton.style.textAlign = 'left';
  
  addOptionButtonHoverEffects(optionButton);
  addOptionButtonClickHandler(optionButton, option, button, link, selector);
  
  return optionButton;
}

function addOptionButtonHoverEffects(button) {
  button.addEventListener('mouseover', () => {
    button.style.backgroundColor = '#e0e0e0';
  });
  
  button.addEventListener('mouseout', () => {
    button.style.backgroundColor = '#fff';
  });
}

function addOptionButtonClickHandler(optionButton, option, button, link, selector) {
  optionButton.addEventListener('click', () => {
    ('Selected summary level:', option.level);
    button.textContent = '⏳ Summarizing...';
    button.classList.add('active');
    selector.remove();
    
    chrome.runtime.sendMessage({
      type: 'SUMMARIZE_ARTICLE',
      url: link.href,
      level: option.level
    });
  });
}

function positionSelector(selector, button) {
  const buttonRect = button.getBoundingClientRect();
  selector.style.top = `${buttonRect.bottom + window.scrollY + 5}px`;
  selector.style.left = `${buttonRect.left + window.scrollX}px`;
}

function addClickOutsideHandler(selector, button) {
  const clickOutsideHandler = (e) => {
    if (!selector.contains(e.target) && e.target !== button) {
      selector.remove();
      document.removeEventListener('click', clickOutsideHandler);
    }
  };
  
  document.addEventListener('click', clickOutsideHandler);
}

function createSummaryDiv(summary) {
  const summaryDiv = document.createElement('div');
  summaryDiv.style.margin = '10px 0';
  summaryDiv.style.padding = '10px';
  summaryDiv.style.backgroundColor = '#f6f6ef';
  summaryDiv.style.borderRadius = '4px';
  summaryDiv.style.position = 'relative';
  summaryDiv.innerHTML = `
    <button class="close-summary" style="
      position: absolute;
      top: 5px;
      right: 5px;
      background: none;
      border: none;
      font-size: 16px;
      cursor: pointer;
      padding: 4px 8px;
      color: #666;
      border-radius: 4px;
    ">✕</button>
    <h3 style="margin: 0 0 10px 0; padding-right: 20px;">📝 Article Summary</h3>
    <div style="white-space: pre-wrap;">${summary}</div>
  `;
  
  addCloseButtonHandlers(summaryDiv);
  return summaryDiv;
}

function addCloseButtonHandlers(summaryDiv) {
  const closeButton = summaryDiv.querySelector('.close-summary');
  closeButton.addEventListener('click', () => {
    summaryDiv.remove();
  });
  
  closeButton.addEventListener('mouseover', () => {
    closeButton.style.backgroundColor = '#e0e0e0';
  });
  closeButton.addEventListener('mouseout', () => {
    closeButton.style.backgroundColor = 'transparent';
  });
}

function updateButtonOnError(button, error) {
  button.textContent = '❌ Failed';
  button.style.backgroundColor = '#ffebee';
  button.style.color = '#c62828';
  button.style.cursor = 'not-allowed';
  button.disabled = true;
  button.classList.remove('active');
  activeButton = null;
  
  if (error === 'TIMEOUT') {
    alert("The summarization request timed out. The article might be too long or the service might be busy. Please try again later or try a different article.");
  } else {
    alert("Failed to summarize article. Please try again later or try a different article.");
  }
}

// Article Processing
function shouldSkipArticle(title, url) {
  return title.startsWith('launch hn') ||
         title.startsWith('ask hn') ||
         title.includes('[video]') ||
         url.includes('youtube.com');
}

function addSummarizeButtons() {
  const links = document.querySelectorAll('.titleline > a');

  links.forEach(link => {
    // Skip if button already exists
    if (link.nextSibling && link.nextSibling.classList?.contains('summarize-btn')) return;

    // Skip certain types of articles
    const title = link.textContent.toLowerCase();
    const url = link.href.toLowerCase();
    
    if (shouldSkipArticle(title, url)) {
      return;
    }

    const button = createSummarizeButton();
    button.addEventListener('click', () => {
      activeButton = button;
      createSummaryLevelSelector(button, link);
    });

    link.parentNode.appendChild(button);
  });
}

// Sandbox iframe management
function ensureSandboxIframe(callback) {
  if (sandboxIframe && iframeReady) {
    callback();
    return;
  }

  sandboxIframe = document.createElement('iframe');
  sandboxIframe.style.display = 'none';
  sandboxIframe.src = chrome.runtime.getURL('sandbox/reader.html');

  sandboxIframe.onload = () => {
    iframeReady = true;
    callback();
  };

  document.body.appendChild(sandboxIframe);
}

// PDF Processing
async function processPdfData(message) {
  ('Received PDF data');
  
  // Set up PDF.js worker
  pdfjsLib.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL('pdfjs/pdf.worker.min.js');
  
  // Load the PDF from base64 data
  const pdfData = atob(message.data);
  const pdfBytes = new Uint8Array(pdfData.length);
  for (let i = 0; i < pdfData.length; i++) {
    pdfBytes[i] = pdfData.charCodeAt(i);
  }
  
  try {
    const pdf = await pdfjsLib.getDocument({ data: pdfBytes }).promise;
    ('PDF loaded successfully');
    
    // Extract text from all pages
    const numPages = pdf.numPages;
    const textPromises = [];
    
    for (let i = 1; i <= numPages; i++) {
      textPromises.push(
        pdf.getPage(i).then(page => {
          return page.getTextContent().then(content => {
            return content.items.map(item => item.str).join(' ');
          });
        })
      );
    }
    
    const textArray = await Promise.all(textPromises);
    const fullText = textArray.join('\n\n');
    
    // Send the extracted text for summarization
    chrome.runtime.sendMessage({
      type: 'SUMMARIZE_TEXT',
      text: fullText,
      level: message.level
    });
  } catch (error) {
    console.error('PDF extraction error:', error);
    if (activeButton) {
      updateButtonOnError(activeButton, error);
    }
    alert('Failed to extract PDF content. Please try again later or try a different PDF.');
  }
}

// Message handlers
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'ARTICLE_HTML') {
    ('Received article HTML with level:', message.level);
    ensureSandboxIframe(() => {
      sandboxIframe.contentWindow.postMessage({
        type: 'PARSE_ARTICLE',
        html: message.html,
        url: message.url,
        level: message.level
      }, '*');
    });
  }

  if (message.type === 'PDF_DATA') {
    processPdfData(message);
  }

  if (message.type === 'ARTICLE_ERROR') {
    if (activeButton) {
      updateButtonOnError(activeButton, message.error);
    }
  }

  if (message.type === 'SUMMARIZATION_COMPLETE') {
    const summaryDiv = createSummaryDiv(message.summary);
    
    if (activeButton) {
      activeButton.textContent = '📝 Summarize';
      activeButton.classList.remove('active');
      activeButton.parentNode.insertBefore(summaryDiv, activeButton.nextSibling);
      activeButton = null;
    }
  }

  if (message.type === 'SUMMARIZATION_ERROR') {
    if (activeButton) {
      updateButtonOnError(activeButton, message.error);
    }
  }
});

// Receive parsed result from sandbox iframe
window.addEventListener('message', (event) => {
  if (event.data.type === 'ARTICLE_PARSED') {
    const { title, content, url, level } = event.data;
    ('Received parsed article with level:', level);
    
    // Send the parsed content for summarization
    chrome.runtime.sendMessage({
      type: 'SUMMARIZE_TEXT',
      text: content,
      level: level
    });
  }
});

// Init
addSummarizeButtons();
