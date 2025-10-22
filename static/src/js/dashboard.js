/** @odoo-module **/

import { Component, useState } from "@odoo/owl";
import { registry } from "@web/core/registry";

export class Dashboard extends Component {
  setup() {
    this.state = useState({
      tab: "lead", // Default to dashboard
      iframeSrc: "",
      iframeKey: 0, // Add key to force iframe recreation
      expanded: {
        dispatch: false,
        operations: false,
        finance: false,
        reporting: false,
        sales_reporting: false,
        inventory_warehouse_reporting: false,
      },
    });

    // Ensure proper context binding
    this.setActiveSection = this.setActiveSection.bind(this);
    this.toggleSubMenu = this.toggleSubMenu.bind(this);

  }

  toggleSubMenu(menu) {
    this.state.expanded[menu] = !this.state.expanded[menu];
  }


  /**
   * Set active section and reload iframe (forces reload with timestamp)
   */
  setActiveSection(tab) {
    console.log("Selected TAB is", tab);
    this.state.tab = tab;

    let baseSrc = "";

    // CRM / Warehouse / Dispatch
    if (tab === "lead") {
      baseSrc = `/web#action=crm.crm_lead_action_pipeline&menu_id=crm.menu_crm_root`;
    } else if (tab === "warehouse") {
      baseSrc = `/web#menu_id=stock.menu_stock_root&action=stock.action_warehouse_form`;
    } else if (tab === "trip_sheet") {
      baseSrc = `/web#menu_id=fleet.menu_fleet_root&action=lms.action_trip_sheet`;
    } else if (tab === "route_dispatch") {
      baseSrc = `/web#menu_id=fleet.menu_fleet_reporting&action=lms.action_route_dispatch`;
    } else if (tab === "lr") {
      baseSrc = `/web#menu_id=stock.menu_stock_warehouse_mgmt&action=lms.action_lorry_receipt`;
    } else if (tab === "pod") {
      baseSrc = `/web#menu_id=fleet.menu_fleet_root&action=lms.action_proof_delivery`;
    } else if (tab === "ewaybill") {
      baseSrc = `/web#menu_id=account.menu_finance&action=account.action_account_moves_all`;
    } else if (tab === "dispatch_reports") {
      baseSrc = `/web#menu_id=fleet.menu_fleet_reporting&action=fleet.action_fleet_report_all`;
    }


    // Logistics Operations (Fleet, Routes, etc.)
    else if (tab === "fleet_overview") {
      baseSrc = `/web#menu_id=fleet.menu_fleet_root&action=fleet.fleet_vehicle_action`;
    } else if (tab === "vehicle_costs") {
      baseSrc = `/web#menu_id=fleet.menu_fleet_reporting&action=fleet.fleet_costs_reporting_action`;
    } else if (tab === "odoometer") {
      baseSrc = `/web#menu_id=fleet.menu_fleet_root&action=fleet.fleet_vehicle_odometer_action`;
    } else if (tab === "route_optimization") {
      baseSrc = `/web#menu_id=stock.menu_stock_warehouse_mgmt&action=stock.action_routes_form`;
    } else if (tab === "fleet_reports") {
      baseSrc = `/web#menu_id=fleet.menu_fleet_reporting&action=fleet.action_fleet_report_all`;
    }

    // RFQs
    else if (tab === "rfq") {
      baseSrc = `/web#menu_id=purchase.menu_purchase_root&action=purchase.purchase_rfq`;
    }

    // Finance & Accounting
    else if (tab === "finance_overview") {
      baseSrc = `/web#menu_id=account.menu_account_root&action=account.open_account_journal_dashboard_kanban`;
    } else if (tab === "customer_invoices") {
      baseSrc = `/web#menu_id=account.menu_account_root&action=account.action_move_out_invoice_type`;
    } else if (tab === "customer_credit_notes") {
      baseSrc = `/web#menu_id=account.menu_account_root&action=account.action_move_out_refund_type`;
    } else if (tab === "customer_payments") {
      baseSrc = `/web#menu_id=account.menu_account_root&action=account.action_account_payments`;
    } else if (tab === "accounting_journals") {
      baseSrc = `/web#menu_id=account.menu_account_root&action=account.action_account_journal_form`;
    } else if (tab === "accounting_journals_entries") {
      baseSrc = `/web#menu_id=account.menu_account_root&action=account.action_move_journal_line`;
    }

    // Default
    else {
      baseSrc = "";
    }

    // ✅ Force complete iframe recreation by incrementing key
    if (baseSrc) {
      this.state.iframeSrc = baseSrc;
      this.state.iframeKey += 1; // This forces OWL to recreate the iframe element
      console.log("NEW IFRAME KEY:", this.state.iframeKey, "SRC:", baseSrc);
    } else {
      this.state.iframeSrc = "";
    }

    // Cleanup UI after iframe loads
    setTimeout(() => {
      const iframe = document.querySelector(".iframe-container iframe");
      if (!iframe) return;

      iframe.addEventListener("load", () => {
        console.log("Iframe loaded, starting UI cleanup...");

        try {
          const iframeDoc =
            iframe.contentDocument || iframe.contentWindow.document;

          const applyCleanup = () => {
            if (!iframeDoc.head) return;

            // Inject cleanup CSS once
            if (!iframeDoc.getElementById("hide-odoo-ui-style")) {
              const style = iframeDoc.createElement("style");
              style.id = "hide-odoo-ui-style";
              style.textContent = `
                .o_menu_systray,
                .o_web_client .o_navbar_apps_menu {
                  display: none !important;
                  visibility: hidden !important;
                }
                .o_web_client, .o_action_manager {
                  margin: 0 !important;
                  padding: 0 !important;
                  height: 100% !important;
                  overflow: auto !important;
                }
                html, body {
                  background: #fff !important;
                  height: 100% !important;
                  overflow: auto !important;
                }
              `;
              iframeDoc.head.appendChild(style);
              console.log("✅ Cleanup CSS injected.");
            }
          };

          // Run immediately if ready
          applyCleanup();

          // Observe DOM changes for dynamic re-renders
          const observer = new MutationObserver(() => applyCleanup());
          observer.observe(iframeDoc, { childList: true, subtree: true });

          // Stop observing after 10 seconds
          setTimeout(() => observer.disconnect(), 10000);
        } catch (err) {
          console.warn("⚠️ Could not access iframe content:", err);
        }
      });
    }, 300);
  }
}

Dashboard.template = "lms.Dashboard";
registry.category("actions").add("lms_dashboard_client_action", Dashboard);
// /** @odoo-module **/

// import { Component, useState } from "@odoo/owl";
// import { registry } from "@web/core/registry";

// export class Dashboard extends Component {
//   setup() {
//     this.state = useState({
//       tab: "overview",
//       iframeSrc: "",
//       iframeKey: 0, // Add key to force iframe recreation
//       expanded: {
//         dispatch: false,
//         operations: false,
//         finance: false,
//         reporting: false,
//         sales_reporting: false,
//         inventory_warehouse_reporting:false
//       },
//     });

//     // Ensure proper context binding
//     this.setActiveSection = this.setActiveSection.bind(this);
//     this.toggleSubMenu = this.toggleSubMenu.bind(this);
//   }

//   toggleSubMenu(menu) {
//     this.state.expanded[menu] = !this.state.expanded[menu];
//   }

//   /**
//    * Set active section and reload iframe (forces reload with timestamp)
//    */
//   setActiveSection(tab) {
//     console.log("Selected TAB is", tab);
//     this.state.tab = tab;

//     let baseSrc = "";

//     // CRM / Warehouse / Dispatch
//     if (tab === "lead") {
//       baseSrc = `/web#action=crm.crm_lead_action_pipeline&menu_id=crm.menu_crm_root`;
//     } else if (tab === "warehouse") {
//       baseSrc = `/web#menu_id=stock.menu_stock_root&action=stock.action_warehouse_form`;
//     } else if (tab === "trip_sheet") {
//       baseSrc = `/web#menu_id=fleet.menu_fleet_root&action=fleet.fleet_vehicle_action`;
//     } else if (tab === "route_dispatch") {
//       baseSrc = `/web#menu_id=fleet.menu_fleet_root&action=fleet.fleet_vehicle_log_services_act`;
//     } else if (tab === "lr") {
//       baseSrc = `/web#menu_id=stock.menu_stock_warehouse_mgmt&action=stock.action_picking_tree_all`;
//     } else if (tab === "pod") {
//       baseSrc = `/web#menu_id=fleet.menu_fleet_root&action=fleet.fleet_vehicle_log_contracts_act`;
//     } else if (tab === "ewaybill") {
//       baseSrc = `/web#menu_id=account.menu_finance&action=account.action_account_moves_all`;
//     } else if (tab === "dispatch_reports") {
//       baseSrc = `/web#menu_id=fleet.menu_fleet_reporting&action=fleet.action_fleet_report_all`;
//     }

//     // Logistics Operations (Fleet, Routes, etc.)
//     else if (tab === "fleet_overview") {
//       baseSrc = `/web#menu_id=fleet.menu_fleet_root&action=fleet.fleet_vehicle_action`;
//     } else if (tab === "vehicle_costs") {
//       baseSrc = `/web#menu_id=fleet.menu_fleet_reporting&action=fleet.fleet_costs_reporting_action`;
//     } else if (tab === "odoometer") {
//       baseSrc = `/web#menu_id=fleet.menu_fleet_root&action=fleet.fleet_vehicle_odometer_action`;
//     } else if (tab === "route_optimization") {
//       baseSrc = `/web#menu_id=stock.menu_stock_warehouse_mgmt&action=stock.action_routes_form`;
//     } else if (tab === "fleet_reports") {
//       baseSrc = `/web#menu_id=fleet.menu_fleet_reporting&action=fleet.action_fleet_report_all`;
//     }

//     // RFQs
//     else if (tab === "rfq") {
//       baseSrc = `/web#menu_id=purchase.menu_purchase_root&action=purchase.purchase_rfq`;
//     }

//     // Finance & Accounting
//     else if (tab === "finance_overview") {
//       baseSrc = `/web#menu_id=account.menu_account_root&action=account.open_account_journal_dashboard_kanban`;
//     } else if (tab === "customer_invoices") {
//       baseSrc = `/web#menu_id=account.menu_account_root&action=account.action_move_out_invoice_type`;
//     } else if (tab === "customer_credit_notes") {
//       baseSrc = `/web#menu_id=account.menu_account_root&action=account.action_move_out_refund_type`;
//     } else if (tab === "customer_payments") {
//       baseSrc = `/web#menu_id=account.menu_account_root&action=account.action_account_payments`;
//     } else if (tab === "accounting_journals") {
//       baseSrc = `/web#menu_id=account.menu_account_root&action=account.action_account_journal_form`;
//     } else if (tab === "accounting_journals_entries") {
//       baseSrc = `/web#menu_id=account.menu_account_root&action=account.action_move_journal_line`;
//     } else if (tab === "vendor_payments") {
//       baseSrc = `/web#menu_id=account.menu_account_root&action=account.action_account_payments_payable`;
//     } else if (tab === "sales") {
//       baseSrc = `/web#action=sale.report_all_channels_sales_action&menu_id=crm.menu_crm_root&view_type=graph`;
//     } else if (tab === "sales_persons") {
//       baseSrc = `/web#action=sale.action_order_report_salesperson&menu_id=crm.menu_crm_root&view_type=graph`;
//     } else if (tab === "sales_products") {
//       baseSrc = `/web#action=sale.action_order_report_products&menu_id=crm.menu_crm_root&view_type=graph`;
//     }
//      else if (tab === "overview") {
//       baseSrc =`/web#menu_id=stock.menu_stock_root&action=stock.stock_picking_type_action`;
//     }
//          else if (tab === "warehouse_analysis") {
//       baseSrc =`/web#menu_id=stock.menu_stock_root&action=stock_enterprise.stock_report_action_performance&view_type=graph`;
//     }

//     // Default
//     else {
//       baseSrc = "";
//     }

//     // ✅ Force complete iframe recreation by incrementing key
//     if (baseSrc) {
//       this.state.iframeSrc = baseSrc;
//       this.state.iframeKey += 1; // This forces OWL to recreate the iframe element
//       console.log("NEW IFRAME KEY:", this.state.iframeKey, "SRC:", baseSrc);
//     } else {
//       this.state.iframeSrc = "";
//     }

//     // Cleanup UI after iframe loads
//     setTimeout(() => {
//       const iframe = document.querySelector(".iframe-container iframe");
//       if (!iframe) return;

//       iframe.addEventListener("load", () => {
//         console.log("Iframe loaded, starting UI cleanup...");

//         try {
//           const iframeDoc =
//             iframe.contentDocument || iframe.contentWindow.document;

//           const applyCleanup = () => {
//             if (!iframeDoc.head) return;

//             // Inject cleanup CSS once
//             if (!iframeDoc.getElementById("hide-odoo-ui-style")) {
//               const style = iframeDoc.createElement("style");
//               style.id = "hide-odoo-ui-style";
//               style.textContent = `
//                 .o_menu_systray,
//                 .o_web_client .o_navbar_apps_menu {
//                   display: none !important;
//                   visibility: hidden !important;
//                 }
//                 .o_web_client, .o_action_manager {
//                   margin: 0 !important;
//                   padding: 0 !important;
//                   height: 100% !important;
//                   overflow: auto !important;
//                 }
//                 html, body {
//                   background: #fff !important;
//                   height: 100% !important;
//                   overflow: auto !important;
//                 }
//               `;
//               iframeDoc.head.appendChild(style);
//               console.log("✅ Cleanup CSS injected.");
//             }
//           };

//           // Run immediately if ready
//           applyCleanup();

//           // Observe DOM changes for dynamic re-renders
//           const observer = new MutationObserver(() => applyCleanup());
//           observer.observe(iframeDoc, { childList: true, subtree: true });

//           // Stop observing after 10 seconds
//           setTimeout(() => observer.disconnect(), 10000);
//         } catch (err) {
//           console.warn("⚠️ Could not access iframe content:", err);
//         }
//       });
//     }, 300);
//   }
// }

// Dashboard.template = "lms.Dashboard";
// registry
//   .category("actions")
//   .add("lms_dashboard_client_action", Dashboard);
