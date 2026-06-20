from app.memory.retriever import add_evidence, retrieve_evidence

def run_test():
    case_id = "case_test_001"

    print("Adding evidence...")
    add_evidence(case_id, "Footprints near the crime scene, size 11 boots")
    add_evidence(case_id, "Cigar ash found: rare Turkish tobacco")
    add_evidence(case_id, "Witness saw a tall man with a limp")

    print("\nQuerying evidence...")
    results = retrieve_evidence(case_id, "tobacco")

    print("\nRetrieved:")
    for r in results:
        print("-", r)


if __name__ == "__main__":
    run_test()