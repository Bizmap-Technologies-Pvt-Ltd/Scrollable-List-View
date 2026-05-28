/**
 * id_first_listview.js — Frappe v15
 *
 * Places the ID (name) column at position 2 — immediately AFTER the
 * title/subject column — in both the header and every data row,
 * including after refresh / pagination / filter changes.
 *
 * Column order result:
 *   [checkbox] [Customer / Title]  [ID]  [Status]  [other cols...]
 *       0             1              2       3
 */

(function () {
    "use strict";

    // ─── HEADER ───────────────────────────────────────────────────────────────────

    function move_header() {
        var head = document.querySelector(".list-row-head");
        if (!head) return;

        // .list-subject is the title/Customer col — ID goes AFTER this
        var anchor = head.querySelector(".list-row-col.list-subject");
        if (!anchor) return;

        // Find ID col by its [data-fieldname="name"] sortable span
        var id_col = null;
        var sortable = head.querySelector("[data-fieldname='name']");
        if (sortable) id_col = sortable.closest(".list-row-col");

        // Fallback: non-subject col whose visible text is "ID"
        if (!id_col) {
            Array.from(head.querySelectorAll(".list-row-col")).some(function (col) {
                if (col.classList.contains("list-subject")) return false;
                var t = col.textContent.trim().replace(/[\u200b\s]/g, "");
                if (t === "ID" || t === "Id") { id_col = col; return true; }
            });
        }

        if (!id_col || id_col === anchor) return;
        if (anchor.nextSibling === id_col) return; // already in place

        // Insert id_col immediately AFTER .list-subject
        anchor.parentNode.insertBefore(id_col, anchor.nextSibling);
    }

    // ─── DATA ROW ─────────────────────────────────────────────────────────────────

    function move_data_row(row) {
        // .list-subject is the title cell — ID value goes AFTER this
        var anchor = row.querySelector(".list-row-col.list-subject");
        if (!anchor) return;

        var cols = Array.from(row.querySelectorAll(".list-row-col"));
        var id_col = null;

        // Strategy 1: col with <a data-name="…">
        for (var i = 0; i < cols.length; i++) {
            if (cols[i] === anchor) continue;
            if (cols[i].querySelector("a[data-name]")) { id_col = cols[i]; break; }
        }

        // Strategy 2: col with <a href="/app/doctype/recordname">
        if (!id_col) {
            for (var i = 0; i < cols.length; i++) {
                if (cols[i] === anchor) continue;
                var a = cols[i].querySelector("a[href]");
                if (a && /^\/app\/[^/]+\/.+/.test(a.getAttribute("href"))) {
                    id_col = cols[i]; break;
                }
            }
        }

        // Strategy 3: first non-subject, non-checkbox col
        if (!id_col) {
            for (var i = 0; i < cols.length; i++) {
                if (cols[i] === anchor) continue;
                if (cols[i].querySelector("input[type='checkbox']") &&
                    !cols[i].textContent.trim()) continue;
                id_col = cols[i]; break;
            }
        }

        if (!id_col || id_col === anchor) return;
        if (anchor.nextSibling === id_col) return; // already in place

        // Insert AFTER .list-subject
        anchor.parentNode.insertBefore(id_col, anchor.nextSibling);
    }

    // ─── RUN ON WHOLE LIST ────────────────────────────────────────────────────────

    function move_all() {
        move_header();
        document.querySelectorAll(".list-row-container .list-row").forEach(move_data_row);
    }

    // ─── MUTATIONOBSERVER ─────────────────────────────────────────────────────────

    var _observer = null;
    var _timer    = null;

    function schedule_move(ms) {
        clearTimeout(_timer);
        _timer = setTimeout(move_all, ms != null ? ms : 80);
    }

    function attach_observer() {
        if (_observer) { _observer.disconnect(); _observer = null; }
        var container = document.querySelector(".frappe-list");
        if (!container) { setTimeout(attach_observer, 200); return; }
        _observer = new MutationObserver(function (mutations) {
            var relevant = mutations.some(function (m) {
                return m.type === "childList" && m.addedNodes.length > 0;
            });
            if (relevant) schedule_move(60);
        });
        _observer.observe(container, { childList: true, subtree: true });
    }

    function detach_observer() {
        if (_observer) { _observer.disconnect(); _observer = null; }
    }

    // ─── PROTOTYPE PATCH (belt-and-suspenders) ────────────────────────────────────

    function try_patch_prototype() {
        if (
            typeof frappe === "undefined" ||
            !frappe.views ||
            !frappe.views.ListView
        ) return false;

        var proto = frappe.views.ListView.prototype;
        if (proto.__id_first_patched__) return true;
        proto.__id_first_patched__ = true;

        function reorder(instance) {
            var cols = instance.columns;
            if (!Array.isArray(cols) || cols.length < 2) return;
            var idx = cols.findIndex(function (c) {
                return c && c.df && c.df.fieldname === "name";
            });
            // Move name col to index 1 (after the title/subject col at index 0)
            if (idx > 1) {
                var name_col = cols.splice(idx, 1)[0];
                cols.splice(1, 0, name_col);
            }
        }

        ["setup_columns", "get_columns", "render_header", "render_list", "render", "refresh"]
            .forEach(function (name) {
                if (typeof proto[name] !== "function") return;
                var orig = proto[name];
                proto[name] = function () {
                    var r = orig.apply(this, arguments);
                    reorder(this);
                    return r;
                };
            });

        return true;
    }

    // ─── EVENT WIRING ─────────────────────────────────────────────────────────────

    $(document).on("page-change", function () {
        var route = frappe.get_route();
        if (route && route[0] === "List") {
            try_patch_prototype();
            setTimeout(attach_observer, 100);
            schedule_move(250);
        } else {
            detach_observer();
        }
    });

    (function init() {
        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", init);
            return;
        }
        var route = typeof frappe !== "undefined" && frappe.get_route && frappe.get_route();
        if (route && route[0] === "List") {
            try_patch_prototype();
            setTimeout(attach_observer, 150);
            schedule_move(300);
        }
    })();

    var _polls = 0;
    (function poll() {
        if (try_patch_prototype()) return;
        if (++_polls < 60) setTimeout(poll, 200);
    })();

})();