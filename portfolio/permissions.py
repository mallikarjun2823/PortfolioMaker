from rest_framework.permissions import BasePermission


class IsOwner(BasePermission):
    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.is_authenticated:
            return False

        # Child entities (e.g., Project) derive ownership from their parent Portfolio.
        portfolio = getattr(obj, "portfolio", None)
        if portfolio is not None:
            return getattr(portfolio, "user_id", None) == request.user.id

        owner_id = getattr(obj, "user_id", None)
        return owner_id == request.user.id
