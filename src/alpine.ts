import type { Alpine } from "alpinejs";
import { registerAppDrawerStore } from "./modules/app/drawerStore";
import { registerExpenseTrackerStore } from "./modules/expense-tracker/store";

export default function initAlpine(Alpine: Alpine) {
  registerAppDrawerStore(Alpine);
  registerExpenseTrackerStore(Alpine);

  if (typeof window !== "undefined") {
    window.Alpine = Alpine;
  }
}
