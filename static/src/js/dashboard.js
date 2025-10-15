/** @odoo-module **/

import { Component, useState } from "@odoo/owl";
import { registry } from "@web/core/registry";

export class Dashboard extends Component {
  state = useState({
    tab: "overview",
    iframeSrc:"",
    pageTitle: "",
    expanded: {
      dispatch: false,
    },
  });

  constructor() {
    super(...arguments);
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
      this.state.pageTitle = "Lead Management";
    } else if (tab === "warehouse") {
      this.state.iframeSrc = `/web#menu_id=stock.menu_stock_root&action=stock.action_warehouse_form`;
      this.state.pageTitle = "Warehouse Management";
    } else if (tab === "fleet") {
      this.state.iframeSrc = `/web#menu_id=fleet.menu_fleet_root&action=fleet.fleet_vehicle_action`;
      this.state.pageTitle = "Fleet Management";
    } else if (tab === "routes") {
      this.state.iframeSrc = `/web#menu_id=fleet.menu_fleet_root`;
      this.state.pageTitle = "Route Optimization";
    } else if (tab === "ewaybill") {
      this.state.iframeSrc = `/web#menu_id=fleet.menu_fleet_root`;
      this.state.pageTitle = "E-Way Bill";
    } else if (tab === "pod") {
      this.state.iframeSrc = `/web#menu_id=fleet.menu_fleet_root`;
      this.state.pageTitle = "POD Tracking";
    } else {
      this.state.iframeSrc = "";
      this.state.pageTitle = "Dashboard";
    }
  }
}

Dashboard.template = "lms.Dashboard";

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
