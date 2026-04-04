import logging
from urllib.parse import urlparse, urljoin, quote
from uuid import UUID

import httpx
from bs4 import BeautifulSoup
from fastapi import APIRouter, Depends, Header, HTTPException, Query
from fastapi.responses import Response, StreamingResponse
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.models import Paper
from app.services.arxiv import bulk_upsert_papers, fetch_papers

router = APIRouter(prefix="/papers", tags=["papers"])
logger = logging.getLogger(__name__)

_ARXIV_HTML = "https://arxiv.org/html/{arxiv_id}"
_AR5IV_HTML = "https://ar5iv.org/html/{arxiv_id}"

_ARXIV_IMAGE_BASE = "https://arxiv.org/html/{arxiv_id}/"
_AR5IV_IMAGE_BASE = "https://ar5iv.org/html/{arxiv_id}/"


_ALLOWED_IMAGE_HOSTS = {"arxiv.org", "ar5iv.org"}


@router.get("/proxy-image")
async def proxy_image(url: str = Query(...)):
    """
    Proxy an image from arxiv.org/ar5iv.org.

    ArXiv requires a matching Referer header for inline HTML images — fetching
    them directly from the browser fails. This endpoint fetches the image
    server-side and streams it back, so the browser never touches arxiv.org directly.
    """
    parsed = urlparse(url)
    if parsed.netloc not in _ALLOWED_IMAGE_HOSTS:
        raise HTTPException(status_code=400, detail="URL host not allowed")

    referer = f"{parsed.scheme}://{parsed.netloc}/"
    headers = {
        "User-Agent": "Spine/0.1 (research feed; contact via github)",
        "Referer":    referer,
    }
    try:
        async with httpx.AsyncClient(timeout=20, follow_redirects=True) as client:
            resp = await client.get(url, headers=headers)
            if resp.status_code != 200:
                raise HTTPException(status_code=404, detail="Image not found")
            content_type = resp.headers.get("content-type", "image/png")
            return Response(content=resp.content, media_type=content_type)
    except httpx.RequestError as exc:
        logger.warning("Image proxy error for %s: %s", url, exc)
        raise HTTPException(status_code=502, detail="Could not fetch image")


@router.get("/{paper_id}/pdf")
async def get_paper_pdf(paper_id: UUID, db: AsyncSession = Depends(get_db)):
    """
    Stream the arXiv PDF through the backend.

    Serving it from our origin avoids X-Frame-Options / CORS issues that
    prevent arxiv.org PDFs from loading inside an <iframe> on a different host.
    The browser's built-in PDF viewer handles rendering natively — no LaTeX
    parsing, no image proxying, no CSS injection.
    """
    result = await db.execute(select(Paper).where(Paper.id == paper_id))
    paper  = result.scalar_one_or_none()
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")

    pdf_url = f"https://arxiv.org/pdf/{paper.arxiv_id}"
    headers = {"User-Agent": "Spine/0.1 (research feed; contact via github)"}

    client = httpx.AsyncClient(timeout=60, follow_redirects=True)
    try:
        req  = client.build_request("GET", pdf_url, headers=headers)
        resp = await client.send(req, stream=True)
    except httpx.RequestError as exc:
        await client.aclose()
        logger.warning("PDF proxy error for %s: %s", paper.arxiv_id, exc)
        raise HTTPException(status_code=502, detail="Could not reach arXiv")

    if resp.status_code != 200:
        await resp.aclose()
        await client.aclose()
        raise HTTPException(status_code=404, detail="PDF not available on arXiv")

    async def stream():
        try:
            async for chunk in resp.aiter_bytes(chunk_size=64 * 1024):
                yield chunk
        finally:
            await resp.aclose()
            await client.aclose()

    return StreamingResponse(
        stream(),
        media_type="application/pdf",
        headers={"Content-Disposition": f"inline; filename={paper.arxiv_id}.pdf"},
    )


@router.get("/{paper_id}")
async def get_paper(paper_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Paper).where(Paper.id == paper_id))
    paper  = result.scalar_one_or_none()
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")
    return {
        "id":           paper.id,
        "arxiv_id":     paper.arxiv_id,
        "title":        paper.title,
        "abstract":     paper.abstract,
        "authors":      paper.authors,
        "categories":   paper.categories,
        "published_at": paper.published_at,
        "page_count":   paper.page_count,
    }


@router.get("/{paper_id}/html")
async def get_paper_html(paper_id: UUID, db: AsyncSession = Depends(get_db)):
    """
    Proxy the ArXiv HTML version so the frontend can render it in-app.

    Returns:
      html         — cleaned article body HTML with absolute image URLs
      stylesheets  — CSS URLs extracted from the arXiv page head (needed for
                     math/latexml rendering; safe to load cross-origin)
      arxiv_id     — for constructing external links
    """
    result = await db.execute(select(Paper).where(Paper.id == paper_id))
    paper  = result.scalar_one_or_none()
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")

    data = await _fetch_arxiv_html(paper.arxiv_id)
    if data is None:
        raise HTTPException(
            status_code=404,
            detail="No HTML version available for this paper."
        )

    return {"html": data["html"], "stylesheets": data["stylesheets"], "arxiv_id": paper.arxiv_id}


async def _fetch_arxiv_html(arxiv_id: str) -> dict | None:
    headers = {"User-Agent": "Spine/0.1 (research feed; contact via github)"}

    sources = [
        (_ARXIV_HTML.format(arxiv_id=arxiv_id), _ARXIV_IMAGE_BASE.format(arxiv_id=arxiv_id)),
        (_AR5IV_HTML.format(arxiv_id=arxiv_id), _AR5IV_IMAGE_BASE.format(arxiv_id=arxiv_id)),
    ]

    for url, _ in sources:
        try:
            async with httpx.AsyncClient(timeout=30, follow_redirects=True) as client:
                resp = await client.get(url, headers=headers)
                if resp.status_code == 200:
                    # Use the final URL after redirects — arXiv redirects the bare ID
                    # (e.g. 2401.12345) to the versioned URL (2401.12345v2).
                    # Image src paths are relative to that versioned path, so img_base
                    # must match or images will 404.
                    img_base = str(resp.url).rstrip("/") + "/"
                    html, stylesheets = _extract_article(resp.text, img_base)
                    if html:
                        return {"html": html, "stylesheets": stylesheets}
                logger.debug("HTML not found at %s (status %d)", url, resp.status_code)
        except httpx.RequestError as exc:
            logger.warning("HTML proxy error for %s: %s", arxiv_id, exc)

    return None


def _extract_article(full_html: str, img_base: str) -> tuple[str, list[str]]:
    """
    Parse arXiv/ar5iv HTML:
    - Extract stylesheet URLs (needed for math/latexml CSS classes).
    - Rewrite relative image src → absolute so images load in the browser.
    - Strip navigation chrome, scripts, and ads.
    - Leave MathML, figure, table, and section elements intact.
    """
    soup = BeautifulSoup(full_html, "html.parser")

    # ── Collect stylesheet URLs from <head> ───────────────────────────────────
    # These are needed for latexml math class rendering (ltx_Math, ltx_equation, …).
    # CSS loads cross-origin without CORS restrictions — safe to reference directly.
    origin = _origin_from_base(img_base)
    stylesheets: list[str] = []
    for link in soup.find_all("link", rel="stylesheet"):
        href = link.get("href", "").strip()
        if not href:
            continue
        if href.startswith("http"):
            stylesheets.append(href)
        elif href.startswith("/"):
            stylesheets.append(origin + href)
        # relative paths (uncommon in <head>) — skip

    # ── Strip noise ───────────────────────────────────────────────────────────
    for tag in soup(["script", "nav", "footer", "header", "aside", "style"]):
        tag.decompose()
    for cls in ["ltx_page_navbar", "ltx_page_footer", "ar5iv-footer",
                "ltx_header", "ar5iv-ads"]:
        for tag in soup.find_all(class_=cls):
            tag.decompose()

    # ── Find article body ─────────────────────────────────────────────────────
    article = (
        soup.find("article")
        or soup.find("div", class_="ltx_page_content")
        or soup.find("div", id="content")
        or soup.body
    )
    if article is None:
        return "", stylesheets

    # ── Rewrite image src → backend proxy ────────────────────────────────────
    # ArXiv serves inline HTML images with Referer checks; direct browser requests
    # fail. Route all images through /api/papers/proxy-image so the backend
    # fetches them server-side with the correct Referer header.
    # urljoin handles absolute paths (/html/...), relative paths (./fig.png),
    # and parent-directory paths (../fig.png) correctly.
    for tag in article.find_all(["img", "source"]):
        src = tag.get("src", "").strip()
        if not src or src.startswith("data:"):
            continue
        abs_src = src if src.startswith("http") else urljoin(img_base, src)
        tag["src"] = f"/api/papers/proxy-image?url={quote(abs_src, safe='')}"
        if tag.has_attr("srcset"):
            del tag["srcset"]

    # ── Open external links in new tab ────────────────────────────────────────
    for tag in article.find_all("a", href=True):
        if tag["href"].startswith("http"):
            tag["target"] = "_blank"
            tag["rel"]    = "noopener noreferrer"

    return str(article), stylesheets


def _origin_from_base(img_base: str) -> str:
    parsed = urlparse(img_base)
    return f"{parsed.scheme}://{parsed.netloc}"


class FetchRequest(BaseModel):
    topic: str
    max_results: int = 25


@router.post("/fetch")
async def fetch_and_store(
    body: FetchRequest,
    db: AsyncSession = Depends(get_db),
    x_api_key: str | None = Header(default=None),
):
    if settings.fetch_api_key and x_api_key != settings.fetch_api_key:
        raise HTTPException(status_code=401, detail="Invalid or missing API key")

    papers = await fetch_papers(body.topic, body.max_results)
    if not papers:
        return {"inserted": 0, "message": "No papers returned from ArXiv"}

    inserted = await bulk_upsert_papers(db, papers)
    return {"inserted": inserted, "total_fetched": len(papers)}
