/** @odoo-module **/

import { Component, useState, onWillStart } from "@odoo/owl";
import { registry } from "@web/core/registry";
import { useService } from "@web/core/utils/hooks";

export class Dashboard extends Component {
  setup() {
    this.orm = useService("orm");
    this.action = useService("action");

    this.state = useState({
      tab: "dashboard", // Default to dashboard
      iframeSrc: "",
      iframeKey: 0,
      expanded: {
        dispatch: false,
        operations: false,
        finance: false,
        reporting: false,
        sales_reporting: false,
        inventory_warehouse_reporting: false,
      },
      stats: {
        leads: {
          total: 0,
          won: 0,
          lost: 0,
          in_progress: 0,
        },
        warehouse: {
          total_products: 0,
          stock_value: 0,
          pending_transfers: 0,
        },
        dispatch: {
          active_trips: 0,
          pending_lr: 0,
          pending_pod: 0,
        },
        fleet: {
          total_vehicles: 0,
          active_vehicles: 0,
          maintenance_due: 0,
        },
        finance: {
          unpaid_invoices: 0,
          unpaid_amount: 0,
          pending_bills: 0,
        },
      },
      loading: true,
    });

    this.setActiveSection = this.setActiveSection.bind(this);
    this.toggleSubMenu = this.toggleSubMenu.bind(this);
    this.navigateTo = this.navigateTo.bind(this)

    onWillStart(async () => {
      await this.loadDashboardStats();
    });
  }

  async loadDashboardStats() {
    try {
      this.state.loading = true;

      // Load CRM Stats
      const [totalLeads, wonLeads, lostLeads] = await Promise.all([
        this.orm.searchCount("crm.lead", []),
        this.orm.searchCount("crm.lead", [["stage_id.name", "=", "Won"]]),
        this.orm.searchCount("crm.lead", [["stage_id.name", "=", "Failed"]]),
      ]);

      this.state.stats.leads = {
        total: totalLeads,
        won: wonLeads,
        lost: lostLeads,
        in_progress: totalLeads - wonLeads - lostLeads,
      };

      // Load Warehouse Stats
      const [totalProducts, pendingTransfers] = await Promise.all([
        this.orm.searchCount("product.product", []),
        this.orm.searchCount("stock.picking", [
          ["state", "in", ["assigned", "confirmed", "waiting"]],
        ]),
      ]);

      // Get total stock value (sum of product quantities * cost)
      const stockQuants = await this.orm.readGroup(
        "stock.quant",
        [["quantity", ">", 0]],
        ["quantity:sum", "value:sum"],
        []
      );

      this.state.stats.warehouse = {
        total_products: totalProducts,
        stock_value: stockQuants.length > 0 ? stockQuants[0].value : 0,
        pending_transfers: pendingTransfers,
      };

      // Load Dispatch Stats (if lms module exists)
      try {
        const [activeTrips, pendingLR, pendingPOD] = await Promise.all([
          this.orm.searchCount("lms.trip.sheet", [["state", "=", "in_progress"]]),
          this.orm.searchCount("lms.lorry.receipt", [["state", "=", "draft"]]),
          this.orm.searchCount("lms.proof.delivery", [["state", "=", "pending"]]),
        ]);

        this.state.stats.dispatch = {
          active_trips: activeTrips,
          pending_lr: pendingLR,
          pending_pod: pendingPOD,
        };
      } catch (e) {
        console.log("LMS module not available");
      }

      // Load Fleet Stats
      const [totalVehicles, activeVehicles] = await Promise.all([
        this.orm.searchCount("fleet.vehicle", []),
        this.orm.searchCount("fleet.vehicle", [["active", "=", true]]),
      ]);

      this.state.stats.fleet = {
        total_vehicles: totalVehicles,
        active_vehicles: activeVehicles,
        maintenance_due: totalVehicles - activeVehicles,
      };

      // Load Finance Stats
      const unpaidInvoices = await this.orm.searchRead(
        "account.move",
        [
          ["move_type", "=", "out_invoice"],
          ["state", "=", "posted"],
          ["payment_state", "in", ["not_paid", "partial"]],
        ],
        ["amount_residual"]
      );

      const unpaidBills = await this.orm.searchCount("account.move", [
        ["move_type", "=", "in_invoice"],
        ["state", "=", "posted"],
        ["payment_state", "in", ["not_paid", "partial"]],
      ]);

      const totalUnpaid = unpaidInvoices.reduce(
        (sum, inv) => sum + inv.amount_residual,
        0
      );

      this.state.stats.finance = {
        unpaid_invoices: unpaidInvoices.length,
        unpaid_amount: totalUnpaid,
        pending_bills: unpaidBills,
      };
    } catch (error) {
      console.error("Error loading dashboard stats:", error);
    } finally {
      this.state.loading = false;
    }
  }

  navigateTo(tab) {
    this.setActiveSection(tab);
  }

  formatCurrency(amount) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }

  toggleSubMenu(menu) {
    this.state.expanded[menu] = !this.state.expanded[menu];
  }

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
      baseSrc = `/web#menu_id=fleet.menu_fleet_root&action=lms.action_lorry_receipt`;
    } else if (tab === "pod") {
      baseSrc = `/web#menu_id=fleet.menu_fleet_root&action=lms.action_proof_delivery`;
    } else if (tab === "ewaybill") {
      baseSrc = `/web#menu_id=account.menu_finance&action=lms.action_eway_bill`;
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
    } else if (tab === "vendor_payments") {
      baseSrc = `/web#menu_id=account.menu_account_root&action=account.action_move_in_invoice_type`;
    } else if (tab === "sales") {
      baseSrc = `/web#action=sale.report_all_channels_sales_action&menu_id=crm.menu_crm_root&view_type=graph`;
    } else if (tab === "sales_persons") {
      baseSrc = `/web#action=sale.action_order_report_salesperson&menu_id=crm.menu_crm_root&view_type=graph`;
    } else if (tab === "sales_products") {
      baseSrc = `/web#action=sale.action_order_report_products&menu_id=crm.menu_crm_root&view_type=graph`;
    } else if (tab === "overview") {
      baseSrc = `/web#menu_id=stock.menu_stock_root&action=stock.stock_picking_type_action`;
    } else if (tab === "warehouse_analysis") {
      baseSrc = `/web#menu_id=stock.menu_stock_root&action=stock_enterprise.stock_report_action_performance&view_type=graph`;
    }

    // Dashboard
    else if (tab === "dashboard") {
      baseSrc = "";
    }

    // Default
    else {
      baseSrc = "";
    }

    // Force complete iframe recreation by incrementing key
    if (baseSrc) {
      this.state.iframeSrc = baseSrc;
      this.state.iframeKey += 1;
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

          applyCleanup();

          const observer = new MutationObserver(() => applyCleanup());
          observer.observe(iframeDoc, { childList: true, subtree: true });

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
//       tab: "lead", // Default to dashboard
//       iframeSrc: "",
//       iframeKey: 0, // Add key to force iframe recreation
//       expanded: {
//         dispatch: false,
//         operations: false,
//         finance: false,
//         reporting: false,
//         sales_reporting: false,
//         inventory_warehouse_reporting: false,
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
//       baseSrc = `/web#menu_id=fleet.menu_fleet_root&action=lms.action_trip_sheet`;
//     } else if (tab === "route_dispatch") {
//       baseSrc = `/web#menu_id=fleet.menu_fleet_reporting&action=lms.action_route_dispatch`;
//     } else if (tab === "lr") {
//       baseSrc = `/web#menu_id=fleet.menu_fleet_root&action=lms.action_lorry_receipt`;
//     } else if (tab === "pod") {
//       baseSrc = `/web#menu_id=fleet.menu_fleet_root&action=lms.action_proof_delivery`;
//     } else if (tab === "ewaybill") {
//       baseSrc = `/web#menu_id=account.menu_finance&action=lms.action_eway_bill`;
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
//     } else if (tab === "sales") {
//       baseSrc = `/web#action=sale.report_all_channels_sales_action&menu_id=crm.menu_crm_root&view_type=graph`;
//     } else if (tab === "sales_persons") {
//       baseSrc = `/web#action=sale.action_order_report_salesperson&menu_id=crm.menu_crm_root&view_type=graph`;
//     } else if (tab === "sales_products") {
//       baseSrc = `/web#action=sale.action_order_report_products&menu_id=crm.menu_crm_root&view_type=graph`;
//     } else if (tab === "overview") {
//       baseSrc = `/web#menu_id=stock.menu_stock_root&action=stock.stock_picking_type_action`;
//     } else if (tab === "warehouse_analysis") {
//       baseSrc = `/web#menu_id=stock.menu_stock_root&action=stock_enterprise.stock_report_action_performance&view_type=graph`;
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
// registry.category("actions").add("lms_dashboard_client_action", Dashboard);

