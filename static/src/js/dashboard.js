/** @odoo-module **/

import { Component, useState, onMounted } from "@odoo/owl";
import { registry } from "@web/core/registry";

export class Dashboard extends Component {
    setup() {
        this.state = useState({
            tab: "overview",
            iframeSrc: "",
            pageTitle: "Dashboard",
        });

        this.setActiveSection = this.setActiveSection.bind(this);
        
        onMounted(() => {
            // Inject CSS to hide navbar in iframes
            this.injectIframeStyles();
        });
    }

    injectIframeStyles() {
        // Add styles to hide iframe navbar
        const style = document.createElement('style');
        style.textContent = `
            .lms-iframe-container iframe {
                width: 100%;
                height: 100%;
                border: 0;
            }
        `;
        document.head.appendChild(style);
    }

    setActiveSection(tab) {
        this.state.tab = tab;

        if (tab === "lead") {
            // Load CRM with menu_id to show the CRM menu structure
            this.state.iframeSrc = `/web#menu_id=crm.crm_menu_root&action=crm.crm_lead_all_leads`;
            this.state.pageTitle = "CRM Leads";
        } else if (tab === "warehouse") {
            // Load Warehouse with menu_id to show the warehouse menu structure
            this.state.iframeSrc = `/web#menu_id=stock.menu_stock_root&action=stock.action_picking_tree_all`;
            this.state.pageTitle = "Warehouse Management";
        } else {
            this.state.iframeSrc = "";
            this.state.pageTitle = "Dashboard";
        }

        // Wait for iframe to load and hide only the top navbar
        if (this.state.iframeSrc) {
            setTimeout(() => {
                this.hideIframeNavbar();
            }, 500);
        }
    }

    hideIframeNavbar() {
        const iframe = document.querySelector('.lms-iframe-container iframe');
        if (!iframe) return;

        // Try to access iframe content and hide only top navbar
        iframe.onload = () => {
            try {
                const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                
                // Hide ONLY the top navbar (Odoo's main app switcher bar)
                const navbar = iframeDoc.querySelector('.o_main_navbar');
                if (navbar) {
                    navbar.style.display = 'none';
                }
                
                // Adjust the webclient to account for hidden navbar
                const webclient = iframeDoc.querySelector('.o_web_client');
                if (webclient) {
                    webclient.style.paddingTop = '0';
                }
                
                // Adjust action manager positioning
                const actionManager = iframeDoc.querySelector('.o_action_manager');
                if (actionManager) {
                    actionManager.style.paddingTop = '0';
                }

                // KEEP the app menu visible (this is the CRM's own menu)
                // The menu structure is in .o_menu_sections and should remain visible
                const menuSections = iframeDoc.querySelector('.o_menu_sections');
                if (menuSections) {
                    menuSections.style.display = ''; // Keep it visible
                }

            } catch (e) {
                console.warn('Cannot access iframe content (same-origin policy):', e);
                // If same-origin fails, the URLs might be cross-domain
                // In that case, you need to ensure iframe src is from same domain
            }
        };
    }
}

Dashboard.template = "lms.Dashboard";
registry.category("actions").add("lms_dashboard_client_action", Dashboard);
// /** @odoo-module **/

// import { Component, useState, onMounted } from "@odoo/owl";
// import { registry } from "@web/core/registry";

// export class Dashboard extends Component {
//     setup() {
//         this.state = useState({
//             tab: "overview",
//             iframeSrc: "",
//             pageTitle: "Dashboard",
//         });

//         this.setActiveSection = this.setActiveSection.bind(this);
        
//         onMounted(() => {
//             // Inject CSS to hide navbar in iframes
//             this.injectIframeStyles();
//         });
//     }

//     injectIframeStyles() {
//         // Add styles to hide iframe navbar
//         const style = document.createElement('style');
//         style.textContent = `
//             .lms-iframe-container iframe {
//                 width: 100%;
//                 height: 100%;
//                 border: 0;
//             }
//         `;
//         document.head.appendChild(style);
//     }

//     setActiveSection(tab) {
//         this.state.tab = tab;

//         if (tab === "lead") {
//             // Use the web client URL with proper hash format
//             this.state.iframeSrc = `/web#action=crm.crm_lead_all_leads&model=crm.lead&view_type=list&menu_id=crm.crm_menu_root`;
//             this.state.pageTitle = "CRM Leads";
//         } else if (tab === "warehouse") {
//             this.state.iframeSrc = `/web#action=stock.action_picking_tree_all&model=stock.picking&view_type=list&menu_id=stock.menu_stock_root`;
//             this.state.pageTitle = "Warehouse Management";
//         } else {
//             this.state.iframeSrc = "";
//             this.state.pageTitle = "Dashboard";
//         }

//         // Wait for iframe to load and hide its navbar
//         if (this.state.iframeSrc) {
//             setTimeout(() => {
//                 this.hideIframeNavbar();
//             }, 500);
//         }
//     }

//     hideIframeNavbar() {
//         const iframe = document.querySelector('.lms-iframe-container iframe');
//         if (!iframe) return;

//         // Try to access iframe content and hide navbar
//         iframe.onload = () => {
//             try {
//                 const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                
//                 // Hide the main navbar
//                 const navbar = iframeDoc.querySelector('.o_main_navbar');
//                 if (navbar) {
//                     navbar.style.display = 'none';
//                 }
                
//                 // Adjust content positioning
//                 const actionManager = iframeDoc.querySelector('.o_action_manager');
//                 if (actionManager) {
//                     actionManager.style.paddingTop = '0';
//                 }

//                 // Hide any breadcrumbs if you want
//                 const breadcrumb = iframeDoc.querySelector('.o_control_panel .breadcrumb-item');
//                 if (breadcrumb && breadcrumb.textContent.trim() === 'Home') {
//                     const breadcrumbContainer = iframeDoc.querySelector('.o_control_panel .breadcrumb');
//                     if (breadcrumbContainer) {
//                         breadcrumbContainer.style.display = 'none';
//                     }
//                 }

//             } catch (e) {
//                 console.warn('Cannot access iframe content (same-origin policy):', e);
//                 // If same-origin fails, the URLs might be cross-domain
//                 // In that case, you need to ensure iframe src is from same domain
//             }
//         };
//     }
// }

// Dashboard.template = "lms.Dashboard";
// registry.category("actions").add("lms_dashboard_client_action", Dashboard);


