"""Public install page for sideloading the APK.

`/install` is a friendly landing page (with a QR) you can text to someone.
`/download` 302-redirects to the always-latest APK (Config.APK_DOWNLOAD_URL).

The redirect *target* is a constant (e.g. the GitHub Release `latest` permalink),
while the asset behind it is replaced on every build — so the shared link is never
stale. These routes are intentionally public (a phone browser can't send a bearer
token); they expose only the public APK, not the data API.
"""

from __future__ import annotations

import io

from flask import Blueprint, Response, redirect, request

from .config import Config

pages = Blueprint("pages", __name__)


@pages.get("/")
def root():
    return redirect("/install", code=302)


@pages.get("/download")
def download():
    if not Config.APK_DOWNLOAD_URL:
        return Response("APK_DOWNLOAD_URL is not configured yet.", status=503)
    return redirect(Config.APK_DOWNLOAD_URL, code=302)


@pages.get("/install")
def install():
    configured = bool(Config.APK_DOWNLOAD_URL)
    qr = _qr_svg(request.url_root.rstrip("/") + "/download") if configured else ""
    body = _PAGE.format(
        button=(
            '<a class="btn" href="/download">⬇ Install Bromog</a>'
            if configured
            else '<p class="muted">No APK published yet. Set <code>APK_DOWNLOAD_URL</code> '
            "and run the Android build.</p>"
        ),
        qr=f'<div class="qr">{qr}<p class="muted">Scan on your phone</p></div>' if qr else "",
    )
    return Response(body, mimetype="text/html")


def _qr_svg(data: str) -> str:
    """Inline SVG QR code. Returns "" if the qrcode lib isn't available."""
    try:
        import qrcode
        import qrcode.image.svg

        img = qrcode.make(data, image_factory=qrcode.image.svg.SvgPathImage, box_size=10, border=2)
        buf = io.BytesIO()
        img.save(buf)
        return buf.getvalue().decode("utf-8")
    except Exception:
        return ""


_PAGE = """<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Install Bromog</title>
<style>
  body {{ margin:0; min-height:100vh; display:flex; align-items:center; justify-content:center;
    background:#0f1115; color:#eef1f6; font-family:-apple-system,Segoe UI,Roboto,system-ui,sans-serif; }}
  .card {{ background:#181b22; border:1px solid #2b303b; border-radius:16px; padding:32px 28px;
    max-width:360px; width:90%; text-align:center; }}
  h1 {{ margin:0 0 4px; font-size:28px; }}
  .muted {{ color:#9aa3b2; font-size:14px; }}
  .btn {{ display:block; margin:22px 0 8px; padding:16px; background:#4f8cff; color:#fff;
    text-decoration:none; font-weight:700; border-radius:12px; font-size:17px; }}
  .qr {{ margin-top:22px; }}
  .qr svg {{ width:180px; height:180px; background:#fff; padding:8px; border-radius:12px; }}
  code {{ background:#21252e; padding:2px 6px; border-radius:6px; font-size:13px; }}
  ol {{ text-align:left; color:#9aa3b2; font-size:13px; line-height:1.6; padding-left:18px; }}
</style></head>
<body>
  <div class="card">
    <h1>Bromog</h1>
    <p class="muted">Gym tracker · sideload install</p>
    {button}
    {qr}
    <ol>
      <li>Tap install; allow "install from this source" if asked.</li>
      <li>Open Bromog, switch to your name at the top.</li>
      <li>Updating later? Just reinstall from this link — your data is kept.</li>
    </ol>
  </div>
</body></html>"""
