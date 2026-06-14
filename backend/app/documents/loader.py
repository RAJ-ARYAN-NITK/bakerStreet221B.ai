from pathlib import Path
from pypdf import PdfReader
import docx


def load_text(file_path: str) -> str:
    """
    Load text from PDF, DOCX, or TXT
    """
    path = Path(file_path)

    if path.suffix.lower() == ".pdf":
        reader = PdfReader(file_path)

        text = []
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                text.append(page_text)

        return "\n".join(text)

    if path.suffix.lower() == ".docx":
        doc = docx.Document(file_path)
        return "\n".join(p.text for p in doc.paragraphs)

    if path.suffix.lower() == ".txt":
        return path.read_text()

    raise ValueError("Unsupported file type")
