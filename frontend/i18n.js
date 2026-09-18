/* Sarrdesign Sample Display Control - EN/AR translation dictionary.
   Loaded before app.js. Provides window.t(key, vars) and window.setLang(lang). */

const I18N = {
  en: {
    brand: "Sarrdesign", brandSub: "Sample Display Control",
    logout: "Log out",
    loading: "Loading...",
    cancel: "Cancel", save: "Save", saved: "Saved", select: "Select...", yes: "Yes", no: "No",
    edit: "Edit", notesLabel: "Notes", optional: "optional", active: "Active",

    nav_dashboard: "Dashboard", nav_new_request: "New Request", nav_requests: "Sample Requests",
    nav_factory: "Factory Queue", nav_incoming: "Incoming", nav_stock: "Warehouse Stock",
    nav_dismissals: "Dismissal Approvals", nav_returns: "Record Return", nav_history: "History Archive",
    nav_products: "Products", nav_distributors: "Distributors", nav_users: "Users",

    role_admin: "Admin", role_sales_manager: "Sales Area Manager", role_commercial_director: "Commercial Director",
    role_factory: "Factory", role_warehouse: "Warehouse", role_assembly: "Assembly Team",

    login_tagline: "Sample Display Control - sign in",
    login_email: "Email", login_password: "Password", login_signin: "Sign in",
    login_demo_hint: "Demo accounts (password <b>ChangeMe123!</b>):",

    dash_your_requests: "Your requests", dash_awaiting_director: "Awaiting director review", dash_rejected: "Rejected",
    dash_pending_review: "Pending your review", dash_approved_awaiting_factory: "Approved, awaiting factory send",
    dash_production_queue: "Items in production queue", dash_incoming: "Awaiting/incoming from factory",
    dash_skus_in_warehouse: "SKUs currently in warehouse", dash_pending_dismissals: "Pending dismissal approvals",
    dash_ready_to_display: "Approved, ready to display", dash_dismissals_awaiting_you: "Dismissal approvals awaiting you",
    dash_in_transit: "Items in transit / delayed", dash_skus_short: "SKUs in warehouse",
    dash_workflow_title: "Workflow at a glance",
    dash_workflow_text: "Sales area manager creates a sample request against a showroom → commercial director reviews each SKU against the distributor's order → approved lines go to the factory → factory ships (often in partial batches) → warehouse confirms receipt → a dismissal must be approved before any sample leaves the warehouse → assembly team displays it at the showroom → returns/replacements flow back through the warehouse. Every step is dated and attributed.",

    newreq_title: "New Sample Request", newreq_distributor: "Distributor / Trader",
    newreq_showroom: "Showroom / Booth / Stand", newreq_select_distributor_first: "Select distributor first",
    newreq_purpose: "Purpose", purpose_new_stand: "New stand / booth", purpose_addition: "Addition to existing stand",
    purpose_replacement: "Replacement", purpose_live_show: "Live show (sellable / water flow)",
    newreq_order_ref: "Distributor order reference (PO #, invoice, etc.)", newreq_order_ref_ph: "e.g. PO-1044",
    newreq_notes_ph: "Any context for the commercial director",
    newreq_lines_title: "Sample lines",
    newreq_lines_help: "Search by code, family, or color. Enter the quantity of this SKU in the distributor's order too - the commercial director uses it to confirm the 5-10 piece minimum order quantity.",
    newreq_product: "Product", newreq_product_ph: "Type code / family / color...",
    newreq_qty_req: "Qty requested (samples)", newreq_qty_order: "Qty in distributor order (this SKU)",
    newreq_qty_order_ph: "e.g. 8", newreq_dummy_label: "Dummy sample (not sellable)",
    newreq_dummy_hint: "uncheck for a sellable sample (e.g. to simulate live water flow)",
    newreq_add_line: "+ Add line", newreq_no_lines: "No lines added yet.",
    col_code: "Code", col_family_color: "Family / Color", col_qty: "Qty", col_order_qty: "Order Qty",
    col_type: "Type", col_remove: "Remove", type_dummy: "Dummy", type_sellable: "Sellable",
    newreq_submit: "Submit request for review",
    newreq_no_showrooms: "No showrooms yet - add one under Distributors",
    msg_pick_product: "Pick a product from the suggestions list",
    msg_choose_dist_showroom: "Choose a distributor and showroom",
    msg_add_one_line: "Add at least one sample line",
    msg_request_submitted: "Request {n} submitted",

    reqlist_title: "Sample Requests", reqlist_all_statuses: "All statuses", reqlist_mine_only: "My requests only",
    col_hash: "#", col_date: "Date", col_distributor: "Distributor", col_showroom: "Showroom",
    col_sales_manager: "Sales Manager", col_status: "Status", col_open: "Open →",
    reqlist_none: "No requests found.",

    reqdet_created_by: "Created {date} by {name}", reqdet_export: "Export Excel",
    reqdet_send_factory: "Send to Factory", reqdet_purpose: "Purpose", reqdet_order_ref: "Order reference",
    reqdet_lines_title: "Sample lines", reqdet_attachments: "Attachments",
    attach_distributor_order: "Distributor order", attach_scanned_form: "Scanned paper form", attach_other: "Other",
    attach_upload: "Upload", attach_none: "No attachments yet.", attach_uploaded: "Attachment uploaded",
    reqdet_approval_history: "Approval history", reqdet_no_actions: "No actions yet.",
    col_color_family: "Color / Family", col_requested: "Requested", col_approved: "Approved",
    col_moq_check: "MOQ check", col_shipped: "Shipped", col_received: "Received", col_assigned: "Assigned",
    review_title: "Review pending lines", review_submit: "Submit review", review_decision: "Decision",
    review_approve: "Approve", review_reject: "Reject", review_qty_approved: "Qty approved",
    review_sku_match: "SKU matches distributor stock?", review_moq_met: "Min order qty met (5-10)?",
    review_requested_order: "requested {req}, order qty {ord}", review_submitted: "Review submitted",
    ship_title: "Log factory shipment", ship_summary: "approved {a}, shipped so far {s}, remaining {r}",
    ship_qty_ph: "qty sent", ship_batch_ph: "batch ref (optional)", ship_btn: "Log shipment",
    ship_logged: "Shipment logged",
    recv_title: "Log warehouse receipt", recv_summary: "shipped {s}, received so far {r}, in transit {t}",
    recv_btn: "Log receipt", recv_logged: "Receipt logged", sent_to_factory_msg: "Sent to factory",

    factory_title: "Production Queue", col_request: "Request", col_dist_showroom: "Distributor / Showroom",
    col_color: "Color", col_remaining: "Remaining", col_ship_arrow: "Ship →",
    factory_empty: "Nothing waiting on the factory right now.",

    incoming_title: "Incoming from Factory",
    incoming_help: "Approved samples not yet fully in the downtown warehouse. Watch \"days since last update\" for items stuck for months.",
    col_outstanding: "Outstanding (never shipped)", col_pending_receive: "Pending receipt",
    incoming_empty: "Nothing outstanding from the factory.",

    stock_title: "Warehouse Stock Control", stock_search_ph: "Search by code, family or color...",
    col_held_for: "Held for (Distributor / Showroom)", col_qty_in_warehouse: "Qty in warehouse",
    stock_empty: "Nothing in stock matches.",

    dismiss_request_title: "Request a dismissal (move samples out of the warehouse)",
    dismiss_request_help: "Nothing leaves the downtown warehouse - new placement or reassignment between traders - without approval.",
    dismiss_item: "Warehouse item", dismiss_loading_stock: "Loading stock...",
    dismiss_dest_showroom: "Destination showroom", dismiss_dest_dist: "Distributor (for showroom list)",
    dismiss_qty: "Qty", dismiss_reason: "Reason", dismiss_reason_ph: "e.g. initial stand fit-out, top-up, replacement",
    dismiss_submit: "Request dismissal", dismiss_list_title: "Dismissal requests",
    status_pending: "Pending", status_approved: "Approved", status_rejected: "Rejected", filter_all: "All",
    col_dest: "Destination", col_reason: "Reason", tag_reassignment: "reassignment",
    dismiss_place_btn: "Place at showroom", dismiss_none: "No dismissal requests here.",
    dismiss_no_stock: "No stock available", dismiss_requested_msg: "Dismissal requested - awaiting admin approval",
    dismiss_fill_all: "Fill in item, showroom and quantity", dismiss_approved_msg: "Dismissal approved",
    dismiss_rejected_msg: "Dismissal rejected", dismiss_placed_msg: "Sample placed at showroom",
    dismiss_dup_confirm: "\n\nPlace it anyway?",

    returns_title: "Record a return from a showroom", returns_empty: "Nothing currently displayed at this showroom.",
    returns_qty: "Qty returned", returns_restocked: "Restocked?",
    returns_restock_yes: "Yes - back to warehouse stock", returns_restock_no: "No - scrapped / sent for repair",
    returns_btn: "Record return", returns_recorded: "Return recorded",
    returns_summary: "qty {q}, placed {d}",

    history_title: "Historical Archive", history_showroom_optional: "Showroom (optional - narrows to one showroom)",
    history_all_showrooms: "All showrooms", history_showrooms_count: "showroom(s):",
    history_currently_displayed: "Currently displayed here", history_none_displayed: "Nothing currently displayed.",
    history_timeline: "Timeline", history_none: "No history yet.",
    history_since: "since {d}",

    products_title: "Product Master", products_import: "Import / refresh from Excel",
    products_search_ph: "Search by code, family, application, color...", products_add: "+ Add product",
    col_kind: "Kind", col_application: "Application", col_price: "Price",
    products_delist: "Delist", products_delist_confirm: "Delist this product? It stays visible in history but won't be selectable for new requests.",
    products_delisted: "Delisted", products_import_result: "Imported: {c} new, {u} updated",
    modal_add_product: "Add product", modal_edit_product: "Edit product", m_code: "Code (SKU)",
    m_color: "Color", m_family: "Family", m_kind: "Kind", m_application: "Application",
    m_desc_en: "Description (EN)", m_desc_ar: "Description (AR)", m_price: "Price",
    m_dummy_default: "Dummy by default", msg_code_required: "Code is required",

    dist_title: "Distributors & Traders", dist_add: "+ Add distributor / trader",
    dist_add_showroom: "+ Showroom", dist_loading_showrooms: "Loading showrooms...",
    col_showroom_th: "Showroom", col_address: "Address", col_governorate: "Governorate",
    col_phone: "Phone", col_min_order: "Min order", dist_no_showrooms: "No showrooms yet.",
    modal_add_dist: "Add distributor / trader", modal_edit_dist: "Edit",
    m_name: "Name", m_type: "Type", type_distributor: "Distributor", type_trader: "Small trader",
    msg_name_required: "Name required",
    modal_add_room: "Add showroom / booth", modal_edit_room: "Edit showroom",
    m_address: "Address", m_area: "Area", m_moq: "Min order qty (5-10)", m_contact: "Contact person",

    users_title: "Users", users_add: "+ Add user",
    col_name: "Name", col_email: "Email", col_role: "Role", col_area: "Area",
    modal_add_user: "Add user", modal_edit_user: "Edit user",
    m_email: "Email", m_role: "Role", m_area_sales: "Area (for sales managers)", m_phone: "Phone",
    m_password: "Password", m_password_edit: "New password (leave blank to keep)",
    msg_user_required: "Name, email and password required",

    lang_switch: "العربية", // shows "العربية" as the switch-to-Arabic label while in English
  },

  ar: {
    brand: "سارديزاين", brandSub: "إدارة عرض العينات",
    logout: "تسجيل الخروج",
    loading: "جارٍ التحميل...",
    cancel: "إلغاء", save: "حفظ", saved: "تم الحفظ", select: "اختر...", yes: "نعم", no: "لا",
    edit: "تعديل", notesLabel: "ملاحظات", optional: "اختياري", active: "نشط",

    nav_dashboard: "الرئيسية", nav_new_request: "طلب جديد", nav_requests: "طلبات العينات",
    nav_factory: "قائمة المصنع", nav_incoming: "الوارد", nav_stock: "مخزون العهدة",
    nav_dismissals: "موافقات الصرف", nav_returns: "تسجيل مرتجع", nav_history: "الأرشيف التاريخي",
    nav_products: "المنتجات", nav_distributors: "الموزعون", nav_users: "المستخدمون",

    role_admin: "مدير", role_sales_manager: "مندوب منطقة مبيعات", role_commercial_director: "المدير التجاري",
    role_factory: "المصنع", role_warehouse: "المخزن", role_assembly: "فريق التركيب",

    login_tagline: "إدارة عرض العينات - تسجيل الدخول",
    login_email: "البريد الإلكتروني", login_password: "كلمة المرور", login_signin: "دخول",
    login_demo_hint: "حسابات تجريبية (كلمة المرور <b>ChangeMe123!</b>):",

    dash_your_requests: "طلباتك", dash_awaiting_director: "بانتظار مراجعة المدير", dash_rejected: "مرفوضة",
    dash_pending_review: "بانتظار مراجعتك", dash_approved_awaiting_factory: "موافق عليها، بانتظار الإرسال للمصنع",
    dash_production_queue: "أصناف في قائمة الإنتاج", dash_incoming: "بانتظار الورود من المصنع",
    dash_skus_in_warehouse: "أصناف متوفرة حالياً في المخزن", dash_pending_dismissals: "موافقات صرف معلقة",
    dash_ready_to_display: "موافق عليها، جاهزة للعرض", dash_dismissals_awaiting_you: "موافقات صرف بانتظارك",
    dash_in_transit: "أصناف في الطريق / متأخرة", dash_skus_short: "أصناف في المخزن",
    dash_workflow_title: "سير العمل باختصار",
    dash_workflow_text: "يقوم مندوب منطقة المبيعات بإنشاء طلب عينة لصالة عرض ← يراجع المدير التجاري كل صنف مقابل طلبية الموزع ← تذهب البنود الموافق عليها للمصنع ← يقوم المصنع بالشحن (غالباً على دفعات جزئية) ← يؤكد المخزن الاستلام ← يجب الموافقة على الصرف قبل خروج أي عينة من المخزن ← يقوم فريق التركيب بعرضها في صالة العرض ← تعود المرتجعات / الاستبدالات عبر المخزن. كل خطوة مؤرخة ومنسوبة لشخص.",

    newreq_title: "طلب عينة جديد", newreq_distributor: "الموزع / التاجر",
    newreq_showroom: "صالة العرض / الفرع", newreq_select_distributor_first: "اختر الموزع أولاً",
    newreq_purpose: "الغرض", purpose_new_stand: "فرع جديد", purpose_addition: "إضافة لفرع قائم",
    purpose_replacement: "استبدال", purpose_live_show: "عرض حي (منتج قابل للبيع / تدفق مياه)",
    newreq_order_ref: "رقم طلب الموزع (أمر شراء، فاتورة...)", newreq_order_ref_ph: "مثال: PO-1044",
    newreq_notes_ph: "أي ملاحظات للمدير التجاري",
    newreq_lines_title: "بنود العينات",
    newreq_lines_help: "ابحث بالكود أو المجموعة أو اللون. أدخل أيضاً كمية هذا الكود في طلب الموزع - يستخدمها المدير التجاري للتأكد من الحد الأدنى للطلب (5-10 قطع).",
    newreq_product: "المنتج", newreq_product_ph: "اكتب الكود / المجموعة / اللون...",
    newreq_qty_req: "الكمية المطلوبة (عينات)", newreq_qty_order: "الكمية في طلب الموزع (لهذا الكود)",
    newreq_qty_order_ph: "مثال: 8", newreq_dummy_label: "عينة دمي (غير قابلة للبيع)",
    newreq_dummy_hint: "ألغِ التأشير لعينة قابلة للبيع (مثلاً لمحاكاة تدفق المياه الحقيقي)",
    newreq_add_line: "+ إضافة بند", newreq_no_lines: "لم تضف أي بنود بعد.",
    col_code: "الكود", col_family_color: "المجموعة / اللون", col_qty: "الكمية", col_order_qty: "كمية الطلب",
    col_type: "النوع", col_remove: "حذف", type_dummy: "دمي", type_sellable: "قابل للبيع",
    newreq_submit: "إرسال الطلب للمراجعة",
    newreq_no_showrooms: "لا توجد صالات عرض بعد - أضف واحدة من صفحة الموزعين",
    msg_pick_product: "اختر منتجاً من قائمة الاقتراحات",
    msg_choose_dist_showroom: "اختر الموزع وصالة العرض",
    msg_add_one_line: "أضف بنداً واحداً على الأقل",
    msg_request_submitted: "تم إرسال الطلب {n}",

    reqlist_title: "طلبات العينات", reqlist_all_statuses: "كل الحالات", reqlist_mine_only: "طلباتي فقط",
    col_hash: "#", col_date: "التاريخ", col_distributor: "الموزع", col_showroom: "صالة العرض",
    col_sales_manager: "مندوب المبيعات", col_status: "الحالة", col_open: "فتح ←",
    reqlist_none: "لا توجد طلبات.",

    reqdet_created_by: "أنشئ في {date} بواسطة {name}", reqdet_export: "تصدير Excel",
    reqdet_send_factory: "إرسال للمصنع", reqdet_purpose: "الغرض", reqdet_order_ref: "رقم الطلب",
    reqdet_lines_title: "بنود العينات", reqdet_attachments: "المرفقات",
    attach_distributor_order: "طلب الموزع", attach_scanned_form: "نموذج ورقي ممسوح", attach_other: "أخرى",
    attach_upload: "رفع", attach_none: "لا توجد مرفقات بعد.", attach_uploaded: "تم رفع المرفق",
    reqdet_approval_history: "سجل الموافقات", reqdet_no_actions: "لا إجراءات بعد.",
    col_color_family: "اللون / المجموعة", col_requested: "المطلوب", col_approved: "الموافق عليه",
    col_moq_check: "فحص الحد الأدنى", col_shipped: "مشحون", col_received: "مستلم", col_assigned: "موزع",
    review_title: "مراجعة البنود المعلقة", review_submit: "إرسال المراجعة", review_decision: "القرار",
    review_approve: "موافقة", review_reject: "رفض", review_qty_approved: "الكمية الموافق عليها",
    review_sku_match: "هل الكود مطابق لمخزون الموزع؟", review_moq_met: "هل تحقق الحد الأدنى للطلب (5-10)؟",
    review_requested_order: "مطلوب {req}، كمية الطلب {ord}", review_submitted: "تم إرسال المراجعة",
    ship_title: "تسجيل شحنة من المصنع", ship_summary: "موافق {a}، مشحون حتى الآن {s}، المتبقي {r}",
    ship_qty_ph: "الكمية المشحونة", ship_batch_ph: "رقم الدفعة (اختياري)", ship_btn: "تسجيل الشحنة",
    ship_logged: "تم تسجيل الشحنة",
    recv_title: "تسجيل استلام في المخزن", recv_summary: "مشحون {s}، مستلم حتى الآن {r}، في الطريق {t}",
    recv_btn: "تسجيل الاستلام", recv_logged: "تم تسجيل الاستلام", sent_to_factory_msg: "تم الإرسال للمصنع",

    factory_title: "قائمة الإنتاج", col_request: "الطلب", col_dist_showroom: "الموزع / صالة العرض",
    col_color: "اللون", col_remaining: "المتبقي", col_ship_arrow: "شحن ←",
    factory_empty: "لا شيء في انتظار المصنع حالياً.",

    incoming_title: "الوارد من المصنع",
    incoming_help: "عينات موافق عليها لم تصل بالكامل إلى مخزن وسط البلد بعد. راقب «أيام منذ آخر تحديث» للعناصر المتأخرة لأشهر.",
    col_outstanding: "متأخر (لم يُشحن بعد)", col_pending_receive: "بانتظار الاستلام",
    incoming_empty: "لا شيء متأخر من المصنع.",

    stock_title: "مخزون العهدة", stock_search_ph: "ابحث بالكود أو المجموعة أو اللون...",
    col_held_for: "محجوز لـ (الموزع / صالة العرض)", col_qty_in_warehouse: "الكمية في المخزن",
    stock_empty: "لا توجد نتائج مطابقة في المخزن.",

    dismiss_request_title: "طلب صرف (إخراج عينات من المخزن)",
    dismiss_request_help: "لا يخرج شيء من مخزن وسط البلد - سواء عرض جديد أو نقل بين التجار - بدون موافقة.",
    dismiss_item: "صنف المخزن", dismiss_loading_stock: "جارٍ تحميل المخزون...",
    dismiss_dest_showroom: "صالة الوجهة", dismiss_dest_dist: "الموزع (لقائمة صالات العرض)",
    dismiss_qty: "الكمية", dismiss_reason: "السبب", dismiss_reason_ph: "مثال: تجهيز فرع جديد، إضافة، استبدال",
    dismiss_submit: "طلب الصرف", dismiss_list_title: "طلبات الصرف",
    status_pending: "قيد المراجعة", status_approved: "موافق", status_rejected: "مرفوض", filter_all: "الكل",
    col_dest: "الوجهة", col_reason: "السبب", tag_reassignment: "إعادة توزيع",
    dismiss_place_btn: "وضع في صالة العرض", dismiss_none: "لا توجد طلبات صرف هنا.",
    dismiss_no_stock: "لا توجد كمية متاحة", dismiss_requested_msg: "تم طلب الصرف - بانتظار موافقة المدير",
    dismiss_fill_all: "املأ الصنف وصالة العرض والكمية", dismiss_approved_msg: "تمت الموافقة على الصرف",
    dismiss_rejected_msg: "تم رفض الصرف", dismiss_placed_msg: "تم وضع العينة في صالة العرض",
    dismiss_dup_confirm: "\n\nهل تريد وضعها مع ذلك؟",

    returns_title: "تسجيل مرتجع من صالة عرض", returns_empty: "لا شيء معروض حالياً في هذه الصالة.",
    returns_qty: "الكمية المرتجعة", returns_restocked: "هل أعيدت للمخزن؟",
    returns_restock_yes: "نعم - رجعت لمخزون المخزن", returns_restock_no: "لا - تم إتلافها / إرسالها للإصلاح",
    returns_btn: "تسجيل المرتجع", returns_recorded: "تم تسجيل المرتجع",
    returns_summary: "الكمية {q}، وضعت في {d}",

    history_title: "الأرشيف التاريخي", history_showroom_optional: "صالة العرض (اختياري - لتضييق النتائج لصالة واحدة)",
    history_all_showrooms: "كل الصالات", history_showrooms_count: "صالة عرض:",
    history_currently_displayed: "المعروض حالياً هنا", history_none_displayed: "لا شيء معروض حالياً.",
    history_timeline: "الخط الزمني", history_none: "لا يوجد أرشيف بعد.",
    history_since: "منذ {d}",

    products_title: "قاعدة بيانات المنتجات", products_import: "استيراد / تحديث من Excel",
    products_search_ph: "ابحث بالكود أو المجموعة أو الاستخدام أو اللون...", products_add: "+ إضافة منتج",
    col_kind: "النوع", col_application: "الاستخدام", col_price: "السعر",
    products_delist: "إيقاف", products_delist_confirm: "إيقاف هذا المنتج؟ سيظل ظاهراً في الأرشيف ولكن لن يمكن اختياره في طلبات جديدة.",
    products_delisted: "تم الإيقاف", products_import_result: "تم الاستيراد: {c} جديد، {u} محدّث",
    modal_add_product: "إضافة منتج", modal_edit_product: "تعديل منتج", m_code: "الكود",
    m_color: "اللون", m_family: "المجموعة", m_kind: "النوع", m_application: "الاستخدام",
    m_desc_en: "الوصف (إنجليزي)", m_desc_ar: "الوصف (عربي)", m_price: "السعر",
    m_dummy_default: "دمي افتراضياً", msg_code_required: "الكود مطلوب",

    dist_title: "الموزعون والتجار", dist_add: "+ إضافة موزع / تاجر",
    dist_add_showroom: "+ صالة عرض", dist_loading_showrooms: "جارٍ تحميل صالات العرض...",
    col_showroom_th: "صالة العرض", col_address: "العنوان", col_governorate: "المحافظة",
    col_phone: "الهاتف", col_min_order: "الحد الأدنى", dist_no_showrooms: "لا توجد صالات عرض بعد.",
    modal_add_dist: "إضافة موزع / تاجر", modal_edit_dist: "تعديل",
    m_name: "الاسم", m_type: "النوع", type_distributor: "موزع", type_trader: "تاجر صغير",
    msg_name_required: "الاسم مطلوب",
    modal_add_room: "إضافة صالة عرض", modal_edit_room: "تعديل صالة العرض",
    m_address: "العنوان", m_area: "المنطقة", m_moq: "الحد الأدنى للطلب (5-10)", m_contact: "الشخص المسؤول",

    users_title: "المستخدمون", users_add: "+ إضافة مستخدم",
    col_name: "الاسم", col_email: "البريد الإلكتروني", col_role: "الدور", col_area: "المنطقة",
    modal_add_user: "إضافة مستخدم", modal_edit_user: "تعديل مستخدم",
    m_email: "البريد الإلكتروني", m_role: "الدور", m_area_sales: "المنطقة (لمندوبي المبيعات)", m_phone: "الهاتف",
    m_password: "كلمة المرور", m_password_edit: "كلمة مرور جديدة (اتركها فارغة للإبقاء على الحالي)",
    msg_user_required: "الاسم والبريد وكلمة المرور مطلوبة",

    lang_switch: "English",
  },
};

// status / purpose / return-reason raw values -> translated label
const STATUS_LABELS = {
  en: {
    submitted: "Submitted", director_approved: "Director approved", director_rejected: "Director rejected",
    sent_to_factory: "Sent to factory", in_production: "In production", partially_received: "Partially received",
    fully_received: "Fully received", partially_assigned: "Partially assigned", completed: "Completed",
    cancelled: "Cancelled", pending_review: "Pending review", approved: "Approved", rejected: "Rejected",
    partially_shipped: "Partially shipped", fully_shipped: "Fully shipped", assigned: "Assigned",
    displayed: "Displayed", returned: "Returned", reassigned: "Reassigned", pending: "Pending",
  },
  ar: {
    submitted: "تم الإرسال", director_approved: "وافق عليه المدير", director_rejected: "رفضه المدير",
    sent_to_factory: "أرسل للمصنع", in_production: "قيد التصنيع", partially_received: "مستلم جزئياً",
    fully_received: "مستلم بالكامل", partially_assigned: "موزع جزئياً", completed: "مكتمل",
    cancelled: "ملغي", pending_review: "بانتظار المراجعة", approved: "موافق", rejected: "مرفوض",
    partially_shipped: "مشحون جزئياً", fully_shipped: "مشحون بالكامل", assigned: "موزع",
    displayed: "معروض", returned: "مرتجع", reassigned: "أعيد توزيعه", pending: "قيد المراجعة",
  },
};

const RETURN_REASON_LABELS = {
  en: { delisted: "Delisted", defect: "Defect", shade_replacement: "Shade replacement",
        trader_issue_reassign: "Trader issue / reassign", other: "Other" },
  ar: { delisted: "أوقف المنتج", defect: "عيب", shade_replacement: "استبدال لون",
        trader_issue_reassign: "مشكلة مع التاجر / إعادة توزيع", other: "أخرى" },
};

let LANG = (localStorage.getItem("sd_lang") === "ar") ? "ar" : "en";

function t(key, vars) {
  let s = (I18N[LANG] && I18N[LANG][key] !== undefined) ? I18N[LANG][key] : (I18N.en[key] !== undefined ? I18N.en[key] : key);
  if (vars) {
    Object.keys(vars).forEach((k) => { s = s.replace(`{${k}}`, vars[k]); });
  }
  return s;
}

function statusLabel(status) {
  const table = STATUS_LABELS[LANG] || STATUS_LABELS.en;
  return table[status] || (status || "").replace(/_/g, " ");
}

function returnReasonLabel(r) {
  const table = RETURN_REASON_LABELS[LANG] || RETURN_REASON_LABELS.en;
  return table[r] || (r || "").replace(/_/g, " ");
}

function purposeLabel(p) {
  const keys = { new_stand: "purpose_new_stand", addition: "purpose_addition", replacement: "purpose_replacement", live_show: "purpose_live_show" };
  return keys[p] ? t(keys[p]) : (p || "").replace(/_/g, " ");
}

function applyDir() {
  document.documentElement.setAttribute("dir", LANG === "ar" ? "rtl" : "ltr");
  document.documentElement.setAttribute("lang", LANG);
}

function setLang(lang) {
  LANG = lang === "ar" ? "ar" : "en";
  localStorage.setItem("sd_lang", LANG);
  applyDir();
}

applyDir();
