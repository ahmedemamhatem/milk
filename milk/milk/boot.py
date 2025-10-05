# apps/milk/milk/boot.py

import frappe

TARGET = "app/milk-work"

def _normalize_route(v: str | None) -> str | None:
    if not v:
        return v
    # Normalize to "app/xxx" (no leading slash or hash)
    v = v.strip()
    v = v.lstrip("#/")
    if v.startswith("/"):
        v = v[1:]
    return v

def _ensure_system_default_route():
    # Some Frappe versions use System Settings default_route for Desk
    try:
        ss = frappe.get_single("System Settings")
        current = _normalize_route(getattr(ss, "default_route", None))
        if current in (None, "", "app/home"):
            ss.default_route = TARGET
            ss.flags.ignore_mandatory = True
            ss.save(ignore_permissions=True)
            frappe.db.commit()
    except Exception:
        # No System Settings yet (e.g., during install) or field missing
        pass

def boot_session(bootinfo):
    # 1) Set the boot-time home_page used by Desk
    try:
        hp = _normalize_route(bootinfo.get("home_page"))
        if hp in (None, "", "app/home"):
            bootinfo["home_page"] = TARGET
    except Exception:
        pass

    # 2) Persist default route in System Settings when possible
    try:
        if not frappe.local.flags.in_migrate:  # avoid writes during migrate if you prefer
            _ensure_system_default_route()
    except Exception:
        pass

    # 3) Optional: ensure desk route map default also points to TARGET if exposed
    try:
        # In some versions, bootinfo.desk_settings.default_route is honored
        desk_settings = bootinfo.get("desk_settings") or {}
        dr = _normalize_route(desk_settings.get("default_route"))
        if dr in (None, "", "app/home"):
            desk_settings["default_route"] = TARGET
            bootinfo["desk_settings"] = desk_settings
    except Exception:
        pass