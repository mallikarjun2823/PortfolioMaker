"""Permissions used by the portfolio API.

This module contains owner-scoped permission checks ensuring that users can
only act on objects they own. Child entities derive ownership from their
parent portfolio when applicable.
"""

from rest_framework.permissions import BasePermission


class IsOwner(BasePermission):
    """Allow access only to the owner of the object or its portfolio.

    The permission checks either ``obj.portfolio.user_id`` (for child objects)
    or ``obj.user_id`` for top-level objects.
    """

    def has_object_permission(self, request, view, obj):
        """Return True when the requesting user is the owner.

        Args:
            request: DRF request instance with ``user``.
            view: DRF view (unused).
            obj: The object being accessed; may be a child with ``portfolio``.

        Returns:
            bool: True if the request user is the owner, False otherwise.
        """
        if not request.user or not request.user.is_authenticated:
            return False

        # Child entities (e.g., Project) derive ownership from their parent Portfolio.
        portfolio = getattr(obj, "portfolio", None)
        if portfolio is not None:
            return getattr(portfolio, "user_id", None) == request.user.id

        owner_id = getattr(obj, "user_id", None)
        return owner_id == request.user.id
