/** @odoo-module **/

import { Component, useState } from "@odoo/owl";
import { registry } from "@web/core/registry";

export class Dashboard extends Component {
    setup() {
    this.state = useState({
      tab: "overview",
      iframeSrc: "",
      pageTitle: "Dashboard",
      expanded: {
        dispatch: false,
        operations: false,
      },
    });
  }

  toggleSubMenu(menu) {
    this.state.expanded[menu] = !this.state.expanded[menu];
  }

  setActiveSection(tab) {
    this.state.tab = tab;

    // Dispatch Management sections
    if (tab === "trip_sheet") {
      this.state.iframeSrc = `/web#menu_id=fleet.menu_fleet_root`;
    } else if (tab === "route_dispatch") {
      this.state.iframeSrc = `/web#menu_id=fleet.menu_fleet_root`;
    } else if (tab === "lr") {
      this.state.iframeSrc = `/web#menu_id=fleet.menu_fleet_root`;
    } else if (tab === "pod") {
      this.state.iframeSrc = `/web#menu_id=fleet.menu_fleet_root`;
    } else if (tab === "ewaybill") {
      this.state.iframeSrc = `/web#menu_id=fleet.menu_fleet_root`;
    } else if (tab === "dispatch_reports") {
      this.state.iframeSrc = `/web#menu_id=fleet.menu_fleet_root`;
    }
    // Fleet Operations sections
    else if (tab === "fleet_overview") {
      this.state.iframeSrc = `/web#menu_id=fleet.menu_fleet_root&action=fleet.fleet_vehicle_action`;
    } else if (tab === "vehicle_costs") {
      this.state.iframeSrc = `/web#menu_id=fleet.menu_fleet_root&action=fleet.fleet_costs_reporting_action`;
    } else if (tab === "odoometer") {
      this.state.iframeSrc = `/web#menu_id=fleet.menu_fleet_root&action=fleet.fleet_vehicle_odometer_action`;
    } else if (tab === "route_optimization") {
      this.state.iframeSrc = `/web#menu_id=fleet.menu_fleet_root&action=stock.action_routes_form`;
    } else {
      this.state.iframeSrc = "";
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
