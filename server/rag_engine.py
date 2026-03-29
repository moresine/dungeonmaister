import os
from langchain_community.document_loaders import PyPDFLoader, TextLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import Chroma
from langchain_community.embeddings import HuggingFaceEmbeddings

class RAGEngine:
    def __init__(self, persist_dir="./rag_db"):
        self.persist_dir = persist_dir
        # Standard lightweight embedding model running locally
        self.embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
        
        self.vector_store = Chroma(
            collection_name="dnd_knowledge",
            embedding_function=self.embeddings,
            persist_directory=self.persist_dir
        )
        
    def ingest_document(self, file_path: str):
        print(f"Ingesting {file_path} into D&D Knowledge Base...")
        
        if file_path.endswith('.pdf'):
            loader = PyPDFLoader(file_path)
        else:
            loader = TextLoader(file_path)
            
        documents = loader.load()
        
        text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=100)
        chunks = text_splitter.split_documents(documents)
        
        self.vector_store.add_documents(chunks)
        print(f"Successfully ingested {len(chunks)} chunks.")
        
    def retrieve_context(self, query: str, k=3) -> str:
        # If DB is empty, this will just return empty or throw a safe warning
        try:
            results = self.vector_store.similarity_search(query, k=k)
            if not results:
                return ""
            
            # Prefix with a small preamble to guide the DM
            context = "Reference D&D Rules/Context retrieved for this query:\n"
            context += "\n\n".join([f"[{i+1}] {doc.page_content}" for i, doc in enumerate(results)])
            return context
        except Exception as e:
            print("Warning: RAG Retrieval failed (often means DB is empty).", e)
            return ""
