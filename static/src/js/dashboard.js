/** @odoo-module **/

import { Component, useState } from "@odoo/owl";
import { registry } from "@web/core/registry";

export class Dashboard extends Component {
  setup() {
    this.state = useState({
      tab: "dashboard", // Default to dashboard
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
    this.loadDashboardData = this.loadDashboardData.bind(this)
    this.getShipmentTrends = this.getShipmentTrends.bind(this)
    this.getRecentActivities = this.getRecentActivities.bind(this)
    this.getAlerts = this.getAlerts.bind(this)
  }

  toggleSubMenu(menu) {
    this.state.expanded[menu] = !this.state.expanded[menu];
  }

  async loadDashboardData() {
    try {
      // Fetch active shipments (stock.picking with state in progress)
      const shipments = await this.orm.searchCount("stock.picking", [
        ["state", "in", ["assigned", "confirmed", "waiting"]],
      ]);

      // Fetch fleet vehicles
      const vehicles = await this.orm.searchCount("fleet.vehicle", []);

      // Fetch active customers (partners with customer flag)
      const customers = await this.orm.searchCount("res.partner", [
        ["customer_rank", ">", 0],
      ]);

      // Fetch monthly revenue (account.move invoices)
      const today = new Date();
      const firstDayOfMonth = new Date(
        today.getFullYear(),
        today.getMonth(),
        1
      );
      const invoices = await this.orm.searchRead(
        "account.move",
        [
          ["move_type", "=", "out_invoice"],
          ["state", "=", "posted"],
          ["invoice_date", ">=", firstDayOfMonth.toISOString().split("T")[0]],
        ],
        ["amount_total"]
      );
      const monthlyRevenue = invoices.reduce(
        (sum, inv) => sum + inv.amount_total,
        0
      );

      // Fetch fleet status
      const fleetData = await this.orm.readGroup(
        "fleet.vehicle",
        [],
        ["vehicle_status:count"],
        ["vehicle_status"]
      );

      const totalVehicles = vehicles || 1; // Avoid division by zero
      let fleetStatus = { active: 0, maintenance: 0, idle: 0 };

      fleetData.forEach((group) => {
        const count = group.vehicle_status_count;
        const percentage = (count / totalVehicles) * 100;

        if (group.vehicle_status === "active") {
          fleetStatus.active = Math.round(percentage);
        } else if (group.vehicle_status === "maintenance") {
          fleetStatus.maintenance = Math.round(percentage);
        } else {
          fleetStatus.idle = Math.round(percentage);
        }
      });

      // Get shipment trends (last 7 days)
      const shipmentTrends = await this.getShipmentTrends(7);

      // Get recent activities
      const recentActivities = await this.getRecentActivities();

      // Get alerts
      const alerts = await this.getAlerts();

      // Update state
      Object.assign(this.state.dashboardData, {
        activeShipments: shipments,
        shipmentsChange: 12, // Calculate from historical data
        fleetVehicles: vehicles,
        fleetUtilization: 85, // Calculate based on active trips
        monthlyRevenue: monthlyRevenue / 1000000, // Convert to millions
        revenueChange: 18, // Calculate from previous month
        activeCustomers: customers,
        newCustomersThisWeek: 23, // Calculate from recent customers
        shipmentTrends: shipmentTrends,
        fleetStatus: fleetStatus,
        recentActivities: recentActivities,
        alerts: alerts,
      });
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    }
  }

  async getShipmentTrends(days) {
    // Fetch shipment data for the last N days
    const trends = [];
    const today = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];

      const count = await this.orm.searchCount("stock.picking", [
        ["scheduled_date", ">=", dateStr + " 00:00:00"],
        ["scheduled_date", "<=", dateStr + " 23:59:59"],
      ]);

      trends.push({ date: dateStr, count: count });
    }

    return trends;
  }

  async getRecentActivities() {
    const activities = [];

    // Recent shipments
    const recentPickings = await this.orm.searchRead(
      "stock.picking",
      [],
      ["name", "create_date"],
      { limit: 2, order: "create_date desc" }
    );

    recentPickings.forEach((picking) => {
      activities.push({
        id: `picking_${picking.id}`,
        icon: "📦",
        title: `New shipment created: ${picking.name}`,
        time: this.formatRelativeTime(picking.create_date),
      });
    });

    // Recent invoices
    const recentInvoices = await this.orm.searchRead(
      "account.move",
      [
        ["move_type", "=", "out_invoice"],
        ["payment_state", "=", "paid"],
      ],
      ["name", "write_date"],
      { limit: 2, order: "write_date desc" }
    );

    recentInvoices.forEach((invoice) => {
      activities.push({
        id: `invoice_${invoice.id}`,
        icon: "💰",
        title: `Invoice ${invoice.name} paid`,
        time: this.formatRelativeTime(invoice.write_date),
      });
    });

    return activities.slice(0, 4);
  }

  async getAlerts() {
    const alerts = [];

    // Vehicles due for maintenance
    const maintenanceVehicles = await this.orm.searchCount("fleet.vehicle", [
      ["vehicle_status", "=", "maintenance"],
    ]);

    if (maintenanceVehicles > 0) {
      alerts.push({
        id: "maintenance_alert",
        type: "warning",
        icon: "⚠️",
        title: `${maintenanceVehicles} vehicles due for maintenance`,
        time: "Action required",
      });
    }

    // Delayed shipments
    const delayedShipments = await this.orm.searchCount("stock.picking", [
      ["state", "in", ["assigned", "confirmed"]],
      ["scheduled_date", "<", new Date().toISOString()],
    ]);

    if (delayedShipments > 0) {
      alerts.push({
        id: "delayed_shipments",
        type: "danger",
        icon: "🚨",
        title: `${delayedShipments} delayed shipments`,
        time: "Urgent attention needed",
      });
    }

    // Pending invoices
    const pendingInvoices = await this.orm.searchCount("account.move", [
      ["move_type", "=", "out_invoice"],
      ["state", "=", "posted"],
      ["payment_state", "!=", "paid"],
    ]);

    if (pendingInvoices > 0) {
      alerts.push({
        id: "pending_invoices",
        type: "info",
        icon: "📋",
        title: `${pendingInvoices} pending invoices`,
        time: "Review required",
      });
    }

    return alerts;
  }

  formatRelativeTime(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} minutes ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hours ago`;

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} days ago`;
  }

  generateTrendPoints(trends, fillArea = false) {
    if (!trends || trends.length === 0) return "";

    const width = 400;
    const height = 200;
    const padding = 10;
    const maxValue = Math.max(...trends.map((t) => t.count), 1);

    const points = trends.map((trend, index) => {
      const x = padding + (index / (trends.length - 1)) * (width - 2 * padding);
      const y =
        height - padding - (trend.count / maxValue) * (height - 2 * padding);
      return `${x},${y}`;
    });

    if (fillArea) {
      // Add bottom corners for filled area
      const lastX = padding + (width - 2 * padding);
      return `${points.join(" ")} ${lastX},${height} ${padding},${height}`;
    }

    return points.join(" ");
  }


  toggleSubMenu(menu) {
    this.state.expanded[menu] = !this.state.expanded[menu];
  }

  async onShipmentPeriodChange(ev) {
    const days = parseInt(ev.target.value);
    const trends = await this.getShipmentTrends(days);
    this.state.dashboardData.shipmentTrends = trends;
  }

  async onFleetPeriodChange(ev) {
    // Implement fleet period change logic
    await this.loadDashboardData();
  }

  viewAllActivities(ev) {
    ev.preventDefault();
    this.action.doAction("mail.action_discuss");
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
      baseSrc = `/web#menu_id=fleet.menu_fleet_root&action=fleet.fleet_vehicle_action`;
    } else if (tab === "route_dispatch") {
      baseSrc = `/web#menu_id=fleet.menu_fleet_root&action=fleet.fleet_vehicle_log_services_act`;
    } else if (tab === "lr") {
      baseSrc = `/web#menu_id=stock.menu_stock_warehouse_mgmt&action=stock.action_picking_tree_all`;
    } else if (tab === "pod") {
      baseSrc = `/web#menu_id=fleet.menu_fleet_root&action=fleet.fleet_vehicle_log_contracts_act`;
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
