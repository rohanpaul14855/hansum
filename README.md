# HaNSum

A Chrome extension that provides AI-powered summaries of Hacker News articles using Google's Gemini API. The name "HaNSum" is a contraction of "Hacker News Summarizer".

## Features

- Summarize any article from Hacker News
- Two summary levels: Brief (~1 paragraph) and In-depth (~3-4 paragraphs)
- PDF support for academic papers and documents
- Clean, non-intrusive UI that integrates with Hacker News

## ⚠️ Important Notes

- This extension requires your own Google Gemini API key
- The API key is stored locally in your browser and is never shared
- Article content is sent to Google's servers for summarization
- The extension does not collect or store any personal data

## Installation

1. Clone this repository:
   ```bash
   git clone https://github.com/rohanpaul14855/hansum.git
   cd hansum
   ```

2. Get a Google Gemini API key:
   - Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Create a new API key
   - Copy the key for use in the extension

3. Load the extension in Chrome:
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" in the top right
   - Click "Load unpacked" and select the extension directory
   - Click the extension icon and enter your Gemini API key

## Usage

1. Visit [Hacker News](https://news.ycombinator.com)
2. Click the "📝 Summarize" button next to any article
3. Choose between Brief or In-depth summary
4. Wait for the summary to appear below the article

## Limitations

- Summarization may time out for very long articles
- PDF support requires the PDF to be publicly accessible

## Development

- Built with vanilla JavaScript
- Uses Mozilla's Readability.js for article content extraction and PDF.js for text extraction
- Uses Google's Gemini API (gemini-2.0-flash) for summarization

## Dependencies

- [PDF.js](https://mozilla.github.io/pdf.js/) - For PDF text extraction
- [Readability.js](https://github.com/mozilla/readability) - For article content extraction
- [Google Gemini API](https://ai.google.dev/) - For AI-powered summarization

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

The project uses Readability.js which is licensed under the Apache License 2.0 - see the [Readability.js LICENSE](https://github.com/mozilla/readability/blob/main/LICENSE.md) for details.
The project uses PDF.js which is licensed under the Apache License 2.0 - see the [PDF.js LICENSE](https://github.com/mozilla/pdf.js/blob/master/LICENSE) for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request. 