from rest_framework.permissions import BasePermission


class IsOwner(BasePermission):
    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.is_authenticated:
            return False

        owner_id = getattr(obj, "user_id", None)
        if owner_id is None and getattr(obj, "portfolio", None) is not None:
            owner_id = getattr(obj.portfolio, "user_id", None)

        return owner_id == request.user.id
