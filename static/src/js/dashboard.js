/** @odoo-module **/

import { Component, useState, onMounted, onWillUnmount } from "@odoo/owl";
import { registry } from "@web/core/registry";

export class Dashboard extends Component {
    setup() {
        this.state = useState({
            tab: "overview",
            iframeSrc: "",
            pageTitle: "Dashboard",
        });

        // Bind methods
        this.setActiveSection = this.setActiveSection.bind(this);

        // Add hooks
        onMounted(() => {
            this.toggleNavbarVisibility(false); // ensure visible by default
        });

        onWillUnmount(() => {
            this.toggleNavbarVisibility(false); // restore when leaving
        });
    }

    /**
     * Toggle nav items visibility (hide = true means hide them)
     */
    toggleNavbarVisibility(hide = true) {
        const navbar = document.querySelector(".o_main_navbar.d-print-none");
        if (!navbar) return;

        const systray = navbar.querySelector(".o_menu_systray.d-flex.flex-shrink-0.ms-auto");
        const toggleBtn = navbar.querySelector(".o_menu_toggle.border-0.hasImage");

        if (systray) systray.style.display = hide ? "none" : "";
        if (toggleBtn) toggleBtn.style.display = hide ? "none" : "";
    }

    /**
     * Called when user switches section
     */
    setActiveSection(tab) {
        this.state.tab = tab;

        if (tab === "lead") {
            this.state.iframeSrc = `/web#menu_id=crm.menu_crm_root&action=crm.crm_lead_all_leads`;
            this.toggleNavbarVisibility(true); // hide when CRM loads
        } else if (tab === "warehouse") {
            this.state.iframeSrc = `/web#menu_id=stock.menu_stock_root&action=stock.action_picking_tree_all`;
            this.toggleNavbarVisibility(false);
        } else {
            this.state.iframeSrc = "";
            this.toggleNavbarVisibility(false);
        }
    }
}

Dashboard.template = "lms.Dashboard";
registry.category("actions").add("lms_dashboard_client_action", Dashboard);


