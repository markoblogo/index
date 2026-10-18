import type { Metadata } from "next";
import Link from "next/link";
import type { Locale } from "@/lib/i18n";

export const metadata: Metadata = { title: "SSI Context Drive Sync" };

export default async function DriveSyncPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  return <>
    <p className="text-xs font-bold uppercase tracking-widest text-uga-green">SPIKE SPOT INDEX</p>
    <h1 className="mt-4 text-3xl font-black">SSI Context Drive Sync</h1>
    <div className="mt-8 space-y-5 text-base leading-7">
      <p>SSI Context Drive Sync is an internal tool for importing reference materials from the configured Google Drive folder into SSI MediaHub for weekly and monthly market reports.</p>
      <p>An authorized SSI administrator connects their Google account. Synchronization reads recent files and stores originals, extracted text, tables and source metadata in the SSI application. It does not edit or delete the original Drive files. Connecting Drive does not itself publish or send a report.</p>
      <p>Google Drive access is read-only. The permission covers files accessible to the connected account; the synchronization implementation limits collection to the configured materials folder.</p>
      <p><Link className="font-bold underline underline-offset-4" href={`/${locale}/drive-sync/privacy`}>Privacy notice and Google user data handling</Link></p>
      <p>Operator contact: <a className="underline" href="mailto:a.biletskiy@gmail.com">a.biletskiy@gmail.com</a></p>
    </div>
  </>;
}
