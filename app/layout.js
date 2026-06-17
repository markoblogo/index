export const metadata = {
  title: "Asset CDN",
  description: "Static asset branch for heavy public binaries.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
