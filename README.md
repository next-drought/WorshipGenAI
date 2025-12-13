# WorshipGen AI

**WorshipGen AI** is an intelligent web application designed to automate the creation of bilingual (Chinese/English) Christian worship programs. It transforms sermon slides, manuscripts, and bulletins into professionally formatted documents using Google's Gemini 2.5 Flash model.

## Inspiration
In bilingual Christian communities, church staff and volunteers spend countless hours every week manually translating sermon manuscripts, extracting text from slide decks, and formatting weekly bulletins. It is a high-friction workflow that requires both theological sensitivity (knowing specific religious terminology) and tedious formatting patience. We wanted to reclaim that time for ministry by automating the administrative burden without sacrificing theological accuracy or the personal touch of the pastor's message.

## What it does
WorshipGen AI acts as an intelligent editorial assistant for church administration:

*   **Multi-Source Ingestion:** It accepts Weekly Bulletins (PDF), Sermon Manuscripts (Word/PDF), and even Sermon Slide Decks (PowerPoint/PDF).
*   **Intelligent Extraction:** It parses the bulletin to extract the specific Order of Service, Hymns, and critical "Weekly Prayer" items, ignoring visual noise.
*   **Narrative Generation:** Uniquely, if a pastor only provides a slide deck with bullet points, the AI uses Gemini to "connect the dots," generating a flowing, coherent sermon narrative from the slides.
*   **Theological Translation:** It performs high-fidelity translation between English and Chinese. Unlike generic translation tools, it is prompted to preserve liturgical nuances (e.g., translating "Grace" correctly in a theological context).
*   **Bilingual Assembly:** Finally, it assembles all components into a clean, interleaved format (English paragraph followed by Chinese paragraph) and exports it as Markdown or a ready-to-print Microsoft Word document.

## How we built it
The application is a modern, privacy-focused **React 19** web application.

*   **AI Engine:** We utilized **Google Gemini 2.5 Flash** via the `@google/genai` SDK. We chose this model for its speed and massive context window, allowing us to process entire sermon manuscripts and complex slide decks in a single pass.
*   **Client-Side Processing:** To ensure privacy and speed, we built the file processing pipeline entirely in the browser.
    *   **PDFs:** Parsed using `pdf.js` to extract text layers.
    *   **PowerPoint:** We engineered a custom `.pptx` parser using `JSZip` and Regex that unzips the presentation file in memory and extracts text directly from the XML structure, bypassing the need for heavy backend servers.
    *   **Word Docs:** Parsed using `mammoth.js`.
*   **Prompt Engineering:** We implemented a "Chain of Thought" pipeline where the AI first analyzes the structure (JSON extraction), then performs creative writing (Narrative generation), and finally handles structural formatting (Markdown assembly).

## Challenges we ran into
*   **Parsing PPTX in the Browser:** Reading PowerPoint files without a server is difficult due to complex XML namespaces. We initially tried `DOMParser` but found it brittle. We pivoted to a robust Regex-based extraction method that reliably pulls text from slide XMLs regardless of the Office version used.
*   **Bilingual Formatting:** Getting an LLM to strictly follow an "Interleaved" format (English immediately followed by Chinese) rather than dumping all English then all Chinese required careful prompt tuning and one-shot examples.

## Accomplishments that we're proud of
*   **"Slides to Sermon" Feature:** The ability to take a skeletal slide deck and generate a full, readable sermon manuscript is a powerful accessibility feature.
*   **Zero-Backend Architecture:** The entire complex pipeline runs in the user's browser, reducing hosting costs to zero and increasing data privacy.

## Tech Stack
*   **AI:** Google Gemini 2.5 Flash
*   **Frontend:** React 19, TypeScript, Tailwind CSS
*   **Utilities:** Lucide React, PDF.js, JSZip, Mammoth

---

## Deep Dive: System Architecture

For developers interested in the codebase structure:

### 1. Document Ingestion Layer (`utils/pdfUtils.ts`)
The app handles file processing entirely in the browser:
*   **PDFs (Bulletins/Manuscripts):** Parsed using `pdf.js` to extract raw text layers.
*   **Word Docs (.docx):** Parsed using `mammoth.js` to extract raw text.
*   **PowerPoint (.pptx):** Parsed using `JSZip` and a custom Regex-based XML extraction engine.

### 2. AI Processing Layer (`services/geminiService.ts`)
The application utilizes **Google Gemini 2.5 Flash** to perform four distinct tasks:
1.  **Bulletin Analysis:** Extracts structured data (Dates, Hymns, Scripture, Prayer Items) from the raw bulletin text into a JSON object.
2.  **Narrative Generation:** Converts bullet points from slides into a flowing sermon manuscript.
3.  **Translation:** Performs high-fidelity translation (English <-> Chinese).
4.  **Program Assembly:** Combines the bulletin structure, original sermon, and translated sermon into a bilingual document.

---

## 📖 How to Use

### Prerequisites
You must have a valid **Google Gemini API Key**.
1.  Get a key from [Google AI Studio](https://aistudio.google.com/).
2.  Set the environment variable `API_KEY` in your execution environment.

### Step-by-Step Guide

#### 1. Configuration
*   **Input Mode:** Choose how you are providing the sermon.
    *   **Manuscript:** For full text documents (.txt, .pdf, .docx).
    *   **Slides:** For presentation files (.pdf, .pptx). The AI will write the sermon based on your slides.
*   **Worship Date:** (Optional) Enter the date manually, or let the AI extract it from the bulletin.

#### 2. Upload Materials
*   **Worship Bulletin:** Upload the PDF file of your weekly bulletin/order of service. This is required to extract the flow of the service.
*   **Sermon Source:** Upload your manuscript or slides file.

#### 3. Generation
Click **"Generate Program"**. The application will display progress stages:
1.  **Extracting:** Reading text from your files.
2.  **Analyzing:** Finding hymns, scriptures, and announcements in the bulletin.
3.  **Generating Narrative:** (Slides mode only) Writing the sermon text.
4.  **Translating:** Creating the bilingual counterpart.
5.  **Assembling:** Formatting the final output.

#### 4. Preview & Download
Once complete, a preview appears on the right.
*   **Markdown:** Download for use in text editors or CMS.
*   **Word (.doc):** Download a formatted document ready for printing or further editing in Microsoft Word.

---

## ⚠️ File Support & Limitations

*   **PDFs:** Must be text-based (selectable text). Scanned images inside PDFs may not be read accurately.
*   **PPTX:** Supports standard text boxes and bullet points. SmartArt or embedded text-in-images may be skipped.
*   **Context Limit:** The app limits input context to ~30,000 characters to ensure the AI remains focused and accurate.

## 🛡 Privacy Note
All file extraction happens locally in your browser. Only the extracted text content is sent to the Google Gemini API for processing. Your actual files are never uploaded to a third-party server.
