import os
from langchain_community.document_loaders import TextLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import Chroma
from langchain_community.embeddings import HuggingFaceEmbeddings


class RAGEngine:
    def __init__(self, persist_dir="./rag_db"):
        self.persist_dir = persist_dir
        # Multilingual embedding model — works well for both English and German
        self.embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
        self.active_collection = "dnd_knowledge"

        self.vector_store = Chroma(
            collection_name=self.active_collection,
            embedding_function=self.embeddings,
            persist_directory=self.persist_dir,
        )

    def set_campaign(self, campaign_id: str):
        """Switch the active RAG collection to a campaign-specific one."""
        collection_name = f"dnd_{campaign_id}"
        if collection_name != self.active_collection:
            self.active_collection = collection_name
            self.vector_store = Chroma(
                collection_name=collection_name,
                embedding_function=self.embeddings,
                persist_directory=self.persist_dir,
            )

    def is_collection_populated(self) -> bool:
        """Check if the current collection has any documents."""
        try:
            results = self.vector_store.similarity_search("test", k=1)
            return len(results) > 0
        except Exception:
            return False

    def ingest_text(self, text: str, source: str = "campaign"):
        """Ingest raw text content (e.g. campaign markdown) into the current collection."""
        print(f"Ingesting text into collection '{self.active_collection}'...")

        text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=100)
        from langchain_core.documents import Document
        documents = [Document(page_content=text, metadata={"source": source})]
        chunks = text_splitter.split_documents(documents)

        self.vector_store.add_documents(chunks)
        print(f"Successfully ingested {len(chunks)} chunks into '{self.active_collection}'.")

    def ingest_document(self, file_path: str):
        print(f"Ingesting {file_path} into collection '{self.active_collection}'...")

        loader = TextLoader(file_path, encoding="utf-8")
        documents = loader.load()

        text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=100)
        chunks = text_splitter.split_documents(documents)

        self.vector_store.add_documents(chunks)
        print(f"Successfully ingested {len(chunks)} chunks.")

    def retrieve_context(self, query: str, k=3) -> str:
        try:
            results = self.vector_store.similarity_search(query, k=k)
            if not results:
                return ""

            context = "Reference D&D Rules/Context retrieved for this query:\n"
            context += "\n\n".join([f"[{i+1}] {doc.page_content}" for i, doc in enumerate(results)])
            return context
        except Exception as e:
            print("Warning: RAG Retrieval failed (often means DB is empty).", e)
            return ""
