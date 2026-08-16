export type Lang = "ru" | "kk" | "en";

export type Dict = {
  subhead: string;
  hint: string;
  hideData: string;
  copy: string;
  copied: string;
  clear: string;
  upload: string;
  fileNote: string;
  sizeError: string;
  hideInFile: string;
  download: string;
  fileError: string;
  removeFile: string;
  langLabel: string;
  langName: string;
};

export const LANGS: Lang[] = ["ru", "kk", "en"];

export const dict: Record<Lang, Dict> = {
  ru: {
    subhead:
      "Вставьте текст или загрузите документ, чтобы автоматически скрыть персональные и\u00a0конфиденциальные данные. Ваши данные никуда не отправляются и\u00a0нигде не хранятся: всё\u00a0обрабатывается локально в\u00a0браузере и\u00a0удаляется после закрытия страницы.",
    hint: "Вставьте ваш текст сюда",
    hideData: "Скрыть данные",
    copy: "Скопировать",
    copied: "Скопировано",
    clear: "Очистить текст",
    upload: "Загрузить файл",
    fileNote: "только .docx, 10 MB макс.",
    sizeError: "Размер файла не более 10 MB",
    hideInFile: "Скрыть данные в файле",
    download: "Скачать документ",
    fileError: "Не удалось обработать файл",
    removeFile: "Убрать файл",
    langLabel: "Язык",
    langName: "Русский",
  },
  kk: {
    subhead:
      "Дербес және\u00a0құпия деректерді автоматты түрде жасыру үшін мәтінді қойыңыз немесе құжатты жүктеңіз. Деректеріңіз еш\u00a0жерге жіберілмейді және сақталмайды: барлығы браузерде жергілікті өңделеді және бет жабылған соң жойылады.",
    hint: "Мәтінді осы жерге қойыңыз",
    hideData: "Деректерді жасыру",
    copy: "Көшіру",
    copied: "Көшірілді",
    clear: "Мәтінді тазалау",
    upload: "Файл жүктеу",
    fileNote: "тек .docx, 10 MB дейін",
    sizeError: "Файл өлшемі 10 MB-тан аспауы керек",
    hideInFile: "Файлда деректерді жасыру",
    download: "Құжатты жүктеп алу",
    fileError: "Файлды өңдеу мүмкін болмады",
    removeFile: "Файлды алып тастау",
    langLabel: "Тіл",
    langName: "Қазақша",
  },
  en: {
    subhead:
      "Paste text or upload a document to automatically hide personal and confidential data. Your data is never sent anywhere and never stored: everything is processed locally in your browser and deleted once you close the page.",
    hint: "Paste your text here",
    hideData: "Hide data",
    copy: "Copy",
    copied: "Copied",
    clear: "Clear text",
    upload: "Upload file",
    fileNote: ".docx only, 10 MB max",
    sizeError: "File must be 10 MB or smaller",
    hideInFile: "Hide data in file",
    download: "Download document",
    fileError: "Could not process the file",
    removeFile: "Remove file",
    langLabel: "Language",
    langName: "English",
  },
};
