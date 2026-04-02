import os
from rag_engine import RAGEngine

def ingest_srd_rules():
    rag = RAGEngine()
    srd_path = "/home/moresine/.gemini/tmp/65a32e34f151c4aaf5f25428b8a40ad191a22407122f3a2c9cb3eced44a2871f/DND.SRD.Wiki"
    
    for root, dirs, files in os.walk(srd_path):
        for file in files:
            if file.endswith(".md"):
                file_path = os.path.join(root, file)
                print(f"Ingesting {file_path}")
                rag.ingest_document(file_path)

if __name__ == "__main__":
    ingest_srd_rules()
