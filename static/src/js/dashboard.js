/** @odoo-module **/

import { Component, useState } from "@odoo/owl";

export class LMSDashboard extends Component {
    setup() {
        this.state = useState({
            iframeSrc: null,
            openMenu: null,     // main menu open state (operations, dispatch)
            openSubMenu: null,  // secondary (fleet)
        });
    }

    /**
     * Toggle a main-level submenu (e.g., operations, dispatch)
     */
    toggleSubmenu(menuName) {
        this.state.openMenu = this.state.openMenu === menuName ? null : menuName;
    }

    /**
     * Toggle a secondary submenu (e.g., Fleet Management)
     */
    toggleSubmenu2(submenuName) {
        this.state.openSubMenu = this.state.openSubMenu === submenuName ? null : submenuName;
    }

    /**
     * Load a view inside iframe
     */
    openIframe(url) {
        this.state.iframeSrc = url;
    }

    /**
     * Return arrow icon (▸ / ▾)
     */
    getArrow(menuName, level = 1) {
        const open = level === 1 ? this.state.openMenu === menuName : this.state.openSubMenu === menuName;
        return open ? "▾" : "▸";
    }
}

Dashboard.template = "lms.Dashboard";
registry.category("actions").add("lms_dashboard_client_action", Dashboard);

// /** @odoo-module **/

// import { Component, useState } from "@odoo/owl";
// import { registry } from "@web/core/registry";

// export class Dashboard extends Component {
//     setup() {
//         this.state = useState({
//             tab: null,
//             pageTitle: "Dashboard",
//             iframeSrc: "",
//             expanded: { dispatch: false },
//         });
//     }

//     /**
//      * Toggle submenu expand/collapse state
//      */
//     toggleSubMenu(menu) {
//         this.state.expanded[menu] = !this.state.expanded[menu];
//     }

//     /**
//      * Handle sidebar section click — sets the iframe URL and updates page title
//      */
//     setActiveSection(section) {
//         const sections = {
//             lead: {
//                 title: "Lead Management",
//                 src: "/web#action=crm.crm_lead_action_pipeline&model=crm.lead&menu_id=crm.crm_menu_root",
//             },
//             warehouse: {
//                 title: "Warehouse Management",
//                 src: "/web#action=stock.menu_stock_warehouse_mgmt&model=stock.warehouse&menu_id=stock.menu_stock_root",
//             },
//             fleet: {
//                 title: "Fleet Management",
//                 src: "/web#action=fleet.fleet_vehicle_action&model=fleet.vehicle&menu_id=fleet.fleet_menu_root",
//             },
//             routes: {
//                 title: "Route Optimization",
//                 src: "/web#action=stock.action_picking_tree_all&model=stock.picking&menu_id=stock.menu_stock_root",
//             },
//             ewaybill: {
//                 title: "E-Way Bill",
//                 src:""
//                 // If you have l10n_in_edi module installed
//                 // src: "/web#action=l10n_in_ewaybill_stock.l10n_in_ewaybill_form_action&model=l10n_in_edi.ewaybill&menu_id=l10n_in_edi.menu_l10n_in_edi_root",
//             },
//             pod: {
//                 title: "Proof of Delivery (POD)",
//                 // Replace with your own model + action when you create it
//                 src: "",

//                 // src: "/web#action=lms.action_pod_tracking&model=lms.pod&menu_id=menu_lms_root",
//             },
//         };

//         const selected = sections[section];
//         if (selected) {
//             this.state.tab = section;
//             this.state.pageTitle = selected.title;
//             this.state.iframeSrc = selected.src;

//             // Hide the main Odoo navbar when iframe loads another module
//             setTimeout(() => {
//                 const navbar = document.querySelector(".o_main_navbar.d-print-none");
//                 const systray = document.querySelector(".o_menu_systray");
//                 const toggle = document.querySelector(".o_menu_toggle");
//                 if (navbar) {
//                     navbar.style.display = "none";
//                 }
//                 if (systray) {
//                     systray.style.display = "none";
//                 }
//                 if (toggle) {
//                     toggle.style.display = "none";
//                 }
//             }, 500);
//         }
//     }
// }

// // Register OWL client action
// Dashboard.template = "lms.Dashboard";
// registry.category("actions").add("lms_dashboard_client_action", Dashboard);

