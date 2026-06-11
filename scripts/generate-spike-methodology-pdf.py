from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "public" / "files"
FONT_DIR = Path("/System/Library/Fonts/Supplemental")
FONT_REGULAR = FONT_DIR / "Arial Unicode.ttf"
FONT_BOLD = FONT_DIR / "Arial Bold.ttf"


def register_fonts():
    pdfmetrics.registerFont(TTFont("SpikeRegular", str(FONT_REGULAR)))
    pdfmetrics.registerFont(TTFont("SpikeBold", str(FONT_BOLD)))


def styles():
    base = getSampleStyleSheet()
    base.add(
        ParagraphStyle(
            name="DocTitle",
            fontName="SpikeBold",
            fontSize=24,
            leading=28,
            textColor=colors.HexColor("#111111"),
            spaceAfter=8,
        )
    )
    base.add(
        ParagraphStyle(
            name="DocSubtitle",
            fontName="SpikeRegular",
            fontSize=10.5,
            leading=15,
            textColor=colors.HexColor("#4f4f4f"),
            spaceAfter=16,
        )
    )
    base.add(
        ParagraphStyle(
            name="Section",
            fontName="SpikeBold",
            fontSize=14,
            leading=18,
            textColor=colors.HexColor("#111111"),
            spaceBefore=9,
            spaceAfter=5,
        )
    )
    base.add(
        ParagraphStyle(
            name="Body",
            fontName="SpikeRegular",
            fontSize=9.5,
            leading=13.2,
            textColor=colors.HexColor("#333333"),
            alignment=TA_LEFT,
            spaceAfter=5,
        )
    )
    base.add(
        ParagraphStyle(
            name="Small",
            fontName="SpikeRegular",
            fontSize=8,
            leading=11,
            textColor=colors.HexColor("#555555"),
            spaceAfter=4,
        )
    )
    base.add(
        ParagraphStyle(
            name="Kicker",
            fontName="SpikeBold",
            fontSize=7.8,
            leading=10,
            textColor=colors.HexColor("#39ff14"),
            spaceAfter=8,
        )
    )
    return base


def paragraph(text, style):
    return Paragraph(text.replace("\n", "<br/>"), style)


def bullet_list(items, style):
    rows = []
    for item in items:
        rows.append(
            [
                Paragraph("•", style),
                Paragraph(item, style),
            ]
        )
    table = Table(rows, colWidths=[5 * mm, 151 * mm], hAlign="LEFT")
    table.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 2),
                ("TOPPADDING", (0, 0), (-1, -1), 1),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 1),
            ]
        )
    )
    return table


def metadata_table(rows, style):
    data = [[Paragraph(left, style), Paragraph(right, style)] for left, right in rows]
    table = Table(data, colWidths=[45 * mm, 111 * mm], hAlign="LEFT")
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f4f4f0")),
                ("BOX", (0, 0), (-1, -1), 0.6, colors.HexColor("#dddddd")),
                ("INNERGRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#dddddd")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    return table


def header_footer(canvas, doc, language):
    canvas.saveState()
    canvas.setFillColor(colors.HexColor("#07070b"))
    canvas.rect(0, A4[1] - 16 * mm, A4[0], 16 * mm, fill=True, stroke=False)
    canvas.setFillColor(colors.HexColor("#ffffff"))
    canvas.setFont("SpikeBold", 9)
    canvas.drawString(18 * mm, A4[1] - 10 * mm, "SPIKE SPOT INDEX")
    canvas.setFillColor(colors.HexColor("#39ff14"))
    canvas.setFont("SpikeBold", 7)
    canvas.drawRightString(A4[0] - 18 * mm, A4[1] - 10 * mm, language)
    canvas.setStrokeColor(colors.HexColor("#e6e6e6"))
    canvas.line(18 * mm, 15 * mm, A4[0] - 18 * mm, 15 * mm)
    canvas.setFillColor(colors.HexColor("#777777"))
    canvas.setFont("SpikeRegular", 7)
    canvas.drawString(18 * mm, 10 * mm, "Methodology document. Informational benchmark publication framework.")
    canvas.drawRightString(A4[0] - 18 * mm, 10 * mm, f"Page {doc.page}")
    canvas.restoreState()


UK_SECTIONS = [
    (
        "1. Загальний підхід",
        [
            "SPIKE SPOT INDEX - це щоденний спотовий бенчмарк цін для українського аграрного ринку, що публікується Spike Brokers для визначених товарів, базисів і дат розрахунку.",
            "Індекс формується на основі збору, нормалізації та агрегування цінових оцінок від партнерів-респондентів, а також автоматизованих джерел даних, підключених як окремі респонденти.",
        ],
    ),
    (
        "2. Джерела даних і Monitor",
        [
            "До складу респондентів SPIKE Spot Commodity Index Ukraine входять партнерські брокерські, торгові, експортні та переробні компанії, а також платформа Monitor як окреме автоматизоване джерело ринкових даних.",
            "Щоденно о 17:00 за Києвом система автоматично імпортує актуальні цінові індикатори з Monitor. Матчинг виконується за товаром, базисом поставки та перетином періоду поставки не менше ніж на 10 днів у межах поточного 30-денного вікна.",
            "Якщо для однієї позиції SPIKE знайдено кілька відповідних індикаторів Monitor, система розраховує їх середнє арифметичне і використовує його як цінову відповідь респондента Monitor.",
        ],
    ),
    (
        "3. Категорії індексів і базиси",
        [
            "All Seasons є базовою категорією, що показується користувачу за замовчуванням. До неї входять: кукурудза CPT Port, кукурудза FCA Чоп, пшениця 11,5% CPT Port та пшениця фуражна CPT Port. Ці індекси розраховуються і публікуються протягом усього року.",
            "Processors охоплює внутрішній ринок переробки. До категорії входять соняшник, соя ГМО та ріпак не ГМО. Ці значення публікуються у USD/т з урахуванням ПДВ.",
            "Seasonal Export охоплює сезонні експортні позиції: соя ГМО CPT Port / FCA Чоп, соя не ГМО CPT Port / FCA Чоп, ріпак не ГМО CPT Port / FCA Чоп. Ці індекси відображають експортний ринок відповідних культур і можуть розраховуватися лише в періоди активної торгівлі.",
        ],
    ),
    (
        "4. Нормалізація та валідація",
        [
            "Усі вхідні значення приводяться до USD/т. Якщо джерело передає UAH або EUR, система перераховує значення в USD за офіційним курсом НБУ на дату розрахунку.",
            "Для кожної позиції система групує значення за датою, товаром, базисом і респондентом. Якщо для одного респондента є декілька значень, використовується актуальніше або перевірене адміністратором значення.",
            "Базове центральне значення визначається як медіана. Для повної вибірки застосовується фільтр викидів: значення, що відхиляються від медіани більш ніж на +/-2%, виключаються з розрахунку.",
        ],
    ),
    (
        "5. Розрахунок індексу",
        [
            "Після очищення вибірки індекс розраховується як середнє арифметичне валідних значень. Результат округлюється до одного десяткового знака для внутрішнього зберігання та може відображатися без десяткової частини на публічній картці.",
            "Цільова умова офіційної публікації - не менше 5 валідних значень респондентів після фільтрації. У перехідному операційному режимі платформа може показувати доступні значення з обмеженим покриттям, доки кошик респондентів масштабується.",
        ],
    ),
    (
        "6. Публікація та контроль",
        [
            "До публікації значення можуть перевірятися, уточнюватися та перераховуватися. Після публікації фінальне значення фіксується для історії.",
            "Система зберігає журнал аудиту: хто створив або змінив значення, коли це відбулося, які дані були до та після зміни.",
            "У публічній частині методології розкриваються лише типи респондентів: брокери, трейдери, експортери та переробники. Назви конкретних компаній не публікуються.",
        ],
    ),
]

EN_SECTIONS = [
    (
        "1. General approach",
        [
            "SPIKE SPOT INDEX is a daily spot price benchmark for the Ukrainian agricultural market, published by Spike Brokers for defined commodities, bases and calculation dates.",
            "The index is produced by collecting, normalizing and aggregating price assessments from respondent partners and automated data sources connected as separate respondents.",
        ],
    ),
    (
        "2. Data sources and Monitor",
        [
            "The respondent base includes Spike Brokers partner companies and Monitor as a separate automated market-data source.",
            "Every weekday at 17:00 Kyiv, the platform imports current Monitor price indicators. Matching is based on commodity, delivery basis and delivery-period overlap of at least 10 days inside the active 30-day window.",
            "If more than one Monitor indicator matches a single SPIKE position, the platform calculates their arithmetic average and stores it as the Monitor respondent value.",
        ],
    ),
    (
        "3. Index categories and bases",
        [
            "All Seasons is the default public category. It includes corn CPT Port, corn FCA Chop, wheat 11.5% CPT Port and feed wheat CPT Port. These indices are calculated and published throughout the year.",
            "Processors covers the domestic processing market. It includes sunflower seed, GMO soybean and non-GMO rapeseed. These values are published in USD/t VAT-included.",
            "Seasonal Export covers seasonal export positions: GMO soybean CPT Port / FCA Chop, non-GMO soybean CPT Port / FCA Chop and non-GMO rapeseed CPT Port / FCA Chop. These indices are calculated only when the respective export market is actively traded.",
        ],
    ),
    (
        "4. Normalization and validation",
        [
            "All input values are normalized to USD/t. If a source provides UAH or EUR, the system converts the value to USD using the official NBU exchange rate for the calculation date.",
            "For each position, the system groups values by date, commodity, basis and respondent. If several values exist for one respondent, the latest or administrator-verified value is used.",
            "The central reference value is the median. For a full sample, the outlier filter excludes values deviating from the median by more than +/-2%.",
        ],
    ),
    (
        "5. Index calculation",
        [
            "After cleaning the sample, the index is calculated as the arithmetic average of valid values. The result is rounded to one decimal place for internal storage and may be displayed without decimals on public cards.",
            "The target condition for official publication is at least 5 valid respondent values after filtering. During the transitional operating mode, the platform may show available limited-coverage values while the respondent basket is being scaled.",
        ],
    ),
    (
        "6. Publication and control",
        [
            "Before publication, values may be reviewed, corrected and recalculated. After publication, the final value is locked for historical reference.",
            "The system keeps an audit log: who created or changed a value, when it happened, and what data existed before and after the change.",
            "The public methodology discloses respondent types only - brokers, traders, exporters and processors - without publishing individual company names.",
        ],
    ),
]


UK_META = [
    ("Видавець", "Spike Brokers"),
    ("Назва індексу", "SPIKE SPOT INDEX"),
    ("Базиси", "CPT Port - базові і сезонні експортні позиції; FCA Чоп - прикордонні позиції; CPT parity Одеса - переробка"),
    ("Офіційна одиниця", "USD/т"),
    ("Версія", "v1.1, червень 2026"),
]

EN_META = [
    ("Publisher", "Spike Brokers"),
    ("Index name", "SPIKE SPOT INDEX"),
    ("Bases", "CPT Port - core and seasonal export; FCA Chop - border positions; CPT parity Odesa - processing"),
    ("Official unit", "USD/t"),
    ("Version", "v1.1, June 2026"),
]


def build_pdf(path, language, title, subtitle, metadata, sections):
    doc = SimpleDocTemplate(
        str(path),
        pagesize=A4,
        leftMargin=18 * mm,
        rightMargin=18 * mm,
        topMargin=26 * mm,
        bottomMargin=22 * mm,
        title=title,
        author="Spike Brokers",
        subject="SPIKE SPOT INDEX methodology",
    )
    s = styles()
    story = [
        paragraph("METHODOLOGY", s["Kicker"]),
        paragraph(title, s["DocTitle"]),
        paragraph(subtitle, s["DocSubtitle"]),
        metadata_table(metadata, s["Small"]),
        Spacer(1, 6 * mm),
    ]

    for index, (heading, paragraphs) in enumerate(sections):
        if index == 3:
            story.append(PageBreak())
        story.append(paragraph(heading, s["Section"]))
        for body in paragraphs[:-1]:
            story.append(paragraph(body, s["Body"]))
        story.append(bullet_list([paragraphs[-1]], s["Body"]))

    doc.build(story, onFirstPage=lambda canvas, doc: header_footer(canvas, doc, language), onLaterPages=lambda canvas, doc: header_footer(canvas, doc, language))


def main():
    register_fonts()
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    build_pdf(
        OUT_DIR / "spike-index-methodology-uk.pdf",
        "UK",
        "Методологія розрахунку SPIKE SPOT INDEX",
        "Скорочена операційна методологія щоденного спотового бенчмарку цін для українського аграрного ринку.",
        UK_META,
        UK_SECTIONS,
    )
    build_pdf(
        OUT_DIR / "spike-index-methodology-en.pdf",
        "EN",
        "SPIKE SPOT INDEX calculation methodology",
        "Condensed operating methodology for the daily spot price benchmark for the Ukrainian agricultural market.",
        EN_META,
        EN_SECTIONS,
    )
    # Keep the legacy URL valid and point it to the Ukrainian production document.
    (OUT_DIR / "spike-index-methodology.pdf").write_bytes(
        (OUT_DIR / "spike-index-methodology-uk.pdf").read_bytes()
    )


if __name__ == "__main__":
    main()
