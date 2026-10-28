import pypdf
import os

pdf_dir = r"c:\Users\skull\Downloads\EthicalHackingPDFs"

syllabus_file = os.path.join(pdf_dir, "Ethical Hacking Syllabus_2026.pdf")
print(f"=== Extracting from {syllabus_file} ===")

reader = pypdf.PdfReader(syllabus_file)
print(f"Total pages: {len(reader.pages)}")

extracted_text = ""
for i, page in enumerate(reader.pages):
    text = page.extract_text() or ""
    extracted_text += f"\n--- Page {i+1} ---\n" + text

with open("extracted_syllabus.txt", "w", encoding="utf-8") as f:
    f.write(extracted_text)

print(f"Extracted {len(extracted_text)} characters.")
print("\nFirst 1500 characters preview:")
print(extracted_text[:1500])
