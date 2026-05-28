
frappe.provide("scrollable_list_view.dashboard_patch");

scrollable_list_view.dashboard_patch = {

    // ─── PART 1: Dashboard connections patch ────────────────────────────────
    patch_frm(frm) {
        if (!frm || !frm.dashboard) return;

        frm.dashboard.open_document_list = function ($link, show_open) {
            const doctype = $link.attr("data-doctype");
            if (!doctype) return;

            const names = $link.attr("data-names") || [];
            let route_options = {};

            if (
                this.internal_links_found &&
                this.internal_links_found.find((d) => d.doctype === doctype)
            ) {
                if (!names.length) return false;
                route_options = { name: ["in", names.split ? names.split(",") : names] };
            } else if (this.data.fieldname) {
                route_options = this.get_document_filter(doctype);
            }

            const slug = frappe.router.slug(doctype);
            const params = new URLSearchParams();
            Object.entries(route_options).forEach(([k, v]) => {
                params.set(k, Array.isArray(v) ? JSON.stringify(v) : v);
            });

            const qs = params.toString() ? "?" + params.toString() : "";
            window.open(`${window.location.origin}/app/${slug}${qs}`, "_blank");
        };

        frm.make_new = function (doctype) {
            const slug = frappe.router.slug(doctype);
            window.open(`${window.location.origin}/app/${slug}/new-${slug}-1`, "_blank");
        };
    },

    // ─── PART 2: Link field arrow (→) patch ─────────────────────────────────
    init_link_field_patch() {
        // Use capture phase (true as 3rd arg) so we intercept BEFORE
        // Frappe's own bubble-phase handlers fire on the element.
        // This covers:
        //   .btn-open  → the → arrow button on a saved link field
        //   Any saved link text (underlined) that is also clickable
        // Works for both main form fields AND child table link fields.

        document.addEventListener("click", function (e) {
            // ── Arrow button (→) next to a link field ──
            const btn = e.target.closest(".btn-open");
            if (btn) {
                // Walk up to the control wrapper to read doctype + value
                const $control = $(btn).closest(".frappe-control");
                const field = $control.data("fieldname") &&
                    cur_frm &&
                    scrollable_list_view.dashboard_patch.get_field_control($control);

                let doctype = null;
                let docname = null;

                if (field) {
                    doctype = field.get_options ? field.get_options() : field.df.options;
                    docname = field.get_value ? field.get_value() : field.value;
                } else {
                    // Fallback: read from sibling input
                    const $input = $control.find("input.input-with-feedback, input[data-fieldname]");
                    docname = $input.val();
                    // Try to get doctype from the control's df
                    const fieldname = $control.data("fieldname");
                    if (fieldname && cur_frm) {
                        const df = cur_frm.get_field(fieldname);
                        if (df) doctype = df.df.options;
                    }
                }

                if (doctype && docname) {
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                    const slug = frappe.router.slug(doctype);
                    const nameSlug = encodeURIComponent(docname);
                    window.open(`${window.location.origin}/app/${slug}/${nameSlug}`, "_blank");
                }
                return;
            }

            // ── Clickable saved-link text (underlined value in read mode) ──
            const linkText = e.target.closest(".control-value a, [data-fieldtype='Link'] .like-disabled-input a");
            if (linkText) {
                const href = linkText.getAttribute("href");
                if (href && href.startsWith("/app/")) {
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                    window.open(`${window.location.origin}${href}`, "_blank");
                }
            }

        }, true); // <-- capture phase: fires before any bubble-phase handler
    },

    // Helper: resolve a field control object from a jQuery wrapper
    get_field_control($control) {
        if (!cur_frm) return null;
        const fieldname = $control.data("fieldname");
        if (!fieldname) return null;

        // Main form field
        let field = cur_frm.get_field(fieldname);
        if (field) return field;

        // Child table field — search all grids
        for (const f of cur_frm.fields || []) {
            if (f.grid) {
                for (const row of (f.grid.grid_rows || [])) {
                    if (row.open_form_button) continue; // skip non-data rows
                    const cf = row.columns && row.columns[fieldname];
                    if (cf) return cf;
                    // Also try row.grid_form fields
                    if (row.grid_form && row.grid_form.fields_dict) {
                        const gf = row.grid_form.fields_dict[fieldname];
                        if (gf) return gf;
                    }
                }
            }
        }
        return null;
    }
};

// ─── Boot ────────────────────────────────────────────────────────────────────
$(document).on("app_ready", function () {

    // Patch dashboard on every form refresh
    const _original_refresh = frappe.ui.form.Form.prototype.refresh;
    frappe.ui.form.Form.prototype.refresh = function () {
        const result = _original_refresh.apply(this, arguments);
        scrollable_list_view.dashboard_patch.patch_frm(this);
        return result;
    };

    // Patch link field arrows globally (one listener covers everything)
    scrollable_list_view.dashboard_patch.init_link_field_patch();
});