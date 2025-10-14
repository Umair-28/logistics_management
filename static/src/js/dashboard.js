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
     * Called when user switches section
     */
    setActiveSection(tab) {
    this.state.tab = tab;

    if (tab === "lead") {
        this.state.iframeSrc = `/web#menu_id=crm.menu_crm_root&action=crm.crm_lead_all_leads`;
        this.state.pageTitle = "CRM Leads";
    } else if (tab === "warehouse") {
        this.state.iframeSrc = `/web#menu_id=stock.menu_stock_root&action=stock.action_picking_tree_all`;
        this.state.pageTitle = "Warehouse";
    } else {
        this.state.iframeSrc = "";
        this.state.pageTitle = "Dashboard";
    }

    // Wait for the iframe to load, then hide navbar inside it
    setTimeout(() => {
        const iframe = document.querySelector(".iframe-container iframe");
        if (iframe) {
            iframe.addEventListener("load", () => {
                try {
                    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                    const nav = iframeDoc.querySelector(".o_main_navbar");
                    if (nav) nav.style.display = "none";
                } catch (e) {
                    console.warn("Cannot access iframe DOM:", e);
                }
            });
        }
    }, 300);
}
}

Dashboard.template = "lms.Dashboard";
registry.category("actions").add("lms_dashboard_client_action", Dashboard);


