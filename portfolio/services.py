from __future__ import annotations

import logging

from datetime import date, datetime, time
from typing import Any, Dict, Iterable, List, Sequence

from django.core.exceptions import FieldError, ValidationError as DjangoValidationError
from django.db import IntegrityError, transaction
from django.db.models import QuerySet
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


class PortfolioRenderService:
    def render_portfolio(self, portfolio_id: int, user_id: int) -> Dict[str, Any]:
        try:
            portfolio = (
                Portfolio.objects.select_related("theme", "user")
                .get(id=portfolio_id, is_published=True, user_id=user_id)
            )
        except Portfolio.DoesNotExist:
            return {"error": "Portfolio not found"}

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
                "theme": theme_data,
                "sections": _fetch_sections(portfolio),
            }
        }


class PortfolioService:
    _ALLOWED_FIELDS = {"title", "slug", "description", "theme", "is_published"}

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