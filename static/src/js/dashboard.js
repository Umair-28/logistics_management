/** @odoo-module **/

import { Component, useState, onMounted, onWillUnmount } from "@odoo/owl";
import { registry } from "@web/core/registry";
import { session } from "@web/session";

export class Dashboard extends Component {
    setup() {
        this.state = useState({
            tab: "overview",
            iframeSrc: "",
            pageTitle: "Dashboard",
        });

        this.setActiveSection = this.setActiveSection.bind(this);
        
        onMounted(() => {
            // Hide main Odoo navbar when dashboard is active
            const navbar = document.querySelector('.o_main_navbar');
            if (navbar) {
                navbar.dataset.lmsHidden = 'true';
                navbar.style.display = 'none';
            }
        });
        
        onWillUnmount(() => {
            // Restore navbar when leaving dashboard
            const navbar = document.querySelector('.o_main_navbar');
            if (navbar && navbar.dataset.lmsHidden) {
                navbar.style.display = '';
                delete navbar.dataset.lmsHidden;
            }
        });
    }

    setActiveSection(tab) {
        this.state.tab = tab;

        if (tab === "lead") {
            // For CRM in Odoo 18, use the correct menu structure
            // Try different approaches to ensure the CRM menu loads
            const menuXmlId = 'crm.crm_menu_root';  // This is the root CRM menu
            const actionXmlId = 'crm.crm_lead_all_leads';
            
            this.state.iframeSrc = `/web#cids=1&menu_id=${menuXmlId}&action=${actionXmlId}`;
            this.state.pageTitle = "CRM Leads";
            
            console.log('Loading CRM with URL:', this.state.iframeSrc);
        } else if (tab === "warehouse") {
            const menuXmlId = 'stock.menu_stock_root';
            const actionXmlId = 'stock.action_picking_tree_all';
            
            this.state.iframeSrc = `/web#cids=1&menu_id=${menuXmlId}&action=${actionXmlId}`;
            this.state.pageTitle = "Warehouse Management";
            
            console.log('Loading Warehouse with URL:', this.state.iframeSrc);
        } else {
            this.state.iframeSrc = "";
            this.state.pageTitle = "Dashboard";
        }

        // Customize iframe after a short delay
        if (this.state.iframeSrc) {
            setTimeout(() => this.setupIframeCustomization(), 500);
        }
    }

    setupIframeCustomization() {
        const iframe = document.querySelector('.lms-iframe-container iframe');
        if (!iframe) return;

        let attempts = 0;
        const maxAttempts = 20;

        const tryCustomize = () => {
            attempts++;
            
            try {
                const iframeDoc = iframe.contentDocument;
                const iframeWindow = iframe.contentWindow;
                
                if (!iframeDoc || !iframeDoc.body || !iframeDoc.querySelector('.o_web_client')) {
                    if (attempts < maxAttempts) {
                        setTimeout(tryCustomize, 300);
                    }
                    return;
                }

                // Successfully accessed iframe, now customize it
                this.injectIframeStyles(iframeDoc);
                this.forceCorrectMenu(iframeDoc, iframeWindow);

            } catch (e) {
                if (attempts < maxAttempts) {
                    setTimeout(tryCustomize, 300);
                } else {
                    console.warn('Could not customize iframe after', maxAttempts, 'attempts:', e);
                }
            }
        };

        // Start trying to customize
        iframe.onload = () => {
            attempts = 0;
            tryCustomize();
        };
    }

    injectIframeStyles(iframeDoc) {
        // Remove any existing custom styles
        const existingStyle = iframeDoc.querySelector('#lms-custom-iframe-styles');
        if (existingStyle) {
            existingStyle.remove();
        }

        // Inject new styles
        const style = iframeDoc.createElement('style');
        style.id = 'lms-custom-iframe-styles';
        style.textContent = `
            /* Hide ONLY the main Odoo navbar (app switcher bar) */
            .o_main_navbar {
                display: none !important;
            }
            
            /* Remove top padding from web client */
            body .o_web_client {
                padding-top: 0 !important;
            }
            
            /* Adjust action manager to fill space */
            .o_action_manager {
                padding-top: 0 !important;
            }
            
            /* Ensure full height */
            html, body, .o_web_client {
                height: 100% !important;
                margin: 0 !important;
            }
            
            /* Make sure app-specific menus are visible */
            .o_menu_sections,
            .o_menu_brand,
            nav.o_main_navbar ~ * {
                display: block !important;
            }
        `;
        
        iframeDoc.head.appendChild(style);
    }

    forceCorrectMenu(iframeDoc, iframeWindow) {
        // Debug: Check what's actually in the iframe
        try {
            // Check the navbar
            const navbar = iframeDoc.querySelector('.o_main_navbar');
            if (navbar) {
                console.log('Navbar found, hiding it');
            }
            
            // Check for menu sections
            const menuBrand = iframeDoc.querySelector('.o_menu_brand');
            if (menuBrand) {
                console.log('Menu brand text:', menuBrand.textContent.trim());
            }
            
            const menuSections = iframeDoc.querySelector('.o_menu_sections');
            if (menuSections) {
                console.log('Menu sections found');
                const menuItems = menuSections.querySelectorAll('button, a');
                console.log('Menu items:', Array.from(menuItems).map(item => item.textContent.trim()));
            } else {
                console.warn('No menu sections found in iframe!');
            }

            // Check what the URL hash contains
            const hash = iframeWindow.location.hash;
            console.log('Iframe URL hash:', hash);
            
            // Try to access Odoo's menu service if available
            if (iframeWindow.__owl__) {
                console.log('OWL framework found in iframe');
            }
            
        } catch (e) {
            console.warn('Error inspecting menu:', e);
        }
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


