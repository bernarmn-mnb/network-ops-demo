"""
Branding Extraction Module

Tools for extracting brand identity from customer websites.
"""

from .test_extraction import (
    extract_css_variables,
    extract_computed_styles,
    detect_logos,
    analyze_stylesheets,
    extract_all_branding,
)

__all__ = [
    'extract_css_variables',
    'extract_computed_styles', 
    'detect_logos',
    'analyze_stylesheets',
    'extract_all_branding',
]

