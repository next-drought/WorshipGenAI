# WorshipGen AI

**WorshipGen AI** is an intelligent web application designed to automate the creation of bilingual (Chinese/English) Christian worship programs. It leverages Google's **Gemini 2.5 Flash** model to parse PDF bulletins, generate narratives from sermon slides, translate theological content, and assemble professionally formatted documents.

## 🏗 System Design & Architecture

The application is built as a **client-side React application** that interacts directly with the Google Gemini API. It follows a multi-stage processing pipeline:

### 1. Document Ingestion Layer (`utils/pdfUtils.ts`)
The app handles file processing entirely in the browser to ensure speed and privacy.
*   **PDFs (Bulletins/Manuscripts):** Parsed using `pdf.js` to extract raw text layers.
*   **Word Docs (.docx):** Parsed using `mammoth.js` to extract raw text.
*   **PowerPoint (.pptx):** Parsed using `JSZip` and a custom Regex-based XML extraction engine to retrieve text from slide structures reliably.

### 2. AI Processing Layer (`services/geminiService.ts`)
This is the core brain of the application, utilizing **Google Gemini 2.5 Flash**. It performs four distinct tasks using specialized prompt engineering:
1.  **Bulletin Analysis:** Extracts structured data (Dates, Hymns, Scripture, Prayer Items) from the raw bulletin text into a JSON object. It specifically targets "Prayer Focus" sections to ensure detailed intercession points are captured.
2.  **Narrative Generation:** If the input is slides, the AI converts bullet points into a flowing, cohesive sermon manuscript (Theological Narrative).
3.  **Translation:** Performs high-fidelity translation (English <-> Chinese) preserving theological nuances (e.g., "Trinity", "Salvation").
4.  **Program Assembly:** Intelligently combines the bulletin structure, original sermon, and translated sermon into a bilingual Markdown document with interleaved paragraphs.

### 3. Presentation Layer (`App.tsx`)
*   **UI Framework:** React 19 with Tailwind CSS for a clean, responsive interface.
*   **State Management:** Tracks the multi-step process (Extracting -> Analyzing -> Translating -> Assembling).
*   **Preview & Export:** Renders a live Markdown preview and generates downloadable `.md` and `.doc` files (using HTML-to-Word XML compatibility).

---

## 🚀 Technical Stack

*   **Frontend:** React, TypeScript, Tailwind CSS, Lucide Icons.
*   **AI Model:** Google Gemini 2.5 Flash (`@google/genai`).
*   **File Processing:** `pdf.js`, `mammoth`, `jszip`.
*   **Build System:** ES Modules (no bundler required for this specific setup).

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