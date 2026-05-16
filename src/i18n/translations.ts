export type Lang = 'en' | 'ru';

// ─────────────────────────────────────────────────────────────────────────────
// All UI strings for Veil.
// Rules:
//  - Keys match English text structure
//  - Emotion names are translated (shown on wheel + cards)
//  - Breathing phase names are translated
//  - Tab labels are translated
// ─────────────────────────────────────────────────────────────────────────────
const en = {
  // ── Emotion names (Plutchik wheel) ──
  emotions: {
    joy:          'joy',
    trust:        'trust',
    fear:         'fear',
    surprise:     'surprise',
    sadness:      'sadness',
    disgust:      'disgust',
    anger:        'anger',
    anticipation: 'anticipation',
  },

  // ── Trigger names ──
  triggers: {
    work:          'work',
    relationships: 'relationships',
    sleep:         'sleep',
    health:        'health',
    exercise:      'exercise',
    money:         'money',
    loneliness:    'loneliness',
    success:       'success',
    'voice journal': 'voice journal',
  },

  // ── Tab labels ──
  tabs: {
    checkin:  'check-in',
    journal:  'journal',
    patterns: 'patterns',
    voice:    'voice',
    breathe:  'breathe',
    settings: 'settings',
  },

  // ── Check-in screen ──
  checkin: {
    title:            'how are you feeling?',
    intensity:        'intensity',
    whatTriggered:    'what triggered this?',
    note:             'note',
    notePlaceholder:  "what's happening inside...",
    otherChip:        'other +',
    otherPlaceholder: 'describe your trigger...',
    next:             'next  →',
    liftTheVeil:      'lift the veil',
    saved:            '✓  saved',
    chooseEmotion:    'Choose an emotion',
    chooseTip:        'Tap a segment on the wheel first.',
    weekLabel:        'this week',
    greatWeek:        'great week ✨',
    solidWeek:        'solid week',
    toughWeek:        'tough week',
    avg:              'avg',
    felt:             'felt',
  },

  // ── Journal screen ──
  journal: {
    title:       'journal',
    emptyIcon:   '◎',
    emptyTitle:  'no entries yet',
    emptySub:    'do your first check-in',
  },

  // ── Insights / Patterns screen ──
  insights: {
    title:        'patterns',
    subtitle:     'last 10 weeks',
    moodCalendar: 'mood calendar',
    less:         'less',
    more:         'more',
    veilNotices:  'veil notices',
    yourPatterns: 'your patterns',
    mlPatterns:   'ml patterns',
    noPatterns:   'Add check-ins or confirmed voice entries to see your personal patterns here',
    overview:     'overview',
    totalEntries: 'total entries',
    dayStreak:    'day streak',
    avgIntensity: 'avg intensity',
    topEmotion:   'top emotion',
    onDevice:     'on-device',
  },

  // ── Voice screen ──
  voice: {
    title:       'voice journal',
    subtitle:    'tell me about your day',
    tapToStart:  'tap to start recording',
    analyzing:   'running local neural model...',
    veilHears:   'veil hears',
    modelHeard:  (emo: string) => `model heard ${emo}`,
    confidence:  'confidence',
    energy:      'energy',
    stability:   'stability',
    privacy:     (ver: string) => `${ver} · on-device · 0 bytes to cloud`,
    saveEmotion: 'save emotion',
    saving:      'saving...',
    recent:      'recent',
    corrected:   'corrected',
    permTitle:   'Permission required',
    permMsg:     'Please allow microphone access in Settings.',
    errorMsg:    'Could not start recording',
    cycle:       (n: number, total: number) => `cycle ${n} / ${total}`,
  },

  // ── Breathe screen ──
  breathe: {
    title:        'breathe',
    subtitle:     '4-7-8 technique',
    tapToBegin:   'tap to\nbegin',
    done:         'done',
    inhale:       'inhale',
    hold:         'hold',
    exhale:       'exhale',
    pause:        'pause',
    cycle:        (n: number, total: number) => `cycle ${n} / ${total}`,
    infoText:     'Activates the parasympathetic nervous system · reduces anxiety in 2–3 cycles',
    otherPractices: 'other practices',
    practices: [
      { name: '5-4-3-2-1 grounding',    desc: '5 things you can see...' },
      { name: 'progressive relaxation', desc: 'tension and release of muscle groups' },
      { name: 'body scan meditation',   desc: 'scan sensations from head to toe' },
    ],
  },

  // ── Settings screen ──
  settings: {
    title:            'settings',
    appearance:       'appearance',
    dark:             'dark',
    light:            'light',
    language:         'language',
    personalisation:  'personalisation',
    notPersonalised:  'not yet personalised',
    personalised:     (pct: number) => `${pct}% personalised`,
    personalSub0:     'save voice entries to adapt the model to your voice',
    personalSubN:     (n: number) => `${n} voice ${n === 1 ? 'confirmation' : 'confirmations'} · model adapts on-device`,
    resetPersonal:    'reset personalisation',
    resetPersonalTitle: 'Reset personalisation?',
    resetPersonalMsg:   'The model will return to its default state. Your voice entries stay. Cannot be undone.',
    data:             'data',
    clearCheckins:    'clear check-ins',
    clearVoice:       'clear voice entries',
    clearAll:         'clear all data',
    clearAllSub:      'check-ins + voice entries',
    cancel:           'Cancel',
    delete:           'Delete',
    reset:            'Reset',
    clearCheckinsTitle:  'Clear check-ins?',
    clearCheckinsMsg:    'This will delete all check-in history. Cannot be undone.',
    clearVoiceTitle:     'Clear voice entries?',
    clearVoiceMsg:       'This will delete all voice journal recordings. Cannot be undone.',
    clearAllTitle:       'Clear everything?',
    clearAllMsg:         'This will permanently delete all your data. Cannot be undone.',
    about:            'about',
    version:          'version',
    mlAudio:          'ml audio',
    mlPatterns:       'ml patterns',
    storage:          'storage',
    storageVal:       'on-device only',
    network:          'network',
    networkVal:       'zero requests',
    privacy:          'Veil never sends data anywhere. Everything stays on your device. Zero bytes to the cloud.',
    entries:          (n: number) => `${n} entries`,
  },
} as const;

const ru = {
  emotions: {
    joy:          'радость',
    trust:        'доверие',
    fear:         'страх',
    surprise:     'удивление',
    sadness:      'грусть',
    disgust:      'отвращение',
    anger:        'злость',
    anticipation: 'ожидание',
  },

  triggers: {
    work:          'работа',
    relationships: 'отношения',
    sleep:         'сон',
    health:        'здоровье',
    exercise:      'спорт',
    money:         'деньги',
    loneliness:    'одиночество',
    success:       'успех',
    'voice journal': 'голосовой журнал',
  },

  tabs: {
    checkin:  'чекин',
    journal:  'журнал',
    patterns: 'паттерны',
    voice:    'голос',
    breathe:  'дыхание',
    settings: 'настройки',
  },

  checkin: {
    title:            'как ты себя чувствуешь?',
    intensity:        'интенсивность',
    whatTriggered:    'что вызвало это состояние?',
    note:             'заметка',
    notePlaceholder:  'что происходит внутри...',
    otherChip:        'другое +',
    otherPlaceholder: 'опиши свой триггер...',
    next:             'далее  →',
    liftTheVeil:      'поднять завесу',
    saved:            '✓  сохранено',
    chooseEmotion:    'Выбери эмоцию',
    chooseTip:        'Нажми на сектор колеса.',
    weekLabel:        'эта неделя',
    greatWeek:        'отличная неделя ✨',
    solidWeek:        'нормальная неделя',
    toughWeek:        'тяжёлая неделя',
    avg:              'сред.',
    felt:             'чувствовал',
  },

  journal: {
    title:       'журнал',
    emptyIcon:   '◎',
    emptyTitle:  'пока нет записей',
    emptySub:    'сделай первый чекин',
  },

  insights: {
    title:        'паттерны',
    subtitle:     'последние 10 недель',
    moodCalendar: 'календарь настроения',
    less:         'меньше',
    more:         'больше',
    veilNotices:  'veil замечает',
    yourPatterns: 'твои паттерны',
    mlPatterns:   'ml паттерны',
    noPatterns:   'Добавляй чекины и голосовые записи, чтобы увидеть свои паттерны',
    overview:     'обзор',
    totalEntries: 'всего записей',
    dayStreak:    'серия дней',
    avgIntensity: 'средн. интенсивность',
    topEmotion:   'частая эмоция',
    onDevice:     'на устройстве',
  },

  voice: {
    title:       'голосовой журнал',
    subtitle:    'расскажи мне о своём дне',
    tapToStart:  'нажми, чтобы начать запись',
    analyzing:   'запускаю локальную нейросеть...',
    veilHears:   'veil слышит',
    modelHeard:  (emo: string) => `модель услышала ${emo}`,
    confidence:  'уверенность',
    energy:      'энергия',
    stability:   'стабильность',
    privacy:     (ver: string) => `${ver} · на устройстве · 0 байт в облако`,
    saveEmotion: 'сохранить эмоцию',
    saving:      'сохраняю...',
    recent:      'недавние',
    corrected:   'исправлено',
    permTitle:   'Нет разрешения',
    permMsg:     'Разреши доступ к микрофону в Настройках.',
    errorMsg:    'Не удалось начать запись',
    cycle:       (n: number, total: number) => `цикл ${n} / ${total}`,
  },

  breathe: {
    title:        'дыхание',
    subtitle:     'техника 4-7-8',
    tapToBegin:   'нажми,\nчтобы начать',
    done:         'готово',
    inhale:       'вдох',
    hold:         'задержка',
    exhale:       'выдох',
    pause:        'пауза',
    cycle:        (n: number, total: number) => `цикл ${n} / ${total}`,
    infoText:     'Активирует парасимпатическую нервную систему · снижает тревогу за 2–3 цикла',
    otherPractices: 'другие практики',
    practices: [
      { name: 'заземление 5-4-3-2-1',    desc: '5 вещей, которые ты видишь...' },
      { name: 'прогрессивная релаксация', desc: 'напряжение и расслабление групп мышц' },
      { name: 'медитация-сканирование',   desc: 'сканируй ощущения от головы до ног' },
    ],
  },

  settings: {
    title:            'настройки',
    appearance:       'внешний вид',
    dark:             'тёмная',
    light:            'светлая',
    language:         'язык',
    personalisation:  'персонализация',
    notPersonalised:  'ещё не персонализировано',
    personalised:     (pct: number) => `персонализировано на ${pct}%`,
    personalSub0:     'сохраняй голосовые записи, чтобы адаптировать модель к твоему голосу',
    personalSubN:     (n: number) => `${n} ${pluralRu(n, 'подтверждение', 'подтверждения', 'подтверждений')} · модель адаптируется на устройстве`,
    resetPersonal:    'сбросить персонализацию',
    resetPersonalTitle: 'Сбросить персонализацию?',
    resetPersonalMsg:   'Модель вернётся к начальному состоянию. Голосовые записи сохранятся. Отменить нельзя.',
    data:             'данные',
    clearCheckins:    'удалить чекины',
    clearVoice:       'удалить голосовые записи',
    clearAll:         'удалить все данные',
    clearAllSub:      'чекины + голосовые записи',
    cancel:           'Отмена',
    delete:           'Удалить',
    reset:            'Сбросить',
    clearCheckinsTitle:  'Удалить чекины?',
    clearCheckinsMsg:    'Вся история чекинов будет удалена. Отменить нельзя.',
    clearVoiceTitle:     'Удалить голосовые записи?',
    clearVoiceMsg:       'Все голосовые записи будут удалены. Отменить нельзя.',
    clearAllTitle:       'Удалить всё?',
    clearAllMsg:         'Все твои данные будут удалены навсегда. Отменить нельзя.',
    about:            'о приложении',
    version:          'версия',
    mlAudio:          'ml аудио',
    mlPatterns:       'ml паттерны',
    storage:          'хранение',
    storageVal:       'только на устройстве',
    network:          'сеть',
    networkVal:       'ноль запросов',
    privacy:          'Veil никогда не отправляет данные. Всё хранится на твоём устройстве. Ноль байт в облако.',
    entries:          (n: number) => `${n} ${pluralRu(n, 'запись', 'записи', 'записей')}`,
  },
} as const;

// Russian plural helper
function pluralRu(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10, mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 14) return many;
  if (mod10 === 1) return one;
  if (mod10 >= 2 && mod10 <= 4) return few;
  return many;
}

export const TRANSLATIONS: Record<Lang, typeof en> = { en, ru };

export function t(lang: Lang) {
  return TRANSLATIONS[lang];
}
