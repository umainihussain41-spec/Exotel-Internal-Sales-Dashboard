const pdf = require('pdf-parse');
const fs = require('fs');
const path = require('path');

const pdfs = [
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
];

(async () => {
  for (const file of pdfs) {
    try {
      const buf = fs.readFileSync(path.join(__dirname, file));
      const data = await pdf(buf);
      console.log('\n\n========================================');
      console.log('FILE:', file);
      console.log('========================================');
      console.log(data.text);
    } catch(e) {
      console.log('ERROR reading', file, e.message);
    }
  }
})();
