import { useEffect, useState } from "react";
import Aurora from "./components/Aurora";
import DotField from "./components/DotField";
import LangSwitch from "./components/LangSwitch";
import PromptComposer from "./components/PromptComposer";
import type { Lang } from "./i18n";
import { dict } from "./i18n";

export default function App() {
  const [lang, setLang] = useState<Lang>("ru");
  const t = dict[lang];

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  return (
    <div className="stage">
      <DotField />
      <Aurora />
      <LangSwitch lang={lang} onChange={setLang} />

      <main className="hero">
        <div className="hero-stack">
          <header className="hero-copy">
            <h1 className="headline">Zero ID</h1>
            <p className="subhead">{t.subhead}</p>
          </header>
          <PromptComposer t={t} />
        </div>
      </main>
    </div>
  );
}
