import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const LANG_KEY = 'jainquiz_lang';

const STRINGS = {
  hi: {
    appTitle: 'जैन ज्ञान क्विज़',

    landingTitle: 'जैन ज्ञान क्विज़',
    landingSubtitle: 'जैन धर्म पर एक लाइव क्विज़ — छात्र के रूप में जुड़ें या गुरु के रूप में संचालन करें।',
    landingHostBtn: 'मैं गुरु हूँ',
    landingJoinBtn: 'छात्र के रूप में जुड़ें',
    landingMantra: '॥ परस्परोपग्रहो जीवानाम् ॥',

    joinTitle: 'क्विज़ में शामिल हों',
    joinSubtitle: 'अपने गुरु द्वारा साझा किया गया पिन और अपना नाम दर्ज करें।',
    joinPinLabel: 'रूम पिन',
    joinPinPlaceholder: 'उदाहरण: K3F7ZQ',
    joinNameLabel: 'आपका नाम',
    joinNamePlaceholder: 'उदाहरण: प्रिया',
    joinErrorPin: 'अपने गुरु द्वारा दिखाया गया रूम पिन दर्ज करें।',
    joinErrorName: 'अपना नाम दर्ज करें।',
    joinSubmit: 'रूम में प्रवेश करें',

    hostLoginTitle: 'गुरु लॉगिन',
    hostLoginSubtitle: 'क्विज़ प्रबंधित करने और सत्र चलाने के लिए होस्ट पासकोड दर्ज करें।',
    hostLoginPasscodeLabel: 'होस्ट पासकोड',
    hostLoginChecking: 'जाँच हो रही है…',
    hostLoginContinue: 'आगे बढ़ें',

    dashboardTitle: 'गुरु डैशबोर्ड',
    dashboardLogout: 'लॉग आउट',
    dashboardSubtitle: 'क्विज़ बनाएं, फिर अपने छात्रों के लिए लाइव सत्र शुरू करें।',
    dashboardNewQuiz: '+ नया क्विज़',
    dashboardEmpty: 'अभी तक कोई क्विज़ नहीं है। शुरू करने के लिए एक बनाएं।',
    dashboardQuestionCount: '{n} प्रश्न',
    dashboardEdit: 'संपादित करें',
    dashboardDelete: 'हटाएं',
    dashboardStarting: 'शुरू हो रहा है…',
    dashboardStartSession: 'सत्र शुरू करें',
    dashboardConfirmDelete: 'इस क्विज़ को हटाएं? इसे पूर्ववत नहीं किया जा सकता।',
    dashboardNoQuestionsError: '"{title}" में अभी कोई प्रश्न नहीं है। पहले इसे संपादित करें।',

    editorNewTitle: 'नया क्विज़',
    editorEditTitle: 'क्विज़ संपादित करें',
    editorBack: 'वापस',
    editorTitleLabel: 'क्विज़ शीर्षक',
    editorTitlePlaceholder: 'उदाहरण: जैन तीर्थंकर क्विज़',
    editorFilledStatus: '{filled} / {total} प्रश्न पूरी तरह भरे गए हैं ({target} पूरे राउंड के लिए अनुशंसित हैं)। केवल पूरी तरह भरे गए प्रश्न (पाठ + 4 विकल्प) सहेजे जाते हैं।',
    editorQuestionLabel: 'प्रश्न {n}',
    editorRemove: 'हटाएं',
    editorQuestionPlaceholder: 'प्रश्न का पाठ',
    editorCorrectRadioTitle: 'सही उत्तर के रूप में चिह्नित करें',
    editorOptionPlaceholder: 'विकल्प {n}',
    editorCorrectHint: 'सही विकल्प के आगे रेडियो चुनें।',
    editorAddQuestion: '+ प्रश्न जोड़ें',
    editorSaving: 'सहेजा जा रहा है…',
    editorSaveQuiz: 'क्विज़ सहेजें',
    editorTitleRequiredError: 'क्विज़ को एक शीर्षक दें।',
    editorMinQuestionError: 'कम से कम एक पूरी तरह भरा हुआ प्रश्न जोड़ें (पाठ + 4 विकल्प)।',
    editorSaved: 'सहेजा गया।',
    loading: 'लोड हो रहा है…',

    stageConnecting: 'कनेक्ट हो रहा है…',
    stageJoinError: 'रूम में शामिल नहीं हो सके।',
    stageBackToDashboard: 'डैशबोर्ड पर वापस जाएं',
    stageEndSession: 'सत्र समाप्त करें',
    stageConfirmEnd: 'सभी के लिए यह सत्र समाप्त करें?',
    stageLobbyEyebrow: 'रूम पिन — इसे अपने छात्रों के साथ साझा करें',
    stagePinBadge: 'पिन: {pin}',
    stageJoined: '{n} शामिल हुए',
    stageWaitingStudents: 'छात्रों की प्रतीक्षा हो रही है…',
    stageStarting: 'शुरू हो रहा है…',
    stageStartQuiz: 'क्विज़ शुरू करें',
    stageQuestionProgress: 'प्रश्न {i} / {total}',
    stageAnsweredCount: '{count} / {total} ने उत्तर दिया',
    stageShowAnswer: 'अभी उत्तर दिखाएं',
    stageCorrectAnswer: 'सही उत्तर: {answer}',
    stageLeaderboard: 'लीडरबोर्ड',
    stageNextQuestion: 'अगला प्रश्न',
    stageShowFinal: 'अंतिम परिणाम दिखाएं',
    stageFinalLeaderboard: '🏆 अंतिम लीडरबोर्ड',

    playJoining: 'जुड़ रहे हैं…',
    playJoinErrorFallback: 'शामिल नहीं हो सके।',
    playRetry: 'पुनः प्रयास करें',
    playSessionEnded: 'सत्र समाप्त हुआ',
    playThanks: 'खेलने के लिए धन्यवाद!',
    playHome: 'होम',
    playJoinedGreeting: 'आप शामिल हो गए, {name}!',
    playWaitingGuru: 'गुरु द्वारा क्विज़ शुरू करने की प्रतीक्षा हो रही है…',
    playPlayersInRoom: 'रूम में {n} खिलाड़ी हैं',
    playAnswerLocked: 'उत्तर लॉक हो गया — अन्य लोगों की प्रतीक्षा हो रही है…',
    statusTapToSubmit: 'सबमिट करने के लिए टैप करें',
    statusLocked: 'उत्तर लॉक हो गया',
    statusSubtext: 'समय समाप्त होने पर आपका उत्तर सुरक्षित हो जाएगा',
    statusLive: 'लाइव',
    playCorrect: 'सही! 🎉',
    playIncorrect: 'सही नहीं',
    playPointsEarned: '+{n} अंक',
    playNoPoints: 'इस राउंड में कोई अंक नहीं',
    playTotalScore: 'कुल: {n}',
    playNoAnswerRecorded: 'इस राउंड में कोई उत्तर दर्ज नहीं हुआ।',
    playCorrectAnswerInline: 'सही उत्तर:',
    playWaitingGuruNext: 'गुरु के आगे बढ़ने की प्रतीक्षा हो रही है…',
    playFinalResults: '🏆 अंतिम परिणाम',
    playFinishedRank: 'आपने #{rank} स्थान पर {score} अंकों के साथ समाप्त किया',

    timerSeconds: '{n} सेकंड',
    timerCaption: 'सेकंड बाकी',

    langToggleLabel: 'EN',
  },

  en: {
    appTitle: 'Jain Knowledge Quiz',

    landingTitle: 'Jain Knowledge Quiz',
    landingSubtitle: 'A live quiz on Jainism — join as a student or host as the Guru.',
    landingHostBtn: "I'm the Guru",
    landingJoinBtn: 'Join as a Chhatra',
    landingMantra: '"Souls render service to one another" — Tattvartha Sutra 5.21',

    joinTitle: 'Join the Quiz',
    joinSubtitle: 'Enter the PIN shared by your Guru and your name.',
    joinPinLabel: 'Room PIN',
    joinPinPlaceholder: 'e.g. K3F7ZQ',
    joinNameLabel: 'Your name',
    joinNamePlaceholder: 'e.g. Priya',
    joinErrorPin: 'Enter the room PIN shown by your Guru.',
    joinErrorName: 'Enter your name.',
    joinSubmit: 'Enter the room',

    hostLoginTitle: 'Guru Login',
    hostLoginSubtitle: 'Enter the host passcode to manage quizzes and run sessions.',
    hostLoginPasscodeLabel: 'Host passcode',
    hostLoginChecking: 'Checking…',
    hostLoginContinue: 'Continue',

    dashboardTitle: 'Guru Dashboard',
    dashboardLogout: 'Log out',
    dashboardSubtitle: 'Create a quiz, then start a live session for your students.',
    dashboardNewQuiz: '+ New quiz',
    dashboardEmpty: 'No quizzes yet. Create one to get started.',
    dashboardQuestionCount: '{n} questions',
    dashboardEdit: 'Edit',
    dashboardDelete: 'Delete',
    dashboardStarting: 'Starting…',
    dashboardStartSession: 'Start session',
    dashboardConfirmDelete: 'Delete this quiz? This cannot be undone.',
    dashboardNoQuestionsError: '"{title}" has no questions yet. Edit it first.',

    editorNewTitle: 'New quiz',
    editorEditTitle: 'Edit quiz',
    editorBack: 'Back',
    editorTitleLabel: 'Quiz title',
    editorTitlePlaceholder: 'e.g. Jain Tirthankara Quiz',
    editorFilledStatus: '{filled} / {total} questions are fully filled in ({target} recommended for a full round). Only fully filled questions (text + 4 options) are saved.',
    editorQuestionLabel: 'Question {n}',
    editorRemove: 'Remove',
    editorQuestionPlaceholder: 'Question text',
    editorCorrectRadioTitle: 'Mark as the correct answer',
    editorOptionPlaceholder: 'Option {n}',
    editorCorrectHint: 'Select the radio next to the correct option.',
    editorAddQuestion: '+ Add question',
    editorSaving: 'Saving…',
    editorSaveQuiz: 'Save quiz',
    editorTitleRequiredError: 'Give the quiz a title.',
    editorMinQuestionError: 'Add at least one fully filled question (text + 4 options).',
    editorSaved: 'Saved.',
    loading: 'Loading…',

    stageConnecting: 'Connecting…',
    stageJoinError: 'Could not join the room.',
    stageBackToDashboard: 'Back to dashboard',
    stageEndSession: 'End session',
    stageConfirmEnd: 'End this session for everyone?',
    stageLobbyEyebrow: 'Room PIN — share it with your students',
    stagePinBadge: 'PIN: {pin}',
    stageJoined: '{n} joined',
    stageWaitingStudents: 'Waiting for students…',
    stageStarting: 'Starting…',
    stageStartQuiz: 'Start quiz',
    stageQuestionProgress: 'Question {i} / {total}',
    stageAnsweredCount: '{count} / {total} answered',
    stageShowAnswer: 'Show answer now',
    stageCorrectAnswer: 'Correct answer: {answer}',
    stageLeaderboard: 'Leaderboard',
    stageNextQuestion: 'Next question',
    stageShowFinal: 'Show final results',
    stageFinalLeaderboard: '🏆 Final leaderboard',

    playJoining: 'Joining…',
    playJoinErrorFallback: 'Could not join.',
    playRetry: 'Try again',
    playSessionEnded: 'Session ended',
    playThanks: 'Thanks for playing!',
    playHome: 'Home',
    playJoinedGreeting: "You're in, {name}!",
    playWaitingGuru: 'Waiting for the Guru to start the quiz…',
    playPlayersInRoom: '{n} players in the room',
    playAnswerLocked: 'Answer locked — waiting for others…',
    statusTapToSubmit: 'Tap to submit',
    statusLocked: 'Answer locked in',
    statusSubtext: 'Your answer is sealed when the timer ends',
    statusLive: 'Live',
    playCorrect: 'Correct! 🎉',
    playIncorrect: 'Not correct',
    playPointsEarned: '+{n} points',
    playNoPoints: 'No points this round',
    playTotalScore: 'Total: {n}',
    playNoAnswerRecorded: 'No answer was recorded this round.',
    playCorrectAnswerInline: 'Correct answer:',
    playWaitingGuruNext: 'Waiting for the Guru to move on…',
    playFinalResults: '🏆 Final results',
    playFinishedRank: 'You finished #{rank} with {score} points',

    timerSeconds: '{n}s',
    timerCaption: 'seconds left',

    langToggleLabel: 'हिं',
  },
};

// Server responses (REST error bodies, Socket.IO acks) are written in Hindi at the
// source — see CLAUDE.md. Rather than plumb error codes through the whole
// REST/Socket boundary, we translate the known, finite set of server strings here.
// Anything not in this map is passed through unchanged (better an occasional Hindi
// sentence in English mode than a blank error).
const SERVER_ERROR_MAP = {
  'रूम नहीं मिला।': 'Room not found.',
  'अमान्य होस्ट पासकोड।': 'Invalid host passcode.',
  'रूम नहीं मिला। पिन जांचें।': 'Room not found. Check the PIN.',
  'यह क्विज़ पहले ही शुरू हो चुका है।': 'This quiz has already started.',
  'रूम भर गया है।': 'The room is full.',
  'कृपया अपना नाम दर्ज करें।': 'Please enter your name.',
  'अनुमति नहीं है।': 'Not allowed.',
  'क्विज़ पहले ही शुरू हो चुका है।': 'The quiz has already started.',
  'क्विज़ में कोई प्रश्न नहीं है।': 'The quiz has no questions.',
  'कोई सक्रिय प्रश्न नहीं है।': 'There is no active question.',
  'आप शामिल नहीं हुए हैं।': 'You have not joined.',
  'पहले ही उत्तर दे दिया गया है।': 'An answer has already been submitted.',
  'अमान्य विकल्प।': 'Invalid option.',
  'नहीं मिला।': 'Not found.',
  'क्विज़ नहीं मिला।': 'Quiz not found.',
};

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem(LANG_KEY) || 'hi');

  useEffect(() => {
    localStorage.setItem(LANG_KEY, lang);
    document.documentElement.lang = lang;
    document.title = STRINGS[lang].appTitle;
  }, [lang]);

  const value = useMemo(() => {
    function t(key, vars) {
      let str = STRINGS[lang][key] ?? STRINGS.hi[key] ?? key;
      if (vars) {
        for (const [k, v] of Object.entries(vars)) str = str.replaceAll(`{${k}}`, v);
      }
      return str;
    }

    function tServer(message) {
      if (!message || lang === 'hi') return message;
      if (SERVER_ERROR_MAP[message]) return SERVER_ERROR_MAP[message];
      const failed = message.match(/^अनुरोध विफल \((\d+)\)$/);
      if (failed) return `Request failed (${failed[1]})`;
      return message;
    }

    return { lang, setLang, toggle: () => setLang((l) => (l === 'hi' ? 'en' : 'hi')), t, tServer };
  }, [lang]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within a LanguageProvider');
  return ctx;
}
