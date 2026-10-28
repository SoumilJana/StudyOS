import pypdf
import os

pdf_dir = r"c:\Users\skull\Downloads\EthicalHackingPDFs"
files = [
    "Module 1 Study Material.pdf",
    "Module 2 Study Material.pdf",
    "Module 3 Study Material.pdf",
    "Module 4 Study Material.pdf",
    "Module 5_Materials.pdf",
]

for filename in files:
    filepath = os.path.join(pdf_dir, filename)
    if os.path.exists(filepath):
        reader = pypdf.PdfReader(filepath)
        print(f"\n=======================================================")
        print(f"File: {filename} | Pages: {len(reader.pages)}")
        # sample text from page 1 & 2
        p1 = reader.pages[0].extract_text() or ""
        p2 = reader.pages[1].extract_text() if len(reader.pages) > 1 else ""
        preview = (p1 + "\n" + p2)[:400].replace('\n', ' ')
        print(f"Preview: {preview}...")
