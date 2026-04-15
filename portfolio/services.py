from __future__ import annotations

from datetime import date, datetime, time
from typing import Any, Dict, Iterable, List, Sequence

from django.core.exceptions import FieldError
from django.db.models import QuerySet
from django.db.models.fields.files import FieldFile

from .models import Block, Element, Experience, Portfolio, Project, Section, Skill


OPERATOR_MAP = {
    "eq": "",
    "neq": "",
    "gt": "__gt",
    "gte": "__gte",
    "lt": "__lt",
    "lte": "__lte",
    "contains": "__icontains",
    "icontains": "__icontains",
    "in": "__in",
}


def _safe_config(config: Any) -> Dict[str, Any]:
    if isinstance(config, dict):
        return config
    return {}


def _serialize_value(value: Any) -> Any:
    if isinstance(value, FieldFile):
        if not value:
            return None
        try:
            return value.url
        except ValueError:
            return str(value)

    if isinstance(value, (datetime, date, time)):
        return value.isoformat()

    if value is None or isinstance(value, (str, int, float, bool, list, dict)):
        return value

    return str(value)


def _get_queryset(portfolio: Portfolio, data_source: str) -> QuerySet:
    if data_source == Element.DataSource.PROJECT:
        return Project.objects.filter(portfolio=portfolio, is_visible=True)

    if data_source == Element.DataSource.SKILL:
        return Skill.objects.filter(portfolio=portfolio, is_visible=True)

    if data_source == Element.DataSource.EXPERIENCE:
        return Experience.objects.filter(portfolio=portfolio, is_visible=True)

    if data_source == Element.DataSource.PORTFOLIO:
        return Portfolio.objects.filter(id=portfolio.id, is_published=True)

    return Portfolio.objects.none()


def _normalize_filters(filters: Any) -> List[Dict[str, Any]]:
    if not isinstance(filters, list):
        return []
    return [f for f in filters if isinstance(f, dict)]


def _apply_filters(queryset: QuerySet, filters: Sequence[Dict[str, Any]]) -> QuerySet:
    for filter_item in filters:
        key = filter_item.get("key")
        operator = str(filter_item.get("operator", "eq")).lower()
        value = filter_item.get("value")

        if not key:
            continue

        lookup_suffix = OPERATOR_MAP.get(operator)
        if lookup_suffix is None:
            continue

        if operator == "neq":
            try:
                queryset = queryset.exclude(**{key: value})
            except FieldError:
                continue
            continue

        if operator == "in" and not isinstance(value, (list, tuple, set)):
            value = [value]

        lookup = f"{key}{lookup_suffix}"

        try:
            queryset = queryset.filter(**{lookup: value})
        except FieldError:
            continue

    return queryset


def _resolve_block_items(portfolio: Portfolio, elements: Iterable[Element]) -> List[Dict[str, Any]]:
    element_data: List[tuple[Element, List[Any]]] = []
    max_rows = 0

    for element in elements:
        queryset = _get_queryset(portfolio, element.data_source)
        config = _safe_config(element.config)
        filters = _normalize_filters(config.get("filters", []))
        queryset = _apply_filters(queryset, filters)

        records = list(queryset)
        max_rows = max(max_rows, len(records))
        element_data.append((element, records))

    if max_rows == 0:
        return []

    rows: List[Dict[str, Any]] = []
    for row_index in range(max_rows):
        row: Dict[str, Any] = {}
        for element, records in element_data:
            record = records[row_index] if row_index < len(records) else None
            value = getattr(record, element.field, None) if record is not None else None
            row[element.label] = _serialize_value(value)
        rows.append(row)

    return rows


def _fetch_blocks(section: Section) -> List[Dict[str, Any]]:
    blocks = (
        Block.objects.filter(section=section, is_visible=True)
        .prefetch_related("elements")
        .order_by("order", "id")
    )

    rendered_blocks: List[Dict[str, Any]] = []
    for block in blocks:
        elements = list(block.elements.filter(is_visible=True).order_by("order", "id"))
        items = _resolve_block_items(section.portfolio, elements)

        rendered_blocks.append(
            {
                "type": block.type,
                "config": _safe_config(block.config),
                "items": items,
            }
        )

    return rendered_blocks


def _fetch_sections(portfolio: Portfolio) -> List[Dict[str, Any]]:
    sections = Section.objects.filter(portfolio=portfolio, is_visible=True).order_by("order", "id")

    return [
        {
            "name": section.name,
            "config": _safe_config(section.config),
            "blocks": _fetch_blocks(section),
        }
        for section in sections
    ]


class PortfolioDetailService:
    def render_portfolio(self, portfolio_id: int, user_id: int) -> Dict[str, Any]:
        try:
            portfolio = (
                Portfolio.objects.select_related("theme", "user")
                .get(id=portfolio_id, is_published=True, user_id=user_id)
            )
        except Portfolio.DoesNotExist:
            return {"error": "Portfolio not found"}

        return {
            "portfolio": {
                "title": portfolio.title,
                "slug": portfolio.slug,
                "description": portfolio.description,
                "theme": {
                    "name": portfolio.theme.name,
                    "config": _safe_config(portfolio.theme.config),
                },
                "sections": _fetch_sections(portfolio),
            }
        }