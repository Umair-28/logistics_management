/** @odoo-module **/

import { Component, useState, onWillStart } from "@odoo/owl";
import { registry } from "@web/core/registry";
import { useService } from "@web/core/utils/hooks";
import { session } from "@web/session";

export class Dashboard extends Component {
  setup() {
    this.orm = useService("orm");
    this.action = useService("action");
    this.user = session;

    this.state = useState({
      tab: "dashboard",
      iframeSrc: "",
      iframeKey: 0,
      expanded: {
        dispatch: false,
        operations: false,
        finance: false,
        reporting: false,
        sales_reporting: false,
        inventory_warehouse_reporting: false,
        packaging: false,
      },
      stats: {
        leads: { total: 0, won: 0, lost: 0, in_progress: 0 },
        warehouse: { total_products: 0, stock_value: 0, pending_transfers: 0 },
        dispatch: { active_trips: 0, pending_lr: 0, pending_pod: 0 },
        fleet: { total_vehicles: 0, active_vehicles: 0, maintenance_due: 0 },
        finance: { unpaid_invoices: 0, unpaid_amount: 0, pending_bills: 0 },
      },
      loading: true,
      userRole: null, // 'manager', 'driver', 'warehouse'
    });

    this.setActiveSection = this.setActiveSection.bind(this);
    this.toggleSubMenu = this.toggleSubMenu.bind(this);
    this.navigateTo = this.navigateTo.bind(this);
    this.hasAccess = this.hasAccess.bind(this);
    this.hasMenuAccess = this.hasMenuAccess.bind(this);

    onWillStart(async () => {
      await this.detectUserRole();
      await this.loadDashboardStats();
    });
  }

  async detectUserRole() {
    try {
      const partners = session.storeData["res.partner"];
      const selfPartnerId = session.storeData.Store.self.id;
      const currentPartner = partners.find((p) => p.id === selfPartnerId);
      const userId = currentPartner?.userId;

      console.log("Detected User:", currentPartner?.name, "| ID:", userId);

      // Default role (Admin/System User)
      this.state.userRole = "manager";

      if (!userId) {
        console.warn(
          "Could not detect user ID from session — defaulting to manager"
        );
        return;
      }

      // Fetch user groups
      const users = await this.orm.call("res.users", "search_read", [
        [["id", "=", userId]],
        ["groups_id"],
      ]);

      if (!users.length) {
        console.warn(
          "No user found with ID",
          userId,
          "— defaulting to manager"
        );
        return;
      }

      const user = users[0];

      // Fetch group names
      const groups = await this.orm.searchRead(
        "res.groups",
        [["id", "in", user.groups_id]],
        ["name"]
      );

      const groupNames = groups.map((g) => g.name.toLowerCase());
      console.log("User belongs to groups:", groupNames);

      // Detect role
      if (groupNames.some((n) => n.includes("warehouse manager"))) {
        this.state.userRole = "warehouse";
      } else if (groupNames.some((n) => n.includes("driver"))) {
        this.state.userRole = "driver";
      } else if (
        groupNames.some(
          (n) => n.includes("lms manager") || n.includes("administrator")
        )
      ) {
        this.state.userRole = "manager";
      }

      console.log("✅ Role detected:", this.state.userRole);
    } catch (error) {
      console.error("Error detecting role:", error);
      this.state.userRole = "manager"; // Always safe fallback
    }
  }

  hasAccess(section) {
    const role = this.state.userRole;

    if (role === "manager") return true; // full access

    if (role === "driver") {
      const driverSections = [
        "dashboard",
        "trip_sheet",
        "route_dispatch",
        "lr",
        "pod",
        "ewaybill",
        "fleet_overview",
        "vehicle_costs",
        "odoometer",
        "route_optimization",
      ];
      return driverSections.includes(section);
    }

    if (role === "warehouse") {
      const warehouseSections = [
        "dashboard",
        "warehouse",
        "packages",
        "package_types",
        "packaging",
        "finance_overview",
        "customer_invoices",
        "customer_credit_notes",
        "customer_payments",
        "accounting_journals",
        "accounting_journals_entries",
        "vendor_payments",
        "contract",
        "overview",
        "warehouse_analysis",
        "rfq",
      ];
      return warehouseSections.includes(section);
    }

    return false;
  }

  hasMenuAccess(menu) {
    const role = this.state.userRole;

    if (role === "manager") return true;

    if (role === "driver") {
      return ["dispatch", "operations"].includes(menu);
    }

    if (role === "warehouse") {
      return ["packaging", "finance", "reporting"].includes(menu);
    }

    return false;
  }

  async loadDashboardStats() {
    try {
      this.state.loading = true;

      // Load stats based on role
      if (this.hasAccess("lead")) {
        await this.loadLeadStats();
      }

      if (this.hasAccess("warehouse")) {
        await this.loadWarehouseStats();
      }

      if (this.hasAccess("trip_sheet")) {
        await this.loadDispatchStats();
      }

      if (this.hasAccess("fleet_overview")) {
        await this.loadFleetStats();
      }

      if (this.hasAccess("finance_overview")) {
        await this.loadFinanceStats();
      }
    } catch (error) {
      console.error("Error loading dashboard stats:", error);
    } finally {
      this.state.loading = false;
    }
  }

  async loadLeadStats() {
    try {
      const stages = await this.orm.searchRead("crm.stage", [], ["id", "name"]);
      const normalizeName = (nameField) => {
        if (typeof nameField === "string") return nameField;
        if (nameField && typeof nameField === "object") {
          return nameField.en_US || Object.values(nameField)[0];
        }
        return "";
      };

      const wonStage = stages.find((s) => normalizeName(s.name) === "Won");
      const lostStage = stages.find((s) => normalizeName(s.name) === "Lost");

      const [totalLeads, wonLeads, lostLeads] = await Promise.all([
        this.orm.searchCount("crm.lead", []),
        wonStage
          ? this.orm.searchCount("crm.lead", [["stage_id", "=", wonStage.id]])
          : 0,
        lostStage
          ? this.orm.searchCount("crm.lead", [["stage_id", "=", lostStage.id]])
          : 0,
      ]);

      this.state.stats.leads = {
        total: totalLeads,
        won: wonLeads,
        lost: lostLeads,
        in_progress: totalLeads - wonLeads - lostLeads,
      };
    } catch (error) {
      console.error("Error loading lead stats:", error);
    }
  }

  async loadWarehouseStats() {
    try {
      const [totalProducts, pendingTransfers] = await Promise.all([
        this.orm.searchCount("product.product", []),
        this.orm.searchCount("stock.picking", [
          ["state", "in", ["assigned", "confirmed", "waiting"]],
        ]),
      ]);

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
    } catch (error) {
      console.error("Error loading warehouse stats:", error);
    }
  }

  async loadDispatchStats() {
    try {
      const [activeTrips, pendingLR, pendingPOD] = await Promise.all([
        this.orm.searchCount("trip.sheet", [["status", "=", "in_progress"]]),
        this.orm.searchCount("lorry.receipt", [["status", "=", "draft"]]),
        this.orm.searchCount("proof.delivery", [["status", "=", "draft"]]),
      ]);

      this.state.stats.dispatch = {
        active_trips: activeTrips,
        pending_lr: pendingLR,
        pending_pod: pendingPOD,
      };
    } catch (e) {
      console.log("LMS module not available or no dispatch data");
    }
  }

  async loadFleetStats() {
    try {
      const [totalVehicles, activeVehicles] = await Promise.all([
        this.orm.searchCount("fleet.vehicle", []),
        this.orm.searchCount("fleet.vehicle", [["active", "=", true]]),
      ]);

      this.state.stats.fleet = {
        total_vehicles: totalVehicles,
        active_vehicles: activeVehicles,
        maintenance_due: totalVehicles - activeVehicles,
      };
    } catch (error) {
      console.error("Error loading fleet stats:", error);
    }
  }

  async loadFinanceStats() {
    try {
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
      console.error("Error loading finance stats:", error);
    }
  }

  navigateTo(tab) {
    if (this.hasAccess(tab)) {
      this.setActiveSection(tab);
    } else {
      alert("You don't have permission to access this section");
    }
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
    if (this.hasMenuAccess(menu)) {
      this.state.expanded[menu] = !this.state.expanded[menu];
    }
  }

  setActiveSection(tab) {
    if (!this.hasAccess(tab)) {
      console.warn("Access denied to:", tab);
      return;
    }

    console.log("Selected TAB is", tab);
    this.state.tab = tab;

    let baseSrc = "";

    // Map sections to URLs
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
    } else if (tab === "fleet_overview") {
      baseSrc = `/web#menu_id=fleet.menu_fleet_root&action=fleet.fleet_vehicle_action`;
    } else if (tab === "vehicle_costs") {
      baseSrc = `/web#menu_id=fleet.menu_fleet_reporting&action=fleet.fleet_costs_reporting_action`;
    } else if (tab === "odoometer") {
      baseSrc = `/web#menu_id=fleet.menu_fleet_root&action=fleet.fleet_vehicle_odometer_action`;
    } else if (tab === "route_optimization") {
      baseSrc = `/web#menu_id=stock.menu_stock_warehouse_mgmt&action=stock.action_routes_form`;
    } else if (tab === "rfq") {
      baseSrc = `/web#menu_id=purchase.menu_purchase_root&action=purchase.purchase_rfq`;
    } else if (tab === "finance_overview") {
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
    } else if (tab === "contract") {
      baseSrc = `/web#action=lms.action_logistics_contract`;
    } else if (tab === "packages") {
      baseSrc = `/web#menu_id=stock.menu_stock_root&action=stock.action_package_view&view_type=kanban`;
    }else if(tab === "package_types"){
      baseSrc = `/web#menu_id=stock.menu_stock_root&action=stock.action_package_type_view`;
    } else if(tab === "packaging"){
      baseSrc = `/web#menu_id=stock.menu_stock_root&action=product.action_packaging_view&view_type=list`;
    }
    else if (tab === "dashboard") {
      baseSrc = "";
    }

    if (baseSrc) {
      this.state.iframeSrc = baseSrc;
      this.state.iframeKey += 1;
      console.log("NEW IFRAME KEY:", this.state.iframeKey, "SRC:", baseSrc);
    } else {
      this.state.iframeSrc = "";
    }

    // Iframe cleanup
    setTimeout(() => {
      const iframe = document.querySelector(".iframe-container iframe");
      if (!iframe) return;

      iframe.addEventListener("load", () => {
        try {
          const iframeDoc =
            iframe.contentDocument || iframe.contentWindow.document;
          const applyCleanup = () => {
            if (!iframeDoc.head) return;
            if (!iframeDoc.getElementById("hide-odoo-ui-style")) {
              const style = iframeDoc.createElement("style");
              style.id = "hide-odoo-ui-style";
              style.textContent = `
                .o_menu_systray, .o_web_client .o_navbar_apps_menu {
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

// OLD WORKING CODE

// /** @odoo-module **/

// import { Component, useState, onWillStart } from "@odoo/owl";
// import { registry } from "@web/core/registry";
// import { useService } from "@web/core/utils/hooks";

// export class Dashboard extends Component {
//   setup() {
//     this.orm = useService("orm");
//     this.action = useService("action");

//     this.state = useState({
//       tab: "dashboard", // Default to dashboard
//       iframeSrc: "",
//       iframeKey: 0,
//       expanded: {
//         dispatch: false,
//         operations: false,
//         finance: false,
//         reporting: false,
//         sales_reporting: false,
//         inventory_warehouse_reporting: false,
//       },
//       stats: {
//         leads: {
//           total: 0,
//           won: 0,
//           lost: 0,
//           in_progress: 0,
//         },
//         warehouse: {
//           total_products: 0,
//           stock_value: 0,
//           pending_transfers: 0,
//         },
//         dispatch: {
//           active_trips: 0,
//           pending_lr: 0,
//           pending_pod: 0,
//         },
//         fleet: {
//           total_vehicles: 0,
//           active_vehicles: 0,
//           maintenance_due: 0,
//         },
//         finance: {
//           unpaid_invoices: 0,
//           unpaid_amount: 0,
//           pending_bills: 0,
//         },
//       },
//       loading: true,
//     });

//     this.setActiveSection = this.setActiveSection.bind(this);
//     this.toggleSubMenu = this.toggleSubMenu.bind(this);
//     this.navigateTo = this.navigateTo.bind(this);

//     onWillStart(async () => {
//       await this.loadDashboardStats();
//     });
//   }

//   async loadDashboardStats() {
//     try {
//       this.state.loading = true;

//       // 1. Fetch all stages
//       const stages = await this.orm.searchRead("crm.stage", [], ["id", "name"]);

//       // 2. Normalize translated names (handle en_US or fallback)
//       const normalizeName = (nameField) => {
//         if (typeof nameField === "string") return nameField;
//         if (nameField && typeof nameField === "object") {
//           // Get first available translation (e.g., en_US)
//           return nameField.en_US || Object.values(nameField)[0];
//         }
//         return "";
//       };

//       // 3. Find matching stages by name
//       const wonStage = stages.find((s) => normalizeName(s.name) === "Won");
//       const lostStage = stages.find((s) => normalizeName(s.name) === "Lost");

//       // 4. Count leads
//       const [totalLeads, wonLeads, lostLeads] = await Promise.all([
//         this.orm.searchCount("crm.lead", []),
//         wonStage
//           ? this.orm.searchCount("crm.lead", [["stage_id", "=", wonStage.id]])
//           : 0,
//         lostStage
//           ? this.orm.searchCount("crm.lead", [["stage_id", "=", lostStage.id]])
//           : 0,
//       ]);

//       // 5. Build stats object
//       this.state.stats.leads = {
//         total: totalLeads,
//         won: wonLeads,
//         lost: lostLeads,
//         in_progress: totalLeads - wonLeads - lostLeads,
//       };

//       // 3. Build state
//       this.state.stats.leads = {
//         total: totalLeads,
//         won: wonLeads,
//         lost: lostLeads,
//         in_progress: totalLeads - wonLeads - lostLeads,
//       };

//       // Load Warehouse Stats
//       const [totalProducts, pendingTransfers] = await Promise.all([
//         this.orm.searchCount("product.product", []),
//         this.orm.searchCount("stock.picking", [
//           ["state", "in", ["assigned", "confirmed", "waiting"]],
//         ]),
//       ]);

//       // Get total stock value (sum of product quantities * cost)
//       const stockQuants = await this.orm.readGroup(
//         "stock.quant",
//         [["quantity", ">", 0]],
//         ["quantity:sum", "value:sum"],
//         []
//       );

//       this.state.stats.warehouse = {
//         total_products: totalProducts,
//         stock_value: stockQuants.length > 0 ? stockQuants[0].value : 0,
//         pending_transfers: pendingTransfers,
//       };

//       // Load Dispatch Stats (if lms module exists)
//       try {
//         const [activeTrips, pendingLR, pendingPOD] = await Promise.all([
//           this.orm.searchCount("trip.sheet", [
//             ["status", "=", "in_progress"],
//           ]),
//           this.orm.searchCount("lorry.receipt", [["status", "=", "draft"]]),
//           this.orm.searchCount("proof.delivery", [["status", "=", "draft"]]),
//         ]);

//         this.state.stats.dispatch = {
//           active_trips: activeTrips,
//           pending_lr: pendingLR,
//           pending_pod: pendingPOD,
//         };
//       } catch (e) {
//         console.log("LMS module not available");
//       }

//       // Load Fleet Stats
//       const [totalVehicles, activeVehicles] = await Promise.all([
//         this.orm.searchCount("fleet.vehicle", []),
//         this.orm.searchCount("fleet.vehicle", [["active", "=", true]]),
//       ]);

//       this.state.stats.fleet = {
//         total_vehicles: totalVehicles,
//         active_vehicles: activeVehicles,
//         maintenance_due: totalVehicles - activeVehicles,
//       };

//       // Load Finance Stats
//       const unpaidInvoices = await this.orm.searchRead(
//         "account.move",
//         [
//           ["move_type", "=", "out_invoice"],
//           ["state", "=", "posted"],
//           ["payment_state", "in", ["not_paid", "partial"]],
//         ],
//         ["amount_residual"]
//       );

//       const unpaidBills = await this.orm.searchCount("account.move", [
//         ["move_type", "=", "in_invoice"],
//         ["state", "=", "posted"],
//         ["payment_state", "in", ["not_paid", "partial"]],
//       ]);

//       const totalUnpaid = unpaidInvoices.reduce(
//         (sum, inv) => sum + inv.amount_residual,
//         0
//       );

//       this.state.stats.finance = {
//         unpaid_invoices: unpaidInvoices.length,
//         unpaid_amount: totalUnpaid,
//         pending_bills: unpaidBills,
//       };
//     } catch (error) {
//       console.error("Error loading dashboard stats:", error);
//     } finally {
//       this.state.loading = false;
//     }
//   }

//   navigateTo(tab) {
//     this.setActiveSection(tab);
//   }

//   formatCurrency(amount) {
//     return new Intl.NumberFormat("en-US", {
//       style: "currency",
//       currency: "USD",
//       minimumFractionDigits: 0,
//       maximumFractionDigits: 0,
//     }).format(amount);
//   }

//   toggleSubMenu(menu) {
//     this.state.expanded[menu] = !this.state.expanded[menu];
//   }

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
//     } else if (tab === "vendor_payments") {
//       baseSrc = `/web#menu_id=account.menu_account_root&action=account.action_move_in_invoice_type`;
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

//     else if(tab === "contract"){
//       baseSrc = `/web#action=lms.action_logistics_contract`;

//     }

//     // Dashboard
//     else if (tab === "dashboard") {
//       baseSrc = "";
//     }

//     // Default
//     else {
//       baseSrc = "";
//     }

//     // Force complete iframe recreation by incrementing key
//     if (baseSrc) {
//       this.state.iframeSrc = baseSrc;
//       this.state.iframeKey += 1;
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

//           applyCleanup();

//           const observer = new MutationObserver(() => applyCleanup());
//           observer.observe(iframeDoc, { childList: true, subtree: true });

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
