import frappe
from frappe import _
from frappe.utils import cstr

# Requirements implemented:
# - Load only suppliers (no previous values).
# - Insert + submit in a single call.
# - On insert, validate:
#   a) No duplicate supplier rows in the submitted table payload.
#   b) No existing SUBMITTED doc for same supplier + date + session + animal type + driver.

def _get_suppliers_by_filters(driver: str = "", village: str = ""):
	filters = {'disabled': 0, 'custom_milk_supplier': 1}
	if driver:
		filters['custom_driver_in_charge'] = driver

	suppliers = frappe.get_all(
		'Supplier',
		filters=filters,
		fields=['name', 'supplier_name', 'custom_sort', 'custom_villages'],
		limit=5000
	)

	out = []
	for s in suppliers:
		display = s.get('supplier_name') or s.get('name')
		if village and not _is_supplier_in_village(s.get('custom_villages'), village):
			continue
		sort_key = s.get('custom_sort') or 0
		try:
			sort_key = int(sort_key) or 999999
		except Exception:
			sort_key = 999999
		out.append({'supplier': display, 'sort_key': sort_key})

	out.sort(key=lambda x: (x['sort_key'], x['supplier']))
	return out

def _is_supplier_in_village(custom_villages, village_name: str) -> bool:
	target = (village_name or "").strip()
	if not target:
		return True
	if not custom_villages:
		return False
	try:
		if isinstance(custom_villages, str) and custom_villages.strip().startswith(('[','{')):
			arr = frappe.parse_json(custom_villages)
		else:
			arr = custom_villages
	except Exception:
		arr = custom_villages

	res = []
	if isinstance(arr, list):
		for itm in arr:
			if not itm:
				continue
			if isinstance(itm, str):
				val = itm.strip()
			elif isinstance(itm, dict):
				val = (itm.get('village') or itm.get('village_name') or itm.get('value') or itm.get('name') or '').strip()
			else:
				val = ''
			if val:
				res.append(val)
	elif isinstance(arr, str):
		res = [x.strip() for x in arr.split(',') if x.strip()]

	return target in res

@frappe.whitelist()
def load_daily_quality(driver: str = "", village: str = "", date: str = ""):
	driver = cstr(driver).strip()
	village = cstr(village).strip()
	date = cstr(date).strip()

	if not date:
		frappe.throw(_("Date is required"))

	suppliers = _get_suppliers_by_filters(driver, village)
	rows = [{'supplier': s['supplier'] } for s in suppliers]
	return { 'rows': rows }

def _is_all_numeric_empty(row: dict) -> bool:
	def is_blank(x):
		if x is None:
			return True
		if isinstance(x, (int, float)):
			return False
		s = cstr(x).strip()
		return s == ""
	keys = ['water', 'protein', 'density', 'hardness', 'pont']
	return all(is_blank(row.get(k)) for k in keys)

def _validate_duplicate_in_payload(clean_rows):
	seen = set()
	for r in clean_rows:
		s = r['supplier']
		if s in seen:
			frappe.throw(_("لا يسمح بتكرار المورد مرتين في نفس القائمة: {0}").format(s))
		seen.add(s)

def _validate_no_existing_submitted(date: str, morning: int, evening: int, driver: str, cow: int, buffalo: int, supplier: str):
    from frappe.utils import cstr

    # Normalize but do not coalesce; require exact 0/1 as provided by caller
    date = cstr(date).strip()
    driver = cstr(driver).strip()
    supplier = cstr(supplier).strip()

    # Enforce that flags are exactly 0 or 1
    def as_bit(v, name):
        iv = int(v)
        if iv not in (0, 1):
            frappe.throw(f"Invalid value for {name}: {v}. Must be 0 or 1.")
        return iv

    morning = as_bit(morning, "morning")
    evening = as_bit(evening, "evening")
    cow = as_bit(cow, "cow")
    buffalo = as_bit(buffalo, "buffalo")

    if not date or not supplier:
        frappe.throw("Date and supplier are required")

    child = frappe.qb.DocType('Supplier Milk Quality')
    parent = frappe.qb.DocType('Milk Quality')

    q = (
        frappe.qb.from_(parent)
        .join(child).on(child.parent == parent.name)
        .select(parent.name)
        .where(parent.docstatus == 1)         # only submitted
        .where(parent.date == date)
        .where(parent.morning == morning)     # exact value as provided (0 or 1)
        .where(parent.evening == evening)     # exact value as provided (0 or 1)
        .where(parent.cow == cow)             # exact value as provided (0 or 1)
        .where(parent.buffalo == buffalo)     # exact value as provided (0 or 1)
        .where(child.supplier == supplier)
    )
    if driver:
        q = q.where(parent.driver == driver)

    # Minimal existence check
    exists = q.limit(1).run(as_dict=False)
    if exists:
        frappe.throw(_("يوجد سجل مُعتمد مسبقاً لهذا المورد لنفس التاريخ والفترة والنوع: {0}").format(supplier))

@frappe.whitelist()
def insert_and_submit_daily_quality(driver: str = "", village: str = "", date: str = "", morning: int = 0, evening: int = 0, cow: int = 0, buffalo: int = 0, rows=None):
	driver = cstr(driver).strip()
	village = cstr(village).strip()
	date = cstr(date).strip()
	morning = int(morning or 0)
	evening = int(evening or 0)
	cow = int(cow or 0)
	buffalo = int(buffalo or 0)

	if not date:
		frappe.throw(_("Date is required"))

	if isinstance(rows, str):
		try:
			rows = frappe.parse_json(rows)
		except Exception:
			frappe.throw(_("Parameter 'rows' must be a list; got a string that cannot be parsed"))
	if not isinstance(rows, (list, tuple)):
		frappe.throw(_("Parameter 'rows' must be a list"))

	# Normalize, keep only valid rows: supplier present and at least one numeric not blank
	clean_rows = []
	for r in rows:
		supplier = cstr(r.get('supplier')).strip()
		if not supplier:
			continue
		if _is_all_numeric_empty(r):
			continue

		def norm(x):
			if x is None:
				return ""
			return cstr(x).strip().replace(",", ".")

		clean_rows.append({
			'supplier': supplier,
			'water': norm(r.get('water')),
			'protein': norm(r.get('protein')),
			'density': norm(r.get('density')),
			'hardness': norm(r.get('hardness')),
			'pont': norm(r.get('pont')),
		})

	if not clean_rows:
		frappe.throw(_("لم يتم إدخال صفوف صالحة (تأكد من اختيار المورد وأن تحتوي الحقول على قيم عددية صحيحة)."))

	# Validate duplicate supplier within payload
	_validate_duplicate_in_payload(clean_rows)

	# Validate no existing submitted record for same combination
	for r in clean_rows:
		_validate_no_existing_submitted(date, morning, evening, driver, cow, buffalo, r['supplier'])

	# Create and submit new document
	doc = frappe.new_doc('Milk Quality')
	doc.date = date
	doc.driver = driver
	doc.morning = morning
	doc.evening = evening
	doc.cow = cow
	doc.buffalo = buffalo
	for r in clean_rows:
		doc.append('supplier_milk_quality', r)
	doc.insert(ignore_permissions=True)
	doc.submit()
	return {'docname': doc.name, 'docstatus': doc.docstatus}