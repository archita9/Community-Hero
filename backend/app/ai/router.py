"""
Department auto-routing: maps issue categories to responsible departments.
"""
from typing import Optional

# Category → Department code mapping
CATEGORY_DEPARTMENT_MAP = {
    "pothole": "PWD",
    "road_damage": "PWD",
    "construction_hazard": "PWD",
    "garbage": "WMD",
    "illegal_dumping": "WMD",
    "streetlight": "ELEC",
    "water_leakage": "WATER",
    "drainage": "WATER",
    "tree_fall": "PARKS",
    "wall_damage": "MUNI",
    "other": "MUNI",
}

DEPARTMENT_DEFAULTS = {
    "PWD": {
        "name": "Public Works Department",
        "code": "PWD",
        "description": "Responsible for roads, infrastructure, and public works",
        "icon": "🏗️",
        "color": "#f97316",
        "handles_categories": ["pothole", "road_damage", "construction_hazard"],
    },
    "WMD": {
        "name": "Waste Management Department",
        "code": "WMD",
        "description": "Responsible for garbage collection and waste disposal",
        "icon": "♻️",
        "color": "#22c55e",
        "handles_categories": ["garbage", "illegal_dumping"],
    },
    "ELEC": {
        "name": "Electricity Department",
        "code": "ELEC",
        "description": "Responsible for streetlights and electrical infrastructure",
        "icon": "⚡",
        "color": "#eab308",
        "handles_categories": ["streetlight"],
    },
    "WATER": {
        "name": "Water Department",
        "code": "WATER",
        "description": "Responsible for water supply and drainage systems",
        "icon": "💧",
        "color": "#3b82f6",
        "handles_categories": ["water_leakage", "drainage"],
    },
    "PARKS": {
        "name": "Parks Department",
        "code": "PARKS",
        "description": "Responsible for parks, trees, and green spaces",
        "icon": "🌳",
        "color": "#10b981",
        "handles_categories": ["tree_fall"],
    },
    "MUNI": {
        "name": "Municipal Corporation",
        "code": "MUNI",
        "description": "General civic issues and public property",
        "icon": "🏛️",
        "color": "#8b5cf6",
        "handles_categories": ["wall_damage", "other"],
    },
}


def get_department_code(category: str) -> str:
    """Get department code for a given issue category."""
    return CATEGORY_DEPARTMENT_MAP.get(category, "MUNI")


def get_all_department_defaults() -> list:
    """Return list of all default department configurations."""
    return list(DEPARTMENT_DEFAULTS.values())
