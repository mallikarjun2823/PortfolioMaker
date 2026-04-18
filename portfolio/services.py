from __future__ import annotations

import logging

from datetime import date, datetime, time
from typing import Any, Dict, Iterable, List, Sequence

from django.core.exceptions import FieldError, ValidationError as DjangoValidationError
from django.db import IntegrityError, transaction
from django.db.models import Prefetch, QuerySet
from django.db.models.fields.files import FieldFile

from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.password_validation import validate_password
from django.utils.text import slugify

from rest_framework.exceptions import AuthenticationFailed, NotFound, PermissionDenied, ValidationError
from rest_framework_simplejwt.tokens import RefreshToken

from .models import Block, Element, Experience, Portfolio, Project, Section, Skill, Theme


service_logger = logging.getLogger("portfolio.service")


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


def _get_queryset(portfolio: Portfolio, data_source: str, *, include_unpublished: bool = False) -> QuerySet:
    if data_source == Element.DataSource.PROJECT:
        return Project.objects.filter(portfolio=portfolio, is_visible=True)

    if data_source == Element.DataSource.SKILL:
        return Skill.objects.filter(portfolio=portfolio, is_visible=True)

    if data_source == Element.DataSource.EXPERIENCE:
        return Experience.objects.filter(portfolio=portfolio, is_visible=True)

    if data_source == Element.DataSource.PORTFOLIO:
        qs = Portfolio.objects.filter(id=portfolio.id)
        if not include_unpublished:
            qs = qs.filter(is_published=True)
        return qs

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


def _filters_cache_key(filters: Sequence[Dict[str, Any]]) -> tuple:
    normalized: List[tuple] = []
    for item in filters:
        if not isinstance(item, dict):
            continue
        key = item.get("key")
        operator = item.get("operator")
        value = item.get("value")

        if isinstance(value, list):
            value_key = tuple(value)
        elif isinstance(value, dict):
            value_key = tuple(sorted(value.items()))
        else:
            value_key = value

        normalized.append((key, operator, value_key))
    return tuple(normalized)


def _resolve_block_items(
    portfolio: Portfolio,
    elements: Iterable[Element],
    *,
    include_unpublished: bool = False,
) -> List[Dict[str, Any]]:
    element_data: List[tuple[Element, List[Any]]] = []
    max_rows = 0

    record_cache: Dict[tuple, List[Any]] = {}

    for element in elements:
        config = _safe_config(element.config)
        filters = _normalize_filters(config.get("filters", []))
        cache_key = (element.data_source, _filters_cache_key(filters))

        records = record_cache.get(cache_key)
        if records is None:
            queryset = _get_queryset(portfolio, element.data_source, include_unpublished=include_unpublished)
            queryset = _apply_filters(queryset, filters)
            records = list(queryset)
            record_cache[cache_key] = records

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


def _fetch_blocks(section: Section, *, include_unpublished: bool = False) -> List[Dict[str, Any]]:
    visible_elements = Prefetch(
        "elements",
        queryset=Element.objects.filter(is_visible=True).order_by("order", "id"),
        to_attr="_visible_elements",
    )

    blocks = (
        Block.objects.filter(section=section, is_visible=True)
        .prefetch_related(visible_elements)
        .order_by("order", "id")
    )

    rendered_blocks: List[Dict[str, Any]] = []
    for block in blocks:
        elements = list(getattr(block, "_visible_elements", []))
        items = _resolve_block_items(section.portfolio, elements, include_unpublished=include_unpublished)

        rendered_blocks.append(
            {
                "type": block.type,
                "config": _safe_config(block.config),
                "items": items,
            }
        )

    return rendered_blocks


def _fetch_sections(portfolio: Portfolio, *, include_unpublished: bool = False) -> List[Dict[str, Any]]:
    sections = Section.objects.filter(portfolio=portfolio, is_visible=True).order_by("order", "id")

    return [
        {
            "name": section.name,
            "config": _safe_config(section.config),
            "blocks": _fetch_blocks(section, include_unpublished=include_unpublished),
        }
        for section in sections
    ]


class PortfolioRenderService:
    def _serialize_payload(self, *, portfolio: Portfolio, include_unpublished: bool) -> Dict[str, Any]:
        theme_data = None
        if portfolio.theme is not None:
            theme_data = {
                "name": portfolio.theme.name,
                "config": _safe_config(portfolio.theme.config),
            }

        return {
            "portfolio": {
                "title": portfolio.title,
                "slug": portfolio.slug,
                "description": portfolio.description,
                "resume": _serialize_value(portfolio.resume),
                "theme": theme_data,
                "sections": _fetch_sections(portfolio, include_unpublished=include_unpublished),
            }
        }

    def render_portfolio(
        self,
        portfolio_id: int,
        user_id: int,
        *,
        include_unpublished: bool = False,
    ) -> Dict[str, Any]:
        qs = Portfolio.objects.select_related("theme", "user").filter(id=portfolio_id, user_id=user_id)
        if not include_unpublished:
            qs = qs.filter(is_published=True)

        portfolio = qs.first()
        if portfolio is None:
            raise NotFound("Portfolio not found")

        return self._serialize_payload(portfolio=portfolio, include_unpublished=include_unpublished)

    def render_public_portfolio_by_slug(self, slug: str) -> Dict[str, Any]:
        slug_value = str(slug or "").strip()
        if not slug_value:
            raise NotFound("Portfolio not found")

        portfolio = (
            Portfolio.objects.select_related("theme", "user")
            .filter(slug=slug_value, is_published=True)
            .order_by("-updated_at", "-id")
            .first()
        )
        if portfolio is None:
            raise NotFound("Portfolio not found")

        return self._serialize_payload(portfolio=portfolio, include_unpublished=False)


class PortfolioService:
    _ALLOWED_FIELDS = {"title", "slug", "description", "resume", "theme", "is_published"}

    def list(self, *, user) -> QuerySet[Portfolio]:
        return Portfolio.objects.filter(user=user).select_related("theme").order_by("-created_at", "-id")

    def retrieve(self, *, user, portfolio_id: int) -> Portfolio:
        try:
            return Portfolio.objects.select_related("theme").get(id=portfolio_id, user=user)
        except Portfolio.DoesNotExist:
            raise NotFound("Portfolio not found.")

    def _ensure_owner(self, *, user, portfolio: Portfolio) -> None:
        if portfolio.user_id != user.id:
            raise PermissionDenied("You do not have permission to access this portfolio.")

    def _coerce_bool(self, value: Any, *, default: bool = False) -> bool:
        if value is None:
            return default
        if isinstance(value, bool):
            return value
        if isinstance(value, (int, float)):
            return bool(value)
        if isinstance(value, str):
            normalized = value.strip().lower()
            if normalized in {"true", "1", "yes", "y", "on"}:
                return True
            if normalized in {"false", "0", "no", "n", "off"}:
                return False
        raise ValidationError({"is_published": "Invalid boolean value."})

    def _slug_max_length(self) -> int:
        field = Portfolio._meta.get_field("slug")
        return int(getattr(field, "max_length", 50) or 50)

    def _normalize_title(self, value: Any) -> str:
        title = "" if value is None else str(value)
        title = title.strip()
        if not title:
            raise ValidationError({"title": "Title cannot be empty."})
        return title

    def _normalize_slug_source(self, value: Any) -> str:
        slug = "" if value is None else str(value)
        slug = slug.strip()
        slug = slugify(slug)
        return slug.strip("-")

    def _make_unique_slug(self, *, user, base_slug: str, exclude_portfolio_id: int | None = None) -> str:
        max_len = self._slug_max_length()
        base_slug = (base_slug or "").strip("-")[:max_len].strip("-")
        if not base_slug:
            raise ValidationError({"slug": "Slug cannot be empty."})

        qs = Portfolio.objects.filter(user=user)
        if exclude_portfolio_id is not None:
            qs = qs.exclude(pk=exclude_portfolio_id)

        candidate = base_slug
        suffix = 0
        while qs.filter(slug=candidate).exists():
            suffix += 1
            suffix_str = f"-{suffix}"
            trimmed = base_slug[: max_len - len(suffix_str)].rstrip("-")
            candidate = f"{trimmed}{suffix_str}"

        return candidate

    def _resolve_theme(self, value: Any) -> Theme | None:
        if value is None or value == "":
            return None

        if isinstance(value, Theme):
            return value

        try:
            theme_id = int(value)
        except (TypeError, ValueError):
            raise ValidationError({"theme": "Invalid theme reference."})

        try:
            return Theme.objects.get(pk=theme_id)
        except Theme.DoesNotExist:
            raise ValidationError({"theme": "Theme not found."})

    def _assert_publishable(self, portfolio: Portfolio) -> None:
        if portfolio.pk is None:
            raise ValidationError(
                {
                    "is_published": "Portfolio must be saved and have at least one section and at least one block before publishing."
                }
            )

        has_section = Section.objects.filter(portfolio_id=portfolio.pk).exists()
        has_block = Block.objects.filter(section__portfolio_id=portfolio.pk).exists()

        if not has_section or not has_block:
            raise ValidationError(
                {
                    "is_published": "Portfolio must have at least one section and at least one block before publishing."
                }
            )

    def _reject_unknown_fields(self, payload: Any) -> None:
        keys = set(getattr(payload, "keys", lambda: [])())
        unknown = keys - self._ALLOWED_FIELDS
        if unknown:
            raise ValidationError({key: "Unknown field." for key in sorted(unknown)})

    @transaction.atomic
    def create(self, *, user, validated_data: Dict[str, Any]) -> Portfolio:
        service_logger.info(
            "portfolio.create user_id=%s keys=%s",
            getattr(user, "id", None),
            sorted(list(validated_data.keys())),
        )
        self._reject_unknown_fields(validated_data)

        if validated_data.get("title", None) is None:
            raise ValidationError({"title": "This field is required."})

        title = self._normalize_title(validated_data.get("title"))
        description = validated_data.get("description", "")
        if description is None:
            description = ""
        description = str(description)

        raw_slug = validated_data.get("slug")
        base_slug = (
            self._normalize_slug_source(raw_slug)
            if raw_slug not in (None, "")
            else slugify(title)
        )
        slug = self._make_unique_slug(user=user, base_slug=base_slug)

        theme = self._resolve_theme(validated_data.get("theme", None))
        publish_requested = self._coerce_bool(validated_data.get("is_published", False), default=False)

        # Create independently valid aggregate root (unpublished by default).
        portfolio = Portfolio(
            user=user,
            title=title,
            slug=slug,
            description=description,
            resume=validated_data.get("resume"),
            theme=theme,
            is_published=False,
        )

        try:
            portfolio.full_clean(exclude=None)
        except DjangoValidationError as exc:
            raise ValidationError(exc.message_dict or {"detail": exc.messages})

        try:
            portfolio.save()
        except IntegrityError:
            raise ValidationError({"detail": "Could not create portfolio."})

        # Only enforce child existence when publishing.
        if publish_requested:
            self._assert_publishable(portfolio)
            portfolio.is_published = True
            portfolio.save(update_fields=["is_published", "updated_at"])

        return portfolio

    @transaction.atomic
    def update(self, *, user, instance: Portfolio, validated_data: Dict[str, Any]) -> Portfolio:
        service_logger.info(
            "portfolio.update user_id=%s portfolio_id=%s keys=%s",
            getattr(user, "id", None),
            getattr(instance, "id", None),
            sorted(list(validated_data.keys())),
        )
        self._ensure_owner(user=user, portfolio=instance)

        payload = validated_data
        self._reject_unknown_fields(payload)

        if "title" in payload:
            instance.title = self._normalize_title(payload.get("title"))

        if "description" in payload:
            description = payload.get("description")
            if description is None:
                description = ""
            instance.description = str(description)

        if "resume" in payload:
            instance.resume = payload.get("resume")

        if "theme" in payload:
            instance.theme = self._resolve_theme(payload.get("theme"))

        if "slug" in payload:
            raw_slug = payload.get("slug")
            if raw_slug in (None, ""):
                base_slug = slugify(instance.title)
            else:
                base_slug = self._normalize_slug_source(raw_slug)
            instance.slug = self._make_unique_slug(
                user=user,
                base_slug=base_slug,
                exclude_portfolio_id=instance.pk,
            )

        publish_requested = "is_published" in payload
        if publish_requested:
            new_is_published = self._coerce_bool(payload.get("is_published"), default=instance.is_published)
            if new_is_published and not instance.is_published:
                self._assert_publishable(instance)
            instance.is_published = new_is_published

        try:
            instance.full_clean(exclude=None)
            instance.save()
        except DjangoValidationError as exc:
            raise ValidationError(exc.message_dict or {"detail": exc.messages})
        except IntegrityError:
            raise ValidationError({"detail": "Could not update portfolio."})

        return instance

    @transaction.atomic
    def delete(self, *, user, instance: Portfolio) -> None:
        service_logger.info(
            "portfolio.delete user_id=%s portfolio_id=%s",
            getattr(user, "id", None),
            getattr(instance, "id", None),
        )
        self._ensure_owner(user=user, portfolio=instance)
        instance.delete()


class BasePortfolioChildService:
    model = None
    allowed_fields: set[str] = set()
    not_found_message = "Object not found."
    create_error_message = "Could not create object."
    update_error_message = "Could not update object."
    ownership_error_message = "Object does not belong to this portfolio."

    def _resolve_portfolio(self, *, portfolio_id: int, user, for_update: bool = False) -> Portfolio:
        qs = Portfolio.objects
        if for_update:
            qs = qs.select_for_update()

        portfolio = qs.filter(id=portfolio_id, user_id=user.id).first()
        if portfolio is None:
            raise NotFound("Portfolio not found.")

        return portfolio

    def _resolve_instance(self, *, portfolio_id: int, object_id: int, user, for_update: bool = False):
        qs = self.model.objects.select_related("portfolio")
        if for_update:
            qs = qs.select_for_update()

        try:
            return qs.get(id=object_id, portfolio_id=portfolio_id, portfolio__user_id=user.id)
        except self.model.DoesNotExist:
            raise NotFound(self.not_found_message)

    def _reject_unknown_fields(self, validated_data: Any) -> None:
        keys = set(getattr(validated_data, "keys", lambda: [])())
        unknown = keys - self.allowed_fields
        if unknown:
            raise ValidationError({key: "Unknown field." for key in sorted(unknown)})

    def _get_queryset(self, portfolio: Portfolio) -> QuerySet:
        return self.model.objects.filter(portfolio=portfolio)

    def _coerce_order(self, value: Any) -> int:
        if value is None:
            raise ValidationError({"order": "Order cannot be null."})

        try:
            order = int(value)
        except (TypeError, ValueError):
            raise ValidationError({"order": "Order must be an integer."})

        return max(1, order)

    def _lock_siblings(self, *, portfolio: Portfolio) -> List[Any]:
        return list(
            self._get_queryset(portfolio)
            .select_for_update()
            .order_by("order", "id")
        )

    def _resequence_orders(self, *, siblings: List[Any]) -> None:
        changed: List[Any] = []
        expected = 1
        for instance in siblings:
            if int(getattr(instance, "order", 0)) != expected:
                instance.order = expected
                changed.append(instance)
            expected += 1

        if changed:
            self.model.objects.bulk_update(changed, ["order"])

    def _with_auto_order(self, *, portfolio: Portfolio, validated_data: Dict[str, Any]) -> Dict[str, Any]:
        payload = dict(validated_data)
        if "order" not in payload or payload.get("order") is None:
            last_order = (
                self._get_queryset(portfolio)
                .order_by("-order", "-id")
                .values_list("order", flat=True)
                .first()
            )
            payload["order"] = (last_order + 1) if last_order is not None else 1
        return payload

    def list(self, *, portfolio_id: int, user) -> QuerySet:
        portfolio = self._resolve_portfolio(portfolio_id=portfolio_id, user=user)
        return self._get_queryset(portfolio).order_by("order", "id")

    def retrieve(self, *, portfolio_id: int, object_id: int, user):
        return self._resolve_instance(portfolio_id=portfolio_id, object_id=object_id, user=user)

    @transaction.atomic
    def create(self, *, portfolio_id: int, user, validated_data: Dict[str, Any]):
        self._reject_unknown_fields(validated_data)
        portfolio = self._resolve_portfolio(portfolio_id=portfolio_id, user=user)
        payload = dict(validated_data)

        siblings = self._lock_siblings(portfolio=portfolio)
        self._resequence_orders(siblings=siblings)

        desired_order = payload.get("order")
        if desired_order is None:
            desired_order = (siblings[-1].order + 1) if siblings else 1
        else:
            desired_order = self._coerce_order(desired_order)

        max_allowed = len(siblings) + 1
        desired_order = max(1, min(int(desired_order), max_allowed))
        payload["order"] = desired_order

        shifted: List[Any] = []
        for sibling in siblings:
            if int(getattr(sibling, "order", 0)) >= desired_order:
                sibling.order = int(getattr(sibling, "order", 0)) + 1
                shifted.append(sibling)

        if shifted:
            self.model.objects.bulk_update(shifted, ["order"])

        instance = self.model(portfolio=portfolio, **payload)

        try:
            instance.full_clean(exclude=None)
        except DjangoValidationError as exc:
            raise ValidationError(exc.message_dict or {"detail": exc.messages})

        try:
            instance.save()
        except IntegrityError:
            raise ValidationError({"detail": self.create_error_message})

        return instance

    @transaction.atomic
    def update(self, *, instance, user, validated_data: Dict[str, Any]):
        self._reject_unknown_fields(validated_data)
        portfolio = self._resolve_portfolio(portfolio_id=instance.portfolio_id, user=user)

        siblings = self._lock_siblings(portfolio=portfolio)
        self._resequence_orders(siblings=siblings)

        locked_instance = next((s for s in siblings if s.id == instance.id), None)
        if locked_instance is None:
            raise NotFound(self.not_found_message)

        desired_order: int | None = None
        if "order" in validated_data:
            desired_order = self._coerce_order(validated_data.get("order"))
            desired_order = max(1, min(int(desired_order), len(siblings)))

        for key, value in validated_data.items():
            if key == "order":
                continue
            setattr(locked_instance, key, value)

        if desired_order is not None:
            current_order = int(getattr(locked_instance, "order", 1))
            if desired_order != current_order:
                affected: List[Any] = []
                if desired_order < current_order:
                    for sibling in siblings:
                        if sibling.id == locked_instance.id:
                            continue
                        if desired_order <= int(getattr(sibling, "order", 0)) < current_order:
                            sibling.order = int(getattr(sibling, "order", 0)) + 1
                            affected.append(sibling)
                else:
                    for sibling in siblings:
                        if sibling.id == locked_instance.id:
                            continue
                        if current_order < int(getattr(sibling, "order", 0)) <= desired_order:
                            sibling.order = int(getattr(sibling, "order", 0)) - 1
                            affected.append(sibling)

                if affected:
                    self.model.objects.bulk_update(affected, ["order"])
                locked_instance.order = desired_order

        try:
            locked_instance.full_clean(exclude=None)
            locked_instance.save()
        except DjangoValidationError as exc:
            raise ValidationError(exc.message_dict or {"detail": exc.messages})
        except IntegrityError:
            raise ValidationError({"detail": self.update_error_message})

        return locked_instance

    @transaction.atomic
    def delete(self, *, instance, user) -> None:
        portfolio = self._resolve_portfolio(portfolio_id=instance.portfolio_id, user=user)

        siblings = self._lock_siblings(portfolio=portfolio)
        self._resequence_orders(siblings=siblings)

        locked_instance = next((s for s in siblings if s.id == instance.id), None)
        if locked_instance is None:
            raise NotFound(self.not_found_message)

        deleted_order = int(getattr(locked_instance, "order", 1))
        locked_instance.delete()

        affected: List[Any] = []
        for sibling in siblings:
            if sibling.id == locked_instance.id:
                continue
            if int(getattr(sibling, "order", 0)) > deleted_order:
                sibling.order = int(getattr(sibling, "order", 0)) - 1
                affected.append(sibling)

        if affected:
            self.model.objects.bulk_update(affected, ["order"])


class SectionService:
    allowed_fields = {"name", "order", "is_visible", "config"}
    not_found_message = "Section not found."
    create_error_message = "Could not create section."
    update_error_message = "Could not update section."

    def _normalize_name(self, value: Any) -> str:
        name = "" if value is None else str(value)
        name = name.strip()
        if not name:
            raise ValidationError({"name": "Name cannot be empty."})
        return name

    def _normalize_order(self, value: Any) -> int:
        try:
            order = int(value)
        except (TypeError, ValueError):
            raise ValidationError({"order": "Order must be an integer."})

        # Sections are typically 1-based in the seeded dataset and UI ordering.
        if order < 1:
            raise ValidationError({"order": "Order must be >= 1."})
        return order

    def _normalize_config(self, value: Any) -> Dict[str, Any]:
        if value is None:
            raise ValidationError({"config": "Config must be an object."})
        if not isinstance(value, dict):
            raise ValidationError({"config": "Config must be an object."})
        return value

    def _resolve_portfolio(self, *, portfolio_id: int, user, for_update: bool = False) -> Portfolio:
        qs = Portfolio.objects
        if for_update:
            qs = qs.select_for_update()
        portfolio = qs.filter(id=portfolio_id, user_id=user.id).first()
        if portfolio is None:
            raise NotFound("Portfolio not found.")
        return portfolio

    def _resolve_section(self, *, portfolio_id: int, section_id: int, user, for_update: bool = False) -> Section:
        qs = Section.objects.select_related("portfolio")
        if for_update:
            qs = qs.select_for_update()
        try:
            return qs.get(id=section_id, portfolio_id=portfolio_id, portfolio__user_id=user.id)
        except Section.DoesNotExist:
            raise NotFound(self.not_found_message)

    def _reject_unknown_fields(self, validated_data: Any) -> None:
        keys = set(getattr(validated_data, "keys", lambda: [])())
        unknown = keys - self.allowed_fields
        if unknown:
            raise ValidationError({key: "Unknown field." for key in sorted(unknown)})

    def _lock_sections(self, *, portfolio: Portfolio) -> List[Section]:
        return list(
            Section.objects.select_for_update()
            .filter(portfolio=portfolio)
            .order_by("order", "id")
        )

    def _resequence_orders(self, *, sections: List[Section]) -> None:
        """Force stable, contiguous ordering (1..n) within a portfolio."""

        changed: List[Section] = []
        expected = 1
        for section in sections:
            if section.order != expected:
                section.order = expected
                changed.append(section)
            expected += 1

        if changed:
            Section.objects.bulk_update(changed, ["order"])

    def _maybe_unpublish_if_invalid(self, *, portfolio: Portfolio) -> None:
        if not portfolio.is_published:
            return

        has_section = Section.objects.filter(portfolio_id=portfolio.pk).exists()
        has_block = Block.objects.filter(section__portfolio_id=portfolio.pk).exists()

        if has_section and has_block:
            return

        portfolio.is_published = False
        portfolio.save(update_fields=["is_published", "updated_at"])

    def list(self, *, portfolio_id: int, user) -> QuerySet[Section]:
        portfolio = self._resolve_portfolio(portfolio_id=portfolio_id, user=user)
        return Section.objects.filter(portfolio=portfolio).order_by("order", "id")

    def retrieve(self, *, portfolio_id: int, section_id: int, user) -> Section:
        return self._resolve_section(portfolio_id=portfolio_id, section_id=section_id, user=user)

    @transaction.atomic
    def create(self, *, portfolio_id: int, user, validated_data: Dict[str, Any]) -> Section:
        self._reject_unknown_fields(validated_data)
        portfolio = self._resolve_portfolio(portfolio_id=portfolio_id, user=user)

        payload = dict(validated_data)

        if payload.get("name", None) is None:
            raise ValidationError({"name": "This field is required."})

        payload["name"] = self._normalize_name(payload.get("name"))
        if "config" in payload:
            payload["config"] = self._normalize_config(payload.get("config"))

        sections = self._lock_sections(portfolio=portfolio)
        self._resequence_orders(sections=sections)

        desired_order = payload.get("order")
        if desired_order is None:
            desired_order = (sections[-1].order + 1) if sections else 1
        else:
            desired_order = self._normalize_order(desired_order)

        max_allowed = len(sections) + 1
        desired_order = max(1, min(int(desired_order), max_allowed))
        payload["order"] = desired_order

        # Insert behavior: shift existing sections down.
        shifted: List[Section] = []
        for section in sections:
            if section.order >= desired_order:
                section.order += 1
                shifted.append(section)
        if shifted:
            Section.objects.bulk_update(shifted, ["order"])

        instance = Section(portfolio=portfolio, **payload)

        try:
            instance.full_clean(exclude=None)
        except DjangoValidationError as exc:
            raise ValidationError(exc.message_dict or {"detail": exc.messages})

        try:
            instance.save()
        except IntegrityError:
            raise ValidationError({"detail": self.create_error_message})

        return instance

    @transaction.atomic
    def update(self, *, instance: Section, user, validated_data: Dict[str, Any]) -> Section:
        self._reject_unknown_fields(validated_data)
        portfolio = self._resolve_portfolio(portfolio_id=instance.portfolio_id, user=user)

        sections = self._lock_sections(portfolio=portfolio)
        self._resequence_orders(sections=sections)

        locked_instance = next((s for s in sections if s.id == instance.id), None)
        if locked_instance is None:
            raise NotFound(self.not_found_message)

        if "name" in validated_data:
            locked_instance.name = self._normalize_name(validated_data.get("name"))
        if "config" in validated_data:
            locked_instance.config = self._normalize_config(validated_data.get("config"))
        if "is_visible" in validated_data:
            locked_instance.is_visible = validated_data.get("is_visible")

        if "order" in validated_data:
            desired_order = self._normalize_order(validated_data.get("order"))
            desired_order = max(1, min(int(desired_order), len(sections)))
            current_order = int(locked_instance.order)

            if desired_order != current_order:
                affected: List[Section] = []
                if desired_order < current_order:
                    for section in sections:
                        if section.id == locked_instance.id:
                            continue
                        if desired_order <= int(section.order) < current_order:
                            section.order = int(section.order) + 1
                            affected.append(section)
                else:
                    for section in sections:
                        if section.id == locked_instance.id:
                            continue
                        if current_order < int(section.order) <= desired_order:
                            section.order = int(section.order) - 1
                            affected.append(section)

                if affected:
                    Section.objects.bulk_update(affected, ["order"])
                locked_instance.order = desired_order

        try:
            locked_instance.full_clean(exclude=None)
            locked_instance.save()
        except DjangoValidationError as exc:
            raise ValidationError(exc.message_dict or {"detail": exc.messages})
        except IntegrityError:
            raise ValidationError({"detail": self.update_error_message})

        return locked_instance

    @transaction.atomic
    def delete(self, *, instance: Section, user) -> None:
        portfolio = self._resolve_portfolio(portfolio_id=instance.portfolio_id, user=user)

        sections = self._lock_sections(portfolio=portfolio)
        self._resequence_orders(sections=sections)

        locked_instance = next((s for s in sections if s.id == instance.id), None)
        if locked_instance is None:
            raise NotFound(self.not_found_message)

        deleted_order = int(locked_instance.order)
        locked_instance.delete()

        affected: List[Section] = []
        for section in sections:
            if section.id == locked_instance.id:
                continue
            if int(section.order) > deleted_order:
                section.order = int(section.order) - 1
                affected.append(section)

        if affected:
            Section.objects.bulk_update(affected, ["order"])

        self._maybe_unpublish_if_invalid(portfolio=portfolio)

    @transaction.atomic
    def reorder(self, *, portfolio_id: int, user, order_pairs: Sequence[tuple[int, int]]) -> List[Section]:
        """Reorder sections using (section_id, desired_order) pairs.

        Applies a stable sort and then resequences to contiguous 1..n.
        """

        portfolio = self._resolve_portfolio(portfolio_id=portfolio_id, user=user)
        sections = self._lock_sections(portfolio=portfolio)
        self._resequence_orders(sections=sections)

        desired_map: Dict[int, int] = {}
        for section_id, desired_order in order_pairs:
            try:
                desired_map[int(section_id)] = self._normalize_order(desired_order)
            except (TypeError, ValueError):
                raise ValidationError({"order": "Invalid reorder payload."})

        ids = {s.id for s in sections}
        unknown = sorted([sid for sid in desired_map.keys() if sid not in ids])
        if unknown:
            raise ValidationError({"detail": "One or more sections do not exist."})

        def sort_key(section: Section) -> tuple:
            desired = desired_map.get(section.id)
            if desired is None:
                return (10**9, int(section.order), section.id)
            return (int(desired), int(section.order), section.id)

        sections_sorted = sorted(sections, key=sort_key)
        expected = 1
        changed: List[Section] = []
        for section in sections_sorted:
            if section.order != expected:
                section.order = expected
                changed.append(section)
            expected += 1

        if changed:
            Section.objects.bulk_update(changed, ["order"])

        return list(Section.objects.filter(portfolio=portfolio).order_by("order", "id"))

    @transaction.atomic
    def bulk_create(self, *, portfolio_id: int, user, items: Sequence[Dict[str, Any]]) -> List[Section]:
        portfolio = self._resolve_portfolio(portfolio_id=portfolio_id, user=user)
        created: List[Section] = []

        for item in items:
            self._reject_unknown_fields(item)
            created.append(self.create(portfolio_id=portfolio.id, user=user, validated_data=dict(item)))

        return created

    @transaction.atomic
    def bulk_update(self, *, portfolio_id: int, user, items: Sequence[Dict[str, Any]]) -> List[Section]:
        portfolio = self._resolve_portfolio(portfolio_id=portfolio_id, user=user)
        updated: List[Section] = []

        for item in items:
            if not isinstance(item, dict):
                raise ValidationError({"detail": "Invalid bulk update payload."})
            section_id = item.get("id")
            if section_id is None:
                raise ValidationError({"id": "This field is required."})
            instance = self._resolve_section(portfolio_id=portfolio.id, section_id=int(section_id), user=user)
            payload = dict(item)
            payload.pop("id", None)
            self._reject_unknown_fields(payload)
            updated.append(self.update(instance=instance, user=user, validated_data=payload))

        return updated


class BlockService:
    allowed_fields = {"type", "order", "is_visible", "config"}
    not_found_message = "Block not found."
    create_error_message = "Could not create block."
    update_error_message = "Could not update block."

    def _normalize_type(self, value: Any) -> str:
        t = "" if value is None else str(value)
        t = t.strip().upper()
        if not t:
            raise ValidationError({"type": "Type cannot be empty."})

        allowed = {c for c, _ in Block.BlockType.choices}
        if t not in allowed:
            raise ValidationError({"type": "Invalid block type."})
        return t

    def _normalize_order(self, value: Any) -> int:
        try:
            order = int(value)
        except (TypeError, ValueError):
            raise ValidationError({"order": "Order must be an integer."})

        if order < 1:
            raise ValidationError({"order": "Order must be >= 1."})
        return order

    def _normalize_config(self, value: Any) -> Dict[str, Any]:
        if value is None:
            raise ValidationError({"config": "Config must be an object."})
        if not isinstance(value, dict):
            raise ValidationError({"config": "Config must be an object."})
        return value

    def _reject_unknown_fields(self, validated_data: Any) -> None:
        keys = set(getattr(validated_data, "keys", lambda: [])())
        unknown = keys - self.allowed_fields
        if unknown:
            raise ValidationError({key: "Unknown field." for key in sorted(unknown)})

    def _resolve_section(self, *, portfolio_id: int, section_id: int, user, for_update: bool = False) -> Section:
        qs = Section.objects.select_related("portfolio")
        if for_update:
            qs = qs.select_for_update()
        try:
            return qs.get(id=section_id, portfolio_id=portfolio_id, portfolio__user_id=user.id)
        except Section.DoesNotExist:
            raise NotFound("Section not found.")

    def _resolve_block(self, *, portfolio_id: int, section_id: int, block_id: int, user, for_update: bool = False) -> Block:
        qs = Block.objects.select_related("section", "section__portfolio")
        if for_update:
            qs = qs.select_for_update()
        try:
            return qs.get(id=block_id, section_id=section_id, section__portfolio_id=portfolio_id, section__portfolio__user_id=user.id)
        except Block.DoesNotExist:
            raise NotFound(self.not_found_message)

    def _lock_blocks(self, *, section: Section) -> List[Block]:
        return list(
            Block.objects.select_for_update()
            .filter(section=section)
            .order_by("order", "id")
        )

    def _resequence_orders(self, *, blocks: List[Block]) -> None:
        changed: List[Block] = []
        expected = 1
        for b in blocks:
            if b.order != expected:
                b.order = expected
                changed.append(b)
            expected += 1
        if changed:
            Block.objects.bulk_update(changed, ["order"])

    def _maybe_unpublish_if_invalid(self, *, portfolio: Portfolio) -> None:
        if not portfolio.is_published:
            return

        has_section = Section.objects.filter(portfolio_id=portfolio.pk).exists()
        has_block = Block.objects.filter(section__portfolio_id=portfolio.pk).exists()

        if has_section and has_block:
            return

        portfolio.is_published = False
        portfolio.save(update_fields=["is_published", "updated_at"])

    def _validate_grid_data_source_consistency(self, *, block: Block) -> None:
        if block.type != Block.BlockType.GRID:
            return

        sources = {
            str(source).strip().upper()
            for source in Element.objects.select_for_update()
            .filter(block=block)
            .values_list("data_source", flat=True)
            if source is not None
        }

        if len(sources) <= 1:
            return

        raise ValidationError(
            {"type": "GRID blocks cannot mix element data sources. Use a single data source for all elements."}
        )

    def list(self, *, portfolio_id: int, section_id: int, user) -> QuerySet[Block]:
        section = self._resolve_section(portfolio_id=portfolio_id, section_id=section_id, user=user)
        return Block.objects.filter(section=section).order_by("order", "id")

    def retrieve(self, *, portfolio_id: int, section_id: int, block_id: int, user) -> Block:
        return self._resolve_block(portfolio_id=portfolio_id, section_id=section_id, block_id=block_id, user=user)

    @transaction.atomic
    def create(self, *, portfolio_id: int, section_id: int, user, validated_data: Dict[str, Any]) -> Block:
        self._reject_unknown_fields(validated_data)
        section = self._resolve_section(portfolio_id=portfolio_id, section_id=section_id, user=user, for_update=True)

        payload = dict(validated_data)
        if payload.get("type", None) is None:
            raise ValidationError({"type": "This field is required."})

        payload["type"] = self._normalize_type(payload.get("type"))
        if "config" in payload:
            payload["config"] = self._normalize_config(payload.get("config"))

        blocks = self._lock_blocks(section=section)
        self._resequence_orders(blocks=blocks)

        desired_order = payload.get("order")
        if desired_order is None:
            desired_order = (blocks[-1].order + 1) if blocks else 1
        else:
            desired_order = self._normalize_order(desired_order)

        max_allowed = len(blocks) + 1
        desired_order = max(1, min(int(desired_order), max_allowed))
        payload["order"] = desired_order

        shifted: List[Block] = []
        for b in blocks:
            if b.order >= desired_order:
                b.order += 1
                shifted.append(b)
        if shifted:
            Block.objects.bulk_update(shifted, ["order"])

        instance = Block(section=section, **payload)

        try:
            instance.full_clean(exclude=None)
        except DjangoValidationError as exc:
            raise ValidationError(exc.message_dict or {"detail": exc.messages})

        try:
            instance.save()
        except IntegrityError:
            raise ValidationError({"detail": self.create_error_message})

        return instance

    @transaction.atomic
    def update(self, *, instance: Block, user, validated_data: Dict[str, Any]) -> Block:
        self._reject_unknown_fields(validated_data)

        # Re-resolve under owner scope and lock siblings in the same section.
        locked_instance = self._resolve_block(
            portfolio_id=instance.section.portfolio_id,
            section_id=instance.section_id,
            block_id=instance.id,
            user=user,
            for_update=True,
        )
        section = locked_instance.section

        blocks = self._lock_blocks(section=section)
        self._resequence_orders(blocks=blocks)

        current = next((b for b in blocks if b.id == locked_instance.id), None)
        if current is None:
            raise NotFound(self.not_found_message)

        if "type" in validated_data:
            current.type = self._normalize_type(validated_data.get("type"))
            if current.type == Block.BlockType.GRID:
                self._validate_grid_data_source_consistency(block=current)
        if "config" in validated_data:
            current.config = self._normalize_config(validated_data.get("config"))
        if "is_visible" in validated_data:
            current.is_visible = validated_data.get("is_visible")

        if "order" in validated_data:
            desired_order = self._normalize_order(validated_data.get("order"))
            desired_order = max(1, min(int(desired_order), len(blocks)))
            current_order = int(current.order)

            if desired_order != current_order:
                affected: List[Block] = []
                if desired_order < current_order:
                    for b in blocks:
                        if b.id == current.id:
                            continue
                        if desired_order <= int(b.order) < current_order:
                            b.order = int(b.order) + 1
                            affected.append(b)
                else:
                    for b in blocks:
                        if b.id == current.id:
                            continue
                        if current_order < int(b.order) <= desired_order:
                            b.order = int(b.order) - 1
                            affected.append(b)

                if affected:
                    Block.objects.bulk_update(affected, ["order"])
                current.order = desired_order

        try:
            current.full_clean(exclude=None)
            current.save()
        except DjangoValidationError as exc:
            raise ValidationError(exc.message_dict or {"detail": exc.messages})
        except IntegrityError:
            raise ValidationError({"detail": self.update_error_message})

        return current

    @transaction.atomic
    def delete(self, *, instance: Block, user) -> None:
        locked_instance = self._resolve_block(
            portfolio_id=instance.section.portfolio_id,
            section_id=instance.section_id,
            block_id=instance.id,
            user=user,
            for_update=True,
        )
        section = locked_instance.section
        portfolio = section.portfolio

        blocks = self._lock_blocks(section=section)
        self._resequence_orders(blocks=blocks)

        target = next((b for b in blocks if b.id == locked_instance.id), None)
        if target is None:
            raise NotFound(self.not_found_message)

        deleted_order = int(target.order)
        target.delete()

        affected: List[Block] = []
        for b in blocks:
            if b.id == target.id:
                continue
            if int(b.order) > deleted_order:
                b.order = int(b.order) - 1
                affected.append(b)
        if affected:
            Block.objects.bulk_update(affected, ["order"])

        self._maybe_unpublish_if_invalid(portfolio=portfolio)


class ElementService:
    allowed_fields = {"label", "data_source", "field", "order", "is_visible", "config"}
    not_found_message = "Element not found."
    create_error_message = "Could not create element."
    update_error_message = "Could not update element."

    def _normalize_order(self, value: Any) -> int:
        try:
            order = int(value)
        except (TypeError, ValueError):
            raise ValidationError({"order": "Order must be an integer."})
        if order < 1:
            raise ValidationError({"order": "Order must be >= 1."})
        return order

    def _normalize_config(self, value: Any) -> Dict[str, Any]:
        if value is None:
            raise ValidationError({"config": "Config must be an object."})
        if not isinstance(value, dict):
            raise ValidationError({"config": "Config must be an object."})
        return value

    def _reject_unknown_fields(self, validated_data: Any) -> None:
        keys = set(getattr(validated_data, "keys", lambda: [])())
        unknown = keys - self.allowed_fields
        if unknown:
            raise ValidationError({key: "Unknown field." for key in sorted(unknown)})

    def _resolve_block(self, *, portfolio_id: int, section_id: int, block_id: int, user, for_update: bool = False) -> Block:
        qs = Block.objects.select_related("section", "section__portfolio")
        if for_update:
            qs = qs.select_for_update()
        try:
            return qs.get(
                id=block_id,
                section_id=section_id,
                section__portfolio_id=portfolio_id,
                section__portfolio__user_id=user.id,
            )
        except Block.DoesNotExist:
            raise NotFound("Block not found.")

    def _resolve_element(
        self,
        *,
        portfolio_id: int,
        section_id: int,
        block_id: int,
        element_id: int,
        user,
        for_update: bool = False,
    ) -> Element:
        qs = Element.objects.select_related("block", "block__section", "block__section__portfolio")
        if for_update:
            qs = qs.select_for_update()
        try:
            return qs.get(
                id=element_id,
                block_id=block_id,
                block__section_id=section_id,
                block__section__portfolio_id=portfolio_id,
                block__section__portfolio__user_id=user.id,
            )
        except Element.DoesNotExist:
            raise NotFound(self.not_found_message)

    def _lock_elements(self, *, block: Block) -> List[Element]:
        return list(
            Element.objects.select_for_update()
            .filter(block=block)
            .order_by("order", "id")
        )

    def _resequence_orders(self, *, elements: List[Element]) -> None:
        changed: List[Element] = []
        expected = 1
        for e in elements:
            if e.order != expected:
                e.order = expected
                changed.append(e)
            expected += 1
        if changed:
            Element.objects.bulk_update(changed, ["order"])

    def _validate_grid_data_source(
        self,
        *,
        block: Block,
        elements: List[Element],
        incoming_source: Any,
        exclude_element_id: int | None = None,
    ) -> None:
        if block.type != Block.BlockType.GRID:
            return

        incoming = str(incoming_source or "").strip().upper()
        if not incoming:
            return

        existing_sources = {
            str(e.data_source or "").strip().upper()
            for e in elements
            if e.id != exclude_element_id
        }
        existing_sources.discard("")

        if len(existing_sources) > 1:
            raise ValidationError(
                {
                    "data_source": "GRID block already contains mixed data sources. Normalize existing elements to one source first."
                }
            )

        if len(existing_sources) == 1:
            required = next(iter(existing_sources))
            if incoming != required:
                raise ValidationError(
                    {"data_source": f"All elements in a GRID block must use data source '{required}'."}
                )

    def list(self, *, portfolio_id: int, section_id: int, block_id: int, user) -> QuerySet[Element]:
        block = self._resolve_block(portfolio_id=portfolio_id, section_id=section_id, block_id=block_id, user=user)
        return Element.objects.filter(block=block).order_by("order", "id")

    def retrieve(self, *, portfolio_id: int, section_id: int, block_id: int, element_id: int, user) -> Element:
        return self._resolve_element(
            portfolio_id=portfolio_id,
            section_id=section_id,
            block_id=block_id,
            element_id=element_id,
            user=user,
        )

    @transaction.atomic
    def create(
        self,
        *,
        portfolio_id: int,
        section_id: int,
        block_id: int,
        user,
        validated_data: Dict[str, Any],
    ) -> Element:
        self._reject_unknown_fields(validated_data)
        block = self._resolve_block(
            portfolio_id=portfolio_id,
            section_id=section_id,
            block_id=block_id,
            user=user,
            for_update=True,
        )

        payload = dict(validated_data)
        if payload.get("label", None) is None:
            raise ValidationError({"label": "This field is required."})
        if payload.get("data_source", None) is None:
            raise ValidationError({"data_source": "This field is required."})
        if payload.get("field", None) is None:
            raise ValidationError({"field": "This field is required."})

        if "config" in payload:
            payload["config"] = self._normalize_config(payload.get("config"))

        elements = self._lock_elements(block=block)
        self._resequence_orders(elements=elements)
        self._validate_grid_data_source(
            block=block,
            elements=elements,
            incoming_source=payload.get("data_source"),
        )

        desired_order = payload.get("order")
        if desired_order is None:
            desired_order = (elements[-1].order + 1) if elements else 1
        else:
            desired_order = self._normalize_order(desired_order)

        max_allowed = len(elements) + 1
        desired_order = max(1, min(int(desired_order), max_allowed))
        payload["order"] = desired_order

        shifted: List[Element] = []
        for e in elements:
            if e.order >= desired_order:
                e.order += 1
                shifted.append(e)
        if shifted:
            Element.objects.bulk_update(shifted, ["order"])

        instance = Element(block=block, **payload)
        try:
            instance.full_clean(exclude=None)
        except DjangoValidationError as exc:
            raise ValidationError(exc.message_dict or {"detail": exc.messages})

        try:
            instance.save()
        except IntegrityError:
            raise ValidationError({"detail": self.create_error_message})

        return instance

    @transaction.atomic
    def update(self, *, instance: Element, user, validated_data: Dict[str, Any]) -> Element:
        self._reject_unknown_fields(validated_data)

        locked = self._resolve_element(
            portfolio_id=instance.block.section.portfolio_id,
            section_id=instance.block.section_id,
            block_id=instance.block_id,
            element_id=instance.id,
            user=user,
            for_update=True,
        )
        block = locked.block

        elements = self._lock_elements(block=block)
        self._resequence_orders(elements=elements)

        current = next((e for e in elements if e.id == locked.id), None)
        if current is None:
            raise NotFound(self.not_found_message)

        if "label" in validated_data:
            current.label = validated_data.get("label")
        if "data_source" in validated_data:
            current.data_source = validated_data.get("data_source")
        if "field" in validated_data:
            current.field = validated_data.get("field")
        if "config" in validated_data:
            current.config = self._normalize_config(validated_data.get("config"))
        if "is_visible" in validated_data:
            current.is_visible = validated_data.get("is_visible")

        if block.type == Block.BlockType.GRID and "data_source" in validated_data:
            self._validate_grid_data_source(
                block=block,
                elements=elements,
                incoming_source=current.data_source,
                exclude_element_id=current.id,
            )

        if "order" in validated_data:
            desired_order = self._normalize_order(validated_data.get("order"))
            desired_order = max(1, min(int(desired_order), len(elements)))
            current_order = int(current.order)

            if desired_order != current_order:
                affected: List[Element] = []
                if desired_order < current_order:
                    for e in elements:
                        if e.id == current.id:
                            continue
                        if desired_order <= int(e.order) < current_order:
                            e.order = int(e.order) + 1
                            affected.append(e)
                else:
                    for e in elements:
                        if e.id == current.id:
                            continue
                        if current_order < int(e.order) <= desired_order:
                            e.order = int(e.order) - 1
                            affected.append(e)

                if affected:
                    Element.objects.bulk_update(affected, ["order"])
                current.order = desired_order

        try:
            current.full_clean(exclude=None)
            current.save()
        except DjangoValidationError as exc:
            raise ValidationError(exc.message_dict or {"detail": exc.messages})
        except IntegrityError:
            raise ValidationError({"detail": self.update_error_message})

        return current

    @transaction.atomic
    def delete(self, *, instance: Element, user) -> None:
        locked = self._resolve_element(
            portfolio_id=instance.block.section.portfolio_id,
            section_id=instance.block.section_id,
            block_id=instance.block_id,
            element_id=instance.id,
            user=user,
            for_update=True,
        )
        block = locked.block

        elements = self._lock_elements(block=block)
        self._resequence_orders(elements=elements)

        target = next((e for e in elements if e.id == locked.id), None)
        if target is None:
            raise NotFound(self.not_found_message)

        deleted_order = int(target.order)
        target.delete()

        affected: List[Element] = []
        for e in elements:
            if e.id == target.id:
                continue
            if int(e.order) > deleted_order:
                e.order = int(e.order) - 1
                affected.append(e)
        if affected:
            Element.objects.bulk_update(affected, ["order"])


class ProjectService(BasePortfolioChildService):
    model = Project
    allowed_fields = {"title", "description", "github_url", "image", "order", "is_visible"}
    not_found_message = "Project not found."
    create_error_message = "Could not create project."
    update_error_message = "Could not update project."
    ownership_error_message = "Project does not belong to this portfolio."

    def retrieve(self, *, portfolio_id: int, project_id: int, user) -> Project:
        return super().retrieve(portfolio_id=portfolio_id, object_id=project_id, user=user)


class SkillService(BasePortfolioChildService):
    model = Skill
    allowed_fields = {"name", "level", "order", "is_visible"}
    not_found_message = "Skill not found."
    create_error_message = "Could not create skill."
    update_error_message = "Could not update skill."
    ownership_error_message = "Skill does not belong to this portfolio."

    def retrieve(self, *, portfolio_id: int, skill_id: int, user) -> Skill:
        return super().retrieve(portfolio_id=portfolio_id, object_id=skill_id, user=user)


class ExperienceService(BasePortfolioChildService):
    model = Experience
    allowed_fields = {"company", "role", "timeline", "order", "is_visible"}
    not_found_message = "Experience not found."
    create_error_message = "Could not create experience."
    update_error_message = "Could not update experience."
    ownership_error_message = "Experience does not belong to this portfolio."

    def retrieve(self, *, portfolio_id: int, experience_id: int, user) -> Experience:
        return super().retrieve(portfolio_id=portfolio_id, object_id=experience_id, user=user)


class AuthService:
    def register(self, *, username: str, password: str, email: str | None = None) -> Dict[str, str]:
        User = get_user_model()

        normalized_email = (email or "").strip() or None

        if User.objects.filter(username=username).exists():
            raise ValidationError({"username": "A user with this username already exists."})

        if normalized_email and User.objects.filter(email=normalized_email).exists():
            raise ValidationError({"email": "A user with this email already exists."})

        try:
            validate_password(password)
        except DjangoValidationError as exc:
            raise ValidationError({"password": exc.messages})

        try:
            user = User.objects.create_user(username=username, email=normalized_email, password=password)
        except IntegrityError:
            raise ValidationError({"detail": "Could not create user."})

        refresh = RefreshToken.for_user(user)
        return {"refresh": str(refresh), "access": str(refresh.access_token)}

    def login(self, *, username: str, password: str) -> Dict[str, str]:
        user = authenticate(username=username, password=password)
        if user is None:
            raise AuthenticationFailed("Invalid username or password")

        if not user.is_active:
            raise AuthenticationFailed("User account is disabled")

        refresh = RefreshToken.for_user(user)
        return {"refresh": str(refresh), "access": str(refresh.access_token)}