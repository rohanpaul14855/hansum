// Constants
const GLOBAL_PROMPT = "You are a helpful assistant that summarizes articles concisely while preserving key information. Do not use any special formatting like markdown; use plain text only. You may add bulleted lists as long as they are not nested.";
const IN_DEPTH_PROMPT = "Technical articles are those that require specialized knowledge, like an article about microprocessor architectures or the use of LIDAR tools in archaeology. If the following article is a technical one, summarize key concepts at the beginning of the article briefly. Add up to 3 sentences quoted directly from the article if they are especially funny or poignant. If there are no standout sentences, use your own words. Provide any critical context that may be missing from the article. Provide an in-depth summary of the article only if it warrants it, if not, provide a simpler summary. If providing an in-depth summary, use 2-4 paragraphs.";

// Helper functions
function getPromptForLevel(level, text) {
  ('Getting prompt for level:', level);
  const prompts = {
    brief: `${GLOBAL_PROMPT}\n\nPlease provide a brief summary of the following article in 1 paragraph, focusing on the core message:\n\n${text}`,
    'in-depth': `${GLOBAL_PROMPT}\n${IN_DEPTH_PROMPT}\n\nArticle:\n${text}`
  };
  return prompts[level] || prompts.brief;
}

function getMaxTokensForLevel(level) {
  const tokens = {
    brief: 400,
    'in-depth': 1000
  };
  return tokens[level] || tokens.brief;
}

async function fetchPdfData(url) {
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  // Convert ArrayBuffer to base64
  const base64 = btoa(
    new Uint8Array(arrayBuffer)
      .reduce((data, byte) => data + String.fromCharCode(byte), '')
  );
  return base64;
}

async function fetchArticleHtml(url) {
  const response = await fetch(url);
  return response.text();
}

async function summarizeText(text, level, apiKey) {
  const prompt = getPromptForLevel(level, text);
  ('Using prompt for level:', level);
  
  // Create an AbortController for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: prompt
        }]
      }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: getMaxTokensForLevel(level),
      }
    }),
    signal: controller.signal
  });

  clearTimeout(timeoutId); // Clear timeout if request completes

  const data = await response.json();
  
  if (data.error) {
    throw new Error(data.error.message);
  }

  return data.candidates[0].content.parts[0].text;
}

// Message handlers
async function handleSummarizeArticle(message, sender) {
  const articleUrl = message.url;
  const summaryLevel = message.level;
  ('Starting summarization with level:', summaryLevel);

  try {
    if (articleUrl.toLowerCase().endsWith('.pdf')) {
      ('Detected PDF file');
      const base64 = await fetchPdfData(articleUrl);
      chrome.tabs.sendMessage(sender.tab.id, {
        type: 'PDF_DATA',
        data: base64,
        level: summaryLevel
      });
    } else {
      const html = await fetchArticleHtml(articleUrl);
      chrome.tabs.sendMessage(sender.tab.id, {
        type: 'ARTICLE_HTML',
        html,
        url: articleUrl,
        level: summaryLevel
      });
    }
  } catch (err) {
    console.error("Fetch failed:", err);
    chrome.tabs.sendMessage(sender.tab.id, {
      type: 'ARTICLE_ERROR',
      error: err.toString()
    });
  }
}

async function handleSummarizeText(message, sender) {
  ('Received text for summarization with level:', message.level);
  
  chrome.storage.local.get(['geminiApiKey'], async (result) => {
    if (!result.geminiApiKey) {
      chrome.tabs.sendMessage(sender.tab.id, {
        type: 'SUMMARIZATION_ERROR',
        error: 'Gemini API key not found. Please set it in the extension popup.'
      });
      return;
    }

    try {
      const summary = await summarizeText(message.text, message.level, result.geminiApiKey);
      ('Generated summary for level:', message.level);
      
      chrome.tabs.sendMessage(sender.tab.id, {
        type: 'SUMMARIZATION_COMPLETE',
        summary: summary
      });
    } catch (error) {
      console.error('Summarization error:', error);
      chrome.tabs.sendMessage(sender.tab.id, {
        type: 'SUMMARIZATION_ERROR',
        error: error.name === 'AbortError' ? 'TIMEOUT' : error.toString()
      });
    }
  });
}

// Main message listener
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SUMMARIZE_ARTICLE') {
    handleSummarizeArticle(message, sender);
  } else if (message.type === 'SUMMARIZE_TEXT') {
    handleSummarizeText(message, sender);
  }
});
