import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy notice | SSI Context Drive Sync" };

const sections = [
  {
    "title": "Purpose",
    "paragraphs": [
      "SSI Context Drive Sync imports reference materials into the internal MediaHub workspace for weekly and monthly SSI market reports. It is operated with the SSI administrator's connected Google account."
    ]
  },
  {
    "title": "Google Drive access",
    "paragraphs": [
      "The application requests Google's drive.readonly permission. This permission allows reading files accessible to the connected account; it is broader than a single folder. The application's current synchronization code restricts collection to direct file entries in the configured SSI materials folder: https://drive.google.com/drive/folders/1cHuO86kaqND34vLTFo3Ly_OoBSNV3rgC",
      "Regular synchronization processes files modified within the last 62 days. It does not edit or delete the original Drive files. The application reads file names, identifiers, links, modification times, MIME types, sizes and file contents. Folder authorization is not permission to redistribute third-party documents or their protected content."
    ]
  },
  {
    "title": "Processing, storage and report use",
    "paragraphs": [
      "Imported original files, extraction results, previews, tables and provenance metadata are stored in the SSI application database. Some file formats may produce only metadata or incomplete extraction and require operator review. Drive modification time is not proof of the observation date of facts inside a file.",
      "SSI uses Vercel for application execution and Supabase/PostgreSQL for storage. When the corresponding features are enabled, material extracts or visual assets may also be processed by the application's configured AI provider, including OpenAI, for extraction and report generation. Material-derived content may appear in SSI reports on the website or configured messaging channels according to the application's separate reporting/publication settings. Connecting Drive does not itself send a report.",
      "The offline OAuth refresh token is encrypted using AES-256-GCM and stored in the database's private schema. Token values are not displayed by the admin connection-status interface. Imported materials are accessible through the authorized internal application workflows."
    ]
  },
  {
    "title": "Revocation and retention",
    "paragraphs": [
      "The account holder can revoke the application's access in their Google Account's third-party connections settings. Revocation prevents future Drive access but does not automatically remove previously imported records or published reports. Imported materials are retained until removed by the operator under the application's retention practices.",
      "Contact the SSI application operator at a.biletskiy@gmail.com to request disconnection, information about stored materials, or removal of imported data. No fixed deletion deadline is promised."
    ]
  }
];

export default function DriveSyncPrivacyPage() {
  return <article>
    <p className="text-xs font-bold uppercase tracking-widest text-uga-green">SSI Context Drive Sync</p>
    <h1 className="mt-4 text-3xl font-black">Privacy notice</h1>
    <p className="mt-3 text-sm">Published 18 October 2026</p>
    <div className="mt-10 space-y-9">
      {sections.map(section => <section key={section.title}>
        <h2 className="text-xl font-bold">{section.title}</h2>
        <div className="mt-4 space-y-4 text-base leading-7 break-words">
          {section.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
        </div>
      </section>)}
    </div>
  </article>;
}
