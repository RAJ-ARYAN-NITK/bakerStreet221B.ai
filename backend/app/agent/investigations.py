from langchain_core.messages import HumanMessage
from app.agent.nodes import llm, normalize_to_string


def generate_investigations(evidence: list[str]) -> list[str]:
    """
    Generate investigation questions from evidence
    """
    if not evidence:
        return []

    evidence_text = "\n".join(f"- {e}" for e in evidence)

    prompt = f"""
You are Sherlock Holmes analyzing case evidence.

Evidence found in the document:
{evidence_text}

Generate exactly 4 specific investigation questions a detective should pursue.

Rules:
- Each question must be directly based on the evidence above
- Questions must be specific, not generic
- Do NOT add any intro text or explanation
- Do NOT number them
- Return ONLY the 4 questions, one per line, starting with a dash

Example format:
- What is the origin of the transaction dated 12-Jan-2024?
- Who authorized the transfer to account ending in 4821?
- Why does the passenger name differ from the booking record?
- What is the relationship between the two signatories?
"""

    response = llm.invoke([HumanMessage(content=prompt)])
    text = normalize_to_string(response.content)

    questions = []

    for line in text.split("\n"):
        line = line.strip()

        # skip empty lines
        if not line:
            continue

        # skip intro lines like "Here are..." or "Sherlock Holmes..."
        if any(skip in line.lower() for skip in [
            "here are", "following", "sherlock", "investigation question",
            "based on", "i have", "watson", "elementary"
        ]):
            continue

        # clean bullet points and numbering
        line = line.lstrip("-•*").strip()
        line = line.lstrip("1234567890.)").strip()

        # skip if too short to be a real question
        if len(line) < 10:
            continue

        questions.append(line)

    
    if not questions:
        return [
            "What is the primary purpose of this document?",
            "Who are the key individuals or entities mentioned?",
            "Are there any inconsistencies or anomalies in the data?",
            "What timeline of events can be established from this document?",
        ]

    return questions[:4]