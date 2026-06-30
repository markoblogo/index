import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = `${url.protocol}//${url.host}`;
  const script = `
(function() {
  var nodes = document.querySelectorAll('[data-1d3x-basket]');
  nodes.forEach(function(node) {
    var view = node.getAttribute('data-view') || 'chart';
    var market = node.getAttribute('data-market') || 'GLOBAL';
    var src = ${JSON.stringify(origin)} + '/embed/basket/' + encodeURIComponent(view) + '?market=' + encodeURIComponent(market);
    var iframe = document.createElement('iframe');
    iframe.src = src;
    iframe.title = '1D3X Basket';
    iframe.loading = 'lazy';
    iframe.style.width = '100%';
    iframe.style.height = node.getAttribute('data-height') || (view === 'site' ? '900px' : '520px');
    iframe.style.border = '0';
    iframe.style.borderRadius = node.getAttribute('data-radius') || '8px';
    iframe.allowFullscreen = true;
    node.replaceChildren(iframe);
  });
})();`;

  return new NextResponse(script, {
    headers: {
      "Cache-Control": "public, s-maxage=600, stale-while-revalidate=3600",
      "Content-Type": "application/javascript; charset=utf-8",
    },
  });
}
