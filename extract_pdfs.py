import os
import json
import PyPDF2

pdfs = [
  'Copy of Copy of MVN Plans.docx.pdf',
  'Copy of Whatsapp Plans.docx.pdf',
  'Exotel Voicebot Commercials.pdf',
  'SIP lines.docx.pdf',
  'SMS Plans.docx.pdf',
  'STD plans.docx.pdf',
  'Toll Free plans.docx.pdf',
  'Truecaller plan.docx.pdf',
  'User based plan.docx.pdf',
  'Veeno user based plans.docx.pdf',
  'Voice streaming.docx.pdf',
]

results = {}

for filename in pdfs:
    try:
        with open(filename, 'rb') as file:
            reader = PyPDF2.PdfReader(file)
            text = ''
            for page in reader.pages:
                text += page.extract_text() + '\n'
            # fix spacing issues from extraction
            text = ' '.join([line.strip() for line in text.split('\n') if line.strip()])
            results[filename] = text
    except Exception as e:
        results[filename] = 'ERROR: ' + str(e)

with open('pdf_output.json', 'w', encoding='utf-8') as f:
    json.dump(results, f, indent=2, ensure_ascii=False)
print("Done")
