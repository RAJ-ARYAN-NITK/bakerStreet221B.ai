from pathlib import Path
from typing import List
from pypdf import PdfReader
import docx


def load_text(file_path: str) -> str:
    """
    Load text from PDF, DOCX, or TXT
    """
    path = Path(file_path)

    if path.suffix.lower() == ".pdf":
        reader = PdfReader(file_path)
        return "\n".join(page.extract_text() or "" for page in reader.pages)

    if path.suffix.lower() == ".docx":
        doc = docx.Document(file_path)
        return "\n".join(p.text for p in doc.paragraphs)

    if path.suffix.lower() == ".txt":
        return Path(file_path).read_text()

    raise ValueError("Unsupported file type")