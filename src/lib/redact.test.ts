import { describe, expect, it } from "vitest";
import { isSensitiveLabel, maskSensitive } from "./redact";

describe("контрольные суммы", () => {
  it("скрывает ИИН с верной контрольной цифрой", () => {
    expect(maskSensitive("ИИН 990101300122")).toBe("ИИН ************");
  });

  it("не трогает двенадцать цифр с битой контрольной цифрой", () => {
    expect(maskSensitive("ИИН 990101300123")).toBe("ИИН 990101300123");
  });

  it("скрывает IBAN и карту, но не номер договора", () => {
    expect(maskSensitive("KZ86125KZT5004100100")).toBe("*".repeat(20));
    expect(maskSensitive("4400 4301 2345 6789")).toBe("**** **** **** ****");
    expect(maskSensitive("договор 12345678901234")).toBe("договор 12345678901234");
  });
});

describe("телефоны", () => {
  it("понимает и +7, и восьмёрку, и любые разделители", () => {
    expect(maskSensitive("+7 701 123 45 67")).toBe("** *** *** ** **");
    expect(maskSensitive("8 (727) 333-44-55")).toBe("* ***** *********");
  });

  it("не считает телефоном произвольные одиннадцать цифр", () => {
    expect(maskSensitive("код 89012345678")).toBe("код 89012345678");
  });
});

describe("ФИО", () => {
  it("скрывает фамилию, имя и отчество", () => {
    expect(maskSensitive("Тансикбаев Тимур Карибаевич")).toBe(
      "********** ***** **********",
    );
  });

  it("работает с казахскими окончаниями", () => {
    expect(maskSensitive("Ержан Бекұлы приехал")).toBe("***** ****** приехал");
  });

  it("понимает латиницу", () => {
    expect(maskSensitive("Sadykov Timur Erlanovich")).toBe(
      "******* ***** **********",
    );
  });

  it("скрывает инициалы рядом с фамилией", () => {
    expect(maskSensitive("Тансикбаев Т.К.")).toBe("********** ****");
  });

  it("не принимает за фамилию обычные слова с заглавной", () => {
    expect(maskSensitive("Пунктов пять, Договоров три")).toBe(
      "Пунктов пять, Договоров три",
    );
    expect(maskSensitive("Республика Казахстан, город Алматы")).toBe(
      "Республика Казахстан, город Алматы",
    );
  });
});

describe("поля с метками", () => {
  it("скрывает значение по метке на трёх языках", () => {
    expect(maskSensitive("Адрес: Абая 123, кв. 45")).toBe("Адрес: **** **** *** **");
    expect(maskSensitive("Мекенжайы: Абай көшесі")).toBe("Мекенжайы: **** ******");
    expect(maskSensitive("Blood Type: A(II) Rh+")).toBe("Blood Type: ***** ***");
  });

  it("считает меткой только часть после последней запятой", () => {
    expect(maskSensitive("Пунктов пять, Договоров три, Итого: работа принята")).toBe(
      "Пунктов пять, Договоров три, Итого: работа принята",
    );
  });

  it("обрывает значение там, где начинается следующая метка", () => {
    expect(maskSensitive("Имя на карте: TIMUR SADYKOV Телефон: 8 727 333 44 55")).toBe(
      "Имя на карте: ***** ******* Телефон: * *** *** ** **",
    );
  });

  it("не принимает за метку длинную прозу перед двоеточием", () => {
    const line =
      "Здесь очень длинное вступление, которое никак не является полем анкеты: да";
    expect(maskSensitive(line)).toBe(line);
  });
});

describe("прочие детекторы", () => {
  it("скрывает почту, IP, MAC, ник и координаты", () => {
    expect(maskSensitive("ivan@mail.kz")).toBe("************");
    expect(maskSensitive("192.168.0.1")).toBe("***********");
    expect(maskSensitive("02:00:5E:10:00:01")).toBe("*****************");
    expect(maskSensitive("@timur_test")).toBe("***********");
    expect(maskSensitive("43.238949, 76.889709")).toBe("********** *********");
  });

  it("скрывает даты в разном написании", () => {
    expect(maskSensitive("14.03.1992 и 2026-04-12")).toBe("********** и **********");
  });

  it("сохраняет пробелы и переводы строк", () => {
    expect(maskSensitive("ИИН\n990101300122")).toBe("ИИН\n************");
  });

  it("возвращает исходную строку, когда данных нет", () => {
    const text = "Обычный текст без чувствительных данных.";
    expect(maskSensitive(text)).toBe(text);
  });
});

describe("isSensitiveLabel", () => {
  it("узнаёт метки ячеек без двоеточия", () => {
    expect(isSensitiveLabel("Дата рождения")).toBe(true);
    expect(isSensitiveLabel("Мекенжайы")).toBe(true);
    expect(isSensitiveLabel("Passport Number")).toBe(true);
  });

  it("отсекает обычные заголовки", () => {
    expect(isSensitiveLabel("Примечание")).toBe(false);
    expect(isSensitiveLabel("")).toBe(false);
  });
});
