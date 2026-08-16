import type { Lang } from "../i18n";
import { LANGS, dict } from "../i18n";

const CODES: Record<Lang, string> = {
  ru: "RUS",
  kk: "KAZ",
  en: "ENG",
};

type Props = {
  lang: Lang;
  onChange: (next: Lang) => void;
};

export default function LangSwitch({ lang, onChange }: Props) {
  return (
    <div className="lang-bar">
      <nav className="lang-switch" aria-label={dict[lang].langLabel}>
        {LANGS.map((id) => (
          <button
            key={id}
            className={`lang-btn${id === lang ? " is-active" : ""}`}
            type="button"
            title={dict[id].langName}
            aria-pressed={id === lang}
            onClick={() => onChange(id)}
          >
            {CODES[id]}
          </button>
        ))}
      </nav>
    </div>
  );
}
