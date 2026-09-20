// English + Hindi only. Ten half-finished languages would be worse than two complete ones.

export const LANGS = { en: 'English', hi: 'हिन्दी' };

const strings = {
  en: {
    tagline: 'Report a civic problem with a photo. We route it, rank it, and track it until it is fixed.',
    reportIssue: 'Report an issue',
    commandCenter: 'Command centre',
    citizen: 'Citizen',
    official: 'City official',
    photoLabel: 'Photo of the problem',
    photoHint: 'A clear photo lets the model judge how serious this is.',
    notesLabel: 'Describe it in your own words',
    notesHint: 'English or Hindi, whichever is easier.',
    analyze: 'Check this issue',
    analyzing: 'Reading the photo…',
    submit: 'Send to the department',
    merge: 'Add to existing issue',
    separate: 'This is a separate issue',
    noReports: 'Nothing reported yet. Your first complaint will appear here.',
    updates: 'Updates',
    noUpdates: 'No updates yet. You will see status changes here.',
    detected: 'Detected issue',
    category: 'Category',
    severity: 'Severity',
    department: 'Department',
    whyDept: 'Why this department',
    complaintDraft: 'Complaint drafted for you',
    priority: 'Priority',
  },
  hi: {
    tagline: 'फोटो के साथ नागरिक समस्या दर्ज करें। हम उसे सही विभाग तक भेजते हैं और समाधान तक नज़र रखते हैं।',
    reportIssue: 'समस्या दर्ज करें',
    publicFeed: 'सार्वजनिक फ़ीड',
    myReports: 'मेरी शिकायतें',
    commandCenter: 'कमांड सेंटर',
    citizen: 'नागरिक',
    official: 'नगर अधिकारी',
    photoLabel: 'समस्या की फोटो',
    photoHint: 'साफ़ फोटो से गंभीरता का सही आकलन होता है।',
    notesLabel: 'अपने शब्दों में बताइए',
    notesHint: 'हिंदी या अंग्रेज़ी, जो आसान लगे।',
    analyze: 'जाँच करें',
    analyzing: 'फोटो पढ़ी जा रही है…',
    submit: 'विभाग को भेजें',
    merge: 'मौजूदा शिकायत में जोड़ें',
    separate: 'यह अलग समस्या है',
    noReports: 'अभी कोई शिकायत नहीं। आपकी पहली शिकायत यहाँ दिखेगी।',
    updates: 'अपडेट',
    noUpdates: 'अभी कोई अपडेट नहीं। स्थिति बदलने पर यहाँ दिखेगा।',
    detected: 'पहचानी गई समस्या',
    category: 'श्रेणी',
    severity: 'गंभीरता',
    department: 'विभाग',
    whyDept: 'यह विभाग क्यों',
    complaintDraft: 'आपके लिए तैयार शिकायत',
    priority: 'प्राथमिकता',
  },
};

export function t(lang, key) {
  return strings[lang]?.[key] ?? strings.en[key] ?? key;
}
