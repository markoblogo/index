import type {
  MediaHubManualMaterialKind,
  MediaHubManualMaterialTenant,
} from "@/lib/media-hub-manual-materials";

export type MediaHubMaterialBotCommand =
  | "help"
  | "materials"
  | "start"
  | "status"
  | "tags";

export function parseMediaHubMaterialBotCommand(text?: string | null) {
  const command = text?.trim().split(/\s+/)[0]?.toLowerCase().split("@")[0];

  if (
    command === "/help" ||
    command === "/materials" ||
    command === "/start" ||
    command === "/status" ||
    command === "/tags"
  ) {
    return command.slice(1) as MediaHubMaterialBotCommand;
  }

  return null;
}

export function buildMediaHubMaterialHelpText() {
  return [
    "Вітаємо. Це бот для надсилання матеріалів у Media Hub SSI та 1D3X.",
    "",
    "Надсилайте сюди посилання або файли, які треба врахувати в наступному weekly або monthly report.",
    "",
    "Обов’язково додайте тег проєкту:",
    "#ssi - для Spike Spot Index, український ринок зернових та олійних",
    "#1d3x - для 1D3X, глобальний ринок зернових та олійних",
    "",
    "Додатково можна вказати тип звіту:",
    "#weekly - для наступного тижневого звіту",
    "#monthly - для наступного місячного звіту",
    "#daily - для денного звіту, якщо потрібно",
    "",
    "Якщо вказати тільки #ssi або #1d3x, матеріал піде у #weekly за замовчуванням.",
    "",
    "Приклади:",
    "#ssi #weekly https://example.com/report.pdf",
    "#1d3x #weekly https://example.com/grain-market-update",
    "#ssi #monthly логістика, файл у вкладенні",
    "#ssi #1d3x #weekly https://example.com/global-wheat-report",
    "",
    "Файли:",
    "PDF, XLSX, CSV, DOCX, TXT/HTML/MD приймаються для автоматичного аналізу.",
    "Скріншоти краще не надсилати: OCR не увімкнено. Надсилайте PDF або таблицю.",
    "",
    "Після відправки бот відповість: прийнято, оброблено, дублікат, або формат не підтримується.",
  ].join("\n");
}

export function buildMediaHubMaterialsText(adminMaterialsUrl = "/admin/media-hub/materials") {
  return [
    "Як надіслати матеріал для звіту:",
    "",
    "1. Виберіть проєкт:",
    "#ssi - Spike Spot Index",
    "#1d3x - 1D3X",
    "",
    "2. Виберіть тип звіту:",
    "#weekly - наступний тижневий звіт",
    "#monthly - наступний місячний звіт",
    "#daily - денний звіт, якщо використовується",
    "",
    "3. Надішліть посилання або файл.",
    "",
    "Приклади:",
    "#ssi #weekly <посилання>",
    "#1d3x #weekly <посилання>",
    "#ssi #monthly <файл PDF або XLSX>",
    "#ssi #1d3x #weekly <посилання, корисне для обох проєктів>",
    "",
    "Якщо тег звіту не вказаний, система використовує #weekly.",
    "",
    "Альтернативний спосіб:",
    "матеріали можна додати вручну через адмінку:",
    adminMaterialsUrl,
    "",
    "У адмінці можна вибрати проєкт, тип звіту, вставити посилання або завантажити файл.",
  ].join("\n");
}

export function buildMediaHubTagsText() {
  return [
    "Доступні теги:",
    "",
    "Проєкти:",
    "#ssi - матеріал для Spike Spot Index",
    "#1d3x - матеріал для 1D3X",
    "",
    "Типи звітів:",
    "#weekly - тижневий звіт",
    "#monthly - місячний звіт",
    "#daily - денний звіт, якщо використовується",
    "",
    "Правила:",
    "- тег проєкту обов’язковий",
    "- тег типу звіту необов’язковий",
    "- без #weekly/#monthly/#daily матеріал піде у #weekly",
    "- можна вказати #ssi і #1d3x разом, якщо матеріал корисний для обох проєктів",
  ].join("\n");
}

export function buildMissingProjectTagText() {
  return [
    "Не бачу тегу проєкту. Додайте #ssi або #1d3x до повідомлення, посилання або caption файлу.",
    "",
    "Приклад:",
    "#ssi #weekly https://example.com/report.pdf",
  ].join("\n");
}

export function getMediaHubProjectName(tenantId: MediaHubManualMaterialTenant) {
  return tenantId === "1d3x" ? "1D3X" : "SSI";
}

export function getMediaHubReportKindLabel(kind: MediaHubManualMaterialKind) {
  if (kind === "daily_material") return "daily";
  if (kind === "monthly_material") return "monthly";
  if (kind === "source_candidate") return "source candidate";
  return "weekly";
}

export function buildMediaHubSubmissionReply({
  kind,
  label,
  mimeType,
  sourceType,
  status,
  tenantId,
}: {
  kind: MediaHubManualMaterialKind;
  label: string;
  mimeType?: string;
  sourceType: "file" | "link";
  status: string;
  tenantId: MediaHubManualMaterialTenant;
}) {
  const projectName = getMediaHubProjectName(tenantId);
  const reportKind = getMediaHubReportKindLabel(kind);

  if (status === "duplicate") {
    return `Цей матеріал уже є в системі для ${projectName} за цей період. Дублікат не додано.`;
  }
  if (status === "unsupported" || status === "unsupported_image_ocr") {
    return "Формат не підтримується для автоматичного аналізу. Надішліть PDF, XLSX, CSV або посилання.";
  }
  if (status === "failed") {
    return "Матеріал отримано, але автоматичне читання не вдалося. Він збережений як metadata-only і не буде використаний у звіті без повторної обробки.";
  }

  if (sourceType === "file") {
    return `Файл прийнято для ${projectName}: ${reportKind}. Тип: ${mimeType ?? "file"}. Статус: обробка.\nМатеріал оброблено для ${projectName}: ${reportKind}. Буде враховано у звіті за ${reportKind}.`;
  }

  return `Матеріал прийнято для ${projectName}: ${reportKind}. Тип: link. Статус: обробка.\nМатеріал оброблено для ${projectName}: ${reportKind}. Буде враховано у звіті за ${reportKind}.\nДжерело: ${label}`;
}

