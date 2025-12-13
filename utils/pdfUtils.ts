// Interface for the global pdfjsLib available via CDN
interface PDFSource {
  url?: string;
  data?: Uint8Array;
}

interface PDFDocumentProxy {
  numPages: number;
  getPage: (pageNumber: number) => Promise<PDFPageProxy>;
}

interface PDFPageProxy {
  getTextContent: () => Promise<PDFTextContent>;
}

interface PDFTextContent {
  items: PDFTextItem[];
}

interface PDFTextItem {
  str: string;
  hasEOL: boolean;
}

declare global {
  interface Window {
    pdfjsLib: {
      getDocument: (source: PDFSource) => { promise: Promise<PDFDocumentProxy> };
      GlobalWorkerOptions: {
        workerSrc: string;
      };
    };
    mammoth: {
      extractRawText: (input: { arrayBuffer: ArrayBuffer }) => Promise<{ value: string; messages: any[] }>;
    };
    JSZip: {
      loadAsync: (data: File | Blob | ArrayBuffer) => Promise<any>;
    };
  }
}

export const extractTextFromPdf = async (file: File): Promise<string> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    const loadingTask = window.pdfjsLib.getDocument({ data: uint8Array });
    const pdf = await loadingTask.promise;
    
    let fullText = '';
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      
      const pageText = textContent.items
        .map((item: PDFTextItem) => item.str)
        .join(' ');
      
      fullText += `--- Page ${i} ---\n${pageText}\n\n`;
    }
    
    return fullText;
  } catch (error) {
    console.error("Error extracting PDF text:", error);
    throw new Error("Failed to extract text from PDF. Please ensure the file is not corrupted.");
  }
};

export const extractTextFromDocx = async (file: File): Promise<string> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const result = await window.mammoth.extractRawText({ arrayBuffer });
    return result.value;
  } catch (error) {
    console.error("Error extracting DOCX text:", error);
    throw new Error("Failed to extract text from DOCX. Please ensure the file is a valid Word document.");
  }
};

export const extractTextFromPptx = async (file: File): Promise<string> => {
  try {
    const zip = await window.JSZip.loadAsync(file);
    const slideFiles: string[] = [];
    
    // Iterate over files to find slide XMLs using regex to be safe
    zip.forEach((relativePath: string) => {
      if (relativePath.match(/ppt\/slides\/slide\d+\.xml/)) {
        slideFiles.push(relativePath);
      }
    });

    // Sort slides numerically by slide number in filename (slide1, slide2, etc.)
    slideFiles.sort((a, b) => {
      const getNum = (s: string) => {
        const m = s.match(/slide(\d+)\.xml/);
        return m ? parseInt(m[1], 10) : 0;
      };
      return getNum(a) - getNum(b);
    });

    let fullText = "";

    for (const slidePath of slideFiles) {
      const content = await zip.file(slidePath)?.async("string");
      if (!content) continue;

      // Use Regex to extract text from <a:t> tags
      // This is robust against namespace variations (a:t, main:t, etc) and faster than DOMParser
      const textMatches = content.match(/<a:t[^>]*>([^<]*)<\/a:t>/g);
      
      if (textMatches) {
        const slideContent = textMatches
          .map((tag: string) => tag.replace(/<[^>]+>/g, '')) // Remove tags
          .join(' ')
          .replace(/\s+/g, ' ') // Collapse whitespace
          .trim();
        
        if (slideContent) {
           // Extract slide number for label
           const slideNum = slidePath.match(/slide(\d+)\.xml/)?.[1] || '?';
           fullText += `--- Slide ${slideNum} ---\n${slideContent}\n\n`;
        }
      }
    }

    if (!fullText.trim()) {
       throw new Error("No text found in slides.");
    }

    return fullText;

  } catch (error) {
    console.error("Error extracting PPTX text:", error);
    throw new Error("Failed to extract text from PPTX. Please ensure it is a valid PowerPoint file.");
  }
};

export const fetchRemoteFile = async (url: string, filename: string, mimeType: string): Promise<File> => {
  const fetchWithProxy = async (targetUrl: string): Promise<Blob> => {
    try {
      // Try direct fetch first
      const response = await fetch(targetUrl);
      if (response.ok) {
        return await response.blob();
      } else {
        // If 404, file likely doesn't exist, no need to proxy
        if (response.status === 404) {
          throw new Error("File not found (404)");
        }
        throw new Error(`Status ${response.status}`);
      }
    } catch (error: any) {
      // If it's a 404 or specific HTTP error, rethrow
      if (error.message === "File not found (404)" || (error.message && error.message.includes("Status"))) {
        throw error;
      }

      // If fetch failed (CORS often manifests as TypeError 'Failed to fetch'), try proxy
      console.warn("Direct fetch failed (likely CORS). Retrying with proxy...", error);
      
      const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;
      const proxyResponse = await fetch(proxyUrl);
      
      if (!proxyResponse.ok) {
        throw new Error(`Proxy error: ${proxyResponse.status}`);
      }
      
      return await proxyResponse.blob();
    }
  };

  try {
    const blob = await fetchWithProxy(url);
    return new File([blob], filename, { type: mimeType });
  } catch (error: any) {
    console.error("Fetch remote file error:", error);
    throw new Error(`Could not download file. ${error.message}`);
  }
};

export const readFileAsText = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsText(file);
  });
};

export const downloadFile = (content: string, filename: string, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const generateDocxHtml = (markdown: string): string => {
  // Simple conversion of markdown to HTML compatible with Word
  // In a production app, we would use a library like 'docx', but for this frontend demo,
  // we create an HTML file with Word-specific namespaces which Word opens perfectly.
  const htmlBody = markdown
    .replace(/^# (.*$)/gim, '<h1 style="font-size: 24pt; color: #2e3b55;">$1</h1>')
    .replace(/^## (.*$)/gim, '<h2 style="font-size: 18pt; color: #4a5568; margin-top: 20px;">$1</h2>')
    .replace(/^### (.*$)/gim, '<h3 style="font-size: 14pt; color: #4a5568;">$1</h3>')
    .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
    .replace(/\*(.*)\*/gim, '<em>$1</em>')
    .replace(/\n/gim, '<br />');

  return `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset="utf-8">
      <title>Worship Program</title>
      <style>
        body { font-family: 'Calibri', sans-serif; }
        p { margin-bottom: 10px; }
      </style>
    </head>
    <body>
      ${htmlBody}
    </body>
    </html>
  `;
};