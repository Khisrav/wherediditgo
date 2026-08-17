const WDG_STRINGS = {
  en: {
    skip: 'Skip to content',
    'nav.page': 'Page',
    'nav.features': 'Features',
    'nav.privacy': 'Privacy',
    'nav.source': 'Source',
    'theme.toggle': 'Toggle dark theme',
    'lang.label': 'Language',
    'meta.title': 'WhereDidItGo — local-first money tracker',
    'meta.description':
      'Know where every dollar went. A local-first personal finance app for Android: quick logging, budgets, savings goals, and insights — stored only on your device.',
    'hero.eyebrow': 'Android · local-first',
    'hero.title': 'Know where every dollar went.',
    'hero.lede':
      'Log spending in a few taps, keep simple monthly budgets, and watch savings goals fill up. Nothing is uploaded. Backup is a JSON file you own.',
    'hero.viewSource': 'View source',
    'hero.build': 'Build it yourself',
    'hero.perk1': 'English, Русский, Тоҷикӣ',
    'hero.perk2': 'Light, dark, or system theme',
    'hero.perk3': 'Blur the balance, or hold to hide every amount',
    'privacy.title': 'Your money never leaves this phone.',
    'privacy.body':
      'Transactions live in a local database on the device. There is no account to create, no cloud sync, and no analytics. Switch phones with a full JSON backup — or export transactions as CSV.',
    'features.eyebrow': 'What it does',
    'features.title': 'Built for the way you actually spend.',
    'keypad.title': 'Amount-first keypad',
    'keypad.body':
      'Open +, type the amount, optionally add <code>13+24+50</code> on the keypad, then pick category and account. Fast enough for the checkout line.',
    'budgets.title': 'Budgets that stay monthly',
    'budgets.body':
      'Cap groceries, bills, or transport. See what’s left this month — not a lifetime envelope mixed in with savings.',
    'goals.title': 'Savings goals',
    'goals.body':
      'A trip, a gadget, an emergency fund. Move money from an account into a goal. It is not logged as a spend, and you pick any icon you like.',
    'insights.title': 'Insights that aren’t a chart dump',
    'insights.body':
      'Pace vs the calendar, vs last month, biggest expense, weekdays vs weekends, budget health, and per-account in/out — plus category, daily, and six-month charts.',
    'activity.title': 'Activity you can trust',
    'activity.body':
      'Search notes and categories, filter by month and type, swipe left to delete. Same compact rows as Home.',
    'hide.title': 'Share the screen, not the numbers',
    'hide.body':
      'Tap the eye to blur the balance. Hold it to hide every amount — it stays that way after you leave the app.',
    'stack.eyebrow': 'Stack',
    'stack.title': 'Vue on the phone, SQLite-free on purpose.',
    'stack.lede':
      'Vue 3, Pinia, Dexie (IndexedDB), vue-i18n, and Capacitor for Android. Light enough to reason about, offline by default.',
    'source.eyebrow': 'Open source',
    'source.title': 'Clone it, run it, ship it to your phone.',
    'source.body':
      'Open the <code>android/</code> folder in Android Studio to install on a device. ISC licensed.',
    'footer.tagline': 'Local-first personal finance',
    'footer.source': 'Source',
  },
  ru: {
    skip: 'К содержимому',
    'nav.page': 'Страница',
    'nav.features': 'Возможности',
    'nav.privacy': 'Приватность',
    'nav.source': 'Исходный код',
    'theme.toggle': 'Переключить тёмную тему',
    'lang.label': 'Язык',
    'meta.title': 'WhereDidItGo — учёт денег без облака',
    'meta.description':
      'Знайте, куда ушёл каждый рубль. Локальное приложение для Android: быстрые записи, бюджеты, цели и аналитика — только на вашем устройстве.',
    'hero.eyebrow': 'Android · всё на устройстве',
    'hero.title': 'Знайте, куда ушёл каждый рубль.',
    'hero.lede':
      'Записывайте траты за пару касаний, ведите месячные бюджеты и копите на цели. Ничего не загружается. Резервная копия — JSON-файл, который принадлежит вам.',
    'hero.viewSource': 'Исходный код',
    'hero.build': 'Собрать самостоятельно',
    'hero.perk1': 'English, Русский, Тоҷикӣ',
    'hero.perk2': 'Светлая, тёмная или системная тема',
    'hero.perk3': 'Размойте баланс или удерживайте, чтобы скрыть все суммы',
    'privacy.title': 'Ваши деньги не покидают этот телефон.',
    'privacy.body':
      'Операции хранятся в локальной базе на устройстве. Нет аккаунта, облачной синхронизации и аналитики. Меняете телефон — экспортируете полный JSON или CSV с операциями.',
    'features.eyebrow': 'Что умеет',
    'features.title': 'Сделано под то, как вы реально тратите.',
    'keypad.title': 'Сначала сумма',
    'keypad.body':
      'Откройте +, введите сумму, при желании сложите <code>13+24+50</code> на клавиатуре, затем выберите категорию и счёт. Хватает на кассе.',
    'budgets.title': 'Бюджеты на месяц',
    'budgets.body':
      'Лимит на продукты, счета или транспорт. Видно, сколько осталось в этом месяце — не копилка на всю жизнь, смешанная с накоплениями.',
    'goals.title': 'Цели накоплений',
    'goals.body':
      'Поездка, гаджет, подушка безопасности. Переводите деньги со счёта в цель. Это не расход, и иконку можно выбрать любую.',
    'insights.title': 'Аналитика, а не свалка графиков',
    'insights.body':
      'Темп относительно календаря и прошлого месяца, самый крупный расход, будни и выходные, бюджеты и приход/расход по счетам — плюс категории, дни и полгода.',
    'activity.title': 'История, которой можно доверять',
    'activity.body':
      'Поиск по заметкам и категориям, фильтры по месяцу и типу, свайп влево — удалить. Те же компактные строки, что на главной.',
    'hide.title': 'Покажите экран, не суммы',
    'hide.body':
      'Нажмите на глаз, чтобы размыть баланс. Удерживайте, чтобы скрыть все суммы — так и останется после выхода из приложения.',
    'stack.eyebrow': 'Стек',
    'stack.title': 'Vue на телефоне, без SQLite — нарочно.',
    'stack.lede':
      'Vue 3, Pinia, Dexie (IndexedDB), vue-i18n и Capacitor для Android. Достаточно простое, чтобы понимать, и сразу офлайн.',
    'source.eyebrow': 'Открытый код',
    'source.title': 'Склонируйте, запустите, поставьте на телефон.',
    'source.body':
      'Откройте папку <code>android/</code> в Android Studio, чтобы установить на устройство. Лицензия ISC.',
    'footer.tagline': 'Личные финансы на устройстве',
    'footer.source': 'Исходный код',
  },
  tj: {
    skip: 'Ба мундариҷа',
    'nav.page': 'Саҳифа',
    'nav.features': 'Имкониятҳо',
    'nav.privacy': 'Махфият',
    'nav.source': 'Рамз',
    'theme.toggle': 'Мавзӯи торикро иваз кунед',
    'lang.label': 'Забон',
    'meta.title': 'WhereDidItGo — ҳисоби пул бе абр',
    'meta.description':
      'Донед, ки ҳар сомонӣ куҷо рафт. Барномаи маҳаллии молия барои Android: сабти зуд, буҷаҳо, ҳадафҳо ва таҳлил — танҳо дар дастгоҳи шумо.',
    'hero.eyebrow': 'Android · танҳо дар дастгоҳ',
    'hero.title': 'Донед, ки ҳар сомонӣ куҷо рафт.',
    'hero.lede':
      'Хароҷотро бо чанд зарба сабт кунед, буҷаҳои моҳона гузоред ва ҳадафҳои пасандозро пур кунед. Ҳеҷ чиз бор карда намешавад. Нусхаи эҳтиётӣ файли JSON-и худи шумост.',
    'hero.viewSource': 'Рамзро бинед',
    'hero.build': 'Худатон ҷамъ кунед',
    'hero.perk1': 'English, Русский, Тоҷикӣ',
    'hero.perk2': 'Мавзӯи равшан, торик ё система',
    'hero.perk3': 'Тавозунро хира кунед ё нигоҳ доред, то ҳамаи рақамҳо пинҳон шаванд',
    'privacy.title': 'Пули шумо аз ин телефон берун намешавад.',
    'privacy.body':
      'Амалиётҳо дар пойгоҳи маҳаллии дастгоҳ нигоҳ дошта мешаванд. Ҳисоб нест, ҳамоҳангсозии абр нест, таҳлили беруна нест. Телефонро иваз мекунед — нусхаи пурраи JSON ё CSV-и амалиётҳоро содир кунед.',
    'features.eyebrow': 'Чӣ мекунад',
    'features.title': 'Барои он ки шумо чӣ гуна харҷ мекунед.',
    'keypad.title': 'Аввал маблағ',
    'keypad.body':
      'Тугмаи +-ро кушоед, маблағро нависед, хоҳед <code>13+24+50</code>-ро дар клавиатура ҷамъ кунед, баъд категория ва ҳисобро интихоб кунед. Барои навбати хазина кифоя аст.',
    'budgets.title': 'Буҷаҳои моҳона',
    'budgets.body':
      'Барои хӯрокворӣ, ҳисобҳо ё нақлиёт ҳад гузоред. Бинед, ки дар ин моҳ чӣ боқӣ монд — на ҷилди умрбод, ки бо пасандоз омехта шудааст.',
    'goals.title': 'Ҳадафҳои пасандоз',
    'goals.body':
      'Сафар, дастгоҳ, фонди эҳтиётӣ. Пулро аз ҳисоб ба ҳадаф гузаронед. Ин хароҷот нест ва ҳар нишонаеро, ки хоҳед, интихоб мекунед.',
    'insights.title': 'Таҳлил, на тӯдаи графикҳо',
    'insights.body':
      'Суръат нисбат ба тақвим ва моҳи гузашта, калонтарин хароҷот, рӯзҳои корӣ ва истироҳат, буҷаҳо ва воридот/хуруҷи ҳисобҳо — ғайр аз категорияҳо, рӯзҳо ва шаш моҳ.',
    'activity.title': 'Таърихе, ки бовар кардан мумкин аст',
    'activity.body':
      'Ҷустуҷӯи ёддоштҳо ва категорияҳо, филтр аз рӯи моҳ ва навъ, ба чап кашидан — нест кардан. Ҳамон сатрҳои зичи саҳифаи асосӣ.',
    'hide.title': 'Экранро нишон диҳед, на рақамҳоро',
    'hide.body':
      'Ба чашм зарба занед, то тавозун хира шавад. Нигоҳ доред, то ҳамаи маблағҳо пинҳон шаванд — пас аз баромадан ҳам ҳамин тавр мемонад.',
    'stack.eyebrow': 'Стек',
    'stack.title': 'Vue дар телефон, бе SQLite — қасдан.',
    'stack.lede':
      'Vue 3, Pinia, Dexie (IndexedDB), vue-i18n ва Capacitor барои Android. Ба қадри кофӣ содда ва аз аввал офлайн.',
    'source.eyebrow': 'Рамзи кушода',
    'source.title': 'Клон кунед, иҷро кунед, ба телефон гузоред.',
    'source.body':
      'Ҷузвдони <code>android/</code>-ро дар Android Studio кушоед, то ба дастгоҳ насб кунед. Иҷозатнома ISC.',
    'footer.tagline': 'Молияи шахсӣ дар дастгоҳ',
    'footer.source': 'Рамз',
  },
}

const WDG_INTL = { en: 'en', ru: 'ru', tj: 'tg' }
const WDG_LOCALES = ['en', 'ru', 'tj']

function wdgT(locale, key) {
  const table = WDG_STRINGS[locale] || WDG_STRINGS.en
  return table[key] ?? WDG_STRINGS.en[key] ?? key
}

function wdgDetectLocale() {
  try {
    const query = new URLSearchParams(window.location.search).get('lang')
    if (query && WDG_STRINGS[query]) return query
  } catch (e) {}
  try {
    const saved = localStorage.getItem('wdg-locale')
    if (saved && WDG_STRINGS[saved]) return saved
  } catch (e) {}
  const nav = String(navigator.language || navigator.userLanguage || 'en').toLowerCase()
  if (nav.startsWith('ru')) return 'ru'
  if (nav.startsWith('tg') || nav.startsWith('tj')) return 'tj'
  return 'en'
}

let wdgLocale = 'en'

function wdgApplyLocale(locale, persistUrl) {
  if (!WDG_STRINGS[locale]) locale = 'en'
  wdgLocale = locale
  document.documentElement.lang = WDG_INTL[locale]
  document.documentElement.dataset.locale = locale
  document.title = wdgT(locale, 'meta.title')

  const desc = document.querySelector('meta[name="description"]')
  if (desc) desc.setAttribute('content', wdgT(locale, 'meta.description'))
  const ogTitle = document.querySelector('meta[property="og:title"]')
  if (ogTitle) ogTitle.setAttribute('content', wdgT(locale, 'meta.title'))
  const ogDesc = document.querySelector('meta[property="og:description"]')
  if (ogDesc) ogDesc.setAttribute('content', wdgT(locale, 'meta.description'))

  document.querySelectorAll('[data-i18n]').forEach(function (el) {
    const value = wdgT(locale, el.getAttribute('data-i18n'))
    if (el.hasAttribute('data-i18n-html')) el.innerHTML = value
    else el.textContent = value
  })
  document.querySelectorAll('[data-i18n-aria]').forEach(function (el) {
    el.setAttribute('aria-label', wdgT(locale, el.getAttribute('data-i18n-aria')))
  })
  document.querySelectorAll('[data-lang]').forEach(function (btn) {
    btn.setAttribute('aria-pressed', btn.getAttribute('data-lang') === locale ? 'true' : 'false')
  })

  try {
    localStorage.setItem('wdg-locale', locale)
  } catch (e) {}

  if (persistUrl) {
    try {
      const url = new URL(window.location.href)
      url.searchParams.set('lang', locale)
      history.replaceState(null, '', url)
    } catch (e) {}
  }

  document.dispatchEvent(new CustomEvent('wdg-locale', { detail: locale }))
}

window.WDG_I18N = {
  locales: WDG_LOCALES,
  t: function (key) {
    return wdgT(wdgLocale, key)
  },
  getLocale: function () {
    return wdgLocale
  },
  apply: wdgApplyLocale,
  detect: wdgDetectLocale,
}
