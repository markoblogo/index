const links = [
  "/files/spike-spot-index-respondents-presentation.pdf",
  "/files/spike-spot-index-global-partner-deck-2026.pdf",
  "/files/spot-market-handbook-ua.pdf",
  "/files/spot-market-handbook-en.pdf",
  "/files/spot-market-handbook-ua.epub",
  "/files/spot-market-handbook-en.epub",
  "/files/uga-index-market-intelligence.pdf",
  "/files/1D3X_Local_Commodity_Index_Partner_Program.pdf",
];

export default function Page() {
  return (
    <main
      style={{
        background: "#0a0a0a",
        color: "#f5f5f5",
        fontFamily: "system-ui, sans-serif",
        minHeight: "100vh",
        padding: "40px",
      }}
    >
      <h1 style={{ fontSize: "32px", marginBottom: "16px" }}>Asset CDN</h1>
      <p style={{ color: "rgba(245,245,245,0.72)", maxWidth: "720px" }}>
        This branch exists only to keep heavy public files outside the main
        application deploy payload.
      </p>
      <ul style={{ marginTop: "24px", lineHeight: 1.8 }}>
        {links.map((href) => (
          <li key={href}>
            <a href={href} style={{ color: "#9eff67" }}>
              {href}
            </a>
          </li>
        ))}
      </ul>
    </main>
  );
}
