# apps/milk/milk/milk/page/milk/api.py

import frappe
from frappe import _

@frappe.whitelist()
def check_card_access(cards=None):
    """
    Batch permission checker for workspace cards (doctypes or pages).

    cards can be list[dict] or a JSON string. Each card:
      {
        "id": "unique-id",
        "doctype": "Milk Collection" | null,
        "page": "car-collect" | "query-report/Stock Details" | null,
        "fields": ["driver", "village", "Sales Invoice.customer"]  # optional
      }

    Returns:
      {
        "allowed": { "<id>": true/false, ... },
        "reasons": { "<id>": ["read: Doctype", "field read: Doctype.field", ...], ... }
      }
    """
    cards = _safe_parse_cards(cards if cards is not None else frappe.form_dict.get("cards"))

    user = frappe.session.user or "Guest"
    roles = {r.lower() for r in (frappe.get_roles(user) or [])}
    privileged = ("milk admin" in roles) or ("system manager" in roles) or (user.lower() == "administrator")

    allowed_map = {}
    reasons_map = {}

    for c in cards:
        if not isinstance(c, dict):
            continue

        cid = (c.get("id") or "").strip()
        if not cid:
            continue

        if privileged:
            allowed_map[cid] = True
            reasons_map[cid] = []
            continue

        doctype = (c.get("doctype") or "").strip() or None
        page = (c.get("page") or "").strip() or None
        fields = c.get("fields") or []

        # Normalize fields -> list of (doctype, fieldname)
        parsed_fields = []
        for f in fields:
            s = (f or "").strip()
            if not s:
                continue
            if "." in s:
                dt, fn = s.split(".", 1)
                parsed_fields.append((dt.strip(), fn.strip()))
            else:
                if doctype:
                    parsed_fields.append((doctype, s))
                else:
                    parsed_fields.append((None, s))  # ambiguous for pages

        missing = []
        try:
            allowed = True

            if doctype:
                # إذا كان الدوكتايب جدول أطفال، اعتبر الوصول متاحاً وتجاوز فحوص الحقول
                if _is_child_table_doctype(doctype):
                    allowed = True
                    missing = []
                else:
                    # Need read on the DocType
                    if not _doc_read_via_perms(doctype, user):
                        allowed = False
                        missing.append(f"read: {doctype}")

                    # Fields (permlevel + link/child targets)
                    if allowed:
                        if parsed_fields:
                            for dt, fn in parsed_fields:
                                if not dt:
                                    allowed = False
                                    missing.append("define fields as Doctype.field")
                                    break
                                # إذا كان الدوكتايب المشار إليه Child Table، اعتبره متاح
                                if _is_child_table_doctype(dt):
                                    continue
                                # Must have read on the field's doctype
                                if not _doc_read_via_perms(dt, user):
                                    allowed = False
                                    missing.append(f"read: {dt}")
                                    break
                                ok_field, lacks = _field_readable_via_perms_with_lacks(dt, fn, user)
                                if not ok_field:
                                    allowed = False
                                    missing.extend(lacks)
                                    break
                        else:
                            ok_all, lacks = _doctype_field_subset_readable_with_lacks(doctype, user)
                            if not ok_all:
                                allowed = False
                                missing.extend(lacks)

            elif page:
                # Pages
                if page.startswith("query-report/"):
                    report_name = page[len("query-report/") :].strip()
                    if not _can_run_report(report_name, user):
                        allowed = False
                        rep_doctype = _report_ref_doctype(report_name)
                        if rep_doctype:
                            # إذا كان ref_doctype تقرير يشير إلى Child Table نعتبره متاح
                            if not _is_child_table_doctype(rep_doctype):
                                missing.append(f"read: {rep_doctype}")
                        else:
                            missing.append(f"run report: {report_name}")
                else:
                    allowed_pages = _get_allowed_pages()
                    if allowed_pages and page not in allowed_pages:
                        allowed = False
                        missing.append(f"open page: {page}")

                # Page-declared dependencies (cross-doctype fields)
                if allowed and parsed_fields:
                    for dt, fn in parsed_fields:
                        if not dt:
                            allowed = False
                            missing.append("define fields as Doctype.field")
                            break
                        # إذا كان الدوكتايب المشار إليه Child Table، اعتبره متاح
                        if _is_child_table_doctype(dt):
                            continue
                        if not _doc_read_via_perms(dt, user):
                            allowed = False
                            missing.append(f"read: {dt}")
                            break
                        ok_field, lacks = _field_readable_via_perms_with_lacks(dt, fn, user)
                        if not ok_field:
                            allowed = False
                            missing.extend(lacks)
                            break
            else:
                allowed = False
                missing.append("invalid target")

            allowed_map[cid] = bool(allowed)
            reasons_map[cid] = missing

        except Exception:
            allowed_map[cid] = False
            if not missing:
                missing = ["unexpected error"]
            reasons_map[cid] = missing

    return {"allowed": allowed_map, "reasons": reasons_map}


# ---------- Helpers (DocPerm/Custom DocPerm aware) ----------

def _safe_parse_cards(obj):
    if obj is None:
        return []
    if isinstance(obj, list):
        return obj
    if isinstance(obj, str):
        try:
            data = frappe.parse_json(obj)
            return data if isinstance(data, list) else []
        except Exception:
            return []
    return []

def _get_allowed_pages():
    pages = set()
    try:
        boot = getattr(frappe.local, "boot", None)
        allowed_pages = getattr(boot, "allowed_pages", None)
        if allowed_pages:
            for p in allowed_pages:
                name = p.get("name") if isinstance(p, dict) else (p or "").strip()
                if name:
                    pages.add(name)
    except Exception:
        pass
    return pages

def _valid_perm_rows(doctype: str, user: str):
    """Effective perms from DocPerm + Custom DocPerm for this user."""
    try:
        return frappe.permissions.get_valid_perms(doctype, user=user) or []
    except Exception:
        return []

def _doc_read_via_perms(doctype: str, user: str) -> bool:
    rows = _valid_perm_rows(doctype, user)
    return any(bool(r.get("read")) for r in rows)

def _is_child_table_doctype(doctype: str) -> bool:
    try:
        meta = frappe.get_meta(doctype)
        return bool(getattr(meta, "istable", False))
    except Exception:
        return False

def _field_readable_via_perms_with_lacks(doctype: str, fieldname: str, user: str):
    """
    Returns (ok, lacks[]). Field is readable if there exists a perm row with read=1
    and permlevel <= field.permlevel. If field is Link/Table, also ensure read on target doctype.
    """
    lacks = []
    try:
        meta = frappe.get_meta(doctype)
    except Exception:
        return False, [f"meta: {doctype}"]

    df = next((f for f in meta.fields if f.fieldname == fieldname), None)
    if not df:
        return True, []  # unknown field: don't block

    field_permlevel = int(df.permlevel or 0)
    rows = _valid_perm_rows(doctype, user)

    if not any(r.get("read") and int(r.get("permlevel") or 0) <= field_permlevel for r in rows):
        lacks.append(f"field read: {doctype}.{fieldname}")
        return False, lacks

    # Link/Table targets
    if df.fieldtype == "Link" and df.options:
        # إذا كان الهدف Child Table نعتبره متاح
        if not _is_child_table_doctype(df.options):
            if not _doc_read_via_perms(df.options, user):
                lacks.append(f"read: {df.options}")
                return False, lacks

    if df.fieldtype in ("Table", "Table Multiselect") and df.options:
        # إذا كان الهدف Child Table نعتبره متاح (غالبًا هو Child)
        if not _is_child_table_doctype(df.options):
            if not _doc_read_via_perms(df.options, user):
                lacks.append(f"read: {df.options}")
                return False, lacks

    return True, []

def _doctype_field_subset_readable_with_lacks(doctype: str, user: str):
    """Check a prudent subset that often blocks users: required, permlevel>0, link/table."""
    try:
        meta = frappe.get_meta(doctype)
    except Exception:
        return False, [f"meta: {doctype}"]
    lacks = []
    subset = [
        f for f in meta.fields
        if f.reqd or int(f.permlevel or 0) > 0 or f.fieldtype in ("Link", "Table", "Table Multiselect")
    ]
    ok_all = True
    for f in subset:
        ok, res_lacks = _field_readable_via_perms_with_lacks(doctype, f.fieldname, user)
        if not ok:
            ok_all = False
            lacks.extend(res_lacks)
    return ok_all, lacks

def _report_ref_doctype(report_name: str):
    try:
        report = frappe.get_doc("Report", report_name)
        return report.ref_doctype
    except Exception:
        return None

def _can_run_report(report_name: str, user: str) -> bool:
    if not report_name:
        return False
    try:
        report = frappe.get_doc("Report", report_name)
    except Exception:
        return False

    if report.report_type in ("Query Report", "Simple Query Report"):
        if report.ref_doctype:
            # إذا كان مرجع التقرير Child Table نعتبره متاح
            if _is_child_table_doctype(report.ref_doctype):
                return True
            return _doc_read_via_perms(report.ref_doctype, user)
        return False

    if report.report_type == "Script Report":
        if report.ref_doctype and not _is_child_table_doctype(report.ref_doctype):
            if not _doc_read_via_perms(report.ref_doctype, user):
                return False
        return bool(frappe.has_permission("Report", "read", user=user, doc=report))

    if report.ref_doctype:
        if _is_child_table_doctype(report.ref_doctype):
            return True
        return _doc_read_via_perms(report.ref_doctype, user)
    return False