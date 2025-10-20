/** @odoo-module **/

import { Component, useState } from "@odoo/owl";
import { registry } from "@web/core/registry";

export class Dashboard extends Component {
  setup() {
    this.state = useState({
      tab: "overview",
      iframeSrc: "",
      expanded: {
        dispatch: false,
        operations: false,
        finance: false,
      },
    });

    // Ensure methods have correct context
    this.setActiveSection = this.setActiveSection.bind(this);
    this.toggleSubMenu = this.toggleSubMenu.bind(this);
  }

  toggleSubMenu(menu) {
    this.state.expanded[menu] = !this.state.expanded[menu];
  }

  setActiveSection(tab) {
    this.state.tab = tab;
    if (tab === "lead") {
      this.state.iframeSrc = `/web#action=crm.crm_lead_action_pipeline&menu_id=crm.menu_crm_root`;
    } else if (tab === "warehouse") {
      this.state.iframeSrc = `/web#menu_id=stock.menu_stock_root&action=stock.action_warehouse_form`;
    } else if (tab === "trip_sheet") {
      this.state.iframeSrc = `/web#menu_id=fleet.menu_fleet_root&action=fleet.fleet_vehicle_action`;
    } else if (tab === "route_dispatch") {
      this.state.iframeSrc = `/web#menu_id=fleet.menu_fleet_root&action=fleet.fleet_vehicle_log_services_act`;
    } else if (tab === "lr") {
      this.state.iframeSrc = `/web#menu_id=stock.menu_stock_warehouse_mgmt&action=stock.action_picking_tree_all`;
    } else if (tab === "pod") {
      this.state.iframeSrc = `/web#menu_id=fleet.menu_fleet_root&action=fleet.fleet_vehicle_log_contracts_act`;
    } else if (tab === "ewaybill") {
      this.state.iframeSrc = `/web#menu_id=account.menu_finance&action=account.action_account_moves_all`;
    } else if (tab === "dispatch_reports") {
      this.state.iframeSrc = `/web#menu_id=fleet.menu_fleet_reporting&action=fleet.action_fleet_report_all`;
    }

    // Logistics Operations (Fleet, Routes, etc.)
    else if (tab === "fleet_overview") {
      this.state.iframeSrc = `/web#menu_id=fleet.menu_fleet_root&action=fleet.fleet_vehicle_action`;
    } else if (tab === "vehicle_costs") {
      this.state.iframeSrc = `/web#menu_id=fleet.menu_fleet_reporting&action=fleet.fleet_costs_reporting_action`;
    } else if (tab === "odoometer") {
      this.state.iframeSrc = `/web#menu_id=fleet.menu_fleet_root&action=fleet.fleet_vehicle_odometer_action`;
    } else if (tab === "route_optimization") {
      this.state.iframeSrc = `/web#menu_id=stock.menu_stock_warehouse_mgmt&action=stock.action_routes_form`;
    } else if (tab === "fleet_reports") {
      this.state.iframeSrc = `/web#menu_id=fleet.menu_fleet_reporting&action=fleet.action_fleet_report_all`;
    }

    // RFQs
    else if (tab === "rfq") {
      this.state.iframeSrc = `/web#menu_id=purchase.menu_purchase_root&action=purchase.purchase_rfq`;
    }

    //FINANCE AND ACCOUNTING
    else if (tab === "finance_overview") {
      this.state.iframeSrc = `/web#menu_id=account.menu_account_root&action=account.open_account_journal_dashboard_kanban`;
    } else if (tab === "customer_invoices") {
      this.state.iframeSrc = `/web#menu_id=account.menu_account_root&action=account.action_move_out_invoice_type`;
    } else if (tab === "customer_credit_notes") {
      this.state.iframeSrc = `/web#menu_id=account.menu_account_root&action=account.action_move_out_refund_type`;
    } else if (tab === "customer_payments") {
      this.state.iframeSrc = `/web#menu_id=account.menu_account_root&action=account.action_account_payments`;
    } else if (tab === "accounting_journals") {
      this.state.iframeSrc = `/web#menu_id=account.menu_account_root&action=account.action_account_journal_form`;
    } else if (tab === "accounting_journals_entries") {
      this.state.iframeSrc = `/web#menu_id=account.menu_account_root&action=account.action_move_journal_line`;
    }

    // Default
    else {
      this.state.iframeSrc = "";
    }

    setTimeout(() => {
      const iframe = document.querySelector(".iframe-container iframe");
      if (!iframe) return;

      // Remove old listeners to prevent stacking
      iframe.replaceWith(iframe.cloneNode(true));
      const newIframe = document.querySelector(".iframe-container iframe");

      newIframe.addEventListener("load", () => {
        console.log("Iframe loaded, starting UI cleanup...");

        try {
          const iframeDoc =
            newIframe.contentDocument || newIframe.contentWindow.document;

          const applyCleanup = () => {
            if (!iframeDoc.head) return;

            // Inject cleanup CSS once
            if (!iframeDoc.getElementById("hide-odoo-ui-style")) {
              const style = iframeDoc.createElement("style");
              style.id = "hide-odoo-ui-style";
              style.textContent = `
            .o_menu_systray,
            .o_main_navbar,
            .o_control_panel,
            .o_searchview,
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

          // Observe DOM changes for late-loaded UI
          const observer = new MutationObserver(() => applyCleanup());
          observer.observe(iframeDoc, { childList: true, subtree: true });

          // Stop observing after 10 seconds
          setTimeout(() => observer.disconnect(), 10000);
        } catch (err) {
          console.warn("⚠️ Could not access iframe content:", err);
        }
      });
    }, 500);
  }
}

Dashboard.template = "lms.Dashboard";

// Register in Odoo action registry
registry.category("actions").add("lms_dashboard_client_action", Dashboard);

// /** @odoo-module **/

// import { Component, useState, onMounted } from "@odoo/owl";
// import { registry } from "@web/core/registry";
// import { useService } from "@web/core/utils/hooks";

// export class Dashboard extends Component {
//     setup() {
//     this.action = useService("action");
//     this.state = useState({ tab: "lead" });

//     // Bind selectTab
//     this.selectTab = this.selectTab.bind(this);
// }

//     async selectTab(tab) {
//         this.state.tab = tab;

//         // Load CRM app dynamically when Lead is clicked
//         if (tab === "lead") {
//             await this.action.doAction({
//                 type: "ir.actions.act_window",
//                 name: "Leads",
//                 res_model: "crm.lead",
//                 views: [[false, "list"], [false, "form"]],
//                 target: "current",
//             });
//         }

//         // Similarly, you can define actions for others later, e.g.:
//         // if (tab === "warehouse") { await this.action.doAction('stock.action_picking_tree_all'); }
//         // if (tab === "finance") { await this.action.doAction('account.action_move_journal_line'); }
//     }
// }

// Dashboard.template = "lms.Dashboard";

// registry.category("actions").add("lms_dashboard_client_action", Dashboard);

// /** @odoo-module **/

// import { Component, useState } from "@odoo/owl";
// import { registry } from "@web/core/registry";

// export class Dashboard extends Component {
//     setup() {
//         this.state = useState({ tab: "lead" }); // Default tab
//     }

//     selectTab(tab) {
//         this.state.tab = tab;
//     }
// }

// Dashboard.template = "lms.Dashboard";

// registry.category("actions").add("lms_dashboard_client_action", Dashboard);
