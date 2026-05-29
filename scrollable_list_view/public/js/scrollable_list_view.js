(function () {

    function inject_list_scroll_styles() {
        if (window.innerWidth <= 768) return;

        const old = document.getElementById('list-scroll');
        if (old) old.remove();

        const SUBJECT_W = 200;
        const COL_W     = 180;
        const RIGHT_W   = 180;

        const style = document.createElement('style');
        style.id = 'list-scroll';
        style.innerHTML = `

            .frappe-list {
                overflow-x: auto !important;
            }

            .list-row-head,
            .list-row-container .list-row {
                display: flex !important;
                flex-wrap: nowrap !important;
                align-items: center !important;
                width: max-content !important;
                min-width: 100% !important;
                box-sizing: border-box !important;
            }

            .list-row-head .list-header-subject,
            .list-row-head .checkbox-actions,
            .list-row-container .level-left {
                display: contents !important;
            }

            .list-row-head .list-row-col,
            .list-row-container .list-row-col {
                flex: 0 0 ${COL_W}px !important;
                width: ${COL_W}px !important;
                min-width: ${COL_W}px !important;
                max-width: ${COL_W}px !important;
                overflow: hidden !important;
                text-overflow: ellipsis !important;
                white-space: nowrap !important;
                box-sizing: border-box !important;
            }

            .list-row-head .list-row-col.list-subject,
            .list-row-container .list-row-col.list-subject {
                flex: 0 0 ${SUBJECT_W}px !important;
                width: ${SUBJECT_W}px !important;
                min-width: ${SUBJECT_W}px !important;
                max-width: ${SUBJECT_W}px !important;
            }

            .list-row-head .level-right,
            .list-row-container .level-right {
                flex: 0 0 ${RIGHT_W}px !important;
                width: ${RIGHT_W}px !important;
                min-width: ${RIGHT_W}px !important;
                max-width: ${RIGHT_W}px !important;
                margin-left: auto !important;
                display: flex !important;
                align-items: center !important;
                justify-content: flex-end !important;
            }

            .list-row-head .checkbox-actions {
                display: none !important;
            }
            .list-row-head .checkbox-actions.show,
            .list-row-head .checkbox-actions[style*="display: flex"],
            .list-row-head .checkbox-actions[style*="display:flex"] {
                display: flex !important;
            }

            .list-row-container {
                width: max-content !important;
                min-width: 100% !important;
            }

            .list-row-border {
                width: 100% !important;
                margin: 0 !important;
            }

            .list-row-container:hover {
                background-color: var(--fg-color) !important;
            }

            .list-row-container:hover .list-row {
                background-color: var(--fg-color) !important;
            }


            .list-paging-area {
                position: sticky !important;
                left: 0 !important;
                width: var(--list-content-width, 100%) !important;
                max-width: 100% !important;
                background: var(--bg-color) !important;
                border-top: 1px solid var(--border-color) !important;
                z-index: 10 !important;
                padding: 8px 15px !important;
                box-sizing: border-box !important;
            }

        `;
        document.head.appendChild(style);
    }

    function remove_list_scroll_styles() {
        const old = document.getElementById('list-scroll');
        if (old) old.remove();
    }

    // Patch every doctype's listview settings dynamically via the List page constructor
    const _original_list_run = frappe.views.ListView && frappe.views.ListView.prototype.refresh;

    if (frappe.views.ListView) {
        const _orig_refresh = frappe.views.ListView.prototype.refresh;
        frappe.views.ListView.prototype.refresh = function (...args) {
            const result = _orig_refresh ? _orig_refresh.apply(this, args) : undefined;
            inject_list_scroll_styles();
            return result;
        };

        const _orig_render = frappe.views.ListView.prototype.render;
        frappe.views.ListView.prototype.render = function (...args) {
            const result = _orig_render ? _orig_render.apply(this, args) : undefined;
            inject_list_scroll_styles();
            return result;
        };
    }

    // Also catch route changes as a fallback
    $(document).on('page-change', function () {
        const route = frappe.get_route();
        if (route && route[0] === 'List') {
            inject_list_scroll_styles();
        } else {
            remove_list_scroll_styles();
        }
    });

    // Handle initial page load if already on a list view
    function on_ready(fn) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', fn);
        } else {
            fn();
        }
    }

    on_ready(function () {
        const route = frappe.get_route();
        if (route && route[0] === 'List') {
            inject_list_scroll_styles();
        }
    });

})();
