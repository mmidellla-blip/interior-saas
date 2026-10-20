/**
 * 블로그에 붙이는 스크립트 한 줄:
 * <script src="https://도메인/widget.js" data-company="haneul"></script>
 * 스크립트 자리에 견적 계산기 iframe을 끼워 넣는다.
 */
const SCRIPT = `(function () {
  var s = document.currentScript;
  if (!s) return;
  var slug = s.getAttribute("data-company");
  if (!slug) return;
  var origin = new URL(s.src).origin;
  var f = document.createElement("iframe");
  f.src = origin + "/embed/" + encodeURIComponent(slug);
  f.title = "인테리어 견적 계산기";
  f.loading = "lazy";
  f.style.cssText = "width:100%;max-width:480px;height:" + (s.getAttribute("data-height") || "860") + "px;border:1px solid #e7e2d9;border-radius:16px;background:#faf8f4";
  s.parentNode.insertBefore(f, s.nextSibling);
})();`;

export function GET() {
  return new Response(SCRIPT, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
