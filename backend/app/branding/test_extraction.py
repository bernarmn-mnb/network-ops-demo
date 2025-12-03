"""
Branding Extraction Test Suite

Tests multiple approaches to extracting branding from websites:
1. CSS Variable extraction
2. Computed style sampling  
3. Logo detection heuristics
4. Stylesheet analysis

Run with: python -m app.branding.test_extraction
"""

import asyncio
import json
import re
from collections import Counter
from dataclasses import dataclass, asdict
from typing import Optional
from playwright.async_api import async_playwright, Page


@dataclass
class BrandingResult:
    """Container for extracted branding data"""
    url: str
    method: str
    colors: dict
    fonts: list
    logos: list
    metadata: dict
    confidence: float = 0.0


# ============================================================================
# APPROACH 2A: CSS Variable Extraction
# ============================================================================

async def extract_css_variables(page: Page) -> dict:
    """
    Extract CSS custom properties (variables) from :root and body.
    Works best on modern sites using design systems.
    """
    return await page.evaluate("""
        () => {
            const results = { variables: {}, colorVars: {}, fontVars: {}, spacingVars: {} };
            
            // Get computed styles from :root
            const root = document.documentElement;
            const rootStyles = getComputedStyle(root);
            
            // Also check body
            const bodyStyles = getComputedStyle(document.body);
            
            // Extract all CSS variables
            for (const prop of rootStyles) {
                if (prop.startsWith('--')) {
                    const value = rootStyles.getPropertyValue(prop).trim();
                    results.variables[prop] = value;
                    
                    // Categorize
                    const propLower = prop.toLowerCase();
                    if (propLower.includes('color') || propLower.includes('bg') || 
                        value.startsWith('#') || value.startsWith('rgb')) {
                        results.colorVars[prop] = value;
                    }
                    if (propLower.includes('font') || propLower.includes('family')) {
                        results.fontVars[prop] = value;
                    }
                    if (propLower.includes('space') || propLower.includes('gap') || 
                        propLower.includes('padding') || propLower.includes('margin')) {
                        results.spacingVars[prop] = value;
                    }
                }
            }
            
            return results;
        }
    """)


# ============================================================================
# APPROACH 2B: Computed Style Sampling
# ============================================================================

async def extract_computed_styles(page: Page) -> dict:
    """
    Sample computed styles from key semantic elements.
    Works on most sites regardless of CSS variable usage.
    """
    return await page.evaluate("""
        () => {
            const extractElementStyles = (selector, fallbackSelector = null) => {
                let el = document.querySelector(selector);
                if (!el && fallbackSelector) {
                    el = document.querySelector(fallbackSelector);
                }
                if (!el) return null;
                
                const styles = getComputedStyle(el);
                return {
                    selector: selector,
                    actualElement: el.tagName.toLowerCase() + (el.className ? '.' + el.className.split(' ')[0] : ''),
                    color: styles.color,
                    backgroundColor: styles.backgroundColor,
                    fontFamily: styles.fontFamily,
                    fontSize: styles.fontSize,
                    fontWeight: styles.fontWeight,
                    lineHeight: styles.lineHeight,
                    borderRadius: styles.borderRadius,
                    padding: styles.padding,
                };
            };
            
            return {
                body: extractElementStyles('body'),
                heading1: extractElementStyles('h1', '[class*="heading"], [class*="title"]'),
                heading2: extractElementStyles('h2'),
                paragraph: extractElementStyles('p'),
                link: extractElementStyles('a:not([class*="button"]):not([class*="btn"])'),
                button: extractElementStyles(
                    'button[class*="primary"], .btn-primary, [class*="cta"]',
                    'button, .btn, [class*="button"]'
                ),
                buttonSecondary: extractElementStyles(
                    'button[class*="secondary"], .btn-secondary',
                    'button:not([class*="primary"])'
                ),
                nav: extractElementStyles('nav', 'header'),
                footer: extractElementStyles('footer'),
                input: extractElementStyles('input[type="text"], input[type="email"]', 'input'),
            };
        }
    """)


# ============================================================================
# APPROACH 2C: Logo Detection Heuristics
# ============================================================================

async def detect_logos(page: Page) -> list:
    """
    Find logo images using multiple heuristics:
    - Images with 'logo' in attributes
    - Images in header/nav
    - Images linking to homepage
    - SVG elements in header
    """
    return await page.evaluate("""
        () => {
            const candidates = [];
            const homeUrl = window.location.origin + '/';
            
            // Helper to score a logo candidate
            const scoreCandidate = (element, type) => {
                const candidate = {
                    type: type,
                    score: 0,
                    reasons: [],
                };
                
                if (type === 'img') {
                    const img = element;
                    candidate.src = img.src;
                    candidate.alt = img.alt;
                    candidate.width = img.naturalWidth || img.width;
                    candidate.height = img.naturalHeight || img.height;
                    
                    // Score based on attributes
                    const attrs = (img.src + ' ' + img.alt + ' ' + img.className + ' ' + img.id).toLowerCase();
                    if (attrs.includes('logo')) {
                        candidate.score += 30;
                        candidate.reasons.push('has "logo" in attributes');
                    }
                    if (attrs.includes('brand')) {
                        candidate.score += 20;
                        candidate.reasons.push('has "brand" in attributes');
                    }
                } else if (type === 'svg') {
                    // For SVGs, serialize the element
                    const serializer = new XMLSerializer();
                    candidate.svg = serializer.serializeToString(element);
                    candidate.width = element.getBoundingClientRect().width;
                    candidate.height = element.getBoundingClientRect().height;
                    
                    // Check parent for logo indicators
                    const parentAttrs = (element.className + ' ' + element.id + ' ' + 
                                        (element.parentElement?.className || '')).toLowerCase();
                    if (parentAttrs.includes('logo')) {
                        candidate.score += 30;
                        candidate.reasons.push('SVG with "logo" in parent attributes');
                    }
                }
                
                // Check if in header/nav (high priority location)
                if (element.closest('header, nav, [class*="header"], [class*="nav"]')) {
                    candidate.score += 25;
                    candidate.reasons.push('located in header/nav');
                    candidate.location = 'header';
                }
                
                // Check if links to homepage
                const parentLink = element.closest('a');
                if (parentLink) {
                    const href = parentLink.href;
                    if (href === '/' || href === homeUrl || href === window.location.origin) {
                        candidate.score += 20;
                        candidate.reasons.push('links to homepage');
                    }
                }
                
                // Penalize very small or very large images
                if (candidate.width && candidate.height) {
                    if (candidate.width < 20 || candidate.height < 20) {
                        candidate.score -= 20;
                        candidate.reasons.push('too small');
                    }
                    if (candidate.width > 500) {
                        candidate.score -= 10;
                        candidate.reasons.push('very wide (might be banner)');
                    }
                    // Ideal logo size range
                    if (candidate.width >= 50 && candidate.width <= 300 && 
                        candidate.height >= 20 && candidate.height <= 100) {
                        candidate.score += 10;
                        candidate.reasons.push('ideal size range');
                    }
                }
                
                // Prefer SVG format
                if (type === 'svg' || (candidate.src && candidate.src.includes('.svg'))) {
                    candidate.score += 15;
                    candidate.reasons.push('SVG format (scalable)');
                }
                
                return candidate;
            };
            
            // Find all img elements
            document.querySelectorAll('img').forEach(img => {
                if (img.src && !img.src.includes('data:image/gif')) {  // Skip tracking pixels
                    candidates.push(scoreCandidate(img, 'img'));
                }
            });
            
            // Find SVG elements (often used for logos)
            document.querySelectorAll('svg').forEach(svg => {
                // Only consider SVGs that are reasonably sized
                const rect = svg.getBoundingClientRect();
                if (rect.width > 15 && rect.height > 15) {
                    candidates.push(scoreCandidate(svg, 'svg'));
                }
            });
            
            // Sort by score and return top candidates
            return candidates
                .filter(c => c.score > 0)
                .sort((a, b) => b.score - a.score)
                .slice(0, 5);
        }
    """)


# ============================================================================
# APPROACH 2E: Stylesheet Analysis
# ============================================================================

async def analyze_stylesheets(page: Page) -> dict:
    """
    Capture and analyze loaded stylesheets.
    Extracts color palette and font declarations.
    """
    # Get all stylesheet content via page evaluation
    stylesheet_data = await page.evaluate("""
        () => {
            const results = {
                inlineStyles: [],
                externalUrls: [],
            };
            
            // Get inline styles
            document.querySelectorAll('style').forEach(style => {
                results.inlineStyles.push(style.textContent);
            });
            
            // Get external stylesheet URLs
            document.querySelectorAll('link[rel="stylesheet"]').forEach(link => {
                results.externalUrls.push(link.href);
            });
            
            return results;
        }
    """)
    
    # Combine all CSS content
    all_css = '\n'.join(stylesheet_data['inlineStyles'])
    
    # Extract colors using regex
    color_patterns = [
        r'#[0-9a-fA-F]{6}\b',  # Hex 6-digit
        r'#[0-9a-fA-F]{3}\b',  # Hex 3-digit
        r'rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)',  # rgb()
        r'rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*[\d.]+\s*\)',  # rgba()
    ]
    
    colors = []
    for pattern in color_patterns:
        colors.extend(re.findall(pattern, all_css, re.IGNORECASE))
    
    # Extract font-family declarations
    font_pattern = r'font-family:\s*([^;}{]+)'
    fonts = re.findall(font_pattern, all_css, re.IGNORECASE)
    
    # Count frequency
    color_counts = Counter(colors)
    font_counts = Counter([f.strip().strip('"\'') for f in fonts])
    
    return {
        'external_stylesheets': stylesheet_data['externalUrls'],
        'colors_by_frequency': color_counts.most_common(20),
        'fonts_by_frequency': font_counts.most_common(10),
        'total_colors_found': len(colors),
        'unique_colors': len(set(colors)),
    }


# ============================================================================
# Combined Extraction
# ============================================================================

async def extract_all_branding(url: str) -> dict:
    """
    Run all extraction methods on a URL and combine results.
    """
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        context = await browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        )
        page = await context.new_page()
        
        print(f"\n{'='*60}")
        print(f"Extracting branding from: {url}")
        print('='*60)
        
        try:
            await page.goto(url, wait_until='networkidle', timeout=30000)
        except Exception as e:
            print(f"Warning: Page load issue: {e}")
            # Continue anyway, page might be usable
        
        results = {
            'url': url,
            'methods': {}
        }
        
        # Method 1: CSS Variables
        print("\n[1/4] Extracting CSS Variables...")
        try:
            css_vars = await extract_css_variables(page)
            results['methods']['css_variables'] = css_vars
            print(f"   Found {len(css_vars['variables'])} CSS variables")
            print(f"   Color variables: {len(css_vars['colorVars'])}")
        except Exception as e:
            results['methods']['css_variables'] = {'error': str(e)}
            print(f"   Error: {e}")
        
        # Method 2: Computed Styles
        print("\n[2/4] Sampling Computed Styles...")
        try:
            computed = await extract_computed_styles(page)
            results['methods']['computed_styles'] = computed
            elements_found = sum(1 for v in computed.values() if v is not None)
            print(f"   Sampled {elements_found} element types")
        except Exception as e:
            results['methods']['computed_styles'] = {'error': str(e)}
            print(f"   Error: {e}")
        
        # Method 3: Logo Detection
        print("\n[3/4] Detecting Logos...")
        try:
            logos = await detect_logos(page)
            results['methods']['logos'] = logos
            print(f"   Found {len(logos)} logo candidates")
            if logos:
                best = logos[0]
                print(f"   Best candidate: score={best['score']}, reasons={best['reasons']}")
        except Exception as e:
            results['methods']['logos'] = {'error': str(e)}
            print(f"   Error: {e}")
        
        # Method 4: Stylesheet Analysis
        print("\n[4/4] Analyzing Stylesheets...")
        try:
            stylesheets = await analyze_stylesheets(page)
            results['methods']['stylesheets'] = stylesheets
            print(f"   Found {stylesheets['unique_colors']} unique colors")
            print(f"   Top colors: {[c[0] for c in stylesheets['colors_by_frequency'][:5]]}")
        except Exception as e:
            results['methods']['stylesheets'] = {'error': str(e)}
            print(f"   Error: {e}")
        
        # Take a screenshot for reference
        screenshot_path = f"/tmp/branding_{url.replace('https://', '').replace('/', '_')}.png"
        await page.screenshot(path=screenshot_path)
        results['screenshot'] = screenshot_path
        print(f"\n📸 Screenshot saved: {screenshot_path}")
        
        await browser.close()
        
    return results


# ============================================================================
# Test Runner
# ============================================================================

TEST_SITES = [
    "https://www.elastic.co",    # Elastic
    "https://www.wikipedia.org", # Generic content site
    "https://example.com",       # Simple fallback
]


async def run_tests():
    """Run extraction tests on multiple sites."""
    all_results = []
    
    for url in TEST_SITES:
        try:
            result = await extract_all_branding(url)
            all_results.append(result)
        except Exception as e:
            print(f"\n❌ Failed to process {url}: {e}")
            all_results.append({'url': url, 'error': str(e)})
    
    # Save results
    output_path = '/tmp/branding_extraction_results.json'
    with open(output_path, 'w') as f:
        json.dump(all_results, f, indent=2, default=str)
    
    print(f"\n{'='*60}")
    print(f"Results saved to: {output_path}")
    print('='*60)
    
    return all_results


if __name__ == '__main__':
    asyncio.run(run_tests())

