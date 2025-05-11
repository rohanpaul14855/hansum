window.addEventListener("message", (event) => {
    if (event.data.type === 'PARSE_ARTICLE') {
      const html = event.data.html;
      const url = event.data.url;
      const level = event.data.level;
  
      ('Sandbox received parse request with level:', level);
  
      const doc = new DOMParser().parseFromString(html, "text/html");
      const article = new Readability(doc).parse();
  
      window.parent.postMessage({
        type: 'ARTICLE_PARSED',
        title: article.title,
        content: article.textContent,
        url: url,
        level: level
      }, "*");
    }
  });
  