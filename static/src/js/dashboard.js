/** @odoo-module **/

import { Component, useState, onMounted, onWillUnmount } from "@odoo/owl";
import { registry } from "@web/core/registry";
import { useService } from "@web/core/utils/hooks";

export class Dashboard extends Component {
    setup() {
        this.actionService = useService("action");
        
        this.state = useState({
            tab: "overview",
            pageTitle: "Dashboard",
            sidebarVisible: true,
        });

        this.setActiveSection = this.setActiveSection.bind(this);
        
        // Hide default Odoo navbar when dashboard is active
        onMounted(() => {
            this.hideOdooNavbar();
        });
        
        onWillUnmount(() => {
            this.showOdooNavbar();
        });
    }

    hideOdooNavbar() {
        const navbar = document.querySelector('.o_main_navbar');
        if (navbar) {
            navbar.style.display = 'none';
        }
        
        // Add custom class to body for styling
        document.body.classList.add('lms-dashboard-active');
    }
    
    showOdooNavbar() {
        const navbar = document.querySelector('.o_main_navbar');
        if (navbar) {
            navbar.style.display = '';
        }
        
        document.body.classList.remove('lms-dashboard-active');
    }

    /**
     * Called when user switches section
     */
    setActiveSection(tab) {
        this.state.tab = tab;
        this.state.sidebarVisible = true;

        if (tab === "lead") {
            this.state.pageTitle = "CRM Leads";
            this.actionService.doAction(
                {
                    type: 'ir.actions.act_window',
                    res_model: 'crm.lead',
                    name: 'Leads',
                    views: [[false, 'list'], [false, 'kanban'], [false, 'form']],
                    view_mode: 'list,kanban,form',
                    domain: [],
                    context: {},
                },
                {
                    clearBreadcrumbs: false,
                    onClose: () => {
                        // Return to dashboard when action is closed
                        this.setActiveSection('overview');
                    }
                }
            );
        } else if (tab === "warehouse") {
            this.state.pageTitle = "Warehouse";
            this.actionService.doAction(
                {
                    type: 'ir.actions.act_window',
                    res_model: 'stock.picking',
                    name: 'Transfers',
                    views: [[false, 'list'], [false, 'form']],
                    view_mode: 'list,form',
                    domain: [],
                    context: {},
                },
                {
                    clearBreadcrumbs: false,
                    onClose: () => {
                        this.setActiveSection('overview');
                    }
                }
            );
        } else if (tab === "overview") {
            this.state.pageTitle = "Dashboard";
            // Just update state, stay on dashboard
        }
    }
    
    toggleSidebar() {
        this.state.sidebarVisible = !this.state.sidebarVisible;
    }
}

Dashboard.template = "lms.Dashboard";

registry.category("actions").add("lms_dashboard_client_action", Dashboard);
// /** @odoo-module **/

// import { Component, useState, onMounted, onWillUnmount } from "@odoo/owl";
// import { registry } from "@web/core/registry";

// export class Dashboard extends Component {
//     setup() {
//         this.state = useState({
//             tab: "overview",
//             iframeSrc: "",
//             pageTitle: "Dashboard",
//         });

//         // Bind methods
//         this.setActiveSection = this.setActiveSection.bind(this);

//     }


//     /**
//      * Called when user switches section
//      */
//     setActiveSection(tab) {
//     this.state.tab = tab;

//     if (tab === "lead") {
//         this.state.iframeSrc = `/web#menu_id=crm.menu_crm_root&action=crm.crm_lead_all_leads`;
//         this.state.pageTitle = "CRM Leads";
//     } else if (tab === "warehouse") {
//         this.state.iframeSrc = `/web#menu_id=stock.menu_stock_root&action=stock.action_picking_tree_all`;
//         this.state.pageTitle = "Warehouse";
//     } else {
//         this.state.iframeSrc = "";
//         this.state.pageTitle = "Dashboard";
//     }

//     // Wait for the iframe to load, then hide navbar inside it
//     setTimeout(() => {
//         const iframe = document.querySelector(".iframe-container iframe");
//         if (iframe) {
//             iframe.addEventListener("load", () => {
//                 try {
//                     const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
//                     const nav = iframeDoc.querySelector(".o_main_navbar");
//                     if (nav) nav.style.display = "none";
//                 } catch (e) {
//                     console.warn("Cannot access iframe DOM:", e);
//                 }
//             });
//         }
//     }, 300);
// }
// }

// Dashboard.template = "lms.Dashboard";
// registry.category("actions").add("lms_dashboard_client_action", Dashboard);


