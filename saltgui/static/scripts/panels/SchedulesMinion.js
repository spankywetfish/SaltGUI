/* global document */

import {DropDownMenu} from "../DropDown.js";
import {Output} from "../output/Output.js";
import {Panel} from "./Panel.js";
import {SchedulesPanel} from "./Schedules.js";
import {Utils} from "../Utils.js";

export class SchedulesMinionPanel extends Panel {

  constructor () {
    super("schedules-minion");

    this.addTitle("Schedules on ...");
    this.addPanelMenu();
    this.addSearchButton();
    this.addCloseButton();
    this.addTable(["Name", "-menu-", "Details"]);
    this.setTableSortable("Name", "asc");
    this.setTableClickable();
    this.addMsg();
  }

  onShow () {
    const minionId = decodeURIComponent(Utils.getQueryParam("minionid"));

    // preliminary title
    const titleElement = document.getElementById("schedules-minion-title");
    titleElement.innerText = "Schedules on " + minionId;

    const localScheduleListPromise = this.api.getLocalScheduleList(minionId);

    localScheduleListPromise.then((pLocalScheduleListData) => {
      this._handleLocalScheduleList(pLocalScheduleListData, minionId);
    }, (pLocalScheduleListMsg) => {
      this._handleLocalScheduleList(JSON.stringify(pLocalScheduleListMsg), minionId);
    });
  }

  _handleLocalScheduleList (pLocalScheduleList, pMinionId) {
    const panel = document.getElementById("schedules-minion-panel");

    if (this.showErrorRowInstead(pLocalScheduleList)) {
      return;
    }

    let schedules = pLocalScheduleList.return[0][pMinionId];
    schedules = SchedulesPanel.fixSchedulesMinion(schedules);

    const titleElement = document.getElementById("schedules-minion-title");
    let txt = "Schedules on " + pMinionId;
    if (schedules && schedules.enabled === false) {
      txt += " (disabled)";
    }
    titleElement.innerText = txt;

    const msgDiv = this.div.querySelector(".msg");
    if (schedules === undefined) {
      msgDiv.innerText = "Unknown minion '" + pMinionId + "'";
      return;
    }
    if (schedules === false) {
      msgDiv.innerText = "Minion '" + pMinionId + "' did not answer";
      return;
    }

    const minionMenu = new DropDownMenu(panel);
    this._addMenuItemScheduleEnableWhenNeeded(minionMenu, pMinionId, schedules);
    this._addMenuItemScheduleDisableWhenNeeded(minionMenu, pMinionId, schedules);

    // new menus are always added at the bottom of the div
    // fix that by re-adding it to its proper place
    panel.insertBefore(minionMenu.menuDropdown, titleElement.nextSibling);

    const keys = Object.keys(schedules.schedules).sort();
    for (const scheduleName of keys) {

      const schedule = schedules.schedules[scheduleName];

      // simplify the schedule information
      if ("name" in schedule) {
        delete schedule.name;
      }
      if (schedule.enabled === true) {
        delete schedule.enabled;
      }
      if (schedule.jid_include === true) {
        delete schedule.jid_include;
      }
      if (schedule.maxrunning === 1) {
        delete schedule.maxrunning;
      }

      const tr = document.createElement("tr");

      const nameTd = Utils.createTd("schedule-name", scheduleName);
      tr.appendChild(nameTd);

      const scheduleMenu = new DropDownMenu(tr);
      let scheduleModifyCmd = "schedule.modify " + scheduleName;
      for (const key in schedule) {
        if (key === "args") {
          scheduleModifyCmd += " job_args";
        } else if (key === "kwargs") {
          scheduleModifyCmd += " job_kwargs";
        } else {
          scheduleModifyCmd += " " + key;
        }
        scheduleModifyCmd += "=" + JSON.stringify(schedule[key]);
      }
      this._addMenuItemModifyJob(scheduleMenu, pMinionId, scheduleModifyCmd);
      this._addMenuItemScheduleEnableJobWhenNeeded(scheduleMenu, pMinionId, scheduleName, schedule);
      this._addMenuItemScheduleDisableJobWhenNeeded(scheduleMenu, pMinionId, scheduleName, schedule);
      this._addMenuItemScheduleDeleteJob(scheduleMenu, pMinionId, scheduleName);
      this._addMenuItemScheduleRunJob(scheduleMenu, pMinionId, scheduleName, schedule);

      // menu comes before this data on purpose
      const scheduleValue = Output.formatObject(schedule);
      const scheduleValueTd = Utils.createTd("schedule-value", scheduleValue);
      if (schedule.enabled === false) {
        scheduleValueTd.classList.add("schedule-disabled");
      }
      if (schedules.enabled === false) {
        scheduleValueTd.classList.add("schedule-disabled");
      }
      tr.appendChild(scheduleValueTd);

      const tbody = this.table.tBodies[0];
      tbody.appendChild(tr);

      tr.addEventListener("click", (pClickEvent) => {
        this.runCommand(pClickEvent, pMinionId, scheduleModifyCmd);
      });
    }

    txt = Utils.txtZeroOneMany(keys.length,
      "No schedules", "{0} schedule", "{0} schedules");
    msgDiv.innerText = txt;
  }

  _addMenuItemScheduleEnableWhenNeeded (pMenu, pMinionId, schedules) {
    if (schedules.enabled !== false) {
      return;
    }
    pMenu.addMenuItem("Enable&nbsp;scheduler...", (pClickEvent) => {
      this.runCommand(pClickEvent, pMinionId, "schedule.enable");
    });
  }

  _addMenuItemScheduleDisableWhenNeeded (pMenu, pMinionId, schedules) {
    if (schedules.enabled === false) {
      return;
    }
    pMenu.addMenuItem("Disable&nbsp;scheduler...", (pClickEvent) => {
      this.runCommand(pClickEvent, pMinionId, "schedule.disable");
    });
  }

  _addMenuItemModifyJob (pMenu, pMinionId, scheduleModifyCmd) {
    pMenu.addMenuItem("Modify&nbsp;job...", (pClickEvent) => {
      this.runCommand(pClickEvent, pMinionId, scheduleModifyCmd);
    });
  }

  _addMenuItemScheduleEnableJobWhenNeeded (pMenu, pMinionId, pJobName, schedule) {
    if (schedule.enabled !== false) {
      return;
    }
    pMenu.addMenuItem("Enable&nbsp;job...", (pClickEvent) => {
      this.runCommand(pClickEvent, pMinionId, "schedule.enable_job " + pJobName);
    });
  }

  _addMenuItemScheduleDisableJobWhenNeeded (pMenu, pMinionId, pJobName, schedule) {
    if (schedule.enabled === false) {
      return;
    }
    pMenu.addMenuItem("Disable&nbsp;job...", (pClickEvent) => {
      this.runCommand(pClickEvent, pMinionId, "schedule.disable_job " + pJobName);
    });
  }

  _addMenuItemScheduleDeleteJob (pMenu, pMinionId, pJobName) {
    pMenu.addMenuItem("Delete&nbsp;job...", (pClickEvent) => {
      this.runCommand(pClickEvent, pMinionId, "schedule.delete " + pJobName);
    });
  }

  _addMenuItemScheduleRunJob (pMenu, pMinionId, pJobName, schedule) {
    pMenu.addMenuItem("Run&nbsp;job...", (pClickEvent) => {
      let scheduleRunJobCmd = "schedule.run_job";
      if (schedule.enabled === false) {
        scheduleRunJobCmd += " force=true";
      }
      scheduleRunJobCmd += " " + pJobName;
      this.runCommand(pClickEvent, pMinionId, scheduleRunJobCmd);
    });
  }
}