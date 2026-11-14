"""URL-based job description scraper.

Fetches job posting pages and extracts clean text content for JD analysis.
"""

import re
from typing import Optional
from loguru import logger
import httpx
from bs4 import BeautifulSoup


# Tags that typically don't contain useful job description text
SKIP_TAGS = {"script", "style", "nav", "footer", "header", "aside", "noscript", "svg", "form", "button"}

# Common CSS selectors where job descriptions live
JD_SELECTORS = [
    "[class*='job-description']",
    "[class*='job_description']",
    "[class*='jobDescription']",
    "[class*='description']",
    "[id*='job-description']",
    "[id*='job_description']",
    "[id*='jobDescription']",
    "article",
    "[role='main']",
    "main",
    ".posting-description",
    ".job-details",
    ".content-body",
]


async def scrape_job_url(url: str, timeout: float = 15.0) -> Optional[str]:
    """Fetch a URL and extract clean text content for JD extraction.
    
    Returns the extracted text, or None if fetching/parsing fails.
    """
    if not url or not url.startswith(("http://", "https://")):
        logger.warning("Invalid URL for scraping: {}", url)
        return None

    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5",
        }

        async with httpx.AsyncClient(timeout=timeout, follow_redirects=True) as client:
            response = await client.get(url, headers=headers)
            response.raise_for_status()

        html = response.text
        if not html or len(html) < 100:
            logger.warning("Empty or too small response from URL: {}", url)
            return None

        soup = BeautifulSoup(html, "lxml")

        # Remove non-content tags
        for tag in soup.find_all(SKIP_TAGS):
            tag.decompose()

        # Try specific JD selectors first
        for selector in JD_SELECTORS:
            elements = soup.select(selector)
            if elements:
                combined = "\n\n".join(el.get_text(separator="\n", strip=True) for el in elements)
                cleaned = _clean_text(combined)
                if len(cleaned) >= 100:
                    logger.info("Extracted {} chars from URL using selector '{}': {}", len(cleaned), selector, url)
                    return cleaned[:20000]  # Limit to 20K chars

        # Fallback: extract from body
        body = soup.find("body")
        if body:
            text = body.get_text(separator="\n", strip=True)
            cleaned = _clean_text(text)
            if len(cleaned) >= 100:
                logger.info("Extracted {} chars from body of URL: {}", len(cleaned), url)
                return cleaned[:20000]

        logger.warning("Could not extract meaningful text from URL: {}", url)
        return None

    except httpx.HTTPStatusError as exc:
        logger.warning("HTTP {} error scraping URL {}: {}", exc.response.status_code, url, str(exc))
        return None
    except httpx.TimeoutException:
        logger.warning("Timeout scraping URL: {}", url)
        return None
    except Exception as exc:
        logger.warning("Unexpected error scraping URL {}: {}", url, str(exc))
        return None


def _clean_text(text: str) -> str:
    """Clean extracted text: remove excess whitespace, empty lines, etc."""
    # Replace multiple newlines with double newline
    text = re.sub(r"\n{3,}", "\n\n", text)
    # Replace multiple spaces with single space
    text = re.sub(r"[ \t]{2,}", " ", text)
    # Remove lines that are just whitespace
    lines = [line.strip() for line in text.split("\n") if line.strip()]
    return "\n".join(lines)
