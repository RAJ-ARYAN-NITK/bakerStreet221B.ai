import os
from mcp.server.fastmcp import FastMCP

# Initialize the FastMCP server
mcp = FastMCP("Scotland Yard & Forensics Lab")

# ─── Tool 1: Scotland Yard Police Database ────────────────────────────────────

@mcp.tool()
def query_police_database(suspect_name: str) -> str:
    """Query the internal Scotland Yard database for a suspect by name."""
    database = {
        "James Moriarty": "Known associate of criminal syndicates. Status: At Large.",
        "Irene Adler": "Person of interest in blackmail cases. Status: Fled.",
        "Sebastian Moran": "Former military, excellent marksman. Known enforcer.",
        "Jack Stapleton": "Suspect in the Baskerville case. Status: Deceased.",
        "John Clay": "Notorious thief and murderer. Arrested at the City and Suburban Bank."
    }
    # Do a fuzzy match or exact match
    for key, record in database.items():
        if suspect_name.lower() in key.lower():
            return f"Record for {key}: {record}"
    
    return f"No records found for '{suspect_name}'."

# ─── Tool 2: Forensics Lab (Local File Reader) ────────────────────────────────

EVIDENCE_DIR = os.path.join(os.path.dirname(__file__), "evidence_locker")

@mcp.tool()
def analyze_physical_evidence(filename: str) -> str:
    """
    Read and analyze the contents of a physical evidence file in the evidence_locker.
    Only pass the filename (e.g. 'clue1.txt'), not the full path.
    """
    if not os.path.exists(EVIDENCE_DIR):
        return "The evidence locker is empty or does not exist."
    
    filepath = os.path.join(EVIDENCE_DIR, filename)
    
    # Security: prevent path traversal
    if not os.path.abspath(filepath).startswith(os.path.abspath(EVIDENCE_DIR)):
        return "Error: Cannot access files outside the evidence locker."
    
    if not os.path.isfile(filepath):
        # Maybe list available files to help the agent
        available_files = os.listdir(EVIDENCE_DIR)
        return f"File '{filename}' not found. Available evidence: {', '.join(available_files) if available_files else 'None'}"
    
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read()
        return f"--- EVIDENCE FILE: {filename} ---\n{content}\n---------------------------"
    except Exception as e:
        return f"Failed to analyze evidence: {e}"

if __name__ == "__main__":
    # Ensure evidence directory exists
    os.makedirs(EVIDENCE_DIR, exist_ok=True)
    # Run the MCP server
    mcp.run()
