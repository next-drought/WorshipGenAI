# Project Name
**WorshipGen AI**

## Elevator Pitch
An AI-powered workflow automation tool for bilingual churches. It transforms raw sermon slides, manuscripts, and PDF bulletins into professionally formatted, bilingual (English/Chinese) worship programs using Google Gemini.

## Inspiration
In bilingual Christian communities, church staff and volunteers spend countless hours every week manually translating sermon manuscripts, extracting text from slide decks, and formatting weekly bulletins. It is a high-friction workflow that requires both theological sensitivity (knowing specific religious terminology) and tedious formatting patience. We wanted to reclaim that time for ministry by automating the administrative burden without sacrificing theological accuracy or the personal touch of the pastor's message.

## What it does
WorshipGen AI acts as an intelligent editorial assistant for church administration:

1.  **Multi-Source Ingestion:** It accepts Weekly Bulletins (PDF), Sermon Manuscripts (Word/PDF), and even Sermon Slide Decks (PowerPoint/PDF).
2.  **Intelligent Extraction:** It parses the bulletin to extract the specific Order of Service, Hymns, and critical "Weekly Prayer" items, ignoring visual noise.
3.  **Narrative Generation:** Uniquely, if a pastor only provides a slide deck with bullet points, the AI uses Gemini to "connect the dots," generating a flowing, coherent sermon narrative from the slides.
4.  **Theological Translation:** It performs high-fidelity translation between English and Chinese. Unlike generic translation tools, it is prompted to preserve liturgical nuances (e.g., translating "Grace" correctly in a theological context).
5.  **Bilingual Assembly:** Finally, it assembles all components into a clean, interleaved format (English paragraph followed by Chinese paragraph) and exports it as Markdown or a ready-to-print Microsoft Word document.

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
